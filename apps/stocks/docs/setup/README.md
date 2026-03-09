# Sage Stocks v1.0 - Setup Guide

*Last updated: November 3, 2025 at 9:09 AM*

Complete setup guide for beta testers and contributors.

---

## Prerequisites

- Node.js 18+ installed
- npm or yarn
- Vercel account (free tier)
- API keys (FMP, FRED, Notion)
- Notion workspace (free or paid)

---

## Step 1: Get API Keys

### 1.1 Financial Modeling Prep (FMP)

**Cost:** $22/month (Starter plan)

1. Go to https://site.financialmodelingprep.com/
2. Sign up for Starter plan
3. Navigate to Dashboard → API Keys
4. Copy your API key

**Features included:**
- 300 API calls/minute
- 5 years historical data
- Technical indicators (RSI, SMA, EMA, MACD)
- Fundamentals (income statements, balance sheets, ratios)

### 1.2 FRED (Federal Reserve Economic Data)

**Cost:** Free

1. Go to https://fred.stlouisfed.org/docs/api/api_key.html
2. Request API key (instant approval)
3. Copy your API key

**Features included:**
- 120 calls/day (sufficient for 20 analyses)
- Fed Funds Rate, Unemployment, Treasury yields
- VIX, Consumer Sentiment, GDP

### 1.3 Notion Integration

**Cost:** Free

1. Go to https://www.notion.so/my-integrations
2. Click "+ New integration"
3. Name: "Sage Stocks v1.0"
4. Associated workspace: Select your workspace
5. Copy the "Internal Integration Token"

**Important:** You'll share databases with this integration in Step 2.

### 1.4 Notion User ID (Optional - for notifications)

1. Open Notion in browser
2. Go to Settings & Members
3. Look at the URL: `https://www.notion.so/[workspace]/settings/account`
4. Your user ID is in the page data (inspect element or use API)
5. Alternative: Leave blank, notifications won't be assigned to you

---

## Step 2: Set Up Notion Databases

You need 4 databases (2 required, 2 optional):

### Required Databases

#### 2.1 Stock Analyses Database

1. Create new database in Notion: "Stock Analyses"
2. Add properties (see full schema in `config/notion-schema.ts`):
   - **Ticker** (Title)
   - **Company Name** (Text)
   - **Analysis Date** (Date)
   - **Current Price** (Number)
   - **Composite Score** (Number)
   - **Technical Score** (Number)
   - **Fundamental Score** (Number)
   - **Macro Score** (Number)
   - **Risk Score** (Number)
   - **Sentiment Score** (Number)
   - **Recommendation** (Select) - Options: Strong Buy, Buy, Moderate Buy, Hold, Moderate Sell, Sell, Strong Sell
   - **Content Status** (Select) - Options: Pending Analysis, Send to History, Logged in History, Analysis Incomplete, New, Updated
   - **Send to History** (Button) - Action: Edit property → Content Status → "Send to History"
   - (+ 30 more properties - see schema file for complete list)

3. Share with your integration:
   - Click "..." → Add connections → Select "Sage Stocks v1.0"

4. Copy database ID:
   - Open database as full page
   - Copy ID from URL: `https://www.notion.so/{workspace}/{DATABASE_ID}?v=...`

#### 2.2 Stock History Database

1. Create new database in Notion: "Stock History"
2. Add properties (same as Stock Analyses, with minor differences):
   - **Name** (Title) - instead of Ticker
   - **Ticker** (Text) - instead of Title
   - **Content Status** (Select) - Options: Historical, New
   - (All other properties same as Stock Analyses)

3. Share with your integration
4. Copy database ID

### Optional Databases (v0.2.6+ features)

#### 2.3 Stock Comparisons Database (Optional)

For multi-stock comparisons:
- **Name** (Title)
- **Comparison Date** (Date)
- **Tickers** (Text)
- **Winner** (Text)
- **Rationale** (Text)
- etc.

