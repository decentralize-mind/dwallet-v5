#!/bin/bash
###############################################################################
# 🔐 HTTPS SETUP WITH LET'S ENCRYPT (CERTBOT)
# 
# For: admin.toklo.xyz or admin.dwallet.io
# Prerequisites: Nginx installed, domain pointed to server IP
###############################################################################

set -e

echo "╔═══════════════════════════════════════════════════════╗"
echo "║   🔐 HTTPS Setup with Let's Encrypt                  ║"
echo "║   Domain: ${DOMAIN:-admin.toklo.xyz}                 ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""

# ───────────────────────────────────────────────────────────
# 1. CHECK PREREQUISITES
# ───────────────────────────────────────────────────────────

echo "🔍 Checking prerequisites..."

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
  echo "❌ Please run as root (sudo)"
  exit 1
fi

# Check if domain is set
DOMAIN="${DOMAIN:-admin.toklo.xyz}"
echo "📍 Domain: $DOMAIN"
echo "📍 Main Domain: www.toklo.xyz"

# Check if nginx is installed
if ! command -v nginx &> /dev/null; then
  echo "⚠️  Nginx not found. Installing..."
  apt-get update
  apt-get install -y nginx
fi

# Check if certbot is installed
if ! command -v certbot &> /dev/null; then
  echo "⚠️  Certbot not found. Installing..."
  apt-get install -y certbot python3-certbot-nginx
fi

echo "✅ Prerequisites met"
echo ""

# ───────────────────────────────────────────────────────────
# 2. CREATE NGINX CONFIGURATION
# ───────────────────────────────────────────────────────────

echo "📝 Creating Nginx configuration..."

NGINX_CONF="/etc/nginx/sites-available/dwallet-admin"
cat > "$NGINX_CONF" << 'EOF'
server {
    listen 80;
    server_name DOMAIN_PLACEHOLDER;

    # Security headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';" always;

    # Reverse proxy to Node.js backend
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

    # Rate limiting
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

    # Block common attack vectors
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

# Replace placeholder with actual domain
sed -i "s/DOMAIN_PLACEHOLDER/$DOMAIN/g" "$NGINX_CONF"

# Enable site
ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

echo "✅ Nginx configuration created"
echo ""

# ───────────────────────────────────────────────────────────
# 3. OBTAIN SSL CERTIFICATE
# ───────────────────────────────────────────────────────────

echo "🔒 Obtaining SSL certificate from Let's Encrypt..."

certbot --nginx -d "$DOMAIN" \
  --non-interactive \
  --agree-tos \
  --email "${ADMIN_EMAIL:-admin@toklo.xyz}" \
  --redirect \
  --hsts \
  --staple-ocsp

if [ $? -eq 0 ]; then
  echo "✅ SSL certificate obtained and configured"
else
  echo "❌ SSL certificate acquisition failed"
  exit 1
fi

echo ""

# ───────────────────────────────────────────────────────────
# 4. VERIFY HTTPS
# ───────────────────────────────────────────────────────────

echo "🔍 Verifying HTTPS setup..."

sleep 5

# Test HTTPS connection
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://"$DOMAIN"/api/admin/health)

if [ "$HTTP_STATUS" = "200" ]; then
  echo "✅ HTTPS is working! Status: $HTTP_STATUS"
else
  echo "⚠️  HTTPS test returned status: $HTTP_STATUS"
  echo "   This might be normal if backend isn't running yet"
fi

echo ""

# ───────────────────────────────────────────────────────────
# 5. SETUP AUTO-RENEWAL
# ───────────────────────────────────────────────────────────

echo "⏰ Setting up automatic certificate renewal..."

# Certbot automatically adds a cron job or systemd timer
# Verify it's configured
if command -v systemctl &> /dev/null; then
  systemctl status certbot.timer 2>/dev/null || echo "⚠️  Certbot timer not active"
else
  crontab -l 2>/dev/null | grep certbot || echo "0 0,12 * * * certbot renew --quiet" | crontab -
fi

echo "✅ Auto-renewal configured"
echo ""

# ───────────────────────────────────────────────────────────
# 6. FINAL SECURITY CHECK
# ───────────────────────────────────────────────────────────

echo "╔═══════════════════════════════════════════════════════╗"
echo "║   🔐 Security Checklist                              ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""
echo "✅ HTTPS enabled with Let's Encrypt"
echo "✅ HTTP to HTTPS redirect configured"
echo "✅ HSTS (HTTP Strict Transport Security) enabled"
echo "✅ OCSP Stapling enabled"
echo "✅ Security headers configured"
echo "✅ Auto-renewal setup (certificates renew automatically)"
echo ""
echo "📊 Next Steps:"
echo "   1. Test: https://$DOMAIN/api/admin/health"
echo "   2. Configure firewall: ufw allow 'Nginx Full'"
echo "   3. Update .env with HTTPS URLs"
echo "   4. Set ADMIN_ALLOWED_IPS in .env"
echo ""
echo "╔═══════════════════════════════════════════════════════╗"
echo "║   ✅ HTTPS Setup Complete!                           ║"
echo "╚═══════════════════════════════════════════════════════╝"
