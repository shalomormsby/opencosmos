#!/usr/bin/env ts-node
/**
 * Production Template Cleanup Script
 *
 * Updates the Sage Stocks production template IN PLACE by:
 * 1. Clearing all database rows (preserving schema)
 * 2. Removing example stock pages (NVDA, MSFT, TSM, etc.)
 * 3. Updating version number in page content
 * 4. Keeping Quick Start and wiki pages intact
 *
 * Benefits:
 * - Same URL forever (no frontend changes needed)
 * - Fast template duplication for users (<30 seconds)
 * - Single source of truth
 * - Run periodically to sync structure changes from dev
 *
 * Usage:
 *   # First time: Set up prod template
 *   npm run cleanup-template -- --page-id=abc123 --version=v0.1.0
 *
 *   # Subsequent updates: Same page, new version
 *   npm run cleanup-template -- --page-id=abc123 --version=v0.2.0
 *
 *   # Dry run (preview changes without executing)
 *   npm run cleanup-template -- --page-id=abc123 --version=v0.2.0 --dry-run
 *
 *   # Use page ID from environment variable
 *   npm run cleanup-template -- --version=v0.2.0
 *
 * Environment Variables:
 *   NOTION_API_KEY - Required: Notion integration token
 *   SAGE_STOCKS_TEMPLATE_ID - Optional: Default template page ID
 */

import dotenv from 'dotenv';
import { Client } from '@notionhq/client';
import {
  PageObjectResponse,
  DatabaseObjectResponse,
  BlockObjectResponse,
  PartialBlockObjectResponse
} from '@notionhq/client/build/src/api-endpoints';

// Load environment variables
dotenv.config();

// CLI Arguments
interface Args {
  pageId?: string;
  version?: string;
  dryRun: boolean;
  help: boolean;
}

function parseArgs(): Args {
  const args: Args = {
    dryRun: false,
    help: false,
  };

  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i];

    if (arg === '--help' || arg === '-h') {
      args.help = true;
    } else if (arg === '--dry-run') {
      args.dryRun = true;
    } else if (arg.startsWith('--page-id=')) {
      args.pageId = arg.split('=')[1];
    } else if (arg.startsWith('--version=')) {
      args.version = arg.split('=')[1];
    }
  }

  return args;
}

function printHelp() {
  console.log(`
Production Template Cleanup Script

Usage:
  npm run cleanup-template -- [options]

Options:
  --page-id=<id>     Template page ID (or use SAGE_STOCKS_TEMPLATE_ID env var)
  --version=<ver>    Version number to display (e.g., v0.1.0)
  --dry-run          Preview changes without executing
  --help, -h         Show this help message

Examples:
  # Clean up and update version
  npm run cleanup-template -- --page-id=abc123 --version=v0.1.0

  # Dry run to preview changes
  npm run cleanup-template -- --page-id=abc123 --version=v0.1.0 --dry-run

  # Use page ID from environment variable
  npm run cleanup-template -- --version=v0.2.0

Environment Variables:
  NOTION_API_KEY             Required: Notion integration token
  SAGE_STOCKS_TEMPLATE_ID    Optional: Default template page ID
`);
}

