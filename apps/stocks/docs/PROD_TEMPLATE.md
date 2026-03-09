# Production Template Management

This document explains how to maintain the lightweight production template for Sage Stocks.

## Overview

**Problem:** The dev version of Sage Stocks contains real analyses, history, and market data, making template duplication take 2+ minutes. This creates a poor first impression during user signup.

**Solution:** Maintain a separate "production template" that's identical in structure but contains zero data. Users duplicate this lightweight version in <30 seconds.

**Key Innovation:** We update the **same template page in place** instead of creating new versions. This means:
- ✅ **Zero URL maintenance** - Frontend always points to same URL
- ✅ **No version drift** - Impossible for users to find outdated templates
- ✅ **Single source of truth** - One canonical template, always current
- ✅ **Simple mental model** - "The Sage Stocks Template" (not "which version?")

## How It Works

```
Dev Template (your working version)
  ├── Full data (analyses, history, examples)
  ├── Real stock pages (NVDA, MSFT, etc.)
  └── Used for testing and development
         ↓
         ↓ Manual duplication (one-time)
         ↓
Production Template (public, lightweight)
  ├── Zero data (databases empty, schemas intact)
  ├── No example pages
  ├── Clean Quick Start
  └── Users duplicate this (<30 seconds)
         ↓
         ↓ Cleanup script (periodic updates)
         ↓
Same template, updated in place
  ├── Clears any accumulated data
  ├── Updates version number
  └── Same URL works forever
```

## Initial Setup (One-Time)

### Step 1: Manual Duplication

1. Open your dev Sage Stocks page in Notion
2. Click **Duplicate** in the top-right corner
3. Rename to "Sage Stocks Template" or similar
4. Wait for duplication to complete (~2-5 minutes)

### Step 2: First Cleanup

Run the cleanup script to prepare the template:

```bash
# Get the page ID from the Notion URL
# URL: https://notion.so/Sage-Stocks-Template-abc123def456
# Page ID: abc123def456 (or abc123de-f456-... with hyphens)

# Dry run first (preview changes)
npm run cleanup-template -- --page-id=abc123def456 --version=v0.1.0 --dry-run

# Apply changes
npm run cleanup-template -- --page-id=abc123def456 --version=v0.1.0
```

This will:
- ✅ Clear all database rows (preserving schema)
- ✅ Remove example stock pages (NVDA, MSFT, TSM, etc.)
- ✅ Update version number to v0.1.0
- ✅ Keep Quick Start and wiki pages intact

### Step 3: Make Template Public

1. In Notion, open the cleaned template page
2. Click **Share** in the top-right
3. Enable **Share to web** (public access)
4. Copy the public URL

### Step 4: Save Template ID

Add to your `.env` file:

```bash
# Production template for user signups
SAGE_STOCKS_TEMPLATE_ID=abc123def456
```

**That's it!** The template is now ready and the URL will never change.

## Periodic Updates

When you make structural changes to the dev template (new databases, new properties, updated Quick Start, etc.), sync to production:

### Step 1: Update Dev Template

Make your changes in the dev version first:
- Add new database properties
- Update Quick Start instructions
- Add new wiki pages
- Test thoroughly

### Step 2: Duplicate to Production

**Option A: Replace entire template (recommended for major changes)**

1. Manually duplicate the updated dev version
2. Run cleanup script on the new duplicate
3. Replace the old production template

**Option B: Update in place (recommended for minor changes)**

1. Manually update the production template structure
2. Run cleanup script to clear any test data

### Step 3: Run Cleanup Script

```bash
# Increment version number
npm run cleanup-template -- --page-id=abc123def456 --version=v0.2.0

# Or use environment variable
npm run cleanup-template -- --version=v0.2.0
```

The script will:
- Clear any accumulated data
- Remove any example pages
- Update version number
- **Keep the same URL** (no frontend changes needed)

## Usage Examples

### Dry Run (Preview Changes)

```bash
# See what would happen without modifying anything
npm run cleanup-template -- --page-id=abc123def456 --version=v0.2.0 --dry-run
```

Output:
```
🔍 DRY RUN MODE: Previewing changes without modifying template

✓ Verifying template page...
🔍 Finding all databases in page...
   Found 7 database(s):
   - Stock Analyses
   - Stock History
   ...

📦 Processing database: Stock Analyses
   [DRY RUN] Would delete 5 rows

🔍 Finding example stock pages...
   [DRY RUN] Would delete 3 example pages

Summary:
  Database rows deleted:    5
  Example pages deleted:    3
  Version updated:          v0.2.0
```

### Live Run

```bash
# Apply changes (with 5-second countdown)
npm run cleanup-template -- --page-id=abc123def456 --version=v0.2.0
```

### Auto-Detect Version from CHANGELOG.md

```bash
# Script reads version from CHANGELOG.md
npm run cleanup-template -- --page-id=abc123def456
```

### Use Environment Variable

```bash
# Set SAGE_STOCKS_TEMPLATE_ID in .env, then:
npm run cleanup-template -- --version=v0.2.0
```

## What Gets Cleaned

### ✅ Cleared (Zero Data)

**The script automatically finds and clears ALL child databases in the template.**

This includes (but is not limited to):
- Stock Analyses database
- Stock History database
- Stock Events database
- Market Context database
- Financial Research database
- Stock Comparisons database
- Analysis Learning Log database
- Any other databases you add in the future

