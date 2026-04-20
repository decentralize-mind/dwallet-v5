# 🔐 HTTPS Setup for www.toklo.xyz - Quick Start

## 🎯 Your Domain Configuration

**Main Domain:** www.toklo.xyz  
**Admin Subdomain:** admin.toklo.xyz  
**Backend:** Node.js on port 3001

---

## 🚀 One Command Setup

### Option 1: Automated Script (Recommended)

```bash
cd /Users/macbookpri/Downloads/dwallet-v5
sudo ./scripts/setup-toklo-https.sh
```

This single command will:
- ✅ Install certbot if needed
- ✅ Obtain SSL certificate from Let's Encrypt
- ✅ Configure Nginx with reverse proxy
- ✅ Setup HTTP → HTTPS redirect
- ✅ Enable security headers
- ✅ Configure auto-renewal

---

### Option 2: Manual Commands

If you prefer to run commands manually:

```bash
# Step 1: Install certbot (Ubuntu/Debian)
sudo apt update
sudo apt install -y certbot python3-certbot-nginx

# Step 2: Obtain SSL certificate
sudo certbot certonly --standalone \
  -d admin.toklo.xyz \
  --email admin@toklo.xyz \
  --agree-tos \
  --non-interactive

# Step 3: Verify certificate
sudo certbot certificates

# Step 4: Setup auto-renewal
sudo crontab -e
# Add this line:
0 0,12 * * * certbot renew --quiet --deploy-hook "systemctl reload nginx"
```

---

## 📋 Before You Start

### 1. Configure DNS

Add DNS A record in your domain registrar:

```
Type: A
Name: admin
Value: YOUR_SERVER_IP
TTL: 300
```

**Verify DNS:**
```bash
dig admin.toklo.xyz +short
# Should return your server IP
```

### 2. Open Firewall Ports

```bash
sudo ufw allow 80/tcp   # HTTP (for certificate validation)
sudo ufw allow 443/tcp  # HTTPS
sudo ufw allow 22/tcp   # SSH
```

### 3. Verify Server Accessibility

```bash
curl -I http://admin.toklo.xyz
# Should return HTTP response (even if error)
```

---

## ✅ After Setup - Verification

### Test HTTPS

```bash
# Basic HTTPS test
curl -I https://admin.toklo.xyz
# Expected: HTTP/2 200

# Test health endpoint
curl https://admin.toklo.xyz/api/admin/health
# Expected: JSON with "status": "healthy"

# Test HTTP redirect
curl -I http://admin.toklo.xyz
# Expected: 301 redirect to https://
```

### Check SSL Certificate

```bash
# View certificate details
echo | openssl s_client -connect admin.toklo.xyz:443 2>/dev/null | openssl x509 -noout -subject -dates

# Expected output:
# subject=CN = admin.toklo.xyz
# notBefore=Apr 19 00:00:00 2026 GMT
# notAfter=Jul 18 00:00:00 2026 GMT
```

### Verify Security Headers

```bash
curl -I https://admin.toklo.xyz | grep -E "(Strict-Transport|X-Frame|X-Content)"
```

Expected headers:
```
strict-transport-security: max-age=31536000; includeSubDomains
x-frame-options: DENY
x-content-type-options: nosniff
```

---

## 🛠️ Troubleshooting

### Problem: Certificate Acquisition Failed

**Error:** "Challenge failed for domain admin.toklo.xyz"

**Solution:**
```bash
# 1. Verify DNS is correct
dig admin.toklo.xyz +short
# Must return your server IP

# 2. Check port 80 is accessible
curl -I http://admin.toklo.xyz

# 3. Open firewall
sudo ufw allow 80/tcp

# 4. Try again
sudo certbot certonly --standalone -d admin.toklo.xyz
```

### Problem: 502 Bad Gateway

**Cause:** Backend not running on port 3001

