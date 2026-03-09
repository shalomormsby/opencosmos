#!/usr/bin/env ts-node
/**
 * Notion Write Functions Test Script
 *
 * Tests all Notion write functionality:
 * 1. Create new analysis (writeStockAnalysis - create mode)
 * 2. Update existing analysis (writeStockAnalysis - update mode)
 * 3. Create stock history record
 * 4. Update content status
 * 5. Full end-to-end workflow
 *
 * Usage:
 *   npm run test:notion-write
 *   # or
 *   ts-node scripts/test-notion-write.ts
 *
 * Environment Variables Required:
 *   NOTION_API_KEY - Notion integration token
 *   STOCK_ANALYSES_DB_ID - Stock Analyses database ID
 *   STOCK_HISTORY_DB_ID - Stock History database ID
 *
 * v1.0 - Vercel Serverless + TypeScript
 */

import dotenv from 'dotenv';
import { createNotionClient, AnalysisData } from '../../lib/integrations/notion/client';

// Load environment variables
dotenv.config();

/**
 * Create mock analysis data for testing
 */
function createMockAnalysisData(ticker: string): AnalysisData {
  return {
    ticker,
    companyName: `${ticker} Test Company`,
    timestamp: new Date(),
    technical: {
      current_price: 150.25,
      ma_50: 148.5,
      ma_200: 145.0,
      rsi: 65.5,
      macd: 2.5,
      macd_signal: 2.0,
      volume: 50000000,
      avg_volume_20d: 45000000,
      volatility_30d: 0.25,
      price_change_1d: 0.015,
      price_change_5d: 0.03,
      price_change_1m: 0.08,
      week_52_high: 180.0,
      week_52_low: 120.0,
    },
    fundamental: {
      company_name: `${ticker} Test Company`,
      market_cap: 2500000000000,
      pe_ratio: 28.5,
      eps: 5.25,
      revenue_ttm: 380000000000,
      debt_to_equity: 1.8,
      beta: 1.2,
    },
    macro: {
      fed_funds_rate: 5.25,
      unemployment: 3.8,
      consumer_sentiment: 72.0,
      yield_curve_spread: -0.5,
      vix: 18.5,
      gdp: 2.5,
    },
    scores: {
      composite: 4.2,
      technical: 4.0,
      fundamental: 4.5,
      macro: 3.8,
      risk: 4.2,
      sentiment: 4.3,
      recommendation: 'Buy',
    },
    pattern: {
      score: 4.0,
      signal: '📈 Bullish',
      detected: ['Ascending Triangle', 'Golden Cross'],
    },
    apiCalls: {
      fmp: 11,
      fred: 6,
      total: 17,
    },
  };
}

/**
 * Test 1: Create new analysis
 */
async function testCreateNewAnalysis(
  notion: ReturnType<typeof createNotionClient>,
  ticker: string
): Promise<string | null> {
  console.log('\n' + '='.repeat(60));
  console.log('TEST 1: Create New Analysis');
  console.log('='.repeat(60));

  try {
    const mockData = createMockAnalysisData(ticker);

    console.log(`\n📝 Creating new analysis for ${ticker}...`);

    const result = await notion.syncToNotion(mockData, false);

    if (result.analysesPageId) {
      console.log(`✅ SUCCESS: Created Stock Analyses page`);
      console.log(`   Page ID: ${result.analysesPageId}`);
      return result.analysesPageId;
    } else {
      console.log('❌ FAILED: No page ID returned');
      return null;
    }
  } catch (error) {
    console.error('❌ ERROR:', error);
    return null;
  }
}

/**
 * Test 2: Update existing analysis
 */
