/**
 * Populate Stock Events DB ID for Beta Users
 *
 * This script updates the Beta Users database to add Stock Events DB IDs
 * for users who have the Stock Events database in their workspace.
 *
 * Usage:
 *   npx ts-node scripts/populate-stock-events-db-id.ts
 *
 * Environment variables required:
 *   - NOTION_API_KEY (admin token)
 *   - NOTION_BETA_USERS_DB_ID
 */

import * as dotenv from 'dotenv';
import { Client } from '@notionhq/client';

// Load environment variables
dotenv.config();

const NOTION_API_KEY = process.env.NOTION_API_KEY || '';
const BETA_USERS_DB_ID = process.env.NOTION_BETA_USERS_DB_ID || '';

// User-specific Stock Events DB IDs (get these from Notion URLs)
const USER_STOCK_EVENTS_DBS: { [email: string]: string } = {
  'shalomormsby@gmail.com': '2a9a1d1b67e0812586c0cb16b8b659e6',
  // Add more users as needed:
  // 'stephie.ormsby@gmail.com': 'xxx',
  // 'ben@example.com': 'xxx',
};

async function main() {
  console.log('='.repeat(60));
  console.log('Populate Stock Events DB ID in Beta Users');
  console.log('='.repeat(60));
  console.log();

  // Validate environment
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

  const notion = new Client({ auth: NOTION_API_KEY, notionVersion: '2025-09-03' });

  try {
    // Get data source ID for Beta Users database
    const betaUsersDb = await notion.databases.retrieve({ database_id: BETA_USERS_DB_ID });
    const dataSourceId = (betaUsersDb as any).data_sources?.[0]?.id;

    if (!dataSourceId) {
      throw new Error('No data source found for Beta Users database');
    }

    console.log('📊 Fetching beta users...');
    const response = await notion.dataSources.query({
      data_source_id: dataSourceId,
    });

    console.log(`   Found ${response.results.length} users`);
    console.log();

    let updated = 0;
    let skipped = 0;

    for (const page of response.results) {
      const props = (page as any).properties;
      const email = props.Email?.email || '';
      const name = props.Name?.title?.[0]?.plain_text || 'Unknown';
      const currentStockEventsDbId = props['Stock Events DB ID']?.rich_text?.[0]?.plain_text || '';

      console.log(`👤 ${name} (${email})`);

      // Check if we have a Stock Events DB ID for this user
      const stockEventsDbId = USER_STOCK_EVENTS_DBS[email];

      if (!stockEventsDbId) {
        console.log(`   ⏭️  No Stock Events DB ID configured for this user`);
        console.log();
        skipped++;
        continue;
      }

      if (currentStockEventsDbId === stockEventsDbId) {
        console.log(`   ✅ Stock Events DB ID already set: ${stockEventsDbId}`);
        console.log();
        skipped++;
        continue;
      }

      // Update the user record
      console.log(`   🔄 Updating Stock Events DB ID: ${stockEventsDbId}`);
      await notion.pages.update({
        page_id: page.id,
        properties: {
          'Stock Events DB ID': {
            rich_text: [{ text: { content: stockEventsDbId } }],
          },
        },
      });

      console.log(`   ✅ Updated!`);
      console.log();
      updated++;
    }

    console.log('='.repeat(60));
    console.log('Summary');
    console.log('='.repeat(60));
    console.log(`Updated: ${updated}`);
    console.log(`Skipped: ${skipped}`);
    console.log();

    if (updated > 0) {
      console.log('✅ Stock Events DB IDs populated successfully!');
      console.log();
      console.log('Next steps:');
      console.log('1. Run: npx ts-node scripts/test-stock-events.ts');
      console.log('2. Verify events appear in your Notion Calendar');
    } else {
      console.log('ℹ️  No updates needed');
    }

  } catch (error) {
    console.error();
    console.error('❌ Failed to populate Stock Events DB IDs:', error);
    console.error();
    process.exit(1);
  }
}

main();
