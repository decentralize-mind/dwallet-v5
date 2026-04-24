# GitHub Branch Protection Setup Guide - dWallet v5

## 🎯 Objective
Protect your `main` branch from unauthorized or accidental changes by requiring code reviews, status checks, and signed commits.

---

## 📋 Step-by-Step Instructions

### Step 1: Navigate to Branch Protection Settings

1. Open your browser and go to:
   ```
   https://github.com/flodecentralizedchat-source/dwallet-v5/settings/branches
   ```

2. You'll see the "Branches" settings page

---

### Step 2: Add Branch Protection Rule

1. Click the **"Add rule"** button (or edit existing rule for `main`)

2. **Branch name pattern:** Type `main`
   - This applies the rule to the main branch

---

### Step 3: Configure Protection Settings

#### 🔒 Section 1: Require Pull Request Reviews Before Merging

**☑️ Check this box**

Settings to configure:
- **☑️ Require approvals** → Set to `1` approval
  - At least 1 person must approve before merging
  
- **☑️ Dismiss stale pull request approvals when new commits are pushed**
  - Forces re-review if code changes after approval
  
- **☑️ Require review from Code Owners**
  - Ensures designated code owners review changes
  
- **☑️ Restrict who can dismiss pull request reviews** (optional)
  - Only specific people can dismiss reviews

---

#### 🔍 Section 2: Require Status Checks to Pass Before Merging

**☑️ Check this box**

Settings to configure:
- **☑️ Require branches to be up to date before merging**
  - Branch must be current with main before merge
  
- **Status checks to require:** (optional, add as you set up CI/CD)
  - For now, leave empty or add tests when you have them
  - Examples: `build`, `test`, `lint`

---

#### ✍️ Section 3: Require Signed Commits

**☑️ Check this box** (CRITICAL after GPG setup)

This ensures:
- All commits must have verified GPG signatures
- Prevents unauthorized commits
- Shows "Verified" badge on GitHub

⚠️ **IMPORTANT:** Only enable this AFTER you complete the GPG setup (Task 2)

---

#### 👥 Section 4: Include Administrators

**☑️ Check this box**

This ensures:
- Repository admins must follow the same rules
- No one can bypass protections
- Enforces consistency

---

#### 🚫 Section 5: Push Restrictions

**☑️ Check: Restrict who can push to matching branches** (optional)

Settings:
- Add specific users or teams who can push
- Or leave unchecked to allow all collaborators with PR approval

**☑️ Do not allow bypassing the above settings**
- Ensures no one can skip these rules

---

#### 🔐 Section 6: Additional Restrictions

**☑️ Do not allow deletions**
- Prevents branch from being deleted

**☑️ Do not allow force pushes**
- Prevents overwriting history (protects against accidental `git push --force`)

**☑️ Require conversation resolution before merging** (recommended)
- All review comments must be resolved before merge

---

### Step 4: Save the Rule

1. Scroll to the bottom
2. Click **"Create"** or **"Save changes"**
3. Your branch is now protected!

---

## ✅ Verification Checklist

After setting up, verify:

- [ ] Navigate to: https://github.com/flodecentralizedchat-source/dwallet-v5/settings/branches
- [ ] You see a rule for `main` branch
- [ ] All checkboxes are enabled as described above
- [ ] Try to push directly to main (should be rejected)
- [ ] Create a test PR (should require approval)

---

## 🧪 Test Your Protection

### Test 1: Direct Push Should Fail

```bash
cd /Users/macbookpri/Downloads/dwallet-v5
git checkout main
echo "test" > test-file.txt
git add test-file.txt
git commit -m "Test direct push"
git push origin main
```

**Expected Result:** ❌ Rejected with message about requiring pull requests

### Test 2: Pull Request Flow

```bash
# Create a new branch
git checkout -b test-branch
echo "test" > test-file.txt
git add test-file.txt
git commit -S -m "Test signed commit"  # -S signs with GPG
git push origin test-branch
```

