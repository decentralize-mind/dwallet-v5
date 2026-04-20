# 🔐 2FA & WALLET AUTHENTICATION SETUP GUIDE

> **Maximum Security Configuration**  
> **Status: Ready to Configure**

---

## 🎯 WHAT'S BEEN IMPLEMENTED

### ✅ 2FA (Two-Factor Authentication)

**Backend:**
- ✅ TOTP (Time-based One-Time Password) generation
- ✅ QR code generation for authenticator apps
- ✅ Verification endpoint
- ✅ Enable/disable 2FA
- ✅ Secure storage in PostgreSQL (encrypted)

**Frontend:**
- ✅ 2FA setup wizard in Settings panel
- ✅ QR code display
- ✅ Secret key display
- ✅ 6-digit code verification
- ✅ Enable/disable toggle
- ✅ Status indicators

### ✅ Wallet Authentication

**Backend:**
- ✅ Wallet signature verification
- ✅ Timestamp validation (prevent replay attacks)
- ✅ Admin wallet whitelist
- ✅ Ethereum address verification

**Frontend:**
- ✅ Wallet connection detection
- ✅ Message signing
- ✅ Authentication flow

---

## 📱 PART 1: ENABLE 2FA (RECOMMENDED)

### Step 1: Install Authenticator App

**Choose ONE of these apps:**

