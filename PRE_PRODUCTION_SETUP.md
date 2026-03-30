# Pre-Production Deployment Guide

## Overview

This guide explains how to set up and use the pre-production environment for dWallet. The pre-production environment allows you to test all features on **Sepolia testnet** before deploying to production, ensuring no real value is at risk.

---

## Environment Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Development   │────▶│  Pre-Production  │────▶│   Production    │
│   (localhost)   │     │  (Sepolia Test)  │     │  (Mainnet)      │
└─────────────────┘     └──────────────────┘     └─────────────────┘
       ↓                        ↓                        ↓
   .env.local           .env.preproduction        .env.production
   Local testing        Staging/Testnet           Live/Mainnet
```

---

## Setup Instructions

### 1. Create Pre-Production Environment File

The `.env.preproduction` file is already created. Update it with your testnet credentials:

```bash
# Copy and edit the pre-production template
cp .env.preproduction .env.preproduction.local
```

### 2. Configure Sepolia Testnet Variables

Edit `.env.preproduction` and fill in:

```env
# Get free Sepolia RPC from Infura
VITE_INFURA_KEY=your_infura_project_id

# WalletConnect (same as production)
VITE_WALLETCONNECT_PROJECT_ID=your_walletconnect_id

# Etherscan API (free at etherscan.io/apis)
VITE_ETHERSCAN_KEY=your_etherscan_api_key

# IMPORTANT: Use ONLY Sepolia testnet private key
DEPLOYER_PRIVATE_KEY=YOUR_SEPOLIA_TEST_PRIVATE_KEY

# Environment flags (already set)
VITE_ENVIRONMENT=preproduction
VITE_NETWORK=sepolia
```

### 3. Get Sepolia Test ETH

Before testing, get test tokens:

1. **Sepolia ETH**: https://sepoliafaucet.com/
2. **Test DWT Tokens**: Will be minted during contract deployment

---

## Deployment Process

### Quick Deploy (Recommended)

```bash
# Make script executable (first time only)
chmod +x deploy-preproduction.sh

# Run deployment
./deploy-preproduction.sh
```

### Manual Deploy

```bash
# Step 1: Build for pre-production
node scripts/deploy-preproduction.js

# Step 2: Deploy to Vercel
vercel --prod --prebuilt
```

### Alternative: Direct Vercel CLI

```bash
# Set environment and deploy
VITE_ENVIRONMENT=preproduction VITE_NETWORK=sepolia vercel --prod
```

---

## Vercel Project Setup

### Option 1: Single Project with Preview Branches

Deploy pre-production as a separate branch:

```bash
# Create pre-production branch
git checkout -b pre-production

# Push to GitHub
git push origin pre-production

# In Vercel dashboard:
# 1. Import project from pre-production branch
# 2. Set environment variables
# 3. Deploy
```

### Option 2: Separate Vercel Projects

Create two Vercel projects:
1. **dWallet Pre-Production** → Connects to `pre-production` branch
2. **dWallet Production** → Connects to `main` branch

---

## Testing Checklist

After deploying to pre-production:

### ✅ Smart Contract Tests
- [ ] Deploy contracts to Sepolia
- [ ] Verify contract addresses are correct
- [ ] Test token minting/transfers
- [ ] Test staking mechanisms
- [ ] Test fee routing

### ✅ Frontend Tests
- [ ] Wallet connects properly
- [ ] Balance displays correctly
- [ ] Transactions submit to Sepolia
- [ ] NFT gallery loads (if applicable)
- [ ] All UI elements functional

### ✅ Integration Tests
- [ ] WalletConnect sessions work
- [ ] External dApp connections function
- [ ] Error handling works correctly
- [ ] Loading states display properly

### ✅ Security Tests
- [ ] No mainnet transactions possible
- [ ] Private keys not exposed
- [ ] CORS and security headers active
- [ ] Rate limiting works

---

## Environment Indicators

The app now shows which environment it's running in:

### Console Messages
```javascript
// Pre-production warning
⚠️ PREPRODUCTION MODE - Connected to SEPOLIA testnet.
No real value should be at risk.

// Production confirmation
🔒 PRODUCTION MODE - All transactions are real and irreversible.
```

### Visual Indicators (Optional)

Add a banner component that shows:
- **Pre-Production**: Yellow/orange banner
- **Production**: Green banner or no banner

---

## Promoting to Production

Once pre-production testing is complete:

### 1. Update Production Configuration

```bash
# Edit .env.production.template with mainnet values
# NEVER commit this file!
```

### 2. Deploy to Production

```bash
# In Vercel dashboard for production project:
# 1. Go to Settings → Environment Variables
# 2. Add all production variables
# 3. Redeploy

# Or via CLI
vercel --prod
```

### 3. Verify Production

- Check all contract addresses point to mainnet
- Verify explorer links to etherscan.io
- Confirm MoonPay is in live mode
- Test with small amounts first

---

## Environment Variables Comparison

| Variable | Pre-Production | Production |
|----------|---------------|------------|
| Network | Sepolia | Ethereum Mainnet |
| RPC URL | sepolia.infura.io | mainnet.infura.io |
| Explorer | sepolia.etherscan.io | etherscan.io |
| MoonPay | Test Mode (`pk_test_*`) | Live Mode (`pk_live_*`) |
| Private Key | Test account only | Secure production key |
| Risk Level | **NO REAL VALUE** | **REAL VALUE AT RISK** |

---

## Troubleshooting

### Build Fails
```bash
# Clear cache and rebuild
rm -rf node_modules dist
npm install
npm run build
```

### Wrong Network Detected
```bash
# Verify .env.preproduction has correct values
cat .env.preproduction | grep NETWORK
# Should show: VITE_NETWORK=sepolia
```

### Vercel Deployment Issues
```bash
# Check Vercel CLI version
vercel --version

# Login to Vercel
vercel login

# View deployment logs
vercel ls
```

---

## Best Practices

### 🔒 Security
1. **NEVER** commit `.env.production` to Git
2. **ALWAYS** use separate private keys for testnet/mainnet
3. Enable Vercel's **Environment Variables** protection
4. Use Vercel's **Preview Deployments** for PR testing

### 🧪 Testing Workflow
1. Develop on `localhost` (development)
2. Test on `pre-production` (Sepolia)
3. Deploy to `production` (Mainnet)

### 📊 Monitoring
- Monitor pre-production deployments in Vercel dashboard
- Set up alerts for failed deployments
- Review deployment URLs before sharing

---

## Quick Reference Commands

```bash
# Setup pre-production
cp .env.preproduction .env.local

# Build and deploy
./deploy-preproduction.sh

# Check current environment
grep "VITE_ENVIRONMENT" .env.local

# Switch back to development
cp .env.example .env.local

# View deployment history
vercel ls
```

---

## Support

If you encounter issues:
1. Check console for environment warnings
2. Verify all environment variables are set
3. Ensure you're using Sepolia testnet (not mainnet)
4. Review Vercel deployment logs

---

**Remember**: Pre-production is your safety net. Always test thoroughly here before touching production! 🛡️
