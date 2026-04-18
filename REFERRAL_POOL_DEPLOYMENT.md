# ReferralPool Deployment Summary

## ✅ Deployment Successful!

**Date**: 2026-04-18  
**Network**: Base Sepolia (Testnet)  
**Contract**: ReferralPool  
**Status**: ✅ Deployed and Ready

---

## 📍 Contract Details

| Parameter | Value |
|-----------|-------|
| **Contract Address** | `0x0ea860ece31Fa7b3a8c59e9AEA069deb20DEAfd d` |
| **Network** | Base Sepolia |
| **Chain ID** | 84532 |
| **DWT Token** | `0xe149b32b97384131204C86a23459b544498BC46A` |
| **Owner** | `0x4C0B7314441dfE8E61267C0d87Fc1A657611dCf5` |
| **Reward Amount** | 10 DWT per user (20 DWT total per referral) |
| **Deployer** | `0x4C0B7314441dfE8E61267C0d87Fc1A657611dCf5` |

---

## 🔗 Links

- **View on BaseScan**: https://sepolia.basescan.org/address/0x0ea860ece31Fa7b3a8c59e9AEA069deb20DEAfd d
- **Deployment Transaction**: Check `deployments/referral-pool-baseSepolia.json`

---

## ⚠️ Important: Contract Verification

The contract verification on BaseScan failed due to a network timeout. You can manually verify it later:

```bash
npx hardhat verify --network baseSepolia \
  0x0ea860ece31Fa7b3a8c59e9AEA069deb20DEAfd d \
  0xe149b32b97384131204C86a23459b544498BC46A \
  0x4C0B7314441dfE8E61267C0d87Fc1A657611dCf5
```

---

## 💰 Next Step: Fund the Pool

The contract is deployed but **needs to be funded with DWT tokens** before it can distribute rewards.

### Option 1: Using Etherscan/Basescan Interface

1. Go to: https://sepolia.basescan.org/address/0x0ea860ece31Fa7b3a8c59e9AEA069deb20DEAfd d
2. Click "Contract" → "Write Contract"
3. Connect your wallet
4. First, approve DWT transfer:
   - Go to DWT token contract
   - Call `approve(referralPoolAddress, amount)`
5. Then fund the pool:
   - Call `fundPool(amount)`

### Option 2: Using Hardhat Console

```bash
npx hardhat console --network baseSepolia
```

Then run:
```javascript
// Get contracts
const DWT = await ethers.getContractAt("DWTToken", "0xe149b32b97384131204C86a23459b544498BC46A");
const ReferralPool = await ethers.getContractAt("ReferralPool", "0x0ea860ece31Fa7b3a8c59e9AEA069deb20DEAfd d");

// Approve transfer (e.g., 1000 DWT)
await DWT.approve("0x0ea860ece31Fa7b3a8c59e9AEA069deb20DEAfd d", ethers.parseEther("1000"));

// Fund the pool
await ReferralPool.fundPool(ethers.parseEther("1000"));

// Check balance
const balance = await ReferralPool.getPoolBalance();
console.log("Pool balance:", ethers.formatEther(balance), "DWT");
```

### Option 3: Create a Funding Script

Create `scripts/fund-referral-pool.cjs`:

