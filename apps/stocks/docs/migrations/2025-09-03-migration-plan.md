# Notion API 2025-09-03 Migration Plan
## Safe Upgrade Strategy with Rollback Protection

**Branch:** `feature/notion-api-2025-09-03`
**Start Date:** 2024-12-14
**Target Completion:** TBD (thorough testing required)
**Status:** 🚧 In Progress

---

## Pre-Migration Checklist ✅

### Environment Verification
- ✅ **Isolated Branch Created:** `feature/notion-api-2025-09-03`
- ✅ **Current SDK Version:** @notionhq/client@2.3.0
- ✅ **Target SDK Version:** @notionhq/client@5.0.0
- ✅ **TypeScript Version:** 5.9.3 (meets v5.9+ requirement)
- ✅ **No use of deprecated `databases.list`** (removed in v5.0.0)
- ✅ **Architecture reviewed:** OAuth → Setup → Analysis flow understood
- ✅ **Rollback plan:** Can revert to main branch immediately

### Critical Safeguards
1. **No Direct Production Deploy** - All testing in isolated branch
2. **OAuth Flow Priority** - Must not break login (happened last time!)
3. **Backwards Compatibility** - Existing users' data must remain accessible
4. **Incremental Testing** - Test each component before moving to next
5. **Type Safety** - Leverage TypeScript to catch breaking changes

---

## Phase 1: SDK Upgrade & Type Verification

### 1.1 Upgrade Dependencies
```bash
npm install @notionhq/client@^5.0.0
npm install --save-dev @types/node@^20.10.6
```

### 1.2 Verify TypeScript Compilation
```bash
npx tsc --noEmit
```
**Expected:** Type errors related to database/dataSource changes
**Action:** Document all type errors for systematic resolution

### 1.3 Review Breaking Changes
- [ ] Read full SDK v5.0.0 changelog
- [ ] Map breaking changes to affected files
- [ ] Create fix checklist for each file

---

## Phase 2: Data Model Updates

### 2.1 Update User Type Definition

**File:** `lib/auth.ts`

**Add new fields:**
```typescript
export interface User {
  // ... existing fields ...

  // NEW: Data source IDs for 2025-09-03 API
  stockAnalysesDataSourceId?: string;
  stockHistoryDataSourceId?: string;

  // Keep database IDs for backwards compatibility during migration
  stockAnalysesDbId?: string; // Will still be used initially
  stockHistoryDbId?: string;  // Will still be used initially
}
```

**Migration Strategy:**
- Keep both database IDs and data source IDs during transition
- Populate data source IDs on first use (lazy migration)
- Eventually deprecate database IDs in favor of data source IDs

### 2.2 Update Beta Users Database Schema

**Manual Notion Update Required:**
1. Add property: "Stock Analyses Data Source ID" (Rich Text)
2. Add property: "Stock History Data Source ID" (Rich Text)
3. Keep existing database ID properties

---

## Phase 3: Core Library Updates

### 3.1 NotionClient Refactoring

**File:** `lib/notion-client.ts`

**Critical Methods to Update:**

#### A. Constructor - Add API Version
```typescript
constructor(config: NotionConfig) {
  this.client = new Client({
    auth: config.apiKey,
    notionVersion: '2025-09-03' // ADD THIS
  });
  // ... rest of constructor
}
```

#### B. Add Data Source ID Resolution Helper
```typescript
/**
 * Get data source ID from database ID
 * Caches result to avoid repeated API calls
 */
private async getDataSourceId(databaseId: string): Promise<string> {
  // Check cache first
  if (this.dataSourceCache.has(databaseId)) {
    return this.dataSourceCache.get(databaseId)!;
  }

  // Fetch from API
  const db = await this.client.databases.retrieve({
    database_id: databaseId
  });

  // Extract first data source ID
  const dataSourceId = db.data_sources?.[0]?.id;

  if (!dataSourceId) {
    throw new Error(`No data source found for database ${databaseId}`);
  }

  // Cache and return
  this.dataSourceCache.set(databaseId, dataSourceId);
  return dataSourceId;
}

// Add to class properties
private dataSourceCache = new Map<string, string>();
```

#### C. Update upsertAnalyses() - Page Creation
```typescript
// OLD (database_id)
await this.client.pages.create({
  parent: { database_id: this.stockAnalysesDbId },
  properties,
});

// NEW (data_source_id)
const dataSourceId = await this.getDataSourceId(this.stockAnalysesDbId);
await this.client.pages.create({
  parent: { data_source_id: dataSourceId },
  properties,
});
```

#### D. Update findPageByTicker() - Database Query
```typescript
// OLD
const response = await this.client.databases.query({
  database_id: databaseId,
  filter: { ... }
});

// NEW
const dataSourceId = await this.getDataSourceId(databaseId);
const response = await this.client.dataSources.query({
  data_source_id: dataSourceId,
  filter: { ... }
});
```

#### E. Update queryHistoricalAnalyses() - Similar Pattern
Apply same data_source_id conversion as findPageByTicker()

#### F. Update createHistory() - Page Creation
Apply same data_source_id conversion as upsertAnalyses()

