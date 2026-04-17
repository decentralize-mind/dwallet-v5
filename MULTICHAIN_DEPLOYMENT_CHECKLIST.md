# ✅ Multi-Chain Deployment Checklist

## 📋 Pre-Deployment Preparation

### Security
- [ ] All unit tests passing (run: `npx hardhat test`)
- [ ] Test coverage > 95% (run: `npx hardhat coverage`)
- [ ] Formal verification complete (check: `formal-verification/`)
- [ ] Security audit report received
- [ ] All critical/high issues fixed
- [ ] Bug bounty program launched
- [ ] Emergency pause mechanism tested
- [ ] Rate limiting tested
- [ ] Access control verified

### Infrastructure
- [ ] Multi-RPC failover configured (check: `src/utils/rpcFailover.js`)
- [ ] Bridge relayers recruited (minimum 15)
- [ ] Oracle feeds configured for all chains
- [ ] Monitoring dashboards set up
- [ ] Alert system configured (Slack/Discord/Email)
- [ ] IPFS deployment ready (check: `scripts/deploy-ipfs.js`)
- [ ] ENS domain configured (optional)

### Documentation
- [ ] API documentation updated
- [ ] User guides written
- [ ] Deployment guides complete
- [ ] Troubleshooting guides ready
- [ ] Smart contract NatSpec complete

### Legal & Compliance
- [ ] Legal review complete
- [ ] Token distribution plan finalized
- [ ] Governance structure documented
- [ ] Terms of service written
- [ ] Privacy policy written

---

## 🚀 Phase 1: Base Mainnet Deployment

### Week 1: Environment Setup

#### Day 1-2: Get API Keys
- [ ] BaseScan API key: https://basescan.org/myapikey
- [ ] Infura/Alchemy key for reliable RPC
- [ ] Etherscan key (for cross-chain verification)
- [ ] LayerZero/Axelar API key (for bridge)
- [ ] CoinGecko API key (for price feeds)

#### Day 3-4: Environment Configuration
- [ ] Create `.env.production` file
- [ ] Add `DEPLOYER_PRIVATE_KEY` (mainnet wallet)
- [ ] Add `BASESCAN_API_KEY`
- [ ] Add `INFURA_KEY`
- [ ] Add `LAYER7_SECURITY_ADDRESS` (from testnet deployment)
- [ ] Add `DWT_TOKEN_ADDRESS` (if already deployed)
- [ ] **Never commit .env.production to Git!**

#### Day 5-7: Compile & Test
- [ ] Run `npx hardhat compile`
- [ ] Fix any compilation errors
- [ ] Run `bash run-all-security-tests.sh`
- [ ] Fix any failing tests
- [ ] Run `npx hardhat test` (all tests should pass)

### Week 2: Deploy to Base Mainnet

#### Day 1: Check Balance
- [ ] Get deployer address:
  ```bash
  npx hardhat run --network base -e "
    const [s] = await ethers.getSigners();
    console.log(s.address);
  "
  ```
- [ ] Check balance (need at least 0.5 ETH):
  ```bash
  npx hardhat run --network base -e "
    const [s] = await ethers.getSigners();
    console.log(ethers.formatEther(await s.getBalance()), 'ETH');
  "
  ```
- [ ] If balance < 0.5 ETH, fund the wallet

#### Day 2: Deploy Layer 7 (Security)
- [ ] Deploy security controller:
  ```bash
  npx hardhat run scripts/deploy-layer7.cjs --network base
  ```
- [ ] Save deployed address
- [ ] Verify on BaseScan:
  ```bash
  npx hardhat verify --network base <ADDRESS>
  ```

#### Day 3: Deploy Layer 1 (Core)
- [ ] Deploy token, governor, timelock, treasury:
  ```bash
  npx hardhat run contracts/layer1/deploy.cjs --network base
  ```
- [ ] Save all addresses
- [ ] Verify all contracts

#### Day 4: Deploy Layer 2-4
- [ ] Deploy DEX & Oracle (Layer 2):
  ```bash
  npx hardhat run contracts/layer2/scripts/deploy.cjs --network base
  ```
