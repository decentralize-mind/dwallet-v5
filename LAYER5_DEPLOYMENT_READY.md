# 🚀 Layer 5 Deployment Guide - 500K DWT Ready!

**Date**: April 17, 2026  
**Status**: ✅ READY TO DEPLOY

---

## ✅ Token Status

**You now have 500,000 DWT tokens!**

- **Token Contract**: `0x769F23dd0F6bc92C9d9d914190Ae9006d3FbDe48`
- **Your Wallet**: `0x4C0B7314441dfE8E61267C0d87Fc1A657611dCf5`
- **Balance**: 500,000 DWT ✅
- **Network**: Base Sepolia
- **ETH Balance**: 5.64 ETH (sufficient for deployment)

**Explorer Link**: https://sepolia.basescan.org/token/0x769F23dd0F6bc92C9d9d914190Ae9006d3FbDe48?a=0x4C0B7314441dfE8E61267C0d87Fc1A657611dCf5

---

## 📋 Layer 5 Deployment Steps

### Step 1: Deploy Phase 2 Contracts (LimitOrders & LiquidityIncentive)

```bash
npx hardhat run scripts/deploy-layer5-phase2.cjs --network baseSepolia
```

**This will deploy:**
- ✅ LimitOrders - Advanced order book with oracle validation
- ✅ LiquidityIncentive - Liquidity mining rewards

**Prerequisites already met:**
- ✅ Price Oracle: `0x22830a8c7fb402517809F79D242A57Fb1BBA2b40`
- ✅ Uniswap V3 Position Manager: `0x27F971cb582BF9E50F397e4d29a5C7A34f11faA2`
- ✅ Layer 7 Security: `0x20d859c9EB3FA612C604213F74dcC6Ae49Cd040c`

---

### Step 2: Fund Layer 5 Pools

After Phase 2 deployment, fund the pools with your 500K DWT:

```bash
npx hardhat run scripts/fund-layer5-pools.cjs --network baseSepolia
```

**This will:**
- Transfer 50,000 DWT to FlashLoan contract
- Deposit 100,000 DWT to InsuranceFund contract
- Keep 350,000 DWT in your wallet for LiquidityIncentive rewards

**Pool Addresses:**
- FlashLoan: `0x468772f20864403A0071690ef8c620D9E02BD649`
- InsuranceFund: `0x8ba2Bb332764217079DFFb280dD70C8B351B5770`

---

### Step 3: Configure LiquidityIncentive Pools

After funding, add liquidity pools for rewards:

```bash
npx hardhat console --network baseSepolia
```

```javascript
// Get the LiquidityIncentive contract (replace with deployed address)
const liquidityIncentive = await ethers.getContractAt(
  "LiquidityIncentive", 
  "0x...DEPLOYED_ADDRESS..."
);

// Add a reward pool (example: DWT/ETH pair)
await liquidityIncentive.addPool(
  "0x769F23dd0F6bc92C9d9d914190Ae9006d3FbDe48", // DWT token
  "0x4200000000000000000000000000000000000006", // WETH on Base
  1000  // Allocation points
);

// Fund the pool with rewards
const dwtToken = await ethers.getContractAt(
  "DWTTokenEnhanced",
  "0x769F23dd0F6bc92C9d9d914190Ae9006d3FbDe48"
);

await dwtToken.approve("0x...DEPLOYED_ADDRESS...", ethers.parseEther("100000"));
await liquidityIncentive.fundPool(
  "0x769F23dd0F6bc92C9d9d914190Ae9006d3FbDe48",
  "0x4200000000000000000000000000000000000006",
  ethers.parseEther("100000")
);
```

---

## 📊 Complete Layer 5 Architecture

### Phase 1 (Already Deployed ✅)
| Contract | Address | Status |
|----------|---------|--------|
| CrossChainMessenger | `0x64f3fFdE0bbA86e072a2595Cd550AeC44a1e0e38` | ✅ LIVE |
| FlashLoan | `0x468772f20864403A0071690ef8c620D9E02BD649` | ✅ LIVE |
| InsuranceFund | `0x8ba2Bb332764217079DFFb280dD70C8B351B5770` | ✅ LIVE |

### Phase 2 (Ready to Deploy)
| Contract | Prerequisites | Status |
|----------|---------------|--------|
| LimitOrders | Price Oracle ✅ | ⏳ Ready |
| LiquidityIncentive | Uniswap V3 ✅ | ⏳ Ready |

---

## 🔗 Verification Links

### Token
- **Your Token**: https://sepolia.basescan.org/address/0x769F23dd0F6bc92C9d9d914190Ae9006d3FbDe48
- **Your Wallet**: https://sepolia.basescan.org/address/0x4C0B7314441dfE8E61267C0d87Fc1A657611dCf5

### Layer 5 Contracts
- CrossChainMessenger: https://sepolia.basescan.org/address/0x64f3fFdE0bbA86e072a2595Cd550AeC44a1e0e38
- FlashLoan: https://sepolia.basescan.org/address/0x468772f20864403A0071690ef8c620D9E02BD649
- InsuranceFund: https://sepolia.basescan.org/address/0x8ba2Bb332764217079DFFb280dD70C8B351B5770

---

## ⚡ Quick Commands

```bash
# 1. Deploy Phase 2
npx hardhat run scripts/deploy-layer5-phase2.cjs --network baseSepolia

# 2. Fund pools
npx hardhat run scripts/fund-layer5-pools.cjs --network baseSepolia

# 3. Verify contracts on BaseScan (after deployment)
npx hardhat run scripts/verify-layer5.cjs --network baseSepolia

# 4. Test integration
npx hardhat run scripts/test-layer5-integration.cjs --network baseSepolia
```

---

## 🎯 Token Allocation Plan

From your 500,000 DWT:
- **50,000 DWT** → FlashLoan pool (for flash loans)
- **100,000 DWT** → InsuranceFund (for claims)
- **100,000 DWT** → LiquidityIncentive rewards
- **250,000 DWT** → Keep in wallet for future use/testing

---

## ✅ Pre-Deployment Checklist

- [x] Wallet has 500,000 DWT tokens
- [x] Wallet has 5.64 ETH for gas
- [x] Layer 5 Phase 1 deployed
- [x] Price Oracle available
- [x] Uniswap V3 Position Manager available
- [x] Layer 7 Security active
- [ ] Deploy Phase 2 contracts
- [ ] Fund Layer 5 pools
- [ ] Verify contracts on BaseScan
- [ ] Run integration tests

---

## 🚀 Ready to Deploy!

You have everything you need. Run the deployment command to complete Layer 5!

```bash
npx hardhat run scripts/deploy-layer5-phase2.cjs --network baseSepolia
```

---

**Created**: April 17, 2026  
**Network**: Base Sepolia  
**Status**: READY FOR DEPLOYMENT ✅
