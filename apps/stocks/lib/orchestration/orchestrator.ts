/**
 * Stock Analysis Orchestrator (v1.0.5)
 *
 * Scalable orchestrator that eliminates redundant API calls by:
 * 1. Collecting all stock requests across all users
 * 2. Deduplicating by ticker
 * 3. Prioritizing by highest subscriber tier
 * 4. Analyzing each ticker once
 * 5. Broadcasting results to all subscribers
 *
 * Benefits:
 * - 99.9% reduction in redundant work at scale
 * - Rate-limited processing prevents API overload
 * - Fault isolation (one failure doesn't block others)
 */

import { Client } from '@notionhq/client';
import { User, decryptToken } from '../core/auth';
import { analyzeStockCore, validateAnalysisComplete, AnalysisResult } from '../domain/stock/analyzer';
import { createNotionClient, AnalysisData } from '../integrations/notion/client';
import { reportScheduledTaskError } from '../shared/bug-reporter';
import { getMarketContext, MarketContext } from '../domain/market/index';
import { createFMPClient } from '../integrations/fmp/client';
import { createFREDClient } from '../integrations/fred/client';
import { setAnalysisError } from '../shared/error-handler';

// Environment configuration
const ANALYSIS_DELAY_MS = parseInt(process.env.ANALYSIS_DELAY_MS || '8000', 10); // Default: 8 seconds
const DRY_RUN = process.env.ORCHESTRATOR_DRY_RUN === 'true';

// Tier hierarchy for prioritization
const TIER_PRIORITY: Record<string, number> = {
  Pro: 1,
  Analyst: 2,
  Starter: 3,
  Free: 4,
};

/**
 * Subscriber information for a ticker
 */
export interface Subscriber {
  userId: string;
  email: string;
  tier: string;
  pageId: string;
  accessToken: string;
  notionUserId: string;
  timezone: string;
  stockAnalysesDbId: string;
  stockHistoryDbId: string;
}

/**
 * Queue item for processing
 */
export interface QueueItem {
  ticker: string;
  priority: number; // Lower number = higher priority
  subscribers: Subscriber[];
  requestedAt: Date;
}

/**
 * Orchestrator execution metrics
 */
export interface OrchestratorMetrics {
  totalTickers: number;
  totalSubscribers: number;
  analyzed: number;
  failed: number;
  skipped: number;
  totalBroadcasts: number;
  successfulBroadcasts: number;
  failedBroadcasts: number;
  durationMs: number;
  apiCallsSaved: number; // Calls saved by deduplication
}

/**
 * Step 1: Collect stock requests from all users
 *
 * Queries each user's Stock Analyses database for stocks with
 * Analysis Cadence = "Daily", groups by ticker.
 */