- [ ] Deploy Infrastructure (Layer 3):
  ```bash
  npx hardhat run contracts/layer3/deploy.cjs --network base
  ```
- [ ] Deploy Staking (Layer 4):
  ```bash
  npx hardhat run contracts/layer4/scripts/deploy.cjs --network base
  ```

#### Day 5: Deploy Layer 5-7
- [ ] Deploy Cross-Chain Hub (Layer 5):
  ```bash
  npx hardhat run contracts/layer5/deploy.cjs --network base
  ```
- [ ] Deploy Treasury & Vesting (Layer 6):
  ```bash
  npx hardhat run contracts/layer6/scripts/deploy-layer6.cjs --network base
  ```
- [ ] Configure Security Controller (Layer 7) with all addresses

#### Day 6: Deploy Layer 8-10
- [ ] Deploy Multichain Bridge (Layer 8):
  ```bash
  npx hardhat run scripts/deploy-layer8.cjs --network base
  ```
- [ ] Deploy Ecosystem (Layer 9):
  ```bash
  npx hardhat run scripts/deploy-layer9.cjs --network base
  ```
- [ ] Deploy Advanced DeFi (Layer 10):
  ```bash
  npx hardhat run contracts/layer10/scripts/deploy.cjs --network base
  ```

#### Day 7: Verify All Contracts
- [ ] Verify each contract on BaseScan
- [ ] Check all contracts show "Verified" on explorer
- [ ] Test basic functionality on each contract

### Week 3: Post-Deployment

#### Day 1-2: Transfer Ownership
- [ ] Deploy governance timelock (if not already done)
- [ ] Transfer ownership of all contracts:
  ```bash
  export GOVERNANCE_TIMELOCK_ADDRESS=0xYourAddress
  npx hardhat run scripts/transfer-ownership-to-governance.js --network base
  ```
- [ ] Verify ownership transferred correctly

#### Day 3-4: Configure Bridge Relayers
- [ ] Register 15 relayers:
  ```bash
  export CROSS_CHAIN_MESSENGER_ADDRESS=0xMessengerAddress
  export RELAYER_ADDRESSES=0x1...,0x2...,0x3...
  npx hardhat run scripts/register-relayers.js --network base
  ```
- [ ] Verify relayer count = 15
- [ ] Verify required signatures = 7

#### Day 5-6: Set Up Monitoring
- [ ] Deploy monitoring dashboard
- [ ] Configure alerts for:
  - Large transactions
  - Bridge activity
  - Oracle staleness
  - Protocol pauses
  - Governance proposals
- [ ] Test alert system

#### Day 7: Security Check
- [ ] Run final security tests
- [ ] Check all access controls
- [ ] Verify emergency pause works
- [ ] Test bridge emergency stop
- [ ] Document emergency procedures

### Week 4: Launch

#### Day 1-3: Soft Launch
- [ ] Deploy frontend to IPFS
- [ ] Test all features end-to-end
- [ ] Monitor for 48 hours
- [ ] Fix any issues found

#### Day 4-5: Community Announcement
- [ ] Write announcement blog post
- [ ] Post on Twitter/X
- [ ] Announce on Discord/Telegram
- [ ] Submit to Base ecosystem page
- [ ] List on DeFi tracking sites

#### Day 6-7: Monitor & Iterate
- [ ] Monitor protocol health
- [ ] Respond to community questions
- [ ] Fix any bugs immediately
- [ ] Plan next improvements

---

## 🌉 Phase 2: Multi-Chain Expansion

### Month 2: Testnet Deployment

#### Week 1: Configuration
- [ ] Update `hardhat.config.cjs` with new networks:
  - [ ] arbitrumSepolia (Chain ID: 421614)
  - [ ] polygonAmoy (Chain ID: 80002)
- [ ] Get testnet ETH:
  - [ ] Arbitrum Sepolia: https://faucet.quicknode.com/arbitrum/sepolia
  - [ ] Polygon Amoy: https://faucet.polygon.technology/
- [ ] Get API keys:
  - [ ] Arbiscan key: https://arbiscan.io/myapikey
  - [ ] Polygonscan key: https://polygonscan.io/myapikey

