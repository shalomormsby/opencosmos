# AGENTS.md

*AI agent instructions for Sage Stocks development*

---

## Project Overview

Sage Stocks is a stock analysis platform with a two-layer architecture:

- **Math layer:** Deterministic calculations based on professional-grade financial metrics (zero hallucination risk)
- **Interpretation layer:** AI analysis applying proven investment frameworks (Buffett, Dalio, Lynch) systematically

**Design Philosophy:** Transform volatility into opportunity with calm confidence. Impeccable but simple. Personal decision-support tool for daily stock analyses, not enterprise software.

**Current Version:** v0.1.0 (User-facing) / v1.2.21 (Development)

**Versioning Strategy:** Dual-track versioning system:
- **User-facing version** (v0.1.0 Beta): Shown in UI, templates, and public documentation
- **Development version** (v1.2.21): Used internally for milestone tracking and changelogs
- See [CHANGELOG.md](CHANGELOG.md) for detailed version mapping

**Stack:**

- Platform: Vercel Serverless Functions (300-800s timeout, Node.js 20+)
- Language: TypeScript 5.3+ (~14,800 LOC)
- Data: FMP API (stock data), FRED API (economic data), Upstash Redis (rate limiting + caching)
- Integration: Notion API v5.4.0 (database operations, migrating to PostgreSQL in v2.0)
- LLM: Provider-agnostic abstraction (Anthropic Claude Sonnet 4.5 primary, Google Gemini and OpenAI alternatives)

---

## Setup Commands

**Installation:**

```bash
npm install
```

**Development:**

```bash
npm run dev
```

**Testing:**

```bash
# Local unit tests
npm run test:orchestrator

# Live integration tests (hits real APIs)
npm run test:orchestrator:real
```

**Type Checking:**

```bash
npm run type-check
```

**Deployment:**

- Push to `main` branch → Vercel auto-deploys
- Manual deploy via Vercel dashboard if needed
- Always verify environment variables are set in Vercel before deploying
- Build command runs `npm run type-check` automatically

---

## Code Style & Standards

- **TypeScript strict mode** - No `any` types without explicit justification
- **Functional patterns preferred** - Pure functions over classes when possible
- **Provider-agnostic abstractions** - LLM provider, data sources should be swappable via config
- **Explicit error handling** - No silent failures; log errors with context
- **Comments for "why," not "what"** - Code should be self-documenting; explain non-obvious decisions
- **Single quotes, semicolons optional** - Match existing codebase style

**Naming conventions:**

- Functions: `camelCase` with verb prefixes (`getMarketContext`, `calculateScore`)
- Constants: `SCREAMING_SNAKE_CASE` for true constants
- Types/Interfaces: `PascalCase` (`MarketContext`, `AnalysisResult`)
- Files: `kebab-case.ts` for modules (e.g., `rate-limiter.ts`, `market-context.ts`)
- Classes: `PascalCase` (e.g., `NotionClient`, `FMPClient`, `LLMFactory`)

---

## Architecture Principles

### 🚨 Critical: Zero Financial Hallucinations

**Rule #1:** LLMs NEVER generate financial data. Only analysis and interpretation.

- ✅ **Correct:** Fetch metrics from FMP API → Pass to LLM as structured context → LLM analyzes
- ❌ **Wrong:** Ask LLM "What is AAPL's P/E ratio?" and trust the response

**Why:** A single hallucinated metric destroys user trust permanently. Our core differentiator is "0% hallucination risk."

**Implementation:**

- All financial data from verified APIs (FMP, FRED)
- LLM prompts include data as structured context, not questions
- Validation layers cross-reference data points
- Analysis outputs clearly labeled as interpretations, not facts

### Other Key Principles

- **Serverless-native:** REST APIs only, no persistent connections, stateless functions
- **Multi-tenant:** Per-user database isolation via OAuth, no shared state between users
- **Graceful degradation:** Fail open on rate limit errors, log but don't crash on API timeouts
- **1-hour cache for market context:** Balances freshness with API efficiency (Redis cache, 3600s TTL)
- **Provider-agnostic:** Swap LLM providers via env var without code changes

---

## API Endpoints (Vercel Serverless Functions)

### Core Analysis Endpoints

| Endpoint | Method | Timeout | Description |
| --- | --- | --- | --- |
| `/api/analyze` | POST | 300s | Full stock analysis workflow (market context → data fetch → scoring → LLM analysis → Notion sync) |
| `/api/health` | GET | 10s | Health check (uptime, version, API status) |
| `/api/webhook` | POST | 60s | Notion webhook handler (deprecated in v1.2.21, returns 410 Gone) |

