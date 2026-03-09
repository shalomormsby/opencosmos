/**
 * Fix Stock Events Database Schema
 *
 * Adds missing properties to all users' Stock Events databases
 * to match the expected schema from lib/integrations/notion/schema.ts
 *
 * Run this to fix: "Event Date is not a property that exists" errors
 *
 * Usage:
 *   npx ts-node scripts/maintenance/fix-stock-events-schema.ts
 */

import * as dotenv from 'dotenv';
import { Client } from '@notionhq/client';
import { decryptToken } from '../../lib/core/auth';

dotenv.config();

const NOTION_API_KEY = process.env.NOTION_API_KEY || '';
const BETA_USERS_DB_ID = process.env.NOTION_BETA_USERS_DB_ID || '';

interface User {
  email: string;
  accessToken: string;
  stockEventsDbId: string;
}

async function main() {
  console.log('='.repeat(70));
  console.log('Fix Stock Events Database Schema');
  console.log('='.repeat(70));
  console.log();

  if (!NOTION_API_KEY || !BETA_USERS_DB_ID) {
    console.error('❌ Missing required environment variables');
    process.exit(1);
  }

  const notion = new Client({ auth: NOTION_API_KEY, notionVersion: '2025-09-03' });

  try {
    // Get all users with Stock Events databases
    console.log('📋 Fetching users...');
    const users = await fetchUsers(notion);
    console.log(`✅ Found ${users.length} users with Stock Events databases\n`);

    // Fix each database
    let fixed = 0;
    let failed = 0;

    for (const user of users) {
      try {
        console.log(`🔧 Fixing ${user.email}...`);
        await fixDatabaseSchema(user);
        console.log(`✅ ${user.email} - Schema fixed\n`);
        fixed++;
      } catch (error) {
        console.error(`❌ ${user.email} - Failed:`, error);
        failed++;
      }
    }

    console.log('='.repeat(70));
    console.log(`✅ Fixed: ${fixed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log('='.repeat(70));

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

/**
 * Fetch all users from Beta Users database
 */
async function fetchUsers(notion: Client): Promise<User[]> {
  const users: User[] = [];

  // Get data source ID
  const db = await notion.databases.retrieve({ database_id: BETA_USERS_DB_ID });
  const dataSourceId = (db as any).data_sources?.[0]?.id;

  if (!dataSourceId) {
    throw new Error('No data source found for Beta Users database');
  }

  // Query approved users
  const response = await notion.dataSources.query({
    data_source_id: dataSourceId,
    filter: {
      property: 'Status',
      select: {
        equals: 'Approved',
      },
    },
  });

  for (const page of response.results) {
    const props = (page as any).properties;

    const email = props.Email?.email || '';
    const encryptedToken = props['Access Token']?.rich_text?.[0]?.plain_text || '';
    const stockEventsDbId = props['Stock Events DB ID']?.rich_text?.[0]?.plain_text || '';

    if (!email || !encryptedToken || !stockEventsDbId) {
      console.warn(`⚠️  Skipping user ${email} - missing required data`);
      continue;
    }

    // Decrypt access token
    const accessToken = await decryptToken(encryptedToken);

    users.push({
      email,
      accessToken,
      stockEventsDbId,
    });
  }

  return users;
}

/**
 * Fix a single user's Stock Events database schema
 */
async function fixDatabaseSchema(user: User): Promise<void> {
  const notion = new Client({ auth: user.accessToken, notionVersion: '2025-09-03' });

  // Define the properties we need to add/update
  const properties: any = {
    // Title property (if not exists)
    'Event Name': {
      title: {},
    },
    // Date property
    'Event Date': {
      date: {},
    },
    // Ticker (rich_text, not relation!)
    'Ticker': {
      rich_text: {},
    },
    // Select properties
    'Event Type': {
      select: {
        options: [
          { name: 'Earnings Call', color: 'blue' },
          { name: 'Dividend', color: 'green' },
          { name: 'Stock Split', color: 'purple' },
          { name: 'Guidance', color: 'yellow' },
          { name: 'Economic Event', color: 'red' },
        ],
      },
    },
    'Status': {
      select: {
        options: [
          { name: 'Upcoming', color: 'gray' },
          { name: 'Today', color: 'yellow' },
          { name: 'Completed', color: 'green' },
          { name: 'Cancelled', color: 'red' },
        ],
      },
    },
    'Confidence': {
      select: {
        options: [
          { name: 'High', color: 'green' },
          { name: 'Medium-High', color: 'blue' },
          { name: 'Medium', color: 'yellow' },
          { name: 'Low', color: 'red' },
        ],
      },
    },
    'Timing Precision': {
      select: {
        options: [
          { name: 'Date Confirmed', color: 'green' },
          { name: 'Estimated', color: 'yellow' },
          { name: 'Preliminary', color: 'gray' },
        ],
      },
    },
    'Event Source': {
      select: {
        options: [
          { name: 'FMP API', color: 'blue' },
          { name: 'Manual Entry', color: 'gray' },
          { name: 'Company Announcement', color: 'green' },
        ],
      },
    },
    // Rich text properties
    'Description': {
      rich_text: {},
    },
    'Split Ratio': {
      rich_text: {},
    },
    'Fiscal Quarter': {
      rich_text: {},
    },
    // Number properties
    'EPS Estimate': {
      number: {
        format: 'dollar',
      },
    },
    'Dividend Amount': {
      number: {
        format: 'dollar',
      },
    },
    'Fiscal Year': {
      number: {
        format: 'number',
      },
    },
  };

  // Update the database schema
  await notion.databases.update({
    database_id: user.stockEventsDbId,
    properties,
  });
}

main();
