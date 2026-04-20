# How to Use AAVE Lending in dWallet - User Guide

> Quick Start Guide for AAVE V3 Integration
> Last Updated: 2026-04-20

---

## 📍 Where to Find AAVE Lending

### Navigation Path:
1. **Open your dWallet app** (run `npm run dev` or visit your deployed URL)
2. **Click on "DeFi"** in the main navigation menu (left sidebar)
3. **Click on the "Lend" tab** (icon: ⊕) in the DeFi tabs bar

### Visual Guide:
```
Main Menu → DeFi → Lend Tab
            ↓
    [Swap] [Flash Loan] [Insurance] [Limit Orders] [Rewards] [Stake] [Lend] [Yield LP]
                                                              ↑
                                                         Click Here!
```

---

## 🎯 What You Can Do

The AAVE Lending panel supports **4 main actions**:

### 1. **Supply** (Deposit)
- Deposit your crypto assets to earn interest
- Current APY rates displayed for each asset
- Earn passive income on your holdings

### 2. **Withdraw**
- Withdraw your previously supplied assets
- Flexible withdrawals (partial or full)
- Must maintain health factor > 1.0 if you have borrows

### 3. **Borrow**
- Borrow assets against your collateral
- Variable interest rates
- Must maintain health factor > 1.0 to avoid liquidation

### 4. **Repay**
- Repay your borrowed assets
- Reduce your debt and improve health factor
- Partial or full repayment options

---

## 📖 Step-by-Step Usage Guide

### 💰 How to SUPPLY (Deposit) Assets

**Step 1: Navigate to Lending**
- Go to DeFi → Lend tab

**Step 2: Select "Supply" Mode**
- Click the "Supply" button in the mode tabs (top)
- You'll see two sub-options: "Supply" and "Withdraw"
- Make sure "Supply" is selected (highlighted)

**Step 3: Choose an Asset**
Scroll through the available assets:
- **ETH** - Supply APY: ~1.82%, LTV: 80%
- **USDC** - Supply APY: ~4.51%, LTV: 77%
- **USDT** - Supply APY: ~3.98%, LTV: 75%
- **DAI** - Supply APY: ~4.12%, LTV: 75%
- **WBTC** - Supply APY: ~0.42%, LTV: 70%
- **LINK** - Supply APY: ~0.81%, LTV: 65%

Click on the asset you want to supply.

**Step 4: Enter Amount**
- Type the amount you want to supply
- Or click **"MAX"** to supply your entire balance
- You'll see:
  - USD value of your deposit
  - Your current wallet balance
  - Estimated interest per year

**Step 5: Review Details**
Before confirming, check:
- Amount to supply
- Supply APY (your earnings rate)
- Estimated gas cost
- Transaction value warning (if large amount)

**Step 6: Execute**
- Click the **"Supply X ETH"** button (or whichever asset)
- Wait for transaction to process
- Success screen will appear with:
  - Transaction hash
  - Confirmation message
  - Link to view on blockchain explorer

**Step 7: Monitor Your Position**
- Your account summary will show:
  - Total Supplied (collateral)
  - Available to Borrow
  - Health Factor

---

### 💸 How to WITHDRAW Assets

**Step 1: Go to DeFi → Lend**

**Step 2: Select Mode**
- Click "Supply" tab
- Click "Withdraw" sub-tab

**Step 3: Select Asset**
- Choose the asset you want to withdraw
- Must have previously supplied this asset

**Step 4: Enter Amount**
- Type amount to withdraw
- Or click "MAX" to withdraw all
- Note: Can't withdraw if it would drop health factor < 1.0 (if you have borrows)

**Step 5: Execute Withdrawal**
- Click "Withdraw X [Asset]"
- Wait for confirmation
- Check your wallet balance increases

---

### 🏦 How to BORROW Assets

**Step 1: Go to DeFi → Lend**

