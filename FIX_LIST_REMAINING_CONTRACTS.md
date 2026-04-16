# 🔧 Fix List - Remaining 15 Contracts

**Task:** Fix `_initSecurityModules` → `_initSecuritySystem` compilation errors  
**Priority:** High (blocks test execution)  
**Estimated Time:** 30-60 minutes

---

## ✅ Already Fixed (2 contracts)

1. ✅ `contracts/layer0/NetworkConfig.sol` - Fixed
2. ✅ `contracts/layer0/ProtocolRegistry.sol` - Fixed

---

## ⏳ Remaining Contracts to Fix (15 files)

### Layer 1 (3 contracts)
1. **`contracts/layer1/DWTToken.sol`**
   - Line: ~80
   - Change constructor params from 9 to 3

2. **`contracts/layer1/Treasury.sol`**
   - Line: ~48
   - Change constructor params from 9 to 3

3. **`contracts/layer1/DWTStaking.sol`**
   - Line: ~56
   - Change constructor params from 9 to 3

### Layer 2 (1 contract)
4. **`contracts/layer2/contracts/SwapRouter.sol`**
   - Line: ~96
   - Change constructor params from 9 to 3

### Layer 3 (2 contracts)
5. **`contracts/layer3/EmergencyPause.sol`**
   - Line: ~69
   - Change constructor params from 9 to 3

6. **`contracts/layer3/DWalletMultisig.sol`**
   - Line: ~104
   - Change constructor params from 9 to 3

### Layer 4 (2 contracts)
7. **`contracts/layer4/contracts/BoostedStaking.sol`**
   - Line: ~87
   - Change constructor params from 9 to 3

8. **`contracts/layer4/contracts/StakingPool.sol`**
   - Line: ~41
   - Change constructor params from 9 to 3

### Layer 6 (2 contracts)
9. **`contracts/layer6/contracts/Treasury.sol`**
   - Line: ~215
   - Change constructor params from 9 to 3

10. **`contracts/layer6/contracts/VestingContract.sol`**
    - Line: ~179
    - Change constructor params from 9 to 3

### Layer 9 (3 contracts)
11. **`contracts/layer9/AffiliateRewards.sol`**
    - Line: ~159
    - Change constructor params from 9 to 3

12. **`contracts/layer9/Launchpad.sol`**
    - Line: ~152
    - Change constructor params from 9 to 3

13. **`contracts/layer9/LendingMarket.sol`**
    - Line: ~157
    - Change constructor params from 9 to 3

### Layer 10 (2 contracts)
14. **`contracts/layer10/DWTOracle.sol`**
    - Lines: ~53, ~107 (2 instances!)
    - Change constructor params from 9 to 3

15. **`contracts/layer10/DWTOptions.sol`**
    - Line: ~94
    - Change constructor params from 9 to 3

### Layer 8 (1 contract)
16. **`contracts/layer8/CrossChainStaking.sol`**
    - Line: ~320
    - Change constructor params from 9 to 3

---

## 🔨 Required Changes Per File

### For EACH contract above, apply this change:

**OLD (Current):**
```solidity
constructor(
    address _admin,
    address _governor,
    address _securityController,
    address _registry,
    address _access,
    address _time,
    address _state,
    address _rate,
    address _verify
) SecurityGated(_securityController) {
    // ... initialization code ...
    _initSecurityModules(_registry, _access, _time, _state, _rate, _verify);
}
```

**NEW (Fixed):**
```solidity
constructor(
    address _admin,
    address _governor,
    address _securityController,
    address _registry,
    address _lockEngine,
    address _invariantChecker
) SecurityGated(_securityController) {
    // ... initialization code ...
    _initSecuritySystem(_registry, _lockEngine, _invariantChecker);
}
```

---

## 📋 Fix Priority Order

### Phase 1: Core Infrastructure (Recommended to fix first)
1. Layer 1 - DWTToken.sol (core token)
2. Layer 1 - Treasury.sol (treasury management)
3. Layer 1 - DWTStaking.sol (staking logic)

### Phase 2: DEX & Trading
4. Layer 2 - SwapRouter.sol (DEX router)
5. Layer 10 - DWTOracle.sol (price oracle)
6. Layer 10 - DWTOptions.sol (options trading)

### Phase 3: Business Logic
7. Layer 6 - Treasury.sol (fee splitter)
8. Layer 6 - VestingContract.sol (token vesting)
9. Layer 9 - LendingMarket.sol (lending)
10. Layer 9 - Launchpad.sol (IDO platform)
11. Layer 9 - AffiliateRewards.sol (referrals)

### Phase 4: Staking & Security
12. Layer 3 - EmergencyPause.sol (emergency controls)
13. Layer 3 - DWalletMultisig.sol (multisig wallet)
14. Layer 4 - BoostedStaking.sol (boosted staking)
15. Layer 4 - StakingPool.sol (staking pools)

### Phase 5: Cross-Chain
16. Layer 8 - CrossChainStaking.sol (cross-chain staking)

---

## 🎯 Quick Fix Script (Pseudo-code)

```bash
# For each file in the list:
# 1. Find constructor signature
# 2. Replace 9 params with 6 params
# 3. Replace function call
# 4. Verify compilation

# Example for one file:
sed -i 's/_initSecurityModules(_registry, _access, _time, _state, _rate, _verify)/_initSecuritySystem(_registry, _lockEngine, _invariantChecker)/g' contracts/layer1/DWTToken.sol

# Update constructor params:
sed -i 's/address _access,\n        address _time,\n        address _state,\n        address _rate,\n        address _verify/address _lockEngine,\n        address _invariantChecker/g' contracts/layer1/DWTToken.sol
```

---

## ✅ Verification Checklist

After fixing all files:

```bash
# Compile all contracts
npx hardhat compile

# Expected result: No DeclarationError for _initSecurityModules

# Run tests
npx hardhat test test/DWTPerpetuals_OracleStaleness.test.cjs --network hardhat

# Expected result: All 31 tests pass ✅
```

---

## 🚀 After Fix Completion

Once all 15 contracts are fixed:

1. ✅ Full compilation succeeds
2. ✅ Test suite runs successfully
3. ✅ Ready for testnet deployment
4. ✅ Can proceed with professional audit

---

**Status:** Ready to implement  
**Impact:** Unlocks full test suite and compilation  
**Risk:** Low (mechanical find-replace operation)  
