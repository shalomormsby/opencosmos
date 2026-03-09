# System Errors Database Schema

## Overview

The System Errors database captures all analysis failures and system errors for admin monitoring. This ensures no failures go unnoticed and provides visibility into system health.

## Purpose

- **Prevent silent failures**: Every analysis error is logged
- **Admin notifications**: Configure Notion to notify you when new errors appear
- **Debugging**: Full error context and stack traces
- **Monitoring**: Track failure rates and patterns over time

## Database Properties

### Required Properties

| Property Name | Type | Description | Options |
|--------------|------|-------------|---------|
| **Name** | Title | Error summary (ticker + error type) | - |
| **Timestamp** | Date | When the error occurred | - |
| **Error Type** | Select | Category of error | Analysis Failed, Sync Failed, API Error, Broadcast Failed, Timeout, Unknown |
| **Ticker** | Text | Stock ticker that failed (or "Multiple" for batch) | - |
| **User Email** | Text | User affected by the error | - |
| **Error Message** | Text | Full error details and stack trace | - |
| **Status** | Select | Triage status | New, Acknowledged, Resolved |

### Optional Properties (for future enhancements)

| Property Name | Type | Description |
|--------------|------|-------------|
| **Phase** | Select | Which phase failed (data_fetch, llm_generation, notion_write, etc.) |
| **Retry Count** | Number | Number of retry attempts made |
| **Resolution Notes** | Text | Admin notes on how the issue was resolved |

## Setup Instructions

### 1. Create Database in Your Notion Workspace

1. In your Notion workspace, create a new database page
2. Name it "System Errors"
3. Add the properties listed above (match names exactly)

### 2. Configure Error Type Select Options

Add these exact option names to the "Error Type" select property:
- Analysis Failed
- Sync Failed
- API Error
- Broadcast Failed
- Timeout
- Unknown

### 3. Configure Status Select Options

Add these exact option names to the "Status" select property:
- New
- Acknowledged
- Resolved

### 4. Get Database ID

1. Open the System Errors database in Notion
2. Copy the database ID from the URL:
   ```
   https://notion.so/{workspace}/{database_id}?v={view_id}
                                  ^^^^^^^^^^^
   ```
3. The database ID is the 32-character string (with dashes)

### 5. Configure Environment Variables

Add these to your `.env` file:

```bash
# System Errors Database (Admin Notifications)
SYSTEM_ERRORS_DB_ID=your-database-id-here
ADMIN_NOTION_TOKEN=your-personal-notion-token
```

**Getting your personal Notion token:**
1. Go to https://www.notion.so/my-integrations
2. Create a new internal integration (or use existing)
3. Copy the "Internal Integration Token"
4. Share the System Errors database with this integration

### 6. Set Up Notion Notifications

Configure Notion to notify you when new errors appear:

**Option A: Email Notifications**
1. In System Errors database, click "..." menu → "Notifications"
2. Enable "Send me email notifications when pages are added"

**Option B: Slack Notifications**
1. Install Notion Slack integration
2. Configure database notifications to post to your Slack channel

**Option C: Database Filters + Views**
1. Create a "New Errors" view with filter: `Status = New`
2. Pin this view to your sidebar
3. Check daily for new entries

## Usage

### Automatic Error Logging

The error handler automatically logs errors in these scenarios:

1. **Analysis failures**: Stock analysis fails during data fetch or processing
2. **Sync failures**: Failed to write data to Notion databases
3. **Broadcast failures**: Failed to broadcast results to subscribers (orchestrator)
4. **API errors**: External API failures (FMP, FRED, Gemini, etc.)
5. **Timeouts**: Analysis exceeds time limits

### Manual Error Logging

You can also manually log errors for debugging:

```typescript
import { setAnalysisError } from '../shared/error-handler';
import { Client } from '@notionhq/client';

const notionClient = new Client({ auth: userToken });

await setAnalysisError(
  notionClient,
  pageId,
  new Error('Custom error message'),
  {
    ticker: 'AAPL',
    userEmail: 'user@example.com',
    timestamp: new Date(),
    errorType: 'api_error',
    phase: 'data_fetch'
  }
);
```

