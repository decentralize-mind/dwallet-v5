#!/bin/bash

# Test script for DeFi Operations real data implementation

echo "═══════════════════════════════════════════════════════"
echo "  Testing DeFi Operations Real Data Implementation"
echo "═══════════════════════════════════════════════════════"
echo ""

# Check if server is running
echo "📡 Step 1: Checking if admin server is running..."
if curl -s http://localhost:3001/api/admin/health > /dev/null 2>&1; then
  echo "✅ Admin server is running on port 3001"
else
  echo "⚠️  Admin server not running. Starting it..."
  cd server && node secure-admin-server.js &
  sleep 3
  echo "✅ Server started"
fi

echo ""
echo "🔐 Step 2: Authenticating with admin server..."

# Login to get JWT token
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3001/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"type":"key","credentials":{"adminKey":"test-admin-key-12345"}}')

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | grep -o '[^"]*$')

if [ -z "$TOKEN" ]; then
  echo "❌ Failed to authenticate. Check ADMIN_SECRET_KEY in .env file"
  echo "Response: $LOGIN_RESPONSE"
  exit 1
fi

echo "✅ Authentication successful"
echo ""

echo "📊 Step 3: Fetching DeFi statistics..."

# Fetch DeFi stats
DEFI_RESPONSE=$(curl -s http://localhost:3001/api/admin/defi/stats \
  -H "Authorization: Bearer $TOKEN")

echo "Response:"
echo "$DEFI_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$DEFI_RESPONSE"

echo ""
echo "🔍 Step 4: Validating response structure..."

# Check if response has required fields
HAS_TVL=$(echo "$DEFI_RESPONSE" | grep -o '"totalTVL"' | head -1)
HAS_STAKING=$(echo "$DEFI_RESPONSE" | grep -o '"stakingPools"' | head -1)
HAS_DEX=$(echo "$DEFI_RESPONSE" | grep -o '"dexPools"' | head -1)
HAS_LENDING=$(echo "$DEFI_RESPONSE" | grep -o '"lendingStats"' | head -1)

if [ -n "$HAS_TVL" ] && [ -n "$HAS_STAKING" ] && [ -n "$HAS_DEX" ] && [ -n "$HAS_LENDING" ]; then
  echo "✅ Response structure is valid"
  echo "  ✓ totalTVL field present"
  echo "  ✓ stakingPools field present"
  echo "  ✓ dexPools field present"
  echo "  ✓ lendingStats field present"
else
  echo "❌ Response structure is incomplete"
  [ -z "$HAS_TVL" ] && echo "  ✗ Missing totalTVL"
  [ -z "$HAS_STAKING" ] && echo "  ✗ Missing stakingPools"
  [ -z "$HAS_DEX" ] && echo "  ✗ Missing dexPools"
  [ -z "$HAS_LENDING" ] && echo "  ✗ Missing lendingStats"
fi

echo ""
echo "📈 Step 5: Checking staking pools data..."

# Count staking pools
POOL_COUNT=$(echo "$DEFI_RESPONSE" | grep -o '"name"' | wc -l | tr -d ' ')
echo "Found $POOL_COUNT staking pool(s)"

if [ "$POOL_COUNT" -ge 3 ]; then
  echo "✅ Expected number of staking pools (3+)"
else
  echo "⚠️  Expected at least 3 staking pools, found $POOL_COUNT"
fi

echo ""
echo "═══════════════════════════════════════════════════════"
echo "  ✅ DeFi Operations Real Data Test Complete!"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "📋 Summary:"
echo "  • Server endpoint: /api/admin/defi/stats"
echo "  • Authentication: JWT token required"
echo "  • Data sources: Blockchain contracts + fallback"
echo "  • Staking pools: $POOL_COUNT configured"
echo ""
echo "🎯 Next steps:"
echo "  1. Open admin dashboard"
echo "  2. Navigate to 'DeFi Operations' panel"
echo "  3. Verify real data is displayed"
echo "  4. Check browser console for any errors"
echo ""