**Solution:**
```bash
# Start your backend
cd /Users/macbookpri/Downloads/dwallet-v5
node server/enterprise-secure-server.cjs

# Verify it's running
curl http://localhost:3001/api/admin/health
```

### Problem: Nginx Won't Start

**Solution:**
```bash
# Test configuration
sudo nginx -t

# View error logs
sudo tail -f /var/log/nginx/error.log

# Stop conflicting services
sudo systemctl stop apache2  # If Apache is running

# Restart Nginx
sudo systemctl restart nginx
```

---

## 🔄 Certificate Management

### Check Certificate Status

```bash
sudo certbot certificates
```

### Manual Renewal

```bash
sudo certbot renew
sudo systemctl reload nginx
```

### Force Renewal

```bash
sudo certbot renew --force-renewal
sudo systemctl reload nginx
```

### Test Auto-Renewal

```bash
sudo certbot renew --dry-run
```

---

## 📊 Online Verification Tools

Test your HTTPS setup with these free tools:

1. **SSL Labs Test** (Grade A+ expected)
   - https://www.ssllabs.com/ssltest/
   - Enter: `admin.toklo.xyz`

2. **Security Headers** (Grade A expected)
   - https://securityheaders.com/
   - Enter: `https://admin.toklo.xyz`

3. **Redirect Checker**
   - https://redirect-checker.org/
   - Verify HTTP → HTTPS redirect

---

## 🔐 Update Environment Variables

After HTTPS is enabled, update your `.env`:

```env
# Update CORS origins to use HTTPS
ADMIN_ALLOWED_ORIGINS=https://admin.toklo.xyz,https://www.toklo.xyz

# Production mode
NODE_ENV=production
```

---

## 📝 Nginx Configuration Location

After running the setup script:

- **Config file:** `/etc/nginx/sites-available/toklo-admin`
- **Enabled link:** `/etc/nginx/sites-enabled/toklo-admin`
- **SSL certs:** `/etc/letsencrypt/live/admin.toklo.xyz/`

**Edit configuration:**
```bash
sudo nano /etc/nginx/sites-available/toklo-admin
sudo nginx -t
sudo systemctl reload nginx
```

---

## 🎯 Quick Commands Reference

```bash
# Setup HTTPS (one command)
sudo ./scripts/setup-toklo-https.sh

# Test HTTPS
curl https://admin.toklo.xyz/api/admin/health

# View certificate
sudo certbot certificates

# Renew certificate
sudo certbot renew && sudo systemctl reload nginx

# Check Nginx logs
sudo tail -f /var/log/nginx/error.log

# Restart services
sudo systemctl restart nginx
node server/enterprise-secure-server.cjs
```

---

## 📚 Full Documentation

For detailed instructions and troubleshooting:

- 📖 [HTTPS_SETUP_GUIDE.md](file:///Users/macbookpri/Downloads/dwallet-v5/HTTPS_SETUP_GUIDE.md) - Complete guide (615 lines)
- 🔧 [scripts/setup-https.sh](file:///Users/macbookpri/Downloads/dwallet-v5/scripts/setup-https.sh) - Generic setup script
- 🎯 [scripts/setup-toklo-https.sh](file:///Users/macbookpri/Downloads/dwallet-v5/scripts/setup-toklo-https.sh) - Your domain-specific script

---

## 🆘 Need Help?

**Check these logs:**
```bash
# Certbot logs
sudo tail -f /var/log/letsencrypt/letsencrypt.log

# Nginx error logs
sudo tail -f /var/log/nginx/error.log

# Backend logs
tail -f server/logs/*.log
```

**Common issues:**
- DNS not propagated → Wait 5-10 minutes or reduce TTL
- Port 80 blocked → `sudo ufw allow 80/tcp`
- Backend not running → Start with `node server/enterprise-secure-server.cjs`
- Certificate expired → `sudo certbot renew`

---

**Your admin dashboard at admin.toklo.xyz will be fully secured with HTTPS!** 🔐🚀
