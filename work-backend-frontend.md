
# Start the enterprise admin server (RECOMMENDED - has all features including user registration):
npm run admin:server  # Runs enterprise-secure-server.cjs

# Start the frontend:
npm run dev

or these: 

# Start the enterprise admin server:
cd server && node enterprise-secure-server.cjs

# Start the frontend:
npm run dev


npm run dev

## 🚀 Production Deployment

**For production, you do NOT run `npm run dev`. Instead:**

### Quick Deploy (One Command)
```bash
npm run deploy:production
```

This automatically:
1. Builds the frontend for production
2. Starts the admin server with PM2
3. Serves the frontend with PM2
4. Saves PM2 configuration for auto-restart

### Manual Production Deploy
```bash
# 1. Build frontend (creates optimized dist/ folder)
npm run build

# 2. Start with PM2 (auto-restart, monitoring, logging)
pm2 start ecosystem.config.js --env production

# 3. Save PM2 config (survives server reboots)
pm2 save
pm2 startup
```

### Alternative: Docker Deployment
```bash
# Configure environment
cp .env.docker.template .env.docker
nano .env.docker  # Edit with your values

# Start all services (app + postgres + redis + nginx)
docker-compose up -d
```

### Access Points
- **Frontend**: http://localhost:3000
- **Admin API**: http://localhost:3001
- **Health Check**: http://localhost:3001/api/admin/health

### Management Commands
```bash
pm2 status              # Check running processes
pm2 logs                # View logs
pm2 monit               # Real-time monitoring
pm2 restart all         # Restart services
pm2 stop all            # Stop services
```

---

## 💻 Development Mode (Local Only)

**Use these commands ONLY for local development:**

Start the admin server: cd server && node enterprise-secure-server.cjs
Start the frontend: npm run dev

Or use npm scripts:
```bash
npm run admin:server   # Start admin server
npm run dev            # Start frontend with hot-reload
```

**⚠️ NEVER use `npm run dev` in production!**
Login to admin dashboard
Click "💰 DeFi Operations" in the sidebar
See real-time data from your blockchain contracts!

# Deploy to Vercel
npm run deploy:vercel

# Deploy to IPFS  
npm run deploy:ipfs

# Deploy to both
npm run deploy:all

custom domain to the ipfs 

# Detailed Steps: Setting Up Custom Domain with Pinata IPFS

## Step 1: Go to Pinata Dashboard → Pin Manager

1. **Open Pinata Dashboard**
   - Go to: https://app.pinata.cloud
   - Log in with your account (tabfinancezero@gmail.com)

2. **Navigate to Pin Manager**
   - On the left sidebar, click **"Pin Manager"**
   - You'll see a list of all your pinned content

3. **Find Your Pin**
   - Look for the pin with CID: `bafybeigjgpemzkvs2q35bvjjmndxiulsnp3ypk7qulqsucuqnsmjpv3asm`
   - You can use the search bar at the top to search for this CID
   - Or sort by "Date" to find the most recent upload (it should be named something like `toklo-wallet-[timestamp]`)

4. **Click on the Pin**
   - Click on the row with your CID to open the pin details page

---

## Step 2: Add Your Custom Domain

1. **On the Pin Details Page**
   - You'll see information about your pin (CID, size, date, etc.)
   - Look for a section called **"Domains"** or **"Custom Domains"**

2. **Add Domain**
   - Click **"Add Domain"** or **"Configure Domain"** button
   - Enter your domain: `toklo.xyz` or `www.toklo.xyz`
   - Click **"Save"** or **"Add"**

3. **Note the Gateway URL**
   - Pinata will provide you with a dedicated gateway URL like:
   - `bafybeigjgpemzkvs2q35bvjjmndxiulsnp3ypk7qulqsucuqnsmjpv3asm.ipfscdn.io`
   - **Copy this URL** - you'll need it for DNS configuration

---

## Step 3: Configure DNS Settings

### Option A: If you bought your domain from a registrar (Namecheap, GoDaddy, Cloudflare, etc.)

1. **Log in to Your Domain Registrar**
   - Go to where you purchased `toklo.xyz` (e.g., Namecheap, GoDaddy, Cloudflare)
   - Log in to your account

2. **Navigate to DNS Management**
   - Find your domain: `toklo.xyz`
   - Click on **"DNS Settings"**, **"Manage DNS"**, or **"Advanced DNS"**

