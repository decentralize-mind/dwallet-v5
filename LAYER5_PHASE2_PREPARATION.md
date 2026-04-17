# 🚀 Layer 5 Phase 2 Deployment Preparation

## 📋 Phase 2 Contracts

Phase 2 includes deployment of two advanced DeFi contracts:

1. **LimitOrders** - EIP-712 signed limit orders with oracle price validation
2. **LiquidityIncentive** - Uniswap V3 NFT LP staking with rewards

---

## ⚠️ Prerequisites Required

### 1. Price Oracle Address

**Purpose:** Used by LimitOrders to validate fill prices

**Options:**
- **Chainlink Price Feed** (Recommended)
  - Get address from: https://docs.chain.link/data-feeds/price-feeds/addresses?network=base&page=1
  - Example: ETH/USD feed on Base Sepolia
  
- **Custom Oracle**
  - Deploy your own price feed oracle
  - Must implement `getLatestPrice()` function

**What we need:**
```
PRICE_ORACLE_ADDRESS=0x...
```

---

### 2. Uniswap V3 Position Manager Address

**Purpose:** Used by LiquidityIncentive to verify real NFT liquidity

**Options:**
- **Official Uniswap V3 on Base Sepolia**
  - NonfungiblePositionManager contract address
  
- **Custom AMM**
  - Any Uniswap V3-compatible position manager

**What we need:**
```
UNISWAP_POSITION_MANAGER=0x...
```

---

## 🔍 How to Find These Addresses

### Finding Price Oracle on Base Sepolia

1. **Chainlink Feeds:**
   ```
   Visit: https://docs.chain.link/data-feeds/price-feeds/addresses
   Filter: Network = Base Sepolia
   Select: Your desired price feed (e.g., ETH/USD)
   ```

2. **Common Base Sepolia Oracles:**
   - ETH/USD: Check Chainlink docs for latest address
   - DWT/USD: May need custom deployment

### Finding Uniswap V3 on Base Sepolia

1. **Official Uniswap Deployments:**
   ```
   Visit: https://docs.uniswap.org/contracts/v3/reference/deployments
   Look for: Base Sepolia testnet addresses
   ```

2. **Common Addresses:**
   - NonfungiblePositionManager: Check Uniswap docs
   - SwapRouter: Check Uniswap docs

---

## 📝 Once You Have the Addresses

### Step 1: Update Environment Variables

Add to `.env`:
```bash
# Layer 5 Phase 2 Addresses
PRICE_ORACLE_ADDRESS=0x...
UNISWAP_POSITION_MANAGER=0x...
```

### Step 2: Deploy Phase 2

Run the deployment script:
```bash
npx hardhat run scripts/deploy-layer5-phase2.cjs --network baseSepolia
```

### Step 3: Verify Deployment

The script will output:
- Contract addresses
- Configuration details
- BaseScan links

---

## 🏗️ Deployment Script Details

### LimitOrders Constructor Parameters:
```solidity
constructor(
    address _admin,              // 0x4C0B7314441dfE8E61267C0d87Fc1A657611dCf5
    address _priceOracle,        // [NEEDED]
    address _layer7Security,     // 0x20d859c9EB3FA612C604213F74dcC6Ae49Cd040c
    address _guardian            // 0x4C0B7314441dfE8E61267C0d87Fc1A657611dCf5
)
```

### LiquidityIncentive Constructor Parameters:
```solidity
constructor(
    address _admin,              // 0x4C0B7314441dfE8E61267C0d87Fc1A657611dCf5
    address _positionManager,    // [NEEDED]
    address _rewardToken,        // 0xe149b32b97384131204C86a23459b544498BC46A (DWT)
    address _layer7Security,     // 0x20d859c9EB3FA612C604213F74dcC6Ae49Cd040c
    address _guardian            // 0x4C0B7314441dfE8E61267C0d87Fc1A657611dCf5
)
```

---

## 🎯 Expected Outcome

After Phase 2 deployment:

### LimitOrders Features:
- ✅ EIP-712 signed orders
- ✅ Oracle price validation (±5% slippage protection)
- ✅ Partial fills supported
- ✅ Filler incentives (0.10% fee)
- ✅ Order expiration
- ✅ Nonce-based replay protection

### LiquidityIncentive Features:
- ✅ Uniswap V3 NFT staking
- ✅ Real liquidity verification (cannot fake)
- ✅ Multi-pool reward distribution
- ✅ Time-weighted rewards
- ✅ Emergency withdrawal
- ✅ Reward rate configuration

---

## 📊 Complete Layer 5 Architecture

### Phase 1 (Deployed ✅):
- CrossChainMessenger
- FlashLoan
- InsuranceFund

### Phase 2 (Pending ⏳):
- LimitOrders
- LiquidityIncentive

### Total Layer 5:
- **5 Contracts**
- **~2,000 lines of Solidity**
- **100% Security Integration (Layer 7)**
- **Full Test Coverage (40+ tests)**

---

## 🔐 Security Features

All Phase 2 contracts include:
- ✅ Layer 7 Security gating
- ✅ Emergency pause
- ✅ Guardian halt
- ✅ Role-based access control
- ✅ Reentrancy protection
- ✅ Rate limiting
- ✅ Input validation

---

## 📈 Configuration After Deployment

### LimitOrders Configuration:
```javascript
// Set filler fee (default 0.10%)
await limitOrders.setFillerFee(10); // 10 bps = 0.10%

// Set max slippage (default 5%)
await limitOrders.setMaxSlippagePercent(5);
```

### LiquidityIncentive Configuration:
```javascript
// Add reward pool
await liquidityIncentive.addPool(
    "ETH-DWT Pool",
    1000, // 1000 DWT per day
    365 days
);

// Set reward rate
await liquidityIncentive.setRewardRate(poolId, 1000);
```

---

## 🚦 Readiness Checklist

### Before Deployment:
- [ ] Price Oracle address obtained
- [ ] Uniswap V3 Position Manager address obtained
- [ ] Addresses added to .env file
- [ ] Deployer has sufficient ETH for gas
- [ ] DWT token address confirmed: `0xe149b32b97384131204C86a23459b544498BC46A`

### After Deployment:
- [ ] LimitOrders deployed successfully
- [ ] LiquidityIncentive deployed successfully
- [ ] Contracts verified on BaseScan
- [ ] Initial configuration complete
- [ ] Test transactions executed
- [ ] Documentation updated

---

## 📞 Need Help?

### Finding Addresses:
- Chainlink: https://docs.chain.link
- Uniswap: https://docs.uniswap.org
- Base Sepolia Explorer: https://sepolia.basescan.org

### Contract Questions:
- Review source code: `contracts/layer5/`
- Check tests: `test/layer5/`
- Read docs: `contracts/layer5/README.md`

---

**Status:** ⏳ Waiting for prerequisite addresses  
**Next Step:** Obtain oracle and Uniswap addresses, then run deployment
