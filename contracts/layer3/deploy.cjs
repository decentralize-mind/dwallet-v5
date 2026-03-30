// deploy.js — Layer 3 dWallet Protocol Deployment Script
// Oracles, Fee Routing, veDWT, Buyback, Bridge, Emergency
// Run with: npx hardhat run deploy.js --network <network>

const { ethers } = require('hardhat')

async function main() {
  const [deployer] = await ethers.getSigners()
  let currentNonce = await deployer.getNonce('pending')
  console.log('Deploying Layer 3 contracts with:', deployer.address)
  console.log('Starting nonce:', currentNonce)

  // ─── Required addresses from Layer 1 ──────────────────────────────────
  const DWT_TOKEN = process.env.DWT_TOKEN // from Layer 1
  const TIMELOCK = process.env.TIMELOCK // from Layer 1
  const TREASURY = process.env.TREASURY // from Layer 1
  const STAKING_POOL = process.env.STAKING_POOL // from Layer 1

  // ─── External addresses ────────────────────────────────────────────────
  const CHAINLINK_ETH_USD = process.env.CHAINLINK_ETH_USD // Chainlink ETH/USD
  const UNISWAP_V3_POOL = process.env.UNISWAP_V3_POOL // DWT/ETH pool
  const UNISWAP_V3_ROUTER = process.env.UNISWAP_V3_ROUTER
  const UNISWAP_V3_QUOTER = process.env.UNISWAP_V3_QUOTER
  const WETH_ADDRESS = process.env.WETH_ADDRESS
  const MULTISIG_ADDRESS = process.env.MULTISIG_ADDRESS
  const LAYER7_SECURITY_ADDRESS = process.env.LAYER7_SECURITY_ADDRESS
  if (!LAYER7_SECURITY_ADDRESS)
    throw new Error('❌ LAYER7_SECURITY_ADDRESS missing in .env')

  // ─── Relayers for bridge (C-01 fix: M-of-N) ───────────────────────────
  const RELAYER_1 = process.env.RELAYER_1
  const RELAYER_2 = process.env.RELAYER_2
  const RELAYER_3 = process.env.RELAYER_3
  const RELAYER_4 = process.env.RELAYER_4
  const RELAYER_5 = process.env.RELAYER_5
  const REQUIRED_SIGS = 3 // 3-of-5

  console.log('L3 Audit:')
  console.log('- DWT_TOKEN:', DWT_TOKEN)
  console.log('- TIMELOCK:', TIMELOCK)
  console.log('- TREASURY:', TREASURY)
  console.log('- STAKING_POOL:', STAKING_POOL)
  console.log('- CHAINLINK_ETH_USD:', CHAINLINK_ETH_USD)
  console.log('- UNISWAP_V3_POOL:', UNISWAP_V3_POOL)
  console.log('- UNISWAP_V3_ROUTER:', UNISWAP_V3_ROUTER)
  console.log('- UNISWAP_V3_QUOTER:', UNISWAP_V3_QUOTER)
  console.log('- WETH_ADDRESS:', WETH_ADDRESS)
  console.log('- MULTISIG_ADDRESS:', MULTISIG_ADDRESS)

  // ─── Deploy DWTPriceOracle ─────────────────────────────────────────────
  console.log('\n── Deploying DWTPriceOracle ──────────────────────────────')
  const OracleFactory = await ethers.getContractFactory(
    'contracts/layer3/DWTPriceOracle.sol:DWTPriceOracle',
  )
  const oracle = await OracleFactory.deploy(
    CHAINLINK_ETH_USD,
    UNISWAP_V3_POOL,
    DWT_TOKEN,
    3600, // stalenessAge: 1 hour
    1800, // twapWindow: 30 min
    ethers.parseUnits('2000', 8), // fallbackPrice: $2000 (8 decimals)
    ethers.parseUnits('1000', 8), // tier1: $1,000 USD value
    ethers.parseUnits('5000', 8), // tier2: $5,000 USD value
    ethers.parseUnits('25000', 8), // tier3: $25,000 USD value
    LAYER7_SECURITY_ADDRESS,
    TIMELOCK, // owner = Timelock
    { nonce: currentNonce++ },
  )
  await oracle.waitForDeployment()
  console.log('DWTPriceOracle:', await oracle.getAddress())

  // ─── Deploy DWTETHRateFeed ─────────────────────────────────────────────
  console.log('\n── Deploying DWTETHRateFeed ──────────────────────────────')
  const RateFeedFactory = await ethers.getContractFactory(
    'contracts/layer3/DWTETHRateFeed.sol:DWTETHRateFeed',
  )
  const rateFeed = await RateFeedFactory.deploy(
    deployer.address, // admin
    deployer.address, // keeper (replace with keeper bot)
    UNISWAP_V3_POOL, // twapPool
    ethers.parseEther('1000'), // initialRate: 1 ETH = 1000 DWT
    500, // maxDeviationBps: 5%
    3600, // maxStaleness: 1 hour
    1800, // twapWindow: 30 min
    { nonce: currentNonce++ },
  )
  await rateFeed.waitForDeployment()
  console.log('DWTETHRateFeed:', await rateFeed.getAddress())

  // ─── Deploy VeDWT ──────────────────────────────────────────────────────
  console.log('\n── Deploying VeDWT ───────────────────────────────────────')
  const VeDWTFactory = await ethers.getContractFactory(
    'contracts/layer3/VeDWT.sol:VeDWT',
  )
  const veDWT = await VeDWTFactory.deploy(
    DWT_TOKEN,
    LAYER7_SECURITY_ADDRESS,
    TIMELOCK,
    { nonce: currentNonce++ },
  )
  await veDWT.waitForDeployment()
  console.log('VeDWT:', await veDWT.getAddress())

  // ─── Deploy FeeSplitter ────────────────────────────────────────────────
  console.log('\n── Deploying FeeSplitter ─────────────────────────────────')
  // Temporary: deploy FeeSplitter with zero buyback (deployed next)
  const FeeSplitterFactory = await ethers.getContractFactory(
    'contracts/layer3/FeeSplitter.sol:FeeSplitter',
  )
  const feeSplitter = await FeeSplitterFactory.deploy(
    TREASURY,
    deployer.address, // rewardDistributor — set to actual after deploy
    ethers.ZeroAddress, // buybackAndBurn — set after deploy
    5000, // treasuryBps: 50%
    3000, // rewardBps: 30%
    2000, // buybackBps: 20%
    LAYER7_SECURITY_ADDRESS,
    deployer.address, // deployer sets addresses, manual step 6 transfers to TIMELOCK
    { nonce: currentNonce++ },
  )
  await feeSplitter.waitForDeployment()
  console.log('FeeSplitter:', await feeSplitter.getAddress())

  // ─── Deploy RewardDistributor ──────────────────────────────────────────
  console.log('\n── Deploying RewardDistributor ───────────────────────────')
  const DistributorFactory = await ethers.getContractFactory(
    'contracts/layer3/RewardDistributor.sol:RewardDistributor',
  )
  const distributor = await DistributorFactory.deploy(
    UNISWAP_V3_ROUTER,
    UNISWAP_V3_QUOTER,
    WETH_ADDRESS,
    STAKING_POOL || deployer.address,
    TREASURY,
    7 * 24 * 60 * 60, // _distributionInterval: 1 week
    7000, // _stakingShareBps: 70%
    LAYER7_SECURITY_ADDRESS, // _securityController
    deployer.address, // admin
    deployer.address, // keeper
    deployer.address, // guardian
    { nonce: currentNonce++ },
  )
  await distributor.waitForDeployment()
  console.log('RewardDistributor:', await distributor.getAddress())

  // ─── Deploy BuybackAndBurn ─────────────────────────────────────────────
  console.log('\n── Deploying BuybackAndBurn ──────────────────────────────')
  const BuybackFactory = await ethers.getContractFactory(
    'contracts/layer3/BuybackAndBurn.sol:BuybackAndBurn',
  )
  const buyback = await BuybackFactory.deploy(
    UNISWAP_V3_ROUTER,
    DWT_TOKEN,
    24 * 60 * 60, // _cooldown: 1 day
    ethers.parseEther('50000'), // _maxSingleBuyback: 50,000 DWT worth
    LAYER7_SECURITY_ADDRESS, // _securityController
    deployer.address, // admin
    deployer.address, // keeper
    deployer.address, // guardian
    { nonce: currentNonce++ },
  )
  await buyback.waitForDeployment()
  console.log('BuybackAndBurn:', await buyback.getAddress())

  // ─── Update FeeSplitter addresses ─────────────────────────────────────
  console.log('\n── Updating FeeSplitter with deployed addresses ──────────')
  await feeSplitter.setAddresses(
    TREASURY,
    await distributor.getAddress(),
    await buyback.getAddress(),
    { nonce: currentNonce++ },
  )
  console.log('✅ FeeSplitter addresses updated')

  // ─── Deploy DWalletMultisig ────────────────────────────────────────────
  console.log('\n── Deploying DWalletMultisig ─────────────────────────────')
  const MultisigFactory = await ethers.getContractFactory(
    'contracts/layer3/DWalletMultisig.sol:DWalletMultisig',
  )
  const multisig = await MultisigFactory.deploy(
    [RELAYER_1 || deployer.address], // initial owners (replace with real keys)
    1, // required = 1 (update to M-of-N post-deploy)
    { nonce: currentNonce++ },
  )
  await multisig.waitForDeployment()
  console.log('DWalletMultisig:', await multisig.getAddress())

  // ─── Deploy EmergencyPause ─────────────────────────────────────────────
  console.log('\n── Deploying EmergencyPause ──────────────────────────────')
  const EmergencyFactory = await ethers.getContractFactory(
    'contracts/layer3/EmergencyPause.sol:EmergencyPause',
  )
  const emergency = await EmergencyFactory.deploy(
    deployer.address, // admin (multisig)
    deployer.address, // guardian (replace with guardian EOA/multisig)
    { nonce: currentNonce++ },
  )
  await emergency.waitForDeployment()
  const emergencyAddress = await emergency.getAddress()
  console.log('EmergencyPause:', emergencyAddress)

  // ─── Grant GUARDIAN_ROLE and ADMIN_ROLE to EmergencyPause ──────────────
  console.log('\n── Granting roles to EmergencyPause ──────────────────────')
  const GUARDIAN_ROLE = ethers.id('GUARDIAN_ROLE')
  const ADMIN_ROLE = ethers.id('ADMIN_ROLE')

  await distributor.grantRole(GUARDIAN_ROLE, emergencyAddress, {
    nonce: currentNonce++,
  })
  await distributor.grantRole(ADMIN_ROLE, emergencyAddress, {
    nonce: currentNonce++,
  })

  await buyback.grantRole(GUARDIAN_ROLE, emergencyAddress, {
    nonce: currentNonce++,
  })
  await buyback.grantRole(ADMIN_ROLE, emergencyAddress, {
    nonce: currentNonce++,
  })

  await feeSplitter.setGuardian(emergencyAddress, { nonce: currentNonce++ })
  console.log('✅ Emergency roles and guardian granted')

  // ─── Deploy DWTBridge ──────────────────────────────────────────────────
  console.log('\n── Deploying DWTBridge ───────────────────────────────────')
  const BridgeFactory = await ethers.getContractFactory(
    'contracts/layer3/DWTBridge.sol:DWTBridge',
  )
  const relayers_array = [
    RELAYER_1,
    RELAYER_2,
    RELAYER_3,
    RELAYER_4,
    RELAYER_5,
  ].filter(Boolean)
  console.log('Bridge Args:', {
    DWT_TOKEN,
    isLockMode: true,
    admin: deployer.address,
    guardian: deployer.address,
    relayers_array,
    REQUIRED_SIGS,
    limit: ethers.parseEther('1000000').toString(),
  })
  const bridge = await BridgeFactory.deploy(
    DWT_TOKEN,
    true, // isLockMode = true on mainnet (lock/unlock)
    LAYER7_SECURITY_ADDRESS,
    deployer.address,
    deployer.address, // guardian
    relayers_array,
    REQUIRED_SIGS,
    ethers.parseEther('1000000'), // dailyLimit: 1M DWT
    { nonce: currentNonce++ },
  )
  await bridge.waitForDeployment()
  const bridgeAddress = await bridge.getAddress()
  console.log('DWTBridge:', bridgeAddress)

  // Grant roles to allow EmergencyPause to pause the bridge
  await bridge.grantRole(GUARDIAN_ROLE, emergencyAddress, {
    nonce: currentNonce++,
  })
  await bridge.grantRole(ADMIN_ROLE, emergencyAddress, {
    nonce: currentNonce++,
  })

  // ─── Register targets in EmergencyPause ───────────────────────────────
  console.log('\n── Registering pause targets ─────────────────────────────')
  const pauseTargets = [
    await distributor.getAddress(),
    await buyback.getAddress(),
    await bridge.getAddress(),
    await feeSplitter.getAddress(),
  ]
  for (const t of pauseTargets) {
    await emergency.registerTarget(t, { nonce: currentNonce++ })
    console.log('Registered:', t)
  }

  // ─── Summary ──────────────────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════════════════════')
  console.log('                LAYER 3 DEPLOYMENT COMPLETE')
  console.log('══════════════════════════════════════════════════════════')
  console.log('DWTPriceOracle:   ', await oracle.getAddress())
  console.log('DWTETHRateFeed:   ', await rateFeed.getAddress())
  console.log('VeDWT:            ', await veDWT.getAddress())
  console.log('FeeSplitter:      ', await feeSplitter.getAddress())
  console.log('RewardDistributor:', await distributor.getAddress())
  console.log('BuybackAndBurn:   ', await buyback.getAddress())
  console.log('DWalletMultisig:  ', await multisig.getAddress())
  console.log('EmergencyPause:   ', await emergency.getAddress())
  console.log('DWTBridge:        ', await bridge.getAddress())
  console.log('══════════════════════════════════════════════════════════')
  console.log('\n⚠️  REMAINING MANUAL STEPS:')
  console.log('  1. Add supported chain IDs to DWTBridge via addChain()')
  console.log(
    '  2. Approve input tokens in BuybackAndBurn via approveInputToken()',
  )
  console.log('  3. Add fee tokens to RewardDistributor via addFeeToken()')
  console.log('  4. Replace custom bridge with LayerZero/Axelar for production')
  console.log('  5. Set live DWT/ETH rate in DWTETHRateFeed')
  console.log('  6. Transfer FeeSplitter/BuybackAndBurn ownership to Timelock')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
