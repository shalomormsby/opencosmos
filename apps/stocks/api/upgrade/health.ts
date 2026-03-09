/**
 * Upgrade Health Check Endpoint
 *
 * Validates that user's setup is ready for upgrade:
 * - Session authentication
 * - Notion token validity
 * - Database access
 * - Sage Stocks page access
 * - Current version detection
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { validateSession, getUserByEmail, decryptToken } from '../../lib/core/auth';
import { testDatabaseRead } from '../../lib/domain/templates/detection';
import { CURRENT_VERSION, needsUpgrade } from '../../lib/domain/templates/versions';
import { Client } from '@notionhq/client';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check authentication
    const session = await validateSession(req);
    const hasValidSession = !!session;

    if (!session) {
      return res.json({
        hasValidSession: false,
        notionTokenValid: false,
        databasesAccessible: false,
        sageStocksPageFound: false,
        currentVersion: null,
        latestVersion: CURRENT_VERSION,
        canUpgrade: false,
        needsSetup: true,
        issues: ['Not authenticated - please sign in']
      });
    }

    // Get user data
    const user = await getUserByEmail(session.email);
    if (!user) {
      return res.json({
        hasValidSession: true,
        notionTokenValid: false,
        databasesAccessible: false,
        sageStocksPageFound: false,
        currentVersion: null,
        latestVersion: CURRENT_VERSION,
        canUpgrade: false,
        needsSetup: true,
        issues: ['User not found in database']
      });
    }

    const issues: string[] = [];

    // Check if setup is complete
    if (!user.stockAnalysesDbId || !user.stockHistoryDbId || !user.sageStocksPageId) {
      return res.json({
        hasValidSession: true,
        notionTokenValid: false,
        databasesAccessible: false,
        sageStocksPageFound: false,
        currentVersion: null,
        latestVersion: CURRENT_VERSION,
        canUpgrade: false,
        needsSetup: true,
        issues: ['Setup not completed - please run /setup first']
      });
    }

    // Decrypt token
    const userToken = await decryptToken(user.accessToken);

    // Check Notion token validity
    let tokenValid = false;
    try {
      const notion = new Client({ auth: userToken, notionVersion: '2025-09-03' });
      await notion.users.me({});
      tokenValid = true;
    } catch (error: any) {
      issues.push(`Notion token expired or invalid: ${error.message}`);
    }

    // Check database access
    let databasesAccessible = false;
    if (tokenValid) {
      try {
        await Promise.all([
          testDatabaseRead(userToken, user.stockAnalysesDbId),
          testDatabaseRead(userToken, user.stockHistoryDbId)
        ]);
        databasesAccessible = true;
      } catch (error: any) {
        issues.push(`Cannot access one or more databases: ${error.message}`);
      }
    }

    // Check Sage Stocks page and get current version
    let pageFound = false;
    let currentVersion: string | null = null;
    if (tokenValid) {
      try {
        const notion = new Client({ auth: userToken, notionVersion: '2025-09-03' });
        const page = await notion.pages.retrieve({ page_id: user.sageStocksPageId });

        pageFound = true;

        // Try to get Template Version property
        const properties = (page as any).properties || {};
        const versionProp = properties['Template Version'];

        if (versionProp && versionProp.rich_text && versionProp.rich_text.length > 0) {
          currentVersion = versionProp.rich_text[0].plain_text;
        } else {
          // Fallback to user's stored version
          currentVersion = user.templateVersion || '1.0.0';
        }
      } catch (error: any) {
        issues.push(`Cannot access Sage Stocks page: ${error.message}`);
      }
    }

    const canUpgrade = issues.length === 0 && currentVersion !== null && needsUpgrade(currentVersion, CURRENT_VERSION);

    return res.json({
      hasValidSession,
      notionTokenValid: tokenValid,
      databasesAccessible,
      sageStocksPageFound: pageFound,
      currentVersion,
      latestVersion: CURRENT_VERSION,
      canUpgrade,
      needsSetup: false,
      issues
    });

  } catch (error: any) {
    console.error('❌ Health check error:', error);
    return res.status(500).json({
      error: 'Health check failed',
      details: error.message
    });
  }
}
