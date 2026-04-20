#!/bin/bash
###############################################################################
# 🚀 Quick HTTPS Setup for Localhost Backend using Ngrok
# 
# This script helps you expose your localhost:3001 backend to the internet
# with HTTPS for development/testing
###############################################################################

set -e

echo "╔═══════════════════════════════════════════════════════╗"
echo "║   🚀 Ngrok HTTPS Setup for Local Backend            ║"
echo "║   localhost:3001 → https://*.ngrok-free.app         ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""

# ───────────────────────────────────────────────────────────
# 1. CHECK PREREQUISITES
# ───────────────────────────────────────────────────────────

echo "🔍 Step 1: Checking prerequisites..."

# Check if ngrok is installed
if ! command -v ngrok &> /dev/null; then
  echo "❌ Ngrok is not installed!"
  echo ""
  echo "Install with:"
  echo "  brew install ngrok"
  echo ""
  echo "OR download from: https://ngrok.com/download"
  exit 1
fi

echo "✅ Ngrok installed: $(ngrok version)"
echo ""

# Check if backend is running
echo "🔍 Checking if backend is running on port 3001..."
if lsof -i :3001 > /dev/null 2>&1; then
  echo "✅ Backend is running on port 3001"
else
  echo "⚠️  Backend is NOT running on port 3001"
  echo ""
  echo "Start it first:"
  echo "  cd /Users/macbookpri/Downloads/dwallet-v5/server"
  echo "  node enterprise-secure-server.cjs"
  echo ""
  read -p "Start backend now? (y/N): " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    cd /Users/macbookpri/Downloads/dwallet-v5/server
    node enterprise-secure-server.cjs &
    sleep 3
  else
    exit 1
  fi
fi

echo ""

# ───────────────────────────────────────────────────────────
# 2. START NGROK
# ───────────────────────────────────────────────────────────

echo "🌐 Step 2: Starting Ngrok tunnel..."
echo ""
echo "Starting ngrok on port 3001..."
echo "Press Ctrl+C to stop the tunnel"
echo ""

ngrok http 3001 --log=stdout | tee ngrok.log &
NGROK_PID=$!

# Wait for ngrok to start
sleep 3

# Get the ngrok URL
NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | python3 -c "import sys, json; print(json.load(sys.stdin)['tunnels'][0]['public_url'])" 2>/dev/null || echo "Check ngrok terminal")

echo ""
echo "╔═══════════════════════════════════════════════════════╗"
echo "║   ✅ Ngrok Tunnel Active!                            ║"
echo "║                                                       ║"
echo "║   Your HTTPS URL: $NGROK_URL                        ║"
echo "║                                                       ║"
echo "║   Backend: http://localhost:3001                     ║"
echo "║   Public:    $NGROK_URL                             ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""

# ───────────────────────────────────────────────────────────
# 3. UPDATE CONFIGURATION
# ───────────────────────────────────────────────────────────

echo "🔧 Step 3: Update your configuration..."
echo ""
echo "1. Add this to your frontend .env or config:"
echo "   VITE_BACKEND_URL=$NGROK_URL"
echo ""
echo "2. Add to backend .env ADMIN_ALLOWED_ORIGINS:"
echo "   ADMIN_ALLOWED_ORIGINS=http://localhost:5173,$NGROK_URL"
echo ""
echo "3. Test the connection:"
echo "   curl $NGROK_URL/api/admin/health"
echo ""

# ───────────────────────────────────────────────────────────
# 4. TEST CONNECTION
# ───────────────────────────────────────────────────────────

echo "🧪 Step 4: Testing connection..."
sleep 2

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$NGROK_URL/api/admin/health" 2>/dev/null || echo "000")

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "401" ]; then
  echo "✅ Backend is accessible via ngrok! (HTTP $HTTP_CODE)"
  echo ""
  echo "🎉 SUCCESS! Your backend is now accessible via HTTPS"
else
  echo "⚠️  Backend returned HTTP $HTTP_CODE"
  echo "   This might be normal (401 = needs authentication)"
fi

echo ""
echo "╔═══════════════════════════════════════════════════════╗"
echo "║   ⚠️  IMPORTANT NOTES                                ║"
echo "║                                                       ║"
echo "║   1. Keep this terminal running                       ║"
echo "║   2. URL changes when you restart ngrok               ║"
echo "║   3. For permanent URL, upgrade ngrok ($8/month)      ║"
echo "║   4. For production, use a cloud server instead       ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""
echo "Press Ctrl+C to stop the tunnel"

# Wait for ngrok to stop
wait $NGROK_PID
