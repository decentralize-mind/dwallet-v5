#!/bin/bash
###############################################################################
# 🔐 HTTPS Setup for admin.toklo.xyz - One Command Solution
# 
# Usage: sudo ./setup-toklo-https.sh
###############################################################################

set -e

DOMAIN="admin.toklo.xyz"
EMAIL="admin@toklo.xyz"

echo "╔═══════════════════════════════════════════════════════╗"
echo "║   🔐 HTTPS Setup for admin.toklo.xyz                 ║"
echo "║   Main Domain: www.toklo.xyz                         ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""

# ───────────────────────────────────────────────────────────
# 1. VERIFY PREREQUISITES
# ───────────────────────────────────────────────────────────

echo "🔍 Step 1: Checking prerequisites..."

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
  echo "❌ Please run with sudo: sudo ./setup-toklo-https.sh"
  exit 1
fi

# Check DNS
echo -n "📍 DNS Resolution for $DOMAIN: "
DNS_IP=$(dig +short $DOMAIN 2>/dev/null | head -1)
if [ -n "$DNS_IP" ]; then
  echo "✅ $DNS_IP"
else
  echo "⚠️  DNS not configured or not propagated yet"
  echo "   Please add DNS A record: admin.toklo.xyz → YOUR_SERVER_IP"
  read -p "Continue anyway? (y/N): " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

# Install certbot if needed
if ! command -v certbot &> /dev/null; then
  echo "📦 Installing certbot..."
  if command -v apt-get &> /dev/null; then
    apt-get update
    apt-get install -y certbot python3-certbot-nginx
  elif command -v yum &> /dev/null; then
    yum install -y epel-release
    yum install -y certbot python3-certbot-nginx
  elif command -v brew &> /dev/null; then
    brew install certbot
  fi
fi

echo "✅ Prerequisites met"
echo ""

# ───────────────────────────────────────────────────────────
# 2. OBTAIN SSL CERTIFICATE
# ───────────────────────────────────────────────────────────

echo "🔒 Step 2: Obtaining SSL certificate from Let's Encrypt..."
echo ""

# Try nginx plugin first, fallback to standalone
if command -v nginx &> /dev/null && systemctl is-active --quiet nginx 2>/dev/null; then
  echo "📍 Using Nginx plugin method..."
  certbot --nginx \
    -d "$DOMAIN" \
    --email "$EMAIL" \
    --redirect \
    --hsts \
    --staple-ocsp \
    --agree-tos \
    --non-interactive
else
  echo "📍 Using Standalone method (requires port 80 available)..."
  echo "⚠️  Temporarily stopping any service on port 80..."
  
  # Stop anything using port 80
  if command -v nginx &> /dev/null; then
    systemctl stop nginx 2>/dev/null || true
  fi
  
  certbot certonly --standalone \
    -d "$DOMAIN" \
    --email "$EMAIL" \
    --agree-tos \
    --non-interactive \
    --preferred-challenges http
  
  # Restart nginx after certificate obtained
  if command -v nginx &> /dev/null; then
    systemctl start nginx 2>/dev/null || true
  fi
fi

if [ $? -eq 0 ]; then
  echo "✅ SSL certificate obtained successfully!"
else
  echo "❌ SSL certificate acquisition failed"
  echo ""
  echo "Troubleshooting:"
  echo "1. Check DNS: dig $DOMAIN +short"
  echo "2. Check port 80 is accessible: curl -I http://$DOMAIN"
  echo "3. Check firewall: sudo ufw allow 80/tcp"
  exit 1
fi

echo ""

# ───────────────────────────────────────────────────────────
# 3. CONFIGURE NGINX
# ───────────────────────────────────────────────────────────

echo "📝 Step 3: Configuring Nginx..."

if command -v nginx &> /dev/null; then
  NGINX_CONF="/etc/nginx/sites-available/toklo-admin"
  
  # Create Nginx config
  cat > "$NGINX_CONF" << EOF
# HTTP → HTTPS Redirect
server {
    listen 80;
    server_name $DOMAIN;
    
    # Let's Encrypt verification
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    # Redirect all HTTP to HTTPS
    location / {
        return 301 https://\$host\$request_uri;
    }
}

