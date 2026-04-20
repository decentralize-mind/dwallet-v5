#!/bin/bash
###############################################################################
# 🔐 AUTOMATED SECURITY TESTING SCRIPT
# 
# Runs comprehensive security tests to verify all protections are working
# Cron: 0 */6 * * * /path/to/security-test.sh (every 6 hours)
###############################################################################

set -e

DOMAIN="${DOMAIN:-admin.toklo.xyz}"
BACKEND_URL="https://$DOMAIN"
PASS_COUNT=0
FAIL_COUNT=0
WARN_COUNT=0

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "╔═══════════════════════════════════════════════════════╗"
echo "║   🔐 Automated Security Test Suite                   ║"
echo "║   Target: $BACKEND_URL                               ║"
echo "║   $(date)                                             ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""

# Helper functions
pass_test() {
  echo -e "${GREEN}✅ PASS${NC}: $1"
  PASS_COUNT=$((PASS_COUNT + 1))
}

fail_test() {
  echo -e "${RED}❌ FAIL${NC}: $1"
  FAIL_COUNT=$((FAIL_COUNT + 1))
}

warn_test() {
  echo -e "${YELLOW}⚠️  WARN${NC}: $1"
  WARN_COUNT=$((WARN_COUNT + 1))
}

# ───────────────────────────────────────────────────────────
# 1. HTTPS/TLS TESTS
# ───────────────────────────────────────────────────────────

echo "🔒 Testing HTTPS/TLS Configuration..."

# Test 1.1: HTTPS Response
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL/api/admin/health" 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
  pass_test "HTTPS is working (HTTP $HTTP_CODE)"
else
  fail_test "HTTPS not responding (HTTP $HTTP_CODE)"
fi

# Test 1.2: HTTP to HTTPS Redirect
HTTP_REDIRECT=$(curl -s -o /dev/null -w "%{http_code}" "http://$DOMAIN" 2>/dev/null || echo "000")
if [[ "$HTTP_REDIRECT" == "301" || "$HTTP_REDIRECT" == "302" ]]; then
  pass_test "HTTP→HTTPS redirect working ($HTTP_REDIRECT)"
else
  fail_test "HTTP→HTTPS redirect not working ($HTTP_REDIRECT)"
fi

# Test 1.3: SSL Certificate Expiry
if command -v openssl &> /dev/null; then
  EXPIRY_DATE=$(echo | openssl s_client -connect "$DOMAIN:443" 2>/dev/null | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)
  if [ -n "$EXPIRY_DATE" ]; then
    EXPIRY_EPOCH=$(date -d "$EXPIRY_DATE" +%s 2>/dev/null || echo "0")
    CURRENT_EPOCH=$(date +%s)
    DAYS_LEFT=$(( (EXPIRY_EPOCH - CURRENT_EPOCH) / 86400 ))
    
    if [ "$DAYS_LEFT" -gt 30 ]; then
      pass_test "SSL certificate valid for $DAYS_LEFT days"
    elif [ "$DAYS_LEFT" -gt 7 ]; then
      warn_test "SSL certificate expires in $DAYS_LEFT days (renew soon)"
    else
      fail_test "SSL certificate expires in $DAYS_LEFT days (CRITICAL)"
    fi
  else
    fail_test "Could not retrieve SSL certificate"
  fi
fi

echo ""

# ───────────────────────────────────────────────────────────
# 2. SECURITY HEADERS TESTS
# ───────────────────────────────────────────────────────────

echo "🛡️  Testing Security Headers..."

HEADERS=$(curl -sI "$BACKEND_URL" 2>/dev/null)

# Test 2.1: HSTS
if echo "$HEADERS" | grep -qi "strict-transport-security"; then
  pass_test "HSTS header present"
else
  fail_test "HSTS header missing"
fi

# Test 2.2: X-Frame-Options
if echo "$HEADERS" | grep -qi "x-frame-options"; then
  pass_test "X-Frame-Options header present"
else
  fail_test "X-Frame-Options header missing"
fi

# Test 2.3: X-Content-Type-Options
if echo "$HEADERS" | grep -qi "x-content-type-options"; then
  pass_test "X-Content-Type-Options header present"
else
  fail_test "X-Content-Type-Options header missing"
fi

# Test 2.4: Content-Security-Policy
if echo "$HEADERS" | grep -qi "content-security-policy"; then
  pass_test "Content-Security-Policy header present"
else
  warn_test "Content-Security-Policy header missing (recommended)"
