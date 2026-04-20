# 🚨 Incident Response Runbook - www.toklo.xyz Admin Dashboard

## Quick Reference

**Emergency Contacts:**
- System Admin: [Your Contact]
- Security Team: [Security Contact]
- Escalation: [Manager Contact]

**Critical Resources:**
- Server: [Server IP/Hostname]
- Database: PostgreSQL on [DB Host]
- Logs: `/Users/macbookpri/Downloads/dwallet-v5/server/logs/`
- Backups: `/Users/macbookpri/Downloads/dwallet-v5/backups/`

---

## Incident Classification

| Severity | Response Time | Examples |
|----------|---------------|----------|
| 🔴 **CRITICAL** | 15 minutes | Active breach, data leak, admin compromise |
| 🟠 **HIGH** | 1 hour | Multiple failed logins, suspicious activity |
| 🟡 **MEDIUM** | 4 hours | Configuration issues, minor anomalies |
| 🟢 **LOW** | 24 hours | Policy violations, routine alerts |

---

## 🚨 CRITICAL INCIDENTS

### 1. Admin Account Compromised

**Detection:**
- Alert: "2FA Disabled" received
- Unusual admin activity from unknown IP
- Admin reports unauthorized access

**Immediate Actions (within 15 minutes):**

```bash
# 1. Revoke all API keys for compromised admin
psql -U dwallet_admin -d dwallet_admin -c "
UPDATE api_keys 
SET is_active = false, revoked_at = CURRENT_TIMESTAMP, revoke_reason = 'Account compromise'
WHERE admin_id = 'COMPROMISED_ADMIN_UUID';
"

# 2. Force logout (delete sessions)
psql -U dwallet_admin -d dwallet_admin -c "
DELETE FROM sessions WHERE admin_id = 'COMPROMISED_ADMIN_UUID';
"

# 3. Ban suspicious IP
psql -U dwallet_admin -d dwallet_admin -c "
INSERT INTO banned_ips (ip_address, reason, ban_type)
VALUES ('SUSPICIOUS_IP', 'Account compromise', 'permanent');
"

# 4. Disable admin account
psql -U dwallet_admin -d dwallet_admin -c "
UPDATE admin_users SET is_active = false WHERE id = 'COMPROMISED_ADMIN_UUID';
"

# 5. Review audit logs
psql -U dwallet_admin -d dwallet_admin -c "
SELECT action, resource, ip_address, created_at 
FROM audit_logs 
WHERE admin_id = 'COMPROMISED_ADMIN_UUID' 
ORDER BY created_at DESC 
LIMIT 50;
"
```

**Recovery:**
1. Verify no unauthorized changes were made
2. Create new admin account with fresh credentials
3. Enable 2FA immediately
4. Rotate all API keys
5. Review and restore from backup if needed

---

### 2. Database Breach Suspected

**Detection:**
- Unusual database queries in logs
- Data export alerts
- Integrity check failures

**Immediate Actions:**

```bash
# 1. Check for unauthorized access
psql -U dwallet_admin -d dwallet_admin -c "
SELECT ip_address, action, created_at 
FROM audit_logs 
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;
"

# 2. Review security events
psql -U dwallet_admin -d dwallet_admin -c "
SELECT event_type, ip_address, severity, details
FROM security_events
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;
"

# 3. Check for new admin users
psql -U dwallet_admin -d dwallet_admin -c "
SELECT id, type, created_at, is_active
FROM admin_users
WHERE created_at > NOW() - INTERVAL '24 hours';
"

# 4. Verify backup integrity
./scripts/test-backup-restore.sh
```

**Recovery:**
1. Isolate database if active breach
2. Restore from last known good backup
3. Change all credentials
4. Enable enhanced logging
5. Notify affected users if data exposed

---

### 3. SSL Certificate Compromised

**Detection:**
- Certificate warnings in browser
- Unexpected certificate changes
- MITM attack suspected

**Immediate Actions:**

```bash
# 1. Revoke compromised certificate
sudo certbot revoke --cert-path /etc/letsencrypt/live/admin.toklo.xyz/cert.pem

# 2. Obtain new certificate
sudo certbot certonly --standalone -d admin.toklo.xyz

# 3. Reload Nginx
sudo systemctl reload nginx

# 4. Verify new certificate
echo | openssl s_client -connect admin.toklo.xyz:443 2>/dev/null | openssl x509 -noout -dates
```

---

## 🟠 HIGH PRIORITY INCIDENTS

