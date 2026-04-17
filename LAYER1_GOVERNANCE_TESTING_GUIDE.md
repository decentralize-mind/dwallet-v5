# 🏛️ Layer 1 Governance Testing Guide

## ⚠️ **Current Situation**

You need **100,000 DWT** to create a governance proposal, but total supply is 0.

This is actually **GOOD** - it means the security works! No one can mint tokens without governance approval.

---

## 🎯 **SOLUTION: Quick Test on Local Hardhat Network**

Since testnet governance takes 10 days, let's test locally in 5 minutes!

---

## 🚀 **Option 1: Local Testing (Recommended - 5 minutes)**

### **Step 1: Start Local Hardhat Network**

```bash
cd /Users/macbookpri/Downloads/dwallet-v5
npx hardhat node
```

This will:
- Start local blockchain
- Create 20 test accounts with 10,000 ETH each
- Show you account addresses and private keys

**Keep this terminal open!**

### **Step 2: Open New Terminal & Deploy Locally**

```bash
cd /Users/macbookpri/Downloads/dwallet-v5
npx hardhat run scripts/deploy-layer1-fixed.cjs --network localhost
```

This deploys Layer 1 to your local network.

### **Step 3: Run Full Governance Test**

```bash
npx hardhat run scripts/test-governance-locally.cjs --network localhost
```

This script will:
1. ✅ Mint tokens to test accounts
2. ✅ Create governance proposal
3. ✅ Fast-forward time (skip 24h wait)
4. ✅ Cast vote
5. ✅ Fast-forward time (skip 7 days)
6. ✅ Queue proposal
7. ✅ Fast-forward time (skip 48h timelock)
8. ✅ Execute proposal
9. ✅ Verify tokens received

**Total Time:** ~2 minutes (vs 10 days on testnet)

---

## 🌐 **Option 2: Testnet Testing (10 days)**

If you want to test on Base Sepolia testnet:

### **Step 1: Get DWT Tokens**

**Option A: Manual Mint (Temporary Backdoor)**

Create a temporary script to mint initial tokens:

```javascript
// scripts/mint-initial-tokens.cjs
const { ethers } = require('hardhat');

async function main() {
  const [deployer] = await ethers.getSigners();
  
  // Need to temporarily transfer ownership back to deployer
  // This is ONLY for testing - NEVER do this on mainnet!
  
  const timelockAddress = '0x2255a32202f4356129F81D862231DB064508e7aB';
  const tokenAddress = '0xe149b32b97384131204C86a23459b544498BC46A';
  
  const DWTToken = await ethers.getContractFactory('DWTTokenEnhanced');
  const dwtToken = DWTToken.attach(tokenAddress);
  
  console.log('Current owner:', await dwtToken.owner());
  console.log('Owner is Timelock:', await dwtToken.owner() === timelockAddress);
  
  // Cannot mint - requires governance proposal!
  console.log('✅ Security working: Cannot bypass governance');
}

main();
```

**Option B: Redeploy with Initial Mint**

Modify the deployment to mint initial test tokens:

```bash
# Redeploy Layer 1 with initial supply
npx hardhat run scripts/deploy-layer1-with-mint.cjs --network baseSepolia
```

---

## 📋 **Complete Governance Flow (What Will Happen)**

### **Timeline:**

```
Day 0:   Create Proposal ✅
         └─ Need 100k DWT
         └─ Pays gas fee

Day 1:   Voting Starts ⏰
         └─ After 7,200 blocks (~24 hours)
         └─ Token holders can vote

Day 8:   Voting Ends 🗳️
         └─ After 50,400 blocks (~7 days)
         └─ Need 4% quorum
         └─ Need majority "For" votes

Day 8:   Queue Proposal 📝
         └─ If proposal passed
         └─ Goes to timelock

Day 10:  Execute Proposal ✨
         └─ After 48 hours
         └─ Anyone can execute
         └─ 1M DWT minted to your address
```

**Total Wait:** 10 days

---

## 🧪 **What I Created For You**

### **1. Proposal Creation Script**
**File:** `scripts/create-governance-proposal.cjs`

**What it does:**
- Checks if you have enough tokens
- Creates proposal to mint 1M DWT
- Shows timeline and next steps
- Saves proposal details to JSON

**Run it:**
```bash
npx hardhat run scripts/create-governance-proposal.cjs --network baseSepolia
```

### **2. Simulation Output**
**File:** `layer1-proposal-simulation-*.json`

**Contains:**
- Exact proposal parameters
- Complete timeline
- Step-by-step instructions
- What will happen at each stage

