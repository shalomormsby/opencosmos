# stocks (formerly Sage Stocks)

_Last updated: 2026-03-09_

> **Status: Paused.** This app is not currently deployed or published via Vercel. The old "sage-stocks" Vercel project is disconnected. See [OPENCOSMOS_MIGRATION.md](../../OPENCOSMOS_MIGRATION.md) for context.

---

**Invest with calm confidence, powered by intelligence you can trust.**

Sage Stocks delivers professional-grade stock analysis through **Sage Intelligence** — our proprietary knowledge layer that combines deterministic financial calculations with proven investment frameworks. Pure math. Pure financial insight. Clear, context-aware intelligence that helps you make better investment decisions.

**Version:** v0.1.0 (User) / v1.2.21 (Dev)

**Status:** Production-ready with Sage Intelligence engine, Sage Counsel decision journal, market context integration, and event-aware analysis

**Author:** Shalom Ormsby

---

## What Makes Sage Stocks Different

### Powered by Sage Intelligence

At the core of Sage Stocks is **Sage Intelligence** — a two-layer architecture that delivers 0% hallucination risk:

1. **The math layer:** Deterministic calculations based on professional-grade financial metrics. No estimates. No guesses.
2. **The interpretation layer:** AI analysis that applies proven investment frameworks (Buffett, Dalio, Lynch) systematically and unemotionally.

**Design Philosophy:** _Simple. Smart. Approachable._ Built for daily stock analyses, not enterprise scale. Clean architecture, production-grade code, minimal complexity.

### What Sage Stocks Does for You

- **Complete stock analysis in under 60 seconds** using real-time market data (FMP + FRED APIs)
- **Sage Intelligence engine** - Multi-dimensional scoring across 6 dimensions + market alignment (1.0-5.0 scale)
- **Sage Counsel decision journal** - Document every investment decision with full context, reasoning, and outcome tracking
- **Market context integration** - Analyzes market regime (Risk-On/Risk-Off/Transition) before individual stock analysis
- **Delta-first analysis** - Shows what changed since last analysis, with 90-day historical tracking
- **Event-aware intelligence** - Tracks earnings calls, dividends, splits, and guidance for portfolio stocks
- **AI-generated narratives** with regime-aware analysis and historical context
- **Syncs to Notion databases** for analysis storage and review → PostgreSQL migration planned (v2.0)
- **Multi-tenant architecture** with per-user database isolation and OAuth authentication
- **Rate limits with bypass system** (10 analyses/user/day, intelligent override codes)

---

## Core Features

### 🧠 Sage Intelligence: Multi-Dimensional Analysis

Sage Intelligence evaluates every stock across **six critical dimensions**:

| Category             | Weight | What It Measures                                                              |
| -------------------- | ------ | ----------------------------------------------------------------------------- |
| **Technical**        | 28.5%  | RSI, MACD, Bollinger Bands, SMA crossovers, volume trends                     |
| **Fundamental**      | 33%    | P/E ratio, EPS growth, revenue growth, profit margins, ROE                    |
| **Macro**            | 19%    | Market regime, sector rotation, yield curve, VIX, unemployment                |
| **Risk**             | 14.5%  | Beta, volatility, drawdown, correlation to market                             |
| **Market Alignment** | 5%     | Regime fit (beta vs Risk-On/Off), sector leadership, VIX context              |
| **Sentiment**        | 0%     | Calculated score (1.0-5.0) displayed for reference, not included in composite |

**Composite Score (1.0-5.0)** combines all dimensions into a single actionable signal:

- **Strong Buy (4.0-5.0)** - Compelling opportunity across multiple factors
- **Buy (3.5-3.9)** - Attractive risk/reward, favorable conditions
- **Moderate Buy (3.0-3.4)** - Positive outlook, above-neutral signals
- **Hold (2.5-2.9)** - Neutral outlook, watch and wait
- **Moderate Sell (2.0-2.4)** - Below-neutral signals, consider caution
- **Sell (1.5-1.9)** - Deteriorating conditions, consider reducing
- **Strong Sell (1.0-1.4)** - Significant concerns, exit recommended

### 📊 Sage Counsel: Your Investment Decision Journal

**New in v1.4+**: Document every investment decision with full context and reasoning. Sage Counsel transforms scattered investment thoughts into a **systematic decision-making system** that makes you smarter over time.