### 3.2 Auth Library Updates

**File:** `lib/auth.ts`

#### A. Update Client Initialization
```typescript
const notion = new Client({
  auth: process.env.NOTION_API_KEY,
  notionVersion: '2025-09-03' // ADD THIS
});
```

#### B. Update createOrUpdateUser() - Page Creation
```typescript
// Get Beta Users database data source ID
const betaUsersDataSourceId = await getDataSourceId(BETA_USERS_DB_ID);

// Create user page
await notion.pages.create({
  parent: { data_source_id: betaUsersDataSourceId }, // CHANGED
  properties: { ... }
});
```

**Helper needed:**
```typescript
async function getDataSourceId(databaseId: string): Promise<string> {
  const db = await notion.databases.retrieve({ database_id: databaseId });
  return db.data_sources?.[0]?.id || databaseId;
}
```

### 3.3 Orchestrator Updates

**File:** `lib/orchestrator.ts`

#### Update collectStockRequests()
```typescript
// For each user's Stock Analyses database
const dataSourceId = await getDataSourceId(user.stockAnalysesDbId);

const response = await notion.dataSources.query({ // CHANGED from databases.query
  data_source_id: dataSourceId, // CHANGED from database_id
  filter: {
    property: 'Analysis Cadence',
    select: { equals: 'Daily' },
  },
});
```

### 3.4 Database Validator Updates

**File:** `lib/database-validator.ts`

#### Update validateDatabaseConfig()
```typescript
// Test database access by fetching data source ID
const db = await notion.databases.retrieve({
  database_id: config.stockAnalysesDbId
});

if (!db.data_sources || db.data_sources.length === 0) {
  errors.push({
    field: 'stockAnalysesDbId',
    code: 'INVALID_TYPE',
    message: 'Database has no data sources'
  });
}
```

---

## Phase 4: API Endpoint Updates

### 4.1 OAuth Callback

**File:** `api/auth/callback.ts`

**CRITICAL:** This broke OAuth last time!

#### Line 111 - Post-OAuth Diagnostic
```typescript
const { Client } = await import('@notionhq/client');
const userNotion = new Client({
  auth: accessToken,
  notionVersion: '2025-09-03' // ADD THIS
});

// Search still works the same (no filter change needed for pages)
const searchResults = await userNotion.search({
  filter: { property: 'object', value: 'page' },
  page_size: 10,
});
```

**Why it's safe now:**
- We're searching for PAGES, not databases
- Search API only changed for database→data_source filter
- Page search remains compatible

### 4.2 Setup Endpoint

**File:** `api/setup.ts`

#### Update POST Handler - Store Data Source IDs
```typescript
// After validation, fetch and store data source IDs
const stockAnalysesDataSourceId = await getDataSourceIdFromDb(
  userToken,
  stockAnalysesDbId
);
const stockHistoryDataSourceId = await getDataSourceIdFromDb(
  userToken,
  stockHistoryDbId
);

// Store in Beta Users database
await adminNotion.pages.update({
  page_id: user.id,
  properties: {
    'Stock Analyses DB ID': { rich_text: [{ text: { content: stockAnalysesDbId } }] },
    'Stock History DB ID': { rich_text: [{ text: { content: stockHistoryDbId } }] },
    'Stock Analyses Data Source ID': { rich_text: [{ text: { content: stockAnalysesDataSourceId } }] }, // NEW
    'Stock History Data Source ID': { rich_text: [{ text: { content: stockHistoryDataSourceId } }] }, // NEW
    'Template Version': { rich_text: [{ text: { content: CURRENT_VERSION } }] },
    'Setup Completed At': { date: { start: new Date().toISOString() } },
  }
});
```

**Helper function:**
```typescript
async function getDataSourceIdFromDb(
  token: string,
  databaseId: string
): Promise<string> {
  const notion = new Client({ auth: token, notionVersion: '2025-09-03' });
  const db = await notion.databases.retrieve({ database_id: databaseId });

  if (!db.data_sources || db.data_sources.length === 0) {
    throw new Error(`Database ${databaseId} has no data sources`);
  }

  return db.data_sources[0].id;
}
```

### 4.3 Template Detection

**File:** `lib/template-detection.ts`

#### Update autoDetectTemplate() - Search Filter
```typescript
// OLD - Search for databases
const dbResults = await notion.search({
  filter: { property: 'object', value: 'database' },
  page_size: 100
});

// NEW - Search for data sources
const dbResults = await notion.search({
  filter: { property: 'object', value: 'data_source' }, // CHANGED
  page_size: 100
});
```

**Important:** Search results structure changes:
- `data_source` results include `data_source_id` field
- Need to extract both database_id AND data_source_id

---

## Phase 5: Testing Protocol

### 5.1 Unit Testing Checklist

**Test each updated method in isolation:**

#### NotionClient Tests
- [ ] `getDataSourceId()` - Returns correct ID, caches properly
- [ ] `upsertAnalyses()` - Creates pages with data_source_id parent
- [ ] `findPageByTicker()` - Queries data sources correctly
- [ ] `createHistory()` - Creates history pages correctly
- [ ] `queryHistoricalAnalyses()` - Queries history correctly

