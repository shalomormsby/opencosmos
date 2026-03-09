# Sage Stocks API v1.0

*Last updated: November 3, 2025 at 9:09 AM*

Public API documentation for Sage Stocks serverless endpoints.

## Base URL

- **Development:** `http://localhost:3000`
- **Production:** `https://your-app.vercel.app`

## Authentication

Authentication is **optional** and controlled by the `API_KEY` environment variable:

- **If `API_KEY` is set:** All endpoints (except `/api/health`) require authentication
- **If `API_KEY` is not set:** Endpoints are publicly accessible without authentication

### Authentication Methods

Include your API key using one of these methods:

**Method 1: X-API-Key Header (Recommended)**
```bash
curl -X POST https://your-app.vercel.app/api/analyze \
  -H "X-API-Key: your-api-key-here" \
  -H "Content-Type: application/json" \
  -d '{"ticker": "AAPL"}'
```

**Method 2: Authorization Bearer Token**
```bash
curl -X POST https://your-app.vercel.app/api/analyze \
  -H "Authorization: Bearer your-api-key-here" \
  -H "Content-Type: application/json" \
  -d '{"ticker": "AAPL"}'
```

## CORS Support

All endpoints support Cross-Origin Resource Sharing (CORS):

- **Access-Control-Allow-Origin:** `*` (all origins)
- **Access-Control-Allow-Methods:** `GET, POST, OPTIONS`
- **Access-Control-Allow-Headers:** `Content-Type, Authorization, X-API-Key`

CORS preflight requests (OPTIONS method) are automatically handled.

## Endpoints

### 1. Health Check

Check API status and get endpoint information.

- **URL:** `/api/health`
- **Method:** `GET`
- **Auth Required:** No
- **Timeout:** 10 seconds

#### Request

```bash
curl https://your-app.vercel.app/api/health
```

#### Response

```json
{
  "status": "ok",
  "version": "1.0.0-beta.1",
  "timestamp": "2025-10-29T12:34:56.789Z",
  "environment": "production",
  "auth": {
    "enabled": false,
    "method": "none"
  },
  "endpoints": [
    {
      "path": "/api/health",
      "method": "GET",
      "description": "Health check and API information",
      "requiresAuth": false
    },
    {
      "path": "/api/analyze",
      "method": "POST",
      "description": "Analyze a stock and sync to Notion",
      "requiresAuth": false
    },
    {
      "path": "/api/webhook",
      "method": "POST",
      "description": "Notion webhook handler",
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

### 2. Stock Analysis

Analyze a stock and sync results to Notion.

- **URL:** `/api/analyze`
- **Method:** `POST`
- **Auth Required:** Optional (if `API_KEY` is set)
- **Timeout:** 300 seconds (5 minutes)

#### Request Body

```json
{
  "ticker": "AAPL",
  "usePollingWorkflow": true,
  "timeout": 600,
  "pollInterval": 10,
  "skipPolling": false
}
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `ticker` | string | Yes | - | Stock ticker symbol (e.g., "AAPL", "TSLA") |
| `usePollingWorkflow` | boolean | No | `true` | Use v0.3.0 workflow (poll for AI analysis) |
| `timeout` | number | No | `600` | Polling timeout in seconds (max 600) |
| `pollInterval` | number | No | `10` | Poll interval in seconds |
| `skipPolling` | boolean | No | `false` | Skip polling entirely |

#### Example Request

```bash
curl -X POST https://your-app.vercel.app/api/analyze \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key-here" \
  -d '{
    "ticker": "AAPL",
    "usePollingWorkflow": true,
    "timeout": 600,
    "pollInterval": 10
  }'
```

#### Success Response (200 OK)

```json
{
  "success": true,
  "ticker": "AAPL",
  "analysesPageId": "293a1d1b-67e0-814e-9f60-f980653845e8",
  "historyPageId": "393a1d1b-67e0-814e-9f60-f980653845e9",
  "scores": {
    "composite": 3.85,
    "technical": 4.2,
    "fundamental": 3.8,
    "macro": 3.5,
    "risk": 2.1,
    "sentiment": 4.0,
    "recommendation": "BUY"
  },
  "dataQuality": {
    "completeness": 0.94,
    "grade": "A - Excellent",
    "confidence": "High"
  },
  "performance": {
    "duration": 12543,
    "fmpCalls": 11,
    "fredCalls": 6,
    "notionCalls": 5
  },
  "workflow": {
    "pollingCompleted": true,
    "archived": true,
    "status": "Logged in History"
  }
}
```

#### Error Response (400 Bad Request)

```json
{
  "success": false,
  "ticker": "Unknown",
  "analysesPageId": null,
  "historyPageId": null,
  "error": "Invalid ticker",
  "details": "Ticker is required and must be a string",
  "performance": {
    "duration": 42,
    "fmpCalls": 0,
    "fredCalls": 0,
    "notionCalls": 0
  }
}
```

