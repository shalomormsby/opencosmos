# Third-Party API Access Proposal

**Date:** December 10, 2025
**Status:** 📋 Proposal
**Purpose:** Enable secure API access for 3rd party apps (e.g., BaseBase) after cron backdoor removal

---

## Background

### The Problem
- **Before:** BaseBase (and potentially other 3rd parties) accessed Sage Stocks analyses via a cron header backdoor
- **Security Issue:** This backdoor bypassed all authentication, allowing unauthorized access
- **Cleanup:** The backdoor was removed during the recent security cleanup and `.env` purge
- **Impact:** BaseBase can no longer fetch analyses for their standalone version (non-Notion)

### Current Authentication
The `/api/analyze` endpoint currently requires:
- OAuth session cookie from Notion login (`requireAuthSession`)
- Valid user in Beta Users database
- Encrypted access token for Notion API calls
- User must be in "approved" status

**This makes sense for the web app** but blocks legitimate 3rd party integrations.

---

## Research Findings

### 1. Old API Key System (Removed)
The `docs/architecture/api.md` file documents a v1.0 API key system:
- `API_KEY` environment variable
- Optional authentication via `X-API-Key` header or `Authorization: Bearer` token
- **Status:** NOT implemented in current codebase (docs are outdated)

### 2. Current Analyze Endpoint Flow
```typescript
// api/analyze/index.ts
export default async function handler(req, res) {
  // 1. Require OAuth session (blocks 3rd parties)
  const session = await requireAuthSession(req, res);
  if (!session) return;

  // 2. Get user from database
  const user = await getUserByEmail(session.email);

  // 3. Decrypt user's Notion access token
  const userAccessToken = await safeDecryptToken(user.accessToken);

  // 4. Run analysis with user's credentials
  // ...
}
```

**Problem:** This requires:
1. User to be logged in via Notion OAuth
2. User's access token for Notion API calls
3. User-specific database IDs

**3rd parties need:** Just the analysis data, without Notion integration.

### 3. BaseBase Use Case
BaseBase provides a standalone version of Sage Stocks that:
- Does NOT use Notion (local storage instead)
- Still needs stock analysis data
- Was previously fetching from Sage Stocks via backdoor
- Needs a secure, authorized way to get analyses

---

## Proposed Solution: Partner API System

### Overview
Create a secure, token-based API specifically for trusted 3rd party partners.

### Key Features
1. **Separate endpoint:** `/api/partner/analyze`
2. **API key authentication:** Simple, secure token-based auth
3. **No Notion required:** Returns raw analysis data (JSON)
4. **Rate limiting:** Prevent abuse
5. **Partner management:** Track usage per partner

---

## Architecture

### 1. Partner API Keys
Store partner API keys in environment variables:
```bash
# .env / Vercel Environment Variables
PARTNER_API_KEYS=basebase:sk_live_abc123,othertool:sk_live_xyz789
```

Format: `partner_name:api_key,partner_name:api_key`

### 2. New Endpoint: `/api/partner/analyze`

**Request:**
```bash
POST /api/partner/analyze
Content-Type: application/json
X-Partner-API-Key: sk_live_abc123

{
  "ticker": "AAPL",
  "partnerId": "basebase"  # Optional, for tracking
}
```

**Response:**
```json
{
  "success": true,
  "ticker": "AAPL",
  "timestamp": "2025-12-10T10:30:00Z",
  "analysis": {
    "scores": {
      "composite": 3.85,
      "technical": 4.2,
      "fundamental": 3.8,
      "macro": 3.5,
      "risk": 2.1,
      "sentiment": 4.0,
      "recommendation": "BUY"
    },
    "narrative": "AAPL shows strong technical momentum...",
    "keyMetrics": {
      "price": 195.50,
      "marketCap": 3000000000000,
      "pe": 32.5,
      "eps": 6.01
    },
    "marketContext": {
      "regime": "Bull Market",
      "spy": { "price": 580.25, "change1D": 0.5 }
    },
    "upcomingEvents": [
      {
        "eventType": "Earnings",
        "eventDate": "2025-01-28",
        "daysUntil": 48
      }
    ]
  },
  "dataQuality": {
    "completeness": 0.94,
    "grade": "A - Excellent",
    "confidence": "High"
  },
  "performance": {
    "duration": 12543,
    "fmpCalls": 11,
    "fredCalls": 6
  }
}
```

