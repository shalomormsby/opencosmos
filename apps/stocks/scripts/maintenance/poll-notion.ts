#!/usr/bin/env ts-node
/**
 * Notion Polling Script
 *
 * Continuously polls Stock Analyses database for pending analysis requests.
 * When "Request Analysis" checkbox is checked:
 *   1. Marks page as "Processing"
 *   2. Calls /api/analyze with ticker
 *   3. Handles response (success/error)
 *   4. Continues polling
 *
 * Usage:
 *   npm run poll
 *   # or
 *   ts-node scripts/poll-notion.ts
 *
 * Environment Variables:
 *   NOTION_API_KEY - Notion integration token
 *   STOCK_ANALYSES_DB_ID - Stock Analyses database ID
 *   API_BASE_URL - Base URL for API (default: http://localhost:3000)
 *   API_KEY - Optional API key for authenticated requests
 *   POLL_INTERVAL - Polling interval in seconds (default: 30)
 *
 * v1.0 - Vercel Serverless + TypeScript
 */

import dotenv from 'dotenv';
import { createNotionPoller } from '../../lib/integrations/notion/poller';

// Load environment variables
dotenv.config();

interface AnalyzeResponse {
  success: boolean;
  ticker: string;
  analysesPageId: string | null;
  historyPageId: string | null;
  scores?: {
    composite: number;
    recommendation: string;
  };
  error?: string;
  details?: string;
}

/**
 * Call /api/analyze endpoint
 */
async function callAnalyzeAPI(
  ticker: string,
  baseUrl: string,
  apiKey?: string
): Promise<AnalyzeResponse> {
  const url = `${baseUrl}/api/analyze`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (apiKey) {
    headers['X-API-Key'] = apiKey;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      ticker,
      usePollingWorkflow: false, // Don't wait for AI analysis in poller
      skipPolling: true, // Skip polling to avoid timeout
    }),
  });

  const data = await response.json() as AnalyzeResponse;

  if (!response.ok) {
    throw new Error(data.error || `API returned ${response.status}`);
  }

  return data;
}

/**
 * Process a single pending analysis
 */
async function processPendingAnalysis(
  pageId: string,
  ticker: string,
  poller: ReturnType<typeof createNotionPoller>,
  baseUrl: string,
  apiKey?: string
): Promise<void> {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Processing analysis request for ${ticker}`);
  console.log(`Page ID: ${pageId}`);
  console.log(`${'='.repeat(60)}\n`);

  try {
    // Mark as processing
    await poller.markAsProcessing(pageId);

    // Call analyze API
    console.log(`🚀 Calling analyze API for ${ticker}...`);
    const result = await callAnalyzeAPI(ticker, baseUrl, apiKey);

    if (result.success) {
      console.log(`✅ Analysis completed for ${ticker}`);
      console.log(`   Composite Score: ${result.scores?.composite}`);
      console.log(`   Recommendation: ${result.scores?.recommendation}`);
      console.log(`   Analyses Page: ${result.analysesPageId}`);

      // Note: /api/analyze already writes to Notion, so we don't need to update again
      console.log(`   Results written to Notion`);
    } else {
      console.error(`❌ Analysis failed for ${ticker}: ${result.error}`);
      await poller.markAsFailed(pageId, result.error || 'Unknown error');
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`❌ Error processing ${ticker}:`, errorMessage);

    try {
      await poller.markAsFailed(pageId, errorMessage);
    } catch (updateError) {
      console.error('❌ Failed to mark page as failed:', updateError);
    }
  }

  console.log(`\n${'='.repeat(60)}\n`);
}

/**
 * Main polling loop
 */
async function pollLoop(): Promise<void> {
  // Validate environment variables
  const notionApiKey = process.env.NOTION_API_KEY;
  const stockAnalysesDbId = process.env.STOCK_ANALYSES_DB_ID;
  const apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:3000';
  const apiKey = process.env.API_KEY;
  const pollInterval = parseInt(process.env.POLL_INTERVAL || '30', 10);

  if (!notionApiKey) {
    throw new Error('NOTION_API_KEY environment variable is required');
  }

  if (!stockAnalysesDbId) {
    throw new Error('STOCK_ANALYSES_DB_ID environment variable is required');
  }

  console.log('\n' + '='.repeat(60));
  console.log('Sage Stocks Notion Poller v1.0');
  console.log('='.repeat(60));
  console.log(`API Base URL: ${apiBaseUrl}`);
  console.log(`API Key: ${apiKey ? '[SET]' : '[NOT SET]'}`);
  console.log(`Poll Interval: ${pollInterval} seconds`);
  console.log(`Stock Analyses DB: ${stockAnalysesDbId}`);
  console.log('='.repeat(60) + '\n');

  // Create poller
  const poller = createNotionPoller({
    apiKey: notionApiKey,
    stockAnalysesDbId,
    pollInterval,
  });

  console.log('🔄 Starting polling loop...\n');

  // Poll loop
  let iteration = 0;

  while (true) {
    iteration++;
    const now = new Date().toISOString();

    try {
      console.log(`[${now}] Polling iteration #${iteration}...`);

      // Query for pending analyses
      const pending = await poller.queryPendingAnalyses();

      if (pending.length === 0) {
        console.log('   No pending analyses found');
      } else {
        console.log(`   Found ${pending.length} pending analysis request(s):`);

        for (const request of pending) {
          console.log(
            `   - ${request.ticker} (Page: ${request.pageId.slice(0, 8)}..., Last edited: ${request.lastEditedTime})`
          );
        }

        // Process each pending analysis
        for (const request of pending) {
          await processPendingAnalysis(
            request.pageId,
            request.ticker,
            poller,
            apiBaseUrl,
            apiKey
          );

          // Add small delay between analyses to avoid overwhelming APIs
          if (pending.length > 1) {
            console.log('⏳ Waiting 5 seconds before next analysis...\n');
            await new Promise((resolve) => setTimeout(resolve, 5000));
          }
        }
      }
    } catch (error) {
      console.error('❌ Error in polling loop:', error);
      // Continue polling even if there's an error
    }

    // Wait for next poll interval
    console.log(`\n⏳ Waiting ${pollInterval} seconds until next poll...\n`);
    await new Promise((resolve) => setTimeout(resolve, pollInterval * 1000));
  }
}

/**
 * Graceful shutdown handler
 */
function setupShutdownHandlers(): void {
  const shutdown = (signal: string) => {
    console.log(`\n\n${'='.repeat(60)}`);
    console.log(`Received ${signal}, shutting down gracefully...`);
    console.log('='.repeat(60) + '\n');
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  setupShutdownHandlers();

  try {
    await pollLoop();
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}
