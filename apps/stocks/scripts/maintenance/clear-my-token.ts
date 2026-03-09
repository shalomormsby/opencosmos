/**
 * Clear Access Token for Specific User
 *
 * Quick script to clear the encrypted access token for a single user.
 * Use this when you need to force re-authentication after key rotation.
 *
 * Usage:
 *   npm run clear-my-token
 */

import * as dotenv from 'dotenv';
import { Client } from '@notionhq/client';

// Load environment variables
dotenv.config();

const NOTION_API_KEY = process.env.NOTION_API_KEY || '';
const BETA_USERS_DB_ID = process.env.NOTION_BETA_USERS_DB_ID || '';

// CHANGE THIS to your email
const TARGET_EMAIL = 'shalomormsby@gmail.com';

async function main() {
  console.log('='.repeat(60));
  console.log('Clear My Access Token');
  console.log('='.repeat(60));
  console.log();
  console.log(`🎯 Target: ${TARGET_EMAIL}`);
  console.log();

  // Validate environment
  if (!NOTION_API_KEY) {
    console.error('❌ Missing NOTION_API_KEY');
    console.log('\nPlease add NOTION_API_KEY to your .env file');
    process.exit(1);
  }

  if (!BETA_USERS_DB_ID) {
    console.error('❌ Missing NOTION_BETA_USERS_DB_ID');
    console.log('\nPlease add NOTION_BETA_USERS_DB_ID to your .env file');
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

    console.log('🔍 Searching for user...');
    const response = await notion.dataSources.query({
      data_source_id: dataSourceId,
      filter: {
        property: 'Email',
        email: { equals: TARGET_EMAIL },
      },
    });

    if (response.results.length === 0) {
      console.error(`❌ User not found: ${TARGET_EMAIL}`);
      process.exit(1);
    }

    const page = response.results[0] as any;
    const props = page.properties;
    const name = props.Name?.title?.[0]?.plain_text || 'Unknown';
    const currentToken = props['Access Token']?.rich_text?.[0]?.plain_text || '';

    console.log(`✅ Found user: ${name} (${TARGET_EMAIL})`);
    console.log();

    if (!currentToken) {
      console.log('ℹ️  No access token found - already cleared!');
      console.log('\nNext step: Log in to Sage Stocks to get a new token');
      process.exit(0);
    }

    console.log('🔄 Clearing access token...');
    await notion.pages.update({
      page_id: page.id,
      properties: {
        'Access Token': {
          rich_text: [],
        },
      },
    });

    console.log('✅ Access token cleared!');
    console.log();
    console.log('='.repeat(60));
    console.log('Next Steps:');
    console.log('='.repeat(60));
    console.log('1. Go to your Sage Stocks app');
    console.log('2. Log out (if still logged in)');
    console.log('3. Log back in');
    console.log('4. Your new token will be encrypted with the current key');
    console.log('5. Try running an analysis');
    console.log();

  } catch (error) {
    console.error();
    console.error('❌ Failed to clear token:', error);
    console.error();
    process.exit(1);
  }
}

main();
