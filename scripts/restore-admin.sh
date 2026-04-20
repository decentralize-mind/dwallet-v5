#!/bin/bash

#############################################################################
# 🔄 Admin Dashboard Backup Restoration Script
# 
# Restores admin dashboard from backup archive
# 
# Usage: ./scripts/restore-admin.sh <backup-file.tar.gz>
#############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if backup file is provided
if [ -z "$1" ]; then
    log_error "No backup file specified"
    echo ""
    echo "Usage: $0 <backup-file.tar.gz>"
    echo ""
    echo "Available backups:"
    ls -lh backups/admin/*.tar.gz 2>/dev/null || echo "  No backups found"
    exit 1
fi

BACKUP_FILE="$1"

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    log_error "Backup file not found: $BACKUP_FILE"
    exit 1
fi

# Confirm restoration
echo "========================================="
echo "⚠️  Admin Dashboard Restoration"
echo "========================================="
echo ""
log_warning "This will restore from backup: $BACKUP_FILE"
echo ""
read -p "Are you sure you want to proceed? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    log_info "Restoration cancelled"
    exit 0
fi

echo ""
log_info "Starting restoration..."
echo ""

# Create temporary directory for extraction
TEMP_DIR=$(mktemp -d)
log_info "Extracting backup to temporary directory..."

# Extract backup
tar -xzf "$BACKUP_FILE" -C "$TEMP_DIR"
log_success "Backup extracted"

# Get backup name
BACKUP_NAME=$(basename "$BACKUP_FILE" .tar.gz)
RESTORE_PATH="${TEMP_DIR}/${BACKUP_NAME}"

# Restore configuration files
restore_config() {
    log_info "Restoring configuration files..."
    
    CONFIG_DIR="${RESTORE_PATH}/config"
    
    if [ -d "$CONFIG_DIR" ]; then
        # Restore .env file
        if [ -f "${CONFIG_DIR}/.env.backup" ]; then
            log_warning "Restoring .env file will overwrite current configuration"
            read -p "Restore .env file? (yes/no): " RESTORE_ENV
            
            if [ "$RESTORE_ENV" = "yes" ]; then
                cp "${CONFIG_DIR}/.env.backup" .env
                chmod 600 .env
                log_success "Restored .env file"
            fi
        fi
        
        # Restore server files
        if [ -f "${CONFIG_DIR}/admin-server.js.backup" ]; then
            log_warning "Restoring admin-server.js will overwrite current server code"
            read -p "Restore admin-server.js? (yes/no): " RESTORE_SERVER
            
            if [ "$RESTORE_SERVER" = "yes" ]; then
                cp "${CONFIG_DIR}/admin-server.js.backup" server/admin-server.js
                log_success "Restored admin-server.js"
            fi
        fi
        
        if [ -f "${CONFIG_DIR}/sentry-config.js.backup" ]; then
            cp "${CONFIG_DIR}/sentry-config.js.backup" server/sentry-config.js
            log_success "Restored sentry-config.js"
        fi
        
        if [ -f "${CONFIG_DIR}/package.json.backup" ]; then
            log_info "Package.json backup found. Check for dependency updates manually."
        fi
    else
        log_warning "No configuration files found in backup"
    fi
}

# Restore logs
restore_logs() {
    log_info "Restoring logs..."
    
    LOGS_DIR="${RESTORE_PATH}/logs"
    
    if [ -d "$LOGS_DIR" ]; then
        # Create logs directory if it doesn't exist
        mkdir -p logs
        
        # Copy log files
        cp -r "${LOGS_DIR}"/* logs/ 2>/dev/null || true
        log_success "Restored log files"
        
        # Display data manifest if exists
        if [ -f "${LOGS_DIR}/data-manifest.json" ]; then
            echo ""
            log_info "Backup metadata:"
            cat "${LOGS_DIR}/data-manifest.json"
            echo ""
        fi
    else
        log_warning "No logs found in backup"
    fi
}

# Restore database
restore_database() {
    log_info "Checking for database backup..."
    
    DB_DIR="${RESTORE_PATH}/database"
    
    if [ -d "$DB_DIR" ] && [ -f "${DB_DIR}/database_dump.sql" ]; then
        if [ -n "$DATABASE_URL" ]; then
            log_warning "This will overwrite the current database!"
            read -p "Restore database? (yes/no): " RESTORE_DB
            
            if [ "$RESTORE_DB" = "yes" ]; then
                if command -v psql &> /dev/null; then
                    psql "$DATABASE_URL" < "${DB_DIR}/database_dump.sql"
                    log_success "Restored PostgreSQL database"
                else
                    log_error "psql not found. Install PostgreSQL client tools."
                fi
            fi
        else
            log_warning "Database backup found but DATABASE_URL not configured"
            log_info "Set DATABASE_URL in .env and run this script again to restore database"
        fi
    else
        log_info "No database backup found"
    fi
}

# Verify restoration
verify_restoration() {
    log_info "Verifying restoration..."
    
    # Check if critical files exist
    if [ -f ".env" ]; then
        log_success ".env file exists"
    else
        log_warning ".env file not found"
    fi
    
    if [ -f "server/admin-server.js" ]; then
        log_success "admin-server.js exists"
    else
        log_error "admin-server.js not found!"
    fi
    
    if [ -f "server/sentry-config.js" ]; then
        log_success "sentry-config.js exists"
    else
        log_warning "sentry-config.js not found"
    fi
}

# Main restoration process
main() {
    echo "========================================="
    echo "🔄 Starting Restoration Process"
    echo "========================================="
    echo ""
    
    # Perform restoration
    restore_config
    echo ""
    restore_logs
    echo ""
    restore_database
    echo ""
    
    # Verify
    verify_restoration
    echo ""
    
    # Cleanup
    log_info "Cleaning up temporary files..."
    rm -rf "$TEMP_DIR"
    log_success "Cleanup complete"
    
    echo ""
    echo "========================================="
    log_success "Restoration completed successfully!"
    echo "========================================="
    echo ""
    log_info "Next steps:"
    echo "1. Review restored configuration files"
    echo "2. Install dependencies: npm install"
    echo "3. Restart admin server: node server/admin-server.js"
    echo "4. Verify functionality in browser"
    echo ""
    log_warning "Note: In-memory data (users, IPs, alerts) cannot be restored"
    log_warning "Consider integrating PostgreSQL for data persistence"
    echo ""
}

# Run main function
main
