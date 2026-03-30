# 🌿 GitHub Branch Setup - Quick Guide

## ✅ Yes, You Need a Pre-Production Branch!

Great thinking! Creating a `pre-production` branch is the **recommended best practice** for safe deployments.

---

## ⚡ One-Command Setup (Recommended)

```bash
# Make executable (first time only)
chmod +x setup-preproduction-branch.sh

# Run the setup
./setup-preproduction-branch.sh
```

This automated script will:
1. ✅ Create `pre-production` branch
2. ✅ Add all pre-production files
3. ✅ Commit with proper message
4. ✅ Push to GitHub
5. ✅ Return you to original branch

**Done!** 🎉

---

## 📋 Manual Setup (Alternative)

If you prefer manual control:

```bash
# 1. Create and switch to pre-production branch
git checkout -b pre-production

# 2. Add all pre-production files
git add .env.preproduction vercel.preproduction.json scripts/deploy-preproduction.js deploy-preproduction.sh src/config/environment.js src/components/EnvironmentBanner.jsx

# 3. Add documentation (optional but recommended)
git add START_HERE.md QUICK_START_PREPROD.md PRE_PRODUCTION_SETUP.md README_PRE_PRODUCTION.md ENVIRONMENT_COMPARISON.md FILES_CREATED.md PRE_PROD_SETUP_SUMMARY.md GITHUB_BRANCH_SETUP.md

# 4. Commit
git commit -m "feat: complete pre-production environment setup

- Sepolia testnet configuration
- Automated deployment scripts  
- Environment detection system
- Visual warning banners
- Comprehensive documentation"

# 5. Push to GitHub
git push -u origin pre-production

# 6. Return to main
git checkout main
```

---

## 🔗 Vercel Integration

### Option A: Separate Projects (Recommended)

Create **two Vercel projects**:

#### Project 1: dWallet (Production)
- **Branch**: `main`
- **Network**: Ethereum Mainnet
- **Environment**: Production
- **URL**: dwallet.app (example)

#### Project 2: dWallet Staging (Pre-Production)
- **Branch**: `pre-production`
- **Network**: Sepolia Testnet
- **Environment**: Pre-production
- **URL**: staging.dwallet.app (example)

### Steps:

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"Add New Project"**
3. Import your GitHub repository
4. Select **`pre-production`** branch
5. Configure environment variables:
   ```
   VITE_ENVIRONMENT=preproduction
   VITE_NETWORK=sepolia
   VITE_INFURA_KEY=your_key
   VITE_WALLETCONNECT_PROJECT_ID=your_id
   DEPLOYER_PRIVATE_KEY=your_sepolia_key
   ```
6. Deploy!

---

## 🛡️ Branch Protection (Important!)

Protect your `main` branch from accidental direct pushes:

### GitHub Settings:
1. Go to repository → **Settings**
2. Click **Branches** tab
3. Click **"Add branch protection rule"**
4. Branch name pattern: `main`
5. Enable:
   - ✅ Require pull request reviews before merging
   - ✅ Require status checks to pass before merging
   - ✅ Require branches to be up to date before merging
   - ✅ Include administrators

This ensures:
- No direct pushes to `main`
- All code goes through `pre-production` first
- Team review required

---

## 🔄 Complete Workflow

```bash
# Development workflow:

# 1. Create feature branch
git checkout main
git checkout -b feature/new-feature

# 2. Develop and commit
# ... work on feature ...
git add .
git commit -m "feat: add new feature"
git push origin feature/new-feature

# 3. Create PR to pre-production
# GitHub → Pull Requests → New PR
# Source: feature/new-feature
# Target: pre-production

# 4. Merge to pre-production after review
# Test on Sepolia testnet!

# 5. Create PR to main
# GitHub → Pull Requests → New PR
# Source: pre-production
# Target: main

# 6. Merge to production after final approval
```

---

## 📊 Branch Structure

```
main (Production)
  ↑
  └─── pre-production (Staging/Testnet)
         ↑
         └─── feature branches
```

### When to Use Each:

| Branch | Purpose | Network | Risk |
|--------|---------|---------|------|
| `feature/*` | Active development | Localhost | Zero |
| `pre-production` | Testing & QA | Sepolia | **Zero** |
| `main` | Live production | Mainnet | **HIGH** |

---

## 🎯 What Gets Committed?

### ✅ Safe to Commit (Pre-Production)
- `.env.preproduction` - Testnet config (no real value)
- `vercel.preproduction.json` - Deployment settings
- All scripts and components
- Documentation files

### ❌ Never Commit
- `.env.production` - Production secrets
- Private keys with real funds
- API keys that should be in Vercel only

### ℹ️ Already Protected by `.gitignore`
- `.env.local` - Your local config
- `.env.production.template` - Template reference

---

## 🧪 Testing Checklist

After pushing to `pre-production`:

### GitHub Checks:
- [ ] Branch visible on GitHub
- [ ] All files committed correctly
- [ ] No sensitive data accidentally included

### Vercel Checks:
- [ ] Deployment triggered automatically
- [ ] Build succeeds
- [ ] Environment variables set correctly
- [ ] App loads on testnet URL

### Functional Checks:
- [ ] Orange banner shows "PRE-PRODUCTION MODE"
- [ ] Console warnings appear
- [ ] Connected to Sepolia testnet
- [ ] All features work on testnet

---

## 🚀 Quick Commands Reference

```bash
# Create pre-production branch
./setup-preproduction-branch.sh

# Check current branch
git branch

# Switch to pre-production
git checkout pre-production

# Switch to main
git checkout main

# View remote branches
git branch -r

# Push updates to pre-production
git checkout pre-production
git add .
git commit -m "fix: something"
git push origin pre-production

# See what would change
git diff main..pre-production
```

---

## 📖 Documentation Files

| File | Purpose |
|------|---------|
| **GITHUB_BRANCH_SETUP.md** | Detailed branch strategy guide |
| **setup-preproduction-branch.sh** | Automated setup script |
| **QUICK_START_PREPROD.md** | General quick start |
| **PRE_PRODUCTION_SETUP.md** | Complete manual |

---

## ✨ Benefits of This Setup

### Before:
- ❌ Direct pushes to production (risky!)
- ❌ No separation between dev and prod
- ❌ Hard to rollback
- ❌ No testing ground

### After:
- ✅ Clear separation of environments
- ✅ Safe testing on testnet
- ✅ Easy rollback capability
- ✅ Professional workflow
- ✅ Team collaboration friendly
- ✅ Vercel auto-deployment

---

## 🎉 Ready to Set Up?

### Choose Your Path:

**Automated (Easy):**
```bash
./setup-preproduction-branch.sh
```

**Manual (Control):**
See commands above in "Manual Setup" section

**Need Help?**
Read `GITHUB_BRANCH_SETUP.md` for detailed explanations

---

## 🔐 Security Reminders

✅ **DO:**
- Use separate private keys for testnet/mainnet
- Keep production keys in Vercel only
- Test thoroughly before merging to main
- Enable branch protection

❌ **DON'T:**
- Never commit production private keys
- Never skip pre-production testing
- Never deploy directly to main
- Share production credentials

---

**Your pre-production branch is ready to keep production safe! 🛡️**
