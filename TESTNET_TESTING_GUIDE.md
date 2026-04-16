# 🧪 Testnet Testing Guide - Layer 9 DeFi Protocol

**Network:** Base Sepolia Testnet  
**Testing Phase:** Open Beta  
**Last Updated:** April 16, 2026

---

## 🎯 Testing Objectives

1. **Functional Testing**: Verify all contract features work as expected
2. **User Experience**: Test UI/UX flows and error handling
3. **Security Testing**: Identify potential vulnerabilities
4. **Performance Testing**: Test under various load conditions
5. **Integration Testing**: Verify cross-contract interactions

---

## 📋 Prerequisites

### 1. Get Base Sepolia ETH

**Faucets:**
- QuickNode: https://faucet.quicknode.com/base/sepolia
- Coinbase: https://portal.cdp.coinbase.com/products/faucet
- Alchemy: https://sepoliafaucet.com/

**Required:** Minimum 0.1 ETH for testing

### 2. Get Test Tokens

**DWT Token:**
- Address: `0x3400b0167dA5b2dba0b88b9604eE7df4BFc1f1fa`
- Contact deployer (`0x4C0B7314441dfE8E61267C0d87Fc1A657611dCf5`) for test tokens
- Or deploy your own mock token for testing

**USDC Token:**
- Address: `0x036CbD53842c5426634e7929541eC2318f3dCF7e`
- Already deployed on Base Sepolia

### 3. Setup Wallet

1. Install MetaMask or compatible wallet
2. Add Base Sepolia network (see below)
3. Import test account with ETH

**Add Base Sepolia to MetaMask:**
- Network Name: Base Sepolia
- RPC URL: `https://sepolia.base.org`
- Chain ID: `84532`
- Currency Symbol: ETH
- Block Explorer: `https://sepolia.basescan.org`

---

## 🧪 Test Scenarios

### Scenario 1: NFT Membership Minting

**Objective:** Test NFT minting with ETH and DWT

#### Test 1.1: Mint Bronze NFT with ETH

**Steps:**
1. Connect wallet to Base Sepolia
2. Navigate to NFT minting page
3. Select Bronze tier
4. Click "Mint with ETH"
5. Confirm transaction (0.05 ETH)
6. Wait for confirmation

**Expected Result:**
- ✅ Transaction succeeds
- ✅ NFT appears in wallet
- ✅ Token ID assigned
- ✅ Expiry date set (365 days)

**Verify on Explorer:**
```
https://sepolia.basescan.org/address/0x74297Fa47E6103148D3A4119d7B00C6a94B927D7
```

**Pass/Fail:** _________

**Notes:** _________

---

#### Test 1.2: Mint Silver NFT with DWT

**Steps:**
1. Ensure wallet has DWT tokens (minimum 500 DWT)
2. Approve DWT spending for NFT contract
3. Select Silver tier
4. Click "Mint with DWT"
5. Confirm transaction
6. Wait for confirmation

**Expected Result:**
- ✅ DWT approval succeeds
- ✅ Transaction succeeds
- ✅ NFT minted with Silver tier
- ✅ DWT tokens transferred

**Pass/Fail:** _________

**Notes:** _________

---

#### Test 1.3: Check Access Permissions

**Steps:**
1. Query `highestTier(userAddress)`
2. Query `hasAccess(userAddress, 2)` for Gold tier
3. Query `hasAccess(userAddress, 1)` for Silver tier

**Expected Result:**
- ✅ Bronze holder: highestTier=0, hasAccess(Gold)=false, hasAccess(Silver)=true
- ✅ Silver holder: highestTier=1, hasAccess(Gold)=false, hasAccess(Silver)=true

**Pass/Fail:** _________

**Notes:** _________

---

### Scenario 2: Stablecoin (dUSD) Operations

**Objective:** Test minting, burning, and collateralization

#### Test 2.1: Mint dUSD with DWT Collateral

**Steps:**
1. Check DWT balance (need minimum 3,000 DWT for 1,000 dUSD)
2. Approve DWT for stablecoin contract
3. Call `mint(DWT, 3000 DWT, 1000 dUSD)`
4. Wait for confirmation
5. Check dUSD balance
6. Check vault health factor

**Expected Result:**
- ✅ Transaction succeeds
- ✅ 1,000 dUSD minted to wallet
- ✅ 3,000 DWT locked in vault
- ✅ Health factor > 2.0 (300% collateralization)
- ✅ Global debt ceiling updated

**Calculate Health Factor:**
```
Collateral Value = 3,000 DWT × $1.50 = $4,500
Debt Value = 1,000 dUSD × $1.00 = $1,000
Health Factor = $4,500 / $1,000 = 4.5
```

**Pass/Fail:** _________

**Notes:** _________

---