#### Week 2: Deploy to Arbitrum Sepolia
- [ ] Deploy Layer 7:
  ```bash
  npx hardhat run scripts/deploy-layer7.cjs --network arbitrumSepolia
  ```
- [ ] Deploy Layer 1-4
- [ ] Deploy Layer 5-7
- [ ] Deploy Layer 8-10
- [ ] Verify all contracts

#### Week 3: Deploy to Polygon Amoy
- [ ] Deploy all layers (same as Arbitrum)
- [ ] Verify all contracts
- [ ] Test on both testnets

#### Week 4: Cross-Chain Bridge Setup
- [ ] Choose cross-chain provider:
  - [ ] LayerZero: https://docs.layerzero.network/
  - [ ] Axelar: https://docs.axelar.dev/
  - [ ] Chainlink CCIP: https://docs.chain.link/ccip
- [ ] Install SDK
- [ ] Deploy bridge contracts on all chains
- [ ] Configure trusted remotes:
  ```javascript
  // Base → Arbitrum
  await baseBridge.setTrustedRemote(arbitrumChainId, path);
  // Arbitrum → Base
  await arbitrumBridge.setTrustedRemote(baseChainId, path);
  ```

### Month 3: Testing & Mainnet

#### Week 1-2: Cross-Chain Testing
- [ ] Test Base ↔ Arbitrum bridge
- [ ] Test Base ↔ Polygon bridge
- [ ] Test Arbitrum ↔ Polygon bridge
- [ ] Test cross-chain staking
- [ ] Test cross-chain governance
- [ ] Load testing (1000+ TPS)
- [ ] Test failover scenarios

#### Week 3: Security Audit
- [ ] Audit cross-chain contracts
- [ ] Fix any issues found
- [ ] Get second opinion audit
- [ ] Update bug bounty to include cross-chain

#### Week 4: Deploy to Mainnets
- [ ] Deploy to Arbitrum Mainnet:
  ```bash
  npx hardhat run scripts/deploy-layer8.cjs --network arbitrum
  ```
- [ ] Deploy to Polygon Mainnet:
  ```bash
  npx hardhat run scripts/deploy-layer8.cjs --network polygon
  ```
- [ ] Verify all contracts
- [ ] Configure production bridges
- [ ] Monitor for 1 week

---

## 🏛️ Phase 3: Full Ecosystem

### Month 4-6: Additional Chains

#### Add Networks
- [ ] Optimism (Chain ID: 10)
- [ ] zkSync (Chain ID: 324)
- [ ] Ethereum Mainnet (Chain ID: 1)
- [ ] Scroll (Chain ID: 534352) - optional
- [ ] BNB Chain (Chain ID: 56) - optional
- [ ] Avalanche (Chain ID: 43114) - optional

#### Deploy & Configure
- [ ] Deploy all layers on each chain
- [ ] Configure all bridge routes (N chains = N×(N-1) routes)
- [ ] Set up oracles on each chain
- [ ] Deploy liquidity pools
- [ ] Configure cross-chain rebalancing

#### Governance & Growth
- [ ] Launch governance DAO
- [ ] Set up community treasury
- [ ] Launch incentive programs
- [ ] Partnership integrations
- [ ] Mobile app development

---

## 🔍 Verification Checklist

### After Each Deployment
- [ ] Contract deployed successfully
- [ ] Contract verified on explorer
- [ ] Owner is correct address
- [ ] Constructor parameters correct
- [ ] Basic functions work
- [ ] Events emit correctly
- [ ] Gas usage reasonable
- [ ] No compilation warnings

### Cross-Chain Verification
- [ ] Trusted remotes set correctly
- [ ] Bridge routes configured
- [ ] Message passing works
- [ ] Tokens mint/burn correctly
- [ ] Relayers registered
- [ ] Signature threshold met
- [ ] Timeout handling works
- [ ] Retry logic functional

---

## 🚨 Emergency Procedures

### If Bug Found
1. **Pause Protocol Immediately:**
   ```bash
   npx hardhat run --network base -e "
     const c = await ethers.getContractAt('SecurityController', '0xADDRESS');
     await c.pauseProtocol();
   "
   ```