**Step 2: Select Borrow Mode**
- Click the "Borrow" tab (top mode switcher)
- You'll see "Borrow" and "Repay" sub-options

**Step 3: Choose Asset to Borrow**
- Select the asset you want to borrow
- Check the borrow APY (interest rate you'll pay)

**Step 4: Enter Amount**
- Type how much you want to borrow
- Maximum based on:
  - Your collateral amount
  - Asset's LTV (Loan-to-Value) ratio
  - Available borrow limit

**Step 5: Review Carefully**
⚠️ **Important:**
- Borrow APY (interest you'll pay)
- Health Factor warning
- Keep health factor **above 1.5** (safe zone)
- Liquidation risk if health factor < 1.0

**Step 6: Execute Borrow**
- Click "Borrow X [Asset]"
- Funds will appear in your wallet
- Monitor your health factor regularly

---

### 💳 How to REPAY Borrowed Assets

**Step 1: Go to DeFi → Lend**

**Step 2: Select Repay**
- Click "Borrow" tab
- Click "Repay" sub-tab

**Step 3: Select Asset**
- Choose the asset you borrowed

**Step 4: Enter Repayment Amount**
- Type amount to repay
- Or click "MAX" to repay full debt
- Must have the asset in your wallet

**Step 5: Execute Repayment**
- Click "Repay X [Asset]"
- Transaction will reduce your debt
- Health factor will improve

---

## 📊 Understanding the Dashboard

### Account Summary (Top Section)

When you have active positions, you'll see:

```
┌─────────────────────────────────────────┐
│ Supplied: $1,000.00                     │
│ Borrowed: $500.00                       │
│ Available: $300.00                      │
│ Health: 2.15 ✓                          │
└─────────────────────────────────────────┘
```

**Supplied**: Total value of your deposits (collateral)  
**Borrowed**: Total value of your outstanding loans  
**Available**: How much more you can borrow  
**Health**: Your safety ratio (must stay > 1.0)

### Health Factor Guide

| Health Factor | Status | Risk Level |
|---------------|--------|------------|
| > 2.0 | ✅ Safe | Low risk |
| 1.5 - 2.0 | ⚠️ Moderate | Monitor closely |
| 1.0 - 1.5 | 🔴 Warning | High risk |
| < 1.0 | 🚨 Critical | Liquidation risk! |

**Recommendation:** Always keep health factor above **1.5**

---

## 💡 Pro Tips

### Maximizing Your Earnings

1. **Supply Stablecoins** (USDC, USDT, DAI)
   - Higher APY (4-5%)
   - Less volatile
   - Good for conservative strategy

2. **Supply ETH/WBTC**
   - Lower APY (0.4-1.8%)
   - Potential price appreciation
   - Higher LTV for borrowing

3. **Compound Your Earnings**
   - Regularly claim and re-supply interest
   - Increases your effective APY

### Borrowing Strategy

1. **Conservative Approach**
   - Borrow max 40-50% of your limit
   - Keep health factor > 2.0
   - Lower liquidation risk

2. **Monitor Rates**
   - Borrow APY is variable
   - Rates change based on market
   - Set alerts for rate increases

3. **Tax Implications**
   - Borrowing is not a taxable event
   - Using borrowed funds may be
   - Consult a tax professional

### Risk Management

✅ **DO:**
- Keep health factor > 1.5
- Monitor positions regularly
- Set up price alerts
- Have repayment funds ready

❌ **DON'T:**
- Max out your borrowing limit
- Ignore health factor warnings
- Supply volatile assets and borrow heavily
- Forget about interest accumulation

---

## 🔍 Checking Your AAVE Positions

### Within dWallet:
1. Go to DeFi → Lend
2. Your account summary shows:
   - Total supplied
   - Total borrowed
   - Available to borrow
   - Health factor

### On AAVE Directly:
1. Visit: https://app.aave.com/
2. Connect your wallet
3. View "Dashboard" to see:
   - All your positions
   - Detailed health metrics
   - APY rates
   - Transaction history

### On Blockchain Explorer:
1. Visit Etherscan.io (Ethereum) or BaseScan.org (Base)
2. Search your wallet address
3. View all AAVE contract interactions

---

## ⚠️ Important Notes

### About Your Referral Code

**Code: C8A785**

This code works on the **AAVE app/website** (app.aave.com):
- Users can enter it when signing up
- Tracks referrals for the AAVE platform
- You may earn rewards from AAVE directly

**In dWallet (this app):**
- The smart contract integration uses code `0` (inactive program)
- When AAVE activates their smart contract referral program, we'll update it
- Your code will be ready to activate when the program goes live

### Network Compatibility

The current integration is configured for:
- ✅ **Ethereum Mainnet**
- Network: Mainnet (not testnet)
- Make sure you have real ETH for gas fees

### Gas Fees

All AAVE transactions require gas (ETH):
- Supply: ~$5-20 in gas
- Withdraw: ~$5-20 in gas
- Borrow: ~$5-20 in gas
- Repay: ~$5-20 in gas

Gas prices vary based on network congestion.

### Security Features

Your dWallet includes built-in security:
- ✅ Rate limiting (prevents rapid transactions)
- ✅ Circuit breaker (stops on repeated failures)
- ✅ Balance verification
- ✅ Transaction value warnings
- ✅ Gas estimation
- ✅ Health factor monitoring

---

## 🆘 Troubleshooting

### "Insufficient Balance" Error
**Problem:** Not enough tokens in wallet  
**Solution:** 
- Check your wallet balance
- Make sure you have the asset + extra ETH for gas

### "Health Factor Too Low" Error
**Problem:** Can't withdraw/borrow without dropping HF < 1.0  
**Solution:**
- Repay some debt first
- Supply more collateral
- Reduce withdrawal amount

### Transaction Stuck Pending
**Problem:** Transaction not confirming  
**Solution:**
- Check gas price (may be too low)
- Wait for network congestion to clear
- Check transaction on Etherscan

### "Allowance" Issue
**Problem:** AAVE can't access your tokens  
**Solution:**
- The app automatically handles approval
- Wait for approval transaction to complete
- Then the supply/borrow will proceed

---

## 📚 Additional Resources

### Official AAVE Documentation
- **User Guide:** https://docs.aave.com/
- **Smart Contracts:** https://aave.com/docs/aave-v3/smart-contracts/pool
- **Governance:** https://governance.aave.com/

### dWallet Resources
- **AAVE Integration Guide:** [AAVE_REFERRAL_GUIDE.md](./AAVE_REFERRAL_GUIDE.md)
- **Deployment Summary:** [AAVE_DEPLOYMENT_SUMMARY.md](./AAVE_DEPLOYMENT_SUMMARY.md)
- **Revenue Model:** [revenue-base.md](./revenue-base.md)

### Community & Support
- **AAVE Discord:** https://discord.gg/aave
- **dWallet Support:** Check project documentation

---

## 🎓 Quick Reference Card

### Supply Assets (Earn Interest)
1. DeFi → Lend → Supply mode
2. Select asset (ETH, USDC, etc.)
3. Enter amount
4. Click "Supply"
5. ✅ Earn APY!

### Withdraw Assets
1. DeFi → Lend → Supply mode → Withdraw
2. Select asset
3. Enter amount
4. Click "Withdraw"
5. ✅ Receive funds!

### Borrow Assets
1. DeFi → Lend → Borrow mode
2. Select asset
3. Enter amount (watch health factor!)
4. Click "Borrow"
5. ✅ Funds in wallet!

### Repay Debt
1. DeFi → Lend → Borrow mode → Repay
2. Select asset
3. Enter amount
4. Click "Repay"
5. ✅ Debt reduced!

---

**Happy Lending! 🚀**

For questions or issues, refer to the troubleshooting section or check the official AAVE documentation.