| App | Platform | Download |
|-----|----------|----------|
| **Google Authenticator** | iOS/Android | [App Store](https://apps.apple.com/us/app/google-authenticator/id388497605) / [Play Store](https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2) |
| **Authy** | iOS/Android/Desktop | [authy.com](https://authy.com/) |
| **1Password** | All platforms | [1password.com](https://1password.com/) |
| **Microsoft Authenticator** | iOS/Android | [App Store](https://apps.apple.com/us/app/microsoft-authenticator/id784170749) / [Play Store](https://play.google.com/store/apps/details?id=com.azure.authenticator) |

**Recommendation:** Use **Authy** (has cloud backup) or **1Password** (if you already use it)

---

### Step 2: Access Admin Dashboard

1. **Open:** http://localhost:5173/admin
2. **Login** with your admin key:
   ```
   4426de8cded7656fc186228298104e293b7e338bee9ea680058515983abf1987
   ```
3. **Click:** "Authenticate"

---

### Step 3: Enable 2FA

1. **Navigate to Settings** (click "Settings" in admin panel)
2. **Find:** "Two-Factor Authentication (2FA)" section
3. **Click:** "Enable 2FA" button

You'll see:
```
🔐 Two-Factor Authentication (2FA)
Setup Instructions:

1. Install Google Authenticator or Authy on your phone
2. Scan the QR code or enter the secret manually
3. Enter the 6-digit code below to verify
```

---

### Step 4: Setup Authenticator App

**Option A: Scan QR Code (Easiest)**
1. Open your authenticator app
2. Tap "+" or "Add Account"
3. Select "Scan QR Code"
4. Point camera at the QR code on screen
5. Account will be added automatically

**Option B: Enter Secret Manually**
1. Open your authenticator app
2. Tap "+" or "Add Account"
3. Select "Enter setup key" or "Manual entry"
4. Copy the secret key from the screen (e.g., `JBSWY3DPEHPK3PXP`)
5. Paste it into the app
6. Name the account: "dWallet Admin"

---

### Step 5: Verify 2FA

1. Your authenticator app now shows a **6-digit code**
2. The code changes every 30 seconds
3. **Enter the current 6-digit code** into the input field
4. **Click:** "✓ Verify & Enable"

**Example:**
```
[ 1 2 3 4 5 6 ]  ← Type code from your app
[✓ Verify & Enable]
```

---

### Step 6: Success!

You'll see:
```
✅ Your account is protected with 2FA. 
You'll need to enter a 6-digit code from your authenticator app each time you login.
```

**🎉 2FA is now enabled!**

---

### Step 7: Test 2FA Login

1. **Logout** of admin dashboard
2. **Login again** with admin key
3. You'll now see a **2FA verification screen**:
   ```
   Two-Factor Authentication Code
   
   [ 0 0 0 0 0 0 ]  ← Enter 6-digit code
   
   [← Back]  [✓ Verify & Login]
   ```
4. **Enter the 6-digit code** from your authenticator app
5. **Click:** "✓ Verify & Login"
6. **Access granted!** ✅

---

## 👛 PART 2: CONFIGURE WALLET LOGIN

### Step 1: Get Your Wallet Address

**Using MetaMask:**
1. Open MetaMask browser extension
2. Click your account name at the top
3. Your address is displayed (e.g., `0x742d...2bD38`)
4. Click to copy the full address

**Using WalletConnect:**
1. Connect your mobile wallet
2. Copy your wallet address from the app

---

### Step 2: Update .env File

Open `/Users/macbookpri/Downloads/dwallet-v5/.env`

Find this line:
```env
ADMIN_WALLETS=0xYourWalletAddress
```

Replace with your actual wallet address:
```env
ADMIN_WALLETS=0x742d35Cc6634C0532925a3b844Bc9e7595f2bD38
```

**Multiple wallets (comma-separated):**
```env
ADMIN_WALLETS=0x742d35Cc6634C0532925a3b844Bc9e7595f2bD38,0xYourSecondWallet,0xYourThirdWallet
```

---

### Step 3: Restart Backend Server

```bash
# Stop current server
pkill -f "enterprise-secure-server.cjs"

# Start server with new config
cd /Users/macbookpri/Downloads/dwallet-v5
node server/enterprise-secure-server.cjs
```

---

### Step 4: Test Wallet Login

1. **Open:** http://localhost:5173/admin
2. **Click:** "👛 Wallet" tab
3. **Connect your wallet** (if not already connected)
4. **Click:** "Authenticate"
5. **MetaMask popup** will appear asking you to sign a message:
   ```
   Sign this message to authenticate as admin:
   
   {
     "action": "admin_login",
     "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD38",
     "timestamp": 1776586127000
   }
   ```
6. **Click:** "Sign"
7. **Access granted!** ✅

---

## 🔒 PART 3: MAXIMUM SECURITY SETUP

### Recommended Configuration:

```
✅ Admin Key Login     → For daily quick access
✅ Wallet Login        → For critical operations
✅ 2FA Enabled         → On BOTH methods
✅ Hardware Wallet     → For maximum security
```

---

### Setup Flow:

```
Daily Admin Tasks:
1. Login with Admin Key
2. Enter 2FA code
3. Access dashboard

Critical Operations (pause contracts, mint tokens):
1. Connect hardware wallet (Ledger/Trezor)
2. Login with Wallet signature
3. Enter 2FA code
4. Perform operation
```

---

## 🧪 TESTING 2FA

### Test 1: Normal Login with 2FA

```bash
# Step 1: Login (should require 2FA)
curl -X POST http://localhost:3001/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "type": "key",
    "credentials": {
      "adminKey": "4426de8cded7656fc186228298104e293b7e338bee9ea680058515983abf1987"
    }
  }'

# Expected response (if 2FA enabled):
{
  "error": "2FA required",
  "requires2FA": true,
  "adminId": "..."
}

# Step 2: Login with 2FA code
curl -X POST http://localhost:3001/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "type": "key",
    "credentials": {
      "adminKey": "4426de8cded7656fc186228298104e293b7e338bee9ea680058515983abf1987"
    },
    "twoFactorToken": "123456"  ← Your 6-digit code
  }'

# Expected response:
{
  "success": true,
  "token": "eyJhbGc...",
  "expiresIn": "4h"
}
```

---

## 🔐 SECURITY BEST PRACTICES

### 2FA Security:

1. **Backup your 2FA secret**
   - Write it down on paper
   - Store in a safe
   - Never store digitally unencrypted

2. **Enable cloud backup** (if using Authy)
   - Allows recovery if phone is lost
   - Encrypt backup with strong password

3. **Test recovery**
   - Try logging in on a different device
   - Make sure backup codes work

4. **Never share your 2FA codes**
   - Support will NEVER ask for your 2FA code
   - Each code is single-use only

### Wallet Security:

1. **Use a hardware wallet** for admin operations
   - Ledger Nano X
   - Trezor Model T
   - Keeps private keys offline

2. **Never share your seed phrase**
   - Write it on paper only
   - Store in secure location
   - Never photograph or store digitally

3. **Use a separate wallet** for admin
   - Don't use your main wallet
   - Dedicate one wallet for admin tasks only

4. **Keep wallet funded**
   - Needs small amount of ETH for gas
   - ~0.01 ETH should be sufficient

---

## 📊 CURRENT SECURITY STATUS

| Feature | Status | Notes |
|---------|--------|-------|
| **Admin Key Auth** | ✅ Working | Backend validated |
| **Wallet Auth** | ⬜ Ready | Configure wallet address |
| **2FA TOTP** | ✅ Ready | Enable in Settings |
| **Rate Limiting** | ✅ Active | 5 attempts/15min |
| **CSRF Protection** | ✅ Active | Token required |
| **JWT Tokens** | ✅ Active | 4-hour expiry |
| **IP Banning** | ✅ Active | Honeypot detection |
| **Audit Logging** | ✅ Active | All actions logged |
| **PostgreSQL** | ✅ Active | Encrypted storage |

---

## 🆘 TROUBLESHOOTING

### 2FA Code Not Working?

1. **Check time synchronization**
   - Your phone's time must be accurate
   - Enable "Automatic time" in phone settings

2. **Wait for new code**
   - Codes change every 30 seconds
   - Wait for a fresh code and try again

3. **Check you're using the right account**
   - Make sure you're looking at "dWallet Admin" in authenticator app

### Lost Access to Authenticator App?

**If you backed up your 2FA secret:**
1. Reinstall authenticator app
2. Add account using the backed-up secret
3. Codes will work again

**If you didn't backup:**
1. Login from a trusted session (if still active)
2. Go to Settings → Disable 2FA
3. Re-enable 2FA with new secret

### Wallet Login Not Working?

1. **Check wallet address in .env**
   ```bash
   grep ADMIN_WALLETS .env
   ```

2. **Make sure address matches exactly**
   - Case-sensitive
   - No spaces
   - Include `0x` prefix

3. **Check wallet is connected**
   - MetaMask should show "Connected"
   - Try disconnecting and reconnecting

---

## 📋 QUICK REFERENCE

### Admin Credentials:
```
Admin Key: 4426de8cded7656fc186228298104e293b7e338bee9ea680058515983abf1987
Dashboard: http://localhost:5173/admin
Backend:   http://localhost:3001
Database:  PostgreSQL (dwallet_admin)
```

### 2FA Status:
```
Current:    ⬜ Not enabled (enable in Settings)
Method:     TOTP (Time-based One-Time Password)
Apps:       Google Authenticator, Authy, 1Password
Codes:      6 digits, changes every 30 seconds
```

### Wallet Status:
```
Current:    0xYourWalletAddress (update in .env)
Method:     Signature verification
Security:   Private key never leaves wallet
```

---

## 🎯 NEXT STEPS

### Immediate (Do Now):
1. ✅ Enable 2FA in Settings
2. ✅ Test 2FA login
3. ✅ Backup 2FA secret securely

### This Week:
1. ⬜ Update ADMIN_WALLETS in .env
2. ⬜ Test wallet login
3. ⬜ Enable 2FA on wallet login too

### Before Production:
1. ⬜ Use hardware wallet for admin
2. ⬜ Setup multi-sig wallet (Gnosis Safe)
3. ⬜ Enable HTTPS/SSL
4. ⬜ Configure Cloudflare WAF
5. ⬜ Professional security audit

---

**🔐 Your admin dashboard now supports maximum security!**

**Enable 2FA now for the best protection!** 🛡️