```javascript
const hre = require('hardhat');

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  
  const DWT = await hre.ethers.getContractAt("DWTToken", "0xe149b32b97384131204C86a23459b544498BC46A");
  const ReferralPool = await hre.ethers.getContractAt("ReferralPool", "0x0ea860ece31Fa7b3a8c59e9AEA069deb20DEAfd d");
  
  const fundAmount = hre.ethers.parseEther("1000"); // 1000 DWT
  
  console.log("Funding referral pool with 1000 DWT...");
  
  // Approve
  await DWT.approve("0x0ea860ece31Fa7b3a8c59e9AEA069deb20DEAfd d", fundAmount);
  console.log("✅ Approved transfer");
  
  // Fund
  await ReferralPool.fundPool(fundAmount);
  console.log("✅ Pool funded successfully!");
  
  const balance = await ReferralPool.getPoolBalance();
  console.log("Pool balance:", hre.ethers.formatEther(balance), "DWT");
  
  const maxReferrals = await ReferralPool.getMaxReferrals();
  console.log("Can fund", maxReferrals.toString(), "referrals");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

Run it:
```bash
npx hardhat run scripts/fund-referral-pool.cjs --network baseSepolia
```

---

## 📊 Pool Capacity

With the current deployment, you need to fund the pool to enable referrals:

| Fund Amount | Max Referrals | Total DWT Distributed |
|-------------|---------------|----------------------|
| 100 DWT | 5 referrals | 100 DWT |
| 500 DWT | 25 referrals | 500 DWT |
| 1,000 DWT | 50 referrals | 1,000 DWT |
| 5,000 DWT | 250 referrals | 5,000 DWT |
| 10,000 DWT | 500 referrals | 10,000 DWT |

**Recommended**: Fund with at least **1,000 DWT** to handle 50 referrals.

---

## 🧪 Testing the Referral Flow

After funding the pool, test the complete flow:

### 1. Get Your Referral Link
- Open the app
- Go to Settings → Referral Program
- Copy your referral link (e.g., `https://www.toklo.xyz/?ref=TK123456`)

### 2. Test with New Wallet
- Open the link in an incognito window
- Create a new wallet
- Complete onboarding
- Wait 1 minute for automatic processing

### 3. Verify Rewards
- Check that both addresses received 10 DWT
- View transaction on BaseScan
- Check pool balance decreased by 20 DWT

### 4. Check Referral Stats
```javascript
const stats = await ReferralPool.getReferrerStats("YOUR_ADDRESS");
console.log("Total referrals:", stats.totalRefs.toString());
console.log("Total rewards:", hre.ethers.formatEther(stats.totalRewards), "DWT");
```

---

## 🔒 Security Checklist

- ✅ Contract deployed successfully
- ✅ Owner set correctly
- ✅ DWT token address configured
- ⚠️ Contract not yet verified on BaseScan (optional but recommended)
- ⚠️ Pool not yet funded (required before use)
- ✅ One claim per address enforced
- ✅ Self-referral prevented
- ✅ Reentrancy protection enabled

---

## 📝 Configuration Updates

The following files have been updated with the new contract address:

1. ✅ `.env` - `REFERRAL_POOL_ADDRESS`
2. ✅ `src/config/contracts.js` - `baseSepolia.ReferralPool`
3. ✅ `deployments/referral-pool-baseSepolia.json` - Deployment info saved

---

## 🚀 Production Deployment

When ready to deploy to Base Mainnet:

```bash
npx hardhat run scripts/deploy-referral-pool.cjs --network base
```

Then update:
- `.env.production` with mainnet address
- `src/config/contracts.js` → `base.ReferralPool`
- Fund the mainnet pool with real DWT tokens

---

## 📞 Troubleshooting

**Issue**: "Insufficient pool balance" error
- **Solution**: Fund the pool with more DWT tokens

**Issue**: "Already claimed" error  
- **Solution**: This address has already received a referral reward

**Issue**: Transaction fails
- **Solution**: Check gas limit, ensure you have ETH for gas

**Issue**: Can't verify contract
- **Solution**: Try again later or verify manually on BaseScan

---

## 📚 Documentation

- **Smart Contract**: `contracts/layer9/ReferralPool.sol`
- **Deployment Script**: `scripts/deploy-referral-pool.cjs`
- **Test Suite**: `test/ReferralPool.test.js`
- **Full Documentation**: `REFERRAL_SYSTEM.md`
- **Implementation Summary**: `REFERRAL_IMPLEMENTATION_SUMMARY.md`

---

**Deployment Completed**: 2026-04-18  
**Status**: ✅ Ready for testing (after funding)  
**Next Action**: Fund the pool with DWT tokens
