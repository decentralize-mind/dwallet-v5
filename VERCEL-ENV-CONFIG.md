# 🎯 VERCEL ENVIRONMENT VARIABLES CONFIGURATION

## Required Variables for Vercel Deployment

Set these in Vercel Dashboard → Project Settings → Environment Variables

### Production Environment

```bash
# Backend API URL (Update after deploying backend to Railway)
VITE_ADMIN_API_URL=https://dwallet-production.up.railway.app

# Blockchain RPC URLs
VITE_BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
VITE_BASE_MAINNET_RPC_URL=https://mainnet.base.org

# Optional: Analytics & Monitoring
VITE_ANALYTICS_ENABLED=true
```

### How to Add Environment Variables in Vercel

1. Go to https://vercel.com/dashboard
2. Select your `dwallet` project
3. Click "Settings" → "Environment Variables"
4. Add each variable for "Production" environment
5. Click "Save"
6. Redeploy for changes to take effect

### After Backend Deployment

Once you deploy your backend to Railway (or another service):

1. Get your Railway URL (e.g., `https://dwallet-production.up.railway.app`)
2. Update `VITE_ADMIN_API_URL` in Vercel
3. Trigger a new deployment in Vercel

---

## Backend Environment Variables (For Railway)

These go in your Railway project's environment variables:

```bash
NODE_ENV=production
ADMIN_SERVER_PORT=3001

# Database (from Railway PostgreSQL addon)
DATABASE_URL=postgresql://...

# Security
ADMIN_SECRET_KEY=eafea3ef955b60bef0ce1a688107622bf5fb4bdf705474d2e5d55eec4d13f8ba
JWT_SECRET=889bbcde1247dac9150fbd03fc33c782ced4e44ec923f1e5042b463ab6b26d3f341e181763474610d5dd00fcf76778db1887638e55c757d6caf1768d5906e6d4
CSRF_SECRET=1882350ba173c7419689b2da25c3797044662de3bc023308c0d03764a9aa0463

# CORS - IMPORTANT: Add your Vercel URL
ADMIN_ALLOWED_ORIGINS=https://toklo.xyz,https://www.toklo.xyz,<your-vercel-url>

# Blockchain
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
ADMIN_PRIVATE_KEY=0xca18206e48f9de26624727dbbefc32a44f2fb80eb63b5e177d37fa67a47c508a
ADMIN_WALLETS=0x4C0B7314441dfE8E61267C0d87Fc1A657611dCf5
```
