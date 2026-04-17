#!/bin/bash
set -e

# ═══════════════════════════════════════════════════════
# Multi-Chain Deployment Setup Script
# ═══════════════════════════════════════════════════════

echo "🌐 dWallet v5 - Multi-Chain Expansion Setup"
echo "═══════════════════════════════════════════════════"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Ask user which expansion path
echo -e "${BLUE}Choose your expansion path:${NC}"
echo "1) Base Mainnet only (Production)"
echo "2) Multi-Chain (Base + Arbitrum + Polygon)"
echo "3) Full Ecosystem (5+ chains)"
echo ""
read -p "Enter choice (1-3): " CHOICE

case $CHOICE in
    1)
        echo ""
        echo -e "${GREEN}✅ Option 1: Base Mainnet Production${NC}"
        echo ""
        
        # Check if production env exists
        if [ ! -f ".env.production" ]; then
            echo -e "${YELLOW}Creating .env.production...${NC}"
            cp .env.example .env.production
            echo -e "${GREEN}✓ Created .env.production${NC}"
            echo ""
            echo -e "${RED}⚠️  IMPORTANT: Edit .env.production with your mainnet keys!${NC}"
            echo "   - DEPLOYER_PRIVATE_KEY (mainnet wallet)"
            echo "   - BASESCAN_API_KEY"
            echo "   - INFURA_KEY"
            echo ""
            read -p "Press Enter after updating .env.production..."
        fi
        
        echo -e "${BLUE}Checking requirements...${NC}"
        
        # Check if contracts compile
        echo "1/5 Compiling contracts..."
        npx hardhat compile --config hardhat.config.cjs
        echo -e "${GREEN}✓ Contracts compiled${NC}"
        echo ""
        
        # Run security tests
        echo "2/5 Running security tests..."
        if [ -f "run-all-security-tests.sh" ]; then
            bash run-all-security-tests.sh
            echo -e "${GREEN}✓ Security tests passed${NC}"
        else
            echo -e "${YELLOW}⚠️  Security test script not found, skipping...${NC}"
        fi
        echo ""
        
        # Check balance
        echo "3/5 Checking deployer balance on Base Mainnet..."
        source .env.production
        npx hardhat run --network base -e "
            const hre = require('hardhat');
            async function main() {
                const [deployer] = await hre.ethers.getSigners();
                console.log('Deployer Address:', deployer.address);
                const balance = await hre.ethers.provider.getBalance(deployer.address);
                console.log('Balance:', hre.formatEther(balance), 'ETH');
                
                const balanceEth = parseFloat(hre.formatEther(balance));
                if (balanceEth < 0.5) {
                    console.error('⚠️  WARNING: Balance too low! Need at least 0.5 ETH');
                    process.exit(1);
                }
            }
            main().catch(err => {
                console.error('ERROR:', err.message);
                process.exit(1);
            });
        " 2>&1 || {
            echo -e "${RED}❌ Failed to connect to Base Mainnet${NC}"
            echo "Check your .env.production and RPC configuration"
            exit 1
        }
        echo -e "${GREEN}✓ Balance check passed${NC}"
        echo ""
        
        # Deploy
        echo "4/5 Starting deployment to Base Mainnet..."
        echo -e "${YELLOW}This will deploy all 10 layers. Continue? (y/n)${NC}"
        read -p "> " CONFIRM
        
        if [ "$CONFIRM" = "y" ]; then
            ./scripts/mainnet_deploy.sh
            echo -e "${GREEN}✓ Deployment complete!${NC}"
        else
            echo -e "${YELLOW}Deployment cancelled${NC}"
            exit 0
        fi
        echo ""
        
        # Verify
        echo "5/5 Contract verification..."
        echo -e "${YELLOW}Would you like to verify contracts on BaseScan? (y/n)${NC}"
        read -p "> " VERIFY
        
        if [ "$VERIFY" = "y" ]; then
            echo -e "${BLUE}Run: npx hardhat verify --network base <CONTRACT_ADDRESS>${NC}"
        fi
        echo ""
        
        echo -e "${GREEN}═══════════════════════════════════════════════════${NC}"
        echo -e "${GREEN}✅ Base Mainnet deployment setup complete!${NC}"
        echo -e "${GREEN}═══════════════════════════════════════════════════${NC}"
        echo ""
        echo "Next steps:"
        echo "1. Save all contract addresses"
        echo "2. Verify contracts on BaseScan"
        echo "3. Transfer ownership to governance"
        echo "4. Set up monitoring"
        echo "5. Announce to community"
        ;;
        
    2)
        echo ""
        echo -e "${GREEN}✅ Option 2: Multi-Chain Expansion${NC}"
        echo ""
        
        echo -e "${BLUE}This will set up deployment for:${NC}"
        echo "  - Base (Mainnet + Testnet)"
        echo "  - Arbitrum (Mainnet + Testnet)"
        echo "  - Polygon (Mainnet + Testnet)"
        echo ""
        
        # Update hardhat config
        echo "1/6 Updating hardhat configuration..."
        if grep -q "arbitrumSepolia" hardhat.config.cjs; then
            echo -e "${GREEN}✓ Networks already configured${NC}"
        else
            echo -e "${YELLOW}Need to add Arbitrum and Polygon networks to hardhat.config.cjs${NC}"
            echo ""
            echo "Add these networks to your hardhat.config.cjs:"
            echo ""
            cat << 'EOF'
    arbitrumSepolia: {
      url: 'https://sepolia-rollup.arbitrum.io/rpc',
      accounts: [`0x${DEPLOYER_PRIVATE_KEY}`],
      chainId: 421614,
    },
    polygonAmoy: {
      url: 'https://rpc-amoy.polygon.technology',
      accounts: [`0x${DEPLOYER_PRIVATE_KEY}`],
      chainId: 80002,
    },
    arbitrum: {
      url: 'https://arb1.arbitrum.io/rpc',
      accounts: [`0x${DEPLOYER_PRIVATE_KEY}`],
      chainId: 42161,
    },
    polygon: {
      url: 'https://polygon-rpc.com',
      accounts: [`0x${DEPLOYER_PRIVATE_KEY}`],
      chainId: 137,
    },
