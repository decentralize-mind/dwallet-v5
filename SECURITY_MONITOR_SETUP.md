# Security Monitor - Quick Setup Guide

## 🚀 What Was Implemented

✅ **Real-time security metrics** from blockchain & database  
✅ **Live threshold configuration** with blockchain updates  
✅ **Auto-refresh** every 60 seconds  
✅ **Input validation** before saving  

---

## ⚙️ Required Configuration

### **Step 1: Add Missing Environment Variables**

Add these to your `.env` file:

```bash
# ─── Security Monitor Contracts ─────────────────────────────────────
# If you have deployed these contracts, add their addresses:
ANOMALY_DETECTOR_ADDRESS=0x...
DYNAMIC_FEE_CONTROLLER_ADDRESS=0x...
SECURITY_CONTROLLER_ADDRESS=0x...

# Already configured:
# LAYER7_SECURITY_ADDRESS=0x20d859c9EB3FA612C604213F74dcC6Ae49Cd040c
```

### **Step 2: Deploy Missing Contracts (Optional)**

If you haven't deployed the AnomalyDetector yet:

```bash
# Deploy to Base Sepolia
node scripts/deploy-anomaly-detection.js --network baseSepolia

# The script will output contract addresses
# Copy them to your .env file
```

### **Step 3: Restart Admin Server**

```bash
# Stop current server (if running)
# Then restart:
cd server
node enterprise-secure-server.cjs
```

---

## 🧪 Testing

### **1. Open Admin Dashboard**

```bash
# Start frontend (if not running)
npm run dev

# Open browser
http://localhost:5173/admin
```

### **2. Navigate to Security Monitor**

- Login to admin dashboard
- Click "🛡️ Security Monitor" in sidebar
- You should see:
  - **Active Monitors**: Number (0 if contracts not deployed)
  - **Unresolved Alerts**: Real count from database
  - **Blocked Threats**: Real count from blockchain
  - **Checks (24h)**: Real count from database

### **3. Test Threshold Updates**

1. Scroll to "Anomaly Detection Thresholds"
2. Change any value (e.g., Volume Spike from 5.0 to 6.0)
3. Click "💾 Save Thresholds"
4. Confirm the transaction
5. You should see: "✅ Thresholds updated successfully!"

---

## 📊 Expected Behavior

### **If Contracts ARE Deployed:**
```
Active Monitors: 4
Blocked Threats: 23
Checks (24h): 8,432
Unresolved Alerts: 2
```

### **If Contracts NOT Deployed:**
```
Active Monitors: 1 (only Layer7Security)
Blocked Threats: 0
Checks (24h): 0 (or actual DB count)
Unresolved Alerts: 0 (or actual DB count)
```

---

## ⚠️ Troubleshooting

### **Problem: All metrics show 0**

**Check:**
1. Is `ANOMALY_DETECTOR_ADDRESS` set in `.env`?
2. Is the contract deployed on Base Sepolia?
3. Check server logs for errors:
   ```bash
   tail -f logs/admin-server.log
   ```

### **Problem: "Failed to save thresholds"**

**Check:**
1. Is `ADMIN_PRIVATE_KEY` configured in `.env`? ✅ (Already set)
2. Does admin wallet have enough ETH for gas?
3. Does admin wallet have permissions on AnomalyDetector?
4. Check browser console for error details

### **Problem: Thresholds don't update**

**Check:**
1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for errors when clicking "Save"
4. Common errors:
   - "User denied transaction" → Approve in MetaMask
   - "Insufficient funds" → Add ETH to wallet
   - "Revert" → Check contract permissions

---

## 🔍 Verification Commands

### **Test API Endpoints Manually**

```bash
# Get JWT token first (login via UI and copy from localStorage)
TOKEN="your_jwt_token_here"

# Test metrics endpoint
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/admin/security/metrics | jq

# Test thresholds endpoint
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/admin/security/thresholds | jq

# Test threshold update
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"volumeSpike":6.0,"txFrequency":3.5,"priceDeviation":4,"whaleAlert":150000}' \
  http://localhost:3001/api/admin/security/thresholds | jq
```

---

## 📝 What Changed in Code

### **Backend** (`server/enterprise-secure-server.cjs`)
- ✅ Added 3 new API endpoints
- ✅ Added `fetchSecurityMetrics()` function
- ✅ Added `fetchAnomalyThresholds()` function
- ✅ Added `updateAnomalyThresholds()` function

### **Frontend** (`src/components/admin/SecurityMonitor.jsx`)
- ✅ Added state for metrics and thresholds
- ✅ Added data fetching on mount + auto-refresh
- ✅ Added threshold save handler with validation
- ✅ Updated UI to show real data instead of hardcoded values

---

## 🎯 Next Steps

1. **Deploy AnomalyDetector** (if not already deployed)
2. **Update .env** with contract addresses
3. **Restart admin server**
4. **Test in admin dashboard**
5. **Monitor logs** for any issues

---

## 📚 Full Documentation

See [SECURITY_MONITOR_REAL_DATA.md](./SECURITY_MONITOR_REAL_DATA.md) for:
- Complete implementation details
- API documentation
- Security considerations
- Performance optimization tips

---

## ✅ Success Checklist

- [ ] Environment variables configured
- [ ] Admin server restarted
- [ ] Frontend running
- [ ] Security Monitor shows real data
- [ ] Can save threshold changes
- [ ] No errors in browser console
- [ ] No errors in server logs

---

**Need Help?** Check the server logs or browser console for error messages.
