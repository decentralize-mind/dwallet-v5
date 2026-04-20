# 🚀 Railway Deployment Guide - Production Backend

## 📊 **Why Deploy to Railway?**

### **Current Setup (Cloudflare Tunnel):**
- ✅ Works for development
- ❌ URL changes on restart
- ❌ Requires localhost to stay running
- ❌ Not production-ready

### **Railway Deployment:**
- ✅ Permanent HTTPS URL
- ✅ Connect custom domain (admin.toklo.xyz)
- ✅ Auto-deploy from GitHub
- ✅ 24/7 uptime
- ✅ Managed PostgreSQL
- ✅ Auto-scaling
- ✅ Free tier: $5/month credit

---

## 🎯 **Step-by-Step Deployment**

### **Phase 1: Prepare Backend for Deployment (30 minutes)**

#### **1. Push Backend to GitHub**

```bash
cd /Users/macbookpri/Downloads/dwallet-v5

# Create .gitignore if not exists
cat > .gitignore << 'EOF'
node_modules/
.env
.env.local
*.log
.DS_Store
dist/
build/
backups/
logs/
EOF

# Initialize git (if not already done)
git init

# Add remote (create repo on GitHub first)
git remote add origin https://github.com/YOUR_USERNAME/dwallet-backend.git

# Add and commit
git add .
git commit -m "Initial backend commit - production ready"

# Push to GitHub
git push -u origin main
```

#### **2. Create Private Repository**

1. Go to https://github.com/new
2. Repository name: `dwallet-backend`
3. **Set to Private** ⚠️
4. Don't initialize with README
5. Click "Create repository"

---

### **Phase 2: Deploy on Railway (20 minutes)**

#### **1. Sign Up for Railway**

1. Go to https://railway.app
2. Click "Start a New Project"
3. Login with GitHub
4. Authorize Railway to access your repos

#### **2. Create New Project**

1. Click "+ New Project"
2. Select "Deploy from GitHub repo"
3. Choose `dwallet-backend`
4. Railway will auto-detect Node.js

#### **3. Add PostgreSQL Database**

1. In your Railway project dashboard
2. Click "+ New"
3. Select "Database" → "Add PostgreSQL"
4. Railway creates database automatically
5. Copy the `DATABASE_URL` from variables

#### **4. Configure Environment Variables**

Click on your service → "Variables" tab:

```bash
# Database (from Railway PostgreSQL)
DATABASE_URL=postgresql://postgres:password@db.railway.internal:5432/railway

# Server Configuration
NODE_ENV=production
ADMIN_SERVER_PORT=${PORT}

# Security - Generate these keys:
ADMIN_SECRET_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
REQUEST_SIGNING_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
DB_ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

# Admin Configuration
ADMIN_WALLETS=YOUR_ADMIN_WALLET_ADDRESS
ADMIN_ALLOWED_ORIGINS=https://admin.toklo.xyz,https://your-app.vercel.app

# JWT Configuration
JWT_EXPIRATION_HOURS=8

# Rate Limiting
RATE_LIMIT_GENERAL=100
RATE_LIMIT_AUTH=20
RATE_LIMIT_CRITICAL=10

# Alert Configuration (optional)
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR_WEBHOOK
ALERT_EMAIL=admin@toklo.xyz
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# API Key Rotation
API_KEY_EXPIRY_DAYS=90

# Blockchain (for layer control)
RPC_URL=https://sepolia.base.org
ADMIN_PRIVATE_KEY=0xYOUR_PRIVATE_KEY_66_CHARS

# SSL (Railway handles this automatically)
HTTPS_ENABLED=true
```

**Quick way to generate keys:**
```bash
# Run these in your terminal:
node -e "console.log('ADMIN_SECRET_KEY:', require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('JWT_SECRET:', require('crypto').randomBytes(64).toString('hex'))"
node -e "console.log('REQUEST_SIGNING_SECRET:', require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('DB_ENCRYPTION_KEY:', require('crypto').randomBytes(32).toString('hex'))"
```

#### **5. Deploy!**

1. Railway automatically deploys when you push to GitHub
2. Click "Deploy" button if not automatic
3. Wait for build to complete (~2-3 minutes)
4. Railway gives you a URL like:
   ```
   https://dwallet-backend-production-abc123.up.railway.app
   ```

---

### **Phase 3: Connect Custom Domain (15 minutes)**

#### **1. Add Domain in Railway**

1. Go to your Railway service
2. Click "Settings" tab
3. Scroll to "Domains"
4. Click "Add Domain"
5. Enter: `admin.toklo.xyz`
6. Railway shows DNS configuration

#### **2. Update DNS Records**

Go to your domain registrar (where you bought toklo.xyz):

**Add CNAME Record:**
```
Type: CNAME
Name: admin
Value: your-backend.railway.app
TTL: Auto (or 3600)
```

**Example:**
```
admin.toklo.xyz  →  CNAME  →  dwallet-backend-production-abc123.up.railway.app
```

#### **3. Wait for DNS Propagation**

- DNS takes 5 minutes to 48 hours to propagate
- Usually works within 5-15 minutes
- Check status: https://dnschecker.org

#### **4. Railway Auto-Enables HTTPS**

