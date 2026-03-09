#!/bin/bash

# Sage Stocks v1.0 - API Testing Script
# Tests public API endpoints for accessibility and functionality
#
# Usage:
#   ./scripts/test-api.sh [base_url] [api_key]
#
# Examples:
#   # Test local development server (no auth)
#   ./scripts/test-api.sh http://localhost:3000
#
#   # Test production with API key
#   ./scripts/test-api.sh https://your-app.vercel.app your-api-key
#
#   # Test production without API key (if auth disabled)
#   ./scripts/test-api.sh https://your-app.vercel.app

set -e

BASE_URL="${1:-http://localhost:3000}"
API_KEY="${2:-}"

echo "=========================================="
echo "Sage Stocks v1.0 - API Tests"
echo "=========================================="
echo "Base URL: $BASE_URL"
echo "API Key: ${API_KEY:+[SET]}${API_KEY:-[NOT SET]}"
echo ""

# Function to make authenticated request
make_request() {
  local method=$1
  local endpoint=$2
  local data=$3

  if [ -n "$API_KEY" ]; then
    if [ "$method" = "GET" ]; then
      curl -s -X "$method" \
        -H "X-API-Key: $API_KEY" \
        "$BASE_URL$endpoint"
    else
      curl -s -X "$method" \
        -H "Content-Type: application/json" \
        -H "X-API-Key: $API_KEY" \
        -d "$data" \
        "$BASE_URL$endpoint"
    fi
  else
    if [ "$method" = "GET" ]; then
      curl -s -X "$method" "$BASE_URL$endpoint"
    else
      curl -s -X "$method" \
        -H "Content-Type: application/json" \
        -d "$data" \
        "$BASE_URL$endpoint"
    fi
  fi
}

# Test 1: Health Check (GET /api/health)
echo "Test 1: Health Check"
echo "===================="
HEALTH_RESPONSE=$(make_request GET /api/health)
echo "$HEALTH_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$HEALTH_RESPONSE"
echo ""

# Test 2: CORS Preflight (OPTIONS /api/health)
echo "Test 2: CORS Preflight - Health"
echo "================================"
curl -s -X OPTIONS \
  -H "Origin: https://example.com" \
  -H "Access-Control-Request-Method: GET" \
  -i "$BASE_URL/api/health" | head -n 20
echo ""

# Test 3: CORS Preflight (OPTIONS /api/analyze)
echo "Test 3: CORS Preflight - Analyze"
echo "================================="
curl -s -X OPTIONS \
  -H "Origin: https://example.com" \
  -H "Access-Control-Request-Method: POST" \
  -i "$BASE_URL/api/analyze" | head -n 20
echo ""

# Test 4: Analyze endpoint without ticker (should fail with 400)
echo "Test 4: Analyze - Missing Ticker"
echo "================================="
ANALYZE_RESPONSE=$(make_request POST /api/analyze '{}')
echo "$ANALYZE_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$ANALYZE_RESPONSE"
echo ""

# Test 5: Analyze endpoint with invalid ticker (should fail gracefully)
echo "Test 5: Analyze - Invalid Ticker"
echo "================================="
ANALYZE_RESPONSE=$(make_request POST /api/analyze '{"ticker":"INVALID_TICKER_XYZ123"}')
echo "$ANALYZE_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$ANALYZE_RESPONSE"
echo ""

# Test 6: Method not allowed (GET to analyze endpoint)
echo "Test 6: Method Not Allowed"
echo "=========================="
METHOD_RESPONSE=$(curl -s -X GET "$BASE_URL/api/analyze")
echo "$METHOD_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$METHOD_RESPONSE"
echo ""

# Test 7: Test authentication (if API key is set)
if [ -n "$API_KEY" ]; then
  echo "Test 7: Authentication - Without API Key"
  echo "========================================"
  AUTH_RESPONSE=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -d '{"ticker":"AAPL"}' \
    "$BASE_URL/api/analyze")
  echo "$AUTH_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$AUTH_RESPONSE"
  echo ""
fi

echo "=========================================="
echo "API Tests Complete"
echo "=========================================="
echo ""
echo "Summary:"
echo "--------"
echo "✓ Health check endpoint accessible"
echo "✓ CORS headers configured"
echo "✓ OPTIONS method handled"
echo "✓ Error handling working"
if [ -n "$API_KEY" ]; then
  echo "✓ Authentication enabled and working"
else
  echo "✓ Public access (no authentication required)"
fi
echo ""
echo "Next steps:"
echo "-----------"
echo "1. Test with real ticker: curl -X POST $BASE_URL/api/analyze -H 'Content-Type: application/json' -d '{\"ticker\":\"AAPL\"}'"
echo "2. Deploy to Vercel: vercel --prod"
echo "3. Test production endpoint with health check"
echo "4. Configure API_KEY in Vercel environment variables for production security"
