# 🚀 Deploy 5 Upgradeable Contracts to Base Sepolia

## Prerequisites ✅

- [x] Private key configured in `.env` (`DEPLOYER_PRIVATE_KEY`)
- [x] Base Sepolia RPC configured
- [x] @openzeppelin/hardhat-upgrades installed
- [x] Hardhat config updated with upgrades plugin
- [x] Security fixes applied to all contracts
- [x] Upgradeable versions created

## 📋 Deployment Steps

### Step 1: Verify Balance

Check your deployer wallet has enough ETH on Base Sepolia:

```bash
# Get your deployer address
node -e "const {ethers} = require('ethers'); console.log(new ethers.Wallet('0x' + process.env.DEPLOYER_PRIVATE_KEY).address)"

# Check balance on Base Sepolia faucet if needed
# https://cloud.google.com/application/web3/faucet/ethereum/base-sepolia
# https://www.alchemy.com/faucets/base-sepolia
```

### Step 2: Deploy All 5 Contracts

```bash
npx hardhat run scripts/deploy-5-upgradeable.js --network baseSepolia
```

### Step 3: Verify Contracts on Basescan

After deployment, verify each contract:

```bash
npx hardhat verify --network baseSepolia <DWTToken_ADDRESS>
npx hardhat verify --network baseSepolia <FeeRouter_ADDRESS>
npx hardhat verify --network baseSepolia <SwapRouter_ADDRESS>
npx hardhat verify --network baseSepolia <NFTMembership_ADDRESS>
npx hardhat verify --network baseSepolia <ReferralPool_ADDRESS>
```

### Step 4: Post-Deployment Configuration

1. **Fund ReferralPool** with DWT tokens for referral rewards
2. **Configure FeeRouter** discount tiers (if needed)
3. **Register liquidity pools** in SwapRouter
4. **Update .env** with new contract addresses

## 📊 Expected Gas Costs

Base Sepolia is a testnet, so gas costs are minimal:
- Estimated total: ~0.005 - 0.01 ETH
- Each contract: ~0.001 - 0.002 ETH

## 🔧 Contract Configuration

The deployment script will use these addresses from your `.env`:

| Parameter | .env Variable | Fallback |
|-----------|--------------|----------|
| Security Controller | `LAYER7_SECURITY_ADDRESS` or `SECURITY_L7` | Deployer address |
| DWT Token | `DWT_TOKEN_ADDRESS` or `DWT_TOKEN` | Deploys new |
| Treasury | `TREASURY` or `DAO_TREASURY_ADDRESS` | Deployer address |
| Governor/Safe | `SAFE_ADDRESS` or `MULTISIG_ADDRESS` | Deployer address |

## ⚠️ Important Notes

1. **Proxy Pattern**: All contracts use OpenZeppelin's UUPS proxy pattern
   - Implementation contracts are separate from proxy contracts
   - Use `upgrades.deployProxy()` for deployment
   - Upgrade later using `upgrades.upgradeProxy()`

2. **Initializers**: Constructors are disabled, use `initialize()` functions instead

3. **Security Controller**: If you don't have Layer 7 deployed yet, contracts will use deployer address as fallback
   - You can update this later via admin functions

4. **Save Addresses**: Deployment will save addresses to `deployment-baseSepolia-<timestamp>.json`

## 🎯 Deployment Output

After successful deployment, you'll see:

```
🎉 DEPLOYMENT COMPLETE!
═══════════════════════════════════════════════════════════════

📋 Deployed Contract Addresses:
─────────────────────────────────────────────────────────────────
DWTToken:         0x...
FeeRouter:        0x...
SwapRouter:       0x...
NFTMembership:    0x...
ReferralPool:     0x...
─────────────────────────────────────────────────────────────────
```

## 🔍 Verify Deployment

Check deployed contracts on Base Sepolia explorer:
- https://sepolia.basescan.org/address/<CONTRACT_ADDRESS>

## 📝 Next Steps After Deployment

1. **Test all contract functions** on testnet
2. **Run security audit** if planning mainnet deployment
3. **Set up monitoring** for contract events
4. **Document contract addresses** in project README
5. **Update frontend** with new contract addresses

## 🚨 Troubleshooting

### Insufficient Balance
```bash
# Get testnet ETH from faucets:
# - https://cloud.google.com/application/web3/faucet/ethereum/base-sepolia
# - https://www.alchemy.com/faucets/base-sepolia
# - https://faucet.quicknode.com/ethereum/sepolia
```

### Compilation Errors
```bash
# Clean and recompile
npx hardhat clean
npx hardhat compile
```

### Deployment Timeout
```bash
# Increase timeout in hardhat.config.cjs
baseSepolia: {
  ...
  timeout: 120000, // 2 minutes
}
```

---

**Ready to deploy?** Run the deployment script! 🚀

```bash
npx hardhat run scripts/deploy-5-upgradeable.js --network baseSepolia
```
