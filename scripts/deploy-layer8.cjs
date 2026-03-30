const { ethers } = require('hardhat')
require('dotenv').config()

async function main() {
  const [deployer] = await ethers.getSigners()
  let currentNonce = await deployer.getNonce('pending')
  console.log('Deploying Layer 8 Multichain with:', deployer.address)
  console.log('Starting nonce:', currentNonce)

  // Properly checksummed or lowercased addresses
  const DWT_TOKEN =
    process.env.DWT_TOKEN || process.env.DWT_TOKEN_ADDRESS || deployer.address
  const LZ_ENDPOINT = process.env.LZ_ENDPOINT || deployer.address
  const AXELAR_GATEWAY = process.env.AXELAR_GATEWAY || deployer.address
  const AXELAR_GAS_SERVICE = process.env.AXELAR_GAS_SERVICE || deployer.address
  const LAYER7_SECURITY_ADDRESS = process.env.LAYER7_SECURITY_ADDRESS
  if (!LAYER7_SECURITY_ADDRESS)
    throw new Error('LAYER7_SECURITY_ADDRESS not set in .env')

  const REWARD_RATE = ethers.parseEther('0.1') // 0.1 DWT / sec
  const VOTING_DELAY = 3600 // 1 hour
  const VOTING_PERIOD = 604800 // 1 week
  const THRESHOLD = ethers.parseEther('1000') // 1000 DWT
  const QUORUM = 4 // 4%

  // 1. Layer8Bridge
  console.log('\n1/4  Deploying Layer8Bridge...')
  const Bridge = await ethers.getContractFactory(
    'contracts/layer8/Layer8Bridge.sol:Layer8Bridge',
  )
  const bridge = await Bridge.deploy(
    LZ_ENDPOINT,
    AXELAR_GATEWAY,
    AXELAR_GAS_SERVICE,
    LAYER7_SECURITY_ADDRESS,
    { nonce: currentNonce++ },
  )
  await bridge.waitForDeployment()
  const bridgeAddr = await bridge.getAddress()
  console.log('     Layer8Bridge:', bridgeAddr)

  // 2. StakingHub
  console.log('2/4  Deploying StakingHub...')
  const StakingHub = await ethers.getContractFactory(
    'contracts/layer8/CrossChainStaking.sol:StakingHub',
  )
  const stakingHub = await StakingHub.deploy(
    DWT_TOKEN,
    LZ_ENDPOINT,
    REWARD_RATE,
    LAYER7_SECURITY_ADDRESS,
    { nonce: currentNonce++ },
  )
  await stakingHub.waitForDeployment()
  const stakingHubAddr = await stakingHub.getAddress()
  console.log('     StakingHub:', stakingHubAddr)

  // 3. GovernanceHub
  console.log('3/4  Deploying GovernanceHub...')
  const GovernanceHub = await ethers.getContractFactory(
    'contracts/layer8/CrossChainGovernance.sol:GovernanceHub',
  )
  const governanceHub = await GovernanceHub.deploy(
    DWT_TOKEN,
    LZ_ENDPOINT,
    VOTING_DELAY,
    VOTING_PERIOD,
    THRESHOLD,
    QUORUM,
    LAYER7_SECURITY_ADDRESS,
    { nonce: currentNonce++ },
  )
  await governanceHub.waitForDeployment()
  const governanceHubAddr = await governanceHub.getAddress()
  console.log('     GovernanceHub:', governanceHubAddr)

  // 4. BridgedToken
  console.log('4/4  Deploying BridgedToken...')
  const BridgedToken = await ethers.getContractFactory(
    'contracts/layer8/BridgedToken.sol:BridgedToken',
  )
  const bridgedToken = await BridgedToken.deploy(
    'Bridged DWallet Token',
    'bDWT',
    18,
    LZ_ENDPOINT,
    AXELAR_GATEWAY,
    AXELAR_GAS_SERVICE,
    LAYER7_SECURITY_ADDRESS,
    { nonce: currentNonce++ },
  )
  await bridgedToken.waitForDeployment()
  const bridgedTokenAddr = await bridgedToken.getAddress()
  console.log('     BridgedToken:', bridgedTokenAddr)

  console.log('\n════════════════════════════════════════════════════')
  console.log('  Layer 8 — Multichain — Deployment Complete')
  console.log('════════════════════════════════════════════════════')
  console.log('  Layer8Bridge    :', bridgeAddr)
  console.log('  StakingHub      :', stakingHubAddr)
  console.log('  GovernanceHub   :', governanceHubAddr)
  console.log('  BridgedToken    :', bridgedTokenAddr)
  console.log('════════════════════════════════════════════════════\n')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
