#!/bin/bash

# ═══════════════════════════════════════════════════════
# 🔐 START ADMIN DASHBOARD (Backend + Frontend)
# ═══════════════════════════════════════════════════════

echo "╔═══════════════════════════════════════════════════════╗"
echo "║   🔐 Starting dWallet Admin Dashboard               ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if PostgreSQL is running
echo -n "📊 Checking PostgreSQL... "
if pg_isready -q 2>/dev/null; then
    echo -e "${GREEN}✅ Running${NC}"
else
    echo -e "${RED}❌ Not running${NC}"
    echo "   Start with: brew services start postgresql"
    exit 1
fi

# Kill existing servers
echo ""
echo "🔄 Stopping existing servers..."
pkill -f "enterprise-secure-server.cjs" 2>/dev/null
pkill -f "vite" 2>/dev/null
sleep 2

# Start Backend
echo ""
echo -e "${BLUE}🚀 Starting Backend Server (port 3001)...${NC}"
cd /Users/macbookpri/Downloads/dwallet-v5
node server/enterprise-secure-server.cjs &
BACKEND_PID=$!
sleep 3

# Check if backend started
echo -n "   Checking backend... "
if curl -s http://localhost:3001/api/admin/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Running${NC}"
else
    echo -e "${RED}❌ Failed to start${NC}"
    exit 1
fi

# Start Frontend
echo ""
echo -e "${BLUE}🎨 Starting Frontend Server (port 5173)...${NC}"
npm run dev &
FRONTEND_PID=$!
sleep 3

# Summary
echo ""
echo "╔═══════════════════════════════════════════════════════╗"
echo "║   ✅ ADMIN DASHBOARD RUNNING                        ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""
echo "📊 Backend:  http://localhost:3001 (PID: $BACKEND_PID)"
echo "🎨 Frontend: http://localhost:5173 (PID: $FRONTEND_PID)"
echo "🔐 Admin:    http://localhost:5173/admin"
echo ""
echo "🛑 To stop:  pkill -f 'enterprise-secure-server.cjs' && pkill -f 'vite'"
echo ""
echo "📝 Admin Key: 4426de8cded7656fc186228298104e293b7e338bee9ea680058515983abf1987"
echo ""

# Wait for processes
wait
