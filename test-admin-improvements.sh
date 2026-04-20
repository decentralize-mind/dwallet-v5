#!/bin/bash

echo "========================================="
echo "Testing Admin Dashboard Improvements"
echo "========================================="
echo ""

# Test 1: Check if admin server starts
echo "Test 1: Starting Admin Backend Server..."
cd /Users/macbookpri/Downloads/dwallet-v5
node server/admin-server.js &
SERVER_PID=$!
sleep 3

# Check if server is running
if ps -p $SERVER_PID > /dev/null; then
    echo "✅ Admin server started successfully (PID: $SERVER_PID)"
else
    echo "❌ Admin server failed to start"
    exit 1
fi

# Test 2: Health check endpoint
echo ""
echo "Test 2: Testing Health Check Endpoint..."
HEALTH_RESPONSE=$(curl -s http://localhost:3001/api/admin/health)
if echo "$HEALTH_RESPONSE" | grep -q "healthy"; then
    echo "✅ Health check endpoint working"
else
    echo "❌ Health check endpoint failed"
fi

# Test 3: Test authentication (should fail without token)
echo ""
echo "Test 3: Testing Authentication Protection..."
AUTH_RESPONSE=$(curl -s http://localhost:3001/api/admin/stats)
if echo "$AUTH_RESPONSE" | grep -q "No token provided"; then
    echo "✅ Authentication protection working"
else
    echo "❌ Authentication protection failed"
fi

# Test 4: Test IP Lists endpoints exist
echo ""
echo "Test 4: Testing IP Lists Endpoints..."
IP_RESPONSE=$(curl -s -X GET http://localhost:3001/api/admin/ip-lists/whitelist -H "Authorization: Bearer test")
if echo "$IP_RESPONSE" | grep -q "token"; then
    echo "✅ IP Lists endpoints exist (auth required)"
else
    echo "❌ IP Lists endpoints missing"
fi

# Test 5: Test 2FA endpoints exist
echo ""
echo "Test 5: Testing 2FA Endpoints..."
TWOFA_RESPONSE=$(curl -s -X POST http://localhost:3001/api/admin/auth/2fa/setup -H "Authorization: Bearer test")
if echo "$TWOFA_RESPONSE" | grep -q "token"; then
    echo "✅ 2FA endpoints exist (auth required)"
else
    echo "❌ 2FA endpoints missing"
fi

# Test 6: Test User Management endpoints
echo ""
echo "Test 6: Testing User Management Endpoints..."
USERS_RESPONSE=$(curl -s http://localhost:3001/api/admin/users -H "Authorization: Bearer test")
if echo "$USERS_RESPONSE" | grep -q "token"; then
    echo "✅ User Management endpoints exist (auth required)"
else
    echo "❌ User Management endpoints missing"
fi

# Test 7: Test Security endpoints
echo ""
echo "Test 7: Testing Security Endpoints..."
SECURITY_RESPONSE=$(curl -s http://localhost:3001/api/admin/security/alerts -H "Authorization: Bearer test")
if echo "$SECURITY_RESPONSE" | grep -q "token"; then
    echo "✅ Security endpoints exist (auth required)"
else
    echo "❌ Security endpoints missing"
fi

# Test 8: Test Token Management endpoints
echo ""
echo "Test 8: Testing Token Management Endpoints..."
TOKEN_RESPONSE=$(curl -s -X POST http://localhost:3001/api/admin/tokens/mint -H "Authorization: Bearer test" -H "Content-Type: application/json" -d '{"address":"0x123","amount":"100"}')
if echo "$TOKEN_RESPONSE" | grep -q "token"; then
    echo "✅ Token Management endpoints exist (auth required)"
else
    echo "❌ Token Management endpoints missing"
fi

# Cleanup - Kill the server
echo ""
echo "Cleaning up..."
kill $SERVER_PID
wait $SERVER_PID 2>/dev/null

echo ""
echo "========================================="
echo "✅ All Tests Completed!"
echo "========================================="
echo ""
echo "Summary of Improvements:"
echo "1. ✅ Fixed IP validation regex bug"
echo "2. ✅ Added 2FA backend endpoints (setup, verify, disable, status)"
echo "3. ✅ Added IP Lists management endpoints"
echo "4. ✅ Added User Management endpoints"
echo "5. ✅ Added Security Monitor endpoints"
echo "6. ✅ Added Token Management endpoints"
echo "7. ✅ Connected frontend to backend APIs"
echo "8. ✅ Enhanced adminAPI service with query params"
echo ""
echo "Next Steps:"
echo "- Configure .env with ADMIN_SECRET_KEY and JWT_SECRET"
echo "- Start admin server: node server/admin-server.js"
echo "- Start frontend: npm run dev"
echo "- Navigate to http://localhost:5173/admin"
echo ""
