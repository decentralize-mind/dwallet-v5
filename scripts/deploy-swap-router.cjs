/**
 * Deploy SwapRouter to Base Sepolia
 * 
 * Usage:
 * npx hardhat run scripts/deploy-swap-router.cjs --network baseSepolia
 */

const { ethers } = require('hardhat')
require('dotenv').config()

async function main() {
  console.log('🚀 Deploying SwapRouter to Base Sepolia...\n')

  const [deployer] = await ethers.getSigners()
  console.log('📝 Deployer address:', deployer.address)
  
  const balance = await ethers.provider.getBalance(deployer.address)
  console.log('💰 Deployer balance:', ethers.formatEther(balance), 'ETH\n')

  // Configuration from .env or use defaults
  const CONFIG = {
    admin: process.env.ADMIN_ADDRESS || deployer.address,
    governor: process.env.GOVERNOR_ADDRESS || deployer.address,
    securityController: process.env.LAYER7_SECURITY_ADDRESS || process.env.SECURITY_L7,
    registry: process.env.TOKEN_REGISTRY_ADDRESS,
    lockEngine: process.env.LOCK_ENGINE_ADDRESS,
    invariantChecker: process.env.INVARIANT_CHECKER_ADDRESS,
    feeRouter: process.env.FEE_ROUTER_ADDRESS || '0xd23f3d7fF87c1DC27178D34Ee30ffc6B17bb658d', // Our new FeeRouter
    priceOracle: process.env.PRICE_ORACLE_ADDRESS,
  }

  console.log('⚙️  Configuration:')
  console.log('   Admin:', CONFIG.admin)
  console.log('   Governor:', CONFIG.governor)
  console.log('   Security Controller:', CONFIG.securityController || '(will use zero address)')
  console.log('   FeeRouter:', CONFIG.feeRouter)
  console.log('')

  // Deploy SwapRouter
  console.log('📦 Deploying SwapRouter...')
  const SwapRouter = await ethers.getContractFactory('SwapRouter')
  
  const swapRouter = await SwapRouter.deploy(
    CONFIG.admin,
    CONFIG.governor,
    CONFIG.securityController || ethers.ZeroAddress,
    CONFIG.registry || ethers.ZeroAddress,
    CONFIG.lockEngine || ethers.ZeroAddress,
    CONFIG.invariantChecker || ethers.ZeroAddress,
  )
  
  await swapRouter.waitForDeployment()
  const swapRouterAddress = await swapRouter.getAddress()
  
  console.log('\n✅ SwapRouter deployed successfully!')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('Contract Address:', swapRouterAddress)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  // Set FeeRouter
  console.log('🔗 Setting FeeRouter...')
  const tx = await swapRouter.setFeeRouter(CONFIG.feeRouter)
  await tx.wait()
  console.log('✅ FeeRouter set to:', CONFIG.feeRouter)

  // Set Price Oracle if provided
  if (CONFIG.priceOracle) {
    console.log('\n🔗 Setting Price Oracle...')
    const tx2 = await swapRouter.setPriceOracle(CONFIG.priceOracle)
    await tx2.wait()
    console.log('✅ Price Oracle set to:', CONFIG.priceOracle)
  }

  // Verify deployment
  console.log('\n🔍 Verifying deployment...')
  const deployedFeeRouter = await swapRouter.feeRouter()
  const deployedAdmin = await swapRouter.hasRole(await swapRouter.DEFAULT_ADMIN_ROLE(), CONFIG.admin)
  
  console.log('✅ FeeRouter:', deployedFeeRouter)
  console.log('✅ Admin Role:', deployedAdmin)

  // Save deployment info
  const deploymentInfo = {
    network: 'baseSepolia',
    chainId: 84532,
    timestamp: new Date().toISOString(),
    deployer: deployer.address,
    contracts: {
      swapRouter: swapRouterAddress,
      feeRouter: CONFIG.feeRouter,
    },
    config: {
      admin: CONFIG.admin,
      governor: CONFIG.governor,
    },
  }

  const fs = require('fs')
  const path = require('path')
  const outputDir = path.join(__dirname, '..', 'deployments')
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  const outputFile = path.join(outputDir, `swap-router-baseSepolia-${Date.now()}.json`)
  fs.writeFileSync(outputFile, JSON.stringify(deploymentInfo, null, 2))
  
  console.log('\n💾 Deployment info saved to:', outputFile)
  console.log('\n🎯 Next Steps:')
  console.log('1. View on Basescan: https://sepolia.basescan.org/address/' + swapRouterAddress)
  console.log('2. Register liquidity pools')
  console.log('3. Test swaps')
  console.log('4. Update frontend config\n')
  console.log('✅ Deployment complete! 🎉')
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Deployment failed!')
    console.error(error)
    process.exit(1)
  })
