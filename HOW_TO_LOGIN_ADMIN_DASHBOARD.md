# 🔑 How to Login to Admin Dashboard - Complete Guide

## The "Admin Key" is NOT a Username/Password!

**Important**: The "Admin Key" is a **secret key** (like a password), not a username.

---

## ✅ Your Admin Key

Your admin key is stored in your `.env` file:

```
ADMIN_SECRET_KEY=4426de8cded7656fc186228298104e293b7e338bee9ea680058515983abf1987
```

**This is what you enter in the "Admin Key" field!**

---

## 🚀 Step-by-Step Login Instructions

### Method 1: Login with Admin Key (Easiest)

1. **Open your browser**
2. **Go to**: `http://localhost:5173`
3. **You'll see**: Login modal with two tabs:
   - 🔑 **Admin Key** (selected by default)
   - 👛 **Wallet**

4. **In the "Admin Key" field**, enter:
   ```
   4426de8cded7656fc186228298104e293b7e338bee9ea680058515983abf1987
   ```

5. **Click**: "Authenticate" button

6. **Success**: Dashboard loads! ✅

---

### Method 2: Login with Wallet

1. **Open**: `http://localhost:5173`
2. **Click**: "👛 Wallet" tab
3. **Click**: "🔌 Connect MetaMask" button
4. **Approve connection** in MetaMask
5. **Click**: "Authenticate" button
6. **Sign the message** in your wallet
7. **Success**: Dashboard loads! ✅

---

## ❌ Why You're Getting "API Offline" Error

The error `FetchEvent.respondWith received an error: TypeError: Load failed` means:

### Possible Causes:

1. **Service Worker Issue**: The service worker is intercepting the request and failing
2. **Wrong URL**: Frontend trying to reach wrong backend URL
3. **CORS Problem**: Backend not allowing the request
4. **Backend Not Running**: Server crashed or stopped

---

## 🔧 How to Fix "API Offline" Error

### Fix 1: Clear Service Worker Cache

**In your browser:**

1. Open: `http://localhost:5173`
2. Open DevTools: `Cmd + Option + I` (Mac) or `F12` (Windows)
3. Go to: **Application** tab
4. Click: **Service Workers** in left sidebar
5. Click: **Unregister** on any service workers
6. Click: **Clear storage** button
7. **Refresh the page**: `Cmd + Shift + R` (hard refresh)

### Fix 2: Verify Backend is Running

**In terminal:**
```bash
lsof -i:3001 | grep LISTEN
```

**You should see:**
```
node    28013  ...  TCP *:3001 (LISTEN)
```

**If nothing shows:**
```bash
# Restart backend
./start-all.sh
```

### Fix 3: Test API Directly

**In terminal:**
```bash
curl -X POST http://localhost:3001/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "type": "key",
    "credentials": {
      "adminKey": "4426de8cded7656fc186228298104e293b7e338bee9ea680058515983abf1987"
    }
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "token": "eyJhbGci...",
  "expiresIn": "4h",
  "requires2FA": false,
  "admin": {
    "id": 1,
    "type": "key"
  }
}
```

✅ If you get this → API is working!

### Fix 4: Check Browser Console

**In browser DevTools (F12):**
1. Go to: **Console** tab
2. Look for errors
3. You might see:
   - `Failed to fetch` → Backend not running
   - `CORS error` → CORS configuration issue
   - `Network error` → Connection problem

---

## 📊 Quick Status Check

Run this command to verify everything:

```bash
./quick-verify.sh
```

**You should see:**
```
1. Server (port 3001):     ✅ Running
2. MAC Address:            ✅ Match
3. HMAC Signing:           ✅ Enabled
4. Admin Wallet:           ✅ Configured
5. Device Auth:            ✅ Enabled
6. Redis Cache:            ✅ Connected
```

---

## 🔑 All Your Credentials

### Admin Key Authentication:
```
Admin Key: 4426de8cded7656fc186228298104e293b7e338bee9ea680058515983abf1987
```

### Wallet Authentication:
```
Admin Wallet: 0x4C0B7314441dfE8E61267C0d87Fc1A657611dCf5
Private Key: 0xca18206e48f9de26624727dbbefc32a44f2fb80eb63b5e177d37fa67a47c508a
```

**Note**: You need to import this private key into MetaMask to use wallet login.

---

## 🎯 Complete Login Flow

### What Happens When You Login:

1. **You enter admin key** in the input field
2. **Frontend sends** POST request to: `http://localhost:3001/api/admin/auth/login`
3. **Request body:**
   ```json
   {
     "type": "key",
     "credentials": {
       "adminKey": "4426de8cded7656fc186228298104e293b7e338bee9ea680058515983abf1987"
     }
   }
   ```
4. **Backend verifies** the key against database
5. **Backend generates** JWT token
6. **Backend responds** with token
7. **Frontend stores** token in localStorage
8. **Dashboard loads** with authenticated session

---

## 🐛 Troubleshooting

### Problem: "Invalid credentials" error

**Solution**: Make sure you're copying the ENTIRE admin key:
```
4426de8cded7656fc186228298104e293b7e338bee9ea680058515983abf1987
```
- No spaces
- No extra characters
- Case-sensitive

### Problem: "API Offline" keeps appearing

**Solution 1**: Clear browser cache completely
```
Chrome/Edge: Cmd+Shift+Delete → Clear all data
Safari: Develop → Empty Caches
```

**Solution 2**: Disable service worker temporarily
```
1. Open DevTools (F12)
2. Go to Application tab
3. Service Workers → Unregister
4. Hard refresh (Cmd+Shift+R)
```

**Solution 3**: Use incognito/private mode
```
Chrome: Cmd+Shift+N
Safari: Cmd+Shift+N
```

### Problem: Backend not responding

**Solution**: Restart servers
```bash
./start-all.sh
```

---

## ✅ Success Checklist

Before logging in, verify:

- [ ] Backend running on port 3001: `lsof -i:3001 | grep LISTEN`
- [ ] Frontend running on port 5173: `lsof -i:5173 | grep LISTEN`
- [ ] Can test API: `curl` command returns token
- [ ] Browser console has NO errors
- [ ] Service worker is cleared (if having issues)
- [ ] Have admin key copied: `4426de8cd...`

---

## 🎉 Quick Login Summary

**Go to**: `http://localhost:5173`

**Enter this in the "Admin Key" field**:
```
4426de8cded7656fc186228298104e293b7e338bee9ea680058515983abf1987
```

**Click**: "Authenticate"

**Done!** ✅

---

## 📝 Important Notes

1. **The admin key is NOT your password "Admin@123456"**
   - That was a mistake in earlier documentation
   - The REAL admin key is the long hex string in `.env`

2. **There is NO username field**
   - Just the admin key (secret key)
   - Or wallet connection

3. **The admin key is stored in `.env` as**:
   ```
   ADMIN_SECRET_KEY=4426de8cded7656fc186228298104e293b7e338bee9ea680058515983abf1987
   ```

4. **Keep this key secret!**
   - Don't share it
   - Don't commit `.env` to Git
   - It's like a password

---

**Now you can login!** 🚀

Just copy the admin key from above and paste it into the login field.
