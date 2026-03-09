/**
 * Template Check Endpoint
 *
 * Checks if user already has a Sage Stocks template in their Notion workspace.
 * Used by Step 2 to determine if user needs to duplicate template or can continue
 * with existing workspace.
 *
 * v1.2.13: Manual template duplication flow
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import { log, LogLevel } from '../../lib/core/logger';
import { validateSession, getUserByNotionId } from '../../lib/core/auth';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  try {
    // Validate session
    const session = await validateSession(req);
    if (!session) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        requiresAuth: true,
      });
      return;
    }

    log(LogLevel.INFO, 'Template check requested', {
      userId: session.userId,
      notionUserId: session.notionUserId,
      email: session.email,
    });

    // Get user from database
    const user = await getUserByNotionId(session.notionUserId);
    if (!user) {
      log(LogLevel.ERROR, 'User not found in database', {
        notionUserId: session.notionUserId,
      });
      res.status(404).json({
        success: false,
        error: 'User not found',
      });
      return;
    }

    if (!user.accessToken) {
      log(LogLevel.ERROR, 'User has no access token', {
        userId: user.id,
        email: user.email,
      });
      res.status(400).json({
        success: false,
        error: 'No access token available',
      });
      return;
    }

    // Decrypt access token
    const { decryptToken } = await import('../../lib/core/auth');
    const accessToken = await decryptToken(user.accessToken);

    // Initialize Notion client
    const { Client } = await import('@notionhq/client');
    const notion = new Client({ auth: accessToken, notionVersion: '2025-09-03' });

    // Search for Sage Stocks template
    log(LogLevel.INFO, 'Searching for Sage Stocks template', {
      userId: user.id,
      email: user.email,
      hasSavedPageId: !!user.sageStocksPageId,
      savedPageId: user.sageStocksPageId,
    });

    const searchResults = await notion.search({
      filter: { property: 'object', value: 'page' },
      page_size: 100,
    });

    const sageStocksPages = searchResults.results.filter((p: any) =>
      p.object === 'page' &&
      p.properties?.title?.title?.[0]?.plain_text?.includes('Sage Stocks')
    );

    log(LogLevel.INFO, 'Template search complete', {
      totalPagesAccessible: searchResults.results.length,
      sageStocksFoundCount: sageStocksPages.length,
      sageStocksIds: sageStocksPages.map((p: any) => p.id),
      userHasSavedPageId: !!user.sageStocksPageId,
      savedPageId: user.sageStocksPageId,
    });

    // Determine if user has template
    const hasTemplate = sageStocksPages.length > 0;
    const templateId = hasTemplate ? sageStocksPages[0].id : null;

    // Note: Template ID will be saved during Step 3 verification
    // This endpoint just checks for existence

    res.status(200).json({
      success: true,
      hasTemplate,
      templateId,
      templateCount: sageStocksPages.length,
    });
  } catch (error) {
    log(LogLevel.ERROR, 'Template check error', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    res.status(500).json({
      success: false,
      error: 'Failed to check for template',
    });
  }
}
