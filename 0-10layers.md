# dWallet v5 — Complete Smart Contract Architecture (Layers 0-10)

## Overview

The dWallet protocol is built on a **10-layer security architecture** where each layer serves a specific purpose in creating a secure, scalable, and feature-rich DeFi ecosystem. This document explains the purpose and role of every smart contract across all layers.

---

## Security Foundation: The 5 Universal Lock Primitives

Every layer (except Layer 0) inherits from **SecurityGated.sol**, which implements 5 universal lock types:

1. **Access Control** — Role-based permissions (who can do what)
2. **Time Lock** — Mandatory cooldown periods before sensitive actions
3. **State Controller** — Protocol health checks and circuit breakers
4. **Rate Limiter** — Prevents abnormal transaction volumes
5. **Verification Engine** — Multi-sig and signature validation

These locks are enforced by the **LockEngine** and monitored by **Layer 7 Security**.

---

# 🏛️ LAYER 0 — Registry & Infrastructure

**Purpose:** The "Root of Trust" for the entire protocol. Maintains the authoritative address registry for all other layers.

## Contracts

### 1. **ProtocolRegistry.sol**
**Role:** Central address registry and architectural controller

**Key Responsibilities:**
- Tracks contract addresses for all 10 layers via `layerAddresses` mapping
- Enforces 48-hour time lock on registry updates (after genesis period)
- Requires dual-key verification (committee hash + signature) for architectural changes
- Manages genesis phase (first 24 hours allow rapid deployment without time locks)

**Security Properties:**
- ADMIN_ROLE and GOVERNOR_ROLE separation
- ReentrancyGuard protection
- Inherits SecurityGated for Layer 7 oversight

### 2. **NetworkConfig.sol**
**Role:** Network-wide configuration management

**Key Responsibilities:**
- Stores chain-specific parameters (chain IDs, RPC endpoints)
- Configures cross-chain messaging settings
- Manages protocol-wide constants and thresholds

---

# 💰 LAYER 1 — Core Token & Governance

**Purpose:** The economic and governance foundation of the protocol. Manages the DWT token, staking rewards, treasury, and on-chain governance.

## Contracts

### 1. **DWTToken.sol**
**Role:** Core ERC20 governance token

**Key Features:**
- Max supply cap: 1,000,000,000 DWT
- ERC20Permit for gasless approvals
- ERC20Votes for snapshot-based governance (flash-loan resistant)
- Owner-only minting (transferred to Timelock post-deploy)
- Fee tier tracking based on holder balance

### 2. **DwalletFeeRouter.sol**
**Role:** Swap fee calculation and tiered discounts

**Key Features:**
- Base fee: 0.30% (configurable, max 3%)
- 4-tier discount system based on DWT holdings:
  - 100 DWT → 10% discount
  - 1,000 DWT → 25% discount
  - 10,000 DWT → 50% discount
  - 100,000 DWT → 80% discount
- Fee determined by `getPastVotes(user, block.number - 1)` (snapshot-based)

### 3. **DWTPaymaster.sol**
**Role:** ERC-4337 Paymaster for gasless transactions

**Key Features:**
- Accepts DWT as gas payment
- Rate sourced from DWTETHRateFeed (on-chain, not stale)
- Immutable EntryPoint address
- Markup floor: always ≥ 1x (BPS minimum)

### 4. **DWTETHRateFeed.sol**
**Role:** On-chain DWT/ETH price feed

**Key Features:**
- Staleness detection (rejects old rounds)
- Deviation cap monitoring
- Circuit breaker for anomalous price movements

### 5. **StakingPool.sol**
**Role:** Synthetix-style ERC20 staking rewards pool

**Key Features:**
- Stake any ERC20, earn ERC20 rewards
- Reward-per-token accounting
- Supports multiple staking tokens

### 6. **DWTStaking.sol**
**Role:** DWT → ETH rewards staking

**Key Features:**
- Pull-pattern ETH distributions
- Lock period: 7 days minimum, 90 days maximum
- ETH rewards pushed by RewardDistributor
- `claimETH()` for on-demand harvesting

### 7. **Treasury.sol**
**Role:** Protocol treasury with multi-role control

**Key Roles:**
- DEFAULT_ADMIN_ROLE (Multisig): Grant/revoke roles
- GOVERNOR_ROLE (Timelock): Spend funds, set budgets
- ADMIN_ROLE (Multisig): Emergency withdrawals only
- GUARDIAN_ROLE (Security bot): Pause only
- SPENDER_ROLE (Contracts): Pull budget up to cap

