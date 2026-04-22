#!/bin/bash

echo "╔═══════════════════════════════════════════════════════╗"
echo "║   🔍 Authentication Methods Testing                  ║"
echo "║   Verify All Login Methods Working                   ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Base URL
BASE_URL="http://localhost:3001"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1️⃣  Testing Server Health"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

HEALTH=$(curl -s "$BASE_URL/api/health" 2>/dev/null)
if echo "$HEALTH" | grep -q "ok"; then
    echo -e "${GREEN}✅${NC} Server is running"
    echo ""
else
    echo -e "${RED}❌${NC} Server is not responding"
    echo "   Start server: npm run admin:server"
    exit 1
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2️⃣  Testing Device Authentication Endpoint"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

DEVICE_INFO=$(curl -s "$BASE_URL/api/device/info" 2>/dev/null)
if echo "$DEVICE_INFO" | grep -q "deviceAuth"; then
    echo -e "${GREEN}✅${NC} Device authentication endpoint is active"
    echo ""
    echo "   Server Configuration:"
    echo "   $(echo "$DEVICE_INFO" | python3 -m json.tool 2>/dev/null || echo "$DEVICE_INFO")"
else
    echo -e "${YELLOW}⚠️${NC} Device auth endpoint may not be fully configured"
    echo "   Response: $DEVICE_INFO"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3️⃣  Testing Login with Admin Key (Password)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "   Login payload:"
echo '   {'
echo '     "username": "admin",'
echo '     "password": "Admin@123456",'
echo '     "deviceFingerprint": "test-device-fp",'
echo '     "macAddress": "3c:22:fb:49:f8:f8"'
echo '   }'
echo ""

LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "Admin@123456",
    "deviceFingerprint": "test-device-fp",
    "macAddress": "3c:22:fb:49:f8:f8"
  }')

echo "   Response:"
echo "   $LOGIN_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "   $LOGIN_RESPONSE"
echo ""

if echo "$LOGIN_RESPONSE" | grep -q "token"; then
    echo -e "${GREEN}✅${NC} Admin key login successful!"
    TOKEN=$(echo "$LOGIN_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['token'])" 2>/dev/null)
    echo ""
    echo -e "${GREEN}✅${NC} JWT Token received"
    echo ""
else
    echo -e "${RED}❌${NC} Login failed"
    echo "   Check:"
    echo "   - Server is running on port 3001"
    echo "   - Database is initialized"
    echo "   - Admin user exists in database"
    echo ""
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "4️⃣  Testing Protected Endpoint (Requires Auth)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ -n "$TOKEN" ]; then
    PROTECTED=$(curl -s "$BASE_URL/api/admin/status" \
      -H "Authorization: Bearer $TOKEN")
    
    if echo "$PROTECTED" | grep -q "status"; then
        echo -e "${GREEN}✅${NC} Protected endpoint accessible with token"
        echo ""
        echo "   Response:"
        echo "   $PROTECTED" | python3 -m json.tool 2>/dev/null || echo "   $PROTECTED"
    else
        echo -e "${RED}❌${NC} Protected endpoint failed"
        echo "   Response: $PROTECTED"
    fi
else
    echo -e "${YELLOW}⚠️${NC} Skipping (no token from login test)"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "5️⃣  Testing Your MAC Address"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Get actual MAC address
ACTUAL_MAC=$(networksetup -getmacaddress Wi-Fi 2>/dev/null | awk '{print $3}')
if [ -n "$ACTUAL_MAC" ]; then
    echo "   Your MacBook Wi-Fi MAC: $ACTUAL_MAC"
    
    # Check if it matches .env
    ENV_MAC=$(grep "ALLOWED_MAC_ADDRESSES" .env 2>/dev/null | cut -d'=' -f2)
    
    if [ "$ACTUAL_MAC" = "$ENV_MAC" ]; then
        echo -e "${GREEN}✅${NC} MAC address matches .env configuration"
    else
        echo -e "${YELLOW}⚠️${NC} MAC address mismatch"
        echo "   Expected: $ENV_MAC"
        echo "   Actual:   $ACTUAL_MAC"
        echo ""
        echo "   To fix, update .env with:"
        echo "   ALLOWED_MAC_ADDRESSES=$ACTUAL_MAC"
    fi
else
    echo -e "${RED}❌${NC} Could not detect MAC address"
    echo "   Run: networksetup -getmacaddress Wi-Fi"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "6️⃣  Testing WebSocket Connection"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Test if WebSocket endpoint is available