### 4. Brute Force Attack Detected

**Detection:**
- Multiple failed login alerts (3+ attempts)
- Rate limit triggers
- Unusual login patterns

**Response:**

```bash
# 1. Check failed login attempts
psql -U dwallet_admin -d dwallet_admin -c "
SELECT ip_address, COUNT(*) as attempts, MAX(created_at) as last_attempt
FROM audit_logs
WHERE action LIKE '%FAILED%'
  AND created_at > NOW() - INTERVAL '1 hour'
GROUP BY ip_address
HAVING COUNT(*) > 5
ORDER BY attempts DESC;
"

# 2. Ban attacking IPs
psql -U dwallet_admin -d dwallet_admin -c "
INSERT INTO banned_ips (ip_address, reason, ban_type)
SELECT DISTINCT ip_address, 'Brute force attack', 'automatic'
FROM audit_logs
WHERE action LIKE '%FAILED%'
  AND created_at > NOW() - INTERVAL '1 hour'
  AND ip_address NOT IN (SELECT ip_address FROM banned_ips);
"

# 3. Review blocked attempts
cat /Users/macbookpri/Downloads/dwallet-v5/server/logs/ip-blocked.log | tail -50
```

---

### 5. API Key Leakage Suspected

**Detection:**
- API key found in logs/public
- Unusual API usage patterns
- Unauthorized API access

**Response:**

```bash
# 1. Identify compromised key
psql -U dwallet_admin -d dwallet_admin -c "
SELECT id, key_name, admin_id, last_used_at, created_at
FROM api_keys
WHERE is_active = true
ORDER BY last_used_at DESC
LIMIT 20;
"

# 2. Revoke compromised key
psql -U dwallet_admin -d dwallet_admin -c "
UPDATE api_keys 
SET is_active = false, revoked_at = CURRENT_TIMESTAMP, revoke_reason = 'Suspected leakage'
WHERE id = 'COMPROMISED_KEY_ID';
"

# 3. Check unauthorized usage
psql -U dwallet_admin -d dwallet_admin -c "
SELECT action, resource, ip_address, created_at
FROM audit_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;
"

# 4. Create new API key
# Use admin dashboard: POST /api/admin/auth/api-key/create
```

---

### 6. DDoS Attack

**Detection:**
- Unusual traffic spike
- High CPU/memory usage
- Rate limiting triggered excessively

**Response:**

```bash
# 1. Check current connections
sudo netstat -an | grep :3001 | wc -l

# 2. Identify top IPs
sudo netstat -an | grep :3001 | awk '{print $5}' | cut -d: -f1 | sort | uniq -c | sort -nr | head -20

# 3. Enable stricter rate limiting (temporary)
# Edit Nginx config: /etc/nginx/sites-available/toklo-admin
# Change: limit_req_zone rate=5r/s (from 10r/s)

sudo nginx -t && sudo systemctl reload nginx

# 4. Consider enabling Cloudflare DDoS protection
# If using Cloudflare: Enable "Under Attack" mode
```

---

## 🟡 MEDIUM PRIORITY INCIDENTS

### 7. Configuration Drift Detected

**Detection:**
- Security test failures
- Configuration audit alerts
- Missing security headers

**Response:**

```bash
# 1. Run security audit
./scripts/automated-security-test.sh

# 2. Check Nginx configuration
sudo nginx -T | grep -E "(ssl_|add_header|limit_req)"

# 3. Verify environment variables
grep -E "(JWT_SECRET|ADMIN_SECRET|DB_ENCRYPTION)" .env | awk -F'=' '{print $1 "= [REDACTED]"}'

# 4. Fix any issues found
# Reference: ADMIN_SECURITY_SETUP_GUIDE.md
```

---

### 8. Backup Failures

**Detection:**
- Backup cron job errors
- Missing backup files
- Backup integrity check failures

**Response:**

```bash
# 1. Check backup logs
cat /Users/macbookpri/Downloads/dwallet-v5/backups/backup_history.log | tail -10

# 2. Manually run backup
./scripts/backup-admin-db.sh

# 3. Verify backup created
ls -lh /Users/macbookpri/Downloads/dwallet-v5/backups/admin_db_*.sql* | tail -3

# 4. Test restoration
./scripts/test-backup-restore.sh

# 5. Check cron job
crontab -l | grep backup
```

---

## 🟢 LOW PRIORITY INCIDENTS

### 9. Certificate Expiring Soon

**Detection:**
- Certbot renewal warning
- Security test shows < 30 days

