/**
 * OAuth Callback Endpoint
 *
 * Handles the OAuth callback from Notion after user authorizes the integration.
 * Exchanges the authorization code for an access token, creates/updates user record,
 * and creates a session if the user is approved.
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import { log, LogLevel } from '../../lib/core/logger';
import {
  storeUserSession,
  createOrUpdateUser,
  updateUserStatus,
} from '../../lib/core/auth';

interface NotionOAuthTokenResponse {
  access_token: string;
  bot_id: string;
  workspace_id: string;
  workspace_name: string;
  workspace_icon: string | null;
  owner: {
    type: 'user';
    user: {
      object: 'user';
      id: string;
      name: string | null;
      avatar_url: string | null;
      type: 'person';
      person: {
        email: string;
      };
    };
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  try {
    const { code, error: oauthError, state } = req.query;

    // Handle OAuth errors (user denied access, etc.)
    if (oauthError) {
      log(LogLevel.WARN, 'OAuth authorization denied', { error: oauthError });
      res.redirect('/?error=access_denied');
      return;
    }

    // Validate authorization code
    if (!code || typeof code !== 'string') {
      log(LogLevel.WARN, 'Missing authorization code');
      res.redirect('/?error=missing_code');
      return;
    }

    // v1.2.10: Parse OAuth state parameter (contains session data from authorize.ts)
    let stateData: { userId?: string; notionUserId?: string; hasExistingTemplate?: boolean; timestamp?: number } | null = null;
    if (state && typeof state === 'string') {
      try {
        stateData = JSON.parse(Buffer.from(state, 'base64').toString('utf-8'));
        log(LogLevel.INFO, 'OAuth state parameter received', {
          userId: stateData?.userId,
          notionUserId: stateData?.notionUserId,
          hasExistingTemplate: stateData?.hasExistingTemplate,
          timestamp: stateData?.timestamp,
          ageSeconds: stateData?.timestamp ? Math.floor((Date.now() - stateData.timestamp) / 1000) : undefined,
        });
      } catch (stateError) {
        log(LogLevel.WARN, 'Failed to parse OAuth state parameter (non-critical)', {
          error: stateError instanceof Error ? stateError.message : String(stateError),
          state,
        });
      }
    } else {
      log(LogLevel.INFO, 'No OAuth state parameter (user likely started OAuth without session)', {
        hasState: !!state,
      });
    }

    const clientId = process.env.NOTION_OAUTH_CLIENT_ID;
    const clientSecret = process.env.NOTION_OAUTH_CLIENT_SECRET;
    const redirectUri = process.env.NOTION_OAUTH_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
      log(LogLevel.ERROR, 'OAuth configuration incomplete');
      res.redirect('/?error=server_config');
      return;
    }

    // Step 1: Exchange authorization code for access token
    log(LogLevel.INFO, 'Exchanging authorization code for token');

    const tokenResponse = await fetch('https://api.notion.com/v1/oauth/token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28',
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      log(LogLevel.ERROR, 'Token exchange failed', {
        status: tokenResponse.status,
        error: errorText,
      });
      res.redirect('/?error=token_exchange_failed');
      return;
    }

    const tokenData = await tokenResponse.json() as NotionOAuthTokenResponse;

    // Step 2: Extract user information
    const userId = tokenData.owner.user.id;
    const userEmail = tokenData.owner.user.person.email;
    const userName = tokenData.owner.user.name || userEmail.split('@')[0];
    const workspaceId = tokenData.workspace_id;
    const accessToken = tokenData.access_token;

    log(LogLevel.INFO, 'OAuth token received', {
      userId,
      email: userEmail,
      workspaceId,
    });

    // STEP 3: Check if user already exists (BEFORE template check)
    const { getUserByNotionId } = await import('../../lib/core/auth');
    const existingUser = await getUserByNotionId(userId);

    log(LogLevel.INFO, 'Existing user check', {
      userId,
      email: userEmail,
      isExistingUser: !!existingUser,
      existingUserId: existingUser?.id,
      existingSageStocksPageId: existingUser?.sageStocksPageId,
      stateDataHasExistingTemplate: stateData?.hasExistingTemplate,
    });

    // v1.2.17: Removed legacy "Aggressive duplicate template detection"
    // We now force manual duplication in Step 1.5, so we don't need to search for duplicates here.
    // This significantly speeds up the OAuth callback.

    // Step 5: Create or update user in Beta Users database
    const user = await createOrUpdateUser({
      notionUserId: userId,
      email: userEmail,
      name: userName,
      workspaceId,
      accessToken, // Will be encrypted by createOrUpdateUser
    });

    log(LogLevel.INFO, 'User record saved', {
      userId: user.id,
      status: user.status,
      isExistingUser: !!existingUser,
    });

    // Step 5.5: Auto-detect databases from duplicated template
    // Run detection for new users or users without database IDs
    // NOTE: We skip detection in OAuth callback to avoid timing issues.
    // Detection will run in Step 2 of the setup flow instead, giving Notion
    // more time to complete template duplication and grant integration access.
    const needsDetection = !user.stockAnalysesDbId || !user.stockHistoryDbId || !user.stockEventsDbId || !user.marketContextDbId;

    if (needsDetection) {
      log(LogLevel.INFO, 'Database detection needed - will run in Step 2 setup flow', {
        userId: user.id,
        email: userEmail,
        reason: 'Skipping immediate detection to allow template duplication to complete',
      });
      // Skip detection here - let Step 2 handle it with proper retry logic
      // Template duplication via OAuth template_id can take 5-15 seconds, and the
      // integration may not have immediate access to duplicated databases.
      // Step 2's detection endpoint has better retry logic with longer delays.
    } else {
      log(LogLevel.INFO, 'Database detection skipped - user already has all database IDs', {
        userId: user.id,
      });
    }

    // Auto-approve admin email
    const adminEmail = process.env.ADMIN_EMAIL;
    if (adminEmail && userEmail.toLowerCase() === adminEmail.toLowerCase() && user.status !== 'approved') {
      log(LogLevel.INFO, 'Auto-approving admin user', { email: userEmail });
      await updateUserStatus(user.id, 'approved');
      user.status = 'approved'; // Update local copy
    }

    // Step 4: Create session for all users (pending, denied, approved)
    // This allows pending users to check if their status changes without re-authenticating
    const cookieString = await storeUserSession({
      userId: user.id,
      email: user.email,
      name: user.name,
      notionUserId: user.notionUserId,
    });

    // Set the cookie header for the redirect
    res.setHeader('Set-Cookie', cookieString);

    log(LogLevel.INFO, 'Session created', {
      email: userEmail,
      status: user.status,
      cookieLength: cookieString.length,
    });

    // Step 5: Redirect based on approval status
    if (user.status === 'pending') {
      log(LogLevel.INFO, 'User pending approval', { email: userEmail });
      res.redirect('/?status=pending');
      return;
    }

    if (user.status === 'denied') {
      log(LogLevel.INFO, 'User access denied', { email: userEmail });
      res.redirect('/?status=denied');
      return;
    }

    // Step 6: User is approved - proceed with setup
    if (user.status === 'approved') {
      log(LogLevel.INFO, 'User approved, proceeding with setup', {
        email: userEmail,
      });

      // Check if setup is complete
      const setupComplete = Boolean(
        user.stockAnalysesDbId &&
        user.stockHistoryDbId &&
        user.sageStocksPageId
      );

      log(LogLevel.INFO, 'Checking setup completion status', {
        email: userEmail,
        setupComplete,
        stockAnalysesDbId: user.stockAnalysesDbId,
        stockHistoryDbId: user.stockHistoryDbId,
        sageStocksPageId: user.sageStocksPageId,
      });

      // Redirect based on setup status
      if (setupComplete) {
        // Setup already complete - go directly to analyzer
        log(LogLevel.INFO, 'Setup complete, redirecting to analyzer', {
          email: userEmail,
        });
        res.redirect('/pages/analyze.html');
      } else {
        // New user or incomplete setup - go to single-page setup flow
        // Step 3 = Verify workspace and run first analysis (after template duplication in Step 1 and OAuth in Step 2)
        log(LogLevel.INFO, 'Setup incomplete, redirecting to setup flow', {
          email: userEmail,
        });
        res.redirect('/?step=2'); // OAuth (step 2) just completed, now verify workspace at step 3
      }
      return;
    }

    // Fallback (should never reach here)
    log(LogLevel.ERROR, 'Unexpected user status', { status: user.status });
    res.redirect('/?error=unknown_status');
  } catch (error) {
    log(LogLevel.ERROR, 'OAuth callback error', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    res.redirect('/?error=oauth_failed');
  }
}
