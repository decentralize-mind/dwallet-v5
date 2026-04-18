# 🚀 DWT TOKEN - QUICK REFERENCE

## Contract Addresses (Base Sepolia)
```
DWT Token:  0x75A884C401A69481d4377F79dc1918b3D18e2aE8
Airdrop:    0x11aE2b13FfB98D8Ba47a5CDAdD898CA85CA21b84
Timelock:   0x52F274444c198DC3824C3C18009C7D9A1cB4bBAb
Deployer:   0x4C0B7314441dfE8E61267C0d87Fc1A657611dCf5
```

## BaseScan Links
- Token: https://sepolia.basescan.org/token/0x75A884C401A69481d4377F79dc1918b3D18e2aE8
- Airdrop: https://sepolia.basescan.org/address/0x11aE2b13FfB98D8Ba47a5CDAdD898CA85CA21b84
- Timelock: https://sepolia.basescan.org/address/0x52F274444c198DC3824C3C18009C7D9A1cB4bBAb

## Quick Commands

### Fund Airdrop (PRIORITY)
```bash
npx hardhat run scripts/fund-airdrop-official.cjs --network baseSepolia
```

### Test Everything
```bash
npx hardhat run scripts/execute-next-steps.cjs --network baseSepolia
```

### Test Governance
```bash
npx hardhat run scripts/test-governance.cjs --network baseSepolia
```

### Deploy to Mainnet
```bash
npx hardhat run scripts/deploy-mainnet.cjs --network base
```

## Token Info
- Total Supply: 45,564,045 DWT
- Max Supply: 123,000,000 DWT
- Airdrop: 2,100,000 DWT (needs funding)
- Per Claim: 5 DWT
- Max Users: 420,000

## Status
- ✅ Contracts deployed
- ✅ Contracts verified
- ✅ Ownership → Timelock (48h delay)
- ⚠️ Airdrop needs funding (2.1M DWT)
- ⏳ Liquidity not added yet
- ⏳ Mainnet not deployed yet

## Scripts Created
1. `scripts/fund-airdrop-official.cjs` - Fund airdrop
2. `scripts/test-governance.cjs` - Test timelock
3. `scripts/add-liquidity-prep.cjs` - Liquidity prep
4. `scripts/mainnet-deployment-prep.cjs` - Mainnet prep
5. `scripts/execute-next-steps.cjs` - Run all steps
6. `scripts/deploy-mainnet.cjs` - Mainnet deployment

## Next Actions
1. ⚠️ Fund airdrop (transfer 2.1M DWT)
2. ✅ Test governance (complete)
3. 💰 Add liquidity (when ready)
4. 🚀 Deploy mainnet (after audit)
