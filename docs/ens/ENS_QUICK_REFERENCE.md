# ENS Quick Reference - dWallet

## 🎯 Current Status

| Item | Status | Details |
|------|--------|---------|
| **ENS Domain** | ⏳ Needs Setup | `dwallet.eth` (or your domain) |
| **IPFS CID** | ✅ Deployed | `bafybeicmhmthzgn6r3nvwtvd3mjt3vzwwzmyyujmjcn4jvczlwli7zrc4m` |
| **Content Hash** | ⏳ Not Set | Needs to be set in ENS |
| **ENS Gateway** | ⏳ Not Working | Will work after setup |

---

## 🚀 Setup in 3 Steps (10 Minutes)

### **Step 1: Own a .eth Domain**
- Go to: https://app.ens.domains
- Search for `dwallet.eth` (or choose another name)
- Register if available (~$5-10/year)
- **OR** use a domain you already own

### **Step 2: Set Content Hash**
1. Visit: https://app.ens.domains/YOUR_DOMAIN.eth
2. Click "Edit Records"
3. Add "Content" record
4. Select protocol: **IPFS**
5. Enter: `bafybeicmhmthzgn6r3nvwtvd3mjt3vzwwzmyyujmjcn4jvczlwli7zrc4m`
6. Save and approve transaction (~$10-30 gas)

### **Step 3: Test It Works**
Visit: `https://YOUR_DOMAIN.eth.limo`

Should load your dWallet DEX! 🎉

---

## 🌐 Access URLs

### **After ENS Setup**

| Type | URL | Use Case |
|------|-----|----------|
| **ENS Gateway** | `https://dwallet.eth.limo` | Primary access |
| **IPFS Gateway** | `https://ipfs.io/ipfs/CID` | Backup |
| **Dweb Gateway** | `https://CID.ipfs.dweb.link` | Backup |

### **Direct IPFS (Always Works)**

```
Primary: https://ipfs.io/ipfs/bafybeicmhmthzgn6r3nvwtvd3mjt3vzwwzmyyujmjcn4jvczlwli7zrc4m
Backup:  https://bafybeicmhmthzgn6r3nvwtvd3mjt3vzwwzmyyujmjcn4jvczlwli7zrc4m.ipfs.dweb.link
```

---

## 💰 Costs

| Item | Cost | Frequency |
|------|------|-----------|
| ENS Domain | $5-10 | Per year |
| Content Hash Update | $10-30 | One-time (or each deploy) |
| **Total First Year** | **$15-40** | - |

---

## 📝 Code Configuration

### **Update ENS Domain**

File: `src/config/ipfsGateways.js`

```javascript
export const ENS_CONFIG = {
  domain: 'YOUR_DOMAIN.eth', // ← Change this
  gateway: 'https://YOUR_DOMAIN.eth.limo',
}
```

### **Use in Components**

```javascript
import { ENS_CONFIG } from '../config/ipfsGateways'

// Get ENS URL
const ensUrl = ENS_CONFIG.getUrl()

// Check if configured
if (ENS_CONFIG.isConfigured()) {
  console.log('ENS is ready!')
}
```

---

## 🔄 Update Process

When you deploy a new version to IPFS:

1. **Get new CID**
   ```bash
   node scripts/deploy-ipfs.js
   # Returns: bafybeiNEWCID...
   ```

2. **Update ENS**
   - Go to https://app.ens.domains
   - Edit content hash
   - Enter new CID
   - Save (~$10-30 gas)

3. **Verify**
   ```
   https://YOUR_DOMAIN.eth.limo
   ```

---

## ❓ Do You Need ENS?

### **✅ Yes, if you want:**
- Professional URL (`dwallet.eth` vs long IPFS hash)
- Easy to remember/share
- Full decentralization
- Brand credibility

### **❌ No, if:**
- Just testing/developing
- Don't mind sharing IPFS hashes
- Want to save costs

**Recommendation:** Get it when launching to production.

---

## 🆘 Troubleshooting

| Issue | Solution |
|-------|----------|
| "Domain not found" | Register it first at app.ens.domains |
| Gateway not loading | Wait 1-2 minutes after setting hash |
| Wrong content showing | Verify CID is correct |
| Transaction failed | Check you have enough ETH for gas |

---

## 📚 Resources

- **ENS Manager:** https://app.ens.domains
- **ENS Gateway:** https://limo.eth
- **Documentation:** https://docs.ens.domains
- **Full Guide:** [ENS_SETUP_COMPLETE.md](./ENS_SETUP_COMPLETE.md)

---

## ✅ Checklist

- [ ] Register/own .eth domain
- [ ] Set content hash to IPFS CID
- [ ] Test ENS gateway URL
- [ ] Update code configuration
- [ ] Announce to community

---

**Estimated Setup Time:** 10 minutes  
**Cost:** ~$15-40  
**Benefit:** Professional, decentralized URL 🚀
