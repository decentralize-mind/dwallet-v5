# Contract File Locations Guide

> Exact locations of all 5 priority contracts for Base Mainnet deployment
> Created: 2026-04-20

---

## 📍 CONTRACT LOCATIONS

Here are the exact file paths for all 5 contracts you need to deploy:

---

### **1️⃣ DWTToken.sol**

**Location:**
```
/Users/macbookpri/Downloads/dwallet-v5/contracts/DWTToken.sol
```

**File Details:**
- Size: 36 lines
- Status: ✅ Active (in main contracts folder)

**Backup (older version):**
```
/Users/macbookpri/Downloads/dwallet-v5/_temp_layer1_backup/DWTToken.sol (213 lines)
```

**Use:** The shorter version in `contracts/DWTToken.sol` (36 lines)

---

### **2️⃣ FeeRouter.sol** ⭐⭐⭐ HIGHEST PRIORITY

**Location:**
```
/Users/macbookpri/Downloads/dwallet-v5/contracts/layer9/FeeRouter.sol
```

**File Details:**
- Size: 422 lines
- Status: ✅ Active (enhanced version)
- Features: Fee collection, DWT discounts, distribution

**Disabled (older version):**
```
/Users/macbookpri/Downloads/dwallet-v5/_disabled_contracts/FeeRouter.sol (209 lines)
```

**Use:** The enhanced version in `contracts/layer9/FeeRouter.sol` (422 lines)

**Quick Open:**
```bash
code /Users/macbookpri/Downloads/dwallet-v5/contracts/layer9/FeeRouter.sol
```

---

### **3️⃣ SwapRouter.sol**

**Location:**
```
/Users/macbookpri/Downloads/dwallet-v5/contracts/layer9/SwapRouter.sol
```

**File Details:**
- Size: 316 lines
- Status: ✅ Active (in layer9 folder)

**Disabled (older version):**
```
/Users/macbookpri/Downloads/dwallet-v5/_disabled_contracts/SwapRouter.sol (316 lines)
```

**Use:** The version in `contracts/layer9/SwapRouter.sol`

**Quick Open:**
```bash
code /Users/macbookpri/Downloads/dwallet-v5/contracts/layer9/SwapRouter.sol
```

---

### **4️⃣ NFTMembership.sol**

**Location:**
```
/Users/macbookpri/Downloads/dwallet-v5/contracts/layer9/NFTMembership.sol
```

**File Details:**
- Size: 483 lines
- Status: ✅ Active (enhanced version with 4 tiers)

**Disabled (older version):**
```
/Users/macbookpri/Downloads/dwallet-v5/_disabled_contracts/NFTMembership.sol (361 lines)
```

**Use:** The enhanced version in `contracts/layer9/NFTMembership.sol` (483 lines)

**Quick Open:**
```bash
code /Users/macbookpri/Downloads/dwallet-v5/contracts/layer9/NFTMembership.sol
```

---

### **5️⃣ ReferralPool.sol**

**Location:**
```
/Users/macbookpri/Downloads/dwallet-v5/contracts/layer9/ReferralPool.sol
```

**File Details:**
- Size: 244 lines
- Status: ✅ Active (only version exists)

**Quick Open:**
```bash
code /Users/macbookpri/Downloads/dwallet-v5/contracts/layer9/ReferralPool.sol
```

---

## 📁 DIRECTORY STRUCTURE

```
/Users/macbookpri/Downloads/dwallet-v5/
│
├── contracts/                          ← Main contracts directory
│   ├── DWTToken.sol                   ← Contract #1 ✅
│   │
│   └── layer9/                        ← Layer 9 (Revenue contracts)
│       ├── FeeRouter.sol              ← Contract #2 ✅⭐⭐⭐
│       ├── SwapRouter.sol             ← Contract #3 ✅
│       ├── NFTMembership.sol          ← Contract #4 ✅
│       ├── ReferralPool.sol           ← Contract #5 ✅
│       ├── LendingMarket.sol          ← Future (Phase 2)
│       ├── DWalletStablecoin.sol      ← Future (Phase 2)
│       └── SimpleAirdrop.sol          ← Future (Phase 2)
│
└── _disabled_contracts/               ← Old versions (DON'T USE)
    ├── FeeRouter.sol                  ← Old version (209 lines)
    ├── SwapRouter.sol                 ← Old version
    └── NFTMembership.sol              ← Old version (361 lines)
```

---

## 🎯 DEPLOYMENT ORDER WITH FILE PATHS

### **Step 1: DWTToken**
```bash
# File: contracts/DWTToken.sol
npx hardhat run scripts/deploy-dwt-token.cjs --network base
```

### **Step 2: FeeRouter** ⭐⭐⭐
```bash
# File: contracts/layer9/FeeRouter.sol
npx hardhat run scripts/deploy-fee-router.cjs --network base
```

### **Step 3: SwapRouter**
```bash
# File: contracts/layer9/SwapRouter.sol
npx hardhat run scripts/deploy-swap-router.cjs --network base
```