**Key Features:**
- Budget system with weekly caps per spender
- Spend categories for auditing: STAKING_REWARD, BUYBACK, GRANT, OPERATIONS, VESTING, BRIDGE_FEE, OTHER
- Can fund staking pools and vesting contracts

### 8. **DWTGovernor.sol**
**Role:** On-chain governance controller

**Key Parameters:**
- 48-hour timelock delay
- 4% quorum requirement
- 100k DWT proposal threshold
- PROPOSER_ROLE granted exclusively to Governor
- EXECUTOR_ROLE = address(0) (anyone can execute after delay)

### 9. **WDWT.sol**
**Role:** Wrapped DWT token

**Purpose:** ERC20 wrapper for DWT to enable compatibility with protocols requiring wrapped tokens.

---

# 🔄 LAYER 2 — Decentralized Exchange (DEX)

**Purpose:** Complete AMM decentralized exchange with swap routing, fee management, hybrid oracle, liquidity mining, and limit orders.

## Contracts

### 1. **SwapRouter.sol**
**Role:** Multi-hop swap execution engine

**Key Features:**
- Single-hop swaps: `swapExactIn(tokenIn, tokenOut, amountIn, minOut, recipient, deadline)`
- Multi-hop swaps: Up to 5 hops via `swapExactInMultiHop(path[], ...)`
- Integrates FeeRouter for per-swap fee deduction
- PriceOracle integration for slippage protection
- Pool registry: `registerPool(tokenA, tokenB, pool)`
- Default max slippage: 2% (200 bps)

**Security:**
- ReentrancyGuard
- SecurityGated (Layer 7 pause)
- Oracle price validation before execution

### 2. **FeeRouter.sol**
**Role:** Fee collection and tiered discount system

**Key Features:**
- Configurable base fee (default 0.30%, max 3%)
- 4-tier discount based on governance token holdings
- Fee split: 70% to LPs, 30% to treasury (configurable)
- `collectFee(token, payer, amount)` called by SwapRouter
- `distributeFees(token)` sends fees to LP pool and treasury

### 3. **PriceOracle.sol**
**Role:** Hybrid price oracle (Chainlink + TWAP)

**Key Features:**
- **Primary:** Chainlink latestRoundData() with staleness check
- **Fallback:** 30-minute TWAP window (30-slot ring buffer)
- Configurable staleness threshold per pair
- `recordObservation(token0, token1, spotPrice)` called on every swap
- `getPrice(token0, token1)` returns best available price + source flag
- Try/catch fallback chain: Chainlink → TWAP → fallbackPrice

### 4. **LiquidityIncentive.sol**
**Role:** MasterChef-style liquidity mining rewards

**Key Features:**
- Multi-pool reward distribution
- `deposit(pid, amount)` / `withdraw(pid, amount)` / `harvest(pid)`
- Allocation points control reward share per pool
- Emergency withdrawal available
- Configurable emission rate and start/end timestamp
- Real-time liquidity fetched on-chain (cannot be faked)

### 5. **LimitOrderBook.sol**
**Role:** EIP-712 signed limit orders

**Key Features:**
- Off-chain signing, on-chain settlement
- Partial fills supported (`filledAmountIn[orderHash]`)
- `fillOrder(order, signature, amountInToFill)` callable by bots
- `cancelOrder(order)` / `cancelNonce(nonce)` for instant cancellation
- Per-fill filler fee (default 0.10%) incentivizes relayers
- Domain separation prevents replay across chains

---

# 🔐 LAYER 3 — Oracles, Bridge & Emergency Systems

**Purpose:** Price feeds, cross-chain bridge, vote escrow, buyback-and-burn, and emergency circuit breakers.

## Contracts

### 1. **DWTPriceOracle.sol**
**Role:** Dual-source price oracle (Chainlink + Uniswap V3 TWAP)

**Key Features:**
- Chainlink staleness check: rejects rounds older than 1h
- TWAP window minimum: 300 seconds (5 min)
- Uses audited Uniswap `TickMath.getSqrtRatioAtTick()` (C-02 fix)
- Try/catch fallback: Chainlink → TWAP → fallbackPrice

### 2. **DWTETHRateFeed.sol**
**Role:** On-chain DWT/ETH rate feed with safety controls

**Key Features:**
- Deviation cap monitoring
- Staleness flag
- Same TickMath fix as DWTPriceOracle (C-02b)