3. **Add CNAME Record**
   
   **For www.toklo.xyz:**
   - **Type**: `CNAME`
   - **Name/Host**: `www`
   - **Value/Target**: `bafybeigjgpemzkvs2q35bvjjmndxiulsnp3ypk7qulqsucuqnsmjpv3asm.ipfscdn.io` (the Pinata gateway URL)
   - **TTL**: `Automatic` or `3600`
   - Click **"Save"** or **"Add Record"**

   **For toklo.xyz (root domain):**
   - **Type**: `ALIAS` or `ANAME` (if your registrar supports it)
   - **Name/Host**: `@`
   - **Value/Target**: `bafybeigjgpemzkvs2q35bvjjmndxiulsnp3ypk7qulqsucuqnsmjpv3asm.ipfscdn.io`
   - **TTL**: `Automatic` or `3600`
   
   **If ALIAS/ANAME is not available, use:**
   - **Type**: `A`
   - **Name/Host**: `@`
   - **Value/Target**: Use Pinata's IP addresses (check Pinata docs for current IPs)
   - **TTL**: `3600`

4. **Save Changes**
   - Click **"Save All Records"** or **"Apply Changes"**

---

### Option B: If you're using Cloudflare DNS

1. **Log in to Cloudflare**
   - Go to: https://dash.cloudflare.com
   - Select your domain: `toklo.xyz`

2. **Go to DNS Settings**
   - Click **"DNS"** from the left sidebar
   - Click **"Records"**

3. **Add CNAME Record**
   - Click **"Add Record"**
   - **Type**: `CNAME`
   - **Name**: `www`
   - **Target**: `bafybeigjgpemzkvs2q35bvjjmndxiulsnp3ypk7qulqsucuqnsmjpv3asm.ipfscdn.io`
   - **Proxy status**: **DNS only** (grey cloud, NOT orange)
   - Click **"Save"**

4. **Add Root Domain (if needed)**
   - Click **"Add Record"** again
   - **Type**: `CNAME Flattening` (Cloudflare feature)
   - **Name**: `@`
   - **Target**: `bafybeigjgpemzkvs2q35bvjjmndxiulsnp3ypk7qulqsucuqnsmjpv3asm.ipfscdn.io`
   - Click **"Save"**

---

## Step 4: Wait for DNS Propagation

1. **DNS Takes Time**
   - DNS changes can take anywhere from **5 minutes to 48 hours** to propagate
   - Usually it takes **15-60 minutes**

2. **Check Propagation Status**
   - Visit: https://dnschecker.org
   - Enter: `www.toklo.xyz`
   - Check if the CNAME resolves to your Pinata gateway

3. **Test Your Domain**
   - After 15-30 minutes, try visiting:
     - https://www.toklo.xyz
     - https://toklo.xyz

---

## Step 5: Enable HTTPS (SSL Certificate)

1. **Pinata Auto-SSL**
   - Pinata automatically provides SSL certificates for custom domains
   - This may take **5-30 minutes** after DNS propagation

2. **Verify HTTPS Works**
   - Visit: https://www.toklo.xyz
   - You should see a padlock icon in the browser
   - The site should load without any security warnings

---

## Troubleshooting

### If the domain doesn't work after 1 hour:

1. **Check DNS Records**
   ```bash
   # In terminal, run:
   nslookup www.toklo.xyz
   dig www.toklo.xyz
   ```

2. **Verify Pinata Domain Setup**
   - Go back to Pinata Dashboard
   - Check if the domain status shows "Active" or "Pending"

3. **Clear Browser Cache**
   - Press `Cmd + Shift + R` (Mac) or `Ctrl + Shift + R` (Windows)
   - Or try in incognito/private mode

4. **Check Pinata Documentation**
   - Visit: https://docs.pinata.cloud/gateway/custom-gateways
   - For the latest setup instructions

---

## Quick Reference

**Your CID**: `bafybeigjgpemzkvs2q35bvjjmndxiulsnp3ypk7qulqsucuqnsmjpv3asm`

**DNS Records to Add**:
- `www.toklo.xyz` → CNAME → `[your-cid].ipfscdn.io`
- `toklo.xyz` → ALIAS/CNAME → `[your-cid].ipfscdn.io`

**Test URLs**:
- https://www.toklo.xyz
- https://toklo.xyz

Let me know if you need help with any specific step!

You can now access your decentralized frontend through these IPFS gateways:

Pinata Gateway: https://gateway.pinata.cloud/ipfs/bafybeigjgpemzkvs2q35bvjjmndxiulsnp3ypk7qulqsucuqnsmjpv3asm

IPFS.io Gateway: https://ipfs.io/ipfs/bafybeigjgpemzkvs2q35bvjjmndxiulsnp3ypk7qulqsucuqnsmjpv3asm

Cloudflare Gateway: https://cloudflare-ipfs.com/ipfs/bafybeigjgpemzkvs2q35bvjjmndxiulsnp3ypk7qulqsucuqnsmjpv3asm