// Version number extraction helpers
async function getLatestVersionFromChangelog(): Promise<string> {
  try {
    const fs = await import('fs');
    const path = await import('path');
    const changelogPath = path.resolve(process.cwd(), 'CHANGELOG.md');

    if (!fs.existsSync(changelogPath)) {
      console.warn('⚠️  CHANGELOG.md not found, using default version');
      return 'v0.1.0';
    }

    const content = fs.readFileSync(changelogPath, 'utf-8');
    // Match version headers like "## [v1.2.3]" or "## v1.2.3"
    const versionMatch = content.match(/##\s+\[?(v\d+\.\d+\.\d+)\]?/);

    if (versionMatch) {
      return versionMatch[1];
    }

    console.warn('⚠️  No version found in CHANGELOG.md, using default');
    return 'v0.1.0';
  } catch (error) {
    console.warn('⚠️  Failed to read CHANGELOG.md:', error);
    return 'v0.1.0';
  }
}

// Notion helpers
async function findAllDatabases(
  client: Client,
  pageId: string
): Promise<Array<{ id: string; title: string }>> {
  console.log('🔍 Finding all databases in page...');

  const databases: Array<{ id: string; title: string }> = [];
  let cursor: string | undefined = undefined;
  let hasMore = true;

  while (hasMore) {
    const response = await client.blocks.children.list({
      block_id: pageId,
      start_cursor: cursor,
      page_size: 100,
    });

    for (const block of response.results) {
      if ('type' in block && block.type === 'child_database') {
        const db = block as any;
        const title = db.child_database?.title || 'Untitled Database';
        databases.push({
          id: block.id,
          title,
        });
      }
    }

    hasMore = response.has_more;
    cursor = response.next_cursor || undefined;
  }

  console.log(`   Found ${databases.length} database(s):`);
  databases.forEach(db => {
    console.log(`   - ${db.title} (${db.id.substring(0, 8)}...)`);
  });

  return databases;
}

async function clearDatabaseRows(
  client: Client,
  databaseId: string,
  databaseTitle: string,
  dryRun: boolean
): Promise<number> {
  console.log(`\n📦 Processing database: ${databaseTitle}`);

  // Query all pages in database
  let allPages: string[] = [];
  let cursor: string | undefined = undefined;
  let hasMore = true;

  console.log('   Fetching all rows...');
  while (hasMore) {
    const response = await client.databases.query({
      database_id: databaseId,
      start_cursor: cursor,
      page_size: 100,
    });

    const pageIds = response.results
      .filter((page): page is PageObjectResponse => 'id' in page)
      .map(page => page.id);

    allPages.push(...pageIds);

    hasMore = response.has_more;
    cursor = response.next_cursor || undefined;
  }

  console.log(`   Found ${allPages.length} row(s) to delete`);

  if (allPages.length === 0) {
    console.log('   ✓ Database already empty');
    return 0;
  }

  if (dryRun) {
    console.log(`   [DRY RUN] Would delete ${allPages.length} rows`);
    return allPages.length;
  }

  // Delete all pages
  let deleted = 0;
  const batchSize = 10;

  for (let i = 0; i < allPages.length; i += batchSize) {
    const batch = allPages.slice(i, i + batchSize);

    await Promise.all(
      batch.map(async (pageId) => {
        try {
          await client.pages.update({
            page_id: pageId,
            archived: true,
          });
          deleted++;
        } catch (error) {
          console.error(`   ⚠️  Failed to delete page ${pageId.substring(0, 8)}:`, error);
        }
      })
    );

    // Progress indicator
    if ((i + batch.length) % 50 === 0 || (i + batch.length) === allPages.length) {
      console.log(`   Deleted ${deleted}/${allPages.length} rows...`);
    }

    // Rate limiting: 3 requests/second
    await new Promise(resolve => setTimeout(resolve, 350));
  }

  console.log(`   ✅ Deleted ${deleted}/${allPages.length} rows`);
  return deleted;
}

async function findExampleStockPages(
  client: Client,
  pageId: string
): Promise<Array<{ id: string; title: string }>> {
  console.log('\n🔍 Finding example stock pages...');

  const exampleTickers = ['NVDA', 'MSFT', 'TSM', 'AAPL', 'GOOGL', 'AMZN', 'META', 'NFLX'];
  const examplePages: Array<{ id: string; title: string }> = [];

  let cursor: string | undefined = undefined;
  let hasMore = true;

  while (hasMore) {
    const response = await client.blocks.children.list({
      block_id: pageId,
      start_cursor: cursor,
      page_size: 100,
    });

    for (const block of response.results) {
      if ('type' in block && block.type === 'child_page') {
        const page = block as any;
        const title = page.child_page?.title || '';

        // Check if title contains any example ticker
        const isExample = exampleTickers.some(ticker =>
          title.toUpperCase().includes(ticker)
        );

        if (isExample) {
          examplePages.push({
            id: block.id,
            title,
          });
        }
      }
    }

    hasMore = response.has_more;
    cursor = response.next_cursor || undefined;
  }

  console.log(`   Found ${examplePages.length} example page(s):`);
  examplePages.forEach(page => {
    console.log(`   - ${page.title}`);
  });

  return examplePages;
}

async function removeExamplePages(
  client: Client,
  examplePages: Array<{ id: string; title: string }>,
  dryRun: boolean
): Promise<number> {
  if (examplePages.length === 0) {
    console.log('   ✓ No example pages to remove');
    return 0;
  }

  if (dryRun) {
    console.log(`   [DRY RUN] Would delete ${examplePages.length} example pages`);
    return examplePages.length;
  }

  console.log(`\n🗑️  Removing ${examplePages.length} example pages...`);

  let deleted = 0;
  for (const page of examplePages) {
    try {
      await client.blocks.delete({
        block_id: page.id,
      });
      deleted++;
      console.log(`   ✓ Deleted: ${page.title}`);
    } catch (error) {
      console.error(`   ⚠️  Failed to delete ${page.title}:`, error);
    }

    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 350));
  }

  console.log(`   ✅ Deleted ${deleted}/${examplePages.length} pages`);
  return deleted;
}

