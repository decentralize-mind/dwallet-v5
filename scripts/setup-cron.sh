#!/bin/bash

#############################################################################
# ⏰ Automated Backup Cron Job Setup
# 
# Sets up scheduled backups for admin dashboard
# - Daily backups at 2:00 AM
# - Weekly full backups on Sunday at 3:00 AM
# - Monthly archive on 1st at 4:00 AM
# 
# Usage: ./scripts/setup-cron.sh [install|remove|status]
#############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

# Get absolute path to project directory
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BACKUP_SCRIPT="${PROJECT_DIR}/scripts/backup-admin.sh"
LOG_FILE="${PROJECT_DIR}/logs/backup-cron.log"

# Create logs directory
mkdir -p "${PROJECT_DIR}/logs"

# Install cron jobs
install_cron() {
    log_info "Setting up automated backup cron jobs..."
    echo ""
    
    # Get current crontab
    CURRENT_CRON=$(crontab -l 2>/dev/null || echo "")
    
    # Define cron jobs
    DAILY_BACKUP="0 2 * * * cd ${PROJECT_DIR} && ${BACKUP_SCRIPT} config >> ${LOG_FILE} 2>&1"
    WEEKLY_BACKUP="0 3 * * 0 cd ${PROJECT_DIR} && ${BACKUP_SCRIPT} full >> ${LOG_FILE} 2>&1"
    MONTHLY_BACKUP="0 4 1 * * cd ${PROJECT_DIR} && ${BACKUP_SCRIPT} full >> ${LOG_FILE} 2>&1"
    
    # Check if already installed
    if echo "$CURRENT_CRON" | grep -q "backup-admin.sh"; then
        log_warning "Backup cron jobs already installed"
        echo ""
        read -p "Do you want to reinstall? (yes/no): " REINSTALL
        
        if [ "$REINSTALL" != "yes" ]; then
            log_info "Installation cancelled"
            exit 0
        fi
        
        # Remove existing backup cron jobs
        remove_cron silent
    fi
    
    # Add new cron jobs
    NEW_CRON="${CURRENT_CRON}
# Admin Dashboard Automated Backups
# Daily config backup at 2:00 AM
${DAILY_BACKUP}
# Weekly full backup on Sunday at 3:00 AM
${WEEKLY_BACKUP}
# Monthly full backup on 1st at 4:00 AM
${MONTHLY_BACKUP}
"
    
    # Install cron jobs
    echo "$NEW_CRON" | crontab -
    
    log_success "Cron jobs installed successfully!"
    echo ""
    log_info "Schedule:"
    echo "  • Daily config backup: 2:00 AM"
    echo "  • Weekly full backup: Sunday 3:00 AM"
    echo "  • Monthly full backup: 1st of month 4:00 AM"
    echo ""
    log_info "Log file: ${LOG_FILE}"
    echo ""
    log_info "To view scheduled backups: crontab -l"
    log_info "To remove scheduled backups: $0 remove"
}

# Remove cron jobs
remove_cron() {
    local SILENT="$1"
    
    if [ "$SILENT" != "silent" ]; then
        log_info "Removing automated backup cron jobs..."
    fi
    
    # Get current crontab
    CURRENT_CRON=$(crontab -l 2>/dev/null || echo "")
    
    # Remove backup-related cron jobs
    UPDATED_CRON=$(echo "$CURRENT_CRON" | grep -v "backup-admin.sh" | grep -v "Admin Dashboard Automated Backups")
    
    # Update crontab
    echo "$UPDATED_CRON" | crontab -
    
    if [ "$SILENT" != "silent" ]; then
        log_success "Cron jobs removed"
    fi
}

# Show cron status
show_status() {
    log_info "Current cron jobs:"
    echo ""
    
    CURRENT_CRON=$(crontab -l 2>/dev/null || echo "")
    
    if echo "$CURRENT_CRON" | grep -q "backup-admin.sh"; then
        log_success "Automated backups are ENABLED"
        echo ""
        echo "Scheduled jobs:"
        echo "$CURRENT_CRON" | grep "backup-admin.sh" | while read -r line; do
            echo "  $line"
        done
        echo ""
        
        # Show recent backups
        if [ -d "backups/admin" ]; then
            log_info "Recent backups:"
            ls -lht backups/admin/*.tar.gz 2>/dev/null | head -5 || echo "  No backups found"
        fi
    else
        log_warning "Automated backups are NOT installed"
        echo ""
        log_info "To enable: $0 install"
    fi
}

# Main
main() {
    echo "========================================="
    echo "⏰ Admin Backup Cron Job Manager"
    echo "========================================="
    echo ""
    
    ACTION="${1:-status}"
    
    case "$ACTION" in
        install)
            install_cron
            ;;
        remove)
            remove_cron
            ;;
        status)
            show_status
            ;;
        *)
            log_error "Unknown action: $ACTION"
            echo ""
            echo "Usage: $0 [install|remove|status]"
            echo ""
            echo "Commands:"
            echo "  install  - Install automated backup cron jobs"
            echo "  remove   - Remove automated backup cron jobs"
            echo "  status   - Show current cron job status"
            exit 1
            ;;
    esac
}

main "$@"
