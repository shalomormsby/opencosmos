/**
 * Clear Encrypted Access Tokens from Beta Users
 *
 * This script clears all encrypted OAuth access tokens from the Beta Users database.
 * Use this after rotating ENCRYPTION_KEY to force users to re-authenticate.
 *
 * Usage:
 *   npx ts-node scripts/maintenance/clear-encrypted-tokens.ts
 *
 * Environment variables required:
 *   - NOTION_API_KEY (admin token)
 *   - NOTION_BETA_USERS_DB_ID
 *
 * Why this is needed:
 * When ENCRYPTION_KEY is rotated, existing tokens encrypted with the old key
 * cannot be decrypted. This script clears all tokens, forcing users to log in
 * again and get new tokens encrypted with the new key.
 */

import * as dotenv from 'dotenv';
import { Client } from '@notionhq/client';

// Load environment variables
dotenv.config();

const NOTION_API_KEY = process.env.NOTION_API_KEY || '';
const BETA_USERS_DB_ID = process.env.NOTION_BETA_USERS_DB_ID || '';

async function main() {
  console.log('='.repeat(60));
  console.log('Clear Encrypted Access Tokens');
  console.log('='.repeat(60));
  console.log();
  console.log('⚠️  WARNING: This will clear all OAuth access tokens.');
  console.log('   Users will need to log in again to re-authenticate.');
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
      const currentToken = props['OAuth Access Token']?.rich_text?.[0]?.plain_text || '';

      console.log(`👤 ${name} (${email})`);

      if (!currentToken) {
        console.log('   ⏭️  No access token found (already cleared or never authenticated)');
        console.log();
        skipped++;
        continue;
      }

      // Clear the access token
      console.log('   🔄 Clearing access token...');
      await notion.pages.update({
        page_id: page.id,
        properties: {
          'OAuth Access Token': {
            rich_text: [],
          },
        },
      });

      console.log('   ✅ Token cleared!');
      console.log();
      updated++;
    }

    console.log('='.repeat(60));
    console.log('Summary');
    console.log('='.repeat(60));
    console.log(`Cleared: ${updated}`);
    console.log(`Skipped: ${skipped}`);
    console.log();

    if (updated > 0) {
      console.log('✅ Access tokens cleared successfully!');
      console.log();
      console.log('Next steps:');
      console.log('1. Users need to log out and log back in');
      console.log('2. New tokens will be encrypted with the current ENCRYPTION_KEY');
      console.log('3. Monitor logs to ensure users can authenticate successfully');
    } else {
      console.log('ℹ️  No tokens to clear');
    }

  } catch (error) {
    console.error();
    console.error('❌ Failed to clear access tokens:', error);
    console.error();
    process.exit(1);
  }
}

main();