#### Test 2.2: Mint dUSD with USDC Collateral

**Steps:**
1. Check USDC balance (need minimum 1,100 USDC for 1,000 dUSD)
2. Approve USDC for stablecoin
3. Call `mint(USDC, 1100 USDC, 1000 dUSD)`
4. Wait for confirmation
5. Check health factor

**Expected Result:**
- ✅ Transaction succeeds (110% collateralization)
- ✅ Health factor > 1.1
- ✅ USDC locked in vault

**Pass/Fail:** _________

**Notes:** _________

---

#### Test 2.3: Burn dUSD and Redeem Collateral

**Steps:**
1. Check current dUSD balance
2. Approve dUSD spending
3. Call `burn(500 dUSD)`
4. Check dUSD balance (should decrease)
5. Check vault collateral (should be released)
6. Call `redeem(DWT)` to claim collateral

**Expected Result:**
- ✅ dUSD burned successfully
- ✅ dUSD balance decreased by 500
- ✅ Proportional collateral released
- ✅ Can redeem collateral

**Pass/Fail:** _________

**Notes:** _________

---

#### Test 2.4: Test Under-Collateralization (Should Fail)

**Steps:**
1. Try to mint 1,000 dUSD with only 1,500 DWT (150% ratio)
2. Transaction should revert

**Expected Result:**
- ❌ Transaction reverts with "CollateralizationTooLow"
- ✅ Error message displayed to user

**Pass/Fail:** _________

**Notes:** _________

---

### Scenario 3: FeeRouter Operations

**Objective:** Test fee collection and distribution

#### Test 3.1: Check Fee Configuration

**Steps:**
1. Query `baseFeeBps()` - should return 30
2. Query `lpShareBps()` - should return 7000
3. Query discount tiers

**Expected Result:**
- ✅ Base fee: 30 bps (0.30%)
- ✅ LP share: 70%
- ✅ Treasury share: 30%
- ✅ Discount tiers configured

**Pass/Fail:** _________

**Notes:** _________

---

### Scenario 4: SwapRouter Integration

**Objective:** Test swap functionality (requires liquidity pools)

#### Test 4.1: Get Swap Quote

**Steps:**
1. Call `getAmountOut(DWT, USDC, 100 DWT)`
2. Check returned amount

**Expected Result:**
- ✅ Returns valid quote
- ✅ Amount out > 0
- ✅ Price reasonable

**Pass/Fail:** _________

**Notes:** _________

---

### Scenario 5: Security Features

**Objective:** Test pause, access control, and rate limiting

#### Test 5.1: Test Guardian Pause

**Steps:**
1. Use guardian account
2. Call `pause()` on stablecoin
3. Try to mint dUSD (should fail)
4. Call `unpause()`
5. Try to mint dUSD (should succeed)

**Expected Result:**
- ✅ Pause succeeds
- ✅ Mint fails when paused
- ✅ Unpause succeeds
- ✅ Mint works after unpause

**Pass/Fail:** _________

**Notes:** _________

---

#### Test 5.2: Test Role-Based Access

**Steps:**
1. Use non-governor account
2. Try to call `configureCollateral()` (should fail)
3. Use governor account
4. Call `configureCollateral()` (should succeed)

**Expected Result:**
- ✅ Non-governor call fails with access control error
- ✅ Governor call succeeds

**Pass/Fail:** _________

**Notes:** _________

---

### Scenario 6: Edge Cases

**Objective:** Test boundary conditions

#### Test 6.1: Maximum Mint Amount

**Steps:**
1. Try to mint dUSD up to debt ceiling
2. Try to mint 1 wei over debt ceiling (should fail)

**Expected Result:**
- ✅ Mint succeeds up to ceiling
- ❌ Mint fails when exceeding ceiling

**Pass/Fail:** _________

**Notes:** _________

---

#### Test 6.2: Zero Amount Operations

**Steps:**
1. Try to mint 0 dUSD
2. Try to burn 0 dUSD
3. Try to deposit 0 collateral

**Expected Result:**
- ❌ All should fail with "ZeroAmount" error

**Pass/Fail:** _________

**Notes:** _________

---

#### Test 6.3: Multiple NFT Tiers

**Steps:**
1. Mint Bronze NFT
2. Mint Silver NFT
3. Check highestTier (should be Silver=1)
4. Mint Gold NFT
5. Check highestTier (should be Gold=2)

**Expected Result:**
- ✅ All mints succeed
- ✅ highestTier updates correctly
- ✅ Access permissions grant highest tier

**Pass/Fail:** _________

**Notes:** _________

---

## 📊 Test Results Summary

### Overall Statistics

