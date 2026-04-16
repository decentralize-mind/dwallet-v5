#!/bin/bash

# Clean and Upload to Pinata via Web Interface Helper
# This script prepares the dist folder for upload

set -e

echo "=================================="
echo "🧹 Preparing dist/ for IPFS Upload"
echo "=================================="
echo ""

DIST_DIR="$(pwd)/dist"

if [ ! -d "$DIST_DIR" ]; then
    echo "❌ Error: dist/ directory not found!"
    echo "Run 'npm run build' first."
    exit 1
fi

echo "📁 Location: $DIST_DIR"
echo ""

# Step 1: Clean extended attributes
echo "🧹 Removing macOS extended attributes..."
xattr -cr "$DIST_DIR" 2>/dev/null || true
echo "✅ Extended attributes removed"
echo ""

# Step 2: Show folder contents
echo "📦 Contents of dist/:"
ls -lh "$DIST_DIR/"
echo ""
echo "📂 Assets folder:"
ls -lh "$DIST_DIR/assets/" 2>/dev/null || echo "  (no assets folder)"
echo ""

# Step 3: Calculate size
SIZE=$(du -sh "$DIST_DIR" | cut -f1)
echo "📏 Total size: $SIZE"
echo ""

# Step 4: Instructions
echo "=================================="
echo "📤 Ready to Upload!"
echo "=================================="
echo ""
echo "Follow these steps:"
echo ""
echo "1. Open: https://app.pinata.cloud/developers/pinning-files"
echo ""
echo "2. Click: 'Folder'"
echo ""
echo "3. Select this folder:"
echo "   $DIST_DIR"
echo ""
echo "4. Upload and copy the new IPFS hash"
echo ""
echo "5. Paste the hash here for testing!"
echo ""
echo "=================================="
echo ""

# Open Pinata in browser (Mac only)
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "🌐 Opening Pinata in browser..."
    open "https://app.pinata.cloud/developers/pinning-files"
    echo "✅ Browser opened!"
    echo ""
fi

echo "Waiting for your new IPFS hash... 🚀"