#### 2.4 Market Context Database (Optional)

For daily market analysis:
- **Date** (Title)
- **Market Regime** (Select)
- **SPY Change (1D)** (Number)
- **VIX Level** (Number)
- etc.

---

## Step 3: Clone and Install

```bash
# Clone repository
git clone https://github.com/yourusername/stock-intelligence
cd stock-intelligence

# Install dependencies
npm install

# Verify installation
npm run type-check
```

---

## Step 4: Configure Environment Variables

### 4.1 Create .env file

```bash
# Copy example file
cp .env.v1.example .env
```

### 4.2 Edit .env file

```env
# API Keys
FMP_API_KEY=your_fmp_api_key_here
FRED_API_KEY=your_fred_api_key_here
NOTION_API_KEY=your_notion_integration_token_here

# Notion Database IDs
STOCK_ANALYSES_DB_ID=your_analyses_database_id_here
STOCK_HISTORY_DB_ID=your_history_database_id_here

# Optional: Webhook secret for production
NOTION_WEBHOOK_SECRET=generate_random_secret_here

# Optional: Additional databases
STOCK_COMPARISONS_DB_ID=
MARKET_CONTEXT_DB_ID=
```

### 4.3 Generate webhook secret (for production)

```bash
# Generate random secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Step 5: Test Locally

### 5.1 Test analysis endpoint

```bash
# Test with NVDA (polling workflow)
npm run test:analyze NVDA

# Test with AAPL (no polling)
npm run test:analyze AAPL --no-polling

# Test with custom timeout
npm run test:analyze MSFT --timeout=300
```

**What happens:**
1. Fetches data from FMP and FRED
2. Calculates scores
3. Writes to Notion Stock Analyses
4. Polls for "Send to History" button (if enabled)
5. Archives to Stock History when ready

### 5.2 Start local dev server

```bash
# Start Vercel dev server
npm run dev

# Server runs on http://localhost:3000
```

### 5.3 Test endpoints manually

```bash
# Test analysis endpoint
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"ticker": "NVDA"}'

# Response:
{
  "success": true,
  "ticker": "NVDA",
  "analysesPageId": "...",
  "scores": {
    "composite": 4.2,
    "recommendation": "Buy"
  },
  "performance": {
    "duration": 3500,
    "fmpCalls": 11,
    "fredCalls": 6
  }
}
```

---

## Step 6: Deploy to Vercel

### 6.1 Install Vercel CLI

```bash
npm install -g vercel
```

### 6.2 Login to Vercel

```bash
vercel login
```

### 6.3 Deploy

```bash
# Deploy to production
vercel --prod

# Follow prompts:
# - Link to existing project? No
# - Project name: stock-intelligence
# - Directory: ./
# - Override settings? No
```

### 6.4 Set environment variables in Vercel

```bash
# Set each variable
vercel env add FMP_API_KEY
vercel env add FRED_API_KEY
vercel env add NOTION_API_KEY
vercel env add STOCK_ANALYSES_DB_ID
vercel env add STOCK_HISTORY_DB_ID
vercel env add NOTION_WEBHOOK_SECRET

# Or use Vercel dashboard:
# https://vercel.com/your-project/settings/environment-variables
```

### 6.5 Redeploy

```bash
vercel --prod
```

---

## Step 7: Set Up Notion Automation

### 7.1 Create Triggers Database (Optional)

1. Create database: "Analysis Triggers"
2. Add property: **Ticker** (Text)
3. Share with your integration

### 7.2 Create Automation

1. In "Analysis Triggers" database
2. Click "..." → Automate
3. Trigger: When page is added
4. Action: Call webhook
5. Webhook URL: `https://your-app.vercel.app/api/webhook`
6. Method: POST
7. Headers: `Content-Type: application/json`
8. Body: Include page data
9. Save automation

### 7.3 Test Automation

1. Add new row to "Analysis Triggers"
2. Set Ticker: "AAPL"
3. Wait 5-10 seconds
4. Check "Stock Analyses" database for results