Then:
1. Go to GitHub
2. Create a Pull Request from `test-branch` → `main`
3. You should see required checks
4. Request a review
5. After approval, merge

**Expected Result:** ✅ PR shows all required checks

---

## 🛡️ Security Benefits

With branch protection enabled:

1. **No Direct Pushes** - All changes must go through PRs
2. **Code Reviews Required** - At least 1 approval needed
3. **Signed Commits Only** - Verifies committer identity
4. **No Force Pushes** - Protects history integrity
5. **No Accidental Deletions** - Branch cannot be deleted
6. **Admin Accountability** - Rules apply to everyone

---

## 💡 Best Practices

### 1. Set Up CODEOWNERS File

Create `.github/CODEOWNERS` to define who must review changes:

```
# Global owners
* @your-username

# Smart contracts
/contracts/ @your-username @security-reviewer

# Frontend
/src/ @your-username @frontend-reviewer

# Scripts
/scripts/ @your-username
```

### 2. Add Status Checks (When You Have CI/CD)

Once you set up GitHub Actions, add these required checks:
- `build` - Ensures code compiles
- `test` - Runs test suite
- `lint` - Checks code style
- `security-scan` - Automated security checks

### 3. Use Protected Tags

Also protect important tags:
```
Settings → Code and automation → Tags
☑️ Prevent force pushes
☑️ Restrict who can create tags
```

---

## 📸 Visual Guide

### What You Should See:

**Branch Protection Rules Page:**
```
Branch protection rules
┌─────────────────────────────────────────┐
│ main                            [Edit]  │
│                                         │
│ ✓ Require pull request reviews          │
│ ✓ Require status checks                 │
│ ✓ Require signed commits                │
│ ✓ Include administrators                │
│ ✓ Do not allow force pushes             │
│ ✓ Do not allow deletions                │
└─────────────────────────────────────────┘
```

**Pull Request with Protections:**
```
This branch has not been approved yet
⚠️ 1 review required
✓ All checks passed
✓ Signed commit verified
[Request review] [Merge pull request] (disabled until approved)
```

---

## 🔧 Using GitHub API (Alternative Method)

If you prefer automation, use the GitHub API:

```bash
# First, create a Personal Access Token with repo permissions
# Go to: https://github.com/settings/tokens

# Then run:
curl -X PUT \
  -H "Authorization: token YOUR_PERSONAL_ACCESS_TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  https://api.github.com/repos/flodecentralizedchat-source/dwallet-v5/branches/main/protection \
  -d '{
    "required_pull_request_reviews": {
      "dismiss_stale_reviews": true,
      "require_code_owner_reviews": true,
      "required_approving_review_count": 1
    },
    "required_status_checks": {
      "strict": true,
      "contexts": []
    },
    "enforce_admins": true,
    "restrictions": null,
    "required_linear_history": false,
    "allow_force_pushes": false,
    "allow_deletions": false,
    "required_conversation_resolution": true
  }'
```

---

## 🚨 Important Notes

1. **Complete GPG Setup First**
   - Don't enable "Require signed commits" until you finish Task 2
   - Otherwise, you won't be able to push commits!

2. **Repository Permissions**
   - You must be an admin to set up branch protection
   - Free GitHub accounts can use branch protection
   - Some features require GitHub Pro/Team

3. **Team Workflow**
   - Inform all team members about the new workflow
   - They'll need to:
     - Set up GPG signing
     - Create branches for all changes
     - Use pull requests
     - Request reviews

---

## 📚 Additional Resources

- [GitHub Branch Protection Docs](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
- [CODEOWNERS Documentation](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners)
- [Required Status Checks](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/defining-the-mergeability-of-pull-requests/about-protected-branches#required-status-checks)

---

**Direct Link to Your Settings:**
https://github.com/flodecentralizedchat-source/dwallet-v5/settings/branches

**Status:** Ready for manual configuration
**Date:** 2026-04-24
