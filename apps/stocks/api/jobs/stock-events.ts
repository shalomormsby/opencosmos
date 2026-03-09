/**
 * Stock Events Ingestion Job Endpoint (v1.2.16)
 *
 * Runs weekly (or as configured) via Vercel Cron
 * Fetches upcoming stock events (earnings, dividends, splits) from FMP API
 * and writes them to Stock Events database for all Portfolio/Watchlist stocks
 *
 * Workflow:
 * 1. Verify cron secret (authentication)
 * 2. Check if today is a NYSE market day (optional - can run on weekends)
 * 3. Run stock events ingestion pipeline
 * 4. Return execution summary
 *
 * Architecture: Deduplication + Per-user Distribution
 * - Fetches events once from FMP for all unique tickers
 * - Distributes to each user who owns that stock
 * - Each user has their own Stock Events database (from template)
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import { createFMPClient } from '../../lib/integrations/fmp/client';
import { runStockEventsIngestion } from '../../lib/domain/stock/events-ingestion';

// Vercel function configuration
export const maxDuration = 300; // 5 minutes (need time for FMP fetch + per-user distribution)

// Environment variables
const CRON_SECRET = process.env.CRON_SECRET || '';
const FMP_API_KEY = process.env.FMP_API_KEY || '';
const NOTION_API_KEY = process.env.NOTION_API_KEY || ''; // Admin token
const BETA_USERS_DB_ID = process.env.NOTION_BETA_USERS_DB_ID || '';

/**
 * Main cron handler
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  console.log('[EVENTS JOB] Stock events ingestion started');

  try {
    // 1. Verify cron secret
    const authHeader = req.headers.authorization;
    const providedSecret = authHeader?.replace('Bearer ', '');

    if (!providedSecret || providedSecret !== CRON_SECRET) {
      console.error('[EVENTS JOB] Unauthorized - invalid cron secret');
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Invalid cron secret',
      });
      return;
    }

    console.log('[EVENTS JOB] ✓ Cron secret verified');

    // 2. Check environment variables
    if (!FMP_API_KEY || !NOTION_API_KEY || !BETA_USERS_DB_ID) {
      console.error('[EVENTS JOB] Missing required configuration');
      res.status(500).json({
        success: false,
        error: 'Configuration error',
        message: 'Missing required environment variables (FMP_API_KEY, NOTION_API_KEY, NOTION_BETA_USERS_DB_ID)',
      });
      return;
    }

    console.log('[EVENTS JOB] ✓ Configuration validated');

    // 3. Optional: Check if today is a market day (commented out - events can be fetched on weekends)
    // const isMarketDay = await checkNYSEMarketDay();
    // if (!isMarketDay) {
    //   console.log('[EVENTS JOB] Market closed today - but continuing anyway (events are forward-looking)');
    // }

    // 4. Run stock events ingestion
    const fmpClient = createFMPClient(FMP_API_KEY);

    console.log('[EVENTS JOB] Starting ingestion pipeline...');

    const metrics = await runStockEventsIngestion(
      fmpClient,
      BETA_USERS_DB_ID,
      NOTION_API_KEY,
      90 // Next 90 days
    );

    console.log('[EVENTS JOB] ✓ Ingestion complete');

    // 5. Return success summary
    const summary = {
      success: true,
      timestamp: new Date().toISOString(),
      metrics: {
        duration: `${((metrics.durationMs || 0) / 1000).toFixed(1)}s`,
        users: {
          total: metrics.totalUsers,
          processed: metrics.usersProcessed,
          failed: metrics.usersFailed,
        },
        stocks: {
          total: metrics.totalStocks,
          portfolio: metrics.portfolioStocks,
          watchlist: metrics.watchlistStocks,
        },
        events: {
          fromFMP: metrics.eventsFromFMP,
          created: metrics.eventsCreated,
          updated: metrics.eventsUpdated,
          skipped: metrics.eventsSkipped,
        },
        apiCalls: {
          fmp: metrics.fmpApiCalls,
          notion: metrics.notionApiCalls,
        },
        issues: {
          errors: metrics.errors.length,
          warnings: metrics.warnings.length,
        },
      },
      errors: metrics.errors,
      warnings: metrics.warnings.slice(0, 10), // Limit to first 10 warnings
    };

    console.log('[EVENTS JOB] Summary:', JSON.stringify(summary, null, 2));
    res.json(summary);

  } catch (error) {
    console.error('[EVENTS JOB] Fatal error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Check if today is a NYSE market day
 * (Same logic as scheduled-analyses.ts)
 * Currently not used - events are fetched on weekends for the week ahead
 */
// async function checkNYSEMarketDay(): Promise<boolean> {
//   const today = new Date();
//
//   // Check if weekend
//   const dayOfWeek = today.getDay();
//   if (dayOfWeek === 0 || dayOfWeek === 6) {
//     console.log('[EVENTS JOB] Weekend detected - market closed');
//     return false;
//   }
//
//   // Check hardcoded 2025 holidays
//   const dateStr = today.toISOString().split('T')[0];
//   const holidays2025 = [
//     '2025-01-01', // New Year's Day
//     '2025-01-20', // MLK Day
//     '2025-02-17', // Presidents Day
//     '2025-04-18', // Good Friday
//     '2025-05-26', // Memorial Day
//     '2025-07-04', // Independence Day
//     '2025-09-01', // Labor Day
//     '2025-11-27', // Thanksgiving
//     '2025-12-25'  // Christmas
//   ];
//
//   if (holidays2025.includes(dateStr)) {
//     console.log(`[EVENTS JOB] Holiday detected (${dateStr}) - market closed`);
//     return false;
//   }
//
//   return true;
// }
