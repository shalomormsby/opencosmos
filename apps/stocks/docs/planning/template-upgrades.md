# Template Upgrade System - Developer Guide

This guide explains how to create and deploy new template versions for Sage Stocks.

---

## Quick Start: Adding a New Version

### 1. Bump Version Number

Edit `lib/template-versions.ts`:

```typescript
export const CURRENT_VERSION = '1.1.0'; // Was 1.0.0
```

### 2. Add Changelog Entry

In the same file, add your version to `UPGRADE_CHANGELOGS`:

```typescript
export const UPGRADE_CHANGELOGS: Record<string, UpgradeChangelog> = {
  '1.0.0': { /* existing */ },
  '1.1.0': {
    date: '2025-11-15',
    title: 'Sector Analysis Database',
    changes: [
      {
        type: 'added',
        item: 'Sector Analysis database',
        impact: 'New database will be created in your workspace'
      },
      {
        type: 'improved',
        item: 'Updated analysis prompts with sector context',
        impact: 'Content only, no data changes'
      },
      {
        type: 'fixed',
        item: 'Composite Score formula for edge cases',
        impact: 'More accurate scoring for low-liquidity stocks'
      }
    ],
    breaking: false,
    estimatedTime: '30 seconds'
  }
};
```

### 3. Implement Upgrade Logic (if needed)

Edit `api/upgrade.ts`, add to the `applyUpgrade()` function:

```typescript
async function applyUpgrade(user: any, targetVersion: string): Promise<void> {
  // ... existing code ...

  // Version-specific upgrades
  if (targetVersion === '1.1.0') {
    await createSectorAnalysisDatabase(user, notion);
    await addPropertyToStockAnalyses(user, notion, 'Sector', {
      select: {
        options: [
          { name: 'Technology', color: 'blue' },
          { name: 'Finance', color: 'green' },
          { name: 'Healthcare', color: 'red' },
          // ... more sectors
        ]
      }
    });
  }

  if (targetVersion === '1.2.0') {
    // Future version logic here
  }
}
```

### 4. Test Thoroughly

```bash
# 1. Create test user account
# 2. Duplicate template as test user
# 3. Manually set their version to previous (e.g., 1.0.0) in Beta Users DB
# 4. Visit /api/upgrade as test user
# 5. Click "Upgrade now"
# 6. Verify changes applied correctly
# 7. Verify Stock Analyses and History untouched
# 8. Verify version updated to new version
```

### 5. Deploy

```bash
git add .
git commit -m "Version 1.1.0: Sector Analysis Database"
git push
vercel --prod
```

Users will see the update notification next time they click "Check for updates" in their Sage Stocks template.

---

## Versioning Strategy