### Batch Notifications

For orchestrator runs with multiple failures, use batch notifications:

```typescript
import { notifyAdminBatch } from '../shared/error-handler';

await notifyAdminBatch(
  [
    { ticker: 'AAPL', error: 'API timeout', userEmail: 'user1@example.com' },
    { ticker: 'MSFT', error: 'Invalid data', userEmail: 'user2@example.com' }
  ],
  { total: 50, analyzed: 48, failed: 2 }
);
```

## Monitoring Best Practices

### Daily Review

1. Check "New Errors" view each morning
2. Investigate patterns (same ticker failing? Same API?)
3. Mark errors as "Acknowledged" once reviewed
4. Add resolution notes if action taken

### Weekly Analysis

1. Review all errors from the past week
2. Calculate failure rate: `failed / total`
3. Identify systemic issues vs one-off errors
4. Update documentation if common failure modes discovered

### Alerting Thresholds

Consider setting up alerts for:
- More than 5 errors per day → Investigate system health
- Same ticker failing repeatedly → Check if ticker is delisted/suspended
- Same user having repeated failures → Database configuration issue
- High API error rate → Check API status pages

## Integration with Existing Error Handling

### Manual Analysis Endpoint

[api/analyze/index.ts](../api/analyze/index.ts) already uses `writeErrorToPage` which now calls the centralized error handler.

### Orchestrator

[lib/orchestration/orchestrator.ts](../lib/orchestration/orchestrator.ts) now uses centralized error handler for:
- Analysis failures
- Broadcast failures
- Sync failures

### Bug Reporter

The existing Bug Reports database ([lib/shared/bug-reporter.ts](../lib/shared/bug-reporter.ts)) captures **system bugs** (code errors, unexpected exceptions).

System Errors database captures **analysis failures** (expected failures like API timeouts, invalid tickers, etc.).

**Use Bug Reports for:** Code bugs, exceptions, unexpected behavior
**Use System Errors for:** Analysis failures, API errors, operational issues

## Security Notes

- Keep `ADMIN_NOTION_TOKEN` secret (admin-level access)
- Don't commit `.env` file to version control
- Rotate token if compromised
- Limit System Errors database access to admins only

## Troubleshooting

### Errors not appearing in database

**Check:**
1. `SYSTEM_ERRORS_DB_ID` is set correctly in `.env`
2. `ADMIN_NOTION_TOKEN` is valid and not expired
3. Database is shared with the integration
4. Property names match exactly (case-sensitive)

**Debug:**
```bash
# Check environment variables are loaded
vercel env pull .env.local
grep SYSTEM_ERRORS .env.local

# Check logs for notification failures
vercel logs --filter "Failed to notify admin"
```

### Too many notifications

**Solutions:**
1. Use batch notifications for orchestrator runs
2. Adjust notification frequency in Notion settings
3. Create filtered views (only show "New" status)
4. Set up digest emails (daily summary) instead of instant

### Missing error context

**Enhancements:**
1. Add "Phase" property to track which stage failed
2. Add "Stack Trace" property for full error details
3. Add "Request ID" property to correlate with logs
4. Add "User Agent" property for client-side errors

## Future Enhancements

### v2.0 Features

- [ ] Error rate dashboard (visualize trends)
- [ ] Automatic retry on transient failures
- [ ] Smart alerting (only notify for new error patterns)
- [ ] Integration with error tracking services (Sentry, DataDog)
- [ ] User-facing error explanations (helpful error messages)
- [ ] Self-healing (auto-resolve known transient errors)

### v3.0 Features

- [ ] Predictive error detection (warn before failure)
- [ ] Error correlation (group related errors)
- [ ] Impact analysis (how many users affected)
- [ ] SLA tracking (uptime, response time metrics)
