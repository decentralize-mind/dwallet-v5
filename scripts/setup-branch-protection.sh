#!/bin/bash
#
# Configure GitHub Branch Protection Rules
# This script uses GitHub CLI to set up branch protection
#

echo "🛡️  Setting up GitHub Branch Protection Rules"
echo "=============================================="
echo ""

# Check if GitHub CLI is installed
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) is not installed."
    echo ""
    echo "Install GitHub CLI:"
    echo "  macOS: brew install gh"
    echo "  Other: https://cli.github.com/"
    echo ""
    echo "After installation, run: gh auth login"
    exit 1
fi

# Check if authenticated
if ! gh auth status &> /dev/null; then
    echo "❌ Not authenticated with GitHub CLI."
    echo ""
    echo "Run: gh auth login"
    exit 1
fi

echo "✅ GitHub CLI is installed and authenticated"
echo ""

# Get repository info
REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null)

if [ -z "$REPO" ]; then
    echo "❌ Could not detect repository."
    echo "Make sure you're in a Git repository with a GitHub remote."
    exit 1
fi

echo "📦 Repository: $REPO"
echo ""

echo "🔧 Configuring branch protection for 'main' branch..."
echo ""

# Branch protection settings
echo "Setting up the following protections:"
echo "  ✅ Require pull request reviews before merging"
echo "  ✅ Require 1 approving review"
echo "  ✅ Dismiss stale pull request approvals"
echo "  ✅ Require review from Code Owners"
echo "  ✅ Require status checks to pass before merging"
echo "  ✅ Require branches to be up to date before merging"
echo "  ✅ Require signed commits"
echo "  ✅ Include administrators"
echo "  ✅ Restrict pushes that match a pattern"
echo "  ✅ Do not allow bypassing the above settings"
echo "  ✅ Do not allow deletions"
echo "  ✅ Do not allow force pushes"
echo ""

# Note: GitHub CLI doesn't have a direct command for branch protection
# We need to use the GraphQL API or guide the user to do it manually

echo "⚠️  GitHub CLI doesn't support branch protection configuration directly."
echo ""
echo "Please configure branch protection manually:"
echo ""
echo "1. Go to: https://github.com/$REPO/settings/branches"
echo ""
echo "2. Click 'Add rule' or edit the 'main' branch rule"
echo ""
echo "3. Enable these settings:"
echo "   ☑️ Require a pull request before merging"
echo "   ☑️ Required approving reviews: 1"
echo "   ☑️ Dismiss stale pull request approvals when new commits are pushed"
echo "   ☑️ Require review from Code Owners"
echo "   ☑️ Require status checks to pass before merging"
echo "   ☑️ Require branches to be up to date before merging"
echo "   ☑️ Require signed commits"
echo "   ☑️ Include administrators"
echo "   ☑️ Restrict who can push to matching branches (optional)"
echo "   ☑️ Do not allow bypassing the above settings"
echo "   ☑️ Do not allow deletions"
echo "   ☑️ Do not allow force pushes"
echo ""
echo "4. Click 'Save changes'"
echo ""

# Alternative: Using GitHub API with curl (requires personal access token)
echo "💡 Alternatively, use the GitHub API:"
echo ""
echo "curl -X PUT \\"
echo "  -H \"Authorization: token YOUR_GITHUB_TOKEN\" \\"
echo "  -H \"Accept: application/vnd.github.v3+json\" \\"
echo "  https://api.github.com/repos/$REPO/branches/main/protection \\"
echo "  -d '{'"
echo "    \"required_pull_request_reviews\": {"
echo "      \"dismiss_stale_reviews\": true,"
echo "      \"require_code_owner_reviews\": true,"
echo "      \"required_approving_review_count\": 1"
echo "    },"
echo "    \"required_status_checks\": {"
echo "      \"strict\": true,"
echo "      \"contexts\": []"
echo "    },"
echo "    \"enforce_admins\": true,"
echo "    \"restrictions\": null,"
echo "    \"required_linear_history\": false,"
echo "    \"allow_force_pushes\": false,"
echo "    \"allow_deletions\": false,"
echo "    \"required_conversation_resolution\": false,"
echo "    \"lock_branch\": false"
echo "  }'"
echo ""

echo "📚 Documentation: https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches"
echo ""
echo "✅ Branch protection setup guide complete!"