| Category | Total Tests | Passed | Failed | Skipped | Pass Rate |
|----------|-------------|--------|--------|---------|-----------|
| NFT Minting | 3 | ___ | ___ | ___ | ___% |
| Stablecoin | 4 | ___ | ___ | ___ | ___% |
| FeeRouter | 1 | ___ | ___ | ___ | ___% |
| SwapRouter | 1 | ___ | ___ | ___ | ___% |
| Security | 2 | ___ | ___ | ___ | ___% |
| Edge Cases | 3 | ___ | ___ | ___ | ___% |
| **TOTAL** | **14** | ___ | ___ | ___ | ___% |

---

## 🐛 Bug Reporting Template

When reporting bugs, use this format:

```markdown
**Bug Title:** [Brief description]

**Severity:** Critical / High / Medium / Low

**Category:** NFT / Stablecoin / Swap / Security / UI

**Steps to Reproduce:**
1. Step 1
2. Step 2
3. Step 3

**Expected Behavior:**
What should happen

**Actual Behavior:**
What actually happened

**Transaction Hash:**
0x...

**Wallet Address:**
0x...

**Screenshots:**
[Attach if applicable]

**Environment:**
- Browser: Chrome/Firefox/Safari
- Wallet: MetaMask/WalletConnect
- Network: Base Sepolia
- Date: YYYY-MM-DD

**Additional Context:**
[Any other relevant information]
```

---

## 🎁 Bug Bounty Program (Optional)

For serious testers, consider setting up a bug bounty:

**Platform:** Immunefi or direct rewards

**Reward Tiers:**
- **Critical:** $5,000 - $10,000 (loss of funds, protocol exploit)
- **High:** $1,000 - $5,000 (access control bypass, data corruption)
- **Medium:** $250 - $1,000 (UI bugs, incorrect calculations)
- **Low:** $50 - $250 (typos, minor UX issues)

**Submission:** Email to security@dwallet.com or GitHub Issues

---

## 📈 Performance Testing

### Gas Usage Tracking

| Operation | Gas Used | ETH Cost | USD Cost |
|-----------|----------|----------|----------|
| Mint NFT (ETH) | ~150,000 | ___ | ___ |
| Mint NFT (DWT) | ~180,000 | ___ | ___ |
| Mint dUSD | ~250,000 | ___ | ___ |
| Burn dUSD | ~120,000 | ___ | ___ |
| Swap | ~200,000 | ___ | ___ |

### Load Testing

Test with multiple simultaneous transactions:
- [ ] 10 concurrent NFT mints
- [ ] 10 concurrent dUSD mints
- [ ] 50 rapid API calls
- [ ] Monitor for rate limiting

---

## ✅ Testing Checklist

### Pre-Testing
- [ ] Wallet connected to Base Sepolia
- [ ] Have sufficient ETH for gas
- [ ] Have DWT tokens for testing
- [ ] Have USDC tokens for testing
- [ ] Review all test scenarios
- [ ] Prepare bug report template

### During Testing
- [ ] Execute all test scenarios
- [ ] Document all results
- [ ] Report any bugs found
- [ ] Track gas usage
- [ ] Test error handling
- [ ] Test mobile wallets

### Post-Testing
- [ ] Compile test results
- [ ] Calculate pass rate
- [ ] Prioritize bugs
- [ ] Share feedback with team
- [ ] Suggest improvements
- [ ] Plan re-testing after fixes

---

## 🚀 Advanced Testing

### Automated Testing Script

```javascript
// Run comprehensive automated tests
const testResults = {
  passed: 0,
  failed: 0,
  errors: []
};

async function runAllTests() {
  await testNFTMinting();
  await testStablecoinMinting();
  await testStablecoinBurning();
  await testAccessControl();
  await testEdgeCases();
  
  console.log('Test Results:', testResults);
}

runAllTests();
```

### Integration with CI/CD

```yaml
# .github/workflows/testnet-testing.yml
name: Testnet Testing
on:
  schedule:
    - cron: '0 */6 * * *' # Every 6 hours
  workflow_dispatch:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Run Testnet Tests
        run: npm run test:testnet
        env:
          PRIVATE_KEY: ${{ secrets.TESTNET_PRIVATE_KEY }}
          RPC_URL: https://sepolia.base.org
```

---

## 📞 Support & Resources

- **Discord:** [Join testing channel]
- **Telegram:** [Join testnet group]
- **GitHub Issues:** https://github.com/dwallet/issues
- **Email:** testing@dwallet.com
- **Documentation:** See LAYER9_DEPLOYMENT_COMPLETE.md

---

## 🎯 Success Criteria

Testing phase is considered successful when:
- ✅ Pass rate > 95%
- ✅ Zero critical bugs
- ✅ < 5 high-severity bugs
- ✅ All core features working
- ✅ Gas usage within acceptable range
- ✅ User feedback positive

---

*Happy Testing! 🎉*

*Last Updated: April 16, 2026*
