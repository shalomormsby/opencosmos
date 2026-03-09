# Notion Polling System

*Last updated: November 3, 2025 at 9:09 AM*

User-triggered analysis workflow for Sage Stocks v1.0.

## Overview

The polling system enables users to trigger stock analyses directly from Notion by checking a "Request Analysis" checkbox. The system continuously monitors the Stock Analyses database for pending requests and automatically processes them.

## How It Works

### User Workflow

1. Open Stock Analyses database in Notion
2. Find or create a page with the ticker you want to analyze
3. Check the **"Request Analysis"** checkbox
4. System detects the request within ~30 seconds
5. Page status changes to **"Processing"**
6. Analysis completes and results are written back to the page
7. Page status changes to **"Pending Analysis"** or **"Send to History"**

### System Workflow

```
User checks "Request Analysis" checkbox
  ↓
Poller queries database every 30 seconds
  ↓
Detects pending request (Request Analysis = true, Status ≠ Processing)
  ↓
Marks page as "Processing" to prevent duplicates
  ↓
Calls POST /api/analyze with ticker
  ↓
API fetches data (FMP + FRED) and calculates scores
  ↓
Results written back to Notion automatically
  ↓
Poller continues monitoring for new requests
```

## Setup

### 1. Environment Variables

Add to your `.env` file:

```bash
# Required
NOTION_API_KEY=your_notion_token
STOCK_ANALYSES_DB_ID=your_analyses_db_id

# Optional
API_BASE_URL=http://localhost:3000  # Default: http://localhost:3000
API_KEY=your_api_key                # If authentication is enabled
POLL_INTERVAL=30                    # Seconds between polls (default: 30)
```

### 2. Database Schema Requirements

Your Stock Analyses database must have these properties:

| Property Name | Type | Required | Description |
|---------------|------|----------|-------------|
| **Ticker** | title | Yes | Stock ticker symbol (e.g., "AAPL") |
| **Request Analysis** | checkbox | Yes | User checks this to trigger analysis |
| **Content Status** | select | Yes | Status tracking (New, Processing, etc.) |
| **Analysis Date** | date | No | Timestamp of last analysis |
| **Composite Score** | number | No | Overall score (written by API) |

**Content Status Options:**
- `New` - Fresh data just added
- `Updated` - Existing page updated
- `Processing` - Analysis in progress (prevents duplicates)
- `Pending Analysis` - Ready for user review
- `Send to History` - Ready to archive
- `Logged in History` - Archived
- `Analysis Incomplete` - Error occurred

### 3. Start the Polling System

```bash
# Terminal 1: Start API server
npm run dev

# Terminal 2: Start polling
npm run poll
```

## Usage Examples

### Basic Usage

```bash
# Start polling with default settings (30 second interval)
npm run poll
```

### Custom Polling Interval

```bash
# Poll every 10 seconds
POLL_INTERVAL=10 npm run poll

# Poll every 60 seconds
POLL_INTERVAL=60 npm run poll
```

### With Authentication

If your API requires authentication, set the API_KEY:

```bash
API_KEY=your-secret-key npm run poll
```

### Production Usage

Point to your production API:

```bash
API_BASE_URL=https://your-app.vercel.app npm run poll
```

## Architecture

### Components

**1. NotionPoller Class** ([lib/notion-poller.ts](lib/notion-poller.ts))
- Queries Stock Analyses database
- Extracts page properties
- Marks pages as Processing/Failed
- Rate limiting (3 requests/second)
- Retry logic with exponential backoff

**2. Polling Script** ([scripts/poll-notion.ts](scripts/poll-notion.ts))
- Main polling loop
- Calls /api/analyze for each pending request
- Error handling and logging
- Graceful shutdown

### Rate Limiting

The system respects Notion's rate limit of **3 requests per second**:
- Built-in rate limiter in NotionPoller class
- Automatic throttling before each API call
- Small delays between processing multiple analyses

### Error Handling

**Notion API Errors:**
- Automatic retry with exponential backoff (1s, 2s, 4s)
- Max 3 retry attempts before giving up
- Clear error messages logged to console

**Analysis API Errors:**
- Page marked as "Analysis Incomplete"
- Error message captured
- Polling continues for other requests

**Network Errors:**
- Transient errors are retried
- Polling loop continues even if iteration fails
- Fatal errors exit with error code 1

## Monitoring

### Console Output

