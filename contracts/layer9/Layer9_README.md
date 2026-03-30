# Layer 9 — Ecosystem Extensions

## Contract Overview

| File                   | Contracts          | Purpose                                             |
| ---------------------- | ------------------ | --------------------------------------------------- |
| `LendingMarket.sol`    | `LendingMarket`    | Borrow stablecoins against DWT collateral           |
| `NFTMembership.sol`    | `NFTMembership`    | Tiered ERC-721 access passes (Bronze → Platinum)    |
| `Launchpad.sol`        | `Launchpad`        | IDO with DWT-tier allocations + vesting             |
| `AffiliateRewards.sol` | `AffiliateRewards` | Multi-level referral tracking + reward distribution |

---

## 1. LendingMarket — Borrow Against DWT

### Key Parameters

| Parameter             | Default                    |
| --------------------- | -------------------------- |
| LTV                   | 70%                        |
| Liquidation threshold | 85%                        |
| Liquidation bonus     | 5%                         |
| Interest rate         | ~2% APY (per-block linear) |
| Protocol fee          | 10% of interest            |

### Health Factor

```
healthFactor = (collateralValue × 85%) / principal  ≥ 1.0 to stay solvent
```

---

## 2. NFTMembership — Tiered Access Passes

| Tier | Name     | ETH Price | DWT Price | Max Supply |
| ---- | -------- | --------- | --------- | ---------- |
| 0    | Bronze   | 0.05 ETH  | 100 DWT   | 1,000      |
| 1    | Silver   | 0.15 ETH  | 500 DWT   | 500        |
| 2    | Gold     | 0.50 ETH  | 2,000 DWT | 200        |
| 3    | Platinum | 1.50 ETH  | 5,000 DWT | 50         |

### Access Gate API

```solidity
bool ok = nftMembership.hasAccess(user, minTier);
uint8 t  = nftMembership.activeTier(user); // 255 = none
```

---

## 3. Launchpad — IDO with DWT Tiers

| Tier     | Max Commit Multiplier |
| -------- | --------------------- |
| Bronze   | 1×                    |
| Silver   | 3×                    |
| Gold     | 8×                    |
| Platinum | 20×                   |

Phases: `pending → whitelist (DWT gated) → public → finalization → claim/refund`

---

## 4. AffiliateRewards — Referral Tracking

| Level | Relationship        | Default Rate |
| ----- | ------------------- | ------------ |
| L1    | Direct referrer     | 5%           |
| L2    | Referrer's referrer | 2%           |
| L3    | Grandparent         | 1%           |

Platinum tier affiliates earn 2× multiplier on all commissions.

---

## Contract Interaction Map

```
NFTMembership
    ├──► LendingMarket      (hasAccess gate)
    ├──► Launchpad          (activeTier → allocation multiplier)
    └──► AffiliateRewards   (activeTier → commission multiplier)
              ├──► LendingMarket  (recordActivity on fee events)
              └──► Launchpad      (recordActivity on IDO commits)
```
