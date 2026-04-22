#!/bin/bash

echo "╔═══════════════════════════════════════════════════════╗"
echo "║   ⚡ Quick Authentication Verification               ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 1. Server Status
echo -n "1. Server (port 3001): "
if lsof -ti:3001 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Running${NC}"
else
    echo -e "${RED}❌ Not running${NC} (run: npm run admin:server)"
fi

# 2. MAC Address
ACTUAL=$(networksetup -getmacaddress Wi-Fi 2>/dev/null | awk '{print $3}')
ENV=$(grep "ALLOWED_MAC_ADDRESSES" .env 2>/dev/null | cut -d'=' -f2)
echo -n "2. MAC Address: "
if [ "$ACTUAL" = "$ENV" ]; then
    echo -e "${GREEN}✅ Match ($ACTUAL)${NC}"
else
    echo -e "${YELLOW}⚠️  Mismatch${NC}"
    echo "   Actual: $ACTUAL"
    echo "   Config: $ENV"
fi

# 3. Environment Variables
echo -n "3. HMAC Signing: "
if grep -q "REQUEST_SIGNING_SECRET=" .env 2>/dev/null; then
    echo -e "${GREEN}✅ Enabled${NC}"
else
    echo -e "${RED}❌ Disabled${NC}"
fi

echo -n "4. Admin Wallet: "
if grep -q "ADMIN_PRIVATE_KEY=0x" .env 2>/dev/null; then
    echo -e "${GREEN}✅ Configured${NC}"
else
    echo -e "${RED}❌ Not configured${NC}"
fi

echo -n "5. Device Auth: "
if grep -q "ENABLE_DEVICE_AUTH=true" .env 2>/dev/null; then
    echo -e "${GREEN}✅ Enabled${NC}"
else
    echo -e "${YELLOW}⚠️  Disabled${NC}"
fi

# 6. Redis
echo -n "6. Redis Cache: "
if redis-cli ping 2>/dev/null | grep -q "PONG"; then
    echo -e "${GREEN}✅ Connected${NC}"
else
    echo -e "${YELLOW}⚠️  Not running (optional)${NC}"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔑 Quick Tests:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "# Test Admin Login (Password + MAC):"
echo "curl -X POST http://localhost:3001/api/auth/login \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{"
echo "    \"username\": \"admin\","
echo "    \"password\": \"Admin@123456\","
echo "    \"macAddress\": \"$ACTUAL\""
echo "  }'"
echo ""
echo "# Test Device Info:"
echo "curl http://localhost:3001/api/device/info"
echo ""
echo "# Test in Browser:"
echo "  Open: http://localhost:3000"
echo "  Login: admin / Admin@123456"
echo ""
echo "📖 Full Guide: HOW_TO_VERIFY_AUTH_METHODS.md"
echo ""
echo "╔═══════════════════════════════════════════════════════╗"
echo "║   ✅ Verification Complete!                          ║"
echo "╚═══════════════════════════════════════════════════════╝"
