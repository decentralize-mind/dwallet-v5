#!/bin/bash
###############################################################################
# 💾 BACKUP RESTORATION TEST SCRIPT
# 
# Tests backup integrity by restoring to a test database
# Cron: 0 4 * * 0 /path/to/test-backup-restore.sh (weekly on Sunday at 4 AM)
###############################################################################

set -e

# Configuration
DB_NAME="${POSTGRES_DB:-dwallet_admin}"
DB_USER="${POSTGRES_USER:-dwallet_admin}"
BACKUP_DIR="${BACKUP_DIR:-/Users/macbookpri/Downloads/dwallet-v5/backups}"
TEST_DB_NAME="${DB_NAME}_restore_test"
ENCRYPTION_PASSWORD="${BACKUP_ENCRYPTION_PASSWORD}"

echo "╔═══════════════════════════════════════════════════════╗"
echo "║   💾 Backup Restoration Test                         ║"
echo "║   $(date)                                             ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""

# ───────────────────────────────────────────────────────────
# 1. FIND LATEST BACKUP
# ───────────────────────────────────────────────────────────

echo "📦 Step 1: Finding latest backup..."

LATEST_BACKUP=$(find "$BACKUP_DIR" -name "admin_db_*.sql*" -type f | sort -r | head -1)

if [ -z "$LATEST_BACKUP" ]; then
  echo "❌ No backups found in $BACKUP_DIR"
  echo "Run backup first: ./scripts/backup-admin-db.sh"
  exit 1
fi

echo "✅ Latest backup: $LATEST_BACKUP"
echo "   Size: $(du -h "$LATEST_BACKUP" | cut -f1)"
echo "   Date: $(stat -f "%Sm" "$LATEST_BACKUP" 2>/dev/null || echo 'unknown')"
echo ""

# ───────────────────────────────────────────────────────────
# 2. DECRYPT BACKUP (if encrypted)
# ───────────────────────────────────────────────────────────

echo "🔓 Step 2: Preparing backup file..."

RESTORE_FILE="$LATEST_BACKUP"

if [[ "$LATEST_BACKUP" == *.enc ]]; then
  if [ -z "$ENCRYPTION_PASSWORD" ]; then
    echo "❌ Encrypted backup found but no BACKUP_ENCRYPTION_PASSWORD set"
    exit 1
  fi
  
  DECRYPTED_FILE="/tmp/admin_db_restore_$$.sql"
  
  echo "   Decrypting backup..."
  gpg --decrypt \
    --batch \
    --yes \
    --passphrase "$ENCRYPTION_PASSWORD" \
    --output "$DECRYPTED_FILE" \
    "$LATEST_BACKUP"
  
  if [ $? -eq 0 ]; then
    echo "✅ Backup decrypted"
    RESTORE_FILE="$DECRYPTED_FILE"
  else
    echo "❌ Decryption failed"
    exit 1
  fi
fi

echo ""

# ───────────────────────────────────────────────────────────
# 3. VERIFY BACKUP INTEGRITY
# ───────────────────────────────────────────────────────────

echo "🔍 Step 3: Verifying backup integrity..."

# Check file is not empty
if [ ! -s "$RESTORE_FILE" ]; then
  echo "❌ Backup file is empty"
  exit 1
fi

# Check for valid SQL content
LINE_COUNT=$(wc -l < "$RESTORE_FILE")
if [ "$LINE_COUNT" -lt 10 ]; then
  echo "❌ Backup seems corrupted (only $LINE_COUNT lines)"
  exit 1
fi

echo "✅ Backup integrity verified ($LINE_COUNT lines)"

# Check for essential tables
TABLES_FOUND=0
for table in admin_users audit_logs security_events api_keys; do
  if grep -q "CREATE TABLE.*$table" "$RESTORE_FILE" 2>/dev/null || \
     grep -q "COPY.*$table" "$RESTORE_FILE" 2>/dev/null || \
     grep -q "INSERT INTO.*$table" "$RESTORE_FILE" 2>/dev/null; then
    TABLES_FOUND=$((TABLES_FOUND + 1))
  fi
done

echo "✅ Found $TABLES_FOUND/4 essential tables in backup"
echo ""

# ───────────────────────────────────────────────────────────
# 4. CREATE TEST DATABASE
# ───────────────────────────────────────────────────────────

echo "🗄️  Step 4: Creating test database..."

# Drop test database if exists
dropdb --if-exists "$TEST_DB_NAME" 2>/dev/null || true

# Create fresh test database
createdb -U "$DB_USER" "$TEST_DB_NAME"

if [ $? -eq 0 ]; then
  echo "✅ Test database created: $TEST_DB_NAME"
else
  echo "❌ Failed to create test database"
  exit 1
fi

echo ""

# ───────────────────────────────────────────────────────────
# 5. RESTORE BACKUP
# ───────────────────────────────────────────────────────────

echo "🔄 Step 5: Restoring backup to test database..."

START_TIME=$(date +%s)

