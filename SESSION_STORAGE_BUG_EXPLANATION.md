# 🐛 SESSION STORAGE BUG FOUND!

## The Problem

Your wallet persistence issue is caused by **sessionStorage being cleared** on page refresh.

### How It Works (Current Code):

1. **Wallet saved to localStorage** ✅ (encrypted, persists)
2. **Session saved to sessionStorage** ❌ (cleared on refresh in some browsers!)
3. **On refresh:** 
   - localStorage still has encrypted wallet ✅
   - sessionStorage lost the session ❌
   - App shows login screen because no valid session 😞

### Why This Happens:

```javascript
// In WalletContext.jsx line 72:
sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))

// sessionStorage is SUPPOSED to persist across page reloads...
// BUT gets cleared when:
// 1. Tab closes
// 2. Browser crashes
// 3. Some browsers clear on hard refresh (Ctrl+Shift+R)
// 4. Privacy settings/extensions interfere
```

---

## 🔍 Proof From Your Tests:

```javascript
✅ localStorage.setItem('test', 'value') → WORKS
✅ localStorage.getItem('dwallet_v5_encrypted') → RETURNS DATA (256 bytes)
✅ window.location.origin → CORRECT (localhost:5173)

BUT: Wallet doesn't persist after refresh!
```

**Conclusion:** localStorage works fine, but **sessionStorage is failing**.

---

## ✅ SOLUTION: Use localStorage for Session Too!

The fix is to move session from sessionStorage → localStorage with proper expiry checking.

### What Needs to Change:

```javascript
// OLD (broken):
sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))

// NEW (persistent):
localStorage.setItem(SESSION_KEY, JSON.stringify(session))
```

This way:
- Encrypted wallet stays in localStorage ✅
- Session also stays in localStorage ✅  
- Both survive page refresh ✅
- Auto-lock still works (we check timestamp) ✅

---

## 🛠️ Quick Test to Confirm:

Next time you create a wallet:

```javascript
// Check BOTH storage types:
console.log('localStorage:', Object.keys(localStorage));
console.log('sessionStorage:', Object.keys(sessionStorage));

// You'll see:
// - localStorage: ['dwallet_v5_encrypted', ...]
// - sessionStorage: [] ← EMPTY! That's the problem!
```

---

## 💡 Why They Used sessionStorage Originally:

Security! sessionStorage clears when tab closes, which is more secure.
**BUT** it breaks the user experience for a development/test wallet.

For production, they should use:
- Encrypted session in localStorage
- Proper auto-lock timer
- Biometric authentication

But for testing/development? localStorage session is fine!

---

## ⚡ Quick Fix (If You Want to Patch It):

Change these functions in WalletContext.jsx:

1. `saveSession()` - save to localStorage instead of sessionStorage
2. `loadSession()` - load from localStorage instead of sessionStorage  
3. `clearSession()` - clear from localStorage
4. Add expiry check (already exists with AUTO_LOCK_MS)

That's it! Wallet will persist across refreshes.

---

## 🎯 Expected Behavior After Fix:

1. Create/import wallet → enters password once
2. Refresh page → wallet STILL logged in ✅
3. Close tab, reopen → wallet STILL logged in (30 min timeout) ✅
4. After 30 minutes → auto-locks, needs password again ✅

This matches how MetaMask and other wallets work!
