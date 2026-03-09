/**
 * Setup Advance API Endpoint
 *
 * POST /api/setup/advance
 * Advances the user to the next step in the setup flow
 *
 * Request body:
 * {
 *   step: 1 | 2 | 3 | 4 | 5 | 6,
 *   data?: any (step-specific data)
 * }
 *
 * Step-specific data:
 * - Step 1: { manualConfirm: boolean }
 * - Step 3: { detectionResults: {...} }
 * - Step 4: { ticker: string }
 * - Step 5: { analysisUrl: string }
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { validateSession, updateSetupProgress } from '../../lib/core/auth';
import { log, LogLevel } from '../../lib/core/logger';

interface AdvanceRequest {
  step: 1 | 2 | 3 | 4 | 5 | 6;
  data?: {
    manualConfirm?: boolean;
    detectionResults?: any;
    ticker?: string;
    analysisUrl?: string;
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
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

    const { step, data } = req.body as AdvanceRequest;

    // Validate step
    if (!step || step < 1 || step > 6) {
      return res.status(400).json({
        error: 'Invalid step',
        details: 'Step must be between 1 and 6'
      });
    }

    log(LogLevel.INFO, 'Advancing setup step', {
      userId: session.userId,
      step,
      data: data ? Object.keys(data) : [],
    });

    // Get current progress
    const currentProgress = session.setupProgress || {
      currentStep: 1,
      completedSteps: [],
      startedAt: Date.now(),
      completedAt: null,
    };

    // Build updates based on step
    const updates: any = {
      currentStep: step,
      completedSteps: Array.from(new Set([...currentProgress.completedSteps, step])),
    };

    // Step-specific updates
    if (step === 1 && data?.manualConfirm) {
      updates.step1ManualConfirm = true;
    }

    if (step === 3 && data?.detectionResults) {
      updates.step3DetectionResults = data.detectionResults;
    }

    if (step === 4 && data?.ticker) {
      updates.step4FirstTicker = data.ticker;
    }

    if (step === 5 && data?.analysisUrl) {
      updates.step5AnalysisUrl = data.analysisUrl;
    }

    // Mark setup as complete if advancing to step 6
    if (step === 6) {
      updates.completedAt = Date.now();
    }

    // Update session
    const updatedProgress = await updateSetupProgress(req, updates);

    log(LogLevel.INFO, 'Setup step advanced', {
      userId: session.userId,
      currentStep: updatedProgress.currentStep,
      completedSteps: updatedProgress.completedSteps,
    });

    return res.json({
      success: true,
      setupProgress: updatedProgress,
    });
  } catch (error: any) {
    log(LogLevel.ERROR, 'Setup advance error', {
      error: error.message,
      stack: error.stack,
    });

    return res.status(500).json({
      error: 'Failed to advance setup',
      details: error.message,
    });
  }
}