---

## Step 8: Set Up AI Analysis Prompt (Notion AI)

### 8.1 Create AI Prompt Template

In your Notion workspace, create a template with:

```
Analyze this stock based on the metrics provided:

Ticker: [Ticker property]
Company: [Company Name property]
Price: $[Current Price property]

Scores:
- Composite: [Composite Score property] ([Recommendation property])
- Technical: [Technical Score property]
- Fundamental: [Fundamental Score property]
- Macro: [Macro Score property]
- Risk: [Risk Score property]

Technical Indicators:
- RSI: [RSI property]
- MACD: [MACD property]
- 50-day MA: $[50 Day MA property]
- 200-day MA: $[200 Day MA property]

Fundamentals:
- P/E Ratio: [P/E Ratio property]
- EPS: $[EPS property]
- Debt/Equity: [Debt to Equity property]
- Beta: [Beta property]

Please provide:
1. Executive summary (2-3 sentences)
2. Key strengths and weaknesses
3. Technical analysis interpretation
4. Fundamental analysis interpretation
5. Risk assessment
6. Trading strategy recommendation
7. Price targets (short-term, medium-term)
```

### 8.2 Use the Prompt

1. Open any Stock Analyses page with "Pending Analysis" status
2. Click in page body
3. Type `/ai` → Ask AI
4. Paste your prompt (with property references)
5. Wait for AI to generate analysis
6. Review and edit as needed
7. Click "Send to History" button

---

## Step 9: Verify Everything Works

### Checklist:

- [ ] Local test passes: `npm run test:analyze AAPL`
- [ ] Analysis endpoint responds: `curl http://localhost:3000/api/analyze`
- [ ] Vercel deployment successful
- [ ] Environment variables set in Vercel
- [ ] Notion integration has access to databases
- [ ] Analysis creates page in Stock Analyses
- [ ] Polling detects "Send to History" button click
- [ ] Archive copies to Stock History successfully
- [ ] Notion automation triggers webhook (if configured)

---

## Troubleshooting

### Issue: "FMP_API_KEY not set"
**Solution:** Check `.env` file exists and contains valid key

### Issue: "Notion API error 401"
**Solution:** Verify integration token is correct and databases are shared

### Issue: "No data found for ticker"
**Solution:** Check ticker symbol is valid on FMP

### Issue: Polling times out
**Solution:** Increase timeout: `npm run test:analyze TICKER --timeout=900`

### Issue: Archive fails
**Solution:** Verify Stock History database has matching properties

### Issue: Webhook not triggering
**Solution:**
1. Check webhook URL is correct
2. Verify automation is enabled
3. Check Vercel logs: `vercel logs`

---

## Rate Limits

**FMP Starter Plan:**
- 300 calls/minute
- Sufficient for 10-20 users at 10 analyses/day each

**FRED:**
- 120 calls/day
- Each analysis uses 6 calls
- Maximum ~20 analyses per day (system-wide limit)

**Notion:**
- 3 requests/second (handled by SDK)
- Polling makes ~60 calls per 10-minute analysis

**Recommendations:**
- Monitor FRED usage closely (main bottleneck)
- Use `skipPolling=true` for batch processing
- Consider upgrading FMP if > 20 users

---

## Next Steps

1. ✅ Complete this setup
2. ✅ Test with 1-2 tickers
3. ✅ Verify AI prompt works
4. ✅ Test full workflow end-to-end
5. 📋 Review rate limiting strategy
6. 📋 Set up monitoring (upcoming)
7. 📋 Create beta feedback database
8. 📋 Onboard 3-5 beta users

---

## Support

**For setup issues:**
- Check troubleshooting section above
- Review Vercel logs: `vercel logs`
- Check Notion integration permissions

**For bugs:**
- Create issue in Beta Feedback database (when available)
- Include: Ticker, error message, expected vs actual behavior

