/**
 * Simple FeeRouter Deployment Script for Base Sepolia
 * 
 * Usage:
 * npx hardhat run scripts/deploy-fee-router-simple.cjs --network baseSepolia
 */

const { ethers } = require('hardhat')
require('dotenv').config()

async function main() {
  console.log('🚀 Deploying FeeRouter to Base Sepolia (Simple)...\n')

  // Get deployer
  const [deployer] = await ethers.getSigners()
  console.log('📝 Deployer address:', deployer.address)
  
  const balance = await ethers.provider.getBalance(deployer.address)
  console.log('💰 Deployer balance:', ethers.formatEther(balance), 'ETH\n')

  // Configuration from .env
  const CONFIG = {
    treasury: process.env.TREASURY || process.env.TREASURY_L6 || process.env.FEE_RECIPIENT || deployer.address,
    liquidityPool: process.env.LIQUIDITY_POOL_ADDRESS || process.env.LIQUIDITY_DEX_ADDRESS || deployer.address,
    governanceToken: process.env.DWT_TOKEN || process.env.BASE_DWT_TOKEN,
    securityController: process.env.LAYER7_SECURITY_ADDRESS || process.env.SECURITY_L7,
  }

  console.log('⚙️  Configuration:')
  console.log('   Treasury:', CONFIG.treasury)
  console.log('   Liquidity Pool:', CONFIG.liquidityPool)
  console.log('   Governance Token:', CONFIG.governanceToken || '(will deploy mock)')
  console.log('   Security Controller:', CONFIG.securityController || '(will deploy mock)\n')

  // Deploy mock contracts if not provided
  let governanceTokenAddress = CONFIG.governanceToken
  let securityControllerAddress = CONFIG.securityController

  if (!governanceTokenAddress) {
    console.log('📦 Deploying Mock DWT Token...')
    const DWTToken = await ethers.getContractFactory('DWTToken')
    const dwt = await DWTToken.deploy(
      deployer.address,
      ethers.parseUnits('100', 18),
      ethers.parseUnits('1000', 18),
      ethers.parseUnits('10000', 18)
    )
    await dwt.waitForDeployment()
    governanceTokenAddress = await dwt.getAddress()
    console.log('✅ DWT Token deployed to:', governanceTokenAddress)
  }

  if (!securityControllerAddress) {
    console.log('\n📦 Deploying Mock Security Controller...')
    const MockSecurity = await ethers.getContractFactory('MockLayer7Security')
    const mockSecurity = await MockSecurity.deploy()
    await mockSecurity.waitForDeployment()
    securityControllerAddress = await mockSecurity.getAddress()
    console.log('✅ Security Controller deployed to:', securityControllerAddress)
  }

  // Deploy FeeRouter
  console.log('\n📦 Deploying FeeRouter...')
  const FeeRouter = await ethers.getContractFactory('FeeRouter')
  
  const feeRouter = await FeeRouter.deploy(
    CONFIG.treasury,
    CONFIG.liquidityPool,
    governanceTokenAddress,
    securityControllerAddress,
    deployer.address, // owner
  )
  
  await feeRouter.waitForDeployment()
  const feeRouterAddress = await feeRouter.getAddress()
  
  console.log('\n✅ FeeRouter deployed successfully!')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('Contract Address:', feeRouterAddress)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  // Save deployment info
  const deploymentInfo = {
    network: 'baseSepolia',
    chainId: 84532,
    timestamp: new Date().toISOString(),
    deployer: deployer.address,
    contracts: {
      feeRouter: feeRouterAddress,
      governanceToken: governanceTokenAddress,
      securityController: securityControllerAddress,
    },
    config: {
      treasury: CONFIG.treasury,
      liquidityPool: CONFIG.liquidityPool,
    },
  }

  const fs = require('fs')
  const path = require('path')
  const outputDir = path.join(__dirname, '..', 'deployments')
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  const outputFile = path.join(outputDir, `fee-router-baseSepolia-${Date.now()}.json`)
  fs.writeFileSync(outputFile, JSON.stringify(deploymentInfo, null, 2))
  
  console.log('💾 Deployment info saved to:', outputFile)
  console.log('\n🎯 Next Steps:')
  console.log('1. View on Basescan: https://sepolia.basescan.org/address/' + feeRouterAddress)
  console.log('2. Test the contract functions')
  console.log('3. Update frontend config with new address')
  console.log('4. Deploy to Base mainnet when ready\n')
  console.log('✅ Deployment complete! 🎉')
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Deployment failed!')
    console.error(error)
    process.exit(1)
  })
