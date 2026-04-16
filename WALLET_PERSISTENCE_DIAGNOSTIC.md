# 🔍 Wallet Persistence Diagnostic Checklist

## Problem
Wallet doesn't persist after page refresh - requires creating/importing wallet every time.

---

## ✅ THREE CAUSES TO CHECK

### **Cause 1: Browser Clearing localStorage** ⚠️

#### Automated Test:
1. Open: http://localhost:5173/storage-diagnostic.html
2. Click "Test Storage Persistence"
3. Wait 2 seconds for results

#### Manual Checks (Do ALL):
- [ ] **Check browser settings:**
  - Chrome: Go to `chrome://settings/cookies/detail?site=localhost`
  - Safari: Preferences → Privacy → Manage Website Data
  - Firefox: Preferences → Privacy & Security → Cookies and Site Data
  - Look for "Clear cookies and site data when you close [browser]"
  - **DISABLE this setting for localhost**

- [ ] **Disable privacy extensions temporarily:**
  - AdBlock, Privacy Badger, uBlock Origin, etc.
  - These can block localStorage
  
- [ ] **Verify NOT in Incognito/Private mode:**
  - Incognito: Storage clears when window closes
  - Use normal browsing mode for testing

- [ ] **Test localStorage manually:**
  - Open browser console (F12)
  - Type: `localStorage.setItem('test', 'value')`
  - Type: `localStorage.getItem('test')`
  - Should return: `"value"`
  - Refresh page
  - Type: `localStorage.getItem('test')` again
  - Should STILL return: `"value"`

---

### **Cause 2: Wallet Not Being Saved** 💾

#### Check if wallet saves properly:

1. **Create/Import Wallet:**
   - Open dWallet app
   - Create new wallet OR import existing
   - Complete the setup

2. **Watch Console Logs (F12):**
   ```
   Look for: 💾 Wallet Saved Successfully
   Should show:
     - storageKey: dwallet_v5_encrypted
     - encryptedLength: [large number]
     - address: 0x...
     - canRetrieve: true
   ```

3. **Verify Data Saved:**
   - In console, type:
   ```javascript
   localStorage.getItem('dwallet_v5_encrypted')
   ```
   - Should return a LONG encrypted string (hundreds of characters)
   - If returns `null` → Save FAILED ❌

4. **Check Data Integrity:**
   - Open: http://localhost:5173/storage-diagnostic.html
   - Click "Check Existing Encrypted Data"
   - Should show your wallet info

#### If save fails:
- Check console for errors during wallet creation
- Verify password is being entered correctly
- Check if encryption function throws errors
- Try different browser

---

### **Cause 3: Wrong Origin/Domain** 🌐

#### Check Your Access URL:

**CORRECT:**
- ✅ `http://localhost:5173`
- ✅ `http://localhost:3000`

