// recover.js — Layer 3 Recovery Script
// Use this to finish the deployment after the ECONNRESET error.
// Run with: npx hardhat run contracts/layer3/recover.js --network sepolia

const { ethers } = require('hardhat')

async function main() {
  const [deployer] = await ethers.getSigners()
  console.log('Recovering Layer 3 with account:', deployer.address)

  // ─── ALREADY DEPLOYED ADDRESSES (from previous log) ──────────────────
  const ORACLE_ADDR = '0xdf6469050d2f77c80afd083c1CF42746Ad113781'
  const RATE_FEED_ADDR = '0x0F24a997db4f728b265f54Ff34bDf21C7e516f34'
  const VEDWT_ADDR = '0x1a809E6B5F22B44A909d7D46BFe0B69933846682'
  const FEESPLITTER_ADDR = '0x64d3668180747fa459FAb8F05490062e0847e274'
  const DISTRIBUTOR_ADDR = '0x4C150576C34157830bA0Ec7d1362e881fAD82cCd'
  const BUYBACK_ADDR = '0x0fe7a551d39A7EA10cC03A090C3F1112D7004B67'
  const MULTISIG_ADDR = '0xA9b6e2AB379bC1D9ba10D16b555CD0D65DAfbC10'
  const EMERGENCY_ADDR = '0x20E88f72CD88a566800dC0DBCDe29906355f8CEF'

  // Required ENV vars (Mapped carefully from .env)
  const DWT_TOKEN = process.env.BASE_DWT_TOKEN || process.env.SEPOLIA_DWT
  const RELAYER_1 =
    process.env.FOUNDER_1_ADDRESS ||
    '0x6666666666666666666666666666666666666666'
  const RELAYER_2 =
    process.env.FOUNDER_2_ADDRESS ||
    '0x7777777777777777777777777777777777777777'
  const RELAYER_3 =
    process.env.FOUNDER_3_ADDRESS ||
    '0x8888888888888888888888888888888888888888'
  const RELAYER_4 = '0x9999999999999999999999999999999999999999'
  const RELAYER_5 = '0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'

  const relayerArray = [
    RELAYER_1,
    RELAYER_2,
    RELAYER_3,
    RELAYER_4,
    RELAYER_5,
  ].filter(Boolean)
  console.log('Using Relayers Count:', relayerArray.length)
  if (relayerArray.length === 0)
    throw new Error('No relayers found in environment!')

  // ─── Attach to Deployed Contracts ────────────────────────────────────
  const distributor = await ethers.getContractAt(
    'contracts/layer3/RewardDistributor.sol:RewardDistributor',
    DISTRIBUTOR_ADDR,
  )
  const buyback = await ethers.getContractAt(
    'contracts/layer3/BuybackAndBurn.sol:BuybackAndBurn',
    BUYBACK_ADDR,
  )
  const feeSplitter = await ethers.getContractAt(
    'contracts/layer3/FeeSplitter.sol:FeeSplitter',
    FEESPLITTER_ADDR,
  )
  const emergency = await ethers.getContractAt(
    'contracts/layer3/EmergencyPause.sol:EmergencyPause',
    EMERGENCY_ADDR,
  )

  const GUARDIAN_ROLE = ethers.id('GUARDIAN_ROLE')
  const ADMIN_ROLE = ethers.id('ADMIN_ROLE')

  // ─── 1. Retry Role Granting ──────────────────────────────────────────
  console.log('\n── Completing roles for EmergencyPause ──────────────────')
  try {
    await distributor.grantRole(GUARDIAN_ROLE, EMERGENCY_ADDR)
    await distributor.grantRole(ADMIN_ROLE, EMERGENCY_ADDR)
    console.log('✅ Distributor roles granted')
  } catch (e) {
    console.log('⚠️ Distributor roles already granted or failed:', e.message)
  }

  try {
    await buyback.grantRole(GUARDIAN_ROLE, EMERGENCY_ADDR)
    await buyback.grantRole(ADMIN_ROLE, EMERGENCY_ADDR)
    console.log('✅ Buyback roles granted')
  } catch (e) {
    console.log('⚠️ Buyback roles already granted or failed:', e.message)
  }

  try {
    await feeSplitter.setGuardian(EMERGENCY_ADDR)
    console.log('✅ FeeSplitter guardian set')
  } catch (e) {
    console.log('⚠️ FeeSplitter guardian already set or failed:', e.message)
  }

  // ─── 2. Deploy DWTBridge ──────────────────────────────────────────────
  console.log('\n── Deploying DWTBridge ───────────────────────────────────')
  const BridgeFactory = await ethers.getContractFactory(
    'contracts/layer3/DWTBridge.sol:DWTBridge',
  )
  const bridge = await BridgeFactory.deploy(
    DWT_TOKEN,
    true, // isLockMode = true
    deployer.address,
    deployer.address,
    relayerArray,
    3, // requiredSigs
    ethers.parseEther('1000000'),
  )
  await bridge.waitForDeployment()
  const bridgeAddress = await bridge.getAddress()
  console.log('DWTBridge:', bridgeAddress)

  // Grant roles to allow EmergencyPause to pause the bridge
  await bridge.grantRole(GUARDIAN_ROLE, EMERGENCY_ADDR)
  await bridge.grantRole(ADMIN_ROLE, EMERGENCY_ADDR)

  // ─── 3. Register targets in EmergencyPause ────────────────────────────
  console.log('\n── Registering pause targets ─────────────────────────────')
  const pauseTargets = [
    DISTRIBUTOR_ADDR,
    BUYBACK_ADDR,
    bridgeAddress,
    FEESPLITTER_ADDR,
  ]
  for (const t of pauseTargets) {
    await emergency.registerTarget(t)
    console.log('Registered:', t)
  }

  console.log('\n══════════════════════════════════════════════════════════')
  console.log('                LAYER 3 RECOVERY COMPLETE')
  console.log('══════════════════════════════════════════════════════════')
  console.log('DWTBridge: ', bridgeAddress)
  console.log('══════════════════════════════════════════════════════════')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
