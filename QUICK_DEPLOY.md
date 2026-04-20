# 🚀 Quick Deployment Instructions

## ✅ What's Been Done

1. ✅ **Critical Security Fixes Applied**
   - SwapRouter: Fixed deadline validation, hop limit, slippage protection
   - ReferralPool: Added SecurityGated, withdrawal protection, Sybil prevention

2. ✅ **Upgradeable Contracts Created**
   - DWTTokenUpgradeable.sol
   - FeeRouterUpgradeable.sol
   - SwapRouterUpgradeable.sol
   - NFTMembershipUpgradeable.sol
   - ReferralPoolUpgradeable.sol

3. ✅ **Deployment Infrastructure Ready**
   - @openzeppelin/hardhat-upgrades installed
   - hardhat.config.cjs updated
   - Deployment script created: `scripts/deploy-5-upgradeable.js`

## 🎯 Deploy Now

### Option 1: Run the Automated Script (Recommended)

```bash
cd /Users/macbookpri/Downloads/dwallet-v5
npx hardhat run scripts/deploy-5-upgradeable.js --network baseSepolia
```

This will:
- Deploy all 5 contracts with proxy upgradeability
- Configure cross-contract relationships
- Save deployment addresses to JSON file
- Show verification commands

### Option 2: Deploy One by One

If you prefer to deploy contracts individually:

```bash
cd /Users/macbookpri/Downloads/dwallet-v5

# 1. Deploy DWTToken (if you don't have one)
npx hardhat run --network baseSepolia << 'EOF'
const { ethers, upgrades } = require("hardhat");
async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with:", deployer.address);
  
  const DWTToken = await ethers.getContractFactory("DWTTokenUpgradeable");
  const token = await upgrades.deployProxy(DWTToken, [deployer.address]);
  await token.waitForDeployment();
  console.log("DWTToken deployed to:", await token.getAddress());
}
main().catch(console.error);
EOF

# 2. Deploy FeeRouter
npx hardhat run --network baseSepolia << 'EOF'
const { ethers, upgrades } = require("hardhat");
async function main() {
  const [deployer] = await ethers.getSigners();
  const DWT_TOKEN = "YOUR_DWT_TOKEN_ADDRESS";
  const TREASURY = deployer.address;
  
  const FeeRouter = await ethers.getContractFactory("FeeRouterUpgradeable");
  const feeRouter = await upgrades.deployProxy(FeeRouter, [
    TREASURY,
    deployer.address,
    DWT_TOKEN,
    deployer.address,
    deployer.address
  ]);
  await feeRouter.waitForDeployment();
  console.log("FeeRouter deployed to:", await feeRouter.getAddress());
}
main().catch(console.error);
EOF

# 3. Deploy SwapRouter
npx hardhat run --network baseSepolia << 'EOF'
const { ethers, upgrades } = require("hardhat");
async function main() {
  const [deployer] = await ethers.getSigners();
  
  const SwapRouter = await ethers.getContractFactory("SwapRouterUpgradeable");
  const swapRouter = await upgrades.deployProxy(SwapRouter, [
    deployer.address,
    deployer.address,
    deployer.address,
    deployer.address,
    deployer.address,
    deployer.address
  ]);
  await swapRouter.waitForDeployment();
  console.log("SwapRouter deployed to:", await swapRouter.getAddress());
}
main().catch(console.error);
EOF

# 4. Deploy NFTMembership
npx hardhat run --network baseSepolia << 'EOF'
const { ethers, upgrades } = require("hardhat");
async function main() {
  const [deployer] = await ethers.getSigners();
  const DWT_TOKEN = "YOUR_DWT_TOKEN_ADDRESS";
  
  const NFTMembership = await ethers.getContractFactory("NFTMembershipUpgradeable");
  const nft = await upgrades.deployProxy(NFTMembership, [
    DWT_TOKEN,
    deployer.address
  ]);
  await nft.waitForDeployment();
  console.log("NFTMembership deployed to:", await nft.getAddress());
}
main().catch(console.error);
EOF

# 5. Deploy ReferralPool
npx hardhat run --network baseSepolia << 'EOF'
const { ethers, upgrades } = require("hardhat");
async function main() {
  const [deployer] = await ethers.getSigners();
  const DWT_TOKEN = "YOUR_DWT_TOKEN_ADDRESS";
  
  const ReferralPool = await ethers.getContractFactory("ReferralPoolUpgradeable");
  const referral = await upgrades.deployProxy(ReferralPool, [
    DWT_TOKEN,
    deployer.address,
    deployer.address
  ]);
  await referral.waitForDeployment();
  console.log("ReferralPool deployed to:", await referral.getAddress());
}
main().catch(console.error);
EOF
```

## 📊 Check Your Balance

Before deploying, ensure you have testnet ETH:

```bash
# Check deployer address
node -e "const {ethers} = require('ethers'); const wallet = new ethers.Wallet('0x$(grep DEPLOYER_PRIVATE_KEY .env | cut -d'=' -f2)'); console.log('Address:', wallet.address)"

# Get Base Sepolia ETH from:
# - https://cloud.google.com/application/web3/faucet/ethereum/base-sepolia
# - https://www.alchemy.com/faucets/base-sepolia
```

## 🔍 Verify Contracts

After deployment, verify on Basescan:

```bash
# Replace <ADDRESS> with actual deployed addresses
npx hardhat verify --network baseSepolia <ADDRESS>
```

## 📝 Important Notes

1. **Proxy Addresses**: The deployment creates proxy contracts. Use the proxy addresses in your frontend.

2. **Implementation Addresses**: Keep these safe for future upgrades.

3. **Security Controller**: If you have Layer 7 Security deployed, update the deployment script to use that address instead of deployer address.

4. **Existing DWT Token**: The script will use your existing DWT token if `DWT_TOKEN_ADDRESS` is set in .env

## 🎉 After Deployment

1. Update your `.env` file with new addresses
2. Update frontend contract addresses
3. Test all contract functions
4. Fund ReferralPool with DWT tokens
5. Configure FeeRouter tiers if needed

---

**Need help?** Check [DEPLOYMENT_GUIDE_BASE_SEPOLIA.md](./DEPLOYMENT_GUIDE_BASE_SEPOLIA.md) for detailed instructions.
