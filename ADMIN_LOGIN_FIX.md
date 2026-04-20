# 🔧 ADMIN LOGIN TROUBLESHOOTING

## Issue Fixed! ✅

The problem was that the frontend wasn't sending CSRF tokens with login requests. This has been fixed.

---

## How to Login Now

### Step 1: Refresh Your Browser
Press `Cmd + Shift + R` (Mac) or `Ctrl + Shift + R` (Windows) to hard refresh.

### Step 2: Open Admin Dashboard
Go to: **http://localhost:5173/admin**

You should now see:
```
Admin Access Required
Secure authentication via backend server
✅ API Connected  ← This should now show "API Connected"!
```

### Step 3: Login with Admin Key

1. Click the **"🔑 Admin Key"** tab (if not already selected)
2. Enter your admin key:
   ```
   4426de8cded7656fc186228298104e293b7e338bee9ea680058515983abf1987
   ```
3. Click **"Authenticate"** button
4. You should be logged in! ✅

---

## What Was Fixed

### Before (Broken):
```javascript
// Missing CSRF token
fetch('/api/admin/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ ... })
  // ❌ No CSRF token = 403 Forbidden
})
```

### After (Working):
```javascript
// Now includes CSRF token
await this.fetchCSRFToken(); // Get CSRF token first

fetch('/api/admin/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRF-Token': this.csrfToken  // ✅ CSRF token included
  },
  credentials: 'include',  // ✅ Include cookies
  body: JSON.stringify({ ... })
})
```

---

## If It Still Doesn't Work

### Check 1: Is Backend Running?
```bash
curl http://localhost:3001/api/admin/health
```
Should return: `{"status":"healthy",...}`

### Check 2: Is Frontend Running?
Open: http://localhost:5173

### Check 3: Check Browser Console
1. Open DevTools: `Cmd + Option + I` (Mac) or `F12` (Windows)
2. Go to **Console** tab
3. Look for errors (red text)

Common errors:
- `Failed to fetch` → Backend not running
- `CORS error` → CORS not configured (should be fixed now)
- `Invalid CSRF token` → Should be fixed now

### Check 4: Check Network Tab
1. Open DevTools: `Cmd + Option + I`
2. Go to **Network** tab
3. Try to login
4. Look for the `login` request
5. Check:
   - Status code (should be 200)
   - Request headers (should have `X-CSRF-Token`)
   - Response (should have `{"success": true, "token": "..."}`)

### Check 5: Clear Browser Data
Sometimes old data causes issues:
1. Open DevTools
2. Go to **Application** tab
3. Click **Clear storage**
4. Click **Clear site data**
5. Refresh page

---

## Quick Test Commands

### Test Backend Health
```bash
curl http://localhost:3001/api/admin/health | jq .
```

### Test CSRF Token Fetch
```bash
curl -c /tmp/test-cookies.txt http://localhost:3001/api/admin/auth/csrf-token
```

### Test Login (Simulates Frontend)
```bash
# Step 1: Get CSRF token
CSRF=$(curl -s -c /tmp/admin-cookies.txt http://localhost:3001/api/admin/auth/csrf-token | jq -r '.csrfToken')

# Step 2: Login with CSRF token
curl -s -X POST http://localhost:3001/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $CSRF" \
  -b /tmp/admin-cookies.txt \
  -d '{
    "type": "key",
    "credentials": {
      "adminKey": "4426de8cded7656fc186228298104e293b7e338bee9ea680058515983abf1987"
    }
  }' | jq .
```

Expected response:
```json
{
  "success": true,
  "token": "eyJhbGc...",
  "expiresIn": "4h",
  "requires2FA": false,
  "admin": {
    "id": "...",
    "type": "key"
  }
}
```

---

## Servers Status

### Backend Server
```bash
# Should show: ✅ RUNNING
curl http://localhost:3001/api/admin/health
```

### Frontend Server
```bash
# Should show: Vite running on http://localhost:5173
ps aux | grep vite
```

### PostgreSQL
```bash
# Should show: accepting connections
pg_isready
```

---

## Restart Everything

If something is still broken, restart all services:

```bash
# Stop all servers
pkill -f "enterprise-secure-server.cjs"
pkill -f "vite"

# Start backend
cd /Users/macbookpri/Downloads/dwallet-v5
node server/enterprise-secure-server.cjs &

# Start frontend (in another terminal)
cd /Users/macbookpri/Downloads/dwallet-v5
npm run dev
```

---

## Still Having Issues?

### Check Terminal Output
Look at the terminal where you started the backend server. It should show:
```
✅ PostgreSQL connected
✅ Database tables initialized
✅ Initialized 2 admin user(s)
╔═══════════════════════════════════════════════════════╗
║   🔐🛡️ ENTERPRISECURE Admin Backend v3.0.0         ║
...
```

### Check for Errors
If you see errors in the terminal, copy them and look for:
- Database connection errors
- Port already in use errors
- Module not found errors

### View Security Logs
```bash
psql -d dwallet_admin -c "SELECT * FROM security_events ORDER BY created_at DESC LIMIT 10;"
```

### View Audit Logs
```bash
psql -d dwallet_admin -c "SELECT action, created_at FROM audit_logs ORDER BY created_at DESC LIMIT 10;"
```

---

## Success Indicators

When everything is working, you should see:

### In Browser:
```
✅ API Connected
🔑 Admin Key (selected tab)
[Enter admin key here]
[Authenticate button]
```

After clicking Authenticate:
```
✅ Logged in
Admin Dashboard loads with:
- System Overview
- User Management
- Contract Control
- etc.
```

### In Backend Terminal:
```
🚨 SECURITY [MEDIUM]: LOGIN_SUCCESS from ::1
(No errors)
```

---

## Contact Info

If you're still stuck after trying all of the above:

1. **Check the console** for specific error messages
2. **Check the network tab** to see what's being sent/received
3. **Check the backend terminal** for server-side errors
4. **Share the exact error message** you're seeing

---

**The fix has been applied. Just refresh your browser and try again!** 🚀
