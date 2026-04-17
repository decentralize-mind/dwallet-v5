# ENS Setup - Complete Guide for dWallet

**Current IPFS CID:** `bafybeicmhmthzgn6r3nvwtvd3mjt3vzwwzmyyujmjcn4jvczlwli7zrc4m`  
**Target Domain:** `dwallet.eth` (or your owned .eth domain)  
**Status:** 📋 Ready to configure

---

## 🎯 **What is ENS and Why You Need It**

**ENS (Ethereum Name Service)** allows you to:
- ✅ Access your dApp via human-readable name: `dwallet.eth`
- ✅ Decentralized domain (no central authority can take it down)
- ✅ Works with IPFS for fully decentralized hosting
- ✅ Professional branding for your DEX

**Access URLs after setup:**
- `https://dwallet.eth.limo` (ENS gateway)
- `https://app.ens.domains/dwallet.eth` (ENS manager)

---

## 📋 **Prerequisites Checklist**

Before starting, ensure you have:

- [ ] **ENS domain owned** - `dwallet.eth` or similar
- [ ] **ETH in wallet** - ~$10-30 for gas fees
- [ ] **MetaMask installed** - Or compatible Web3 wallet
- [ ] **Latest IPFS CID** - `bafybeicmhmthzgn6r3nvwtvd3mjt3vzwwzmyyujmjcn4jvczlwli7zrc4m`

---

## 🚀 **Quick Setup (10 Minutes)**

### **Step 1: Check Domain Ownership**

1. Go to: https://app.ens.domains
2. Connect your wallet
3. Search for `dwallet.eth`
4. Check if you're the owner

**If you DON'T own it:**
- Register it: https://app.ens.domains (costs ~$5-10/year)
- Or use a domain you already own

### **Step 2: Set Content Hash**

1. **Navigate to your domain**
   ```
   https://app.ens.domains/dwallet.eth
   ```

2. **Click "Edit Records"**
   - Scroll to "Records" section
   - Click "Edit" button

3. **Add Content Hash**
   - Select "Content" record type
   - Choose protocol: **IPFS**
   - Enter hash: `bafybeicmhmthzgn6r3nvwtvd3mjt3vzwwzmyyujmjcn4jvczlwli7zrc4m`

4. **Save Transaction**
   - Click "Save"
   - Approve in MetaMask (~$10-30 gas)
   - Wait for confirmation (~15 seconds)

### **Step 3: Verify Setup**

After transaction confirms:

1. **Via ENS Gateway**
   ```
   https://dwallet.eth.limo
   ```
   Should load your dWallet frontend

2. **Via ENS Manager**
   - Go back to https://app.ens.domains/dwallet.eth
   - Verify Content Hash shows: `ipfs://bafybeicmhmthzgn6r3nvwtvd3mjt3vzwwzmyyujmjcn4jvczlwli7zrc4m`

---

## 🔧 **Programmatic Setup (Optional)**

If you prefer to set ENS via code:

### **Using ethers.js**

```javascript
import { ethers } from 'ethers'

async function setENSContentHash() {
  // Connect to Ethereum mainnet
  const provider = new ethers.JsonRpcProvider(
    `https://mainnet.infura.io/v3/${process.env.VITE_INFURA_KEY}`
  )
  
  // Your wallet
  const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider)
  
  // ENS Registry contract
  const ENS_REGISTRY = '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e'
  const ENS_ABI = [
    'function setContenthash(bytes32 node, bytes calldata hash) external',
    'function namehash(string memory name) pure returns (bytes32)'
  ]
  
  const ensRegistry = new ethers.Contract(ENS_REGISTRY, ENS_ABI, signer)
  
  // IPFS content hash (encoded)
  const contentHash = '0xe30101701220bafybeicmhmthzgn6r3nvwtvd3mjt3vzwwzmyyujmjcn4jvczlwli7zrc4m'
  
  // Namehash for dwallet.eth
  const namehash = ethers.namehash('dwallet.eth')
  
  // Set content hash
  const tx = await ensRegistry.setContenthash(namehash, contentHash)
  await tx.wait()
  
  console.log('✅ ENS content hash updated!')
}

setENSContentHash()
```

### **Using ENSJS (Recommended)**

```javascript
import { createPublicClient, http } from 'viem'
import { mainnet } from 'viem/chains'
import { getEnsAddress, setEnsContentHash } from '@ensdomains/ensjs'

const client = createPublicClient({
  chain: mainnet,
  transport: http(),
})

// Set content hash
await setEnsContentHash(client, {
  name: 'dwallet.eth',
  resolverAddress: '0x4976fb03C32e5B8cfe2b6cCB31c09Ba78EBaBa41',
  record: {
    type: 'ipfs',
    value: 'bafybeicmhmthzgn6r3nvwtvd3mjt3vzwwzmyyujmjcn4jvczlwli7zrc4m'
  }
})
```

---

## 🌐 **Access Your dApp via ENS**

After setup, your dWallet is accessible at:

### **ENS Gateways**

| Gateway | URL | Status |
|---------|-----|--------|
| **Limo** | `https://dwallet.eth.limo` | ✅ Recommended |
| **Eth.Link** | `https://dwallet.eth.link` | ✅ Works |
| **Cloudflare** | `https://cloudflare-eth.com` | ⚙️ Configure |

