# 🎯 START HERE - Pre-Production Setup

## Welcome! Your Pre-Production Environment is Ready! ✅

I've set up a complete pre-production environment for you to test safely before deploying to production.

---

## ⚡ What You Need to Do NOW (3 Simple Steps)

### Step 1: Add Your Sepolia Private Key (2 minutes)

Open the pre-production config file:
```bash
nano .env.preproduction
```

Find this line (around line 17):
```env
DEPLOYER_PRIVATE_KEY=YOUR_SEPOLIA_TEST_PRIVATE_KEY_HERE
```

Replace with your actual Sepolia testnet private key:
```env
DEPLOYER_PRIVATE_KEY=0x1234567890abcdef... (your real testnet key)
```

**Don't have a testnet key?** Generate one in your browser console:
```javascript
// Paste in browser console (F12)
ethers.Wallet.createRandom().then(w => {
  console.log("Address:", w.address);
  console.log("Private Key:", w.privateKey);
});
```

Save and exit nano:
- Press `Ctrl + X`
- Press `Y` (yes to save)
- Press `Enter`

---

### Step 2: Get Free Test ETH (3 minutes)

Visit any of these faucets and request test tokens for your deployer address:

1. **Primary**: https://sepoliafaucet.com/
2. **Alternative**: https://www.alchemy.com/faucets/ethereum-sepolia
3. **Backup**: https://cloud.google.com/application/web3/faucet/ethereum/sepolia

You'll need:
- Sepolia ETH for gas fees (testnet = free!)
- Address: The same address from your private key

---

### Step 3: Deploy to Pre-Production (5 minutes)

Run the deployment script:
```bash
./deploy-preproduction.sh
```

This will:
1. ✅ Validate your configuration
2. ✅ Backup current settings
3. ✅ Build the app with testnet config
4. ✅ Prepare for Vercel deployment

Then deploy to Vercel:
```bash
vercel --prod --prebuilt
```

**If you don't have Vercel CLI:**
```bash
npm install -g vercel
vercel login
vercel --prod --prebuilt
```

---

## 🎉 That's It! You're Done!

Your app is now deployed to pre-production on Sepolia testnet.

---

## 🔍 How to Verify It Works

### Look for These Signs:

#### Visual Indicators (in your browser)
- 🟠 **Orange banner** at top: "⚠️ PRE-PRODUCTION MODE"
- App shows testnet network name

#### Console Messages (press F12)
```
⚠️ PREPRODUCTION MODE - Connected to SEPOLIA testnet.
No real value should be at risk.
```

#### Explorer Links
All blockchain explorer links should point to:
- ✅ `https://sepolia.etherscan.io`
- ❌ NOT `https://etherscan.io`

---

## 📚 Documentation Created For You

I've created comprehensive documentation. Read based on your needs:

| Document | When to Read |
|----------|-------------|
| **QUICK_START_PREPROD.md** | Already reading this! |
| **README_PRE_PRODUCTION.md** | Quick reference guide |
| **PRE_PRODUCTION_SETUP.md** | Complete manual (when you need details) |
| **ENVIRONMENT_COMPARISON.md** | Understanding all environments |
| **FILES_CREATED.md** | What files were added |
| **PRE_PROD_SETUP_SUMMARY.md** | Overview of everything |

---

## 🧪 What to Test in Pre-Production

Before promoting to production, test these:

### Critical Features
- [ ] Wallet connects properly
- [ ] View balance (should show test ETH)
- [ ] Send test transactions
- [ ] Smart contract interactions work
- [ ] Staking/unstaking functions
- [ ] Fee calculations correct

### If Applicable
- [ ] WalletConnect sessions
- [ ] NFT gallery displays
- [ ] Transaction history loads
- [ ] All UI elements functional
- [ ] Mobile responsive design

---

## 🚨 Important Security Notes

### ✅ SAFE to Do in Pre-Production
- Test all features freely
- Use testnet private keys
- Share deployment URL with team
- Make mistakes and learn

### ❌ NEVER Do This
- Don't use mainnet private keys
- Don't expect real value transfers
- Don't skip testing before production
- Don't share production keys

---

## 🔄 Workflow Going Forward

```
1. Develop Feature → localhost
        ↓
2. Test Locally → npm run dev
        ↓
3. Deploy to Pre-Prod → ./deploy-preproduction.sh
        ↓
4. Test Thoroughly → Sepolia testnet
        ↓
5. Fix Issues → Back to step 1
        ↓
6. When Perfect → Deploy to Production
```

---

## 🛠️ Troubleshooting

### Script Says "Missing Variables"?
```bash
# Check what's missing
cat .env.preproduction | grep "DEPLOYER_PRIVATE_KEY"
# Make sure it has a value after the =
```

### Build Fails?
```bash
# Clear cache and rebuild
rm -rf node_modules dist
npm install
./deploy-preproduction.sh
```

### Vercel Deployment Fails?
```bash
# Login to Vercel first
vercel login
vercel --prod --prebuilt
```

### Need More Help?
See Section 9 in `PRE_PRODUCTION_SETUP.md` (Troubleshooting Guide)

---

## 🎯 Quick Command Reference

```bash
# Edit configuration
nano .env.preproduction

# Deploy to pre-production
./deploy-preproduction.sh

# Alternative deploy command
npm run deploy:preproduction

# Check current environment
grep "VITE_ENVIRONMENT" .env.local

# Deploy to Vercel
vercel --prod --prebuilt

# Back to development
cp .env.example .env.local
npm run dev
```

---

## ✨ What Makes This Special?

### Before This Setup
- ❌ Direct production deployments (risky!)
- ❌ No safe testing environment
- ❌ Mistakes cost real money
- ❌ No visual environment indicators

### After This Setup
- ✅ Safe testnet environment (zero risk)
- ✅ Test everything before production
- ✅ Mistakes are free (testnet)
- ✅ Clear visual warnings
- ✅ Professional deployment workflow

---

## 🎊 You're All Set!

Your pre-production environment is configured and ready to use.

**Next Actions:**
1. ✅ Edit `.env.preproduction` with your testnet key
2. ✅ Get test ETH from faucet
3. ✅ Run `./deploy-preproduction.sh`
4. ✅ Deploy with `vercel --prod --prebuilt`
5. ✅ Test thoroughly on testnet
6. ✅ Promote to production with confidence!

---

## 📞 Support

If you encounter issues:
1. Check console for error messages
2. Verify `.env.preproduction` has correct values
3. Read troubleshooting in `PRE_PRODUCTION_SETUP.md`
4. Review deployment logs in Vercel dashboard

---

**Happy Testing! 🚀**

Remember: Pre-production is your safety net. Use it wisely! 🛡️

---

**P.S.** - All documentation files are in your project root. Just open them when you need more details!
