/**
 * Debug Endpoint: List All Templates
 *
 * GET /api/debug/list-templates
 * Searches user's workspace for ALL pages/databases that match "Sage Stocks" template pattern
 *
 * Helps diagnose template duplication by showing:
 * - How many "Sage Stocks" pages exist
 * - How many "Stock Analyses" databases exist
 * - Which ones are stored in Beta Users vs which are orphaned
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { validateSession, getUserByEmail, decryptToken } from '../../lib/core/auth';
import { Client } from '@notionhq/client';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check authentication
    const session = await validateSession(req);
    if (!session) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Get user data
    const user = await getUserByEmail(session.email);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Decrypt user's OAuth token
    const userAccessToken = await decryptToken(user.accessToken);
    const notion = new Client({ auth: userAccessToken, notionVersion: '2025-09-03' });

    console.log(`🔍 Searching workspace for ${user.email}...`);

    // Search for all databases (now returns data sources in v2025-09-03)
    const databasesResponse = await notion.search({
      filter: { property: 'object', value: 'data_source' },
      page_size: 100,
    });

    // Search for all pages
    const pagesResponse = await notion.search({
      filter: { property: 'object', value: 'page' },
      page_size: 100,
    });

    // Filter for Sage Stocks related items
    const sageStocksPages = pagesResponse.results.filter((page: any) => {
      const title = page.properties?.title?.title?.[0]?.plain_text || '';
      return title.toLowerCase().includes('sage stocks');
    });

    const stockAnalysesDbs = databasesResponse.results.filter((db: any) => {
      const title = db.title?.[0]?.plain_text || '';
      return title.toLowerCase().includes('stock analyses');
    });

    const stockHistoryDbs = databasesResponse.results.filter((db: any) => {
      const title = db.title?.[0]?.plain_text || '';
      return title.toLowerCase().includes('stock history');
    });

    // Format results
    return res.json({
      success: true,
      user: {
        email: user.email,
      },
      storedConfiguration: {
        stockAnalysesDbId: user.stockAnalysesDbId || null,
        stockHistoryDbId: user.stockHistoryDbId || null,
        sageStocksPageId: user.sageStocksPageId || null,
      },
      foundInWorkspace: {
        sageStocksPages: sageStocksPages.map((page: any) => ({
          id: page.id,
          title: page.properties?.title?.title?.[0]?.plain_text || 'Untitled',
          isStored: page.id === user.sageStocksPageId,
          url: page.url,
          createdTime: page.created_time,
        })),
        stockAnalysesDatabases: stockAnalysesDbs.map((db: any) => ({
          id: db.id,
          title: db.title?.[0]?.plain_text || 'Untitled',
          isStored: db.id === user.stockAnalysesDbId,
          url: db.url,
          createdTime: db.created_time,
        })),
        stockHistoryDatabases: stockHistoryDbs.map((db: any) => ({
          id: db.id,
          title: db.title?.[0]?.plain_text || 'Untitled',
          isStored: db.id === user.stockHistoryDbId,
          url: db.url,
          createdTime: db.created_time,
        })),
      },
      summary: {
        totalSageStocksPages: sageStocksPages.length,
        totalStockAnalysesDbs: stockAnalysesDbs.length,
        totalStockHistoryDbs: stockHistoryDbs.length,
        hasDuplicates: sageStocksPages.length > 1 || stockAnalysesDbs.length > 1,
      },
    });
  } catch (error: any) {
    console.error('Debug endpoint error:', error);
    return res.status(500).json({
      error: 'Failed to list templates',
      details: error.message,
    });
  }
}