### **Step 4: NFTMembership**
```bash
# File: contracts/layer9/NFTMembership.sol
npx hardhat run scripts/deploy-nft-membership.cjs --network base
```

### **Step 5: ReferralPool**
```bash
# File: contracts/layer9/ReferralPool.sol
npx hardhat run scripts/deploy-referral-pool.cjs --network base
```

---

## 🔍 QUICK REFERENCE TABLE

| # | Contract Name | File Path | Lines | Priority |
|---|---------------|-----------|-------|----------|
| 1 | DWTToken | `contracts/DWTToken.sol` | 36 | ⭐⭐ |
| 2 | FeeRouter | `contracts/layer9/FeeRouter.sol` | 422 | ⭐⭐⭐ |
| 3 | SwapRouter | `contracts/layer9/SwapRouter.sol` | 316 | ⭐⭐⭐ |
| 4 | NFTMembership | `contracts/layer9/NFTMembership.sol` | 483 | ⭐⭐ |
| 5 | ReferralPool | `contracts/layer9/ReferralPool.sol` | 244 | ⭐ |

---

## 💡 IMPORTANT NOTES

### ✅ **USE THESE FILES:**
- All files in `contracts/` and `contracts/layer9/` folders
- These are the latest, tested versions

### ❌ **DON'T USE THESE:**
- Files in `_disabled_contracts/` folder (old versions)
- Files in `_temp_layer1_backup/` folder (backups)

### 📝 **Contract Features:**

**1. DWTToken.sol (36 lines)**
- Simple ERC20 token
- 123 million total supply
- Used for fee discounts

**2. FeeRouter.sol (422 lines)**
- Collects 0.30% swap fees
- DWT holder discounts (up to 80%)
- Fee distribution (70% LP, 30% treasury)
- Anti-gaming protection
- Timelock for admin changes

**3. SwapRouter.sol (316 lines)**
- Executes token swaps
- Integrates with FeeRouter
- Signature verification
- Slippage protection

**4. NFTMembership.sol (483 lines)**
- 4-tier membership system
- Bronze: 0.05 ETH
- Silver: 0.15 ETH
- Gold: 0.50 ETH
- Platinum: 1.50 ETH
- Fee discount integration

**5. ReferralPool.sol (244 lines)**
- Manages referral rewards
- 10 DWT per referral
- Code generation and tracking
- Reward claiming

---

## 🚀 NEXT STEPS

### **Option 1: View Contracts**
```bash
# Open all 5 contracts in VS Code
code /Users/macbookpri/Downloads/dwallet-v5/contracts/DWTToken.sol
code /Users/macbookpri/Downloads/dwallet-v5/contracts/layer9/FeeRouter.sol
code /Users/macbookpri/Downloads/dwallet-v5/contracts/layer9/SwapRouter.sol
code /Users/macbookpri/Downloads/dwallet-v5/contracts/layer9/NFTMembership.sol
code /Users/macbookpri/Downloads/dwallet-v5/contracts/layer9/ReferralPool.sol
```

### **Option 2: Check Contract Sizes**
```bash
wc -l /Users/macbookpri/Downloads/dwallet-v5/contracts/DWTToken.sol
wc -l /Users/macbookpri/Downloads/dwallet-v5/contracts/layer9/FeeRouter.sol
wc -l /Users/macbookpri/Downloads/dwallet-v5/contracts/layer9/SwapRouter.sol
wc -l /Users/macbookpri/Downloads/dwallet-v5/contracts/layer9/NFTMembership.sol
wc -l /Users/macbookpri/Downloads/dwallet-v5/contracts/layer9/ReferralPool.sol
```

### **Option 3: Verify Compilation**
```bash
# Make sure all contracts compile
npx hardhat compile
```

### **Option 4: Start Deployment**
```bash
# Deploy FeeRouter first (highest priority)
cd /Users/macbookpri/Downloads/dwallet-v5
npx hardhat run scripts/deploy-fee-router.cjs --network base
```

---

## 📞 DEPLOYMENT SCRIPTS

Check if deployment scripts exist:

```bash
# List all deployment scripts
ls -la scripts/deploy-*.cjs
```

**Expected scripts:**
- `scripts/deploy-fee-router.cjs` ✅ (exists)
- `scripts/deploy-referral-pool.cjs` ✅ (exists)
- `scripts/deploy-dwt-token.cjs` ❓ (may need to create)
- `scripts/deploy-swap-router.cjs` ❓ (may need to create)
- `scripts/deploy-nft-membership.cjs` ❓ (may need to create)

---

## 🎯 SUMMARY

**All 5 contracts are in:**
```
/Users/macbookpri/Downloads/dwallet-v5/contracts/
├── DWTToken.sol                      (Root contracts folder)
└── layer9/
    ├── FeeRouter.sol                 (Layer 9 folder)
    ├── SwapRouter.sol                (Layer 9 folder)
    ├── NFTMembership.sol             (Layer 9 folder)
    └── ReferralPool.sol              (Layer 9 folder)
```

**Ready to deploy?** Start with FeeRouter - it's your biggest revenue generator at 422 lines of production-ready code! 🚀