**Response:**

```bash
# 1. Check certificate status
sudo certbot certificates

# 2. Force renewal
sudo certbot renew --force-renewal

# 3. Verify new certificate
echo | openssl s_client -connect admin.toklo.xyz:443 2>/dev/null | openssl x509 -noout -dates

# 4. Reload Nginx
sudo systemctl reload nginx
```

---

### 10. API Keys Expiring

**Detection:**
- Expiring key alerts
- Security test warnings

**Response:**

```bash
# 1. Check expiring keys
psql -U dwallet_admin -d dwallet_admin -c "
SELECT key_name, admin_id, expires_at,
       EXTRACT(DAY FROM expires_at - NOW()) as days_left
FROM api_keys
WHERE is_active = true
  AND expires_at < NOW() + INTERVAL '30 days'
ORDER BY expires_at ASC;
"

# 2. Rotate keys
# Use admin dashboard: POST /api/admin/auth/api-key/:id/rotate

# 3. Notify key owners
# Send email/Discord notification
```

---

## 🛡️ Preventive Measures

### Daily Checks (Automated)
- [ ] Security test suite runs every 6 hours
- [ ] Backup runs daily at 2 AM
- [ ] API key maintenance at 3 AM
- [ ] Log review for critical errors

### Weekly Checks
- [ ] Backup restoration test (Sunday 4 AM)
- [ ] Review banned IPs list
- [ ] Check certificate expiration
- [ ] Audit admin access logs

### Monthly Checks
- [ ] Full security audit
- [ ] Review and update IP whitelist
- [ ] Test incident response procedures
- [ ] Rotate high-privilege API keys

### Quarterly Checks
- [ ] Penetration testing
- [ ] Review incident response runbook
- [ ] Update security policies
- [ ] Disaster recovery drill

---

## 📞 Escalation Matrix

| Time Elapsed | Action |
|--------------|--------|
| 0-15 min | Initial response and containment |
| 15-60 min | Assessment and recovery planning |
| 1-4 hours | Full recovery or mitigation |
| 4+ hours | Escalate to senior management |
| 24+ hours | Post-incident review and documentation |

---

## 📝 Post-Incident Checklist

After any security incident:

- [ ] Document timeline of events
- [ ] Identify root cause
- [ ] Verify all threats eliminated
- [ ] Update security controls
- [ ] Review and update this runbook
- [ ] Notify affected parties
- [ ] Conduct lessons learned meeting
- [ ] Implement preventive measures

---

## 🔧 Useful Commands

### Check System Status
```bash
# Server health
curl https://admin.toklo.xyz/api/admin/health

# Database status
psql -U dwallet_admin -d dwallet_admin -c "SELECT 1"

# Disk space
df -h

# Memory usage
free -m
```

### Emergency Lockdown
```bash
# Disable all admin access
psql -U dwallet_admin -d dwallet_admin -c "UPDATE admin_users SET is_active = false;"

# Revoke all API keys
psql -U dwallet_admin -d dwallet_admin -c "UPDATE api_keys SET is_active = false;"

# Block all non-whitelisted IPs
# Already enforced by ipWhitelist middleware
```

### Restore from Backup
```bash
# Stop application
# Kill Node.js process

# Drop and recreate database
dropdb dwallet_admin
createdb -U dwallet_admin dwallet_admin

# Restore latest backup
LATEST=$(find backups -name "admin_db_*.sql*" | sort -r | head -1)
psql -U dwallet_admin -d dwallet_admin -f "$LATEST"

# Restart application
node server/enterprise-secure-server.cjs
```

---

## 📚 Additional Resources

- **Security Setup Guide:** [ADMIN_SECURITY_SETUP_GUIDE.md](file:///Users/macbookpri/Downloads/dwallet-v5/ADMIN_SECURITY_SETUP_GUIDE.md)
- **Security Testing:** [scripts/automated-security-test.sh](file:///Users/macbookpri/Downloads/dwallet-v5/scripts/automated-security-test.sh)
- **Backup Testing:** [scripts/test-backup-restore.sh](file:///Users/macbookpri/Downloads/dwallet-v5/scripts/test-backup-restore.sh)
- **Gap Analysis:** [SECURITY_GAP_ANALYSIS.md](file:///Users/macbookpri/Downloads/dwallet-v5/SECURITY_GAP_ANALYSIS.md)

---

**Last Updated:** April 19, 2026  
**Review Date:** May 19, 2026  
**Document Owner:** Security Team
