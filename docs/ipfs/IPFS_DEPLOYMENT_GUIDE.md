# IPFS/Arweave Deployment Guide

## Quick Start

### Option 1: Deploy to IPFS (Recommended)

```bash
# 1. Get web3.storage token (free)
#    Visit: https://web3.storage and create account
#    Generate API token from dashboard

# 2. Set environment variable
export WEB3_STORAGE_TOKEN=your_token_here

# 3. Deploy
node scripts/deploy-ipfs.js
```

### Option 2: Deploy to Pinata

```bash
# 1. Get Pinata API keys (free tier available)
#    Visit: https://pinata.cloud and create account
#    Generate API keys from dashboard

# 2. Set environment variables
export PINATA_API_KEY=your_api_key
export PINATA_SECRET_KEY=your_secret_key

# 3. Deploy
node scripts/deploy-ipfs.js
```

### Option 3: Deploy to Arweave

```bash
# 1. Install Bundlr CLI
npm install -g @bundlr-network/client

# 2. Fund your Bundlr wallet (MATIC on Polygon recommended)
bundlr fund --wallet /path/to/wallet.json

# 3. Build frontend
npm run build

# 4. Deploy to Arweave
bundlr upload-dir ./dist --wallet /path/to/wallet.json
```

## Multiple Deployment Strategy

For maximum decentralization, deploy to multiple platforms:

```bash
# Deploy to IPFS
node scripts/deploy-ipfs.js

# Deploy to Arweave
node scripts/deploy-arweave.js

# Deploy to Fleek (alternative IPFS pinning)
npx @fleekhq/cli sites deploy
```

## Access Your Decentralized Frontend

After deployment, your frontend will be available at:

### IPFS Gateways
- `https://{CID}.ipfs.dweb.link`
- `https://ipfs.io/ipfs/{CID}`
- `https://cloudflare-ipfs.com/ipfs/{CID}`
- `https://{CID}.ipfs.pinata.cloud` (if using Pinata)

### ENS Domain (Recommended)
1. Set Content Hash in ENS to `ipfs://{CID}`
2. Access via: `https://dwallet.eth.limo`
3. Access via: `https://dwallet.eth.link`

### Arweave
- `https://arweave.net/{TX_ID}`

## Environment Variables

Add to `.env.local`:

```bash
# IPFS Deployment
WEB3_STORAGE_TOKEN=your_web3storage_token
PINATA_API_KEY=your_pinata_api_key
PINATA_SECRET_KEY=your_pinata_secret_key

# Arweave Deployment
ARWEAVE_WALLET_PATH=/path/to/wallet.json
```

## Automated Deployment

### GitHub Actions

Create `.github/workflows/deploy-ipfs.yml`:

```yaml
name: Deploy to IPFS

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build
        run: npm run build
      
      - name: Deploy to IPFS
        run: node scripts/deploy-ipfs.js
        env:
          WEB3_STORAGE_TOKEN: ${{ secrets.WEB3_STORAGE_TOKEN }}
      
      - name: Save IPFS Hash
        run: |
          echo "IPFS_CID=$(cat ipfs-deployment-*.json | jq -r '.ipfsHash')" >> $GITHUB_ENV
      
      - name: Update GitHub Pages
        run: |
          echo "Deployed to IPFS: $IPFS_CID"
```

## Updating Your Deployment

IPFS hashes are immutable. To update:

1. Make changes to your code
2. Run deployment script again
3. Update ENS record with new CID
4. (Optional) Keep old deployment pinned for archival

## Pinning Strategy

To ensure your frontend stays available:

1. **Pin to multiple services:**
   - web3.storage (automatic pinning)
   - Pinata (manual pin with CID)
   - IPFS Cluster (self-hosted)

2. **Set up IPNS:**
   ```bash
   # Create IPNS name
   ipfs name create
   
   # Publish CID to IPNS
   ipfs name publish {CID}
   
   # Access via IPNS
   https://ipfs.io/ipns/{IPNS_NAME}
   ```

3. **Use Fleek for continuous deployment:**
   - Connect GitHub repository
   - Auto-deploy on every push
   - Automatic IPFS pinning
   - Custom domain support

## Cost Comparison

| Service | Free Tier | Paid Plans | Best For |
|---------|-----------|------------|----------|
| web3.storage | 10 GB/month | $8/TB/month | Easy deployment |
| Pinata | 1 GB free | $10/month | Reliable pinning |
| Fleek | Free tier | $20/month | Continuous deployment |
| Arweave | One-time fee | ~$0.50/MB | Permanent storage |
| IPFS (self-hosted) | Free | Server costs | Full control |

## Security Considerations

1. **Content addressing:** IPFS CIDs are content-hashed, ensuring integrity
2. **Immutability:** Once deployed, content cannot be changed
3. **Decentralization:** Multiple nodes can serve your content
4. **Censorship resistance:** No single point of failure
5. **ENS integration:** Human-readable domains with IPFS backend

## Troubleshooting

### Build fails
```bash
# Clear cache and reinstall
rm -rf node_modules dist
npm install
npm run build
```

### Upload fails
```bash
# Check API token
echo $WEB3_STORAGE_TOKEN

# Try alternative gateway
export WEB3_STORAGE_GATEWAY=https://w3s.link
```

### Gateway not loading
```bash
# Try multiple gateways
curl https://ipfs.io/ipfs/{CID}
curl https://cloudflare-ipfs.com/ipfs/{CID}
curl https://dweb.link/ipfs/{CID}
```

## Next Steps

1. ✅ Deploy to IPFS
2. ✅ Set up ENS domain
3. ✅ Pin to multiple services
4. ⬜ Set up continuous deployment
5. ⬜ Add IPNS for mutable references
6. ⬜ Deploy to Arweave for permanence
7. ⬜ Set up monitoring for gateways
