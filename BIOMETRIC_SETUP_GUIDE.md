# 🔐 Biometric Authentication Setup Guide

## ✅ What You Get

- **Touch ID** support on MacBook (if your device has it)
- **Face ID** support on compatible devices
- **Windows Hello** support on Windows devices
- Fast, secure wallet unlocking with biometrics

---

## 🚀 How to Enable Biometric on Your MacBook

### Step 1: Open Settings
1. Launch the Toklo Wallet app
2. Navigate to **Settings** (gear icon)
3. Scroll to the **Security** section

### Step 2: Enable Touch ID / Face ID
1. Look for **"Biometric Authentication"** option
2. Click the **"👆 Enable Touch ID / Face ID"** button
3. A prompt will appear asking for your **wallet password**
4. Enter your password and confirm
5. Your MacBook's Touch ID sensor will activate
6. Place your finger on the Touch ID sensor to register

### Step 3: Success! 🎉
- You'll see a confirmation message: **"✓ Biometric setup complete!"**
- The button will change to show **"✓ Biometric authentication is enabled"**
- You can now use Touch ID to unlock your wallet

---

## 🔓 How to Use Biometric Unlock

### When Your Wallet is Locked:
1. You'll see the lock screen with password input
2. Below the password field, you'll see:
   ```
   — or —
   👆 Use Biometric (Touch ID / Face ID)
   ```
3. Click the biometric button
4. Touch the Touch ID sensor
5. **Note:** You'll still need to enter your password for decryption (security measure)

---

## ⚙️ Manage Biometric Settings

### To Remove Biometric:
1. Go to **Settings** → **Security** section
2. Click **"Remove Biometric"** button
3. Confirmation message will appear

### To Re-enable After Removal:
1. Click **"👆 Enable Touch ID / Face ID"** again
2. Follow the setup steps

---

## 🔍 Troubleshooting

### "Biometric authentication is not supported on this device"
- **Check:** Does your MacBook have Touch ID?
  - MacBook Pro (2016 and later) with Touch Bar
  - MacBook Air (2018 and later)
  - MacBook (2019 and later)
- **Browser:** Make sure you're using a modern browser (Chrome, Safari, Edge, Firefox)
- **HTTPS:** Biometric requires secure context (HTTPS or localhost)

### Touch ID Not Prompting
- **Check System Preferences:** 
  - Go to **System Preferences → Touch ID**
  - Make sure Touch ID is enabled for Safari/applications
- **Browser Permissions:** Some browsers may need explicit permission

### Setup Fails
- **Wrong Password:** Make sure you're entering the correct wallet password
- **Wallet Not Created:** You must have a wallet created/imported first
- **Browser Issue:** Try a different browser or update to latest version

---

## 🔒 Security Notes

### How It Works:
1. **WebAuthn Standard:** Uses industry-standard Web Authentication API
2. **Local Storage:** Biometric credential is stored securely in your browser
3. **Password Still Required:** Biometric verifies identity, but password is still needed for decryption
4. **Device-Specific:** Biometric only works on the device where it was set up

### Best Practices:
- ✅ Enable biometric on your trusted personal devices
- ✅ Keep your password secure (still needed for decryption)
- ✅ Remove biometric if selling/giving away device
- ❌ Don't enable on shared/public computers
- ❌ Don't share your wallet password with anyone

---

## 📱 Supported Devices

| Device | Biometric Type | Status |
|--------|---------------|--------|
| MacBook Pro (2016+) with Touch Bar | Touch ID | ✅ Supported |
| MacBook Air (2018+) | Touch ID | ✅ Supported |
| MacBook (2019+) | Touch ID | ✅ Supported |
| iPhone/iPad | Face ID / Touch ID | ✅ Supported |
| Windows PC with Windows Hello | Windows Hello | ✅ Supported |
| Android Device | Android Biometric | ✅ Supported |
| Desktop without biometric | N/A | ❌ Not Supported |

---

## 💡 Pro Tips

1. **Fast Unlock:** Biometric speeds up the initial verification
2. **Multiple Fingerprints:** Register multiple fingers in System Preferences for convenience
3. **Fallback:** Password always works as backup
4. **Per Device:** Set up biometric on each device you use

---

## 🆘 Need Help?

If you're experiencing issues:
1. Check browser console for error messages (F12 → Console)
2. Verify your device supports biometric authentication
3. Ensure your browser is up to date
4. Try clearing browser cache and retrying

---

**Last Updated:** April 2026  
**Feature Version:** 1.0.0