### 3. **RewardDistributor.sol**
**Role:** Fee-to-rewards routing engine

**Key Features:**
- Collects protocol fees (ERC-20 + ETH)
- Swaps tokens to ETH via Layer 2 SwapRouter
- Splits and routes ETH to staking contracts
- TWAP quoter-based `minAmountOut` with 2% slippage tolerance (H-04 fix)

### 4. **FeeSplitter.sol**
**Role:** Multi-destination fee splitter

**Default Split:**
- 40% → Treasury
- 40% → RewardDistributor
- 20% → BuybackAndBurn

**Key Features:**
- Per-token override capability
- `splitAll()` or `splitToken(token)` callable by anyone
- `autoSplit()` for keeper automation

### 5. **BuybackAndBurn.sol**
**Role:** Deflationary buyback mechanism

**Workflow:**
1. FeeSplitter sends 20% of fees here (WETH, USDC, etc.)
2. Keeper calls `executeBuyback(WETH, minDWTOut)`
3. Contract swaps WETH → DWT on Uniswap V3
4. DWT burned via `DWT.burn()` (reduces totalSupply)

**Protections:**
- Cooldown between buybacks (default 1 day)
- `maxSingleBuyback` cap limits price impact
- `minDWTOut` slippage parameter
- TWAP guard validates execution price

### 6. **VeDWT.sol**
**Role:** Vote-escrow token (non-transferable)

**Key Features:**
- Lock durations: 1 week minimum, 4 years maximum
- Cannot shorten existing locks
- Cannot top up expired locks
- veDWT balance decays linearly to zero at expiry
- Governs boost multiplier and governance weight

### 7. **DWalletMultisig.sol**
**Role:** M-of-N multisig for admin key management

**Purpose:** Secure multi-signature wallet for administrative operations.

### 8. **EmergencyPause.sol**
**Role:** Atomic protocol-wide circuit breaker

**Key Features:**
- `pauseAll()` halts all registered contracts in <1 block
- Guardian can ONLY pause (cannot unpause)
- Admin (multisig) required to unpause
- Prevents compromised guardian from resuming exploit

### 9. **DWTBridge.sol**
**Role:** Cross-chain lock-and-mint bridge

**Key Features (C-01 Fix):**
- M-of-N relayer signatures (default 3-of-5)
- 12-hour mandatory execution delay
- Per-relayer nonce tracking prevents signature reuse
- All inbound mints require `requiredSignatures` approvals

---

# 🎁 LAYER 4 — Staking & Rewards

**Purpose:** Advanced staking mechanisms with auto-compounding, ETH rewards, and veDWT-powered boost multipliers.

## Contracts

### 1. **StakingPool.sol** (#4)
**Role:** DWT → DWT auto-compounding pool

**Key Features:**
- Deposit DWT, receive non-transferable **sDWT** shares
- Rewards injected by RewardDistributor
- No claim needed — exchange rate (DWT/sDWT) increases automatically
- Withdraw fee: 0.10% (stays in pool)
- Cooldown: 1 day blocks immediate withdrawal
- MIN_SHARES: 1,000 locked on first deposit (anti-inflation)

**Key Functions:**
- `deposit(dwtAmount)` → mints sDWT
- `withdraw(shares)` → burns sDWT, returns DWT minus fee
- `injectRewards(dwtAmount)` → raises pricePerShare
- `pricePerShare()` → current DWT value of 1 sDWT

### 2. **DWTStaking.sol** (#5)
**Role:** DWT → ETH reward staking

**Key Features:**
- Synthetix-style `rewardPerTokenStored` accounting
- Lock period: 7 days minimum
- ETH rewards pushed by RewardDistributor
- Claim on-demand via `claimETH()`

**Key Functions:**
- `stake(amount)` → deposits DWT, sets lockExpiry
- `unstake(amount)` → returns DWT after lock
- `claimETH()` → sends pending ETH to caller
- `earned(user)` → view pending ETH

### 3. **BoostedStaking.sol**
**Role:** veDWT multiplier boosted staking

**Key Features:**
- Lock DWT for 1 week – 4 years
- Receive veDWT balance that decays linearly
- Boost multiplier: 1x (no lock) → up to **2.5x** (4-year max lock)
- veDWT governs boost, governance weight, and ETH reward share

**Boost Formula:**
```
boosted = min(
    rawStake × 2.5,
    rawStake + (totalLocked × userVeDWT / totalVeDWT) × 1.5
)
```

