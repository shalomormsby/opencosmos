/**
 * Test Script for Analysis Endpoint
 *
 * Tests the complete analysis workflow locally without deploying to Vercel.
 * Useful for development and debugging.
 *
 * Usage:
 *   npx ts-node scripts/test-analyze.ts NVDA
 *   npx ts-node scripts/test-analyze.ts AAPL --no-polling
 *   npx ts-node scripts/test-analyze.ts MSFT --timeout=300
 */

import * as dotenv from 'dotenv';
import { createFMPClient } from '../../lib/integrations/fmp/client';
import { createFREDClient } from '../../lib/integrations/fred/client';
import { createStockScorer } from '../../lib/domain/analysis/scoring';
import { createNotionClient, AnalysisData } from '../../lib/integrations/notion/client';

// Load environment variables
dotenv.config();

async function testAnalysis(
  ticker: string,
  options: {
    usePollingWorkflow?: boolean;
    timeout?: number;
    pollInterval?: number;
    skipPolling?: boolean;
  } = {}
) {
  const {
    usePollingWorkflow = true,
    timeout = 600,
    pollInterval = 10,
    skipPolling = false,
  } = options;

  console.log('='.repeat(60));
  console.log(`Testing analysis for ${ticker}`);
  console.log(`Workflow: ${usePollingWorkflow ? 'v0.3.0 (polling)' : 'v0.2.9 (immediate)'}`);
  console.log('='.repeat(60));

  const startTime = Date.now();

  try {
    // Validate environment variables
    const fmpApiKey = process.env.FMP_API_KEY;
    const fredApiKey = process.env.FRED_API_KEY;
    const notionApiKey = process.env.NOTION_API_KEY;
    const stockAnalysesDbId = process.env.STOCK_ANALYSES_DB_ID;
    const stockHistoryDbId = process.env.STOCK_HISTORY_DB_ID;
    const notionUserId = process.env.NOTION_USER_ID;

    if (!fmpApiKey) throw new Error('FMP_API_KEY not set in .env');
    if (!fredApiKey) throw new Error('FRED_API_KEY not set in .env');
    if (!notionApiKey) throw new Error('NOTION_API_KEY not set in .env');
    if (!stockAnalysesDbId) throw new Error('STOCK_ANALYSES_DB_ID not set in .env');
    if (!stockHistoryDbId) throw new Error('STOCK_HISTORY_DB_ID not set in .env');

    // Initialize clients
    const fmpClient = createFMPClient(fmpApiKey);
    const fredClient = createFREDClient(fredApiKey);
    const scorer = createStockScorer();
    const notionClient = createNotionClient({
      apiKey: notionApiKey,
      stockAnalysesDbId,
      stockHistoryDbId,
      userId: notionUserId,
    });

    console.log('\n✅ All clients initialized');

    // Step 1: Fetch data
    console.log('\n📊 Step 1/5: Fetching stock data...');

    const [fmpData, macroData] = await Promise.all([
      fmpClient.getAnalysisData(ticker),
      fredClient.getMacroData(),
    ]);

    console.log('✅ Data fetched successfully');

    // Step 2: Prepare data for scoring
    console.log('\n📊 Step 2/5: Preparing data...');

    const technical = {
      current_price: fmpData.quote.price,
      ma_50: fmpData.technicalIndicators.sma50[0]?.sma,
      ma_200: fmpData.technicalIndicators.sma200[0]?.sma,
      rsi: fmpData.technicalIndicators.rsi[0]?.rsi,
      macd: fmpData.technicalIndicators.ema12[0]?.ema,
      macd_signal: fmpData.technicalIndicators.ema26[0]?.ema,
      volume: fmpData.quote.volume,
      avg_volume_20d: fmpData.quote.avgVolume,
      volatility_30d: undefined,
      price_change_1d: fmpData.quote.change / fmpData.quote.previousClose,
      price_change_5d: undefined,
      price_change_1m: undefined,
      week_52_high: fmpData.quote.yearHigh,
      week_52_low: fmpData.quote.yearLow,
    };

    const fundamental = {
      company_name: fmpData.profile.companyName,
      market_cap: fmpData.quote.marketCap || fmpData.profile.marketCap,
      pe_ratio: fmpData.fundamentals.ratios[0]?.priceEarningsRatio || fmpData.fundamentals.ratios[0]?.priceToEarningsRatio,
      eps: fmpData.fundamentals.incomeStatements[0]?.eps,
      revenue_ttm: fmpData.fundamentals.incomeStatements[0]?.revenue,
      debt_to_equity: fmpData.fundamentals.ratios[0]?.debtEquityRatio || fmpData.fundamentals.ratios[0]?.debtToEquity,
      beta: fmpData.profile.beta,
    };

    const macro = {
      fed_funds_rate: macroData.fedFundsRate || undefined,
      unemployment: macroData.unemploymentRate || undefined,
      consumer_sentiment: macroData.consumerSentiment || undefined,
      yield_curve_spread: macroData.yieldCurveSpread || undefined,
      vix: macroData.vix || undefined,
      gdp: macroData.gdp || undefined,
    };

    console.log('✅ Data prepared');

    // Step 3: Calculate scores
    console.log('\n📊 Step 3/5: Calculating scores...');

    const scores = scorer.calculateScores({
      technical,
      fundamental,
      macro,
    });

    console.log('✅ Scores calculated');
    console.log(`   Composite: ${scores.composite} | ${scores.recommendation}`);
    console.log(
      `   Technical: ${scores.technical} | Fundamental: ${scores.fundamental} | Macro: ${scores.macro}`
    );
    console.log(`   Risk: ${scores.risk} | Sentiment: ${scores.sentiment}`);

    // Step 4: Sync to Notion
    console.log('\n📊 Step 4/5: Syncing to Notion...');

    const analysisData: AnalysisData = {
      ticker: ticker.toUpperCase(),
      companyName: fmpData.profile.companyName,
      timestamp: new Date(),
      technical,
      fundamental,
      macro,
      scores,
      apiCalls: {
        fmp: 11,
        fred: 6,
        total: 17,
      },
    };

    const { analysesPageId, historyPageId } = await notionClient.syncToNotion(
      analysisData,
      usePollingWorkflow
    );

    if (!analysesPageId) {
      throw new Error('Failed to sync to Notion');
    }

    console.log('✅ Synced to Notion');
    console.log(`   Stock Analyses page ID: ${analysesPageId}`);
    if (historyPageId) {
      console.log(`   Stock History page ID: ${historyPageId}`);
    }

    // Step 5: Polling workflow (if enabled)
    if (usePollingWorkflow && !skipPolling) {
      console.log('\n📊 Step 5/5: Waiting for AI analysis...');
      console.log('💡 Open Notion and run your AI prompt now.');
      console.log('💡 Click the "Send to History" button when done.');

      const pollingCompleted = await notionClient.waitForAnalysisCompletion(
        analysesPageId,
        timeout,
        pollInterval,
        skipPolling
      );

      if (pollingCompleted) {
        console.log('\n🎉 Analysis completed! Archiving...');

        const archivedPageId = await notionClient.archiveToHistory(analysesPageId);

        if (archivedPageId) {
          console.log(`✅ Archived to Stock History: ${archivedPageId}`);
        } else {
          console.log('⚠️  Archive failed');
        }
      } else {
        console.log('\n⏱️  Polling timeout - analysis not completed');
      }
    } else if (skipPolling) {
      console.log('\n⏭️  Polling skipped');
      console.log('💡 Run archive manually when ready:');
      console.log(`   await notion.archiveToHistory('${analysesPageId}')`);
    } else {
      console.log('\n✅ v0.2.9 workflow complete');
    }

    const duration = Date.now() - startTime;

    console.log('\n' + '='.repeat(60));
    console.log(`✅ Test complete in ${duration}ms (${(duration / 1000).toFixed(1)}s)`);
    console.log('='.repeat(60) + '\n');

    process.exit(0);
  } catch (error) {
    const duration = Date.now() - startTime;

    console.error('\n' + '='.repeat(60));
    console.error(`❌ Test failed after ${duration}ms`);
    console.error('='.repeat(60));
    console.error('\nError:', error);

    if (error instanceof Error && error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }

    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);

if (args.length === 0) {
  console.error('Usage: npx ts-node scripts/test-analyze.ts TICKER [options]');
  console.error('\nOptions:');
  console.error('  --no-polling          Skip polling workflow (v0.2.9 mode)');
  console.error('  --skip-polling        Write metrics but skip polling (manual archive)');
  console.error('  --timeout=SECONDS     Polling timeout (default: 600)');
  console.error('  --interval=SECONDS    Poll interval (default: 10)');
  console.error('\nExamples:');
  console.error('  npx ts-node scripts/test-analyze.ts NVDA');
  console.error('  npx ts-node scripts/test-analyze.ts AAPL --no-polling');
  console.error('  npx ts-node scripts/test-analyze.ts MSFT --timeout=300');
  console.error('  npx ts-node scripts/test-analyze.ts GOOGL --skip-polling');
  process.exit(1);
}

const ticker = args[0];
const options: any = {
  usePollingWorkflow: true,
  timeout: 600,
  pollInterval: 10,
  skipPolling: false,
};

// Parse options
for (let i = 1; i < args.length; i++) {
  const arg = args[i];

  if (arg === '--no-polling') {
    options.usePollingWorkflow = false;
  } else if (arg === '--skip-polling') {
    options.skipPolling = true;
  } else if (arg.startsWith('--timeout=')) {
    options.timeout = parseInt(arg.split('=')[1], 10);
  } else if (arg.startsWith('--interval=')) {
    options.pollInterval = parseInt(arg.split('=')[1], 10);
  }
}

// Run test
testAnalysis(ticker, options);
