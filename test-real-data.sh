#!/bin/bash

echo "========================================="
echo " Testing Real Data Implementation"
echo "========================================="
echo ""

# Test 1: Health Check (no auth required)
echo "📍 Test 1: Basic Health Check"
HEALTH=$(curl -s http://localhost:3001/api/admin/health)
echo "$HEALTH" | python3 -m json.tool 2>/dev/null || echo "$HEALTH"
echo ""

# Test 2: Stats endpoint (requires auth)
echo "📍 Test 2: Stats Endpoint (should require auth)"
STATS_NO_AUTH=$(curl -s http://localhost:3001/api/admin/stats)
echo "$STATS_NO_AUTH" | python3 -m json.tool 2>/dev/null || echo "$STATS_NO_AUTH"
echo ""

# Test 3: System Health endpoint (requires auth)
echo "📍 Test 3: System Health Endpoint (should require auth)"
HEALTH_NO_AUTH=$(curl -s http://localhost:3001/api/admin/system-health)
echo "$HEALTH_NO_AUTH" | python3 -m json.tool 2>/dev/null || echo "$HEALTH_NO_AUTH"
echo ""

echo "========================================="
echo "✅ Tests Complete!"
echo "========================================="
echo ""
echo "Note: To test authenticated endpoints, you need to:"
echo "1. Login first: POST /api/admin/auth/login"
echo "2. Use the returned token in Authorization header"
echo "3. Then call /api/admin/stats and /api/admin/system-health"
