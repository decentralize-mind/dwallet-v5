// scripts/deploy.js — Layer 4 Staking & Rewards
const { ethers } = require('hardhat')

async function main() {
  const [deployer] = await ethers.getSigners()
  let currentNonce = await deployer.getNonce('pending')
  console.log('Deployer :', deployer.address)
  console.log('Starting nonce:', currentNonce)
  console.log(
    'Balance  :',
    ethers.formatEther(await deployer.provider.getBalance(deployer.address)),
    'ETH\n',
  )

  // ── Config ────────────────────────────────────────────────────────────────
  const DWT_TOKEN = process.env.DWT_TOKEN_ADDRESS || deployer.address // replace
  const SWAP_ROUTER = process.env.SWAP_ROUTER_ADDRESS || deployer.address // replace (Layer 2 SwapRouter)
  const TREASURY = process.env.TREASURY_ADDRESS || deployer.address
  const LAYER7_SECURITY_ADDRESS = process.env.LAYER7_SECURITY_ADDRESS
  if (!LAYER7_SECURITY_ADDRESS)
    throw new Error('❌ LAYER7_SECURITY_ADDRESS missing in .env')

  // ── 1. StakingPool (DWT → DWT, #4) ───────────────────────────────────────
  console.log('1/4  Deploying StakingPool...')
  const StakingPool = await ethers.getContractFactory(
    'contracts/layer4/contracts/StakingPool.sol:StakingPool',
  )
  const stakingPool = await StakingPool.deploy(
    DWT_TOKEN,
    LAYER7_SECURITY_ADDRESS,
    deployer.address,
    { nonce: currentNonce++ },
  )
  await stakingPool.waitForDeployment()
  const spAddr = await stakingPool.getAddress()
  console.log('     StakingPool  :', spAddr)

  // ── 2. DWTStaking (DWT → ETH, #5) ────────────────────────────────────────
  console.log('2/4  Deploying DWTStaking...')
  const DWTStaking = await ethers.getContractFactory(
    'contracts/layer4/contracts/DWTStaking.sol:DWTStaking',
  )
  const dwtStaking = await DWTStaking.deploy(
    DWT_TOKEN,
    LAYER7_SECURITY_ADDRESS,
    deployer.address,
    { nonce: currentNonce++ },
  )
  await dwtStaking.waitForDeployment()
  const dsAddr = await dwtStaking.getAddress()
  console.log('     DWTStaking   :', dsAddr)

  // ── 3. BoostedStaking (veDWT multiplier) ──────────────────────────────────
  console.log('3/4  Deploying BoostedStaking...')
  const BoostedStaking = await ethers.getContractFactory(
    'contracts/layer4/contracts/BoostedStaking.sol:BoostedStaking',
  )
  const boostedStaking = await BoostedStaking.deploy(
    DWT_TOKEN,
    LAYER7_SECURITY_ADDRESS,
    deployer.address,
    { nonce: currentNonce++ },
  )
  await boostedStaking.waitForDeployment()
  const bsAddr = await boostedStaking.getAddress()
  console.log('     BoostedStaking:', bsAddr)

  // ── 4. RewardDistributor (Fee → ETH routing, #12) ─────────────────────────
  console.log('4/4  Deploying RewardDistributor...')
  const RewardDistributor = await ethers.getContractFactory(
    'contracts/layer4/contracts/RewardDistributor.sol:RewardDistributor',
  )
  const rewardDistributor = await RewardDistributor.deploy(
    dsAddr, // DWTStaking
    spAddr, // StakingPool
    bsAddr, // BoostedStaking
    TREASURY, // treasury
    DWT_TOKEN, // DWT token
    SWAP_ROUTER, // Layer 2 SwapRouter
    ethers.ZeroAddress, // placeholder WETH – update as needed
    LAYER7_SECURITY_ADDRESS,
    deployer.address, // owner
    { nonce: currentNonce++ },
  )
  await rewardDistributor.waitForDeployment()
  const rdAddr = await rewardDistributor.getAddress()
  console.log('     RewardDistributor:', rdAddr)

  // ── Wire up: set RewardDistributor as authorized caller ───────────────────
  console.log('\nWiring contracts...')
  await stakingPool.setRewardDistributor(rdAddr, { nonce: currentNonce++ })
  console.log('  ✓ StakingPool.rewardDistributor →', rdAddr)
  await dwtStaking.setRewardDistributor(rdAddr, { nonce: currentNonce++ })
  console.log('  ✓ DWTStaking.rewardDistributor  →', rdAddr)
  await boostedStaking.setRewardDistributor(rdAddr, { nonce: currentNonce++ })
  console.log('  ✓ BoostedStaking.rewardDistributor →', rdAddr)

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════════')
  console.log('  Layer 4 — Staking & Rewards — Deployment Complete')
  console.log('═══════════════════════════════════════════════════════')
  console.log('  StakingPool         :', spAddr, '  (DWT → DWT, #4)')
  console.log('  DWTStaking          :', dsAddr, '  (DWT → ETH, #5)')
  console.log('  BoostedStaking      :', bsAddr, '  (veDWT multiplier)')
  console.log('  RewardDistributor   :', rdAddr, '  (Fee → ETH, #12)')
  console.log('═══════════════════════════════════════════════════════\n')

  console.log('Post-deploy checklist:')
  console.log('  1. Transfer ownership of all contracts to a multisig/timelock')
  console.log(
    '  2. Register accepted fee tokens: rewardDistributor.setAcceptedToken(token, true)',
  )
  console.log(
    '  3. Set SWAP_ROUTER_ADDRESS to Layer 2 SwapRouter if placeholder was used',
  )
  console.log(
    '  4. Point Layer 2 FeeRouter to RewardDistributor for auto fee forwarding',
  )
  console.log(
    '  5. Fund StakingPool with initial DWT for pricePerShare bootstrap (optional)',
  )
}

main().catch(e => {
  console.error(e)
  process.exitCode = 1
})
