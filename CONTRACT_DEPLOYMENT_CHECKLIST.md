# Complete Contract Deployment Guide

> All contracts that need deployment to Base Mainnet and other networks
> Created: 2026-04-20

---

## 📊 DEPLOYMENT OVERVIEW

### **Current Status:**
- ✅ **Frontend:** Deployed to IPFS
- ✅ **Testnet:** All contracts deployed to Base Sepolia
- ❌ **Mainnet:** NO contracts deployed yet ← **THIS IS BLOCKING REVENUE**

---

## 🎯 CONTRACTS TO DEPLOY ON BASE MAINNET

### **Priority 1: REVENUE-GENERATING CONTRACTS (Deploy FIRST)**

These contracts directly generate revenue. Deploy them immediately!

| # | Contract | Purpose | Revenue Impact | Deployment Order |
|---|----------|---------|----------------|------------------|
| 1 | **FeeRouter.sol** | Collect swap fees (0.30%) | $5,000-50,000/month | 1st ⭐⭐⭐ |
| 2 | **SwapRouter.sol** | Execute token swaps | Enables fees | 2nd ⭐⭐⭐ |
| 3 | **NFTMembership.sol** | Sell membership NFTs | $125-750k one-time | 3rd ⭐⭐ |
| 4 | **DWTToken.sol** | Governance token | Enables discounts | 4th ⭐⭐ |
| 5 | **ReferralPool.sol** | Referral rewards | User growth | 5th ⭐ |

**Total: 5 contracts for immediate revenue**

---

### **Priority 2: ADVANCED REVENUE CONTRACTS (Deploy After)**

These contracts unlock additional revenue streams.

| # | Contract | Purpose | Revenue Impact | Timeline |
|---|----------|---------|----------------|----------|
| 6 | **LendingMarket.sol** | Lending protocol | $500-10,000/month | Month 2 |
| 7 | **DWalletStablecoin.sol** | Custom stablecoin | Enables lending | Month 2 |
| 8 | **SimpleAirdrop.sol** | Token distribution | Marketing | Month 2 |

**Total: 3 contracts for advanced features**

---

### **Priority 3: SECURITY & INFRASTRUCTURE (Optional)**

These support contracts but don't directly generate revenue.

| # | Contract | Purpose | Revenue Impact | Timeline |
|---|----------|---------|----------------|----------|
| 9 | **SecurityController.sol** | Access control | Security | When needed |
| 10 | **VestingWalletWrapper.sol** | Token vesting | Team tokens | When needed |

---

### **Priority 4: FUTURE PRODUCTS (Later)**

These are backup files (.bak) - not ready for deployment.

| Contract | Status | Timeline |
|----------|--------|----------|
| DWTOptions.sol.bak | Needs review | Month 3-4 |
| DWTPerpetuals.sol.bak | Needs review | Month 3-4 |
| DWTPredictionMarket.sol.bak | Needs review | Month 3-4 |
| DWTYieldVault.sol.bak | Needs review | Month 3-4 |

---

## 🚀 STEP-BY-STEP DEPLOYMENT PLAN

### **PHASE 1: IMMEDIATE REVENUE (This Week)**

Deploy these 5 contracts to start earning immediately.

---

#### **Contract 1: DWTToken.sol** (Deploy First)

**Why First:** Other contracts need DWT token address for discounts.

**Purpose:** Governance token for fee discounts and rewards

**Deployment:**
```bash
npx hardhat run scripts/deploy-dwt-token.cjs --network base
```

**If no script exists, create one:**
```javascript
// scripts/deploy-dwt-token.cjs
const { ethers } = require('hardhat')

async function main() {
  console.log('🚀 Deploying DWT Token to Base Mainnet...')
  
  const DWTToken = await ethers.getContractFactory('DWTToken')
  const dwtToken = await DWTToken.deploy(
    'DWT Token',           // name
    'DWT',                 // symbol
    ethers.parseEther('123000000') // 123M total supply
  )
  
  await dwtToken.waitForDeployment()
  const address = await dwtToken.getAddress()
  
  console.log('✅ DWT Token deployed to:', address)
  console.log('📝 Transaction hash:', dwtToken.deploymentTransaction().hash)
  
  // Save deployment
  const fs = require('fs')
  const deployment = {
    network: 'base',
    chainId: 8453,
    timestamp: new Date().toISOString(),
    contracts: {
      dwtToken: address
    }
  }
  
  fs.writeFileSync(
    `deployments/dwt-token-base-${Date.now()}.json`,
    JSON.stringify(deployment, null, 2)
  )
}

main().catch(console.error)
```

