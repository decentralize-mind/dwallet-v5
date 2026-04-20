# 🔧 "API Offline" - Quick Fix Guide

## ❌ Problem

When you visit http://localhost:5173/admin, you see:
```
Admin Access Required
Secure authentication via backend server

❌ API Offline  ← This is the problem!
```

---

## ✅ Solution

### The Issue:
The **backend server stopped running**. The frontend (React app) is running, but it can't connect to the backend API.

### The Fix:

**Option 1: Quick Start (Recommended)**
```bash
cd /Users/macbookpri/Downloads/dwallet-v5
./start-admin.sh
```

This will:
- ✅ Start PostgreSQL (if not running)
- ✅ Start backend server (port 3001)
- ✅ Start frontend server (port 5173)
- ✅ Verify everything is working

---

**Option 2: Manual Start**

```bash
# Step 1: Start Backend
cd /Users/macbookpri/Downloads/dwallet-v5
node server/enterprise-secure-server.cjs

# Wait for:
# ╔═══════════════════════════════════════════════════════╗
# ║   🔐🛡️ ENTERPRISECURE Admin Backend v3.0.0         ║
# ╚═══════════════════════════════════════════════════════╝

# Step 2: Open NEW terminal and start Frontend
cd /Users/macbookpri/Downloads/dwallet-v5
npm run dev

# Step 3: Access admin
# Open: http://localhost:5173/admin
```

---

## 📊 Check Status

To check if everything is running:

```bash
cd /Users/macbookpri/Downloads/dwallet-v5
./check-admin-status.sh
```

**Good output:**
```
📊 PostgreSQL: ✅ Running
🔐 Backend (port 3001): ✅ Running
🎨 Frontend (port 5173): ✅ Running
🔑 Admin Key configured: ✅ Yes (64 chars)
🗄️  Database (dwallet_admin): ✅ Connected (6 tables)

✅ ALL SYSTEMS OPERATIONAL
```

**Bad output:**
```
🔐 Backend (port 3001): ❌ Not Running
   Fix: node server/enterprise-secure-server.cjs
```

---

## 🔍 Why Did Backend Stop?

Common reasons:

1. **Terminal was closed**
   - Backend runs in terminal
   - Closing terminal stops the server

2. **Ctrl+C was pressed**
   - Stops the running process

3. **Computer restarted**
   - Servers don't auto-start

4. **Error occurred**
   - Check terminal for error messages

---

## 💡 Best Practices

### Always Use Two Terminals

**Terminal 1 - Backend:**
```bash
cd /Users/macbookpri/Downloads/dwallet-v5
node server/enterprise-secure-server.cjs
```
Keep this running! Don't close this terminal.

**Terminal 2 - Frontend:**
```bash
cd /Users/macbookpri/Downloads/dwallet-v5
npm run dev
```
Keep this running too!

---

### Or Use the Start Script

```bash
./start-admin.sh
```

This starts both in one command!

---

## 🚀 Quick Commands

| Action | Command |
|--------|---------|
| **Start everything** | `./start-admin.sh` |
| **Check status** | `./check-admin-status.sh` |
| **Stop everything** | `pkill -f "enterprise-secure-server.cjs" && pkill -f "vite"` |
| **Restart backend** | `pkill -f "enterprise-secure-server.cjs" && node server/enterprise-secure-server.cjs` |
| **Restart frontend** | `pkill -f "vite" && npm run dev` |

---

## 🔐 Current Setup

```
Backend:  http://localhost:3001 ✅
Frontend: http://localhost:5173 ✅
Admin:    http://localhost:5173/admin ✅
Database: PostgreSQL (dwallet_admin) ✅
```

**Admin Key:**
```
4426de8cded7656fc186228298104e293b7e338bee9ea680058515983abf1987
```

---

## ✅ Verify It's Working

After starting the servers, visit:

1. **Backend Health:** http://localhost:3001/api/admin/health
   - Should show: `{"status":"healthy",...}`

2. **Frontend:** http://localhost:5173
   - Should show: dWallet homepage

3. **Admin Dashboard:** http://localhost:5173/admin
   - Should show: `✅ API Connected` (not "API Offline"!)

---

## 🆘 Still Not Working?

### Check Terminal Output

Look for errors like:
```
Error: listen EADDRINUSE: address already in use :::3001
```

**Fix:** Kill the old process first
```bash
pkill -f "enterprise-secure-server.cjs"
```

### Check PostgreSQL

```bash
pg_isready
```

If not running:
```bash
brew services start postgresql
```

### Check Ports

```bash
# Check if port 3001 is in use
lsof -i :3001

# Check if port 5173 is in use
lsof -i :5173
```

---

## 📝 Summary

**When you see "❌ API Offline":**

1. Run: `./check-admin-status.sh`
2. See what's not running
3. Run: `./start-admin.sh`
4. Refresh browser
5. Should now show "✅ API Connected"

**Done!** 🎉
