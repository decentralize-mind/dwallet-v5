#!/bin/bash

# Quick IPFS Upload Script via Pinata API
# This uploads the dist folder correctly for web hosting

set -e

echo "=================================="
echo "🌐 dWallet IPFS Upload to Pinata"
echo "=================================="
echo ""

# Configuration
PINATA_API_KEY="319ccae58dbbf3a4edf7"
PINATA_SECRET_KEY="b9165adc22c3267984832dba5ab9539f310953453f7e08d652d1f366d8619833"
DIST_DIR="$(pwd)/dist"

# Check if dist directory exists
if [ ! -d "$DIST_DIR" ]; then
    echo "❌ Error: dist/ directory not found!"
    echo "Run 'npm run build' first."
    exit 1
fi

echo "📦 Creating tarball from dist/ folder..."
echo ""

# Create a temporary tarball
TAR_FILE="/tmp/dwallet-dist-$(date +%s).tar.gz"
tar -czf "$TAR_FILE" -C dist .

echo "✅ Tarball created: $TAR_FILE"
echo ""
echo "📤 Uploading to Pinata..."
echo ""

# Upload to Pinata
RESPONSE=$(curl -s -X POST "https://api.pinata.cloud/pinning/pinFileToIPFS" \
  -H "pinata_api_key: $PINATA_API_KEY" \
  -H "pinata_secret_api_key: $PINATA_SECRET_KEY" \
  -F "file=@$TAR_FILE;filename=dist.tar.gz" \
  -F "pinataMetadata={\"name\":\"dWallet-Frontend-$(date +%Y-%m-%d)\",\"keyvalues\":{\"project\":\"dWallet v5\",\"type\":\"frontend\"}}")

# Clean up tarball
rm "$TAR_FILE"

# Check if upload was successful
if echo "$RESPONSE" | grep -q "IpfsHash"; then
    IPFS_HASH=$(echo "$RESPONSE" | grep -o '"IpfsHash":"[^"]*"' | cut -d'"' -f4)
    
    echo "=================================="
    echo "✅ Upload Successful!"
    echo "=================================="
    echo ""
    echo "📊 IPFS Hash: $IPFS_HASH"
    echo ""
    echo "🌐 Access your frontend:"
    echo "   Pinata:  https://$IPFS_HASH.ipfs.pinata.cloud"
    echo "   IPFS.io: https://ipfs.io/ipfs/$IPFS_HASH"
    echo "   Dweb:    https://$IPFS_HASH.ipfs.dweb.link"
    echo ""
    echo "📝 Full URI for ENS:"
    echo "   ipfs://$IPFS_HASH"
    echo ""
    echo "💾 Response saved to: pinata-upload-response.json"
    echo "$RESPONSE" | python3 -m json.tool > pinata-upload-response.json 2>/dev/null || echo "$RESPONSE" > pinata-upload-response.json
    echo ""
    echo "=================================="
    echo "🎉 Done! Test the links above"
    echo "=================================="
else
    echo "❌ Upload failed!"
    echo ""
    echo "Response:"
    echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
    echo ""
    exit 1
fi
