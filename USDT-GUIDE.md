# USDT Guide for dWallet

This guide explains how to get and use USDT on both testnets (for testing) and mainnets (for real transactions).

---

## Table of Contents
1. [Testnet USDT (For Testing)](#testnet-usdt-for-testing)
2. [Mainnet USDT (Real Value)](#mainnet-usdt-real-value)
3. [How to Send USDT](#how-to-send-usdt)
4. [How to Receive USDT](#how-to-receive-usdt)
5. [Troubleshooting](#troubleshooting)

---

## Testnet USDT (For Testing)

Testnet USDT has **no real value** and is used only for testing purposes.

### Sepolia Testnet

**USDT Contract Address:** `0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0`

#### Option 1: Use Faucet Websites
1. Visit these faucets to get test USDT:
   - **Chainlink Faucet**: https://faucets.chain.link/sepolia
   - **Alchemy Faucet**: https://sepoliafaucet.com/
   - **Google Cloud Faucet**: https://cloud.google.com/application/web3/faucet/ethereum/sepolia

2. Connect your wallet or paste your address
3. Request test tokens (you may need to complete a captcha)

#### Option 2: Use Hardhat/Foundry (For Developers)
If you're running a local testnet, you can mint test USDT:

```bash
# Using the provided script
node scripts/get-test-usdt.js --network sepolia --amount 100
```

#### Option 3: Bridge from Another Testnet
Use testnet bridges to move USDT between testnets:
- **Sepolia ↔ Goerli Bridge**: https://testnetbridge.com

### Base Sepolia Testnet

**USDT Contract Address:** `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`

1. **Base Faucet**: https://faucets.chain.link/base-sepolia
2. **Coinbase Faucet**: https://faucet.base.org/
3. Request test ETH first, then swap for test USDT on testnet DEXs

---

## Mainnet USDT (Real Value)

Mainnet USDT has **real monetary value**. Only use addresses you trust.

### Supported Networks & Addresses

| Network | USDT Contract Address | Decimals |
|---------|----------------------|----------|
| **Ethereum** | `0xdAC17F958D2ee523a2206206994597C13D831ec7` | 6 |
| **Base** | `0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2` | 6 |
| **Polygon** | `0xc2132D05D31c914a87C6611C10748AEb04B58e8F` | 6 |
| **BNB Chain** | `0x55d398326f99059fF775485246999027B3197955` | 18 |
| **Arbitrum** | `0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9` | 6 |

### How to Get Real USDT

#### Option 1: Buy via MoonPay (In-Wallet)
1. Open dWallet
2. Click the **"Buy"** button on the dashboard
3. Select USDT as the currency
4. Complete the purchase with credit/debit card
5. USDT will be sent to your wallet

#### Option 2: Transfer from Exchange
1. Go to your exchange (Binance, Coinbase, Kraken, etc.)
2. Withdraw USDT to your dWallet address
3. **Important**: Select the correct network!
   - If your wallet is on Ethereum, withdraw via ERC20
   - If on Base, withdraw via Base network
   - Mismatched networks = lost funds!

#### Option 3: Receive from Someone
1. Click **"Receive"** in dWallet
2. Share your wallet address
3. The sender can send USDT on any supported network

#### Option 4: Swap Other Tokens for USDT
1. Click **"Swap"** in dWallet
2. Select your token (e.g., ETH, DAI)
3. Select USDT as the output token
4. Execute the swap

---

## How to Send USDT

### Steps:
1. **Open Send Modal**
   - Click the **"Send"** button on the dashboard

2. **Enter Details**
   - **Recipient Address**: Paste or select from address book
   - **Token**: Select "USDT" from the dropdown
   - **Amount**: Enter the amount to send
   - **Network**: Verify you're on the correct network

3. **Review Transaction**
   - Check the USD value
   - Review gas fees (you need native token for gas: ETH, BNB, MATIC, etc.)
   - Verify recipient address carefully

4. **Confirm & Send**
   - Click "Send"
   - Transaction simulation will run
   - Confirm the transaction
   - Wait for confirmation

### Important Notes:
- ⚠️ **Gas Fees**: You need the native token (ETH/BNB/MATIC) to pay for gas
- ⚠️ **Network Match**: Sender and receiver must be on the same network
- ⚠️ **Address Verification**: Always double-check the recipient address
- ⚠️ **Minimum Amounts**: Some networks have minimum transfer amounts

---

## How to Receive USDT

### Steps:
1. **Open Receive Modal**
   - Click the **"Receive"** button on the dashboard

2. **Share Your Address**
   - Copy your wallet address
   - Or show the QR code to the sender

3. **Specify Network**
   - Tell the sender which network to use (Ethereum, Base, Polygon, etc.)
   - They must send USDT on the **same network** as your address

4. **Wait for Confirmation**
   - USDT will appear in your wallet once the transaction confirms
   - You can view the transaction on the block explorer

### Important Notes:
- ✅ Your address works on all EVM networks
- ✅ You can receive USDT on multiple networks simultaneously
- ⚠️ Always verify the network before sharing your address

---

## Troubleshooting

### USDT Not Showing in Wallet

**Problem**: I have USDT but don't see it in my wallet.

**Solutions**:
1. **Check Network**: Make sure you're on the correct network
   - Click the chain selector in the top center
   - Select the network where you hold USDT

2. **Refresh Balances**: 
   - Switch to another tab and back
   - Or lock and unlock your wallet

3. **Import Token Manually**:
   - Go to Settings → Token Import
   - Paste the USDT contract address for your network
   - Click "Add to Wallet"

4. **Check Block Explorer**:
   - Verify your USDT balance on Etherscan/Polygonscan/etc.
   - If it shows there but not in wallet, it's a display issue

### Transaction Failing

**Problem**: My USDT transfer keeps failing.

**Solutions**:
1. **Insufficient Gas**: 
   - Check your native token balance (ETH/BNB/MATIC)
   - You need extra for gas fees

2. **Wrong Decimals**:
   - USDT on most networks uses 6 decimals
   - USDT on BNB Chain uses 18 decimals

3. **Network Congestion**:
   - Try again during off-peak hours
   - Increase gas price in advanced settings

### Can't Get Test USDT

**Problem**: Faucets aren't working or are empty.

**Solutions**:
1. **Try Multiple Faucets**: Different faucets have different availability
2. **Wait and Retry**: Faucets have cooldown periods (usually 24 hours)
3. **Ask in Discord**: Many projects have faucet channels
4. **Use Hardhat Local**: For development, use a local testnet

---

## Security Reminders

🔒 **Never share your private key or seed phrase**

⚠️ **Verify contract addresses** from official sources only

✅ **Double-check recipient addresses** before sending

🌐 **Use the correct network** for transfers

💰 **Start with small amounts** when testing

---

## Need Help?

- **Documentation**: Check the dWallet docs
- **Community**: Join the Discord/Telegram
- **Support**: Contact support@dwallet.io

---

*Last updated: April 18, 2026*