export async function collectStockRequests(
  users: User[]
): Promise<Map<string, Subscriber[]>> {
  console.log(`[ORCHESTRATOR] Collecting stock requests from ${users.length} users...`);

  const tickerMap = new Map<string, Subscriber[]>();

  for (const user of users) {
    try {
      // Skip users without configured databases
      if (!user.stockAnalysesDbId) {
        console.log(`[ORCHESTRATOR]   → User ${user.email}: No Stock Analyses DB configured, skipping`);
        continue;
      }

      // Decrypt user's OAuth token
      const userAccessToken = await decryptToken(user.accessToken);
      const notion = new Client({ auth: userAccessToken, notionVersion: '2025-09-03' });

      // Get data source ID for API v2025-09-03
      const db = await notion.databases.retrieve({ database_id: user.stockAnalysesDbId });
      const dataSourceId = (db as any).data_sources?.[0]?.id;

      if (!dataSourceId) {
        console.warn(`[ORCHESTRATOR]   → User ${user.email}: No data source found, skipping`);
        continue;
      }

      // Query user's Stock Analyses database (user-specific DB ID)
      // Handle pagination to ensure all stocks are collected
      const allResults: any[] = [];
      let hasMore = true;
      let cursor: string | undefined = undefined;

      while (hasMore) {
        const response = await notion.dataSources.query({
          data_source_id: dataSourceId,
          filter: {
            property: 'Analysis Cadence',
            select: { equals: 'Daily' },
          },
          start_cursor: cursor,
        });

        allResults.push(...response.results);
        hasMore = response.has_more;
        cursor = response.next_cursor || undefined;
      }

      console.log(`[ORCHESTRATOR]   → User ${user.email}: Query returned ${allResults.length} raw results`);

      console.log(`[ORCHESTRATOR]   → User ${user.email}: Found ${allResults.length} stocks`);

      // Extract tickers and add to map
      for (const page of allResults) {
        if (!('properties' in page)) {
          continue;
        }
        const ticker = (page.properties as any).Ticker?.title?.[0]?.text?.content || '';

        if (!ticker) {
          console.warn(`[ORCHESTRATOR]   → Skipping page ${page.id} (no ticker)`);
          continue;
        }

        // Log status for debugging stuck stocks
        const status = (page.properties as any).Status?.status?.name || 'Unknown';
        if (status === 'Analyzing') {
          const lastAnalysis = (page.properties as any)['Last Auto-Analysis']?.date?.start;
          const isStale = lastAnalysis && (Date.now() - new Date(lastAnalysis).getTime() > 24 * 60 * 60 * 1000);

          if (isStale) {
            console.warn(`[ORCHESTRATOR]   → ⚠️ Found STUCK stock: ${ticker} (Status: Analyzing, Last: ${lastAnalysis}) - Will be re-queued`);
          } else {
            console.log(`[ORCHESTRATOR]   → Found analyzing stock: ${ticker} (Status: Analyzing)`);
          }
        }

        const tickerUpper = ticker.toUpperCase().trim();

        // Add subscriber to this ticker
        if (!tickerMap.has(tickerUpper)) {
          tickerMap.set(tickerUpper, []);
        }

        tickerMap.get(tickerUpper)!.push({
          userId: user.id,
          email: user.email,
          tier: user.subscriptionTier || 'Free',
          pageId: page.id,
          accessToken: userAccessToken,
          notionUserId: user.notionUserId,
          timezone: user.timezone || 'America/Los_Angeles',
          stockAnalysesDbId: user.stockAnalysesDbId!,
          stockHistoryDbId: user.stockHistoryDbId || '',
        });
      }
    } catch (error) {
      console.error(`[ORCHESTRATOR]   → Failed to collect from user ${user.email}:`, error);
      // Continue with other users
    }
  }

  console.log(`[ORCHESTRATOR] ✓ Collected ${tickerMap.size} unique tickers`);
  return tickerMap;
}

/**
 * Step 2: Build prioritized queue
 *
 * For each ticker, determine priority based on highest tier among subscribers.
 * Sort queue by priority (Pro → Analyst → Starter → Free).
 */
export function buildPriorityQueue(
  tickerMap: Map<string, Subscriber[]>
): QueueItem[] {
  console.log(`[ORCHESTRATOR] Building priority queue...`);

  const queue: QueueItem[] = [];

  for (const [ticker, subscribers] of tickerMap.entries()) {
    // Find highest tier (lowest priority number)
    const highestPriority = Math.min(
      ...subscribers.map(s => TIER_PRIORITY[s.tier] || 99)
    );

    queue.push({
      ticker,
      priority: highestPriority,
      subscribers,
      requestedAt: new Date(),
    });

    const tierName = Object.keys(TIER_PRIORITY).find(
      t => TIER_PRIORITY[t] === highestPriority
    ) || 'Unknown';

    console.log(
      `[ORCHESTRATOR]   → ${ticker}: ${subscribers.length} subscribers, priority=${tierName}`
    );
  }

  // Sort by priority (ascending - lower number = higher priority)
  queue.sort((a, b) => a.priority - b.priority);

  console.log(`[ORCHESTRATOR] ✓ Queue built with ${queue.length} items`);
  return queue;
}

/**
 * Step 3: Process queue with rate limiting and error isolation
 *
 * For each ticker:
 * 1. Analyze once (with retry on 503)
 * 2. Validate completeness
 * 3. Broadcast to all subscribers (parallel with Promise.allSettled)
 * 4. Delay before next ticker
 *
 * Supports chunked processing:
 * - startIndex: Start processing from this index (default: 0)
 * - maxItems: Process at most this many items (default: all)
 */
