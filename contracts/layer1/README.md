# dWallet Protocol — Layer 1 Smart Contracts

**Risk Level:** Medium–High | **Contracts:** 9 files

## Overview

Layer 1 is the core of the dWallet protocol, covering the token, fee engine, gas paymaster, staking, treasury, and on-chain governance.

---

## Contract Files

| File                   | Description                                                             |
| ---------------------- | ----------------------------------------------------------------------- |
| `DWTToken.sol`         | Core DWT ERC20 token with max supply cap, ERC20Permit, ERC20Votes       |
| `DWalletFeeRouter.sol` | Uniswap V3 swap router with DWT-tier-based fee deduction                |
| `DWTPaymaster.sol`     | ERC-4337 Paymaster accepting DWT for gas payments                       |
| `DWTETHRateFeed.sol`   | On-chain DWT/ETH rate feed with staleness and deviation controls        |
| `StakingPool.sol`      | Synthetix-style ERC20 → ERC20 staking rewards pool                      |
| `DWTStaking.sol`       | DWT → ETH rewards staking with pull-pattern distributions               |
| `Treasury.sol`         | Protocol treasury with GOVERNOR_ROLE (Timelock) + ADMIN_ROLE (multisig) |
| `DWTGovernor.sol`      | On-chain governance (48h Timelock, 4% quorum, 100k DWT threshold)       |
| `deploy.js`            | Deployment script with post-deploy security checklist                   |

---

## OpenZeppelin Dependencies

All contracts use OpenZeppelin v5. Install via:

```bash
npm install @openzeppelin/contracts
```

---

## Key Security Properties

### DWTToken

- Hard cap: 1,000,000,000 DWT (`MAX_SUPPLY`)
- Only `owner` (Timelock post-deploy) can mint
- `feeTierOf()` and `feeRateOf()` are read-only view functions
- `ERC20Votes` enables snapshot-based governance (flash-loan safe)

### DWalletFeeRouter

- Fee tier determined by `getPastVotes(user, block.number - 1)` — **H-05 fix applied**
- `uniswapRouter` and `dwtToken` are `immutable` — cannot be replaced by admin

### DWTPaymaster

- Rate sourced from `DWTETHRateFeed` on-chain — **H-02 fix applied** (no stale manual rate)
- EntryPoint address is `immutable` — cannot be changed
- Markup floor: `markupBps >= BPS` (always >= 1x)

### Governance

- `TIMELOCK_ADMIN_ROLE` is renounced by deployer after setup
- `PROPOSER_ROLE` granted exclusively to `DWTGovernor`
- `EXECUTOR_ROLE = address(0)` → anyone can execute after delay (prevents censorship)

---

## Post-Deploy Checklist

- [ ] Transfer `DWTToken` ownership to `TimelockController`
- [ ] Renounce `TIMELOCK_ADMIN_ROLE` after Governor setup
- [ ] Fund `DWTPaymaster` with ETH via `depositToEntryPoint()`
- [ ] Set live DWT/ETH rate in `DWTETHRateFeed`
- [ ] Verify all contracts on Etherscan
- [ ] Commission full independent audit before mainnet

---

## Compilation

```bash
npx hardhat compile
```

## Deployment

```bash
export MULTISIG_ADDRESS=0x...
export UNISWAP_V3_ROUTER=0xE592427A0AEce92De3Edee1F18E0157C05861564
export ERC4337_ENTRYPOINT=0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789

npx hardhat run deploy.js --network mainnet
```
