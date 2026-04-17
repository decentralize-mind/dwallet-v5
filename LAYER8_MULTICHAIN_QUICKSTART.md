# 🚀 Layer 8 Multi-Chain Deployment - Quick Start Guide

**Date:** April 17, 2026  
**Current Status:** ✅ Base Sepolia Deployed | 🔄 Awaiting Faucet Funds

---

## ⚡ Quick Start (3 Steps)

### Step 1: Get Faucet Funds (5 minutes)

Visit these URLs and request testnet ETH for: **`0x4C0B7314441dfE8E61267C0d87Fc1A657611dCf5`**

#### Arbitrum Sepolia (Need ~1.5 ETH)
- 🔗 **QuickNode:** https://faucet.quicknode.com/arbitrum/sepolia
- 🔗 **Alchemy:** https://www.alchemy.com/faucets/arbitrum-sepolia
- 🔗 **Google Cloud:** https://cloud.google.com/application/web3/faucet/ethereum/arbitrum-sepolia

#### Polygon Amoy (Need ~1.5 ETH)
- 🔗 **Official:** https://faucet.polygon.technology/
- 🔗 **Alchemy:** https://www.alchemy.com/faucets/polygon-amoy
- 🔗 **Google Cloud:** https://cloud.google.com/application/web3/faucet/ethereum/polygon-amoy

**⏱️ Wait Time:** 1-5 minutes per chain

---

### Step 2: Deploy to Both Chains (10 minutes)

```bash
# Deploy to Arbitrum Sepolia
npx hardhat run scripts/deploy-layer8.cjs --network arbitrumSepolia

# Deploy to Polygon Amoy  
npx hardhat run scripts/deploy-layer8.cjs --network polygonAmoy
```

**Save the output addresses!** You'll need them for Step 3.

---

### Step 3: Setup Cross-Chain Communication (5 minutes)

After both deployments complete, you'll have 3 bridge addresses:
- Base Sepolia: `0x778bf751DE7D18A3ff683d9d644EA686146f726f` ✅
- Arbitrum Sepolia: `[FROM STEP 2]` ⏳
- Polygon Amoy: `[FROM STEP 2]` ⏳

Then run the trusted remotes setup script (to be created with actual addresses).

---

## 📊 Current Deployment Status

| Network | Chain ID | Status | Bridge Address |
|---------|----------|--------|----------------|
| **Base Sepolia** | 84532 | ✅ Deployed | `0x778bf751DE7D18A3ff683d9d644EA686146f726f` |
| **Arbitrum Sepolia** | 421614 | ⏳ Awaiting funds | - |
| **Polygon Amoy** | 80002 | ⏳ Awaiting funds | - |

---

## 🎯 What Happens After Deployment

### Automatic Setup:
1. ✅ Contracts deployed on each chain
2. ✅ Layer 7 security integration active
3. ✅ Governance timelock enabled (48 hours)
4. ✅ Execution delay active (12 hours)

### Manual Setup Required:
1. ⏳ Set trusted remotes between all chain pairs
2. ⏳ Register 7-15 relayers (1 ETH stake each)
3. ⏳ Configure LayerZero/Axelar endpoints
4. ⏳ Test cross-chain messaging

---

## 📋 Detailed Deployment Checklist

### Pre-Deployment:
- [ ] Get Arbitrum Sepolia faucet funds (1.5 ETH)
- [ ] Get Polygon Amoy faucet funds (1.5 ETH)
- [ ] Verify balances on both chains

### Deployment:
- [ ] Run deployment on Arbitrum Sepolia
- [ ] Run deployment on Polygon Amoy
- [ ] Save all contract addresses
- [ ] Verify deployments with test script

### Post-Deployment:
- [ ] Set trusted remotes (Base ↔ Arbitrum)
- [ ] Set trusted remotes (Base ↔ Polygon)
- [ ] Set trusted remotes (Arbitrum ↔ Polygon)
- [ ] Register relayer #1 (1 ETH stake)
- [ ] Register relayer #2 (1 ETH stake)
- [ ] Register relayer #3 (1 ETH stake)
- [ ] ... (up to 15 relayers)
- [ ] Test cross-chain message
- [ ] Verify message execution after 12-hour delay

