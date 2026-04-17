Great question! Let me find the DWT token contract address on **Base Mainnet** where your 1M DWT tokens are located, so you can transfer them to the deployer address.


Perfect! Now let me check the deployment files to get the complete information:


Now let me create a clear summary document with all the contract addresses you need:


## 📍 **HERE'S WHERE YOUR 1M DWT IS:**

### **Base Mainnet (Production Network):**
```
DWT Token Contract Address: 0x9ce235f8574bde67393884550F02135CE4fB8387
Your Wallet:                0x4C0B7314441dfE8E61267C0d87Fc1A657611dCf5
Your Balance:               1,000,000 DWT
Network:                    Base Mainnet (Chain ID: 8453)

View on BaseScan: https://basescan.org/address/0x9ce235f8574bde67393884550F02135CE4fB8387
```

---

## ⚠️ **THE PROBLEM:**

Your Layer 5 contracts are on **Base Sepolia** (testnet), but your 1M DWT is on **Base Mainnet** (production).

**These are completely different networks** - like two separate blockchains that don't share tokens.

---

## 🎯 **YOUR TWO OPTIONS:**

### **OPTION 1: Deploy Layer 5 to Base Mainnet** ⭐ USE YOUR 1M DWT

Deploy all Layer 5 contracts to **Base Mainnet** where your DWT already is:

```bash
# This will deploy to Base Mainnet and use your 1M DWT
npx hardhat run scripts/deploy-layer5-phase1.cjs --network base
npx hardhat run scripts/deploy-layer5-phase2.cjs --network base
npx hardhat run scripts/fund-layer5-pools-now.cjs --network base
```

**Cost:** ~$50-100 in real ETH for gas  
**Result:** Production-ready with real DWT tokens

---

### **OPTION 2: Create Test DWT on Base Sepolia** ⭐ FOR TESTING

I'll deploy a test DWT token to Base Sepolia right now (5 minutes, almost free):

```bash
# Creates TestDWT on Base Sepolia
# Mints 1M to your wallet
# Funds both pools
# Enables full testing
```

**Cost:** Almost nothing (testnet)  
**Result:** Perfect for testing and development

---

## 🚀 **WHAT DO YOU WANT TO DO?**

1. **"Deploy to mainnet"** - I'll deploy Layer 5 to Base Mainnet and use your 1M real DWT
2. **"Deploy TestDWT"** - I'll create test DWT on Base Sepolia for testing
3. **"Show me both"** - I'll explain the pros/cons in detail

**Which option do you prefer?** 🎯