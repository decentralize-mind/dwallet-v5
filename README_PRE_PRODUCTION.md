# 🛡️ Pre-Production Environment - Your Safety Net

## 🎯 Purpose

This pre-production setup allows you to **test everything safely** on Sepolia testnet before deploying to production, ensuring **zero risk** to real funds.

---

## ⚡ Quick Start (3 Steps)

### 1️⃣ Configure (2 min)
```bash
nano .env.preproduction
```
Add your Sepolia testnet private key:
```env
DEPLOYER_PRIVATE_KEY=your_sepolia_key_here
```

### 2️⃣ Get Test ETH (3 min)
Visit https://sepoliafaucet.com/ and request test tokens.

### 3️⃣ Deploy (5 min)
```bash
./deploy-preproduction.sh
vercel --prod --prebuilt
```

**Done!** ✅ Your app is now live on testnet for testing.

---

## 🔍 How to Verify It Works

After deployment, look for:

### Visual Indicators
- 🟠 **Orange banner** at top: "PRE-PRODUCTION MODE"
- Browser console shows: `⚠️ PREPRODUCTION MODE - Connected to SEPOLIA testnet`
- Explorer links point to: `sepolia.etherscan.io`

### Functional Checks
- Wallet connects ✅
- Balance shows (test ETH) ✅
- Transactions work (testnet) ✅
- All features functional ✅

---

## 📊 Environment Comparison

| Feature | Pre-Production | Production |
|---------|---------------|------------|
| Network | Sepolia Testnet | Ethereum Mainnet |
| Risk | **ZERO** | Real value at risk |
| Gas Costs | Free | Real ETH |
| Purpose | Testing | Live users |
| Banner | 🟠 Orange | None |

---

## 🧪 What to Test Before Production

### Critical Tests
- [ ] Wallet connection works
- [ ] Token transfers successful
- [ ] Smart contract interactions
- [ ] Staking/unstaking
- [ ] Fee calculations
- [ ] Error handling

### Nice-to-Have Tests
- [ ] WalletConnect sessions
- [ ] NFT gallery (if applicable)
- [ ] Transaction history
- [ ] UI responsiveness
- [ ] Mobile compatibility

---

## 🚀 Deployment Commands

### Build & Deploy
```bash
# Option 1: Automated script
./deploy-preproduction.sh

# Option 2: NPM script
npm run deploy:preproduction

# Option 3: Manual
node scripts/deploy-preproduction.js
vercel --prod --prebuilt
```

### Check Current Environment
```bash
grep "VITE_ENVIRONMENT" .env.local
# Should show: preproduction
```

---

## 📖 Documentation

| File | Purpose |
|------|---------|
| **QUICK_START_PREPROD.md** | Step-by-step setup guide |
| **PRE_PRODUCTION_SETUP.md** | Complete documentation |
| **ENVIRONMENT_COMPARISON.md** | All environments compared |
| **PRE_PROD_SETUP_SUMMARY.md** | What was created |

---

## 🔄 Promotion Workflow

```
Development → Pre-Production → Production
   ↓              ↓               ↓
localhost    Sepolia Test     Mainnet
(test)       (safe test)      (real value)
```

**Golden Rule**: Never skip pre-production testing! 🛡️

---

## 🔒 Security Features

✅ Private keys isolated per environment  
✅ Network hardcoded to Sepolia (no mainnet access)  
✅ Visual warnings on every page  
✅ Console logging for verification  
✅ Git ignores all sensitive files  

---

## ❓ Troubleshooting

### Build fails?
```bash
# Check required variables
cat .env.preproduction | grep -E "INFURA_KEY|DEPLOYER_PRIVATE_KEY"
```

### Wrong network?
```bash
# Verify configuration
grep "VITE_NETWORK" .env.local
# Should show: sepolia
```

### Need help?
See `PRE_PRODUCTION_SETUP.md` Section 9 (Troubleshooting)

---

## 🎉 Ready to Deploy?

```bash
# Edit config
nano .env.preproduction

# Get test ETH
# https://sepoliafaucet.com/

# Deploy
./deploy-preproduction.sh
vercel --prod --prebuilt
```

**Test thoroughly, then promote to production with confidence!** ✨

---

**Remember**: Pre-production = Zero Risk = Safe Testing Ground 🛡️