### **Native ENS Support**

These browsers support `.eth` domains natively:
- ✅ **Brave Browser** - Type `dwallet.eth` in address bar
- ✅ **Opera Browser** - Built-in ENS support
- ✅ **MetaMask Mobile** - Browser supports ENS
- ⚙️ **Chrome/Firefox** - Need IPFS Companion extension

---

## 🔄 **Updating ENS When You Deploy New Version**

IPFS is immutable, so each deployment creates a new CID:

### **Update Process**

1. **Deploy new version to IPFS**
   ```bash
   node scripts/deploy-ipfs.js
   # Returns new CID, e.g., bafybeiNEWCID...
   ```

2. **Update ENS content hash**
   - Go to https://app.ens.domains/dwallet.eth
   - Edit Records → Content
   - Replace old CID with new CID
   - Save transaction

3. **Verify**
   ```bash
   # Check new content
   curl https://dwallet.eth.limo
   ```

**Note:** Old CID still works! IPFS never deletes content.

---

## 💡 **Best Practices**

### **1. Use ENS for Marketing**
```
✅ Professional: "Visit dwallet.eth"
❌ Technical: "Visit ipfs.io/ipfs/bafybei..."
```

### **2. Set Multiple Records**
Consider adding to your ENS domain:
- **Avatar** - Your logo
- **Description** - "dWallet - Decentralized DEX"
- **URL** - Website URL
- **Email** - Contact email
- **Social links** - Twitter, Discord, GitHub

### **3. Subdomain Strategy**
Create subdomains for different purposes:
- `app.dwallet.eth` - Main DEX app
- `docs.dwallet.eth` - Documentation
- `api.dwallet.eth` - API endpoints

---

## 📊 **ENS Configuration in Code**

Update your frontend to use ENS:

### **ipfsGateways.js**

```javascript
export const ENS_CONFIG = {
  domain: 'dwallet.eth', // Set your ENS domain
  gateway: 'https://dwallet.eth.limo',
  
  // Get ENS gateway URL
  getGatewayUrl() {
    return this.gateway
  },
  
  // Check if ENS is configured
  isConfigured() {
    return !!this.domain
  }
}
```

### **Usage in Components**

```javascript
import { ENS_CONFIG } from '../config/ipfsGateways'

function ShareModal() {
  const shareUrl = ENS_CONFIG.isConfigured() 
    ? ENS_CONFIG.getGatewayUrl()
    : 'https://ipfs.io/ipfs/YOUR_CID'
  
  return (
    <div>
      <p>Share dWallet:</p>
      <input value={shareUrl} readOnly />
    </div>
  )
}
```

---

## ❓ **FAQ**

### **Q: Do I need to own dwallet.eth?**
**A:** Yes, or use any .eth domain you own. Examples:
- `mydwallet.eth`
- `dwalletapp.eth`
- `dwalletdex.eth`

### **Q: How much does it cost?**
**A:** 
- Domain registration: ~$5-10/year
- Gas for content hash update: ~$10-30 (one-time)

### **Q: Can I change the IPFS CID later?**
**A:** Yes! Just update the content hash in ENS. Takes ~15 seconds.

### **Q: What if ENS goes down?**
**A:** Your IPFS links still work directly. ENS is just a convenient name.

### **Q: Is ENS required?**
**A:** No, but highly recommended for:
- Professional branding
- Easy to remember URL
- Full decentralization

---

## 🎯 **Next Steps**

### **Immediate (Today)**
1. ✅ ~~Check if you own dwallet.eth~~
2. ⬜ Set content hash via https://app.ens.domains
3. ⬜ Test https://dwallet.eth.limo

### **This Week**
4. ⬜ Update frontend code with ENS config
5. ⬜ Add ENS URL to sharing features
6. ⬜ Announce to community

### **Optional Enhancements**
7. ⬜ Set avatar and metadata records
8. ⬜ Create subdomains (app, docs, api)
9. ⬜ Add ENS resolution in wallet

---

## 📚 **Resources**

- **ENS Manager:** https://app.ens.domains
- **ENS Documentation:** https://docs.ens.domains
- **ENS Gateway (Limo):** https://limo.eth
- **IPFS + ENS Guide:** https://docs.ipfs.io/how-to/websites-on-ipfs/linking-from-ipfs-to-ens/

---

## 🚨 **Important Notes**

1. **ENS is on Ethereum Mainnet** - Requires ETH for gas
2. **Content hash updates cost gas** - ~$10-30 per update
3. **IPFS CID changes with each deploy** - Remember to update ENS
4. **Test before announcing** - Always verify ENS resolution works

---

**Status:** Ready to configure  
**Estimated Time:** 10 minutes  
**Cost:** ~$15-40 (domain + gas)

Once configured, your dWallet DEX will be accessible via: **`https://dwallet.eth.limo`** 🚀
