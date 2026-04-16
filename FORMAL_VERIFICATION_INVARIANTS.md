# 🔬 Formal Verification Invariants

## Overview
This document specifies the critical mathematical invariants that must hold true for the Layer 9 contracts at all times. These invariants can be verified using formal verification tools like Certora, Mythril, or custom model checkers.

---

## 1. LendingMarket Invariants

### INV-1: Solvency
**Property**: Total deposits >= Total borrows + Accrued interest
```solidity
invariant solvency() {
    totalDeposits >= totalBorrowed + accruedProtocolFees;
}
```

### INV-2: Collateralization Ratio
**Property**: Every position's collateral value >= debt * LTV ratio
```solidity
invariant collateralization(address user) {
    if (positions[user].principal > 0) {
        (collateralValue(positions[user].collateral) * ltv) / PRECISION 
        >= positions[user].principal;
    }
}
```

### INV-3: Health Factor
**Property**: Liquidatable positions have health factor < 1.0
```solidity
invariant liquidation_threshold(address user) {
    _healthFactor(user) < PRECISION 
    => canLiquidate(user);
}
```

### INV-4: Interest Accrual Monotonicity
**Property**: Accrued interest never decreases
```solidity
invariant interest_monotonic() {
    totalBorrowed >= old(totalBorrowed);
}
```

### INV-5: Share Conservation
**Property**: Total shares accurately represent proportional deposits
```solidity
invariant share_conservation() {
    totalShares > 0 => 
    sum(shares[user] for all users) == totalShares;
}
```

---

## 2. NFTMembership Invariants

### INV-6: Tier Hierarchy
**Property**: Higher tiers have strictly higher prices
```solidity
invariant tier_price_ordering(uint8 tier1, uint8 tier2) {
    tier1 > tier2 => tierConfigs[tier1].ethPrice > tierConfigs[tier2].ethPrice;
}
```

### INV-7: Supply Cap Enforcement
**Property**: Current supply never exceeds max supply
```solidity
invariant supply_cap(uint8 tier) {
    if (tierConfigs[tier].maxSupply > 0) {
        tierConfigs[tier].currentSupply <= tierConfigs[tier].maxSupply;
    }
}
```

### INV-8: Highest Tier Monotonicity
**Property**: highestTier[user] reflects actual highest tier owned
```solidity
invariant highest_tier_correct(address user) {
    highestTier[user] == max(tokenData[tokenOfOwner(user, i)].tier + 1 for all i);
}
```

### INV-9: Soulbound Immutability
**Property**: Soulbound tokens cannot be transferred
```solidity
invariant soulbound_nontransferable(uint256 tokenId) {
    if (tierConfigs[tokenData[tokenId].tier].soulbound) {
        ownerOf(tokenId) == old(ownerOf(tokenId));
    }
}
```

### INV-10: Expiry Validity
**Property**: Expired tokens cannot grant access
```solidity
invariant expired_no_access(uint256 tokenId) {
    if (tokenData[tokenId].expiry > 0 && block.timestamp > tokenData[tokenId].expiry) {
        hasAccess(ownerOf(tokenId), tokenData[tokenId].tier) == false;
    }
}
```

---

## 3. SwapRouter Invariants

### INV-11: Fee Collection
**Property**: Fees are always collected before swap execution
```solidity
invariant fee_collected_before_swap() {
    feeRouter.totalFeesCollected[token] >= old(feeRouter.totalFeesCollected[token]);
}
```

### INV-12: Slippage Protection
**Property**: Output amount >= minimum specified amount
```solidity
invariant slippage_protection(uint256 amountOut, uint256 amountOutMin) {
    amountOut >= amountOutMin;
}
```

### INV-13: Pool Reserves Conservation
**Property**: Pool reserves follow constant product formula (x * y = k)
```solidity
invariant constant_product(address pool) {
    reserveA * reserveB >= old(reserveA) * old(reserveB) - fee;
}
```

### INV-14: No Value Creation
**Property**: Swaps cannot create value out of thin air
```solidity
invariant no_value_creation() {
    valueOut <= valueIn * (1 + maxSlippageBps / 10000);
}
```

---

## 4. DWalletStablecoin Invariants

### INV-15: Full Collateralization
**Property**: Total collateral value >= Total debt outstanding
```solidity
invariant full_collateralization() {
    sum(collateralValue(token) for all tokens) >= totalDebt;
}
```

### INV-16: Debt Ceiling
**Property**: Total debt never exceeds global ceiling
```solidity
invariant debt_ceiling() {
    totalDebt <= globalDebtCeiling;
}
```

### INV-17: Per-Collateral Debt Ceiling
**Property**: Individual collateral debt within limits
```solidity
invariant collateral_debt_ceiling(address token) {
    collateralConfigs[token].totalDebt <= collateralConfigs[token].debtCeiling;
}
```

### INV-18: Vault Solvency
**Property**: Every vault maintains minimum collateralization
```solidity
invariant vault_solvency(address user, address collateral) {
    if (vaults[user][collateral].debt > 0) {
        getCollateralizationRatio(user, collateral) >= 
        collateralConfigs[collateral].minCollateralizationRatio;
    }
}
```

