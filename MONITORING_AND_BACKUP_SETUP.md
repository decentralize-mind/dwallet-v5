# 🔍 Monitoring & 🔄 Backup System Setup Guide

## Overview

This guide covers the implementation of error monitoring with Sentry and automated backups for your admin dashboard, optimized for localhost development.

---

## 📊 Part 1: Error Monitoring with Sentry

### What is Sentry?

Sentry is a powerful error tracking and performance monitoring platform that helps you:
- Catch errors in real-time
- Track performance bottlenecks
- Debug issues with detailed stack traces
- Monitor user experience
- Set up alerts for critical issues

### Why Sentry for Localhost?

✅ **Free tier**: 5,000 errors/month, 10,000 transactions/month  
✅ **Lightweight**: Minimal performance impact  
✅ **Detailed debugging**: Stack traces, breadcrumbs, user context  
✅ **Perfect for development**: Catch issues before production  
✅ **Easy setup**: 5-minute configuration  

---

### Step 1: Create Sentry Account

1. Go to [sentry.io](https://sentry.io)
2. Sign up for free account
3. Create a new project:
   - Platform: **Node.js** (for backend)
   - Platform: **React** (for frontend)
4. Get your **DSN** (Data Source Name)

Your DSN looks like:
```
https://examplePublicKey@o0.ingest.sentry.io/0
```

---

### Step 2: Configure Environment Variables

Add to your `.env` file:

```env
# Sentry Monitoring
SENTRY_DSN=https://your-dsn-here@o0.ingest.sentry.io/0
VITE_SENTRY_DSN=https://your-dsn-here@o0.ingest.sentry.io/0
VITE_ENVIRONMENT=development
```

**Important**: 
- `SENTRY_DSN` is for the backend (Node.js)
- `VITE_SENTRY_DSN` is for the frontend (React)
- Both can use the same DSN or separate projects

---

### Step 3: What's Already Configured

✅ **Backend Monitoring** (`server/sentry-config.js`)
- Error tracking for all API endpoints
- Performance monitoring (100% sampling in dev)
- Request/response tracing
- User context tracking
- Sensitive data filtering

✅ **Frontend Monitoring** (`src/services/sentry-config.js`)
- React error boundaries
- Component error tracking
- Network request monitoring
- Session replay (on errors)
- Browser error capture

✅ **Integration Points**
- `server/admin-server.js` - Sentry middleware added
- `src/main.jsx` - Frontend initialization
- `src/components/AdminDashboard.jsx` - User context tracking

---

### Step 4: Test Sentry Integration

#### Test Backend Error Tracking:

1. Start admin server:
```bash
npm run admin:server
```

2. Trigger a test error (in another terminal):
```bash
curl -X POST http://localhost:3001/api/admin/tokens/mint \
  -H "Authorization: Bearer invalid-token" \
  -H "Content-Type: application/json" \
  -d '{"address":"0x123","amount":"100"}'
```

3. Check your Sentry dashboard - you should see the error logged!

#### Test Frontend Error Tracking:

1. Start frontend:
```bash
npm run dev
```

2. Open browser console and trigger error:
```javascript
throw new Error('Test Sentry integration');
```

3. Check Sentry dashboard for the error

---

### Step 5: Using Sentry Dashboard

1. **Issues Tab**: View all captured errors
   - Filter by environment (development/production)
   - See frequency, affected users
   - View full stack traces

2. **Performance Tab**: Monitor API performance
   - Slow endpoints
   - Transaction duration
   - Database query performance

3. **Releases Tab**: Track errors by version
   - See which release introduced bugs
   - Monitor fix effectiveness

4. **Alerts**: Set up notifications
   - Email notifications for critical errors
   - Slack/Discord integration
   - PagerDuty for production

---

## 🔄 Part 2: Automated Backup System

### What Gets Backed Up?

✅ **Configuration Files**
- `.env` (with proper permissions)
- `server/admin-server.js`
- `server/sentry-config.js`
- `package.json`

✅ **Audit Logs**
- Server logs
- Access logs
- Error logs
- Data manifest (metadata)

✅ **Database** (when PostgreSQL is integrated)
- Full database dump
- Schema backup

---

### Quick Commands

All backup operations are available via npm scripts:

```bash
# Full backup (config + logs + database)
npm run backup

# Config-only backup (fast)
npm run backup:config

# Logs-only backup
npm run backup:logs

# Restore from backup
npm run restore backups/admin/admin_backup_20260420_143022.tar.gz

# Install automated cron jobs
npm run cron:install

# Check cron status
npm run cron:status

# Remove cron jobs
npm run cron:remove
```

---

### Manual Backup

#### Create Backup:
```bash
./scripts/backup-admin.sh full
```

**Output:**
```
=========================================
🔄 Admin Dashboard Backup
=========================================

[INFO] Starting full backup...
[INFO] Timestamp: 20260420_143022

[INFO] Backing up configuration files...
[SUCCESS] Backed up .env file
[SUCCESS] Backed up admin-server.js
[SUCCESS] Backed up sentry-config.js
[SUCCESS] Backed up package.json

[INFO] Backing up audit logs...
[SUCCESS] Backed up server logs
[SUCCESS] Created data manifest

[INFO] Creating compressed backup archive...
[SUCCESS] Created backup archive: admin_backup_20260420_143022.tar.gz (2.3MB)

[INFO] Cleaning up backups older than 30 days...
[SUCCESS] Cleaned up old backups

[INFO] Generating backup report...
[SUCCESS] Backup report saved to: backups/admin/backup-report-20260420_143022.txt

=========================================
[SUCCESS] Backup completed successfully!
=========================================
Backup file: backups/admin/admin_backup_20260420_143022.tar.gz
Backup size: 2.3MB
```

---

### Restore from Backup

#### Step 1: List Available Backups
```bash
ls -lh backups/admin/*.tar.gz
```

#### Step 2: Restore
```bash
./scripts/restore-admin.sh backups/admin/admin_backup_20260420_143022.tar.gz
```

**The script will:**
1. Extract backup to temporary directory
2. Ask which files to restore (safe - won't overwrite without confirmation)
3. Restore configuration files
4. Restore logs
5. Restore database (if available)
6. Verify restoration
7. Clean up temporary files

---

### Automated Backups (Cron Jobs)

#### Install Automated Schedule:
```bash
npm run cron:install
```

**Default Schedule:**
- **Daily at 2:00 AM**: Config backup (fast, lightweight)
- **Sunday at 3:00 AM**: Full backup (comprehensive)
- **1st of month at 4:00 AM**: Full backup (monthly archive)

#### Check Status:
```bash
npm run cron:status
```

**Output:**
```
=========================================
⏰ Admin Backup Cron Job Manager
=========================================

[INFO] Current cron jobs:

[SUCCESS] Automated backups are ENABLED

Scheduled jobs:
  0 2 * * * cd /Users/macbookpri/Downloads/dwallet-v5 && ./scripts/backup-admin.sh config >> /Users/macbookpri/Downloads/dwallet-v5/logs/backup-cron.log 2>&1
  0 3 * * 0 cd /Users/macbookpri/Downloads/dwallet-v5 && ./scripts/backup-admin.sh full >> /Users/macbookpri/Downloads/dwallet-v5/logs/backup-cron.log 2>&1
  0 4 1 * * cd /Users/macbookpri/Downloads/dwallet-v5 && ./scripts/backup-admin.sh full >> /Users/macbookpri/Downloads/dwallet-v5/logs/backup-cron.log 2>&1

[INFO] Recent backups:
  -rw-r--r--  1 macbookpri  staff   2.3M Apr 20 14:30 backups/admin/admin_backup_20260420_143022.tar.gz
```

#### Remove Automated Backups:
```bash
npm run cron:remove
```

---

### Backup Storage & Retention

**Location:** `backups/admin/`

**Retention:** 30 days (configurable in backup script)

**Cleanup:** Automatic - old backups are deleted on each new backup run

**Recommended:** Copy backups to external storage or cloud (S3, Google Drive, etc.)

---

## 🧪 Testing the Systems

### Test 1: Verify Sentry is Working

```bash
# Start admin server
npm run admin:server

# Look for this message:
# ✅ Sentry monitoring initialized
# 📊 Environment: development
# 🔍 Performance monitoring: 100%
```

If you see `⚠️ Sentry DSN not configured`, add `SENTRY_DSN` to `.env`

---

### Test 2: Create a Backup

```bash
npm run backup
```

**Verify:**
- Backup file created in `backups/admin/`
- Backup report generated
- No errors in output

---

### Test 3: Test Restoration

```bash
# Get latest backup
LATEST_BACKUP=$(ls -t backups/admin/*.tar.gz | head -1)

# Restore (in test mode - won't actually overwrite)
./scripts/restore-admin.sh "$LATEST_BACKUP"
```

**Verify:**
- Extraction successful
- Files listed for restoration
- Verification passes

---

### Test 4: Verify Cron Jobs

```bash
npm run cron:status
```

**Verify:**
- Cron jobs are listed
- Schedule is correct
- Recent backups shown

---

## 📈 Monitoring Best Practices

### For Localhost Development:

1. **Check Sentry Daily**
   - Review new errors
   - Fix issues before they reach production
   - Monitor performance trends

2. **Set Up Email Alerts**
   - Critical errors only (avoid noise)
   - Performance degradation alerts
   - Daily summary emails

3. **Use Tags & Context**
   - Environment tags (dev/staging/prod)
   - User context (admin ID)
   - Custom tags for features

4. **Monitor Key Metrics**
   - Error rate (should be < 1%)
   - API response times (< 500ms)
   - Failed authentication attempts
   - Backup success rate

---

## 🔄 Backup Best Practices

### For Localhost Development:

1. **Backup Before Changes**
   - Before updating server code
   - Before modifying .env
   - Before database migrations

2. **Test Restoration Regularly**
   - Monthly restore test
   - Verify backup integrity
   - Document restoration process

3. **Store Backups Offsite**
   - Copy to external drive
   - Upload to cloud storage
   - Use version control for configs (not .env!)

4. **Monitor Backup Success**
   - Check cron logs: `logs/backup-cron.log`
   - Verify backup file sizes
   - Set up alerts for failed backups

---

## 🐛 Troubleshooting

### Sentry Issues:

**Problem**: "Sentry DSN not configured"
```bash
# Solution: Add to .env
SENTRY_DSN=https://your-dsn@o0.ingest.sentry.io/0
VITE_SENTRY_DSN=https://your-dsn@o0.ingest.sentry.io/0
```

**Problem**: Errors not showing in Sentry
```bash
# Check if Sentry is initialized
npm run admin:server | grep Sentry

# Verify DSN is correct
echo $SENTRY_DSN
```

---

### Backup Issues:

**Problem**: "Permission denied" on backup script
```bash
# Fix permissions
chmod +x scripts/backup-admin.sh
chmod +x scripts/restore-admin.sh
chmod +x scripts/setup-cron.sh
```

**Problem**: Cron job not running
```bash
# Check cron logs
tail -f logs/backup-cron.log

# Verify cron is installed
crontab -l

# Reinstall cron jobs
npm run cron:install
```

**Problem**: Backup file too large
```bash
# Check what's taking space
du -sh backups/admin/*

# Clean old backups manually
find backups/admin -name "*.tar.gz" -mtime +7 -delete
```

---

## 📊 File Structure

```
dwallet-v5/
├── server/
│   ├── admin-server.js          # Backend with Sentry integration
│   └── sentry-config.js         # Sentry backend configuration
├── src/
│   ├── main.jsx                 # Frontend entry with Sentry
│   └── services/
│       └── sentry-config.js     # Sentry frontend configuration
├── scripts/
│   ├── backup-admin.sh          # Backup script
│   ├── restore-admin.sh         # Restoration script
│   └── setup-cron.sh            # Cron job manager
├── backups/
│   └── admin/                   # Backup storage
│       ├── admin_backup_*.tar.gz
│       └── backup-report-*.txt
└── logs/
    └── backup-cron.log          # Cron execution logs
```

---

## 🎯 Next Steps

### Immediate:
1. ✅ Create Sentry account
2. ✅ Add DSN to `.env`
3. ✅ Test error tracking
4. ✅ Run first backup
5. ✅ Install cron jobs

### Short-term:
1. Set up email alerts in Sentry
2. Configure Slack/Discord notifications
3. Test backup restoration
4. Document backup locations
5. Set up offsite backup storage

### Long-term:
1. Integrate PostgreSQL database
2. Enable database backups
3. Set up monitoring dashboards
4. Configure performance budgets
5. Implement automated alerting

---

## 📚 Resources

- [Sentry Documentation](https://docs.sentry.io/)
- [Sentry React SDK](https://docs.sentry.io/platforms/javascript/guides/react/)
- [Sentry Node.js SDK](https://docs.sentry.io/platforms/node/)
- [Cron Job Tutorial](https://crontab.guru/)
- [Backup Best Practices](https://www.backblaze.com/backup-best-practices.html)

---

## ✅ Checklist

### Monitoring Setup:
- [ ] Sentry account created
- [ ] DSN added to `.env`
- [ ] Backend monitoring working
- [ ] Frontend monitoring working
- [ ] Test errors appearing in dashboard
- [ ] Alerts configured (optional)

### Backup Setup:
- [ ] First backup created successfully
- [ ] Backup restoration tested
- [ ] Cron jobs installed
- [ ] Backup retention verified
- [ ] Offsite storage configured (optional)
- [ ] Team notified of backup schedule

---

**Version**: 1.0.0  
**Last Updated**: April 20, 2026  
**Status**: ✅ Complete and Tested
