# Smart Contract Storage & Deployment Guide

> Understanding where your code lives and what needs to be stored where
> Created: 2026-04-20

---

## 📦 STORAGE ARCHITECTURE OVERVIEW

Your dWallet project has **3 different storage layers**:

```
┌─────────────────────────────────────────────────────────┐
│  LAYER 1: FRONTEND (User Interface)                     │
│  Storage: IPFS ✅                                       │
│  Status: Already deployed                               │
│  URL: https://ipfs.io/ipfs/bafybeicm...                 │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  LAYER 2: SMART CONTRACTS (Business Logic)              │
│  Storage: Base Blockchain ✅                            │
│  Status: Deployed on Base Sepolia (testnet)             │
│  Need: Deploy to Base Mainnet                           │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  LAYER 3: CONTRACT METADATA (Documentation)             │
│  Storage: IPFS + GitHub (Optional)                      │
│  Status: Not done yet                                   │
│  Purpose: Verification, transparency, audit             │
└─────────────────────────────────────────────────────────┘
```

---

## ✅ LAYER 1: FRONTEND (ALREADY ON IPFS)

### What's Stored:
- HTML files
- CSS stylesheets
- JavaScript code (React components)
- Images and assets
- Configuration files

### Your Current IPFS Deployment:
```
Primary: https://ipfs.io/ipfs/bafybeicmhmthzgn6r3nvwtvd3mjt3vzwwzmyyujmjcn4jvczlwli7zrc4m
Backup:  https://bafybeicmhmthzgn6r3nvwtvd3mjt3vzwwzmyyujmjcn4jvczlwli7zrc4m.ipfs.dweb.link
```

### Status: ✅ COMPLETE
Your frontend is properly decentralized and accessible!

---

## ✅ LAYER 2: SMART CONTRACTS (ON BLOCKCHAIN)

### What's Stored:
- Smart contract bytecode (compiled code)
- Contract state variables
- Transaction history
- Event logs

### Why NOT on IPFS:
Smart contracts are **ALREADY STORED** on the blockchain:
- ✅ **Permanent** - Can't be deleted
- ✅ **Decentralized** - Stored on all Base nodes
- ✅ **Executable** - Can be called directly
- ✅ **Verified** - Auditable on BaseScan
- ✅ **Accessible** - Anyone can interact

### Your Deployed Contracts:

#### **Testnet (Base Sepolia) - Currently Deployed:**

From `deployments/fee-router-baseSepolia-1776353483324.json`:
```json
{
  "network": "baseSepolia",
  "chainId": 84532,
  "contracts": {
    "feeRouter": "0xd23f3d7fF87c1DC27178D34Ee30ffc6B17bb658d",
    "governanceToken": "0x3400b0167dA5b2dba0b88b9604eE7df4BFc1f1fa",
    "securityController": "0x40A41c2C4E8766b57Ce223b4D50105c5EA11C76D"
  }
}
```

From `deployment-layer9-baseSepolia-1776320755825.json`:
```json
{
  "contracts": {
    "security": "0x813b537A21bF5AC6967E870db47Ec2770651B11F",
    "lockEngine": "0x059327A069Ba66A74ecF21fde8c1c0D2915e0DB3",
    "access": "0xD2211242548115134607638E19ADb3271B31506b",
    "lending": "0xcbBc5E87BDdbD6350e51A2A594A7D7Ec29",
    "nft": "0x74297Fa47E6103148D3A4119d7B00C6a94B927D7",
    "swapRouter": "0x2a4b239C15f54218a30116c630a32d9305859a43",
    "feeRouter": "0x6552d7c4628e9e71c2E3cBEaB9f17CF67Bee1D89",
    "stablecoin": "0x83852A1C0A6C13fa8aCD950e51A2A594A7D7Ec29"
  }
}
```

### Status: ⚠️ TESTNET ONLY
Your contracts are deployed on **Base Sepolia (testnet)** but **NOT on Base Mainnet** yet.

---

## 📋 LAYER 3: CONTRACT METADATA (OPTIONAL BUT RECOMMENDED)

### What Can Be Stored on IPFS:

While smart contracts themselves don't need IPFS storage, you **CAN** store these on IPFS for transparency:

#### 1. **Source Code** (For Verification)
- Original Solidity files
- For audit purposes
- Community transparency

#### 2. **ABI Files** (Application Binary Interface)
- Contract interface definitions
- Used by frontend to interact with contracts
- Already in your code, but can backup to IPFS

#### 3. **Deployment Documentation**
- Deployment addresses
- Configuration details
- Audit reports

