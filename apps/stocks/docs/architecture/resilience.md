# System Resilience & Error Handling (v1.2.1)

**Implemented:** November 13, 2025
**Purpose:** Prevent silent failures and provide automatic diagnostics for database configuration issues

## Overview

After discovering that the Stock Analysis DB IDs changed unexpectedly (causing scheduled analyses to fail silently), we implemented comprehensive error handling and automatic bug reporting to catch and report configuration issues immediately.

## What Was The Problem?

**Symptom:** Morning scheduled stock analysis run failed silently

**Root Cause:** Database IDs stored in Beta Users database became invalid:
- Stored IDs pointed to databases that no longer existed or were inaccessible
- System had 3 duplicate "Stock Analyses" databases (Oct 21, Nov 5 6:17am, Nov 5 4:39pm)
- No validation before analysis runs - failures were silent
- No automatic notifications when errors occurred

**Debug Output (from `/api/debug/list-templates`):**
```json
{
  "storedConfiguration": {
    "stockAnalysesDbId": "2a9a1d1b-67e0-8153-917b-c7dda921316c", // ❌ NOT FOUND
    "stockHistoryDbId": "2a9a1d1b-67e0-81a0-abe7-e9b12b43ae87",   // ❌ NOT FOUND
    "sageStocksPageId": "2a9a1d1b-67e0-818b-8e9f-e451466994fc"    // ❌ NOT FOUND
  },
  "foundInWorkspace": {
    "stockAnalysesDatabases": [
      {"id": "e9ff1c06-218c-481f-b626-1965403b6c18", "isStored": false}, // Oct 21
      {"id": "2a2a1d1b-67e0-815d-904c-e54170c5cbd0", "isStored": false}, // Nov 5 16:39
      {"id": "2a2a1d1b-67e0-81dc-b1d1-e108198764e6", "isStored": false}  // Nov 5 06:17
    ]
  }
}
```

All 3 stored IDs were **NOT FOUND** in the workspace!

---

## Solution: 4-Layer Resilience System

### 1. **Automatic Bug Reporter** (`lib/bug-reporter.ts`)

Automatically creates detailed bug reports in your Notion Bug Reports database when errors occur.

**Features:**
- ✅ Writes to: `https://www.notion.so/ormsby/68f392263ca94f79bd9d5882c4c657f2`
- ✅ Captures error message, stack trace, and diagnostic context
- ✅ Includes user email, ticker, database IDs, and environment info
- ✅ Severity levels: Critical, High, Medium, Low
- ✅ Categories: Database Access, API Error, Authentication, Configuration, etc.
- ✅ Non-blocking - never breaks the app if bug reporting fails

**Usage:**
```typescript
import { reportAPIError, reportScheduledTaskError, reportDatabaseConfigError } from '../lib/bug-reporter';

// Report API errors
await reportAPIError(error, '/api/analyze', user.email);

// Report scheduled task failures
await reportScheduledTaskError(error, 'orchestrator-analyze', { ticker: 'AAPL' });

// Report database config errors
await reportDatabaseConfigError(
  'Database validation failed',
  {
    userEmail: user.email,
    userId: user.id,
    configuredDbIds: { stockAnalysesDbId, stockHistoryDbId, sageStocksPageId },
    foundDbIds: { stockAnalysesDbs: [...], stockHistoryDbs: [...] },
    source: 'database-validator'
  }
);
```

---

### 2. **Database Validation** (`lib/database-validator.ts`)

Validates database configuration **before** running analyses to catch issues early.

**Features:**
- ✅ Validates all 3 database IDs are accessible
- ✅ Checks for duplicates in workspace
- ✅ Provides detailed error messages with help URLs
- ✅ Automatically reports critical errors to Bug Reports database
- ✅ Fail-fast approach prevents wasted API calls

**Validation Checks:**
1. **Stock Analyses DB** - Can read database with configured ID?
2. **Stock History DB** - Can read database with configured ID?
3. **Sage Stocks Page** - Can read page with configured ID?
4. **Duplicates** - Are there multiple databases with same name? (warning)

**Error Codes:**
- `NOT_FOUND` - Database/page doesn't exist or ID is wrong
- `NO_ACCESS` - Integration doesn't have access
- `INVALID_TYPE` - ID points to wrong type of resource
- `MISSING` - ID not configured

**Integration:**
```typescript
// In analyze.ts (lines 251-274)
await assertDatabasesValid(userAccessToken, {
  stockAnalysesDbId,
  stockHistoryDbId,
  sageStocksPageId,
  userEmail: session.email,
  userId: user.id,
});
```

If validation fails:
1. Error is thrown with clear message
2. Bug report is automatically created in Notion
3. User receives error response with help URL
4. No API calls are wasted on bad configuration

---

### 3. **Diagnostic Endpoints**

New debug endpoints for diagnosing configuration issues:

#### `/api/debug/user-config`
Shows your current stored configuration:
```json
{
  "success": true,
  "configuration": {
    "stockAnalysesDbId": "...",
    "stockHistoryDbId": "...",
    "sageStocksPageId": "...",
    "templateVersion": "1.0.0"
  },
  "setupStatus": {
    "isComplete": true
  }
}
```

