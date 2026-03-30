# Layer 10 — Advanced DeFi Smart Contracts

## Contracts

| File                      | Description                                        |
| ------------------------- | -------------------------------------------------- |
| `DWTOracle.sol`           | Oracle interface + Chainlink wrapper + Mock oracle |
| `DWTOptions.sol`          | European calls & puts on DWT, cash-settled in USDC |
| `DWTPerpetuals.sol`       | Perpetual futures with funding rate & liquidation  |
| `DWTPredictionMarket.sol` | Multi-outcome prediction markets + resolver        |
| `DWTYieldVault.sol`       | ERC-4626 yield vault with withdrawal queue & fees  |
| `Layer10Deploy.s.sol`     | Foundry deployment script                          |

---

## DWTOptions.sol

**European-style options (calls & puts) on DWT, settled in USDC.**

- Writers lock USDC collateral equal to `strike × amount`.
- Buyers pay a USDC premium set by the writer.
- Options are exercisable at/after expiry (European).
- Settlement is cash-settled — no DWT changes hands.
- Protocol takes `feeBps` (default 0.30%) from premiums.

**Key functions:**

```
writeOption(type, strike, expiry, amount, premium) → id
buyOption(id)
exercise(id)          // buyer calls after expiry
expireOption(id)      // anyone calls; returns collateral to writer
cancelOption(id)      // writer cancels unsold option
```

---

## DWTPerpetuals.sol

**Perpetual futures on DWT/USD with leverage up to 10×.**

- Traders post USDC margin and go LONG or SHORT.
- Funding rate paid every 8 hours between longs/shorts (whichever side is larger pays).
- Positions liquidated when remaining margin < maintenance margin (5%).
- Liquidators earn 1% of margin; protocol earns 0.30% opening fee.
- Insurance fund absorbs bad debt from underwater positions.

**Key functions:**

```
openPosition(side, sizeUsd, margin) → id
closePosition(id)
liquidate(id)
addMargin(id, amount)
settleFunding()          // anyone can call to update funding
getPositionHealth(id)    // view remaining margin
```

---

## DWTPredictionMarket.sol

**Binary and multi-outcome (up to 16) prediction markets.**

- Admin creates markets with N outcome labels and a deadline.
- Users buy shares at **1 USDC each** for any outcome.
- Designated resolver calls `resolveMarket()` after deadline.
- Winners claim pro-rata share of total pool (minus 2% fee).
- Markets cancelled if resolver misses `resolutionDeadline`; refunds available.

**Key functions:**

```
createMarket(question, labels[], deadline, resolutionDeadline, resolver)
buyShares(marketId, outcome, shares)
resolveMarket(marketId, winningOutcome)     // resolver only
cancelMarket(marketId)                     // anyone after deadline
claimWinnings(marketId)
claimRefund(marketId, outcome)             // cancelled markets
getImpliedProbability(marketId, outcome)   // bps
```

---

## DWTYieldVault.sol (ERC-4626)

**Tokenised yield vault for DWT depositors.**

- Depositors receive `vDWT` shares representing proportional ownership.
- Share price rises as yield is reported by the strategy manager.
- **10% performance fee** and **0.5% annual management fee** charged to treasury.
- Withdrawals below `instantWithdrawLimit` are instant from idle buffer.
- Larger withdrawals are queued; strategy manager processes them after sourcing liquidity.

**Key functions:**

```
deposit(assets, receiver)
withdraw(assets, receiver, owner)
redeem(shares, receiver, owner)
reportYield(grossYield)                  // strategy manager
processWithdrawal(requestId)             // strategy manager
```

---

## Oracle

Three oracle implementations are provided:

1. **`IDWTOracle`** — interface (implement for any price source).
2. **`DWTMockOracle`** — for testing; owner can call `setPrice(uint256)`.
3. **`DWTChainlinkOracle`** — wraps a Chainlink AggregatorV3; enforces 1-hour staleness check; normalises to 18 decimals.

---

## Dependencies

```
@openzeppelin/contracts ^5.x
forge-std (for deploy script)
```

Install:

```bash
forge install OpenZeppelin/openzeppelin-contracts
forge install foundry-rs/forge-std
```

## Deploy

```bash
cp .env.example .env  # fill in env vars
forge script script/Layer10Deploy.s.sol:Layer10DeployScript \
  --rpc-url $RPC_URL --broadcast --verify
```