**Key Differences from Regular Endpoint:**
- ✅ Returns raw JSON (no Notion storage)
- ✅ No OAuth required
- ✅ No user-specific data
- ✅ Simpler response structure
- ❌ Does NOT write to Notion databases
- ❌ Does NOT create Stock History entries

### 3. Authentication Flow
```typescript
// lib/core/partner-auth.ts
export function validatePartnerApiKey(apiKey: string): {
  valid: boolean;
  partnerId?: string;
} {
  const partnerKeys = process.env.PARTNER_API_KEYS || '';
  const pairs = partnerKeys.split(',');

  for (const pair of pairs) {
    const [partnerId, key] = pair.split(':');
    if (key === apiKey) {
      return { valid: true, partnerId };
    }
  }

  return { valid: false };
}
```

### 4. Rate Limiting
Use existing rate limiter with partner-specific limits:
```typescript
// Separate rate limit pool for partners
const partnerLimits = {
  basebase: { daily: 500, hourly: 50 },  // More generous than end users
  default: { daily: 100, hourly: 20 }
};
```

---

## Implementation Plan

### Phase 1: Core Partner API ✅ **RECOMMENDED START**
**Effort:** 2-3 hours
**Files to create/modify:**
1. `lib/core/partner-auth.ts` - API key validation
2. `api/partner/analyze.ts` - New endpoint
3. `lib/domain/analysis/partner-adapter.ts` - Convert full analysis to partner format

**Steps:**
1. Create partner authentication helper
2. Create new `/api/partner/analyze` endpoint
3. Reuse existing analysis logic but skip Notion writes
4. Return clean JSON response
5. Add basic rate limiting

### Phase 2: Usage Tracking (Optional)
**Effort:** 1-2 hours
**Features:**
- Log partner API calls to Redis
- Track usage per partner
- Usage dashboard at `/api/partner/usage`

### Phase 3: Advanced Features (Future)
**Effort:** 4-6 hours
**Features:**
- Webhook notifications when analysis complete
- Batch analysis endpoint
- Historical data access
- Custom rate limits per partner

---

## Security Considerations

### ✅ Strengths
1. **API keys rotatable:** If compromised, easy to change
2. **No user data exposed:** Partner API doesn't access user-specific Notion data
3. **Rate limiting:** Prevents abuse
4. **Audit trail:** Log all partner API calls
5. **Separate endpoint:** Doesn't affect existing user-facing API

### ⚠️ Risks & Mitigations
| Risk | Mitigation |
|------|-----------|
| API key leaked | Use `sk_live_` prefix, rotate keys, monitor usage |
| Excessive usage | Implement rate limiting (500/day per partner) |
| Data scraping | Rate limits + usage monitoring |
| Cost explosion | Alert on unusual FMP/FRED API usage |

### 🔒 Best Practices
- Store API keys in Vercel environment variables (encrypted at rest)
- Use HTTPS only (Vercel default)
- Log all partner API calls for audit
- Set up alerts for unusual usage patterns
- Document API keys in secure location (1Password, etc.)

---

## Alternative Solutions (Rejected)

### ❌ Option 1: Re-enable Cron Header Backdoor
**Why rejected:** Security risk. Anyone can spoof cron headers.

### ❌ Option 2: Share OAuth Sessions
**Why rejected:** Violates Notion's terms, exposes user data.

### ❌ Option 3: Give Partners Direct Database Access
**Why rejected:** Too permissive, no rate limiting, security nightmare.

### ❌ Option 4: Webhook-Only Integration
**Why rejected:** BaseBase needs on-demand analysis, not just listening to events.

---

## Recommendation

**Implement Phase 1: Core Partner API**

**Why:**
- ✅ Simplest solution (2-3 hours)
- ✅ Secure (token-based auth)
- ✅ Solves BaseBase's immediate need
- ✅ Extensible (can add Phase 2/3 later)
- ✅ Clean separation from user-facing API
- ✅ No breaking changes to existing system

**Next Steps:**
1. Get BaseBase API key requirements
2. Implement partner authentication
3. Create `/api/partner/analyze` endpoint
4. Test with BaseBase team
5. Monitor usage for 1 week
6. Evaluate need for Phase 2 features

