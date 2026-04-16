# dWallet Protocol — Layer 3 Smart Contracts

**Risk Level:** High | **Contracts:** 9 files

## Overview

Layer 3 covers oracles, fee routing, vote escrow, buyback-and-burn, cross-chain bridge, and the emergency circuit breaker.

---

## Contract Files

| File                    | Description                                                        |
| ----------------------- | ------------------------------------------------------------------ |
| `DWTPriceOracle.sol`    | Chainlink + Uniswap V3 TWAP dual-source price oracle with fallback |
| `DWTETHRateFeed.sol`    | On-chain DWT/ETH rate feed with deviation cap & staleness flag     |
| `RewardDistributor.sol` | Swaps fee tokens to ETH and distributes to stakers + treasury      |
| `FeeSplitter.sol`       | Splits protocol fees to treasury, rewards, and buyback             |
| `BuybackAndBurn.sol`    | Buys back DWT from market and burns it                             |
| `VeDWT.sol`             | Vote-escrow: lock DWT for up to 4 years for voting power           |
| `DWalletMultisig.sol`   | M-of-N multisig for admin key management                           |
| `EmergencyPause.sol`    | Atomic protocol-wide circuit breaker (pauseAll in <1 block)        |
| `DWTBridge.sol`         | Cross-chain lock/mint bridge with M-of-N relayer + 12h delay       |
| `deploy.js`             | Deployment script with post-deploy checklist                       |

---

## Critical Fixes Applied

| Fix       | Contract                | What was wrong                                         | Fix                                                             |
| --------- | ----------------------- | ------------------------------------------------------ | --------------------------------------------------------------- |
| **C-01**  | `DWTBridge.sol`         | Single RELAYER_ROLE = unlimited mint on key compromise | M-of-N signatures (3-of-5) + 12h EXECUTION_DELAY                |
| **C-02**  | `DWTPriceOracle.sol`    | Custom tick math broke at large ticks → wrong prices   | Replaced with Uniswap's audited `TickMath.getSqrtRatioAtTick()` |
| **C-02b** | `DWTETHRateFeed.sol`    | Same broken tick math                                  | Same fix — bit-exact TickMath                                   |
| **H-04**  | `RewardDistributor.sol` | `amountOutMinimum: 0` on all swaps = free MEV sandwich | TWAP quoter-based `minAmountOut` with 2% slippage tolerance     |

---

## OpenZeppelin Dependencies

```bash
npm install @openzeppelin/contracts
```

---

## Key Security Properties

### DWTPriceOracle

- Chainlink staleness check: rejects rounds older than `stalenessAge` (default 1h)
- TWAP window minimum: 300 seconds (5 min) — prevents tiny manipulation windows
- `try/catch` fallback chain: Chainlink → TWAP → fallbackPrice (no total DoS)

### DWTBridge (C-01 Fix)

- **No single relayer key** — replaced with M-of-N (default 3-of-5)
- All inbound mints require `requiredSignatures` relayer approvals
- Mandatory **12-hour execution delay** between submission and execution
- Per-relayer nonce tracking prevents signature reuse

### EmergencyPause

- `pauseAll()` halts all registered contracts in one tx (<1 block)
- Guardian can **only pause** — cannot unpause (compromised guardian can't resume exploit)
- Admin (multisig) required to unpause

### VeDWT

- Non-transferable — no ERC20 transfer functions
- Lock durations: 1 week minimum, 4 years maximum
- Cannot shorten existing locks, cannot top up expired locks

---

## Deployment

```bash
export DWT_TOKEN=0x...
export TIMELOCK=0x...
export TREASURY=0x...
export STAKING_POOL=0x...
export CHAINLINK_ETH_USD=0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419
export UNISWAP_V3_ROUTER=0xE592427A0AEce92De3Edee1F18E0157C05861564
export UNISWAP_V3_QUOTER=0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6
export WETH_ADDRESS=0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2
export MULTISIG_ADDRESS=0x...
export RELAYER_1=0x... RELAYER_2=0x... RELAYER_3=0x... RELAYER_4=0x... RELAYER_5=0x...

npx hardhat run deploy.js --network mainnet
```
