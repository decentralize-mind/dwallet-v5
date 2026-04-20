# AAVE Referral Integration - Complete Guide

> Status: ✅ Integrated | ⚠️ Referral Program Inactive
> Last Updated: 2026-04-20

---

## 📋 Current Status

### ✅ What's Done
- AAVE V3 integration is complete in `src/utils/defi.js`
- Supply, withdraw, borrow, and repay functions are implemented
- Referral code parameter is properly configured as `uint16`
- Build successful - no compilation errors

### ⚠️ Important: AAVE Referral Program Status

**According to official AAVE documentation (as of 2026-04-20):**

> "Referral supply is currently inactive, you can pass 0 as referralCode. 
> This program may be activated in the future through an Aave governance proposal."

**What this means:**
- The AAVE smart contract referral program is **currently disabled**
- Your referral code `C8A785` is for the **AAVE frontend/app**, not for smart contract integration
- To earn referral commissions from smart contract interactions, you need to:
  1. Submit a proposal to AAVE Governance
  2. Get approved as an integrator
  3. Receive a numeric `uint16` referral code (0-65535)

---

## 🔧 Implementation Details

### Code Location
- **File:** `src/utils/defi.js`
- **Function:** `aaveSupply()` (line 246-269)
- **Referral Code Variable:** `AAVE_REFERRAL_CODE` (currently set to `0`)

### Current Implementation
```javascript
// AAVE referral program is currently inactive (as of 2026-04-20)
// Pass 0 for now. When activated, replace with your numeric referral code (uint16: 0-65535)
// Your AAVE app referral code: C8A785 (this is for the frontend, not smart contract)
// To get a smart contract referral code, submit proposal to Aave Governance
const AAVE_REFERRAL_CODE = 0 // Replace with your uint16 referral code when program activates
const tx = await pool.supply(token.address, amountParsed, address, AAVE_REFERRAL_CODE)
```

### How to Activate When Program Goes Live

1. **Get Your Smart Contract Referral Code:**
   - Visit: https://governance.aave.com/
   - Submit an integrator proposal
   - Once approved, you'll receive a numeric code (e.g., `12345`)

2. **Update the Code:**
   ```javascript
   const AAVE_REFERRAL_CODE = 12345 // Your approved uint16 referral code
   ```

3. **Redeploy:**
   ```bash
   npm run build
   npm run deploy:mainnet
   ```

---

## 📊 Monitoring Your AAVE Referral Earnings

### Method 1: AAVE Dashboard (Frontend Referrals)
If users sign up through your frontend link with code `C8A785`:

1. **Access Your Dashboard:**
   - Visit: https://app.aave.com/
   - Connect the wallet you used to register
   - Navigate to your referral dashboard

