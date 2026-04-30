#!/bin/bash

# Vercel Build Script
# This script ensures the build completes successfully on Vercel

set -e  # Exit on error

echo "🔨 Starting Vercel build..."

# Make sure all scripts are readable
echo "📝 Fixing script permissions..."
find scripts -name "*.sh" -type f -exec chmod 644 {} \; 2>/dev/null || true
find server -name "*.sh" -type f -exec chmod 644 {} \; 2>/dev/null || true

# Run the actual build
echo "🏗️  Running vite build..."
npm run build

echo "✅ Build completed successfully!"
