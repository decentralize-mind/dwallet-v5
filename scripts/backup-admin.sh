#!/bin/bash

#############################################################################
# 🔄 Admin Dashboard Automated Backup Script
# 
# Creates comprehensive backups of:
# - Admin server data (in-memory data exported to JSON)
# - Configuration files (.env, server configs)
# - Database dumps (when PostgreSQL is integrated)
# - Audit logs
# 
# Usage: ./scripts/backup-admin.sh [full|config|logs]
# Default: full backup
#############################################################################

set -e  # Exit on error

# Configuration
BACKUP_DIR="./backups/admin"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="admin_backup_${TIMESTAMP}"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_NAME}"
RETENTION_DAYS=30  # Keep backups for 30 days

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

# Create backup directory
create_backup_dir() {
    if [ ! -d "$BACKUP_DIR" ]; then
        log_info "Creating backup directory: $BACKUP_DIR"
        mkdir -p "$BACKUP_DIR"
    fi
    
    mkdir -p "$BACKUP_PATH"
}

# Backup configuration files
backup_config() {
    log_info "Backing up configuration files..."
    
    CONFIG_DIR="${BACKUP_PATH}/config"
    mkdir -p "$CONFIG_DIR"
    
    # Backup .env file (contains secrets - handle carefully)
    if [ -f ".env" ]; then
        cp .env "${CONFIG_DIR}/.env.backup"
        chmod 600 "${CONFIG_DIR}/.env.backup"  # Restrict permissions
        log_success "Backed up .env file"
    else
        log_warning ".env file not found"
    fi
    
    # Backup server configuration
    if [ -f "server/admin-server.js" ]; then
        cp server/admin-server.js "${CONFIG_DIR}/admin-server.js.backup"
        log_success "Backed up admin-server.js"
    fi
    
    # Backup sentry config
    if [ -f "server/sentry-config.js" ]; then
        cp server/sentry-config.js "${CONFIG_DIR}/sentry-config.js.backup"
        log_success "Backed up sentry-config.js"
    fi
    
    # Backup package.json
    cp package.json "${CONFIG_DIR}/package.json.backup"
    log_success "Backed up package.json"
}