export async function processQueue(
  queue: QueueItem[],
  marketContext: MarketContext | null = null,
  startIndex: number = 0,
  maxItems: number = Number.MAX_SAFE_INTEGER
): Promise<OrchestratorMetrics> {
  const endIndex = Math.min(startIndex + maxItems, queue.length);
  const chunkSize = endIndex - startIndex;

  console.log(`[ORCHESTRATOR] Processing queue chunk: items ${startIndex + 1}-${endIndex} of ${queue.length} (${chunkSize} items)`);
  console.log(`[ORCHESTRATOR] Rate limit: ${ANALYSIS_DELAY_MS}ms delay between tickers`);
  console.log(`[ORCHESTRATOR] Dry run mode: ${DRY_RUN ? 'ENABLED' : 'DISABLED'}`);

  const startTime = Date.now();
  const metrics: OrchestratorMetrics = {
    totalTickers: queue.length,
    totalSubscribers: queue.reduce((sum, item) => sum + item.subscribers.length, 0),
    analyzed: 0,
    failed: 0,
    skipped: 0,
    totalBroadcasts: 0,
    successfulBroadcasts: 0,
    failedBroadcasts: 0,
    durationMs: 0,
    apiCallsSaved: 0,
  };

  for (let i = startIndex; i < endIndex; i++) {
    const item = queue[i];
    const isLastItem = i === endIndex - 1;

    console.log(`\n[ORCHESTRATOR] [${i + 1}/${queue.length}] Processing ${item.ticker} (${item.subscribers.length} subscribers)...`);

    if (DRY_RUN) {
      // Dry run - simulate without actual analysis
      console.log(`[ORCHESTRATOR]   → [DRY RUN] Would analyze ${item.ticker} for:`);
      for (const sub of item.subscribers) {
        console.log(`[ORCHESTRATOR]      • ${sub.email} (${sub.tier})`);
      }
      metrics.analyzed++;
      metrics.apiCallsSaved += (item.subscribers.length - 1) * 17; // 17 API calls per analysis
      continue;
    }

    // Set Status to "Analyzing" for all subscribers before analysis starts
    await setAnalyzingStatus(item.subscribers);

    // Step 3a: Analyze stock once WITH market context
    const analysisResult = await analyzeWithRetry(item, 3, marketContext);

    if (!analysisResult.success) {
      console.error(`[ORCHESTRATOR]   → ✗ Analysis failed: ${analysisResult.error}`);
      metrics.failed++;

      // Mark all subscribers' pages with error
      await broadcastError(item.subscribers, analysisResult.error || 'Analysis failed', item.ticker);
      continue;
    }

    // Step 3b: Validate completeness
    if (!validateAnalysisComplete(analysisResult)) {
      console.error(`[ORCHESTRATOR]   → ✗ Analysis incomplete (missing required fields)`);
      metrics.failed++;

      await broadcastError(item.subscribers, 'Analysis incomplete - missing required fields', item.ticker);
      continue;
    }

    console.log(`[ORCHESTRATOR]   → ✓ Analysis complete (composite: ${analysisResult.scores.composite}/5.0)`);
    metrics.analyzed++;

    // Step 3c: Broadcast to all subscribers (parallel with isolation)
    const broadcastResults = await broadcastToSubscribers(item.subscribers, analysisResult);

    const successfulCount = broadcastResults.filter(r => r.status === 'fulfilled').length;
    const failedCount = broadcastResults.filter(r => r.status === 'rejected').length;

    metrics.totalBroadcasts += broadcastResults.length;
    metrics.successfulBroadcasts += successfulCount;
    metrics.failedBroadcasts += failedCount;

    // Calculate API calls saved (N subscribers - 1 analysis = N-1 saved)
    metrics.apiCallsSaved += (item.subscribers.length - 1) * 17;

    // Step 3d: Create Stock History entry for EACH subscriber who had successful broadcast
    // This ensures all users tracking the same ticker get their own history entry
    if (successfulCount > 0) {
      // CRITICAL FIX: Deduplicate subscribers by userId to prevent duplicate Stock History entries
      // If a user has multiple Stock Analyses pages for the same ticker (both set to "Daily"),
      // they would appear multiple times in item.subscribers, causing duplicate history entries.
      // We want ONE Stock History entry per USER per TICKER per DAY, not one per page.
      const uniqueSubscribers = new Map<string, Subscriber>();

      item.subscribers.forEach((subscriber, index) => {
        // Only include subscribers with successful broadcasts
        const broadcastResult = broadcastResults[index];
        if (broadcastResult.status === 'fulfilled') {
          // Use userId as key to deduplicate (first occurrence wins)
          if (!uniqueSubscribers.has(subscriber.userId)) {
            uniqueSubscribers.set(subscriber.userId, subscriber);
          }
        }
      });

      const uniqueCount = uniqueSubscribers.size;
      const skippedDuplicates = item.subscribers.filter((_, i) => broadcastResults[i].status === 'fulfilled').length - uniqueCount;

      console.log(`[ORCHESTRATOR]   → Creating Stock History for ${uniqueCount} unique users...`);
      if (skippedDuplicates > 0) {
        console.log(`[ORCHESTRATOR]      ℹ️  Skipped ${skippedDuplicates} duplicate entries (same user, multiple pages)`);
      }

      // Create history entry for each unique subscriber in parallel
      const historyPromises = Array.from(uniqueSubscribers.values()).map(async (subscriber) => {
        try {
          const notionClient = createNotionClient({
            apiKey: subscriber.accessToken,
            stockAnalysesDbId: subscriber.stockAnalysesDbId,
            stockHistoryDbId: subscriber.stockHistoryDbId,
            userId: subscriber.notionUserId,
            timezone: subscriber.timezone,
          });

          // Archive to Stock History with market regime
          const currentRegime = marketContext?.regime;
          const historyPageId = await notionClient.archiveToHistory(
            subscriber.pageId,
            currentRegime
          );

          if (historyPageId) {
            console.log(`[ORCHESTRATOR]      ✓ ${subscriber.email}: History created (${historyPageId.substring(0, 8)}...)`);
            return { email: subscriber.email, success: true, historyPageId };
          } else {
            console.warn(`[ORCHESTRATOR]      ⚠️  ${subscriber.email}: History creation returned null`);
            return { email: subscriber.email, success: false, reason: 'returned_null' };
          }
        } catch (error) {
          console.error(`[ORCHESTRATOR]      ✗ ${subscriber.email}: Failed to create history:`, error);
          return { email: subscriber.email, success: false, reason: error instanceof Error ? error.message : String(error) };
        }
      });

      // Wait for all history creation attempts
      const historyResults = await Promise.allSettled(historyPromises);
      const historySuccessCount = historyResults.filter(r => r.status === 'fulfilled' && r.value.success).length;

      console.log(`[ORCHESTRATOR]   → Stock History: ${historySuccessCount}/${uniqueCount} unique users created successfully`);
    }

    // Step 3e: Delay before next ticker (except last)
    if (!isLastItem && ANALYSIS_DELAY_MS > 0) {
      console.log(`[ORCHESTRATOR]   → Waiting ${ANALYSIS_DELAY_MS}ms before next ticker...`);
      await delay(ANALYSIS_DELAY_MS);
    }
  }

  metrics.durationMs = Date.now() - startTime;

  console.log(`\n[ORCHESTRATOR] ✓ Queue chunk processing complete`);
  console.log(`[ORCHESTRATOR]   Chunk: items ${startIndex + 1}-${endIndex} of ${metrics.totalTickers}`);
  console.log(`[ORCHESTRATOR]   Analyzed: ${metrics.analyzed}`);
  console.log(`[ORCHESTRATOR]   Failed: ${metrics.failed}`);
  console.log(`[ORCHESTRATOR]   Broadcasts: ${metrics.successfulBroadcasts}/${metrics.totalBroadcasts} succeeded`);
  console.log(`[ORCHESTRATOR]   API calls saved: ${metrics.apiCallsSaved}`);
  console.log(`[ORCHESTRATOR]   Duration: ${(metrics.durationMs / 1000).toFixed(1)}s`);

  return metrics;
}