**What Gets Tracked:**

- **Decision** - What you decided and why
- **Entry/Exit Prices** - Your target prices for getting in and out
- **Catalyst** - What would change your mind
- **Article Source** - The research or news that informed your decision
- **Outcome Tracking** - Mark whether you were Correct, Incorrect, or Partial later

**Why This Matters:**

- **Build discipline** - When you document reasoning, you're less likely to act on emotion or FOMO
- **Learn from outcomes** - Review after 6 months: Did your strategy work? Were your catalysts accurate?
- **Accountability** - Future you can see what past you was thinking
- **Decision quality > outcome** - A good decision with bad luck is still a good decision

**Example Entry:**

> **ORCL: Wait for $205 entry despite Wells Fargo $280 target**
>
> Despite bullish $280 price target citing $500B AI deals, waiting for $200-$205 entry. Technical setup unchanged (weak volume, Tech sector lagging #10/11). Bull case is long-term (2029)—no rush to chase headlines.
>
> **Catalyst**: Add if Tech sector returns to top 5 + volume exceeds 20% average.

Legendary investors like Buffett and Dalio document every major decision. **Sage Counsel brings this institutional practice to individual investors**—built right into your workspace.

### 🌍 Market Context Intelligence

Before analyzing individual stocks, Sage Intelligence reads the market environment:

**Daily Market Regime Detection:**

- **🟢 Risk-On** - Markets trending up, VIX below 20, growth sectors leading
- **🔴 Risk-Off** - Markets trending down, VIX above 25, defensive sectors leading
- **🟡 Transition** - Mixed signals, VIX 20-25, unclear direction

**Sector Rotation Tracking:** See which of 11 major sectors are winning or losing in real-time.

**Economic Indicators Dashboard:** VIX, Fed Funds Rate, Unemployment, Yield Curve (all auto-updated).

**Why this matters:** The same stock can be a great buy in Risk-On and a dangerous hold in Risk-Off. Context changes everything.

### 📅 Event-Aware Intelligence

Sage Intelligence automatically tracks upcoming catalysts for all your portfolio and watchlist stocks:

- **📊 Earnings Calls** - Know exactly when companies report quarterly results
- **💵 Dividend Dates** - Track ex-dividend dates and payment schedules
- **🔀 Stock Splits** - Get notified of upcoming split events
- **🎯 Guidance Updates** - See when management commentary is expected

Events are automatically included in AI-generated analysis with urgency indicators:

- **🔥 Imminent (within 7 days)** - High volatility risk, AI notes timing considerations
- **⚠️ Approaching (within 14 days)** - Medium urgency, factors catalyst timing
- **📅 Distant (15-30 days)** - Lower urgency, assesses positioning window

### 📈 Historical Tracking & Delta-First Analysis

Sage Intelligence doesn't just give snapshots—it **tracks how things change over time**:

- **Score changes** - Is the composite score improving or deteriorating?
- **Price changes** - How much has the stock moved since last analysis?
- **Trend direction** - Are fundamentals strengthening or weakening?
- **Recommendation changes** - Has our outlook shifted?

Every analysis is automatically archived in your **Stock History database** with timestamps, creating a growing research library. After 90 days, you'll have enough data to spot patterns. After a year, your dataset becomes irreplaceable.

### 🤖 AI-Generated Analysis

Sage Intelligence generates 7-section narratives using **Anthropic Claude Sonnet 4.5**:

1. **Executive Summary** - Buy/Hold/Sell recommendation with confidence level
2. **Technical Analysis** - Chart patterns, momentum indicators, support/resistance
3. **Fundamental Analysis** - Valuation metrics, earnings quality, growth prospects
4. **Risk Assessment** - Downside risks, volatility analysis, worst-case scenarios
5. **Macro Context** - Economic headwinds/tailwinds, sector trends, market regime
6. **Historical Trends** - Score deltas vs. previous analyses, trend direction
7. **Action Items** - Specific recommendations (e.g., "Wait for RSI < 30 before entry")

**Token Optimization:** 67% reduction in tokens (6,000 → 2,000), 50% reduction in latency.

**Provider Configuration:** The LLM provider is configured via `LLM_PROVIDER` environment variable in [.env.example](.env.example#L34). The provider selection logic is implemented in [api/analyze/index.ts:821](api/analyze/index.ts#L821) via `LLMFactory.getProviderFromEnv()`.

---

## Architecture

### Technology Stack

**Backend:**

- **Platform:** Vercel Serverless Functions (300s timeout, Node.js 18+)
- **Language:** TypeScript 5.3+ (~14,800 LOC)
- **Runtime:** Node.js serverless environment

**Data Sources:**

- **Financial Modeling Prep (FMP)** - Stock data, fundamentals, technical indicators ($22-29/month)
- **FRED API** - Macroeconomic data (yield curve, VIX, unemployment) (free)
- **Upstash Redis** - Distributed rate limiting state (REST API, serverless-native)

**LLM Integration (Sage Intelligence):**

- **Provider-agnostic abstraction layer** supporting:
  - Anthropic Claude (Sonnet 4.5, Sonnet 3.5, Haiku) - **Primary**, ~$0.03-0.05/analysis
  - Google Gemini (Flash 2.5, Flash 1.5) - Alternative, ~$0.013/analysis
  - OpenAI (GPT-4 Turbo, GPT-3.5 Turbo) - Alternative
- **Configurable via environment variable** (`LLM_PROVIDER` in [.env.example](.env.example#L34))
- **Provider selection logic:** [api/analyze/index.ts:821](api/analyze/index.ts#L821)
- **67% token reduction** vs. original prompts

**Integration:**

- **Notion API** - Database operations (v1.2.21, transitioning to PostgreSQL in v2.0)
- **REST APIs** - All external communication via HTTP

### API Endpoints

| Endpoint          | Method   | Description                                      | Timeout |
| ----------------- | -------- | ------------------------------------------------ | ------- |
| `/api/health`     | GET      | Health check (uptime, version)                   | 10s     |
| `/api/analyze`    | POST     | Stock analysis (full Sage Intelligence workflow) | 300s    |
| `/api/webhook`    | POST     | Notion webhook handler                           | 60s     |
| `/api/bypass`     | GET/POST | Activate bypass code session                     | 10s     |
| `/api/usage`      | GET      | Check rate limit usage                           | 10s     |
| `/api/api-status` | GET      | API monitoring dashboard                         | 30s     |

### Response Schema (/api/analyze)

```json
{
  "success": true,
  "ticker": "AAPL",
  "analysesPageId": "13d...", // Notion page ID for database row
  "childAnalysisPageId": "14e...", // Notion page ID for full report
  "analysisContent": "## 📊 Market Environment...", // Full markdown analysis text
  "scores": {
    "composite": 4.2,
    "recommendation": "Strong Buy",
    "technical": 3.8,
    "fundamental": 4.5,
    "macro": 4.0,
    "risk": 4.2,
    "sentiment": 3.5,
    "marketAlignment": 4.0
  },
  "dataQuality": {
    "completeness": 1.0,
    "grade": "A",
    "confidence": "High"
  },
  "performance": {
    "duration": 4523,
    "fmpCalls": 11,
    "fredCalls": 6,
    "notionCalls": 8
  },
  "llmMetadata": {
    "provider": "Anthropic Claude",
    "model": "claude-sonnet-4-5-20250929",
    "tokensUsed": {
      "input": 1500,
      "output": 1800,
      "total": 3300
    },
    "cost": 0.042,
    "latencyMs": 3200
  },
  "rateLimit": {
    "remaining": 9,
    "total": 10,
    "resetAt": "2025-12-07T08:00:00.000Z"
  }
}
```

### Data Flow (v1.2.21)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          USER REQUEST (POST /api/analyze)                │
│                          { ticker: "AAPL", userId: "..." }               │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                    ┌────────────────┴────────────────┐
                    │   Authentication & Rate Limit    │
                    │   - Verify OAuth session         │
                    │   - Check Upstash Redis (10/day) │
                    └────────────────┬────────────────┘
                                     │
        ┌────────────────────────────┼────────────────────────────┐
        │                            │                            │
        ▼                            ▼                            ▼
┌───────────────┐          ┌───────────────┐          ┌───────────────┐
│   FMP API     │          │   FRED API    │          │  Notion API   │
│ (Stock Data)  │          │ (Macro Data)  │          │ (Historical)  │
│               │          │               │          │               │
│ • Quote       │          │ • Fed Funds   │          │ • Past 90     │
│ • Technicals  │          │ • VIX         │          │   days of     │
│ • Fundamentals│          │ • Unemployment│          │   analyses    │
│ • 30d History │          │ • Yield Curve │          │ • Stock       │
│               │          │ • GDP         │          │   Events DB   │
│ (11 calls)    │          │ (6 calls)     │          │ (2 queries)   │
└───────┬───────┘          └───────┬───────┘          └───────┬───────┘
        │                          │                          │
        └──────────────────────────┴──────────────────────────┘
                                   │
                    ┌──────────────▼──────────────┐
                    │   Market Context Analysis    │
                    │   - Regime Detection         │
                    │     (Risk-On/Off/Transition) │
                    │   - Sector Rotation          │
                    │   - VIX Analysis             │
                    └──────────────┬──────────────┘
                                   │
                    ┌──────────────▼──────────────┐
                    │   Sage Intelligence Scoring  │
                    │   - Technical (28.5%)        │
                    │   - Fundamental (33%)        │
                    │   - Macro (19%)              │
                    │   - Risk (14.5%)             │
                    │   - Market Alignment (5%)    │
                    │   - Sentiment (reference)    │
                    │   → Composite Score (1-5)    │
                    └──────────────┬──────────────┘
                                   │
                    ┌──────────────▼──────────────┐
                    │   Delta Calculation          │
                    │   - Score changes            │
                    │   - Price movements          │
                    │   - Trend direction          │
                    │   - Regime transitions       │
                    └──────────────┬──────────────┘
                                   │
                    ┌──────────────▼──────────────┐
                    │   LLM Analysis Generation    │
                    │   (Claude Sonnet 4.5)        │
                    │   - Market environment       │
                    │   - Delta-first narrative    │
                    │   - Upcoming events          │
                    │   - 7-section report         │
                    │   (~2,000 tokens)            │
                    └──────────────┬──────────────┘
                                   │
        ┌──────────────────────────┼──────────────────────────┐
        │                          │                          │
        ▼                          ▼                          ▼
┌───────────────┐          ┌───────────────┐          ┌───────────────┐
│ Stock Analyses│          │ Child Analysis│          │ Stock History │
│   Database    │          │     Page      │          │   Database    │
│               │          │               │          │               │
│ • Update row  │          │ • Create dated│          │ • Archive     │
│ • Write scores│          │   sub-page    │          │   snapshot    │
│ • Add AI text │          │ • Full content│          │ • Regime tag  │
│ • Set status  │          │               │          │               │
│   "Complete"  │          │               │          │               │
└───────┬───────┘          └───────┬───────┘          └───────┬───────┘
        │                          │                          │
        └──────────────────────────┴──────────────────────────┘
                                   │
                    ┌──────────────▼──────────────┐
                    │      Response to User        │
                    │   - Scores & recommendation  │
                    │   - Performance metrics      │
                    │   - Page IDs (Notion links)  │
                    │   - Rate limit status        │
                    │   - Analysis preview text    │
                    └──────────────────────────────┘

Total Duration: ~25-45 seconds
API Calls: FMP (11) + FRED (6) + Notion (6-8) = 23-25 calls
Cost per Analysis: ~$0.03-0.05 (LLM) + ~$0.002 (APIs) = ~$0.032-0.052
```

---

## Project Status

**Current Version:** v0.1.0 (User) / v1.2.21 (Dev)

**Completed (v1.0-1.4):**

- ✅ TypeScript/Vercel serverless architecture (~14,800 LOC)
- ✅ Multi-factor scoring engine with market alignment (7 dimensions)
- ✅ FMP + FRED API integration (23 calls for market context, 17 per stock)
- ✅ Market context integration (v1.3.0) - Risk-On/Risk-Off regime classification
- ✅ Delta-first analysis engine (v1.4.0) - 90-day historical tracking
- ✅ Event calendar integration (v1.2.16) - Earnings, dividends, splits, guidance
- ✅ Multi-tenant OAuth authentication with per-user database isolation
- ✅ Rate limiting system (Upstash Redis, timezone-aware)
- ✅ LLM abstraction layer (Google Gemini, OpenAI, Anthropic)
- ✅ Notion database integration (read/write optimizations, sequential deletion)
- ✅ Performance optimizations (67% token reduction, 50% faster execution)

**Current Focus (v1.5-2.0):**

- 🔧 Onboarding robustness (auto-detection fixes, validation surface)
- 🔧 Hallucination prevention system (validation + weekly audits)
- 🔧 Market Context bug fixes (content routing, property population)
- 📋 Production-ready Notion template with examples
- 📋 Event-aware analysis prompts (surface upcoming events in AI context)

**Planned (v2.0+):**

- 📋 Next.js frontend application (responsive, mobile-first)
- 📋 PostgreSQL migration (Supabase, 10-15x faster than Notion)
- 📋 Trend charts (Recharts, score history over time)
- 📋 Portfolio tracking and watchlists

See [ROADMAP.md](ROADMAP.md) and [CHANGELOG.md](CHANGELOG.md) for detailed history.

---

## Cost Structure

**Monthly Operating Costs (v1.2.21):**

| Service          | Cost              | Usage                                                    |
| ---------------- | ----------------- | -------------------------------------------------------- |
| Vercel Pro       | $20/month         | 300s timeout, unlimited invocations                      |
| FMP API          | $22-29/month      | Stock data, fundamentals, technical indicators           |
| Anthropic Claude | $90-150/month     | 3,000 analyses (@ ~$0.03-0.05 each, Sonnet 4.5)          |
| FRED API         | Free              | Macroeconomic data                                       |
| Notion           | Free              | Database storage (v1.2.21 only)                          |
| Upstash Redis    | Free              | Rate limiting state (under free tier limits)             |
| **Total**        | **$132-199/month** | For personal use (up to 3,000 analyses/month)            |

**Alternative LLM Options (Cost Comparison):**
- Google Gemini Flash 2.5: ~$0.013/analysis = $40/month for 3,000 analyses (lower cost, alternative provider)
- OpenAI GPT-4 Turbo: ~$0.10+/analysis = $300+/month for 3,000 analyses (higher cost)

**Configuration:** LLM provider is set in [.env.example](.env.example#L34) via `LLM_PROVIDER` variable.

**v2.0 Upgrade (PostgreSQL):**

- Add Supabase: $0-25/month (free tier → Pro as needed)
- Total: $152-244/month (10-15x faster database, unlimited scale)

---

## License

**Business Source License 1.1**

### You CAN:

- ✅ Use for personal, educational, and non-commercial purposes
- ✅ View and study the source code
- ✅ Modify for your own personal use
- ✅ Fork on GitHub for non-commercial projects

### You CANNOT:

- ❌ Provide commercial stock analysis services
- ❌ Sell this software or derivative works
- ❌ Compete with the original author's offerings

### Change Date: October 23, 2029

After this date, the software becomes available under the **MIT License** (fully open source).

**Commercial licensing:** Contact [shalom.ormsby@gmail.com](mailto:shalom.ormsby@gmail.com)

See [LICENSE](LICENSE) file for full terms.

---

## Support & Contact

**Author:** Shalom Ormsby

**Email:** [shalom.ormsby@gmail.com](mailto:shalom.ormsby@gmail.com)

**Repository:** [github.com/shalomormsby/sagestocks](https://github.com/shalomormsby/sagestocks)

**For issues:**

- Check documentation in [docs/](docs/) folder first
- Review [CHANGELOG.md](CHANGELOG.md) for recent changes
- Open an issue on GitHub (when repository is public)

**For bugs:**

- Include: ticker, error message, expected vs. actual behavior
- Check [ROADMAP.md](ROADMAP.md) to see if issue is already known
- Provide Vercel function logs if possible

---

## Contributing

This is currently a personal project, but contributions are welcome for:

- Bug reports and fixes
- Documentation improvements
- Performance optimizations
- Feature suggestions (see [ROADMAP.md](ROADMAP.md) first)

**Before contributing:**

1. Read [ARCHITECTURE.md](ARCHITECTURE.md) to understand system design
2. Review [.github/FILE_ORGANIZATION.md](.github/FILE_ORGANIZATION.md) for file organization standards
3. Check [ROADMAP.md](ROADMAP.md) to avoid duplicating planned work

---

## Acknowledgments

Built with:

- Vercel - Serverless platform
- Financial Modeling Prep - Market data
- FRED - Economic data
- Anthropic Claude - LLM analysis generation (primary)
- Google Gemini - Alternative LLM provider
- Notion - Database integration (v1.2.21)
- Upstash - Redis rate limiting

---

_For legacy v0.2.x Python documentation, see [docs/legacy/README_v0.2.x.md](docs/legacy/README_v0.2.x.md)_
