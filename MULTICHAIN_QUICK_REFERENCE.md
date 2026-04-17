# 🚀 Multi-Chain Quick Reference Card

## 📋 Current Deployment Status

| Network | Status | Chain ID | Explorer |
|---------|--------|----------|----------|
| Base Sepolia | ✅ Deployed (Layer 9) | 84532 | https://sepolia.basescan.org |
| Base Mainnet | ⏳ Ready to deploy | 8453 | https://basescan.org |
| Arbitrum Sepolia | 🔧 Configured | 421614 | https://sepolia.arbiscan.io |
| Arbitrum Mainnet | 🔧 Configured | 42161 | https://arbiscan.io |
| Polygon Amoy | 🔧 Configured | 80002 | https://amoy.polygonscan.com |
| Polygon Mainnet | 🔧 Configured | 137 | https://polygonscan.com |

---

## ⚡ Quick Start Commands

### 1. Check Balance on Any Network
```bash
npx hardhat run --network baseSepolia -e "
const [s] = await ethers.getSigners();
console.log(ethers.formatEther(await s.getBalance()), 'ETH');
"
```

### 2. Deploy All Layers to Any Network
```bash
# Testnet
npx hardhat run scripts/GENESIS_FINISH.sh --network baseSepolia

# Mainnet
./scripts/mainnet_deploy.sh
```

### 3. Multi-Chain Setup (Interactive)
```bash
./scripts/setup-multichain.sh
```

### 4. Run Security Tests
```bash
bash run-all-security-tests.sh
```

### 5. Verify Contract on Explorer
```bash
npx hardhat verify --network base <CONTRACT_ADDRESS>
```

---

## 🌉 Cross-Chain Bridge Setup

### LayerZero Integration
```bash
npm install @layerzerolabs/sdk
```

**Endpoints:**
- Base: `0x6EDCE65403992e310A62460808c4b910D972f10f`
- Arbitrum: `0x6EDCE65403992e310A62460808c4b910D972f10f`
- Polygon: `0x6EDCE65403992e310A62460808c4b910D972f10f`

Docs: https://docs.layerzero.network/

### Axelar Integration
```bash
npm install @axelar-network/axelar-gmp-sdk-solidity
```

**Gateways:**
- Base: `0xe432150cce91c13a887f7D836923d5597adD8E31`
- Arbitrum: `0xe432150cce91c13a887f7D836923d5597adD8E31`
- Polygon: `0xe432150cce91c13a887f7D836923d5597adD8E31`

Docs: https://docs.axelar.dev/

---

## 💰 Testnet Faucets

| Network | Faucet URL |
|---------|-----------|
| Base Sepolia | https://faucets.chain.link/base-sepolia |
| Arbitrum Sepolia | https://faucet.quicknode.com/arbitrum/sepolia |
| Polygon Amoy | https://faucet.polygon.technology/ |
| Sepolia (ETH) | https://sepoliafaucet.com/ |

---

## 🔑 Environment Variables

### Required for Mainnet
```bash
DEPLOYER_PRIVATE_KEY=your_mainnet_key
BASESCAN_API_KEY=your_basescan_key
INFURA_KEY=your_infura_key
LAYER7_SECURITY_ADDRESS=0xDeployedAddress
DWT_TOKEN_ADDRESS=0xDeployedAddress
```

### Optional for Multi-Chain
```bash
ARBISCAN_KEY=your_arbiscan_key
POLYGONSCAN_KEY=your_polygonscan_key
ETHERSCAN_KEY=your_etherscan_key
```

---

## 📊 Gas Estimates

| Network | Avg Gas Price | Deployment Cost |
|---------|---------------|-----------------|
| Base Mainnet | 0.1-0.5 gwei | 0.5-2 ETH |
| Arbitrum | 0.01-0.1 gwei | 0.1-0.5 ETH |
| Polygon | 30-100 gwei | 0.2-1 MATIC |
| Ethereum L1 | 20-50 gwei | 2-5 ETH |

---

## 🛡️ Security Checklist