/**
 * Analyze stock with exponential backoff retry on 503/429 errors
 */
async function analyzeWithRetry(
  item: QueueItem,
  maxRetries: number = 3,
  marketContext: MarketContext | null = null
): Promise<AnalysisResult> {
  const backoffDelays = [2000, 4000, 8000]; // 2s, 4s, 8s

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Use first subscriber's credentials (all subscribers get same analysis)
      const firstSubscriber = item.subscribers[0];

      const result = await analyzeStockCore({
        ticker: item.ticker,
        userAccessToken: firstSubscriber.accessToken,
        notionUserId: firstSubscriber.notionUserId,
        timezone: firstSubscriber.timezone,
        marketContext, // Pass market context to stock analysis
        stockAnalysesDbId: firstSubscriber.stockAnalysesDbId, // v1.0.9: Enable historical context
        stockHistoryDbId: firstSubscriber.stockHistoryDbId, // v1.0.9: Enable historical context
      });

      // If analysis succeeded or failed with non-retryable error, return
      if (result.success || !isGeminiRateLimitError(result.error)) {
        return result;
      }

      // Gemini 503/429 error - retry with backoff
      if (attempt < maxRetries - 1) {
        // Extract retry delay from error message if available
        const retryAfterSeconds = extractRetryAfter(result.error);
        const delayMs = retryAfterSeconds
          ? retryAfterSeconds * 1000
          : backoffDelays[attempt];

        const errorType = result.error?.includes('429') ? '429 Rate Limit' : '503 Service Unavailable';
        console.warn(
          `[ORCHESTRATOR]   → Gemini ${errorType} error, retrying in ${(delayMs / 1000).toFixed(1)}s (attempt ${attempt + 1}/${maxRetries})...`
        );
        await delay(delayMs);
      } else {
        console.error(`[ORCHESTRATOR]   → Gemini error, max retries reached`);
        return result;
      }
    } catch (error) {
      console.error(`[ORCHESTRATOR]   → Analysis threw exception:`, error);

      // Report to Bug Reports database
      reportScheduledTaskError(
        error as Error,
        'orchestrator-analyze',
        {
          ticker: item.ticker,
          subscribersCount: item.subscribers.length,
          priorityTier: item.subscribers[0]?.tier,
        }
      ).catch((reportError) => {
        console.error('[ORCHESTRATOR]   → Failed to report bug:', reportError);
      });

      return {
        success: false,
        ticker: item.ticker,
        technical: {},
        fundamental: {},
        macro: {},
        scores: {
          composite: 0,
          technical: 0,
          fundamental: 0,
          macro: 0,
          risk: 0,
          sentiment: 0,
          marketAlignment: 0,
          recommendation: 'Error',
        },
        dataQuality: {
          completeness: 0,
          grade: 'F',
          confidence: 'None',
          canProceed: false,
          missingFields: [],
        },
        llmAnalysis: {
          content: '',
          modelUsed: 'none',
          tokensUsed: { input: 0, output: 0, total: 0 },
          cost: 0,
          latencyMs: 0,
        },
        apiCalls: { fmp: 0, fred: 0, total: 0 },
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  // Should never reach here, but TypeScript needs a return
  throw new Error('Unexpected: retry loop completed without return');
}

/**
 * Check if error is a Gemini rate limit error (503 or 429)
 */
function isGeminiRateLimitError(error: string | undefined): boolean {
  if (!error) return false;
  return (error.includes('503') && error.includes('overloaded')) ||
    (error.includes('429') && error.includes('quota'));
}

/**
 * Extract retry delay from Gemini error message
 * Example: "Please retry in 48.50719905s" → 48.5
 */
function extractRetryAfter(error: string | undefined): number | null {
  if (!error) return null;

  // Match "Please retry in X.XXs" or "Please retry in Xs"
  const match = error.match(/Please retry in ([\d.]+)s/);
  if (match && match[1]) {
    const seconds = parseFloat(match[1]);
    // Cap at 60 seconds for safety
    return Math.min(Math.ceil(seconds), 60);
  }

  return null;
}

/**
 * Broadcast analysis result to all subscribers (parallel with isolation)
 */
async function broadcastToSubscribers(
  subscribers: Subscriber[],
  analysisResult: AnalysisResult
): Promise<PromiseSettledResult<void>[]> {
  console.log(`[ORCHESTRATOR]   → Broadcasting to ${subscribers.length} subscribers...`);

  // Broadcast in parallel with Promise.allSettled (isolation)
  const broadcastPromises = subscribers.map(subscriber =>
    broadcastToUser(subscriber, analysisResult)
  );

  const results = await Promise.allSettled(broadcastPromises);

  // Log results
  const succeeded = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;

  console.log(`[ORCHESTRATOR]   → Broadcast complete: ${succeeded}/${subscribers.length} succeeded, ${failed} failed`);

  // Log individual failures
  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      console.error(
        `[ORCHESTRATOR]      ✗ ${subscribers[index].email}: ${result.reason}`
      );
    }
  });

  return results;
}