fi

echo ""

# ───────────────────────────────────────────────────────────
# 3. ACCESS CONTROL TESTS
# ───────────────────────────────────────────────────────────

echo "🚫 Testing Access Controls..."

# Test 3.1: IP Whitelist (if enabled)
if [ -n "$ADMIN_ALLOWED_IPS" ]; then
  ADMIN_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL/api/admin/stats" 2>/dev/null || echo "000")
  if [[ "$ADMIN_STATUS" == "200" || "$ADMIN_STATUS" == "401" ]]; then
    pass_test "Admin endpoint accessible (HTTP $ADMIN_STATUS)"
  elif [ "$ADMIN_STATUS" = "403" ]; then
    warn_test "IP whitelist blocking access (expected if testing from non-whitelisted IP)"
  else
    fail_test "Unexpected admin endpoint response (HTTP $ADMIN_STATUS)"
  fi
else
  warn_test "IP whitelist not configured (set ADMIN_ALLOWED_IPS)"
fi

# Test 3.2: Authentication Required
AUTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL/api/admin/stats" 2>/dev/null || echo "000")
if [[ "$AUTH_STATUS" == "401" || "$AUTH_STATUS" == "403" ]]; then
  pass_test "Authentication required for admin endpoints (HTTP $AUTH_STATUS)"
elif [ "$AUTH_STATUS" = "200" ]; then
  fail_test "Admin endpoint accessible without authentication!"
fi

echo ""

# ───────────────────────────────────────────────────────────
# 4. RATE LIMITING TESTS
# ───────────────────────────────────────────────────────────

echo "⏱️  Testing Rate Limiting..."

# Test 4.1: Auth Rate Limiting
RATE_LIMITED=false
for i in {1..6}; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST "$BACKEND_URL/api/admin/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"type":"key","credentials":{"adminKey":"wrong"}}' 2>/dev/null || echo "000")
  
  if [ "$STATUS" = "429" ]; then
    RATE_LIMITED=true
    break
  fi
done

if [ "$RATE_LIMITED" = true ]; then
  pass_test "Rate limiting active on auth endpoints"
else
  warn_test "Rate limiting not triggered (may be configured correctly)"
fi

echo ""

# ───────────────────────────────────────────────────────────
# 5. DEPENDENCY VULNERABILITY SCAN
# ───────────────────────────────────────────────────────────

echo "🔍 Scanning for Dependency Vulnerabilities..."

cd /Users/macbookpri/Downloads/dwallet-v5

if command -v npm &> /dev/null; then
  VULN_RESULT=$(npm audit --json 2>/dev/null || true)
  
  CRITICAL_VULNS=$(echo "$VULN_RESULT" | grep -o '"critical":[0-9]*' | head -1 | cut -d: -f2 || echo "0")
  HIGH_VULNS=$(echo "$VULN_RESULT" | grep -o '"high":[0-9]*' | head -1 | cut -d: -f2 || echo "0")
  
  if [ "${CRITICAL_VULNS:-0}" -gt 0 ]; then
    fail_test "Found $CRITICAL_VULNS critical vulnerabilities (run: npm audit fix)"
  elif [ "${HIGH_VULNS:-0}" -gt 0 ]; then
    warn_test "Found $HIGH_VULNS high vulnerabilities (review with: npm audit)"
  else
    pass_test "No critical/high vulnerabilities found"
  fi
else
  warn_test "npm not available for vulnerability scan"
fi

echo ""

# ───────────────────────────────────────────────────────────
# 6. FILE PERMISSION TESTS
# ───────────────────────────────────────────────────────────

echo "🔐 Testing File Permissions..."

# Test 6.1: .env file permissions
if [ -f "/Users/macbookpri/Downloads/dwallet-v5/.env" ]; then
  ENV_PERMS=$(stat -f "%Lp" /Users/macbookpri/Downloads/dwallet-v5/.env 2>/dev/null || echo "unknown")
  if [[ "$ENV_PERMS" == "600" || "$ENV_PERMS" == "400" ]]; then
    pass_test ".env file permissions secure ($ENV_PERMS)"
  else
    warn_test ".env file permissions too open ($ENV_PERMS) - should be 600"
  fi
else
  warn_test ".env file not found"
fi