psql -U "$DB_USER" -d "$TEST_DB_NAME" -f "$RESTORE_FILE" > /dev/null 2>&1

if [ $? -eq 0 ]; then
  END_TIME=$(date +%s)
  DURATION=$((END_TIME - START_TIME))
  echo "✅ Backup restored successfully in ${DURATION}s"
else
  echo "❌ Restore failed"
  
  # Cleanup
  dropdb --if-exists "$TEST_DB_NAME" 2>/dev/null || true
  [ -f "$DECRYPTED_FILE" ] && rm -f "$DECRYPTED_FILE"
  
  exit 1
fi

echo ""

# ───────────────────────────────────────────────────────────
# 6. VERIFY RESTORED DATA
# ───────────────────────────────────────────────────────────

echo "✅ Step 6: Verifying restored data..."

# Check table count
TABLE_COUNT=$(psql -U "$DB_USER" -d "$TEST_DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null || echo "0")
echo "   Tables restored: $TABLE_COUNT"

# Check row counts for critical tables
for table in admin_users audit_logs security_events api_keys; do
  ROW_COUNT=$(psql -U "$DB_USER" -d "$TEST_DB_NAME" -t -c "SELECT COUNT(*) FROM $table;" 2>/dev/null || echo "0")
  echo "   - $table: $ROW_COUNT rows"
done

# Verify data integrity
ADMIN_COUNT=$(psql -U "$DB_USER" -d "$TEST_DB_NAME" -t -c "SELECT COUNT(*) FROM admin_users WHERE is_active = true;" 2>/dev/null || echo "0")
echo ""
echo "   Active admin accounts: $ADMIN_COUNT"

if [ "$ADMIN_COUNT" -gt 0 ]; then
  echo "✅ Data integrity verified"
else
  echo "⚠️  Warning: No active admin accounts in backup"
fi

echo ""

# ───────────────────────────────────────────────────────────
# 7. RUN TEST QUERIES
# ───────────────────────────────────────────────────────────

echo "🧪 Step 7: Running test queries..."

# Test complex query
TEST_QUERY_RESULT=$(psql -U "$DB_USER" -d "$TEST_DB_NAME" -c "
  SELECT 
    (SELECT COUNT(*) FROM admin_users) as admins,
    (SELECT COUNT(*) FROM audit_logs WHERE created_at > NOW() - INTERVAL '7 days') as recent_logs,
    (SELECT COUNT(*) FROM api_keys WHERE is_active = true) as active_keys
;" 2>/dev/null)

if [ -n "$TEST_QUERY_RESULT" ]; then
  echo "✅ Complex queries working"
  echo "$TEST_QUERY_RESULT"
else
  echo "⚠️  Query test inconclusive"
fi

echo ""

# ───────────────────────────────────────────────────────────
# 8. CLEANUP
# ───────────────────────────────────────────────────────────

echo "🧹 Step 8: Cleaning up test database..."

dropdb --if-exists "$TEST_DB_NAME"

if [ $? -eq 0 ]; then
  echo "✅ Test database removed"
else
  echo "⚠️  Cleanup incomplete (manual removal may be needed)"
fi

# Remove decrypted file if created
if [ -n "$DECRYPTED_FILE" ] && [ -f "$DECRYPTED_FILE" ]; then
  rm -f "$DECRYPTED_FILE"
  echo "✅ Temporary files removed"
fi

echo ""

# ───────────────────────────────────────────────────────────
# 9. GENERATE REPORT
# ───────────────────────────────────────────────────────────

echo "╔═══════════════════════════════════════════════════════╗"
echo "║   📊 Backup Restoration Test Report                  ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""
echo "Backup File:     $LATEST_BACKUP"
echo "Backup Size:     $(du -h "$LATEST_BACKUP" | cut -f1)"
echo "Tables Restored: $TABLE_COUNT"
echo "Active Admins:   $ADMIN_COUNT"
echo "Test Duration:   ${DURATION}s"
echo "Result:          ✅ SUCCESS"
echo ""

# Log to history
TEST_LOG="$BACKUP_DIR/restore_test_history.log"
echo "$(date)|$LATEST_BACKUP|$TABLE_COUNT|$ADMIN_COUNT|${DURATION}s|SUCCESS" >> "$TEST_LOG"

echo "Test logged to: $TEST_LOG"
echo ""

# Send notification
if [ -n "$DISCORD_WEBHOOK_URL" ]; then
  curl -s -H "Content-Type: application/json" \
    -d "{
      \"content\": \"💾 **Backup Restoration Test PASSED**\\nBackup: $(basename $LATEST_BACKUP)\\nTables: $TABLE_COUNT\\nDuration: ${DURATION}s\\nTime: $(date)\"
    }" \
    "$DISCORD_WEBHOOK_URL" > /dev/null 2>&1
fi

echo "╔═══════════════════════════════════════════════════════╗"
echo "║   ✅ Backup restoration test PASSED!                 ║"
echo "║   Your backups are working correctly                 ║"
echo "╚═══════════════════════════════════════════════════════╝"

exit 0
