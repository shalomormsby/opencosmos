/**
 * Test Orchestrator (Dry Run)
 *
 * Tests the stock analysis orchestrator without making actual API calls.
 * Use this to validate deduplication, priority queue, and subscriber logic.
 *
 * Usage:
 *   ORCHESTRATOR_DRY_RUN=true tsx scripts/test-orchestrator.ts
 */

// Load environment variables from .env file
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env file first
dotenv.config();

// Also try .env.local if it exists (used by Vercel)
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { getAllUsers } from '../../lib/core/auth';
import { runOrchestrator } from '../../lib/orchestration/orchestrator';

async function testOrchestrator() {
  console.log('='.repeat(60));
  console.log('Testing Stock Analysis Orchestrator');
  console.log('='.repeat(60));

  // Check if dry-run mode is enabled
  const isDryRun = process.env.ORCHESTRATOR_DRY_RUN === 'true';

  if (isDryRun) {
    console.log('\n✓ Dry-run mode: ENABLED (no actual API calls will be made)\n');
  } else {
    console.log('\n⚠️  REAL MODE: Actual API calls will be made!\n');
    console.log('   This will:');
    console.log('   - Call FMP API for market data');
    console.log('   - Call FRED API for macro indicators');
    console.log('   - Call Gemini API for LLM analysis');
    console.log('   - Write results to Notion databases');
    console.log('');
  }

  try {
    // Get all users
    console.log('Fetching users...');
    const users = await getAllUsers();
    console.log(`Found ${users.length} users\n`);

    if (users.length === 0) {
      console.warn('⚠️  No users found. Make sure you have users in your Beta Users database.');
      process.exit(0);
    }

    // Run orchestrator
    const metrics = await runOrchestrator(users);

    // Display results
    console.log('\n' + '='.repeat(60));
    console.log('Test Results');
    console.log('='.repeat(60));
    console.log(`Total Users:        ${users.length}`);
    console.log(`Total Tickers:      ${metrics.totalTickers}`);
    console.log(`Total Subscribers:  ${metrics.totalSubscribers}`);
    console.log(`Analyzed:           ${metrics.analyzed}`);
    console.log(`Failed:             ${metrics.failed}`);
    console.log(`API Calls Saved:    ${metrics.apiCallsSaved}`);
    console.log(`Duration:           ${(metrics.durationMs / 1000).toFixed(1)}s`);
    console.log('='.repeat(60));

    if (isDryRun) {
      console.log('\n✅ Dry-run test completed successfully!');
      console.log('\nNext steps:');
      console.log('1. Review the logs above to verify deduplication and priority logic');
      console.log('2. If everything looks good, run with real API calls:');
      console.log('   npm run test:orchestrator:real');
    } else {
      console.log('\n✅ Real test completed successfully!');
      console.log('\nResults:');
      console.log('- All analyses executed with actual API calls');
      console.log('- Check your Notion databases for updated data');
      console.log('- Review logs above for any errors or warnings');
    }

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    if (error instanceof Error) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Run the test
testOrchestrator().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
