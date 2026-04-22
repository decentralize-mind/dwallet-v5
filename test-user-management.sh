#!/bin/bash

echo "========================================="
echo "Testing User Management API"
echo "========================================="
echo ""

# Test 1: Health Check
echo "Test 1: Health Check"
HEALTH=$(curl -s http://localhost:3001/api/admin/health)
echo "$HEALTH" | python3 -m json.tool
echo ""

# Test 2: Try to get users without authentication (should fail)
echo "Test 2: Get Users Without Auth (should fail)"
curl -s http://localhost:3001/api/admin/users | python3 -m json.tool
echo ""

# Test 3: Login with admin key to get token
echo "Test 3: Login with Admin Key"
echo "Please provide your ADMIN_SECRET_KEY from .env file:"
read -s ADMIN_KEY
echo ""

LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3001/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"type\":\"key\",\"credentials\":{\"adminKey\":\"$ADMIN_KEY\"}}")

echo "$LOGIN_RESPONSE" | python3 -m json.tool
echo ""

# Extract token
TOKEN=$(echo "$LOGIN_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['token'])" 2>/dev/null)

if [ -z "$TOKEN" ]; then
  echo "❌ Failed to get authentication token. Please check your admin key."
  exit 1
fi

echo "✅ Successfully authenticated!"
echo ""

# Test 4: Get all users
echo "Test 4: Get All Users"
USERS_RESPONSE=$(curl -s http://localhost:3001/api/admin/users \
  -H "Authorization: Bearer $TOKEN")

echo "$USERS_RESPONSE" | python3 -m json.tool
echo ""

# Extract user count
USER_COUNT=$(echo "$USERS_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['total'])" 2>/dev/null)
echo "📊 Total Users: $USER_COUNT"
echo ""

# Test 5: Get active users only
echo "Test 5: Get Active Users Only"
ACTIVE_RESPONSE=$(curl -s "http://localhost:3001/api/admin/users?status=active" \
  -H "Authorization: Bearer $TOKEN")

echo "$ACTIVE_RESPONSE" | python3 -m json.tool
echo ""

# Test 6: Search users
echo "Test 6: Search Users (REF001)"
SEARCH_RESPONSE=$(curl -s "http://localhost:3001/api/admin/users?search=REF001" \
  -H "Authorization: Bearer $TOKEN")

echo "$SEARCH_RESPONSE" | python3 -m json.tool
echo ""

echo "========================================="
echo "✅ All Tests Completed!"
echo "========================================="
echo ""
echo "You can now view users in the Admin Dashboard at:"
echo "http://localhost:5173/admin"
echo ""
echo "Available Actions:"
echo "  - View user details"
echo "  - Suspend active users"
echo "  - Activate suspended users"
echo "  - Search by address or referral code"
echo "  - Filter by status (All/Active/Suspended)"
echo ""
