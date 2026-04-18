# 🚀 QUICK START - Complete DWT Deployment

## One Command to Deploy Everything

```bash
npx hardhat run scripts/deploy-complete-dwt.js --network baseSepolia
```

---

## What Gets Deployed (40+ Contracts)

### ✅ Category 1: Governance (3 contracts)
1. **TimelockController** - 48h delay on all changes
2. **DWTTokenEnhanced** - Token with 8 features
3. **DWTGovernor** - Voting system

### ✅ Category 2: Ownership Security (4 actions)
1. Transfer ownership → Timelock
2. Grant roles → Governor
3. Renounce deployer admin
4. Decentralize control

### ✅ Category 3: Distribution (28 recipients)
- Mints **70,064,045 DWT** to all .env addresses
- Your airdrop: **2,100,000 DWT** → `0xaF261434cEad26E9C32c8a1d2DbaFa82c2593e67`

### ✅ Category 4: Security (5 contracts)
1. LockEngine
2. InvariantChecker
3. SecurityController
4. ProtocolRegistry
5. RateLimiter

### ✅ Category 5: Post-Deployment (4 tasks)
1. SimpleAirdrop contract deployed
2. Verification commands provided
3. Monitoring setup documented
4. Governance template ready

---

## After Deployment (Manual Steps)

### 1. Fund Airdrop Contract
```javascript
// From your airdrop wallet in MetaMask
dwtToken.transfer(
  "SIMPLE_AIRDROP_ADDRESS_FROM_OUTPUT",
  ethers.parseEther("2100000")
)
```

### 2. Verify on BaseScan
```bash
# Commands shown in deployment output
npx hardhat verify --network baseSepolia TOKEN_ADDRESS ...
```

### 3. Add Liquidity
1. Go to https://app.uniswap.org
2. Create DWT/ETH pool
3. Add 100k+ DWT + equivalent ETH

### 4. Set Up Gnosis Safe
1. Go to https://app.safe.global
2. Create multisig wallet
3. Transfer treasury funds

---

## Token Features (All 8)

✅ ERC20 standard (18 decimals)  
✅ ERC20Permit (gasless approvals)  
✅ ERC20Votes (governance voting)  
✅ ERC20Burnable (token burning)  
✅ Pausable (emergency pause)  
✅ Security integration (Layer 7)  
✅ Fee tiers (based on holdings)  
✅ Max supply cap (123M DWT)  

---

## Governance Settings

| Setting | Value |
|---------|-------|
| Timelock Delay | 48 hours |
| Voting Delay | 1 day |
| Voting Period | 7 days |
| Proposal Threshold | 100,000 DWT |
| Quorum | 4% of supply |
| Max Supply | 123,000,000 DWT |

---

## Your Airdrop Wallet

**Address:** `0xaF261434cEad26E9C32c8a1d2DbaFa82c2593e67`  
**Allocation:** 2,100,000 DWT  
**Per User Claim:** 5 DWT  
**Max Users:** 420,000  

---

## Total Supply Breakdown

| Category | Amount | % |
|----------|--------|---|
| Initial Mint | 70,064,045 | 56.97% |
| Reserved | 52,935,955 | 43.03% |
| **Max Supply** | **123,000,000** | **100%** |

---

## Networks

- **Testnet:** Base Sepolia (Chain ID: 84532)
- **Mainnet:** Base (Chain ID: 8453)

---

## Need Help?

1. Read: [COMPLETE_DEPLOYMENT_METHODS.md](./COMPLETE_DEPLOYMENT_METHODS.md)
2. Check: [LAYER1_DEPLOYMENT_COMPLETE.md](./LAYER1_DEPLOYMENT_COMPLETE.md)
3. Script: [scripts/deploy-complete-dwt.js](./scripts/deploy-complete-dwt.js)

---

**Ready to deploy?** Run the command at the top! 🚀