2. **Track Metrics:**
   - Number of users who signed up with your code
   - Total deposit volume from referred users
   - Commission earned (typically 10-20% of AAVE's protocol fees)

### Method 2: On-Chain Monitoring (Smart Contract Referrals)
Once the referral program is active with a uint16 code:

1. **Monitor Supply Events:**
   ```javascript
   // Listen for Supply events with your referral code
   pool.on('Supply', (reserve, user, onBehalfOf, amount, referralCode, event) => {
     if (referralCode === YOUR_REFERRAL_CODE) {
       console.log(`Referral detected! User: ${user}, Amount: ${amount}`)
     }
   })
   ```

2. **Use Etherscan/BaseScan:**
   - Monitor the AAVE Pool contract: `0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2`
   - Filter `Supply` events by your referral code

3. **Track Rewards:**
   - Rewards are typically distributed in AAVE tokens
   - Check your wallet balance periodically
   - Monitor the AAVE governance dashboard for reward distributions

### Method 3: Analytics Integration (Recommended)

Add tracking to your dWallet app:

```javascript
// In src/utils/defi.js - aaveSupply function
export async function aaveSupply({ asset, amount, privateKey }) {
  try {
    
    const tx = await pool.supply(token.address, amountParsed, address, AAVE_REFERRAL_CODE)
    
    // Track the referral attempt
    trackReferralEvent({
      type: 'AAVE_SUPPLY',
      asset: asset,
      amount: amount,
      referralCode: AAVE_REFERRAL_CODE,
      txHash: tx.hash,
      timestamp: new Date().toISOString()
    })
    
    return tx
  } catch (error) {
    throw new Error(sanitizeError(error))
  }
}

// Tracking function
function trackReferralEvent(data) {
  // Store in localStorage for now
  const referrals = JSON.parse(localStorage.getItem('aave_referrals') || '[]')
  referrals.push(data)
  localStorage.setItem('aave_referrals', JSON.stringify(referrals))
  
  // In production, send to your analytics backend
  // await fetch('/api/track-referral', { method: 'POST', body: JSON.stringify(data) })
}
```

---

## 🚀 Deployment Steps

### Step 1: Pre-Deployment Testing

```bash
# 1. Run the build
npm run build

# 2. Test locally
npm run dev

# 3. Test AAVE integration in the UI:
#    - Open the app: http://localhost:5173
#    - Navigate to DeFi → Lending
#    - Try supplying a small amount to AAVE
#    - Verify transaction completes successfully
```

### Step 2: Deploy to Pre-Production

```bash
# Deploy to pre-production environment
npm run deploy:preproduction
```

### Step 3: Deploy to Mainnet

```bash
# Deploy to production/mainnet
npm run deploy:mainnet
```

### Step 4: Verify Deployment

1. **Check the deployed app:**
   - Visit your production URL
   - Test AAVE supply function with a small amount
   - Verify transactions complete successfully

2. **Monitor for errors:**
   - Check browser console for any errors
   - Monitor transaction confirmations on BaseScan/Etherscan

---

## 💰 Revenue Projections

### Current State (Referral Program Inactive)
- **Monthly Revenue:** $0 from AAVE referrals
- **Alternative:** Focus on other revenue streams (swap fees, lending protocol, etc.)

### When Referral Program Activates

**Conservative Estimate:**
- 100 users/month supply to AAVE via dWallet
- Average supply: $1,000 per user
- Total volume: $100,000/month
- Your commission (10% of AAVE fees): ~$50-100/month

**Optimistic Estimate:**
- 1,000 users/month supply to AAVE via dWallet
- Average supply: $5,000 per user
- Total volume: $5,000,000/month
- Your commission (10-20% of AAVE fees): ~$2,500-10,000/month

---

## 🎯 Action Items

### Immediate (This Week)
- [x] ✅ Integrate AAVE referral code in defi.js
- [x] ✅ Build and test the application
- [ ] Deploy to production
- [ ] Test AAVE supply function with real transactions

### Short-term (This Month)
- [ ] Monitor AAVE governance for referral program activation
- [ ] Submit integrator proposal to AAVE governance (if desired)
- [ ] Set up analytics tracking for AAVE interactions
- [ ] Create user-facing documentation about AAVE lending

### Long-term (Next 3 Months)
- [ ] Activate smart contract referral code when program goes live
- [ ] Optimize AAVE lending UX in dWallet
- [ ] Add AAVE position tracking dashboard
- [ ] Implement automatic referral reward claiming

---

## 📚 Resources

### Official AAVE Documentation
- **Pool Contract:** https://aave.com/docs/aave-v3/smart-contracts/pool
- **View Contracts:** https://aave.com/docs/aave-v3/smart-contracts/view-contracts
- **Governance:** https://governance.aave.com/

### Contract Addresses
- **AAVE V3 Pool (Ethereum Mainnet):** `0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2`
- **Pool Data Provider:** `0x7B4EB56E7CD4b454BA8ff71E4518426369a138a3`
- **Price Oracle:** `0x54586bE62E3c3580375aE3723C145253060Ca0C2`

### Your Referral Information
- **Frontend App Code:** `C8A785` (for user sign-ups via app.aave.com)
- **Smart Contract Code:** `0` (waiting for program activation)
- **Registration Method:** Mobile app signup

---

## 🔍 Troubleshooting

### Issue: Transaction fails with referral code error
**Solution:** Ensure the referral code is a valid uint16 (0-65535). Currently using `0` which is safe.

### Issue: Not seeing referral commissions
**Solution:** The AAVE referral program is inactive. You won't earn commissions until:
1. The program is activated via governance proposal
2. You're approved as an integrator with a uint16 code

### Issue: Users not signing up with my frontend code
**Solution:** 
1. Promote your referral code `C8A785` in your marketing
2. Add referral code input to your app's onboarding flow
3. Create incentives for users to use your code

---

## 📞 Support

- **AAVE Discord:** https://discord.gg/aave
- **AAVE Forum:** https://governance.aave.com/
- **dWallet Issues:** Check project documentation and existing issue trackers

---

**Last Updated:** 2026-04-20  
**Next Review:** When AAVE announces referral program activation
