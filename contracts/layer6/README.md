# dWallet Layer 6 — Treasury & Fees

Four production-grade contracts that form the financial backbone of the dWallet
protocol: where fees are held, how they are split, how DWT is made deflationary,
and how team/investor tokens are distributed over time.

---

## Contracts

| File                  | Contract          | Role                                                                                   |
| --------------------- | ----------------- | -------------------------------------------------------------------------------------- |
| `Treasury.sol`        | `Treasury`        | Central fee vault. All protocol revenue flows here. Governance controls distribution.  |
| `FeeSplitter.sol`     | `FeeSplitter`     | Sits between FeeRouter and Treasury. Auto-routes fees to Treasury / Rewards / Buyback. |
| `BuybackAndBurn.sol`  | `BuybackAndBurn`  | Receives fee tokens, buys DWT on Uniswap, burns it permanently.                        |
| `VestingContract.sol` | `VestingContract` | Multi-beneficiary linear and graded vesting for team, advisors, investors.             |

---

## Architecture: how they connect

```
DWalletFeeRouter
    │   (protocol swap fees — DWT, WETH, USDC)
    ▼
FeeSplitter ──────────────────────────────────────────────────────────────┐
    │  40% → Treasury (governance-controlled spend + staking pool funding) │
    │  40% → RewardDistributor → DWTStaking (ETH rewards for stakers)      │
    └─ 20% → BuybackAndBurn → Uniswap V3 → DWT purchased → burned         │
                                                                           │
Treasury ◄─────────────────────────────────────────────────────────────────┘
    │  fundStakingPool()  → StakingPool (DWT rewards for DWT stakers)
    │  fundETHStaking()   → DWTStaking (ETH rewards)
    │  spendFunds()       → Grants, operations, dev spending
    └  (funds) ──────────► VestingContract (team / investor token schedules)
```

---

## Quick start

### Install

```bash
npm install
```

### Compile

```bash
npx hardhat compile
```

### Run local node + deploy

```bash
# Terminal 1
npx hardhat node

# Terminal 2
npx hardhat run scripts/deploy-layer6.js --network localhost
```

### Deploy to Sepolia

```bash
cp .env.example .env
# Fill in PRIVATE_KEY, SEPOLIA_RPC_URL, ETHERSCAN_API_KEY
npx hardhat run scripts/deploy-layer6.js --network sepolia
```

---

## Treasury

The Treasury is the most privileged contract in the protocol.
It uses a layered role model so no single key can drain it.

### Roles

| Role                 | Who holds it         | What they can do                                                                                    |
| -------------------- | -------------------- | --------------------------------------------------------------------------------------------------- |
| `DEFAULT_ADMIN_ROLE` | Multisig             | Grant/revoke all roles                                                                              |
| `GOVERNOR_ROLE`      | TimelockController   | `spendFunds`, `batchSpendFunds`, `fundStakingPool`, `fundETHStaking`, `setBudget`, `approveSpender` |
| `ADMIN_ROLE`         | Multisig             | Emergency withdraw only                                                                             |
| `SPENDER_ROLE`       | BuybackAndBurn, etc. | `pullBudget` up to their cap                                                                        |
| `DEPOSITOR_ROLE`     | FeeRouter, Paymaster | Notify incoming deposits (no spend)                                                                 |
| `GUARDIAN_ROLE`      | Security bot         | Pause only                                                                                          |

### Budget system

Governance can set a weekly cap for any SPENDER_ROLE contract:

```javascript
// Allow BuybackAndBurn to pull up to 50,000 DWT per week
await treasury.setBudget(
  buybackAddr,
  dwtTokenAddr,
  ethers.parseEther('50000'),
  7 * 24 * 3600, // 1 week
)
```

### Spend categories

Every outbound transfer is tagged with a category for on-chain auditing:
`STAKING_REWARD`, `BUYBACK`, `GRANT`, `OPERATIONS`, `VESTING`, `BRIDGE_FEE`, `OTHER`

---

## FeeSplitter

### Default split (governance-updatable)

```
40% → Treasury
40% → RewardDistributor
20% → BuybackAndBurn
```

### Per-token override example

Route all USDC directly to Treasury (100%), skip rewards and buyback:

```javascript
await feeSplitter.setTokenSplit(
  usdcAddr,
  10_000, // 100% treasury
  0, // 0% rewards
  0, // 0% buyback
)
```

### Triggering splits

```javascript
await feeSplitter.splitAll() // anyone, all tokens
await feeSplitter.splitToken(token) // anyone, single token
await feeSplitter.autoSplit() // keeper only, skips dust
```

---

## BuybackAndBurn

### How it works

1. FeeSplitter sends 20% of fees here (WETH, USDC, etc.)
2. Keeper calls `executeBuyback(WETH, 0, minDWTOut)`
3. Contract swaps WETH → DWT on Uniswap V3
4. DWT is burned via `DWT.burn()` (reduces `totalSupply`)
5. Stats updated: `totalDWTBurned`, `totalBuybackCount`

### Add WETH as buyback input (mainnet setup)

```javascript
await buyback.addInputToken(
  wethAddress,
  3000, // 0.3% Uniswap pool fee
  dwtWethPool, // TWAP pool for sandwich protection
  ethers.parseEther('0.1'), // 0.1 WETH minimum before buyback
)
```

### Protections

- Cooldown between buybacks (default 1 day) — prevents MEV timing exploits
- `maxSingleBuyback` cap — limits price impact per execution
- `minDWTOut` slippage parameter — protects against sandwich attacks
- TWAP guard — validates execution price against 30-min oracle

---

## VestingContract

### Create a team grant (4-year linear, 1-year cliff)

```javascript
// First: approve the VestingContract to pull DWT
await dwtToken.approve(vestingContract.address, ethers.parseEther('1000000'))

// Then: create the schedule
const scheduleId = await vesting.createLinearSchedule(
  '0xTeamMemberAddress', // beneficiary
  dwtTokenAddress, // token
  ethers.parseEther('1000000'), // 1,000,000 DWT total
  0, // startTime (0 = now)
  365 * 24 * 3600, // cliffDuration: 1 year
  4 * 365 * 24 * 3600, // duration: 4 years
  true, // revocable (employee grant)
  'Team Grant — Alice — Q1 2025',
)
```

### Create an investor schedule (monthly tranches, 6-month cliff)

```javascript
await vesting.createGradedSchedule(
  '0xInvestorAddress',
  dwtTokenAddress,
  ethers.parseEther('5000000'), // 5M DWT
  0,
  6 * 30 * 24 * 3600, // 6-month cliff
  24 * 30 * 24 * 3600, // 24-month total
  30 * 24 * 3600, // monthly slices
  false, // non-revocable (investor SAFT)
  'Seed Round — Investor B',
)
```

### Beneficiary claims their tokens

```javascript
// Claim a specific schedule
await vesting.release(scheduleId)

// Claim all schedules at once
await vesting.releaseAll(beneficiaryAddress)
```

### Check what's claimable

```javascript
const releasable = await vesting.releasableAmount(scheduleId)
const summary = await vesting.getBeneficiarySummary(beneficiaryAddress)
const progress = await vesting.vestingProgress(scheduleId) // 0-10000 bps
```

### Revoke a grant (returns unvested tokens to Treasury)

```javascript
await vesting.revokeSchedule(scheduleId, treasuryAddress)
```

---

## Post-deploy checklist

- [ ] Point `DWalletFeeRouter.treasury` → `FeeSplitter` address
- [ ] Register WETH and USDC as fee tokens in `FeeSplitter`
- [ ] Register WETH and USDC as buyback inputs in `BuybackAndBurn`
- [ ] Set `maxSingleBuyback` to a reasonable value for expected volume
- [ ] Set `Treasury.setBudget` for `BuybackAndBurn`
- [ ] Set `RewardDistributor` address in `FeeSplitter` (from extra-contracts zip)
- [ ] Create team and investor vesting schedules
- [ ] Transfer `ADMIN_ROLE` and `GUARDIAN_ROLE` to dedicated addresses
- [ ] Audit all four contracts before mainnet launch

---

## Dependencies

```json
{
  "@openzeppelin/contracts": "^5.0.0",
  "hardhat": "^2.22.0"
}
```

---

## License

MIT
