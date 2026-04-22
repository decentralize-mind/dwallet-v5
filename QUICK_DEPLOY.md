# 🚀 Quick Deploy to Vercel + IPFS

## Step-by-Step Instructions

### Before You Start

You need:
1. ✅ Updated code (already done!)
2. ✅ Admin server running on a PUBLIC URL (not localhost)
3. ⚠️ Pinata account for IPFS (free at https://app.pinata.cloud)

---

## Step 1: Deploy Admin Server to Public URL

**Choose one option:**

### Option A: Use ngrok (Quick Testing)
```bash
# Terminal 1: Start admin server
node server/admin-server.js

# Terminal 2: Expose to internet
ngrok http 3001
```
Copy the ngrok URL (e.g., `https://abc123.ngrok-free.app`)

### Option B: Deploy to Railway (Recommended for Production)
```bash
npm i -g @railway/cli
railway login
cd server
railway init
railway up
```

---

## Step 2: Update Environment Variables

Edit `.env` and update:
```bash
VITE_ADMIN_API_URL=https://YOUR_PUBLIC_ADMIN_URL
```

Replace `YOUR_PUBLIC_ADMIN_URL` with your ngrok URL or Railway URL.

---

## Step 3: Build the Project

```bash
npm run build
```

---

## Step 4: Deploy to Vercel

```bash
# Install Vercel CLI (first time only)
npm install -g vercel

# Login to Vercel
vercel login

# Deploy
npm run deploy:vercel
```

Follow the prompts. After deployment:
```bash
# Add your custom domain
vercel domains add www.toklo.xyz
```

---

## Step 5: Deploy to IPFS

### Get Pinata JWT Token:
1. Go to https://app.pinata.cloud
2. Sign up/login
3. Go to API Keys
4. Create a new key
5. Copy the JWT token

### Add to .env:
```bash
PINATA_JWT=your_jwt_token_here
```

### Deploy:
```bash
# Install Pinata SDK
npm install @pinata/sdk

# Deploy
npm run deploy:ipfs
```

You'll get an IPFS hash like: `QmX7...`

Access via: `https://gateway.pinata.cloud/ipfs/QmX7...`

---

## Step 6: Test Everything

1. **Visit your Vercel URL** (e.g., `https://toklo-xyz.vercel.app`)
2. **Create a wallet**
3. **Check admin dashboard** - user should appear!
4. **Visit IPFS URL** - should work the same

---

## Step 7: Point Your Domain

### For Vercel:
1. Go to your domain registrar
2. Update DNS to Vercel nameservers
3. Or add CNAME: `www.toklo.xyz` → `cname.vercel-dns.com`

### For IPFS (Optional):
1. Use IPNS or ENS for persistent addressing
2. Or use Cloudflare IPFS gateway with custom domain

---

## Troubleshooting

### Users not registering?
- Check `VITE_ADMIN_API_URL` is correct
- Open browser console for errors
- Check admin server logs

### Build fails?
```bash
npm install
npm run build
```

### Vercel deployment fails?
```bash
vercel --debug
```

---

## Current Status

✅ Localhost working
✅ User registration working locally
⏳ Need to deploy admin server publicly
⏳ Need to deploy frontend to Vercel
⏳ Need to upload to IPFS

---

## Quick Commands

```bash
# Build
npm run build

# Deploy to Vercel
npm run deploy:vercel

# Deploy to IPFS
npm run deploy:ipfs

# Deploy to both
npm run deploy:all
```

---

## Need Help?

Check the full guide: `DEPLOYMENT_GUIDE.md`