#### Error Response (401 Unauthorized)

```json
{
  "success": false,
  "error": "Unauthorized",
  "details": "Valid API key required. Include X-API-Key header or Authorization: Bearer <key>"
}
```

### 3. Webhook Handler

Notion webhook handler for analysis triggers and archiving.

- **URL:** `/api/webhook`
- **Method:** `POST`
- **Auth Required:** Optional (if `API_KEY` is set)
- **Timeout:** 60 seconds

#### Request Body (Archive Action)

```json
{
  "action": "archive",
  "pageId": "293a1d1b-67e0-814e-9f60-f980653845e8"
}
```

#### Request Body (Analysis Trigger)

```json
{
  "page": {
    "id": "293a1d1b-67e0-814e-9f60-f980653845e8",
    "properties": {
      "Ticker": {
        "type": "title",
        "title": [
          {
            "plain_text": "AAPL"
          }
        ]
      }
    }
  }
}
```

#### Example Request

```bash
curl -X POST https://your-app.vercel.app/api/webhook \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key-here" \
  -d '{
    "action": "archive",
    "pageId": "293a1d1b-67e0-814e-9f60-f980653845e8"
  }'
```

#### Success Response (Archive)

```json
{
  "success": true,
  "archiveTriggered": true,
  "historyPageId": "393a1d1b-67e0-814e-9f60-f980653845e9",
  "message": "Analysis successfully archived to Stock History"
}
```

#### Success Response (Analysis Trigger)

```json
{
  "success": true,
  "ticker": "AAPL",
  "analysisTriggered": true,
  "message": "Analysis triggered for AAPL. Check Notion for results."
}
```

## Deployment

### 1. Deploy to Vercel

```bash
# Install Vercel CLI (if not already installed)
npm i -g vercel

# Deploy to production
vercel --prod
```

### 2. Configure Environment Variables

In your Vercel project settings, add the following environment variables:

**Required:**
- `FMP_API_KEY` - Financial Modeling Prep API key
- `FRED_API_KEY` - FRED API key
- `NOTION_API_KEY` - Notion integration token
- `STOCK_ANALYSES_DB_ID` - Notion Stock Analyses database ID
- `STOCK_HISTORY_DB_ID` - Notion Stock History database ID

**Optional:**
- `API_KEY` - Enable authentication (leave empty for public access)
- `NOTION_WEBHOOK_SECRET` - Webhook signature verification

### 3. Test Your Deployment

```bash
# Test health check
curl https://your-app.vercel.app/api/health

# Test analysis (replace with your API key if needed)
curl -X POST https://your-app.vercel.app/api/analyze \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{"ticker": "AAPL"}'
```

## Security Considerations

### Production Recommendations

1. **Enable Authentication:** Set `API_KEY` environment variable in production
2. **Use HTTPS:** Vercel automatically provides SSL/TLS certificates
3. **Rate Limiting:** Consider adding rate limiting for public endpoints
4. **Webhook Signature:** Set `NOTION_WEBHOOK_SECRET` and verify signatures
5. **Monitor Usage:** Track API calls and set up alerts for unusual activity

### Development vs Production

**Development (No Auth):**
```bash
# No API_KEY set - public access
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"ticker": "AAPL"}'
```

**Production (With Auth):**
```bash
# API_KEY set in Vercel - requires authentication
curl -X POST https://your-app.vercel.app/api/analyze \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-secret-key" \
  -d '{"ticker": "AAPL"}'
```

## Error Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 400 | Bad Request - Invalid parameters |
| 401 | Unauthorized - Invalid or missing API key |
| 405 | Method Not Allowed - Wrong HTTP method |
| 500 | Internal Server Error - Server-side error |

## Rate Limits

Vercel serverless functions have the following limits:

- **Function Timeout:**
  - `/api/analyze`: 300 seconds (5 minutes)
  - `/api/webhook`: 60 seconds
  - `/api/health`: 10 seconds

- **Concurrent Executions:** 1000 (Hobby), 3000+ (Pro/Enterprise)
- **Invocations:** 100,000/month (Hobby), unlimited (Pro/Enterprise)

External API rate limits:
- **FMP:** Varies by plan (check your subscription)
- **FRED:** 120 requests/minute
- **Notion:** 3 requests/second (rate limited internally)

## Testing Script

Use the provided testing script to verify your API:

```bash
# Test local development server
./scripts/test-api.sh http://localhost:3000

# Test production without auth
./scripts/test-api.sh https://your-app.vercel.app

# Test production with auth
./scripts/test-api.sh https://your-app.vercel.app your-api-key
```

## Support

For issues or questions:
- Check the [Vercel documentation](https://vercel.com/docs)
- Review the [Notion API documentation](https://developers.notion.com)
- Open an issue in the project repository