EOF
            echo ""
            read -p "Press Enter after updating hardhat.config.cjs..."
        fi
        echo ""
        
        # Get testnet funds
        echo "2/6 Get testnet ETH for deployment..."
        echo ""
        echo -e "${BLUE}Required testnet ETH:${NC}"
        echo "  - Base Sepolia: https://faucets.chain.link/base-sepolia"
        echo "  - Arbitrum Sepolia: https://faucet.quicknode.com/arbitrum/sepolia"
        echo "  - Polygon Amoy: https://faucet.polygon.technology/"
        echo ""
        read -p "Press Enter after getting testnet ETH..."
        echo ""
        
        # Compile
        echo "3/6 Compiling contracts..."
        npx hardhat compile
        echo -e "${GREEN}✓ Compilation complete${NC}"
        echo ""
        
        # Deploy on testnets
        echo "4/6 Deploying to testnets..."
        echo ""
        
        echo -e "${BLUE}Deploy to Base Sepolia? (y/n)${NC}"
        read -p "> " DEPLOY_BASE
        if [ "$DEPLOY_BASE" = "y" ]; then
            echo "Deploying to Base Sepolia..."
            npx hardhat run scripts/deploy-layer8.cjs --network baseSepolia
            echo -e "${GREEN}✓ Base Sepolia deployed${NC}"
        fi
        echo ""
        
        echo -e "${BLUE}Deploy to Arbitrum Sepolia? (y/n)${NC}"
        read -p "> " DEPLOY_ARBITRUM
        if [ "$DEPLOY_ARBITRUM" = "y" ]; then
            echo "Deploying to Arbitrum Sepolia..."
            npx hardhat run scripts/deploy-layer8.cjs --network arbitrumSepolia
            echo -e "${GREEN}✓ Arbitrum Sepolia deployed${NC}"
        fi
        echo ""
        
        echo -e "${BLUE}Deploy to Polygon Amoy? (y/n)${NC}"
        read -p "> " DEPLOY_POLYGON
        if [ "$DEPLOY_POLYGON" = "y" ]; then
            echo "Deploying to Polygon Amoy..."
            npx hardhat run scripts/deploy-layer8.cjs --network polygonAmoy
            echo -e "${GREEN}✓ Polygon Amoy deployed${NC}"
        fi
        echo ""
        
        # Cross-chain setup
        echo "5/6 Cross-chain bridge configuration..."
        echo -e "${YELLOW}You'll need LayerZero or Axelar integration${NC}"
        echo ""
        echo "Choose cross-chain provider:"
        echo "1) LayerZero (https://layerzero.network/)"
        echo "2) Axelar (https://axelar.network/)"
        echo "3) Chainlink CCIP (https://chain.link/ccip)"
        echo "4) Skip for now (manual setup later)"
        read -p "Enter choice (1-4): " BRIDGE_CHOICE
        
        case $BRIDGE_CHOICE in
            1)
                echo -e "${BLUE}LayerZero integration selected${NC}"
                echo "Install SDK: npm install @layerzerolabs/sdk"
                echo "Docs: https://docs.layerzero.network/"
                ;;
            2)
                echo -e "${BLUE}Axelar integration selected${NC}"
                echo "Install SDK: npm install @axelar-network/axelar-gmp-sdk-solidity"
                echo "Docs: https://docs.axelar.dev/"
                ;;
            3)
                echo -e "${BLUE}Chainlink CCIP selected${NC}"
                echo "Docs: https://docs.chain.link/ccip"
                ;;
            4)
                echo -e "${YELLOW}Skipping cross-chain setup for now${NC}"
                ;;
        esac
        echo ""
        
        # Testing
        echo "6/6 Testing cross-chain functionality..."
        if [ -d "test/crosschain" ]; then
            echo "Running cross-chain tests..."
            npx hardhat test test/crosschain/**/*.js
            echo -e "${GREEN}✓ Tests complete${NC}"
        else
            echo -e "${YELLOW}Cross-chain tests not found${NC}"
            echo "Create tests in test/crosschain/ directory"
        fi
        echo ""
        
        echo -e "${GREEN}═══════════════════════════════════════════════════${NC}"
        echo -e "${GREEN}✅ Multi-chain testnet setup complete!${NC}"
        echo -e "${GREEN}═══════════════════════════════════════════════════${NC}"
        echo ""
        echo "Next steps:"
        echo "1. Test all cross-chain bridge routes"
        echo "2. Recruit 15 bridge relayers per chain"
        echo "3. Set up monitoring for all chains"
        echo "4. Deploy to mainnets after successful testing"
        echo ""
        echo "Mainnet deployment checklist:"
        echo "  ☐ Security audit complete"
        echo "  ☐ All tests passing"
        echo "  ☐ Relayers recruited"
        echo "  ☐ Oracle feeds configured"
        echo "  ☐ Monitoring dashboards ready"
        echo "  ☐ Emergency procedures documented"
        ;;
        
    3)
        echo ""
        echo -e "${GREEN}✅ Option 3: Full Ecosystem Expansion${NC}"
        echo ""
        echo -e "${YELLOW}This is an advanced multi-month project!${NC}"
        echo ""
        echo "Recommended approach:"
        echo "1. Start with Phase 1 (Base Mainnet) - Month 1"
        echo "2. Add Arbitrum + Polygon - Month 2-3"
        echo "3. Expand to Optimism + Ethereum L1 - Month 4-6"
        echo ""
        echo -e "${BLUE}Additional networks to add:${NC}"
        echo "  - Optimism (Chain ID: 10)"
        echo "  - Ethereum Mainnet (Chain ID: 1)"
        echo "  - zkSync (Chain ID: 324)"
        echo "  - Scroll (Chain ID: 534352)"
        echo "  - BSC (Chain ID: 56)"
        echo "  - Avalanche (Chain ID: 43114)"
        echo ""
        echo "Estimated costs:"
        echo "  - Deployment: 10-20 ETH"
        echo "  - Cross-chain infrastructure: 5-10 ETH"
        echo "  - Bridge relayers: 75+ ETH (15 per chain)"
        echo "  - Security audits: $50k-200k"
        echo "  - Total: ~90-110 ETH + audit costs"
        echo ""
        
        read -p "Would you like to start with Phase 1 (Base Mainnet)? (y/n) " START_P1
        
        if [ "$START_P1" = "y" ]; then
            echo ""
            echo -e "${BLUE}Starting Phase 1: Base Mainnet${NC}"
            echo ""
            
            # Check if production env exists
            if [ ! -f ".env.production" ]; then
                echo -e "${YELLOW}Creating .env.production...${NC}"
                cp .env.example .env.production
                echo -e "${GREEN}✓ Created .env.production${NC}"
                echo ""
                echo -e "${RED}⚠️  IMPORTANT: Edit .env.production with your mainnet keys!${NC}"
                read -p "Press Enter after updating .env.production..."
            fi
            
            echo -e "${BLUE}Compiling contracts...${NC}"
            npx hardhat compile
            echo -e "${GREEN}✓ Compilation complete${NC}"
            echo ""
            
            echo -e "${BLUE}Running security tests...${NC}"
            if [ -f "run-all-security-tests.sh" ]; then
                bash run-all-security-tests.sh
                echo -e "${GREEN}✓ Security tests passed${NC}"
            fi
            echo ""
            
            echo -e "${GREEN}═══════════════════════════════════════════════════${NC}"
            echo -e "${GREEN}✅ Phase 1 setup complete!${NC}"
            echo -e "${GREEN}═══════════════════════════════════════════════════${NC}"
            echo ""
            echo "Next: Follow the full deployment guide in MULTICHAIN_EXPANSION_GUIDE.md"
        else
            echo -e "${YELLOW}Returning to menu...${NC}"
            exit 0
        fi
        ;;
        
    *)
        echo -e "${RED}Invalid choice${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo -e "${BLUE}For detailed instructions, see:${NC}"
echo -e "${BLUE}  - MULTICHAIN_EXPANSION_GUIDE.md${NC}"
echo -e "${BLUE}  - DECENTRALIZATION_IMPLEMENTATION_GUIDE.md${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
