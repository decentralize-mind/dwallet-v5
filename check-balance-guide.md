# How to Check Your DWT Balance

## Your Address: `0x04F8535645cbcACb782a97000D212eA95C1e7Ea8`

### Option 1: Check on BaseScan (Recommended)

1. Go to: https://basescan.org/address/0x04F8535645cbcACb782a97000D212eA95C1e7Ea8
2. Click on "Token Transfers (ERC-20)" tab
3. Look for DWT token transfers
4. Check the DWT balance at the top

### Option 2: Check DWT Token Contract

1. Go to: https://basescan.org/token/0x9ce235f8574bde67393884550F02135CE4fB8387
2. Paste your address in the "Balance Of" field
3. Click "Check" to see your DWT balance

### Option 3: Run This in Browser Console

Open your browser console (F12) on your Toklo wallet and run:

```javascript
// Check DWT balance on Base mainnet
const DWT_ADDRESS = "0x9ce235f8574bde67393884550F02135CE4fB8387";
const YOUR_ADDRESS = "0x04F8535645cbcACb782a97000D212eA95C1e7Ea8";

const DWT_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)"
];

const provider = new ethers.JsonRpcProvider("https://mainnet.base.org");
const dwtContract = new ethers.Contract(DWT_ADDRESS, DWT_ABI, provider);

dwtContract.balanceOf(YOUR_ADDRESS).then(balance => {
  const decimals = 18;
  const formatted = ethers.formatUnits(balance, decimals);
  console.log("◈ Your DWT Balance:", parseFloat(formatted).toFixed(4), "DWT");
  console.log("💰 USD Value (approx): $", (parseFloat(formatted) * 3.50).toFixed(2));
}).catch(err => {
  console.error("Error checking balance:", err);
});
```

### Option 4: Check Transaction Status

If you sent DWT twice, check the transaction hashes:

1. Go to https://basescan.org/
2. Paste your transaction hash in the search bar
3. Check if the transaction shows "Success" status
4. Verify the "To" address is your wallet

### Why Balance Might Not Show in UI:

1. **Wrong Network**: Make sure your wallet is on **Base mainnet** (not testnet)
2. **Cache Issue**: Try refreshing the page or clearing browser cache
3. **Balance Refresh**: The wallet auto-refreshes every 30 seconds
4. **RPC Issue**: The blockchain provider might be temporarily down

### Quick Fix:

In your Toklo wallet:
1. Go to **Settings** (gear icon)
2. Click **Switch Network** 
3. Select **Base** (mainnet)
4. Wait for balance to refresh
5. Or manually refresh the page (Cmd+R / Ctrl+R)

---

**DWT Contract Addresses:**
- Base Mainnet: `0x9ce235f8574bde67393884550F02135CE4fB8387` ✅ LIVE
- Sepolia Testnet: `0x3400b0167dA5b2dba0b88b9604eE7df4BFc1f1fa`
- Base Sepolia: `0x3400b0167dA5b2dba0b88b9604eE7df4BFc1f1fa`
