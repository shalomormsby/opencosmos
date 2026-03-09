/**
 * Debug Endpoint: User Configuration
 *
 * GET /api/debug/user-config
 * Returns the current user's stored database IDs and template configuration
 *
 * Helps diagnose template duplication issues by showing:
 * - Which database IDs are stored in Beta Users
 * - Template version
 * - Setup completion status
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { validateSession, getUserByEmail } from '../../lib/core/auth';

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

    // Return configuration
    return res.json({
      success: true,
      user: {
        email: user.email,
        name: user.name,
        status: user.status,
      },
      configuration: {
        stockAnalysesDbId: user.stockAnalysesDbId || null,
        stockHistoryDbId: user.stockHistoryDbId || null,
        sageStocksPageId: user.sageStocksPageId || null,
        templateVersion: user.templateVersion || null,
      },
      setupStatus: {
        isComplete: Boolean(
          user.stockAnalysesDbId &&
          user.stockHistoryDbId &&
          user.sageStocksPageId
        ),
      },
      usage: {
        dailyAnalyses: user.dailyAnalyses,
        totalAnalyses: user.totalAnalyses,
      },
    });
  } catch (error: any) {
    console.error('Debug endpoint error:', error);
    return res.status(500).json({
      error: 'Failed to get user configuration',
      details: error.message,
    });
  }
}
