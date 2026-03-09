# v1.0 POC Testing Checklist

*Last updated: November 3, 2025 at 9:09 AM*

Complete checklist for testing the single-ticker proof of concept before beta rollout.

---

## Prerequisites Complete

- [ ] All dependencies installed: `npm install`
- [ ] Type checking passes: `npm run type-check`
- [ ] `.env` file configured with all API keys
- [ ] Notion databases created and shared with integration
- [ ] "Send to History" button added to Stock Analyses database

---

## Phase 1: Local Testing (No Deployment)

### Test 1: Environment Validation

```bash
# Verify all environment variables are set
cat .env | grep -E "(FMP_API_KEY|FRED_API_KEY|NOTION_API_KEY|STOCK_ANALYSES_DB_ID|STOCK_HISTORY_DB_ID)"
```

**Expected:** All variables present and not empty

- [ ] FMP_API_KEY set
- [ ] FRED_API_KEY set
- [ ] NOTION_API_KEY set
- [ ] STOCK_ANALYSES_DB_ID set
- [ ] STOCK_HISTORY_DB_ID set

### Test 2: API Client Tests

```bash
# Test FMP client
npm run test:analyze AAPL --no-polling

# Should complete in < 10 seconds
# Should write to Stock Analyses
# Should NOT poll (immediate history creation)
```

**Expected results:**
- [ ] FMP data fetched successfully (11 API calls)
- [ ] FRED data fetched successfully (6 API calls)
- [ ] Scores calculated correctly
- [ ] Page created in Stock Analyses
- [ ] Page created in Stock History
- [ ] No errors in console

**Verify in Notion:**
- [ ] Stock Analyses has new row for AAPL
- [ ] Company Name populated
- [ ] Current Price populated
- [ ] Composite Score between 1.0-5.0
- [ ] Recommendation is one of: Strong Buy, Buy, Moderate Buy, Hold, Moderate Sell, Sell, Strong Sell
- [ ] Stock History has new row "AAPL - [Date Time]"

### Test 3: Polling Workflow (v0.3.0)

```bash
# Test with polling enabled
npm run test:analyze NVDA --timeout=120

# Should start polling
# You have 2 minutes to complete next steps
```

**During polling:**
- [ ] Console shows "Waiting for AI analysis..."
- [ ] Console shows polling status every 10 seconds
- [ ] Open Notion Stock Analyses page for NVDA
- [ ] Run your AI prompt manually
- [ ] Review AI output
- [ ] Click "Send to History" button

**After button click:**
- [ ] Console shows "AI analysis complete! Starting archival..."
- [ ] Archive completes successfully
- [ ] Stock History page created with AI content
- [ ] Stock Analyses status changed to "Logged in History"

### Test 4: Timeout Behavior

```bash
# Test timeout (30 seconds, don't click button)
npm run test:analyze MSFT --timeout=30

# Wait 30 seconds without clicking button
```

**Expected:**
- [ ] Polling times out after 30 seconds
- [ ] Status changes to "Analysis Incomplete"
- [ ] Console shows manual archive instructions
- [ ] No errors thrown

### Test 5: Skip Polling

```bash
# Test skip polling mode
npm run test:analyze GOOGL --skip-polling

# Should write metrics but not poll
```

**Expected:**
- [ ] Metrics written to Stock Analyses
- [ ] Console shows "Polling skipped"
- [ ] Console shows manual archive command
- [ ] Script exits immediately
- [ ] No polling occurs

---

## Phase 2: Vercel Dev Server Testing

### Test 6: Start Dev Server

```bash
# Start Vercel dev environment
npm run dev

# Should start on http://localhost:3000
```

**Expected:**
- [ ] Server starts without errors
- [ ] Console shows "Ready! Available at http://localhost:3000"

### Test 7: Analyze Endpoint (POST)

```bash
# In separate terminal
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"ticker": "TSLA", "skipPolling": true}'
```

**Expected response:**
```json
{
  "success": true,
  "ticker": "TSLA",
  "analysesPageId": "...",
  "scores": {
    "composite": 3.8,
    "recommendation": "Buy",
    ...
  },
  "performance": {
    "duration": 3500,
    "fmpCalls": 11,
    "fredCalls": 6,
    "notionCalls": 2
  }
}
```

**Verify:**
- [ ] Response status 200
- [ ] success: true
- [ ] ticker matches "TSLA"
- [ ] analysesPageId is a valid UUID
- [ ] scores object present with all fields
- [ ] performance metrics reasonable

### Test 8: Webhook Endpoint (POST)

