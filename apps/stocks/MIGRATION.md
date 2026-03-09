# Sage Stocks Monorepo Migration

**Migration Date:** 2026-01-03
**Migration Type:** Clean copy (Option 2)
**Source:** `github.com/shalomormsby/sagestocks`
**Destination:** `github.com/shalomormsby/ecosystem/apps/sage-stocks`

## Migration Summary

Successfully migrated Sage Stocks from a standalone repository to the ecosystem monorepo structure. This migration was **non-destructive** - the original repository remains intact and operational.

### Files Migrated

- ✅ **235 files** copied successfully
- ✅ **96 TypeScript files** (16,047+ lines of code)
- ✅ **52 documentation files**
- ✅ **21 custom scripts** (test, maintenance, debug)
- ✅ **17 API endpoints** (Vercel serverless functions)
- ✅ All configuration files (package.json, tsconfig.json, vercel.json, etc.)

### Configuration Changes Made

#### 1. Package.json
- Updated package name: `sagestocks` → `@ecosystem/sage-stocks`
- Added `"private": true` for monorepo compliance
- All scripts remain functional

#### 2. Path Resolution Fix
- **File:** [api/page/index.ts](api/page/index.ts#L18)
- **Change:** Replaced `process.cwd()` with `__dirname`
- **Reason:** Ensures correct path resolution in monorepo context
- **Before:** `join(process.cwd(), 'public', 'pages', 'analyze.html')`
- **After:** `join(__dirname, '../../public', 'pages', 'analyze.html')`

#### 3. TypeScript Configuration
- **File:** [tsconfig.json](tsconfig.json)
- **Added:** Path aliases for cleaner imports
  ```json
  {
    "baseUrl": ".",
    "paths": {
      "@/api/*": ["api/*"],
      "@/lib/*": ["lib/*"],
      "@/config/*": ["config/*"]
    }
  }
  ```
- **Note:** Path aliases are optional but recommended for future development

### Build Verification

✅ **Type-check passed:** `npm run type-check`
✅ **Build succeeded:** `npm run build`
✅ **Dependencies installed:** 622 packages

### Environment Variables

⚠️ **IMPORTANT:** You must configure 40+ environment variables in the new location:

#### Required API Keys
- `FMP_API_KEY` - Financial Modeling Prep API
- `FRED_API_KEY` - Federal Reserve Economic Data API
- `NOTION_API_KEY` - Notion integration token
- `ANTHROPIC_API_KEY` - Claude AI (recommended)
- `GEMINI_API_KEY` - Google Gemini (alternative)
- `OPENAI_API_KEY` - OpenAI (alternative)

#### Database Configuration (Notion)
- `STOCK_ANALYSES_DB_ID`
- `STOCK_HISTORY_DB_ID`
- `STOCK_COMPARISONS_DB_ID`
- `MARKET_CONTEXT_DB_ID`
- `SAGE_STOCKS_TEMPLATE_ID`

#### Redis (Rate Limiting)
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

#### Application Settings
- `LLM_PROVIDER` (gemini, claude, openai)
- `LLM_MODEL_NAME`
- `RATE_LIMIT_ENABLED` (true/false)
- `RATE_LIMIT_MAX_ANALYSES` (default: 10)
- `RATE_LIMIT_BYPASS_CODE`
- `DEFAULT_TIMEZONE` (IANA format)
- `API_KEY` (optional auth)
- `API_BASE_URL` (default: http://localhost:3000)
- `POLL_INTERVAL` (default: 30 seconds)

#### Orchestrator Configuration
- `ANALYSIS_DELAY_MS` (default: 8000ms)
- `CHUNK_SIZE` (default: 8)
- `ORCHESTRATOR_DRY_RUN` (default: false)

**See [.env.example](.env.example) for complete list and defaults.**

---

## Next Steps for Deployment

### 1. Vercel Configuration

When deploying to Vercel, you have two options:

**Option A: Deploy from apps/sage-stocks directory**
1. Create new Vercel project
2. Set **Root Directory** to `apps/sage-stocks`
3. Framework Preset: Other
4. Build Command: `npm run type-check`
5. Output Directory: (leave blank)
6. Install Command: `npm install`

**Option B: Configure from monorepo root**
Update `vercel.json` with monorepo-aware paths:
```json
{
  "buildCommand": "cd apps/sage-stocks && npm run type-check",
  "installCommand": "cd apps/sage-stocks && npm install"
}
```

### 2. Import Environment Variables

1. Go to Vercel Project Settings → Environment Variables
2. Import all 40+ variables from your existing Sage Stocks deployment
3. Or manually configure using [.env.example](.env.example) as reference

### 3. Configure Cron Jobs

Reconfigure these 4 scheduled tasks in Vercel:

```json
[
  {
    "path": "/api/jobs/market-context",
    "schedule": "0 13 * * 1-5"
  },
  {
    "path": "/api/cron/scheduled-analyses",
    "schedule": "30 13 * * 1-5"
  },
  {
    "path": "/api/cron/scheduled-analyses",
    "schedule": "45 13 * * 1-5"
  },
  {
    "path": "/api/jobs/stock-events",
    "schedule": "0 12 * * 0"
  }
]
```

### 4. Test Deployment

Before going live, verify:

- [ ] All API endpoints respond correctly
- [ ] Notion integration works (read/write)
- [ ] FMP/FRED API integrations functional
- [ ] LLM integrations operational (Claude/Gemini/OpenAI)
- [ ] Rate limiting works with Upstash Redis
- [ ] Cron jobs execute as scheduled
- [ ] OAuth flow works (if enabled)

### 5. Archive Old Repository

Once the new deployment is verified and stable:

1. ✅ Keep original repo for 1-2 weeks as fallback
2. ✅ Add **"ARCHIVED - Moved to ecosystem monorepo"** to repo description
3. ✅ Update README.md with redirect to new location
4. ⚠️ Do NOT delete immediately
5. ⚠️ Consider keeping old Vercel deployment running temporarily

---

## Migration Risk Assessment

### ✅ Low Risk (Completed Successfully)

- No active CI/CD pipelines to migrate
- No Docker configurations to update
- No git hooks to transfer
- All imports are relative (no framework path aliases to migrate)
- Well-structured codebase with clear separation of concerns
- Path resolution fixed for monorepo context
- TypeScript compilation verified
- Build process validated

### ⚠️ Medium Risk (Requires Attention)

- **Vercel Configuration:** Need to set root directory or update paths
- **Environment Variables:** Must transfer all 40+ variables carefully
- **Cron Jobs:** Need reconfiguration in new Vercel project
- **Deployment Testing:** Should test in staging/preview first

### 🔴 High Risk (Test Thoroughly)

- **Notion Integration:** Verify API keys and database IDs work
- **Upstash Redis:** Confirm connection strings are correct
- **LLM Providers:** Test all three providers (Claude/Gemini/OpenAI)
- **OAuth Flow:** If using authorization, test complete flow

---

## Running the Application

### Local Development

```bash
# Navigate to app directory
cd apps/sage-stocks

# Install dependencies (if not already done)
npm install

# Copy environment variables
cp .env.example .env
# Then edit .env with your actual values

# Run local dev server
npm run dev

# The app will be available at http://localhost:3000
```

### Running Scripts

All npm scripts work as before:

```bash
# Type checking
npm run type-check

# Build
npm run build

# Tests
npm test
npm run test:analyze
npm run test:orchestrator

# Maintenance
npm run poll
npm run cleanup-template
npm run clear-tokens
```

### Using from Monorepo Root

If you want to run commands from the ecosystem root:

```bash
# From /ecosystem directory
cd apps/sage-stocks && npm run dev
```

Or add workspace scripts to the root package.json:

```json
{
  "scripts": {
    "sage-stocks:dev": "cd apps/sage-stocks && npm run dev",
    "sage-stocks:build": "cd apps/sage-stocks && npm run build"
  }
}
```

---

## What Was NOT Changed

The following remain exactly as they were:

- ✅ All business logic and domain code
- ✅ API endpoint implementations
- ✅ Notion integration logic
- ✅ LLM provider integrations
- ✅ Database schemas and validators
- ✅ Error handling and logging
- ✅ Rate limiting implementation
- ✅ Authentication and authorization
- ✅ All test scripts
- ✅ Documentation (except this migration doc)

---

## Rollback Plan

If you need to rollback to the original standalone repository:

1. The original `sagestocks` repository is **completely untouched**
2. Simply redeploy from the original repo
3. No code changes were made to the original
4. All environment variables are still in place

---

## Support & Documentation

- **Main README:** [README.md](README.md)
- **API Documentation:** [docs/architecture/api.md](docs/architecture/api.md)
- **Setup Guide:** [docs/setup/README.md](docs/setup/README.md)
- **Deployment Guide:** [docs/deployment/README.md](docs/deployment/README.md)
- **Architecture Overview:** [docs/architecture/overview.md](docs/architecture/overview.md)

---

## Migration Completed By

**Date:** January 3, 2026
**Method:** Fresh copy with configuration updates (Option 2)
**Status:** ✅ **Successful** - Build verified, type-check passed
**Original Repository:** Preserved and operational

---

## Verification Checklist

- [x] All 235 files copied successfully
- [x] Package.json updated for monorepo
- [x] Path resolution fixed (api/page/index.ts)
- [x] TypeScript configuration updated
- [x] Path aliases added for cleaner imports
- [x] Dependencies installed (622 packages)
- [x] Type-check passes with no errors
- [x] Build succeeds with no errors
- [x] .gitignore properly excludes .env files
- [x] Git repository initialized (already existed)
- [x] Changes staged for commit
- [ ] Vercel project created and configured
- [ ] Environment variables imported
- [ ] Cron jobs reconfigured
- [ ] Deployment tested
- [ ] All endpoints verified
- [ ] Original repository archived

---

**Next Action:** Deploy to Vercel and complete post-migration testing checklist above.