**Expected Gas Cost:** ~$20-40  
**Expected Address:** Will be saved to `deployments/` folder

---

#### **Contract 2: FeeRouter.sol** (HIGHEST PRIORITY)

**Purpose:** Collect 0.30% fee on all swaps

**Revenue:** $5,000-50,000/month

**Deployment:**
```bash
npx hardhat run scripts/deploy-fee-router.cjs --network base
```

**Parameters Needed:**
- DWT Token address (from Contract 1)
- Treasury wallet address (your wallet)
- Initial fee: 30 basis points (0.30%)

**Expected Gas Cost:** ~$40-80

---

#### **Contract 3: SwapRouter.sol**

**Purpose:** Execute token swaps through FeeRouter

**Deployment:**
```bash
npx hardhat run scripts/deploy-swap-router.cjs --network base
```

**Parameters Needed:**
- FeeRouter address (from Contract 2)
- Uniswap V3 Router address: `0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45`

**Expected Gas Cost:** ~$30-60

---

#### **Contract 4: NFTMembership.sol**

**Purpose:** Sell lifetime membership NFTs

**Revenue:** $125,000-750,000 (one-time)

**Deployment:**
```bash
npx hardhat run scripts/deploy-nft-membership.cjs --network base
```

**Parameters Needed:**
- DWT Token address
- NFT URI (IPFS metadata)
- Tier prices: 0.05, 0.15, 0.50, 1.50 ETH

**Expected Gas Cost:** ~$50-100

---

#### **Contract 5: ReferralPool.sol**

**Purpose:** Manage referral rewards

**Deployment:**
```bash
npx hardhat run scripts/deploy-referral-pool.cjs --network base
```

**Parameters Needed:**
- DWT Token address
- Reward amount per referral

**Expected Gas Cost:** ~$30-60

---

### **PHASE 1 SUMMARY**

| Contract | Gas Cost | Revenue Potential |
|----------|----------|-------------------|
| DWTToken | $20-40 | Enables discounts |
| FeeRouter | $40-80 | $5,000-50,000/month |
| SwapRouter | $30-60 | Enables swaps |
| NFTMembership | $50-100 | $125-750k one-time |
| ReferralPool | $30-60 | User growth |
| **TOTAL** | **$170-340** | **Massive revenue** |

---

### **PHASE 2: ADVANCED FEATURES (Month 2)**

Deploy these after Phase 1 is working.

#### **Contract 6: LendingMarket.sol**

**Purpose:** Your own lending protocol

**Revenue:** $500-10,000/month

```bash
npx hardhat run scripts/deploy-lending-market.cjs --network base
```

**Expected Gas Cost:** ~$60-120

---

#### **Contract 7: DWalletStablecoin.sol**

**Purpose:** Custom stablecoin for lending

```bash
npx hardhat run scripts/deploy-stablecoin.cjs --network base
```

**Expected Gas Cost:** ~$40-80

---

#### **Contract 8: SimpleAirdrop.sol**

**Purpose:** Distribute DWT tokens for marketing

```bash
npx hardhat run scripts/deploy-airdrop.cjs --network base
```

**Expected Gas Cost:** ~$20-40

---

### **PHASE 2 SUMMARY**

| Contract | Gas Cost | Revenue |
|----------|----------|---------|
| LendingMarket | $60-120 | $500-10k/month |
| Stablecoin | $40-80 | Enables lending |
| Airdrop | $20-40 | Marketing |
| **TOTAL** | **$120-240** | **Advanced features** |

---

## 🌐 OTHER NETWORKS TO DEPLOY

### **Do You Need to Deploy to Other Networks?**

**Short Answer:** Start with Base Mainnet ONLY, then expand based on user demand.

---

### **Network Priority:**

| Network | Priority | When to Deploy | Why |
|---------|----------|----------------|-----|
| **Base Mainnet** | ⭐⭐⭐ | NOW | Your primary network, lowest fees |
| Ethereum Mainnet | ⭐ | Month 6+ | High fees, but large user base |
| Arbitrum | ⭐ | Month 4+ | Growing DeFi ecosystem |
| Optimism | ⭐ | Month 4+ | Similar to Base (both OP Stack) |
| Polygon | ⭐⭐ | Month 3+ | Low fees, large user base |
| BSC | ⭐ | Month 6+ | High volume, different audience |

---

### **Recommended Strategy:**