### Authentication & Session Management

| Endpoint | Method | Description |
| --- | --- | --- |
| `/api/auth/authorize` | GET | Initiates Notion OAuth flow, redirects to authorization page |
| `/api/auth/callback` | GET/POST | Handles OAuth callback, exchanges code for access token |
| `/api/auth/check-email` | GET/POST | Validates user email and checks registration status |
| `/api/auth/logout` | GET/POST | Clears user session and removes authentication cookies |
| `/api/auth/session` | GET | Returns current authenticated user session info |

### Rate Limiting & Usage

| Endpoint | Method | Description |
| --- | --- | --- |
| `/api/bypass` | POST | Activate rate limit bypass code session |
| `/api/usage` | GET | Check remaining analysis quota (non-consuming) |

### User Onboarding & Setup

| Endpoint | Method | Description |
| --- | --- | --- |
| `/api/setup` | GET/POST | Primary setup handler - validates user and database access |
| `/api/setup/advance` | POST | Advance user through setup wizard stages |
| `/api/setup/detect` | POST | Auto-detect Notion template databases using scoring algorithm |
| `/api/setup/check-template` | POST | Validate user has access to required template databases |
| `/api/setup/status` | GET | Return current user setup progress and status |
| `/api/setup/template-url` | POST | Validate and store Notion template page URL |

### Template Version Management

| Endpoint | Method | Description |
| --- | --- | --- |
| `/api/upgrade` | GET/POST | Template upgrade handler - shows status and applies version upgrades |
| `/api/upgrade/health` | GET | Check current template version and compatibility |

### Admin Endpoints (Requires Admin Auth)

| Endpoint | Method | Description |
| --- | --- | --- |
| `/api/admin/approve` | POST | Approve or deny user access (admin only) |
| `/api/admin/users` | GET | List all beta users and their approval status (admin only) |
| `/api/admin/stats` | GET | Display admin statistics dashboard (admin only) |

### Scheduled Jobs (Vercel Cron)

| Endpoint | Method | Schedule | Timeout | Description |
| --- | --- | --- | --- | --- |
| `/api/cron/scheduled-analyses` | POST | 5:30 & 5:45 AM PT (M-F) | 800s | Daily auto-analysis for stocks with "Daily" cadence across all users |
| `/api/jobs/market-context` | POST | 5:00 AM PT (M-F) | 120s | Daily market context update for all users |
| `/api/jobs/stock-events` | POST | 4:00 AM PT (Sunday) | 300s | Weekly stock events (earnings, dividends, splits) ingestion |

**Note:** Scheduled jobs use Vercel Cron secret verification for authentication.

### Monitoring & Debugging

| Endpoint | Method | Description |
| --- | --- | --- |
| `/api/api-status` | GET | Real-time status of all 6 external API integrations (FMP, FRED, Gemini, Claude, OpenAI, Notion) |
| `/api/page` | GET | Static page server for analyzer.html with admin dashboard |
| `/api/debug/check-encryption` | GET | Test ENCRYPTION_KEY configuration and encryption/decryption |
| `/api/debug/list-templates` | GET | Debug endpoint to list available Notion templates |
| `/api/debug/market-context` | GET/POST | Debug market context data and calculation |
| `/api/debug/reset-setup` | POST | Reset user setup progress (development only) |
| `/api/debug/user-config` | GET | Display current user's configuration and stored data |
| `/api/debug/validate` | POST | Validate ticker and stock data |

**Security Note:** Debug endpoints should be restricted in production environments.

**Critical flow:** Market context MUST be fetched before stock analysis. Do not parallelize these calls.

---

## Testing Requirements

**Before every commit:**

- [ ]  Run `npm run test:orchestrator` - All tests must pass
- [ ]  Run `npm run type-check` - TypeScript compilation must succeed
- [ ]  Check for testing overrides in code (see "Active Testing Overrides" section)
- [ ]  Validate that no API keys are hard-coded (use Vercel env vars)
- [ ]  If touching auth: Ensure `setupComplete` check is re-enabled in auth callback

**For new features:**

- Write unit tests for pure functions (scoring, calculations)
- Use live integration tests (`test:orchestrator:real`) for API-dependent features
- **Financial data validation:** Always validate LLM analysis against source data in tests
- Mock external APIs in unit tests, use real APIs in integration tests

