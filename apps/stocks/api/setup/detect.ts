/**
 * Setup Detection API Endpoint
 *
 * POST /api/setup/detect
 * Runs auto-detection for user's Notion template databases
 *
 * This is Step 3 in the setup flow and auto-runs after OAuth completes
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { validateSession, getUserByEmail, decryptToken, updateSetupProgress, updateUserDatabaseIds } from '../../lib/core/auth';
import { autoDetectTemplate } from '../../lib/domain/templates/detection';
import { log, LogLevel } from '../../lib/core/logger';
import { withRetry } from '../../lib/core/utils';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check authentication
    const session = await validateSession(req);
    if (!session) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Get user data with retry logic for Notion service outages
    const user = await withRetry(
      async () => {
        const userData = await getUserByEmail(session.email);
        if (!userData) {
          throw new Error('USER_NOT_FOUND');
        }
        return userData;
      },
      'getUserByEmail for setup detection',
      { maxAttempts: 3, initialDelayMs: 2000, maxDelayMs: 10000 }
    );

    // Check if already set up
    if (user.stockAnalysesDbId && user.stockHistoryDbId && user.sageStocksPageId) {
      return res.json({
        success: true,
        alreadySetup: true,
        detection: {
          stockAnalysesDb: { id: user.stockAnalysesDbId, title: 'Stock Analyses', confidence: 'high' },
          stockHistoryDb: { id: user.stockHistoryDbId, title: 'Stock History', confidence: 'high' },
          stockEventsDb: user.stockEventsDbId ? { id: user.stockEventsDbId, title: 'Stock Events', confidence: 'high' } : null,
          marketContextDb: user.marketContextDbId ? { id: user.marketContextDbId, title: 'Market Context', confidence: 'high' } : null,
          sageStocksPage: { id: user.sageStocksPageId, title: 'Sage Stocks', confidence: 'high' },
          needsManual: false,
        }
      });
    }

    log(LogLevel.INFO, 'Starting auto-detection', { userId: user.id, email: session.email });

    // Decrypt user's OAuth token
    const userToken = await decryptToken(user.accessToken);

    // Run auto-detection
    const detection = await autoDetectTemplate(userToken);

    log(LogLevel.INFO, 'Auto-detection complete', {
      userId: user.id,
      stockAnalyses: detection.stockAnalysesDb ? 'Found' : 'Not found',
      stockHistory: detection.stockHistoryDb ? 'Found' : 'Not found',
      stockEvents: detection.stockEventsDb ? 'Found' : 'Not found',
      marketContext: detection.marketContextDb ? 'Found' : 'Not found',
      sageStocksPage: detection.sageStocksPage ? 'Found' : 'Not found',
      needsManual: detection.needsManual,
    });

    // v1.2.4: Auto-save database IDs when template is found
    // CRITICAL: This must succeed or the first analysis will fail!
    // v1.2.9 Fix: Only save if ALL required databases are detected (not just the page)
    if (!detection.needsManual &&
      detection.sageStocksPage &&
      detection.stockAnalysesDb &&
      detection.stockHistoryDb &&
      detection.stockEventsDb &&
      detection.marketContextDb) {
      // Store IDs for use in retry closure
      const detectedIds = {
        sageStocksPageId: detection.sageStocksPage.id,
        stockAnalysesDbId: detection.stockAnalysesDb.id,  // No longer optional
        stockHistoryDbId: detection.stockHistoryDb.id,    // No longer optional
        stockEventsDbId: detection.stockEventsDb.id,      // v1.2.16: New required DB
        marketContextDbId: detection.marketContextDb.id,  // v1.3.0: New required DB
      };

      try {
        await withRetry(
          async () => {
            await updateUserDatabaseIds(user.id, detectedIds);
          },
          'updateUserDatabaseIds after detection',
          { maxAttempts: 3, initialDelayMs: 2000, maxDelayMs: 10000 }
        );
        log(LogLevel.INFO, 'Auto-saved database IDs to user record', { userId: user.id });
      } catch (saveError) {
        log(LogLevel.ERROR, 'Failed to auto-save database IDs - THIS IS CRITICAL', {
          userId: user.id,
          error: saveError instanceof Error ? saveError.message : String(saveError),
        });
        // Re-throw the error - database IDs MUST be saved for analysis to work
        throw new Error('Failed to save database configuration. Please try the setup again.');
      }
    } else if (detection.sageStocksPage && (!detection.stockAnalysesDb || !detection.stockHistoryDb)) {
      // v1.2.9: Partial detection - page found but databases missing
      log(LogLevel.WARN, 'Partial template detection - page found but databases missing', {
        userId: user.id,
        sageStocksPage: !!detection.sageStocksPage,
        stockAnalysesDb: !!detection.stockAnalysesDb,
        stockHistoryDb: !!detection.stockHistoryDb,
      });
    }

    // Update setup progress in session
    try {
      if (!detection.needsManual) {
        // Full auto-detection succeeded
        await updateSetupProgress(req, {
          currentStep: 3,
          completedSteps: [1, 2],
          step3DetectionResults: {
            stockAnalysesDb: detection.stockAnalysesDb || undefined,
            stockHistoryDb: detection.stockHistoryDb || undefined,
            stockEventsDb: detection.stockEventsDb || undefined,
            marketContextDb: detection.marketContextDb || undefined,
            sageStocksPage: detection.sageStocksPage || undefined,
          },
        });
      } else {
        // Partial detection - will need manual input
        await updateSetupProgress(req, {
          currentStep: 3,
          completedSteps: [1, 2],
          step3DetectionResults: {
            stockAnalysesDb: detection.stockAnalysesDb || undefined,
            stockHistoryDb: detection.stockHistoryDb || undefined,
            stockEventsDb: detection.stockEventsDb || undefined,
            marketContextDb: detection.marketContextDb || undefined,
            sageStocksPage: detection.sageStocksPage || undefined,
          },
          errors: [{
            step: 3,
            message: 'We found the Sage Stocks page, but the databases are missing or empty. Please wait a moment for Notion to finish creating them, then try again.',
            code: 'PARTIAL_DETECTION',
          }],
        });
      }
    } catch (error) {
      console.warn('⚠️ Failed to update setup progress (non-critical):', error);
    }

    return res.json({
      success: true,
      detection: {
        stockAnalysesDb: detection.stockAnalysesDb,
        stockHistoryDb: detection.stockHistoryDb,
        stockEventsDb: detection.stockEventsDb,
        marketContextDb: detection.marketContextDb,
        sageStocksPage: detection.sageStocksPage,
        needsManual: detection.needsManual,
      },
    });
  } catch (error: any) {
    const errorMessage = error.message || String(error);

    // Check for specific error types
    const isNotionServiceUnavailable = errorMessage.includes('NOTION_SERVICE_UNAVAILABLE');
    const isNotionRateLimited = errorMessage.includes('NOTION_RATE_LIMITED');
    const isUserNotFound = errorMessage === 'USER_NOT_FOUND';

    log(LogLevel.ERROR, 'Auto-detection error', {
      error: errorMessage,
      stack: error.stack,
      isNotionServiceUnavailable,
      isNotionRateLimited,
      isUserNotFound,
    });

    // User-friendly error messages
    let userMessage: string;
    let errorCode: string;
    let statusCode = 500;

    if (isNotionServiceUnavailable) {
      userMessage = "Notion's API is temporarily unavailable. This is a temporary issue on Notion's end. Please wait a few minutes and try again.";
      errorCode = 'NOTION_SERVICE_UNAVAILABLE';
      statusCode = 503;
    } else if (isNotionRateLimited) {
      userMessage = "We're sending too many requests to Notion. Please wait a minute and try again.";
      errorCode = 'NOTION_RATE_LIMITED';
      statusCode = 429;
    } else if (isUserNotFound) {
      userMessage = 'User account not found. Please complete the OAuth flow first.';
      errorCode = 'USER_NOT_FOUND';
      statusCode = 404;
    } else {
      userMessage = 'Auto-detection failed. Please try again or contact support if the issue persists.';
      errorCode = 'DETECTION_ERROR';
    }

    // Mark error in setup progress
    try {
      await updateSetupProgress(req, {
        errors: [{
          step: 3,
          message: userMessage,
          code: errorCode,
        }],
      });
    } catch (updateError) {
      console.warn('⚠️ Failed to update setup progress with error (non-critical):', updateError);
    }

    return res.status(statusCode).json({
      success: false,
      error: userMessage,
      errorCode,
      details: errorMessage,
      needsManual: !isNotionServiceUnavailable, // Don't suggest manual setup for temporary outages
    });
  }
}
