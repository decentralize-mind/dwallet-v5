# Layer 5 - Cross-Chain & Advanced DeFi

## Overview

Layer 5 implements cross-chain infrastructure and advanced DeFi primitives for the dWallet v5 protocol. This layer includes flash loans, insurance funds, limit orders, liquidity incentives, and cross-chain messaging.

## Contracts

### 1. CrossChainMessenger.sol
**Purpose:** Message bus with replay protection for cross-chain communication

**Key Features:**
- Per-chain nonce prevents replay attacks
- Daily message cap auto-stops anomalous bursts
- 7-day mandatory delay before provider switch (Axelar/LayerZero)
- GUARDIAN can halt all processing in one tx
- Integration with Layer 7 Security

**Security:**
- ReentrancyGuard protection
- Access control for message senders/receivers
- Rate limiting on message frequency
- Emergency pause functionality

### 2. FlashLoan.sol
**Purpose:** ERC-3156 compliant flash loan pool

**Key Features:**
- Callback must return `keccak256("ERC3156FlashBorrower.onFlashLoan")`
- Pool balance and fees tracked separately
- 50% cap on single flash loan amount
- Reentrancy guard prevents recursive loans
- Configurable flash loan fees

**Security:**
- Strict callback validation
- Balance verification before/after loan
- Max loan amount limits
- Fee collection enforcement
- Emergency withdrawal protection

### 3. InsuranceFund.sol
**Purpose:** Claims processing with safety caps

**Key Features:**
- State machine: Pending → Approved → Executed (cannot skip approval)
- 48h execution delay after approval
- Per-claim hard cap (20% of fund)
- Rolling 30-day cap (40% of fund) to prevent drain
- Multi-sig approval for claims

**Security:**
- Role-based access control
- Time-locked claim execution
- Fund balance monitoring
- Claim validation logic
- Emergency fund protection

### 4. LimitOrders.sol
**Purpose:** EIP-712 signed limit orders with oracle price validation

**Key Features:**
- Off-chain signing, on-chain settlement
- Partial fills supported
- Oracle price validation before fill execution
- Filler fee incentivizes relayers (default 0.10%)
- Order cancellation functionality

**Security:**
- EIP-712 domain separation
- Nonce-based replay protection
- Signature verification
- Price slippage protection
- Deadline enforcement

### 5. LiquidityIncentive.sol
**Purpose:** Uniswap V3 NFT LP staking and rewards

**Key Features:**
- Real liquidity fetched on-chain from positionManager
- Cannot fake liquidity with max values
- Multi-pool reward distribution
- Allocation points control reward share per pool
- Emergency withdrawal available

**Security:**
- On-chain liquidity verification
- Reentrancy protection
- Reward calculation accuracy
- Emergency pause capability
- Anti-manipulation measures

## Security Architecture

All contracts in Layer 5 inherit from:
- **SecurityGated** - Layer 7 integration for protocol-wide pause
- **AccessControl** - Role-based permissions
- **ReentrancyGuard** - Reentrancy protection
- **Pausable** - Emergency pause functionality

### Roles

Each contract implements specific roles:
- **ADMIN_ROLE** - Administrative functions
- **OPERATOR_ROLE** - Operational functions
- **GUARDIAN_ROLE** - Emergency pause/resume
- **CLAIMS_ASSESSOR_ROLE** - Insurance claim assessment (InsuranceFund only)

## Deployment

### Prerequisites
1. Layer 7 Security must be deployed
2. Layer 1 DWT token must be deployed
3. Price oracle must be available (for LimitOrders)
4. Uniswap V3 Position Manager address (for LiquidityIncentive)

### Deployment Order
1. CrossChainMessenger.sol
2. FlashLoan.sol
3. InsuranceFund.sol
4. LimitOrders.sol
5. LiquidityIncentive.sol

### Configuration
After deployment:
1. Set up supported tokens for FlashLoan
2. Configure daily message caps for CrossChainMessenger
3. Fund InsuranceFund with initial capital
4. Set price oracle for LimitOrders
5. Add liquidity pools for LiquidityIncentive

## Testing

Run tests with:
```bash
npx hardhat test test/layer5/*.test.js
```

## Integration

Layer 5 integrates with:
- **Layer 7 Security** - Protocol-wide pause and monitoring
- **Layer 1 Token** - Reward distribution
- **Layer 2 DEX** - Price oracle and swap routing
- **Layer 8 Bridge** - Cross-chain messaging

## Security Considerations

### Flash Loans
- Monitor flash loan usage patterns
- Set appropriate fee rates
- Implement circuit breakers for unusual activity

### Insurance Fund
- Maintain adequate fund reserves
- Regular claims assessment
- Monitor rolling payout caps

### Limit Orders
- Validate oracle price feeds
- Monitor order fill rates
- Prevent signature replay attacks

### Liquidity Incentives
- Verify real liquidity (not fake)
- Monitor reward distribution
- Prevent manipulation of allocation points

### Cross-Chain Messenger
- Monitor message patterns
- Implement rate limiting
- Validate bridge provider signatures

## Emergency Procedures

1. **Guardian Halt**: Any guardian can pause all operations
2. **Admin Resume**: Admin can resume after investigation
3. **Emergency Withdraw**: Admin can withdraw funds in emergencies
4. **Claim Cancellation**: Claimants can cancel pending claims

## Monitoring

Key metrics to monitor:
- Flash loan volume and fees
- Insurance fund balance and claims
- Limit order fill rates
- Liquidity pool performance
- Cross-chain message success rates

## Upgrade Path

All contracts support:
- Parameter updates via admin roles
- Emergency pause/resume
- Gradual migration to new versions
- Layer 7 security integration

---

**Status**: ✅ Implementation Complete  
**Security Level**: Production Ready (pending audit)  
**Last Updated**: April 17, 2026