**WRONG (different origins!):**
- ❌ `http://127.0.0.1:5173` (different from localhost!)
- ❌ `file:///Users/.../index.html` (won't work at all!)
- ❌ `https://...` (unless actually deployed)

#### Why This Matters:
- `localhost` and `127.0.0.1` are **DIFFERENT origins**
- Each has its own separate localStorage
- Wallet saved on one won't appear on the other!

#### How to Fix:
1. **Always use the SAME URL:**
   - Pick either `localhost` OR `127.0.0.1`
   - Stick with it consistently
   
2. **If using file:// protocol:**
   ```bash
   # STOP using file:// - start a server instead:
   npm run dev
   ```
   
3. **Check current origin:**
   - Open console (F12)
   - Type: `window.location.origin`
   - Should be: `http://localhost:5173`

---

## 📋 Step-by-Step Diagnostic Process

### **Step 1: Run Automated Tests**
```
Open: http://localhost:5173/storage-diagnostic.html
Wait for auto-tests to complete
Review results
```

### **Step 2: Check Browser Console**
```
Press F12 to open console
Look for these log messages:

On wallet creation:
  💾 Wallet Saved Successfully: { canRetrieve: true }

On page load:
  🔐 Wallet Init Debug: { hasEncrypted: true }
```

### **Step 3: Manual localStorage Test**
```javascript
// In browser console:

// 1. Save test data
localStorage.setItem('persistence_test', 'my_test_value');

// 2. Verify it saved
console.log(localStorage.getItem('persistence_test'));
// Should print: "my_test_value"

// 3. REFRESH PAGE (F5)

// 4. Check if still there
console.log(localStorage.getItem('persistence_test'));
// Should STILL print: "my_test_value"

// If step 4 returns null → Browser IS clearing storage!
```

### **Step 4: Check Actual Wallet Data**
```javascript
// In browser console:

// Check if wallet exists
const walletData = localStorage.getItem('dwallet_v5_encrypted');

if (!walletData) {
  console.log('❌ No wallet data found!');
  console.log('Either:');
  console.log('- You haven\'t created/imported a wallet yet');
  console.log('- OR data was cleared/not saved');
} else {
  console.log('✅ Wallet data exists!');
  console.log(`Size: ${walletData.length} bytes`);
  
  // Try to decode (will fail if encrypted, but shows data exists)
  try {
    const decoded = JSON.parse(atob(walletData));
    console.log('📊 Wallet info:', {
      accounts: decoded.accounts?.length,
      address: decoded.accounts?.[0]?.address,
      createdAt: new Date(decoded.createdAt)
    });
  } catch {
    console.log('ℹ️ Data is encrypted (this is normal)');
  }
}
```

### **Step 5: Test Across Refreshes**
```
1. Create/import wallet
2. Watch console for "💾 Wallet Saved Successfully"
3. Copy your wallet address
4. Refresh page (F5)
5. Check console for "🔐 Wallet Init Debug"
6. Does it show hasEncrypted: true?
   - YES → Storage working! ✅
   - NO → Storage broken ❌
```

---

## 🎯 Common Scenarios & Solutions

### **Scenario A: Using File Protocol**
**Symptoms:**
- URL starts with `file:///`
- Errors about CORS or security
- Storage doesn't work

**Solution:**
```bash
npm run dev
# Then access via http://localhost:5173
```

---

### **Scenario B: Switching Between localhost and 127.0.0.1**
**Symptoms:**
- Wallet works sometimes
- Disappears randomly
- Different addresses shown

**Solution:**
- Always use `http://localhost:5173`
- Never use `http://127.0.0.1:5173`
- They're different origins!

---

### **Scenario C: Browser Clears Storage**
**Symptoms:**
- localStorage test fails
- Data disappears after refresh
- Works in other browsers

**Solution:**
1. Check browser settings (see Cause 1 above)
2. Disable "Clear cookies on close"
3. Whitelist localhost
4. Disable privacy extensions

---

### **Scenario D: Private/Incognito Mode**
**Symptoms:**
- Works during session
- Gone when window reopens
- No persistence at all

**Solution:**
- Use normal browsing mode
- Or accept that data will clear

---

## 🛠️ Quick Fixes

### **Fix 1: Clear Everything and Start Fresh**
```javascript
// In browser console:
localStorage.clear();
sessionStorage.clear();
location.reload();
// Then create/import wallet again
```

### **Fix 2: Force Save Current Wallet**
```javascript
// If wallet is loaded but not persisting:
// 1. Lock wallet
// 2. Unlock with password again
// 3. This should trigger re-save
```

### **Fix 3: Change Browser**
- Try Chrome, Firefox, Safari, Edge
- Some browsers have stricter privacy defaults

---

## 📊 Expected Behavior

### **When Working Correctly:**

1. **Create Wallet:**
   ```
   Console: 💾 Wallet Saved Successfully: { canRetrieve: true }
   localStorage: Contains 'dwallet_v5_encrypted'
   ```

2. **Refresh Page:**
   ```
   Console: 🔐 Wallet Init Debug: { hasEncrypted: true }
   Wallet: Shows your account (no need to recreate)
   ```

3. **Lock/Unlock:**
   ```
   Enter password → Wallet unlocks
   Session persists until timeout
   ```

---

## 🔧 Advanced Debugging

### **Enable Verbose Logging:**

The code already has debug logs enabled. Watch for:

```javascript
// On wallet save:
💾 Wallet Saved Successfully: {
  storageKey: 'dwallet_v5_encrypted',
  encryptedLength: 1234,
  address: '0x...',
  canRetrieve: true
}

// On page init:
🔐 Wallet Init Debug: {
  hasEncrypted: true/false,
  hasSession: true/false,
  encryptedDataLength: 1234,
  localStorageKeys: [...]
}
```

### **Check What's in localStorage:**

```javascript
// List all keys:
console.log(Object.keys(localStorage));

// Check dWallet data:
console.log({
  encrypted: localStorage.getItem('dwallet_v5_encrypted'),
  session: sessionStorage.getItem('dwallet_v5_session')
});

// Check size:
console.log(`Encrypted size: ${localStorage.getItem('dwallet_v5_encrypted')?.length || 0} bytes`);
```

---

## ✅ Success Criteria

Your wallet persistence is working if:

- [ ] localStorage test passes (data survives refresh)
- [ ] Wallet save shows `canRetrieve: true`
- [ ] After refresh, `hasEncrypted: true`
- [ ] Wallet address stays the same across refreshes
- [ ] No need to recreate wallet each time
- [ ] Using `http://localhost:5173` (not file:// or 127.0.0.1)

---

## 🆘 Still Not Working?

If ALL above checks pass but wallet still doesn't persist:

1. **Check for JavaScript errors:**
   - Console should be clean (no red errors)
   - Fix any errors shown

2. **Try different browser:**
   - Chrome → Firefox → Safari
   - Isolate browser-specific issues

3. **Check Vite/Webpack config:**
   - Ensure HMR isn't interfering
   - Check build process

4. **Manual inspection:**
   - Review WalletContext.jsx code
   - Check encrypt/decrypt functions
   - Verify password handling

---

## 📝 Next Steps

1. ✅ Open diagnostic tool: http://localhost:5173/storage-diagnostic.html
2. ✅ Run through all automated tests
3. ✅ Complete manual checklist above
4. ✅ Report findings with specific error messages

**Most likely cause:** Browser privacy settings or using wrong origin (127.0.0.1 vs localhost)

**Quickest fix:** Use http://localhost:5173 consistently and check browser cookie settings!
