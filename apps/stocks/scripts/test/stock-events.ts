/**
 * Test Stock Events Ingestion
 *
 * Tests the FMP event calendar ingestion pipeline locally
 *
 * Usage:
 *   npx ts-node scripts/test-stock-events.ts
 *
 * Environment variables required:
 *   - FMP_API_KEY
 *   - NOTION_API_KEY (admin token)
 *   - NOTION_BETA_USERS_DB_ID
 */

import * as dotenv from 'dotenv';
import { createFMPClient } from '../../lib/integrations/fmp/client';
import { runStockEventsIngestion } from '../../lib/domain/stock/events-ingestion';

// Load environment variables
dotenv.config();

const FMP_API_KEY = process.env.FMP_API_KEY || '';
const NOTION_API_KEY = process.env.NOTION_API_KEY || '';
const BETA_USERS_DB_ID = process.env.NOTION_BETA_USERS_DB_ID || '';

async function main() {
  console.log('='.repeat(60));
  console.log('Stock Events Ingestion Test');
  console.log('='.repeat(60));
  console.log();

  // Validate environment
  if (!FMP_API_KEY) {
    console.error('❌ Missing FMP_API_KEY');
    process.exit(1);
  }

  if (!NOTION_API_KEY) {
    console.error('❌ Missing NOTION_API_KEY');
    process.exit(1);
  }

  if (!BETA_USERS_DB_ID) {
    console.error('❌ Missing NOTION_BETA_USERS_DB_ID');
    process.exit(1);
  }

  console.log('✅ Environment validated');
  console.log();

  try {
    // Create FMP client
    const fmpClient = createFMPClient(FMP_API_KEY);

    // Test 1: Fetch earnings calendar for a known ticker
    console.log('Test 1: Fetching earnings calendar sample...');
    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + 30);

    const fromDate = today.toISOString().split('T')[0];
    const toDate = endDate.toISOString().split('T')[0];

    console.log(`  Date range: ${fromDate} to ${toDate}`);

    const earningsEvents = await fmpClient.getEarningsCalendar(fromDate, toDate);
    console.log(`  ✅ Found ${earningsEvents.length} earnings events`);

    if (earningsEvents.length > 0) {
      const sample = earningsEvents[0];
      console.log('  Sample event:', JSON.stringify(sample, null, 2));
    }

    console.log();

    // Test 2: Fetch dividend calendar sample
    console.log('Test 2: Fetching dividend calendar sample...');
    const dividendEvents = await fmpClient.getDividendCalendar(fromDate, toDate);
    console.log(`  ✅ Found ${dividendEvents.length} dividend events`);

    if (dividendEvents.length > 0) {
      const sample = dividendEvents[0];
      console.log('  Sample event:', JSON.stringify(sample, null, 2));
    }

    console.log();

    // Test 3: Fetch stock split calendar sample
    console.log('Test 3: Fetching stock split calendar sample...');
    const splitEvents = await fmpClient.getStockSplitCalendar(fromDate, toDate);
    console.log(`  ✅ Found ${splitEvents.length} stock split events`);

    if (splitEvents.length > 0) {
      const sample = splitEvents[0];
      console.log('  Sample event:', JSON.stringify(sample, null, 2));
    }

    console.log();
    console.log('='.repeat(60));
    console.log('FMP API Tests Complete');
    console.log('='.repeat(60));
    console.log();

    // Test 4: Run full ingestion pipeline
    console.log('Test 4: Running full ingestion pipeline...');
    console.log('  (This will process all beta users and write events to Stock Events databases)');
    console.log();

    const metrics = await runStockEventsIngestion(
      fmpClient,
      BETA_USERS_DB_ID,
      NOTION_API_KEY,
      90 // Next 90 days
    );

    // Display results
    console.log();
    console.log('='.repeat(60));
    console.log('Ingestion Complete');
    console.log('='.repeat(60));
    console.log();

    console.log('📊 Metrics:');
    console.log(`  Duration: ${((metrics.durationMs || 0) / 1000).toFixed(1)}s`);
    console.log();

    console.log('👥 Users:');
    console.log(`  Total:     ${metrics.totalUsers}`);
    console.log(`  Processed: ${metrics.usersProcessed}`);
    console.log(`  Failed:    ${metrics.usersFailed}`);
    console.log();

    console.log('📈 Stocks:');
    console.log(`  Total:     ${metrics.totalStocks} unique tickers`);
    console.log(`  Portfolio: ${metrics.portfolioStocks}`);
    console.log(`  Watchlist: ${metrics.watchlistStocks}`);
    console.log();

    console.log('📅 Events:');
    console.log(`  From FMP:  ${metrics.eventsFromFMP}`);
    console.log(`  Created:   ${metrics.eventsCreated}`);
    console.log(`  Updated:   ${metrics.eventsUpdated}`);
    console.log(`  Skipped:   ${metrics.eventsSkipped}`);
    console.log();

    console.log('🔌 API Calls:');
    console.log(`  FMP:       ${metrics.fmpApiCalls}`);
    console.log(`  Notion:    ${metrics.notionApiCalls}`);
    console.log();

    if (metrics.errors.length > 0) {
      console.log('❌ Errors:');
      metrics.errors.forEach(err => console.log(`  - ${err}`));
      console.log();
    }

    if (metrics.warnings.length > 0) {
      console.log('⚠️  Warnings (first 10):');
      metrics.warnings.slice(0, 10).forEach(warning => console.log(`  - ${warning}`));
      console.log();
    }

    if (metrics.errors.length === 0 && metrics.warnings.length === 0) {
      console.log('✅ No errors or warnings!');
      console.log();
    }

    console.log('='.repeat(60));
    console.log('Test Complete!');
    console.log('='.repeat(60));

  } catch (error) {
    console.error();
    console.error('❌ Test failed:', error);
    console.error();
    process.exit(1);
  }
}

main();
