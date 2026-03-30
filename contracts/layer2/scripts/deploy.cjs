// scripts/deploy.js
// Deploys all Layer 2 DEX contracts in dependency order.

const { ethers } = require('hardhat')

async function main() {
  const [deployer] = await ethers.getSigners()
  let currentNonce = await deployer.getNonce('pending')
  console.log('Deploying contracts with account:', deployer.address)
  console.log('Starting nonce:', currentNonce)
  console.log(
    'Account balance:',
    ethers.formatEther(await deployer.provider.getBalance(deployer.address)),
    'ETH\n',
  )

  // ── Config ────────────────────────────────────────────────────────────────
  // Replace with real addresses before deploying to a live network.
  const TREASURY = process.env.TREASURY_ADDRESS || deployer.address
  const GOVERNANCE_TOKEN = process.env.DWT_TOKEN || ethers.ZeroAddress
  const LAYER7_SECURITY_ADDRESS = process.env.LAYER7_SECURITY_ADDRESS
  if (!LAYER7_SECURITY_ADDRESS)
    throw new Error('❌ LAYER7_SECURITY_ADDRESS missing in .env')
  const REWARD_TOKEN = process.env.DWT_TOKEN || ethers.ZeroAddress
  const REWARD_PER_SEC = ethers.parseEther('0.01') // 0.01 tokens/second
  const START_TS = Math.floor(Date.now() / 1000) + 60 // 1 min from now
  const END_TS = START_TS + 365 * 24 * 3600 // 1 year

  console.log('Environment Sync Audit:')
  console.log('- DWT_TOKEN:', process.env.DWT_TOKEN)
  console.log('- TREASURY_ADDRESS:', process.env.TREASURY_ADDRESS)
  console.log('- GOVERNANCE_TOKEN:', GOVERNANCE_TOKEN)

  // ── 1. Deploy PriceOracle ─────────────────────────────────────────────────
  console.log('1/5  Deploying PriceOracle...')
  const PriceOracle = await ethers.getContractFactory('PriceOracle')
  const priceOracle = await PriceOracle.deploy(deployer.address, {
    nonce: currentNonce++,
  })
  await priceOracle.waitForDeployment()
  console.log('     PriceOracle:', await priceOracle.getAddress())

  // ── 2. Deploy FeeRouter ───────────────────────────────────────────────────
  console.log('2/5  Deploying FeeRouter...')
  // We deploy a placeholder LP pool address for now (update after pool deployment)
  const FeeRouter = await ethers.getContractFactory('FeeRouter')
  const feeRouter = await FeeRouter.deploy(
    TREASURY,
    deployer.address, // placeholder liquidityPool – update after real pool deployed
    GOVERNANCE_TOKEN === ethers.ZeroAddress
      ? deployer.address
      : GOVERNANCE_TOKEN,
    LAYER7_SECURITY_ADDRESS,
    deployer.address,
    { nonce: currentNonce++ },
  )
  await feeRouter.waitForDeployment()
  console.log('     FeeRouter:', await feeRouter.getAddress())

  // ── 3. Deploy SwapRouter ──────────────────────────────────────────────────
  console.log('3/5  Deploying SwapRouter...')
  const SwapRouter = await ethers.getContractFactory('SwapRouter')
  const swapRouter = await SwapRouter.deploy(
    await feeRouter.getAddress(),
    await priceOracle.getAddress(),
    LAYER7_SECURITY_ADDRESS,
    deployer.address,
    { nonce: currentNonce++ },
  )
  await swapRouter.waitForDeployment()
  console.log('     SwapRouter:', await swapRouter.getAddress())

  // ── 4. Deploy LiquidityIncentive ─────────────────────────────────────────
  console.log('4/5  Deploying LiquidityIncentive...')
  const LiquidityIncentive = await ethers.getContractFactory(
    'contracts/layer2/contracts/LiquidityIncentive.sol:LiquidityIncentive',
  )
  const liquidityIncentive = await LiquidityIncentive.deploy(
    REWARD_TOKEN === ethers.ZeroAddress ? deployer.address : REWARD_TOKEN,
    REWARD_PER_SEC,
    START_TS,
    END_TS,
    deployer.address,
    { nonce: currentNonce++ },
  )
  await liquidityIncentive.waitForDeployment()
  console.log('     LiquidityIncentive:', await liquidityIncentive.getAddress())

  // ── 5. Deploy LimitOrderBook ──────────────────────────────────────────────
  console.log('5/5  Deploying LimitOrderBook...')
  const LimitOrderBook = await ethers.getContractFactory('LimitOrderBook')
  const limitOrderBook = await LimitOrderBook.deploy(
    deployer.address,
    LAYER7_SECURITY_ADDRESS,
    { nonce: currentNonce++ },
  )
  await limitOrderBook.waitForDeployment()
  console.log('     LimitOrderBook:', await limitOrderBook.getAddress())

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════')
  console.log('  Layer 2 DEX Deployment Complete')
  console.log('═══════════════════════════════════════════════════')
  console.log('  PriceOracle:        ', await priceOracle.getAddress())
  console.log('  FeeRouter:          ', await feeRouter.getAddress())
  console.log('  SwapRouter:         ', await swapRouter.getAddress())
  console.log('  LiquidityIncentive: ', await liquidityIncentive.getAddress())
  console.log('  LimitOrderBook:     ', await limitOrderBook.getAddress())
  console.log('═══════════════════════════════════════════════════\n')

  console.log('Post-deployment steps:')
  console.log(
    '  1. Call feeRouter.setLiquidityPool(<real_pool>) with actual pool address',
  )
  console.log(
    '  2. Call priceOracle.setOracleConfig() for each trading pair + Chainlink feed',
  )
  console.log('  3. Call swapRouter.registerPool() for each token pair')
  console.log('  4. Call liquidityIncentive.addPool() for each LP token')
  console.log('  5. Transfer reward tokens to LiquidityIncentive contract')
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