/**
 * Broadcast to single user with retry
 */
async function broadcastToUser(
  subscriber: Subscriber,
  analysisResult: AnalysisResult,
  maxRetries: number = 2
): Promise<void> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Create Notion client for this user (with user-specific database IDs)
      const notionClient = createNotionClient({
        apiKey: subscriber.accessToken,
        stockAnalysesDbId: subscriber.stockAnalysesDbId,
        stockHistoryDbId: subscriber.stockHistoryDbId,
        userId: subscriber.notionUserId,
        timezone: subscriber.timezone,
      });

      // Prepare analysis data
      const analysisData: AnalysisData = {
        ticker: analysisResult.ticker,
        companyName: analysisResult.fundamental.company_name || analysisResult.ticker,
        timestamp: new Date(),
        technical: analysisResult.technical,
        fundamental: analysisResult.fundamental,
        macro: analysisResult.macro,
        scores: analysisResult.scores,
        apiCalls: analysisResult.apiCalls,
      };

      // Write to Notion (Stock Analyses only - NOT Stock History yet)
      // usePollingWorkflow = true prevents duplicate Stock History creation per subscriber
      // Stock History will be created ONCE per ticker after all broadcasts succeed
      const syncResult = await notionClient.syncToNotion(analysisData, true);

      // CRITICAL: Validate sync succeeded before marking "Complete"
      if (!syncResult.analysesPageId) {
        throw new Error('Sync failed: Stock Analyses page was not created or updated');
      }

      // Set Status to "Complete" since analysis is done
      const notion = new Client({ auth: subscriber.accessToken, notionVersion: '2025-09-03' });
      try {
        await notion.pages.update({
          page_id: subscriber.pageId,
          properties: {
            'Status': { status: { name: 'Complete' } },
          },
        });
      } catch (error: any) {
        // Gracefully handle if Status property doesn't exist
        if (error.code !== 'validation_error') {
          console.warn(`[ORCHESTRATOR]      ⚠️  Could not set Status: ${error.message}`);
        }
      }

      // Update content with LLM analysis
      // TODO: Implement full content write with historical context

      console.log(`[ORCHESTRATOR]      ✓ ${subscriber.email}`);
      return;
    } catch (error) {
      if (attempt < maxRetries - 1) {
        console.warn(
          `[ORCHESTRATOR]      Retry ${attempt + 1}/${maxRetries} for ${subscriber.email} after error:`,
          error instanceof Error ? error.message : String(error)
        );
        await delay(5000); // 5s backoff
      } else {
        // Max retries reached - set error state and notify admin
        console.error(
          `[ORCHESTRATOR]      ✗ Broadcast failed after ${maxRetries} attempts for ${subscriber.email}`
        );

        // Use centralized error handler to mark error state
        const notion = new Client({ auth: subscriber.accessToken, notionVersion: '2025-09-03' });
        await setAnalysisError(
          notion,
          subscriber.pageId,
          error instanceof Error ? error : new Error(String(error)),
          {
            ticker: analysisResult.ticker,
            userEmail: subscriber.email,
            timestamp: new Date(),
            errorType: 'broadcast_failed',
            phase: 'notion_write'
          }
        );

        // Re-throw to trigger Promise.allSettled rejection (for metrics)
        throw new Error(
          `Broadcast failed after ${maxRetries} attempts: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
  }
}

/**
 * Broadcast error to all subscribers
 */
/**
 * Set Status to "Analyzing" for all subscribers before analysis starts
 */
async function setAnalyzingStatus(subscribers: Subscriber[]): Promise<void> {
  const promises = subscribers.map(async subscriber => {
    try {
      const notion = new Client({ auth: subscriber.accessToken, notionVersion: '2025-09-03' });

      await notion.pages.update({
        page_id: subscriber.pageId,
        properties: {
          'Status': {
            status: { name: 'Analyzing' },
          },
        },
      });
    } catch (error: any) {
      // Silently fail if Status property doesn't exist
      if (error.code !== 'validation_error') {
        console.warn(`[ORCHESTRATOR]      ⚠️  Could not set Analyzing status for ${subscriber.email}`);
      }
    }
  });

  await Promise.allSettled(promises);
}

async function broadcastError(
  subscribers: Subscriber[],
  errorMessage: string,
  ticker?: string
): Promise<void> {
  console.log(`[ORCHESTRATOR]   → Broadcasting error to ${subscribers.length} subscribers...`);

  const errorPromises = subscribers.map(async subscriber => {
    try {
      const notion = new Client({ auth: subscriber.accessToken, notionVersion: '2025-09-03' });

      // Use centralized error handler to ensure consistent error state
      await setAnalysisError(
        notion,
        subscriber.pageId,
        new Error(errorMessage),
        {
          ticker: ticker || 'UNKNOWN',
          userEmail: subscriber.email,
          timestamp: new Date(),
          errorType: 'analysis_failed',
          phase: 'analysis'
        }
      );

      console.log(`[ORCHESTRATOR]      ✓ Error state set for ${subscriber.email}`);
    } catch (error) {
      console.error(`[ORCHESTRATOR]      ✗ Failed to set error state for ${subscriber.email}:`, error);
      // Don't throw - we're already handling an error, don't cascade
    }
  });

  await Promise.allSettled(errorPromises);
}

/**
 * Delay helper
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Step 0: Get or fetch market context with smart caching
 *
 * Fetches market context once per orchestrator run and caches for 1 hour.
 * This provides regime awareness for all stock analyses.
 */
async function getOrFetchMarketContext(): Promise<MarketContext | null> {
  try {
    const fmpApiKey = process.env.FMP_API_KEY || '';
    const fredApiKey = process.env.FRED_API_KEY || '';

    if (!fmpApiKey || !fredApiKey) {
      console.warn('[MARKET] Missing API keys - skipping market context');
      return null;
    }

    const fmpClient = createFMPClient(fmpApiKey);
    const fredClient = createFREDClient(fredApiKey);

    // Fetch with smart caching (1-hour TTL)
    const marketContext = await getMarketContext(fmpClient, fredClient);

    return marketContext;
  } catch (error) {
    console.error('[MARKET] Failed to fetch market context:', error);
    // Graceful degradation - continue without market context
    return null;
  }
}

/**
 * Main orchestrator entry point
 *
 * @param users Array of users to process
 * @param marketContextOverride Optional pre-fetched market context (cron can pass this)
 * @param startIndex Start processing from this index (for chunked processing)
 * @param maxItems Process at most this many items (for chunked processing)
 */
export async function runOrchestrator(
  users: User[],
  marketContextOverride?: MarketContext | null,
  startIndex: number = 0,
  maxItems: number = Number.MAX_SAFE_INTEGER
): Promise<OrchestratorMetrics> {
  console.log('\n' + '='.repeat(60));
  console.log('Stock Analysis Orchestrator v1.2.0 (with Chunked Processing)');
  console.log('='.repeat(60));

  // Step 0: Use provided market context or fetch fresh
  const marketContext = marketContextOverride !== undefined
    ? marketContextOverride
    : await getOrFetchMarketContext();

  if (marketContext) {
    console.log(`[MARKET] Market Regime: ${marketContext.regime} (${Math.round(marketContext.regimeConfidence * 100)}% confidence)`);
    console.log(`[MARKET] Risk Assessment: ${marketContext.riskAssessment}`);
    console.log(`[MARKET] VIX: ${marketContext.vix.toFixed(1)} | SPY: ${marketContext.spy.change1D > 0 ? '+' : ''}${marketContext.spy.change1D.toFixed(2)}% (1D)`);
    console.log(`[MARKET] Top Sectors: ${marketContext.sectorLeaders.map(s => s.name).join(', ')}`);
  }

  // Step 1: Collect requests
  const tickerMap = await collectStockRequests(users);

  if (tickerMap.size === 0) {
    console.log('[ORCHESTRATOR] No stocks to analyze');
    return {
      totalTickers: 0,
      totalSubscribers: 0,
      analyzed: 0,
      failed: 0,
      skipped: 0,
      totalBroadcasts: 0,
      successfulBroadcasts: 0,
      failedBroadcasts: 0,
      durationMs: 0,
      apiCallsSaved: 0,
    };
  }

  // Step 2: Build priority queue
  const queue = buildPriorityQueue(tickerMap);

  // Step 3: Process queue WITH market context AND chunking support
  const metrics = await processQueue(queue, marketContext, startIndex, maxItems);

  console.log('\n' + '='.repeat(60));
  console.log('Orchestrator Chunk Complete');
  console.log('='.repeat(60));

  return metrics;
}