**Approximate veDWT/DWT Ratios:**
- 1 week → ~0.05% → ~1.00x
- 6 months → ~11.5% → ~1.17x
- 1 year → ~25% → ~1.38x
- 2 years → ~50% → ~1.75x
- 4 years → ~100% → 2.50x

### 4. **RewardDistributor.sol** (#12)
**Role:** Fee token → ETH routing & distribution

**Default Allocation:**
| Destination | Share | Purpose |
|---|---|---|
| DWTStaking | 50% | ETH rewards to DWT stakers |
| StakingPool | 20% | DWT buyback → auto-compound |
| BoostedStaking | 20% | ETH rewards to veDWT holders |
| Treasury | 10% | Protocol reserve |

**Key Functions:**
- `distribute()` — trustless, callable by anyone
- `receiveFeeToken(token, amount)` — pull accepted fees
- `setAllocation(...)` — update split weights (must sum to 10,000 bps)

---

# 🌉 LAYER 5 — Cross-Chain & Advanced DeFi

**Purpose:** Cross-chain infrastructure, flash loans, insurance fund, limit orders, and LP incentives.

## Contracts

### 1. **CrossChainMessenger.sol**
**Role:** Message bus with replay protection

**Key Features:**
- Per-chain nonce prevents replay attacks
- Daily message cap auto-stops anomalous bursts
- 7-day mandatory delay before provider switch (Axelar/LayerZero)
- GUARDIAN can halt all processing in one tx

### 2. **CrossChainStaking.sol**
**Role:** Dual-role (satellite/hub) cross-chain staking

**Key Features:**
- **Lock-until-ACK:** L2 funds locked until mainnet hub confirms stake
- **Emergency withdraw:** after `safetyDelay`, user recovers funds even if bridge unresponsive
- **Credit TTL:** hub credits expire after 30 days without heartbeat
- One codebase, two roles via `isSatellite` flag

### 3. **CrossChainGovernance.sol**
**Role:** L2 vote aggregation with safeguards

**Key Features:**
- L2 votes capped at `maxL2WeightBps` of total
- 24h veto window for governance council
- Only `TALLY_SUBMITTER_ROLE` (multisig) can submit L2 tallies

### 4. **FlashLoan.sol**
**Role:** ERC-3156 compliant flash loan pool

**Key Features:**
- Callback must return `keccak256("ERC3156FlashBorrower.onFlashLoan")`
- Pool balance and fees tracked separately
- 50% cap on single flash loan
- Reentrancy guard prevents recursive loans

### 5. **InsuranceFund.sol**
**Role:** Claims processing with safety caps

**Key Features:**
- State machine: Pending → Approved → Executed (cannot skip approval)
- 48h execution delay after approval
- Per-claim hard cap (20%)
- Rolling 30-day cap (40%) prevents fund drain

### 6. **LimitOrders.sol**
**Role:** EIP-712 signed limit orders with oracle check

**Key Features:**
- Oracle price validation before fill
- Partial fills supported
- Filler fee incentivizes relayers

### 7. **LiquidityIncentive.sol**
**Role:** Uniswap V3 NFT LP staking

**Key Feature (H-03 Fix):**
- Real liquidity fetched on-chain from `positionManager.positions(tokenId)`
- Cannot fake liquidity with type(uint128).max

---

# 💼 LAYER 6 — Treasury Management & Vesting

**Purpose:** Fee holding, distribution, buyback execution, and team/investor token vesting.

## Contracts

### 1. **Treasury.sol**
**Role:** Central fee vault (also in Layer 1)

**See Layer 1 description for full details.**

### 2. **FeeSplitter.sol**
**Role:** Auto-routing between Treasury, Rewards, and Buyback

**See Layer 3 description for full details.**

### 3. **BuybackAndBurn.sol**
**Role:** Executes DWT buyback and burn

**See Layer 3 description for full details.**

### 4. **VestingContract.sol**
**Role:** Multi-beneficiary linear and graded vesting

**Supported Schedules:**
- **Linear vesting** (e.g., 4-year with 1-year cliff for team)
- **Graded vesting** (e.g., monthly tranches for investors)

**Key Features:**
- Non-transferable vesting positions
- Revocable (employee grants) or non-revocable (investor SAFT)
- `release(scheduleId)` for beneficiaries to claim
- `revokeSchedule(scheduleId, treasuryAddress)` returns unvested tokens
- `vestingProgress(scheduleId)` shows 0-10000 bps progress

