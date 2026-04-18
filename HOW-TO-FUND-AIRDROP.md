# 🎁 How to Send DWT Tokens to Airdrop Contract

## 📋 Quick Info

**From**: Any wallet with DWT tokens  
**To**: Airdrop Contract  
**Amount**: 2,100,000 DWT

### Contract Addresses:
- **DWT Token**: `0x75A884C401A69481d4377F79dc1918b3D18e2aE8`
- **Airdrop Contract**: `0x11aE2b13FfB98D8Ba47a5CDAdD898CA85CA21b84`

---

## 💡 Option 1: Use Hardhat Script (Easiest)

### Step 1: Make sure you're using a wallet with DWT tokens

Your current deployer wallet (`0x4C0B7314441dfE8E61267C0d87Fc1A657611dCf5`) has **0 DWT**, so you need to use a different wallet.

**Wallets with DWT tokens:**
- Investor 1: `0xcEB9E5A352CCE1A983198bB2bF654Ef245E7679E` (8,400,000 DWT)
- Any Founder: 3,500,000 DWT each
- Liquidity wallet: 12,600,000 DWT

### Step 2: Update .env with the private key of a wallet that has DWT

```bash
# Find the private key for one of the wallets above
# For example, if you have the investor wallet's private key:
DEPLOYER_PRIVATE_KEY=INSERT_PRIVATE_KEY_HERE
```

### Step 3: Run the script

```bash
npx hardhat run scripts/send-to-airdrop-simple.cjs --network baseSepolia
```

---

## 💻 Option 2: Use MetaMask (Manual)

### Step 1: Open MetaMask
1. Switch to **Base Sepolia** network
2. Select the wallet that has DWT tokens

### Step 2: Send DWT Tokens
1. Click **"Send"**
2. In "Search or paste address", paste:
   ```
   0x11aE2b13FfB98D8Ba47a5CDAdD898CA85CA21b84
   ```
3. Click **"Next"**
4. Enter amount: `2100000`
5. Click **"Next"**
6. Review and click **"Confirm"**

### Step 3: Verify
- Wait for transaction to confirm (~15 seconds)
- Check on BaseScan: https://sepolia.basescan.org/address/0x11aE2b13FfB98D8Ba47a5CDAdD898CA85CA21b84

---

## 🔧 Option 3: Use ethers.js Directly (Advanced)

Create a file `transfer-airdrop.js`:

```javascript
const { ethers } = require("ethers");

// Setup provider
const provider = new ethers.JsonRpcProvider("https://sepolia.base.org");

// Your wallet with DWT
const wallet = new ethers.Wallet("YOUR_PRIVATE_KEY_HERE", provider);

// DWT Token contract
const DWT_ABI = ["function transfer(address to, uint256 amount) returns (bool)"];
const DWT_ADDRESS = "0x75A884C401A69481d4377F79dc1918b3D18e2aE8";
const AIRDROP_ADDRESS = "0x11aE2b13FfB98D8Ba47a5CDAdD898CA85CA21b84";

const token = new ethers.Contract(DWT_ADDRESS, DWT_ABI, wallet);

async function main() {
  const amount = ethers.parseEther("2100000"); // 2.1M DWT
  
  console.log("Transferring 2,100,000 DWT to airdrop contract...");
  
  const tx = await token.transfer(AIRDROP_ADDRESS, amount);
  console.log("Transaction sent:", tx.hash);
  
  await tx.wait();
  console.log("✅ Transaction confirmed!");
}

main().catch(console.error);
```

Run it:
```bash
node transfer-airdrop.js
```

---

## ⚡ Option 4: Use Cast (Command Line - Fastest)

If you have Foundry installed:

```bash
cast send 0x75A884C401A69481d4377F79dc1918b3D18e2aE8 \
  "transfer(address,uint256)" \
  0x11aE2b13FfB98D8Ba47a5CDAdD898CA85CA21b84 \
  2100000000000000000000000 \
  --rpc-url https://sepolia.base.org \
  --private-key YOUR_PRIVATE_KEY_HERE
```

---

## ✅ Verify the Transfer

After sending, check if it worked:

```bash
npx hardhat console --network baseSepolia
```

Then in the console:
```javascript
const DWT = await ethers.getContractAt("DWTToken", "0x75A884C401A69481d4377F79dc1918b3D18e2aE8");
const airdropBalance = await DWT.balanceOf("0x11aE2b13FfB98D8Ba47a5CDAdD898CA85CA21b84");
console.log("Airdrop balance:", ethers.formatEther(airdropBalance), "DWT");
```

Should show: **2,100,000 DWT**

---

## 🎯 Recommended Approach

**Best option**: Use **Option 2 (MetaMask)** if you have the private key to one of the wallets with DWT tokens.

**Wallets you can use:**
1. **Investor wallet** (recommended): `0xcEB9E5A352CCE1A983198bB2bF654Ef245E7679E`
   - Has: 8,400,000 DWT
   - After transfer: 6,300,000 DWT

2. **Any Founder wallet**
   - Has: 3,500,000 DWT each
   - Can cover the 2,100,000 DWT

3. **Liquidity wallet**: `0x6259648010922027A7ED105b3196FB63Dd4Beb9d`
   - Has: 12,600,000 DWT

---

## ⚠️ Important Notes

- You **MUST** have the private key to the wallet sending the tokens
- The wallet needs some ETH for gas fees (~0.001 ETH)
- Make sure you're on **Base Sepolia** network, not Base mainnet
- Double-check the airdrop contract address before sending

---

## 🆘 Need Help?

If you don't have the private keys to any of these wallets, you need to:
1. Get the private key from the wallet owner
2. Or ask them to send 2,100,000 DWT to: `0x11aE2b13FfB98D8Ba47a5CDAdD898CA85CA21b84`
