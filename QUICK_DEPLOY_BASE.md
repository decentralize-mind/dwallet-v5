# 🚀 QUICK START - Deploy to Base Testnet NOW

## ⚡ 3-MINUTE SETUP

### Step 1: Get Your Base Sepolia Address (30 seconds)

```bash
# Run this to see your deployer address
npx hardhat run --network baseSepolia -e "
const hre = require('hardhat');
async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log('Deployer Address:', deployer.address);
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log('Balance:', hre.formatEther(balance), 'ETH');
}
main().catch(console.error);
"
```

⚠️ **If this fails**, you need to add your private key first (see Step 2).

---

### Step 2: Add Your Private Key (1 minute)

**Option A: Quick Edit**

```bash
nano .env.preproduction
```

Find this line:
```
DEPLOYER_PRIVATE_KEY=YOUR_SEPOLIA_TEST_PRIVATE_KEY_HERE
```

Replace with YOUR actual Base Sepolia testnet private key (no 0x prefix):
```
DEPLOYER_PRIVATE_KEY=your_private_key_hex_without_0x
```

Save: `Ctrl+O` → Enter → Exit: `Ctrl+X`

**Option B: One-Liner**

```bash
# Replace with your actual key
sed -i '' 's/DEPLOYER_PRIVATE_KEY=.*/DEPLOYER_PRIVATE_KEY=your_key_here/' .env.preproduction
```

⚠️ **SECURITY:** Only use testnet keys! Never mainnet keys!

---

### Step 3: Get Free Testnet ETH (1 minute)

**FASTEST METHOD:**

1. Go to: https://faucets.chain.link/base-sepolia
2. Connect wallet
3. Click "Request Base Sepolia ETH"
4. Wait 30 seconds

**ALTERNATIVE:** https://www.alchemy.com/faucets/base-sepolia

You need at least **0.05 ETH** for deployment (it's free!).

---

### Step 4: DEPLOY! (30 seconds)

```bash
cd /Users/macbookpri/Downloads/dwallet-v5

# Compile security contracts
npx hardhat compile --config hardhat.security.config.cjs

# Deploy to Base Sepolia
npx hardhat run scripts/deploy-security-base-testnet.js --network baseSepolia
```

---

## 🎯 EXPECTED OUTPUT

```
🚀 Deploying Security Core to BASE SEPOLIA Testnet...

Deployer Address: 0xYourAddress...
Deployer Balance: 0.5 ETH

Network: baseSepolia (Chain ID: 84532)

📋 Step 1: Deploying InvariantChecker...
✅ InvariantChecker deployed to: 0x...

🔒 Step 2: Deploying MockLayer7Security...
✅ MockLayer7Security deployed to: 0x...

🔐 Step 3: Deploying LockEngine...
✅ LockEngine deployed to: 0x...

🧠 Step 4: Deploying SecurityController...
✅ SecurityController deployed to: 0x...

⏱️  Step 5: Deploying GovernanceTimelock...
✅ GovernanceTimelock deployed to: 0x...

⚙️  Step 6: Initial Configuration...
    ✓ Rate limit set: 1M DWT per block
    ✓ Cooldown set: 24 hours
    ✓ Time delay set: 48 hours
    ✓ Test layer activated
    ✓ Threat thresholds set
    ✓ Auto-response enabled

🎉 DEPLOYMENT COMPLETE ON BASE SEPOLIA!
```

---

## 🔍 VIEW YOUR CONTRACTS

After deployment, view on Base explorer:

```
https://sepolia.basescan.org/address/<LOCK_ENGINE_ADDRESS>
```

Replace `<LOCK_ENGINE_ADDRESS>` with the address from deployment output.

---

## ❌ TROUBLESHOOTING

### "Insufficient funds"
→ Get more testnet ETH from faucets (Step 3)

### "Compilation failed"
→ Run: `npx hardhat clean && npx hardhat compile --config hardhat.security.config.cjs --force`

### "Invalid private key"
→ Make sure it's hex format without 0x prefix
→ Double-check you copied the entire key

### "Network timeout"
→ Try again, testnet can be slow sometimes
→ Increase timeout in hardhat config if needed

---

## ✅ DONE!

When you see "🎉 DEPLOYMENT COMPLETE!", you're done!

**Next:**
- Save contract addresses
- Verify contracts on BaseScan
- Test with attack simulations
- Share with your team

---

**Need Help?** Check `BASE_TESTNET_DEPLOYMENT_GUIDE.md` for full details!
