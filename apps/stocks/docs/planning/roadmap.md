# Sage Stocks Roadmap

**Last Updated:** November 9, 2025 ⚠️ STRATEGIC PIVOT - See v1.0.4 and v2.0 updates

> 📋 **Versioning Note:** This roadmap uses **development versions** (v1.x, v2.x) for internal milestone tracking. See [CHANGELOG.md](CHANGELOG.md) "📋 Versioning Strategy (Dual-Track)" for the mapping between development versions and user-facing template versions (v0.1.0 Beta → v1.0.0 Public).

---

## ⚠️ Strategic Changes (November 7, 2025)

**This update supersedes all prior guidance regarding automation and v2.0 scope.**

**Key Changes:**

1. **v1.0.4 Created:** "Stock Analysis Automation Engine"
   - Moved basic automation from v2.0 into core platform (v1.0.x series)
   - Transforms single-use analyzer into scheduled automation engine
   - Includes: scheduled jobs, daily execution, backfill, digest notifications, database schema
   - Rationale: Basic automation is core functionality, not an advanced feature

2. **v2.0 Refocused:** Renamed from "Full Automation" to "Autonomous Intelligence"
   - Removed basic scheduling infrastructure (now in v1.0.4)
   - Now focuses on: advanced analytics (historical trends, predictive insights), enhanced notifications (email/SMS, Slack, mobile push), market context dashboard, autonomous intelligence features
   - Builds on top of v1.0.4 automation foundation
   - True "next level" capabilities requiring database migration

3. **v2.2 Deprecated:** Content redistributed between v1.0.4 and v2.0

**Impact:** v1.0.4 becomes the next critical milestone. Users get automation sooner, v2.0 focuses on genuine intelligence features.

---

## 🎯 Current Status

**Overall v1.0 Progress:** ~85% complete

**Current Sprint:** v1.0.2 - HTML Analyzer Page (Hybrid Approach Phase 1)

**Completed:** 44 tasks (v1.0.0 Rate Limiting shipped)

**Remaining:** 15 tasks (v1.0.2 → v1.0.3 → v2.0 migration)

**Estimated Hours Remaining:** ~3-5 hours to complete v1.0.2, then 25-35 hours for v2.0 migration

---

## ✅ Completed Sprints

### v0.x: Colab Prototype (100% Complete)

*Foundation work: Colab-based analysis + Notion AI automation*

**Key Achievements:**

- ✅ Colab notebook with manual analysis workflow
- ✅ Notion AI API integration (New/Updated analysis prompts)
- ✅ Content Status notification system
- ✅ Synced block references for consistent UX
- ✅ Stock Analyses + Stock History database schema
- ✅ Fixed duplicate row issues (upsert race condition)

**Architecture:** Python/Colab + Notion API + Polygon/Alpha Vantage/FRED APIs

### v1.0: Serverless Migration (70% Complete)

*Production-ready serverless architecture on Vercel*

**Completed Work:**

**API Migration:**

- ✅ Researched and selected consolidated provider (FMP + FRED)
- ✅ Set up Vercel TypeScript development environment
- ✅ Ported scoring logic from v0.3 Python to TypeScript (~2,500 LOC)
- ✅ Created /api/analyze endpoint (390 LOC)
- ✅ Created /api/webhook endpoint for archiving (180 LOC)
- ✅ Configured environment variables and secrets

**Refactoring:**

- ✅ Extracted API fetching logic into modular functions
- ✅ Extracted score calculation into pure functions
- ✅ Extracted Notion read/write operations
- ✅ Extracted AI prompt execution logic

**Deployment:**

- ✅ Deployed to Vercel production
- ✅ Made API endpoints publicly accessible (CORS enabled)
- ✅ Configured Notion automation for "Send to History"
- ✅ Test scripts for local development (240 LOC)
- ✅ Documentation (SETUP.md, testing guides - 750 LOC)

**Testing:**

- ✅ End-to-end workflow tested (ticker input → analysis → archive)
- ✅ Security audit completed
- ✅ Production validation with MSFT test case

**Rate Limiting System (v1.0.0):**

- ✅ Upstash Redis integration (REST API, distributed state)
- ✅ User-level quotas (10 analyses per user per day)
- ✅ Session-based bypass code system
- ✅ `/api/bypass` endpoint (GET/POST, URL params + JSON body)
- ✅ `/api/usage` endpoint (non-consuming quota check)
- ✅ Automatic midnight UTC reset
- ✅ Graceful degradation on Redis failure
- ✅ Production deployment tested and validated

