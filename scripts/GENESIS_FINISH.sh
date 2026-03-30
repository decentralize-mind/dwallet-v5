#!/bin/bash
set -e

echo "🚀 Starting Genesis Refresh Final Rollout (L1-L10)..."
echo "Network: Base Sepolia"
echo "----------------------------------------------------"

# Layer 7 - Security (Protocol Controller)
echo "📡 Deploying Layer 7..."
npx hardhat run ./scripts/deploy-layer7.cjs --network baseSepolia

# Layer 1 - Core (Token, Governor, Timelock, Treasury)
echo "📡 Deploying Layer 1..."
npx hardhat run ./contracts/layer1/deploy.cjs --network baseSepolia

# Layer 2 - DEX & Oracle
echo "📡 Deploying Layer 2..."
npx hardhat run ./contracts/layer2/scripts/deploy.cjs --network baseSepolia

# Layer 3 - Infrastructure (Oracle, RateFeed, Paymaster)
echo "📡 Deploying Layer 3..."
npx hardhat run ./contracts/layer3/deploy.cjs --network baseSepolia

# Layer 4 - Staking & Rewards
echo "📡 Deploying Layer 4..."
npx hardhat run ./contracts/layer4/scripts/deploy.cjs --network baseSepolia

# Layer 5 - Cross-Chain Hub & Flash Loans
echo "📡 Deploying Layer 5..."
npx hardhat run ./contracts/layer5/deploy.cjs --network baseSepolia

# Layer 6 - Treasury & Vesting
echo "📡 Deploying Layer 6..."
npx hardhat run ./contracts/layer6/scripts/deploy-layer6.cjs --network baseSepolia

# Layer 8 - Multichain Bridge
echo "📡 Deploying Layer 8..."
npx hardhat run ./scripts/deploy-layer8.cjs --network baseSepolia

# Layer 9 - Ecosystem (Lending, NFTs)
echo "📡 Deploying Layer 9..."
npx hardhat run ./scripts/deploy-layer9.cjs --network baseSepolia

# Layer 10 - Advanced DeFi (Options, Perpetuals)
echo "📡 Deploying Layer 10..."
npx hardhat run ./contracts/layer10/scripts/deploy.cjs --network baseSepolia

echo "----------------------------------------------------"
echo "✅ Genesis Refresh Full Protocol Rollout Complete!"
echo "Check your .env for the final contract addresses."
