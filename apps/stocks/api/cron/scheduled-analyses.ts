/**
 * Scheduled Stock Analyses Cron Endpoint (v1.2.0)
 *
 * Runs daily at 5:30 AM PT and 5:45 AM PT via Vercel Cron
 * Automatically analyzes stocks with "Daily" cadence for all users
 *
 * NEW in v1.2.0: Chunked processing to prevent 504 timeouts
 * - First invocation (5:30 AM): Collects stocks, saves to Redis, processes first chunk (8 stocks)
 * - Second invocation (5:45 AM): Resumes from Redis, processes remaining stocks
 * - Supports scaling to 15+ stocks without timeout
 *
 * Workflow:
 * 1. Verify cron secret (authentication)
 * 2. Check if today is a NYSE market day (skip weekends/holidays)
 * 3. Check if queue exists in Redis (resume case)
 * 4. If no queue: Collect stocks → Save to Redis → Process first chunk
 * 5. If queue exists: Load from Redis → Process next chunk → Cleanup if done
 * 6. Return execution summary with chunk info
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import { getAllUsers } from '../../lib/core/auth';
import { collectStockRequests, buildPriorityQueue, processQueue } from '../../lib/orchestration/orchestrator';
import { getMarketContext, MarketContext } from '../../lib/domain/market/index';
import { createFMPClient } from '../../lib/integrations/fmp/client';
import { createFREDClient } from '../../lib/integrations/fred/client';
import {
  loadQueueFromRedis,
  saveQueueToRedis,
  updateProcessedCount,
  deleteQueue,
} from '../../lib/orchestration/queue-storage';

// Vercel function configuration
// Pro plan with Fluid Compute supports up to 800 seconds (~13 min)
export const maxDuration = 800;

// Environment variables
const CRON_SECRET = process.env.CRON_SECRET || '';
const CHUNK_SIZE = parseInt(process.env.CHUNK_SIZE || '8', 10); // Default: 8 stocks per chunk

// Note: Tier limits are now enforced in the Stock Analyses database
// via the "Analysis Cadence" property. Orchestrator processes all stocks
// marked as "Daily" regardless of tier limits.

/**
 * Main cron handler with chunked processing support
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  console.log('[CRON] Scheduled analyses started (v1.2.0 - Chunked Processing)');

  try {
    // 1. Verify cron secret
    const authHeader = req.headers.authorization;
    const providedSecret = authHeader?.replace('Bearer ', '');

    if (!providedSecret || providedSecret !== CRON_SECRET) {
      console.error('[CRON] Unauthorized - invalid cron secret');
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Invalid cron secret'
      });
      return;
    }

    console.log('[CRON] ✓ Cron secret verified');

    // 2. Check if today is a market day
    const isMarketDay = await checkNYSEMarketDay();

    if (!isMarketDay) {
      console.log('[CRON] Market closed today (weekend or holiday) - skipping execution');
      res.json({
        success: true,
        message: 'Market closed today',
        marketDay: false,
        executed: 0,
        skipped: 0,
        failed: 0
      });
      return;
    }

    console.log('[CRON] ✓ Market is open today');

    // 3. Check if queue exists in Redis (resume case)
    const existingQueue = await loadQueueFromRedis();

    if (existingQueue) {
      // RESUME CASE: Queue exists, process next chunk
      console.log('[CRON] ✓ Existing queue found - resuming chunked processing');
      console.log(`[CRON]   Progress: ${existingQueue.processedCount}/${existingQueue.totalCount} items processed`);

      const startIndex = existingQueue.processedCount;
      const remainingItems = existingQueue.totalCount - startIndex;
      const itemsToProcess = Math.min(CHUNK_SIZE, remainingItems);

      console.log(`[CRON]   Processing next chunk: ${itemsToProcess} items (${startIndex + 1}-${startIndex + itemsToProcess})`);

      // Process next chunk
      const metrics = await processQueue(
        existingQueue.items,
        existingQueue.marketContext,
        startIndex,
        itemsToProcess
      );

      // Update processed count
      const newProcessedCount = startIndex + itemsToProcess;
      await updateProcessedCount(existingQueue.id, newProcessedCount);

      // Check if all chunks complete
      const isComplete = newProcessedCount >= existingQueue.totalCount;

      if (isComplete) {
        console.log('[CRON] ✓ All chunks complete - cleaning up queue');
        await deleteQueue(existingQueue.id);
      }

      const chunkNumber = Math.ceil(newProcessedCount / CHUNK_SIZE);

      const summary = {
        success: true,
        marketDay: true,
        mode: 'resume',
        chunk: chunkNumber,
        totalChunks: Math.ceil(existingQueue.totalCount / CHUNK_SIZE),
        processedItems: newProcessedCount,
        totalTickers: existingQueue.totalCount,
        totalSubscribers: metrics.totalSubscribers,
        analyzed: metrics.analyzed,
        failed: metrics.failed,
        broadcasts: {
          total: metrics.totalBroadcasts,
          successful: metrics.successfulBroadcasts,
          failed: metrics.failedBroadcasts,
        },
        apiCallsSaved: metrics.apiCallsSaved,
        durationMs: metrics.durationMs,
        durationSec: (metrics.durationMs / 1000).toFixed(1),
        isComplete,
      };

      console.log('[CRON] ✓ Chunk complete:', JSON.stringify(summary, null, 2));
      res.json(summary);
      return;
    }

    // FIRST RUN CASE: No queue exists, collect stocks and process first chunk
    console.log('[CRON] No existing queue - starting fresh collection');

    // Fetch market context
    const marketContext = await fetchMarketContext();

    if (marketContext) {
      console.log(`[CRON] ✓ Market context ready: ${marketContext.regime} regime (${Math.round(marketContext.regimeConfidence * 100)}% confidence)`);
      console.log(`[CRON]   VIX: ${marketContext.vix.toFixed(1)} | SPY: ${marketContext.spy.change1D > 0 ? '+' : ''}${marketContext.spy.change1D.toFixed(2)}% (1D)`);
    } else {
      console.warn('[CRON] ⚠️  Market context unavailable - continuing with neutral assumptions');
    }

    // Get all beta users
    const users = await getAllUsers();
    console.log(`[CRON] Found ${users.length} users`);

    // Collect and build queue
    const tickerMap = await collectStockRequests(users);
    const queue = buildPriorityQueue(tickerMap);

    console.log(`[CRON] ✓ Queue built with ${queue.length} tickers`);

    // Save queue to Redis
    const queueId = await saveQueueToRedis(queue, marketContext, CHUNK_SIZE);
    console.log(`[CRON] ✓ Queue saved to Redis: ${queueId}`);

    // Process first chunk
    const itemsToProcess = Math.min(CHUNK_SIZE, queue.length);
    console.log(`[CRON] Processing first chunk: ${itemsToProcess} items`);

    const metrics = await processQueue(queue, marketContext, 0, itemsToProcess);

    // Update processed count
    await updateProcessedCount(queueId, itemsToProcess);

    // Check if all items processed in first chunk (queue <= CHUNK_SIZE)
    const isComplete = itemsToProcess >= queue.length;

    if (isComplete) {
      console.log('[CRON] ✓ All items processed in single chunk - cleaning up queue');
      await deleteQueue(queueId);
    }

    const totalChunks = Math.ceil(queue.length / CHUNK_SIZE);

    const summary = {
      success: true,
      marketDay: true,
      mode: 'first_run',
      chunk: 1,
      totalChunks,
      processedItems: itemsToProcess,
      totalUsers: users.length,
      totalTickers: queue.length,
      totalSubscribers: metrics.totalSubscribers,
      analyzed: metrics.analyzed,
      failed: metrics.failed,
      broadcasts: {
        total: metrics.totalBroadcasts,
        successful: metrics.successfulBroadcasts,
        failed: metrics.failedBroadcasts,
      },
      apiCallsSaved: metrics.apiCallsSaved,
      durationMs: metrics.durationMs,
      durationSec: (metrics.durationMs / 1000).toFixed(1),
      isComplete,
      nextChunkAt: isComplete ? null : '5:45 AM PT (13:45 UTC)',
    };

    console.log('[CRON] ✓ First chunk complete:', JSON.stringify(summary, null, 2));
    res.json(summary);

  } catch (error) {
    console.error('[CRON] Fatal error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Fetch market context for today's analysis
 * Returns null if APIs unavailable (graceful degradation)
 */
