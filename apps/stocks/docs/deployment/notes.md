# Deployment Notes: Admin Bypass Fix

**Date:** November 5, 2025
**Version:** v1.0.2d
**Bug Fix:** Admin bypass code stored but never activated

---

## Changes Summary

### New Files Created
1. **public/settings.html** (420 LOC)
   - Settings page with bypass activation UI
   - Usage statistics dashboard
   - Bypass status display with countdown timer
   - Session-based authentication

### Modified Files
1. **lib/rate-limiter.ts**
   - Added `adminUserId` property
   - Implemented admin auto-bypass logic
   - Updated priority order in `checkAndIncrement()`
   - Updated documentation

2. **api/auth/session.ts**
   - Added `id` (user's Notion page ID) to session response
   - Required for Settings page to get user ID

3. **api/usage.ts**
   - Converted to session-based authentication
   - Fixed property name from `used` to `count`
   - Enhanced error handling

4. **public/analyze.html**
   - Added Settings link to navigation

5. **ROADMAP.md**
   - Added bug fix documentation section
   - Documented resolution and setup instructions

---

## Environment Variables Required

### For Admin Auto-Bypass (Recommended)

Add this to Vercel environment variables:

```bash
ADMIN_USER_ID="<notion-page-id-from-beta-users-db>"
```

**How to find your Notion page ID:**
1. Open Notion Beta Users database
2. Open your user record as a page
3. Copy the page URL: `https://notion.so/<workspace>/<page-id>`
4. Extract the page ID (with dashes)
5. Add to Vercel: `ADMIN_USER_ID="<page-id>"`

### Existing Variables (No Changes)

These should already be set:
- `RATE_LIMIT_BYPASS_CODE` - Manual bypass code
- `UPSTASH_REDIS_REST_URL` - Redis URL
- `UPSTASH_REDIS_REST_TOKEN` - Redis token
- `ADMIN_EMAIL` - Admin email address

---

## Deployment Steps

### 1. Deploy to Vercel

```bash
# Ensure all changes are committed
git status

# Deploy to production
git push origin main
```

Vercel will automatically deploy the changes.

### 2. Add Environment Variable

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add new variable:
   - **Name:** `ADMIN_USER_ID`
   - **Value:** Your Notion page ID from Beta Users database
   - **Environments:** Production, Preview, Development
3. Click "Save"
4. Redeploy the project to apply env var changes

### 3. Test the Implementation

#### Test 1: Settings Page Access
1. Navigate to: `https://your-domain.vercel.app/settings.html`
2. Verify page loads and shows your email
3. Check that usage statistics display correctly
4. Verify bypass status shows "Inactive"

#### Test 2: Manual Bypass Activation
1. Enter your bypass code in the input field
2. Click "Activate Unlimited Access"
3. Verify success message appears
4. Check that bypass status changes to "Active"
5. Verify expiration time shows midnight UTC

#### Test 3: Admin Auto-Bypass (If ADMIN_USER_ID is set)
1. Navigate to Analyzer page
2. Run a stock analysis (any ticker)
3. Check Vercel logs for: "Request allowed via admin auto-bypass"
4. Verify no rate limit errors occur
5. Run 10+ analyses to confirm unlimited access

#### Test 4: Navigation
1. Click Settings link from Analyzer page
2. Verify navigation works
3. Click back to Analyzer from Settings
4. Confirm bidirectional navigation

---

## How It Works

### Admin Auto-Bypass Flow

```
User makes analysis request
    ↓
Rate limiter checks user ID
    ↓
Is user ID == ADMIN_USER_ID? → YES → Allow (999 remaining)
    ↓ NO
Check Redis for active bypass session
    ↓
Has active session? → YES → Allow (999 remaining)
    ↓ NO
Apply normal rate limiting (10/day)
```

### Manual Bypass Activation Flow

```
User navigates to Settings page
    ↓
User enters bypass code
    ↓
Click "Activate Unlimited Access"
    ↓
POST to /api/bypass with {userId, code}
    ↓
Backend validates code
    ↓
Store session in Redis (TTL = midnight UTC)
    ↓
All subsequent requests bypass rate limit until midnight
```

---

## Priority Order

The rate limiter checks in this order:

1. **Admin Auto-Bypass** (highest priority)
   - Checks if `userId === ADMIN_USER_ID`
   - Returns 999 remaining immediately
   - No Redis check needed

2. **Active Bypass Session**
   - Checks Redis for `bypass_session:{userId}`
   - Returns 999 remaining if found
   - Session expires at midnight UTC

3. **Development Mode**
   - Checks if `RATE_LIMIT_ENABLED === 'false'`
   - Returns 999 remaining

4. **Normal Rate Limiting**
   - Checks Redis counter
   - Enforces 10 analyses per day
   - Resets at midnight UTC

---

## Rollback Plan

If issues occur after deployment:

### Immediate Rollback
```bash
# Revert to previous commit
git revert HEAD
git push origin main
```

### Disable Admin Auto-Bypass Only
1. Remove `ADMIN_USER_ID` from Vercel environment variables
2. Redeploy
3. Admin will use manual bypass activation instead

### Disable Settings Page Only
Remove the Settings link from analyze.html, but keep the backend changes (they're harmless even if unused).

---

## Expected Logs

### Admin Auto-Bypass (when ADMIN_USER_ID is set)
```
INFO: Request allowed via admin auto-bypass { userId: "<page-id>" }
```

### Manual Bypass Activation
```
INFO: Bypass activation via JSON body { userId: "<page-id>" }
INFO: Bypass session activated successfully { userId: "<page-id>", expiresAt: "2025-11-06T00:00:00.000Z" }
```

### Normal Analysis Request
```
INFO: Rate limit check { userId: "<page-id>", currentCount: 0, maxAnalyses: 10 }
INFO: Rate limit allowed { userId: "<page-id>", newCount: 1, remaining: 9 }
```

---

## Support & Troubleshooting

### Issue: "User ID not found" error in Settings
- **Cause:** Session doesn't have user ID
- **Fix:** Ensure you're logged in and session is valid
- **Solution:** Logout and login again

### Issue: Admin still hitting rate limits
- **Check 1:** Verify `ADMIN_USER_ID` is set in Vercel
- **Check 2:** Confirm the ID matches your Beta Users page ID
- **Check 3:** Ensure you redeployed after adding env var
- **Check 4:** Check Vercel logs for "admin auto-bypass" message

### Issue: Invalid bypass code error
- **Check 1:** Verify `RATE_LIMIT_BYPASS_CODE` matches what you're entering
- **Check 2:** Check for extra spaces or typos
- **Check 3:** Confirm env var is set in Vercel

### Issue: Bypass expires immediately
- **Cause:** Session might have wrong TTL
- **Fix:** Check Redis TTL calculation in rate-limiter.ts
- **Workaround:** Reactivate bypass code

---

## Cost Impact

**No additional costs** - Uses existing infrastructure:
- Static HTML file (free on Vercel)
- Redis operations (already in use)
- No new API calls or services

---

## Security Notes

- Bypass code is validated server-side only
- Session stored in Redis with automatic TTL
- All activation attempts are logged
- Admin user ID is server-side only (not exposed to client)
- Code easily changeable via environment variable

---

**Status:** Ready to deploy
**Risk Level:** Low (no breaking changes, only additions)
**Estimated Deployment Time:** 5-10 minutes
**Testing Time:** 10-15 minutes