The script dynamically discovers databases by scanning all blocks in the page, so you don't need to update it when adding new databases.

### ✅ Removed (Example Content)
- Example stock pages (NVDA, MSFT, TSM, AAPL, GOOGL, etc.)
- Any child pages with ticker symbols in title

### ✅ Preserved (Structure & Docs)
- All database schemas (properties, views, filters)
- Quick Start page
- Wiki pages
- Documentation pages
- Page layout and formatting

### ✅ Updated (Version Info)
- Version toggle/callout updated to new version number

## Troubleshooting

### "Template page ID is required"

Provide page ID via CLI or environment variable:

```bash
# Option 1: CLI argument
npm run cleanup-template -- --page-id=abc123 --version=v0.1.0

# Option 2: Environment variable
export SAGE_STOCKS_TEMPLATE_ID=abc123
npm run cleanup-template -- --version=v0.1.0
```

### "NOTION_API_KEY environment variable is required"

Make sure your `.env` file contains:

```bash
NOTION_API_KEY=secret_your_notion_integration_token
```

### Script is slow (deleting many rows)

This is normal for templates with lots of data. The script:
- Respects Notion API rate limits (3 req/sec)
- Processes in batches of 10 rows
- Shows progress every 50 rows

For large cleanups (100+ rows), expect:
- 100 rows: ~2 minutes
- 500 rows: ~10 minutes
- 1000 rows: ~20 minutes

**Tip:** Run cleanup more frequently to avoid large backlogs.

### Version block not found

If you see:
```
ℹ️  No version block found (this is okay if template doesn't have one)
```

This means your template doesn't have a version toggle/callout. You can:
1. Manually add one in Notion, or
2. Ignore this (version tracking is optional)

### Database permissions error

Make sure your Notion integration has access to:
- The template page
- All child databases
- All child pages

To grant access:
1. Open template page in Notion
2. Click ⋯ menu → **Add connections**
3. Select your integration → **Confirm**

## Best Practices

### When to Run Cleanup

**Required:**
- ✅ After manually duplicating dev → prod (initial setup)
- ✅ Before Cohort launches or major releases

**Recommended:**
- ✅ After schema changes (new properties, databases)
- ✅ After structural changes (new Quick Start sections, wiki pages)
- ✅ Monthly maintenance (clear any test data)

**Optional:**
- ℹ️  After minor content updates (typo fixes, rewording)
- ℹ️  After version bumps with no template changes

### Keep Dev and Prod in Sync

1. **Always test in dev first** - Never modify prod template directly
2. **Document changes** - Note what changed in CHANGELOG.md
3. **Sync periodically** - Don't let dev and prod drift apart
4. **Test duplication speed** - After cleanup, duplicate and time it

### Version Numbering

Use semantic versioning for user-facing versions:

- `v0.1.0` - Initial beta release
- `v0.2.0` - New feature (e.g., new database)
- `v0.2.1` - Minor update (e.g., schema change)
- `v1.0.0` - Public launch

**Where versions live:**
- Template page: User-facing version (what they duplicate)
- CHANGELOG.md: Full version history with dates
- package.json: Internal app version

## Architecture Notes

### Why Not API-Based Duplication?

The Notion API doesn't have a `pages.duplicate()` endpoint. To duplicate programmatically, we'd need to:

1. Recursively read all blocks from source page
2. Recreate each block in destination page
3. Copy all database schemas manually
4. Preserve formatting, colors, icons, etc.
5. Handle synced blocks, embeds, etc.

This is:
- ❌ Complex (500+ lines of code)
- ❌ Slow (many API calls)
- ❌ Fragile (breaks with Notion changes)
- ❌ Incomplete (can't preserve all features)

**Manual duplication** (clicking Duplicate in Notion) is:
- ✅ Fast (handled by Notion's backend)
- ✅ Reliable (preserves everything perfectly)
- ✅ Simple (one-time, 5 minutes)
- ✅ Future-proof (works with all Notion features)

The cleanup script only needs to **delete data**, which is simple and reliable via API.

### Why Update In Place?

**Alternative approach:** Create new template for each version
- URL changes every time (e.g., Sage-Stocks-v0.1, Sage-Stocks-v0.2)
- Frontend must be updated after each cleanup
- Risk of users finding old URLs
- More complexity in docs and setup flow

**Update in place:** Keep same template ID forever
- ✅ URL never changes
- ✅ Frontend points to one canonical URL
- ✅ No version drift risk
- ✅ Simpler mental model

### Performance

Template duplication speed:

| Template State | Size | Duplication Time |
|----------------|------|------------------|
| Dev (full data) | ~2000 rows | 2-5 minutes |
| Prod (empty) | 0 rows | 15-30 seconds |
| **Improvement** | | **80-90% faster** |

This dramatically improves user onboarding experience.

## Support

If you encounter issues:

1. **Check logs** - Script outputs detailed progress
2. **Run dry-run** - Use `--dry-run` flag to preview
3. **Verify access** - Ensure integration has permissions
4. **Test in dev** - Try on a test page first
5. **Contact support** - Open GitHub issue with logs

## References

- [Notion API Docs](https://developers.notion.com/)
- [Script Source](../../scripts/maintenance/cleanup-prod-template.ts)
- [Setup Flow Docs](../setup/subway-map.md)
- [CHANGELOG.md](../../CHANGELOG.md)

---

**Last Updated:** 2025-01-03
**Version:** 1.0.0
**Author:** Sage Intelligence Team
