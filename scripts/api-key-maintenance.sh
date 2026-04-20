#!/bin/bash
###############################################################################
# 🔑 API KEY ROTATION MAINTENANCE SCRIPT
# 
# Cron: 0 3 * * * /path/to/api-key-maintenance.sh (daily at 3 AM)
###############################################################################

set -e

# Configuration
DB_NAME="${POSTGRES_DB:-dwallet_admin}"
DB_USER="${POSTGRES_USER:-dwallet_admin}"
NODE_ENV="${NODE_ENV:-production}"

echo "╔═══════════════════════════════════════════════════════╗"
echo "║   🔑 API Key Maintenance                              ║"
echo "║   $(date)                                             ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""

# ───────────────────────────────────────────────────────────
# 1. CLEANUP EXPIRED KEYS
# ───────────────────────────────────────────────────────────

echo "🧹 Cleaning up expired API keys..."

EXPIRED_COUNT=$(psql -U "$DB_USER" -d "$DB_NAME" -t -c "
  SELECT COUNT(*) FROM api_keys 
  WHERE expires_at <= CURRENT_TIMESTAMP 
  AND is_active = true;
")

if [ "$EXPIRED_COUNT" -gt 0 ]; then
  psql -U "$DB_USER" -d "$DB_NAME" -c "
    UPDATE api_keys 
    SET is_active = false 
    WHERE expires_at <= CURRENT_TIMESTAMP 
    AND is_active = true;
  "
  
  echo "✅ Deactivated $EXPIRED_COUNT expired API keys"
else
  echo "✅ No expired keys to cleanup"
fi

echo ""

# ───────────────────────────────────────────────────────────
# 2. CHECK EXPIRING KEYS (14 days warning)
# ───────────────────────────────────────────────────────────

echo "⚠️  Checking for API keys expiring within 14 days..."

EXPIRING_KEYS=$(psql -U "$DB_USER" -d "$DB_NAME" -t -c "
  SELECT key_name, admin_id, expires_at,
         EXTRACT(DAY FROM expires_at - CURRENT_TIMESTAMP) as days_left
  FROM api_keys
  WHERE is_active = true 
  AND expires_at <= CURRENT_TIMESTAMP + INTERVAL '14 days'
  AND expires_at > CURRENT_TIMESTAMP
  AND (last_warning_sent IS NULL OR last_warning_sent < CURRENT_TIMESTAMP - INTERVAL '7 days');
")

if [ -n "$EXPIRING_KEYS" ]; then
  echo "⚠️  Found expiring keys:"
  echo "$EXPIRING_KEYS" | while IFS='|' read -r key_name admin_id expires_at days_left; do
    echo "   - Key: $key_name (Admin: $admin_id) expires in ${days_left%.*} days"
    echo "     Expires: $expires_at"
  done
  
  echo ""
  echo "📧 Alerts will be sent via the application alert system"
else
  echo "✅ No keys expiring soon"
fi

echo ""

# ───────────────────────────────────────────────────────────
# 3. USAGE STATISTICS
# ───────────────────────────────────────────────────────────

echo "📊 API Key Statistics:"

TOTAL_KEYS=$(psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM api_keys;")
ACTIVE_KEYS=$(psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM api_keys WHERE is_active = true;")
EXPIRED_KEYS=$(psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM api_keys WHERE expires_at <= CURRENT_TIMESTAMP;")
REVOKED_KEYS=$(psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM api_keys WHERE revoked_at IS NOT NULL;")

echo "   Total Keys:    $TOTAL_KEYS"
echo "   Active:        $ACTIVE_KEYS"
echo "   Expired:       $EXPIRED_KEYS"
echo "   Revoked:       $REVOKED_KEYS"

echo ""

# ───────────────────────────────────────────────────────────
# 4. REVOKE UNUSED KEYS (90+ days inactive)
# ───────────────────────────────────────────────────────────

echo "🔍 Checking for unused active keys (90+ days)..."

UNUSED_KEYS=$(psql -U "$DB_USER" -d "$DB_NAME" -t -c "
  SELECT COUNT(*) FROM api_keys
  WHERE is_active = true
  AND last_used_at < CURRENT_TIMESTAMP - INTERVAL '90 days';
")

if [ "$UNUSED_KEYS" -gt 0 ]; then
  echo "⚠️  Found $UNUSED_KEYS unused keys (consider manual review)"
  echo "   These keys haven't been used in 90+ days:"
  
  psql -U "$DB_USER" -d "$DB_NAME" -c "
    SELECT key_name, admin_id, last_used_at, 
           EXTRACT(DAY FROM CURRENT_TIMESTAMP - last_used_at) as days_unused
    FROM api_keys
    WHERE is_active = true
    AND last_used_at < CURRENT_TIMESTAMP - INTERVAL '90 days';
  "
else
  echo "✅ All active keys have been used recently"
fi

echo ""

# ───────────────────────────────────────────────────────────
# 5. GENERATE REPORT
# ───────────────────────────────────────────────────────────

echo "📝 Maintenance Report:"
echo "─────────────────────────────────────────────────────"
echo "Timestamp:        $(date)"
echo "Expired Removed:  $EXPIRED_COUNT"
echo "Total Active:     $ACTIVE_KEYS"
echo "Expiring Soon:    $(echo "$EXPIRING_KEYS" | grep -c '|' 2>/dev/null || echo '0')"
echo "Unused 90+ Days:  $UNUSED_KEYS"
echo "─────────────────────────────────────────────────────"

# Log to maintenance history
echo "$(date)|$EXPIRED_COUNT|$ACTIVE_KEYS" >> "${BACKUP_DIR:-/Users/macbookpri/Downloads/dwallet-v5/backups}/api_key_maintenance.log"

echo ""
echo "╔═══════════════════════════════════════════════════════╗"
echo "║   ✅ API Key Maintenance Complete                     ║"
echo "╚═══════════════════════════════════════════════════════╝"

exit 0
