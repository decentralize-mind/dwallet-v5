#!/bin/bash

# GitHub Pre-Production Branch Setup Script
# This creates the pre-production branch and pushes to GitHub

set -e  # Exit on error

echo "🚀 Setting up GitHub Pre-Production Branch..."
echo "=============================================="
echo ""

# Get current branch
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo "📍 Current branch: $CURRENT_BRANCH"
echo ""

# Check if pre-production branch already exists
if git show-ref --verify --quiet refs/heads/pre-production; then
    echo "⚠️  Branch 'pre-production' already exists!"
    echo "   Switching to it anyway..."
    git checkout pre-production
else
    # Create new branch
    echo "🌿 Creating 'pre-production' branch..."
    git checkout -b pre-production
    echo "✅ Branch created successfully"
fi

echo ""
echo "📦 Adding pre-production configuration files..."

# Add all pre-production related files
FILES_TO_ADD=(
    ".env.preproduction"
    "vercel.preproduction.json"
    "scripts/deploy-preproduction.js"
    "deploy-preproduction.sh"
    "src/config/environment.js"
    "src/components/EnvironmentBanner.jsx"
    "START_HERE.md"
    "QUICK_START_PREPROD.md"
    "PRE_PRODUCTION_SETUP.md"
    "README_PRE_PRODUCTION.md"
    "ENVIRONMENT_COMPARISON.md"
    "FILES_CREATED.md"
    "PRE_PROD_SETUP_SUMMARY.md"
    "GITHUB_BRANCH_SETUP.md"
)

ADDED_COUNT=0
SKIPPED_COUNT=0

for file in "${FILES_TO_ADD[@]}"; do
    if [ -f "$file" ]; then
        git add "$file"
        echo "   ✅ Added: $file"
        ((ADDED_COUNT++))
    else
        echo "   ⚠️  Skipped (not found): $file"
        ((SKIPPED_COUNT++))
    fi
done

echo ""
echo "📊 Files added: $ADDED_COUNT"
echo "📊 Files skipped: $SKIPPED_COUNT"
echo ""

# Check if there are changes to commit
if git diff --staged --quiet; then
    echo "⚠️  No new changes to commit."
    echo "   The branch is ready, but may need environment variables configured."
else
    # Commit changes
    echo "💾 Committing changes..."
    git commit -m "feat: complete pre-production environment setup

- Sepolia testnet configuration (.env.preproduction)
- Automated deployment scripts (deploy-preproduction.sh)
- Environment detection system (src/config/environment.js)
- Visual warning banners (EnvironmentBanner component)
- Vercel configuration for pre-production
- Comprehensive documentation (7 markdown files)
- Git protection for sensitive files

This enables safe testing on Sepolia testnet before production deployment.

Co-Authored-By: Pre-Production Setup Bot"
    
    echo "✅ Changes committed successfully"
fi

echo ""
echo "🔍 Checking remote repository..."

# Check if remote exists
if ! git remote -v | grep -q origin; then
    echo "❌ No remote 'origin' found!"
    echo "   Please add your GitHub repository:"
    echo "   git remote add origin https://github.com/YOUR_USERNAME/dwallet.git"
    exit 1
fi

echo "✅ Remote repository found"
echo ""

# Push to GitHub
echo "📤 Pushing to GitHub..."
echo "   Branch: pre-production"
echo "   Remote: origin"
echo ""

# Check if branch exists on remote
if git ls-remote --exit-code --heads origin pre-production > /dev/null 2>&1; then
    echo "⚠️  Branch already exists on remote. Updating..."
    git push origin pre-production
else
    echo "✨ First push of pre-production branch..."
    git push -u origin pre-production
fi

echo ""
echo "✅ Successfully pushed to GitHub!"
echo ""

# Show summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 PRE-PRODUCTION BRANCH SETUP COMPLETE!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ Local branch: pre-production"
echo "✅ Remote branch: origin/pre-production"
echo "✅ Configuration files: Added"
echo "✅ Documentation: Included"
echo ""
echo "📋 NEXT STEPS:"
echo ""
echo "1️⃣  Verify on GitHub:"
echo "   https://github.com/$(git remote get-url origin | sed -E 's/.*github\.com[/:]([^\/]+)\/(.*)\.git/\1\/\2/')/tree/pre-production"
echo ""
echo "2️⃣  Configure in Vercel:"
echo "   - Go to vercel.com/dashboard"
echo "   - Import project from 'pre-production' branch"
echo "   - OR connect to existing project"
echo "   - Add environment variables:"
echo "     • VITE_ENVIRONMENT=preproduction"
echo "     • VITE_NETWORK=sepolia"
echo "     • VITE_INFURA_KEY=your_key"
echo "     • VITE_WALLETCONNECT_PROJECT_ID=your_id"
echo "     • DEPLOYER_PRIVATE_KEY=your_sepolia_key"
echo ""
echo "3️⃣  Test deployment:"
echo "   ./deploy-preproduction.sh"
echo "   vercel --prod --prebuilt"
echo ""
echo "4️⃣  Set up branch protection (recommended):"
echo "   - GitHub → Settings → Branches"
echo "   - Protect 'main' branch"
echo "   - Require PR reviews"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Return to original branch
echo "🔙 Returning to $CURRENT_BRANCH branch..."
git checkout $CURRENT_BRANCH > /dev/null 2>&1
echo "✅ Done!"
echo ""

echo "💡 TIP: Read GITHUB_BRANCH_SETUP.md for detailed workflow!"
echo ""
