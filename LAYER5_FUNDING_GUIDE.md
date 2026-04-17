# 💰 Layer 5 Pool Funding Guide

**Date:** April 17, 2026  
**Status:** ⚠️ **Requires Manual Action**

---

## ⚠️ Important: DWT Token Ownership

The DWT token ownership has been transferred to **Timelock** for security. This means:
- ❌ No new DWT tokens can be minted
- ❌ Deployer wallet has 0 DWT balance
- ✅ Existing DWT holders can transfer tokens manually

---

## 📊 Current Status

| Pool | Address | Current Balance | Target Balance |
|------|---------|----------------|----------------|
| FlashLoan | `0x468772f20864403A0071690ef8c620D9E02BD649` | 0 DWT | 50,000 DWT |
| InsuranceFund | `0x8ba2Bb332764217079DFFb280dD70C8B351B5770` | 0 DWT | 100,000 DWT |

---

## 🎯 Funding Options

### Option 1: Transfer from Wallet Holding DWT ⭐ RECOMMENDED

If you have a wallet with DWT tokens, simply transfer them to the pool addresses.

#### Step 1: Fund FlashLoan (50,000 DWT)

**Using Hardhat Console:**
```bash
npx hardhat console --network baseSepolia

# In console:
const DWT = await ethers.getContractAt(
  "@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20",
  "0xe149b32b97384131204C86a23459b544498BC46A"
);

// Transfer 50,000 DWT to FlashLoan
await DWT.transfer(
  "0x468772f20864403A0071690ef8c620D9E02BD649",
  ethers.parseEther("50000")
);
```

**Using MetaMask or Wallet:**
1. Open your wallet with DWT tokens
2. Send transaction to: `0x468772f20864403A0071690ef8c620D9E02BD649`
3. Amount: `50000` DWT
4. Confirm transaction

#### Step 2: Fund InsuranceFund (100,000 DWT)

**Using Hardhat Console:**
```bash
# In hardhat console:

// First approve InsuranceFund
await DWT.approve(
  "0x8ba2Bb332764217079DFFb280dD70C8B351B5770",
  ethers.parseEther("100000")
);

// Then deposit
const InsuranceFund = await ethers.getContractAt(
  "InsuranceFund",
  "0x8ba2Bb332764217079DFFb280dD70C8B351B5770"
);

await InsuranceFund.depositFund(
  "0xe149b32b97384131204C86a23459b544498BC46A",
  ethers.parseEther("100000")
);
```

**Using MetaMask or Wallet:**
1. First approve spending: Call `approve()` on DWT contract
   - Spender: `0x8ba2Bb332764217079DFFb280dD70C8B351B5770`
   - Amount: `100000`
2. Then deposit: Call `depositFund()` on InsuranceFund contract
   - Token: `0xe149b32b97384131204C86a23459b544498BC46A`
   - Amount: `100000`

---

### Option 2: Governance Proposal to Timelock

Since Timelock owns the DWT token, you can submit a governance proposal to fund the pools.

**Proposal Steps:**
1. Create governance proposal with 2 transactions:
   - Transfer 50,000 DWT to FlashLoan
   - Transfer 100,000 DWT to InsuranceFund
2. Wait for voting period
3. Execute proposal through Timelock

**This requires:**
- Sufficient veDWT to create proposal
- Community approval
- Timelock delay (typically 2 days)

---

### Option 3: Use Testnet Faucet

If DWT is available on a Base Sepolia faucet:

1. Get DWT from faucet to your deployer wallet
2. Use the transfers above to fund pools

---

## ✅ Verification After Funding

After funding, verify the balances:

```bash
npx hardhat console --network baseSepolia

# Check FlashLoan balance
const DWT = await ethers.getContractAt(
  "@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20",
  "0xe149b32b97384131204C86a23459b544498BC46A"
);

const flashBalance = await DWT.balanceOf("0x468772f20864403A0071690ef8c620D9E02BD649");
console.log("FlashLoan balance:", ethers.formatEther(flashBalance), "DWT");

const insuranceBalance = await DWT.balanceOf("0x8ba2Bb332764217079DFFb280dD70C8B351B5770");
console.log("InsuranceFund balance:", ethers.formatEther(insuranceBalance), "DWT");

# Check max flash loan available
const FlashLoan = await ethers.getContractAt("FlashLoan", "0x468772f20864403A0071690ef8c620D9E02BD649");
const maxLoan = await FlashLoan.getMaxFlashLoan("0xe149b32b97384131204C86a23459b544498BC46A");
console.log("Max flash loan:", ethers.formatEther(maxLoan), "DWT");

# Check insurance fund limits
const InsuranceFund = await ethers.getContractAt("InsuranceFund", "0x8ba2Bb332764217079DFFb280dD70C8B351B5770");
const maxClaim = await InsuranceFund.getMaxClaimAmount("0xe149b32b97384131204C86a23459b544498BC46A");
console.log("Max single claim:", ethers.formatEther(maxClaim), "DWT");
```

**Expected Output After Funding:**
```
FlashLoan balance: 50000.0 DWT
InsuranceFund balance: 100000.0 DWT
Max flash loan: 25000.0 DWT (50% of pool)
Max single claim: 20000.0 DWT (20% of fund)
```

---

## 📋 Funding Checklist

- [ ] Identify wallet holding DWT tokens
- [ ] Transfer 50,000 DWT to FlashLoan
- [ ] Approve & deposit 100,000 DWT to InsuranceFund
- [ ] Verify FlashLoan balance = 50,000 DWT
- [ ] Verify InsuranceFund balance = 100,000 DWT
- [ ] Test flash loan execution
- [ ] Test insurance claim flow

---

## 🎯 What Happens After Funding

### FlashLoan Becomes Operational:
- ✅ Users can borrow up to 25,000 DWT per transaction (50% of pool)
- ✅ Fee: 0.09% per loan
- ✅ Must repay within same transaction + fee

### InsuranceFund Becomes Operational:
- ✅ Users can file claims up to 20,000 DWT (20% of fund)
- ✅ Monthly cap: 40,000 DWT (40% of fund)
- ✅ 48-hour execution delay after approval

---

## 🔗 Quick Reference

### Contract Addresses:
- **DWT Token:** `0xe149b32b97384131204C86a23459b544498BC46A`
- **FlashLoan:** `0x468772f20864403A0071690ef8c620D9E02BD649`
- **InsuranceFund:** `0x8ba2Bb332764217079DFFb280dD70C8B351B5770`

### BaseScan Links:
- **DWT Token:** https://sepolia.basescan.org/address/0xe149b32b97384131204C86a23459b544498BC46A
- **FlashLoan:** https://sepolia.basescan.org/address/0x468772f20864403A0071690ef8c620D9E02BD649
- **InsuranceFund:** https://sepolia.basescan.org/address/0x8ba2Bb332764217079DFFb280dD70C8B351B5770

---

## 💡 Pro Tips

1. **Fund in one transaction** - Transfer to both pools at once to save gas
2. **Test with small amount first** - Try 100 DWT before full funding
3. **Keep some DWT in wallet** - Don't transfer all tokens, keep some for testing
4. **Monitor balances** - Check pool balances regularly

---

**Need DWT tokens?** Check these potential sources:
- DAO Treasury: `0xb5002AC352CCE1A983198bB2bF654Ef245E7679E`
- Community Rewards: `0xd623AbBAc02cBB4984294c922E2f19bd3e98aF8d`
- Team/Founder wallets (from .env file)

---

**Status:** ⏳ Waiting for DWT transfer  
**Estimated time:** 5-10 minutes once you have DWT tokens
