# GitHub Branch Strategy for Pre-Production

## 🎯 Recommended Approach: Separate Branches

Yes, you should create a `pre-production` branch in GitHub! This gives you:

### ✅ Benefits
- **Clear separation** between development and staging
- **Safe testing** without affecting main branch
- **Easy rollback** if issues found
- **Team collaboration** on testing
- **Vercel integration** with automatic deployments

---

## 🌿 Option 1: Two-Branch Strategy (Recommended)

```
main (Production)
  ↑
  └─── pre-production (Staging/Testnet)
         ↑
         └─── feature branches
```

### Structure:
- **`main`** → Production (Ethereum Mainnet)
- **`pre-production`** → Staging (Sepolia Testnet)
- **Feature branches** → Development work

### Setup Commands:

```bash
# 1. Create and switch to pre-production branch
git checkout -b pre-production

# 2. Add pre-production specific files
git add .env.preproduction
git add vercel.preproduction.json
git add scripts/deploy-preproduction.js
git add deploy-preproduction.sh
git add src/config/environment.js
git add src/components/EnvironmentBanner.jsx

# 3. Commit changes
git commit -m "feat: setup pre-production environment with Sepolia testnet config"

# 4. Push to GitHub
git push -u origin pre-production

# 5. Return to main for production work
git checkout main
```

---

## 🌿 Option 2: Three-Branch Strategy (Advanced)

```
main (Production)
  ↑
staging (Pre-Production/Testnet)
  ↑
develop (Development)
  ↑
feature branches
```

### Structure:
- **`main`** → Production (always stable)
- **`staging`** → Pre-production testing
- **`develop`** → Integration branch
- **Feature branches** → Active development

---

## 🔧 Vercel Integration Setup

### Step 1: Connect Pre-Production Branch to Vercel

