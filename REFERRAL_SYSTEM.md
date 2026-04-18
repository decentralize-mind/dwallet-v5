# dWallet Referral System - Complete Implementation Guide

## Overview

The dWallet referral system rewards users with **10 DWT tokens** for inviting friends to the platform. Both the referrer and the referee receive 10 DWT when a new user signs up using a referral link.

## Architecture

### Smart Contract: ReferralPool
- **Location**: `contracts/layer9/ReferralPool.sol`
- **Address**: `0x20B1a2C4d9230d183614FF4dB20ff205069bB6F2` (Base Sepolia)
- **Reward**: 10 DWT per referral (20 DWT total per successful referral - 10 for each party)

### Key Features
- ✅ Automatic reward distribution to both referrer and referee
- ✅ One-time claim per address (prevents abuse)
- ✅ Referral tracking and statistics
- ✅ Emergency pause functionality
- ✅ Pool balance management
- ✅ Reentrancy protection

## How It Works

### User Flow

1. **User A (Existing User)**
   - Opens Settings → Referral Program
   - Copies their unique referral link: `https://www.toklo.xyz/?ref=TK123456`
   - Shares the link with friends

2. **User B (New User)**
   - Clicks the referral link
   - Creates a new wallet on dWallet
   - Completes onboarding
   - System detects the referral code and processes the reward

3. **Reward Distribution**
   - Both User A and User B receive 10 DWT tokens
   - Rewards are automatically claimed from the ReferralPool contract
   - Transaction is recorded on-chain

### Technical Flow

```
User clicks referral link
  ↓
Referral code stored in sessionStorage
  ↓
User creates wallet
  ↓
CompleteStep detects referral code
  ↓
Referral info saved to localStorage (pending_referral)
  ↓
PendingReferralHandler processes the claim
  ↓
claimReferralReward() called on smart contract
  ↓
Contract validates and distributes 20 DWT (10 + 10)
  ↓
Both parties receive their rewards
```

## Smart Contract Functions

### Core Functions

#### `claimReferralReward(address referrer)`
Claims referral rewards for both the referrer and referee.
- **Called by**: New user (referee)
- **Parameters**: Referrer's address
- **Rewards**: 10 DWT to referrer, 10 DWT to referee
- **Requirements**: 
  - Pool must have at least 20 DWT balance
  - User must not have claimed before
  - Cannot refer yourself

#### `registerReferral(address referrer)`
Registers a referral relationship without immediate reward claim.
- **Called by**: New user (referee)
- **Use case**: Track referral for later processing

### View Functions

#### `isEligibleForReferral(address user) → bool`
Check if a user can claim referral rewards.

#### `getReferrerStats(address referrer) → (uint256, uint256)`
Get referrer's total referrals and rewards earned.

#### `getPoolBalance() → uint256`
Get current DWT balance in the pool.

#### `getMaxReferrals() → uint256`
Get maximum number of referrals that can be rewarded with current balance.

### Admin Functions

#### `fundPool(uint256 amount)`
Fund the referral pool with DWT tokens.
- Requires prior approval of DWT token transfer

#### `pause()` / `unpause()`
Emergency pause/unpause functionality (owner only)

#### `withdrawTokens(address to, uint256 amount)`
Withdraw excess tokens from the pool (owner only)

## Frontend Integration

### Key Files

1. **`src/utils/referral.js`**
   - Generate referral codes and links
   - Track incoming referrals
   - Store referral statistics

2. **`src/hooks/useReferralPool.js`**
   - React hook for interacting with ReferralPool contract
   - Handle claim registration and reward claiming
   - Cache referral code mappings

3. **`src/components/onboarding/CompleteStep.jsx`**
   - Detects referral codes during wallet creation
   - Caches user's referral code for future use
   - Stores pending referrals for processing

4. **`src/components/PendingReferralHandler.jsx`**
   - Background component that processes pending referrals
   - Automatically claims rewards when conditions are met
   - Mounted in MainWallet.jsx

5. **`src/components/SettingsView.jsx`**
   - Displays user's referral link
   - Shows referral program information
   - Copy to clipboard functionality

### Referral Code Format

```
TK + first 6 characters of wallet address (uppercase)
Example: 0x1234567890abcdef → TK123456
```

## Deployment

### Deploy ReferralPool Contract

