# Deployment Guide - Vercel + IPFS

## Overview
This guide covers deploying the updated Toklo wallet to:
1. **Vercel** - For fast, reliable hosting (www.toklo.xyz)
2. **IPFS** - For decentralized hosting

## Prerequisites
- ✅ Code is updated with user registration feature
- ✅ Admin server running on a public URL (not localhost)
- ✅ Vercel account (free tier is fine)
- ✅ IPFS Pinata account (free tier is fine)

---

## Part 1: Deploy to Vercel

### Step 1: Install Vercel CLI
```bash
npm install -g vercel
```

### Step 2: Login to Vercel
```bash
vercel login
```

### Step 3: Build the Project
```bash
npm run build
```

### Step 4: Deploy to Vercel
```bash
vercel --prod
```

### Step 5: Configure Custom Domain
```bash
vercel domains add toklo.xyz
vercel domains add www.toklo.xyz
```

Then point your DNS to Vercel:
- Go to your domain registrar (GoDaddy, Namecheap, etc.)
- Update nameservers to Vercel's nameservers
- Or add CNAME record pointing to your Vercel deployment

### Step 6: Set Environment Variables in Vercel
```bash
vercel env add VITE_ADMIN_API_URL
# Enter your production admin server URL (not localhost!)
```

---

## Part 2: Deploy to IPFS

### Step 1: Install IPFS Pinata CLI
```bash
npm install -g @pinata/sdk
```

### Step 2: Get Pinata API Keys
1. Go to https://app.pinata.cloud
2. Sign up/login
3. Go to API Keys section
4. Create a new API key
5. Save the API Key and Secret

### Step 3: Create Deployment Script

I'll create a script for you to automate this.

### Step 4: Run IPFS Deployment
```bash
npm run deploy:ipfs
```

---

## Part 3: Update Admin Server for Production

### Critical: The admin server must be accessible publicly

Currently your `.env` has:
```
VITE_ADMIN_API_URL=http://localhost:3001
```

For production, you need to:
1. Deploy the admin server to a cloud provider (Heroku, Railway, AWS, etc.)
2. Update `.env` with the public URL:
```
VITE_ADMIN_API_URL=https://your-admin-server.com
```

### Deploy Admin Server Options:

#### Option A: Railway (Easiest)
```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Deploy
cd server
railway init
railway up
```

#### Option B: Heroku
```bash
# Install Heroku CLI
# Login
heroku login

# Deploy
cd server
heroku create toklo-admin-server
git push heroku main
```

#### Option C: Keep on your server with ngrok (for testing)
```bash
# Start your admin server
node server/admin-server.js

# In another terminal, expose it
ngrok http 3001
```

Then update `.env` with the ngrok URL.

---

## Part 4: Automated Deployment Scripts

### Build and Deploy to Vercel
```bash
npm run deploy:vercel
```

### Build and Deploy to IPFS
```bash
npm run deploy:ipfs
```

### Full Deployment (Both)
```bash
npm run deploy:all
```

---

## Part 5: Post-Deployment Checklist

- [ ] Frontend deployed to Vercel
- [ ] Frontend pinned to IPFS
- [ ] Admin server deployed to public URL
- [ ] `.env` updated with production admin URL
- [ ] Custom domain (www.toklo.xyz) configured
- [ ] SSL certificate active (Vercel provides this automatically)
- [ ] Test wallet creation on production
- [ ] Verify users appear in admin dashboard
- [ ] Test IPFS gateway access

---

## Troubleshooting

### Users not registering on production
1. Check browser console for errors
2. Verify `VITE_ADMIN_API_URL` is correct
3. Check admin server logs
4. Ensure CORS is configured for your domain

### IPFS not working
1. Make sure files are pinned (not just uploaded)
2. Use a gateway like `https://gateway.pinata.cloud/ipfs/YOUR_CID`
3. Consider using Cloudflare IPFS gateway for better performance

### Vercel build fails
1. Check build logs in Vercel dashboard
2. Ensure all dependencies are in package.json
3. Try building locally first: `npm run build`

---

## Current Status

✅ Localhost development working
✅ User registration working locally
❌ Production (www.toklo.xyz) needs deployment
❌ Admin server needs public deployment

---

## Next Steps

1. Deploy admin server to public URL
2. Update `.env.production` with admin URL
3. Build frontend
4. Deploy to Vercel
5. Upload to IPFS
6. Test on production