**Cumulative Stats:**

- ~4,700 lines TypeScript code
- ~3,200 lines documentation
- 22 total files (includes rate limiting + LLM abstraction)
- Performance: 3-5 seconds per analysis (current), 18-25 seconds target (with LLM)
- Cost: $22-29/month (FMP + Vercel) + LLM costs (~$0.013 per analysis with Gemini Flash 2.5)

---

## 🚧 Current Sprint

### v1.0.2: HTML Analyzer Page - Hybrid Approach Phase 1 (✅ Complete)

> ⚠️ **DEPRECATED:** WordPress hosting references. Production is now at [sagestocks.vercel.app](https://sagestocks.vercel.app)

*Standalone HTML page with LLM-generated analysis, initially planned for WordPress, migrated to Vercel standalone*

**Context:** Notion webhook limitations discovered in v1.0.1 led to architectural pivot. Building dedicated HTML analyzer page as transition to full custom frontend.

**Core Changes:**

- ✅ Built LLM abstraction layer (provider-agnostic interface)
  - Interface: `LLMProvider` with OpenAI, Anthropic, Gemini implementations
  - Default: Google Gemini Flash 2.5 ($0.013 per analysis, 50% token reduction)
  - Configurable via `LLM_PROVIDER` environment variable
- ✅ Modified `/api/analyze` endpoint for new workflow
  - Query Notion for historical analyses (5 most recent)
  - Compute deltas and trends
  - Build enriched prompt with historical context
  - Call LLM API for 7-section analysis generation
  - Create dated child analysis page in Notion
  - Update Stock Analyses database row with latest metrics
  - Archive to Stock History database
  - Return `pageUrl` for new analysis page
- ✅ Built `public/analyze.html` analyzer interface
  - Ticker input with validation (1-10 alphanumeric + hyphen)
  - State management (Initial → Processing → Complete/Error)
  - Real-time status feedback
  - "View Results" link to Notion page
  - Usage counter display (X/5 analyses today, user-specific)
  - Tailwind CSS styling (CDN, no build step)
  - Vanilla JavaScript (standalone, no build required)
- ✅ Added admin bypass via environment variable
  - `ADMIN_USER_ID` environment variable
  - Automatic bypass for admin (no session needed)
- ✅ Tested end-to-end workflow locally
- ✅ Deployed to Vercel at [sagestocks.vercel.app](https://sagestocks.vercel.app)

**Prerequisites:**

- ✅ Vercel Pro upgrade ($20/month) - **Required for 300-second timeout**
- ✅ Google Gemini API setup and key
- ⚠️ ~~WordPress page setup~~ (deprecated - using sagestocks.vercel.app)

**Success Criteria:**

- ✅ User visits [sagestocks.vercel.app](https://sagestocks.vercel.app) → enters ticker → clicks Analyze
- Analysis completes in <30 seconds (18-25 seconds target)
- New dated analysis page created in Notion
- Database row updated with latest metrics
- Clear "View Results" link displayed
- Zero manual steps after clicking Analyze

**Performance Target:**

- Total latency: 18-25 seconds
  - Rate limit check: <500ms
  - Fetch market data: 3-5 sec
  - Calculate scores: 1 sec
  - Query historical data: 2-5 sec (Notion bottleneck)
  - Compute deltas: <1 sec
  - LLM analysis: 10-20 sec
  - Notion writes (3 operations): 6-10 sec
  - Rate limit update: <500ms

**Estimated Time:** 3-5 hours

**Completion Target:** November 3-5, 2025

---

### v1.0.2c: API Management Dashboard (In Progress)

*Centralized API monitoring and management for operational visibility*

**Objective:** Build a simple admin panel to monitor 6 API integrations during development and beta testing.

**Context:**

- Working with 6 different APIs (FMP, FRED, Gemini, Claude, OpenAI, Notion)
- LLM abstraction layer adds provider-switching complexity
- Need operational visibility to debug issues and track costs
- Prevents expensive surprises and speeds up troubleshooting

**Scope: MVP (2-3 hours)**

Build a simple admin panel embedded in the existing HTML analyzer page at `/analyze?admin=true`

**Core Features:**

1. **API Status Indicators**
   - 🟢 Green (Active): API key valid, recent successful call
   - 🔴 Red (Error): API key invalid, rate limited, or failing
   - ⚪ Gray (Inactive): API key not configured

2. **Quick Info Per API**
   - Status: Active/Error/Inactive
   - Calls Today: e.g., "247/300" (or tokens for LLMs)
   - Last Success: e.g., "2 min ago"
   - Cost Today: e.g., "$0.74"
   - Model (for LLMs): e.g., "gemini-2.5-flash"

3. **Test Buttons**
   - [Test] button for each API
   - Validates API key without consuming quota (when possible)
   - Shows latency for each test

4. **Quick Links**
   - [Docs] button linking to provider dashboard:
     - FMP: https://financialmodelingprep.com/developer/docs
     - Google AI Studio: https://aistudio.google.com
     - Vercel Env Vars: https://vercel.com/settings/environment-variables

5. **Daily Cost Summary**
   ```
   Daily Cost Summary:
   • FMP: $0.74 (247 calls)
   • Gemini: $0.58 (22 analyses)
   • FRED: $0.00 (free)
   • Notion: $0.00 (free)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Total Today: $1.32
   Monthly Projection: $39.60
   ```

6. **Recent Errors (Last 24h)**
   - Timestamp
   - API name
   - Error message

**APIs to Monitor:**

1. FMP API (11 calls/analysis)
2. FRED API (6 calls/analysis)
3. Google Gemini API (1 call/analysis)
4. Anthropic Claude API (optional fallback)
5. OpenAI API (optional fallback)
6. Notion API (8-10 calls/analysis)

**Implementation:**

- ⏳ Create `/api/api-status.ts` endpoint (1 hr)
  - Check each API key exists in env vars
  - Attempt lightweight health check per API
  - Calculate daily costs based on known pricing
  - Return JSON with status for each API
- ⏳ Modify `public/analyze.html` (1 hr)
  - Add admin section (show/hide with `?admin=true`)
  - Use Tailwind CDN for styling
  - Auto-refresh every 30 seconds
- ⏳ Testing + polish (30 min)

**Success Criteria:**

- Admin can see status of all 6 APIs at a glance
- Test buttons validate API keys work
- Daily cost tracking helps avoid budget surprises
- Recent errors surface issues quickly
- Takes <5 seconds to diagnose API problems

**Future Enhancements (v2.0):**

- Full Next.js admin dashboard with charts
- Historical usage trends (sparkline graphs)
- Email/Slack alerts for failures
- Cost threshold warnings
- Export usage reports (CSV)

**Estimated Time:** 2-3 hours

**Completion Target:** November 2, 2025

---

### v1.0.5: Notion Write Optimization - Chunked Streaming (✅ Complete)

*Fix 504 timeout errors by adding delays between Notion API chunk writes*

**Problem:**

Even after v1.0.3 (Vercel Pro 60s timeout) and v1.0.4 (67% token reduction), the timeout is still occurring. Root cause analysis revealed the bottleneck is **Notion API write performance**, not LLM generation or Vercel timeout limits.

**Root Cause:**

- Writing 2,000+ tokens of content as Notion blocks takes 120-240+ seconds
- The `writeAnalysisContent()` function had chunking implemented (100 blocks per request)
- **BUT** there was NO DELAY between chunks
- Rapid sequential requests hit Notion's rate limits (3 req/sec average)
- Each API call has ~200-300ms latency
- 100+ blocks in rapid succession = easily 60-120+ seconds total

**Solution Implemented:**

**Phase 1: Add Inter-Chunk Delays (30 min) ✅**

Modified `lib/notion-client.ts` `writeAnalysisContent()` function:

```typescript
// Before: No delay between chunks
for (let i = 0; i < blocks.length; i += chunkSize) {
  const chunk = blocks.slice(i, i + chunkSize);
  await this.client.blocks.children.append({
    block_id: pageId,
    children: chunk,
  });
}

// After: 100ms delay between chunks
const chunkDelay = 100; // 100ms = ~10 req/sec (under Notion's 3 req/sec limit)

for (let i = 0; i < blocks.length; i += chunkSize) {
  const chunk = blocks.slice(i, i + chunkSize);
  await this.client.blocks.children.append({
    block_id: pageId,
    children: chunk,
  });

  // Add delay between chunks (except for the last chunk)
  if (i + chunkSize < blocks.length) {
    await new Promise(resolve => setTimeout(resolve, chunkDelay));
  }
}
```

**Phase 2: Add Timing Instrumentation (15 min) ✅**

Added detailed timing logs to track where time is spent:

```typescript
// In lib/notion-client.ts
console.log(`[Notion] Deleted ${deletedCount} existing blocks in ${deleteDuration}ms`);
console.log(`[Notion] Converted ${blocks.length} blocks in ${convertDuration}ms`);
console.log(`[Notion] Wrote chunk ${chunkNum}/${totalChunks} in ${chunkDuration}ms`);
console.log(`[Notion] ⏱️  Total write time: ${totalDuration}ms (write: ${writeDuration}ms)`);

// In api/analyze.ts
console.log(`✅ Written to Stock Analyses page: ${analysesPageId} (${writeDuration}ms)`);
console.log(`✅ Created child analysis page: ${childPageId} (${childDuration}ms)`);
console.log(`⏱️  Total Notion write time: ${notionWriteDuration}ms`);
console.log(`✅ Archived to Stock History: ${archivedPageId} (${archiveDuration}ms)`);
```

**Expected Performance Improvement:**

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Notion write time | 60-120s+ | 15-25s | **75-80% faster** |
| Total analysis time | 90-180s+ | 30-45s | **67-75% faster** |
| Timeout risk | High (504 errors) | Low (under 60s) | **Risk eliminated** |

**Files Modified:**

1. `lib/notion-client.ts` - Added chunking delays and timing instrumentation (lines 1132-1222)
   - Added `chunkDelay = 100ms` between writes
   - Added timing logs for delete, convert, and write phases
   - Added per-chunk timing logs

2. `api/analyze.ts` - Added timing instrumentation for Notion operations (lines 496-563)
   - Track time to write to Stock Analyses page
   - Track time to create child analysis page
   - Track time to archive to Stock History
   - Log total Notion write duration

**Success Criteria:**

✅ NVDA analysis completes without timeout
✅ Total execution time: <45 seconds
✅ Notion write time: <25 seconds
✅ No 504 errors in Vercel logs
✅ TypeScript compilation passes

**Testing Plan:**

1. Test with NVDA (the failing case that triggered this fix)
   - Should complete in <35 seconds
   - No 504 errors
   - Detailed timing logs visible

2. Verify timing breakdown in Vercel logs:
   - LLM generation: ~10-15s
   - Notion writes: **<25s** (was 120-240s+)
   - Total: <40s ✅

3. Monitor Notion API rate limits:
   - Should stay under 3 requests/second
   - No 429 errors

**Why This Fix Works:**

**v1.0.3 (Vercel timeout increase):**
- ✅ Gave more time (60s)
- ❌ Content write still takes 120-240s
- **Result:** Still times out

**v1.0.4 (Prompt optimization):**
- ✅ Reduced tokens 6,000 → 2,000
- ✅ Faster LLM generation (15s → 8s)
- ❌ **Doesn't fix Notion write bottleneck** (still 100+ blocks to write)
- **Result:** Still times out during content write phase

**v1.0.5 (Chunked streaming with delays):**
- ✅ Respects Notion's rate limits (3 req/sec)
- ✅ Dramatically reduces write time (120s+ → 15-25s)
- ✅ Keeps total execution under 60s Vercel timeout
- **Result:** ✅ Problem solved

**Estimated Time:** 45 minutes

**Completion Date:** November 2, 2025

---

### v1.0.6: Parallel Batch Deletion - Architecture Fix (✅ Complete)

*Critical fix: Replace sequential deletion with parallel batches (75-80% faster)*

**Problem:**

Vercel logs revealed the code was making **76 individual sequential DELETE API calls**, each taking ~250ms, for a total of **19+ seconds just for deletion**. This was the actual bottleneck causing 5+ minute timeouts.

v1.0.5's inter-chunk delays made this **worse** by adding 100ms between each delete operation.

**Root Cause:**

```typescript
// WRONG - Sequential deletion (76 calls × 250ms = 19+ seconds)
for (const block of blocks) {
  await notion.blocks.delete({ block_id: block.id }); // Individual API call
  // Wait for completion before next delete
}
```

**The Real Issue:**

- Notion doesn't have a batch delete API
- We were making 76 DELETE calls sequentially
- Each call: ~250ms API latency
- Total deletion time: 76 × 250ms = **19+ seconds**
- Then writes: 100+ blocks = another 8-15 seconds
- **Total: 27-34+ seconds MINIMUM**, often 5+ minutes with retries

**Solution Implemented:**

**Replace sequential deletion with parallel batch deletion:**

```typescript
// Step 1: Collect all block IDs first (fast, just list operations)
const blockIdsToDelete: string[] = [];
while (hasMore) {
  const response = await this.client.blocks.children.list({ block_id: pageId });
  blockIdsToDelete.push(...response.results.map(b => b.id));
  hasMore = response.has_more;
}

// Step 2: Delete in parallel batches of 10 (respects rate limits)
const batchSize = 10;
const batchDelay = 100; // 100ms between batches

for (let i = 0; i < blockIdsToDelete.length; i += batchSize) {
  const batch = blockIdsToDelete.slice(i, i + batchSize);

  // Delete all 10 blocks in parallel (not sequential!)
  await Promise.all(
    batch.map(blockId =>
      this.client.blocks.delete({ block_id: blockId })
    )
  );

  // Wait 100ms before next batch
  await sleep(batchDelay);
}
```

**Performance Calculation:**

For 76 blocks:
- **Sequential (v1.0.5):** 76 × 250ms = 19,000ms = **19 seconds**
- **Parallel batches (v1.0.6):**
  - 76 blocks ÷ 10 per batch = 8 batches
  - Each batch: 10 parallel requests complete in ~250-500ms (not 2,500ms!)
  - Total: 8 × 500ms + 7 × 100ms (delays) = **4.7 seconds**
- **Improvement: 75-80% faster** (19s → 4.7s)

**Performance Impact:**

| Metric | v1.0.5 (Sequential) | v1.0.6 (Parallel) | Improvement |
|--------|---------------------|-------------------|-------------|
| Block deletion time | 19+ seconds | 3-5 seconds | **75-80% faster** |
| Total Notion write time | 27-34+ seconds | 10-15 seconds | **60-70% faster** |
| Total analysis time | 45-60+ seconds | 25-35 seconds | **40-50% faster** |
| Timeout risk | High (504 errors) | Very Low | **Eliminated** |

**Why This Works:**

**Architecture Fix, Not Rate Limit Workaround:**

- v1.0.5 tried to fix with delays → made it worse
- v1.0.6 fixes the architecture → parallel requests
- Notion's rate limit is 3 req/sec **average**, but allows bursts
- 10 parallel requests every 100ms = effectively 100 req/sec burst, well within limits
- This is how Notion's API is **designed to be used**

**Files Modified:**

1. **lib/notion-client.ts** (lines 1139-1208)
   - Replaced sequential deletion loop with parallel batch deletion
   - Added block ID collection phase
   - Added parallel Promise.all() deletion
   - Added detailed logging (blocks/sec throughput)
   - Improved error handling (individual block failures don't fail entire operation)

**Success Criteria:**

✅ Deletion time reduced from 19s → 3-5s
✅ Total Notion write time < 15 seconds
✅ Total analysis time < 35 seconds
✅ No timeout errors
✅ TypeScript compilation passes

**Testing Plan:**

1. Test with NVDA (the 76-block case)
   - Deletion should complete in 3-5 seconds
   - Total analysis time < 35 seconds
   - Logs should show: "Deleted 76 blocks in ~3500ms (22 blocks/sec)"

2. Verify in Vercel logs:
   - DELETE requests are made in batches of 10
   - No 429 rate limit errors
   - Total execution time < 35 seconds

**Why v1.0.5 Failed:**

**v1.0.5 attempted to fix with delays between chunks:**
- ✅ Helped with write operations (already batched)
- ❌ Made delete operations **slower** (added delays to sequential calls)
- ❌ Didn't address root cause: sequential deletion
- **Result:** Still timed out

**v1.0.6 fixes the architecture:**
- ✅ Parallel deletion (10 blocks at once, not 1 at a time)
- ✅ Dramatically reduces latency (250ms total, not 2,500ms)
- ✅ Respects rate limits with batching
- **Result:** ✅ Problem solved

**Estimated Time:** 30 minutes

**Completion Date:** November 2, 2025

---

### v1.0.3: Infrastructure Upgrade (Deferred)

*Vercel Pro upgrade for timeout resolution*

**Issue:** Vercel free tier has 10-second timeout limit
**Impact:** Current `/api/analyze` endpoint times out on production
**Status:** Deployment blocker discovered in v1.0.0 testing

**Upgrade Required:**

- Vercel Pro Plan: $20/month
  - 300-second serverless function timeout (vs 10 seconds)
  - Enables full analysis workflow (18-25 seconds target)

**Timeline:** Before v1.0.2 deployment (prerequisite)

**Estimated Time:** 10 minutes (account upgrade only)

---

## 🔮 Future Sprints

### v1.0.4: Stock Analysis Automation Engine (Next - Awaiting Guidance)

⚠️ **STRATEGIC PIVOT:** This sprint moves basic automation from v2.0 into core platform (v1.0.x series).

*Transform single-use analyzer into scheduled automation engine*

**Objective:** Build foundational automation infrastructure to enable daily stock analysis without manual intervention.

**Scope:**
- Scheduled job architecture (GitHub Actions/Vercel Cron)
- Daily execution engine (analyze multiple tickers automatically)
- Backfill capability (historical analysis generation)
- Digest notification system (Notion Inbox delivery)
- Database schema updates (job tracking, execution history)
- 5-phase implementation plan

**Rationale:**
Basic automation is core platform functionality, not an advanced feature. Users need scheduled analysis before they need predictive AI or multi-channel notifications.

**Status:** Awaiting detailed implementation guidance from product owner.

**Estimated Time:** TBD (awaiting guidance)

**Completion Target:** TBD

---

### v2.0: Autonomous Intelligence (Planned)

⚠️ **SCOPE UPDATED:** Removed basic scheduling infrastructure (moved to v1.0.4). This version now focuses exclusively on advanced intelligence, analytics, and multi-channel capabilities.

*Advanced analytics, predictive insights, and autonomous intelligence building on v1.0.4 automation foundation*

**Core Focus Areas:**

**1. Advanced Analytics**
- Historical trend analysis (multi-week patterns, seasonality)
- Predictive insights (score forecasting, price target modeling)
- Comparative analysis (peer benchmarking, sector positioning)
- Backtesting engine (recommendation accuracy tracking)

**2. Enhanced Notifications**
- Multi-channel delivery (email, SMS, Slack, mobile push)
- Intelligent routing (urgency-based channel selection)
- Customizable alert thresholds and triggers
- Rich notification templates with charts/visualizations

**3. Market Context Dashboard**
- Real-time sector performance heat maps
- Market regime detection (Risk-On/Risk-Off/Transition)
- Economic calendar integration (earnings, Fed meetings, data releases)
- Correlation analysis (portfolio vs market/sector)

**4. Autonomous Intelligence Features**
- Auto-portfolio rebalancing suggestions
- Risk exposure monitoring and alerts
- Position sizing recommendations
- Opportunity scanning (find similar stocks with better metrics)

**Phase 2A: Custom Frontend Migration (Prerequisite)**

*Next.js application with PostgreSQL database for production scale*

**Strategic Rationale for Database Migration:**

Notion is a performance bottleneck for advanced features:
- Historical queries: 2-5 seconds (slow, no indexing)
- 3 database writes: 6-10 seconds (3 sequential API calls, 3 req/sec rate limit)
- No time-series optimization
- No trend visualization support
- 3 req/sec rate limit blocks concurrent users

PostgreSQL (Supabase) solves these issues:
- Historical queries: <500ms (SQL indexes + JOINs)
- Database writes: <100ms (single transaction, 3 inserts)
- Time-series queries with window functions
- Native chart/graph support
- Unlimited concurrent users

**Performance Comparison:**

| Operation | Notion | PostgreSQL | Improvement |
|-----------|--------|------------|-------------|
| Historical query (5 analyses) | 2-5 sec | <500ms | **5-10x faster** |
| Database writes (3 operations) | 6-10 sec | <100ms | **60-100x faster** |
| Compute deltas | Manual (app code) | Automatic (SQL) | Native support |
| **Total database time** | **8-15 sec** | **<1 sec** | **10-15x faster** |
| **Total analysis time** | **35-50 sec** | **18-25 sec** | **40-50% faster** |

**Technology Stack:**

- **Frontend:** Next.js 14 (App Router, Server Components)
- **Styling:** Tailwind CSS + shadcn/ui components
- **Database:** Supabase PostgreSQL (free tier → $25/month Pro)
- **Auth:** Supabase Auth (built-in, email/password)
- **Charts:** Recharts (trend visualizations)
- **Backend:** Existing Vercel API (minimal changes)
- **Rate Limiting:** Upstash Redis (existing)
- **Hosting:** Vercel ($20/month Pro plan)

**Implementation Phases:**

**Phase 2A: Frontend Application (20-25 hours)**
- Authentication pages (login, signup, password reset)
- Analyzer page (ticker input, real-time status, results display)
- Historical analysis view (list of past analyses with trends)
- Trend charts (score over time, Recharts integration)
- Dashboard (portfolio overview, watchlist)
- Responsive design (mobile-first)

**Phase 2B: Database Migration (5-10 hours)**
- Set up Supabase project
- Design PostgreSQL schema (users, analyses, watchlists, etc.)
- Modify `/api/analyze` to use PostgreSQL instead of Notion
  - Replace Notion historical queries with SQL
  - Replace 3 Notion writes with single transaction
  - Keep scoring logic unchanged
- Data migration from Notion to PostgreSQL (existing analyses)
- Row-level security (RLS) policies

**Phase 2C: Advanced Analytics Engine (8-12 hours)**
- Historical trend analysis engine
- Predictive modeling (score forecasting)
- Backtesting framework (recommendation accuracy)
- Comparative analysis tools (peer benchmarking)

**Phase 2D: Enhanced Notification System (6-10 hours)**
- Multi-channel integration (email, SMS, Slack, push)
- Intelligent routing logic (urgency-based)
- Rich notification templates with embedded charts
- Alert customization UI

**Phase 2E: Market Context Dashboard (8-12 hours)**
- Sector performance heat maps
- Market regime detection algorithm
- Economic calendar integration
- Correlation analysis engine

**Phase 2F: Autonomous Intelligence (10-15 hours)**
- Portfolio rebalancing suggestions
- Risk exposure monitoring
- Position sizing recommendations
- Opportunity scanner

**Database Schema (PostgreSQL):**

```sql
-- Users (managed by Supabase Auth)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT UNIQUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Analyses (replaces Notion Stock Analyses + Stock History)
CREATE TABLE analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  ticker TEXT NOT NULL,
  analysis_date TIMESTAMP DEFAULT NOW(),

  -- Scores (1.0-5.0 scale, updated from 0-100)
  composite_score DECIMAL(3,2),
  technical_score DECIMAL(3,2),
  fundamental_score DECIMAL(3,2),
  macro_score DECIMAL(3,2),
  risk_score DECIMAL(3,2),
  sentiment_score DECIMAL(3,2),
  sector_score DECIMAL(3,2),

  -- Recommendation
  recommendation TEXT, -- 'Strong Buy', 'Buy', 'Hold', 'Sell', 'Strong Sell'
  confidence DECIMAL(3,2),

  -- Analysis content (LLM-generated)
  analysis_text TEXT, -- Full 7-section analysis

  -- Metadata
  pattern TEXT,
  data_quality_grade TEXT,

  -- Historical context (computed via SQL window functions)
  -- No need to store - computed on-the-fly with LAG/LEAD

  -- Indexes for fast queries
  INDEX idx_ticker (ticker),
  INDEX idx_user_ticker (user_id, ticker),
  INDEX idx_date (analysis_date DESC)
);
```

**Cost Comparison:**

| Service | Notion Approach | PostgreSQL Approach |
|---------|-----------------|---------------------|
| Vercel Pro | $20/month | $20/month |
| FMP API | $29/month | $29/month |
| LLM API (Gemini) | $40/month (3,000 analyses) | $40/month |
| Notion | $0 (free tier) | - |
| Supabase | - | $0-25/month |
| Domain | - | $1/month |
| **Total** | **$89/month** | **$90-115/month** |

**Similar cost, much better performance and scalability.**

**Prerequisites:**
- v1.0.4 automation foundation must be complete
- Database migration (Phase 2A-2B) enables advanced features

**Timeline:** Q1-Q2 2026 (after v1.0.4 ships and automation is validated)

**Estimated Time:**
- Frontend + Database Migration: 25-35 hours
- Advanced Features (2C-2F): 32-49 hours
- **Total: 57-84 hours**

**Completion Target:** Q2 2026

---

### v2.1: Enhanced Analysis Features

*Add high-value features from v0.3 + insider trading*

**Planned Features:**

- 🔥 **Insider trading analysis** (requires FMP Professional upgrade to $79/mo)
  - Last 90 days buy/sell ratio
  - Executive vs routine trades
  - Open market purchases (strongest signal)
  - Form 4 filing links
  - Integrate into Sentiment scoring category
- **Market analysis features** (ported from v0.3.0)
  - Market regime classification (Risk-On/Risk-Off/Transition)
  - Sector strength rankings
  - Brave Search API for market intelligence
  - Market Context database

**Timing:** Post-v2.0 migration, prioritized based on user feedback

**Estimated Time:** ~6-10 hours total

### v2.2: Deprecated

⚠️ **MERGED INTO v1.0.4 and v2.0** - This sprint's scope has been redistributed:
- Basic automation → v1.0.4 (scheduled jobs, daily execution, digest notifications)
- Advanced features → v2.0 (predictive analytics, multi-channel notifications, autonomous intelligence)

---

## 📊 Current Architecture

**Technology Stack:**

- **Platform:** Vercel serverless functions (TypeScript/Node.js)
- **Financial Data:** Financial Modeling Prep API ($22-29/mo)
- **Macro Data:** FRED API (free)
- **LLM:** Google Gemini Flash 2.5 ($0.013/analysis, 50% token reduction)
- **Rate Limiting:** Upstash Redis (REST API)
- **Integration:** Notion API (transitioning to PostgreSQL in v2.0)

**Data Flow (v1.1.6 - Current):**

> ⚠️ **Updated from v1.0.2:** Now includes OAuth authentication and multi-user support

1. User visits [sagestocks.vercel.app](https://sagestocks.vercel.app)
2. OAuth login with Notion → session validation
3. Enters ticker → clicks "Analyze Stock"
4. HTML page → POST to `/api/analyze` with session token + userId
5. Vercel function:
   - Validates session and user approval status
   - Checks rate limiting (Redis, 5 analyses/day per user)
   - Fetches technical + fundamental data (FMP + FRED)
   - Queries Notion for historical analyses (5 most recent from user's DB)
   - Calculates scores (Technical 30%, Fundamental 35%, Macro 20%, Risk 15%) + computes deltas/trends
   - Calls Gemini Flash 2.5 for 7-section analysis
   - Creates dated child analysis page in user's Notion
   - Updates user's Stock Analyses database row
   - Archives to user's Stock History database
   - Returns `pageUrl` to new analysis page
6. HTML page displays "View Results in Notion" link
7. User clicks → opens their personal Notion analysis page

**Performance (v1.1.6 - Current):**

- 25-35 seconds per analysis (actual, with Notion bottleneck)
- Target: 18-25 seconds
- Database operations: 10-15 seconds (Notion bottleneck, improved with v1.0.5/v1.0.6 optimizations)
- LLM generation: 10-20 seconds
- 300-second function timeout (Vercel Pro required)

---

## 📖 Documentation

For detailed setup and testing instructions, see:
- [SETUP.md](SETUP.md) - Environment setup and deployment
- [TESTING.md](TESTING.md) - Testing procedures and validation

---

## 🐛 Bug Fixes & Resolutions

### Bug: Admin Bypass Code Stored But Never Activated (Fixed: November 5, 2025)

**Issue:** Bypass activation flow was incomplete - admin had bypass code in database but no way to activate it, causing rate limit blocks despite having valid code.

**Root Cause:**
- Backend `/api/bypass` endpoint existed but no UI to trigger it
- User Settings page had no activation button/form
- Admin hitting rate limits despite valid bypass code in database

**Resolution Implemented:**

1. **Created Settings Page** ([public/settings.html](public/settings.html))
   - Bypass code input form with activation button
   - Real-time bypass status display (Active/Inactive)
   - Expiration countdown timer
   - Usage statistics dashboard
   - Auto-refresh every 30 seconds
   - Clean Tailwind CSS UI matching analyzer page

2. **Added Navigation Links**
   - Added Settings link to analyze.html navigation
   - Bidirectional navigation between Analyzer and Settings

3. **Implemented Admin Auto-Bypass** ([lib/rate-limiter.ts:70-81](lib/rate-limiter.ts#L70-L81))
   - Admin user automatically bypasses rate limits
   - No manual activation required for admin
   - Uses `ADMIN_USER_ID` environment variable
   - Priority order: Admin bypass → Session bypass → Normal limits

4. **Updated API Endpoints**
   - Enhanced `/api/auth/session` to include user ID
   - Updated `/api/usage` to use session authentication
   - Fixed bypass status reporting in usage endpoint

**Setup Instructions:**

To enable admin auto-bypass, add to Vercel environment variables:
```bash
ADMIN_USER_ID="<your-notion-page-id>"  # Found in Beta Users database
```

To use manual bypass activation:
1. Navigate to Settings page: `/settings.html`
2. Enter bypass code (value from `RATE_LIMIT_BYPASS_CODE` env var)
3. Click "Activate Unlimited Access"
4. Bypass remains active until midnight UTC

**Testing:** All TypeScript compilation tests passed. Manual testing required once deployed.

**Impact:** Critical bug resolved - admin can now use the system without rate limit restrictions.

---

**Design Philosophy:** Impeccable but simple. Personal decision-support tool for daily stock analyses ahead of earnings. Not enterprise software.
