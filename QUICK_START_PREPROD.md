# 🚀 Quick Start: Pre-Production Deployment

## 3-Step Setup

### Step 1: Configure Pre-Production (5 minutes)

```bash
# Open and edit .env.preproduction
nano .env.preproduction
```

**Required values:**
- `DEPLOYER_PRIVATE_KEY` - Your Sepolia testnet private key
- `VITE_INFURA_KEY` - Your Infura project ID (works for both testnet & mainnet)
- `VITE_ETHERSCAN_KEY` - Etherscan API key (free at etherscan.io/apis)

### Step 2: Get Test ETH (2 minutes)

Visit https://sepoliafaucet.com/ and get test ETH for your deployer address.

### Step 3: Deploy! (3 minutes)

```bash
# Option A: Use the automated script (Recommended)
./deploy-preproduction.sh

# Option B: Use npm script
npm run deploy:preproduction

# Option C: Manual deployment
node scripts/deploy-preproduction.js
vercel --prod --prebuilt
```

---

## That's It! 🎉

Your pre-production environment is now live on Vercel, running on Sepolia testnet.

### What Happens Next?

1. **Build**: The script builds your app with testnet configuration
2. **Deploy**: Deploys to Vercel with pre-production settings
3. **Test**: You can now test all features safely on testnet

---

## Verify Deployment

After deployment, you should see:
- ✅ Orange banner at top showing "PRE-PRODUCTION MODE"
- ✅ Console warning: "⚠️ PREPRODUCTION MODE - Connected to SEPOLIA testnet"
- ✅ All transactions go to Sepolia testnet
- ✅ Explorer links point to sepolia.etherscan.io

---

## Testing Checklist

Before promoting to production:

```markdown
- [ ] Wallet connects successfully
- [ ] Can view balance (test ETH)
- [ ] Can send transactions (testnet)
- [ ] Smart contracts deployed correctly
- [ ] All UI features work
- [ ] No console errors
- [ ] WalletConnect works (if needed)
```

---

## Promote to Production

Once testing is complete:

1. Set up `.env.production.template` with mainnet values
2. In Vercel dashboard, add production environment variables
3. Deploy to production branch/project
4. Test with small amounts first!

---

## Need Help?

- Full documentation: See `PRE_PRODUCTION_SETUP.md`
- Environment config: See `src/config/environment.js`
- Troubleshooting: Check Section 9 in `PRE_PRODUCTION_SETUP.md`

---

**⚠️ REMEMBER**: Pre-production = Sepolia testnet = NO REAL VALUE AT RISK! 🛡️
