#!/bin/bash
#
# Clean Git History to Remove Exposed Secrets
# This script uses BFG Repo-Cleaner to remove secrets from Git history
#

echo "🧹 Cleaning Git History to Remove Exposed Secrets"
echo "================================================="
echo ""
echo "⚠️  WARNING: This will rewrite Git history!"
echo "   - All collaborators will need to re-clone the repository"
echo "   - Force push will be required"
echo "   - Make sure you have a backup before proceeding"
echo ""

# Check if BFG is installed
if ! command -v bfg &> /dev/null; then
    echo "❌ BFG Repo-Cleaner is not installed."
    echo ""
    echo "Install BFG Repo-Cleaner:"
    echo "  macOS: brew install bfg"
    echo "  Other: https://rtyley.github.io/bfg-repo-cleaner/"
    echo ""
    echo "Alternative: Use git-filter-repo (Python-based)"
    echo "  pip install git-filter-repo"
    exit 1
fi

echo "✅ BFG Repo-Cleaner is installed"
echo ""

# Create a backups directory
BACKUP_DIR="git-backup-$(date +%Y%m%d_%H%M%S)"
echo "📦 Creating backup in: $BACKUP_DIR"
mkdir -p "$BACKUP_DIR"

# Backup current repository
cp -r .git "$BACKUP_DIR/.git.backup"
echo "✅ Backup created"
echo ""

# Create passwords.txt file with secrets to remove
echo "📝 Creating secrets file for BFG..."

cat > passwords.txt << 'EOF'
ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
83c1e84032b24b0cb759b8e9fce69893
7VK33NXZP1ZQS8WWZMK5S25DIMY8Z3SDS
50ea2321f899db8e48b42cd0456be217
pk_test_gyZ9anUeJ48IEvf4YQRDRo6uDta37TFr
EOF

echo "✅ Secrets file created: passwords.txt"
echo ""

echo "🔍 The following secrets will be removed from history:"
cat passwords.txt | sed 's/^/   - /'
echo ""

read -p "⚠️  Are you sure you want to proceed? This will rewrite history! (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "❌ Operation cancelled."
    echo "   Backup is available in: $BACKUP_DIR"
    exit 0
fi

echo ""
echo "🧹 Running BFG Repo-Cleaner..."
echo ""

# Run BFG to replace secrets
bfg --replace-text passwords.txt .

echo ""
echo "✅ BFG cleaning complete!"
echo ""

# Clean up Git reflog
echo "🗑️  Cleaning up Git reflog..."
git reflog expire --expire=now --all
git gc --prune=now --aggressive
echo "✅ Git cleanup complete"
echo ""

echo "📋 Next steps:"
echo ""
echo "1. Verify the secrets are removed:"
echo "   git log --all -p | grep -i 'ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'"
echo "   (Should return no results)"
echo ""
echo "2. Force push to GitHub:"
echo "   git push origin --force --all"
echo "   git push origin --force --tags"
echo ""
echo "3. Inform all collaborators to re-clone the repository"
echo ""
echo "4. Rotate ALL exposed credentials immediately:"
echo "   - Generate new private keys"
echo "   - Get new API keys from Infura, Etherscan, WalletConnect"
echo "   - Update .env.preproduction with new credentials"
echo ""
echo "⚠️  IMPORTANT: The exposed credentials should be considered compromised!"
echo "   Even though they're removed from Git history, anyone who cloned the repo"
echo "   before this cleanup may have accessed them."
echo ""
echo "📚 BFG Repo-Cleaner docs: https://rtyley.github.io/bfg-repo-cleaner/"
echo ""
echo "✅ Git history cleaning complete!"