Before mainnet deployment:
- [ ] All unit tests passing (100% coverage)
- [ ] Integration tests complete
- [ ] Cross-chain tests passing
- [ ] Formal verification done
- [ ] Security audit complete
- [ ] Bug bounty launched
- [ ] Emergency pause tested
- [ ] Bridge relayers recruited (15 min)
- [ ] Monitoring dashboards set up
- [ ] Alert system configured

---

## 🌐 Network RPC URLs

### Testnets
```
Base Sepolia:      https://sepolia.base.org
Arbitrum Sepolia:  https://sepolia-rollup.arbitrum.io/rpc
Polygon Amoy:      https://rpc-amoy.polygon.technology
Sepolia:           https://sepolia.infura.io/v3/YOUR_KEY
```

### Mainnets
```
Base:              https://mainnet.base.org
Arbitrum:          https://arb1.arbitrum.io/rpc
Polygon:           https://polygon-rpc.com
Ethereum:          https://mainnet.infura.io/v3/YOUR_KEY
Optimism:          https://mainnet.optimism.io
```

---

## 📚 Important Files

| File | Purpose |
|------|---------|
| `hardhat.config.cjs` | Network configurations |
| `.env.production` | Mainnet environment variables |
| `scripts/mainnet_deploy.sh` | Automated mainnet deployment |
| `scripts/GENESIS_FINISH.sh` | Testnet deployment script |
| `scripts/setup-multichain.sh` | Interactive multi-chain setup |
| `contracts/layer8/` | Cross-chain bridge contracts |
| `MULTICHAIN_EXPANSION_GUIDE.md` | Complete expansion guide |

---

## 🚨 Emergency Contacts

### Pause Protocol
```bash
npx hardhat run --network base -e "
const c = await ethers.getContractAt('SecurityController', '0xADDRESS');
await c.pauseProtocol();
"
```

### Bridge Emergency Stop
```bash
npx hardhat run --network base -e "
const b = await ethers.getContractAt('Layer8Bridge', '0xADDRESS');
await b.emergencyStop();
"
```

---

## 📖 Documentation Links

- **LayerZero**: https://docs.layerzero.network/
- **Axelar**: https://docs.axelar.dev/
- **Chainlink CCIP**: https://docs.chain.link/ccip
- **Hardhat**: https://hardhat.org/docs
- **OpenZeppelin**: https://docs.openzeppelin.com/
- **Base Docs**: https://docs.base.org/

---

## 🎯 Deployment Order

1. Layer 7 (Security Controller)
2. Layer 1 (Token, Governance, Treasury)
3. Layer 2 (DEX, Oracle)
4. Layer 3 (Infrastructure)
5. Layer 4 (Staking)
6. Layer 5 (Cross-Chain Hub)
7. Layer 6 (Treasury, Vesting)
8. Layer 8 (Bridge)
9. Layer 9 (Ecosystem)
10. Layer 10 (Advanced DeFi)

---

## 💡 Pro Tips

1. **Deploy during low-traffic hours** (UTC 2-6 AM) to save on gas
2. **Use `gasPrice: 'auto'`** in hardhat config for optimal pricing
3. **Always test on testnets first** before mainnet deployment
4. **Keep 50% more ETH than estimated** for gas price spikes
5. **Verify contracts immediately** after deployment
6. **Transfer to governance** after verification
7. **Monitor for 48 hours** before announcing

---

## 🆘 Troubleshooting

### "Insufficient funds"
→ Get more testnet ETH from faucets listed above

### "Network timeout"
→ Increase timeout in hardhat.config.cjs: `timeout: 120000`

### "Contract already deployed"
→ Check deployment JSON files in `/deployments/` directory

### "Cross-chain message failed"
→ Verify trusted remote paths are set correctly

### "Gas price too low"
→ Increase gas price or use `gasPrice: 'auto'`

---

## 📞 Community & Support

- **Base Discord**: https://discord.gg/buildonbase
- **Arbitrum Discord**: https://discord.gg/arbitrum
- **Polygon Discord**: https://discord.gg/polygon
- **LayerZero Discord**: https://discord.gg/layerzero
- **Hardhat Support**: https://hardhat.org/support

---

**Last Updated:** April 17, 2026
**Version:** dWallet v5.0