async function fetchMarketContext(): Promise<MarketContext | null> {
  try {
    const fmpApiKey = process.env.FMP_API_KEY || '';
    const fredApiKey = process.env.FRED_API_KEY || '';

    if (!fmpApiKey || !fredApiKey) {
      console.warn('[CRON] Missing FMP/FRED API keys - skipping market context');
      return null;
    }

    const fmpClient = createFMPClient(fmpApiKey);
    const fredClient = createFREDClient(fredApiKey);

    // Fetch market context with smart caching (1-hour TTL)
    const marketContext = await getMarketContext(fmpClient, fredClient);

    return marketContext;
  } catch (error) {
    console.error('[CRON] Failed to fetch market context:', error);
    // Graceful degradation - continue without market context
    return null;
  }
}

/**
 * Check if today is a NYSE market day
 * Returns false for weekends and major holidays
 *
 * TODO v1.0.5: Add FMP holidays API integration
 */
async function checkNYSEMarketDay(): Promise<boolean> {
  const today = new Date();

  // Check if weekend (Saturday=6, Sunday=0)
  const dayOfWeek = today.getDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    console.log('[CRON] Weekend detected - market closed');
    return false;
  }

  // Check hardcoded 2025 holidays
  const dateStr = today.toISOString().split('T')[0];
  const holidays2025 = [
    '2025-01-01', // New Year's Day
    '2025-01-20', // MLK Day
    '2025-02-17', // Presidents Day
    '2025-04-18', // Good Friday
    '2025-05-26', // Memorial Day
    '2025-07-04', // Independence Day
    '2025-09-01', // Labor Day
    '2025-11-27', // Thanksgiving
    '2025-12-25'  // Christmas
  ];

  if (holidays2025.includes(dateStr)) {
    console.log(`[CRON] Holiday detected (${dateStr}) - market closed`);
    return false;
  }

  return true;
}

// Note: All analysis logic now handled by orchestrator (lib/orchestrator.ts)
// Old per-user sequential processing functions have been removed in v1.0.5