async function updateVersionNumber(
  client: Client,
  pageId: string,
  version: string,
  dryRun: boolean
): Promise<void> {
  console.log(`\n🏷️  Updating version number to ${version}...`);

  if (dryRun) {
    console.log(`   [DRY RUN] Would update version to ${version}`);
    return;
  }

  try {
    // Find toggle block with version info
    // Look for text like "Version 0.1" or "v0.1.0" and update it
    const blocks = await client.blocks.children.list({
      block_id: pageId,
      page_size: 100,
    });

    let versionBlockFound = false;

    for (const block of blocks.results) {
      if ('type' in block && block.type === 'toggle') {
        const toggle = block as any;
        const text = toggle.toggle?.rich_text?.[0]?.plain_text || '';

        // Check if this toggle contains version info
        if (text.toLowerCase().includes('version') || text.match(/v?\d+\.\d+/)) {
          console.log(`   Found version block: "${text}"`);

          // Update the toggle text with new version
          await client.blocks.update({
            block_id: block.id,
            toggle: {
              rich_text: [
                {
                  type: 'text',
                  text: { content: `Version ${version}` },
                },
              ],
              color: 'default',
            },
          });

          console.log(`   ✅ Updated version block to "${version}"`);
          versionBlockFound = true;
          break;
        }
      }
    }

    if (!versionBlockFound) {
      console.log('   ℹ️  No version block found (this is okay if template doesn\'t have one)');
    }
  } catch (error) {
    console.error('   ⚠️  Failed to update version number:', error);
    console.log('   💡 You can manually update the version in Notion');
  }
}

async function main() {
  const args = parseArgs();

  if (args.help) {
    printHelp();
    process.exit(0);
  }

  console.log('\n' + '='.repeat(70));
  console.log('Sage Stocks Production Template Cleanup');
  console.log('='.repeat(70));

  // Validate environment
  const notionApiKey = process.env.NOTION_API_KEY;
  if (!notionApiKey) {
    console.error('\n❌ Error: NOTION_API_KEY environment variable is required');
    console.log('   Set it in your .env file or export it in your shell\n');
    process.exit(1);
  }

  // Get page ID
  const pageId = args.pageId || process.env.SAGE_STOCKS_TEMPLATE_ID;
  if (!pageId) {
    console.error('\n❌ Error: Template page ID is required');
    console.log('   Provide it via --page-id=<id> or set SAGE_STOCKS_TEMPLATE_ID env var');
    console.log('   Run with --help for usage information\n');
    process.exit(1);
  }

  // Get version
  let version = args.version;
  if (!version) {
    console.log('\n📋 No version specified, reading from CHANGELOG.md...');
    version = await getLatestVersionFromChangelog();
  }

  console.log('\nConfiguration:');
  console.log(`  Template Page ID: ${pageId}`);
  console.log(`  Version:          ${version}`);
  console.log(`  Mode:             ${args.dryRun ? 'DRY RUN (no changes)' : 'LIVE (will modify template)'}`);
  console.log('='.repeat(70) + '\n');

  if (args.dryRun) {
    console.log('🔍 DRY RUN MODE: Previewing changes without modifying template\n');
  } else {
    console.log('⚠️  LIVE MODE: This will modify the production template!');
    console.log('   Make sure you have a backup of the dev template\n');

    // 5 second countdown
    for (let i = 5; i > 0; i--) {
      process.stdout.write(`   Starting in ${i}...\r`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    console.log('   Starting now!     \n');
  }

  const client = new Client({ auth: notionApiKey });

  try {
    // Step 1: Verify page exists
    console.log('✓ Verifying template page...');
    const page = await client.pages.retrieve({ page_id: pageId });
    console.log(`  Template: ${(page as any).properties?.title?.title?.[0]?.plain_text || 'Sage Stocks'}\n`);

    // Step 2: Find all databases
    const databases = await findAllDatabases(client, pageId);

    // Step 3: Clear database rows
    let totalRowsDeleted = 0;
    for (const db of databases) {
      const deleted = await clearDatabaseRows(client, db.id, db.title, args.dryRun);
      totalRowsDeleted += deleted;
    }

    // Step 4: Find and remove example pages
    const examplePages = await findExampleStockPages(client, pageId);
    const pagesDeleted = await removeExamplePages(client, examplePages, args.dryRun);

    // Step 5: Update version number
    await updateVersionNumber(client, pageId, version, args.dryRun);

    // Summary
    console.log('\n' + '='.repeat(70));
    console.log('Summary');
    console.log('='.repeat(70));
    console.log(`Databases processed:      ${databases.length}`);
    console.log(`Database rows deleted:    ${totalRowsDeleted}`);
    console.log(`Example pages deleted:    ${pagesDeleted}`);
    console.log(`Version updated:          ${version}`);
    console.log('='.repeat(70));

    if (args.dryRun) {
      console.log('\n✅ Dry run complete! No changes were made.');
      console.log('\nTo apply these changes, run without --dry-run:');
      console.log(`   npm run cleanup-template -- --page-id=${pageId} --version=${version}\n`);
    } else {
      console.log('\n✅ Template cleanup complete!');
      console.log('\nYour production template is now lightweight and ready for users.');
      console.log(`Users can duplicate: https://notion.so/${pageId.replace(/-/g, '')}`);
      console.log('\nNext steps:');
      console.log('1. Test template duplication (should take <30 seconds)');
      console.log('2. Verify all databases have correct schemas (zero rows)');
      console.log('3. Check that Quick Start and wiki pages are intact');
      console.log('4. Run again after structural changes to dev template\n');
    }

  } catch (error) {
    console.error('\n❌ Error during cleanup:', error);
    if (error instanceof Error) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}
