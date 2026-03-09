/**
 * Test Script: Check Daily Cadence Stocks
 *
 * Checks which users have stocks configured with "Analysis Cadence = Daily"
 * to understand why only grenager@gmail.com is getting Stock History entries.
 */

import { getAllUsers, decryptToken } from '../../lib/core/auth';
import { Client } from '@notionhq/client';

async function checkDailyCadenceStocks() {
  console.log('='.repeat(60));
  console.log('Daily Cadence Stocks Audit');
  console.log('='.repeat(60));
  console.log('');

  try {
    const users = await getAllUsers();
    console.log(`Found ${users.length} users\n`);

    for (const user of users) {
      console.log(`\nUser: ${user.email}`);
      console.log(`Stock Analyses DB ID: ${user.stockAnalysesDbId || 'NOT CONFIGURED'}`);

      if (!user.stockAnalysesDbId) {
        console.log('  ⚠️  Skipping - no Stock Analyses DB configured\n');
        continue;
      }

      try {
        // Decrypt user's OAuth token
        const userAccessToken = await decryptToken(user.accessToken);

        // Get user's Notion client
        const notion = new Client({
          auth: userAccessToken,
          notionVersion: '2025-09-03'
        });

        // Get data source ID
        const db = await notion.databases.retrieve({
          database_id: user.stockAnalysesDbId
        });
        const dataSourceId = (db as any).data_sources?.[0]?.id;

        if (!dataSourceId) {
          throw new Error('No data source found');
        }

        // Query stocks with "Analysis Cadence = Daily"
        console.log('  Querying for stocks with Analysis Cadence = Daily...');

        // Handle pagination
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

        console.log(`  Found ${allResults.length} stocks with Daily cadence\n`);

        if (allResults.length === 0) {
          console.log('  🔴 NO STOCKS CONFIGURED FOR DAILY ANALYSIS!');
          console.log('  This explains why Stock History is not being updated.');
        } else {
          console.log('  Stocks:');
          for (const page of allResults) {
            const props = (page as any).properties;
            const ticker = props['Ticker']?.title?.[0]?.text?.content || 'Unknown';
            const status = props['Status']?.status?.name || 'Unknown';
            const lastAnalysis = props['Last Auto-Analysis']?.date?.start || 'Never';

            console.log(`    - ${ticker} (Status: ${status}, Last: ${lastAnalysis})`);
          }

          console.log(`\n  ✅ ${allResults.length} stocks should be analyzed daily`);
        }

      } catch (error: any) {
        console.error(`  ❌ Error querying database: ${error.message}`);
        console.error(`     Code: ${error.code}`);

        if (error.code === 'object_not_found') {
          console.error('     The database may have been deleted or permissions revoked.');
        }
      }

      console.log('  ' + '-'.repeat(58));
    }

    console.log('\n' + '='.repeat(60));
    console.log('Summary:');
    console.log('Users with Daily stocks will have Stock History updated.');
    console.log('Users without Daily stocks will NOT have entries created.');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ Audit failed:', error);
    throw error;
  }
}

checkDailyCadenceStocks()
  .then(() => {
    console.log('\n✅ Audit complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Audit failed:', error);
    process.exit(1);
  });