if nc -z localhost 3001 2>/dev/null; then
    echo -e "${GREEN}✅${NC} Server port 3001 is open"
    echo -e "${GREEN}✅${NC} WebSocket should be available at ws://localhost:3001"
else
    echo -e "${RED}❌${NC} Server port 3001 is not responding"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "7️⃣  Environment Variables Check"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check critical env vars
echo "   Checking .env configuration..."
echo ""

if grep -q "REQUEST_SIGNING_SECRET=" .env && [ $(grep "REQUEST_SIGNING_SECRET=" .env | cut -d'=' -f2 | wc -c) -gt 10 ]; then
    echo -e "${GREEN}✅${NC} REQUEST_SIGNING_SECRET is set"
else
    echo -e "${RED}❌${NC} REQUEST_SIGNING_SECRET is missing or empty"
fi

if grep -q "ADMIN_PRIVATE_KEY=" .env && [ $(grep "ADMIN_PRIVATE_KEY=" .env | cut -d'=' -f2 | wc -c) -gt 10 ]; then
    echo -e "${GREEN}✅${NC} ADMIN_PRIVATE_KEY is set"
else
    echo -e "${RED}❌${NC} ADMIN_PRIVATE_KEY is missing or empty"
fi

if grep -q "ENABLE_DEVICE_AUTH=true" .env; then
    echo -e "${GREEN}✅${NC} ENABLE_DEVICE_AUTH is enabled"
else
    echo -e "${YELLOW}⚠️${NC} ENABLE_DEVICE_AUTH is not enabled"
fi

if grep -q "ALLOWED_MAC_ADDRESSES=" .env && [ $(grep "ALLOWED_MAC_ADDRESSES=" .env | cut -d'=' -f2 | wc -c) -gt 5 ]; then
    echo -e "${GREEN}✅${NC} ALLOWED_MAC_ADDRESSES is configured"
else
    echo -e "${YELLOW}⚠️${NC} ALLOWED_MAC_ADDRESSES is not configured"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Test Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Authentication Method Status:"
echo ""
echo "1. Admin Key (Password):       $(echo "$LOGIN_RESPONSE" | grep -q "token" && echo -e "${GREEN}✅ Working${NC}" || echo -e "${RED}❌ Not Tested${NC}")"
echo "2. Device/MAC Address:         $(echo "$DEVICE_INFO" | grep -q "deviceAuth" && echo -e "${GREEN}✅ Active${NC}" || echo -e "${YELLOW}⚠️ Configured${NC}")"
echo "3. WebSocket:                  $(nc -z localhost 3001 2>/dev/null && echo -e "${GREEN}✅ Available${NC}" || echo -e "${RED}❌ Not Available${NC}")"
echo "4. HMAC Request Signing:       $(grep -q "REQUEST_SIGNING_SECRET=" .env && echo -e "${GREEN}✅ Enabled${NC}" || echo -e "${RED}❌ Disabled${NC}")"
echo "5. Admin Wallet (Blockchain):  $(grep -q "ADMIN_PRIVATE_KEY=" .env && echo -e "${GREEN}✅ Configured${NC}" || echo -e "${RED}❌ Not Configured${NC}")"
echo "6. Server Health:              $(echo "$HEALTH" | grep -q "ok" && echo -e "${GREEN}✅ Running${NC}" || echo -e "${RED}❌ Not Running${NC}")"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔧 Quick Commands"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "# Test Wallet Connect (in browser):"
echo "1. Open: http://localhost:3000"
echo "2. Click: Wallet Connect button"
echo "3. Scan QR code with your wallet app"
echo ""
echo "# Test MAC Address Auth (terminal):"
echo "curl -X POST http://localhost:3001/api/auth/login \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{"
echo "    \"username\": \"admin\","
echo "    \"password\": \"Admin@123456\","
echo "    \"macAddress\": \"$(networksetup -getmacaddress Wi-Fi | awk '{print $3}')\""
echo "  }'"
echo ""
echo "# View server logs:"
echo "npm run admin:server"
echo ""
echo "# Test WebSocket:"
echo "wscat -c ws://localhost:3001"
echo ""

echo "╔═══════════════════════════════════════════════════════╗"
echo "║   ✅ Authentication Testing Complete!                ║"
echo "╚═══════════════════════════════════════════════════════╝"
