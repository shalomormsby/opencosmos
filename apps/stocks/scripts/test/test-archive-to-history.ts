/**
 * Test Script: Archive to Stock History
 *
 * Tests the archiveToHistory functionality to identify why
 * Stock History entries stopped being created after Nov 29.
 */

import { getAllUsers, decryptToken } from '../../lib/core/auth';
import { Client } from '@notionhq/client';

async function testArchiveToHistory() {
  console.log('='.repeat(60));
  console.log('Stock History Archive Test');
  console.log('='.repeat(60));
  console.log('');

  try {
    // Get all users
    const users = await getAllUsers();
    console.log(`Found ${users.length} users\n`);

    // Use first user for testing
    const user = users[0];
    console.log(`Testing with user: ${user.email}`);
    console.log(`Stock History DB ID: ${user.stockHistoryDbId?.substring(0, 8)}...`);
    console.log('');

    if (!user.stockHistoryDbId) {
      console.error('❌ User has no Stock History DB configured');
      return;
    }

    // Decrypt user's OAuth token (same as orchestrator does)
    const userAccessToken = await decryptToken(user.accessToken);
    console.log(`Using user's OAuth token (length: ${userAccessToken.length})\n`);

    // Get user's Notion client (using their OAuth token, NOT admin token)
    const notion = new Client({
      auth: userAccessToken,
      notionVersion: '2025-09-03'
    });

    // Query Stock History database for recent entries
    console.log('Querying Stock History database...');

    try {
      const db = await notion.databases.retrieve({
        database_id: user.stockHistoryDbId
      });
      const dataSourceId = (db as any).data_sources?.[0]?.id;

      if (!dataSourceId) {
        throw new Error('No data source found for Stock History database');
      }

      const response = await notion.dataSources.query({
        data_source_id: dataSourceId,
        sorts: [
          {
            property: 'Analysis Date',
            direction: 'descending',
          },
        ],
        page_size: 10,
      });

      console.log(`\nFound ${response.results.length} recent Stock History entries:\n`);

      for (const page of response.results) {
        const props = (page as any).properties;
        const ticker = props['Ticker']?.rich_text?.[0]?.text?.content || 'Unknown';
        const analysisDate = props['Analysis Date']?.date?.start || 'Unknown';
        const name = props['Name']?.title?.[0]?.text?.content || 'Unknown';

        console.log(`  ${name}`);
        console.log(`    Ticker: ${ticker}`);
        console.log(`    Analysis Date: ${analysisDate}`);
        console.log('');
      }

      // Check for entries in last 7 days
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const recentEntries = response.results.filter((page: any) => {
        const analysisDate = (page as any).properties['Analysis Date']?.date?.start;
        if (!analysisDate) return false;
        return new Date(analysisDate) > sevenDaysAgo;
      });

      console.log('='.repeat(60));
      console.log('Analysis:');
      console.log(`  Total entries in database: ${response.results.length} (showing last 10)`);
      console.log(`  Entries in last 7 days: ${recentEntries.length}`);

      if (recentEntries.length === 0) {
        console.log('');
        console.log('🔴 ISSUE CONFIRMED:');
        console.log('No Stock History entries created in the last 7 days!');
        console.log('');
        console.log('Possible causes:');
        console.log('1. Orchestrator not running (cron job issue)');
        console.log('2. archiveToHistory() failing silently');
        console.log('3. Orchestrator skipping history creation step');
        console.log('4. Database permissions issue');
      } else {
        console.log('');
        console.log('✅ Stock History is being updated normally');
      }

      console.log('='.repeat(60));

    } catch (error: any) {
      console.error('❌ Failed to query Stock History database:', error.message);
      console.error('');
      console.error('This could indicate:');
      console.error('- Invalid database ID');
      console.error('- Permissions issue');
      console.error('- Database was deleted or moved');
      throw error;
    }

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    throw error;
  }
}

testArchiveToHistory()
  .then(() => {
    console.log('\n✅ Test complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });
