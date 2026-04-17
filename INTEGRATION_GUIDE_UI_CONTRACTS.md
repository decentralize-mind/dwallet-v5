# 📘 COMPREHENSIVE UI ↔ CONTRACT INTEGRATION GUIDE

**Generated:** April 17, 2026  
**Network:** Base Sepolia (Chain ID: 84532)  
**Status:** Production-Ready (Testnet)

---

## 📊 DEPLOYED CONTRACTS REGISTRY

### Layer 1 - Governance & Token
| Contract | Address | Explorer | UI Component |
|----------|---------|----------|--------------|
| DWT Token | `0xe149b32b97384131204C86a23459b544498BC46A` | [View](https://sepolia.basescan.org/address/0xe149b32b97384131204C86a23459b544498BC46A) | Dashboard, All DeFi Panels |
| Timelock | `0x2255a32202f4356129F81D862231DB064508e7aB` | [View](https://sepolia.basescan.org/address/0x2255a32202f4356129F81D862231DB064508e7aB) | Settings (Governance) |
| Governor | `0x68863af6C056C8672F9199f16024FD5dB445A84B` | [View](https://sepolia.basescan.org/address/0x68863af6C056C8672F9199f16024FD5dB445A84B) | Settings (Voting) |
| Security Controller | `0x813b537A21bF5AC6967E870db47Ec2770651B11F` | [View](https://sepolia.basescan.org/address/0x813b537A21bF5AC6967E870db47Ec2770651B11F) | All (SecurityGated) |
| Lock Engine | `0x059327A069Ba66A74ecF21fde8c1c0D2915e0DB3` | [View](https://sepolia.basescan.org/address/0x059327A069Ba66A74ecF21fde8c1c0D2915e0DB3) | All (Lock Primitives) |

### Layer 3 - Oracles, Bridge & Emergency
| Contract | Address | Explorer | UI Component |
|----------|---------|----------|--------------|
| Price Oracle | `0xec9cfD7103F22aFCa171D5b45b18a13D1016A393` | [View](https://sepolia.basescan.org/address/0xec9cfD7103F22aFCa171D5b45b18a13D1016A393) | Dashboard, Limit Orders |
| Emergency Pause | `0xC52961a1b024A7561b495C3881D2C9f668733f79` | [View](https://sepolia.basescan.org/address/0xC52961a1b024A7561b495C3881D2C9f668733f79) | Settings (Emergency) |
| DWT Bridge | `0x351A4A9Ccbd1f2DEd13250E5A6d5D0cE668a7c45` | [View](https://sepolia.basescan.org/address/0x351A4A9Ccbd1f2DEd13250E5A6d5D0cE668a7c45) | DApps (Bridge) |
| Fee Splitter | `0xb28841908e1Fdf4AC8369C9a947Bb6e1DFCEB059` | [View](https://sepolia.basescan.org/address/0xb28841908e1Fdf4AC8369C9a947Bb6e1DFCEB059) | DeFi (Fee Distribution) |
| Buyback & Burn | `0x776bB4C7E2c8fd31a086A9244a8f326b42a3DdFF` | [View](https://sepolia.basescan.org/address/0x776bB4C7E2c8fd31a086A9244a8f326b42a3DdFF) | Dashboard (Tokenomics) |
| veDWT | `0xbf26241dba953f1caC106773858f178f1fb5e40C` | [View](https://sepolia.basescan.org/address/0xbf26241dba953f1caC106773858f178f1fb5e40C) | Staking (Vote-Escrow) |
| Multisig | `0xD87820cd302B7454C7eAa1268a9EF04721AB4370` | [View](https://sepolia.basescan.org/address/0xD87820cd302B7454C7eAa1268a9EF04721AB4370) | Settings (Admin) |
| Reward Distributor | `0xE82C39Ef5b61eC69718775687AA337ab726e0e66` | [View](https://sepolia.basescan.org/address/0xE82C39Ef5b61eC69718775687AA337ab726e0e66) | Staking (Rewards) |

### Layer 4 - Staking
| Contract | Address | Explorer | UI Component |
|----------|---------|----------|--------------|
| Staking Pool | `0xF84180615134D9291887063EC4551daDaC3Da792` | [View](https://sepolia.basescan.org/address/0xF84180615134D9291887063EC4551daDaC3Da792) | DeFi → Stake Tab |
| DWT Staking | `0xd8a08Fd138E4E8c3362556CCa2BFf443E6BcDbE3` | [View](https://sepolia.basescan.org/address/0xd8a08Fd138E4E8c3362556CCa2BFf443E6BcDbE3) | DeFi → Stake Tab |

### Layer 5 - Advanced DeFi (Phase 1 & 2)
| Contract | Address | Explorer | UI Component |
|----------|---------|----------|--------------|
| CrossChain Messenger | `0x64f3fFdE0bbA86e072a2595Cd550AeC44a1e0e38` | [View](https://sepolia.basescan.org/address/0x64f3fFdE0bbA86e072a2595Cd550AeC44a1e0e38) | DApps (Cross-Chain) |
| Flash Loan | `0x468772f20864403A0071690ef8c620D9E02BD649` | [View](https://sepolia.basescan.org/address/0x468772f20864403A0071690ef8c620D9E02BD649) | DeFi → Flash Loan Tab |
| Insurance Fund | `0x8ba2Bb332764217079DFFb280dD70C8B351B5770` | [View](https://sepolia.basescan.org/address/0x8ba2Bb332764217079DFFb280dD70C8B351B5770) | DeFi → Insurance Tab |
| Limit Orders | `0x924B1A7846456e9de97A7E952e756daF4A995b3e` | [View](https://sepolia.basescan.org/address/0x924B1A7846456e9de97A7E952e756daF4A995b3e) | DeFi → Limit Orders Tab |
| Liquidity Incentive | `0x1145848222450fe6669716f7AF5cdf6EeF03fF34` | [View](https://sepolia.basescan.org/address/0x1145848222450fe6669716f7AF5cdf6EeF03fF34) | DeFi → Rewards Tab |
| Test Price Oracle | `0x22830a8c7fb402517809F79D242A57Fb1BBA2b40` | [View](https://sepolia.basescan.org/address/0x22830a8c7fb402517809F79D242A57Fb1BBA2b40) | DeFi → Limit Orders Tab |

### Layer 7 - Security
| Contract | Address | Explorer | UI Component |
|----------|---------|----------|--------------|
| Security Controller | `0x20d859c9EB3FA612C604213F74dcC6Ae49Cd040c` | [View](https://sepolia.basescan.org/address/0x20d859c9EB3FA612C604213F74dcC6Ae49Cd040c) | All (SecurityGated) |

### Layer 8 - Cross-Chain Bridge
| Contract | Address | Explorer | UI Component |
|----------|---------|----------|--------------|
| Layer8 Bridge | `0x778bf751DE7D18A3ff683d9d644EA686146f726f` | [View](https://sepolia.basescan.org/address/0x778bf751DE7D18A3ff683d9d644EA686146f726f) | DApps (Bridge) |
| Staking Hub | `0x8ed1B79D9200D2fB7B93D171a1e38bA274ea7894` | [View](https://sepolia.basescan.org/address/0x8ed1B79D9200D2fB7B93D171a1e38bA274ea7894) | DeFi (Cross-Chain Stake) |
| Governance Hub | `0xd2644bf0382b0d475C0b19D991d73aa8EeD169fc` | [View](https://sepolia.basescan.org/address/0xd2644bf0382b0d475C0b19D991d73aa8EeD169fc) | Settings (Cross-Chain Gov) |
| Bridged Token (bDWT) | `0xb2f465FB0735c18c49c4e240e210593d875C94d3` | [View](https://sepolia.basescan.org/address/0xb2f465FB0735c18c49c4e240e210593d875C94d3) | Dashboard (Bridged Assets) |

### Layer 9 - Ecosystem
| Contract | Address | Explorer | UI Component |
|----------|---------|----------|--------------|
| Security | `0x813b537A21bF5AC6967E870db47Ec2770651B11F` | [View](https://sepolia.basescan.org/address/0x813b537A21bF5AC6967E870db47Ec2770651B11F) | All (SecurityGated) |
| Lock Engine | `0x059327A069Ba66A74ecF21fde8c1c0D2915e0DB3` | [View](https://sepolia.basescan.org/address/0x059327A069Ba66A74ecF21fde8c1c0D2915e0DB3) | All (Lock Primitives) |
| Access Control | `0xD2211242548115134607638E19ADb3271B31506b` | [View](https://sepolia.basescan.org/address/0xD2211242548115134607638E19ADb3271B31506b) | Settings (Permissions) |
| Lending | `0xcbBc5E87BDdbD6A1346FD635efDB23C0cB944794` | [View](https://sepolia.basescan.org/address/0xcbBc5E87BDdbD6A1346FD635efDB23C0cB944794) | DeFi → Lend Tab |
| NFT | `0x74297Fa47E6103148D3A4119d7B00C6a94B927D7` | [View](https://sepolia.basescan.org/address/0x74297Fa47E6103148D3A4119d7B00C6a94B927D7) | NFTs View, Membership |
| Swap Router | `0x2a4b239C15f54218a30116c630a32d9305859a43` | [View](https://sepolia.basescan.org/address/0x2a4b239C15f54218a30116c630a32d9305859a43) | DeFi → Swap Tab |
| Fee Router | `0x6552d7c4628e9e71c2E3cBEaB9f17CF67Bee1D89` | [View](https://sepolia.basescan.org/address/0x6552d7c4628e9e71c2E3cBEaB9f17CF67Bee1D89) | All (Fee Collection) |
| Stablecoin | `0x83852A1C0A6C13fa8aCD950e51A2A594A7D7Ec29` | [View](https://sepolia.basescan.org/address/0x83852A1C0A6C13fa8aCD950e51A2A594A7D7Ec29) | DeFi (Stablecoin Ops) |

---

## 🎯 UI COMPONENT → CONTRACT MAPPING

### 1️⃣ **HOME (Dashboard)**
**File:** `src/components/Dashboard.jsx`

#### Interactions:
```javascript
// DWT Token Balance Check
Contract: Layer 1 DWT Token (0xe149b32b97384131204C86a23459b544498BC46A)
Method: balanceOf(address)
Purpose: Display user's DWT holdings

// Fee Tier Calculation
Contract: Layer 1 DWT Token
Method: getFeeTier(address)
Purpose: Show Bronze/Silver/Gold/Platinum status

// Price Oracle Query
Contract: Layer 3 Price Oracle (0xec9cfD7103F22aFCa171D5b45b18a13D1016A393)
Method: getPrice(address token)
Purpose: Get real-time token prices for portfolio value

// Token Transfers
Contract: Layer 1 DWT Token
Method: transfer(address to, uint256 amount)
Purpose: Send/Receive DWT tokens
```

#### Features:
- ✅ Total portfolio value (all tokens)
- ✅ DWT banner with tier system
- ✅ Token balances (ETH, USDC, DAI, WBTC, etc.)
- ✅ Market data (CoinGecko API)
- ✅ Recent transaction history
- ✅ Faucet links (testnet only)
- ✅ Buy crypto (MoonPay integration)

---

### 2️⃣ **DEFI VIEW**
**File:** `src/components/DefiView.jsx`

Contains 8 tabs, each mapped to specific contracts:

#### Tab 1: Swap (⇄)
**Panel:** `src/components/defi/SwapPanel.jsx`

```javascript
// Swap Execution
Contract: Layer 9 SwapRouter (0x2a4b239C15f54218a30116c630a32d9305859a43)
Method: swap(address tokenIn, address tokenOut, uint256 amountIn, uint256 minAmountOut)
Purpose: Execute token swaps

// Fee Collection
Contract: Layer 9 FeeRouter (0x6552d7c4628e9e71c2E3cBEaB9f17CF67Bee1D89)
Method: collectFee(address token, uint256 amount)
Purpose: Collect 0.3% swap fee
```

**Features:**
- Token pair selection
- Price display
- Slippage tolerance
- Route optimization
- Transaction preview

---

#### Tab 2: Flash Loan (⚡)
**Panel:** `src/components/defi/FlashLoanPanel.jsx`

```javascript
// Pool Balance Query
Contract: Layer 5 FlashLoan (0x468772f20864403A0071690ef8c620D9E02BD649)
Method: getPoolBalance(address token)
Purpose: Display available liquidity

// Max Loan Calculation
Contract: Layer 5 FlashLoan
Method: getMaxFlashLoan(address token)
Purpose: Show max borrowable amount (50% of pool)

// Execute Flash Loan
Contract: Layer 5 FlashLoan
Method: flashLoan(address token, uint256 amount, bytes calldata params)
Purpose: Borrow tokens for arbitrage
Fee: 0.09% (9 basis points)
```

**Features:**
- Pool balance display
- Max loan amount (50% cap)
- Fee calculator (0.09%)
- Repayment amount preview
- Single-tx execution

---

#### Tab 3: Insurance (🛡️)
**Panel:** `src/components/defi/InsuranceFundPanel.jsx`

```javascript
// Fund Balance Query
Contract: Layer 5 InsuranceFund (0x8ba2Bb332764217079DFFb280dD70C8B351B5770)
Method: getFundBalance(address token)
Purpose: Display total insurance fund

// Max Claim Query
Contract: Layer 5 InsuranceFund
Method: getMaxClaimAmount(address token)
Purpose: Show per-claim limit (20% of fund)

// Rolling Cap Query
Contract: Layer 5 InsuranceFund
Method: getRemainingRollingCap(address token)
Purpose: Show 24h remaining cap (40% of fund)

// File Claim
Contract: Layer 5 InsuranceFund
Method: fileClaim(address token, uint256 amount, string calldata reason)
Purpose: Submit insurance claim
Delay: 48 hours after approval
```

**Features:**
- Fund balance display
- Claim limits (20% per claim, 40% rolling)
- Claim filing form
- Coverage details
- 48-hour execution delay

---

#### Tab 4: Limit Orders (📈)
**Panel:** `src/components/defi/LimitOrdersPanel.jsx`

```javascript
// User Nonce Query
Contract: Layer 5 LimitOrders (0x924B1A7846456e9de97A7E952e756daF4A995b3e)
Method: nonces(address user)
Purpose: Get user's order nonce

// Create Order
Contract: Layer 5 LimitOrders
Method: createOrder(Order struct)
Purpose: Submit buy/sell limit order
Validation: Price oracle check

// Cancel Order
Contract: Layer 5 LimitOrders
Method: cancelOrder(uint256 orderNonce)
Purpose: Cancel pending order

// Price Oracle
Contract: Layer 5 Test Price Oracle (0x22830a8c7fb402517809F79D242A57Fb1BBA2b40)
Method: getPrice(address token)
Purpose: Validate order execution price
```

**Features:**
- Buy/Sell order creation
- Price target setting
- Deadline enforcement (7 days)
- Order cancellation
- Oracle price validation
- 0.1% filler fee

---

#### Tab 5: Rewards (💧)
**Panel:** `src/components/defi/LiquidityRewardsPanel.jsx`

```javascript
// Stake LP Tokens
Contract: Layer 5 LiquidityIncentive (0x1145848222450fe6669716f7AF5cdf6EeF03fF34)
Method: stake(uint256 tokenId)
Purpose: Stake Uniswap V3 LP tokens

// Claim Rewards
Contract: Layer 5 LiquidityIncentive
Method: claimRewards()
Purpose: Earn DWT rewards

// Unstake
Contract: Layer 5 LiquidityIncentive
Method: unstake(uint256 tokenId)
Purpose: Withdraw LP tokens

// Uniswap V3 Integration
Contract: Uniswap V3 Position Manager (0x27F971cb582BF9E50F397e4d29a5C7A34f11faA2)
Method: ownerOf(uint256 tokenId)
Purpose: Verify LP token ownership
```

**Features:**
- LP token staking
- DWT reward earning
- Reward claim
- Unstaking
- APY display

---

#### Tab 6: Stake (⬡)
**Panel:** `src/components/defi/StakingPanel.jsx`

```javascript
// Stake DWT → sDWT (Auto-compounding)
Contract: Layer 4 StakingPool (0xF84180615134D9291887063EC4551daDaC3Da792)
Method: stake(uint256 amount)
Purpose: Stake DWT, receive sDWT
Rewards: Auto-compounding DWT

// Withdraw sDWT
Contract: Layer 4 StakingPool
Method: withdraw(uint256 shares)
Purpose: Unstake DWT
Cooldown: 1 day
Lock: 7 days

// Stake DWT → Earn ETH
Contract: Layer 4 DWTStaking (0xd8a08Fd138E4E8c3362556CCa2BFf443E6BcDbE3)
Method: stake(uint256 amount)
Purpose: Stake DWT, earn ETH rewards
Lock: 7 days

// Claim ETH Rewards
Contract: Layer 4 DWTStaking
Method: claimRewards()
Purpose: Withdraw earned ETH
```

**Features:**
- Two staking modes (sDWT auto-compound, ETH rewards)
- Lock period display (7 days)
- Cooldown timer (1 day)
- Reward calculator
- Early withdrawal penalty (0.10%)

---

#### Tab 7: Lend (⊕)
**Panel:** `src/components/defi/LendingPanel.jsx`

```javascript
// Supply Tokens
Contract: Layer 9 Lending (0xcbBc5E87BDdbD6A1346FD635efDB23C0cB944794)
Method: supply(address token, uint256 amount)
Purpose: Lend tokens for interest

// Borrow Tokens
Contract: Layer 9 Lending
Method: borrow(address token, uint256 amount)
Purpose: Borrow against collateral
Max LTV: 75%

// Repay Loan
Contract: Layer 9 Lending
Method: repay(address token, uint256 amount)
Purpose: Repay borrowed tokens

// Withdraw Supply
Contract: Layer 9 Lending
Method: withdraw(address token, uint256 amount)
Purpose: Withdraw supplied tokens
```

**Features:**
- Supply APY display
- Borrow APR display
- Collateral management
- Health factor monitoring
- Liquidation threshold (80%)

---

#### Tab 8: Yield LP (◈)
**Panel:** `src/components/defi/YieldPanel.jsx`

```javascript
// Add Liquidity
Contract: Layer 9 SwapRouter (0x2a4b239C15f54218a30116c630a32d9305859a43)
Method: addLiquidity(address tokenA, address tokenB, uint256 amountA, uint256 amountB)
Purpose: Provide liquidity to pool

// Remove Liquidity
Contract: Layer 9 SwapRouter
Method: removeLiquidity(address tokenA, address tokenB, uint256 liquidity)
Purpose: Withdraw liquidity

// Fee Earnings
Contract: Layer 9 FeeRouter (0x6552d7c4628e9e71c2E3cBEaB9f17CF67Bee1D89)
Method: getLPEarnings(address pool, address user)
Purpose: Calculate earned trading fees
```

**Features:**
- Pool selection
- Liquidity addition
- Fee earnings tracker
- Impermanent loss calculator
- APY projection

---

### 3️⃣ **MEMBERSHIP**
**File:** `src/components/NFTMembershipMint.jsx`

```javascript
// Mint Membership NFT
Contract: Layer 9 NFT (0x74297Fa47E6103148D3A4119d7B00C6a94B927D7)
Method: mintMembership(uint256 tier)
Purpose: Mint tier-based membership NFT
Tiers: Bronze (1K DWT), Silver (10K), Gold (100K), Platinum (1M)

// Check Eligibility
Contract: Layer 1 DWT Token (0xe149b32b97384131204C86a23459b544498BC46A)
Method: balanceOf(address)
Purpose: Verify DWT holdings for tier
```

**Features:**
- Tier-based NFT minting
- DWT balance verification
- Exclusive benefits display
- Membership perks

---

### 4️⃣ **ACTIVITY (History)**
**File:** `src/components/TransactionHistory.jsx`

```javascript
// Transaction Query
Source: Blockchain event logs
Events: Transfer, Swap, Stake, Claim, etc.
Purpose: Display user transaction history

// Filter by Type
Types: Send, Receive, Swap, Stake, Claim, Mint
Purpose: Categorize transactions
```

**Features:**
- Recent transactions (last 50)
- Transaction status (pending, confirmed, failed)
- Type filtering
- Date sorting
- Block explorer links

---

### 5️⃣ **NFTs**
**File:** `src/components/NFTsView.jsx`

```javascript
// NFT Balance Query
Contract: Layer 9 NFT (0x74297Fa47E6103148D3A4119d7B00C6a94B927D7)
Method: balanceOf(address owner)
Purpose: Get user's NFT count

// Token URI
Contract: Layer 9 NFT
Method: tokenURI(uint256 tokenId)
Purpose: Fetch NFT metadata

// Transfer NFT
Contract: Layer 9 NFT
Method: transferFrom(address from, address to, uint256 tokenId)
Purpose: Send NFT to another wallet
```

**Features:**
- NFT gallery display
- Metadata rendering (image, name, description)
- NFT transfer
- Collection filtering

---

### 6️⃣ **DAPPS**
**File:** `src/components/DAppsView.jsx`

```javascript
// WalletConnect Integration
Protocol: WalletConnect v2
Purpose: Connect to external dApps

// Session Management
Methods: pair(), approve(), reject(), disconnect()
Purpose: Manage dApp connections
```

**Features:**
- dApp catalog (DEX, Lending, NFT, Stablecoin)
- WalletConnect pairing
- Active session display
- Connection management
- Category filtering

---

### 7️⃣ **SETTINGS**
**File:** `src/components/SettingsView.jsx`

```javascript
// Governance Voting
Contract: Layer 1 Governor (0x68863af6C056C8672F9199f16024FD5dB445A84B)
Method: castVote(uint256 proposalId, uint8 support)
Purpose: Vote on governance proposals

// Create Proposal
Contract: Layer 1 Governor
Method: propose(address[] targets, uint256[] values, bytes[] calldatas, string description)
Purpose: Submit new proposal (requires 100K DWT)

// Emergency Pause Status
Contract: Layer 7 Security Controller (0x20d859c9EB3FA612C604213F74dcC6Ae49Cd040c)
Method: isPaused()
Purpose: Check if protocol is paused
```

**Features:**
- Theme toggle (dark/light)
- Network selection
- Address book
- Price alerts
- Gas tracker
- Token import
- Notification preferences
- Governance voting
- Emergency status

---

## 🔗 CROSS-LAYER INTERACTION FLOWS

### Flow 1: User Executes Flash Loan Arbitrage
```
1. UI: FlashLoanPanel.jsx
   ↓
2. Layer 5 FlashLoan Contract (0x4687...)
   - Checks: SecurityGated (Layer 7)
   - Checks: Rate limit (50% max)
   ↓
3. Layer 9 SwapRouter (0x2a4b...)
   - Executes arbitrage trades
   ↓
4. Layer 9 FeeRouter (0x6552...)
   - Collects 0.09% fee
   ↓
5. Layer 1 DWT Token (0xe149...)
   - Transfers repayment + fee
   ↓
6. Layer 3 Price Oracle (0xec9c...)
   - Validates prices
```

### Flow 2: User Stakes DWT for ETH Rewards
```
1. UI: StakingPanel.jsx
   ↓
2. Layer 4 DWTStaking Contract (0xd8a0...)
   - Checks: SecurityGated (Layer 7)
   - Checks: Lock period (7 days)
   ↓
3. Layer 1 DWT Token (0xe149...)
   - Transfers DWT from user
   ↓
4. Layer 3 Reward Distributor (0xE82C...)
   - Distributes ETH rewards
   ↓
5. Layer 9 FeeRouter (0x6552...)
   - Routes protocol fees to rewards
```

### Flow 3: User Files Insurance Claim
```
1. UI: InsuranceFundPanel.jsx
   ↓
2. Layer 5 InsuranceFund Contract (0x8ba2...)
   - Checks: SecurityGated (Layer 7)
   - Checks: Per-claim cap (20%)
   - Checks: Rolling cap (40%)
   ↓
3. Layer 1 DWT Token (0xe149...)
   - Transfers DWT after 48h delay
   ↓
4. Layer 3 Emergency Pause (0xC529...)
   - Monitors for exploits
```

---

## ⚠️ KNOWN ADDRESS MISMATCHES

### Critical Issues Found:

1. **DWT Token Address Inconsistency:**
   - Deployment JSON: `0xe149b32b97384131204C86a23459b544498BC46A` (Layer 1)
   - Frontend Config: `0xcDa9a9C0FC151Af06C8Fde002563133b86D45123` (baseSepolia)
   - FlashLoanPanel: `0x769F23dd0F6bc92C9d9d914190Ae9006d3FbDe48`
   - **ACTION:** Standardize to deployed address

2. **FlashLoan DWT Address:**
   - Panel uses: `0x769F23dd0F6bc92C9d9d914190Ae9006d3FbDe48`
   - Should use: `0xe149b32b97384131204C86a23459b544498BC46A`

3. **InsuranceFund DWT Address:**
   - Panel uses: `0x769F23dd0F6bc92C9d9d914190Ae9006d3FbDe48`
   - Should use: `0xe149b32b97384131204C86a23459b544498BC46A`

4. **LimitOrders Address:**
   - Panel uses: `0x81C4684340f3Ff3B02a813653ADfAFFb67948FB7` (old)
   - Deployment: `0x924B1A7846456e9de97A7E952e756daF4A995b3e` (new)

5. **Price Oracle Address:**
   - Panel uses: `0x89be925c1F13AA14c343467883A82a7C2bC808d3` (old)
   - Deployment: `0x22830a8c7fb402517809F79D242A57Fb1BBA2b40` (Layer 5 test oracle)
   - Or: `0xec9cfD7103F22aFCa171D5b45b18a13D1016A393` (Layer 3 oracle)

---

## 📋 NEXT STEPS

1. ✅ **Update Frontend Config** - Fix all address mismatches
2. ✅ **Configure Layer 5** - Fund pools, set caps, test oracles
3. ✅ **Verify Contracts** - Verify all contracts on BaseScan
4. ✅ **Integration Testing** - Test each UI component with deployed contracts
5. ✅ **Documentation** - Update this guide as contracts evolve

---

**Last Updated:** April 17, 2026  
**Maintainer:** Development Team  
**Network:** Base Sepolia Testnet
