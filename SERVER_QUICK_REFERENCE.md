# Admin Server Quick Reference

## 🚀 Start/Stop Commands

### **Start Server**
```bash
cd /Users/macbookpri/Downloads/dwallet-v5
nohup node server/enterprise-secure-server.cjs > logs/admin-server.log 2>&1 &
```

### **Check if Running**
```bash
ps aux | grep "enterprise-secure-server" | grep -v grep
```

### **Check Port**
```bash
lsof -i :3001 | grep LISTEN
```

### **Test Health**
```bash
curl http://localhost:3001/api/admin/health
```

### **View Logs**
```bash
tail -f logs/admin-server.log
```

### **Stop Server**
```bash
# Find the process ID (PID)
ps aux | grep "enterprise-secure-server" | grep -v grep

# Kill the process (replace PID with actual number)
kill <PID>
```

---

## 🔍 Troubleshooting

### **Error: ECONNREFUSED**
**Problem:** Frontend can't connect to admin server  
**Solution:** Server is not running - restart it using the command above

### **Error: Port already in use**
**Problem:** Another process is using port 3001  
**Solution:** 
```bash
# Find what's using port 3001
lsof -i :3001

# Kill it
kill -9 <PID>

# Restart server
nohup node server/enterprise-secure-server.cjs > logs/admin-server.log 2>&1 &
```

### **Server starts but immediately stops**
**Problem:** Missing environment variables or database connection issue  
**Solution:**
```bash
# Check logs for error
cat logs/admin-server.log | tail -50

# Common issues:
# - DATABASE_URL not set
# - ADMIN_SECRET_KEY not set
# - JWT_SECRET not set
# - ADMIN_WALLETS not set
```

---

## 📊 Server Status Indicators

### **✅ Healthy Response**
```json
{
  "status": "healthy",
  "version": "3.0.0-ENTERPRISE",
  "environment": "development"
}
```

### **Required Services**
- ✅ PostgreSQL: Connected
- ✅ Redis: Connected
- ✅ WebSocket: Enabled
- ✅ Port 3001: Listening

---

## 🎯 Quick Health Check Script

Save this as `check-server.sh`:

```bash
#!/bin/bash
echo "🔍 Admin Server Health Check"
echo "============================"
echo ""

# Check if process is running
if ps aux | grep "enterprise-secure-server" | grep -v grep > /dev/null; then
    echo "✅ Process: Running"
else
    echo "❌ Process: NOT Running"
    echo "   Start with: nohup node server/enterprise-secure-server.cjs > logs/admin-server.log 2>&1 &"
    exit 1
fi

# Check port
if lsof -i :3001 | grep LISTEN > /dev/null; then
    echo "✅ Port 3001: Listening"
else
    echo "❌ Port 3001: NOT Listening"
    exit 1
fi

# Test health endpoint
HEALTH=$(curl -s http://localhost:3001/api/admin/health)
if echo $HEALTH | grep -q "healthy"; then
    echo "✅ Health Endpoint: OK"
    echo "   Status: $(echo $HEALTH | grep -o '"status":"[^"]*"' | cut -d'\"' -f4)"
else
    echo "❌ Health Endpoint: FAILED"
    exit 1
fi

echo ""
echo "🎉 All checks passed!"
```

Make it executable:
```bash
chmod +x check-server.sh
```

Run it:
```bash
./check-server.sh
```

---

## 📝 Common Issues After System Restart

If you restart your computer, the server will stop. To restart:

```bash
cd /Users/macbookpri/Downloads/dwallet-v5
nohup node server/enterprise-secure-server.cjs > logs/admin-server.log 2>&1 &
```

Then verify:
```bash
./check-server.sh
```

---

## 🔐 Environment Variables Required

These must be set in `.env`:
- `DATABASE_URL` - PostgreSQL connection
- `ADMIN_SECRET_KEY` - Admin authentication
- `JWT_SECRET` - JWT token signing
- `ADMIN_WALLETS` - Allowed admin wallet addresses
- `ADMIN_PRIVATE_KEY` - For blockchain transactions
- `REDIS_URL` - Redis cache (optional but recommended)

---

## 📞 If All Else Fails

1. **Check logs:**
   ```bash
   cat logs/admin-server.log
   ```

2. **Restart PostgreSQL:**
   ```bash
   brew services restart postgresql
   ```

3. **Restart Redis:**
   ```bash
   brew services restart redis
   ```

4. **Restart server:**
   ```bash
   # Kill existing
   pkill -f "enterprise-secure-server"
   
   # Start fresh
   nohup node server/enterprise-secure-server.cjs > logs/admin-server.log 2>&1 &
   ```

5. **Check frontend:**
   ```bash
   # Frontend should be running on port 5173
   # Restart if needed:
   npm run dev
   ```