#### Auth Tests
- [ ] `createOrUpdateUser()` - Creates user pages correctly
- [ ] Data source IDs stored in Beta Users database

#### Template Detection Tests
- [ ] `autoDetectTemplate()` - Finds data sources instead of databases
- [ ] Returns both database_id and data_source_id

### 5.2 Integration Testing Checklist

**Test complete flows end-to-end:**

#### OAuth Flow (CRITICAL)
- [ ] New user signup flow
  - Click "Authorize with Notion"
  - Grant permissions
  - Callback processes successfully
  - Session created
  - Redirects to setup (not oauth_failed!)
- [ ] Existing user re-authentication
- [ ] Session validation

#### Setup Flow
- [ ] Auto-detection finds databases/data sources
- [ ] Manual database ID entry works
- [ ] Data source IDs fetched and stored
- [ ] Configuration saved to Beta Users database
- [ ] Redirects to analyze page

#### Analysis Flow
- [ ] Create new analysis
  - Page created in Stock Analyses with data_source_id parent
  - Properties updated correctly
  - Content written
  - Child analysis page created
  - History page created
  - All pages accessible in Notion
- [ ] Query historical analyses works
- [ ] Delta calculations work

#### Orchestrator Flow (if enabled)
- [ ] Collect stock requests from multiple users
- [ ] Query each user's Stock Analyses database
- [ ] Create analysis pages correctly

### 5.3 Rollback Testing

**Ensure we can revert:**
- [ ] Switch back to main branch
- [ ] Verify OAuth still works
- [ ] Verify existing analyses accessible
- [ ] No data corruption or loss

---

## Phase 6: Deployment Strategy

### 6.1 Pre-Deployment Checklist
- [ ] All tests passing
- [ ] TypeScript compiles with no errors
- [ ] OAuth flow tested 5+ times successfully
- [ ] Analysis creation tested 5+ times successfully
- [ ] Documentation updated
- [ ] Rollback plan documented

### 6.2 Deployment Steps

1. **Merge to Main (After Testing)**
   ```bash
   git checkout main
   git merge feature/notion-api-2025-09-03
   git push
   ```

2. **Monitor First Deployment**
   - Watch Vercel deployment logs
   - Test OAuth immediately after deploy
   - Test analysis creation
   - Monitor error logs for 1 hour

3. **Rollback Plan if Issues**
   ```bash
   git revert HEAD
   git push
   ```
   Or use Vercel dashboard to redeploy previous version

### 6.3 Post-Deployment Monitoring

**First 24 Hours:**
- [ ] Monitor all OAuth attempts
- [ ] Monitor all analysis creations
- [ ] Check error logs every 2 hours
- [ ] Verify no increase in error rate

**First Week:**
- [ ] Monitor daily for new error patterns
- [ ] Collect user feedback
- [ ] Document any issues encountered

---

## Risk Assessment

### High Risk Areas
1. **OAuth Flow** ⚠️ - Broke last time, must be extra careful
2. **Page Creation** ⚠️ - Using data_source_id instead of database_id
3. **Database Queries** ⚠️ - New dataSources.query() endpoint

### Medium Risk Areas
4. **Template Detection** - Search filter changes
5. **Setup Flow** - Storing new data source IDs
6. **Orchestrator** - Multi-user database queries

### Low Risk Areas
7. **Read Operations** - Mostly unchanged
8. **Session Management** - Not affected
9. **LLM Integration** - Not affected

---

## Success Criteria

### Must Have (Blocking)
- ✅ OAuth flow works 100% of the time
- ✅ Analysis creation succeeds
- ✅ Existing users can log in
- ✅ Setup flow completes successfully
- ✅ No data loss or corruption

### Should Have (Important)
- ✅ All TypeScript types correct
- ✅ No console errors in browser
- ✅ Performance not degraded
- ✅ Error messages clear and actionable

### Nice to Have (Optional)
- ✅ Improved error handling
- ✅ Better logging for debugging
- ✅ Documentation for future reference

---

## Rollback Triggers

**Immediately rollback if:**
- OAuth fails for ANY user
- Analysis creation fails consistently
- Data corruption detected
- Error rate increases >10%
- Any critical flow completely broken

**Consider rollback if:**
- Performance degraded >30%
- Error rate increases >5%
- User complaints about broken features

---

## Notes & Observations

### Key Insights from Previous Attempt
- Simply changing API version header breaks OAuth
- Need to update actual API calls, not just version
- Testing in production is dangerous
- Need isolated branch and thorough testing

### Architecture Considerations
- Multi-user system complicates testing
- Each user has their own database IDs
- Data source IDs must be stored per user
- Backwards compatibility critical for existing users

### Future Enhancements
- Consider caching data source IDs globally
- Add migration script for existing users
- Implement gradual rollout (feature flag?)
- Add comprehensive error recovery

---

**Last Updated:** 2024-12-14
**Status:** 🚧 Ready to Begin Implementation
**Next Step:** Upgrade SDK and verify type compilation
