# 💰 DWT Token Addresses - Where Your 1M DWT Is Located

**Date:** April 17, 2026

---

## 🎯 YOUR DWT TOKENS ARE HERE:

### Base Mainnet (Production Network) - WHERE YOUR 1M DWT IS:
```
DWT Token Address: 0x9ce235f8574bde67393884550F02135CE4fB8387
Network: Base Mainnet (Chain ID: 8453)
Your Balance: 1,000,000 DWT
Explorer: https://basescan.org/address/0x9ce235f8574bde67393884550F02135CE4fB8387
```

### Base Sepolia (Testnet) - WHERE LAYER 5 CONTRACTS ARE:
```
DWT Token Address: 0xe149b32b97384131204C86a23459b544498BC46A
Network: Base Sepolia (Chain ID: 84532)
Your Balance: 0 DWT
Explorer: https://sepolia.basescan.org/address/0xe149b32b97384131204C86a23459b544498BC46A
```

---

## ⚠️ IMPORTANT: These Are Different Networks!

**Base Mainnet** and **Base Sepolia** are completely separate blockchains:
- Tokens on Mainnet ❌ cannot be used on Sepolia
- Tokens on Sepolia ❌ cannot be used on Mainnet
- They are different token contracts on different networks

---

## 📋 Your Options:

### OPTION 1: Transfer DWT on Base Mainnet ⭐ USE YOUR EXISTING 1M DWT

**This uses your existing 1M DWT on Base Mainnet**

#### Step 1: Deploy Layer 5 to Base Mainnet
Your Layer 5 contracts need to be on the same network as your DWT tokens.

**Deploy to Base Mainnet:**
```bash
npx hardhat run scripts/deploy-layer5-phase1.cjs --network base
npx hardhat run scripts/deploy-layer5-phase2.cjs --network base
```

#### Step 2: Fund Pools on Base Mainnet
After deployment, use your 1M DWT to fund the pools:
```bash
npx hardhat run scripts/fund-layer5-pools-now.cjs --network base
```

**Pros:**
- ✅ Uses your existing 1M DWT
- ✅ Production-ready
- ✅ Real tokens, real value

**Cons:**
- ❌ Costs real ETH for gas (~$50-100)
- ❌ Should do security audit first
- ❌ Real money at risk

---

### OPTION 2: Create Test DWT on Base Sepolia ⭐ RECOMMENDED FOR TESTING

**This creates test DWT tokens on Base Sepolia for testing**

I can deploy a `TestDWT` token contract to Base Sepolia right now:
- Deploy TestDWT to Base Sepolia
- Mint 1,000,000 test DWT to your deployer address
- Fund both pools (50k + 100k)
- Test everything works
- Cost: Almost nothing (testnet)

**This is what I recommend for development/testing!**

---

## 🔍 How to Check Your DWT Balance on Base Mainnet:

### Using BaseScan:
1. Go to: https://basescan.org/address/0x9ce235f8574bde67393884550F02135CE4fB8387
2. Click "Read Contract"
3. Call `balanceOf` function
4. Enter your address: `0x4C0B7314441dfE8E61267C0d87Fc1A657611dCf5`
5. Should show: 1,000,000 DWT

### Using Hardhat Console:
```bash
npx hardhat console --network base

# In console:
const DWT = await ethers.getContractAt(
  "@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20",
  "0x9ce235f8574bde67393884550F02135CE4fB8387"
);
const balance = await DWT.balanceOf("0x4C0B7314441dfE8E61267C0d87Fc1A657611dCf5");
console.log("Your DWT balance:", ethers.formatEther(balance));
```

---

## 📊 Current Layer 5 Contract Addresses

### On Base Sepolia (Testnet):
```
CrossChainMessenger: 0x64f3fFdE0bbA86e072a2595Cd550AeC44a1e0e38
FlashLoan:           0x468772f20864403A0071690ef8c620D9E02BD649
InsuranceFund:       0x8ba2Bb332764217079DFFb280dD70C8B351B5770
TestPriceOracle:     0x22830a8c7fb402517809F79D242A57Fb1BBA2b40
LimitOrders:         0x924B1A7846456e9de97A7E952e756daF4A995b3e
LiquidityIncentive:  0x1145848222450fe6669716f7AF5cdf6EeF03fF34
DWT Token:           0xe149b32b97384131204C86a23459b544498BC46A (0 balance)
```

### On Base Mainnet (Not Deployed Yet):
```
Layer 5 contracts NOT YET DEPLOYED to Base Mainnet
DWT Token:           0x9ce235f8574bde67393884550F02135CE4fB8387 (1M balance)
```

---

## 🚀 RECOMMENDED ACTION PLAN:

### For Testing (Do This Now):
1. ✅ Deploy TestDWT to Base Sepolia (5 min)
2. ✅ Mint 1M test DWT to deployer
3. ✅ Fund pools (50k + 100k)
4. ✅ Test everything
5. ✅ Verify all works perfectly

### For Production (Do Later):
1. ⏳ Complete security audit
2. ⏳ Deploy Layer 5 to Base Mainnet
3. ⏳ Fund pools with your real 1M DWT
4. ⏳ Launch to users

---

## 💡 MY RECOMMENDATION:

**Should I deploy TestDWT to Base Sepolia right now?**

This will:
- ✅ Give you 1M test DWT immediately
- ✅ Allow pool funding right away
- ✅ Enable full testing
- ✅ Cost almost nothing
- ✅ Take ~5 minutes

**Just say "yes, deploy TestDWT" and I'll do it immediately!**

Or if you want to use your real 1M DWT on Base Mainnet:
**Say "deploy to mainnet" and I'll deploy Layer 5 to Base Mainnet!**

---

## 📞 Quick Reference

### Your Wallet:
- **Address:** `0x4C0B7314441dfE8E61267C0d87Fc1A657611dCf5`
- **DWT on Base Mainnet:** 1,000,000 DWT
- **ETH on Base Sepolia:** 5.64 ETH

### DWT Token Contracts:
- **Base Mainnet:** `0x9ce235f8574bde67393884550F02135CE4fB8387` ← YOUR 1M DWT IS HERE
- **Base Sepolia:** `0xe149b32b97384131204C86a23459b544498BC46A` ← 0 DWT HERE

### Network Explorers:
- **Base Mainnet:** https://basescan.org
- **Base Sepolia:** https://sepolia.basescan.org

---

**What would you like to do?**
1. Deploy TestDWT to Base Sepolia (for testing) ⭐
2. Deploy Layer 5 to Base Mainnet (for production)
3. Something else?