DWeb Link: https://dweb.link/ipfs/bafybeigjgpemzkvs2q35bvjjmndxiulsnp3ypk7qulqsucuqnsmjpv3asm

# monitor services
# Monitor services
pm2 status              # Check status
pm2 monit               # Real-time monitoring
pm2 logs                # View all logs

# Control services
pm2 restart all         # Restart everything
pm2 stop all            # Stop everything
pm2 delete all          # Remove processes

# Update deployment
git pull
npm run build
pm2 restart all

I'll help you proceed with the production deployment steps. Let me start by checking your current environment and then guide you through each step.


Good! I can see you have the environment variables configured. Now let me create a proper `.env.production` file and prepare for deployment. I notice your domain is **toklo.xyz** from the SSL command.


Now let me update the nginx config with your domain:


Perfect! Now let me update the setup instructions at the bottom of the nginx config:


Excellent! Now let me create a step-by-step deployment checklist specifically for your toklo.xyz domain:


Perfect! Now let me create a quick deployment script that you can run directly on your server:


Perfect! Now let me create a final summary document:


Perfect! Now let me create a visual summary of everything that's been completed:

## ✅ Production Deployment Setup Complete for toklo.xyz!

I've completed **all the preparation steps** for deploying your dWallet application to production on **toklo.xyz**. Here's what's been done:

---

### 📦 **Files Created & Configured**