**Example: Create Team Grant**
```solidity
vesting.createLinearSchedule(
  beneficiary: 0xTeamMember,
  token: dwtTokenAddress,
  amount: 1_000_000 DWT,
  startTime: now,
  cliffDuration: 1 year,
  duration: 4 years,
  revocable: true,
  description: "Team Grant — Alice"
)
```

---

# 🛡️ LAYER 7 — Unified Security Controller

**Purpose:** Centralized security monitoring and enforcement for all layers. Implements the 5 Universal Lock Primitives.

## Contracts

### 1. **Layer7Security.sol**
**Role:** Master security controller

**Key Modules:**
- **Protocol-wide pause state** (`paused()`)
- **Circuit breaker** (`circuitBroken()`)
- **Signer verification** (`isSigner(account)`)
- **Allowlist management** (`allowlisted(account)`)
- **KYC level tracking** (`kycLevel(account)`, `requiredKYCLevel()`)

### 2. **LockEngine.sol**
**Role:** Orchestrates all 5 lock types

**Key Interfaces:**
- `access()` → IAccessController
- `time()` → ITimeLockController
- `state()` → IStateController
- `rateLimit()` → IRateLimiter
- `verification()` → IVerificationEngine

**Key Function:**
```solidity
checkAllLocks(account, role, actionId, layerId, amount)
```

### 3. **AccessController.sol**
**Role:** Role-based access verification

**Functions:**
- `verifyAccess(account, role)`
- `verifyWhitelist(account)`
- `verifyContractOnly(account)`

### 4. **TimeLockController.sol**
**Role:** Cooldown period enforcement

**Functions:**
- `verifyTimeLock(account, actionId)`
- `startCooldown(account, actionId)`

### 5. **StateController.sol**
**Role:** Protocol health monitoring

**Functions:**
- `verifyState(layerId)`
- `setLayerState(layerId, active)`

### 6. **RateLimiter.sol**
**Role:** Transaction volume limits

**Function:**
- `verifyAndUpdateRate(account, actionId, amount)`

### 7. **VerificationEngine.sol**
**Role:** Multi-sig and signature validation

**Functions:**
- `verifySignature(account, hash, signature)`
- `verifySignatureWithNonce(signer, nonce, hash, signature)`
- `isNonceUsed(account, nonce)` → bool
- `getNextNonce(account)` → uint256

### 8. **InvariantChecker.sol**
**Role:** Protocol invariant validation

**Checks:**
- `checkVault(totalAssets, totalShares)` — vault solvency
- `checkToken(supply, minted, burned)` — token consistency
- `checkSolvency(assets, liabilities)` — protocol solvency

---

# 🌐 LAYER 8 — Multichain Bridge

**Purpose:** Cross-chain token bridging (lock-and-mint), remote staking relay, and cross-chain governance.

## Contracts

### 1. **Layer8Bridge.sol**
**Role:** Source chain lock-and-mint bridge

**Supported Providers:** LayerZero + Axelar

**Key Functions:**
- `lockAndSendViaLZ(token, amount, dstChainId, recipient)` — lock tokens, send via LayerZero
- `lockAndSendViaAxelar(token, amount, destChain, recipient)` — lock via Axelar
- `_release(token, recipient, amount)` — release on return bridge

**Message Payload (Lock → Mint):**
```solidity
abi.encode(
  bytes32 remoteToken,   // BridgedToken address (padded)
  bytes   recipient,     // abi.encode(recipientAddress)
  uint256 amount,
  uint64  nonce
)
```

### 2. **BridgedToken.sol**
**Role:** Destination chain minted token

**Key Functions:**
- `lzReceive(srcChainId, srcAddress, nonce, payload)` — mint from LayerZero message
- `execute(command, data)` — mint from Axelar message
- `burnAndSendViaLZ(token, amount, dstChainId, recipient)` — burn to unlock on source
- `burnAndSendViaAxelar(token, amount, destination, recipient)` — burn via Axelar

**Deployment Steps:**
1. Deploy Layer8Bridge on source chain
2. Deploy BridgedToken on destination chain
3. Set trusted remote paths (bidirectional)
4. Add supported tokens and mappings

### 3. **CrossChainStaking.sol**
**Role:** Remote stake relay (Hub + Satellite architecture)

