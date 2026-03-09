/**
 * Setup Status API Endpoint
 *
 * GET /api/setup/status
 * Returns current setup progress from session
 *
 * Used by the single-page setup UI to:
 * - Load setup state on page mount
 * - Poll for auto-detection completion
 * - Show persistent progress indicator
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { validateSession, getUserByEmail } from '../../lib/core/auth';
import { log, LogLevel } from '../../lib/core/logger';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check authentication
    const session = await validateSession(req);
    if (!session) {
      return res.status(401).json({
        error: 'Not authenticated',
        requiresAuth: true
      });
    }

    // Get user data to check if setup is complete
    const user = await getUserByEmail(session.email);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if setup is complete (all 3 database IDs stored in Notion)
    const setupComplete = Boolean(
      user.stockAnalysesDbId &&
      user.stockHistoryDbId &&
      user.sageStocksPageId
    );

    // Get setup progress from session (or initialize)
    const setupProgress = session.setupProgress || {
      currentStep: setupComplete ? 6 : 1, // Step 6 = complete
      completedSteps: setupComplete ? [1, 2, 3, 4, 5] : [],
      startedAt: Date.now(),
      completedAt: setupComplete ? Date.now() : null,
    };

    log(LogLevel.INFO, 'Setup status retrieved', {
      userId: user.id,
      currentStep: setupProgress.currentStep,
      setupComplete,
    });

    return res.json({
      success: true,
      setupComplete,
      setupProgress,
      user: {
        email: user.email,
        name: user.name,
        status: user.status,
      },
    });
  } catch (error: any) {
    log(LogLevel.ERROR, 'Setup status error', {
      error: error.message,
      stack: error.stack,
    });

    return res.status(500).json({
      error: 'Failed to get setup status',
      details: error.message,
    });
  }
}