---

## 🔧 Useful Commands

### Check Balances:
```bash
# Arbitrum Sepolia
cast balance 0x4C0B7314441dfE8E61267C0d87Fc1A657611dCf5 \
  --rpc-url https://sepolia-rollup.arbitrum.io/rpc

# Polygon Amoy
cast balance 0x4C0B7314441dfE8E61267C0d87Fc1A657611dCf5 \
  --rpc-url https://rpc-amoy.polygon.technology
```

### Deploy:
```bash
npx hardhat run scripts/deploy-layer8.cjs --network arbitrumSepolia
npx hardhat run scripts/deploy-layer8.cjs --network polygonAmoy
```

### Verify Deployment:
```bash
npx hardhat run scripts/verify-layer8-deployment.cjs --network arbitrumSepolia
npx hardhat run scripts/verify-layer8-deployment.cjs --network polygonAmoy
```

### Register Relayer:
```bash
npx hardhat run scripts/relayer-self-register.cjs --network baseSepolia
```

---

## 🌉 Cross-Chain Architecture

```
Base Sepolia (84532)
    ↑↓
    ├──→ Arbitrum Sepolia (421614)
    │       ↑↓
    │       └──→ Polygon Amoy (80002)
    ↑↓
    └──→ Polygon Amoy (80002)
```

**Trusted Remotes Needed:**
- Base ↔ Arbitrum (bidirectional)
- Base ↔ Polygon (bidirectional)
- Arbitrum ↔ Polygon (bidirectional)

**Total:** 6 trusted remote connections

---

## 💰 Cost Breakdown

### Deployment Costs (per chain):
- Gas for deployment: ~0.01 ETH
- Contract verification: Free (or minimal gas)
- **Total per chain: ~0.01 ETH**

### Relayer Costs (per relayer):
- Stake required: 1 ETH (refundable)
- Gas for registration: ~0.001 ETH
- **Total per relayer: 1.001 ETH**

### Testing Costs:
- Cross-chain messages: ~0.001 ETH per message
- **Recommended buffer: 0.1 ETH**

### **Total Budget:**
- Deployment (2 chains): 0.02 ETH
- Relayers (7 minimum): 7 ETH
- Testing buffer: 0.1 ETH
- **Grand Total: ~7.12 ETH** (across both chains)

---

## 🚨 Common Issues & Solutions

### Issue: "insufficient funds for gas"
**Solution:** Get more faucet funds (see Step 1)

### Issue: "nonce too low" or "nonce too high"
**Solution:** Wait for previous transactions to confirm, or restart deployment

### Issue: "trusted remote not set"
**Solution:** Ensure bidirectional trusted remotes are configured on both chains

### Issue: "insufficient signatures"
**Solution:** Wait for at least 7 relayers to sign the message

---

## 📞 Support Resources

- **LayerZero Docs:** https://layerzero.gitbook.io/docs/
- **Axelar Docs:** https://docs.axelar.dev/
- **Base Sepolia Explorer:** https://sepolia.basescan.org
- **Arbitrum Sepolia Explorer:** https://sepolia.arbiscan.io
- **Polygon Amoy Explorer:** https://amoy.polygonscan.com

---

## ✅ Success Criteria

You'll know everything is working when:

1. ✅ All 3 chains have Layer 8 deployed
2. ✅ Trusted remotes set between all chain pairs
3. ✅ At least 7 relayers registered
4. ✅ Test message sent from Chain A → Chain B
5. ✅ Message executed after 12-hour delay
6. ✅ Tokens successfully bridged

---

## 🎉 After Completion

Once multi-chain setup is complete:

1. Monitor relayer performance
2. Set up alerting for failed messages
3. Consider deploying to mainnet chains
4. Launch bug bounty program
5. Document lessons learned

---

**Last Updated:** April 17, 2026  
**Next Action:** Get faucet funds and run deployment scripts!
