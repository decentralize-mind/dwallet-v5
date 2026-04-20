// scripts/deploy-5-upgradeable.js
// Deploy 5 core upgradeable contracts to Base Sepolia
// Run with: npx hardhat run scripts/deploy-5-upgradeable.js --network baseSepolia

const { ethers, network, upgrades } = require('hardhat')
require('dotenv').config()

async function main() {
  console.log('\n═══════════════════════════════════════════════════════════════')
  console.log('   dWallet — Deploy 5 Core Upgradeable Contracts')
  console.log('   Network: Base Sepolia Testnet')
  console.log('═══════════════════════════════════════════════════════════════\n')

  // ── Pre-flight checks ──────────────────────────────────────────────────────
  const [deployer] = await ethers.getSigners()
  const balance = await ethers.provider.getBalance(deployer.address)
  const networkName = network.name

  console.log('📋 Deployment Configuration:')
  console.log('  Network:       ', networkName)
  console.log('  Deployer:      ', deployer.address)
  console.log('  Balance:       ', ethers.formatEther(balance), 'ETH')
  
  // Check balance
  if (balance < ethers.parseEther('0.01')) {
    throw new Error(
      `❌ Insufficient balance. Need at least 0.01 ETH, have ${ethers.formatEther(balance)} ETH`
    )
  }

  // Get existing contract addresses from .env
  const SECURITY_CONTROLLER = process.env.LAYER7_SECURITY_ADDRESS || process.env.SECURITY_L7
  const DWT_TOKEN_ADDRESS = process.env.DWT_TOKEN_ADDRESS || process.env.DWT_TOKEN
  const TREASURY_ADDRESS = process.env.TREASURY || process.env.DAO_TREASURY_ADDRESS
  const SAFE_ADDRESS = process.env.SAFE_ADDRESS || process.env.MULTISIG_ADDRESS

  console.log('\n📌 Using Existing Addresses:')
  console.log('  Security Controller:', SECURITY_CONTROLLER || '⚠️ NOT SET')
  console.log('  DWT Token:         ', DWT_TOKEN_ADDRESS || '⚠️ Will deploy new')
  console.log('  Treasury:          ', TREASURY_ADDRESS || '⚠️ Using deployer')
  console.log('  Safe/Multisig:     ', SAFE_ADDRESS || '⚠️ Using deployer')

  if (!SECURITY_CONTROLLER) {
    console.log('\n⚠️  WARNING: Security Controller address not found in .env')
    console.log('   Some contracts require SecurityGated integration.')
    console.log('   Deploying anyway, but you may need to update addresses later.\n')
  }

  const treasury = TREASURY_ADDRESS || deployer.address
  const governor = SAFE_ADDRESS || deployer.address

  // ── Gas price ──────────────────────────────────────────────────────────────
  const feeData = await ethers.provider.getFeeData()
  console.log('\n⛽ Gas price:', ethers.formatUnits(feeData.gasPrice || 0, 'gwei'), 'Gwei\n')

  // ── Store deployed addresses ───────────────────────────────────────────────
  const deployedAddresses = {}

  try {
    // ========================================================================
    // 1. Deploy DWTTokenUpgradeable (if not using existing)
    // ========================================================================
    console.log('\n' + '='.repeat(65))
    console.log('📦 Contract 1/5: DWTTokenUpgradeable')
    console.log('='.repeat(65))

    let dwtTokenAddress = DWT_TOKEN_ADDRESS

    if (!dwtTokenAddress) {
      console.log('\n🚀 Deploying new DWTTokenUpgradeable...')
      const DWTToken = await ethers.getContractFactory('DWTTokenUpgradeable')
      const dwtToken = await upgrades.deployProxy(DWTToken, [deployer.address], {
        initializer: 'initialize',
      })
      await dwtToken.waitForDeployment()
      dwtTokenAddress = await dwtToken.getAddress()
      console.log('✅ DWTTokenUpgradeable deployed:', dwtTokenAddress)
      console.log('💡 Run: npx hardhat verify --network', networkName, dwtTokenAddress)
    } else {
      console.log('\n✅ Using existing DWT Token:', dwtTokenAddress)
    }
    deployedAddresses.DWTToken = dwtTokenAddress

    // ========================================================================
    // 2. Deploy FeeRouterUpgradeable
    // ========================================================================
    console.log('\n' + '='.repeat(65))
    console.log('📦 Contract 2/5: FeeRouterUpgradeable')
    console.log('='.repeat(65))

    console.log('\n🚀 Deploying FeeRouterUpgradeable...')
    console.log('  Treasury:         ', treasury)
    console.log('  Governance Token: ', dwtTokenAddress)
    console.log('  Security:         ', SECURITY_CONTROLLER || '0x0000000000000000000000000000000000000000')

    // Use a temporary LP address (can be updated later)
    const tempLP = deployer.address

    const FeeRouter = await ethers.getContractFactory('FeeRouterUpgradeable')
    const feeRouter = await upgrades.deployProxy(
      FeeRouter,
      [
        treasury,                    // _treasury
        tempLP,                      // _liquidityPool
        dwtTokenAddress,             // _governanceToken
        SECURITY_CONTROLLER || deployer.address, // _securityController
        deployer.address             // _owner
      ],
      { initializer: 'initialize' }
    )
    await feeRouter.waitForDeployment()
    const feeRouterAddress = await feeRouter.getAddress()
    console.log('✅ FeeRouterUpgradeable deployed:', feeRouterAddress)
    deployedAddresses.FeeRouter = feeRouterAddress

    // ========================================================================
    // 3. Deploy SwapRouterUpgradeable
    // ========================================================================
    console.log('\n' + '='.repeat(65))
    console.log('📦 Contract 3/5: SwapRouterUpgradeable')
    console.log('='.repeat(65))

    console.log('\n🚀 Deploying SwapRouterUpgradeable...')
    console.log('  Admin:            ', deployer.address)
    console.log('  Governor:         ', governor)

    const SwapRouter = await ethers.getContractFactory('SwapRouterUpgradeable')
    const swapRouter = await upgrades.deployProxy(
      SwapRouter,
      [
        deployer.address,            // _admin
        governor,                    // _governor
        SECURITY_CONTROLLER || deployer.address, // _securityController
        deployer.address,            // _registry (can update later)
        deployer.address,            // _lockEngine (can update later)
        deployer.address             // _invariantChecker (can update later)
      ],
      { initializer: 'initialize' }
    )
    await swapRouter.waitForDeployment()
    const swapRouterAddress = await swapRouter.getAddress()
    console.log('✅ SwapRouterUpgradeable deployed:', swapRouterAddress)
    deployedAddresses.SwapRouter = swapRouterAddress

    // ========================================================================
    // 4. Deploy NFTMembershipUpgradeable
    // ========================================================================
    console.log('\n' + '='.repeat(65))
    console.log('📦 Contract 4/5: NFTMembershipUpgradeable')
    console.log('='.repeat(65))

    console.log('\n🚀 Deploying NFTMembershipUpgradeable...')
    console.log('  DWT Token:        ', dwtTokenAddress)

    const NFTMembership = await ethers.getContractFactory('NFTMembershipUpgradeable')
    const nftMembership = await upgrades.deployProxy(
      NFTMembership,
      [
        dwtTokenAddress,             // _dwtToken
        SECURITY_CONTROLLER || deployer.address  // _securityController
      ],
      { initializer: 'initialize' }
    )
    await nftMembership.waitForDeployment()
    const nftMembershipAddress = await nftMembership.getAddress()
    console.log('✅ NFTMembershipUpgradeable deployed:', nftMembershipAddress)
    deployedAddresses.NFTMembership = nftMembershipAddress

    // ========================================================================
    // 5. Deploy ReferralPoolUpgradeable
    // ========================================================================
    console.log('\n' + '='.repeat(65))
    console.log('📦 Contract 5/5: ReferralPoolUpgradeable')
    console.log('='.repeat(65))

    console.log('\n🚀 Deploying ReferralPoolUpgradeable...')
    console.log('  DWT Token:        ', dwtTokenAddress)

    const ReferralPool = await ethers.getContractFactory('ReferralPoolUpgradeable')
    const referralPool = await upgrades.deployProxy(
      ReferralPool,
      [
        dwtTokenAddress,             // _dwtToken
        SECURITY_CONTROLLER || deployer.address, // _securityController
        deployer.address             // _owner
      ],
      { initializer: 'initialize' }
    )
    await referralPool.waitForDeployment()
    const referralPoolAddress = await referralPool.getAddress()
    console.log('✅ ReferralPoolUpgradeable deployed:', referralPoolAddress)
    deployedAddresses.ReferralPool = referralPoolAddress

    // ========================================================================
    // Post-Deployment Configuration
    // ========================================================================
    console.log('\n' + '='.repeat(65))
    console.log('⚙️  Post-Deployment Configuration')
    console.log('='.repeat(65))

    // Set FeeRouter in SwapRouter
    console.log('\n🔗 Setting FeeRouter in SwapRouter...')
    const setFeeRouterTx = await swapRouter.setFeeRouter(feeRouterAddress)
    await setFeeRouterTx.wait()
    console.log('✅ FeeRouter set in SwapRouter')

    // ========================================================================
    // Final Summary
    // ========================================================================
    console.log('\n' + '='.repeat(65))
    console.log('🎉 DEPLOYMENT COMPLETE!')
    console.log('='.repeat(65))
    
    console.log('\n📋 Deployed Contract Addresses:')
    console.log('─'.repeat(65))
    console.log('DWTToken:        ', deployedAddresses.DWTToken)
    console.log('FeeRouter:       ', deployedAddresses.FeeRouter)
    console.log('SwapRouter:      ', deployedAddresses.SwapRouter)
    console.log('NFTMembership:   ', deployedAddresses.NFTMembership)
    console.log('ReferralPool:    ', deployedAddresses.ReferralPool)
    console.log('─'.repeat(65))

    // Save to file
    const fs = require('fs')
    const output = {
      network: networkName,
      chainId: (await ethers.provider.getNetwork()).chainId,
      deployer: deployer.address,
      timestamp: new Date().toISOString(),
      contracts: deployedAddresses,
      configuration: {
        treasury,
        governor,
        securityController: SECURITY_CONTROLLER || deployer.address
      }
    }

    const outputFile = `deployment-${networkName}-${Date.now()}.json`
    fs.writeFileSync(outputFile, JSON.stringify(output, null, 2))
    console.log(`\n💾 Deployment details saved to: ${outputFile}`)

    console.log('\n📝 Next Steps:')
    console.log('  1. Verify contracts on Basescan:')
    console.log(`     npx hardhat verify --network ${networkName} ${deployedAddresses.DWTToken}`)
    console.log(`     npx hardhat verify --network ${networkName} ${deployedAddresses.FeeRouter}`)
    console.log(`     npx hardhat verify --network ${networkName} ${deployedAddresses.SwapRouter}`)
    console.log(`     npx hardhat verify --network ${networkName} ${deployedAddresses.NFTMembership}`)
    console.log(`     npx hardhat verify --network ${networkName} ${deployedAddresses.ReferralPool}`)
    console.log('\n  2. Fund ReferralPool with DWT tokens for rewards')
    console.log('  3. Configure FeeRouter discount tiers (if needed)')
    console.log('  4. Register liquidity pools in SwapRouter')
    console.log('  5. Update .env with new contract addresses')
    console.log('\n' + '='.repeat(65) + '\n')

  } catch (error) {
    console.error('\n❌ Deployment failed:')
    console.error(error)
    console.error('\n💡 Tip: Make sure you have:')
    console.error('  1. Sufficient ETH balance on Base Sepolia')
    console.error('  2. @openzeppelin/hardhat-upgrades installed')
    console.error('  3. Contracts compiled successfully')
    process.exit(1)
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