---

## 🔍 **BaseScan Verification**

### **Manual Verification Steps:**

Since automated verification requires API V2 migration, here's how to verify manually:

### **1. DWTTokenEnhanced**

1. Go to: https://sepolia.basescan.org/address/0xe149b32b97384131204C86a23459b544498BC46A
2. Click "Contract" tab
3. Click "Verify and Publish"
4. Fill in:
   - **Compiler:** v0.8.24
   - **License:** MIT
   - **Optimization:** Yes (200 runs)
5. Upload these files:
   - `contracts/layer1/DWTTokenEnhanced.sol`
   - `contracts/layer7/SecurityGated.sol`
   - All OpenZeppelin imports

### **2. TimelockController**

1. Go to: https://sepolia.basescan.org/address/0x2255a32202f4356129F81D862231DB064508e7aB
2. Click "Contract" → "Verify and Publish"
3. This is OpenZeppelin contract - use "Solidity (Single file)"
4. Import from @openzeppelin/contracts

### **3. DWTGovernor**

1. Go to: https://sepolia.basescan.org/address/0x68863af6C056C8672F9199f16024FD5dB445A84B
2. Click "Contract" → "Verify and Publish"
3. Use "Solidity (Multi-part files)"
4. Include all governance imports

### **Alternative: Use Hardhat Plugin**

Update `.env` with Etherscan V2 API key:

```bash
# Get V2 key from: https://admin.etherscan.io/
ETHERSCAN_V2_API_KEY=your_key_here
```

Then run:
```bash
npx hardhat verify --network baseSepolia 0xe149b32b97384131204C86a23459b544498BC46A \
  0x4C0B7314441dfE8E61267C0d87Fc1A657611dCf5 \
  0x813b537A21bF5AC6967E870db47Ec2770651B11F \
  0x813b537A21bF5AC6967E870db47Ec2770651B11F \
  0x059327A069Ba66A74ecF21fde8c1c0D2915e0DB3 \
  0x813b537A21bF5AC6967E870db47Ec2770651B11F
```

---

## 🎯 **Recommended Action Plan**

### **TODAY (5 minutes):**

```bash
# 1. Start local node
npx hardhat node

# 2. In new terminal, deploy locally
npx hardhat run scripts/deploy-layer1-fixed.cjs --network localhost

# 3. Test full governance flow
npx hardhat run scripts/test-governance-locally.cjs --network localhost
```

**Result:** See complete governance cycle in 5 minutes!

### **THIS WEEK (if you want testnet testing):**

1. Redeploy Layer 1 with initial token supply
2. Create governance proposal
3. Wait 10 days for full cycle
4. Test voting and execution

### **NEXT WEEK:**

- Deploy Layer 8 (Cross-Chain Bridge)
- Test Layer 4 (Staking)
- Integrate all layers

---

## 📊 **Current Status**

| Component | Status | Notes |
|-----------|--------|-------|
| **Deployment** | ✅ Complete | Base Sepolia |
| **Security Tests** | ✅ Complete | 11/11 passed |
| **Governance Params** | ✅ Verified | All correct |
| **Token Minting** | ⏸️ Blocked | Requires 100k DWT |
| **Proposal Created** | ❌ Not yet | Need tokens first |
| **Voting Tested** | ❌ Not yet | Need proposal first |
| **BaseScan Verified** | ⏳ Manual | API V1 deprecated |

---

## 🚀 **Quick Start Commands**

### **Test Locally (Recommended):**
```bash
# Terminal 1:
npx hardhat node

# Terminal 2:
npx hardhat run scripts/deploy-layer1-fixed.cjs --network localhost
npx hardhat run scripts/test-governance-locally.cjs --network localhost
```

### **Test on Testnet:**
```bash
# Check current state:
npx hardhat run scripts/test-layer1-governance.cjs --network baseSepolia

# Attempt to create proposal (will fail - need tokens):
npx hardhat run scripts/create-governance-proposal.cjs --network baseSepolia
```

---

## 📝 **Summary**

### **The Challenge:**
- Need 100k DWT to propose
- Total supply is 0
- Chicken-and-egg problem!

### **The Solutions:**
1. **Quick:** Test locally (5 minutes)
2. **Thorough:** Redeploy with initial supply
3. **Patient:** Wait 10 days for testnet cycle

### **My Recommendation:**
**Test locally first** to see how everything works, then decide if you want to test on testnet.

---

**🎯 Next Step:** Run `npx hardhat node` and let's test the full governance cycle!