```bash
# Simulate Notion webhook
curl -X POST http://localhost:3000/api/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "type": "page_created",
    "page": {
      "id": "test-page-id",
      "properties": {
        "Ticker": {
          "type": "rich_text",
          "rich_text": [
            {"plain_text": "AMD"}
          ]
        }
      }
    }
  }'
```

**Expected response:**
```json
{
  "success": true,
  "ticker": "AMD",
  "analysisTriggered": true,
  "message": "Analysis triggered for AMD. Check Notion for results."
}
```

**Verify:**
- [ ] Response status 200
- [ ] Ticker extracted correctly
- [ ] Analysis endpoint called
- [ ] Stock Analyses page created for AMD

### Test 9: Error Handling

```bash
# Test invalid ticker
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"ticker": ""}'

# Test missing ticker
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{}'

# Test invalid method
curl -X GET http://localhost:3000/api/analyze
```

**Expected:**
- [ ] Empty ticker returns 400 error
- [ ] Missing ticker returns 400 error
- [ ] GET request returns 405 Method Not Allowed
- [ ] All errors include helpful error messages

---

## Phase 3: Vercel Production Deployment

### Test 10: Deploy to Vercel

```bash
# Deploy to production
vercel --prod

# Follow prompts, set environment variables
```

**Verify:**
- [ ] Deployment succeeds
- [ ] URL provided: https://your-app.vercel.app
- [ ] Environment variables set in Vercel dashboard

### Test 11: Production Analyze Endpoint

```bash
# Replace with your actual Vercel URL
curl -X POST https://your-app.vercel.app/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"ticker": "INTC", "skipPolling": true}'
```

**Expected:**
- [ ] Response within 5-10 seconds
- [ ] success: true
- [ ] Page created in Notion
- [ ] All metrics populated

### Test 12: Production Webhook Endpoint

```bash
# Test webhook URL
curl -X POST https://your-app.vercel.app/api/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "type": "page_created",
    "page": {
      "id": "test-page-id",
      "properties": {
        "Ticker": {
          "type": "rich_text",
          "rich_text": [{"plain_text": "CRM"}]
        }
      }
    }
  }'
```

**Expected:**
- [ ] Webhook processes successfully
- [ ] Analysis triggered
- [ ] Page created in Notion

---

## Phase 4: Notion Automation Testing

### Test 13: Set Up Notion Automation

1. Create "Analysis Triggers" database
2. Add property: Ticker (Text)
3. Share with integration
4. Create automation:
   - Trigger: When page is added
   - Action: Call webhook
   - URL: `https://your-app.vercel.app/api/webhook`

**Verify:**
- [ ] Automation created successfully
- [ ] Webhook URL correct

### Test 14: Trigger via Notion

1. Add new row to "Analysis Triggers"
2. Set Ticker: "ADBE"
3. Wait 5-10 seconds

**Expected:**
- [ ] Webhook receives trigger
- [ ] Analysis endpoint called
- [ ] Page created in Stock Analyses
- [ ] Status: "Pending Analysis"

### Test 15: Complete Full Workflow

1. Add row to "Analysis Triggers": Ticker = "PYPL"
2. Wait for webhook to trigger
3. Open Stock Analyses page for PYPL
4. Run Notion AI prompt
5. Review AI output
6. Click "Send to History" button
7. Wait 10 seconds

**Expected:**
- [ ] Analysis triggered automatically
- [ ] Page created with metrics
- [ ] AI prompt generates content
- [ ] Button click detected by polling
- [ ] Archive created in Stock History
- [ ] Status changed to "Logged in History"

---

## Phase 5: Edge Cases & Error Conditions

### Test 16: Invalid Ticker

```bash
npm run test:analyze INVALID_TICKER_123 --no-polling
```

**Expected:**
- [ ] Error message: "No quote data found for symbol"
- [ ] Graceful failure (no crash)
- [ ] Error logged clearly

### Test 17: API Key Errors

```bash
# Temporarily set invalid API key
export FMP_API_KEY="invalid_key"
npm run test:analyze AAPL --no-polling
```

**Expected:**
- [ ] Error message indicates authentication failure
- [ ] Clear guidance on fixing the issue

### Test 18: Notion Database Missing

```bash
# Temporarily set invalid database ID
export STOCK_ANALYSES_DB_ID="invalid_id"
npm run test:analyze AAPL --no-polling
```

**Expected:**
- [ ] Error message indicates Notion database not found
- [ ] Suggests checking database ID

### Test 19: Network Timeout

Test with slow network or by setting very short timeout.

**Expected:**
- [ ] Graceful timeout handling
- [ ] Clear error message
- [ ] No hanging processes

### Test 20: Concurrent Analyses