```
=============================================================
Sage Stocks Notion Poller v1.0
=============================================================
API Base URL: http://localhost:3000
API Key: [SET]
Poll Interval: 30 seconds
Stock Analyses DB: e9ff1c06-218c-481f-b626-1965403b6c18
=============================================================

🔄 Starting polling loop...

[2025-10-29T12:34:56.789Z] Polling iteration #1...
   Found 2 pending analysis request(s):
   - AAPL (Page: 293a1d1b..., Last edited: 2025-10-29T12:30:00.000Z)
   - TSLA (Page: 393a1d1b..., Last edited: 2025-10-29T12:31:00.000Z)

============================================================
Processing analysis request for AAPL
Page ID: 293a1d1b-67e0-814e-9f60-f980653845e8
============================================================

✅ Marked page 293a1d1b-67e0-814e-9f60-f980653845e8 as Processing
🚀 Calling analyze API for AAPL...
✅ Analysis completed for AAPL
   Composite Score: 3.85
   Recommendation: BUY
   Analyses Page: 293a1d1b-67e0-814e-9f60-f980653845e8
   Results written to Notion

============================================================

⏳ Waiting 30 seconds until next poll...
```

### Log Files

You can redirect output to a log file:

```bash
npm run poll > polling.log 2>&1 &
```

## Production Deployment

### Option 1: Long-Running Process

Deploy the polling script as a long-running process:

```bash
# Using PM2
pm2 start "npm run poll" --name stock-poller

# Using systemd (Linux)
# Create /etc/systemd/system/stock-poller.service
# See systemd documentation for details
```

### Option 2: Vercel Cron Job

Create `api/cron.ts` for scheduled polling:

```typescript
import { VercelRequest, VercelResponse } from '@vercel/node';
import { createNotionPoller } from '../lib/notion-poller';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Check for Vercel cron secret
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const poller = createNotionPoller({
    apiKey: process.env.NOTION_API_KEY!,
    stockAnalysesDbId: process.env.STOCK_ANALYSES_DB_ID!,
  });

  const pending = await poller.queryPendingAnalyses();

  // Process pending analyses...

  res.json({ success: true, processed: pending.length });
}
```

Add to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron",
      "schedule": "*/1 * * * *"
    }
  ]
}
```

### Option 3: GitHub Actions

Run polling via scheduled GitHub Actions:

```yaml
# .github/workflows/poll.yml
name: Poll Notion

on:
  schedule:
    - cron: '*/5 * * * *'  # Every 5 minutes

jobs:
  poll:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm run poll
        env:
          NOTION_API_KEY: ${{ secrets.NOTION_API_KEY }}
          STOCK_ANALYSES_DB_ID: ${{ secrets.STOCK_ANALYSES_DB_ID }}
```

## Troubleshooting

### No Pending Analyses Detected

**Problem:** Poller runs but never finds pending requests

**Solutions:**
1. Verify `STOCK_ANALYSES_DB_ID` is correct
2. Check that "Request Analysis" checkbox exists in database
3. Ensure "Content Status" select property exists
4. Verify Notion integration has access to the database

### Page Stuck in "Processing"

**Problem:** Page status shows "Processing" but analysis never completes

**Solutions:**
1. Check API server is running (`npm run dev`)
2. Verify `API_BASE_URL` points to correct server
3. Check API logs for errors
4. Manually uncheck "Request Analysis" and change status to "New"

### Rate Limit Errors

**Problem:** Getting 429 errors from Notion API

**Solutions:**
1. Increase `POLL_INTERVAL` to reduce query frequency
2. Check for other integrations hitting the same database
3. Verify rate limiter is working (should throttle to 3 req/s)

### Authentication Errors

**Problem:** Getting 401 Unauthorized from /api/analyze

**Solutions:**
1. Verify `API_KEY` environment variable is set correctly
2. Check API server has same API_KEY configured
3. Try without API_KEY if authentication is optional

## Best Practices

### Development

- **Use 30-second intervals** during development
- **Run polling in separate terminal** from API server
- **Check both logs** (poller + API) when debugging
- **Test with invalid tickers** to verify error handling

### Production

- **Use authentication** (set API_KEY)
- **Monitor polling logs** for errors
- **Set up alerts** for repeated failures
- **Use managed process** (PM2, systemd, or Vercel Cron)
- **Consider 60-second intervals** to reduce API load

### Database Management

- **Clear stuck pages** regularly (Processing status with no recent activity)
- **Archive old analyses** to Stock History
- **Use "Analysis Incomplete"** status for failed analyses
- **Document any custom Content Status values**

## Testing

### Manual Test

1. Start API server:
   ```bash
   npm run dev
   ```

2. Start polling in another terminal:
   ```bash
   npm run poll
   ```

3. In Notion:
   - Create/open a page with ticker "AAPL"
   - Check "Request Analysis" checkbox
   - Watch polling terminal for detection
   - Verify analysis completes in Notion

### Automated Test

```bash
# Test poller queries database without triggering analysis
ts-node scripts/test-poller.ts
```

## Related Documentation

- [API Documentation](API.md) - API endpoint details
- [Deployment Guide](DEPLOYMENT.md) - Production deployment
- [Setup Guide](SETUP.md) - Initial configuration

## Support

For issues or questions:
- Check polling logs for error messages
- Verify environment variables are set correctly
- Ensure Notion database schema matches requirements
- Test API endpoints directly with curl to isolate issues
---