# Test 6.2: Backup directory permissions
if [ -d "/Users/macbookpri/Downloads/dwallet-v5/backups" ]; then
  BACKUP_PERMS=$(stat -f "%Lp" /Users/macbookpri/Downloads/dwallet-v5/backups 2>/dev/null || echo "unknown")
  if [[ "$BACKUP_PERMS" == "700" || "$BACKUP_PERMS" == "750" ]]; then
    pass_test "Backup directory permissions secure ($BACKUP_PERMS)"
  else
    warn_test "Backup directory permissions ($BACKUP_PERMS)"
  fi
fi

echo ""

# ───────────────────────────────────────────────────────────
# 7. DATABASE CONNECTIVITY
# ───────────────────────────────────────────────────────────

echo "🗄️  Testing Database Connectivity..."

if command -v psql &> /dev/null && [ -n "$DATABASE_URL" ]; then
  if psql "$DATABASE_URL" -c "SELECT 1" > /dev/null 2>&1; then
    pass_test "Database connection successful"
    
    # Test 7.1: Check if security tables exist
    TABLE_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('admin_users', 'audit_logs', 'security_events', 'banned_ips', 'api_keys');" 2>/dev/null || echo "0")
    
    if [ "$TABLE_COUNT" -ge 5 ]; then
      pass_test "All security tables present ($TABLE_COUNT/5)"
    else
      fail_test "Missing security tables ($TABLE_COUNT/5 found)"
    fi
  else
    fail_test "Database connection failed"
  fi
else
  warn_test "Database not configured for testing"
fi

echo ""

# ───────────────────────────────────────────────────────────
# 8. CRON JOB VERIFICATION
# ───────────────────────────────────────────────────────────

echo "⏰ Verifying Scheduled Tasks..."

# Test 8.1: Backup cron
if crontab -l 2>/dev/null | grep -q "backup-admin-db.sh"; then
  pass_test "Database backup cron job configured"
else
  warn_test "Database backup cron job not found"
fi

# Test 8.2: API key maintenance cron
if crontab -l 2>/dev/null | grep -q "api-key-maintenance.sh"; then
  pass_test "API key maintenance cron job configured"
else
  warn_test "API key maintenance cron job not found"
fi

# Test 8.3: Certbot renewal
if crontab -l 2>/dev/null | grep -q "certbot renew" || systemctl is-active --quiet certbot.timer 2>/dev/null; then
  pass_test "Certificate auto-renewal configured"
else
  warn_test "Certificate auto-renewal not configured"
fi

echo ""

# ───────────────────────────────────────────────────────────
# FINAL REPORT
# ───────────────────────────────────────────────────────────

echo "╔═══════════════════════════════════════════════════════╗"
echo "║   📊 Security Test Results                           ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""
echo -e "${GREEN}✅ Passed:  $PASS_COUNT${NC}"
echo -e "${RED}❌ Failed:  $FAIL_COUNT${NC}"
echo -e "${YELLOW}⚠️  Warnings: $WARN_COUNT${NC}"
echo ""

TOTAL=$((PASS_COUNT + FAIL_COUNT))
if [ "$TOTAL" -gt 0 ]; then
  SCORE=$((PASS_COUNT * 100 / TOTAL))
  echo "Security Score: $SCORE%"
  
  if [ "$SCORE" -ge 95 ]; then
    echo -e "${GREEN}🎉 Excellent! Your security is production-ready${NC}"
  elif [ "$SCORE" -ge 80 ]; then
    echo -e "${YELLOW}⚠️  Good, but some issues need attention${NC}"
  else
    echo -e "${RED}🚨 Critical security issues detected!${NC}"
  fi
fi

echo ""

# Log results
TEST_LOG="/Users/macbookpri/Downloads/dwallet-v5/logs/security-test.log"
mkdir -p "$(dirname "$TEST_LOG")"
echo "$(date)|$PASS_COUNT|$FAIL_COUNT|$WARN_COUNT" >> "$TEST_LOG"

# Alert if critical failures
if [ "$FAIL_COUNT" -gt 0 ]; then
  echo "🚨 Security test failures detected! Check logs: $TEST_LOG"
  
  # Send alert if webhook configured
  if [ -n "$DISCORD_WEBHOOK_URL" ]; then
    curl -s -H "Content-Type: application/json" \
      -d "{
        \"content\": \"🚨 **Security Test Failures Detected**\\nFailed: $FAIL_COUNT\\nWarnings: $WARN_COUNT\\nDate: $(date)\"
      }" \
      "$DISCORD_WEBHOOK_URL" > /dev/null 2>&1
  fi
fi

exit $FAIL_COUNT
