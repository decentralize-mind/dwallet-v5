# Layer 2 DEX — Smart Contracts

A complete Layer 2 decentralized exchange smart contract suite featuring swap routing, fee management with discounts, a hybrid price oracle, liquidity mining, and EIP-712 signed limit orders.

---

## Contract Architecture

```
layer2/
├── contracts/
│   ├── FeeRouter.sol          — Fee collection, tiered discounts, LP/treasury split
│   ├── SwapRouter.sol         — Swap execution (single-hop & multi-hop)
│   ├── PriceOracle.sol        — Chainlink + TWAP hybrid price oracle
│   ├── LiquidityIncentive.sol — LP staking rewards (MasterChef-style)
│   └── LimitOrderBook.sol     — EIP-712 signed limit orders, off-chain fill
├── interfaces/
│   └── ILayer2.sol            — All shared interfaces
├── libraries/
│   └── Layer2Math.sol         — AMM math, safe utilities
├── scripts/
│   └── deploy.js              — Deployment script (all networks)
├── hardhat.config.js
└── package.json
```

---

## Contracts Overview

### 1. FeeRouter (`FeeRouter.sol`)

- Configurable base fee (default **0.30%**, max 3%)
- **4-tier discount system** based on governance token holdings:
  - 100 tokens → 10% discount
  - 1,000 tokens → 25% discount
  - 10,000 tokens → 50% discount
  - 100,000 tokens → 80% discount
- Fee split: 70% to LPs, 30% to treasury (configurable)
- `collectFee(token, payer, amount)` called by SwapRouter on every swap
- `distributeFees(token)` sends pending fees to LP pool and treasury

### 2. SwapRouter (`SwapRouter.sol`)

- `swapExactIn(tokenIn, tokenOut, amountIn, minOut, recipient, deadline)`
- `swapExactInMultiHop(path[], amountIn, minOut, recipient, deadline)` — up to 5 hops
- Integrates `FeeRouter` for per-swap fee deduction
- Integrates `PriceOracle` for slippage protection
- Pool registry: `registerPool(tokenA, tokenB, pool)`

### 3. PriceOracle (`PriceOracle.sol`)

- **Chainlink primary** — fetches `latestRoundData()`, normalizes to 18 decimals
- **TWAP fallback** — 30-minute window, 30-slot ring buffer
- Configurable staleness threshold per pair
- `recordObservation(token0, token1, spotPrice)` — called on every swap
- `getPrice(token0, token1)` — returns best available price + source flag

### 4. LiquidityIncentive (`LiquidityIncentive.sol`)

- MasterChef-style multi-pool reward distribution
- `deposit(pid, amount)` / `withdraw(pid, amount)` / `harvest(pid)`
- Allocation points control reward share per pool
- Emergency withdrawal available
- Configurable emission rate and start/end timestamp

### 5. LimitOrderBook (`LimitOrderBook.sol`)

- **Off-chain signing, on-chain settlement**
- EIP-712 typed struct signing for gas-free order creation
- Partial fills supported — `filledAmountIn[orderHash]` tracks progress
- `fillOrder(order, signature, amountInToFill)` — called by fillers/bots
- `cancelOrder(order)` / `cancelNonce(nonce)` — instant cancellation
- Per-fill filler fee (default 0.10%) to incentivize relayers

---

## Quick Start

### Install

```bash
npm install
```

### Compile

```bash
npm run compile
```

### Test

```bash
npm test
```

### Deploy (local)

```bash
npx hardhat node
npm run deploy
```

### Deploy (Arbitrum)

```bash
PRIVATE_KEY=0x... \
TREASURY_ADDRESS=0x... \
GOVERNANCE_TOKEN_ADDRESS=0x... \
REWARD_TOKEN_ADDRESS=0x... \
npx hardhat run scripts/deploy.js --network arbitrum
```

---

## Environment Variables

| Variable                   | Description                      |
| -------------------------- | -------------------------------- |
| `PRIVATE_KEY`              | Deployer private key             |
| `TREASURY_ADDRESS`         | Address to receive treasury fees |
| `GOVERNANCE_TOKEN_ADDRESS` | ERC20 used for discount tiers    |
| `REWARD_TOKEN_ADDRESS`     | ERC20 distributed as LP rewards  |
| `ARBITRUM_RPC_URL`         | Arbitrum RPC endpoint            |
| `OPTIMISM_RPC_URL`         | Optimism RPC endpoint            |
| `BASE_RPC_URL`             | Base RPC endpoint                |
| `ARBISCAN_API_KEY`         | For contract verification        |

---

## Post-Deployment Checklist

1. `feeRouter.setLiquidityPool(<pool_address>)`
2. `priceOracle.setOracleConfig(tokenA, tokenB, chainlinkFeed, false, 3600)` — per pair
3. `swapRouter.registerPool(tokenA, tokenB, pool)` — per trading pair
4. `liquidityIncentive.addPool(allocPoints, lpToken, true)` — per LP token
5. Transfer reward tokens to `LiquidityIncentive` contract address
6. Set up off-chain filler bots to watch for and fill limit orders

---

## Security Notes

- All contracts use OpenZeppelin's `ReentrancyGuard` and `SafeERC20`
- Owner access controlled via `Ownable` (recommend transferring to a multisig/timelock post-deploy)
- LimitOrderBook uses EIP-712 domain separation to prevent signature replay across chains
- PriceOracle has staleness threshold to protect against stale Chainlink feeds
- FeeRouter caps maximum fee at 3% and maximum discount at 80%