**Architecture:**
```
REMOTE CHAIN (Satellite)              HOME CHAIN (Hub)
─────────────────────────────         ─────────────────────────
User stakes → StakingSatellite        StakingHub
  └─[LZ msgType=1]──────────────►      credits balance, accrues rewards
User requests unstake                 _receiveUnstakeRequest()
  └─[LZ msgType=2]──────────────►      deducts stake, queues withdrawal
                                   ◄── lzSend(withdrawal) ────────
StakingSatellite.lzReceive() → transfer user
```

**Reward Model:**
- `accRewardPerToken` accumulates globally each second
- Each `StakeInfo` stores `rewardDebt` snapshot
- Pending = `(amount × (acc − debt)) / 1e18`
- Rewards harvested automatically on stake/unstake

### 4. **CrossChainGovernance.sol**
**Role:** Remote proposal voting (Hub + Satellite)

**Architecture:**
```
HOME CHAIN (Hub)                      REMOTE CHAINS (Satellites)
───────────────────────────           ─────────────────────────────────
GovernanceHub                         GovernanceSatellite (×N)
  propose()                             lzReceive(msgType=1) → stores proposal
  broadcastProposal() ──[LZ]────────►   castVote() — local token-weighted vote
  castVote()                            commitVotes() ──[LZ msgType=2]────────►
  lzReceive(msgType=2) ← aggregates     (after voting window closes)
  finalize: state() → Succeeded/Defeated
  execute()
  relayResult() ──[LZ msgType=3]────►   lzReceive(msgType=3) → stores result
```

**Message Types:**
| Type | Direction | Purpose |
|---|---|---|
| 1 | Hub → Satellite | Broadcast new proposal |
| 2 | Satellite → Hub | Commit aggregated vote tally |
| 3 | Hub → Satellite | Relay execution result |

### 5. **IAxelarInterfaces.sol**
**Role:** Axelar gateway interfaces

### 6. **ILayerZeroEndpoint.sol**
**Role:** LayerZero endpoint interfaces

---

# 🏦 LAYER 9 — Ecosystem Extensions

**Purpose:** Lending markets, NFT memberships, IDO launchpad, and affiliate rewards.

## Contracts

### 1. **LendingMarket.sol**
**Role:** Borrow stablecoins against DWT collateral

**Key Parameters:**
- LTV: 70%
- Liquidation threshold: 85%
- Liquidation bonus: 5%
- Interest rate: ~2% APY (per-block linear)
- Protocol fee: 10% of interest

**Health Factor:**
```
healthFactor = (collateralValue × 85%) / principal
Must be ≥ 1.0 to stay solvent
```

**Key Functions:**
- `deposit(collateralAmount)` — lock DWT
- `borrow(principalAmount)` — mint stablecoin loan
- `repay()` — pay back loan
- `withdraw()` — reclaim collateral if healthy
- `liquidate(borrower)` — liquidate underwater positions

### 2. **NFTMembership.sol**
**Role:** Tiered ERC-721 access passes

**Tiers:**
| Tier | Name | ETH Price | DWT Price | Max Supply |
|---|---|---|---|---|
| 0 | Bronze | 0.05 ETH | 100 DWT | 1,000 |
| 1 | Silver | 0.15 ETH | 500 DWT | 500 |
| 2 | Gold | 0.50 ETH | 2,000 DWT | 200 |
| 3 | Platinum | 1.50 ETH | 5,000 DWT | 50 |

**Access Gate API:**
```solidity
bool ok = nftMembership.hasAccess(user, minTier);
uint8 t = nftMembership.activeTier(user); // 255 = none
```

### 3. **Launchpad.sol**
**Role:** IDO platform with DWT-tier allocations

**Tier Multipliers:**
| Tier | Max Commit Multiplier |
|---|---|
| Bronze | 1× |
| Silver | 3× |
| Gold | 8× |
| Platinum | 20× |

**Phases:** `pending → whitelist (DWT gated) → public → finalization → claim/refund`

**Key Functions:**
- `createProject(...)` — setup new IDO
- `commit(projectId, amount)` — participate in sale
- `claimTokens(projectId)` — claim allocated tokens
- `refund(projectId)` — claim refund if oversubscribed

### 4. **AffiliateRewards.sol**
**Role:** Multi-level referral tracking

**Commission Structure:**
| Level | Relationship | Default Rate |
|---|---|---|
| L1 | Direct referrer | 5% |
| L2 | Referrer's referrer | 2% |
| L3 | Grandparent | 1% |

**Special:** Platinum tier affiliates earn 2× multiplier on all commissions.

