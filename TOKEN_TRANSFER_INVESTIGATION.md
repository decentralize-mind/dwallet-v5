# Token Transfer Investigation Report

**Date**: April 17, 2026  
**Network**: Base Sepolia (Chain ID: 84532)  
**Wallet Address**: `0x4C0B7314441dfE8E61267C0d87Fc1A657611dCf5`

---

## 📊 Investigation Summary

### Current Status: ⚠️ TOKENS NOT FOUND

After thorough investigation of the Base Sepolia blockchain, **the 1M DWT token transfer could not be verified**. Here are the findings:

---

## 🔍 Findings

### 1. **Two DWT Token Contracts Exist on Base Sepolia**

#### Contract A (Primary - from .env)
- **Address**: `0x3400b0167dA5b2dba0b88b9604eE7df4BFc1f1fa`
- **Name**: dWallet Token
- **Symbol**: DWT
- **Decimals**: 18
- **Total Supply**: 74,270,000 DWT
- **Owner**: `0x310fF28FbFB879A721338973f6699e8F30B6f9F9` (TimeLock contract)
- **Your Balance**: **0 DWT** ❌

**Major Holders:**
- DAO Treasury: 14,000,000 DWT (18.85%)
- Liquidity: 12,600,000 DWT (16.97%)
- Community Rewards: 10,500,000 DWT (14.14%)
- Airdrop: 5,600,000 DWT (7.54%)

#### Contract B (Alternative - from deployment file)
- **Address**: `0x769F23dd0F6bc92C9d9d914190Ae9006d3FbDe48`
- **Name**: dWallet Token
- **Symbol**: DWT
- **Decimals**: 18
- **Total Supply**: 16,545,456 DWT
- **Owner**: `0x4C0B7314441dfE8E61267C0d87Fc1A657611dCf5` (Your wallet)
- **Your Balance**: **0 DWT** ❌

---

### 2. **ETH Balance**
- **Current ETH Balance**: 5.64 ETH ✅
- This confirms the wallet is active and funded on Base Sepolia

---

### 3. **Transaction History**
- **Recent Transfers**: None found in last 10,000 blocks (~14 hours)
- No transfer events detected involving your wallet address

---

## 🤔 Possible Explanations

### Scenario 1: Transfer Didn't Complete
- The transaction may have failed or was never submitted
- Check your wallet's transaction history for pending/failed transactions

### Scenario 2: Wrong Token Contract
- You may have transferred tokens from a different contract address
- The token you transferred might not be one of the two DWT contracts found

### Scenario 3: Different Network
- The transfer might have been made on a different network (e.g., Base Mainnet, Sepolia)
- Verify you were on Base Sepolia when making the transfer

### Scenario 4: Already Spent/Transferred
- The tokens were received but already transferred out
- Check full transaction history on BaseScan

### Scenario 5: Wrong Recipient Address
- Double-check the recipient address matches: `0x4C0B7314441dfE8E61267C0d87Fc1A657611dCf5`

---

## 🔗 Verification Links

### Base Sepolia Explorer
1. **Wallet Address**: https://sepolia.basescan.org/address/0x4C0B7314441dfE8E61267C0d87Fc1A657611dCf5
2. **Token Contract A**: https://sepolia.basescan.org/address/0x3400b0167dA5b2dba0b88b9604eE7df4BFc1f1fa
3. **Token Contract B**: https://sepolia.basescan.org/address/0x769F23dd0F6bc92C9d9d914190Ae9006d3FbDe48

### Token Holder Pages
- Contract A Holders: https://sepolia.basescan.org/token/0x3400b0167dA5b2dba0b88b9604eE7df4BFc1f1fa#balances
- Contract B Holders: https://sepolia.basescan.org/token/0x769F23dd0F6bc92C9d9d914190Ae9006d3FbDe48#balances

---

## ✅ Recommended Actions

1. **Check Your Wallet Transaction History**
   - Open your wallet (MetaMask, etc.)
   - Switch to Base Sepolia network
   - Look for the transfer transaction
   - Check if it shows as "Success", "Failed", or "Pending"

2. **Get Transaction Hash**
   - Find the specific transaction hash (TX hash)
   - Look it up on: https://sepolia.basescan.org/tx/YOUR_TX_HASH

3. **Verify Token Contract Address**
   - Check which token contract address you interacted with
   - Compare with the two addresses above

4. **Check Different Networks**
   - Verify you were on Base Sepolia, not another network
   - Check Base Mainnet, Ethereum Sepolia, etc.

5. **Provide Transaction Hash**
   - If you have the transaction hash, I can help investigate further

---

## 📝 Scripts Created

The following diagnostic scripts were created in `/scripts/`:
- `check-balance-sepolia.js` - Check wallet and token balances
- `verify-transactions.js` - Fetch recent token transfers
- `check-token-details.js` - Get detailed token contract information
- `check-alt-token-balance.js` - Check alternative token contract balance

---

**Status**: Awaiting user confirmation with transaction hash or clarification on which token contract was used.
