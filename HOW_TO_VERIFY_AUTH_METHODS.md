# 🔍 How to Verify All Authentication Methods Are Working

## Quick Status Check

Your server is **currently running** on port 3001 with all features enabled!

```
✅ Redis Cache: Connected
✅ PostgreSQL: Connected (Pool: 50)
✅ WebSocket: Real-time updates enabled
✅ Compression: Gzip/Brotli enabled
✅ Rate Limits: Tiered (Free/Premium/VIP/Admin)
✅ HMAC Signing: Enabled
✅ Admin Wallet: Configured
✅ Device Auth: Active
✅ MAC Whitelist: 3c:22:fb:49:f8:f8
```

---

## Method 1: Test Admin Dashboard Login (Admin Key)

### Via Browser (Recommended)

1. **Open your browser**
2. **Go to**: `http://localhost:3000`
3. **You should see**: Login page
4. **Login with**:
   - Username: `admin`
   - Password: `Admin@123456`
5. **Success**: You'll see the admin dashboard

### Via Terminal

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "Admin@123456",
    "deviceFingerprint": "test-device",
    "macAddress": "3c:22:fb:49:f8:f8"
  }'
```

**Expected Response**:
```json
{
  "token": "eyJhbGci...",
  "user": { ... }
}
```

✅ **If you get a token**: Admin key authentication is working!

---

## Method 2: Test Wallet Connect

### Steps:

1. **Open browser**: `http://localhost:3000`
2. **Click**: "Wallet Connect" button
3. **You'll see**: QR code
4. **Scan with**: Your wallet app (MetaMask, WalletConnect app, etc.)
5. **Approve connection** in your wallet
6. **Success**: You're connected!

### What to Look For:

- ✅ QR code displays → WalletConnect endpoint working
- ✅ Wallet app detects connection → WebSocket working
- ✅ Connection approved → Authentication successful
- ✅ Dashboard loads → Session created

### Verify WebSocket is Running:

```bash
# Check if WebSocket port is open
lsof -i:3001 | grep LISTEN
```

**Expected output**:
```
node    12345  username   12u  IPv6  0x123  0t0  TCP *:3001 (LISTEN)
```

✅ **If you see a LISTEN process**: WebSocket is active!

---

## Method 3: Test MAC Address Authentication

### Step 1: Verify Your MAC Address

```bash
networksetup -getmacaddress Wi-Fi
```

**Expected output**:
```
Wi-Fi Address: 3c:22:fb:49:f8:f8
```

### Step 2: Check It's in .env

```bash
grep "ALLOWED_MAC_ADDRESSES" .env
```

**Expected output**:
```
ALLOWED_MAC_ADDRESSES=3c:22:fb:49:f8:f8
```

✅ **If they match**: MAC address authentication is configured!

### Step 3: Test Device Auth Endpoint

```bash
curl http://localhost:3001/api/device/info
```

**Expected Response**:
```json
{
  "deviceAuth": {
    "enabled": true,
    "macWhitelist": ["3c:22:fb:49:f8:f8"]
  }
}
```

✅ **If you get this response**: Device authentication is active!

### Step 4: Login with MAC Address

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "Admin@123456",
    "macAddress": "3c:22:fb:49:f8:f8"
  }'
```

✅ **If login succeeds**: MAC address authentication is working!

---

## Method 4: Test Device Fingerprint (Browser)

### In Browser Console:

1. **Open**: `http://localhost:3000`
2. **Open DevTools**: `Cmd + Option + I`
3. **Go to**: Console tab
4. **Paste this code**:

```javascript
// Generate device fingerprint
function generateDeviceFingerprint() {
  const components = [
    navigator.userAgent,
    navigator.language,
    navigator.platform,
    screen.width + 'x' + screen.height,
    screen.colorDepth,
    window.devicePixelRatio,
    new Date().getTimezoneOffset(),
    navigator.hardwareConcurrency || 1,
    navigator.deviceMemory || 1,
  ];
  
  const fingerprint = components.join('|');
  let hash = 0;
  for (let i = 0; i < fingerprint.length; i++) {
    const char = fingerprint.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(16);
}

// Show your device fingerprint
console.log('🔐 Your Device Fingerprint:', generateDeviceFingerprint());
```

5. **You'll see**: A unique fingerprint like `1a2b3c4d`
6. **This fingerprint** can be used for device authentication

✅ **If you get a fingerprint**: Device fingerprinting is working!

---

## Method 5: Verify HMAC Request Signing

### Check Environment Variable:

```bash
grep "REQUEST_SIGNING_SECRET=" .env
```

**Expected**: A long hex string (128 characters)

✅ **If you see a long string**: HMAC signing is enabled!

### Test Signed Request:

The server will automatically sign requests when `REQUEST_SIGNING_SECRET` is set. You can verify by checking server logs:

```bash
# Look for this in server output:
# "HMAC signing: enabled"
```

---

## Method 6: Verify Blockchain Operations (Admin Wallet)

### Check Configuration:

```bash
grep "ADMIN_PRIVATE_KEY=" .env
```

