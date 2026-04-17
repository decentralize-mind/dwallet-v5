/**
 * FeeRouter Deployment Script for Base Sepolia
 * 
 * Usage:
 * npx hardhat run scripts/deploy-fee-router.js --network baseSepolia
 * 
 * Prerequisites:
 * - Set PRIVATE_KEY in .env
 * - Set INFURA_KEY or use Base Sepolia RPC
 * - Have ETH in deployer wallet for gas
 */

const { ethers } = require('hardhat')
require('dotenv').config()

async function main() {
  console.log('🚀 Deploying FeeRouter to Base Sepolia...\n')

  // Get deployer
  const [deployer] = await ethers.getSigners()
  console.log('📝 Deployer address:', deployer.address)
  
  const balance = await ethers.provider.getBalance(deployer.address)
  console.log('💰 Deployer balance:', ethers.formatEther(balance), 'ETH\n')

  if (balance === 0n) {
    console.error('❌ Insufficient balance! Get testnet ETH from:')
    console.error('   https://cloud.google.com/application/web3/faucet/ethereum/base-sepolia')
    process.exit(1)
  }

  // Configuration - Read from .env
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
  
  console.log('✅ FeeRouter deployed to:', feeRouterAddress)

  // Verify deployment
  console.log('\n🔍 Verifying deployment...')
  
  const treasury = await feeRouter.treasury()
  const liquidityPool = await feeRouter.liquidityPool()
  const govToken = await feeRouter.governanceToken()
  const baseFeeBps = await feeRouter.baseFeeBps()
  const lpShareBps = await feeRouter.lpShareBps()
  const tiers = await feeRouter.getDiscountTiers()

  console.log('\n📊 Deployment Summary:')
  console.log('═══════════════════════════════════════')
  console.log('FeeRouter Address:', feeRouterAddress)
  console.log('───────────────────────────────────────')
  console.log('Treasury:', treasury)
  console.log('Liquidity Pool:', liquidityPool)
  console.log('Governance Token:', govToken)
  console.log('Base Fee:', Number(baseFeeBps) / 100, '%')
  console.log('LP Share:', Number(lpShareBps) / 100, '%')
  console.log('Discount Tiers:', tiers.length)
  console.log('═══════════════════════════════════════')

  console.log('\n💡 Discount Tiers:')
  for (let i = 0; i < tiers.length; i++) {
    const tier = tiers[i]
    console.log(`   Tier ${i}: ${ethers.formatUnits(tier.minTokenBalance, 18)} tokens → ${Number(tier.discountBps) / 100}% discount`)
  }

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
      baseFeeBps: Number(baseFeeBps),
      lpShareBps: Number(lpShareBps),
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
  
  console.log('\n💾 Deployment info saved to:', outputFile)

  console.log('\n🎯 Next Steps:')
  console.log('═══════════════════════════════════════')
  console.log('1. Verify contract on Basescan:')
  console.log(`   npx hardhat verify --network baseSepolia \\`)
  console.log(`     ${feeRouterAddress} \\`)
  console.log(`     "${CONFIG.treasury}" \\`)
  console.log(`     "${CONFIG.liquidityPool}" \\`)
  console.log(`     "${governanceTokenAddress}" \\`)
  console.log(`     "${securityControllerAddress}" \\`)
  console.log(`     "${deployer.address}"`)
  console.log('')
  console.log('2. Update frontend configuration:')
  console.log('   Edit src/config/contracts.js')
  console.log('   Add: FEE_ROUTER_ADDRESS = "' + feeRouterAddress + '"')
  console.log('')
  console.log('3. Test on Base Sepolia:')
  console.log('   npx hardhat test --network baseSepolia')
  console.log('')
  console.log('4. Fund treasury and LP addresses')
  console.log('')
  console.log('5. Deploy to Base mainnet when ready!')
  console.log('═══════════════════════════════════════')

  console.log('\n✅ Deployment complete! 🎉')
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Deployment failed!')
    console.error(error)
    process.exit(1)
  })
