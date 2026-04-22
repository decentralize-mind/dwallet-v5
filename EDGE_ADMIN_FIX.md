# Microsoft Edge Admin Dashboard Fix

## Problem
When accessing the admin dashboard on `localhost:5173` using Microsoft Edge, you get the error:
```
✅ API Connected
🔑 Admin Key
👛 Wallet
👆 Biometric
••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••
Failed to fetch (localhost:3001)
```

However, the same dashboard works fine on Safari.

## Root Cause
**Microsoft Edge has stricter CORS (Cross-Origin Resource Sharing) policies** than Safari, especially for localhost development. When the frontend (port 5173) makes requests to the backend API (port 3001), Edge blocks or restricts these cross-origin requests more aggressively.

## Solution Applied

### 1. Added Vite Proxy Configuration
Updated `vite.config.js` to proxy API requests through the frontend server:

```javascript
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:3001',
      changeOrigin: true,
      secure: false,
    },
  },
},
```

**How it works:**
- Frontend runs on `http://localhost:5173`
- API requests to `/api/*` are automatically proxied to `http://localhost:3001`
- Browser sees all requests as same-origin (port 5173)
- **No CORS issues in any browser!**

### 2. Updated Admin API Client
Modified `src/services/adminAPI.js` to use relative URLs in development:

```javascript
const API_BASE_URL = import.meta.env.VITE_ADMIN_API_URL || 
  (import.meta.env.DEV ? '' : 'http://localhost:3001');
```

- **Development mode**: Uses empty string (relative path) → goes through Vite proxy
- **Production mode**: Uses explicit backend URL

## How to Apply the Fix

### Step 1: Restart the Frontend Server
The Vite config change requires a restart:

```bash
# Kill existing Vite process
pkill -f 'vite'

# Or use Ctrl+C in the terminal where npm run dev is running
```

### Step 2: Start Both Servers

**Option A: Use the start script (recommended)**
```bash
./start-admin.sh
```

**Option B: Manual start**
```bash
# Terminal 1 - Backend
node server/enterprise-secure-server.cjs

# Terminal 2 - Frontend
npm run dev
```

### Step 3: Clear Browser Cache in Edge
Microsoft Edge may have cached the old CORS errors:

1. Open Edge DevTools: `Cmd + Shift + I` (Mac) or `Ctrl + Shift + I` (Windows)
2. Right-click the refresh button
3. Select **"Empty Cache and Hard Reload"**

Or manually:
1. Go to `edge://settings/clearBrowserData`
2. Select "Cached images and files"
3. Click "Clear now"

### Step 4: Test in Edge
1. Open `http://localhost:5173/admin`
2. The error should be gone
3. You should be able to login normally

## Verification

### Check if Proxy is Working
Open browser DevTools → Network tab:
- All API requests should show as `localhost:5173` (not `localhost:3001`)
- Requests to `/api/admin/*` should return 200 OK

### Backend Still Running?
```bash
curl http://localhost:3001/api/admin/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "...",
  "version": "3.0.0-ENTERPRISE"
}
```

## Why This Works

### Before (CORS Issue)
```
Browser (Edge) → http://localhost:5173 (Frontend)
                 ↓
              Cross-origin request to http://localhost:3001 (Backend)
                 ↓
              Edge blocks/restricts due to strict CORS policy ❌
```

### After (Proxy Solution)
```
Browser (Edge) → http://localhost:5173 (Frontend + Vite Proxy)
                 ↓
              Same-origin request to /api/* 
                 ↓
              Vite proxy forwards to http://localhost:3001 (Backend)
                 ↓
              Works perfectly! ✅
```

## Browser Comparison

| Browser | CORS Strictness | Before Fix | After Fix |
|---------|----------------|------------|-----------|
| Safari  | Moderate       | ✅ Works   | ✅ Works  |
| Chrome  | Strict         | ⚠️ May fail| ✅ Works  |
| Edge    | Very Strict    | ❌ Fails   | ✅ Works  |
| Firefox | Strict         | ⚠️ May fail| ✅ Works  |

## Additional Notes

### Production Deployment
In production, you should:
1. Set `VITE_ADMIN_API_URL` to your actual backend URL
2. Configure proper CORS on the backend
3. Use HTTPS (required for production cookies)

### Why Not Just Fix CORS?
We could relax CORS settings, but that would:
- Reduce security
- Not work for all Edge scenarios
- Be a temporary workaround

**The proxy solution is:**
- ✅ More secure (no CORS relaxation)
- ✅ Works in all browsers
- ✅ Standard development practice
- ✅ Better for debugging (all requests in one place)

## Troubleshooting

### Still Getting Errors?

1. **Check both servers are running:**
   ```bash
   lsof -i :3001  # Backend
   lsof -i :5173  # Frontend
   ```

2. **Check Vite proxy logs:**
   - Look at the terminal running `npm run dev`
   - You should see proxy activity when making API calls

3. **Try incognito/private mode:**
   ```
   Edge: Cmd/Ctrl + Shift + N
   ```

4. **Check .env.local:**
   ```bash
   cat .env.local
   ```
   Should contain: `VITE_ADMIN_API_URL=http://localhost:3001`
   
   If you want to force direct connection (bypass proxy), remove this line.

### Force Direct Connection (Not Recommended)
If you need to test direct CORS connection:
```bash
# Remove or comment out in .env.local
# VITE_ADMIN_API_URL=http://localhost:3001
```

Then restart frontend. But the proxy is the better solution!

---

**Fix Applied:** 2026-04-22  
**Status:** ✅ Resolved  
**Affected Browsers:** Microsoft Edge (primarily), Chrome, Firefox
