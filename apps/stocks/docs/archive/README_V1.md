# Stock Intelligence v1.0 (Beta)

**Status:** 🚧 In Development
**Architecture:** TypeScript + Vercel Serverless + Notion-Native
**Target:** 10-20 beta users

---

## What's New in v1.0?

### Complete Architecture Shift

**v0.x (Python/Colab):**
- User runs Python script in Colab
- Manual execution per ticker
- Requires Python knowledge
- Rate limits: 4 analyses/day (Polygon + AlphaVantage)

**v1.0 (TypeScript/Vercel):**
- User enters ticker in Notion database
- Automatic processing via webhook
- No coding required
- Rate limits: 10 analyses/day per user
- Multi-user support (10-20 users in beta)

### API Consolidation

**Before (3 APIs, $29/mo):**
- Polygon.io: $29/mo (technical data)
- Alpha Vantage: Free (fundamental data)
- FRED: Free (macroeconomic data)

**After (2 APIs, $22/mo):**
- Financial Modeling Prep: $22/mo (technical + fundamental)
- FRED: Free (macroeconomic data)

**Savings:** $7/mo + simpler integration

---

## Tech Stack

- **Runtime:** Node.js 18+ on Vercel Serverless
- **Language:** TypeScript (full type safety)
- **APIs:**
  - Financial Modeling Prep (stock data)
  - FRED (macroeconomic data)
  - Notion (database + webhook)
- **Deployment:** Vercel (free tier for beta)

---

## Project Structure

```
api/                    # Serverless functions
├── analyze.ts          # Main analysis endpoint
├── webhook.ts          # Notion webhook handler
└── archive.ts          # History archiving

lib/                    # Shared libraries
├── fmp-client.ts       # FMP API wrapper
├── fred-client.ts      # FRED API wrapper
├── notion-client.ts    # Notion API wrapper
├── scoring.ts          # Scoring engine
└── rate-limiter.ts     # Rate limiting

config/                 # Configuration
├── scoring-config.ts   # Scoring thresholds
└── schema.ts           # Notion database schemas

tests/                  # Unit & integration tests
```

---

## Development Setup

### Prerequisites
- Node.js 18+
- npm or yarn
- Vercel account (free)
- FMP API key ($22/mo)
- FRED API key (free)
- Notion integration

### Installation

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.v1.example .env

# Add your API keys to .env
# FMP_API_KEY=...
# FRED_API_KEY=...
# NOTION_API_KEY=...

# Start local development server
npm run dev
```

### Testing

```bash
# Run tests
npm test

# Type checking
npm run type-check

# Linting
npm run lint
```

---

## API Clients

### FMP Client

Handles technical and fundamental stock data:

```typescript
import { createFMPClient } from './lib/fmp-client';

const fmp = createFMPClient(process.env.FMP_API_KEY);

// Get all analysis data in one batch
const data = await fmp.getAnalysisData('NVDA');

// Individual methods
const quote = await fmp.getQuote('NVDA');
const profile = await fmp.getCompanyProfile('NVDA');
const rsi = await fmp.getRSI('NVDA', 14);
const incomeStatements = await fmp.getIncomeStatement('NVDA');
```

### FRED Client

Handles macroeconomic data:

```typescript
import { createFREDClient } from './lib/fred-client';

const fred = createFREDClient(process.env.FRED_API_KEY);

// Get all macro data in one batch
const macroData = await fred.getMacroData();

// Individual methods
const fedFundsRate = await fred.getFedFundsRate();
const unemployment = await fred.getUnemploymentRate();
const yieldCurve = await fred.getYieldCurveSpread();
```

### Scoring Engine

Multi-factor scoring system (1.0-5.0 scale):

```typescript
import { createStockScorer } from './lib/scoring';

const scorer = createStockScorer();

const scores = scorer.calculateScores({
  technical: { /* technical data */ },
  fundamental: { /* fundamental data */ },
  macro: { /* macro data */ }
});

