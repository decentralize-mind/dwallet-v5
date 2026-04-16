#!/bin/bash
# Manual Contract Verification Script for Base Sepolia
# Run this script to verify contracts one by one

echo "🔍 Starting Manual Contract Verification..."
echo "================================================"
echo ""

# Contract 1: NFTMembership (simplest - 2 params)
echo "📝 Verifying NFTMembership..."
npx hardhat verify --network baseSepolia \
  --contract contracts/layer9/NFTMembership.sol:NFTMembership \
  0x74297Fa47E6103148D3A4119d7B00C6a94B927D7 \
  0x3400b0167dA5b2dba0b88b9604eE7df4BFc1f1fa \
  0x813b537A21bF5AC6967E870db47Ec2770651B11F

echo ""
echo "⏳ Waiting 10 seconds before next verification..."
sleep 10

# Contract 2: FeeRouter (5 params)
echo ""
echo "📝 Verifying FeeRouter..."
npx hardhat verify --network baseSepolia \
  --contract contracts/layer9/FeeRouter.sol:FeeRouter \
  0x6552d7c4628e9e71c2E3cBEaB9f17CF67Bee1D89 \
  0x4C0B7314441dfE8E61267C0d87Fc1A657611dCf5 \
  0x4C0B7314441dfE8E61267C0d87Fc1A657611dCf5 \
  0x3400b0167dA5b2dba0b88b9604eE7df4BFc1f1fa \
  0x813b537A21bF5AC6967E870db47Ec2770651B11F \
  0x4C0B7314441dfE8E61267C0d87Fc1A657611dCf5

echo ""
echo "⏳ Waiting 10 seconds before next verification..."
sleep 10

# Contract 3: SwapRouter (6 params)
echo ""
echo "📝 Verifying SwapRouter..."
npx hardhat verify --network baseSepolia \
  --contract contracts/layer9/SwapRouter.sol:SwapRouter \
  0x2a4b239C15f54218a30116c630a32d9305859a43 \
  0x4C0B7314441dfE8E61267C0d87Fc1A657611dCf5 \
  0x4C0B7314441dfE8E61267C0d87Fc1A657611dCf5 \
  0x813b537A21bF5AC6967E870db47Ec2770651B11F \
  0x0000000000000000000000000000000000000000 \
  0x059327A069Ba66A74ecF21fde8c1c0D2915e0DB3 \
  0x0000000000000000000000000000000000000000

echo ""
echo "⏳ Waiting 10 seconds before next verification..."
sleep 10

# Contract 4: DWalletStablecoin (7 params)
echo ""
echo "📝 Verifying DWalletStablecoin..."
npx hardhat verify --network baseSepolia \
  --contract contracts/layer9/DWalletStablecoin.sol:DWalletStablecoin \
  0x83852A1C0A6C13fa8aCD950e51A2A594A7D7Ec29 \
  0x813b537A21bF5AC6967E870db47Ec2770651B11F \
  0x0000000000000000000000000000000000000000 \
  0x059327A069Ba66A74ecF21fde8c1c0D2915e0DB3 \
  0x0000000000000000000000000000000000000000 \
  0x4C0B7314441dfE8E61267C0d87Fc1A657611dCf5 \
  0x4C0B7314441dfE8E61267C0d87Fc1A657611dCf5 \
  10000000000000000000000000

echo ""
echo "⏳ Waiting 10 seconds before next verification..."
sleep 10

# Contract 5: LendingMarket (13 params - complex)
echo ""
echo "📝 Verifying LendingMarket..."
npx hardhat verify --network baseSepolia \
  --contract contracts/layer9/LendingMarket.sol:LendingMarket \
  0xcbBc5E87BDdbD6A1346FD635efDB23C0cB944794 \
  0x3400b0167dA5b2dba0b88b9604eE7df4BFc1f1fa \
  0x0000000000000000000000000000000000000000 \
  0x0000000000000000000000000000000000000000 \
  0x0000000000000000000000000000000000000000 \
  18 \
  6 \
  0x4C0B7314441dfE8E61267C0d87Fc1A657611dCf5 \
  0x4C0B7314441dfE8E61267C0d87Fc1A657611dCf5 \
  0x4C0B7314441dfE8E61267C0d87Fc1A657611dCf5 \
  0x813b537A21bF5AC6967E870db47Ec2770651B11F \
  0x0000000000000000000000000000000000000000 \
  0x059327A069Ba66A74ecF21fde8c1c0D2915e0DB3 \
  0x0000000000000000000000000000000000000000

echo ""
echo "================================================"
echo "🎉 Verification commands executed!"
echo ""
echo "⚠️  Note: If you see 'deprecated V1 endpoint' errors,"
echo "   you'll need to wait for Etherscan V2 API support"
echo "   or verify manually via the web interface:"
echo "   https://sepolia.basescan.org/address/<CONTRACT>#code"
echo "================================================"