**Key Functions:**
- `registerReferral(code, referrer)` — register referral code
- `trackActivity(user, activityType, feeAmount)` — record referred activity
- `claimRewards()` — claim accumulated commissions

---

# 📈 LAYER 10 — Advanced DeFi Products

**Purpose:** Derivatives (options, perpetuals), prediction markets, and yield vaults.

## Contracts

### 1. **DWTOracle.sol**
**Role:** Oracle interface and implementations

**Three Implementations:**
1. **IDWTOracle** — Interface (implement for any price source)
2. **DWTMockOracle** — Testing; owner can `setPrice(uint256)`
3. **DWTChainlinkOracle** — Wraps Chainlink AggregatorV3; enforces 1h staleness check

### 2. **DWTOptions.sol**
**Role:** European-style options (calls & puts) on DWT

**Key Features:**
- Writers lock USDC collateral equal to `strike × amount`
- Buyers pay USDC premium set by writer
- Exercisable at/after expiry (European)
- Cash-settled in USDC (no DWT changes hands)
- Protocol fee: 0.30% (30 bps) from premiums

**Key Functions:**
```solidity
writeOption(type, strike, expiry, amount, premium) → id
buyOption(id)
exercise(id)          // buyer calls after expiry
expireOption(id)      // anyone calls; returns collateral to writer
cancelOption(id)      // writer cancels unsold option
```

### 3. **DWTPerpetuals.sol**
**Role:** Perpetual futures on DWT/USD

**Key Features:**
- Leverage up to 10×
- LONG or SHORT positions
- Funding rate paid every 8 hours (larger side pays smaller side)
- Liquidation when margin < maintenance margin (5%)
- Liquidator earns 1% of margin; protocol earns 0.30% opening fee
- Insurance fund absorbs bad debt

**Key Functions:**
```solidity
openPosition(side, sizeUsd, margin) → id
closePosition(id)
liquidate(id)
addMargin(id, amount)
settleFunding()          // anyone can update funding
getPositionHealth(id)    // view remaining margin
```

### 4. **DWTPredictionMarket.sol**
**Role:** Binary and multi-outcome prediction markets (up to 16 outcomes)

**Key Features:**
- Admin creates markets with N outcome labels and deadline
- Users buy shares at **1 USDC each** for any outcome
- Designated resolver calls `resolveMarket()` after deadline
- Winners claim pro-rata share of total pool (minus 2% fee)
- Markets cancelled if resolver misses `resolutionDeadline`; refunds available

**Key Functions:**
```solidity
createMarket(question, labels[], deadline, resolutionDeadline, resolver)
buyShares(marketId, outcome, shares)
resolveMarket(marketId, winningOutcome)     // resolver only
cancelMarket(marketId)                     // anyone after deadline
claimWinnings(marketId)
claimRefund(marketId, outcome)             // cancelled markets
getImpliedProbability(marketId, outcome)   // bps
```

### 5. **DWTYieldVault.sol**
**Role:** ERC-4626 tokenized yield vault

**Key Features:**
- Depositors receive `vDWT` shares representing proportional ownership
- Share price rises as yield is reported
- **10% performance fee** on profits
- **0.5% annual management fee** charged to treasury
- Instant withdrawals below `instantWithdrawLimit` from idle buffer
- Larger withdrawals queued; strategy manager processes after sourcing liquidity

**Key Functions:**
```solidity
deposit(assets, receiver)
withdraw(assets, receiver, owner)
redeem(shares, receiver, owner)
reportYield(grossYield)                  // strategy manager
processWithdrawal(requestId)             // strategy manager
```

---

# 🔗 Cross-Layer Integration Map

## How Layers Connect

```
┌─────────────────────────────────────────────────────────────────┐
│                    LAYER 0: Registry                            │
│  ProtocolRegistry tracks all layer addresses                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    LAYER 7: Security                            │
│  Layer7Security + LockEngine enforce 5 universal locks          │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  LAYER 1     │    │  LAYER 2     │    │  LAYER 3     │
│  Core Token  │    │  DEX         │    │  Oracles     │
│  Treasury    │    │  AMM         │    │  Bridge      │
└──────────────┘    └──────────────┘    └──────────────┘
        │                   │                    │
        └───────────────────┼────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    LAYER 4: Staking                             │
│  Auto-compound pools, ETH rewards, veDWT boost                  │
└─────────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│  LAYER 5     │   │  LAYER 6     │   │  LAYER 8     │
│  Cross-Chain │   │  Treasury    │   │  Multichain  │
│  Flash Loans │   │  Vesting     │   │  Bridge      │
└──────────────┘   └──────────────┘   └──────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│  LAYER 9     │   │  LAYER 10    │   │  Frontend    │
│  Ecosystem   │   │  Derivatives │   │  Dashboard   │
│  Lending     │   │  Options     │   │  UI/UX       │
│  Launchpad   │   │  Perps       │   │              │
└──────────────┘   └──────────────┘   └──────────────┘
```

