# 🚀 DEPLOY TO BASE TESTNET - COMPLETE GUIDE

## 📋 PREREQUISITES CHECKLIST

### ✅ 1. Environment Setup

**Step 1:** Update `.env.preproduction` with your private key

```bash
# Open the file
nano .env.preproduction
```

**Step 2:** Add your Base Sepolia testnet private key:

```bash
DEPLOYER_PRIVATE_KEY=your_private_key_without_0x_prefix
BASESCAN_API_KEY=get_from_basescan_org
```

⚠️ **SECURITY WARNING:** NEVER use mainnet private keys! Only use testnet keys.

---

### ✅ 2. Get Base Sepolia ETH

You need Base Sepolia testnet ETH for gas fees.

**Option A: Chainlink Faucet (Recommended)**
1. Go to: https://faucets.chain.link/base-sepolia
2. Connect your wallet
3. Request testnet ETH
4. Wait ~30 seconds for confirmation

**Option B: Alchemy Faucet**
1. Go to: https://www.alchemy.com/faucets/base-sepolia
2. Paste your address
3. Click "Send Testnet ETH"

**Option C: Coinbase Wallet**
1. Go to: https://wallet.coinbase.com/faucets
2. Select Base Sepolia
3. Request funds

---

### ✅ 3. Verify Network Configuration

Check that Base Sepolia is configured in `hardhat.config.cjs`:

```javascript
baseSepolia: {
  url: 'https://sepolia.base.org',
  accounts: [`0x${DEPLOYER_PRIVATE_KEY}`],
  chainId: 84532,
  gasPrice: 'auto',
  timeout: 120000, // 2 minutes
},
```

✅ Already configured!

---

## 🎯 DEPLOYMENT STEPS

### Step 1: Compile Security Contracts

First, compile ONLY the security contracts (avoids old contract errors):

```bash
cd /Users/macbookpri/Downloads/dwallet-v5

# Compile security contracts only
npx hardhat compile --config hardhat.security.config.cjs
```

**Expected Output:**
```
✓ Compiled 5 Solidity files successfully
```

If you see errors, run:
```bash
npx hardhat clean
npx hardhat compile --config hardhat.security.config.cjs --force
```

---

### Step 2: Deploy to Base Sepolia

Run the deployment script:

```bash
npx hardhat run scripts/deploy-security-base-testnet.js --network baseSepolia
```

**Expected Output:**
```
🚀 Deploying Security Core to BASE SEPOLIA Testnet...

Deployer Address: 0xYourAddress...
Deployer Balance: 0.5 ETH

Network: baseSepolia (Chain ID: 84532)

📋 Step 1: Deploying InvariantChecker...
✅ InvariantChecker deployed to: 0x...

🔒 Step 2: Deploying MockLayer7Security...
✅ MockLayer7Security deployed to: 0x...

🔐 Step 3: Deploying LockEngine...
✅ LockEngine deployed to: 0x...

🧠 Step 4: Deploying SecurityController...
✅ SecurityController deployed to: 0x...

⏱️  Step 5: Deploying GovernanceTimelock...
✅ GovernanceTimelock deployed to: 0x...

⚙️  Step 6: Initial Configuration...
    ✓ Rate limit set: 1M DWT per block
    ✓ Cooldown set: 24 hours
    ✓ Time delay set: 48 hours
    ✓ Test layer activated
    ✓ Threat thresholds set
    ✓ Auto-response enabled

🎉 DEPLOYMENT COMPLETE ON BASE SEPOLIA!
```

**Save the contract addresses!** They'll be in:
- Console output
- `/deployments/security-base-sepolia.json`

---

### Step 3: Verify Contracts on BaseScan

After deployment, verify each contract on BaseScan for transparency:

```bash
# Verify InvariantChecker
npx hardhat verify \
  --network baseSepolia \
  <INVARIANT_CHECKER_ADDRESS> \
  <YOUR_DEPLOYER_ADDRESS>

# Verify LockEngine
npx hardhat verify \
  --network baseSepolia \
  <LOCK_ENGINE_ADDRESS> \
  <ADMIN_ADDRESS> \
  <SIGNER_ADDRESS> \
  <MOCK_LAYER7_ADDRESS> \
  <INVARIANT_CHECKER_ADDRESS>

# Verify SecurityController
npx hardhat verify \
  --network baseSepolia \
  <SECURITY_CONTROLLER_ADDRESS> \
  <ADMIN_ADDRESS> \
  <ANALYST_ADDRESS> \
  <MOCK_LAYER7_ADDRESS>

# Verify GovernanceTimelock
npx hardhat verify \
  --network baseSepolia \
  <GOVERNANCE_TIMELOCK_ADDRESS> \
  '["<PROPOSER_ADDRESS>"]' \
  '["<EXECUTOR_ADDRESS>"]' \
  '["<COUNCIL_ADDRESS>"]' \
  <ADMIN_ADDRESS>
```

Replace `<ADDRESS>` placeholders with actual addresses from deployment output.

---

## 🔍 POST-DEPLOYMENT VERIFICATION

### Test Contract Interaction

Create a test script to verify everything works:

```bash
# Create test script
cat > test-deployment.js << 'EOF'
const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  
  // Load deployment info
  const deployment = require("./deployments/security-base-sepolia.json");
  
  console.log("🔍 Testing Deployment...\n");
  
  // Test LockEngine
  const LockEngine = await hre.ethers.getContractFactory("LockEngine");
  const lockEngine = LockEngine.attach(deployment.contracts.LockEngine);
  
  const MINT_ACTION = hre.ethers.id("MINT_ACTION");
  const rateLimit = await lockEngine.rateLimits(MINT_ACTION);
  console.log("✅ LockEngine - Rate Limit:", rateLimit.limit.toString());
  
  // Test SecurityController
  const SecurityController = await hre.ethers.getContractFactory("SecurityController");
  const securityController = SecurityController.attach(deployment.contracts.SecurityController);
  
  const config = await securityController.threatConfig();
  console.log("✅ SecurityController - Low Threshold:", config.lowThreshold.toString());
  
  console.log("\n🎉 All tests passed!");
}

main().catch(console.error);
EOF

# Run test
npx hardhat run test-deployment.js --network baseSepolia
```

---

## 📊 MONITORING YOUR DEPLOYMENT

### View on Explorer

Base Sepolia Explorer:
- **URL:** https://sepolia-explorer.base.network
- **Alternative:** https://sepolia.basescan.org

Search for your contract addresses to view:
- Transactions
- Contract interactions
- Gas usage
- Token transfers

### Set Up Alerts

Use Tenderly or Alchemy to monitor contract events:

1. **Tenderly:**
   - Go to https://tenderly.co
   - Add your contracts
   - Set up alerts for critical functions

2. **Alchemy Notify:**
   - Go to https://dashboard.alchemy.com
   - Create webhook for your contracts
   - Subscribe to events

---

## 🎮 INTERACT WITH CONTRACTS

### Example: Test LockEngine Rate Limiting

```javascript
// test-rate-limit.js
const hre = require("hardhat");

async function main() {
  const [user1, user2] = await hre.ethers.getSigners();
  
  const deployment = require("./deployments/security-base-sepolia.json");
  const LockEngine = await hre.ethers.getContractFactory("LockEngine");
  const lockEngine = LockEngine.attach(deployment.contracts.LockEngine);
  
  const MINT_ACTION = hre.ethers.id("MINT_ACTION");
  
  // Simulate rapid minting attempts
  console.log("Testing rate limiting...\n");
  
  try {
    // First transaction (should succeed)
    const tx1 = await lockEngine.connect(user1).checkAllLocks(
      user1.address,
      MINT_ACTION,
      MINT_ACTION,
      hre.ethers.id("LAYER_TEST"),
      hre.parseEther("500000") // 500k (under 1M limit)
    );
    await tx1.wait();
    console.log("✅ Transaction 1 succeeded");
    
    // Second transaction (might hit rate limit)
    const tx2 = await lockEngine.connect(user2).checkAllLocks(
      user2.address,
      MINT_ACTION,
      MINT_ACTION,
      hre.ethers.id("LAYER_TEST"),
      hre.parseEther("600000") // 600k (exceeds remaining)
    );
    await tx2.wait();
    console.log("✅ Transaction 2 succeeded");
    
  } catch (error) {
    console.log("⚠️ Transaction blocked by rate limit:", error.reason);
  }
}

main().catch(console.error);
```