We follow [Semantic Versioning](https://semver.org/):

**MAJOR.MINOR.PATCH**

- **MAJOR (2.0.0)**: Breaking changes, may require manual migration
- **MINOR (1.1.0)**: New features, databases, backwards compatible
- **PATCH (1.0.1)**: Bug fixes, content updates, typos

### Examples:

- ` 1.0.0 → 1.0.1`: Fixed typo in analysis prompt (PATCH)
- `1.0.1 → 1.1.0`: Added Sector Analysis database (MINOR)
- `1.9.0 → 2.0.0`: Complete redesign with new schema (MAJOR)

---

## Safety Guidelines

### ✅ DO:

- Create new databases
- Add new properties to existing databases
- Update content in Sage Stocks page
- Add relations between databases
- Set defaults for new properties
- Update formulas (with caution)

### ❌ DON'T:

- Delete existing databases
- Remove existing properties
- Modify existing data in Stock Analyses/History
- Change property types (can break formulas)
- Overwrite user's custom content
- Delete pages or blocks

---

## Common Upgrade Patterns

### Pattern 1: Add New Database

```typescript
async function createSectorAnalysisDatabase(user: any, notion: Client): Promise<string> {
  // Check if already exists (idempotent)
  const existing = await searchDatabaseByTitle(notion, 'Sector Analysis');
  if (existing) {
    console.log('  Sector Analysis database already exists');
    return existing.id;
  }

  // Create new database
  const database = await notion.databases.create({
    parent: { page_id: user.sageStocksPageId },
    title: [{ text: { content: 'Sector Analysis' } }],
    properties: {
      'Sector': {
        title: {}
      },
      'Performance': {
        number: { format: 'percent' }
      },
      'Top Stocks': {
        relation: { database_id: user.stockAnalysesDbId }
      }
    }
  });

  console.log('  ✓ Created Sector Analysis database');
  return database.id;
}
```

### Pattern 2: Add Property to Existing Database

```typescript
async function addPropertyToStockAnalyses(
  user: any,
  notion: Client,
  propertyName: string,
  propertyConfig: any
): Promise<void> {
  // Get current database
  const db = await notion.databases.retrieve({
    database_id: user.stockAnalysesDbId
  });

  // Check if property already exists (idempotent)
  if ((db as any).properties[propertyName]) {
    console.log(`  Property "${propertyName}" already exists`);
    return;
  }

  // Add new property
  await notion.databases.update({
    database_id: user.stockAnalysesDbId,
    properties: {
      [propertyName]: propertyConfig
    }
  });

  console.log(`  ✓ Added property "${propertyName}" to Stock Analyses`);
}
```

### Pattern 3: Update Page Content

```typescript
async function updatePageContent(
  notion: Client,
  pageId: string,
  find: RegExp,
  replace: string
): Promise<void> {
  // Retrieve page blocks
  const blocks = await notion.blocks.children.list({
    block_id: pageId,
    page_size: 100
  });

  // Find and update matching blocks
  for (const block of blocks.results) {
    if (block.type === 'paragraph') {
      const paragraph = (block as any).paragraph;
      const text = paragraph.rich_text.map((t: any) => t.plain_text).join('');

      if (find.test(text)) {
        await notion.blocks.update({
          block_id: block.id,
          paragraph: {
            rich_text: [{ text: { content: replace } }]
          }
        });
        console.log('  ✓ Updated page content');
      }
    }
  }
}
```

### Pattern 4: Add Relation Between Databases

```typescript
async function linkDatabases(
  notion: Client,
  sourceDbId: string,
  targetDbId: string,
  propertyName: string
): Promise<void> {
  await notion.databases.update({
    database_id: sourceDbId,
    properties: {
      [propertyName]: {
        relation: {
          database_id: targetDbId,
          type: 'dual_property', // Creates bidirectional relation
          dual_property: {
            synced_property_name: 'Related Analyses' // Name in target DB
          }
        }
      }
    }
  });

  console.log(`  ✓ Linked databases with "${propertyName}" property`);
}
```

---

## Testing Checklist

Before deploying a new version:

### Pre-Deployment Testing

- [ ] TypeScript compiles without errors (`npx tsc --noEmit`)
- [ ] Changelog entry is clear and complete
- [ ] Estimated time is realistic
- [ ] Version number follows semver

### Test User Setup

- [ ] Create test Notion account
- [ ] Sign up as beta user in production
- [ ] Get approved as beta user
- [ ] Run `/api/setup` to configure databases
- [ ] Manually set Template Version to previous version in Beta Users DB

### Upgrade Testing

- [ ] Visit `/api/upgrade` as test user
- [ ] Verify upgrade page shows correct changelog
- [ ] Click "Upgrade now"
- [ ] Verify upgrade completes successfully
- [ ] Check Beta Users DB: Template Version updated
- [ ] Check Beta Users DB: Upgrade History logged
- [ ] Check Sage Stocks page: Template Version property updated

### Data Safety Testing

- [ ] Stock Analyses database: No data lost
- [ ] Stock History database: No data lost
- [ ] New databases created correctly (if applicable)
- [ ] New properties added correctly (if applicable)
- [ ] Existing properties unchanged
- [ ] User can run new analysis successfully

### Error Scenario Testing

- [ ] Test with expired OAuth token (should fail gracefully)
- [ ] Test with missing permissions (should show error)
- [ ] Test upgrade retry logic (simulate transient failure)
- [ ] Test "Maybe later" button (should not upgrade)
- [ ] Test "Already up to date" flow

---

## Rollback Procedure

If an upgrade fails for multiple users:

### 1. Immediate Response

```typescript
// In lib/template-versions.ts
export const CURRENT_VERSION = '1.0.0'; // Revert to previous
```

Deploy hotfix:

```bash
git commit -am "Hotfix: Revert version to 1.0.0"
vercel --prod
```

### 2. Investigation

- Check Vercel logs for errors
- Check Beta Users → Upgrade History for failure patterns
- Identify root cause

### 3. Fix and Re-Deploy

- Fix bug in upgrade logic
- Bump version again (e.g., 1.1.0 → 1.1.1)
- Re-test thoroughly
- Deploy

### 4. User Communication

- Users who upgraded successfully: No action needed
- Users who failed: Will see new version on next check
- Users who haven't upgraded: Will skip failed version

---

## Monitoring & Analytics

### Track Upgrade Success Rate

Check Beta Users database:

- **Upgrade History** property shows success/failure
- **Template Version** property shows current version
- **Last Upgrade At** property shows when upgraded

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| "Cannot access database" | Permission revoked | User needs to re-grant access via OAuth |
| "Notion token expired" | Token TTL exceeded | User needs to re-authenticate |
| "Property already exists" | Upgrade ran twice | Idempotent logic should handle this |
| "Rate limited" | Too many API calls | Add delays between operations |

---

## Advanced: Incremental Upgrades

If a user is on version 1.0.0 and current is 1.2.0, they should upgrade through 1.1.0 first.

Use `getUpgradePath()` from `lib/template-versions.ts`:

```typescript
import { getUpgradePath } from '../lib/template-versions';

const path = getUpgradePath('1.0.0', '1.2.0');
// Returns: ['1.1.0', '1.2.0']

for (const version of path) {
  await applyUpgrade(user, version);
}
```

---

## Future Enhancements

Ideas for v2:

- **Automated notifications**: Email/Slack when update available
- **Dry run mode**: Preview changes without applying
- **Rollback capability**: Undo last upgrade
- **Version compatibility matrix**: Prevent incompatible upgrades
- **Upgrade scheduling**: Let users choose when to upgrade
- **Changelog viewer**: In-app changelog history

---

## Support

If users report upgrade issues:

1. Check their Upgrade History in Beta Users DB
2. Check Vercel logs for their email/user ID
3. Verify their OAuth token is valid
4. Verify database permissions
5. Manual fix if needed (update Template Version property)

---

**Questions?** Contact the dev team or check the implementation in `api/upgrade.ts` and `lib/template-versions.ts`.