### INV-19: Stability Fee Accrual
**Property**: Stability fees increase monotonically
```solidity
invariant fee_accrual_monotonic() {
    vault.debt >= old(vault.debt) - repayments;
}
```

### INV-20: Peg Stability
**Property**: dUSD supply matches backing assets in PSM
```solidity
invariant peg_stability() {
    totalSupply == sum(PSM_reserves) + sum(vault_debts) - protocol_fees;
}
```

---

## 5. Cross-Contract Invariants

### INV-21: No Circular Debt
**Property**: LendingMarket debt and Stablecoin debt are independent
```solidity
invariant no_circular_debt() {
    !exists(user) such that:
        LendingMarket.borrowed(user) > 0 && 
        Stablecoin.debt(user) > collateralValue(user) * 2;
}
```

### INV-22: Fee Router Balance
**Property**: FeeRouter balance matches accumulated fees
```solidity
invariant fee_router_balance() {
    FeeRouter.balance(token) == sum(all fees collected in token);
}
```

### INV-23: Access Control Consistency
**Property**: Role assignments are consistent across contracts
```solidity
invariant role_consistency() {
    governor in LendingMarket => governor in SwapRouter => governor in Stablecoin;
}
```

---

## 6. Security Invariants

### INV-24: Pause State Propagation
**Property**: When paused, no state-changing operations succeed
```solidity
invariant pause_enforcement() {
    paused() => 
    !canMint() && !canBorrow() && !canSwap() && !canLiquidate();
}
```

### INV-25: Oracle Freshness
**Property**: Prices used are not stale
```solidity
invariant oracle_freshness() {
    block.timestamp - lastPriceUpdate < MAX_STALENESS_PERIOD;
}
```

### INV-26: No Unauthorized Mints
**Property**: dUSD can only be minted against valid collateral
```solidity
invariant authorized_minting() {
    totalSupply == sum(all minted against collateral) + PSM_mints;
}
```

---

## Verification Tools

### Certora Prover
```bash
# Install Certora
pip install certora-cli

# Run verification
certoraRun specs/LendingMarket.spec \
    --solc contracts/layer9/LendingMarket.sol \
    --rule solvency collateralization health_factor
```

### Mythril
```bash
# Install Mythril
pip install mythril

# Run symbolic execution
myth analyze contracts/layer9/LendingMarket.sol --execution-timeout 300
```

### Slither Static Analysis
```bash
# Install Slither
pip3 install slither-analyzer

# Run analysis
slither contracts/layer9/ --print human-summary
slither contracts/layer9/ --detect reentrancy,uninitialized-state
```

### Echidna Fuzzing
```bash
# Install Echidna
# Follow: https://github.com/crytic/echidna

# Run property-based testing
echidna-test contracts/layer9/LendingMarket.sol --contract LendingMarket --test-mode assertion
```

---

## Critical Properties to Verify

### Priority 1 (Must Verify)
1. ✅ **Solvency** (INV-1): Protocol always has enough assets
2. ✅ **Collateralization** (INV-2): No undercollateralized positions
3. ✅ **Full Collateralization** (INV-15): Stablecoin fully backed
4. ✅ **Debt Ceiling** (INV-16): Cannot exceed limits

### Priority 2 (Should Verify)
5. ⚠️ **Interest Monotonicity** (INV-4): Interest always increases
6. ⚠️ **Slippage Protection** (INV-12): Users get expected output
7. ⚠️ **Vault Solvency** (INV-18): Individual vaults healthy
8. ⚠️ **Pause Enforcement** (INV-24): Pause works correctly

### Priority 3 (Nice to Verify)
9. 📝 **Tier Hierarchy** (INV-6): Pricing is logical
10. 📝 **Soulbound Immutability** (INV-9): Cannot transfer soulbound
11. 📝 **Fee Collection** (INV-11): Fees always collected
12. 📝 **Oracle Freshness** (INV-25): Prices are current

---

## Test Results

| Invariant | Status | Tool | Date |
|-----------|--------|------|------|
| INV-1: Solvency | ✅ Manual Review | Code Audit | 2026-04-16 |
| INV-2: Collateralization | ✅ Unit Tests | Hardhat | 2026-04-16 |
| INV-15: Full Collateralization | ✅ Manual Review | Code Audit | 2026-04-16 |
| INV-16: Debt Ceiling | ✅ Unit Tests | Hardhat | 2026-04-16 |
| INV-18: Vault Solvency | ⚠️ Partial | Unit Tests | 2026-04-16 |
| INV-24: Pause Enforcement | ✅ Unit Tests | Hardhat | 2026-04-16 |

---

## Next Steps

1. **Set Up Certora**: Formal verification of Priority 1 invariants
2. **Echidna Fuzzing**: Property-based testing for edge cases
3. **Mythril Analysis**: Symbolic execution for reentrancy
4. **Continuous Verification**: Integrate into CI/CD pipeline
5. **Audit Report**: Include formal verification in professional audit

---

**Created**: April 16, 2026  
**Status**: Invariants Specified, Pending Formal Verification  
**Priority**: Complete before mainnet deployment
