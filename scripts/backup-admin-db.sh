#!/bin/bash
###############################################################################
# 🔐 AUTOMATED POSTGRESQL BACKUP SCRIPT
# 
# Usage: ./backup-admin-db.sh
# Cron: 0 2 * * * /path/to/backup-admin-db.sh (daily at 2 AM)
###############################################################################

set -e

# Configuration
DB_NAME="${POSTGRES_DB:-dwallet_admin}"
DB_USER="${POSTGRES_USER:-dwallet_admin}"
BACKUP_DIR="${BACKUP_DIR:-/Users/macbookpri/Downloads/dwallet-v5/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
ENCRYPTION_PASSWORD="${BACKUP_ENCRYPTION_PASSWORD}"

# Timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/admin_db_$TIMESTAMP.sql"
ENCRYPTED_FILE="$BACKUP_FILE.enc"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"
mkdir -p "$(dirname $BACKUP_FILE)"

echo "╔═══════════════════════════════════════════════════════╗"
echo "║   🔐 dWallet Admin Database Backup                    ║"
echo "║   $(date)                                             ║"
echo "╚═══════════════════════════════════════════════════════╝"

# ───────────────────────────────────────────────────────────
# 1. CREATE DATABASE DUMP
# ───────────────────────────────────────────────────────────

echo ""
echo "📦 Creating database backup..."

pg_dump -U "$DB_USER" -d "$DB_NAME" \
  --format=plain \
  --no-owner \
  --no-privileges \
  --verbose \
  --file="$BACKUP_FILE" \
  2>> "$BACKUP_DIR/backup_errors.log"

if [ $? -eq 0 ]; then
  echo "✅ Database dump created: $BACKUP_FILE"
  
  # Get file size
  FILE_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
  echo "📊 Backup size: $FILE_SIZE"
else
  echo "❌ Database dump failed!"
  echo "Check error log: $BACKUP_DIR/backup_errors.log"
  exit 1
fi

# ───────────────────────────────────────────────────────────
# 2. ENCRYPT BACKUP (if password provided)
# ───────────────────────────────────────────────────────────

if [ -n "$ENCRYPTION_PASSWORD" ]; then
  echo ""
  echo "🔒 Encrypting backup..."
  
  gpg --symmetric \
    --cipher-algo AES256 \
    --batch \
    --yes \
    --passphrase "$ENCRYPTION_PASSWORD" \
    --output "$ENCRYPTED_FILE" \
    "$BACKUP_FILE"
  
  if [ $? -eq 0 ]; then
    echo "✅ Backup encrypted: $ENCRYPTED_FILE"
    
    # Remove unencrypted backup
    rm "$BACKUP_FILE"
    echo "🗑️  Removed unencrypted backup"
    
    BACKUP_FILE="$ENCRYPTED_FILE"
  else
    echo "⚠️  Encryption failed, keeping unencrypted backup"
  fi
fi

# ───────────────────────────────────────────────────────────
# 3. VERIFY BACKUP INTEGRITY
# ───────────────────────────────────────────────────────────

echo ""
echo "🔍 Verifying backup integrity..."

if [[ "$BACKUP_FILE" == *.enc ]]; then
  # Encrypted file - check it exists and has size
  if [ -s "$BACKUP_FILE" ]; then
    echo "✅ Encrypted backup verified"
  else
    echo "❌ Encrypted backup is empty!"
    exit 1
  fi
else
  # SQL file - verify it's not empty and has valid SQL
  if [ -s "$BACKUP_FILE" ]; then
    LINE_COUNT=$(wc -l < "$BACKUP_FILE")
    if [ "$LINE_COUNT" -gt 10 ]; then
      echo "✅ Backup verified ($LINE_COUNT lines)"
    else
      echo "⚠️  Backup seems too small ($LINE_COUNT lines)"
    fi
  else
    echo "❌ Backup is empty!"
    exit 1
  fi
fi

# ───────────────────────────────────────────────────────────
# 4. CLEANUP OLD BACKUPS
# ───────────────────────────────────────────────────────────

echo ""
echo "🧹 Cleaning up backups older than $RETENTION_DAYS days..."

OLD_BACKUPS=$(find "$BACKUP_DIR" -name "admin_db_*.sql*" -mtime +$RETENTION_DAYS -type f)

if [ -n "$OLD_BACKUPS" ]; then
  echo "$OLD_BACKUPS" | while read -r file; do
    echo "🗑️  Deleting: $file"
    rm "$file"
  done
  
  echo "✅ Cleanup complete"
else
  echo "✅ No old backups to delete"
fi

# ───────────────────────────────────────────────────────────
# 5. GENERATE BACKUP REPORT
# ───────────────────────────────────────────────────────────

echo ""
echo "📊 Backup Report:"
echo "─────────────────────────────────────────────────────"
echo "Database:        $DB_NAME"
echo "Backup File:     $BACKUP_FILE"
echo "Backup Size:     $(du -h "$BACKUP_FILE" | cut -f1)"
echo "Timestamp:       $TIMESTAMP"
echo "Retention:       $RETENTION_DAYS days"
echo "Total Backups:   $(find "$BACKUP_DIR" -name "admin_db_*" -type f | wc -l)"
echo "─────────────────────────────────────────────────────"

# Log to backup history
echo "$TIMESTAMP|$BACKUP_FILE|$(du -b "$BACKUP_FILE" | cut -f1)|SUCCESS" >> "$BACKUP_DIR/backup_history.log"

# ───────────────────────────────────────────────────────────
# 6. OPTIONAL: UPLOAD TO CLOUD STORAGE
# ───────────────────────────────────────────────────────────

if [ -n "$AWS_S3_BUCKET" ]; then
  echo ""
  echo "☁️  Uploading to AWS S3..."
  
  aws s3 cp "$BACKUP_FILE" "s3://$AWS_S3_BUCKET/backups/" \
    --storage-class STANDARD_IA \
    --server-side-encryption AES256
  
  if [ $? -eq 0 ]; then
    echo "✅ Upload complete"
  else
    echo "⚠️  Upload failed"
  fi
fi

echo ""
echo "╔═══════════════════════════════════════════════════════╗"
echo "║   ✅ Backup Complete!                                 ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""

# ───────────────────────────────────────────────────────────
# 7. SEND NOTIFICATION (Optional)
# ───────────────────────────────────────────────────────────

if [ -n "$DISCORD_WEBHOOK_URL" ]; then
  curl -H "Content-Type: application/json" \
    -d '{
      "content": "🔐 **Admin Database Backup Complete**\n```Database: '"$DB_NAME"'\nFile: '"$BACKUP_FILE"'\nSize: '"$(du -h "$BACKUP_FILE" | cut -f1)"'\nTime: '"$TIMESTAMP"'```"
    }' \
    "$DISCORD_WEBHOOK_URL"
fi

if [ -n "$SLACK_WEBHOOK_URL" ]; then
  curl -H "Content-Type: application/json" \
    -d '{
      "text": "🔐 Admin Database Backup Complete",
      "attachments": [{
        "color": "#36a64f",
        "fields": [
          {"title": "Database", "value": "'"$DB_NAME"'", "short": true},
          {"title": "File", "value": "'"$BACKUP_FILE"'", "short": true},
          {"title": "Size", "value": "'"$(du -h "$BACKUP_FILE" | cut -f1)"'", "short": true},
          {"title": "Time", "value": "'"$TIMESTAMP"'", "short": true}
        ]
      }]
    }' \
    "$SLACK_WEBHOOK_URL"
fi

exit 0