```bash
# Run 3 analyses simultaneously
npm run test:analyze AAPL --skip-polling &
npm run test:analyze GOOGL --skip-polling &
npm run test:analyze MSFT --skip-polling &
wait
```

**Expected:**
- [ ] All 3 complete successfully
- [ ] No conflicts or race conditions
- [ ] All pages created correctly

---

## Phase 6: Performance Validation

### Test 21: Response Times

Track response times for 5 consecutive analyses:

```bash
time npm run test:analyze AAPL --no-polling
time npm run test:analyze GOOGL --no-polling
time npm run test:analyze MSFT --no-polling
time npm run test:analyze AMZN --no-polling
time npm run test:analyze NVDA --no-polling
```

**Expected:**
- [ ] Average time: 3-5 seconds
- [ ] Max time: < 10 seconds
- [ ] Consistent performance

### Test 22: API Call Counts

Verify API usage matches expectations:

**Per analysis:**
- [ ] FMP: 11 calls
- [ ] FRED: 6 calls
- [ ] Notion: 2-4 calls (without polling)
- [ ] Total: 19-21 calls

**Verify against rate limits:**
- [ ] FMP: 300 calls/min = ~27 analyses/min (plenty)
- [ ] FRED: 120 calls/day = ~20 analyses/day (monitor this)

---

## Phase 7: Data Quality Validation

### Test 23: Score Accuracy

For each test ticker, verify scores are reasonable:

- [ ] Composite Score between 1.0-5.0
- [ ] All component scores between 1.0-5.0
- [ ] Recommendation matches score (e.g., 4.2 = Buy)
- [ ] Scores align with v0.3.0 Python version (if comparable)

### Test 24: Data Completeness

- [ ] Technical fields populated: price, MA50, MA200, RSI, MACD, volume
- [ ] Fundamental fields populated: market cap, P/E, EPS, revenue, debt/equity, beta
- [ ] Macro fields populated: Fed rate, unemployment, consumer sentiment
- [ ] Data Quality Grade accurate (A/B/C/D)
- [ ] Data Completeness percentage reasonable (70-95%)

### Test 25: Property Mapping

Verify all Notion properties populated correctly:

- [ ] Ticker (title)
- [ ] Company Name
- [ ] Analysis Date (with correct timezone)
- [ ] Current Price
- [ ] All 6 score fields
- [ ] Recommendation (valid option)
- [ ] Confidence (valid option)
- [ ] Data Quality Grade (valid option)
- [ ] Technical indicators (30+ fields)
- [ ] API Calls Used (matches actual)

---

## Sign-Off Checklist

Before declaring POC complete:

### Functionality
- [ ] All 25 tests passed
- [ ] No critical bugs identified
- [ ] Error handling works correctly
- [ ] Performance is acceptable

### Code Quality
- [ ] TypeScript compilation succeeds: `npm run type-check`
- [ ] No linting errors: `npm run lint`
- [ ] Code is well-documented
- [ ] No hardcoded values (all use environment variables)

### Documentation
- [ ] SETUP.md complete and accurate
- [ ] POC_TESTING_CHECKLIST.md complete
- [ ] README_V1.md up to date
- [ ] Inline code comments clear

### Deployment
- [ ] Deployed to Vercel successfully
- [ ] Environment variables configured
- [ ] HTTPS working
- [ ] Webhook endpoint accessible

### Notion Integration
- [ ] All databases created and shared
- [ ] Button property works
- [ ] Automation triggers correctly
- [ ] AI prompt template ready

---

## Next Steps After POC

Once POC is validated:

1. **Phase 4: Monitoring & Feedback**
   - Set up usage tracking database
   - Create beta feedback database
   - Add logging system

2. **Phase 5: Rate Limiting & Polish**
   - Implement 10 analyses/user/day limit
   - Add user quota tracking
   - Improve error messages
   - Add retry logic

3. **Phase 6: Beta Rollout**
   - Create shareable Notion template
   - Write beta user onboarding guide
   - Onboard 3-5 initial beta users
   - Collect feedback
   - Scale to 10-20 users

---

## POC Success Criteria

POC is considered successful if:

- [x] Single ticker analysis works end-to-end
- [ ] Polling workflow functions correctly
- [ ] Data quality matches v0.3.0 expectations
- [ ] Performance < 10 seconds per analysis
- [ ] No critical bugs or errors
- [ ] Ready for beta user testing

---

**Last Updated:** October 29, 2025
**Version:** v1.0.0-beta.1
**Status:** Ready for Testing

---

## Testing Log

Date | Tester | Test # | Result | Notes
-----|--------|--------|--------|-------
     |        |        |        |
     |        |        |        |
     |        |        |        |
---

