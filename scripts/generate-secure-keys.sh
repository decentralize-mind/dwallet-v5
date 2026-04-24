#!/bin/bash
# Generate new secure keys for .env.preproduction
# This script generates cryptographically secure random values

echo "🔐 Generating new secure keys for dWallet pre-production..."
echo ""

# Generate a new private key (64 hex characters = 32 bytes)
NEW_PRIVATE_KEY=$(openssl rand -hex 32)
echo "✅ New DEPLOYER_PRIVATE_KEY generated"

# Generate new API keys (placeholder - you'll need to get these from respective services)
NEW_INFURA_KEY=$(openssl rand -hex 16)
NEW_ETHERSCAN_KEY=$(openssl rand -hex 20 | tr 'a-f' 'A-F')
NEW_WALLETCONNECT_ID=$(openssl rand -hex 16)

echo "✅ New API key placeholders generated"
echo ""
echo "📝 IMPORTANT: You need to replace these with actual API keys from:"
echo "  - Infura: https://infura.io/"
echo "  - Etherscan: https://etherscan.io/apis"
echo "  - WalletConnect: https://cloud.walletconnect.com/"
echo ""
echo "🔑 Generated Private Key (KEEP THIS SECRET):"
echo "$NEW_PRIVATE_KEY"
echo ""
echo "📋 Copy this to your .env.preproduction file"
