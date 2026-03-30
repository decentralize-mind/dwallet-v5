#!/bin/bash
set -e

# --- Configuration ---
NETWORK="base"
LOG_FILE="deployment_mainnet_$(date +%Y%m%d_%H%M%S).log"

# --- Safety Checks ---
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║             ‼️  MAINNET DEPLOYMENT WARNING  ‼️             ║"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║  You are about to deploy the DWallet Protocol to BASE MAINNET. ║"
echo "║  This will use REAL ETH and deploy LIVE contracts.           ║"
echo "╚══════════════════════════════════════════════════════════════╝"

# Check for .env file
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    exit 1
fi

# Check for DEPLOYER_PRIVATE_KEY
if ! grep -q "DEPLOYER_PRIVATE_KEY" .env; then
    echo "❌ Error: DEPLOYER_PRIVATE_KEY not found in .env!"
    exit 1
fi

# Confirmation prompt
read -p "⚠️  Are you sure you want to proceed? (type 'DEPLOY' to confirm): " confirm
if [ "$confirm" != "DEPLOY" ]; then
    echo "❌ Deployment cancelled."
    exit 1
fi

echo "🚀 Starting Full 10-Layer Mainnet Rollout..." | tee -a "$LOG_FILE"
echo "Network: Base Mainnet ($NETWORK)" | tee -a "$LOG_FILE"
echo "Timestamp: $(date)" | tee -a "$LOG_FILE"
echo "----------------------------------------------------" | tee -a "$LOG_FILE"

# Layer 1 - Core (Token, Governor, Timelock, Treasury)
echo "📡 [1/10] Deploying Layer 1 (Core)..." | tee -a "$LOG_FILE"
npx hardhat run ./contracts/layer1/deploy.cjs --network $NETWORK | tee -a "$LOG_FILE"

# Layer 2 - DEX & Oracle
echo "📡 [2/10] Deploying Layer 2 (DEX & Oracle)..." | tee -a "$LOG_FILE"
npx hardhat run ./contracts/layer2/scripts/deploy.cjs --network $NETWORK | tee -a "$LOG_FILE"

# Layer 3 - Infrastructure (Oracle Bridge, RateFeed, Paymaster)
echo "📡 [3/10] Deploying Layer 3 (Infrastructure)..." | tee -a "$LOG_FILE"
npx hardhat run ./contracts/layer3/deploy.cjs --network $NETWORK | tee -a "$LOG_FILE"

# Layer 4 - Staking & Rewards
echo "📡 [4/10] Deploying Layer 4 (Staking)..." | tee -a "$LOG_FILE"
npx hardhat run ./contracts/layer4/scripts/deploy.cjs --network $NETWORK | tee -a "$LOG_FILE"

# Layer 5 - Governance & DAO
echo "📡 [5/10] Deploying Layer 5 (Governance)..." | tee -a "$LOG_FILE"
npx hardhat run ./contracts/layer5/deploy.cjs --network $NETWORK | tee -a "$LOG_FILE"

# Layer 6 - Treasury & Vesting
echo "📡 [6/10] Deploying Layer 6 (Treasury & Vesting)..." | tee -a "$LOG_FILE"
npx hardhat run ./contracts/layer6/scripts/deploy-layer6.cjs --network $NETWORK | tee -a "$LOG_FILE"

# Layer 7 - Security (Multisig & Pausable)
echo "📡 [7/10] Deploying Layer 7 (Security)..." | tee -a "$LOG_FILE"
npx hardhat run ./scripts/deploy-layer7.cjs --network $NETWORK | tee -a "$LOG_FILE"

# Layer 8 - Multichain Bridge
echo "📡 [8/10] Deploying Layer 8 (Multichain)..." | tee -a "$LOG_FILE"
npx hardhat run ./scripts/deploy-layer8.cjs --network $NETWORK | tee -a "$LOG_FILE"

# Layer 9 - Ecosystem (Lending, NFTs)
echo "📡 [9/10] Deploying Layer 9 (Ecosystem)..." | tee -a "$LOG_FILE"
npx hardhat run ./scripts/deploy-layer9.cjs --network $NETWORK | tee -a "$LOG_FILE"

# Layer 10 - Advanced DeFi (Options, Perpetuals)
echo "📡 [10/10] Deploying Layer 10 (Advanced DeFi)..." | tee -a "$LOG_FILE"
npx hardhat run ./contracts/layer10/scripts/deploy.cjs --network $NETWORK | tee -a "$LOG_FILE"

echo "----------------------------------------------------" | tee -a "$LOG_FILE"
echo "✅ Protocol Rollout Complete!" | tee -a "$LOG_FILE"
echo "📄 Logs saved to: $LOG_FILE"
echo "----------------------------------------------------"
echo "Next Steps:"
echo "1. Verify all contracts on Basescan using 'npx hardhat verify'"
echo "2. Check .env for the final contract addresses"
echo "3. Update the frontend/app with the new contract mapping"
echo "4. Run 'scripts/verify_all.sh' for final smoke tests"