#### `/api/debug/list-templates`
Shows ALL Sage Stocks databases in your workspace + which is configured:
```json
{
  "success": true,
  "storedConfiguration": { ... },
  "foundInWorkspace": {
    "stockAnalysesDatabases": [
      {
        "id": "e9ff1c06-218c-481f-b626-1965403b6c18",
        "title": "Stock Analyses",
        "isStored": false,  // ⚠️ Not the one you're using!
        "url": "https://www.notion.so/...",
        "createdTime": "2025-10-21T02:27:00.000Z"
      }
    ]
  },
  "summary": {
    "hasDuplicates": true,
    "totalStockAnalysesDbs": 3
  }
}
```

#### `/api/debug/validate`
Validates your configuration and reports detailed diagnostics:
```json
{
  "valid": false,
  "errors": [
    {
      "field": "stockAnalysesDbId",
      "code": "NOT_FOUND",
      "message": "Stock Analyses database not accessible: object_not_found",
      "helpUrl": "https://sagestocks.vercel.app/setup"
    }
  ],
  "message": "A bug report has been automatically created."
}
```

---

### 4. **Enhanced Error Handling**

#### In `api/analyze.ts`:
- ✅ Validates databases **before** starting analysis (line 251-274)
- ✅ Reports all critical errors to Bug Reports database (line 833-844)
- ✅ Skips rate limit errors (user error, not system error)
- ✅ Includes full context: ticker, user email, duration

#### In `lib/orchestrator.ts`:
- ✅ Reports analysis failures to Bug Reports database (line 345-356)
- ✅ Includes context: ticker, subscriber count, priority tier
- ✅ Non-blocking - doesn't prevent other analyses from running

---

## How It Prevents Future Issues

### Before (v1.2.0 and earlier):
```
1. User's DB ID changes or becomes invalid
2. Scheduled analysis runs
3. Analysis fails with cryptic Notion API error
4. Error logged to console (invisible to user)
5. User discovers problem hours/days later
```

### After (v1.2.1):
```
1. User's DB ID changes or becomes invalid
2. Scheduled analysis runs
3. Database validation runs FIRST
4. Validation fails immediately
5. ✅ Bug report created in Notion Bug Reports database
6. ✅ Detailed diagnostics: which DBs failed, what IDs exist
7. ✅ Error includes help URL to re-run setup
8. Admin sees bug report immediately and can fix
```

---

## Debugging Workflow

When you see a bug report in Notion:

1. **Check Bug Report**
   - Read error message and stack trace
   - Review diagnostic info (includes DB IDs, user email)

2. **Use Debug Endpoints**
   ```bash
   # See user's current config
   curl https://sagestocks.vercel.app/api/debug/user-config

   # See all Sage Stocks databases
   curl https://sagestocks.vercel.app/api/debug/list-templates

   # Validate configuration
   curl https://sagestocks.vercel.app/api/debug/validate
   ```

3. **Fix Configuration**
   - Option 1: Re-run setup at `/setup`
   - Option 2: Manually update Beta Users database with correct IDs
   - Option 3: Delete duplicate databases

4. **Verify Fix**
   ```bash
   # Should return valid: true
   curl https://sagestocks.vercel.app/api/debug/validate
   ```

---

## Files Changed

### New Files:
- `lib/bug-reporter.ts` (365 lines) - Automatic bug reporting to Notion
- `lib/database-validator.ts` (265 lines) - Database validation system
- `api/debug/validate.ts` (76 lines) - Validation endpoint
- `RESILIENCE.md` (this file) - Documentation

### Modified Files:
- `api/analyze.ts` - Added database validation + bug reporting
- `lib/orchestrator.ts` - Added bug reporting for scheduled tasks

---

## Configuration

The bug reporter uses these environment variables (already configured):

```bash
# Bug Reports Database ID (from URL)
# https://www.notion.so/ormsby/68f392263ca94f79bd9d5882c4c657f2
BUG_REPORTS_DB_ID=68f392263ca94f79bd9d5882c4c657f2

# Admin Notion API Key (for writing bugs)
NOTION_API_KEY=your_admin_key_here
```

No additional setup required - bug reporting is **automatic**.

---

## Testing

To test bug reporting, you can trigger a validation error:

1. Temporarily change your Stock Analyses DB ID in Beta Users to an invalid value
2. Try to run an analysis at `/analyze`
3. Check Bug Reports database for new entry
4. Restore correct DB ID

Or use the validation endpoint:
```bash
curl https://sagestocks.vercel.app/api/debug/validate
```

---

## Next Steps

**Immediate:**
1. ✅ Run `/api/debug/validate` to check current config
2. ✅ Re-run setup at `/setup` to fix DB IDs
3. ✅ Delete duplicate Sage Stocks databases in Notion

**Future Enhancements:**
- Add Slack/Email notifications for critical bugs
- Add health check monitoring (e.g., BetterStack)
- Add database ID history tracking
- Add automatic recovery (try alternate DB IDs)
- Add template migration tools

---

## Key Metrics

**Code Added:**
- 3 new files (706 lines)
- 2 modified files (~50 lines added)

**Compilation:**
- ✅ TypeScript compilation passes
- ✅ No breaking changes

**Impact:**
- 🚀 Database failures now caught **before** analysis starts
- 🚀 All critical errors automatically reported to Notion
- 🚀 Debug endpoints provide instant diagnostics
- 🚀 No more silent failures
