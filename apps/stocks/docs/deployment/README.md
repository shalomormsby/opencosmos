# Deployment Checklist - Making API Endpoints Public

*Last updated: November 3, 2025 at 9:09 AM*

## Quick Start

### 1. Pre-Deployment Checklist

- [ ] All TypeScript code passes type checking
  ```bash
  npm run type-check
  ```

- [ ] Environment variables configured in `.env` file
  ```bash
  cp .env.v1.example .env
  # Edit .env with your actual API keys
  ```

- [ ] Test locally (if not in Claude Code environment)
  ```bash
  vercel dev
  # In another terminal:
  curl http://localhost:3000/api/health
  ```

### 2. Deploy to Vercel

```bash
# Install Vercel CLI (if not already installed)
npm i -g vercel

# Login to Vercel
vercel login

# Deploy to production
vercel --prod
```

### 3. Configure Vercel Environment Variables

Go to your Vercel project dashboard → Settings → Environment Variables

**Required Variables:**
```
FMP_API_KEY=your_fmp_api_key
FRED_API_KEY=your_fred_api_key
NOTION_API_KEY=your_notion_token
STOCK_ANALYSES_DB_ID=your_analyses_db_id
STOCK_HISTORY_DB_ID=your_history_db_id
```

**Optional Security Variables:**
```
API_KEY=your_custom_api_key_for_authentication
NOTION_WEBHOOK_SECRET=your_webhook_secret
```

**Note:** If you don't set `API_KEY`, the endpoints will be publicly accessible without authentication.

### 4. Test Production Deployment

```bash
# Get your deployment URL from Vercel output
PROD_URL="https://your-app.vercel.app"

# Test health check
curl $PROD_URL/api/health

# Test with authentication (if API_KEY is set)
curl -X POST $PROD_URL/api/analyze \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{"ticker": "AAPL"}'

# Test without authentication (if API_KEY is not set)
curl -X POST $PROD_URL/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"ticker": "AAPL"}'
```

### 5. Verify CORS Configuration

Test from a browser or with curl:

```bash
curl -X OPTIONS $PROD_URL/api/analyze \
  -H "Origin: https://example.com" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -i
```

You should see these headers in the response:
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET,POST,OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization, X-API-Key
```

## Configuration Details

### vercel.json Configuration

The following settings make your API publicly accessible:

```json
{
  "version": 2,
  "functions": {
    "api/analyze.ts": {
      "maxDuration": 300  // 5 minutes for long-running analysis
    },
    "api/webhook.ts": {
      "maxDuration": 60   // 1 minute for webhooks
    },
    "api/health.ts": {
      "maxDuration": 10   // 10 seconds for health checks
    }
  },
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        { "key": "Access-Control-Allow-Origin", "value": "*" },
        { "key": "Access-Control-Allow-Methods", "value": "GET,POST,OPTIONS" },
        { "key": "Access-Control-Allow-Headers", "value": "Content-Type, Authorization, X-API-Key" }
      ]
    }
  ]
}
```

### API Endpoints

All endpoints are publicly accessible at:

- **Health Check:** `GET /api/health` (always public)
- **Stock Analysis:** `POST /api/analyze` (public or authenticated)
- **Webhook Handler:** `POST /api/webhook` (public or authenticated)

### Authentication Options

**Option 1: Public Access (No Authentication)**
- Don't set `API_KEY` in Vercel environment variables
- All endpoints are publicly accessible
- Recommended for: Development, trusted environments, internal use

**Option 2: Protected Access (API Key Required)**
- Set `API_KEY` in Vercel environment variables
- Clients must include API key in requests
- Recommended for: Production, public-facing APIs, untrusted environments

Include API key in requests:
```bash
# Method 1: X-API-Key header (recommended)
curl -H "X-API-Key: your-api-key" ...

# Method 2: Authorization Bearer token
curl -H "Authorization: Bearer your-api-key" ...
```

## Security Best Practices

### For Public Deployment

1. **Enable Authentication**
   ```bash
   # In Vercel dashboard, add environment variable:
   API_KEY=generate_a_strong_random_key_here
   ```

2. **Use Webhook Signatures**
   ```bash
   # In Vercel dashboard, add environment variable:
   NOTION_WEBHOOK_SECRET=your_webhook_secret
   ```

3. **Monitor Usage**
   - Enable Vercel Analytics
   - Set up alerts for unusual activity
   - Review logs regularly

4. **Rate Limiting** (Optional)
   - Consider adding Vercel Edge Config for rate limiting
   - Use Vercel KV for user quotas
   - Implement IP-based throttling

### For Internal Use

1. **Network Restrictions** (Enterprise only)
   - Use Vercel firewall rules
   - Restrict access to specific IP ranges
   - Use VPN for access

2. **Notion Integration Security**
   - Use integration secrets
   - Limit database permissions
   - Audit access logs

## Troubleshooting

### Issue: 401 Unauthorized

**Cause:** API key is required but not provided or incorrect

**Solution:**
```bash
# Include API key in request
curl -H "X-API-Key: your-api-key" ...

# OR remove API_KEY from Vercel environment variables to disable auth
```

### Issue: CORS Errors in Browser

**Cause:** CORS preflight not handled or headers not set

**Solution:** Already configured in `vercel.json`. If issues persist:
1. Clear browser cache
2. Check browser console for specific error
3. Verify headers with: `curl -i $URL`

### Issue: Function Timeout

**Cause:** Analysis takes longer than timeout limit

**Solution:** Already configured with 300s timeout. If needed:
1. Increase timeout in `vercel.json` (max 300s for Hobby, 900s for Pro)
2. Use `skipPolling: true` to avoid waiting for AI analysis
3. Process analysis asynchronously

### Issue: 405 Method Not Allowed

**Cause:** Using wrong HTTP method (e.g., GET instead of POST)

**Solution:**
- `/api/health` → GET
- `/api/analyze` → POST
- `/api/webhook` → POST

## Vercel-Specific Features

### Custom Domains

Add a custom domain in Vercel dashboard:
```
Settings → Domains → Add Domain
```

Then access your API at:
```
https://api.yourdomain.com/api/analyze
```

### Environment Variables by Branch

Set different API keys for different branches:
- Production: `main` branch
- Preview: `dev` branch
- Development: Local `.env` file

### Logs and Monitoring

View logs in Vercel dashboard:
```
Deployments → [Your Deployment] → Function Logs
```

Or use Vercel CLI:
```bash
vercel logs [deployment-url]
```

## Next Steps

After successful deployment:

1. [ ] Test all endpoints with the provided test script
   ```bash
   ./scripts/test-api.sh https://your-app.vercel.app
   ```

2. [ ] Configure Notion automations to call your API
   - Set webhook URL to `https://your-app.vercel.app/api/webhook`
   - Include `X-API-Key` header if authentication is enabled

3. [ ] Set up monitoring and alerts
   - Enable Vercel Analytics
   - Configure error notifications
   - Monitor API usage

4. [ ] Update documentation with your production URL
   - Share API docs with team
   - Update Notion workspace documentation
   - Add examples for common use cases

## Rollback

If something goes wrong:

```bash
# List recent deployments
vercel ls

# Rollback to previous deployment
vercel rollback [deployment-url]
```

Or in Vercel dashboard:
```
Deployments → [Previous Deployment] → Promote to Production
```

## Support Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Vercel Serverless Functions](https://vercel.com/docs/functions)
- [Notion API Documentation](https://developers.notion.com)
- [API Documentation](./API.md)
