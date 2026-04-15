#!/bin/bash

# 🚀 dWallet v5 Security Deployment Helper for Base Sepolia
# This script helps you deploy the core security contracts to Base testnet

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   dWallet v5 - Base Sepolia Security Deployment       ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if .env.preproduction exists
if [ ! -f ".env.preproduction" ]; then
    echo -e "${RED}❌ Error: .env.preproduction not found!${NC}"
    echo "Please copy .env.example to .env.preproduction first"
    exit 1
fi

# Check if DEPLOYER_PRIVATE_KEY is set
PRIVATE_KEY=$(grep "^DEPLOYER_PRIVATE_KEY=" .env.preproduction | cut -d '=' -f2)

if [ "$PRIVATE_KEY" = "YOUR_SEPOLIA_TEST_PRIVATE_KEY_HERE" ] || [ -z "$PRIVATE_KEY" ]; then
    echo -e "${YELLOW}⚠️  Private key not configured!${NC}"
    echo ""
    echo "Please update your private key in .env.preproduction:"
    echo "  nano .env.preproduction"
    echo ""
    echo "Replace this line:"
    echo "  DEPLOYER_PRIVATE_KEY=YOUR_SEPOLIA_TEST_PRIVATE_KEY_HERE"
    echo ""
    echo "With your actual Base Sepolia testnet private key (no 0x prefix)"
    echo ""
    echo -e "${YELLOW}💡 Don't have a testnet key? Here's how to get one:${NC}"
    echo "  1. Create a new wallet in MetaMask"
    echo "  2. Add Base Sepolia network:"
    echo "     - Network Name: Base Sepolia"
    echo "     - RPC URL: https://sepolia.base.org"
    echo "     - Chain ID: 84532"
    echo "     - Currency: ETH"
    echo "  3. Export private key from MetaMask"
    echo "  4. Get free ETH from: https://faucets.chain.link/base-sepolia"
    echo ""
    read -p "Press Enter after you've updated the private key..."
fi

echo -e "${GREEN}✅ Private key configured${NC}"
echo ""

# Check balance
echo -e "${BLUE}Checking deployer balance...${NC}"
BALANCE_OUTPUT=$(npx hardhat run --network baseSepolia -e "
const hre = require('hardhat');
async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log('ADDRESS:' + deployer.address);
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log('BALANCE:' + hre.formatEther(balance));
}
main().catch(err => {
  console.error('ERROR:' + err.message);
  process.exit(1);
});
" 2>&1) || {
    echo -e "${RED}❌ Failed to connect to Base Sepolia network${NC}"
    echo "Check your internet connection and try again"
    exit 1
}

DEPLOYER_ADDRESS=$(echo "$BALANCE_OUTPUT" | grep "^ADDRESS:" | cut -d ':' -f2)
BALANCE=$(echo "$BALANCE_OUTPUT" | grep "^BALANCE:" | cut -d ':' -f2)

if [[ "$BALANCE_OUTPUT" == *"ERROR:"* ]]; then
    echo -e "${RED}❌ Error connecting to network${NC}"
    echo "Please check your internet connection"
    exit 1
fi

echo -e "${GREEN}✓ Deployer Address: $DEPLOYER_ADDRESS${NC}"
echo -e "${GREEN}✓ Balance: $BALANCE ETH${NC}"
echo ""

# Check if balance is sufficient
BALANCE_Wei=$(echo "$BALANCE" | awk '{printf "%.0f", $1 * 1000}')
if [ "$BALANCE_Wei" -lt 50 ]; then
    echo -e "${YELLOW}⚠️  Low balance detected!${NC}"
    echo ""
    echo "Your balance ($BALANCE ETH) might not be enough for deployment."
    echo "Recommended: at least 0.05 ETH"
    echo ""
    echo "Get free Base Sepolia ETH from:"
    echo "  • https://faucets.chain.link/base-sepolia"
    echo "  • https://www.alchemy.com/faucets/base-sepolia"
    echo ""
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 0
    fi
fi

# Compile contracts
echo -e "${BLUE}Compiling security contracts...${NC}"
npx hardhat compile --config hardhat.security.config.cjs || {
    echo -e "${RED}❌ Compilation failed!${NC}"
    echo "Try cleaning and recompiling:"
    echo "  npx hardhat clean"
    echo "  npx hardhat compile --config hardhat.security.config.cjs --force"
    exit 1
}
echo -e "${GREEN}✅ Compilation successful${NC}"
echo ""

# Deploy
echo -e "${BLUE}Deploying contracts to Base Sepolia...${NC}"
echo ""
npx hardhat run scripts/deploy-security-base-testnet.js --network baseSepolia

EXIT_CODE=$?

echo ""
if [ $EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║           🎉 DEPLOYMENT SUCCESSFUL! 🎉                ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${BLUE}📝 Your contracts are deployed to:${NC}"
    echo "   /Users/macbookpri/Downloads/dwallet-v5/deployments/security-base-sepolia.json"
    echo ""
    echo -e "${BLUE}🔍 View on explorer:${NC}"
    echo "   https://sepolia.basescan.org/"
    echo ""
    echo -e "${YELLOW}Next steps:${NC}"
    echo "  1. Save contract addresses securely"
    echo "  2. Verify contracts on BaseScan"
    echo "  3. Test with attack simulations"
    echo "  4. Share with your team"
    echo ""
    echo -e "${BLUE}For detailed instructions, see:${NC}"
    echo "  BASE_TESTNET_DEPLOYMENT_GUIDE.md"
else
    echo -e "${RED}❌ Deployment failed!${NC}"
    echo ""
    echo "Common issues:"
    echo "  • Insufficient funds - Get more testnet ETH"
    echo "  • Network timeout - Try again"
    echo "  • Gas price too low - Update hardhat config"
    echo ""
    echo "Check the error message above for details."
fi

exit $EXIT_CODE