**Expected**: `ADMIN_PRIVATE_KEY=0xca18206e...` (66 characters, starts with 0x)

✅ **If configured**: Blockchain write operations are enabled!

### Verify in Server Logs:

When server starts, you should **NOT** see:
```
❌ ⚠️  ADMIN_PRIVATE_KEY not set or invalid
```

Instead, you should see **no warning** about ADMIN_PRIVATE_KEY.

✅ **If no warning**: Admin wallet is properly configured!

---

## Complete Verification Checklist

Run these commands in order:

```bash
echo "=== VERIFICATION CHECKLIST ==="
echo ""

# 1. Server Running
echo "1. Server Status:"
lsof -i:3001 | grep LISTEN > /dev/null && echo "   ✅ Running" || echo "   ❌ Not running"

# 2. MAC Address Match
ACTUAL=$(networksetup -getmacaddress Wi-Fi | awk '{print $3}')
ENV=$(grep "ALLOWED_MAC_ADDRESSES" .env | cut -d'=' -f2)
echo ""
echo "2. MAC Address:"
echo "   Actual: $ACTUAL"
echo "   Config: $ENV"
[ "$ACTUAL" = "$ENV" ] && echo "   ✅ Match" || echo "   ❌ Mismatch"

# 3. Environment Variables
echo ""
echo "3. Security Variables:"
grep -q "REQUEST_SIGNING_SECRET=" .env && echo "   ✅ REQUEST_SIGNING_SECRET set" || echo "   ❌ Missing"
grep -q "ADMIN_PRIVATE_KEY=" .env && echo "   ✅ ADMIN_PRIVATE_KEY set" || echo "   ❌ Missing"
grep -q "ENABLE_DEVICE_AUTH=true" .env && echo "   ✅ Device Auth enabled" || echo "   ❌ Disabled"

# 4. Redis
echo ""
echo "4. Redis Cache:"
redis-cli ping 2>/dev/null | grep -q "PONG" && echo "   ✅ Connected" || echo "   ⚠️  Not connected (optional)"

# 5. PostgreSQL
echo ""
echo "5. Database:"
psql $DATABASE_URL -c "SELECT 1" > /dev/null 2>&1 && echo "   ✅ Connected" || echo "   ❌ Not connected"

echo ""
echo "=== VERIFICATION COMPLETE ==="
```

---

## What Each Success Looks Like

### ✅ WalletConnect Working:
- [ ] QR code displays in browser
- [ ] You can scan it with wallet app
- [ ] Connection establishes
- [ ] Dashboard loads after approval

### ✅ MAC Address Working:
- [ ] MAC in .env matches your actual MAC
- [ ] `/api/device/info` returns device auth config
- [ ] Login succeeds with MAC address included
- [ ] Server logs show "Device authentication enabled"

### ✅ Admin Key Working:
- [ ] Login with username/password succeeds
- [ ] JWT token is returned
- [ ] You can access protected endpoints
- [ ] Dashboard loads successfully

### ✅ Device Fingerprint Working:
- [ ] Browser generates unique fingerprint
- [ ] Fingerprint sent with login request
- [ ] Server accepts device authentication
- [ ] Device registered in database

### ✅ HMAC Signing Working:
- [ ] `REQUEST_SIGNING_SECRET` is in .env
- [ ] Server started without HMAC warning
- [ ] API requests include signature headers
- [ ] Tampered requests are rejected

### ✅ Blockchain Operations Working:
- [ ] `ADMIN_PRIVATE_KEY` is in .env
- [ ] Server started without wallet warning
- [ ] You can execute layer functions
- [ ] Transactions are signed and sent

---

## Quick Visual Test

### Open Your Browser and Verify:

1. **Go to**: `http://localhost:3000`
2. **You should see**: Login page ✅
3. **Try login**: Username: `admin`, Password: `Admin@123456`
4. **Success**: Dashboard loads ✅
5. **Check features**:
   - Wallet creation ✅
   - Transaction history ✅
   - Admin panel ✅
   - Device settings ✅

---

## Troubleshooting

### Problem: Server not responding
**Solution**: 
```bash
npm run admin:server
```

### Problem: Login fails
**Check**:
```bash
# Verify admin user exists
psql $DATABASE_URL -c "SELECT username FROM admin_users;"
```

### Problem: MAC address mismatch
**Fix**:
```bash
# Get actual MAC
networksetup -getmacaddress Wi-Fi

# Update .env
# Restart server
```

### Problem: WebSocket not connecting
**Check**:
```bash
lsof -i:3001 | grep LISTEN
```

---

## Server Logs to Watch

When server starts, you should see:

```
✅ Redis connected successfully
✅ PostgreSQL connected
✅ Database tables initialized
✅ Initialized 2 admin user(s)
✅ WebSocket server initialized
```

**NO warnings** about:
- ❌ REQUEST_SIGNING_SECRET
- ❌ ADMIN_PRIVATE_KEY

---

**All authentication methods are configured and ready!** 🎉

Just test them using the methods above to confirm everything works end-to-end.
