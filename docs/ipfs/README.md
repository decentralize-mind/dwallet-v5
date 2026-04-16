# IPFS Deployment - Master Documentation

This directory contains all documentation related to IPFS deployment for the dWallet frontend.

## 📚 Documentation Index

### Quick Start
- **[IPFS Quick Reference](./IPFS_QUICK_REFERENCE.md)** - Fast access to current deployment info and gateway URLs

### Deployment Guides
- **[IPFS Deployment Guide](./IPFS_DEPLOYMENT_GUIDE.md)** - Complete guide for deploying to IPFS, Pinata, and Arweave
- **[Manual Pinata Upload](./MANUAL_PINATA_UPLOAD.md)** - Step-by-step guide for manual Pinata uploads

### Status Reports
- **[Gateway Status Report](./GATEWAY_STATUS_REPORT.md)** - Current status of all IPFS gateways
- **[Deployment Success](./IPFS_DEPLOYMENT_SUCCESS.md)** - Latest successful deployment details

### Implementation
- **[IPFS Gateway Failover](../src/utils/ipfsFailover.js)** - Automatic gateway failover implementation
- **[Gateway Configuration](../src/config/ipfsGateways.js)** - Centralized gateway configuration

## 🚀 Current Deployment Status

**Last Updated:** April 16, 2026  
**IPFS CID:** `bafybeicmhmthzgn6r3nvwtvd3mjt3vzwwzmyyujmjcn4jvczlwli7zrc4m`

### Working Gateways ✅
1. **IPFS.io** (Primary) - https://ipfs.io/ipfs/bafybeicmhmthzgn6r3nvwtvd3mjt3vzwwzmyyujmjcn4jvczlwli7zrc4m
2. **Dweb.link** (Backup) - https://bafybeicmhmthzgn6r3nvwtvd3mjt3vzwwzmyyujmjcn4jvczlwli7zrc4m.ipfs.dweb.link

### Limited Access ⚠️
3. **Pinata.cloud** - Requires API key for some features
4. **Cloudflare-ipfs.com** - Experiencing DNS issues

## 🔧 Key Files

### Source Code
- `src/config/ipfsGateways.js` - Gateway configuration and helper functions
- `src/utils/ipfsFailover.js` - Automatic failover manager
- `src/components/NFTsView.jsx` - Example usage with failover

### Scripts
- `scripts/deploy-ipfs.js` - Automated deployment script
- `scripts/test-ipfs-gateways.sh` - Gateway testing script
- `scripts/upload-to-pinata.sh` - Pinata upload script

### Configuration
- `.env` - Environment variables (includes Pinata API keys)
- `pinata-upload-response.json` - Latest Pinata upload response

## 📋 Common Tasks

### Deploy New Version
```bash
node scripts/deploy-ipfs.js
```

### Test All Gateways
```bash
bash scripts/test-ipfs-gateways.sh
```

### Check Gateway Status
```bash
curl -s -o /dev/null -w "%{http_code}" "https://ipfs.io/ipfs/YOUR_CID/"
```

## 🎯 Best Practices

1. **Always use the failover manager** - Don't hardcode gateway URLs
2. **Test all gateways after deployment** - Ensure content is accessible
3. **Pin to multiple services** - Redundancy ensures availability
4. **Update documentation** - Keep status reports current
5. **Monitor gateway health** - Use the built-in health checking

## 📞 Support

For issues or questions about IPFS deployment:
1. Check the [Gateway Status Report](./GATEWAY_STATUS_REPORT.md)
2. Review the [Troubleshooting section](./IPFS_DEPLOYMENT_GUIDE.md#troubleshooting)
3. Test gateways using the test script

---

**Note:** This is the master index. Please refer to individual documents for detailed information.
