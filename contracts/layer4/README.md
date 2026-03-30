# Layer 4 — Staking & Rewards

Complete smart contract suite for DWT token staking with ETH revenue sharing, auto-compounding, and veDWT-powered boost multipliers.

---

## Contract Architecture

```
layer4/
├── contracts/
│   ├── StakingPool.sol        — DWT → DWT auto-compounding pool (#4)
│   ├── DWTStaking.sol         — DWT → ETH reward staking (#5)
│   ├── RewardDistributor.sol  — Fee → ETH routing & distribution (#12)
│   ├── BoostedStaking.sol     — veDWT multiplier boosted staking
│   └── mocks/
│       └── MockERC20.sol      — Test helper only
├── interfaces/
│   └── ILayer4.sol            — All shared interfaces
├── libraries/
│   └── StakingMath.sol        — veDWT, boost, share, reward math
├── scripts/
│   └── deploy.js              — Full deployment + wiring script
├── test/
│   └── Layer4.test.js         — Hardhat/Chai test suite
├── hardhat.config.js
└── package.json
```

---

## Contracts Overview

### 1. StakingPool — DWT → DWT (#4)

Auto-compounding share-based pool. Deposit DWT, receive non-transferable **sDWT** shares. Rewards are injected by the RewardDistributor, increasing the DWT/sDWT exchange rate automatically — no claim needed.

| Parameter    | Default          | Notes                                     |
| ------------ | ---------------- | ----------------------------------------- |
| Withdraw fee | 0.10%            | Stays in pool, benefits remaining stakers |
| Cooldown     | 1 day            | Blocks immediate withdrawal after deposit |
| sDWT         | Non-transferable | Prevents secondary market gaming          |
| MIN_SHARES   | 1,000            | Locked on first deposit (anti-inflation)  |

Key functions:

- `deposit(dwtAmount)` → mints sDWT
- `withdraw(shares)` → burns sDWT, returns DWT minus fee
- `injectRewards(dwtAmount)` → called by RewardDistributor/owner, raises pricePerShare
- `pricePerShare()` → current DWT value of 1 sDWT (18 decimals)

---

### 2. DWTStaking — DWT → ETH (#5)

Synthetix-style `rewardPerTokenStored` accounting. Stake DWT, earn ETH as protocol revenue is pushed in. ETH is claimed on-demand.

| Parameter    | Default | Notes                                        |
| ------------ | ------- | -------------------------------------------- |
| Lock period  | 7 days  | Min time before unstake                      |
| Max lock     | 90 days | Admin configurable                           |
| Reward model | Push    | RewardDistributor calls `depositETHReward()` |
| Precision    | 1e18    | Accumulator scale                            |

Key functions:

- `stake(amount)` → deposits DWT, sets lockExpiry
- `unstake(amount)` → returns DWT after lock
- `claimETH()` → sends pending ETH to caller
- `depositETHReward()` → push ETH rewards (payable, called by RewardDistributor)
- `earned(user)` → view pending ETH

---

### 3. RewardDistributor — Fee → ETH Routing (#12)

Collects protocol fees (ERC-20 tokens + raw ETH), swaps tokens to ETH via the Layer 2 SwapRouter, then splits and routes ETH to all staking contracts.

**Default allocation:**
| Destination | Share |
|---|---|
| DWTStaking | 50% — ETH rewards to DWT stakers |
| StakingPool | 20% — DWT buyback → auto-compound injection |
| BoostedStaking | 20% — ETH rewards to veDWT holders |
| Treasury | 10% — Protocol reserve |

Key functions:

- `distribute()` — trustless, callable by anyone; swaps ERC-20s → ETH then routes
- `receiveFeeToken(token, amount)` — pull accepted fee tokens from caller
- `setAllocation(...)` — update split weights (must sum to 10,000 bps)
- `setAcceptedToken(token, true)` — whitelist a fee token

---

### 4. BoostedStaking — veDWT Multiplier

Vote-escrow DWT staking. Lock DWT for 1 week – 4 years; receive a **veDWT** balance that decays linearly to zero at lock expiry. veDWT governs:

- **Boost multiplier**: 1x (no lock) → up to **2.5x** (4-year max lock)
- **Governance weight**: proportional to veDWT
- **ETH reward share**: scaled by boosted balance

**Boost formula** (Curve v2 adaptation):

```
boosted = min(
    rawStake × 2.5,
    rawStake + (totalLocked × userVeDWT / totalVeDWT) × 1.5
)
```

| Lock Duration | Approx. veDWT/DWT | Max Boost |
| ------------- | ----------------- | --------- |
| 1 week        | ~0.05%            | ~1.00x    |
| 6 months      | ~11.5%            | ~1.17x    |
| 1 year        | ~25%              | ~1.38x    |
| 2 years       | ~50%              | ~1.75x    |
| 4 years       | ~100%             | 2.50x     |

Key functions:

- `lock(amount, lockSeconds)` → creates/extends lock, updates veDWT
- `unlock()` → returns DWT after expiry
- `claimETH()` → claims pending ETH rewards
- `veDWTOf(user)` → current decayed veDWT
- `boostedBalanceOf(user)` → effective balance for reward calculation
- `boostMultiplier(user)` → multiplier as ratio (1e18 = 1x)

---

## Quick Start

```bash
npm install
npm run compile
npm test
```

### Deploy (local)

```bash
npx hardhat node
DWT_TOKEN_ADDRESS=0x... TREASURY_ADDRESS=0x... npm run deploy
```

### Deploy (Arbitrum)

```bash
PRIVATE_KEY=0x... \
DWT_TOKEN_ADDRESS=0x... \
SWAP_ROUTER_ADDRESS=0x... \
TREASURY_ADDRESS=0x... \
npx hardhat run scripts/deploy.js --network arbitrum
```

---

## Environment Variables

| Variable              | Description                                    |
| --------------------- | ---------------------------------------------- |
| `PRIVATE_KEY`         | Deployer private key                           |
| `DWT_TOKEN_ADDRESS`   | DWT ERC-20 contract address                    |
| `SWAP_ROUTER_ADDRESS` | Layer 2 SwapRouter (for fee token → ETH swaps) |
| `TREASURY_ADDRESS`    | Treasury / multisig address                    |
| `ARBITRUM_RPC_URL`    | Arbitrum One RPC                               |
| `ARBISCAN_API_KEY`    | For contract verification                      |

---

## Cross-Layer Integration

Layer 4 connects to **Layer 2** (Swap & Liquidity):

```
Layer 2 FeeRouter
    └─ collects swap fees
         └─ forwards to ─► RewardDistributor
                                ├─ 50% ETH ──────► DWTStaking.depositETHReward()
                                ├─ 20% buyDWT ───► StakingPool.injectRewards()
                                ├─ 20% ETH ──────► BoostedStaking.depositETHReward()
                                └─ 10% ETH ──────► Treasury
```

---

## Security Considerations

- All contracts use OpenZeppelin `ReentrancyGuard`, `SafeERC20`, `Pausable`
- sDWT is soulbound (non-transferable) — prevents flash-stake attacks
- veDWT is a pure view (no token minted) — decay always reflected, no stale balances
- Cooldown on StakingPool prevents same-block deposit/withdraw arbitrage
- Lock periods on DWTStaking align long-term incentives
- `distribute()` is trustless — no privileged keeper required
- Transfer ownership to a multisig/timelock before mainnet launch