- Railway automatically provisions SSL certificate
- No need for Certbot!
- Your domain will be: `https://admin.toklo.xyz`

---

### **Phase 4: Update Frontend (5 minutes)**

#### **Update Vercel Environment Variables**

1. Go to https://vercel.com
2. Select your frontend project
3. Go to "Settings" → "Environment Variables"
4. Update `VITE_ADMIN_API_URL`:

```bash
VITE_ADMIN_API_URL=https://admin.toklo.xyz
```

5. Redeploy your frontend on Vercel

#### **OR Update Local .env**

```bash
# In /Users/macbookpri/Downloads/dwallet-v5/.env
VITE_ADMIN_API_URL=https://admin.toklo.xyz
```

---

## ✅ **Post-Deployment Checklist**

### **Test Your Deployment:**

```bash
# 1. Test health endpoint
curl https://admin.toklo.xyz/api/admin/health

# 2. Test API endpoints
curl https://admin.toklo.xyz/api/admin/layers/status

# 3. Check logs in Railway dashboard
```

### **Verify HTTPS:**

1. Open https://admin.toklo.xyz in browser
2. Check for padlock icon 🔒
3. Click padlock → "Certificate is valid"

### **Test Admin Dashboard:**

1. Open your frontend (localhost:5173 or Vercel URL)
2. Try to login to admin dashboard
3. Verify it connects to https://admin.toklo.xyz

---

## 🔧 **Railway Commands Reference**

### **View Logs:**
```bash
railway logs
```

### **Deploy Manually:**
```bash
railway up
```

### **Link to Project:**
```bash
railway link
```

### **Check Status:**
```bash
railway status
```

---

## 💰 **Railway Pricing**

### **Free Tier:**
- $5/month credit
- 500 MB RAM
- 1 GB storage
- Enough for development/testing

### **Hobby Plan:**
- $5/month + usage
- 2 GB RAM
- 5 GB storage
- Good for production

### **Usage Estimates:**
- Backend server: ~$2-3/month
- PostgreSQL: ~$2-3/month
- **Total: ~$5-6/month**

---

## 🚨 **Troubleshooting**

### **Problem: Build fails**
**Solution:**
```bash
# Check Railway build logs
# Common issues:
# - Missing dependencies: Add to package.json
# - Wrong Node version: Add engines to package.json
# - Missing env vars: Check all required variables
```

### **Problem: Database connection error**
**Solution:**
```bash
# Make sure DATABASE_URL is set correctly
# Railway provides this automatically for PostgreSQL plugin
# Format: postgresql://user:pass@host:port/dbname
```

### **Problem: Domain not working**
**Solution:**
```bash
# Check DNS propagation: https://dnschecker.org
# Wait 15-30 minutes after adding DNS record
# Verify CNAME points to Railway URL
```

### **Problem: CORS errors**
**Solution:**
```bash
# Add your frontend URL to ADMIN_ALLOWED_ORIGINS
# Example: https://your-app.vercel.app
```

---

## 📋 **Migration from Tunnel to Railway**

### **What Changes:**
- ❌ Cloudflare tunnel URL → ✅ admin.toklo.xyz
- ❌ Manual restarts → ✅ Auto-deploy from GitHub
- ❌ Local dependencies → ✅ Managed infrastructure
- ❌ Temporary URL → ✅ Permanent domain

### **What Stays the Same:**
- ✅ Same API endpoints
- ✅ Same authentication
- ✅ Same security features
- ✅ Same layer control

### **Migration Steps:**
1. Deploy to Railway
2. Connect admin.toklo.xyz domain
3. Update frontend VITE_ADMIN_API_URL
4. Test everything works
5. Stop Cloudflare tunnel

---

## 🎯 **Next Steps After Deployment**

### **1. Enable Monitoring**
- Railway dashboard → Metrics
- Set up alerts for downtime
- Monitor resource usage

### **2. Setup Backups**
- Railway auto-backs up PostgreSQL
- Enable point-in-time recovery
- Test restore procedures

### **3. Configure CI/CD**
- Auto-deploy on git push
- Run tests before deploy
- Staging environment

### **4. Security Hardening**
- Enable Railway's private networking
- Setup IP whitelisting
- Configure rate limiting
- Enable audit logging

---

## 📞 **Need Help?**

### **Railway Documentation:**
- https://docs.railway.app

### **Common Questions:**
- **How to scale?** Railway auto-scales, or upgrade plan
- **Custom domains?** Unlimited on all plans
- **Database backups?** Automatic daily backups
- **SSL certificates?** Automatic, no setup needed

---

## ✅ **Summary**

### **What You Get:**
- ✅ Permanent HTTPS URL: https://admin.toklo.xyz
- ✅ Auto-deploy from GitHub
- ✅ Managed PostgreSQL database
- ✅ 24/7 uptime
- ✅ Auto-scaling
- ✅ Free SSL certificates
- ✅ Built-in monitoring

### **Time Required:**
- Phase 1 (Prep): 30 minutes
- Phase 2 (Deploy): 20 minutes
- Phase 3 (Domain): 15 minutes
- Phase 4 (Frontend): 5 minutes
- **Total: ~1 hour**

### **Cost:**
- Free tier: $5/month credit
- Production: ~$5-6/month

---

**🚀 Ready to deploy? Start with Phase 1!**