2. **Notify Community:**
   - Post on Twitter/Discord
   - Explain the issue
   - Provide ETA for fix

3. **Deploy Fix:**
   - Write fix on local branch
   - Test thoroughly
   - Deploy to testnet first
   - Deploy to mainnet
   - Unpause protocol

4. **Post-Mortem:**
   - Document what happened
   - Explain fix
   - Update security measures
   - Compensate affected users (if any)

### If Bridge Exploit Detected
1. **Stop Bridge Immediately:**
   ```bash
   npx hardhat run --network base -e "
     const b = await ethers.getContractAt('Layer8Bridge', '0xADDRESS');
     await b.emergencyStop();
   "
   ```

2. **Assess Damage:**
   - Check affected chains
   - Calculate losses
   - Identify attack vector

3. **Coordinate with Teams:**
   - Contact LayerZero/Axelar team
   - Work with security researchers
   - Coordinate with other chains

4. **Recover & Fix:**
   - Patch vulnerability
   - Return funds if possible
   - Relaunch with fixes
   - Increase security measures

---

## 📊 Post-Launch Monitoring

### Daily Checks
- [ ] Protocol TVL
- [ ] Bridge volume
- [ ] Oracle freshness
- [ ] Relayer performance
- [ ] Gas prices
- [ ] Error rates
- [ ] Community sentiment

### Weekly Checks
- [ ] Security logs review
- [ ] Contract interactions audit
- [ ] Governance proposals
- [ ] Liquidity levels
- [ ] User growth metrics
- [ ] Competitor analysis

### Monthly Checks
- [ ] Full security review
- [ ] Performance optimization
- [ ] Feature roadmap update
- [ ] Community feedback
- [ ] Partnership opportunities
- [ ] Regulatory compliance

---

## 📝 Documentation to Maintain

### Technical
- [ ] Contract addresses for all chains
- [ ] Deployment scripts
- [ ] API documentation
- [ ] Integration guides
- [ ] Troubleshooting guides

### User-Facing
- [ ] User manual
- [ ] FAQ
- [ ] Video tutorials
- [ ] Blog posts
- [ ] Social media content

### Internal
- [ ] Runbooks
- [ ] Incident response plan
- [ ] Security procedures
- [ ] Governance guidelines
- [ ] Partnership templates

---

## 🎯 Success Criteria

### Phase 1 Success
- [ ] All 10 layers deployed on Base Mainnet
- [ ] All contracts verified
- [ ] Ownership transferred to governance
- [ ] 15 relayers active
- [ ] 48-hour monitoring without incidents
- [ ] Community announcement made
- [ ] TVL > $100k

### Phase 2 Success
- [ ] 3 chains operational (Base, Arbitrum, Polygon)
- [ ] All 6 bridge routes working
- [ ] Cross-chain volume > $1M/month
- [ ] Bridge uptime > 99.9%
- [ ] TVL > $5M

### Phase 3 Success
- [ ] 5+ chains operational
- [ ] All 20 bridge routes active
- [ ] Cross-chain volume > $10M/month
- [ ] Governance DAO active
- [ ] TVL > $50M
- [ ] Community > 100k members

---

## 📞 Support & Resources

### Documentation
- Main guide: `MULTICHAIN_EXPANSION_GUIDE.md`
- Quick reference: `MULTICHAIN_QUICK_REFERENCE.md`
- Roadmap: `MULTICHAIN_ROADMAP.md`
- Network config: `hardhat.multichain.config.cjs`

### Scripts
- Setup wizard: `scripts/setup-multichain.sh`
- Mainnet deploy: `scripts/mainnet_deploy.sh`
- Testnet deploy: `scripts/GENESIS_FINISH.sh`
- Relayer registration: `scripts/register-relayers.js`

### Community
- Base Discord: https://discord.gg/buildonbase
- Arbitrum Discord: https://discord.gg/arbitrum
- Polygon Discord: https://discord.gg/polygon
- LayerZero Discord: https://discord.gg/layerzero

---

**Remember:** Check off each item as you complete it. Don't skip security steps!

**Last Updated:** April 17, 2026
