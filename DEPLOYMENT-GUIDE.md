# 🚀 Complete Deployment Guide for toklo.xyz

## Current Status (Updated: April 30, 2026)

✅ **Supply chain code committed and pushed to GitHub**
⚠️ **Vercel deployment has permission errors (needs fix)**
⚠️ **Backend API not yet deployed to separate service**

---

## 📋 Architecture Overview

```
Frontend (Vercel)                    Backend (Railway/Render)
┌─────────────────────┐              ┌──────────────────────┐
│ www.toklo.xyz       │   ┌─────┐   │ api.toklo.xyz        │
│ - React SPA         │──▶│ API │──▶│ - Express Server     │
│ - Supply Chain UI   │   └─────┘   │ - Port 3001          │
│ - Admin Dashboards  │              │ - /api/* routes      │
└─────────────────────┘              └──────────────────────┘
```

---

## 🔧 Task 1: Fix Vercel Frontend Deployment

### Issue
Permission errors on script files owned by root.

### Solution

**Option A: Fix File Permissions (Recommended)**
```bash
# On your local machine
sudo chown -R $(whoami):staff scripts/*.sh
git add scripts/*.sh
git commit -m "fix: Correct file permissions for deployment scripts"
git push origin main
```

**Option B: Exclude Problematic Files**
Add to `.gitignore`:
```
scripts/daily-security-scan.sh
scripts/monthly-security-report.sh
scripts/weekly-vulnerability-assessment.sh
```

Then push again:
```bash
git add .gitignore
git commit -m "chore: Exclude root-owned scripts from Git"
git push origin main
```

### Verify Deployment
```bash
# Check deployment status
vercel list

# Test the URLs
curl -I https://www.toklo.xyz/supplychain
curl -I https://www.toklo.xyz/admin-supplychain-v2
```

---

## 🔧 Task 2: Deploy Backend API to Railway

### Step 1: Create Railway Account
1. Go to https://railway.app
2. Sign up with GitHub
3. Click "New Project"

### Step 2: Connect Your Repository
1. Click "Deploy from GitHub repo"
2. Select `dwallet-v5` repository
3. Railway will auto-detect `railway.json`

### Step 3: Configure Environment Variables

Add these variables in Railway dashboard:

```bash
NODE_ENV=production
ADMIN_SERVER_PORT=3001

# Database (Railway provides PostgreSQL addon)
DATABASE_URL=<from Railway PostgreSQL addon>

# Security Keys (use existing from .env.production)
ADMIN_SECRET_KEY=eafea3ef955b60bef0ce1a688107622bf5fb4bdf705474d2e5d55eec4d13f8ba
JWT_SECRET=889bbcde1247dac9150fbd03fc33c782ced4e44ec923f1e5042b463ab6b26d3f341e181763474610d5dd00fcf76778db1887638e55c757d6caf1768d5906e6d4
CSRF_SECRET=1882350ba173c7419689b2da25c3797044662de3bc023308c0d03764a9aa0463

# CORS
ADMIN_ALLOWED_ORIGINS=https://toklo.xyz,https://www.toklo.xyz

# Blockchain
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
ADMIN_PRIVATE_KEY=0xca18206e48f9de26624727dbbefc32a44f2fb80eb63b5e177d37fa67a47c508a

# Admin Wallets
ADMIN_WALLETS=0x4C0B7314441dfE8E61267C0d87Fc1A657611dCf5
```

### Step 4: Add PostgreSQL Database
1. In Railway project, click "+ New"
2. Select "Database" → "Add PostgreSQL"
3. Copy the `DATABASE_URL` to environment variables

### Step 5: Deploy
Railway will automatically deploy. You'll get a URL like:
```
https://dwallet-production.up.railway.app
```

### Step 6: Test Backend
```bash
curl https://dwallet-production.up.railway.app/api/admin/health
```

---

## 🔧 Task 3: Configure Vercel to Use Railway Backend

