# 🌉 Layer 8 - Complete Cross-Chain Setup Guide

**Date:** April 17, 2026  
**Status:** ✅ Base Sepolia Deployed | 🔄 Multi-Chain Setup In Progress

---

## 📊 Current Deployment Status

| Network | Chain ID | Status | Bridge Address |
|---------|----------|--------|----------------|
| **Base Sepolia** | 84532 | ✅ Deployed | `0x778bf751DE7D18A3ff683d9d644EA686146f726f` |
| **Arbitrum Sepolia** | 421614 | ⏳ Pending | Needs faucet funds |
| **Polygon Amoy** | 80002 | ⏳ Pending | Needs faucet funds |
| **Sepolia** | 11155111 | ⏳ Pending | Needs deployment |

---

## 🚀 Step-by-Step Multi-Chain Deployment

### Step 1: Get Testnet Faucet Funds

Before deploying to other chains, you need testnet ETH:

#### Base Sepolia ✅
- **Status:** Already funded
- **Deployer:** `0x4C0B7314441dfE8E61267C0d87Fc1A657611dCf5`

#### Arbitrum Sepolia ⏳
```bash
# Get faucet from:
# https://faucet.quicknode.com/arbitrum/sepolia
# or
# https://www.alchemy.com/faucets/arbitrum-sepolia

# Check balance:
cast balance 0x4C0B7314441dfE8E61267C0d87Fc1A657611dCf5 --rpc-url https://sepolia-rollup.arbitrum.io/rpc
```

#### Polygon Amoy ⏳
```bash
# Get faucet from:
# https://faucet.polygon.technology/
# or
# https://www.alchemy.com/faucets/polygon-amoy

# Check balance:
cast balance 0x4C0B7314441dfE8E61267C0d87Fc1A657611dCf5 --rpc-url https://rpc-amoy.polygon.technology
```

---

### Step 2: Deploy Layer 8 to Each Chain

Once you have funds, deploy to each chain:

```bash
# Deploy to Arbitrum Sepolia
npx hardhat run scripts/deploy-layer8.cjs --network arbitrumSepolia

# Deploy to Polygon Amoy
npx hardhat run scripts/deploy-layer8.cjs --network polygonAmoy

# Deploy to Sepolia
npx hardhat run scripts/deploy-layer8.cjs --network sepolia
```

**Save all deployment addresses!** You'll need them for Step 3.

---

### Step 3: Set Up Trusted Remotes

After deploying to all chains, you need to set up trusted remotes between them.

#### Example: Connect Base Sepolia ↔ Arbitrum Sepolia

**On Base Sepolia:**
```javascript
const arbitrumBridgeAddress = '0x...' // Bridge address on Arbitrum Sepolia
const path = ethers.solidityPacked(
  ['address', 'address'],
  ['0x778bf751DE7D18A3ff683d9d644EA686146f726f', arbitrumBridgeAddress]
)
await baseBridge.setTrustedRemote(421614, path) // 421614 = Arbitrum Sepolia chain ID
```

**On Arbitrum Sepolia:**
```javascript
const baseBridgeAddress = '0x778bf751DE7D18A3ff683d9d644EA686146f726f'
const path = ethers.solidityPacked(
  ['address', 'address'],
  [arbitrumBridgeAddress, baseBridgeAddress]
)
await arbitrumBridge.setTrustedRemote(84532, path) // 84532 = Base Sepolia chain ID
```

#### Full Mesh Network Setup

For N chains, you need to set up N*(N-1) trusted remote connections:

```
Base Sepolia (84532)    ←→  Arbitrum Sepolia (421614)
Base Sepolia (84532)    ←→  Polygon Amoy (80002)
Base Sepolia (84532)    ←→  Sepolia (11155111)
Arbitrum Sepolia (421614) ←→  Polygon Amoy (80002)
Arbitrum Sepolia (421614) ←→  Sepolia (11155111)
Polygon Amoy (80002)    ←→  Sepolia (11155111)
```

---

### Step 4: Register Relayers (7-of-15 Multisig)

Each relayer must register themselves by staking 1 ETH:

```bash
# Each relayer operator runs:
npx hardhat run scripts/relayer-self-register.cjs --network baseSepolia
```

**Relayer Self-Registration Script:**

Create `scripts/relayer-self-register.cjs`:
```javascript
const { ethers } = require('hardhat')

async function main() {
  const [relayer] = await ethers.getSigners()
  const MESSENGER_ADDRESS = '0x2595640594d53974aF31174d1803a6838b89C334'
  const RELAYER_STAKE = ethers.parseEther('1') // 1 ETH

  console.log('Relayer registering:', relayer.address)
  
  const Messenger = await ethers.getContractFactory(
    'contracts/layer8/EnhancedCrossChainMessenger.sol:EnhancedCrossChainMessenger'
  )
  const messenger = Messenger.attach(MESSENGER_ADDRESS)

  // Register with stake
  await messenger.registerRelayer({ value: RELAYER_STAKE })
  console.log('✅ Relayer registered successfully!')
  
  // Verify
  const isRelayer = await messenger.isRelayer(relayer.address)
  console.log('Is Relayer:', isRelayer)
  
  const info = await messenger.relayerInfo(relayer.address)
  console.log('Stake:', ethers.formatEther(info.stake), 'ETH')
}

main().catch(console.error)
```

