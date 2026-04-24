#!/bin/bash
#
# Setup GPG commit signing for Git security
# This script guides you through setting up GPG signing
#

echo "🔐 Setting up GPG Commit Signing for Git"
echo "========================================"
echo ""

# Check if GPG is installed
if ! command -v gpg &> /dev/null; then
    echo "❌ GPG is not installed."
    echo ""
    echo "Install GPG:"
    echo "  macOS: brew install gnupg"
    echo "  Ubuntu: sudo apt-get install gnupg"
    echo "  Windows: https://gpg4win.org/"
    exit 1
fi

echo "✅ GPG is installed: $(gpg --version | head -n 1)"
echo ""

# Check if user has GPG keys
GPG_KEYS=$(gpg --list-secret-keys --keyid-format=long 2>/dev/null)

if [ -z "$GPG_KEYS" ]; then
    echo "📝 No GPG keys found. Let's create one..."
    echo ""
    echo "Run this command to generate a new GPG key:"
    echo "  gpg --full-generate-key"
    echo ""
    echo "Recommended settings:"
    echo "  - Key type: RSA and RSA (default)"
    echo "  - Key size: 4096"
    echo "  - Expiration: 1 year or never"
    echo "  - Real name: Your name"
    echo "  - Email: Your GitHub email"
    echo ""
    read -p "Have you generated a GPG key? (y/n): " HAS_KEY
    
    if [ "$HAS_KEY" != "y" ]; then
        echo "Please generate a GPG key first, then run this script again."
        exit 0
    fi
fi

# List available GPG keys
echo "🔑 Available GPG keys:"
gpg --list-secret-keys --keyid-format=long
echo ""

# Get the GPG key ID
read -p "Enter your GPG key ID (the part after 'sec   rsa4096/'): " GPG_KEY_ID

# Configure Git to use GPG signing
echo ""
echo "🔧 Configuring Git..."

# Set the GPG key for this repository
git config --local user.signingkey "$GPG_KEY_ID"

# Enable automatic signing for all commits
git config --local commit.gpgsign true

# Enable automatic signing for tags
git config --local tag.gpgsign true

echo ""
echo "✅ Git configured for GPG signing!"
echo ""

# Get the public key for GitHub
echo "📤 Add your GPG public key to GitHub:"
echo ""
echo "1. Run this command to get your public key:"
echo "   gpg --armor --export $GPG_KEY_ID"
echo ""
echo "2. Copy the output (including BEGIN and END lines)"
echo ""
echo "3. Go to GitHub: Settings > SSH and GPG keys > New GPG key"
echo "   URL: https://github.com/settings/gpg/new"
echo ""
echo "4. Paste your public key and save"
echo ""

# Verify the setup
echo "🧪 Test your setup:"
echo "  git commit -S -m 'Test signed commit'"
echo ""
echo "✅ Setup complete! All your commits will now be signed."
echo ""
echo "📚 More info: https://docs.github.com/en/authentication/managing-commit-signature-verification"
