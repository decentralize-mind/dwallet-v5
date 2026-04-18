# DWT Token — Complete Deployment Guide

## What's in this package

| File | Purpose |
|------|---------|
| `deploy-complete.js` | Master deployment script (all 9 steps) |
| `add-liquidity.js` | Standalone DEX liquidity script |
| `create-gnosis-safe.js` | Gnosis Safe multisig creation |
| `.env.template` | Full environment variable template |
| `hardhat.config.js` | Hardhat config with Base Sepolia + verification |

---

## Prerequisites

```bash
npm install --save-dev \
  @nomicfoundation/hardhat-toolbox \
  @openzeppelin/contracts \
  dotenv

# For Gnosis Safe script only:
npm install @safe-global/protocol-kit
```

---

## Setup

1. **Copy and fill your env file**
   ```bash
   cp .env.template .env
   # Edit .env with real addresses and private keys
   ```

2. **Verify your total supply does not exceed 123,000,000 DWT**
   Add up all `_AMOUNT` values in your `.env`.

3. **Fund your deployer wallet**
   You need at least **0.08 ETH** on Base Sepolia for gas.
   Get testnet ETH: https://www.coinbase.com/faucets/base-ethereum-goerli-faucet

---

## Deployment

### Full deployment (all 9 steps)
```bash
npx hardhat run scripts/deploy-complete.js --network baseSepolia
```

### What it does, in order:
1. **Security** — LockEngine, InvariantChecker, SecurityController, RateLimiter
2. **Governance** — TimelockController (48h) + DWTGovernor
3. **Decentralization** — Ownership → Timelock, deployer admin renounced
4. **Vesting** — VestingWallet per founder/team/investor (no raw token dumps)
5. **Distribution** — Mints to all 28 recipients (vesting wallets + direct)
6. **Airdrop** — Deploys SimpleAirdrop contract
7. **DEX Liquidity** — Auto-adds if deployer holds liquidity tokens; otherwise prints instructions
8. **Gnosis Safe** — Prints setup instructions; runs SDK deploy if owners are configured
9. **Verification** — Prints all `npx hardhat verify` commands, saves JSON

---

## Manual steps after deployment

### 1. Fund the airdrop contract
```bash
cast send $DWT_TOKEN_ADDRESS \
  "transfer(address,uint256)" \
  $SIMPLE_AIRDROP_ADDRESS \
  $(python3 -c "print(int(float('$AIRDROP_AMOUNT') * 10**18))") \
  --rpc-url $BASE_SEPOLIA_RPC \
  --private-key $AIRDROP_PRIVATE_KEY
```

### 2. Verify contracts on BaseScan
The deployment script prints exact commands. They look like:
```bash
npx hardhat verify --network baseSepolia 0xTOKEN_ADDRESS "0xDEPLOYER"
npx hardhat verify --network baseSepolia 0xTIMELOCK_ADDRESS 172800 "[]" "[0x0000...]" "0xDEPLOYER"
npx hardhat verify --network baseSepolia 0xGOVERNOR_ADDRESS "0xTOKEN" "0xTIMELOCK"
# ... etc
```

### 3. Create Gnosis Safe (multisig treasury)
```bash
# Set SAFE_OWNERS and SAFE_THRESHOLD in .env first
node scripts/create-gnosis-safe.js

# Or manually at:
# https://app.safe.global  →  Select "Base Sepolia"
```

### 4. Add DEX liquidity (if skipped in main deployment)
```bash
# Set DWT_TOKEN_ADDRESS, LIQUIDITY_DEX_AMOUNT, LIQUIDITY_ETH_AMOUNT in .env
npx hardhat run scripts/add-liquidity.js --network baseSepolia
```

### 5. Delegate voting power
You must delegate DWT to yourself (or another address) to activate votes:
```bash
cast send $DWT_TOKEN_ADDRESS \
  "delegate(address)" $YOUR_ADDRESS \
  --rpc-url $BASE_SEPOLIA_RPC \
  --private-key $PRIVATE_KEY
```

---

## Vesting schedule summary

| Group | Cliff | Duration | Contract |
|-------|-------|----------|---------|
| Founders | 6 months | 2 years linear | VestingWallet |
| Team | None | 1 year linear | VestingWallet |
| Investors | 6 months | 1 year linear | VestingWallet |
| Advisors | None | Immediate | Direct transfer |

Beneficiaries call `release(tokenAddress)` on their VestingWallet to claim.

---

## Governance flow (future minting or protocol changes)

```
1. Hold 100,000+ DWT
2. Call governor.propose(targets, values, calldatas, description)
3. Wait 1 day  (voting delay)
4. Vote        (7-day window, need 4% quorum)
5. Wait 48h    (timelock delay)
6. Anyone calls governor.execute(...)
```

---

## Key addresses (Base Sepolia)

| Contract | Address |
|---------|---------|
| Uniswap V2 Router | `0x1689E7B1F10000AE47eBfE339a4f69dECd19F602` |
| Uniswap V2 Factory | `0x7Ae58f10f7849cA6F5fB71b7f45CB416c9204b1E` |
| WETH | `0x4200000000000000000000000000000000000006` |
| BaseScan (testnet) | https://sepolia.basescan.org |

---

## Security checklist before mainnet

- [ ] All contracts audited by a third party
- [ ] Gnosis Safe set up with ≥ 2-of-3 multisig
- [ ] Liquidity locked (use a time-lock or vesting contract for LP tokens)
- [ ] Deployer private key rotated / secured in hardware wallet
- [ ] Monitoring configured (Tenderly / OpenZeppelin Defender)
- [ ] Emergency pause tested if SecurityController supports it