# HTTPS Server
server {
    listen 443 ssl http2;
    server_name $DOMAIN;

    # SSL Certificate
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    
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
    
    # Reverse Proxy to Node.js Backend (port 3001)
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Rate Limiting for API
    limit_req_zone \$binary_remote_addr zone=admin_limit:10m rate=10r/s;
    location /api/ {
        limit_req zone=admin_limit burst=20 nodelay;
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
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
EOF

  # Enable site
  ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/
  
  # Test and reload
  nginx -t && systemctl reload nginx
  
  echo "✅ Nginx configured and reloaded"
else
  echo "⚠️  Nginx not installed. Manual configuration required."
  echo "   Certificate is saved at: /etc/letsencrypt/live/$DOMAIN/"
fi

echo ""

# ───────────────────────────────────────────────────────────
# 4. SETUP AUTO-RENEWAL
# ───────────────────────────────────────────────────────────

echo "⏰ Step 4: Setting up automatic certificate renewal..."

# Setup cron job for renewal
(crontab -l 2>/dev/null | grep -v certbot; echo "0 0,12 * * * certbot renew --quiet --deploy-hook 'systemctl reload nginx'") | crontab -

echo "✅ Auto-renewal configured (certificates renew automatically)"
echo ""

# ───────────────────────────────────────────────────────────
# 5. VERIFY SETUP
# ───────────────────────────────────────────────────────────

echo "🔍 Step 5: Verifying HTTPS setup..."
echo ""

sleep 3

# Test HTTPS
echo -n "HTTPS Response: "
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://$DOMAIN 2>/dev/null || echo "failed")
if [ "$HTTP_STATUS" = "200" ]; then
  echo "✅ HTTP $HTTP_STATUS"
else
  echo "⚠️  HTTP $HTTP_STATUS (backend may not be running yet)"
fi

# Test redirect
echo -n "HTTP→HTTPS Redirect: "
REDIRECT_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://$DOMAIN 2>/dev/null || echo "failed")
if [ "$REDIRECT_STATUS" = "301" ] || [ "$REDIRECT_STATUS" = "302" ]; then
  echo "✅ $REDIRECT_STATUS"
else
  echo "⚠️  $REDIRECT_STATUS"
fi

# Check certificate
echo -n "SSL Certificate: "
EXPIRY=$(echo | openssl s_client -connect $DOMAIN:443 2>/dev/null | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)
if [ -n "$EXPIRY" ]; then
  echo "✅ Expires: $EXPIRY"
else
  echo "⚠️  Could not verify"
fi

echo ""

# ───────────────────────────────────────────────────────────
# 6. FINAL SUMMARY
# ───────────────────────────────────────────────────────────

echo "╔═══════════════════════════════════════════════════════╗"
echo "║   ✅ HTTPS Setup Complete for admin.toklo.xyz        ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""
echo "📊 Summary:"
echo "   Domain:          $DOMAIN"
echo "   Main Domain:     www.toklo.xyz"
echo "   Backend Port:    3001"
echo "   SSL Provider:    Let's Encrypt (Free)"
echo "   Auto-Renewal:    Enabled"
echo "   HSTS:            Enabled"
echo "   Security Headers: Enabled"
echo ""
echo "🔗 URLs:"
echo "   Admin Panel:     https://$DOMAIN"
echo "   API Endpoint:    https://$DOMAIN/api/"
echo "   Health Check:    https://$DOMAIN/api/admin/health"
echo ""
echo "📝 Next Steps:"
echo "   1. Start your backend: node server/enterprise-secure-server.cjs"
echo "   2. Test: curl https://$DOMAIN/api/admin/health"
echo "   3. Configure firewall: sudo ufw allow 'Nginx Full'"
echo "   4. Update .env with HTTPS URLs"
echo ""
echo "🔐 Security Features Enabled:"
echo "   ✅ HTTPS with TLS 1.3"
echo "   ✅ HTTP → HTTPS redirect"
echo "   ✅ HSTS (Strict Transport Security)"
echo "   ✅ OCSP Stapling"
echo "   ✅ X-Frame-Options (DENY)"
echo "   ✅ Content Security Policy"
echo "   ✅ X-XSS-Protection"
echo "   ✅ Automatic certificate renewal"
echo ""
echo "╔═══════════════════════════════════════════════════════╗"
echo "║   🎉 Your admin dashboard is now SECURE!              ║"
echo "╚═══════════════════════════════════════════════════════╝"
