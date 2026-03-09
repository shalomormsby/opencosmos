/**
 * Debug: Check Beta Users Access Tokens
 *
 * Verifies that all approved beta users have valid access tokens stored
 * in the Beta Users database.
 */

import * as dotenv from 'dotenv';
import { Client } from '@notionhq/client';

dotenv.config();

const NOTION_API_KEY = process.env.NOTION_API_KEY || '';
const BETA_USERS_DB_ID = process.env.NOTION_BETA_USERS_DB_ID || '';

async function main() {
  console.log('='.repeat(70));
  console.log('Beta Users Access Token Diagnostic');
  console.log('='.repeat(70));
  console.log();

  if (!NOTION_API_KEY || !BETA_USERS_DB_ID) {
    console.error('❌ Missing required environment variables');
    process.exit(1);
  }

  const notion = new Client({ auth: NOTION_API_KEY, notionVersion: '2025-09-03' });

  try {
    // Get database info
    const db = await notion.databases.retrieve({ database_id: BETA_USERS_DB_ID });
    console.log(`✅ Connected to Beta Users database`);
    console.log();

    // Get data source ID
    const dataSourceId = (db as any).data_sources?.[0]?.id;
    if (!dataSourceId) {
      throw new Error('No data source found for Beta Users database');
    }

    // Query all approved users
    const response = await notion.dataSources.query({
      data_source_id: dataSourceId,
      filter: {
        property: 'Status',
        select: {
          equals: 'Approved',
        },
      },
    });

    console.log(`Found ${response.results.length} approved users:\n`);

    // Check each user
    for (const page of response.results) {
      const props = (page as any).properties;

      const email = props.Email?.email || 'N/A';
      const name = props.Name?.title?.[0]?.plain_text || 'N/A';
      const accessToken = props['Access Token']?.rich_text?.[0]?.plain_text || '';
      const stockAnalysesDbId = props['Stock Analyses DB ID']?.rich_text?.[0]?.plain_text || '';
      const stockEventsDbId = props['Stock Events DB ID']?.rich_text?.[0]?.plain_text || '';

      console.log(`👤 ${name} (${email})`);
      console.log(`   User ID: ${page.id}`);

      // Check Access Token
      if (accessToken) {
        const tokenPreview = accessToken.substring(0, 20) + '...' + accessToken.substring(accessToken.length - 5);
        console.log(`   ✅ Access Token: ${tokenPreview} (length: ${accessToken.length})`);
      } else {
        console.log(`   ❌ Access Token: MISSING`);
      }

      // Check Stock Analyses DB ID
      if (stockAnalysesDbId) {
        console.log(`   ✅ Stock Analyses DB ID: ${stockAnalysesDbId}`);
      } else {
        console.log(`   ⚠️  Stock Analyses DB ID: MISSING`);
      }

      // Check Stock Events DB ID
      if (stockEventsDbId) {
        console.log(`   ✅ Stock Events DB ID: ${stockEventsDbId}`);
      } else {
        console.log(`   ⚠️  Stock Events DB ID: MISSING`);
      }

      console.log();
    }

    console.log('='.repeat(70));
    console.log('Summary:');
    console.log(`Total approved users: ${response.results.length}`);

    const usersWithTokens = response.results.filter((page: any) => {
      const token = page.properties['Access Token']?.rich_text?.[0]?.plain_text;
      return token && token.length > 0;
    }).length;

    console.log(`Users with access tokens: ${usersWithTokens}`);
    console.log(`Users missing access tokens: ${response.results.length - usersWithTokens}`);

    if (usersWithTokens < response.results.length) {
      console.log();
      console.log('⚠️  ACTION REQUIRED: Some users are missing access tokens!');
      console.log('   The stock events cron job cannot access their databases.');
      console.log('   These tokens are created during OAuth login flow.');
    }

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();