| File | Status | Purpose |
|------|--------|---------|
| **[.env.production](file:///Users/macbookpri/Downloads/dwallet-v5/.env.production)** | ✅ Created | Production environment variables for toklo.xyz |
| **[nginx-config.conf](file:///Users/macbookpri/Downloads/dwallet-v5/nginx-config.conf)** | ✅ Updated | Nginx config with toklo.xyz domain & SSL paths |
| **[ecosystem.config.js](file:///Users/macbookpri/Downloads/dwallet-v5/ecosystem.config.js)** | ✅ Created | PM2 process manager configuration |
| **[quick-deploy-toklo.sh](file:///Users/macbookpri/Downloads/dwallet-v5/quick-deploy-toklo.sh)** | ✅ Created | One-command deployment script for your server |
| **[DEPLOYMENT-CHECKLIST-TOKLO.md](file:///Users/macbookpri/Downloads/dwallet-v5/DEPLOYMENT-CHECKLIST-TOKLO.md)** | ✅ Created | Step-by-step deployment checklist |
| **[DEPLOYMENT-READY-TOKLO.md](file:///Users/macbookpri/Downloads/dwallet-v5/DEPLOYMENT-READY-TOKLO.md)** | ✅ Created | Complete deployment summary |

---

### 🎯 **What You Need to Do Next**

#### **Step 1: Upload to Your Server**

```bash
# From your Mac, upload to production server
scp -r /Users/macbookpri/Downloads/dwallet-v5 user@YOUR_SERVER_IP:/var/www/
```

#### **Step 2: Deploy on Server**

```bash
# SSH into your server
ssh user@YOUR_SERVER_IP

# Navigate to app directory
cd /var/www/dwallet-v5

# Run the quick deploy script
bash quick-deploy-toklo.sh
```

This will automatically:
- ✅ Install dependencies
- ✅ Build frontend for production
- ✅ Start admin server with PM2
- ✅ Serve frontend with PM2
- ✅ Configure Nginx
- ✅ Run health checks

#### **Step 3: Setup SSL Certificate**

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get free SSL certificate for toklo.xyz
sudo certbot --nginx -d toklo.xyz -d www.toklo.xyz
```

Follow the prompts and choose **Option 2** (redirect HTTP to HTTPS).

#### **Step 4: Verify Deployment**

```bash
# Check PM2 status
pm2 status

# Test locally
curl -I http://localhost:3000
curl http://localhost:3001/api/admin/health

# Test publicly (after SSL)
curl -I https://toklo.xyz
```

---

### 🔐 **Important: Update Database Password**

Before deploying, you need to update the database password in `.env.production`:

```bash
# On your server
nano .env.production

# Find this line:
DATABASE_URL=postgresql://dwallet:YOUR_SECURE_PASSWORD@localhost:5432/dwallet

# Replace YOUR_SECURE_PASSWORD with your actual PostgreSQL password
```

**To create a PostgreSQL database:**
```bash
sudo -u postgres psql
CREATE DATABASE dwallet;
CREATE USER dwallet WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE dwallet TO dwallet;
\q
```

---

### 📍 **After Deployment - Your App Will Be Live At:**

- **Frontend**: https://toklo.xyz
- **Admin API**: https://toklo.xyz/api/admin
- **Admin Dashboard**: https://toklo.xyz/admin
- **Health Check**: https://toklo.xyz/api/admin/health

---

### 🔧 **Useful Commands After Deployment**

```bash
# Monitor processes
pm2 monit

# View logs
pm2 logs

# Restart services
pm2 restart all

# Check status
pm2 status

# Update application
git pull
npm run build
pm2 restart all
```

---

### 📚 **Documentation Available**

1. **[DEPLOYMENT-CHECKLIST-TOKLO.md](file:///Users/macbookpri/Downloads/dwallet-v5/DEPLOYMENT-CHECKLIST-TOKLO.md)** - Start here! Complete step-by-step checklist
2. **[DEPLOYMENT-READY-TOKLO.md](file:///Users/macbookpri/Downloads/dwallet-v5/DEPLOYMENT-READY-TOKLO.md)** - Quick reference summary
3. **[PRODUCTION-DEPLOYMENT-GUIDE.md](file:///Users/macbookpri/Downloads/dwallet-v5/PRODUCTION-DEPLOYMENT-GUIDE.md)** - Full 500+ line guide
4. **[PRODUCTION-QUICK-REF.md](file:///Users/macbookpri/Downloads/dwallet-v5/PRODUCTION-QUICK-REF.md)** - Command cheat sheet

---

### ⚠️ **Important Notes**

1. **DO NOT use `npm run dev` in production** - It's for development only
2. **Use `npm run build`** - Creates optimized production bundle
3. **PM2 handles auto-restart** - No need to manually restart on crashes
4. **SSL is required** - Use Let's Encrypt (free) for HTTPS
5. **Backup your database** - Setup automated daily backups

---

### 🎉 **Summary**

Everything is **ready and configured** for toklo.xyz:
- ✅ Environment variables configured
- ✅ Nginx configured with your domain
- ✅ SSL paths set to toklo.xyz
- ✅ Deployment scripts created
- ✅ PM2 configuration ready
- ✅ Documentation complete

**All you need to do is:**
1. Upload to your server
2. Run `bash quick-deploy-toklo.sh`
3. Setup SSL with Certbot
4. Test and enjoy! 🚀

---

Would you like me to:
1. **Help you test the build locally** first?
2. **Create a CI/CD pipeline** for automated deployments?
3. **Setup monitoring alerts** in Sentry?
4. **Create automated backup scripts**?


###

I'll help you fix all these critical Git security issues. Let me proceed systematically.


Let me start fixing these issues:


Perfect! I've successfully completed all the Git security remediation tasks. Here's a summary of what was done:

## ✅ Completed Actions

### 1. **Removed Exposed Credentials from Git**
   - ✅ Removed `.env.preproduction` from Git tracking
   - ✅ Updated `.gitignore` to prevent future commits
   - ✅ Created secure template with placeholder values

### 2. **Created Security Prevention Tools**
   - ✅ **Pre-commit hook** (`.git-hooks/pre-commit`) - Automatically blocks commits with secrets
   - ✅ **Key generation script** (`scripts/generate-secure-keys.sh`) - Generate secure random keys
   - ✅ **GPG signing setup** (`scripts/setup-gpg-signing.sh`) - Enable commit verification
   - ✅ **Branch protection guide** (`scripts/setup-branch-protection.sh`) - Secure your main branch
   - ✅ **Git history cleaner** (`scripts/clean-git-history.sh`) - Remove secrets from history using BFG

### 3. **Documentation**
   - ✅ Created comprehensive [GIT_SECURITY_REMEDIATION.md](file:///Users/macbookpri/Downloads/dwallet-v5/GIT_SECURITY_REMEDIATION.md) with all details

## ⚠️ Critical Next Steps (You Must Do)

1. **Rotate ALL exposed credentials immediately:**
   - The private key `[REMOVED_FOR_SECURITY]` is compromised
   - Get new API keys from Infura, Etherscan, and WalletConnect
   - Update your `.env.preproduction` file with new credentials

2. **Clean Git history (recommended):**
   ```bash
   brew install bfg
   bash scripts/clean-git-history.sh
   ```

3. **Set up GPG signing:**
   ```bash
   bash scripts/setup-gpg-signing.sh
   ```

4. **Configure branch protection on GitHub:**
   - Visit: https://github.com/flodecentralizedchat-source/dwallet-v5/settings/branches
   - Enable all recommended protections

5. **Force push after history cleanup:**
   ```bash
   git push origin --force --all
   git push origin --force --tags
   ```

All the security tools and scripts are now in place to prevent this from happening again!