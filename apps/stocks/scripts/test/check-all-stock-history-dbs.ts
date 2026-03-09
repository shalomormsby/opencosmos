/**
 * Test Script: Check All Stock History Databases
 *
 * Checks all users' Stock History databases to understand
 * which one the user is referring to.
 */

import { getAllUsers, decryptToken } from '../../lib/core/auth';
import { Client } from '@notionhq/client';

async function checkAllStockHistoryDatabases() {
  console.log('='.repeat(60));
  console.log('Stock History Database Audit');
  console.log('='.repeat(60));
  console.log('');

  try {
    const users = await getAllUsers();
    console.log(`Found ${users.length} users\n`);

    for (const user of users) {
      console.log(`\nUser: ${user.email}`);
      console.log(`Stock History DB ID: ${user.stockHistoryDbId || 'NOT CONFIGURED'}`);

      if (!user.stockHistoryDbId) {
        console.log('  ⚠️  Skipping - no Stock History DB configured\n');
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

        // Query Stock History database
        const db = await notion.databases.retrieve({
          database_id: user.stockHistoryDbId
        });
        const dataSourceId = (db as any).data_sources?.[0]?.id;

        if (!dataSourceId) {
          throw new Error('No data source found');
        }

        const response = await notion.dataSources.query({
          data_source_id: dataSourceId,
          sorts: [{ property: 'Analysis Date', direction: 'descending' }],
          page_size: 5,
        });

        console.log(`  Total entries: ${response.results.length} (showing last 5)\n`);

        // Check last 7 days
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

        const recentEntries = response.results.filter((page: any) => {
          const analysisDate = (page as any).properties['Analysis Date']?.date?.start;
          if (!analysisDate) return false;
          return new Date(analysisDate) > sevenDaysAgo;
        });

        const veryRecentEntries = response.results.filter((page: any) => {
          const analysisDate = (page as any).properties['Analysis Date']?.date?.start;
          if (!analysisDate) return false;
          return new Date(analysisDate) > threeDaysAgo;
        });

        console.log(`  Entries in last 7 days: ${recentEntries.length}`);
        console.log(`  Entries in last 3 days: ${veryRecentEntries.length}`);

        // Show last 5 entries
        if (response.results.length > 0) {
          console.log('\n  Most recent entries:');
          for (const page of response.results) {
            const props = (page as any).properties;
            const ticker = props['Ticker']?.rich_text?.[0]?.text?.content || 'Unknown';
            const analysisDate = props['Analysis Date']?.date?.start || 'Unknown';
            const name = props['Name']?.title?.[0]?.text?.content || 'Unknown';

            console.log(`    - ${name} (${ticker}) at ${analysisDate}`);
          }
        }

        if (veryRecentEntries.length === 0) {
          console.log('\n  🔴 NO ENTRIES IN LAST 3 DAYS!');
        } else {
          console.log(`\n  ✅ ${veryRecentEntries.length} entries in last 3 days`);
        }

        // Check for duplicates
        const tickerCounts = new Map<string, number>();
        const todayStr = new Date().toISOString().split('T')[0];

        for (const page of response.results) {
          const props = (page as any).properties;
          const ticker = props['Ticker']?.rich_text?.[0]?.text?.content || 'Unknown';
          const analysisDateStr = (props['Analysis Date']?.date?.start || '').split('T')[0];

          if (analysisDateStr === todayStr) {
            const key = `${ticker}-${analysisDateStr}`;
            tickerCounts.set(key, (tickerCounts.get(key) || 0) + 1);
          }
        }

        const duplicates = Array.from(tickerCounts.entries()).filter(([_, count]) => count > 1);
        if (duplicates.length > 0) {
          console.log(`\n  ⚠️  DUPLICATES FOUND TODAY:`);
          for (const [key, count] of duplicates) {
            console.log(`    - ${key}: ${count} entries`);
          }
        }

      } catch (error: any) {
        console.error(`  ❌ Error accessing database: ${error.message}`);
      }

      console.log('  ' + '-'.repeat(58));
    }

  } catch (error) {
    console.error('\n❌ Audit failed:', error);
    throw error;
  }
}

checkAllStockHistoryDatabases()
  .then(() => {
    console.log('\n✅ Audit complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Audit failed:', error);
    process.exit(1);
  });
