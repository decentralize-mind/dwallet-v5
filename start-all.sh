#!/bin/bash

echo "╔═══════════════════════════════════════════════════════╗"
echo "║   🚀 Starting dWallet Admin Dashboard               ║"
echo "║   Backend + Frontend                                 ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Kill existing processes
echo -e "${YELLOW}📦 Stopping existing servers...${NC}"
lsof -ti:3001 | xargs kill -9 2>/dev/null
lsof -ti:5173 | xargs kill -9 2>/dev/null
sleep 2

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}1️⃣  Starting Backend Server (port 3001)${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Start backend in background
cd /Users/macbookpri/Downloads/dwallet-v5
npm run admin:server &
BACKEND_PID=$!

# Wait for backend to start
echo "   Waiting for backend to initialize..."
sleep 5

# Check if backend is running
if lsof -ti:3001 > /dev/null 2>&1; then
    echo -e "   ${GREEN}✅ Backend running on http://localhost:3001${NC}"
else
    echo -e "   ${RED}❌ Backend failed to start${NC}"
    echo "   Check logs above for errors"
    exit 1
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}2️⃣  Starting Frontend Dev Server (port 5173)${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Start frontend in background
npm run dev &
FRONTEND_PID=$!

# Wait for frontend to start
echo "   Waiting for frontend to initialize..."
sleep 5

# Check if frontend is running
if lsof -ti:5173 > /dev/null 2>&1; then
    echo -e "   ${GREEN}✅ Frontend running on http://localhost:5173${NC}"
else
    echo -e "   ${YELLOW}⚠️  Frontend may still be starting...${NC}"
fi

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Servers Started Successfully!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "🌐 Access Points:"
echo "   Frontend (Dev):  http://localhost:5173"
echo "   Backend API:     http://localhost:3001"
echo ""
echo "🔑 Login Credentials:"
echo "   Username: admin"
echo "   Password: Admin@123456"
echo ""
echo "📊 Process IDs:"
echo "   Backend:  $BACKEND_PID"
echo "   Frontend: $FRONTEND_PID"
echo ""
echo "🛑 To stop servers:"
echo "   kill $BACKEND_PID $FRONTEND_PID"
echo "   or press Ctrl+C in their terminals"
echo ""
echo "📝 Server logs are running in background."
echo "   To view: tail -f /tmp/dwallet-*.log"
echo ""
echo "╔═══════════════════════════════════════════════════════╗"
echo "║   🎉 Ready! Open http://localhost:5173 in browser   ║"
echo "╚═══════════════════════════════════════════════════════╝"