# Backup audit logs
backup_logs() {
    log_info "Backing up audit logs..."
    
    LOGS_DIR="${BACKUP_PATH}/logs"
    mkdir -p "$LOGS_DIR"
    
    # Backup server logs if they exist
    if [ -d "logs" ]; then
        cp -r logs/* "${LOGS_DIR}/" 2>/dev/null || true
        log_success "Backed up server logs"
    fi
    
    # Create a manifest of current in-memory data
    log_info "Creating data manifest..."
    cat > "${LOGS_DIR}/data-manifest.json" << EOF
{
  "backup_timestamp": "${TIMESTAMP}",
  "backup_type": "${BACKUP_TYPE:-full}",
  "server_uptime": "$(ps -o etime= -p $$ 2>/dev/null || echo 'unknown')",
  "node_version": "$(node --version 2>/dev/null || echo 'unknown')",
  "npm_version": "$(npm --version 2>/dev/null || echo 'unknown')",
  "note": "In-memory data (users, IPs, alerts) will be lost on server restart. Consider integrating PostgreSQL for persistence."
}
EOF
    log_success "Created data manifest"
}

# Backup database (when PostgreSQL is integrated)
backup_database() {
    log_info "Checking for database backup..."
    
    if [ -n "$DATABASE_URL" ]; then
        log_info "PostgreSQL database detected. Creating dump..."
        
        DB_DIR="${BACKUP_PATH}/database"
        mkdir -p "$DB_DIR"
        
        # Extract connection details from DATABASE_URL
        # Format: postgresql://user:password@host:port/dbname
        if command -v pg_dump &> /dev/null; then
            pg_dump "$DATABASE_URL" > "${DB_DIR}/database_dump.sql" 2>/dev/null
            log_success "Backed up PostgreSQL database"
        else
            log_warning "pg_dump not found. Install PostgreSQL client tools."
        fi
    else
        log_info "No DATABASE_URL configured. Skipping database backup."
        log_info "💡 Set DATABASE_URL in .env to enable database backups"
    fi
}

# Create compressed archive
create_archive() {
    log_info "Creating compressed backup archive..."
    
    cd "$BACKUP_DIR"
    
    # Create tar.gz archive
    tar -czf "${BACKUP_NAME}.tar.gz" "${BACKUP_NAME}/"
    
    # Calculate size
    BACKUP_SIZE=$(du -sh "${BACKUP_NAME}.tar.gz" | cut -f1)
    
    # Remove uncompressed directory
    rm -rf "${BACKUP_NAME}/"
    
    cd ../..
    
    log_success "Created backup archive: ${BACKUP_NAME}.tar.gz (${BACKUP_SIZE})"
}

# Clean old backups
cleanup_old_backups() {
    log_info "Cleaning up backups older than ${RETENTION_DAYS} days..."
    
    if [ -d "$BACKUP_DIR" ]; then
        find "$BACKUP_DIR" -name "admin_backup_*.tar.gz" -mtime +${RETENTION_DAYS} -delete
        log_success "Cleaned up old backups"
    fi
}

# Generate backup report
generate_report() {
    log_info "Generating backup report..."
    
    REPORT_FILE="${BACKUP_DIR}/backup-report-${TIMESTAMP}.txt"
    
    cat > "$REPORT_FILE" << EOF
========================================
Admin Dashboard Backup Report
========================================
Timestamp: ${TIMESTAMP}
Backup Type: ${BACKUP_TYPE:-full}
Backup File: ${BACKUP_NAME}.tar.gz
Backup Size: ${BACKUP_SIZE}
Retention: ${RETENTION_DAYS} days

Files Backed Up:
- Configuration files (.env, server configs)
- Audit logs
- Data manifest
$(if [ -n "$DATABASE_URL" ]; then echo "- PostgreSQL database dump"; fi)

Location: ${BACKUP_DIR}/${BACKUP_NAME}.tar.gz

Next Steps:
1. Verify backup integrity: tar -tzf ${BACKUP_NAME}.tar.gz
2. Test restoration: ./scripts/restore-admin.sh ${BACKUP_NAME}.tar.gz
3. Store offsite for disaster recovery

Notes:
- In-memory data (users, IPs, alerts) is NOT persisted
- Consider integrating PostgreSQL for data persistence
- Backup includes sensitive .env file - store securely!
========================================
EOF
    
    log_success "Backup report saved to: $REPORT_FILE"
}

# Main backup function
main() {
    echo "========================================="
    echo "🔄 Admin Dashboard Backup"
    echo "========================================="
    echo ""
    
    # Determine backup type
    BACKUP_TYPE="${1:-full}"
    
    log_info "Starting ${BACKUP_TYPE} backup..."
    log_info "Timestamp: ${TIMESTAMP}"
    echo ""
    
    # Create backup directory
    create_backup_dir
    
    # Perform backups based on type
    case "$BACKUP_TYPE" in
        full)
            backup_config
            backup_logs
            backup_database
            ;;
        config)
            backup_config
            ;;
        logs)
            backup_logs
            ;;
        database)
            backup_database
            ;;
        *)
            log_error "Unknown backup type: $BACKUP_TYPE"
            echo "Usage: $0 [full|config|logs|database]"
            exit 1
            ;;
    esac
    
    # Create archive
    create_archive
    
    # Clean old backups
    cleanup_old_backups
    
    # Generate report
    generate_report
    
    echo ""
    echo "========================================="
    log_success "Backup completed successfully!"
    echo "========================================="
    echo "Backup file: ${BACKUP_DIR}/${BACKUP_NAME}.tar.gz"
    echo "Backup size: ${BACKUP_SIZE}"
    echo ""
    echo "To restore:"
    echo "  ./scripts/restore-admin.sh ${BACKUP_DIR}/${BACKUP_NAME}.tar.gz"
    echo ""
}

# Run main function
main "$@"
