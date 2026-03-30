# dWallet v4 — Run & Deploy Guide

## Step 1 — Install dependencies

```bash
cd dwallet-v4
npm install
```

## Step 2 — Add your API keys

```bash
cp .env.local.example .env.local
```

Then open `.env.local` and fill in:

```env
VITE_INFURA_KEY=your_infura_key_here
VITE_WALLETCONNECT_PROJECT_ID=your_wc_project_id_here
```

Get them free:

- Infura key → https://infura.io (New Project → Ethereum → copy Project ID)
- WalletConnect ID → https://cloud.walletconnect.com (New Project → copy Project ID)

Both are optional — the wallet works without them (mock mode).

## Step 3 — Run locally

```bash
npm run dev
```

Open → http://localhost:5173

## Step 4 — Deploy to Vercel

### Option A: CLI (fastest)

```bash
npm install -g vercel
vercel
```

Follow the prompts → it detects Vite automatically → deploys in ~60 seconds.

When asked "Want to override the settings?" → No

### Option B: GitHub + Vercel Dashboard

```bash
git init
git add .
git commit -m "dWallet v4"
gh repo create dwallet --public --push --source=.
```

Then go to vercel.com → New Project → import dwallet repo → Deploy

## Step 5 — Add env vars on Vercel

After deploying, go to:
Vercel Dashboard → dwallet project → Settings → Environment Variables

Add:
| Name | Value |
|------|-------|
| VITE_INFURA_KEY | your_infura_key |
| VITE_WALLETCONNECT_PROJECT_ID | your_wc_project_id |

Then → Deployments → Redeploy (to pick up the new env vars)

## That's it!

Your wallet will be live at:
https://dwallet.vercel.app (or whatever Vercel assigns)