#### **Phase 1: Base Mainnet ONLY (Months 1-3)**
- Focus all efforts on Base
- Build user base
- Optimize revenue streams
- Establish brand

#### **Phase 2: Expand to Polygon (Months 3-4)**
- Polygon has low fees like Base
- Large existing DeFi user base
- Easy to deploy (EVM compatible)

#### **Phase 3: Add Arbitrum/Optimism (Months 4-6)**
- Both are OP Stack (like Base)
- Similar deployment process
- Growing ecosystems

#### **Phase 4: Ethereum Mainnet (Month 6+)**
- Highest fees but prestige
- Large institutional users
- Only if profitable

---

### **Multi-Network Deployment Considerations:**

#### **Pros of Multi-Network:**
- ✅ Larger user base
- ✅ More revenue opportunities
- ✅ Risk diversification
- ✅ Competitive advantage

#### **Cons of Multi-Network:**
- ❌ Higher deployment costs (each network costs $200-500)
- ❌ More complex maintenance
- ❌ Liquidity fragmentation
- ❌ Security risks (more attack surfaces)

---

## 💰 DEPLOYMENT COST BREAKDOWN

### **Base Mainnet - Phase 1:**

| Contract | Estimated Gas (ETH) | Cost (USD) |
|----------|---------------------|------------|
| DWTToken | 0.005-0.01 | $10-25 |
| FeeRouter | 0.01-0.02 | $25-50 |
| SwapRouter | 0.008-0.015 | $20-40 |
| NFTMembership | 0.015-0.025 | $40-65 |
| ReferralPool | 0.008-0.015 | $20-40 |
| **TOTAL** | **0.046-0.085 ETH** | **$115-220** |

### **Base Mainnet - Phase 2:**

| Contract | Estimated Gas (ETH) | Cost (USD) |
|----------|---------------------|------------|
| LendingMarket | 0.015-0.03 | $40-75 |
| Stablecoin | 0.01-0.02 | $25-50 |
| Airdrop | 0.005-0.01 | $15-25 |
| **TOTAL** | **0.03-0.06 ETH** | **$80-150** |

### **Grand Total (Base Mainnet):**
- **Phase 1 + Phase 2: $195-370**
- **Recommended budget: $500** (for safety margin)

---

## 📋 PRE-DEPLOYMENT CHECKLIST

### **Before Deploying:**

- [ ] **Fund deployment wallet** with 0.1 ETH (~$250)
- [ ] **Test all contracts** on Base Sepolia (already done ✅)
- [ ] **Verify contract code** compiles without errors
- [ ] **Prepare constructor parameters** (addresses, values)
- [ ] **Set up .env file** with mainnet configuration
- [ ] **Backup private key** securely
- [ ] **Plan deployment order** (follow guide above)

### **.env Configuration:**

```env
# Base Mainnet
BASE_RPC_URL=https://mainnet.base.org
DEPLOYER_PRIVATE_KEY=your_private_key_here
BASESCAN_API_KEY=your_api_key_here

# Treasury addresses
TREASURY_WALLET=your_treasury_address
FEE_RECIPIENT=your_fee_recipient_address
```

---

## 🚀 DEPLOYMENT COMMANDS

### **Quick Deploy All Phase 1:**

```bash
#!/bin/bash
# deploy-phase1.sh

echo "🚀 Starting Phase 1 Deployment to Base Mainnet..."

# 1. Deploy DWT Token
echo "1/5 Deploying DWT Token..."
npx hardhat run scripts/deploy-dwt-token.cjs --network base
sleep 10

# 2. Deploy FeeRouter
echo "2/5 Deploying FeeRouter..."
npx hardhat run scripts/deploy-fee-router.cjs --network base
sleep 10

# 3. Deploy SwapRouter
echo "3/5 Deploying SwapRouter..."
npx hardhat run scripts/deploy-swap-router.cjs --network base
sleep 10

# 4. Deploy NFT Membership
echo "4/5 Deploying NFT Membership..."
npx hardhat run scripts/deploy-nft-membership.cjs --network base
sleep 10

# 5. Deploy Referral Pool
echo "5/5 Deploying Referral Pool..."
npx hardhat run scripts/deploy-referral-pool.cjs --network base

echo "✅ Phase 1 Deployment Complete!"
```

---

## ✅ POST-DEPLOYMENT STEPS

### **After Each Deployment:**

1. **Save the contract address** (auto-saved to `deployments/`)
2. **Verify on BaseScan:**
   ```bash
   npx hardhat verify --network base \
     --contract contracts/ContractName.sol:ContractName \
     DEPLOYED_ADDRESS \
     CONSTRUCTOR_ARGS
   ```