#### 4. **NFT Metadata** (If applicable)
- NFT images
- NFT attributes
- Collection information

---

## 🎯 WHAT YOU NEED TO DO NEXT

### Priority 1: Deploy Contracts to Base Mainnet

**Your contracts are on testnet. You need them on mainnet to earn real revenue!**

#### Step 1: Prepare Mainnet Deployment

**Update `.env` file:**
```env
# Base Mainnet Configuration
BASE_RPC_URL=https://mainnet.base.org
PRIVATE_KEY=your_mainnet_wallet_private_key
BASESCAN_API_KEY=your_basescan_api_key
```

#### Step 2: Deploy Each Contract

**FeeRouter (Swap Fees):**
```bash
npx hardhat run scripts/deploy-fee-router.cjs --network base
```

**Expected Output:**
```
🚀 Deploying FeeRouter to Base Mainnet...
✅ FeeRouter deployed to: 0xYourMainnetAddress
✅ Transaction: 0xYourTxHash
```

**NFT Memberships:**
```bash
npx hardhat run scripts/deploy-nft-membership.cjs --network base
```

**Launchpad:**
```bash
npx hardhat run scripts/deploy-launchpad.cjs --network base
```

#### Step 3: Verify on BaseScan

```bash
npx hardhat verify --network base \
  --contract contracts/layer9/FeeRouter.sol:FeeRouter \
  YOUR_DEPLOYED_ADDRESS \
  OTHER_PARAMETERS
```

#### Step 4: Update Frontend

**Update contract addresses in your frontend:**

File: `src/data/contracts.js` (or similar)
```javascript
export const CONTRACT_ADDRESSES = {
  // OLD - Testnet
  // feeRouter: '0xd23f3d7fF87c1DC27178D34Ee30ffc6B17bb658d',
  
  // NEW - Mainnet
  feeRouter: '0xYourMainnetFeeRouterAddress',
  nftMembership: '0xYourMainnetNFTAddress',
  launchpad: '0xYourMainnetLaunchpadAddress',
  // ... etc
}
```

#### Step 5: Rebuild and Redeploy Frontend

```bash
npm run build
npm run deploy:preproduction
# or
vercel --prod --prebuilt
```

---

## 📚 OPTIONAL: Store Contract Documentation on IPFS

If you want to store contract metadata on IPFS for transparency:

### Option 1: Store Deployment Records

**Create deployment summary:**
```json
{
  "project": "dWallet",
  "network": "Base Mainnet",
  "deployedAt": "2026-04-20",
  "contracts": {
    "feeRouter": {
      "address": "0x...",
      "purpose": "Collect swap fees (0.30%)",
      "sourceCode": "contracts/layer9/FeeRouter.sol",
      "verified": true,
      "baseScan": "https://basescan.org/address/0x..."
    },
    "nftMembership": {
      "address": "0x...",
      "purpose": "Lifetime membership NFTs",
      "tiers": ["Bronze", "Silver", "Gold", "Platinum"]
    }
  }
}
```

**Upload to IPFS:**
```bash
# Using Pinata
curl -X POST "https://api.pinata.cloud/pinning/pinJSONToIPFS" \
  -H "pinata_api_key: YOUR_KEY" \
  -H "pinata_secret_api_key: YOUR_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"pinataMetadata": {"name": "dWallet-deployment-mainnet"}, "pinataContent": <your-json>}'
```

### Option 2: Store Audit Reports

If you get contracts audited, store the audit report on IPFS:
```bash
pinata upload audit-report.pdf
```

### Option 3: Store ABIs

```json
{
  "contractName": "FeeRouter",
  "network": "Base Mainnet",
  "address": "0x...",
  "abi": [ ... ABI JSON ... ]
}
```

---

## 🔍 HOW TO VIEW YOUR CONTRACTS

### View on BaseScan (Blockchain Explorer):

**Testnet Contracts:**
- FeeRouter: https://sepolia.basescan.org/address/0xd23f3d7fF87c1DC27178D34Ee30ffc6B17bb658d
- SwapRouter: https://sepolia.basescan.org/address/0x2a4b239C15f54218a30116c630a32d9305859a43

**Mainnet Contracts (After Deployment):**
- Will be: https://basescan.org/address/YOUR_CONTRACT_ADDRESS

### Interact with Contracts:

**Using Frontend:**
Your dWallet app already has the UI to interact with contracts.

**Using Ethers.js directly:**
```javascript
const provider = new ethers.JsonRpcProvider('https://mainnet.base.org')
const feeRouter = new ethers.Contract(
  '0xYourFeeRouterAddress',
  FeeRouterABI,
  provider
)

// Check fees collected
const stats = await feeRouter.getTokenStats(tokenAddress)
```

