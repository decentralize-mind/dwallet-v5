# IPFS Quick Reference Card

## Current Deployment

**IPFS CID:** `bafybeicmhmthzgn6r3nvwtvd3mjt3vzwwzmyyujmjcn4jvczlwli7zrc4m`  
**Deployed:** April 16, 2026  
**Status:** ✅ LIVE

## Gateway URLs

### ✅ Primary (Use This)
```
https://ipfs.io/ipfs/bafybeicmhmthzgn6r3nvwtvd3mjt3vzwwzmyyujmjcn4jvczlwli7zrc4m
```

### ✅ Backup
```
https://bafybeicmhmthzgn6r3nvwtvd3mjt3vzwwzmyyujmjcn4jvczlwli7zrc4m.ipfs.dweb.link
```

## Quick Commands

### Test Gateway
```bash
curl -s -o /dev/null -w "%{http_code}" "https://ipfs.io/ipfs/bafybeicmhmthzgn6r3nvwtvd3mjt3vzwwzmyyujmjcn4jvczlwli7zrc4m/"
```

### Deploy Update
```bash
node scripts/deploy-ipfs.js
```

### Test All Gateways
```bash
bash scripts/test-ipfs-gateways.sh
```

## Code Usage

### Using Failover Manager
```javascript
import { getIPFSFailoverManager } from '../utils/ipfsFailover'

const ipfsManager = getIPFSFailoverManager()
const url = ipfsManager.getUrlSync('ipfs://YOUR_CID')
```

### Using Configuration
```javascript
import { getIPFSUrl, CURRENT_IPFS_CID } from '../config/ipfsGateways'

const url = getIPFSUrl(CURRENT_IPFS_CID, 'ipfs-io')
```

## Gateway Priority

1. **ipfs.io** - Primary (fastest, most reliable)
2. **dweb.link** - Secondary (excellent backup)
3. **w3s.link** - Tertiary (good alternative)
4. **gateway.pinata.cloud** - Limited (may need API key)
5. **cloudflare-ipfs.com** - Last resort (DNS issues)

## Environment Variables

```bash
# Optional: Override default CID
VITE_IPFS_CID=your_cid_here

# Pinata API Keys (for deployment)
PINATA_API_KEY=your_key
PINATA_SECRET_KEY=your_secret
```

## File Locations

- **Config:** `src/config/ipfsGateways.js`
- **Failover:** `src/utils/ipfsFailover.js`
- **Deploy Script:** `scripts/deploy-ipfs.js`
- **Test Script:** `scripts/test-ipfs-gateways.sh`

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Gateway not loading | Try backup gateway |
| DNS errors | Use path-based URLs |
| Slow loading | Switch to faster gateway |
| Content not found | Re-deploy and update CID |

## Links

- [Full Documentation](./docs/ipfs/README.md)
- [Gateway Status](./docs/ipfs/GATEWAY_STATUS_REPORT.md)
- [Deployment Guide](./docs/ipfs/IPFS_DEPLOYMENT_GUIDE.md)
