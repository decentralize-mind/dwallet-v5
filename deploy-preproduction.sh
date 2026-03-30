#!/bin/bash

# dWallet Pre-Production Deployment Script
# This script deploys to Vercel Pre-Production environment

set -e  # Exit on error

echo "🚀 dWallet Pre-Production Deployment"
echo "======================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env.preproduction exists
if [ ! -f ".env.preproduction" ]; then
    echo -e "${RED}❌ Error: .env.preproduction not found!${NC}"
    echo "Please create it with Sepolia testnet configuration."
    exit 1
fi

echo -e "${GREEN}✅ Found .env.preproduction${NC}"

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is required but not installed.${NC}"
    exit 1
fi

# Check for Vercel CLI
if ! command -v vercel &> /dev/null; then
    echo -e "${YELLOW}⚠️  Vercel CLI not found. Installing...${NC}"
    npm install -g vercel
fi

echo -e "${GREEN}✅ Vercel CLI detected${NC}"

# Run the deployment script
echo ""
echo "🔨 Building pre-production version..."
node scripts/deploy-preproduction.js

echo ""
echo -e "${GREEN}✨ Ready to deploy!${NC}"
echo ""
echo "Next steps:"
echo "1. Review the build"
echo "2. Run: vercel --prod --prebuilt"
echo "3. Test on Sepolia testnet"
echo ""
echo -e "${YELLOW}⚠️  Remember: This is PRE-PRODUCTION (testnet only)${NC}"
echo ""
