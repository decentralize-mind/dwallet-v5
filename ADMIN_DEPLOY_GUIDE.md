# Admin Server Deployment Guide

## Quick Deploy to Railway

### Step 1: Login to Railway

```bash
railway login
```

This will open your browser. Login with your GitHub account.

### Step 2: Deploy Admin Server

```bash
npm run deploy:admin
```

The script will:
1. ✅ Check Railway CLI is installed
2. ✅ Verify you're logged in
3. ✅ Create a new Railway project
4. ✅ Ask for your PostgreSQL DATABASE_URL
5. ✅ Auto-generate security secrets
6. ✅ Set all environment variables
7. ✅ Deploy to Railway
8. ✅ Give you the public URL

### Step 3: Get Your Public URL

After deployment completes:

```bash
railway open
```

Or check status:

```bash
railway status
```

Copy the public URL (e.g., `https://toklo-admin-server.up.railway.app`)

### Step 4: Update Frontend

Edit `.env` and update:

```bash
VITE_ADMIN_API_URL=https://YOUR-RAILWAY-URL.up.railway.app
```

### Step 5: Restart Frontend

```bash
# Stop frontend (Ctrl+C)
# Then restart
npm run dev
```

### Step 6: Test

1. Create a wallet on http://localhost:5173
2. Check admin dashboard
3. User should appear!

---

## Alternative: Manual Deployment

If you prefer to do it manually:

### 1. Create Railway Project
```bash
railway init
# Name it: toklo-admin-server
```

### 2. Add PostgreSQL Database
```bash
railway add postgresql
```

This will automatically set `DATABASE_URL` for you!

### 3. Set Environment Variables
```bash
railway variables set JWT_SECRET="your-secret-here"
railway variables set CSRF_SECRET="your-secret-here"
railway variables set NODE_ENV="production"
railway variables set ADMIN_ALLOWED_ORIGINS="https://www.toklo.xyz,http://localhost:5173"
```

### 4. Deploy
```bash
railway up
```

### 5. Get URL
```bash
railway domain
```

---

## Troubleshooting

### Deployment fails
```bash
railway logs
```

### Check status
```bash
railway status
```

### Open dashboard
```bash
railway open
```

### Redeploy after changes
```bash
railway up
```

---

## Costs

- **Railway Free Tier**: $5/month credit (enough for small projects)
- **PostgreSQL**: Free tier available
- **Estimated cost**: $0-5/month for your usage

---

## Next Steps After Deployment

1. ✅ Admin server deployed to public URL
2. ✅ Update frontend `.env` with public URL
3. ✅ Deploy frontend to Vercel
4. ✅ Upload to IPFS
5. ✅ Configure custom domain (www.toklo.xyz)