**Integration test protocol:**

- Use a real ticker (e.g., AAPL) with known characteristics
- Verify scores are within expected ranges (1.0-5.0)
- Check that market regime appears in analysis output
- Validate Notion sync completes without errors

---

## Environment Variables Required

See Vercel dashboard for production values. Never commit `.env` to git.

**Required:**

- `FMP_API_KEY` - Financial Modeling Prep API key
- `FRED_API_KEY` - FRED API key (macroeconomic data)
- `NOTION_API_KEY` - Notion integration token (OAuth)
- `UPSTASH_REDIS_REST_URL` - Redis REST endpoint
- `UPSTASH_REDIS_REST_TOKEN` - Redis auth token
- `LLM_PROVIDER` - "claude" | "gemini" | "openai" (recommended: "claude")

**LLM Provider Keys (based on LLM_PROVIDER):**

- `ANTHROPIC_API_KEY` - Claude models (PRIMARY, recommended)
- `GEMINI_API_KEY` - Google Gemini (alternative, lower cost)
- `OPENAI_API_KEY` - OpenAI GPT models (alternative)

**Default Model Names:**
- Claude: `claude-sonnet-4-5-20250929`
- Gemini: `gemini-2.0-flash-exp`
- OpenAI: `gpt-4.1`

**Database Configuration:**

- `STOCK_ANALYSES_DB_ID` - Notion Stock Analyses database ID
- `STOCK_HISTORY_DB_ID` - Notion Stock History database ID
- `STOCK_COMPARISONS_DB_ID` - Notion Stock Comparisons database ID
- `MARKET_CONTEXT_DB_ID` - Notion Market Context database ID
- `SAGE_STOCKS_TEMPLATE_ID` - Production template page ID for user signups

**Optional:**

- `BYPASS_CODE` - Admin bypass code for rate limits
- `ADMIN_USER_ID` - Admin user ID for automatic bypass
- `NODE_ENV` - "development" | "production"
- `DEFAULT_TIMEZONE` - IANA timezone (default: America/Los_Angeles)
- `RATE_LIMIT_ENABLED` - Set to false to disable rate limiting in development
- `RATE_LIMIT_MAX_ANALYSES` - Maximum analyses per user per day (default: 10)
- `ANALYSIS_DELAY_MS` - Delay between ticker analyses in orchestrator (default: 8000ms)
- `CHUNK_SIZE` - Stocks per chunk in orchestrator (default: 8)
- `ORCHESTRATOR_DRY_RUN` - Enable dry-run mode for testing (default: false)

---

## Common Pitfalls & Gotchas

**🚨 These are mistakes we've already made - don't repeat them:**

### 1. LLM Prompt Design

- ❌ **Don't:** Ask LLM to calculate or retrieve financial metrics
- ✅ **Do:** Pass all metrics as structured context, ask LLM to interpret
- **Why:** Prevents hallucinations, ensures accuracy

### 2. Redis Cache Keys

- ❌ **Don't:** Use unversioned keys like `market:context`
- ✅ **Do:** Include version in key: `market:context:v1`
- **Why:** Allows safe schema changes without cache invalidation bugs

### 3. Market Context Timing

- ❌ **Don't:** Parallelize market context fetch with stock analysis
- ✅ **Do:** Fetch market context FIRST, then analyze stock
- **Why:** Stock analysis needs market regime for scoring and interpretation

### 4. Orchestrator vs Manual Analysis

- ❌ **Don't:** Assume all analyses come from orchestrator (batch job)
- ✅ **Do:** Handle manual user-triggered analyses with same quality
- **Why:** Users expect same accuracy whether morning batch or ad-hoc afternoon analysis

### 5. Notion API Rate Limits

- ❌ **Don't:** Delete multiple database rows in parallel
- ✅ **Do:** Use sequential deletion with delays OR parallel batches of 10
- **Why:** Notion API has undocumented rate limits that cause 502 errors
- **Current Implementation:** Parallel batches of 10 blocks with 100ms delay between batches ([lib/integrations/notion/client.ts](lib/integrations/notion/client.ts))

### 6. Testing Overrides in Production

- ❌ **Don't:** Deploy with testing flags still active
- ✅ **Do:** Search codebase for "TODO before production" before every deploy
- **Why:** Testing overrides can skip critical auth/validation checks

