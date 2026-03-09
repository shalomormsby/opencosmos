# Production Template Quick Start

**TL;DR:** Keep a lightweight template for fast user duplication. Update the same template in place. Run cleanup script after structural changes.

## One-Time Setup (5 minutes)

1. **Duplicate your dev template in Notion**
   ```
   Dev Sage Stocks page → Duplicate → Rename to "Sage Stocks Template"
   ```

2. **Run cleanup script**
   ```bash
   npm run cleanup-template -- --page-id=abc123 --version=v0.1.0 --dry-run
   npm run cleanup-template -- --page-id=abc123 --version=v0.1.0
   ```

3. **Make template public**
   ```
   Share → Share to web → Copy URL
   ```

4. **Save template ID**
   ```bash
   # Add to .env
   SAGE_STOCKS_TEMPLATE_ID=abc123def456
   ```

**Done!** Template is ready. Users duplicate in <30 seconds.

## Periodic Updates

When you change dev template structure (new databases, properties, docs):

```bash
# Option 1: Full sync (major changes)
# 1. Manually duplicate dev → prod again
# 2. Run cleanup on new duplicate
npm run cleanup-template -- --page-id=new_id --version=v0.2.0

# Option 2: Incremental update (minor changes)
# 1. Manually update prod template
# 2. Run cleanup to clear test data
npm run cleanup-template -- --page-id=abc123 --version=v0.2.0
```

## Common Commands

```bash
# Dry run (preview changes)
npm run cleanup-template -- --page-id=abc123 --version=v0.2.0 --dry-run

# Apply changes
npm run cleanup-template -- --page-id=abc123 --version=v0.2.0

# Auto-detect version from CHANGELOG.md
npm run cleanup-template -- --page-id=abc123

# Use environment variable (SAGE_STOCKS_TEMPLATE_ID)
npm run cleanup-template -- --version=v0.2.0

# Help
npm run cleanup-template -- --help
```

## What Gets Cleaned

- ✅ **Cleared:** ALL database rows from ALL child databases (preserving schemas)
  - Automatically finds: Stock Analyses, Stock History, Stock Events, Market Context, etc.
- ✅ **Removed:** Example stock pages (NVDA, MSFT, etc.)
- ✅ **Preserved:** Quick Start, wiki, structure
- ✅ **Updated:** Version number in page

**Note:** The script dynamically discovers all databases - no hardcoded list to maintain.

## Why This Works

**Problem:** Dev template has 2000+ rows → 2-5 minute duplication
**Solution:** Prod template has 0 rows → 15-30 second duplication
**Result:** 80-90% faster onboarding

**Key insight:** Update the same template in place instead of creating new versions. This means:
- No URL changes (frontend unchanged)
- No version drift (one canonical template)
- Simple maintenance (run script periodically)

## Full Documentation

See [PROD_TEMPLATE.md](./PROD_TEMPLATE.md) for:
- Detailed architecture
- Troubleshooting guide
- Best practices
- Performance notes

## Support

Questions? Issues?
1. Check [PROD_TEMPLATE.md](./PROD_TEMPLATE.md)
2. Run with `--dry-run` to preview
3. Open GitHub issue with logs
