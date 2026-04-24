# GPG Signing Setup Guide - dWallet v5

## ✅ What's Done
- GPG (gnupg 2.5.18) is installed
- Git repository is ready for GPG configuration

## 🔧 Steps to Complete GPG Setup

### Step 1: Generate a GPG Key

Run this command in your terminal:

```bash
gpg --full-generate-key
```

**Use these settings:**
1. **Key type:** Select `RSA and RSA` (option 1, default)
2. **Key size:** Type `4096`
3. **Expiration:** Type `0` for no expiration (or `1y` for 1 year)
4. **Real name:** Enter your name (e.g., `Your Name`)
5. **Email address:** Enter the email associated with your GitHub account
6. **Comment:** Optional (press Enter to skip)
7. **Passphrase:** Create a strong passphrase and remember it!

### Step 2: Get Your GPG Key ID

After generating the key, list your secret keys:

```bash
gpg --list-secret-keys --keyid-format=long
```

You'll see output like:
```
sec   rsa4096/XXXXXXXXXXXXXXXX 2026-04-24 [SC]
      XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
uid                 [ultimate] Your Name <your-email@example.com>
ssb   rsa4096/YYYYYYYYYYYYYYYY 2026-04-24 [E]
```

Copy the key ID (the part after `rsa4096/`): `XXXXXXXXXXXXXXXX`

### Step 3: Configure Git to Use Your GPG Key

Replace `YOUR_KEY_ID` with your actual key ID:

```bash
cd /Users/macbookpri/Downloads/dwallet-v5
git config --local user.signingkey YOUR_KEY_ID
git config --local commit.gpgsign true
git config --local tag.gpgsign true
```

**Optional: Set globally for all repositories:**
```bash
git config --global user.signingkey YOUR_KEY_ID
git config --global commit.gpgsign true
git config --global tag.gpgsign true
```

### Step 4: Export Your GPG Public Key

```bash
gpg --armor --export YOUR_KEY_ID
```

This will output your public key. Copy the ENTIRE output including:
- `-----BEGIN PGP PUBLIC KEY BLOCK-----`
- All the base64 content
- `-----END PGP PUBLIC KEY BLOCK-----`

### Step 5: Add GPG Key to GitHub

1. Go to: https://github.com/settings/gpg/new
2. Paste your public key in the "Key" field
3. Click "Add GPG key"

### Step 6: Test Your Setup

Create a test commit:

```bash
cd /Users/macbookpri/Downloads/dwallet-v5
git commit --allow-empty -m "Test GPG signed commit"
```

If prompted, enter your GPG passphrase.

Verify the commit is signed:
```bash
git log --show-signature -1
```

You should see: `gpg: Signature made ...` and `Good signature`

## 🔍 Verification Checklist

After completing all steps, verify:

- [ ] GPG key generated with 4096-bit RSA
- [ ] Git configured with signing key
- [ ] `commit.gpgsign` set to true
- [ ] Public key added to GitHub
- [ ] Test commit shows verified signature on GitHub
- [ ] Passphrase is stored securely

## 💡 Tips

### Avoid Entering Passphrase Every Time

On macOS, you can use gpg-agent to cache your passphrase:

```bash
# Add to ~/.gnupg/gpg-agent.conf
echo "default-cache-ttl 3600" >> ~/.gnupg/gpg-agent.conf
echo "max-cache-ttl 86400" >> ~/.gnupg/gpg-agent.conf
```

This caches your passphrase for 1 hour (3600 seconds) or up to 24 hours.

### View Current Git Configuration

```bash
git config --local --list | grep gpg
```

### Troubleshooting

**Error: "No secret key"**
- Make sure you're using the correct key ID
- Run `gpg --list-secret-keys` to verify

**Error: "Inappropriate ioctl for device"**
- Set your GPG TTY: `export GPG_TTY=$(tty)`
- Add this to your `~/.zshrc` file

**Commits show "Unverified" on GitHub**
- Email in GPG key must match a verified email on GitHub
- Check GitHub Settings > Emails

## 📚 Additional Resources

- [GitHub GPG Documentation](https://docs.github.com/en/authentication/managing-commit-signature-verification)
- [GnuPG Documentation](https://www.gnupg.org/documentation/)
- [Pro Git - Signing Your Work](https://git-scm.com/book/en/v2/Git-Tools-Signing-Your-Work)

---

**Status:** Ready for user to complete interactive setup
**Date:** 2026-04-24