```bash
# Deploy to Base Sepolia (testnet)
npx hardhat run scripts/deploy-referral-pool.js --network baseSepolia

# Deploy to Base (mainnet)
npx hardhat run scripts/deploy-referral-pool.js --network base
```

### Fund the Pool

After deployment, fund the pool with DWT tokens:

```javascript
// Example: Fund with 1000 DWT
const dwtToken = await ethers.getContractAt("DWTToken", DWT_ADDRESS);
const referralPool = await ethers.getContractAt("ReferralPool", POOL_ADDRESS);

// Approve transfer
await dwtToken.approve(POOL_ADDRESS, ethers.utils.parseEther("1000"));

// Fund the pool
await referralPool.fundPool(ethers.utils.parseEther("1000"));
```

## Configuration

### Environment Variables

Add to `.env`:
```env
# Referral Pool Configuration
REFERRAL_POOL_ADDRESS=0x20B1a2C4d9230d183614FF4dB20ff205069bB6F2
INITIAL_REFERRAL_FUND=1000  # Initial DWT tokens to fund the pool
```

### Contract Addresses

Update `src/config/contracts.js`:
```javascript
baseSepolia: {
  // ... other contracts
  ReferralPool: '0x20B1a2C4d9230d183614FF4dB20ff205069bB6F2',
}
```

## Testing

### Manual Testing Checklist

1. **Generate Referral Link**
   - [ ] Open Settings → Referral Program
   - [ ] Verify referral link format is correct
   - [ ] Copy link successfully

2. **Test Referral Flow**
   - [ ] Open referral link in new browser/incognito
   - [ ] Create new wallet
   - [ ] Complete onboarding
   - [ ] Verify referral code is detected
   - [ ] Check localStorage for pending_referral

3. **Test Reward Claim**
   - [ ] Wait for processing (1 minute delay)
   - [ ] Verify transaction is submitted
   - [ ] Check both addresses received 10 DWT
   - [ ] Verify on-chain transaction

4. **Test Edge Cases**
   - [ ] Try to claim referral twice (should fail)
   - [ ] Try self-referral (should fail)
   - [ ] Test with empty pool balance (should fail gracefully)
   - [ ] Test pause functionality

### Contract Testing

```bash
# Run Hardhat tests
npx hardhat test test/ReferralPool.test.js

# Deploy to local network
npx hardhat node
npx hardhat run scripts/deploy-referral-pool.js --network localhost
```

## Monitoring

### Key Metrics to Track

- Total referrals processed
- Total DWT distributed
- Pool balance
- Average referrals per user
- Conversion rate from referral link to wallet creation

### Event Logs

Monitor these contract events:
- `ReferralRegistered(address referee, address referrer, uint256 timestamp)`
- `ReferralRewardClaimed(address user, uint256 amount, uint256 timestamp)`
- `PoolFunded(address from, uint256 amount)`

## Security Considerations

### Implemented Protections

1. **One Claim Per Address**: Prevents multiple claims from same user
2. **No Self-Referral**: Users cannot refer themselves
3. **Pool Balance Check**: Ensures sufficient funds before distribution
4. **Reentrancy Guard**: Prevents reentrancy attacks
5. **Pause Mechanism**: Emergency stop functionality
6. **Owner-Only Admin**: Critical functions restricted to owner

### Future Enhancements

- [ ] Add CAPTCHA verification to prevent bot referrals
- [ ] Implement time-lock between signup and reward claim
- [ ] Add rate limiting for referrals from same IP
- [ ] Integrate with KYC system for verified referrals only
- [ ] Add multi-level referral support (up to 3 levels)

## Troubleshooting

### Common Issues

**Issue**: Referral reward not claiming
- **Solution**: Check pool balance, ensure it has at least 20 DWT

**Issue**: "Already claimed" error
- **Solution**: This address has already received a referral reward

**Issue**: Referral code not detected
- **Solution**: Check URL has `?ref=` parameter, verify code format

**Issue**: Transaction fails
- **Solution**: Check gas limit, ensure user has ETH for gas fees

## Support

For issues or questions about the referral system:
- Check contract events on Etherscan/BaseScan
- Review localStorage for pending referrals
- Check browser console for error logs
- Verify contract is not paused

---

**Last Updated**: 2026-04-18
**Contract Version**: 1.0.0
**Reward Amount**: 10 DWT per referral
