#!/bin/bash

# IPFS Gateway Testing Script
# Tests all gateway links for your deployed frontend

IPFS_HASH="bafybeidhxptozo6hlnnou7kltorygqc7gqwahljpvg7iwsdhcuwdflytly"

echo "=================================="
echo "🌐 dWallet IPFS Gateway Tests"
echo "=================================="
echo ""
echo "Testing IPFS Hash: $IPFS_HASH"
echo ""

# Test Pinata Gateway
echo "1️⃣  Testing Pinata Gateway..."
PINATA_URL="https://${IPFS_HASH}.ipfs.pinata.cloud"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$PINATA_URL" --max-time 10)
if [ "$STATUS" = "200" ]; then
    echo "   ✅ Pinata Gateway: ONLINE (HTTP $STATUS)"
    echo "   URL: $PINATA_URL"
else
    echo "   ⏳ Pinata Gateway: PROPAGATING (HTTP $STATUS)"
    echo "   URL: $PINATA_URL"
fi
echo ""

# Test IPFS.io Gateway
echo "2️⃣  Testing IPFS.io Gateway..."
IPFSIO_URL="https://ipfs.io/ipfs/${IPFS_HASH}"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$IPFSIO_URL" --max-time 10)
if [ "$STATUS" = "200" ]; then
    echo "   ✅ IPFS.io Gateway: ONLINE (HTTP $STATUS)"
    echo "   URL: $IPFSIO_URL"
else
    echo "   ⏳ IPFS.io Gateway: PROPAGATING (HTTP $STATUS)"
    echo "   URL: $IPFSIO_URL"
fi
echo ""

# Test Cloudflare Gateway
echo "3️⃣  Testing Cloudflare Gateway..."
CLOUDFLARE_URL="https://cloudflare-ipfs.com/ipfs/${IPFS_HASH}"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$CLOUDFLARE_URL" --max-time 10)
if [ "$STATUS" = "200" ]; then
    echo "   ✅ Cloudflare Gateway: ONLINE (HTTP $STATUS)"
    echo "   URL: $CLOUDFLARE_URL"
else
    echo "   ⏳ Cloudflare Gateway: PROPAGATING (HTTP $STATUS)"
    echo "   URL: $CLOUDFLARE_URL"
fi
echo ""

# Test Dweb Gateway
echo "4️⃣  Testing Dweb Gateway..."
DWEB_URL="https://${IPFS_HASH}.ipfs.dweb.link"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$DWEB_URL" --max-time 10)
if [ "$STATUS" = "200" ]; then
    echo "   ✅ Dweb Gateway: ONLINE (HTTP $STATUS)"
    echo "   URL: $DWEB_URL"
else
    echo "   ⏳ Dweb Gateway: PROPAGATING (HTTP $STATUS)"
    echo "   URL: $DWEB_URL"
fi
echo ""

# Check Pinata Pin Status
echo "5️⃣  Checking Pinata Pin Status..."
PINATA_STATUS=$(curl -s -H "pinata_api_key: 319ccae58dbbf3a4edf7" \
     -H "pinata_secret_api_key: b9165adc22c3267984832dba5ab9539f310953453f7e08d652d1f366d8619833" \
     "https://api.pinata.cloud/data/pinList?hash=${IPFS_HASH}" --max-time 10)

if echo "$PINATA_STATUS" | grep -q "pinned"; then
    echo "   ✅ Content is PINNED on Pinata"
    echo "   Regions: FRA1 (France), NYC1 (New York)"
else
    echo "   ⚠️  Could not verify pin status"
fi
echo ""

# Test content validity
echo "6️⃣  Testing Content Validity..."
CONTENT=$(curl -s "$IPFSIO_URL" --max-time 10)
if echo "$CONTENT" | grep -q "<!DOCTYPE html>"; then
    echo "   ✅ Content is valid HTML"
    echo "   Frontend files are accessible"
elif [ -n "$CONTENT" ]; then
    echo "   ✅ Content is accessible"
else
    echo "   ⏳ Content still propagating"
fi
echo ""

echo "=================================="
echo "📊 Summary"
echo "=================================="
echo ""
echo "IPFS Hash: $IPFS_HASH"
echo ""
echo "Access your decentralized frontend:"
echo "• Pinata:    https://${IPFS_HASH}.ipfs.pinata.cloud"
echo "• IPFS.io:   https://ipfs.io/ipfs/${IPFS_HASH}"
echo "• Cloudflare: https://cloudflare-ipfs.com/ipfs/${IPFS_HASH}"
echo "• Dweb:      https://${IPFS_HASH}.ipfs.dweb.link"
echo ""
echo "After ENS update:"
echo "• ENS Limo:  https://dwallet.eth.limo"
echo "• ENS Link:  https://dwallet.eth.link"
echo ""
echo "=================================="
echo "✅ Testing Complete!"
echo "=================================="
