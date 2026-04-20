# 🔐 HTTPS Setup Guide for www.toklo.xyz

Complete instructions to enable HTTPS on your admin dashboard using Let's Encrypt (FREE SSL certificates).

---

## 🎯 Domain Configuration

**Main Domain:** www.toklo.xyz  
**Admin Subdomain:** admin.toklo.xyz  
**Backend API:** admin.toklo.xyz/api/*

---

## 📋 Prerequisites

Before running the HTTPS setup, ensure:

1. ✅ **DNS is configured** - `admin.toklo.xyz` points to your server IP
2. ✅ **Server is accessible** - Port 80 and 443 are open
3. ✅ **Nginx is installed** - Will be installed automatically if missing
4. ✅ **Root/sudo access** - Required for SSL certificate installation

---

## 🚀 Quick Setup (Recommended)

### Option 1: Automated Setup Script

```bash
# Navigate to project directory
cd /Users/macbookpri/Downloads/dwallet-v5

# Make script executable (if not already)
chmod +x scripts/setup-https.sh

# Run automated setup for admin.toklo.xyz
sudo DOMAIN=admin.toklo.xyz ADMIN_EMAIL=admin@toklo.xyz scripts/setup-https.sh
```

**What this does:**
- ✅ Installs Nginx and Certbot
- ✅ Creates Nginx configuration with reverse proxy to port 3001
- ✅ Obtains SSL certificate from Let's Encrypt
- ✅ Configures HTTP → HTTPS redirect
- ✅ Enables HSTS (HTTP Strict Transport Security)
- ✅ Sets up automatic certificate renewal
- ✅ Adds security headers

---

### Option 2: Manual Setup (Step-by-Step)

#### Step 1: Verify DNS Configuration

```bash
# Check if admin.toklo.xyz points to your server
dig admin.toklo.xyz +short

# Expected: Your server's public IP address
# If blank or wrong, update DNS records first
```

**DNS Configuration Required:**
```
Type: A
Name: admin
Value: YOUR_SERVER_IP
TTL: 300 (5 minutes)
```

#### Step 2: Test Server Accessibility

```bash
# Test HTTP access (should work)
curl -I http://admin.toklo.xyz

# Expected: HTTP/1.1 200 OK or connection refused (if Nginx not running)
```

#### Step 3: Install Certbot

**For Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install -y certbot python3-certbot-nginx
```

**For CentOS/RHEL:**
```bash
sudo yum install -y epel-release
sudo yum install -y certbot python3-certbot-nginx
```

**For macOS (Development/Testing):**
```bash
brew install certbot
# Note: macOS requires manual Nginx configuration
```

#### Step 4: Obtain SSL Certificate

**Method A: Standalone Mode** (Use if Nginx is NOT running)

```bash
sudo certbot certonly --standalone \
  -d admin.toklo.xyz \
  --email admin@toklo.xyz \
  --agree-tos \
  --non-interactive \
  --preferred-challenges http
```

**Method B: Nginx Plugin** (Recommended if Nginx is running)

```bash
sudo certbot --nginx \
  -d admin.toklo.xyz \
  --email admin@toklo.xyz \
  --redirect \
  --hsts \
  --staple-ocsp \
  --agree-tos \
  --non-interactive
```

**Certificate Files Created:**
```
/etc/letsencrypt/live/admin.toklo.xyz/
├── cert.pem      # Server certificate
├── chain.pem     # Chain certificate
├── fullchain.pem # Full chain (cert + chain)
└── privkey.pem   # Private key
```

#### Step 5: Configure Nginx

Create Nginx configuration:

```bash
sudo nano /etc/nginx/sites-available/toklo-admin
```

**Paste this configuration:**

```nginx
# HTTP → HTTPS Redirect
server {
    listen 80;
    server_name admin.toklo.xyz;
    
    # Let's Encrypt verification
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    # Redirect all HTTP to HTTPS
    location / {
        return 301 https://$host$request_uri;
    }
}

# HTTPS Server
server {
    listen 443 ssl http2;
    server_name admin.toklo.xyz;

    # SSL Certificate
    ssl_certificate /etc/letsencrypt/live/admin.toklo.xyz/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/admin.toklo.xyz/privkey.pem;
    
    # SSL Configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # HSTS (HTTP Strict Transport Security)
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # Security Headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';" always;
    
    # Reverse Proxy to Node.js Backend
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Rate Limiting
    limit_req_zone $binary_remote_addr zone=admin_limit:10m rate=10r/s;
    location /api/ {
        limit_req zone=admin_limit burst=20 nodelay;
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Block Common Attack Vectors
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }
    
    location ~* \.(sql|bak|old|env)$ {
        deny all;
    }
}
```

**Enable the site:**

```bash
# Create symbolic link
sudo ln -s /etc/nginx/sites-available/toklo-admin /etc/nginx/sites-enabled/

# Test Nginx configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

#### Step 6: Verify HTTPS

```bash
# Test HTTPS connection
curl -I https://admin.toklo.xyz

# Expected output:
# HTTP/2 200
# strict-transport-security: max-age=31536000; includeSubDomains
# x-frame-options: DENY
# x-content-type-options: nosniff

# Test health endpoint
curl https://admin.toklo.xyz/api/admin/health

# Expected: JSON response with status "healthy"
```

#### Step 7: Setup Auto-Renewal

Let's Encrypt certificates expire in 90 days. Setup automatic renewal:

```bash
# Test renewal (dry run)
sudo certbot renew --dry-run

# If successful, setup cron job
sudo crontab -e

# Add this line (runs twice daily):
0 0,12 * * * certbot renew --quiet --deploy-hook "systemctl reload nginx"
```

**Verify cron job:**
```bash
sudo crontab -l
```

---

## 🔍 Verification Checklist

After setup, verify everything works:

- [ ] **DNS Resolution**: `dig admin.toklo.xyz +short` returns server IP
- [ ] **HTTP Redirect**: `curl -I http://admin.toklo.xyz` returns 301 redirect to HTTPS
- [ ] **HTTPS Works**: `curl -I https://admin.toklo.xyz` returns HTTP/2 200
- [ ] **SSL Certificate**: `echo | openssl s_client -connect admin.toklo.xyz:443 2>/dev/null | openssl x509 -noout -dates`
- [ ] **Health Check**: `curl https://admin.toklo.xyz/api/admin/health` returns JSON
- [ ] **Security Headers**: Check response headers for HSTS, X-Frame-Options, etc.
- [ ] **Auto-Renewal**: `sudo certbot renew --dry-run` succeeds

---

## 🛠️ Troubleshooting

### Issue: Certificate Acquisition Failed

**Error:** "Challenge failed for domain admin.toklo.xyz"

**Solutions:**
```bash
# 1. Verify DNS is correct
dig admin.toklo.xyz +short
# Must return your server IP

# 2. Check if port 80 is accessible
curl -I http://admin.toklo.xyz

# 3. Check firewall
sudo ufw status
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# 4. Try standalone mode instead
sudo certbot certonly --standalone -d admin.toklo.xyz
```

### Issue: Nginx Won't Start

**Error:** "nginx: [emerg] bind() to 0.0.0.0:80 failed"

**Solutions:**
```bash
# Check what's using port 80
sudo lsof -i :80

# Stop conflicting services
sudo systemctl stop apache2  # If Apache is running

# Test Nginx config
sudo nginx -t

# View error logs
sudo tail -f /var/log/nginx/error.log
```

### Issue: SSL Certificate Not Trusted

**Error:** Browser shows "Your connection is not private"

**Solutions:**
```bash
# Verify certificate chain
echo | openssl s_client -connect admin.toklo.xyz:443 2>/dev/null | openssl x509 -noout -text

# Check certificate dates
sudo certbot certificates

# Reinstall certificate
sudo certbot reinstall -d admin.toklo.xyz
```

### Issue: Backend Not Accessible Through HTTPS

**Error:** 502 Bad Gateway

**Solutions:**
```bash
# 1. Check if backend is running
curl http://localhost:3001/api/admin/health

# 2. Check Nginx error logs
sudo tail -f /var/log/nginx/error.log

# 3. Verify proxy configuration
sudo nginx -T | grep proxy_pass

# 4. Restart services
sudo systemctl restart nginx
node server/enterprise-secure-server.cjs
```

---

## 📊 Testing Your HTTPS Setup

### Online Tools

1. **SSL Labs Test**: https://www.ssllabs.com/ssltest/
   - Enter: `admin.toklo.xyz`
   - Expected Grade: A+

2. **Security Headers**: https://securityheaders.com/
   - Enter: `https://admin.toklo.xyz`
   - Check for all security headers

3. **Redirect Check**: https://redirect-checker.org/
   - Verify HTTP → HTTPS redirect works

### Command Line Tests

```bash
# Test SSL/TLS versions
openssl s_client -connect admin.toklo.xyz:443 -tls1_2 < /dev/null
openssl s_client -connect admin.toklo.xyz:443 -tls1_3 < /dev/null

# Check certificate details
echo | openssl s_client -connect admin.toklo.xyz:443 2>/dev/null | openssl x509 -noout -subject -issuer -dates

# Test HTTP redirect
curl -I http://admin.toklo.xyz
# Expected: 301 Moved Permanently → https://

# Verify HSTS
curl -I https://admin.toklo.xyz | grep -i strict-transport-security
# Expected: max-age=31536000; includeSubDomains
```

---

## 🔄 Certificate Renewal

### Manual Renewal

```bash
# Check certificate expiration
sudo certbot certificates

# Renew certificate
sudo certbot renew

# Force renewal (if needed)
sudo certbot renew --force-renewal

# Reload Nginx to use new certificate
sudo systemctl reload nginx
```

### Automatic Renewal

Certbot installs a systemd timer or cron job automatically. Verify:

```bash
# Check systemd timer
sudo systemctl status certbot.timer

# Check cron job
sudo crontab -l | grep certbot

# Test auto-renewal
sudo certbot renew --dry-run
```

---

## 🔐 Additional Security (Optional)

### Firewall Configuration

```bash
# Enable UFW (Uncomplicated Firewall)
sudo ufw enable

# Allow necessary ports
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP (for Let's Encrypt)
sudo ufw allow 443/tcp   # HTTPS
sudo ufw allow 3001/tcp  # Backend (internal only)

# Check status
sudo ufw status
```

### DNS Security (Cloudflare)

If using Cloudflare:

1. **Enable HTTPS:**
   - Go to SSL/TLS → Overview
   - Set to "Full (strict)"

2. **Always Use HTTPS:**
   - Go to SSL/TLS → Edge Certificates
   - Enable "Always Use HTTPS"

3. **HSTS:**
   - Enable "HTTP Strict Transport Security"
   - Set max-age to 12 months

---

## 📝 Environment Variables Update

After HTTPS is enabled, update your `.env` file:

```env
# Update CORS to use HTTPS
ADMIN_ALLOWED_ORIGINS=https://admin.toklo.xyz,https://www.toklo.xyz

# Force HTTPS in production
NODE_ENV=production
```

---

## 🎯 Final Verification

Run this complete test suite:

```bash
#!/bin/bash
# Test HTTPS setup

DOMAIN="admin.toklo.xyz"

echo "🔍 Testing HTTPS Setup for $DOMAIN"
echo "=================================="

# Test 1: DNS Resolution
echo -n "1. DNS Resolution: "
IP=$(dig +short $DOMAIN)
if [ -n "$IP" ]; then
  echo "✅ $IP"
else
  echo "❌ Failed"
fi

# Test 2: HTTP Redirect
echo -n "2. HTTP→HTTPS Redirect: "
STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://$DOMAIN)
if [ "$STATUS" = "301" ] || [ "$STATUS" = "302" ]; then
  echo "✅ $STATUS"
else
  echo "❌ $STATUS"
fi

# Test 3: HTTPS Works
echo -n "3. HTTPS Response: "
STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://$DOMAIN)
if [ "$STATUS" = "200" ]; then
  echo "✅ $STATUS"
else
  echo "❌ $STATUS"
fi

# Test 4: Health Endpoint
echo -n "4. Health Check: "
HEALTH=$(curl -s https://$DOMAIN/api/admin/health | grep -o '"status":"[^"]*"')
if [ -n "$HEALTH" ]; then
  echo "✅ $HEALTH"
else
  echo "❌ Failed"
fi

# Test 5: SSL Certificate
echo -n "5. SSL Certificate: "
EXPIRY=$(echo | openssl s_client -connect $DOMAIN:443 2>/dev/null | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)
if [ -n "$EXPIRY" ]; then
  echo "✅ Expires: $EXPIRY"
else
  echo "❌ Not found"
fi

# Test 6: Security Headers
echo -n "6. HSTS Header: "
HSTS=$(curl -sI https://$DOMAIN | grep -i strict-transport-security)
if [ -n "$HSTS" ]; then
  echo "✅ Present"
else
  echo "❌ Missing"
fi

echo "=================================="
echo "✅ HTTPS Setup Complete!"
```

---

## 📚 Resources

- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [Certbot Instructions](https://certbot.eff.org/)
- [Nginx SSL Configuration](https://nginx.org/en/docs/http/configuring_https_servers.html)
- [Mozilla SSL Configuration Generator](https://ssl-config.mozilla.org/)

---

## 🆘 Need Help?

**Check Logs:**
```bash
# Certbot logs
sudo tail -f /var/log/letsencrypt/letsencrypt.log

# Nginx error logs
sudo tail -f /var/log/nginx/error.log

# Nginx access logs
sudo tail -f /var/log/nginx/access.log
```

**Common Commands:**
```bash
# View installed certificates
sudo certbot certificates

# Delete certificate
sudo certbot delete --cert-name admin.toklo.xyz

# Reinstall certificate
sudo certbot reinstall -d admin.toklo.xyz

# Check Nginx configuration
sudo nginx -T
```

---

**Your domain www.toklo.xyz admin panel will be fully secured with HTTPS!** 🔐🚀