### Option A: Environment Variable in Vercel

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add:
   ```
   VITE_API_BASE_URL=https://dwallet-production.up.railway.app
   ```

3. Update your frontend code to use this variable:
   ```javascript
   // src/config/api.js
   export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
   ```

### Option B: Custom Domain on Railway (Recommended)

1. In Railway, go to Settings → Domains
2. Add custom domain: `api.toklo.xyz`
3. Update DNS records:
   ```
   Type: CNAME
   Name: api
   Value: <railway-provided-url>
   ```

4. Update CORS in backend `.env`:
   ```
   ADMIN_ALLOWED_ORIGINS=https://toklo.xyz,https://www.toklo.xyz,https://api.toklo.xyz
   ```

---

## 📊 Deployment Checklist

### Frontend (Vercel)
- [ ] Fix file permission issues
- [ ] Push to GitHub
- [ ] Verify deployment succeeded
- [ ] Test routes:
  - [ ] https://www.toklo.xyz/
  - [ ] https://www.toklo.xyz/supplychain
  - [ ] https://www.toklo.xyz/admin-supplychain-v2
  - [ ] https://www.toklo.xyz/admin

### Backend (Railway)
- [ ] Create Railway account
- [ ] Connect GitHub repo
- [ ] Add PostgreSQL addon
- [ ] Configure environment variables
- [ ] Deploy successfully
- [ ] Test health endpoint
- [ ] Test API endpoints:
  - [ ] /api/admin/health
  - [ ] /api/supply-chain/stats
  - [ ] /api/supply-chain/auth

### Integration
- [ ] Configure CORS on backend
- [ ] Set API URL in frontend
- [ ] Test frontend → backend communication
- [ ] Verify supply chain dashboard loads data
- [ ] Test admin dashboard functionality

### SSL & Domains
- [ ] www.toklo.xyz → Vercel (handled by Vercel)
- [ ] api.toklo.xyz → Railway (if using custom domain)
- [ ] Both have HTTPS enabled

---

## 🚀 Quick Deploy Commands

### For Frontend (after fixing permissions):
```bash
# Fix permissions
sudo chown -R $(whoami):staff scripts/*.sh

# Commit and push
git add .
git commit -m "fix: Deployment permissions and configurations"
git push origin main

# Check deployment
vercel list
```

### For Backend (Railway CLI):
```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Deploy
railway up
```

---

## 🔍 Troubleshooting

### Vercel Build Fails
```bash
# Check build logs
vercel inspect <deployment-url>

# Common issues:
# 1. File permissions → Fix with chown
# 2. Missing dependencies → Check package.json
# 3. Build errors → Check vercel.json config
```

### Backend Won't Start
```bash
# Check Railway logs
railway logs

# Common issues:
# 1. Missing DATABASE_URL → Add PostgreSQL addon
# 2. Port conflict → Use process.env.PORT
# 3. Missing env vars → Check Railway dashboard
```

### CORS Errors
```
Update ADMIN_ALLOWED_ORIGINS in backend .env:
ADMIN_ALLOWED_ORIGINS=https://toklo.xyz,https://www.toklo.xyz,<your-railway-url>
```

---

## 📞 Support

If you need help:
1. Check Railway docs: https://docs.railway.app
2. Check Vercel docs: https://vercel.com/docs
3. Review logs in both platforms
4. Test endpoints with curl or Postman

---

## ✅ Success Criteria

When everything is deployed correctly:

1. ✅ Visit https://www.toklo.xyz/supplychain → Landing page loads
2. ✅ Visit https://www.toklo.xyz/admin-supplychain-v2 → Admin dashboard loads
3. ✅ Connect MetaMask → Can authenticate
4. ✅ Dashboard shows data from backend API
5. ✅ All API calls return 200 OK
6. ✅ HTTPS enabled on all domains

---

**Next Steps:**
1. Fix Vercel deployment (file permissions)
2. Deploy backend to Railway
3. Connect frontend to backend
4. Test all functionality