---

## 📊 COMPLETE DEPLOYMENT CHECKLIST

### ✅ Frontend (IPFS)
- [x] Build completed
- [x] Uploaded to IPFS
- [x] Accessible via IPFS gateway
- [x] Backup URL working

### ⚠️ Smart Contracts (Blockchain)
- [x] Written and tested
- [x] Deployed to Base Sepolia (testnet)
- [ ] Deploy to Base Mainnet ← **DO THIS NEXT**
- [ ] Verify on BaseScan
- [ ] Update frontend addresses
- [ ] Test with real transactions

### 📋 Documentation (Optional)
- [ ] Store deployment records on IPFS
- [ ] Store audit reports on IPFS
- [ ] Create documentation site
- [ ] Publish to GitHub

---

## 💡 RECOMMENDATIONS

### What to Store Where:

| Component | Storage | Status | Action Needed |
|-----------|---------|--------|---------------|
| Frontend UI | IPFS ✅ | Done | Nothing |
| Smart Contracts | Blockchain ✅ | Testnet only | Deploy to mainnet |
| Contract ABIs | Frontend code ✅ | Done | Nothing |
| Deployment Records | IPFS (optional) | Not done | Optional |
| Audit Reports | IPFS (optional) | Not done | After audit |
| NFT Metadata | IPFS ✅ | Ready | Deploy with NFTs |
| Documentation | GitHub/IPFS | Partial | Improve |

### Priority Actions:

1. **Deploy contracts to Base Mainnet** (CRITICAL)
   - This is blocking all revenue streams
   - Cost: $200-500 in ETH (gas)
   - Timeline: 1-2 days

2. **Update frontend with mainnet addresses**
   - After mainnet deployment
   - Rebuild and redeploy to IPFS

3. **Verify all contracts on BaseScan**
   - Builds trust with users
   - Enables better tooling

4. **Optional: Store documentation on IPFS**
   - For transparency
   - For audit purposes

---

## 🚀 QUICK START: Deploy to Mainnet

### Immediate Next Steps:

```bash
# 1. Ensure you have ETH in your mainnet wallet
# Need ~0.1-0.2 ETH for all deployments

# 2. Deploy FeeRouter (enables swap fees)
npx hardhat run scripts/deploy-fee-router.cjs --network base

# 3. Deploy NFT Membership (enables NFT sales)
npx hardhat run scripts/deploy-nft-membership.cjs --network base

# 4. Deploy Launchpad (enables project launches)
npx hardhat run scripts/deploy-launchpad.cjs --network base

# 5. Verify contracts
npx hardhat verify --network base <contract-address> <constructor-args>

# 6. Update frontend with new addresses
# Edit src/data/contracts.js or similar file

# 7. Rebuild frontend
npm run build

# 8. Deploy to IPFS
npx pinata-cli upload dist/
```

---

## 📞 RESOURCES

### Blockchain Explorers:
- Base Mainnet: https://basescan.org
- Base Sepolia: https://sepolia.basescan.org

### Deployment Files:
- `deployments/` directory - All testnet deployments
- `scripts/` directory - Deployment scripts

### Documentation:
- [revenue-streaming.md](./revenue-streaming.md) - Revenue activation guide
- [COMPLETE_REVENUE_GUIDE.md](./COMPLETE_REVENUE_GUIDE.md) - Full revenue overview

---

## ❓ FAQ

### Q: Do I need to store smart contracts on IPFS?
**A:** No! Smart contracts are already stored on the blockchain. IPFS is only for your frontend.

### Q: Where are my contracts right now?
**A:** Deployed on Base Sepolia (testnet). You need to deploy to Base Mainnet for real revenue.

### Q: Can users access my contracts?
**A:** Yes, via their contract addresses on BaseScan. Anyone can view and interact with them.

### Q: What happens if I lose my deployment files?
**A:** The contracts are permanently on the blockchain. You can always retrieve addresses from BaseScan.

### Q: Should I backup anything to IPFS?
**A:** Optional: deployment records, audit reports, documentation. But not required.

---

## 🎯 BOTTOM LINE

**Your current setup:**
- ✅ Frontend: Perfectly stored on IPFS
- ⚠️ Smart Contracts: On testnet only (need mainnet)
- 📋 Documentation: Optional IPFS storage

**What you need to do:**
1. Deploy contracts to Base Mainnet
2. Update frontend addresses
3. Rebuild and redeploy frontend
4. Start earning revenue!

**No need to store smart contracts on IPFS** - they're already on the blockchain where they belong! 🎉
