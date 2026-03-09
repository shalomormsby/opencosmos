# Sage Stocks Architecture

*Last updated: December 1, 2025*

**Development Version:** v1.2.16 (Complete) - Stock Events Ingestion Pipeline
**Latest Feature:** v1.2.0 (Complete) - Chunked Processing Architecture (Timeout Prevention)
**Template Version:** v0.1.0 (Beta) - Launching with Cohort 1
**Production URL:** [https://sagestocks.vercel.app](https://sagestocks.vercel.app)
**Status:** ✅ Live in Production - Fully Automated

> 📋 **Versioning Note:** This document uses **development versions** (v1.x, v2.x) for technical milestone tracking. See [CHANGELOG.md](CHANGELOG.md) "📋 Versioning Strategy (Dual-Track)" for the mapping to user-facing template versions (v0.1.0 Beta → v1.0.0 Public).
>
> **Current Mapping:** Template v0.1.0 (Beta) includes development versions v1.0.0–v1.1.6

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Technology Stack](#technology-stack)
3. [Data Flow Diagram](#data-flow-diagram-v102)
4. [Architecture Diagram](#architecture-diagram-v102)
5. [Component Structure](#component-structure)
6. [Data Flow](#data-flow)
7. [API Endpoints](#api-endpoints)
8. [External Integrations](#external-integrations)
9. [Rate Limiting Architecture](#rate-limiting-architecture)
10. [Security Model](#security-model)
11. [Deployment Architecture](#deployment-architecture)
12. [Configuration](#configuration)
13. [Design Decisions](#design-decisions)

---

## System Overview

Sage Stocks is a **serverless stock analysis platform** that delivers automated technical and fundamental analysis with AI-generated insights. Built as a multi-user SaaS platform with OAuth authentication, it's designed for daily decision-support with Notion as the primary data store.

**Core Capabilities:**
- **Multi-user OAuth authentication** - Notion OAuth with session-based access control (v1.1.x)
- **Real-time stock analysis** - Technical + fundamental indicators from FMP and FRED APIs
- **6-dimension scoring system** - 5 weighted (Technical 28.5%, Fundamental 33%, Macro 19%, Risk 14.5%, Market Alignment 5%) + Sentiment (reference-only, 0% weight in composite)
- **Market context awareness** - Regime detection (Risk-On, Risk-Off, Transition) with sector rotation tracking (v1.0.7)
- **Stock events calendar** - Automated ingestion of earnings calls, dividends, and stock splits for Portfolio/Watchlist stocks (v1.2.16)
- **Chunked processing architecture** - Redis-backed queue persistence for 15+ stock daily analyses without timeout (v1.2.0)
- **LLM-generated analysis** - 7-section regime-aware analysis narratives (Anthropic Claude Sonnet 4.5, ~$0.03-0.05/analysis)
- **Historical context tracking** - Delta tracking across previous analyses
- **Template version management** - User-controlled upgrade system with data preservation (v1.1.6)
- **Timezone-aware rate limiting** - User-specific quotas with admin bypass (Upstash Redis)
- **Notion Inbox notifications** - Built-in status updates (v1.0.0)
- **API cost monitoring** - Real-time dashboard for operational visibility (v1.0.2c)

**Design Philosophy:** *Impeccable but simple.* Built for daily stock analyses ahead of earnings, not enterprise-scale deployment. Notion-first architecture with potential PostgreSQL migration in v2.0 (Q1-Q2 2026).

**⚠️ DEPRECATED COMPONENTS:**
- **WordPress hosting** (deprecated v1.1.0) - Previously used shalomormsby.com/stock-intelligence, now fully migrated to sagestocks.vercel.app
- **Alpha Vantage API** (deprecated v0.4.0) - Migrated to FMP for all stock data
- **Single-user hardcoded approach** (deprecated v1.1.0) - Replaced with OAuth multi-user system

---

## Technology Stack

### Runtime & Platform
- **Platform:** Vercel Serverless Functions
- **Production URL:** [sagestocks.vercel.app](https://sagestocks.vercel.app)
- **Runtime:** Node.js 18+
- **Language:** TypeScript 5.3+
- **Build System:** tsc (TypeScript compiler)
- **Plan:** Vercel Pro ($20/month) - Required for 300-second timeout on analysis endpoint

### Data Sources
- **Financial Modeling Prep (FMP)** - Stock data, fundamentals, technical indicators, sector ETF performance, event calendars (v1.2.16: earnings, dividends, stock splits)
- **FRED API** - Macroeconomic indicators (yield curve, VIX, consumer sentiment)
- **Upstash Redis** - Distributed state for rate limiting + market context caching (1-hour TTL, optional - v1.0.7)

### LLM Integration
- **Anthropic Claude Sonnet 4.5** (Primary) - Analysis generation, ~$0.03-0.05 per analysis, 67% token reduction (6,000 → 2,000 tokens)
- **LLM Abstraction Layer** (v1.0.2) - Provider-agnostic interface supporting:
  - Anthropic Claude (Sonnet 4.5, Sonnet 3.5, Haiku) - Primary, most intelligent for analysis
  - Google Gemini (Flash 2.5, Flash 1.5) - Alternative, lower cost (~$0.013/analysis)
  - OpenAI (GPT-4 Turbo, GPT-3.5 Turbo) - Alternative
  - **Configuration:** Set in [.env.example](../../.env.example#L34) via `LLM_PROVIDER` variable
  - **Provider Selection Logic:** [api/analyze/index.ts:821](../../api/analyze/index.ts#L821) via `LLMFactory.getProviderFromEnv()`
  - Easy provider switching for cost/performance optimization

### Authentication & User Management
- **Notion OAuth** (v1.1.1) - Official OAuth 2.0 integration
- **Session Management** - Encrypted session tokens with secure cookie storage
- **Beta Users Database** - Notion-based user registry with approval workflow
- **Role-Based Access** - Admin, approved, pending, denied user states
- **Template Detection** - Auto-discovery of user's Notion databases (v1.1.6)

### Integration Layer
- **Notion API v2025-09-03** (v1.2.4) - Primary data store for Stock Analyses, Stock History, Beta Users databases
  - **SDK:** `@notionhq/client` v5.4.0 (upgraded from v2.3.0)
  - **Multi-source database support** with data source ID resolution pattern
  - **Data source caching** to minimize API calls (in-memory cache per client instance)
  - **Breaking changes resolved:** Migrated from `databases.query()` → `dataSources.query()`
  - **Query pattern:** Fetch data source ID from database before queries (cached for performance)
- **Upstash Redis** - Rate limiting state and admin bypass sessions (REST API, serverless-friendly)
- **PostgreSQL (Supabase)** - Planned migration in v2.0 for performance optimization
- **REST APIs** - All external communication via HTTP

### Rate Limiting & Monitoring
- **Upstash Redis** - Distributed rate limiting with automatic midnight UTC reset
- **User Quotas** - 5 analyses per day for beta users, configurable per user
- **Admin Bypass** - Environment-based admin auto-bypass system
- **API Cost Dashboard** - Real-time monitoring of 6 API integrations (v1.0.2c)

### Development Tools
- **ESLint** - Code linting
- **ts-node** - Local testing scripts
- **dotenv** - Environment variable management
- **Vercel CLI** - Local development server

## Data Flow Diagram (v1.0.2)

# Stock Analyses Data Flow

```

## 1. User Authentication & Input
┌─────────────────────────────────┐
│  sagestocks.vercel.app         │
│  (Next.js/HTML Frontend)        │
│                                 │
│  1. Notion OAuth Login          │
│  2. Session validation          │
│  3. User enters ticker symbol   │
│  4. Clicks "Analyze"            │
└────────┬────────────────────────┘
         │
         ▼

## 2. API Request with Authentication
┌─────────────────────────────────┐
│  POST /api/analyze              │
│  (300s timeout on Pro plan)     │
│                                 │
│  Headers:                       │
│  - Session token (encrypted)    │
│  - User ID from session         │
│                                 │
│  Body: { ticker, userId }       │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  Session Validation             │
│  - Decrypt session token        │
│  - Verify Notion OAuth token    │
│  - Check user approval status   │
│  - Reject if pending/denied     │
└────────┬────────────────────────┘
         │
         ▼

## 3. Data Ingestion (Parallel)
┌──────────────┐        ┌──────────────┐
│  FMP API     │        │  FRED API    │
│  - Price     │        │  - Macro     │
│  - Volume    │        │  - Economic  │
│  - Technical │        │  - Rates     │
│  - Fundamental        │              │
└──────┬───────┘        └──────┬───────┘
       │                       │
       └───────────┬───────────┘
                   ▼

## 4. LLM Processing
┌─────────────────────────────────┐
│   LLM Abstraction Layer         │
│   (Claude / Gemini / OpenAI)    │
│   Primary: Claude Sonnet 4.5    │
│                                 │
│  Input:                         │
│  - Raw financial metrics        │
│  - Price & volume data          │
│  - Technical indicators         │
│  - Macro context                │
│                                 │
│  Output:                        │
│  - Recommendation               │
│  - Composite scores (0-5)       │
│  - Pattern detection            │
│  - AI summary                   │
│  - Full markdown analysis       │
└────────┬────────────────────────┘
         │
         ▼

## 5. Notion Write (Sequential bottleneck)
┌─────────────────────────────────────────┐
│  Notion API Write                       │
│  (Rate limits: ~3 rps, 100 blocks/call) │
│                                         │
│  Two targets:                           │
│  A) Main Stock Page                     │
│     └─ Overwrite with latest analysis   │
│                                         │
│  B) Stock History Archive               │
│     └─ Create timestamped snapshot      │
│                                         │
│  Operations:                            │
│  1. Update page properties (metadata)   │
│  2. Delete old content blocks           │
│  3. Write new content blocks            │
│     (batched due to size)               │
└────────┬────────────────────────────────┘
         │
         ▼

## 6. Database Update
┌─────────────────────────────────┐
│  Stock Analyses Database        │
│  @Stock Analyses                   │
│                                 │
│  Updated properties:            │
│  - Status: "Complete"           │
│  - All metric columns           │
│  - Scores & ratings             │
│  - Analysis Date                │
│  - API Calls Used               │
└────────┬────────────────────────┘
         │
         ▼

## 7. Response & UI
┌─────────────────────────────────┐
│  Web App Frontend               │
│                                 │
│  - Stop "Analyzing..." spinner  │
│  - Display success              │
│  - "View Results in Notion"     │
│    button (redirects to page)   │
└─────────────────────────────────┘

```

## Data Schema in Notion

```
Each analysis page contains:

├─ Properties (50+ columns in database)
│  ├─ Core: Ticker, Status, Analysis Date
│  ├─ Price: Current, 50/200 MA, 52W High/Low
│  ├─ Scores: Composite, Technical, Fundamental, Macro, Risk, Sentiment, Sector
│  ├─ Indicators: RSI, MACD, Volume, Beta, Volatility
│  ├─ Fundamental: P/E, EPS, Market Cap, Debt/Equity
│  └─ Meta: Confidence, Data Quality Grade, API Calls
│
└─ Page Content (markdown)
├─ Recommendation callout (colored, emoji)
├─ Executive Summary
├─ Technical Analysis
├─ Fundamental Analysis
├─ Macro & Sector Context
├─ Catalysts & Events
├─ Risks & Considerations
├─ Trade Setup (entry/exit/stops in table)
└─ Position Sizing Guidance

```

---

## Architecture Diagram (v1.0.2)

**Current architecture with OAuth authentication and multi-user support (v1.1.6)**

> ⚠️ **DEPRECATED:** WordPress hosting at shalomormsby.com/stock-intelligence (v1.1.0). All references replaced with sagestocks.vercel.app.

```
┌──────────────────────────────────────────────────────────────────┐
│              sagestocks.vercel.app (Production)                   │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                  Frontend Pages (HTML/JS)                   │ │
│  │  ┌──────────────────────────────────────────────────────┐  │ │
│  │  │ / (index.html) - OAuth Login                         │  │ │
│  │  │ • Notion OAuth "Sign In" button                      │  │ │
│  │  │ • Approval status display                            │  │ │
│  │  │ • Redirect to /analyze after approval                │  │ │
│  │  └──────────────────────────────────────────────────────┘  │ │
│  │  ┌──────────────────────────────────────────────────────┐  │ │
│  │  │ /analyze.html - Stock Analyzer                       │  │ │
│  │  │ • Ticker Input Field                                 │  │ │
│  │  │ • "Analyze Stock" Button                            │  │ │
│  │  │ • Real-time Status Display                          │  │ │
│  │  │ • Usage Counter (X/5 today, user-specific)          │  │ │
│  │  │ • "View Results" Link (opens Notion page)           │  │ │
│  │  │ • Tailwind CSS + Vanilla JS (no build step)         │  │ │
│  │  └──────────────────────────────────────────────────────┘  │ │
│  │  ┌──────────────────────────────────────────────────────┐  │ │
│  │  │ /settings.html - User Settings                       │  │ │
│  │  │ • Bypass code activation                             │  │ │
│  │  │ • Usage statistics                                   │  │ │
│  │  │ • Expiration countdown                               │  │ │
│  │  └──────────────────────────────────────────────────────┘  │ │
│  │  ┌──────────────────────────────────────────────────────┐  │ │
│  │  │ /setup.html - Template Setup (v1.1.6)                │  │ │
│  │  │ • Auto-detect Stock Analyses database                │  │ │
│  │  │ • Auto-detect Stock History database                 │  │ │
│  │  │ • Auto-detect Sage Stocks page                       │  │ │
│  │  │ • Template version tracking                          │  │ │
│  │  └───────────────────────┬───────────────────────────────┘  │ │
│  └────────────────────────────┼─────────────────────────────────┘ │
└─────────────────────────────┼─────────────────────────────────────┘
                              │
                              │ POST /api/analyze
                              │ Headers: Session token
                              │ Body: { ticker, userId }
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│                       Vercel Serverless (v1.0.2)                  │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                      API Endpoints                          │ │
│  │  ┌──────────┐  ┌─────────┐  ┌────────┐  ┌────────────┐   │ │
│  │  │ /analyze │  │ /webhook│  │ /usage │  │  /bypass   │   │ │
│  │  │  (NEW)   │  │ /health │  │        │  │            │   │ │
│  │  └────┬─────┘  └─────────┘  └───┬────┘  └─────┬──────┘   │ │
│  │       │                          │             │           │ │
│  └───────┼──────────────────────────┼─────────────┼───────────┘ │
│          │                          │             │              │
│  ┌───────▼──────────────────────────▼─────────────▼───────────┐ │
│  │                    Core Libraries                           │ │
│  │                                                              │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐  │ │
│  │  │ Rate Limiter │  │ Scoring      │  │ Notion Client   │  │ │
│  │  │ - Admin      │  │ - 6 Scores   │  │ - Read History  │  │ │
│  │  │   Bypass     │  │ - Technical  │  │ - Write Pages   │  │ │
│  │  │ - Session    │  │ - Fundamental│  │ - Child Pages   │  │ │
│  │  │   Check      │  │ - Macro/Risk │  │ - Archive       │  │ │
│  │  └──────┬───────┘  └──────┬───────┘  └────────┬────────┘  │ │
│  │         │                 │                    │           │ │
│  │  ┌──────▼───────┐  ┌──────▼───────┐  ┌────────▼────────┐  │ │
│  │  │ LLM Provider │  │ FMP Client   │  │ FRED Client    │  │ │
│  │  │ (NEW)        │  │ - Quotes     │  │ - Macro Data   │  │ │
│  │  │ - Gemini     │  │ - Financials │  │ - Indicators   │  │ │
│  │  │ - OpenAI     │  │ - Technicals │  │                │  │ │
│  │  │ - Anthropic  │  └──────────────┘  └─────────────────┘  │ │
│  │  │ - Abstraction│                                         │ │
│  │  └──────┬───────┘                                         │ │
│  │         │                                                  │ │
│  └─────────┼──────────────────────────────────────────────────┘ │
└────────────┼──────────────────────────────────────────────────────┘
             │
    ┌────────┼────────┬──────────────┬──────────────┬────────────┐
    │        │        │              │              │            │
    ▼        ▼        ▼              ▼              ▼            ▼
┌─────────┐ ┌────────┐ ┌──────────┐ ┌────────┐ ┌──────────┐ ┌──────────┐
│ Upstash │ │ Google │ │   FMP    │ │  FRED  │ │  Notion  │ │  Notion  │
│  Redis  │ │ Gemini │ │(Financial│ │ (Macro │ │ Analyses │ │ History  │
│         │ │        │ │   Data)  │ │ Econ)  │ │    DB    │ │    DB    │
│ Rate    │ │ Flash  │ │          │ │        │ │          │ │          │
│ Limit + │ │  2.5   │ │ $22-29/  │ │  Free  │ │ Current  │ │ Archive  │
│ Bypass  │ │        │ │  month   │ │        │ │ Analysis │ │Time-     │
│Sessions │ │ $0.013/│ │          │ │        │ │          │ │Series    │
│         │ │analysis│ │          │ │        │ │          │ │          │
│  Free   │ │(50% ↓) │ │          │ │        │ │          │ │          │
└─────────┘ └────────┘ └──────────┘ └────────┘ └──────────┘ └──────────┘
```

**v1.1.6 Workflow (OAuth → Analyze → Notion):**
1. User visits [sagestocks.vercel.app](https://sagestocks.vercel.app) → clicks "Sign in with Notion"
2. Notion OAuth flow → user grants access → redirected to /analyze.html
3. User enters ticker → clicks "Analyze Stock"
4. HTML page → POST /api/analyze (with session token in headers)
5. Vercel validates session → checks user approval status
6. Checks rate limit (admin auto-bypass or 5/day per user)
7. Fetches market data (FMP + FRED in parallel)
8. Calculates 6 category scores + composite (Technical 30%, Fundamental 35%, Macro 20%, Risk 15%)
9. Queries Notion for historical analyses (5 most recent from user's Stock History DB)
10. Computes deltas and trends
11. Calls LLM (Claude Sonnet 4.5 primary) for 7-section analysis (~10-20 sec)
12. Writes to 3 Notion locations in user's workspace:
    - Stock Analyses DB (main page update, triggers Notion Inbox notification)
    - Child analysis page (dated, e.g., "AAPL Analysis - Nov 1, 2025")
    - Stock History DB (archive entry with timestamp)
13. Returns pageUrl → HTML displays "View Results in Notion" link
14. User clicks → opens their personal Notion analysis page

**Performance:** 25-35 seconds (Notion bottleneck: historical queries + 3 writes, improved with v1.0.5/v1.0.6 chunked streaming optimizations)
**Target:** 18-25 seconds
**Future:** v2.0 migration to PostgreSQL → 18-25 seconds (10-15x faster DB ops)

---

## Future Architecture (v2.0)

**Next.js Frontend + PostgreSQL Database for production scale**

```
┌──────────────────────────────────────────────────────────────────┐
│                  Next.js 14 App (Vercel Hosted)                   │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Authentication (Supabase Auth)                            │ │
│  │  • Login / Signup / Password Reset                         │ │
│  └────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Analyzer Page                                             │ │
│  │  • Ticker Input → Real-time Status → Results Display       │ │
│  └────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Historical Analysis View                                  │ │
│  │  • List of Past Analyses (sortable, filterable)            │ │
│  │  • Trend Charts (Recharts - score over time)              │ │
│  └────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Dashboard                                                 │ │
│  │  • Portfolio Overview                                      │ │
│  │  • Watchlist (track multiple tickers)                      │ │
│  │  • Usage Stats                                             │ │
│  └──────────────────────┬─────────────────────────────────────┘ │
└─────────────────────────┼─────────────────────────────────────────┘
                          │
                          │ Vercel API (same backend, minimal changes)
                          ▼
┌──────────────────────────────────────────────────────────────────┐
│                  Vercel API (v2.0 - PostgreSQL)                   │
│                                                                   │
│  Replace Notion queries with SQL:                                │
│  • Historical query: <500ms (vs 2-5 sec with Notion)              │
│  • Database writes: <100ms (vs 6-10 sec with Notion)              │
│  • Delta computation: Automatic with SQL window functions         │
│                                                                   │
│  Same: Rate limiting, Scoring, LLM generation, FMP/FRED clients   │
└────────────────────────────┬──────────────────────────────────────┘
                             │
                   ┌─────────┼─────────┬───────────┐
                   ▼         ▼         ▼           ▼
            ┌───────────┐ ┌────────┐ ┌──────┐ ┌────────┐
            │ Supabase  │ │ Redis  │ │ LLM  │ │FMP/FRED│
            │PostgreSQL │ │(Rate   │ │      │ │        │
            │           │ │Limit)  │ │      │ │        │
            │ • analyses│ │        │ │      │ │        │
            │ • users   │ │        │ │      │ │        │
            │ • watch-  │ │        │ │      │ │        │
            │   lists   │ │        │ │      │ │        │
            │           │ │        │ │      │ │        │
            │ $0-25/mo  │ │  Free  │ │$39/mo│ │$29/mo  │
            └───────────┘ └────────┘ └──────┘ └────────┘
```

**v2.0 Performance:** 18-25 seconds (60-100x faster DB ops)
**v2.0 Features:** Trend charts, watchlists, portfolio tracking, mobile app
**v2.0 Timeline:** December 2025 - January 2026 (25-35 hours)

---

## Detailed System Flow (v1.0.2)

**Complete end-to-end flow for HTML Analyzer Page with LLM-generated analysis**

### Phase 1: OAuth Authentication & Session Setup

> ⚠️ **DEPRECATED:** WordPress password gate replaced with Notion OAuth (v1.1.1). Hardcoded userId replaced with session-based user identification.

```
┌─────────────────────────────────────────┐
│ User visits sagestocks.vercel.app       │
│ Landing page (index.html)               │
└──────────────────┬──────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│ Check for Active Session                │
│ • Cookie: encrypted session token       │
│ • If valid → redirect to /analyze       │
│ • If invalid → show "Sign in" button    │
└──────────────────┬──────────────────────┘
                   │
                   ▼ (No session)
┌─────────────────────────────────────────┐
│ User Clicks "Sign in with Notion"       │
│ → GET /api/auth/authorize               │
└──────────────────┬──────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│ Notion OAuth Flow                       │
│ 1. Redirect to Notion authorization URL │
│ 2. User grants workspace access         │
│ 3. Notion redirects back to /callback   │
│ 4. Exchange code for OAuth token        │
│ 5. Look up user in Beta Users DB        │
│ 6. Check approval status                │
│ 7. Create encrypted session token       │
│ 8. Set secure cookie                    │
└──────────────────┬──────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│ Redirect Based on Status                │
│ • Approved → /analyze.html              │
│ • Pending → index.html (pending msg)    │
│ • Denied → index.html (denied msg)      │
│ • New user → Create in DB, set pending  │
└──────────────────┬──────────────────────┘
                   │
                   ▼ (Approved users only)
┌─────────────────────────────────────────┐
│ Analyzer Page Loads (analyze.html)      │
│ • Ticker input field                    │
│ • "Analyze Stock" button                │
│ • userId from session (dynamic)         │
│ • Usage counter (user-specific quota)   │
└──────────────────┬──────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│ User enters ticker (e.g., "AAPL")       │
│ and clicks "Analyze Stock"              │
└──────────────────┬──────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│ UI State → "Analyzing..."               │
│ (spinner + status message)              │
└──────────────────┬──────────────────────┘
                   │
                   ▼
```

### Phase 2: Vercel Backend Processing

```
┌─────────────────────────────────────────┐
│ POST /api/analyze                       │
│ {                                       │
│   ticker: "AAPL",                       │
│   userId: "user://90089dd2..."          │
│ }                                       │
└──────────────────┬──────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│ 1. Check Rate Limiting                  │
│ • Query Redis for user's daily count    │
│ • Admin bypass: userId == env.ADMIN_ID? │
│ • If limit exceeded → return 429 error  │
│ Time: <500ms                            │
└──────────────────┬──────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│ 2. Fetch Current Market Data            │
│ (Parallel API calls)                    │
│                                         │
│ FMP API:                                │
│ • Daily price data (OHLC)               │
│ • Technical indicators (SMA, RSI, MACD) │
│ • Fundamental data (P/E, EPS, etc.)     │
│                                         │
│ FRED API:                               │
│ • Macro indicators (rates, GDP, etc.)   │
│                                         │
│ Time: ~3-5 seconds                      │
└──────────────────┬──────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│ 3. Calculate Scores                     │
│ • Technical Score (1.0-5.0)             │
│ • Fundamental Score (1.0-5.0)           │
│ • Macro Score (1.0-5.0)                 │
│ • Risk Score (1.0-5.0)                  │
│ • Sentiment Score (1.0-5.0)             │
│ • Sector Score (1.0-5.0)                │
│ • Composite Score (weighted average)    │
│ • Pattern Analysis                      │
│ • Recommendation (Buy/Hold/Sell)        │
│                                         │
│ Time: ~1 second                         │
└──────────────────┬──────────────────────┘
                   │
                   ▼
```

### Phase 3: Historical Context Retrieval

```
┌─────────────────────────────────────────┐
│ 4. Query Notion for Historical Data     │
│ (Parallel queries)                      │
└──────────────────┬──────────────────────┘
                   │
          ┌────────┴────────┐
          │                 │
          ▼                 ▼
┌──────────────────┐  ┌──────────────────┐
│ Query Stock      │  │ Query Stock      │
│ Analyses DB      │  │ History DB       │
│                  │  │                  │
│ Filter:          │  │ Filter:          │
│ Ticker = "AAPL"  │  │ Ticker = "AAPL"  │
│                  │  │ Sort: Date DESC  │
│ Returns:         │  │ Limit: 5         │
│ • Existing page? │  │                  │
│ • Previous scores│  │ Returns:         │
│ • Previous rec   │  │ • Last 5 entries │
│ • Last analysis  │  │ • With dates     │
│   date           │  │ • With scores    │
└────────┬─────────┘  └────────┬─────────┘
         │                     │
         └──────────┬──────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│ 5. Compute Deltas & Trends              │
│                                         │
│ IF previous analysis exists:            │
│ • Score changes: 3.8 → 4.2 (+0.4)       │
│ • Recommendation change: Hold → Buy     │
│ • Days since last analysis: 2 days      │
│                                         │
│ IF historical data exists:              │
│ • Trend direction: Improving ↗          │
│ • Score range: 3.5-4.2 (past 30 days)   │
│ • Average: 3.8                          │
│ • Volatility: Low/Medium/High           │
│                                         │
│ Time: ~2-5 seconds (Notion bottleneck)  │
└──────────────────┬──────────────────────┘
                   │
                   ▼
```

### Phase 4: AI Analysis Generation

```
┌─────────────────────────────────────────┐
│ 6. Build Enriched Prompt for LLM        │
│                                         │
│ Context includes:                       │
│ • Current metrics (all scores)          │
│ • Previous analysis (if exists):        │
│   - Date, scores, recommendation        │
│   - Key metrics that changed            │
│ • Historical trend (past 5 analyses):   │
│   - Dates, scores, recommendations      │
│   - Trend direction                     │
│ • Computed deltas and insights          │
│                                         │
│ Prompt structure:                       │
│ "You are analyzing AAPL on Nov 1, 2025. │
│                                         │
│ Current metrics: [detailed data]        │
│                                         │
│ Previous analysis (Oct 30, 2025):       │
│ - Composite: 3.8 → 4.2 (+0.4)           │
│ - Recommendation: Hold → Buy            │
│ - Key changes: RSI 45→62, MACD crossover│
│                                         │
│ Historical trend (5 analyses):          │
│ - Steady improvement over 30 days       │
│ - Consistent Hold → now upgraded to Buy │
│                                         │
│ Generate 7-section analysis:            │
│ 1. Data Foundation & Quality            │
│ 2. Dual-Lens (Value × Momentum)         │
│ 3. Market Intelligence & Catalysts      │
│ 4. Strategic Trade Plan                 │
│ 5. Directional Outlook                  │
│ 6. Portfolio Integration                │
│ 7. Investment Recommendation            │
│                                         │
│ Highlight changes, trends, and          │
│ what triggered the upgrade."            │
│                                         │
│ NOTE: Prompt optimized for 50% token    │
│ reduction (information-dense format)    │
└──────────────────┬──────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│ 7. Call LLM API (Claude Sonnet 4.5)    │
│    Provider configured via LLM_PROVIDER │
│                                         │
│ Input: ~1,500 tokens (67% reduction)    │
│ Output: ~1,800 tokens                   │
│                                         │
│ Receives:                               │
│ • Complete 7-section analysis           │
│ • Formatted in Notion markdown          │
│ • Includes H3 headings, bullets         │
│ • Highlights deltas and trends          │
│                                         │
│ Time: ~10-20 seconds                    │
│ Cost: ~$0.03-0.05 per analysis (Claude) │
│ (Alternative: Gemini ~$0.013)           │
└──────────────────┬──────────────────────┘
                   │
                   ▼
```

### Phase 5: Notion Database Writes

```
┌─────────────────────────────────────────┐
│ 8. Write to Stock Analyses Database     │
│                                         │
│ IF page exists (ticker found):          │
│ • Update existing page properties       │
│ • Update page content with new analysis │
│                                         │
│ IF page doesn't exist:                  │
│ • Create new database row/page          │
│ • Set all properties                    │
│ • Set page content                      │
│                                         │
│ Properties written:                     │
│ • All scores (Composite, Technical, etc)│
│ • Recommendation (Buy/Hold/Sell)        │
│ • Confidence level                      │
│ • Data quality grade                    │
│ • Analysis Date (with timestamp)        │
│ • Pattern scores & signals              │
│ • All technical metrics                 │
│ • All fundamental metrics               │
│                                         │
│ Content written:                        │
│ • Full 7-section analysis text          │
│                                         │
│ Returns: pageUrl of Stock Analyses page │
│                                         │
│ Time: ~2-3 seconds                      │
└──────────────────┬──────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│ 9. Create Dated Child Analysis Page     │
│                                         │
│ Structure:                              │
│ Stock Analyses (Database)               │
│ └─ AAPL (row/page from step 8)          │
│    ├─ AAPL Analysis - Nov 1, 2025 ← NEW │
│    ├─ AAPL Analysis - Oct 30, 2025      │
│    └─ ...                               │
│                                         │
│ Page properties:                        │
│ • Title: "{Ticker} Analysis - {Date}"   │
│ • Parent: Stock Analyses AAPL page      │
│                                         │
│ Page content:                           │
│ • Copy of full 7-section analysis       │
│ • All metrics as properties             │
│ • Timestamp                             │
│                                         │
│ Returns: childPageUrl                   │
│                                         │
│ Time: ~2 seconds                        │
└──────────────────┬──────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│ 10. Archive to Stock History Database   │
│                                         │
│ Create new entry:                       │
│ • Name: "AAPL - Nov 1, 2025 4:30 PM"    │
│ • Copy all metrics from analysis        │
│ • Copy full analysis content            │
│ • Set Content Status: "New"             │
│ • Link to Stock Analyses page           │
│                                         │
│ Purpose:                                │
│ • Time-series tracking                  │
│ • Trend analysis data source            │
│ • Historical reference                  │
│                                         │
│ Time: ~2 seconds                        │
└──────────────────┬──────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│ 11. Increment Rate Limit Counter        │
│ • Update Redis: user's daily count + 1  │
│ Time: <500ms                            │
└──────────────────┬──────────────────────┘
                   │
                   ▼
```

### Phase 6: Response & User Notification

```
┌─────────────────────────────────────────┐
│ 12. Return Success Response             │
│                                         │
│ {                                       │
│   success: true,                        │
│   ticker: "AAPL",                       │
│   pageUrl: "[child page URL]",          │
│   stockAnalysesUrl: "[main page URL]",  │
│   analysisDate: "2025-11-01T16:30:00Z", │
│   compositeScore: 4.2,                  │
│   recommendation: "Buy",                │
│   previousScore: 3.8,                   │
│   scoreChange: +0.4,                    │
│   rateLimit: {                          │
│     used: 5,                            │
│     limit: 10,                          │
│     remaining: 5                        │
│   }                                     │
│ }                                       │
│                                         │
│ Total time: ~18-25 seconds (target)     │
│ Actual (with Notion): ~35-50 seconds    │
└──────────────────┬──────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│ 13. Web Page Updates to Success State   │
│                                         │
│ UI displays:                            │
│ • Button: "✓ Analysis Complete" (green) │
│ • Status: "Analysis created in Notion"  │
│ • Score badge: "4.2/5.0 - Buy (+0.4)"   │
│ • Link: "View Results →"                │
│ • Secondary link: "Copy Link" button    │
│ • Usage counter: "5/10 analyses today"  │
└──────────────────┬──────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│ 14. User Clicks "View Results →"        │
└──────────────────┬──────────────────────┘
                   │
                   ▼
```

### Phase 7: User Reviews Analysis in Notion

```
┌─────────────────────────────────────────┐
│ Notion Page Opens: AAPL Analysis        │
│                  Nov 1, 2025            │
│                                         │
│ User sees:                              │
│ • All metric properties in clean layout │
│ • Composite Score: 4.2/5.0              │
│ • Recommendation: Buy                   │
│ • Full 7-section analysis content:      │
│   1. Data Foundation & Quality          │
│      - Shows data completeness          │
│      - Previous: 3.8, Current: 4.2      │
│   2. Dual-Lens Analysis                 │
│      - Value vs Momentum perspective    │
│   3. Market Intelligence                │
│      - Recent news, catalysts           │
│   4. Strategic Trade Plan               │
│      - Entry/exit levels                │
│   5. Directional Outlook                │
│      - Trend improved over 30 days      │
│   6. Portfolio Integration              │
│      - Position sizing guidance         │
│   7. Investment Recommendation          │
│      - Upgraded from Hold to Buy        │
│      - Rationale with delta context     │
└──────────────────┬──────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│ User can also navigate to:              │
│                                         │
│ • Parent AAPL page (database row)       │
│   - See all historical child analyses   │
│   - Quick metrics reference             │
│                                         │
│ • Stock History database                │
│   - Time-series view of all analyses    │
│   - Trend charts (future feature)       │
│                                         │
│ • Stock Analyses database               │
│   - Compare across all tickers          │
│   - Portfolio overview                  │
└─────────────────────────────────────────┘
```

### Error Scenarios

```
┌─────────────────────────────────────────┐
│ Error: Rate Limit Exceeded              │
│                                         │
│ Response:                               │
│ {                                       │
│   success: false,                       │
│   error: {                              │
│     code: "RATE_LIMIT_EXCEEDED",        │
│     message: "Rate limit exceeded"      │
│   },                                    │
│   rateLimit: {                          │
│     used: 10,                           │
│     limit: 10,                          │
│     remaining: 0,                       │
│     resetTime: "2025-11-02T07:00:00Z"   │
│   }                                     │
│ }                                       │
│                                         │
│ Web page displays:                      │
│ "Daily quota of 10 stock analyses       │
│  reached. Resets at midnight Pacific    │
│  Time. Upgrade to paid plan for         │
│  unlimited analyses."                   │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ Error: API Timeout / Other Error        │
│                                         │
│ Response:                               │
│ {                                       │
│   success: false,                       │
│   error: {                              │
│     code: "ANALYSIS_FAILED",            │
│     message: "[specific error message]" │
│   }                                     │
│ }                                       │
│                                         │
│ Web page displays:                      │
│ "Error: [message]. Please try again."   │
│ Button re-enabled for retry             │
└─────────────────────────────────────────┘
```

### System Performance Summary

```
═══════════════════════════════════════════════════════════
Total Time Breakdown (v1.0.2 with Notion):
═══════════════════════════════════════════════════════════
• Rate limit check: <500ms
• Fetch market data: 3-5 sec
• Calculate scores: 1 sec
• Query historical data (Notion): 2-5 sec ← BOTTLENECK
• Compute deltas: <1 sec
• LLM analysis generation: 10-20 sec
• Notion writes (3 operations): 6-10 sec ← BOTTLENECK
• Rate limit update: <500ms
─────────────────────────────
TOTAL: 23-42 seconds (realistic with Notion)
TARGET: 18-25 seconds (achievable with PostgreSQL in v2.0)

═══════════════════════════════════════════════════════════
Cost Per Analysis (Current - Claude Sonnet 4.5):
═══════════════════════════════════════════════════════════
• FMP API calls: $0.002
• Anthropic Claude Sonnet 4.5: $0.03-0.05 (67% token reduction)
• Vercel compute: ~$0.001
─────────────────────────────
TOTAL: ~$0.032-0.052 (~3-5¢) per analysis

Alternative LLM Options:
• Google Gemini Flash 2.5: ~$0.013/analysis (lower cost)
• OpenAI GPT-4 Turbo: ~$0.10+/analysis (higher cost)
Configuration: Set in .env.example via LLM_PROVIDER variable

═══════════════════════════════════════════════════════════
Monthly Costs (10 beta users, 100 analyses/day):
═══════════════════════════════════════════════════════════
• Vercel Pro: $20
• FMP API: $29
• Anthropic Claude API: $90-150 (3,000 analyses/month @ ~$0.03-0.05)
• Upstash Redis: $0 (free tier)
─────────────────────────────
TOTAL: $139-199/month (v1.2.21 with Notion)

Future (v2.0 with PostgreSQL):
• Vercel Pro: $20
• FMP API: $29
• Anthropic Claude API: $90-150
• Supabase: $0-25
─────────────────────────────
TOTAL: $139-224/month
```

---

## Component Structure

### Directory Layout

```
stock-intelligence/
├── api/                      # Vercel serverless function endpoints
│   ├── analyze.ts            # Main analysis endpoint (390 LOC)
│   ├── webhook.ts            # Notion archive webhook (180 LOC)
│   ├── bypass.ts             # Bypass code activation (115 LOC)
│   ├── usage.ts              # Usage tracking endpoint (115 LOC)
│   ├── health.ts             # Health check endpoint (25 LOC)
│   ├── cron/                 # Scheduled cron jobs
│   │   └── scheduled-analyses.ts  # Daily analysis job (800s max duration)
│   └── jobs/                 # Background job endpoints
│       ├── market-context.ts      # Daily market context job (120s max duration)
│       └── stock-events.ts        # Weekly stock events ingestion (300s max duration) [v1.2.16]
│
├── lib/                      # Core business logic libraries
│   ├── orchestrator.ts       # Stock analysis orchestrator (522 LOC) [v1.0.5]
│   ├── stock-analyzer.ts     # Pure analysis logic (315 LOC) [v1.0.5]
│   ├── stock-events-ingestion.ts  # Event calendar ingestion (730 LOC) [v1.2.16]
│   ├── rate-limiter.ts       # Rate limiting + bypass sessions (340 LOC)
│   ├── scoring.ts            # Score calculation algorithms (850 LOC)
│   ├── notion-client.ts      # Notion API wrapper (600 LOC)
│   ├── fmp-client.ts         # FMP API client + event calendar (586 LOC) [v1.2.16]
│   ├── fred-client.ts        # FRED API client (150 LOC)
│   ├── errors.ts             # Custom error classes (180 LOC)
│   ├── logger.ts             # Logging utilities (80 LOC)
│   ├── validators.ts         # Input validation (120 LOC)
│   ├── utils.ts              # Helper functions (100 LOC)
│   ├── auth.ts               # Authentication helpers (60 LOC)
│   ├── notion-poller.ts      # Notion polling logic (200 LOC)
│   └── market/               # Market context system [v1.0.7+]
│       ├── context.ts        # Main market context API
│       ├── data-collector.ts # FMP/FRED data fetching
│       ├── regime-classifier.ts  # Risk-On/Off classification
│       ├── cache.ts          # Redis caching (1-hour TTL)
│       └── types.ts          # Type definitions
│
├── config/                   # Configuration schemas
│   ├── scoring-config.ts     # Scoring weights and thresholds
│   └── notion-schema.ts      # Database property mappings (8 databases) [v1.2.16]
│
├── scripts/                  # Testing and utility scripts
│   ├── test-analyze.ts       # Local analysis testing (240 LOC)
│   ├── test-notion-write.ts  # Notion write testing
│   ├── test-stock-events.ts  # Stock events pipeline testing [v1.2.16]
│   └── poll-notion.ts        # Manual polling script
│
├── docs/                     # Documentation
│   ├── RATE_LIMITING_SETUP.md
│   ├── USER_SETTINGS_PHASE1.md
│   ├── PHASE1_QUICKSTART.md
│   ├── NOTION_DATABASE_TEMPLATE.md
│   └── PHASE1_WEBHOOK_UPDATE.md
│
├── vercel.json               # Vercel configuration (CORS, timeouts)
├── package.json              # Dependencies and scripts
├── tsconfig.json             # TypeScript configuration
├── .env.v1.example           # Environment variable template
└── SETUP.md                  # Setup and deployment guide
```

### Core Components

#### 1. API Layer (`/api`)
**Purpose:** Serverless function endpoints exposed via Vercel

**Key Files:**
- `analyze.ts` - Main analysis orchestrator
  - Validates input
  - Checks rate limits
  - Fetches financial data
  - Calculates scores
  - Writes to Notion
  - Returns results + rate limit info

- `webhook.ts` - Notion automation trigger for archiving
  - Receives page data from Notion
  - Moves analysis to Stock History database
  - Updates status flags

- `bypass.ts` - Bypass code activation
  - Accepts URL params or JSON body
  - Validates bypass code
  - Creates Redis session (expires midnight UTC)

- `usage.ts` - Usage tracking (no quota consumption)
  - Returns current usage count
  - Shows remaining analyses
  - Indicates bypass status

#### 2. Business Logic Layer (`/lib`)
**Purpose:** Reusable, testable business logic

**Key Files:**

- `orchestrator.ts` - **Stock Analysis Orchestrator (v1.0.5)** ⭐
  - Eliminates redundant API calls across multiple users
  - Deduplication: Analyzes each ticker once, broadcasts to all subscribers
  - Priority queue: Pro > Analyst > Starter > Free
  - Rate limiting: Configurable delay between tickers (default 8s)
  - Fault isolation: One failure doesn't block others
  - Retry logic: Exponential backoff on LLM errors (503/429)
  - Dry-run mode: Test without API calls
  - **Impact:** 99.9% cost reduction at scale ($4,745/year → $4.75/year)
  - See [ORCHESTRATOR.md](ORCHESTRATOR.md) for details

- `stock-analyzer.ts` - **Pure Analysis Logic (v1.0.5)** ⭐
  - Extracted from `api/analyze.ts` for reusability
  - `analyzeStockCore()`: Fetches data, calculates scores, generates LLM analysis
  - `validateAnalysisComplete()`: Ensures all required fields populated
  - No HTTP/auth concerns - pure business logic
  - Shared by HTTP endpoint and orchestrator

- `stock-events-ingestion.ts` - **Stock Events Pipeline (v1.2.16)** ⭐
  - Fetches upcoming stock events from FMP (earnings, dividends, splits)
  - Deduplication pattern: Fetches each ticker once, distributes to all owners
  - Database discovery: Auto-finds Stock Events database in each user's workspace
  - Upsert logic: Creates if new, updates if exists (by ticker + event_type + date)
  - Graceful error handling: Logs warnings, continues processing (no cascade failures)
  - Runs weekly via cron (Sundays 12:00 UTC) for next 90 days of events
  - **Impact:** 99% API savings at scale (100 users sharing stocks)
  - See [CHANGELOG.md#v1.2.16](CHANGELOG.md) for full details

- `rate-limiter.ts` - Rate limiting engine
  - Redis key management (`rate_limit:{userId}:{date}`)
  - Bypass session management (`bypass_session:{userId}`)
  - TTL-based expiry (automatic midnight UTC reset)
  - Graceful degradation on Redis failure

- `scoring.ts` - Scoring algorithms
  - Technical score calculation (0-100)
  - Fundamental score calculation (0-100)
  - Composite score weighting
  - Pattern matching logic

- `notion-client.ts` - Notion API wrapper
  - Page read operations
  - Property updates (batch writes)
  - AI prompt execution
  - Database queries

- `fmp-client.ts` - Financial data fetching
  - Real-time quotes
  - Financial statements
  - Technical indicators
  - Profile/company info
  - **Event calendars (v1.2.16):** Earnings, dividends, stock splits, economic events

- `fred-client.ts` - Macro data fetching
  - Yield curve (DGS10, DGS2)
  - VIX volatility index
  - Economic indicators

- `errors.ts` - Custom error classes
  - `SageStocksError` (base class)
  - `RateLimitError` (429 status)
  - `ValidationError` (400 status)
  - `NotionError` (Notion API failures)
  - User-friendly error messages

#### 3. Configuration Layer (`/config`)
**Purpose:** Centralized configuration schemas

- `scoring-config.ts` - Scoring weights, thresholds, boundaries
- `notion-schema.ts` - Database property name mappings

---

## Data Flow

### Primary Analysis Flow

```
1. User Action (Notion)
   └─▶ Set "Request Analysis" = true in Stock Analyses database

2. Notion Automation
   └─▶ Trigger webhook: POST /api/webhook
       Body: { ticker, pageId, userId, ... }

3. Rate Limit Check
   └─▶ RateLimiter.checkAndIncrement(userId)
       ├─▶ Check bypass session (Redis)
       ├─▶ Check current count (Redis)
       └─▶ Allow or reject (429 error)

4. Data Fetching (Parallel)
   ├─▶ FMP Client: Quote, financials, technicals
   ├─▶ FRED Client: Macro indicators
   └─▶ Wait for all responses

5. Score Calculation
   ├─▶ Calculate technical score (0-100)
   ├─▶ Calculate fundamental score (0-100)
   ├─▶ Calculate composite score (weighted)
   └─▶ Detect patterns (breakout, reversal, etc.)

6. Notion Write
   ├─▶ Update page properties (batch write)
   ├─▶ Trigger AI analysis prompt
   └─▶ Set "Request Analysis" = false

7. Response
   └─▶ Return JSON with scores + rate limit info
```

### Orchestrator Flow (v1.0.5) ⭐

**Purpose:** Eliminate redundant API calls by analyzing each ticker once and broadcasting to all subscribers.

**Trigger:** Daily cron job at 6am PT via Vercel Cron

```
1. Cron Trigger
   └─▶ POST /api/cron/scheduled-analyses
       Headers: { Authorization: Bearer CRON_SECRET }

2. Request Collection (collectStockRequests)
   ├─▶ Get all beta users from database
   ├─▶ For each user:
   │   ├─▶ Decrypt OAuth token
   │   ├─▶ Query Stock Analyses DB (filter: Analysis Cadence = "Daily")
   │   └─▶ Extract ticker + subscriber info
   └─▶ Build deduplicated map: {ticker → [subscriber1, subscriber2, ...]}

3. Priority Queue Building (buildPriorityQueue)
   ├─▶ For each ticker, find highest subscriber tier:
   │   Pro (1) > Analyst (2) > Starter (3) > Free (4)
   ├─▶ Sort queue by priority (ascending)
   └─▶ Return ordered queue: [{ticker, priority, subscribers}, ...]

4. Queue Processing (processQueue)
   └─▶ For each ticker in queue:
       │
       ├─▶ 4a. Analyze with Retry (analyzeWithRetry)
       │   ├─▶ Call analyzeStockCore() once
       │   ├─▶ On LLM errors (503/429): retry with backoff (2s, 4s, 8s)
       │   └─▶ Return analysis result
       │
       ├─▶ 4b. Validate Completeness (validateAnalysisComplete)
       │   ├─▶ Check success flag
       │   ├─▶ Check scores > 0
       │   ├─▶ Check LLM content exists
       │   └─▶ Proceed only if complete
       │
       ├─▶ 4c. Broadcast to Subscribers (broadcastToSubscribers)
       │   ├─▶ Promise.allSettled([...]) - parallel with fault isolation
       │   ├─▶ For each subscriber:
       │   │   ├─▶ broadcastToUser() with retry (5s backoff)
       │   │   ├─▶ Write to Stock Analyses DB
       │   │   └─▶ (Stock History deferred to step 4d - see note below)
       │   └─▶ Log success/failure per user
       │
       ├─▶ 4d. Create Stock History for ALL Subscribers (v1.2.21 Fix) ⭐
       │   ├─▶ CRITICAL: Create entry for EACH subscriber, not just first
       │   ├─▶ Promise.allSettled([...]) - parallel with error isolation
       │   ├─▶ For each subscriber with successful broadcast:
       │   │   ├─▶ Create NotionClient with subscriber's credentials
       │   │   ├─▶ Call archiveToHistory(subscriber.pageId)
       │   │   └─▶ Write to subscriber's Stock History DB
       │   ├─▶ Log success/failure per subscriber
       │   └─▶ Continue even if some subscribers fail
       │
       └─▶ 4e. Rate Limit Delay
           └─▶ Wait ANALYSIS_DELAY_MS (default: 8000ms)
               Skip delay after last ticker

5. Metrics Collection
   ├─▶ totalTickers: Unique stocks analyzed
   ├─▶ totalSubscribers: Total users subscribed
   ├─▶ analyzed/failed: Success/failure counts
   ├─▶ broadcasts: Total/successful/failed
   ├─▶ apiCallsSaved: (subscribers - 1) × 17 calls per ticker
   └─▶ durationMs: Total execution time

6. Response
   └─▶ Return JSON with comprehensive metrics
```

**Key Benefits:**
- **Deduplication:** 1 analysis → N subscribers (99.9% API reduction at scale)
- **Priority-Based:** Premium users' stocks analyzed first
- **Fault Isolation:** One failure doesn't block others (Promise.allSettled)
- **Rate Limiting:** Configurable delay prevents API overload
- **Retry Logic:** Exponential backoff on transient errors
- **Dry-Run Mode:** Test logic without API calls (ORCHESTRATOR_DRY_RUN=true)

**Configuration:**
- `ANALYSIS_DELAY_MS`: Delay between tickers (default: 8000ms)
- `ORCHESTRATOR_DRY_RUN`: Test mode without API calls (default: false)
- `CHUNK_SIZE`: Stocks per chunk for chunked processing (default: 8, v1.2.0+)

**See:** [ORCHESTRATOR.md](ORCHESTRATOR.md) for complete documentation

---

### Stock History Creation Pattern (v1.2.21) ⭐

**CRITICAL ARCHITECTURAL NOTE:** When multiple users subscribe to the same ticker, Stock History must be created for ALL subscribers, not just the first one.

#### ❌ WRONG: Single-Subscriber Pattern (v1.2.20 Bug)

```typescript
// BUG: Only creates history for first subscriber
const firstSubscriber = item.subscribers[0];
const notionClient = createNotionClient({
  stockHistoryDbId: firstSubscriber.stockHistoryDbId,
});
await notionClient.archiveToHistory(firstSubscriber.pageId);
// Result: Only first subscriber gets Stock History entry
// Other subscribers get NOTHING
```

**Why This Failed:**
- Ticker AAPL has 3 subscribers: [grenager, stephie, shalomormsby]
- Analysis runs ONCE (correct) ✅
- Broadcast to ALL 3 users (correct) ✅
- Stock History created using `subscribers[0]` (WRONG) ❌
- Only grenager's database got entries
- stephie and shalomormsby databases remained empty

#### ✅ CORRECT: All-Subscribers Pattern (v1.2.21 Fix)

```typescript
// Create Stock History for EACH subscriber in parallel
const historyPromises = item.subscribers.map(async (subscriber, index) => {
  // Skip if this subscriber's broadcast failed
  const broadcastResult = broadcastResults[index];
  if (broadcastResult.status !== 'fulfilled') {
    return { email: subscriber.email, success: false, reason: 'broadcast_failed' };
  }

  try {
    // CRITICAL: Use EACH subscriber's credentials and database
    const notionClient = createNotionClient({
      apiKey: subscriber.accessToken,
      stockAnalysesDbId: subscriber.stockAnalysesDbId,
      stockHistoryDbId: subscriber.stockHistoryDbId,  // ← Each user's DB
      userId: subscriber.notionUserId,
      timezone: subscriber.timezone,
    });

    // Archive to THIS subscriber's Stock History DB
    const historyPageId = await notionClient.archiveToHistory(
      subscriber.pageId,  // ← Each user's page
      currentRegime
    );

    return { email: subscriber.email, success: true, historyPageId };
  } catch (error) {
    // Error isolation: one user's failure doesn't block others
    return { email: subscriber.email, success: false, reason: error.message };
  }
});

// Wait for all history creation attempts
const historyResults = await Promise.allSettled(historyPromises);
const successCount = historyResults.filter(r =>
  r.status === 'fulfilled' && r.value.success
).length;

console.log(`Stock History: ${successCount}/${item.subscribers.length} created`);
```

**Why This Works:**
- Each subscriber gets their OWN Stock History entry
- Parallel execution with `Promise.allSettled` for performance
- Error isolation: one user's failure doesn't block others
- Per-subscriber logging for observability
- No duplicates: exactly 1 entry per user per ticker per day

#### Key Principles

**1. Deduplication ≠ Single Creation**
- **Analyze once** per ticker (deduplication) ✅
- **Broadcast to ALL** subscribers ✅
- **Create history for ALL** subscribers ✅

**2. User Isolation**
- Each user has their own Stock Analyses database
- Each user has their own Stock History database
- Use each user's credentials to write to THEIR database

**3. Error Handling**
- Use `Promise.allSettled` for parallel execution
- One user's failure doesn't block others
- Log success/failure per subscriber
- Continue processing even if some fail

**4. Testing Requirements**
- MUST test with multiple users tracking same ticker
- Single-user testing will NOT catch this bug
- Verify ALL users receive entries, not just first
- Check for duplicates (should be exactly 1 per user per day)

#### Historical Context

**v1.2.19 → v1.2.20:**
- **Problem**: Created N duplicate Stock History entries (one per subscriber during broadcast)
- **Fix**: Moved creation to after broadcasts (step 4d)
- **Side Effect**: Only created for `subscribers[0]` ← **NEW BUG**

**v1.2.20 → v1.2.21:**
- **Problem**: Stock History only created for first subscriber
- **Fix**: Create for ALL subscribers in parallel
- **Result**: All users get entries, no duplicates ✅

**Lesson Learned:** Preventing duplicates doesn't mean creating once. It means creating once PER USER.

---

### Chunked Processing Architecture (v1.2.0) ⭐

**Problem:** Sequential processing of 15+ stocks exceeded Vercel's 800-second function timeout, causing 504 Gateway Timeout errors after ~11 stocks.

**Root Cause:**
- Execution time: 15 stocks × ~60s each + 14 delays × 8s = ~928 seconds (15.5 minutes)
- Vercel timeout limit: 800 seconds (13.3 minutes)
- Result: 4 stocks never reached the queue before timeout

**Solution:** Chunked processing using Upstash Redis queue persistence to split work across multiple cron invocations.

#### How It Works

**Architecture:**
```
Cron Invocation 1 (5:30 AM PT):
├─ Check Redis for existing queue → NOT FOUND
├─ Collect all stocks from all users (e.g., 15 stocks)
├─ Save queue to Redis: analysis_queue:YYYY-MM-DD
├─ Process first chunk: stocks 1-8 (CHUNK_SIZE=8)
│  └─ Execution: ~9 minutes (within 800s timeout ✅)
├─ Update Redis: processedCount = 8
└─ Return: { mode: 'first_run', chunk: 1/2, nextChunkAt: '5:45 AM PT' }

Cron Invocation 2 (5:45 AM PT):
├─ Check Redis for existing queue → FOUND
├─ Load queue from Redis
├─ Resume from processedCount: 8
├─ Process second chunk: stocks 9-15
│  └─ Execution: ~8 minutes (within 800s timeout ✅)
├─ Update Redis: processedCount = 15
├─ Delete queue (all chunks complete)
└─ Return: { mode: 'resume', chunk: 2/2, isComplete: true }
```

#### Cron Schedules

Two cron invocations hit the same endpoint with auto-resume logic:

```json
{
  "crons": [
    { "path": "/api/cron/scheduled-analyses", "schedule": "30 13 * * 1-5" },  // 5:30 AM PT
    { "path": "/api/cron/scheduled-analyses", "schedule": "45 13 * * 1-5" }   // 5:45 AM PT
  ]
}
```

#### Redis Queue Structure

**Queue Storage:**
```typescript
interface StoredQueue {
  id: string;                        // "analysis_queue:2025-12-01"
  items: QueueItem[];                // Full queue of stocks to process
  processedCount: number;            // How many items processed so far
  totalCount: number;                // Total items in queue
  createdAt: string;                 // ISO timestamp
  marketContext: MarketContext | null;  // Market context for this run
  chunkSize: number;                 // Items per chunk (default: 8)
  lastChunkAt?: string;              // ISO timestamp of last chunk
}
```

**Redis Key:** `analysis_queue:YYYY-MM-DD`
**TTL:** 24 hours (auto-cleanup)
**Storage:** Upstash Redis (already used for rate limiting)

#### Execution Flow

```
1. Cron Handler (/api/cron/scheduled-analyses)
   ├─▶ Verify cron secret
   ├─▶ Check NYSE market day
   └─▶ loadQueueFromRedis()
       │
       ├─▶ Queue NOT found (First Run):
       │   ├─ Fetch market context
       │   ├─ Get all beta users
       │   ├─ collectStockRequests(users) → Map<ticker, Subscriber[]>
       │   ├─ buildPriorityQueue(tickerMap) → QueueItem[]
       │   ├─ saveQueueToRedis(queue, marketContext, CHUNK_SIZE)
       │   ├─ processQueue(queue, marketContext, startIndex=0, maxItems=8)
       │   ├─ updateProcessedCount(queueId, 8)
       │   └─ Return: { mode: 'first_run', chunk: 1, totalChunks: 2, ... }
       │
       └─▶ Queue FOUND (Resume):
           ├─ Load queue from Redis
           ├─ startIndex = queue.processedCount
           ├─ remainingItems = queue.totalCount - startIndex
           ├─ itemsToProcess = min(CHUNK_SIZE, remainingItems)
           ├─ processQueue(queue.items, queue.marketContext, startIndex, itemsToProcess)
           ├─ updateProcessedCount(queueId, startIndex + itemsToProcess)
           ├─ if (all complete): deleteQueue(queueId)
           └─ Return: { mode: 'resume', chunk: 2, isComplete: true, ... }

2. processQueue() - Chunked Support
   ├─▶ Parameters: queue, marketContext, startIndex=0, maxItems=∞
   ├─▶ Calculate: endIndex = min(startIndex + maxItems, queue.length)
   ├─▶ Loop: for (i = startIndex; i < endIndex; i++)
   │   ├─ Set status to "Analyzing"
   │   ├─ analyzeWithRetry(item, 3, marketContext)
   │   ├─ validateAnalysisComplete(result)
   │   ├─ broadcastToSubscribers(subscribers, result)
   │   ├─ archiveToHistory(firstSubscriber, marketRegime)
   │   └─ delay(ANALYSIS_DELAY_MS) if not last
   └─▶ Return metrics with chunk info
```

#### Response Format

**First Run (5:30 AM PT):**
```json
{
  "success": true,
  "marketDay": true,
  "mode": "first_run",
  "chunk": 1,
  "totalChunks": 2,
  "processedItems": 8,
  "totalTickers": 15,
  "analyzed": 8,
  "failed": 0,
  "broadcasts": { "total": 24, "successful": 24, "failed": 0 },
  "durationSec": "537.0",
  "isComplete": false,
  "nextChunkAt": "5:45 AM PT (13:45 UTC)"
}
```

**Resume Run (5:45 AM PT):**
```json
{
  "success": true,
  "marketDay": true,
  "mode": "resume",
  "chunk": 2,
  "totalChunks": 2,
  "processedItems": 15,
  "totalTickers": 15,
  "analyzed": 7,
  "failed": 0,
  "broadcasts": { "total": 21, "successful": 21, "failed": 0 },
  "durationSec": "490.0",
  "isComplete": true
}
```

#### Key Implementation Files

**New Files (v1.2.0):**
- `lib/orchestration/queue-storage.ts` (360 lines)
  - `saveQueueToRedis()` - Store queue with 24h TTL
  - `loadQueueFromRedis()` - Retrieve queue for resume
  - `updateProcessedCount()` - Track progress across invocations
  - `deleteQueue()` - Cleanup when complete
  - `getQueueStatus()` - Monitoring/debugging helper

**Modified Files:**
- `lib/orchestration/orchestrator.ts`
  - Added `startIndex` and `maxItems` parameters to `processQueue()`
  - Updated logging to show chunk progress
  - Version bumped to v1.2.0

- `api/cron/scheduled-analyses.ts`
  - Complete rewrite with resume logic
  - Auto-detects first run vs resume from Redis
  - Enhanced response with chunk metadata

#### Performance Improvements

| Metric | Before (v1.1.0) | After (v1.2.0) | Improvement |
|--------|-----------------|----------------|-------------|
| **Max Stocks/Day** | 11 stocks | 15+ stocks | **+36%** |
| **Timeout Risk** | 504 errors after 11 stocks | None (chunked) | **100% eliminated** |
| **Execution Time** | 15 min (timeout) | 9 min + 8 min (17 min total) | Stable |
| **Infrastructure Cost** | $0 | $0 | No change (uses existing Redis) |
| **Scalability** | 11 stocks max | 50+ stocks (with 3+ chunks) | **5x scalability** |

#### Configuration

**Environment Variables:**
```bash
# Number of stocks to process per chunk (default: 8)
# - 8 stocks: ~9 minutes per chunk (safe for 800s timeout)
# - 10 stocks: ~11 minutes per chunk (approaches limit)
# - 12+ stocks: Risk of timeout
CHUNK_SIZE=8
```

**Scaling Example (20+ stocks):**
Add third cron schedule in `vercel.json`:
```json
{
  "crons": [
    { "path": "/api/cron/scheduled-analyses", "schedule": "30 13 * * 1-5" },  // 5:30 AM
    { "path": "/api/cron/scheduled-analyses", "schedule": "45 13 * * 1-5" },  // 5:45 AM
    { "path": "/api/cron/scheduled-analyses", "schedule": "0 14 * * 1-5" }    // 6:00 AM
  ]
}
```

#### Benefits

✅ **Eliminates 504 timeouts** - Each chunk stays well under 800s limit
✅ **Zero new infrastructure costs** - Uses existing Upstash Redis
✅ **Maintains multi-tenant security** - Same security model as v1.1.0
✅ **Preserves deduplication benefits** - Still analyzes each ticker once
✅ **Easy monitoring** - Same cron logs, enhanced with chunk metadata
✅ **Auto-cleanup** - Redis TTL removes stale queues after 24 hours
✅ **Graceful resume** - Picks up exactly where it left off
✅ **Production-ready** - Fault isolation and error handling included

#### Multi-Tenancy Support

Chunked processing is fully compatible with Sage Stocks' multi-tenant architecture:

- ✅ Queue stored globally but contains per-user subscriber lists
- ✅ Each broadcast uses user-specific OAuth tokens and database IDs
- ✅ Error isolation preserved (`Promise.allSettled` in broadcasting)
- ✅ No cross-tenant data leakage
- ✅ Same security guarantees as sequential processing

**Queue Item Structure (Multi-Tenant Aware):**
```typescript
interface QueueItem {
  ticker: string;                 // e.g., "AAPL"
  priority: number;               // 1 (Pro) to 4 (Free)
  subscribers: Subscriber[];      // All users needing this ticker
  requestedAt: Date;
}

interface Subscriber {
  userId: string;                 // Unique user ID
  email: string;                  // User email
  tier: string;                   // Pro/Analyst/Starter/Free
  accessToken: string;            // User's OAuth token (encrypted)
  stockAnalysesDbId: string;      // User's Stock Analyses database
  stockHistoryDbId: string;       // User's Stock History database
  // ... other user-specific fields
}
```

During broadcasting, each subscriber gets their own Notion client:
```typescript
const notionClient = createNotionClient({
  apiKey: subscriber.accessToken,           // User-specific token
  stockAnalysesDbId: subscriber.stockAnalysesDbId,  // User's database
  stockHistoryDbId: subscriber.stockHistoryDbId,    // User's database
  userId: subscriber.notionUserId,
  timezone: subscriber.timezone,
});

await notionClient.syncToNotion(analysisData);  // Writes to user's workspace only
```

This ensures complete data isolation between users while maintaining the efficiency gains of deduplication.

---

### Bypass Code Flow

```
1. User Input
   └─▶ GET /api/bypass?userId=XXX&code=YYY
       (Or POST with JSON body)

2. Code Validation
   ├─▶ Extract code from URL params or body
   ├─▶ Compare to env var (RATE_LIMIT_BYPASS_CODE)
   └─▶ Accept or reject

3. Session Creation
   └─▶ Redis SET bypass_session:{userId} = "1"
       EXPIREAT = next_midnight_UTC

4. Future Requests
   └─▶ RateLimiter checks session first
       If exists → unlimited access
       If expired → normal rate limiting
```

### Usage Check Flow

```
1. User Request
   └─▶ GET /api/usage?userId=XXX

2. Bypass Check
   ├─▶ Check Redis for active session
   └─▶ If bypassed → return { remaining: 999 }

3. Normal Count
   ├─▶ GET rate_limit:{userId}:{date}
   └─▶ Return { used: N, remaining: 10-N }

4. Response
   └─▶ JSON with usage data (no quota consumed)
```

---

## API Endpoints

### `/api/analyze` (POST)
**Purpose:** Execute stock analysis and return results (requires authentication)

**Authentication:** Session token in cookie (encrypted, from Notion OAuth)

**Request:**
```json
{
  "ticker": "AAPL",
  "userId": "user-notion-page-id-from-session"
}
```

**Headers:**
```
Cookie: session=<encrypted-session-token>
```

**Response (200):**
```json
{
  "success": true,
  "ticker": "AAPL",
  "compositeScore": 72.5,
  "technicalScore": 68.0,
  "fundamentalScore": 77.0,
  "recommendation": "HOLD",
  "pattern": "CONSOLIDATION",
  "metrics": { /* full data object */ },
  "rateLimit": {
    "remaining": 7,
    "total": 10,
    "resetAt": "2025-11-01T00:00:00.000Z",
    "bypassed": false
  }
}
```

**Response (429 - Rate Limit):**
```json
{
  "success": false,
  "error": {
    "code": "USER_RATE_LIMIT_EXCEEDED",
    "message": "Daily analysis limit reached. Your limit will reset at Oct 31, 11:59 PM PT.",
    "statusCode": 429
  }
}
```

**Headers:**
- `X-RateLimit-Remaining` - Analyses remaining
- `X-RateLimit-Total` - Total daily limit
- `X-RateLimit-Reset` - ISO 8601 reset timestamp

**Configuration:**
- Timeout: 300 seconds (5 minutes)
- CORS: Enabled (all origins)

---

### `/api/bypass` (GET/POST)
**Purpose:** Activate bypass code for unlimited analyses

**Method 1: URL Parameters (GET)**
```bash
GET /api/bypass?userId=user-123&code=secret-bypass-code
```

**Method 2: JSON Body (POST)**
```json
POST /api/bypass
{
  "userId": "user-123",
  "code": "secret-bypass-code"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Bypass code activated successfully",
  "expiresAt": "2025-11-01T00:00:00.000Z"
}
```

**Response (400 - Invalid Code):**
```json
{
  "success": false,
  "error": "Invalid bypass code"
}
```

**Configuration:**
- Timeout: 60 seconds (default)
- Session expires: Midnight UTC

---

### `/api/setup` (GET/POST)
**Purpose:** First-time user onboarding - auto-detect or manually configure user's Notion databases

**Why This Exists:** When users duplicate the Sage Stocks template, Notion creates brand new database IDs unique to their workspace. The backend needs to discover and store these IDs to know where to write analysis results for each user. This is the foundation of the multi-user SaaS architecture.

#### GET - Auto-Detection
**Authentication:** Session token in cookie (encrypted, from Notion OAuth)

**Request:**
```bash
GET /api/setup
```

**Response (200 - Not Yet Setup):**
```json
{
  "alreadySetup": false,
  "detection": {
    "stockAnalysesDb": {
      "id": "abc123...",
      "title": "Stock Analyses",
      "score": 0.85,
      "confidence": "high"
    },
    "stockHistoryDb": {
      "id": "def456...",
      "title": "Stock History",
      "score": 0.87,
      "confidence": "high"
    },
    "sageStocksPage": {
      "id": "ghi789...",
      "title": "Sage Stocks",
      "url": "https://notion.so/...",
      "score": 1.0,
      "confidence": "high"
    }
  },
  "needsManual": false
}
```

**Response (200 - Already Setup):**
```json
{
  "alreadySetup": true,
  "redirect": "/analyze"
}
```

**Response (200 - Partial Detection, Manual Fallback Needed):**
```json
{
  "alreadySetup": false,
  "detection": {
    "stockAnalysesDb": { /* found */ },
    "stockHistoryDb": null,  // Not found
    "sageStocksPage": { /* found */ }
  },
  "needsManual": true
}
```

**How Auto-Detection Works:**

1. **Search User's Workspace** (via their OAuth token)
   - Queries all databases using Notion search API
   - Queries all pages using Notion search API
   - Returns 100+ databases/pages typically

2. **Scoring Algorithm** (`lib/template-detection.ts`)
   - **Title Matching** (30% weight): "Stock Analyses", "Stock History", etc.
   - **Required Properties** (50% weight): Must have all required props (e.g., Ticker, Composite Score, Recommendation)
   - **Optional Properties** (20% weight): Bonus points for having optional props
   - **Property Types**: Small bonus for correct types (number, select, date, etc.)

3. **Confidence Levels**
   - **High** (>0.8): Title + all required props + most optional props match
   - **Medium** (0.6-0.8): Title or props match, but not perfect
   - **Low** (0.5-0.6): Minimal match, might be wrong database
   - **Failed** (<0.5): Rejected, not shown to user

4. **Threshold**: Databases must score ≥0.5 to be considered a match

**Criteria for Stock Analyses:**
```typescript
{
  titleMatches: ['Stock Analyses', 'Analyses', 'Stock Analysis'],
  requiredProps: ['Ticker', 'Composite Score', 'Recommendation'],
  optionalProps: ['Technical Score', 'Fundamental Score', 'Analysis Date', 'Current Price', 'Status']
}
```

**Criteria for Stock History:**
```typescript
{
  titleMatches: ['Stock History', 'History', 'Price History'],
  requiredProps: ['Ticker', 'Analysis Date', 'Current Price'],
  optionalProps: ['Technical Score', 'Composite Score', 'Volume', 'Recommendation']
}
```

#### POST - Confirm Setup (Auto or Manual)
**Purpose:** Save detected or manually-provided database IDs to Beta Users database

**Request:**
```json
{
  "stockAnalysesDbId": "abc123...",
  "stockHistoryDbId": "def456...",
  "sageStocksPageId": "ghi789..."
}
```

**Validation:** Backend verifies:
1. ✅ Can read from Stock Analyses database (via user's OAuth token)
2. ✅ Can write to Stock Analyses database (test query)
3. ✅ Can read from Stock History database
4. ✅ Can read from Sage Stocks page
5. ❌ Returns detailed errors if any validation fails

**Response (200 - Success):**
```json
{
  "success": true,
  "redirect": "/analyze",
  "message": "Setup completed successfully!"
}
```

**Response (400 - Validation Failed):**
```json
{
  "success": false,
  "errors": [
    {
      "field": "stockAnalysesDbId",
      "message": "Cannot access Stock Analyses database. Make sure your Notion integration has access to this database.",
      "helpUrl": "https://docs.notion.com/reference/intro#integrations"
    }
  ]
}
```

**What Gets Stored in Beta Users Database:**
```typescript
{
  "Stock Analyses DB ID": "abc123...",
  "Stock History DB ID": "def456...",
  "Sage Stocks Page ID": "ghi789...",
  "Template Version": "1.0.0",
  "Setup Completed At": "2025-11-11T20:00:00.000Z"
}
```

**Configuration:**
- Timeout: 60 seconds (default)
- Auto-detection searches up to 1000 databases/pages (10 batches of 100)

---

### `/api/debug-reset-setup` (POST)
**Purpose:** [DEBUG ONLY] Clear user's stored database IDs to enable re-testing of setup flow

**Authentication:** Session token in cookie (encrypted, from Notion OAuth)

**Request:**
```bash
POST /api/debug-reset-setup
```

**Response (200):**
```json
{
  "success": true,
  "message": "Setup reset successfully - you can now test auto-detection again"
}
```

**What It Clears:**
- Stock Analyses DB ID → empty
- Stock History DB ID → empty
- Sage Stocks Page ID → empty
- Template Version → empty
- Setup Completed At → null

**Note:** This is a temporary debugging endpoint added in v1.1.7. Can be removed after Cohort 1 is stable.

**Configuration:**
- Timeout: 60 seconds (default)

---

### `/api/debug/market-context` (GET)
**Purpose:** [DIAGNOSTICS] Display current market context status, cache health, and API connectivity

**Added:** v1.0.8b - For debugging market context availability issues

**Authentication:** None (public diagnostic endpoint)

**Request:**
```bash
GET /api/debug/market-context
```

**Response (200 - All Systems Operational):**
```json
{
  "timestamp": "2025-11-18T05:47:09.167Z",
  "environment": {
    "variables": {
      "FMP_API_KEY": true,
      "FRED_API_KEY": true,
      "UPSTASH_REDIS_REST_URL": true,
      "UPSTASH_REDIS_REST_TOKEN": true
    },
    "allConfigured": true
  },
  "cache": {
    "metadata": {
      "exists": true,
      "age": 10314,
      "ttl": 3590
    },
    "hasCached": true,
    "cachedRegime": "Transition",
    "cachedTimestamp": "2025-11-18T05:50:38.950Z"
  },
  "fresh": {
    "success": true,
    "regime": "Transition",
    "regimeConfidence": 0.5785714285714286,
    "vix": 19.83,
    "spy": {
      "symbol": "SPY",
      "price": 665.67,
      "change1D": -0.93164,
      "change5D": 0,
      "change1M": 0,
      "ma50": 668.4784,
      "ma200": 613.1523
    }
  }
}
```

**Response (500 - Market Context Fetch Failed):**
```json
{
  "timestamp": "2025-11-18T05:47:09.167Z",
  "environment": {
    "variables": { /* ... */ },
    "allConfigured": true
  },
  "cache": {
    "metadata": { "exists": false },
    "hasCached": false
  },
  "fresh": {
    "success": false,
    "error": {
      "message": "Request failed with status code 429",
      "name": "AxiosError",
      "stack": ["Error: Request failed...", "at createError...", "at settle..."]
    }
  }
}
```

**What It Shows:**
- **Environment Variables:** Which API keys and Redis credentials are configured
- **Cache Metadata:** Whether cache exists, age in milliseconds, TTL in seconds
- **Cached Data:** Current cached regime, timestamp (if cache hit)
- **Fresh Fetch:** Attempts to fetch fresh market context and reports success/error
- **Market Data:** Current market regime, VIX level, SPY performance

**Common Diagnostics:**

| Condition | Meaning | Action |
|-----------|---------|--------|
| `cache.ttl: -1` | Cache expired but not deleted | Normal (Redis garbage collection pending) |
| `cache.ttl: 3600` | Fresh cache (1 hour TTL) | Optimal state |
| `cache.hasCached: false` | No valid cached data | Fresh fetch will occur on next analysis |
| `fresh.success: false` | API fetch failed | Check error message for rate limit (429) or timeout |
| `environment.allConfigured: false` | Missing API keys | Check Vercel environment variables |

**Redis Cache Implementation Details:**
- **Cache Key:** `market:context:v1`
- **TTL:** 3600 seconds (1 hour)
- **Format:** Direct JSON of MarketContext object
- **Upstash API:** Uses `?EX=3600` query parameter (not JSON body)
- **Expiration Check:** Validates `ttl > 0` before returning cached data
- **Fallback:** Returns neutral market context if fetch fails

**Note:** This endpoint always performs a **force refresh** (bypasses cache for fetch test), so it will always show the result of attempting a fresh API call. The cache metadata reflects the state before the forced refresh.

**Production URL:**
```
https://sagestocks.vercel.app/api/debug/market-context
```

**Configuration:**
- Timeout: 60 seconds (default)
- Public access (no authentication required)

---

### `/api/usage` (GET)
**Purpose:** Check current usage without consuming quota

**Request:**
```bash
GET /api/usage?userId=user-123
```

**Response (200):**
```json
{
  "success": true,
  "usage": {
    "used": 3,
    "remaining": 7,
    "total": 10,
    "resetAt": "2025-11-01T00:00:00.000Z",
    "bypassed": false
  }
}
```

**Response (Bypassed):**
```json
{
  "success": true,
  "usage": {
    "used": 0,
    "remaining": 999,
    "total": 10,
    "resetAt": "2025-11-01T00:00:00.000Z",
    "bypassed": true
  }
}
```

---

### `/api/webhook` (POST)
**Purpose:** Notion automation trigger for archiving

**Request:**
```json
{
  "ticker": "AAPL",
  "pageId": "notion-page-id-xyz",
  "action": "archive"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Page archived successfully"
}
```

**Configuration:**
- Timeout: 60 seconds
- Called by: Notion automation ("Send to History" button)

---

### `/api/health` (GET)
**Purpose:** Health check and API information

**Response (200):**
```json
{
  "status": "ok",
  "version": "1.0.0-beta.1",
  "timestamp": "2025-11-09T10:00:00.000Z",
  "environment": "production",
  "auth": {
    "enabled": true,
    "method": "Notion OAuth (session-based)"
  },
  "endpoints": [
    {
      "path": "/api/analyze",
      "method": "POST",
      "description": "Analyze a stock and sync to Notion",
      "requiresAuth": true
    },
    {
      "path": "/api/auth/authorize",
      "method": "GET",
      "description": "Initiate Notion OAuth flow",
      "requiresAuth": false
    }
  ],
  "config": {
    "timeouts": {
      "analyze": 300,
      "webhook": 60,
      "default": 30
    }
  }
}
```

**Configuration:**
- Timeout: 10 seconds
- No authentication required

---

### `/api/auth/authorize` (GET)
**Purpose:** Initiate Notion OAuth flow with template duplication prevention (v1.1.1, enhanced v1.2.5)

**Query Parameters:**
- `existing_user` (optional) - Set to `"true"` by frontend if user has existing session/setup

**Response:** HTTP 302 redirect to Notion authorization URL

**Template Duplication Prevention (v1.2.5):**

Prevents duplicate "Sage Stocks" templates when users re-authenticate (e.g., after API upgrades, session expiry). Uses a **3-layer detection system**:

| Layer | Detection Method | When It Works | Status Logged |
|-------|-----------------|---------------|---------------|
| **1. URL Parameter** | Frontend passes `?existing_user=true` based on localStorage or cookie | User has `sage_stocks_setup_complete` flag OR session cookie | `existing_via_param` |
| **2. Expired Cookie** | Session cookie exists but Redis session expired | Common during re-authentication after 24-hour TTL | `expired_session_cookie` |
| **3. Valid Session** | Active Redis session with completed setup | User has valid session and database IDs configured | `setup_complete` |

**Decision Flow:**
```typescript
// Layer 1: Frontend detection
if (req.query.existing_user === 'true') → Skip template_id

// Layer 2: Cookie presence (even if expired)
else if (hasSessionCookie && sessionExpired) → Skip template_id  // Conservative approach

// Layer 3: Valid session check
else if (validSession && setupComplete) → Skip template_id

// Default: New user
else → Include template_id in OAuth URL
```

**Why Layer 2 is Critical:**
- When users re-authenticate after session expiry, Redis no longer has their session data
- Previous fix (v1.2.4) only checked valid sessions, which failed for expired sessions
- Layer 2 detects cookie **presence** (not validity) and assumes returning user
- Conservative approach: Better to skip template for edge-case new users than duplicate for existing users

**Logging:**
All detections are logged with `detectionMethod` field for debugging:
- `url_parameter` - Frontend detected existing user
- `expired_cookie` - Cookie exists but Redis session expired
- `valid_session` - Active session with setup complete
- `no_cookie` - New user (no cookie detected)
- `error` - Detection failed, defaulting to new user

---

### `/api/auth/callback` (GET)
**Purpose:** Handle OAuth callback from Notion (v1.1.1)

**Query Parameters:**
- `code` - OAuth authorization code from Notion
- `state` - CSRF protection token

**Response:** HTTP 302 redirect to appropriate page based on user status

---

### `/api/auth/session` (GET)
**Purpose:** Check current session status (v1.1.1)

**Response:**
```json
{
  "authenticated": true,
  "userId": "notion-page-id",
  "status": "approved",
  "email": "user@example.com"
}
```

---

### `/api/setup` (GET/POST)
**Purpose:** Template setup and auto-detection (v1.1.6)

**GET Response:**
```json
{
  "detected": {
    "stockAnalysesDb": {
      "id": "db-id",
      "title": "Stock Analyses",
      "confidence": 0.95
    },
    "stockHistoryDb": {
      "id": "db-id",
      "title": "Stock History",
      "confidence": 0.90
    },
    "sageStocksPage": {
      "id": "page-id",
      "title": "Sage Stocks",
      "confidence": 0.85
    }
  }
}
```

**POST Body:**
```json
{
  "stockAnalysesDbId": "validated-db-id",
  "stockHistoryDbId": "validated-db-id",
  "sageStocksPageId": "validated-page-id"
}
```

---

### `/api/upgrade` (POST)
**Purpose:** Template version upgrade (v1.1.6)

**Request:**
```json
{
  "targetVersion": "0.1.0",
  "confirmDataSafety": true
}
```

**Response:**
```json
{
  "success": true,
  "upgradedFrom": "1.0.0",
  "upgradedTo": "0.1.0",
  "changesApplied": [
    "Added Market Intelligence database",
    "Updated Stock Analyses schema",
    "Added template version tracking"
  ],
  "timestamp": "2025-11-09T10:00:00.000Z"
}
```

---

## External Integrations

### 1. Upstash Redis
**Purpose:** Distributed state for rate limiting

**Connection:**
- REST API (no TCP connections)
- Endpoint: `UPSTASH_REDIS_REST_URL`
- Auth: Bearer token (`UPSTASH_REDIS_REST_TOKEN`)

**Data Stored:**
- Rate limit counters: `rate_limit:{userId}:{YYYY-MM-DD}`
- Bypass sessions: `bypass_session:{userId}`

**Commands Used:**
- `GET` - Retrieve count/session
- `INCR` - Increment counter
- `EXPIREAT` - Set TTL to midnight UTC
- `SET` + `EXPIREAT` - Create session with expiry

**Free Tier Limits:**
- 10,000 commands per day
- 256 MB storage
- Automatic eviction (LRU)

**Failure Handling:**
- Graceful degradation (fails open)
- Logs error but allows request
- No Redis = no rate limiting (intentional)

---

### 2. Financial Modeling Prep (FMP)
**Purpose:** Stock data provider

**Endpoint:** `https://financialmodelingprep.com/api/v3/`

**Data Fetched:**
- Real-time quotes (`/quote/{ticker}`)
- Financial statements (`/income-statement/{ticker}`)
- Balance sheets (`/balance-sheet-statement/{ticker}`)
- Technical indicators (`/technical_indicator/daily/{ticker}`)
- Company profile (`/profile/{ticker}`)

**Pricing:**
- Starter: $22/month
- Professional: $29/month (current plan)

**Rate Limits:**
- 250 requests per minute
- 10,000 requests per day

**Error Handling:**
- Retry with exponential backoff
- Custom `APIResponseError` class
- Logs all API failures

---

### 3. FRED API (Federal Reserve Economic Data)
**Purpose:** Macroeconomic indicators

**Endpoint:** `https://api.stlouisfed.org/fred/series/observations`

**Data Fetched:**
- 10-Year Treasury Yield (`DGS10`)
- 2-Year Treasury Yield (`DGS2`)
- VIX Volatility Index (`VIXCLS`)
- Unemployment Rate (`UNRATE`)

**Pricing:** Free (public API)

**Rate Limits:**
- 120 requests per minute
- No daily limit

**Error Handling:**
- Falls back gracefully on failure
- Macros are optional for analysis

---

### 4. Notion API
**Purpose:** Database integration and UI

**Connection:**
- Official SDK: `@notionhq/client`
- Auth: Integration token (`NOTION_API_TOKEN`)

**Operations:**
- Read pages (`pages.retrieve`)
- Update properties (`pages.update`)
- Query databases (`databases.query`)
- Execute AI prompts (via page comments)

**Databases Used:**
- **Stock Analyses** - Active analysis workspace
  - Ticker (title)
  - Request Analysis (checkbox)
  - Composite Score (number)
  - Technical Score (number)
  - Fundamental Score (number)
  - Recommendation (select)
  - Pattern (select)
  - Last Updated (date)
  - Content Status (select)

- **Stock History** - Archive of past analyses
  - Same schema as Stock Analyses
  - Read-only for user

**Rate Limits:**
- 3 requests per second (per integration)
- Retry-After header respected

**Error Handling:**
- Exponential backoff on 429 errors
- Custom `NotionError` class
- Detailed logging

---

## Rate Limiting Architecture

### Design Goals
1. **User-level quotas** - 10 analyses per user per day
2. **Distributed state** - Works across serverless instances
3. **Automatic reset** - Midnight UTC daily reset
4. **Bypass mechanism** - Session-based unlimited access
5. **Graceful degradation** - Fails open if Redis unavailable

### Implementation

#### Redis Key Schema
```
rate_limit:{userId}:{YYYY-MM-DD}     # Daily counter
  - Value: Integer (0-10)
  - TTL: Expires at midnight UTC
  - Commands: INCR, GET, EXPIREAT

bypass_session:{userId}              # Bypass session
  - Value: "1" (existence check only)
  - TTL: Expires at midnight UTC
  - Commands: SET, GET, EXPIREAT
```

#### Rate Limit Check Algorithm
```typescript
async checkAndIncrement(userId: string): Promise<RateLimitResult> {
  // Priority 1: Check for active bypass session
  if (await hasActiveBypass(userId)) {
    return { allowed: true, remaining: 999, bypassed: true };
  }

  // Priority 2: Check if rate limiting is disabled (dev mode)
  if (!this.enabled) {
    return { allowed: true, remaining: 999, bypassed: false };
  }

  // Priority 3: Normal rate limiting
  const key = getRateLimitKey(userId);  // rate_limit:user-123:2025-10-31
  const count = await getCount(key);     // GET from Redis

  if (count >= maxAnalyses) {
    return { allowed: false, remaining: 0 };
  }

  // Increment counter and set expiry
  await increment(key, resetAt);         // INCR + EXPIREAT
  return { allowed: true, remaining: maxAnalyses - (count + 1) };
}
```

#### Bypass Code Activation
```typescript
async activateBypass(userId: string, code: string): Promise<boolean> {
  // Validate code against environment variable
  if (code !== process.env.RATE_LIMIT_BYPASS_CODE) {
    return false;
  }

  // Create session with expiry at midnight UTC
  const key = `bypass_session:${userId}`;
  const midnight = getNextMidnightUTC();

  await redis.set(key, "1");
  await redis.expireat(key, Math.floor(midnight.getTime() / 1000));

  return true;
}
```

#### Midnight UTC Reset
```typescript
function getNextMidnightUTC(): Date {
  const now = new Date();
  const tomorrow = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + 1,
      0, 0, 0, 0
    )
  );
  return tomorrow;
}
```

### Configuration
```bash
# Enable/disable rate limiting
RATE_LIMIT_ENABLED=true

# Daily quota per user
RATE_LIMIT_MAX_ANALYSES=10

# Bypass code (change to revoke all sessions)
RATE_LIMIT_BYPASS_CODE=your-secret-code

# Upstash Redis connection
UPSTASH_REDIS_REST_URL=https://your-redis-url.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-redis-token
```

### Error Handling

**Scenario 1: Redis unavailable**
```typescript
try {
  // Attempt rate limit check
} catch (error) {
  log(LogLevel.ERROR, 'Redis connection failed', { error });
  // Fail open - allow request
  return { allowed: true, remaining: 999 };
}
```

**Scenario 2: Rate limit exceeded**
```typescript
if (!rateLimitResult.allowed) {
  throw new RateLimitError(rateLimitResult.resetAt);
  // Returns 429 status with user-friendly message
}
```

**Scenario 3: Invalid bypass code**
```typescript
if (code !== expectedCode) {
  return res.status(400).json({
    success: false,
    error: 'Invalid bypass code'
  });
}
```

---

## Security Model

### Multi-User SaaS Architecture (v1.1.x)

**The Database ID Mapping Problem:**

When a user duplicates the Sage Stocks template, Notion creates **completely new database IDs** unique to their workspace:

```
Template Creator:
  Stock Analyses DB = abc123...
  Stock History DB = def456...

User A (after duplication):
  Stock Analyses DB = xyz789...  (different!)
  Stock History DB = uvw012...  (different!)

User B (after duplication):
  Stock Analyses DB = lmn345...  (different!)
  Stock History DB = opq678...  (different!)
```

**Why Setup & Detection Are Critical:**

The backend needs to know **which databases belong to which user** to:

1. **Write analysis results to the correct user's database**
   - User A requests NVDA analysis → writes to `xyz789...` (User A's Stock Analyses)
   - User B requests NVDA analysis → writes to `lmn345...` (User B's Stock Analyses)
   - Prevents data leakage between users

2. **Query historical data from the correct user's database**
   - "User A's previous analyses" → queries `xyz789...`
   - "User B's previous analyses" → queries `lmn345...`

3. **Enforce per-user quotas and tracking**
   - User A: 3/5 analyses used today
   - User B: 1/5 analyses used today
   - Tracked in Beta Users database by user ID

4. **Personalize features based on user's data**
   - "You've analyzed 47 stocks this month" (counts pages in user's Stock Analyses DB)
   - "Your portfolio is heavy on tech sector" (reads user's holdings)

**The Setup Flow (First-Time Onboarding):**

1. **User duplicates template** → Gets their own databases with unique IDs
2. **User logs in via Notion OAuth** → System gets their email and OAuth token
3. **Auto-detection runs** (`/api/setup` GET):
   - Searches user's workspace for databases (using their OAuth token)
   - Scores each database against expected schema
   - Finds "Stock Analyses" and "Stock History" with high confidence
4. **User confirms or manually corrects** → IDs validated and stored
5. **Backend stores mapping in Beta Users database:**
   ```
   Email: user@example.com
   Stock Analyses DB ID: xyz789...
   Stock History DB ID: uvw012...
   ```

**Every Future Request Uses This Mapping:**

```typescript
// User requests NVDA analysis
1. validateSession(req) → email = "user@example.com"
2. getUserByEmail(email) → row from Beta Users DB
3. stockAnalysesDbId = row.stockAnalysesDbId // "xyz789..."
4. Run analysis, write to xyz789... using user's OAuth token
5. Only their workspace is affected
```

**Security Benefits:**

- ✅ Each user's OAuth token can only access **their** workspace
- ✅ Backend never mixes data between users (scoped by database ID)
- ✅ User data never leaves their Notion workspace
- ✅ No shared databases = no data leakage risk
- ✅ Admin integration (NOTION_API_KEY) only accesses Beta Users DB (metadata only)

**What Breaks Without Setup:**

- ❌ Can't run analyses - don't know where to write results
- ❌ Can't support multiple users - would overwrite each other's data
- ❌ Can't track usage - don't know which user made which request
- ❌ Can't personalize - don't know user's historical data

This setup flow is the **foundation of the entire multi-user SaaS platform**. The auto-detection bug fix in v1.1.7 was critical because it would have forced all Cohort 1 users into manual fallback (30% abandonment rate).

---

### ⚠️ CRITICAL: User-Specific Database IDs (v1.2.0+)

**The Rule:** NEVER use global environment variables for database IDs. ALWAYS use user-specific IDs from the user record.

**Why This Matters:**

In v1.2.0, we implemented the subway map setup flow where each user duplicates the template and gets their own unique database IDs stored in:
- `user.stockAnalysesDbId` - User's Stock Analyses database
- `user.stockHistoryDbId` - User's Stock History database
- `user.sageStocksPageId` - User's Sage Stocks page

**The Bug (Fixed in Production):**

Initially, both `api/analyze.ts` and `lib/orchestrator.ts` used global environment variables:

```typescript
// ❌ WRONG - Uses same database for ALL users
const stockAnalysesDbId = process.env.STOCK_ANALYSES_DB_ID;
const stockHistoryDbId = process.env.STOCK_HISTORY_DB_ID;
```

This caused:
- User A's analysis to write to User B's database (or fail completely)
- Orchestrator to query wrong databases for each user
- Complete multi-user failure

**The Fix:**

```typescript
// ✅ CORRECT - Uses each user's specific database
const stockAnalysesDbId = user.stockAnalysesDbId;
const stockHistoryDbId = user.stockHistoryDbId;

// Validate user has completed setup
if (!stockAnalysesDbId) {
  throw new Error('Stock Analyses database not configured. Please complete setup at https://sagestocks.vercel.app/');
}
```

**Files That MUST Use User-Specific IDs:**

1. **[api/analyze.ts](api/analyze.ts#L229-L231)** - Stock analysis endpoint
   ```typescript
   const stockAnalysesDbId = user.stockAnalysesDbId;
   const stockHistoryDbId = user.stockHistoryDbId;
   ```

2. **[lib/orchestrator.ts](lib/orchestrator.ts#L38-L48)** - Batch processing
   ```typescript
   export interface Subscriber {
     // ... other fields
     stockAnalysesDbId: string;  // User's specific DB ID
     stockHistoryDbId: string;   // User's specific DB ID
   }
   ```
   - Passes database IDs when creating subscribers
   - Uses `subscriber.stockAnalysesDbId` in `broadcastToUser()`

**Files That MAY Use Global Env Vars:**

- **[api/webhook.ts](api/webhook.ts)** - Admin operations only (uses `NOTION_API_KEY`, not OAuth)
- **Test scripts** - For development/testing purposes

**How to Verify Multi-User Support:**

```bash
# Check that user-specific IDs are used
grep -r "process.env.STOCK_ANALYSES_DB_ID" api/ lib/
# Should only appear in webhook.ts and test files

# Verify user object has database IDs
grep "stockAnalysesDbId" lib/auth.ts
# Should see it in User interface and mapNotionPageToUser()
```

**Testing Multi-User Scenarios:**

1. Create two test accounts with different email addresses
2. Each duplicates the template (gets unique database IDs)
3. User A analyzes AAPL → verify it writes to User A's database
4. User B analyzes AAPL → verify it writes to User B's database (separate instance)
5. Check that databases don't cross-contaminate

**Why This Architecture Decision:**

We chose user-specific duplicated templates over shared databases because:
- ✅ **Privacy** - Each user's data stays in their Notion workspace
- ✅ **Security** - OAuth tokens are scoped per workspace
- ✅ **Customization** - Users can modify their template without affecting others
- ✅ **Scalability** - Notion API rate limits are per-workspace, not shared
- ✅ **Data ownership** - Users own their analysis data

This is fundamentally different from traditional SaaS (shared PostgreSQL), but aligns with Notion's workspace model.

---

### Authentication
**Current:** Notion OAuth 2.0 (v1.1.1+)
- Official Notion OAuth integration
- Session token stored in encrypted cookie
- Token validated on every request
- User approval status checked (approved/pending/denied)

**User Identification:**
- Email from Notion OAuth
- Notion User ID from OAuth response
- Beta Users database lookup by email
- Database IDs retrieved from Beta Users record

### Authorization
**Rate Limiting:** Primary access control mechanism
- 10 analyses per user per day
- Bypass code for admin/beta testers
- No payment or subscription system (yet)

**Notion Integration:**
- Integration token stored in environment
- Scoped to specific workspace
- No user credentials stored

### Secrets Management
**Vercel Environment Variables:**
- API keys (FMP, FRED, Notion)
- Redis credentials (Upstash)
- Bypass code
- All secrets encrypted at rest

**Local Development:**
- `.env` file (gitignored)
- `.env.v1.example` template provided
- Secrets never committed to git

### Input Validation
**Ticker Symbols:**
- Alphanumeric + hyphen only
- Max length: 10 characters
- Uppercase normalization

**User IDs:**
- Alphanumeric + hyphen + underscore
- Max length: 100 characters
- Required for rate limiting

**Request Bodies:**
- JSON schema validation
- Type checking via TypeScript
- Zod schemas (optional validation)

### CORS Configuration
**Allowed Origins:** `*` (public API)
**Allowed Methods:** `GET, POST, OPTIONS`
**Allowed Headers:** `Content-Type, Authorization, X-API-Key`

**Rationale:** Personal tool, not sensitive data

### Error Handling
**User-Facing Errors:**
- No stack traces exposed
- Generic error messages
- HTTP status codes (400, 429, 500)

**Internal Logging:**
- Full error details logged
- Vercel logging dashboard
- No PII in logs

---

## Deployment Architecture

### Platform: Vercel Serverless

**Function Configuration:**
```json
{
  "functions": {
    "api/analyze.ts": { "maxDuration": 300 },               // 5 minutes
    "api/webhook.ts": { "maxDuration": 60 },                // 1 minute
    "api/health.ts": { "maxDuration": 10 },                 // 10 seconds
    "api/cron/scheduled-analyses.ts": { "maxDuration": 800 } // 13 minutes (Pro plan max with Fluid Compute)
  },
  "crons": [
    {
      "path": "/api/cron/scheduled-analyses",
      "schedule": "0 13 * * *"  // 5:00 AM PT (13:00 UTC) daily
    }
  ]
}
```

**Timeout Configuration (v1.0.6):**
- **Pro Plan Limit**: 800 seconds (13 minutes) with Vercel Fluid Compute
- **Cron Function**: Requires explicit `export const maxDuration = 800` in TypeScript file
- **Current Usage**: ~780 seconds for 13 stocks (~60s per stock)
- **Buffer**: 20-second margin for future growth
- **Node Version**: Pinned to `20.x` (prevents auto-upgrades)

**Build Process:**
1. TypeScript compilation (`tsc --noEmit` for type checking)
2. Vercel packages functions automatically
3. Deploy to edge network (global CDN)

**Cold Start Optimization:**
- Minimal dependencies
- Lazy loading of heavy libraries
- Connection pooling avoided (Redis REST API)

### CI/CD Pipeline

**GitHub Integration:**
```
1. Push to main branch (GitHub Desktop or CLI)
   └─▶ Triggers Vercel deployment

2. Vercel Build
   ├─▶ Install dependencies (npm install)
   ├─▶ Type check (npm run type-check)
   ├─▶ Package functions
   └─▶ Deploy to production

3. Deployment Complete (~30-60 seconds)
   └─▶ Health check automatically validates
```

**Rollback:**
- Vercel dashboard allows instant rollback
- Each deployment preserved for 30 days
- Git history allows code-level rollback

### Environment Management

**Production (Vercel):**
- All secrets in Vercel dashboard
- Environment variables encrypted
- Accessible only to functions at runtime

**Local Development:**
- `.env` file with dev credentials
- `vercel dev` command for testing
- Test scripts (`npm run test:analyze`)

### Monitoring

**Vercel Dashboard:**
- Function execution logs
- Error rates and stack traces
- Performance metrics (duration, cold starts)
- Rate limit tracking (manual via logs)

**Logging Strategy:**
- `LogLevel.INFO` - Request lifecycle
- `LogLevel.WARN` - Graceful failures (Redis down)
- `LogLevel.ERROR` - Unexpected errors

---

## Configuration

### Environment Variables

```bash
# === Core API Keys ===
NOTION_API_TOKEN=secret_xxxxxxxxxxxxx
FMP_API_KEY=your_fmp_api_key_here
FRED_API_KEY=your_fred_api_key_here

# === Notion Database IDs ===
NOTION_ANALYSES_DB_ID=xxxxxxxxxxxxxxxx
NOTION_HISTORY_DB_ID=xxxxxxxxxxxxxxxx

# === Rate Limiting (Upstash Redis) ===
UPSTASH_REDIS_REST_URL=https://your-redis-url.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_redis_token_here
RATE_LIMIT_ENABLED=true
RATE_LIMIT_MAX_ANALYSES=10
RATE_LIMIT_BYPASS_CODE=your_bypass_code_here

# === Authentication ===
API_KEY=your_api_key_here

# === Optional: Development ===
NODE_ENV=development
LOG_LEVEL=INFO
```

### Scoring Configuration

**File:** `config/scoring-config.ts` and `lib/scoring.ts`

**Current Composite Score Weights (v1.1.6):**
- **Technical Score: 30%** - Price action, momentum, volume, RSI, MACD
- **Fundamental Score: 35%** - Financials, valuation, P/E ratio, EPS, debt/equity
- **Macro Score: 20%** - Economic conditions, Fed policy, yield curve, VIX
- **Risk Score: 15%** - Volatility, beta, market cap

**Note:** Sentiment and Sector scores are calculated independently but NOT weighted in the composite score (they provide additional context).

**⚠️ Historical Note:** Earlier versions (v1.0.0-alpha) used different weights. Current production weights are documented in [lib/scoring.ts:73-78](lib/scoring.ts#L73-L78).

**Score Scale:**
- All individual scores: 1.0-5.0 scale
- Composite score: Weighted average of Technical + Fundamental + Macro + Risk

**Recommendation Boundaries:**
- Strong Buy: 4.5-5.0
- Buy: 3.5-4.4
- Hold: 2.5-3.4
- Sell: 1.5-2.4
- Strong Sell: 1.0-1.4

**Customizable:** Edit `lib/scoring.ts` weights and redeploy

### Notion Schema

**File:** `config/notion-schema.ts`

**Property Mappings:**
- Ticker → Title property
- Scores → Number properties
- Recommendation → Select property
- Pattern → Select property

**Flexible:** Supports custom property names

---

## Design Decisions

### 1. **Serverless Architecture**
**Decision:** Use Vercel serverless functions instead of long-running servers

**Rationale:**
- No server maintenance required
- Auto-scaling (0 to N instances)
- Pay only for usage (~$0/month at current scale)
- Global edge network (low latency)

**Trade-offs:**
- Cold starts (~1-2 seconds)
- No persistent connections (hence Redis REST API)
- Function timeout limits (300 seconds max on Pro)

---

### 2. **Upstash Redis for Rate Limiting**
**Decision:** Use Upstash Redis instead of Vercel KV or Edge Config

**Rationale:**
- Better free tier (10,000 commands vs 1,000 requests)
- REST API perfect for serverless (no TCP connections)
- Built-in TTL expiry (automatic midnight reset)
- Industry-standard Redis commands

**Alternatives Considered:**
- Vercel KV: More expensive, similar features
- Edge Config: Read-only, not suitable for counters
- Database: Too slow, overkill for counters

---

### 3. **Session-Based Bypass Codes**
**Decision:** Store bypass sessions in Redis instead of passing code with every request

**Rationale:**
- Better UX (enter code once, use all day)
- More secure (code not exposed in URLs/logs repeatedly)
- Easy revocation (change environment variable)
- Automatic expiry (midnight UTC)

**Alternatives Considered:**
- Stateless JWT: More complex, harder to revoke
- API key per user: Requires user management system
- No bypass: Blocks admin testing

---

### 4. **TypeScript Over JavaScript**
**Decision:** Use TypeScript for all code

**Rationale:**
- Type safety catches errors at compile time
- Better IDE support (autocomplete, refactoring)
- Self-documenting code (types as documentation)
- Industry standard for production systems

**Trade-offs:**
- Compilation step required
- Slight learning curve

---

### 5. **Notion as Primary UI**
**Decision:** Use Notion databases instead of building custom web UI

**Rationale:**
- User already lives in Notion
- Zero frontend maintenance
- Flexible schema (Notion handles CRUD)
- AI integration built-in (Notion AI)

**Trade-offs:**
- Notion API rate limits (3 req/sec)
- Webhook limitations (discovered in v1.0.1)
- Dependent on third-party platform

---

### 6. **Fail Open on Redis Errors**
**Decision:** Allow requests if Redis is unavailable

**Rationale:**
- Personal tool, not mission-critical
- Better UX than hard failures
- Temporary outages shouldn't block usage

**Alternatives Considered:**
- Fail closed: More secure but worse UX
- Queue requests: Too complex for personal tool

---

### 7. **FMP + FRED Over Polygon/Alpha Vantage**
**Decision:** Consolidated to FMP for stock data + FRED for macros

**Rationale:**
- Single provider simplifies integration
- FMP has all needed data (technical + fundamental)
- FRED is authoritative for macro data (Federal Reserve)
- Cost-effective ($22-29/month vs $200+ for Polygon)

**Previous Stack (v0.x):**
- Polygon + Alpha Vantage + FRED
- More expensive, more API keys to manage

---

### 8. **No Frontend Framework (Yet)**
**Decision:** Backend-only system, Notion for UI

**Rationale:**
- Simplicity (no React/Next.js complexity)
- Faster development (focus on API logic)
- User preference (Notion-native workflow)

**Future Consideration:**
- v1.0.1 exploring Notion-native vs HTML vs Next.js
- Phased validation approach (build simplest first)

---

### 9. **Global CORS (Allow All Origins)**
**Decision:** Allow all origins instead of whitelisting

**Rationale:**
- Public API, not sensitive data
- Simplifies Notion webhook integration
- Personal tool, not enterprise system

**Security Note:**
- Rate limiting provides primary access control
- No user credentials exposed
- All secrets server-side only

---

### 10. **Composite Scoring Model**
**Decision:** Weighted combination of technical + fundamental scores

**Rationale:**
- Balanced view (not just charts, not just financials)
- Customizable weights (60/40 current split)
- Pattern matching adds context (breakout, reversal)

**Alternative Considered:**
- ML-based scoring: Too complex, requires training data
- Single-dimension scoring: Misses important signals

---

### 11. **Critical Operations Require Retry Logic**
**Decision:** All critical Notion API operations use retry logic with exponential backoff (v1.2.3)

**Rationale:**
- Notion API has occasional service outages (`service_unavailable` errors)
- Critical operations (like saving database IDs during setup) cannot silently fail
- Retry logic converts transient failures into successful operations
- Better UX than immediate failure or long timeouts

**Implementation:**
- `withRetry` utility with 3 attempts, exponential backoff (2s, 4s, 8s delays)
- Total retry time: ~14 seconds (vs 10-minute timeout)
- Preserve Notion error codes (`NOTION_SERVICE_UNAVAILABLE`, `NOTION_RATE_LIMITED`)
- `isRetryableError` identifies transient vs permanent failures

**Critical Operations Using Retry Logic:**
1. **getUserByEmail** ([lib/auth.ts](lib/auth.ts))
   - Used in setup detection and analysis endpoints
   - Preserves specific Notion error codes for retry decisions
   - Prevents immediate failure on temporary Notion outages

2. **updateUserDatabaseIds** ([api/setup/detect.ts](api/setup/detect.ts))
   - Saves stockAnalysesDbId, stockHistoryDbId, sageStocksPageId
   - **Marked as CRITICAL** - setup fails if this doesn't succeed
   - Prevents "silent failure" where setup shows success but analysis fails later

**Key Learnings (v1.2.3 Bug Fix):**

**Problem:** Setup would show "success" but first analysis would fail with "Database not configured"
- Root cause: `updateUserDatabaseIds` was marked "non-critical" and silently failed during Notion outages
- Database IDs weren't saved, but user saw "Setup complete!"

**Solution:**
1. Never mark critical operations as "non-critical" - if the system can't work without it, it must succeed or fail explicitly
2. Preserve error codes - don't swallow specific errors with generic messages
3. Add retry logic to all Notion API calls in critical paths
4. Fail fast with clear errors - don't let operations appear successful when they haven't completed

**Alternatives Considered:**
- No retry logic: Too brittle, poor UX during Notion outages
- Infinite retries: Risk of hanging requests
- Circuit breaker: Too complex for current scale

**Future Consideration:**
- Circuit breaker pattern if Notion outages become more frequent
- Health check endpoint to pre-validate Notion availability

---

### 12. **LLM Hallucination Prevention via Data Grounding & Historical Isolation**
**Decision:** Ground LLM analysis in 100% factual API data and isolate historical context with explicit warnings (v1.0.6)

**Problem Context:**

Stock analyses suffered from two critical hallucination issues:
1. **Temporal Confusion:** LLM referenced "December 2024" and "Q4 2024" as future events in November 2025
2. **Price Hallucination:** Entry zones showed $168-174 when actual price was $276.98 (~40% below market)

**Root Causes:**
1. `currentMetrics` object only contained **scores**, not raw API data (price, volume, P/E, etc.)
2. No `currentDate` field in `AnalysisContext` - LLM had no temporal awareness
3. Historical analysis dates (e.g., `previousAnalysis.date = "2024-12-15"`) "leaked" into current analysis
4. LLM pattern-matched historical dates without warnings → used them as future catalysts

**Solution Implementation:**

**1. Data Grounding (33 New Fields Added to Context)**

Expanded `currentMetrics` from 7 fields (scores only) to 40 fields (all API data):

```typescript
// BEFORE (api/analyze.ts:586)
const analysisContext: AnalysisContext = {
  ticker: tickerUpper,
  currentMetrics: {
    compositeScore: scores.composite,
    technicalScore: scores.technical,
    fundamentalScore: scores.fundamental,
    // ... only 7 score fields
  }
};

// AFTER (api/analyze.ts:586-638)
const analysisContext: AnalysisContext = {
  ticker: tickerUpper,
  currentDate: new Date().toISOString().split('T')[0], // "2025-11-16"
  currentMetrics: {
    // Scores (7 fields - original)
    compositeScore: scores.composite,
    technicalScore: scores.technical,
    // ... etc

    // Company Profile (3 new fields)
    companyName: fundamental.company_name,
    sector: fmpData.profile.sector,
    industry: fmpData.profile.industry,

    // Technical Data (11 new fields - ALL from FMP API)
    currentPrice: technical.current_price,  // ← Fixes price hallucination
    ma50: technical.ma_50,
    ma200: technical.ma_200,
    rsi: technical.rsi,
    volume: technical.volume,
    avgVolume: technical.avg_volume_20d,
    volatility30d: technical.volatility_30d,
    priceChange1d: technical.price_change_1d,
    priceChange5d: technical.price_change_5d,
    priceChange1m: technical.price_change_1m,
    week52High: technical.week_52_high,
    week52Low: technical.week_52_low,

    // Fundamental Data (6 new fields - ALL from FMP API)
    marketCap: fundamental.market_cap,
    peRatio: fundamental.pe_ratio,
    eps: fundamental.eps,
    revenueTTM: fundamental.revenue_ttm,
    debtToEquity: fundamental.debt_to_equity,
    beta: fundamental.beta,

    // Macro Data (6 new fields - ALL from FRED API)
    fedFundsRate: macro.fed_funds_rate,
    unemployment: macro.unemployment,
    consumerSentiment: macro.consumer_sentiment,
    yieldCurveSpread: macro.yield_curve_spread,
    vix: macro.vix,
    gdp: macro.gdp,
  }
};
```

**2. Historical Data Isolation Pattern**

Wrapped all historical dates with explicit before/after warnings:

```typescript
// lib/llm/prompts/shared.ts:160-178
if (previousAnalysis && deltas) {
  prompt += `**Changes Since Previous Analysis (${deltas.priceDeltas?.daysElapsed || '?'} days ago):**\n`;

  // ⚠️ WARNING BEFORE
  prompt += `⚠️ NOTE: The date "${previousAnalysis.date}" below is HISTORICAL REFERENCE ONLY. Do NOT use it in your "Key Dates" section!\n\n`;

  // Historical data shown here
  prompt += `- Previous analysis: ${previousAnalysis.date} (${deltas.priceDeltas?.daysElapsed || '?'} days ago - this is PAST data for comparison only)\n`;
  // ... delta details

  // ⚠️ WARNING AFTER
  prompt += `\n⚠️ REMINDER: The date ${previousAnalysis.date} above is in the PAST. It is for historical comparison ONLY. Do NOT reference it in "Key Dates" or as a future catalyst.\n\n`;
}
```

**3. Multi-Layer Temporal Awareness**

Created four defensive layers:

**Layer 1: Date Calculation & Display** ([lib/llm/prompts/shared.ts:182-231](lib/llm/prompts/shared.ts:182-231))
```typescript
const [year, month] = currentDate.split('-').map(Number);
const currentQuarter = Math.ceil(month / 3); // Q1=1-3, Q2=4-6, Q3=7-9, Q4=10-12

// Build explicit past/future quarter lists
const pastQuarters: string[] = [];    // ["Q1 2024", "Q2 2024", "Q3 2024", "Q4 2024"]
const futureQuarters: string[] = [];  // ["Q4 2025", "Q1 2026", "Q2 2026", ...]
```

**Layer 2: Forbidden Phrases Blacklist**
```typescript
prompt += `**FORBIDDEN PHRASES (DO NOT USE THESE):**\n`;
prompt += `- ❌ ANY mention of "${year - 1}" as a future date\n`;
prompt += `- ❌ "December ${year - 1}" / "Dec ${year - 1}"\n`;
prompt += `- ❌ "Q4 ${year - 1} earnings" (unless clearly marked as PAST)\n`;
prompt += `- ❌ "Check Q4 ${year - 1} calendar"\n`;
```

**Layer 3: Allowed Phrases Whitelist**
```typescript
prompt += `**ALLOWED PHRASES (Use these instead):**\n`;
prompt += `- ✅ "Next earnings report" / "Upcoming earnings"\n`;
prompt += `- ✅ "Next Fed meeting" / "Upcoming Fed decision"\n`;
prompt += `- ✅ "Q${currentQuarter} ${year} earnings" (current quarter)\n`;
```

**Layer 4: Output Template Constraints** ([lib/llm/prompts/shared.ts:253-259](lib/llm/prompts/shared.ts:253-259))
```typescript
prompt += `**Key Dates Section Rules (CRITICAL):**\n`;
prompt += `- The "Key Dates" section in your output MUST contain ONLY future events\n`;
prompt += `- Use generic language ONLY: "Upcoming earnings", "Next Fed meeting"\n`;
prompt += `- DO NOT use dates from the "Changes Since Previous Analysis" section above - those are PAST dates for comparison only\n`;
```

**Rationale:**

**Why Data Grounding is Critical:**
- LLMs hallucinate when lacking factual grounding in prompt context
- Training data is outdated (cutoff dates vary by model)
- Scores alone don't anchor LLM to reality - need raw numbers (price, volume, P/E, etc.)
- Contextual comparisons (e.g., "currently at 73% of 52-week range") prevent numeric hallucination

**Why Historical Isolation is Critical:**
- LLMs are pattern-matching machines, not temporal reasoners
- Seeing "2024-12-15" in context → LLM infers "Q4 2024" is relevant → uses it in output
- Without explicit warnings, LLM treats all dates in context as potentially current/future
- Multi-layer constraints needed because single warnings are easily ignored

**Impact:**

✅ **Eliminates temporal hallucinations** - Past dates no longer referenced as future
✅ **Eliminates price hallucinations** - LLM uses real-time API data ($276.98) instead of training data ($168-174)
✅ **Systemic protection** - All future analyses inherit these safeguards via shared prompt template
✅ **Defensive prompt design** - Assumes LLM will fail unless explicitly constrained

**Files Modified:**
- [lib/llm/types.ts](lib/llm/types.ts) - Added `currentDate` field to `AnalysisContext`
- [api/analyze.ts](api/analyze.ts) - Expanded `currentMetrics` (7 fields → 40 fields)
- [lib/stock-analyzer.ts](lib/stock-analyzer.ts) - Same changes for orchestrator path
- [lib/llm/prompts/shared.ts](lib/llm/prompts/shared.ts) - 300+ lines rewritten with data display + temporal logic

**Architectural Principles Established:**

**1. LLM Prompt Engineering Best Practices**
- **Ground in Facts:** Pass ALL raw API data, not just derived scores
- **Isolate Historical Context:** Wrap past dates with before/after warnings
- **Multi-Layer Constraints:** Blacklists + whitelists + examples + output rules
- **Explicit Temporal Logic:** Calculate and display current date, year, quarter, past/future lists
- **Defensive Design:** Assume LLM will pattern-match historical data unless explicitly blocked

**2. Historical Data Isolation Pattern (Reusable)**
```
⚠️ WARNING: <historical_date> is PAST data for comparison only
<historical data shown here>
⚠️ REMINDER: Do NOT use <historical_date> in current analysis
```

This pattern must be applied to:
- Previous stock analyses (✅ implemented)
- Historical stock prices (future consideration)
- Past earnings reports (future consideration)
- Any temporal context that could confuse LLM

**3. Context Expansion Strategy**
- Always pass raw API data, not just aggregated/derived values
- Add contextual comparisons (e.g., "73% of 52-week range", "+12.3% above MA50")
- Include interpretations (e.g., "RSI 75 (overbought)", "P/E 28.5 (high vs sector avg)")
- More context = less hallucination = higher quality output

**Trade-offs:**

**Cons:**
- Increased prompt token count (~500 tokens added)
- Slightly higher LLM API costs ($0.013 → $0.015 per analysis)
- More complex prompt maintenance (300+ line template)

**Pros:**
- Eliminated hallucinations completely (verified with GOOG analysis)
- Grounded in 100% factual real-time data
- Protects ALL future analyses from this class of bugs
- Clear documentation prevents regression

**Alternatives Considered:**

1. **LLM Fine-Tuning:** Too expensive, requires training data, doesn't solve temporal awareness
2. **Post-Processing Validation:** Would catch errors but not prevent them, worse UX
3. **Simpler Prompts:** Tested - LLM ignored subtle hints, needs explicit constraints
4. **Single Warning Layer:** Insufficient - LLM pattern-matched historical dates despite warnings

**Future Considerations:**

1. **Automated Prompt Testing:** Create test suite to validate temporal awareness
2. **Token Usage Monitoring:** Track prompt token growth as more fields are added
3. **Context Compression:** If tokens become issue, use tabular format instead of prose
4. **Provider Comparison:** Test if different LLMs (GPT-4, Claude) need different constraint styles

**Key Learning:**

LLM hallucinations are **architectural issues**, not bugs. They require **systematic prevention** via:
- Comprehensive data grounding (pass all factual context)
- Explicit constraints (blacklists, whitelists, examples)
- Historical data isolation (warnings before/after past dates)
- Multi-layer reinforcement (don't rely on single defense)

This fix establishes a **defensive prompt engineering pattern** that should be applied to all LLM integrations in the system.

---

## Future Enhancements

### v1.1: Enhanced Analysis Features
- Insider trading analysis (requires FMP Pro upgrade)
- Market regime classification (Risk-On/Risk-Off)
- Sector strength rankings
- Brave Search API for market intelligence

### v2.0: Full Automation
- Scheduled jobs (GitHub Actions/Vercel Cron)
- Autonomous portfolio monitoring
- Intelligent digest notifications
- Historical trend analysis
- Market Context dashboard

### Infrastructure
- Upstash Redis Analytics (monitoring usage patterns)
- Vercel Pro upgrade (300-second timeouts)
- CDN caching for repeated tickers
- WebSocket support for real-time updates

---

## Additional Resources

**Setup Documentation:**
- [SETUP.md](SETUP.md) - Environment setup and deployment
- [TESTING.md](TESTING.md) - Testing procedures and validation
- [ROADMAP.md](ROADMAP.md) - Project roadmap and progress

**Rate Limiting Documentation:**
- [RATE_LIMITING_SETUP.md](RATE_LIMITING_SETUP.md) - Complete Upstash setup guide
- [.env.v1.example](.env.v1.example) - Environment variable template

**User Settings Documentation:**
- [USER_SETTINGS_PHASE1.md](USER_SETTINGS_PHASE1.md) - Notion-native implementation
- [PHASE1_QUICKSTART.md](PHASE1_QUICKSTART.md) - Quick start guide
- [PHASE1_WEBHOOK_UPDATE.md](PHASE1_WEBHOOK_UPDATE.md) - Webhook blocker fix

---

**Questions or Issues?**
Contact: Shalom Ormsby
Project Repository: [GitHub](https://github.com/shalomormsby/stock-intelligence) (if applicable)
