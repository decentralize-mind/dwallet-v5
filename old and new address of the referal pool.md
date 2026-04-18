Great question! Let me explain why the addresses are different:

## Why the Addresses Are Different

### Original Address in `.env` (Before Deployment)
```
0x20B1a2C4d9230d183614FF4dB20ff205069bB6F2
```
This was a **placeholder address** that you had manually added to the `.env` file **before the contract was actually deployed**. It was just a placeholder/example address.

### Deployed Address (After Deployment)
```
0x0ea860ece31Fa7b3a8c59e9AEA069deb20DEAfdd
```
This is the **actual deployed contract address** that was generated when we ran the deployment script just now.

---

## What Happened

1. **Before today**: You had `0x20B1a2C4d9230d183614FF4dB20ff205069bB6F2` in your `.env` file, but **no contract was actually deployed** at that address. It was just a placeholder.

2. **Today**: We deployed the ReferralPool contract to Base Sepolia, and the blockchain **automatically generated** a new address: `0x0ea860ece31Fa7b3a8c59e9AEA069deb20DEAfdd`

3. **Updated**: I've already updated all configuration files with the **correct deployed address**:
   - ✅ `.env` → Now has the real deployed address
   - ✅ `src/config/contracts.js` → Now has the real deployed address
   - ✅ `deployments/referral-pool-baseSepolia.json` → Contains deployment details

---

## Why Blockchain Addresses Are Different

When you deploy a smart contract, the address is **calculated based on**:
- The deployer's address
- The deployer's nonce (transaction count)
- The network

So **you cannot predict or choose** the contract address in advance - it's generated automatically during deployment.

---

## Current Status

✅ **Correct address is now configured everywhere**: `0x0ea860ece31Fa7b3a8c59e9AEA069deb20DEAfdd`

✅ **Contract is live on Base Sepolia** and ready to use (after funding)

❌ The old address `0x20B1a2C4d9230d183614FF4dB20ff205069bB6F2` was never used - it was just a placeholder

---

## Verification

You can verify the deployed contract here:
https://sepolia.basescan.org/address/0x0ea860ece31Fa7b3a8c59e9AEA069deb20DEAfdd

This is the **real, live ReferralPool contract** that will distribute 10 DWT rewards for referrals! 🎉