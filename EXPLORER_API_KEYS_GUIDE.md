# 🔗 Block Explorer API Keys Setup Guide

This guide shows you how to get free API keys for all supported blockchain explorers.

## Currently Supported Networks

| Network | Explorer | API Link | Status |
|---------|----------|----------|--------|
| **Ethereum** | Etherscan | https://etherscan.io/myapikey | ✅ Have key |
| **Polygon** | Polygonscan | https://polygonscan.com/myapikey | ✅ Have key |
| **BNB Chain** | BSCScan | https://bscscan.com/myapikey | ✅ Have key |
| **Arbitrum** | Arbiscan | https://arbiscan.io/myapikey | 🔧 NEW |
| **Optimism** | Optimistic Etherscan | https://optimistic.etherscan.io/myapikey | 🔧 NEW |
| **Avalanche** | Snowtrace | https://snowtrace.io/myapikey | 🔧 NEW |
| **Base** | BaseScan | https://basescan.org/myapikey | 🔧 NEW |

---

## How to Get API Keys (All Free!)

### 1. Arbitrum (Arbiscan)
1. Go to: https://arbiscan.io/myapikey
2. Click "Add" to create a new API key
3. Name it (e.g., "dWallet App")
4. Copy the API key
5. Add to `.env.local`: `VITE_ARBISCAN_KEY=your_key_here`

### 2. Optimism (Optimistic Etherscan)
1. Go to: https://optimistic.etherscan.io/myapikey
2. Click "Add" to create a new API key
3. Name it (e.g., "dWallet App")
4. Copy the API key
5. Add to `.env.local`: `VITE_OPTIMISM_ETHERSCAN_KEY=your_key_here`

### 3. Avalanche (Snowtrace)
1. Go to: https://snowtrace.io/myapikey
2. Click "Add" to create a new API key
3. Name it (e.g., "dWallet App")
4. Copy the API key
5. Add to `.env.local`: `VITE_SNOWTRACE_KEY=your_key_here`

### 4. Base (BaseScan)
1. Go to: https://basescan.org/myapikey
2. Click "Add" to create a new API key
3. Name it (e.g., "dWallet App")
4. Copy the API key
5. Add to `.env.local`: `VITE_BASESCAN_KEY=your_key_here`

---

## Your Current API Keys

✅ **Already configured:**
- Etherscan: `7VK358NXZP1ZQS8WWZMK5S25DIMY8Z3SDS`
- Polygonscan: `I79PG7N3FARNRZWQ8NHYPDACPY1RSJ88BZ`
- BSCScan: `SFA1KSFTIZ5UVQKTV86QC4DH4IWWUBHSCK`

---

## After Getting All Keys

### For Local Development
Add all keys to `.env.local`:
```bash
VITE_ARBISCAN_KEY=your_arbiscan_key
VITE_OPTIMISM_ETHERSCAN_KEY=your_optimism_key
VITE_SNOWTRACE_KEY=your_snowtrace_key
VITE_BASESCAN_KEY=your_basescan_key
```

Then restart your dev server: `npm run dev`

### For Vercel Deployment
Add all keys to Vercel:
1. Go to https://vercel.com
2. Select your **dwallet** project
3. Settings → Environment Variables
4. Add each variable for all environments (Development, Preview, Production)

---

## API Rate Limits (Free Tier)

All explorers offer generous free tiers:
- **Etherscan**: 5 calls/second, 100k calls/day
- **Polygonscan**: 5 calls/second, 100k calls/day
- **BSCScan**: 5 calls/second, 100k calls/day
- **Arbiscan**: 5 calls/second, 100k calls/day
- **Optimism**: 5 calls/second, 100k calls/day
- **Snowtrace**: 5 calls/second, 100k calls/day
- **BaseScan**: 5 calls/second, 100k calls/day

This is more than enough for a wallet app!

---

## Need More Networks?

Other popular networks you can add:
- **Fantom** (FTMScan): https://ftmscan.com/myapikey
- **Cronos** (Cronoscan): https://cronoscan.com/myapikey
- **Moonbeam** (Moonscan): https://moonscan.io/myapikey
- **Gnosis** (Gnosisscan): https://gnosisscan.io/myapikey

All use the same Etherscan-compatible API format!