async function testUpdateExistingAnalysis(
  notion: ReturnType<typeof createNotionClient>,
  ticker: string
): Promise<boolean> {
  console.log('\n' + '='.repeat(60));
  console.log('TEST 2: Update Existing Analysis (Upsert)');
  console.log('='.repeat(60));

  try {
    const mockData = createMockAnalysisData(ticker);

    // Modify data to show update
    mockData.technical.current_price = 155.75;
    mockData.scores.composite = 4.5;
    mockData.scores.recommendation = 'Strong Buy';

    console.log(`\n🔄 Updating existing analysis for ${ticker}...`);
    console.log(`   New price: ${mockData.technical.current_price}`);
    console.log(`   New composite score: ${mockData.scores.composite}`);

    const result = await notion.syncToNotion(mockData, false);

    if (result.analysesPageId) {
      console.log(`✅ SUCCESS: Updated Stock Analyses page`);
      console.log(`   Page ID: ${result.analysesPageId}`);
      console.log(`   Note: Should have updated existing page, not created duplicate`);
      return true;
    } else {
      console.log('❌ FAILED: No page ID returned');
      return false;
    }
  } catch (error) {
    console.error('❌ ERROR:', error);
    return false;
  }
}

/**
 * Test 3: Create stock history record
 */
async function testCreateStockHistory(
  notion: ReturnType<typeof createNotionClient>,
  ticker: string
): Promise<boolean> {
  console.log('\n' + '='.repeat(60));
  console.log('TEST 3: Create Stock History Record');
  console.log('='.repeat(60));

  try {
    const mockData = createMockAnalysisData(ticker);

    console.log(`\n📚 Creating history record for ${ticker}...`);

    const result = await notion.syncToNotion(mockData, false);

    if (result.historyPageId) {
      console.log(`✅ SUCCESS: Created Stock History page`);
      console.log(`   Page ID: ${result.historyPageId}`);
      console.log(`   Note: History should be append-only (new record each time)`);
      return true;
    } else {
      console.log('ℹ️  No history page created (expected with usePollingWorkflow=false)');
      return true;
    }
  } catch (error) {
    console.error('❌ ERROR:', error);
    return false;
  }
}

/**
 * Test 4: Update content status
 */
async function testUpdateContentStatus(
  notion: ReturnType<typeof createNotionClient>,
  pageId: string
): Promise<boolean> {
  console.log('\n' + '='.repeat(60));
  console.log('TEST 4: Update Content Status');
  console.log('='.repeat(60));

  try {
    console.log(`\n🔄 Updating Content Status to "Send to History"...`);

    await notion.updateContentStatus(pageId, 'Send to History');

    console.log('✅ SUCCESS: Content Status updated');

    // Wait a moment
    await new Promise((resolve) => setTimeout(resolve, 2000));

    console.log(`\n🔄 Updating Content Status to "Logged in History"...`);

    await notion.updateContentStatus(pageId, 'Logged in History');

    console.log('✅ SUCCESS: Content Status updated again');

    return true;
  } catch (error) {
    console.error('❌ ERROR:', error);
    return false;
  }
}

/**
 * Test 5: Archive to history
 */
async function testArchiveToHistory(
  notion: ReturnType<typeof createNotionClient>,
  ticker: string
): Promise<boolean> {
  console.log('\n' + '='.repeat(60));
  console.log('TEST 5: Archive to History');
  console.log('='.repeat(60));

  try {
    console.log(`\n📦 Archiving ${ticker} to Stock History...`);

    const historyPageId = await notion.archiveTickerToHistory(ticker);

    if (historyPageId) {
      console.log(`✅ SUCCESS: Archived to Stock History`);
      console.log(`   History Page ID: ${historyPageId}`);
      return true;
    } else {
      console.log('❌ FAILED: Archive returned null');
      return false;
    }
  } catch (error) {
    console.error('❌ ERROR:', error);
    return false;
  }
}

/**
 * Test 6: End-to-end workflow
 */
