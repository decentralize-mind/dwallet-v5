# 🚀 How to Run the Anomaly Detection System

## ⚡ Quick Start (Choose One Method)

### **Method 1: Interactive Script (Recommended for First Time)**

```bash
# Make script executable (one-time)
chmod +x run-anomaly-detection.sh

# Run the interactive setup
./run-anomaly-detection.sh
```

The script will guide you through:
1. ✅ Checking your environment
2. ✅ Starting local Hardhat node
3. ✅ Deploying all contracts
4. ✅ Running the monitoring bot

---

### **Method 2: Manual Step-by-Step**

#### **Step 1: Start Local Blockchain**
```bash
npm run node
```
Keep this terminal running - it's your local blockchain.

#### **Step 2: Deploy Contracts (New Terminal)**
```bash
node scripts/deploy-anomaly-detection.js --network localhost
```

Wait for deployment to complete and note the contract addresses.

#### **Step 3: Configure Environment**
Copy the deployed addresses to your `.env`:

```bash
# Copy from deployed-addresses.json
cat deployed-addresses.json

# Edit .env and add:
ANOMALY_DETECTOR_ADDRESS=0x...
LAYER7_SECURITY_ADDRESS=0x...
DWT_TOKEN_ADDRESS=0x...
MONITOR_PRIVATE_KEY=your_key_here
```

#### **Step 4: Run Monitoring Bot**
```bash
node monitoring/anomaly-detector.js
```

---

### **Method 3: Using NPM Scripts**

Add these to your `package.json` (already done):

```json
{
  "scripts": {
    "deploy:anomaly": "node scripts/deploy-anomaly-detection.js --network localhost",
    "monitor": "node monitoring/anomaly-detector.js"
  }
}
```

Then run:

```bash
# Deploy contracts
npm run deploy:anomaly

# Run monitoring
npm run monitor
```

---

## 📋 What You'll See

### During Deployment:
```
🚀 Deploying Anomaly Detection System...

Deploying with account: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
Account balance: 10000.0 ETH

📦 Deploying AnomalyDetector...
✅ AnomalyDetector deployed to: 0x5FbDB2315678afecb367f032d93F642f64180aa3

📦 Deploying DynamicFeeController...
✅ DynamicFeeController deployed to: 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512

📦 Deploying Layer7Security...
✅ Layer7Security deployed to: 0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0

⚙️ Configuring integration...
✅ Anomaly detector set in Layer7Security
✅ Anomaly detection ENABLED
✅ Auto-pause on CRITICAL enabled

═══════════════════════════════════════════════════
🎉 DEPLOYMENT COMPLETE!
═══════════════════════════════════════════════════
```

### During Monitoring:
```
╔═══════════════════════════════════════════════════╗
║   🔍 dWallet Anomaly Detection Monitoring Service║
╚═══════════════════════════════════════════════════╝

🚀 Initializing Anomaly Monitoring Service...
📡 Connected to: http://127.0.0.1:8545
👛 Monitor Address: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
✅ Contracts initialized successfully

📡 Setting up event listeners...
🔍 Starting real-time monitoring...

📊 Block 123: Volume=1500.5, Txs=25
📊 Block 124: Volume=2300.75, Txs=31
⚠️ Large Transfer: 150000.0 DWT from 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
🐋 WHALE ALERT: 500000.0 DWT transferred
```

---

## 🎯 Testing Scenarios

### Test 1: Normal Transaction
```javascript
// In Hardhat console or another terminal
const ethers = require("ethers");
const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");

// Send normal transaction (should NOT trigger alerts)
console.log("Sending normal transaction...");
// Expected: No alerts, threat level NONE
```

### Test 2: Volume Spike Attack
```javascript
// Send huge amount (should trigger MEDIUM/HIGH alert)
console.log("Testing volume spike detection...");
// Expected: Alert sent, fees increase
```

### Test 3: Check Contract State
```javascript
// Check current threat level
const threatLevel = await anomalyDetector.getCurrentBlockUsage();
console.log("Current block usage:", threatLevel);
```

---

## ⚙️ Configuration Options

### Adjust Sensitivity

Edit `.env`:

```bash
# More sensitive (catch more attacks, more false positives)
THREAT_VOLUME_SPIKE=3.0        # 3x instead of 5x
THREAT_TX_COUNT_SPIKE=2.0      # 2x instead of 3x
THREAT_WHALE_ACTIVITY=50000    # $50k instead of $100k

# Less sensitive (fewer false positives)
THREAT_VOLUME_SPIKE=10.0       # 10x normal volume
THREAT_TX_COUNT_SPIKE=5.0      # 5x normal tx count
```

### Enable/Disable Features

In `monitoring/anomaly-detector.js`, modify CONFIG:

```javascript
CONFIG = {
  // ... other config
  
  // Disable auto-pause (monitoring only mode)
  AUTO_PAUSE_ENABLED: false,
  
  // Change check interval (default: 5 seconds)
  CHECK_INTERVAL_MS: 10000,  // Check every 10 seconds
  
  // Disable specific alerts
  ALERTS: {
    TELEGRAM: true,
    DISCORD: true,
    SMS: false
  }
}
```

---

## 🐛 Troubleshooting

### Issue: "Cannot find module 'ethers'"
**Solution:**
```bash
npm install
```

### Issue: "Connection refused to localhost:8545"
**Solution:**
Make sure Hardhat node is running:
```bash
npm run node
```

### Issue: "No accounts found"
**Solution:**
Check your private key in `.env`. For local testing, use:
```
MONITOR_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

### Issue: "Contract not deployed" error
**Solution:**
Deploy contracts first:
```bash
node scripts/deploy-anomaly-detection.js --network localhost
```

### Issue: Monitoring bot exits immediately
**Solution:**
1. Check that all contract addresses are set in `.env`
2. Verify RPC_URL is correct
3. Ensure MONITOR_PRIVATE_KEY is valid

---

## 📊 What's Running?

When everything is active, you have:

1. **Hardhat Node** (Terminal 1)
   - Local Ethereum blockchain
   - Listening on http://127.0.0.1:8545
   
2. **Monitoring Bot** (Terminal 2)
   - Watching blockchain events
   - Detecting anomalies in real-time
   - Sending alerts when threats detected

---

## 🎉 Success Indicators

You know it's working when you see:

✅ Green checkmarks during deployment  
✅ "DEPLOYMENT COMPLETE!" message  
✅ Monitoring bot shows "Starting real-time monitoring..."  
✅ Regular block updates in monitoring logs  
✅ Contract addresses saved to `deployed-addresses.json`

---

## 📝 Next Steps After Setup

1. **Test with mock transactions** - Use Hardhat console
2. **Adjust thresholds** - Based on your traffic patterns
3. **Set up alerts** - Configure Telegram/Discord
4. **Deploy to testnet** - Sepolia or Base Goerli
5. **Run for 1 week** - Collect baseline data
6. **Fine-tune** - Adjust sensitivity based on real data
7. **Production deployment** - Mainnet rollout

---

## 💡 Pro Tips

- **Development**: Keep Hardhat node running in background
- **Testing**: Use `--show-stack-traces` flag for debugging
- **Gas costs**: Monitor gas with `REPORT_GAS=true npm test`
- **Logs**: Save logs with `node monitoring/anomaly-detector.js > monitor.log 2>&1`

---

**Need Help?**
- Full docs: `ANOMALY_DETECTION_IMPLEMENTATION.md`
- Quick reference: `ANOMALY_DETECTION_QUICKSTART.md`
- Test examples: `test/security/AnomalyDetection.test.cjs`
