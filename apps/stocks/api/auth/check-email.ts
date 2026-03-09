/**
 * Email Check Endpoint
 *
 * Checks if a user exists in the Beta Users database and determines routing:
 * - Existing user with template: Create session, skip OAuth, redirect to /analyze
 * - New user: Go through OAuth (template will be auto-created by Notion integration settings)
 *
 * v1.2.15: Skip OAuth for existing users (final fix for template duplication)
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import { log, LogLevel } from '../../lib/core/logger';
import { getUserByEmail, storeUserSession } from '../../lib/core/auth';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  try {
    const { email } = req.query;

    if (!email || typeof email !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Email parameter required',
      });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();

    log(LogLevel.INFO, 'Email check requested', {
      email: normalizedEmail,
    });

    // Check if user exists in Beta Users database
    const existingUser = await getUserByEmail(normalizedEmail);

    if (!existingUser) {
      log(LogLevel.INFO, 'New user - requires OAuth with automatic template duplication', {
        email: normalizedEmail,
      });
      res.status(200).json({
        success: true,
        exists: false,
        hasTemplate: false,
        requiresOAuth: true, // Go to OAuth - Notion will auto-duplicate template
      });
      return;
    }

    // User exists - check if they have a template and valid token
    const hasTemplate = Boolean(existingUser.sageStocksPageId);
    const hasAccessToken = Boolean(existingUser.accessToken);

    log(LogLevel.INFO, 'Existing user found - DETAILED DEBUG', {
      email: normalizedEmail,
      userId: existingUser.id,
      notionUserId: existingUser.notionUserId,
      hasTemplate,
      hasAccessToken,
      sageStocksPageId: existingUser.sageStocksPageId,
      stockAnalysesDbId: existingUser.stockAnalysesDbId,
      stockHistoryDbId: existingUser.stockHistoryDbId,
      accessToken: existingUser.accessToken ? `${existingUser.accessToken.substring(0, 20)}...` : null,
      status: existingUser.status,
    });

    if (hasTemplate && hasAccessToken) {
      // v1.2.15 KEY FIX: Create session for existing user, skip OAuth entirely
      // This prevents template duplication caused by Notion integration settings
      const cookieString = await storeUserSession({
        userId: existingUser.id,
        email: existingUser.email,
        name: existingUser.name,
        notionUserId: existingUser.notionUserId,
      });

      log(LogLevel.INFO, 'Session created for existing user - skipping OAuth', {
        userId: existingUser.id,
        email: normalizedEmail,
        reason: 'v1.2.15_skip_oauth_for_existing_users',
        cookieLength: cookieString.length,
      });

      // CRITICAL: Use res.writeHead() to ensure Set-Cookie header is included
      // This is required for Vercel serverless functions
      const responseBody = JSON.stringify({
        success: true,
        exists: true,
        hasTemplate: true,
        requiresOAuth: false,
        redirectTo: '/pages/analyze.html',
      });

      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(responseBody),
        'Set-Cookie': cookieString,
      });
      res.end(responseBody);
      return;
    }

    // User exists but missing template or token - needs OAuth
    log(LogLevel.INFO, 'Existing user needs OAuth (missing template or token)', {
      userId: existingUser.id,
      email: normalizedEmail,
      hasTemplate,
      hasAccessToken,
    });

    res.status(200).json({
      success: true,
      exists: true,
      hasTemplate,
      requiresOAuth: true,
    });
  } catch (error) {
    log(LogLevel.ERROR, 'Email check error', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    res.status(500).json({
      success: false,
      error: 'Failed to check email',
    });
  }
}
