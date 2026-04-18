# NFT Membership - Live Testing Guide

## ✅ Deployment Status

**Contract Successfully Deployed and Verified!**

- **Network**: Base Sepolia Testnet
- **Contract Address**: `0x77c3f6A47a37AE3eF26F48A73430EAed79Af59b7`
- **DWT Token**: `0x3A4B1a7aD971be03dEe83A7B61d575304C9C0b0f`
- **Owner**: `0x4C0B7314441dfE8E61267C0d87Fc1A657611dCf5`
- **UI Running**: http://localhost:5173/

### Current State
- ✅ Contract deployed and accessible
- ✅ All 4 tiers configured and enabled
- ✅ 1 Bronze pass already minted (Token #1)
- ✅ 0.05 ETH revenue withdrawn successfully
- ✅ UI development server running

---

## 🎯 UI Testing Instructions

### Prerequisites

1. **MetaMask or Compatible Wallet**
   - Install MetaMask browser extension
   - Add Base Sepolia network:
     - Network Name: Base Sepolia
     - RPC URL: `https://sepolia.base.org`
     - Chain ID: `84532`
     - Currency: ETH
     - Block Explorer: `https://sepolia.basescan.org`

2. **Get Test ETH**
   - Visit: https://cloud.google.com/application/web3/faucet/ethereum/sepolia-base
   - Or: https://www.alchemy.com/faucets/base-sepolia
   - Request test ETH for your wallet address

3. **Connect to Local UI**
   - Open browser: http://localhost:5173/
   - Connect your wallet when prompted

---

## 📝 Test Scenarios

### Test 1: View Membership Tab ✅

**Steps:**
1. Open http://localhost:5173/
2. Connect wallet (if not already connected)
3. Look for bottom navigation bar
4. Click on **"Membership"** tab (🎫 icon)

**Expected Result:**
- ✅ Membership page loads
- ✅ Three view tabs visible: "Mint Pass", "My Passes", "Revenue"
- ✅ Current tier status shown at top
- ✅ 4 tier cards displayed (Bronze, Silver, Gold, Platinum)
- ✅ Prices shown: 0.05 ETH / 0.15 ETH / 0.5 ETH / 1.5 ETH

---

### Test 2: Mint Bronze Pass (0.05 ETH) 🎫

**Steps:**
1. Navigate to **Membership** tab
2. Ensure **"Mint Pass"** view is selected
3. Find the **Bronze** tier card (🥉)
4. Verify price shows: **0.05 ETH**
5. Click **"Mint Pass"** button
6. In modal, select **"💰 ETH"** payment method
7. Verify price: **0.050 ETH**
8. Click **"Confirm Mint"**
9. MetaMask popup appears
10. Confirm transaction

**Expected Result:**
- ✅ Transaction submitted
- ✅ Success message: "Successfully minted Bronze membership!"
- ✅ Page reloads
- ✅ Bronze tier card shows "Owned"
- ✅ Top status shows: "🥉 Bronze Member"
- ✅ Token #2 created (Token #1 already exists)

**Verify on Basescan:**
- https://sepolia.basescan.org/address/0x77c3f6A47a37AE3eF26F48A73430EAed79Af59b7
- Check "Events" tab for `PassMinted` event

---

### Test 3: View Owned Pass 📜

**Steps:**
1. After minting, click **"📜 My Passes"** tab
2. View your owned passes

**Expected Result:**
- ✅ Shows owned pass card
- ✅ Displays: "Bronze Pass"
- ✅ Token ID: #2 (or #1 if owner)
- ✅ Expiry date: ~365 days from now
- ✅ Shows: "Valid for 365 days"
- ✅ Two buttons visible: "⬆️ Upgrade" and "🔄 Renew"

---

### Test 4: Upgrade Bronze → Silver (0.10 ETH) ⬆️

**Steps:**
1. Go to **"My Passes"** tab
2. Find your Bronze pass
3. Click **"⬆️ Upgrade"** button
4. Modal opens showing:
   - Upgrading to: Silver
   - Price: **0.100 ETH** (price difference)
5. Click **"Confirm Upgrade"**
6. Confirm MetaMask transaction

**Expected Result:**
- ✅ Transaction submitted
- ✅ Success message: "Membership upgraded successfully!"
- ✅ Page reloads
- ✅ Pass now shows: "Silver Pass"
- ✅ Tier changed from 1 to 2
- ✅ Top status shows: "🥈 Silver Member"
- ✅ Contract received additional 0.10 ETH

**Price Breakdown:**
- Original Bronze: 0.05 ETH
- Silver price: 0.15 ETH
- Upgrade cost: 0.15 - 0.05 = **0.10 ETH** ✓

---

### Test 5: Renew Pass (Full Price) 🔄

**Steps:**
1. Go to **"My Passes"** tab
2. Find your Silver pass
3. Click **"🔄 Renew"** button
4. Modal shows:
   - Renewal Price: **0.150 ETH** (full Silver price)
   - Extends validity for: 365 days
5. Click **"Confirm Renewal"**
6. Confirm MetaMask transaction

**Expected Result:**
- ✅ Transaction submitted
- ✅ Success message: "Membership renewed successfully!"
- ✅ Page reloads
- ✅ Expiry date extended by 365 days
- ✅ Contract received 0.15 ETH

**Note:** Renewal charges the full tier price, not a discounted rate!

---

### Test 6: View Revenue Dashboard 💰 (Owner Only)

**Prerequisites:**
- Must be logged in as contract owner: `0x4C0B7314441dfE8E61267C0d87Fc1A657611dCf5`

**Steps:**
1. Ensure owner wallet is connected
2. Navigate to **Membership** tab
3. Click **"💰 Revenue"** tab (only visible to owner)

**Expected Result:**
- ✅ Revenue dashboard displays
- ✅ Shows ETH balance from all mints/upgrades/renewals
- ✅ Shows DWT balance (if any DWT payments)
- ✅ Statistics panel shows:
  - Total Passes Minted
  - Your Passes count
- ✅ **"💸 Withdraw All Revenue"** button visible

**Revenue Calculation Example:**
```
If you completed Tests 2, 4, 5:
- Bronze mint: 0.05 ETH
- Upgrade to Silver: 0.10 ETH
- Renew Silver: 0.15 ETH
─────────────────────────
Total: 0.30 ETH in contract
```

---

### Test 7: Withdraw Revenue 💸 (Owner Only)

**Steps:**
1. Go to **"Revenue"** tab
2. Verify ETH balance > 0
3. Click **"💸 Withdraw All Revenue"**
4. Confirm MetaMask transaction

**Expected Result:**
- ✅ Transaction submitted
- ✅ Success message: "Revenue withdrawn successfully!"
- ✅ ETH transferred to owner wallet
- ✅ Contract ETH balance resets to 0
- ✅ Revenue dashboard shows 0 ETH

**Verify on Basescan:**
- Check contract address ETH balance: should be 0
- Check owner wallet: received withdrawn ETH

---

### Test 8: Mint with DWT Tokens 🪙

**Prerequisites:**
- Need DWT tokens in wallet
- Get DWT from: Contract owner can mint/transfer

**Steps:**
1. Navigate to **Membership** tab → **"Mint Pass"**
2. Find a tier (e.g., Bronze)
3. Click **"Mint Pass"**
4. Select **"🪙 DWT"** payment method
5. Verify price: **100 DWT** (for Bronze)
6. Click **"Confirm Mint"**
7. First time: Approve DWT spending
8. Second transaction: Confirm mint

**Expected Result:**
- ✅ DWT approval transaction
- ✅ Mint transaction
- ✅ Pass minted successfully
- ✅ Contract DWT balance increased
- ✅ Your DWT balance decreased by 100

---

### Test 9: Access Control Verification 🔐

**Purpose:** Verify that membership tier grants correct DeFi access

**Steps:**
1. After minting Bronze pass
2. Navigate to **DeFi** tab
3. Try accessing features

**Expected Behavior:**
- Bronze tier (1): Basic swap access ✓
- Bronze tier (1): Premium features ✗ (requires higher tier)

**Smart Contract Check:**
```javascript
hasAccess(userAddress, 0) // Should return true for Bronze
hasAccess(userAddress, 1) // Should return false (need Silver+)
```

---

### Test 10: Supply Cap Enforcement 🚫

**Current Supply Status:**
- Bronze: 1/1000 minted
- Silver: 0/500 minted
- Gold: 0/200 minted
- Platinum: 0/50 minted

**Test:**
1. Try to mint when supply is full
2. Should fail with "TierCapReached" error

**Current State:** All tiers have plenty of space available

---

## 📊 Testing Checklist

Use this checklist to track your testing progress:

```
DEPLOYMENT & SETUP
☑️ Contract deployed to Base Sepolia
☑️ UI running at http://localhost:5173/
☑️ Wallet connected to Base Sepolia
☑️ Test ETH in wallet

MINTING TESTS
☐ Test 1: View Membership tab
☐ Test 2: Mint Bronze pass (0.05 ETH)
☐ Test 8: Mint with DWT tokens

UPGRADE TESTS  
☐ Test 3: View owned passes
☐ Test 4: Upgrade Bronze → Silver (0.10 ETH)
☐ Upgrade Silver → Gold (0.35 ETH)
☐ Upgrade Gold → Platinum (1.00 ETH)

RENEWAL TESTS
☐ Test 5: Renew pass (full tier price)
☐ Verify expiry date extended

REVENUE TESTS (Owner Only)
☐ Test 6: View revenue dashboard
☐ Test 7: Withdraw revenue
☐ Verify contract balance = 0 after withdrawal

ACCESS CONTROL TESTS
☐ Test 9: Verify tier-based access
☐ Test DeFi feature gating

EDGE CASES
☐ Try minting disabled tier
☐ Try transferring soulbound token
☐ Check expired pass behavior
☐ Test rate limiting (mint 2 passes quickly)
```

---

## 🔍 Monitoring & Verification

### Basescan Links

**Contract:**
https://sepolia.basescan.org/address/0x77c3f6A47a37AE3eF26F48A73430EAed79Af59b7

**DWT Token:**
https://sepolia.basescan.org/address/0x3A4B1a7aD971be03dEe83A7B61d575304C9C0b0f

**Owner Wallet:**
https://sepolia.basescan.org/address/0x4C0B7314441dfE8E61267C0d87Fc1A657611dCf5

### What to Monitor

1. **Contract Transactions**
   - All mint/upgrade/renew transactions
   - Withdrawal transactions

2. **Contract Events**
   - `PassMinted`: New pass created
   - `PassUpgraded`: Tier upgraded
   - `ExpiryExtended`: Pass renewed
   - `HighestTierUpdated`: User tier changed

3. **Token Holdings**
   - Check NFT balance: Should increase with each mint
   - Check ETH balance: Should increase with payments
   - Check DWT balance: Should increase with DWT payments

---

## 💰 Revenue Tracking

### Real-Time Revenue Calculation

Track revenue as you test:

```
TEST                  | ETH REVENUE | DWT REVENUE
──────────────────────┼─────────────┼────────────
Bronze Mint           | +0.05 ETH   |
Silver Mint           | +0.15 ETH   |
Gold Mint             | +0.50 ETH   |
Platinum Mint         | +1.50 ETH   |
Bronze→Silver Upgrade | +0.10 ETH   |
Silver→Gold Upgrade   | +0.35 ETH   |
Gold→Platinum Upgrade | +1.00 ETH   |
Bronze Renewal        | +0.05 ETH   |
Silver Renewal        | +0.15 ETH   |
Gold Renewal          | +0.50 ETH   |
Platinum Renewal      | +1.50 ETH   |
──────────────────────┼─────────────┼────────────
TOTAL POTENTIAL       | See above   | Same in DWT
```

### Current Revenue Status

After initial deployment:
- **ETH Withdrawn**: 0.05 ETH ✅
- **DWT Withdrawn**: 0 DWT
- **Current Contract Balance**: 0 ETH

---

## 🐛 Troubleshooting

### "Transaction Failed: InsufficientPayment"
- **Cause**: Not sending enough ETH
- **Solution**: Ensure wallet has enough ETH + gas fees

### "Transaction Failed: TierCapReached"
- **Cause**: Tier supply is full
- **Solution**: Wait for renewals or admin increases supply

### "Transaction Failed: MintCooldownActive"
- **Cause**: Minted recently (1 hour cooldown)
- **Solution**: Wait for cooldown to expire

### "Can't see Revenue tab"
- **Cause**: Not connected as owner
- **Solution**: Connect wallet: `0x4C0B7314441dfE8E61267C0d87Fc1A657611dCf5`

### "UI not loading"
- **Cause**: Dev server not running
- **Solution**: Run `npm run dev` in terminal

### "Wrong network"
- **Cause**: Wallet not on Base Sepolia
- **Solution**: Switch to Base Sepolia (Chain ID: 84532)

---

## 📈 Performance Metrics

After testing, record these metrics:

```
Transaction Times:
- Mint TX: ___ seconds
- Upgrade TX: ___ seconds
- Renew TX: ___ seconds
- Withdraw TX: ___ seconds

Gas Costs:
- Mint Gas: ___
- Upgrade Gas: ___
- Renew Gas: ___
- Withdraw Gas: ___

Success Rate:
- Mints: __/__ successful
- Upgrades: __/__ successful
- Renewals: __/__ successful
- Withdrawals: __/__ successful
```

---

## 🎓 Next Steps After Testing

1. **If All Tests Pass:**
   - ✅ Document any issues found
   - ✅ Optimize gas costs if needed
   - ✅ Prepare for mainnet deployment
   - ✅ Get security audit

2. **If Tests Fail:**
   - ❌ Check error messages
   - ❌ Review contract code
   - ❌ Test on Hardhat local network first
   - ❌ Fix bugs and redeploy

3. **Production Launch:**
   - Deploy to Base mainnet
   - Transfer ownership to multisig
   - Monitor transactions
   - Announce launch

---

## 📞 Quick Reference

**Test Commands:**
```bash
# Verify deployment
npx hardhat run scripts/verify-membership-deployment.js --network baseSepolia

# Withdraw revenue
npx hardhat run scripts/withdraw-revenue.cjs --network baseSepolia

# Start UI
npm run dev
```

**Contract Addresses:**
- NFT Membership: `0x77c3f6A47a37AE3eF26F48A73430EAed79Af59b7`
- DWT Token: `0x3A4B1a7aD971be03dEe83A7B61d575304C9C0b0f`

**UI URL:** http://localhost:5173/

**Explorer:** https://sepolia.basescan.org/

---

## ✅ Success Criteria

Testing is successful when:

- ✅ All 10 test scenarios pass
- ✅ Revenue correctly tracked and withdrawable
- ✅ Access control working properly
- ✅ No critical bugs or security issues
- ✅ UI responsive and user-friendly
- ✅ Transactions complete within 30 seconds
- ✅ Error messages are clear and helpful

---

**Happy Testing! 🚀**

Start with Test 1 and work through each scenario systematically.
Record any issues and report them for fixing before mainnet launch.
