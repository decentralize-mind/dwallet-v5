# dWallet Protocol — Layer 5 Smart Contracts

**Risk Level:** High–Critical | **Contracts:** 7 files

## Overview

Layer 5 covers Advanced DeFi — cross-chain infrastructure, flash loans, an insurance fund, on-chain limit orders, and Uniswap V3 LP incentives.

---

## Contract Files

| File                       | Description                                                                 |
| -------------------------- | --------------------------------------------------------------------------- |
| `CrossChainMessenger.sol`  | Message bus with nonce replay protection, daily cap, 7-day provider lock    |
| `CrossChainStaking.sol`    | Dual-role (satellite/hub) cross-chain DWT staking with lock-until-ACK       |
| `CrossChainGovernance.sol` | L2 vote aggregation with snapshot weights, L2 cap, 24h veto window          |
| `FlashLoan.sol`            | ERC-3156 compliant flash loan pool with 50% cap and fee separation          |
| `InsuranceFund.sol`        | Claims processing with 20% per-claim cap, 40% rolling 30-day cap, 48h delay |
| `LimitOrders.sol`          | EIP-712 signed limit orders with oracle price check and partial fills       |
| `LiquidityIncentive.sol`   | Uniswap V3 NFT LP staking with on-chain liquidity read (H-03 fix)           |
| `deploy.js`                | Full deployment script                                                      |
| `README.md`                | This file                                                                   |

---

## Critical Fixes Applied

| Fix      | Contract                 | What was wrong                                                                                                                                                    | What changed                                                                                                                            |
| -------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **H-03** | `LiquidityIncentive.sol` | `stake(tokenId, liquidity)` trusted caller-supplied liquidity — attacker stakes 1 wei real position with `type(uint128).max` fake liquidity, stealing all rewards | Removed `liquidity` parameter entirely. Real liquidity now fetched on-chain from `positionManager.positions(tokenId)` — cannot be faked |

---

## Key Security Properties

### CrossChainMessenger

- Per-chain nonce prevents replay attacks across chains
- Daily message cap auto-stops anomalous bursts
- 7-day mandatory delay before provider (Axelar/LayerZero) can be switched
- GUARDIAN can halt all processing in one tx

### CrossChainStaking

- **Lock-until-ACK**: L2 funds locked until mainnet hub confirms stake
- **Emergency withdraw**: after `safetyDelay`, user recovers funds even if bridge is unresponsive
- **Credit TTL**: hub credits expire after 30 days without heartbeat (no ghost credits earning rewards)
- Uses `isSatellite` flag — one codebase, two roles, no duplicate logic

### CrossChainGovernance

- L2 votes capped at `maxL2WeightBps` of total — L2 collusion cannot pass mainnet proposals alone
- Governance council has 24h veto window on any L2 tally
- Only `TALLY_SUBMITTER_ROLE` (multisig) can submit L2 tallies to mainnet

### FlashLoan

- ERC-3156 strict: callback must return `keccak256("ERC3156FlashBorrower.onFlashLoan")`
- Pool balance and accumulated fees tracked separately — fee sweep never reduces pool liquidity
- Reentrancy guard prevents recursive loans

### InsuranceFund

- **State machine**: Pending → Approved → Executed (cannot skip approval)
- 48h execution delay after approval — governance can reject before payout
- Per-claim hard cap (20%) + rolling 30-day cap (40%) prevents fund drain

---

## OpenZeppelin Dependencies

```bash
npm install @openzeppelin/contracts
```

---

## Deployment

```bash
export DWT_TOKEN=0x...
export TIMELOCK=0x...
export MULTISIG_ADDRESS=0x...
export PRICE_ORACLE=0x...        # from Layer 3
export UNISWAP_V3_PM=0xC36442b4a4522E871399CD717aBDD847Ab11FE88
export DWT_ETH_POOL=0x...

npx hardhat run deploy.js --network mainnet
```

> ⚠️ **Layer 5 requires a full independent audit before mainnet**, especially the cross-chain paths (CrossChainMessenger, CrossChainStaking, CrossChainGovernance). These are the highest-risk contracts in the protocol.
