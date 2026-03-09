/**
 * Test Script: Manual Market Context Trigger
 *
 * Usage: npx ts-node scripts/test-market-context.ts
 */

import { getAllUsers, decryptToken } from '../../lib/core/auth';
import { getMarketContext } from '../../lib/domain/market/index';
import { createFMPClient } from '../../lib/integrations/fmp/client';
import { createFREDClient } from '../../lib/integrations/fred/client';
import { Client } from '@notionhq/client';

async function testMarketContext() {
  console.log('🧪 Testing Market Context Distribution\n');

  try {
    // Step 1: Get all users
    console.log('Step 1: Fetching users...');
    const users = await getAllUsers();
    console.log(`✓ Found ${users.length} users\n`);

    // Step 2: Fetch market context
    console.log('Step 2: Fetching market context...');
    const fmpApiKey = process.env.FMP_API_KEY || '';
    const fredApiKey = process.env.FRED_API_KEY || '';

    if (!fmpApiKey || !fredApiKey) {
      throw new Error('Missing FMP_API_KEY or FRED_API_KEY');
    }

    const fmpClient = createFMPClient(fmpApiKey);
    const fredClient = createFREDClient(fredApiKey);

    const marketContext = await getMarketContext(fmpClient, fredClient, true);

    console.log(`✓ Market Context Fetched:`);
    console.log(`  - Date: ${marketContext.date}`);
    console.log(`  - Regime: ${marketContext.regime} (${Math.round(marketContext.regimeConfidence * 100)}% confidence)`);
    console.log(`  - Risk Assessment: ${marketContext.riskAssessment}`);
    console.log(`  - VIX: ${marketContext.vix.toFixed(1)}`);
    console.log(`  - SPY 1D Change: ${marketContext.spy.change1D > 0 ? '+' : ''}${marketContext.spy.change1D.toFixed(2)}%`);
    console.log(`  - Top Sectors: ${marketContext.sectorLeaders.map(s => s.name).join(', ')}`);
    console.log();

    // Step 3: Distribute to users
    console.log('Step 3: Distributing to users...\n');
    let created = 0;
    let skipped = 0;
    let failed = 0;

    for (const user of users) {
      try {
        console.log(`Processing ${user.email}...`);

        // Check if user has Market Context DB ID
        if (!user.marketContextDbId) {
          console.log(`  ⚠️  Skipped - No Market Context DB ID configured\n`);
          skipped++;
          continue;
        }

        console.log(`  - Market Context DB ID: ${user.marketContextDbId}`);

        // Decrypt user's access token
        const accessToken = await decryptToken(user.accessToken);
        const notion = new Client({ auth: accessToken });

        // Check if page already exists for today
        const db = await notion.databases.retrieve({ database_id: user.marketContextDbId });
        const dataSourceId = (db as any).data_sources?.[0]?.id;

        if (!dataSourceId) {
          console.log(`  ⚠️  No data source found\n`);
          skipped++;
          continue;
        }

        const response = await notion.dataSources.query({
          data_source_id: dataSourceId,
          filter: {
            property: 'Date',
            date: { equals: marketContext.date },
          },
          page_size: 1,
        });

        if (response.results.length > 0) {
          console.log(`  ✓ Already exists for ${marketContext.date}\n`);
          skipped++;
          continue;
        }

        // Note: Using simplified version for testing
        // For full implementation with all fixes, see api/jobs/market-context.ts
        console.log(`  ⚠️  Test script needs updating - calling production endpoint instead\n`);
        console.log(`  Please use: curl -X POST https://your-domain.vercel.app/api/jobs/market-context -H "Authorization: Bearer $CRON_SECRET"\n`);
        skipped++;

      } catch (error) {
        console.log(`  ❌ Failed: ${error instanceof Error ? error.message : String(error)}\n`);
        failed++;
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('Test Complete');
    console.log('='.repeat(60));
    console.log(`Total users: ${users.length}`);
    console.log(`Created: ${created}`);
    console.log(`Skipped: ${skipped}`);
    console.log(`Failed: ${failed}`);

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

testMarketContext();
