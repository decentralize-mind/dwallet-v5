# 🚀 NFT Membership Complete Deployment & Launch Guide

This guide walks you through the entire process from deployment to revenue generation.

---

## 📋 **Pre-Deployment Checklist**

### ✅ **Required Before Deployment:**

- [ ] Wallet with sufficient ETH for deployment (~0.01-0.05 ETH)
- [ ] Target network selected (Base Sepolia for testing, Base Mainnet for production)
- [ ] DWT Token already deployed (or use mock token for testing)
- [ ] Security Controller deployed (or deploy new one)
- [ ] `.env.local` file configured with RPC keys

### 📝 **Network Selection:**

| Network | Chain ID | Use Case | Cost |
|---------|----------|----------|------|
| **Base Sepolia** | 84532 | Testing | Free (testnet ETH) |
| **Base Mainnet** | 8453 | Production | ~$10-50 in ETH |

---

## 🎯 **Step 1: Deploy the Contract**

### **Option A: Quick Deploy (Recommended for Testing)**

This deploys everything automatically (DWT Token + Security + NFTMembership):

```bash
# Deploy to Base Sepolia testnet
npx hardhat run scripts/deploy-nft-membership.js --network baseSepolia
```

**What happens:**
1. ✅ Deploys Mock DWT Token
2. ✅ Deploys Layer7 Security Controller
3. ✅ Deploys NFTMembership Contract
4. ✅ Configures default tier prices
5. ✅ Saves deployment info to JSON file

### **Option B: Deploy with Existing Contracts**

```bash
# Set environment variables
export DWT_TOKEN_ADDRESS=0xYourDWTTokenAddress
export SECURITY_CONTROLLER_ADDRESS=0xYourSecurityControllerAddress

# Deploy only NFTMembership
npx hardhat run scripts/deploy-nft-membership.js --network baseSepolia
```

### **Option C: Deploy to Mainnet**

⚠️ **WARNING: This costs real money!**

```bash
# Deploy to Base Mainnet
npx hardhat run scripts/deploy-nft-membership.js --network base
```

---

## 🔍 **Step 2: Verify Deployment**

```bash
# For Base Sepolia
npx hardhat verify --network baseSepolia \
  <NFT_MEMBERSHIP_ADDRESS> \
  <DWT_TOKEN_ADDRESS> \
  <SECURITY_CONTROLLER_ADDRESS>
```

---

## 💰 **Step 3: Fund with Initial Liquidity (Optional)**

```javascript
// Send ETH to contract
await wallet.sendTransaction({
  to: NFT_MEMBERSHIP_ADDRESS,
  value: ethers.parseEther("1.0") // 1 ETH
})

// Send DWT tokens to contract (for rewards)
const dwtContract = new ethers.Contract(DWT_ADDRESS, ERC20_ABI, signer)
await dwtContract.transfer(NFT_MEMBERSHIP_ADDRESS, ethers.parseEther("10000"))
```

**Recommended Initial Funding:**
- **Testnet:** 0.1 ETH + 1,000 DWT (for testing)
- **Mainnet:** 1-5 ETH + 10,000-50,000 DWT

---

## 💵 **Step 4: Withdraw Revenue**

```bash
# Withdraw all revenue (ETH + DWT)
npx hardhat run scripts/withdraw-revenue.js --network baseSepolia
```

This script:
- ✅ Verifies you're the contract owner
- ✅ Checks ETH and DWT balances
- ✅ Withdraws all funds to your wallet
- ✅ Shows transaction confirmations

---

## 📊 **Step 5: Monitor Minting**

```bash
# Start monitoring
node monitoring/nft-membership-monitoring.js
```

**Key Commands:**

```javascript
// Check total mints
await nftMembership.totalSupply()

// Check tier supply
const tier0 = await nftMembership.tierConfigs(0)
console.log(`Bronze: ${tier0.currentSupply}/${tier0.maxSupply}`)

// Check revenue
const ethBalance = await provider.getBalance(NFT_ADDRESS)
console.log(`ETH Revenue: ${ethers.formatEther(ethBalance)} ETH`)
```

---

## 🎛️ **Step 6: Adjust Pricing**

```bash
# Run pricing adjustment tool
npx hardhat run scripts/adjust-pricing.js --network baseSepolia
```

See `scripts/adjust-pricing.js` for detailed pricing management.

---

## 📢 **Step 7: Launch Announcements**

### **Twitter/X Template:**
```
🚀 DWT Membership Passes are LIVE! 🎫

🥉 Bronze: 0.05 ETH (1,000 spots)
🥈 Silver: 0.15 ETH (500 spots)
🥇 Gold: 0.50 ETH (200 spots)
💎 Platinum: 1.50 ETH (50 spots)

Only 1,750 passes ever. Mint now!

🔗 [YOUR_APP_URL]
```

### **Discord Template:**
```
🎉 **DWT MEMBERSHIP PASSES ARE LIVE!** 🎉

@everyone 

🎫 **MINT NOW:** [YOUR_APP_URL]

📊 **TIERS:**
🥉 Bronze - 0.05 ETH
🥈 Silver - 0.15 ETH
🥇 Gold - 0.50 ETH
💎 Platinum - 1.50 ETH

First 100 minters get exclusive founder badge! ⚡
```

---

## 🎯 **Quick Command Reference**

```bash
# Deploy
npx hardhat run scripts/deploy-nft-membership.js --network baseSepolia

# Verify
npx hardhat verify --network baseSepolia <ADDRESS> <DWT> <SECURITY>

# Withdraw Revenue
npx hardhat run scripts/withdraw-revenue.js --network baseSepolia

# Adjust Pricing
npx hardhat run scripts/adjust-pricing.js --network baseSepolia

# Monitor
node monitoring/nft-membership-monitoring.js
```

---

## ⚠️ **Security Reminders**

1. ✅ Never commit `.env.local` to Git
2. ✅ Transfer ownership to multisig after deployment
3. ✅ Test on testnet first
4. ✅ Keep private keys secure
5. ✅ Monitor contract activity regularly
6. ✅ Set up alerts for critical events

---

## 📞 **Support**

- Documentation: `/formal-verification/NFTMembership-spec.md`
- Monitoring: `/monitoring/nft-membership-monitoring.js`
- Tests: `/test/NFTMembership.test.cjs`

**Happy Launching! 🚀**