// scores = {
//   technical: 4.2,
//   fundamental: 3.8,
//   macro: 3.5,
//   risk: 4.0,
//   sentiment: 3.9,
//   composite: 3.85,
//   recommendation: "Buy"
// }
```

---

## Scoring Methodology

All scoring thresholds are centralized in [`config/scoring-config.ts`](config/scoring-config.ts) with documented financial rationale.

### Composite Score Weights
- Technical: 30%
- Fundamental: 35%
- Macro: 20%
- Risk: 15%

### Recommendations
- **Strong Buy:** 4.0+ (Excellent across all factors)
- **Buy:** 3.5-3.99 (Strong fundamentals, good momentum)
- **Moderate Buy:** 3.0-3.49 (Solid overall, some concerns)
- **Hold:** 2.5-2.99 (Neutral, wait for better entry)
- **Moderate Sell:** 2.0-2.49 (Weakening, consider exit)
- **Sell:** 1.5-1.99 (Deteriorating conditions)
- **Strong Sell:** <1.5 (Significant risks)

---

## Rate Limiting

**Per User:**
- 10 analyses per day
- Resets at midnight UTC

**System-wide (Beta):**
- FMP: 300 calls/min (Starter plan)
- FRED: 120 calls/day (~20 analyses max)
- Vercel: 100k invocations/mo (free tier)

---

## Deployment

### Vercel Setup

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

### Environment Variables

Set these in Vercel dashboard:

```bash
FMP_API_KEY=your_fmp_key
FRED_API_KEY=your_fred_key
NOTION_API_KEY=your_notion_key
```

---

## Migration from v0.x

**v0.x (Python) will remain functional during v1.0 beta.**

### For Beta Testers

1. Keep using v0.x for daily analyses
2. Test v1.0 in parallel with non-critical tickers
3. Report any issues or discrepancies
4. Provide feedback on UX and speed

### What Stays the Same
- All scoring algorithms (ported exactly from v0.3.0)
- Composite score calculation (same weights)
- Notion database structure (minor additions)
- Pattern detection logic (coming in v1.1)

### What Changes
- No more Python/Colab
- No more manual script execution
- Notion-native workflow
- Automatic processing via webhooks
- Multi-user support

---

## Development Status

**v1.0 Progress:** ~70% complete

### ✅ Completed
- [x] API research and selection (FMP + FRED)
- [x] Project structure and TypeScript setup
- [x] FMP client integration
- [x] FRED client integration
- [x] Scoring engine (ported from v0.x Python)
- [x] Notion client (read/write operations)
- [x] Analysis endpoint (/api/analyze)
- [x] Webhook handler (/api/webhook)
- [x] Vercel production deployment
- [x] End-to-end workflow testing
- [x] Security audit
- [x] Production validation (MSFT test case)
- [x] Documentation (SETUP.md, testing guides)

### 🚧 In Progress (~30% remaining)
- [ ] Enhanced Notion integration (polling/batch operations)
- [ ] Rate limiting (10 analyses/user/day)
- [ ] Comprehensive error handling and logging
- [ ] Retry logic with exponential backoff
- [ ] Performance optimization (cold starts, caching)
- [ ] End-to-end testing with diverse tickers
- [ ] Beta preparation (onboarding package, user management)
- [ ] Beta rollout (3 cohorts: Nov 20, Nov 24, Nov 27 targets)

For the complete roadmap including v1.1 and v2.0 plans, see [ROADMAP.md](ROADMAP.md)

---

## Contributing

v1.0 is currently in private beta. Contributing guidelines will be published when v1.0 reaches public release.

---

## License

Same as v0.x: Business Source License 1.1 (converts to MIT on October 23, 2029)

---

## Support

**For v0.x Python issues:** See [README.md](README.md)
**For v1.0 beta issues:** Contact beta program coordinator

---

**Current Version:** v1.0.0-beta.1
**Last Updated:** October 29, 2025
**Build Progress:** See [V1.0_BUILD_PROGRESS.md](V1.0_BUILD_PROGRESS.md)
