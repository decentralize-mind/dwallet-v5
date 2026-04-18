# 💧 Add Liquidity to Uniswap V3 - Step-by-Step Guide

## 📋 Pre-Requisites

**Your Wallet**: `0x4C0B7314441dfE8E61267C0d87Fc1A657611dCf5`  
**Network**: Base Sepolia (Chain ID: 84532)  
**Your Balances**:
- DWT: 950,000 tokens
- ETH: ~8.28 ETH

---

## 🎯 Recommended Liquidity Amount

For **testnet testing**, I recommend:
- **DWT**: 100,000 tokens
- **ETH**: ~0.5 ETH (will be calculated by Uniswap)

This gives you enough liquidity for testing while keeping most tokens for other purposes.

---

## 📝 Step-by-Step Instructions

### Step 1: Open Uniswap
1. Go to: **https://app.uniswap.org**
2. Click **"Connect Wallet"** (top right)
3. Select **MetaMask** (or your wallet)
4. Approve the connection

### Step 2: Switch to Base Sepolia Network
1. Click the network selector (top left, might show "Ethereum")
2. Select **"Base Sepolia"**
   - If not visible, click "Add Network" and add:
     - Network Name: Base Sepolia
     - RPC URL: https://sepolia.base.org
     - Chain ID: 84532
     - Currency Symbol: ETH
     - Block Explorer: https://sepolia.basescan.org

### Step 3: Navigate to Pool
1. Click **"Pool"** in the top menu
2. Click **"+ New Position"** (green button)

### Step 4: Select Token Pair
1. **Token 1**: Search and select **DWT**
   - If not showing, paste contract: `0x75A884C401A69481d4377F79dc1918b3D18e2aE8`
   - Click "Import" (it will show a warning, that's normal for testnet)

2. **Token 2**: Select **WETH**
   - Contract: `0x4200000000000000000000000000000000000006`

### Step 5: Set Price Range
For **testnet**, you can use a wide range:
- **Min Price**: `0.000001` ETH per DWT
- **Max Price**: `1000` ETH per DWT

Or select **"Full Range"** for simplicity.

### Step 6: Enter Amounts
1. **DWT Amount**: Enter `100000` (or your preferred amount)
2. **ETH Amount**: Uniswap will auto-calculate based on current price
   - Should be approximately 0.3-0.7 ETH

### Step 7: Review and Approve
1. Click **"Approve DWT"** 
2. Wait for transaction to confirm in MetaMask
3. Click **"Preview"** to review the position
4. Click **"Add"** to create the liquidity position
5. Confirm transaction in MetaMask

### Step 8: Verify
1. Wait for transaction confirmation (~15 seconds)
2. You should see your liquidity position in the Pool tab
3. Check on BaseScan: https://sepolia.basescan.org/address/YOUR_WALLET

---

## ⚠️ Important Notes

### For Testnet:
- ✅ No real money at risk
- ✅ Can remove liquidity anytime
- ✅ Just for testing functionality
- ✅ Price doesn't matter much

### Gas Fees:
- You'll need ETH for gas (~0.001-0.005 ETH per transaction)
- You have 8.28 ETH, so plenty for gas

### Alternative DEX:
If Uniswap doesn't work well on testnet, try:
- **Aerodrome**: https://aerodrome.finance (Base-native DEX)
- **BaseSwap**: https://baseswap.fi

---

## 🔗 Contract Addresses to Use

| Token | Contract Address |
|-------|-----------------|
| **DWT** | `0x75A884C401A69481d4377F79dc1918b3D18e2aE8` |
| **WETH** | `0x4200000000000000000000000000000000000006` |

---

## 💡 Liquidity Amounts Reference

| Pool Size | DWT | ETH (approx) | Best For |
|-----------|-----|--------------|----------|
| **Small** | 50,000 | 0.25 ETH | Basic testing |
| **Medium** ⭐ | 100,000 | 0.5 ETH | Recommended |
| **Large** | 500,000 | 2.5 ETH | Full demo |

---

## ✅ After Adding Liquidity

1. **Test Trading**:
   - Go to https://app.uniswap.org/#/swap
   - Try swapping small amounts of DWT ↔ WETH
   - Verify transactions work

2. **Check Pool**:
   - View your position in Pool tab
   - Monitor on BaseScan

3. **Share with Team**:
   - Pool is now live for testing
   - Team members can trade DWT

---

## 🚀 Quick Start (TL;DR)

1. Open https://app.uniswap.org
2. Connect wallet → Switch to Base Sepolia
3. Pool → New Position
4. Select DWT + WETH
5. Enter 100,000 DWT
6. Approve → Add liquidity
7. Done! ✅

---

**Need help?** Reply with any issues you encounter!
