#!/bin/bash

# ════════════════════════════════════════════════════════════════════
# RUN ANOMALY DETECTION SYSTEM - COMPLETE SETUP
# This script guides you through the entire process
# ════════════════════════════════════════════════════════════════════

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   🚀 ANOMALY DETECTION SYSTEM - QUICK START          ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}\n"

# ─────────────────────────────────────────────────────────────────────
# STEP 1: Check if .env exists
# ─────────────────────────────────────────────────────────────────────

if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  No .env file found. Creating from example...${NC}"
    cp .env.example .env 2>/dev/null || true
    cp .env.local.example .env.local 2>/dev/null || true
    echo -e "${GREEN}✅ Created .env files. Please fill in your values.${NC}"
    echo ""
    echo "Edit .env and add:"
    echo "  - MONITOR_PRIVATE_KEY"
    echo "  - RPC_URL (or use default for localhost)"
    echo ""
    echo "Then run this script again."
    exit 1
fi

# ─────────────────────────────────────────────────────────────────────
# STEP 2: Ask which mode to run
# ─────────────────────────────────────────────────────────────────────

echo -e "${YELLOW}Select mode:${NC}"
echo "  1) Deploy contracts only (localhost)"
echo "  2) Run monitoring bot only"
echo "  3) Full setup (deploy + monitor)"
echo ""
read -p "Enter choice [1-3]: " MODE

case $MODE in
    1)
        echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo -e "${BLUE}📦 MODE: DEPLOY CONTRACTS ONLY${NC}"
        echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
        
        # Start local node in background
        echo -e "${YELLOW}Starting Hardhat local node...${NC}"
        npm run node > /tmp/hardhat-node.log 2>&1 &
        NODE_PID=$!
        echo $NODE_PID > /tmp/hardhat-node.pid
        
        # Wait for node to start
        sleep 5
        
        # Check if node is running
        if ! ps -p $NODE_PID > /dev/null; then
            echo -e "${RED}❌ Failed to start Hardhat node. Check logs:${NC}"
            cat /tmp/hardhat-node.log
            exit 1
        fi
        
        echo -e "${GREEN}✅ Hardhat node started (PID: $NODE_PID)${NC}\n"
        
        # Deploy contracts
        echo -e "${YELLOW}Deploying contracts...${NC}"
        node scripts/deploy-anomaly-detection.js --network localhost
        
        echo -e "\n${GREEN}✅ Deployment complete!${NC}"
        echo -e "${YELLOW}Contract addresses saved to: deployed-addresses.json${NC}"
        echo ""
        echo -e "${YELLOW}Next steps:${NC}"
        echo "  1. Copy contract addresses from deployed-addresses.json"
        echo "  2. Update .env with the addresses"
        echo "  3. Run monitoring bot: npm run monitor"
        echo ""
        ;;
        
    2)
        echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo -e "${BLUE}📡 MODE: RUN MONITORING BOT ONLY${NC}"
        echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
        
        # Check if addresses file exists
        if [ ! -f deployed-addresses.json ]; then
            echo -e "${RED}❌ deployed-addresses.json not found!${NC}"
            echo "Please deploy contracts first (choose option 1 or 3)"
            exit 1
        fi
        
        # Load addresses
        echo -e "${YELLOW}Loading contract addresses...${NC}"
        ANOMALY_ADDR=$(node -p "require('./deployed-addresses.json').anomalyDetector")
        LAYER7_ADDR=$(node -p "require('./deployed-addresses.json').layer7Security")
        DWT_ADDR=$(node -p "require('./deployed-addresses.json').dwtToken || '0x0000000000000000000000000000000000000000'")
        
        echo "  Anomaly Detector: $ANOMALY_ADDR"
        echo "  Layer7 Security:  $LAYER7_ADDR"
        echo "  DWT Token:        $DWT_ADDR"
        echo ""
        
        # Export environment variables
        export ANOMALY_DETECTOR_ADDRESS="$ANOMALY_ADDR"
        export LAYER7_SECURITY_ADDRESS="$LAYER7_ADDR"
        export DWT_TOKEN_ADDRESS="$DWT_ADDR"
        
        # Run monitoring bot
        echo -e "${YELLOW}Starting monitoring bot...${NC}\n"
        node monitoring/anomaly-detector.js
        ;;
        
    3)
        echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo -e "${BLUE}🚀 MODE: FULL SETUP (DEPLOY + MONITOR)${NC}"
        echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
        
        # Start local node
        echo -e "${YELLOW}Starting Hardhat local node...${NC}"
        npm run node > /tmp/hardhat-node.log 2>&1 &
        NODE_PID=$!
        echo $NODE_PID > /tmp/hardhat-node.pid
        
        sleep 5
        
        if ! ps -p $NODE_PID > /dev/null; then
            echo -e "${RED}❌ Failed to start Hardhat node.${NC}"
            cat /tmp/hardhat-node.log
            exit 1
        fi
        
        echo -e "${GREEN}✅ Node started${NC}\n"
        
        # Deploy contracts
        echo -e "${YELLOW}Deploying contracts...${NC}"
        node scripts/deploy-anomaly-detection.js --network localhost
        
        echo -e "\n${GREEN}✅ Deployment complete!${NC}\n"
        
        # Wait a moment for blockchain to settle
        sleep 2
        
        # Run monitoring bot
        echo -e "${YELLOW}Starting monitoring bot...${NC}\n"
        node monitoring/anomaly-detector.js
        ;;
        
    *)
        echo -e "${RED}❌ Invalid choice. Please run script again.${NC}"
        exit 1
        ;;
esac

echo -e "\n${GREEN}═══════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Done!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