Run it:
```bash
npx hardhat run test-rate-limit.js --network baseSepolia
```

---

## 🚨 TROUBLESHOOTING

### Error: "Insufficient funds"

**Problem:** Not enough Base Sepolia ETH

**Solution:**
1. Check balance: `npx hardhat run --network baseSepolia -e "console.log(await ethers.provider.getBalance(signer.address))"`
2. Get more from faucets (see above)
3. Use multiple faucets if needed

---

### Error: "Compilation failed"

**Problem:** Old contracts have integration issues

**Solution:**
```bash
# Clean and recompile only security contracts
npx hardhat clean
npx hardhat compile --config hardhat.security.config.cjs --force
```

---

### Error: "Transaction reverted"

**Problem:** Gas too low or network congestion

**Solution:**
1. Increase gas price in hardhat config
2. Wait for network to clear
3. Try again with higher gas limit

---

### Error: "Cannot read properties of undefined"

**Problem:** Deployment file missing or corrupted

**Solution:**
```bash
# Check if file exists
ls -la deployments/security-base-sepolia.json

# If missing, redeploy
npx hardhat run scripts/deploy-security-base-testnet.js --network baseSepolia
```

---

## 📈 NEXT STEPS AFTER DEPLOYMENT

### 1. Run Attack Simulations

Test your deployed contracts against real attacks:

```bash
# Update test network to baseSepolia
sed -i 's/localhost/baseSepolia/g' test/attacks/AttackSimulation.test.js

# Run tests
npx hardhat test test/attacks/AttackSimulation.test.js --network baseSepolia
```

### 2. Integrate with Frontend

Update your frontend config to use Base Sepolia:

```javascript
// src/config/network.ts
export const NETWORK_CONFIG = {
  baseSepolia: {
    chainId: 84532,
    rpcUrl: 'https://sepolia.base.org',
    explorer: 'https://sepolia.basescan.org',
    contracts: {
      lockEngine: '0x...', // From deployment
      securityController: '0x...',
      // ... etc
    }
  }
};
```

### 3. Set Up Monitoring Dashboard

Follow `MONITORING_SYSTEM_COMPLETE.md` to build your real-time dashboard.

### 4. Invite Beta Testers

Share contract addresses with your team for testing.

### 5. Plan Mainnet Deployment

Document lessons learned from testnet deployment.

---

## 💰 COST ESTIMATE

**Deployment Costs (Approximate):**

| Contract | Gas Used | Cost (ETH) | Cost (USD) |
|----------|----------|------------|------------|
| InvariantChecker | ~500k | ~0.001 | ~$0.002 |
| MockLayer7Security | ~300k | ~0.0006 | ~$0.001 |
| LockEngine | ~2M | ~0.004 | ~$0.008 |
| SecurityController | ~1.5M | ~0.003 | ~$0.006 |
| GovernanceTimelock | ~1.8M | ~0.0036 | ~$0.007 |
| **TOTAL** | ~6.1M | ~0.0122 | ~$0.024 |

*Note: Gas prices vary. Testnet ETH is free.*

---

## 🎯 SUCCESS CRITERIA

Your deployment is successful when:

- ✅ All 5 contracts deployed without errors
- ✅ Contract addresses saved in `/deployments/`
- ✅ Contracts verified on BaseScan
- ✅ You can interact with contracts via scripts
- ✅ Rate limiting works as expected
- ✅ Threat detection triggers correctly
- ✅ Team can view contracts on explorer

---

## 📞 SUPPORT & RESOURCES

**Documentation:**
- Base Docs: https://docs.base.org
- Hardhat Docs: https://hardhat.org/docs
- OpenZeppelin: https://docs.openzeppelin.com

**Community:**
- Base Discord: https://discord.gg/buildonbase
- Hardhat Discord: https://discord.gg/hardhat

**Tools:**
- Base Sepolia Faucet: https://faucets.chain.link/base-sepolia
- Base Explorer: https://sepolia.basescan.org
- Tenderly: https://tenderly.co

---

## 🏆 YOU'RE READY!

Execute this command to begin:

```bash
npx hardhat run scripts/deploy-security-base-testnet.js --network baseSepolia
```

Good luck! 🚀

---

**Pro Tip:** Save all contract addresses in a secure location and share them with your team for testing!
