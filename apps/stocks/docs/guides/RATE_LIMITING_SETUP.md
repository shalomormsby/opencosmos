# Rate Limiting Setup Guide - Sage Stocks v1.0

*Last updated: November 3, 2025 at 9:09 AM*

Complete guide to setting up and testing user-level rate limiting with Upstash Redis.

## Table of Contents
1. [Upstash Redis Setup](#upstash-redis-setup)
2. [Environment Variables](#environment-variables)
3. [Local Testing](#local-testing)
4. [Production Deployment](#production-deployment)
5. [Bypass Code Setup](#bypass-code-setup)
6. [Monitoring & Troubleshooting](#monitoring--troubleshooting)

---

## Upstash Redis Setup

### 1. Create Upstash Account

1. Go to https://upstash.com
2. Sign up for a free account (GitHub/Google login available)
3. Verify your email

### 2. Create Redis Database

1. Click "Create Database"
2. Configure:
   - **Name**: `stock-intelligence-rate-limiting`
   - **Type**: Regional
   - **Region**: Choose closest to your Vercel deployment region (e.g., `us-east-1`)
   - **Primary Region**: Same as above
   - **TLS**: Enabled (default)
3. Click "Create"

### 3. Get REST API Credentials

1. Click on your database name
2. Scroll to "REST API" section
3. Copy:
   - **UPSTASH_REDIS_REST_URL** (e.g., `https://us1-xxxxx.upstash.io`)
   - **UPSTASH_REDIS_REST_TOKEN** (long token string)

### 4. Verify Free Tier Limits

Free tier includes:
- ✅ 10,000 commands per day
- ✅ 256 MB storage
- ✅ Unlimited databases
- ✅ 99.99% uptime SLA

This is plenty for rate limiting ~100 users making 10 analyses/day each.

---

## Environment Variables

### Required Variables

Add these to your `.env` file (local) and Vercel environment variables (production):

```bash
# Upstash Redis (for rate limiting)
UPSTASH_REDIS_REST_URL=https://us1-xxxxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=AYxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Rate Limiting Configuration
RATE_LIMIT_ENABLED=true                        # Set to false in development
RATE_LIMIT_MAX_ANALYSES=10                     # Analyses per user per day
RATE_LIMIT_BYPASS_CODE=your-secret-code-here   # 20+ character secret code
```

### Add to Vercel

```bash
# Using Vercel CLI
vercel env add UPSTASH_REDIS_REST_URL
vercel env add UPSTASH_REDIS_REST_TOKEN
vercel env add RATE_LIMIT_ENABLED
vercel env add RATE_LIMIT_MAX_ANALYSES
vercel env add RATE_LIMIT_BYPASS_CODE
```

Or add via Vercel Dashboard:
1. Go to your project → Settings → Environment Variables
2. Add each variable for Production, Preview, and Development
3. Redeploy for changes to take effect

---

## Local Testing

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Local Environment

Copy `.env.v1.example` to `.env` and fill in your credentials:

```bash
cp .env.v1.example .env
```

### 3. Start Local Server

```bash
npm run dev
```

Server will start on `http://localhost:3000`

### 4. Test Normal Rate Limiting

**Test 1: First request (should succeed)**

```bash
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "ticker": "AAPL",
    "userId": "test-user-123"
  }'
```

Expected response:
```json
{
  "success": true,
  "ticker": "AAPL",
  "rateLimit": {
    "remaining": 9,
    "total": 10,
    "resetAt": "2025-11-01T00:00:00.000Z"
  }
}
```

**Test 2: Make 11 requests (11th should fail)**

```bash
# Run this script to make 11 requests
for i in {1..11}; do
  echo "Request $i:"
  curl -X POST http://localhost:3000/api/analyze \
    -H "Content-Type: application/json" \
    -d '{"ticker": "AAPL", "userId": "test-user-123"}'
  echo "\n"
  sleep 1
done
```

11th request expected response:
```json
{
  "success": false,
  "error": "Daily analysis limit reached. Your limit will reset at Nov 1, 12:00 AM PT. Upgrade to Pro for 50 analyses per day or enter your bypass code in Settings.",
  "code": "USER_RATE_LIMIT_EXCEEDED",
  "resetAt": "2025-11-01T00:00:00.000Z",
  "retryAfter": 43200
}
```

**Test 3: Check usage**

```bash
curl http://localhost:3000/api/usage \
  -H "X-User-ID: test-user-123"
```

Expected response:
```json
{
  "success": true,
  "usage": {
    "used": 10,
    "remaining": 0,
    "total": 10,
    "resetAt": "2025-11-01T00:00:00.000Z",
    "bypassed": false
  }
}
```

### 5. Test Bypass Code

**Test 1: Activate bypass**

```bash
curl -X POST http://localhost:3000/api/bypass \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-456",
    "code": "your-secret-code-here"
  }'
```

Expected response:
```json
{
  "success": true,
  "message": "Unlimited access activated until midnight UTC",
  "expiresAt": "2025-11-01T00:00:00.000Z"
}
```

**Test 2: Make analyses with bypass (all should succeed)**

```bash
# Make 15 requests - all should succeed
for i in {1..15}; do
  echo "Request $i (bypassed):"
  curl -X POST http://localhost:3000/api/analyze \
    -H "Content-Type: application/json" \
    -d '{"ticker": "AAPL", "userId": "test-user-456"}'
  echo "\n"
  sleep 1
done
```

All responses should show:
```json
{
  "success": true,
  "rateLimit": {
    "remaining": 999,
    "bypassed": true
  }
}
```

**Test 3: Invalid bypass code**

```bash
curl -X POST http://localhost:3000/api/bypass \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-789",
    "code": "wrong-code"
  }'
```

Expected response:
```json
{
  "success": false,
  "error": "Invalid bypass code"
}
```

### 6. Test Development Mode (Bypass All Limits)

Set in `.env`:
```bash
RATE_LIMIT_ENABLED=false
```

Restart server and make any number of requests - all should succeed with `remaining: 999`.

---

## Production Deployment

### 1. Add Environment Variables to Vercel

```bash
vercel env add UPSTASH_REDIS_REST_URL
vercel env add UPSTASH_REDIS_REST_TOKEN
vercel env add RATE_LIMIT_ENABLED
vercel env add RATE_LIMIT_MAX_ANALYSES
vercel env add RATE_LIMIT_BYPASS_CODE
```

### 2. Deploy to Production

```bash
git add .
git commit -m "Add rate limiting with Upstash Redis (v1.0.0)"
git push origin main
```

Vercel will automatically deploy.

### 3. Test Production Deployment

Replace `localhost:3000` with your Vercel URL:

```bash
curl -X POST https://your-app.vercel.app/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "ticker": "AAPL",
    "userId": "production-test-user"
  }'
```

### 4. Monitor Upstash Dashboard

1. Go to Upstash Dashboard → Your Database
2. Monitor:
   - **Commands/Day**: Should stay well below 10,000
   - **Latency**: Should be <50ms
   - **Storage**: Should be minimal (just counters)

---

## Bypass Code Setup

### 1. Generate Strong Bypass Code

```bash
# On macOS/Linux
openssl rand -base64 32

# Or use any password generator (20+ characters)
# Example: K8mP2nX9vQ7wL4hR3sT6yB1cF5jD0aE8
```

### 2. Add to Environment Variables

Local (`.env`):
```bash
RATE_LIMIT_BYPASS_CODE=K8mP2nX9vQ7wL4hR3sT6yB1cF5jD0aE8
```

Vercel:
```bash
vercel env add RATE_LIMIT_BYPASS_CODE
```

### 3. Share Code Securely

- Store in 1Password/LastPass
- Share via Signal/encrypted messaging
- Do NOT share in public Slack/Discord channels
- Rotate monthly or if compromised

### 4. Test Bypass in Production

```bash
curl -X POST https://your-app.vercel.app/api/bypass \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "your-notion-user-id",
    "code": "K8mP2nX9vQ7wL4hR3sT6yB1cF5jD0aE8"
  }'
```

### 5. Revoke Access

To revoke bypass access:
1. Change `RATE_LIMIT_BYPASS_CODE` in Vercel
2. Redeploy (or wait for automatic deployment)
3. All existing bypass sessions expire at midnight UTC

---

## Monitoring & Troubleshooting

### Monitor Rate Limiting

**Check Upstash Dashboard:**
- Commands per day (should be < 10,000)
- Latency (should be < 50ms)
- Error rate (should be 0%)

**Check Vercel Logs:**
```bash
vercel logs --follow
```

Look for:
- `Rate limit check` - Normal rate limit checks
- `Rate limit exceeded` - Users hitting limits
- `Bypass session activated` - Bypass code usage
- `Rate limiter error` - Redis connection issues

**Check Redis Keys:**

Using Upstash Console or CLI:
```bash
# Rate limit keys (format: rate_limit:{userId}:{YYYY-MM-DD})
KEYS rate_limit:*

# Bypass session keys
KEYS bypass_session:*

# Check specific user's usage
GET rate_limit:test-user-123:2025-10-31
```

### Common Issues

**Issue: Rate limiting not working**

Possible causes:
- `RATE_LIMIT_ENABLED=false` in environment
- Missing Upstash credentials
- Redis connection failure (check logs)

Fix:
1. Verify environment variables are set
2. Check Upstash dashboard for connection issues
3. Check Vercel logs for errors

**Issue: All requests showing 429**

Possible causes:
- Redis key not expiring correctly
- System clock issues

Fix:
1. Delete rate limit key manually in Upstash Console
2. Wait for midnight UTC reset
3. Use bypass code as temporary workaround

**Issue: Bypass code not working**

Possible causes:
- Wrong code entered
- Environment variable not updated in Vercel
- Recent deployment not complete

Fix:
1. Verify code in Vercel environment variables
2. Redeploy application
3. Check logs for bypass validation errors

**Issue: Redis connection timeout**

Possible causes:
- Upstash service issue
- Wrong region selected (high latency)

Fix:
1. Check Upstash status page
2. Consider switching to closer region
3. Rate limiter fails open (allows requests) on Redis errors

### Cost Monitoring

**Upstash Free Tier:**
- 10,000 commands/day = ~416 commands/hour
- Each analysis uses 2 commands (GET + INCR)
- Each bypass check uses 1 command (GET)
- = Supports ~200 analyses/hour or ~4,800 analyses/day

**Upgrade if:**
- Usage consistently > 8,000 commands/day
- Storage > 200 MB
- Need faster response times

**Upgrade to Upstash Pro ($10/month):**
- 1,000,000 commands/day
- 1 GB storage
- Priority support

---

## Production Checklist

- [ ] Upstash Redis database created
- [ ] Environment variables added to Vercel
- [ ] Rate limiting tested locally with 11 requests
- [ ] Bypass code generated and stored securely
- [ ] Bypass activation tested successfully
- [ ] Production deployment completed
- [ ] Production rate limiting verified with test user
- [ ] Upstash dashboard monitored for 24 hours
- [ ] Error handling verified (11th request returns 429)
- [ ] Midnight UTC reset verified
- [ ] Notion user updated with bypass code location
- [ ] Documentation added to project wiki

---

## Next Steps

After rate limiting is working:

1. **v1.0.1 - User Settings Page**: Build UI for users to enter bypass code
2. **v1.0.2 - Admin Dashboard**: Monitor all user rate limits and usage
3. **v1.1 - Tiered Pricing**: Implement Pro (50/day) and Premium (unlimited) tiers

---

## Support

If you encounter issues:

1. Check this documentation
2. Review Vercel logs
3. Check Upstash dashboard
4. Review error messages in responses
5. Test with development mode (`RATE_LIMIT_ENABLED=false`)

For Upstash-specific issues:
- Support: https://upstash.com/docs
- Discord: https://discord.gg/upstash
- Email: support@upstash.com
---