1. Go to your project in [Vercel Dashboard](https://vercel.com/dashboard)

2. **Option A: Same Project, Different Deployments**
   - Import project from `pre-production` branch
   - Vercel will auto-detect the branch
   - Configure environment variables for testnet

3. **Option B: Separate Projects (Recommended)**
   - Create two Vercel projects:
     - `dWallet` → connects to `main` branch (Production)
     - `dWallet Staging` → connects to `pre-production` branch (Testnet)

### Step 2: Configure Vercel Environment Variables

For **pre-production** project in Vercel:

```
VITE_ENVIRONMENT = preproduction
VITE_NETWORK = sepolia
VITE_INFURA_KEY = your_infura_key
VITE_WALLETCONNECT_PROJECT_ID = your_wc_id
VITE_ETHERSCAN_KEY = your_etherscan_key
DEPLOYER_PRIVATE_KEY = your_sepolia_private_key
VITE_MOONPAY_KEY = pk_test_...
```

---

## 📋 Complete Workflow

### Development Flow:

```bash
# 1. Develop new feature
git checkout main
git checkout -b feature/new-feature

# Work on feature...
git add .
git commit -m "feat: add new feature"
git push origin feature/new-feature

# 2. Merge to pre-production for testing
git checkout pre-production
git merge feature/new-feature
git push origin pre-production

# Vercel auto-deploys to testnet!

# 3. Test thoroughly on Sepolia testnet

# 4. When ready, merge to main for production
git checkout main
git merge pre-production
git push origin main

# Vercel auto-deploys to mainnet!
```

---

## 🚀 Quick Setup Script

Create this file as `setup-preproduction-branch.sh`:

```bash
#!/bin/bash

echo "🚀 Setting up pre-production branch..."

# Check current branch
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)

if [ "$CURRENT_BRANCH" == "pre-production" ]; then
    echo "✅ Already on pre-production branch"
else
    # Create pre-production branch
    git checkout -b pre-production
    
    echo "✅ Created pre-production branch"
fi

# Add pre-production files
echo "📦 Adding pre-production configuration..."
git add .env.preproduction
git add vercel.preproduction.json
git add scripts/deploy-preproduction.js
git add deploy-preproduction.sh
git add src/config/environment.js
git add src/components/EnvironmentBanner.jsx
git add START_HERE.md
git add QUICK_START_PREPROD.md
git add PRE_PRODUCTION_SETUP.md
git add README_PRE_PRODUCTION.md
git add ENVIRONMENT_COMPARISON.md
git add FILES_CREATED.md
git add PRE_PROD_SETUP_SUMMARY.md
git add .gitignore

# Commit
git commit -m "feat: complete pre-production environment setup

- Sepolia testnet configuration
- Automated deployment scripts
- Environment detection system
- Visual warning banners
- Comprehensive documentation
- Protected sensitive files in .gitignore"

# Push to GitHub
echo "📤 Pushing to GitHub..."
git push -u origin pre-production

echo ""
echo "✅ Pre-production branch created and pushed!"
echo ""
echo "Next steps:"
echo "1. Go to GitHub and verify the branch: https://github.com/YOUR_USERNAME/dwallet/tree/pre-production"
echo "2. In Vercel, import project from 'pre-production' branch"
echo "3. Add environment variables in Vercel dashboard"
echo "4. Test deployment on Sepolia testnet"
echo ""

# Return to original branch
git checkout $CURRENT_BRANCH
echo "🔙 Returned to $CURRENT_BRANCH branch"
```

Make it executable and run:
```bash
chmod +x setup-preproduction-branch.sh
./setup-preproduction-branch.sh
```

---

## 🛡️ Git Protection Rules

### Update `.gitignore` (Already Done)
Your `.gitignore` now protects:
```gitignore
.env.preproduction
.env.preproduction.local
.env.production.template
```

### Never Commit These:
- ❌ `.env.production` (production secrets)
- ❌ Private keys
- ❌ API keys in plain text

### Safe to Commit:
- ✅ `.env.preproduction` (testnet config - no real value at risk)
- ✅ `vercel.preproduction.json` (deployment config)
- ✅ All scripts and components
- ✅ Documentation

---

## 📊 Branch Comparison

| Aspect | `main` Branch | `pre-production` Branch |
|--------|---------------|------------------------|
| **Network** | Ethereum Mainnet | Sepolia Testnet |
| **Purpose** | Live production | Testing/Staging |
| **Risk** | Real value at risk | Zero risk |
| **Deployment** | Auto-deploy on push | Auto-deploy on push |
| **Environment** | `production` | `preproduction` |
| **Config** | `vercel.json` | `vercel.preproduction.json` |
| **Stability** | Always stable | May have test features |

---

## 🎯 Best Practices

### ✅ DO:
- Always test in `pre-production` before merging to `main`
- Keep `main` branch protected (require PR reviews)
- Use branch protection rules on `main`
- Enable required status checks
- Tag production releases

### ❌ DON'T:
- Don't deploy directly to production without testing
- Don't skip the `pre-production` branch
- Don't commit production secrets
- Don't merge untested code to `main`

---

## 🔐 GitHub Branch Protection (Recommended)

For `main` branch:
1. Go to GitHub → Settings → Branches
2. Add branch protection rule:
   - Branch name pattern: `main`
   - ✅ Require pull request reviews before merging
   - ✅ Require status checks to pass before merging
   - ✅ Require branches to be up to date before merging
   - ✅ Include administrators

This ensures nothing goes to production without testing in pre-production first!

---

## 🔄 Alternative: Using GitHub Environments

GitHub also offers "Environments" feature:

1. Go to repository Settings → Environments
2. Create two environments:
   - `production`
   - `pre-production`
3. Set different:
   - Environment variables
   - Deployment branches
   - Required reviewers
   - Wait timers

Then use GitHub Actions for deployment gates.

---

## 📝 Summary

### What You Should Do Now:

```bash
# 1. Create pre-production branch
git checkout -b pre-production

# 2. Add all pre-production files
git add .env.preproduction vercel.preproduction.json scripts/deploy-preproduction.js deploy-preproduction.sh src/config/environment.js src/components/EnvironmentBanner.jsx

# 3. Commit
git commit -m "feat: setup pre-production environment"

# 4. Push to GitHub
git push -u origin pre-production

# 5. In Vercel dashboard:
#    - Import project from 'pre-production' branch
#    - Add environment variables
#    - Deploy to testnet
```

### Then Set Up Protection:
1. GitHub: Protect `main` branch
2. Vercel: Separate projects for each branch
3. Team: Establish workflow (feature → pre-prod → main)

---

**Remember**: The `pre-production` branch is your safety net! 🛡️  
Always test there before promoting to `main`.