---

### Step 5: Configure LayerZero & Axelar Endpoints

Update the placeholder addresses with real endpoints:

#### LayerZero Endpoints (Testnet)
- Base Sepolia: `0x6EDCE65403992e310A62460808c4b910D972f10f`
- Arbitrum Sepolia: `0x6EDCE65403992e310A62460808c4b910D972f10f`
- Polygon Amoy: `0x6EDCE65403992e310A62460808c4b910D972f10f`
- Sepolia: `0x6EDCE65403992e310A62460808c4b910D972f10f`

#### Axelar Gateway (Testnet)
- Check latest addresses at: https://docs.axelar.dev/resources

---

### Step 6: Test Cross-Chain Message Flow

#### Test 1: Send Message from Base Sepolia to Arbitrum Sepolia

```javascript
// On Base Sepolia
const bridge = await ethers.getContractAt('Layer8Bridge', BASE_BRIDGE_ADDRESS)
const payload = ethers.AbiCoder.defaultAbiCoder().encode(
  ['address', 'uint256'],
  [recipientAddress, amount]
)

await bridge.sendMessage(
  421614, // Arbitrum Sepolia chain ID
  ARBITRUM_BRIDGE_ADDRESS,
  payload
)
```

#### Test 2: Relayers Sign the Message

```javascript
// Each relayer signs the message
const messageId = '0x...' // From MessageSent event
await messenger.connect(relayer).signMessage(messageId)
```

#### Test 3: Execute Message After 12-Hour Delay

```javascript
// After 12 hours and 7+ signatures
await messenger.executeMessage(messageId, signatures)
```

---

## 📋 Pre-Deployment Checklist

### For Each Target Chain:

- [ ] Get testnet ETH from faucet
- [ ] Verify deployer account balance
- [ ] Run `npx hardhat run scripts/deploy-layer8.cjs --network <network>`
- [ ] Save all contract addresses
- [ ] Verify contracts on explorer (if possible)
- [ ] Run post-deployment tests

### After All Deployments:

- [ ] Set trusted remotes on all chain pairs
- [ ] Register 15 relayers (1 ETH stake each)
- [ ] Configure real LayerZero endpoints
- [ ] Configure real Axelar endpoints
- [ ] Test cross-chain message flow
- [ ] Monitor relayer performance
- [ ] Set up alerting for failed messages

---

## 🔧 Troubleshooting

### Issue: "insufficient funds for gas"
**Solution:** Get testnet ETH from faucet (see Step 1)

### Issue: "trusted remote not set"
**Solution:** Ensure bidirectional trusted remotes are set on both chains

### Issue: "insufficient signatures"
**Solution:** Wait for at least 7 relayers to sign the message

### Issue: "execution delay not passed"
**Solution:** Wait 12 hours after message creation before execution

---

## 📊 Network Configuration Summary

### Chain IDs:
- Base Sepolia: `84532`
- Arbitrum Sepolia: `421614`
- Polygon Amoy: `80002`
- Sepolia: `11155111`
- Base Mainnet: `8453`
- Arbitrum One: `42161`
- Polygon: `137`
- Ethereum: `1`

### Security Parameters:
- Relayer Stake: 1 ETH
- Multisig Threshold: 7-of-15
- Execution Delay: 12 hours
- Daily Message Cap: 1000
- Auto-Removal: After 100 failed messages

---

## 🎯 Success Criteria

Layer 8 cross-chain bridge is fully operational when:

1. ✅ Deployed on 3+ chains
2. ✅ Trusted remotes configured between all chain pairs
3. ✅ 7-15 relayers registered and staked
4. ✅ Test message successfully bridged between 2 chains
5. ✅ Relayer performance monitoring active
6. ✅ Emergency halt mechanism tested

---

## 📞 Support & Resources

- **LayerZero Docs:** https://layerzero.gitbook.io/docs/
- **Axelar Docs:** https://docs.axelar.dev/
- **Base Sepolia Faucet:** https://faucet.quicknode.com/base/sepolia
- **Arbitrum Sepolia Faucet:** https://faucet.quicknode.com/arbitrum/sepolia
- **Polygon Amoy Faucet:** https://faucet.polygon.technology/

---

**Last Updated:** April 17, 2026  
**Status:** Base Sepolia ✅ | Multi-Chain Setup 🔄 In Progress