### 7. Time Zones in Cron Jobs

- ❌ **Don't:** Assume Vercel cron runs in PT/ET
- ✅ **Do:** Cron expressions use UTC; convert to user timezone for display
- **Why:** Market hours are ET; orchestrator runs at 5:30 AM PT = 13:30 UTC

---

## Key Technical Decisions (Context for Future Changes)

These decisions were made intentionally. If proposing changes, understand the rationale first:

**Why vanilla JS frontend (v1.2.21)?**

- Faster to build for solo founder
- No build step complexity
- Matches existing codebase
- **Future:** Migrating to Next.js in v2.0 for better UX

**Why session-based auth with 24h TTL?**

- Balance security and UX for beta users
- Long enough for daily usage pattern
- Short enough to limit token leak risk
- Simpler than refresh token rotation at this stage

**Why 1-hour Redis cache for market context?**

- Covers entire orchestrator run (5:30-6:00 AM uses same snapshot)
- Allows intraday market shifts to update hourly
- Reduces API costs significantly (market context = 33-34 API calls)
- Fresh enough for decision-making (market doesn't change minute-to-minute)
- **Implementation:** `market:context:v1` key with 3600s TTL ([lib/domain/market/cache.ts](lib/domain/market/cache.ts))

**Why orchestrator deduplication?**

- Reduces API costs 66-67% for typical multi-user scenarios (3 users analyzing same stock: 51 calls → 17 calls)
- At extreme scale: 99.9% reduction (1,000 users analyzing same stock: 17,000 calls → 17 calls)
- Enables premium LLM providers (Claude) at sustainable cost
- Scales beautifully with user growth
- **Implementation:** [lib/orchestration/orchestrator.ts](lib/orchestration/orchestrator.ts) - deduplicates tickers, analyzes once, broadcasts to all subscribers

**Why Notion API in v1.2.21 instead of PostgreSQL?**

- Users already work in Notion
- Zero infrastructure setup
- Native collaborative features
- **Future:** Migrating to PostgreSQL (Supabase) in v2.0 for 10-15x performance

**Why provider-agnostic LLM abstraction?**

- Quality vs cost tradeoffs change rapidly
- Allows A/B testing different models
- Future-proofs against provider pricing changes
- Current recommendation: Claude Sonnet 4.5 (~$0.03-0.05/analysis) for best quality
- Alternative: Gemini Flash 2.5 (~$0.013/analysis) for lower cost
- **Implementation:** [lib/integrations/llm/factory.ts](lib/integrations/llm/factory.ts) with provider-specific implementations in [lib/integrations/llm/providers/](lib/integrations/llm/providers/)

**Why chunked orchestrator processing (v1.2.0)?**

- Prevents Vercel 800s timeout when processing 15+ stocks
- Two cron invocations (5:30 AM and 5:45 AM PT) enable processing in batches
- First run: Processes first 8 stocks, saves queue to Redis
- Second run: Resumes from Redis, processes remaining stocks
- Configurable via `CHUNK_SIZE` environment variable

---

## Documentation Structure

Refer to these docs for deeper context:

**In this repo:**

- [README.md](README.md) - Project overview, architecture, features, philosophy
- [CHANGELOG.md](CHANGELOG.md) - Version history with detailed changes (development versions)
- [vercel.json](vercel.json) - Vercel configuration, cron schedules, timeout settings
- `LICENSE` - Business Source License 1.1 (commercial restrictions until 2029)
- [docs/architecture/overview.md](docs/architecture/overview.md) - Technical architecture deep-dive
- [docs/architecture/orchestrator.md](docs/architecture/orchestrator.md) - Orchestrator deduplication system
- [docs/planning/roadmap.md](docs/planning/roadmap.md) - Development roadmap and version timeline

**In Notion workspace:**

- Sage Engineering page - Current focus, system flows, technical decisions
- System Architecture page - Data flow diagrams, API integrations
- API Data & Providers - FMP/FRED decision matrix, coverage analysis
- Bug Reports database - Known issues and fixes
- Change Log page - Canonical version history

---

## Active Testing Overrides

**🚨 REMOVE BEFORE PRODUCTION DEPLOY:**

Search codebase for these patterns before every production deploy:

- `// TODO before production` - Temporary testing code
- Auth callback smart routing disabled - Must re-enable `setupComplete` check
- Any hardcoded bypass codes for development
- Console.log statements with sensitive data
- Mock API responses in production endpoints

**How to check:**

```bash
grep -r "TODO before production" .
grep -r "TESTING OVERRIDE" .
grep -r "setupComplete" . # Verify check is active
```

---

## PR & Commit Guidelines

**Commit message format:**

```
type(scope): short description

Longer explanation if needed.

Related issue: #123
```

**Types:** `feat`, `fix`, `docs`, `refactor`, `test`, `chore`

**Scopes:** `auth`, `api`, `llm`, `scoring`, `notion`, `redis`, `orchestrator`

**Examples:**

- `feat(scoring): add market alignment dimension to composite score`
- `fix(redis): use versioned cache keys to prevent stale data`
- `refactor(llm): extract prompt templates to separate module`

**Before opening PR:**

- [ ]  All tests pass (`npm run test:orchestrator`)
- [ ]  Type checking passes (`npm run type-check`)
- [ ]  No testing overrides remain in code
- [ ]  Environment variables documented if new ones added
- [ ]  Update [CHANGELOG.md](CHANGELOG.md) with changes

---

## Cost Structure & Monitoring

**Monthly operating costs (v1.2.21):**

- Vercel Pro: $20/month
- FMP API: $22-29/month
- Anthropic Claude Sonnet 4.5: $90-150/month (3,000 analyses @ ~$0.03-0.05 each)
- FRED API: Free
- Notion: Free
- Upstash Redis: Free (under tier limits)
- **Total:** $132-199/month

**Cost per analysis:** $0.03-0.05 (Claude Sonnet 4.5)

**Alternative LLM Options:**
- Google Gemini Flash 2.5: ~$0.013/analysis = $40/month for 3,000 analyses (lower cost, alternative provider)
- OpenAI GPT-4 Turbo: ~$0.10+/analysis = $300+/month for 3,000 analyses (higher cost)

**When optimizing:**

- Monitor Claude token usage (target: ~2,000 tokens/analysis)
- Check Redis cache hit rate for market context (target: >95% during orchestrator runs)
- Validate FMP API call count (target: 17 calls per stock + 33-34 calls per market context)

**v2.0 cost changes:**

- Add Supabase: $0-25/month (PostgreSQL)
- Total: $152-224/month (10-15x faster database, unlimited scale)

---

## Orchestrator System

**Purpose:** Deduplicate stock analyses across multiple users to reduce API costs and LLM usage.

**How it works:**

1. **Collection Phase:** Query all users' Stock Analyses databases, filter for "Analysis Cadence = Daily"
2. **Deduplication Phase:** Group subscribers by ticker symbol (case-insensitive), creates Map<ticker, Subscriber[]>
3. **Priority Queue:** Sort by user tier (Pro → Analyst → Starter → Free) to prioritize premium users
4. **Analysis Phase:** Analyze each unique ticker ONCE (not per subscriber)
5. **Broadcast Phase:** Write results to ALL subscribers' Notion pages

**Cost Savings:**

- **Typical case (3 users, same stock):** 66-67% reduction (51 API calls → 17 calls, 3 LLM requests → 1)
- **Extreme scale (1,000 users, same stock):** 99.9% reduction (17,000 calls → 17 calls)

**Schedule:**

- 5:30 AM PT (13:30 UTC) - First batch (up to 8 stocks)
- 5:45 AM PT (13:45 UTC) - Second batch (remaining stocks)
- Monday-Friday only

**Configuration:**

- `ANALYSIS_DELAY_MS` - Delay between tickers (default: 8000ms)
- `CHUNK_SIZE` - Stocks per batch (default: 8)
- `ORCHESTRATOR_DRY_RUN` - Test mode without API calls

**Implementation:** [lib/orchestration/orchestrator.ts](lib/orchestration/orchestrator.ts) (844 lines)

---

## Contact & Support

**Repository:** [github.com/shalomormsby/sagestocks](https://github.com/shalomormsby/sagestocks)

**For bugs:**

- Include: ticker, error message, expected vs actual behavior
- Check [CHANGELOG.md](CHANGELOG.md) to see if issue is already known
- Provide Vercel function logs if available

**For feature suggestions:**

- Review [docs/planning/roadmap.md](docs/planning/roadmap.md) first to avoid duplicating planned work
- Consider if feature aligns with "impeccable but simple" philosophy
- Propose in context of user value, not technical complexity

---

*This file is designed to help AI coding agents work effectively with Sage Stocks. For human-readable project overview, see [README.md](README.md).*