## Example Flow: User Swaps DWT for ETH

1. **Layer 2 (SwapRouter)** receives swap request
2. **Layer 7 (SecurityGated)** checks protocol not paused
3. **Layer 1 (FeeRouter)** calculates fee based on user's DWT balance snapshot
4. **Layer 2 (PriceOracle)** validates slippage vs oracle price
5. **Layer 2 (SwapRouter)** executes swap through registered pool
6. **Layer 3 (FeeSplitter)** splits collected fee: 40% Treasury, 40% Rewards, 20% Buyback
7. **Layer 4 (RewardDistributor)** receives rewards portion, swaps to ETH, distributes to staking pools
8. **Layer 6 (Treasury)** receives treasury portion for operations/grants
9. **Layer 3 (BuybackAndBurn)** receives buyback portion, buys DWT on Uniswap, burns it

---

# 📊 Summary Table

| Layer | Name | Primary Purpose | Key Contracts | Risk Level |
|-------|------|-----------------|---------------|------------|
| **0** | Registry | Root of Trust | ProtocolRegistry, NetworkConfig | Low |
| **1** | Core Token | Economics & Governance | DWTToken, Treasury, Governor | Medium-High |
| **2** | DEX | Decentralized Exchange | SwapRouter, FeeRouter, PriceOracle | High |
| **3** | Oracles | Price Feeds & Bridge | DWTPriceOracle, DWTBridge, EmergencyPause | High |
| **4** | Staking | Rewards & Boosting | StakingPool, DWTStaking, BoostedStaking | Medium |
| **5** | Advanced DeFi | Cross-Chain & Flash Loans | CrossChainMessenger, FlashLoan, InsuranceFund | High-Critical |
| **6** | Treasury | Fee Management | Treasury, FeeSplitter, VestingContract | Medium |
| **7** | Security | 5 Universal Locks | Layer7Security, LockEngine, InvariantChecker | Critical |
| **8** | Multichain | Bridge & Governance | Layer8Bridge, BridgedToken, CrossChainGovernance | Critical |
| **9** | Ecosystem | Lending & Launchpad | LendingMarket, NFTMembership, Launchpad | High |
| **10** | Derivatives | Options & Perps | DWTOptions, DWTPerpetuals, DWTPredictionMarket | Very High |

---

# 🎯 Security Philosophy

The dWallet protocol implements **defense in depth** through:

1. **5 Universal Lock Primitives** applied to every sensitive operation
2. **Layer 7 centralized monitoring** with protocol-wide pause capability
3. **Invariant checking** to detect and prevent logical inconsistencies
4. **Time locks** on all critical upgrades (48-hour default)
5. **Multi-sig requirements** for sensitive operations (M-of-N signatures)
6. **Rate limiting** to prevent abnormal transaction volumes
7. **Circuit breakers** for emergency shutdown
8. **Cross-chain safeguards** (lock-until-ACK, credit TTL, veto windows)

---

# 🚀 Deployment Order

The recommended deployment sequence is:

1. **Layer 7** (Security) — deploy first as it's referenced by all others
2. **Layer 0** (Registry) — root of trust for address tracking
3. **Layer 1** (Core Token) — foundational token and treasury
4. **Layer 2** (DEX) — core exchange functionality
5. **Layer 3** (Oracles & Bridge) — price feeds and cross-chain
6. **Layer 4** (Staking) — rewards and incentives
7. **Layer 5** (Advanced DeFi) — cross-chain infrastructure
8. **Layer 6** (Treasury Management) — fee routing and vesting
9. **Layer 8** (Multichain Bridge) — cross-chain token transfers
10. **Layer 9** (Ecosystem) — lending and launchpad
11. **Layer 10** (Derivatives) — advanced products

---

# 📝 License

MIT License — dWallet v5 Protocol

---

*This document provides a comprehensive overview of all smart contracts across the 10-layer architecture. For implementation details, refer to the individual contract README files and NatSpec comments.*
