#!/bin/bash

# ═══════════════════════════════════════════════════════
# 📊 ADMIN DASHBOARD STATUS CHECKER
# ═══════════════════════════════════════════════════════

echo "╔═══════════════════════════════════════════════════════╗"
echo "║   📊 Admin Dashboard Status Check                   ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check PostgreSQL
echo -n "📊 PostgreSQL: "
if pg_isready -q 2>/dev/null; then
    echo -e "${GREEN}✅ Running${NC}"
else
    echo -e "${RED}❌ Not Running${NC}"
    echo "   Fix: brew services start postgresql"
fi

# Check Backend
echo -n "🔐 Backend (port 3001): "
if curl -s http://localhost:3001/api/admin/health > /dev/null 2>&1; then
    STATUS=$(curl -s http://localhost:3001/api/admin/health | jq -r '.status')
    UPTIME=$(curl -s http://localhost:3001/api/admin/health | jq -r '.uptime')
    echo -e "${GREEN}✅ Running (status: $STATUS, uptime: ${UPTIME}s)${NC}"
else
    echo -e "${RED}❌ Not Running${NC}"
    echo "   Fix: node server/enterprise-secure-server.cjs"
fi

# Check Frontend
echo -n "🎨 Frontend (port 5173): "
if curl -s -I http://localhost:5173/ > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Running${NC}"
else
    echo -e "${RED}❌ Not Running${NC}"
    echo "   Fix: npm run dev"
fi

# Check Admin Key in .env
echo -n "🔑 Admin Key configured: "
if grep -q "^ADMIN_SECRET_KEY=" .env 2>/dev/null; then
    KEY_LENGTH=$(grep "^ADMIN_SECRET_KEY=" .env | cut -d'=' -f2 | wc -c | tr -d ' ')
    if [ $KEY_LENGTH -gt 32 ]; then
        echo -e "${GREEN}✅ Yes ($((KEY_LENGTH - 1)) chars)${NC}"
    else
        echo -e "${RED}❌ Too short (min 32 chars needed)${NC}"
    fi
else
    echo -e "${RED}❌ Not found in .env${NC}"
fi

# Check Database
echo -n "🗄️  Database (dwallet_admin): "
if psql -d dwallet_admin -c "SELECT 1" > /dev/null 2>&1; then
    TABLES=$(psql -d dwallet_admin -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" | tr -d ' ')
    echo -e "${GREEN}✅ Connected ($TABLES tables)${NC}"
else
    echo -e "${RED}❌ Cannot connect${NC}"
fi

echo ""
echo "╔═══════════════════════════════════════════════════════╗"

# All checks
ALL_GOOD=true
curl -s http://localhost:3001/api/admin/health > /dev/null 2>&1 || ALL_GOOD=false
curl -s -I http://localhost:5173/ > /dev/null 2>&1 || ALL_GOOD=false

if [ "$ALL_GOOD" = true ]; then
    echo -e "║   ${GREEN}✅ ALL SYSTEMS OPERATIONAL${NC}                        ║"
    echo "╚═══════════════════════════════════════════════════════╝"
    echo ""
    echo "🔐 Admin Dashboard: http://localhost:5173/admin"
    echo ""
else
    echo -e "║   ${RED}❌ SOME SYSTEMS OFFLINE${NC}                           ║"
    echo "╚═══════════════════════════════════════════════════════╝"
    echo ""
    echo "🔧 To start everything:"
    echo "   ./start-admin.sh"
    echo ""
fi
