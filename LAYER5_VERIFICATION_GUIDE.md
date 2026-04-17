# 🔍 Layer 5 Contract Verification Guide - BaseScan

## ⚠️ Important: Manual Verification Required

Automated verification failed because BaseScan requires **Etherscan API V2**. The contracts must be verified manually.

---

## 📋 Contracts to Verify

### 1. CrossChainMessenger
- **Address:** `0x64f3fFdE0bbA86e072a2595Cd550AeC44a1e0e38`
- **Link:** https://sepolia.basescan.org/address/0x64f3fFdE0bbA86e072a2595Cd550AeC44a1e0e38

### 2. FlashLoan
- **Address:** `0x468772f20864403A0071690ef8c620D9E02BD649`
- **Link:** https://sepolia.basescan.org/address/0x468772f20864403A0071690ef8c620D9E02BD649

### 3. InsuranceFund
- **Address:** `0x8ba2Bb332764217079DFFb280dD70C8B351B5770`
- **Link:** https://sepolia.basescan.org/address/0x8ba2Bb332764217079DFFb280dD70C8B351B5770

---

## 🔧 Manual Verification Steps

### Step 1: Navigate to Contract
1. Open the BaseScan link for the contract
2. Click on the **"Contract"** tab
3. Click **"Verify and Publish"** button

### Step 2: Fill Verification Form

**Compiler Type:** Solidity (Single file)

**Compiler Version:** 0.8.24

**License:** MIT

**Optimization:** Yes (400 runs)

**EVM Version:** cancun

### Step 3: Upload Source Code

Copy and paste the complete source code from:
- `contracts/layer5/CrossChainMessenger.sol`
- `contracts/layer5/FlashLoan.sol`
- `contracts/layer5/InsuranceFund.sol`

**⚠️ Important:** Each contract inherits from `SecurityGated`, so you'll need to include that as well.

### Step 4: Enter Constructor Arguments

#### CrossChainMessenger Constructor Args:
```
Admin (address):        0x4C0B7314441dfE8E61267C0d87Fc1A657611dCf5
Operator (address):     0x4C0B7314441dfE8E61267C0d87Fc1A657611dCf5
Guardian (address):     0x4C0B7314441dfE8E61267C0d87Fc1A657611dCf5
Layer7 Security:        0x20d859c9EB3FA612C604213F74dcC6Ae49Cd040c
Initial Provider:       LayerZero
```

**ABI-Encoded Constructor Arguments:**
```
0x0000000000000000000000004c0b7314441dfe8e61267c0d87fc1a657611dcf50000000000000000000000004c0b7314441dfe8e61267c0d87fc1a657611dcf50000000000000000000000004c0b7314441dfe8e61267c0d87fc1a657611dcf500000000000000000000000020d859c9eb3fa612c604213f74dcc6ae49cd040c00000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000000094c617965725a65726f0000000000000000000000000000000000000000000000
```

#### FlashLoan Constructor Args:
```
Admin (address):        0x4C0B7314441dfE8E61267C0d87Fc1A657611dCf5
Guardian (address):     0x4C0B7314441dfE8E61267C0d87Fc1A657611dCf5
Layer7 Security:        0x20d859c9EB3FA612C604213F74dcC6Ae49Cd040c
```

**ABI-Encoded Constructor Arguments:**
```
0x0000000000000000000000004c0b7314441dfe8e61267c0d87fc1a657611dcf50000000000000000000000004c0b7314441dfe8e61267c0d87fc1a657611dcf500000000000000000000000020d859c9eb3fa612c604213f74dcc6ae49cd040c
```

#### InsuranceFund Constructor Args:
```
Admin (address):        0x4C0B7314441dfE8E61267C0d87Fc1A657611dCf5
Claims Assessor:        0x4C0B7314441dfE8E61267C0d87Fc1A657611dCf5
Guardian (address):     0x4C0B7314441dfE8E61267C0d87Fc1A657611dCf5
Layer7 Security:        0x20d859c9EB3FA612C604213F74dcC6Ae49Cd040c
```

**ABI-Encoded Constructor Arguments:**
```
0x0000000000000000000000004c0b7314441dfe8e61267c0d87fc1a657611dcf50000000000000000000000004c0b7314441dfe8e61267c0d87fc1a657611dcf50000000000000000000000004c0b7314441dfe8e61267c0d87fc1a657611dcf500000000000000000000000020d859c9eb3fa612c604213f74dcc6ae49cd040c
```

### Step 5: Submit & Wait
1. Click "Verify and Publish"
2. Wait for verification (usually 10-30 seconds)
3. Contract should show green checkmark ✅

---

## 🔗 Alternative: Use Hardhat Plugin with V2 API

If you want to try automated verification with V2 API:

```bash
# Set Etherscan V2 API key in .env
ETHERSCAN_V2_KEY=your_v2_api_key

# Update hardhat.config.cjs to use V2
# Then run:
npx hardhat verify --network baseSepolia \
  0x64f3fFdE0bbA86e072a2595Cd550AeC44a1e0e38 \
  0x4C0B7314441dfE8E61267C0d87Fc1A657611dCf5 \
  0x4C0B7314441dfE8E61267C0d87Fc1A657611dCf5 \
  0x4C0B7314441dfE8E61267C0d87Fc1A657611dCf5 \
  0x20d859c9EB3FA612C604213F74dcC6Ae49Cd040c \
  "LayerZero"
```

---

## ✅ Verification Checklist

- [ ] CrossChainMessenger verified
- [ ] FlashLoan verified
- [ ] InsuranceFund verified
- [ ] Source code visible on BaseScan
- [ ] Contract ABI available
- [ ] Read functions accessible
- [ ] Write functions accessible

---

## 📊 Benefits of Verification

✅ **Transparency:** Community can audit the code  
✅ **Trust:** Verified badge builds confidence  
✅ **Integration:** Easier to integrate with dApps  
✅ **Exploration:** Users can interact directly via BaseScan  

---

**Need help?** Check the contract source files or contact the development team.