3. **Test the contract** with small transactions
4. **Update frontend** with new address
5. **Document** the deployment

### **After All Phase 1 Deployments:**

1. **Update frontend contract addresses:**
   ```javascript
   // src/data/contracts.js
   export const MAINNET_CONTRACTS = {
     dwtToken: '0x...',
     feeRouter: '0x...',
     swapRouter: '0x...',
     nftMembership: '0x...',
     referralPool: '0x...'
   }
   ```

2. **Rebuild frontend:**
   ```bash
   npm run build
   ```

3. **Deploy to IPFS:**
   ```bash
   # Upload to Pinata or your IPFS service
   npx pinata-cli upload dist/
   ```

4. **Test end-to-end:**
   - Connect wallet
   - Make a small swap
   - Verify fees are collected
   - Check NFT minting
   - Test referral system

---

## 📊 DEPLOYMENT TRACKING

Use this table to track your progress:

| Contract | Deployed? | Address | Verified? | Tested? | Revenue Active? |
|----------|-----------|---------|-----------|---------|-----------------|
| DWTToken | ☐ | | ☐ | ☐ | N/A |
| FeeRouter | ☐ | | ☐ | ☐ | ☐ |
| SwapRouter | ☐ | | ☐ | ☐ | ☐ |
| NFTMembership | ☐ | | ☐ | ☐ | ☐ |
| ReferralPool | ☐ | | ☐ | ☐ | ☐ |
| LendingMarket | ☐ | | ☐ | ☐ | ☐ |
| Stablecoin | ☐ | | ☐ | ☐ | ☐ |
| Airdrop | ☐ | | ☐ | ☐ | ☐ |

---

## 🎯 RECOMMENDED ACTION PLAN

### **This Week:**
1. Fund wallet with 0.1 ETH
2. Deploy Phase 1 contracts (5 contracts)
3. Verify all on BaseScan
4. Update frontend
5. Test everything

### **Next Week:**
1. Monitor revenue collection
2. Fix any issues
3. Launch marketing campaign
4. Start NFT sales
5. Promote swap feature

### **Month 2:**
1. Deploy Phase 2 contracts (3 contracts)
2. Launch lending protocol
3. Apply for grants
4. Scale user acquisition

---

## 📞 RESOURCES

### **Deployment Scripts:**
Check `scripts/` directory for existing deployment scripts:
- `scripts/deploy-fee-router.cjs` ✅
- `scripts/deploy-referral-pool.cjs` ✅
- Create missing scripts for other contracts

### **Deployment Records:**
- `deployments/` folder - All testnet deployments
- Will contain mainnet deployments after execution

### **Documentation:**
- [revenue-streaming.md](./revenue-streaming.md) - Revenue activation guide
- [SMART_CONTRACT_STORAGE_GUIDE.md](./SMART_CONTRACT_STORAGE_GUIDE.md) - Storage architecture
- [COMPLETE_REVENUE_GUIDE.md](./COMPLETE_REVENUE_GUIDE.md) - Full revenue overview

---

## ❓ FAQ

### Q: How many contracts total?
**A:** 8 contracts for full functionality (5 in Phase 1, 3 in Phase 2)

### Q: Do I need to deploy all at once?
**A:** No! Deploy Phase 1 first (5 contracts), test, then Phase 2 later.

### Q: What if I only deploy FeeRouter?
**A:** You can start earning swap fees immediately. Add others later.

### Q: Should I deploy to Ethereum mainnet too?
**A:** Not yet. Start with Base (lower fees, your target market). Expand later.

### Q: How much ETH do I need?
**A:** Budget $500 worth of ETH for all Phase 1 + Phase 2 deployments.

### Q: What if deployment fails?
**A:** Check gas price, wallet balance, and contract code. Test on testnet first.

---

## 🎯 BOTTOM LINE

### **You need to deploy:**

**Immediate (This Week):**
1. ✅ DWTToken
2. ✅ FeeRouter ← **HIGHEST PRIORITY**
3. ✅ SwapRouter
4. ✅ NFTMembership
5. ✅ ReferralPool

**Later (Month 2):**
6. LendingMarket
7. Stablecoin
8. Airdrop

**Total Cost:** ~$200-400 for all 8 contracts on Base Mainnet

**Networks:** Start with **Base Mainnet ONLY**. Expand to other networks after 3-6 months based on user demand.

---

**Ready to deploy? Start with FeeRouter - it's your biggest revenue generator! 🚀**
