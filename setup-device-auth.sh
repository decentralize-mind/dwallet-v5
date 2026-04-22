#!/bin/bash

# 🔐 Device Authentication Setup Script
# Helps you get MAC address and configure device authentication

echo "╔═══════════════════════════════════════════════════════╗"
echo "║   🔐 Device Authentication Setup                     ║"
echo "║   For dWallet v5 Admin Backend                       ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""

# Function to display MAC addresses
show_mac_addresses() {
    echo "📍 Your MacBook's MAC Addresses:"
    echo "═══════════════════════════════════════════════════════"
    echo ""
    
    # Wi-Fi MAC
    echo "1. Wi-Fi Interface:"
    WIFI_MAC=$(networksetup -getmacaddress Wi-Fi 2>/dev/null | awk '{print $3}')
    if [ ! -z "$WIFI_MAC" ]; then
        echo "   ✅ MAC: $WIFI_MAC"
    else
        echo "   ❌ Not available"
    fi
    echo ""
    
    # Ethernet MAC
    echo "2. Ethernet Interface:"
    ETH_MAC=$(networksetup -getmacaddress Ethernet 2>/dev/null | awk '{print $3}')
    if [ ! -z "$ETH_MAC" ]; then
        echo "   ✅ MAC: $ETH_MAC"
    else
        echo "   ❌ Not available"
    fi
    echo ""
    
    # All interfaces
    echo "3. All Network Interfaces:"
    ifconfig | grep -E "^[a-z]" -A 1 | grep -E "(^[a-z]|ether)" | paste - - | while read line; do
        interface=$(echo "$line" | awk '{print $1}' | sed 's/:$//')
        mac=$(echo "$line" | grep -o 'ether [0-9a-f:A-F]*' | awk '{print toupper($2)}')
        if [ ! -z "$mac" ] && [ "$mac" != "00:00:00:00:00:00" ]; then
            echo "   • $interface: $mac"
        fi
    done
    echo ""
}

# Function to generate secrets
generate_secrets() {
    echo "🔑 Generating Security Secrets:"
    echo "═══════════════════════════════════════════════════════"
    echo ""
    
    echo "1. REQUEST_SIGNING_SECRET:"
    SIGNING_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))" 2>/dev/null)
    if [ ! -z "$SIGNING_SECRET" ]; then
        echo "   ✅ Generated (128 characters)"
        echo "   $SIGNING_SECRET"
    else
        echo "   ❌ Node.js not available"
    fi
    echo ""
    
    echo "2. Admin Wallet (for blockchain operations):"
    echo "   Run this command to create a new wallet:"
    echo "   node -e \"const {ethers}=require('ethers');const w=ethers.Wallet.createRandom();console.log('Address:',w.address);console.log('PrivateKey:',w.privateKey);\""
    echo ""
}

# Function to update .env file
update_env_file() {
    echo "📝 Update Your .env File:"
    echo "═══════════════════════════════════════════════════════"
    echo ""
    
    if [ -f ".env" ]; then
        echo "✅ .env file exists"
        echo ""
        
        # Get primary MAC address
        PRIMARY_MAC=$(networksetup -getmacaddress Wi-Fi 2>/dev/null | awk '{print $3}')
        
        echo "Add these lines to your .env file:"
        echo ""
        echo "# ─── Security & Device Authentication ─────────────────────"
        echo "REQUEST_SIGNING_SECRET=<generate_with_node_crypto>"
        echo "ADMIN_PRIVATE_KEY=<your_dedicated_admin_wallet>"
        echo ""
        echo "# Device Authentication"
        echo "ENABLE_DEVICE_AUTH=true"
        if [ ! -z "$PRIMARY_MAC" ]; then
            echo "ALLOWED_MAC_ADDRESSES=$PRIMARY_MAC"
        else
            echo "ALLOWED_MAC_ADDRESSES=<your_mac_address>"
        fi
        echo ""
    else
        echo "❌ .env file not found in current directory"
        echo "   Make sure you're in the dwallet-v5 directory"
    fi
    echo ""
}

# Function to test device auth
test_device_auth() {
    echo "🧪 Test Device Authentication:"
    echo "═══════════════════════════════════════════════════════"
    echo ""
    
    echo "After updating .env and restarting server:"
    echo ""
    echo "1. Check server logs for:"
    echo "   ✅ Device authentication enabled"
    echo "   ✅ MAC address whitelist loaded"
    echo ""
    echo "2. Test with curl:"
    echo "   curl http://localhost:3001/api/device/info"
    echo ""
    echo "3. View registered devices:"
    echo "   curl -H \"Authorization: Bearer YOUR_TOKEN\" \\"
    echo "     http://localhost:3001/api/device/list"
    echo ""
}

# Main execution
echo "This script will help you set up MAC address authentication"
echo "for your dWallet admin backend."
echo ""

show_mac_addresses
generate_secrets
update_env_file
test_device_auth

echo "╔═══════════════════════════════════════════════════════╗"
echo "║   ✅ Setup Guide Complete                            ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""
echo "Next Steps:"
echo "1. Copy the MAC address above"
echo "2. Generate secrets using the commands shown"
echo "3. Update your .env file"
echo "4. Restart server: npm run admin:server"
echo ""
echo "For complete documentation, see:"
echo "📄 AUTHENTICATION_WARNINGS_AND_DEVICE_AUTH.md"
echo ""
