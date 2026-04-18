# 🎁 How to Claim Your FREE 5 DWT Tokens

## Quick Start (2 Minutes)

**What you'll get**: 5 DWT tokens (FREE)  
**Time required**: 2 minutes  
**Cost**: FREE (just need testnet ETH for gas)

---

## 📋 What You Need

1. ✅ A Web3 wallet (MetaMask, Trust Wallet, etc.)
2. ✅ Base Sepolia network added to your wallet
3. ✅ Some testnet ETH for gas (free from faucet)

---

## 🚀 Step-by-Step Guide

### Method 1: Using MetaMask + BaseScan (Easiest)

#### Step 1: Install MetaMask
1. Download from: https://metamask.io
2. Create a wallet (or import existing)
3. Save your seed phrase securely!

#### Step 2: Add Base Sepolia Network
1. Open MetaMask
2. Click network selector (top)
3. Click "Add Network"
4. Enter details:
   ```
   Network Name: Base Sepolia
   RPC URL: https://sepolia.base.org
   Chain ID: 84532
   Currency Symbol: ETH
   Block Explorer: https://sepolia.basescan.org
   ```
5. Click "Save"

#### Step 3: Get Free Testnet ETH
1. Visit a faucet:
   - https://cloud.google.com/application/web3/faucet/ethereum/sepolia-base
   - https://www.alchemy.com/faucets/base-sepolia
2. Paste your wallet address
3. Click "Send me ETH"
4. Wait ~30 seconds

#### Step 4: Claim DWT Tokens
1. Go to: https://sepolia.basescan.org/address/0x11aE2b13FfB98D8Ba47a5CDAdD898CA85CA21b84
2. Click **"Contract"** tab
3. Click **"Write Contract"**
4. Click **"Connect to Web3"** (connect MetaMask)
5. Find the **`claim()`** function
6. Click **"Write"**
7. MetaMask will pop up - click **"Confirm"**
8. Wait ~15 seconds for confirmation
9. **DONE!** You now have 5 DWT! 🎉

#### Step 5: View Your DWT
1. Open MetaMask
2. Scroll down and click **"Import tokens"**
3. Paste DWT contract: `0x75A884C401A69481d4377F79dc1918b3D18e2aE8`
4. Token details auto-fill
5. Click **"Add Custom Token"**
6. You'll see your 5 DWT balance!

---

### Method 2: Using Hardhat (For Developers)

```bash
# Clone the repository
git clone [repo-url]
cd dwallet-v5

# Install dependencies
npm install

# Run claim script
npx hardhat run scripts/claim-airdrop.cjs --network baseSepolia
```

---

## ✅ How to Verify Your Claim

### Option 1: Check on BaseScan
1. Go to: https://sepolia.basescan.org/address/YOUR_WALLET_ADDRESS
2. Click "Token Transfers (ERC-20)" tab
3. You should see: "+5 DWT"

### Option 2: Check Airdrop Contract
1. Go to: https://sepolia.basescan.org/address/0x11aE2b13FfB98D8Ba47a5CDAdD898CA85CA21b84
2. Click "Read Contract"
3. Call `hasClaimed(YOUR_ADDRESS)`
4. Should return: `true`

---

## ❓ Frequently Asked Questions

### Q: Is this really free?
A: Yes! The DWT tokens are free. You only need testnet ETH for gas fees (also free from faucets).

### Q: Can I claim multiple times?
A: No, each wallet address can only claim once.

### Q: Why do I need testnet ETH?
A: Every transaction on the blockchain requires a small gas fee. On testnet, ETH is free from faucets.

### Q: When is mainnet airdrop?
A: Mainnet airdrop will be announced separately. This is the testnet version.

### Q: What can I do with DWT?
A: On testnet, you can test functionality. Mainnet utilities will include governance, staking, and more.

### Q: I'm having trouble claiming. Help!
A: Check that:
- You're on Base Sepolia network
- You have testnet ETH for gas
- You haven't already claimed
- Your wallet is connected properly

---

## 🔗 Important Links

| Resource | Link |
|----------|------|
| **Airdrop Contract** | https://sepolia.basescan.org/address/0x11aE2b13FfB98D8Ba47a5CDAdD898CA85CA21b84 |
| **DWT Token** | https://sepolia.basescan.org/token/0x75A884C401A69481d4377F79dc1918b3D18e2aE8 |
| **Base Sepolia Faucet** | https://cloud.google.com/application/web3/faucet/ethereum/sepolia-base |
| **MetaMask** | https://metamask.io |

---

## 📱 Mobile Guide (Using MetaMask Mobile)

1. Download MetaMask app (iOS/Android)
2. Create or import wallet
3. Add Base Sepolia network (same settings as desktop)
4. Get testnet ETH from faucet (copy address from app)
5. Open in-app browser
6. Go to: https://sepolia.basescan.org/address/0x11aE2b13FfB98D8Ba47a5CDAdD898CA85CA21b84
7. Follow same steps as desktop (Contract → Write → claim())

---

## ⚠️ Troubleshooting

### Error: "Already claimed"
- This wallet already claimed 5 DWT
- Each wallet can only claim once

### Error: "Insufficient funds for gas"
- Get more testnet ETH from faucet
- You need ~0.001 ETH for gas

### Error: "Network not supported"
- Make sure you're on Base Sepolia (Chain ID: 84532)
- Not Base mainnet or Ethereum

### Tokens not showing in wallet
- Import DWT token manually
- Contract: `0x75A884C401A69481d4377F79dc1918b3D18e2aE8`

---

## 🎯 Next Steps After Claiming

1. ✅ Hold your DWT tokens
2. ✅ Wait for mainnet launch
3. ✅ Participate in governance (future)
4. ✅ Stake for rewards (future)
5. ✅ Trade on DEX (after liquidity added)

---

## 📞 Need Help?

- **Discord**: [Your Discord Link]
- **Twitter**: [@YourTwitter]
- **Email**: support@dwallet.io

---

**🎊 Congratulations! You're now part of the dWallet ecosystem!**

Share with friends - everyone can claim 5 DWT! 🚀
