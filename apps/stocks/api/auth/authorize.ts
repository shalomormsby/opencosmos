/**
 * OAuth Authorization Endpoint
 *
 * Initiates the Notion OAuth flow by redirecting to Notion's authorization page.
 * User will be prompted to select which pages to share with the integration.
 *
 * v1.2.14: Simplified - template checking happens in frontend before OAuth.
 * This endpoint NEVER includes template_id parameter (manual duplication only).
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import { log, LogLevel } from '../../lib/core/logger';
import { validateSession } from '../../lib/core/auth';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  try {
    const clientId = process.env.NOTION_OAUTH_CLIENT_ID;
    const redirectUri = process.env.NOTION_OAUTH_REDIRECT_URI;

    if (!clientId || !redirectUri) {
      log(LogLevel.ERROR, 'OAuth configuration missing', {
        hasClientId: !!clientId,
        hasRedirectUri: !!redirectUri,
      });

      res.status(500).json({
        success: false,
        error: 'OAuth not configured',
        message: 'Server configuration error. Please contact support.',
      });
      return;
    }

    const emailParam = req.query.email as string | undefined;
    const session = await validateSession(req);

    log(LogLevel.INFO, 'OAuth authorization request', {
      hasSession: !!session,
      hasEmailParam: !!emailParam,
      sessionUserId: session?.userId,
      sessionNotionUserId: session?.notionUserId,
    });

    // Build Notion OAuth authorization URL
    const authUrl = new URL('https://api.notion.com/v1/oauth/authorize');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('owner', 'user');

    // Notion OAuth requires explicit content scopes
    // v1.2.17: Reverted explicit scopes to rely on integration defaults (which worked previously)
    // const scopes = ['read_content', 'update_content', 'insert_content'];
    // authUrl.searchParams.set('scope', scopes.join(' '));

    // CRITICAL: Do NOT include template_id in OAuth URL
    // When template_id is used, Notion duplicates the template but the integration
    // doesn't automatically get access to the duplicated content. Users must manually
    // connect the integration to duplicated pages, which breaks the flow.
    // Instead, users should manually duplicate the template FIRST, then during OAuth
    // they explicitly select the duplicated pages, ensuring the integration has access.
    // See: https://www.notion.com/help/add-and-manage-integrations-with-the-api

    // Pass session data through OAuth state parameter (for callback to use)
    if (session) {
      const stateData = {
        userId: session.userId,
        notionUserId: session.notionUserId,
        timestamp: Date.now(),
      };
      authUrl.searchParams.set('state', Buffer.from(JSON.stringify(stateData)).toString('base64'));
      log(LogLevel.INFO, 'OAuth state parameter set', {
        userId: session.userId,
        notionUserId: session.notionUserId,
      });
    }

    const finalUrl = authUrl.toString();

    log(LogLevel.INFO, 'OAuth URL constructed (manual template duplication flow)', {
      hasSession: !!session,
      completeUrl: finalUrl,
      note: 'Users must manually duplicate template and select it during OAuth',
    });

    res.redirect(finalUrl);
  } catch (error) {
    log(LogLevel.ERROR, 'Authorization endpoint error', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    res.status(500).json({
      success: false,
      error: 'Authorization failed',
      message: 'An unexpected error occurred. Please try again.',
    });
  }
}