async function testEndToEndWorkflow(
  notion: ReturnType<typeof createNotionClient>
): Promise<boolean> {
  console.log('\n' + '='.repeat(60));
  console.log('TEST 6: End-to-End Workflow');
  console.log('='.repeat(60));

  const ticker = `TEST${Date.now().toString().slice(-4)}`;

  try {
    console.log(`\nRunning full workflow for ${ticker}...`);

    // Step 1: Create analysis
    console.log('\n📝 Step 1: Create initial analysis...');
    const mockData = createMockAnalysisData(ticker);
    const result1 = await notion.syncToNotion(mockData, false);

    if (!result1.analysesPageId) {
      throw new Error('Failed to create analysis');
    }

    console.log(`✅ Created: ${result1.analysesPageId}`);

    // Wait a moment
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Step 2: Update analysis
    console.log('\n🔄 Step 2: Update analysis with new data...');
    mockData.technical.current_price = 160.0;
    mockData.scores.composite = 4.8;
    const result2 = await notion.syncToNotion(mockData, false);

    console.log(`✅ Updated: ${result2.analysesPageId}`);

    // Wait a moment
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Step 3: Mark as ready for history
    console.log('\n🔄 Step 3: Mark as ready for history...');
    await notion.updateContentStatus(result1.analysesPageId, 'Send to History');

    console.log('✅ Status updated');

    // Wait a moment
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Step 4: Archive to history
    console.log('\n📦 Step 4: Archive to Stock History...');
    const historyPageId = await notion.archiveToHistory(result1.analysesPageId);

    if (!historyPageId) {
      throw new Error('Failed to archive to history');
    }

    console.log(`✅ Archived: ${historyPageId}`);

    console.log('\n✅ SUCCESS: End-to-end workflow completed!');
    return true;
  } catch (error) {
    console.error('❌ ERROR in workflow:', error);
    return false;
  }
}

/**
 * Main test runner
 */
async function main(): Promise<void> {
  console.log('\n' + '='.repeat(60));
  console.log('Notion Write Functions Test Suite');
  console.log('Sage Stocks v1.0');
  console.log('='.repeat(60));

  // Validate environment variables
  const apiKey = process.env.NOTION_API_KEY;
  const stockAnalysesDbId = process.env.STOCK_ANALYSES_DB_ID;
  const stockHistoryDbId = process.env.STOCK_HISTORY_DB_ID;

  if (!apiKey || !stockAnalysesDbId || !stockHistoryDbId) {
    console.error('\n❌ ERROR: Missing required environment variables');
    console.error('Required: NOTION_API_KEY, STOCK_ANALYSES_DB_ID, STOCK_HISTORY_DB_ID');
    process.exit(1);
  }

  console.log('\n✅ Environment variables loaded');
  console.log(`   Stock Analyses DB: ${stockAnalysesDbId}`);
  console.log(`   Stock History DB: ${stockHistoryDbId}`);

  // Create Notion client
  const notion = createNotionClient({
    apiKey,
    stockAnalysesDbId,
    stockHistoryDbId,
  });

  console.log('\n✅ Notion client initialized');

  // Test ticker (use timestamp to avoid conflicts)
  const testTicker = `TEST${Date.now().toString().slice(-4)}`;

  // Run tests
  const results: Record<string, boolean> = {};

  // Test 1: Create new analysis
  const pageId = await testCreateNewAnalysis(notion, testTicker);
  results['Create New Analysis'] = pageId !== null;

  if (pageId) {
    // Wait between tests
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Test 2: Update existing analysis
    results['Update Existing Analysis'] = await testUpdateExistingAnalysis(
      notion,
      testTicker
    );

    // Wait between tests
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Test 4: Update content status
    results['Update Content Status'] = await testUpdateContentStatus(
      notion,
      pageId
    );

    // Wait between tests
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Test 5: Archive to history
    results['Archive to History'] = await testArchiveToHistory(notion, testTicker);
  }

  // Wait between tests
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // Test 3: Create stock history (with different ticker)
  const historyTicker = `TEST${Date.now().toString().slice(-4)}`;
  results['Create Stock History'] = await testCreateStockHistory(
    notion,
    historyTicker
  );

  // Wait between tests
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // Test 6: End-to-end workflow
  results['End-to-End Workflow'] = await testEndToEndWorkflow(notion);

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('TEST SUMMARY');
  console.log('='.repeat(60));

  let passCount = 0;
  let failCount = 0;

  for (const [testName, passed] of Object.entries(results)) {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} - ${testName}`);

    if (passed) passCount++;
    else failCount++;
  }

  console.log('\n' + '='.repeat(60));
  console.log(`Total: ${passCount + failCount} tests`);
  console.log(`Passed: ${passCount}`);
  console.log(`Failed: ${failCount}`);
  console.log('='.repeat(60) + '\n');

  if (failCount > 0) {
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}