---

## Example Implementation (Simplified)

### File: `api/partner/analyze.ts`
```typescript
import { VercelRequest, VercelResponse } from '@vercel/node';
import { validatePartnerApiKey } from '../../lib/core/partner-auth';
import { createFMPClient } from '../../lib/integrations/fmp/client';
import { createFREDClient } from '../../lib/integrations/fred/client';
import { createStockScorer } from '../../lib/domain/analysis/scoring';
// ... other imports

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 1. Validate API key
  const apiKey = req.headers['x-partner-api-key'] as string;
  const auth = validatePartnerApiKey(apiKey);

  if (!auth.valid) {
    return res.status(401).json({
      success: false,
      error: 'Invalid API key'
    });
  }

  // 2. Get ticker from request
  const { ticker } = req.body;
  if (!ticker) {
    return res.status(400).json({
      success: false,
      error: 'Ticker required'
    });
  }

  // 3. Run analysis (reuse existing logic, skip Notion writes)
  const fmpClient = createFMPClient(process.env.FMP_API_KEY || '');
  const fredClient = createFREDClient(process.env.FRED_API_KEY || '');

  // ... fetch data from FMP/FRED
  // ... run scoring
  // ... generate AI narrative

  // 4. Return clean JSON (no Notion)
  return res.status(200).json({
    success: true,
    ticker,
    timestamp: new Date().toISOString(),
    analysis: {
      scores: { /* ... */ },
      narrative: '...',
      keyMetrics: { /* ... */ },
      marketContext: { /* ... */ },
      upcomingEvents: [ /* ... */ ]
    },
    dataQuality: { /* ... */ },
    performance: { /* ... */ }
  });
}
```

---

## Questions for BaseBase Team

1. **Usage volume:** How many analyses per day? BB's answer: For phase 1, up to 100 (with the ability to scale to thousands)
2. **Response time:** Is 10-15 seconds acceptable? BB's answer: Yes
3. **Data freshness:** BB's answer: Real-time or cached OK? Cached for how long? 15 mins is acceptable. Longer becomes problematic. 
4. **Webhook support:** Do you need async notifications? BB's answer: Ultimately yes, but not required for phase 1.
5. **Batch processing:** Need multiple tickers at once? BB's answer: To support the multi-tenant architecture, yes. [I.e., two users requesting stock analyses at the same time should not crash the system.]  

## Answers from BaseBase Team

1. **Usage volume:** For phase 1, up to 100 (with the ability to scale to thousands)
2. **Response time:** Is 10-15 seconds acceptable? Yes
3. **Data freshness:** Cached for how long? 15 mins is acceptable. Longer becomes problematic. 
4. **Webhook support:** Ultimately yes, but not required for phase 1.
5. **Batch processing:** To support the multi-tenant architecture, yes. [I.e., two users requesting stock analyses at the same time should not crash the system.]  
**Note** Critical requirement: Must fully support multi-tenant architecture. 

---

## Cost Analysis

### Current Costs (Per Analysis)
- FMP API: ~11 calls × $0.0001 = $0.0011
- FRED API: ~6 calls × $0 = $0 (free)
- LLM (Anthropic): ~$0.03 (Claude Sonnet)
- **Total per analysis:** ~$0.031

### Partner API Impact
- BaseBase estimates: 100 analyses/day
- Monthly cost: 100 × 30 × $0.031 = **$93/month**
- Vercel function invocations: 3,000/month (well within free tier)

**Recommendation:** Charge partners a monthly fee ($150-200) to cover costs + margin.

---

## Success Metrics

After 1 week of Phase 1 deployment:
- [ ] Zero unauthorized access attempts
- [ ] <1% error rate on partner API
- [ ] Average response time <15 seconds
- [ ] BaseBase integration successful
- [ ] No user-facing API disruptions

---

## Next Actions

1. **User decides:** Approve this proposal?
2. **If yes:** Implement Phase 1 (2-3 hours)
3. **Get BaseBase API key:** Coordinate with their team
4. **Deploy & test:** Verify integration works
5. **Monitor:** Track usage for 1 week
6. **Iterate:** Add Phase 2 features if needed
