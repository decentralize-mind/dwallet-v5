# dWallet v3 — WalletConnect + Production Web3 Wallet

Non-custodial Web3 wallet with full WalletConnect v2 support.  
Connect to any dApp — Uniswap, Aave, OpenSea, and thousands more.

---

## What's new in v3

| Feature             | v2        | v3                                            |
| ------------------- | --------- | --------------------------------------------- |
| WalletConnect       | ✗         | ✅ Full v2 (Web3Wallet SDK)                   |
| dApp pairing        | Mock only | Real URI pairing                              |
| Session approval    | ✗         | ✅ Review permissions before connecting       |
| Transaction signing | ✗         | ✅ Approve/reject from wallet                 |
| Message signing     | ✗         | ✅ personal_sign, eth_sign, eth_signTypedData |
| Active sessions     | ✗         | ✅ View and disconnect anytime                |
| Risk assessment     | ✗         | ✅ Low / Medium / High per request            |

---

## Quick Start

```bash
npm install
cp .env.example .env.local
# fill in your keys in .env.local
npm run dev
```

---

## Environment Variables

| Variable                        | Required          | Get it from                                                              |
| ------------------------------- | ----------------- | ------------------------------------------------------------------------ |
| `VITE_WALLETCONNECT_PROJECT_ID` | **Yes for WC**    | [cloud.walletconnect.com](https://cloud.walletconnect.com) (free, 2 min) |
| `VITE_INFURA_KEY`               | For live balances | [infura.io](https://infura.io) (free)                                    |

> Without `VITE_WALLETCONNECT_PROJECT_ID`, WalletConnect shows a setup prompt.  
> Without `VITE_INFURA_KEY`, wallet falls back to realistic mock balances.

---

## Deploy to Vercel

```bash
# 1. Push to GitHub
git init && git add . && git commit -m "dWallet v3"
git remote add origin https://github.com/YOUR_USERNAME/dwallet.git
git push -u origin main

# 2. Deploy
npm install -g vercel && vercel

# 3. Add env vars in Vercel dashboard:
#    Project → Settings → Environment Variables
#    Add: VITE_WALLETCONNECT_PROJECT_ID, VITE_INFURA_KEY
```

---

## How WalletConnect Works in dWallet

```
1. User opens a dApp (Uniswap, Aave, etc.)
2. Clicks "WalletConnect" on the dApp
3. dApp shows a QR code / URI
4. User clicks "WalletConnect" button in dWallet → DApps tab
5. Pastes the URI → connection established
6. dApp sends requests (sign, send tx) → dWallet shows approval modal
7. User approves or rejects each request
8. Session visible in "Active Sessions" — disconnect anytime
```

---

## Project Structure (new files)

```
src/
├── utils/
│   └── walletconnect.js          ← WC Web3Wallet SDK wrapper
├── context/
│   └── WalletConnectContext.jsx  ← Global WC state + event listeners
└── components/
    └── WalletConnectModal.jsx    ← 4 components:
                                     WalletConnectModal (pairing)
                                     SessionProposalModal (approve session)
                                     SessionRequestModal (approve tx/sign)
                                     ActiveSessionsList (manage sessions)
```

---

## Supported WalletConnect Methods

| Method                 | Description                             |
| ---------------------- | --------------------------------------- |
| `personal_sign`        | Sign a plain text message               |
| `eth_sign`             | Sign raw bytes                          |
| `eth_signTypedData_v4` | Sign structured EIP-712 data            |
| `eth_sendTransaction`  | Sign + broadcast a transaction          |
| `eth_signTransaction`  | Sign a transaction without broadcasting |

---

## Tech Stack

- React 18 + Vite
- `@walletconnect/web3wallet` v1 — WalletConnect v2 protocol
- `@walletconnect/utils` — session helpers
- `ethers` v6 — signing + broadcasting
- `@scure/bip39` + `@scure/bip32` — HD key derivation
- Web Crypto API — AES-256-GCM encryption
