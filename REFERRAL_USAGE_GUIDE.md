# How to Use the Referral System

## Quick Start Guide

### For Users Who Want to Share Their Referral Link

1. **Get Your Referral Link**:
   - Open your wallet
   - Go to **Settings** → **Referral Program**
   - Copy your unique referral link (e.g., `https://www.toklo.xyz/?ref=DW4C0B73`)

2. **Share the Link**:
   - Share it with friends via email, social media, or messaging
   - When they click and create a wallet, both of you earn **10 DWT**

---

### For Users Who Received a Referral Link

When you click a referral link like `https://www.toklo.xyz/?ref=DW69DA59`:

1. **The referral code is automatically captured** from the URL
2. **Create your wallet** as normal
3. **Complete onboarding** - the system will detect the referral code
4. **Wait 1-2 minutes** - the referral reward will be processed automatically
5. **Both you and the referrer receive 10 DWT each**

---

## Manual Referral Code Setup (For Testing)

If you need to manually link a referral code to an address (useful for testing):

### Steps:

1. **Go to Settings** → **Referral Program**
2. **Expand the "Manual Referral Code Setup" section**
3. **Enter the referral code**: `DW69DA59`
4. **Enter the referrer's address**: The full Ethereum address (0x...)
5. **Click "Link Referral Code"**
6. **Success message will appear**

### Example:

```
Referral Code: DW69DA59
Referrer Address: 0x4C0B7314441dfE8E61267C0d87Fc1A657611dCf5
```

After linking, when someone uses the referral code `DW69DA59`, the system will know to reward the address `0x4C0B7314441dfE8E61267C0d87Fc1A657611dCf5`.

---

## How Referral Codes Work

### Code Generation:
- Format: `DW` + first 6 characters of Ethereum address
- Example: 
  - Address: `0x4C0B7314441dfE8E61267C0d87Fc1A657611dCf5`
  - Code: `DW4C0B73` (DW + 4C0B73)

### Full Link:
- `https://www.toklo.xyz/?ref=DW4C0B73`

---

## Troubleshooting

### Problem: Referral code not detected
**Solution**: 
- Make sure the URL has `?ref=` parameter
- Check that the code format is correct (DW + 6 characters)
- Try clearing browser cache and clicking the link again

### Problem: Referrer address not found
**Solution**:
- The referrer needs to have their code cached in the system first
- Use the **Manual Referral Code Setup** to link the code to the address
- The referrer should visit the app once to cache their code automatically

### Problem: Rewards not received after 2 minutes
**Solution**:
- Check that the ReferralPool contract has sufficient DWT balance
- Verify the transaction in the browser console for errors
- Make sure the new user completed full onboarding

---

## Testing the Complete Flow

### Step-by-Step Test:

1. **User A (Referrer)**:
   - Create/open wallet
   - Go to Settings → Referral Program
   - Copy referral link: `https://www.toklo.xyz/?ref=DWxxxxxx`
   
2. **User B (Referee)**:
   - Open the link in **incognito/private window**
   - The referral code is automatically stored
   - Create a new wallet
   - Complete onboarding
   - Wait for the "Complete" step
   
3. **Automatic Processing**:
   - Wait 1-2 minutes
   - PendingReferralHandler processes the referral
   - Smart contract distributes rewards
   - Both users receive 10 DWT each

4. **Verify**:
   - Check Settings → Referral Program for updated statistics
   - Check wallet balance for DWT tokens
   - View transaction on BaseScan

---

## Manual Testing with Code Resolution

If you want to test immediately without waiting for automatic caching:

1. **Get the referrer's address** (e.g., `0x4C0B7314441dfE8E61267C0d87Fc1A657611dCf5`)

2. **Calculate the referral code**:
   - Take first 6 chars after 0x: `4C0B73`
   - Add DW prefix: `DW4C0B73`

3. **Manually link in Settings**:
   - Go to Settings → Referral Program
   - Use Manual Referral Code Setup
   - Enter code: `DW4C0B73`
   - Enter address: `0x4C0B7314441dfE8E61267C0d87Fc1A657611dCf5`
   - Click "Link Referral Code"

4. **Test the referral**:
   - Open: `https://www.toklo.xyz/?ref=DW4C0B73`
   - Create new wallet
   - System will now find the referrer address and process the reward

---

## Referral Statistics

View your referral performance in Settings → Referral Program:

- **Total Referrals**: Number of people who signed up using your link
- **DWT Earned**: Total rewards earned (10 DWT per referral)
- **DWT Per Referral**: Current reward rate (10 DWT)

---

## Important Notes

1. **One-time reward**: Each address can only receive one referral reward
2. **No self-referrals**: You can't refer yourself
3. **Pool must be funded**: The ReferralPool contract must have DWT tokens
4. **Automatic processing**: Rewards are distributed automatically after 1-2 minutes
5. **Testnet first**: Test on Base Sepolia before using on mainnet

---

## Need Help?

- Check browser console for detailed logs
- View referral history in localStorage
- Monitor contract events on BaseScan
- Check Settings → Referral Program for statistics

---

**Last Updated**: 2026-04-18  
**Reward**: 10 DWT per referral (20 DWT total per successful referral)
