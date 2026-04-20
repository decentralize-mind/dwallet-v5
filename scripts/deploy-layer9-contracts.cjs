// scripts/deploy-layer9-contracts.js
// Deploy 5 Layer 9 contracts to Base Sepolia testnet
// Run with: npx hardhat run scripts/deploy-layer9-contracts.js --network baseSepolia

const { ethers, network, run } = require('hardhat')
const fs = require('fs')

async function main() {
  console.log('\n═══════════════════════════════════════════════════════')
  console.log('   Layer 9 Contracts - Base Sepolia Deployment')
  console.log('═══════════════════════════════════════════════════════\n')

  // ── Configuration ──────────────────────────────────────────────────────
  const CONFIG = {
    // From your latest Base Sepolia deployment
    securityController: '0x77AB4ffb0c2f1C497c3E365762bac028Ca55Bf12',
    protocolRegistry: '0x77AB4ffb0c2f1C497c3E365762bac028Ca55Bf12',
    lockEngine: '0xf52F922fBa56A320ab568ea4B6De6496421e317f',
    invariantChecker: '0x41257226EB03F1196aCf75549821D7841BE58899',
    dwtToken: '0xEa824cA9497864cB326b93D80ec99C5b1319d9c6', // From latest deployment
    treasury: process.env.TREASURY || '0xE71394Cb5A093264464a8133c582b3Ba6b05cbF3',
    liquidityPool: '0x6259648010922027A7ED105b3196FB63Dd4Beb9d', // From previous deployment
  }

  // Validate addresses
  for (const [key, value] of Object.entries(CONFIG)) {
    if (!ethers.isAddress(value)) {
      throw new Error(`❌ Invalid address for ${key}: ${value}`)
    }
  }


  const [deployer] = await ethers.getSigners()
  const balance = await ethers.provider.getBalance(deployer.address)
  const networkName = network.name

  console.log('📋 Deployment Configuration:')
  console.log('═══════════════════════════════════════════════════════')
  console.log('Network:            ', networkName)
  console.log('Deployer:           ', deployer.address)
  console.log('Balance:            ', ethers.formatEther(balance), 'ETH')
  console.log('SecurityController: ', CONFIG.securityController)
  console.log('ProtocolRegistry:   ', CONFIG.protocolRegistry)
  console.log('LockEngine:         ', CONFIG.lockEngine)
  console.log('InvariantChecker:   ', CONFIG.invariantChecker)
  console.log('DWT Token:          ', CONFIG.dwtToken)
  console.log('Treasury:           ', CONFIG.treasury)
  console.log('Liquidity Pool:     ', CONFIG.liquidityPool)
  console.log('═══════════════════════════════════════════════════════\n')

  // Check balance
  if (balance < ethers.parseEther('0.05')) {
    throw new Error(
      `❌ Insufficient balance. Need at least 0.05 ETH, have ${ethers.formatEther(balance)} ETH`
    )
  }

  const deployedContracts = {}
  const deploymentTimestamp = Date.now()

  // ── 1. Deploy DWTToken ─────────────────────────────────────────────────
  console.log('\n[1/5] Deploying DWTToken...')
  console.log('─'.repeat(60))
  
  const DWTToken = await ethers.getContractFactory('DWTToken')
  const dwtTokenContract = await DWTToken.deploy(deployer.address)
  await dwtTokenContract.waitForDeployment()
  const dwtTokenAddress = await dwtTokenContract.getAddress()
  
  console.log('✅ DWTToken deployed:', dwtTokenAddress)
  console.log('   TX Hash:', dwtTokenContract.deploymentTransaction().hash)
  deployedContracts.DWTToken = dwtTokenAddress

  // ── 2. Deploy FeeRouter ────────────────────────────────────────────────
  console.log('\n[2/5] Deploying FeeRouter...')
  console.log('─'.repeat(60))
  
  const FeeRouter = await ethers.getContractFactory('FeeRouter')
  const feeRouterContract = await FeeRouter.deploy(
    CONFIG.treasury,
    CONFIG.liquidityPool,
    CONFIG.dwtToken, // Using DWT as governance token for discounts
    CONFIG.securityController,
    deployer.address
  )
  await feeRouterContract.waitForDeployment()
  const feeRouterAddress = await feeRouterContract.getAddress()
  
  console.log('✅ FeeRouter deployed:', feeRouterAddress)
  console.log('   TX Hash:', feeRouterContract.deploymentTransaction().hash)
  deployedContracts.FeeRouter = feeRouterAddress

  // ── 3. Deploy SwapRouter ───────────────────────────────────────────────
  console.log('\n[3/5] Deploying SwapRouter...')
  console.log('─'.repeat(60))
  
  const SwapRouter = await ethers.getContractFactory('SwapRouter')
  const swapRouterContract = await SwapRouter.deploy(
    deployer.address, // admin
    deployer.address, // governor
    CONFIG.securityController,
    CONFIG.protocolRegistry,
    CONFIG.lockEngine,
    CONFIG.invariantChecker
  )
  await swapRouterContract.waitForDeployment()
  const swapRouterAddress = await swapRouterContract.getAddress()
  
  console.log('✅ SwapRouter deployed:', swapRouterAddress)
  console.log('   TX Hash:', swapRouterContract.deploymentTransaction().hash)
  deployedContracts.SwapRouter = swapRouterAddress

  // ── 4. Deploy NFTMembership ────────────────────────────────────────────
  console.log('\n[4/5] Deploying NFTMembership...')
  console.log('─'.repeat(60))
  
  const NFTMembership = await ethers.getContractFactory('NFTMembership')
  const nftMembershipContract = await NFTMembership.deploy(
    CONFIG.dwtToken,
    CONFIG.securityController
  )
  await nftMembershipContract.waitForDeployment()
  const nftMembershipAddress = await nftMembershipContract.getAddress()
  
  console.log('✅ NFTMembership deployed:', nftMembershipAddress)
  console.log('   TX Hash:', nftMembershipContract.deploymentTransaction().hash)
  deployedContracts.NFTMembership = nftMembershipAddress

  // ── 5. Deploy ReferralPool ─────────────────────────────────────────────
  console.log('\n[5/5] Deploying ReferralPool...')
  console.log('─'.repeat(60))
  
  const ReferralPool = await ethers.getContractFactory('ReferralPool')
  const referralPoolContract = await ReferralPool.deploy(
    CONFIG.dwtToken,
    CONFIG.securityController,
    deployer.address
  )
  await referralPoolContract.waitForDeployment()
  const referralPoolAddress = await referralPoolContract.getAddress()
  
  console.log('✅ ReferralPool deployed:', referralPoolAddress)
  console.log('   TX Hash:', referralPoolContract.deploymentTransaction().hash)
  deployedContracts.ReferralPool = referralPoolAddress

  // ── Post-Deployment Configuration ──────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════════')
  console.log('   Post-Deployment Configuration')
  console.log('═══════════════════════════════════════════════════════\n')

  // Set FeeRouter in SwapRouter
  console.log('Setting FeeRouter address in SwapRouter...')
  const setFeeRouterTx = await swapRouterContract.setFeeRouter(feeRouterAddress)
  await setFeeRouterTx.wait()
  console.log('✅ FeeRouter configured in SwapRouter\n')

  // ── Save Deployment Info ───────────────────────────────────────────────
  const deploymentInfo = {
    network: networkName,
    chainId: 84532,
    deployedAt: new Date().toISOString(),
    timestamp: deploymentTimestamp,
    deployer: deployer.address,
    configuration: CONFIG,
    contracts: deployedContracts,
    verificationCommands: [
      `npx hardhat verify --network baseSepolia ${dwtTokenAddress} "${deployer.address}"`,
      `npx hardhat verify --network baseSepolia ${feeRouterAddress} "${CONFIG.treasury}" "${CONFIG.liquidityPool}" "${CONFIG.dwtToken}" "${CONFIG.securityController}" "${deployer.address}"`,
      `npx hardhat verify --network baseSepolia ${swapRouterAddress} "${deployer.address}" "${deployer.address}" "${CONFIG.securityController}" "${CONFIG.protocolRegistry}" "${CONFIG.lockEngine}" "${CONFIG.invariantChecker}"`,
      `npx hardhat verify --network baseSepolia ${nftMembershipAddress} "${CONFIG.dwtToken}" "${CONFIG.securityController}"`,
      `npx hardhat verify --network baseSepolia ${referralPoolAddress} "${CONFIG.dwtToken}" "${CONFIG.securityController}" "${deployer.address}"`
    ]
  }

  const filename = `deployments/layer9-baseSepolia-${deploymentTimestamp}.json`
  fs.mkdirSync('deployments', { recursive: true })
  fs.writeFileSync(filename, JSON.stringify(deploymentInfo, null, 2))
  
  console.log('📁 Deployment info saved to:', filename)

  // ── Summary ────────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════════')
  console.log('   ✅ DEPLOYMENT COMPLETE!')
  console.log('═══════════════════════════════════════════════════════\n')
  
  console.log('Deployed Contracts:')
  console.log('┌─────────────────────┬──────────────────────────────────────────────────┐')
  console.log(`│ ${'Contract'.padEnd(19)} │ ${'Address'.padEnd(48)} │`)
  console.log('├─────────────────────┼──────────────────────────────────────────────────┤')
  console.log(`│ ${'DWTToken'.padEnd(19)} │ ${dwtTokenAddress.padEnd(48)} │`)
  console.log(`│ ${'FeeRouter'.padEnd(19)} │ ${feeRouterAddress.padEnd(48)} │`)
  console.log(`│ ${'SwapRouter'.padEnd(19)} │ ${swapRouterAddress.padEnd(48)} │`)
  console.log(`│ ${'NFTMembership'.padEnd(19)} │ ${nftMembershipAddress.padEnd(48)} │`)
  console.log(`│ ${'ReferralPool'.padEnd(19)} │ ${referralPoolAddress.padEnd(48)} │`)
  console.log('└─────────────────────┴──────────────────────────────────────────────────┘\n')

  console.log('View on Base Sepolia Explorer:')
  console.log(`https://sepolia.basescan.org/address/${dwtTokenAddress}`)
  console.log(`https://sepolia.basescan.org/address/${feeRouterAddress}`)
  console.log(`https://sepolia.basescan.org/address/${swapRouterAddress}`)
  console.log(`https://sepolia.basescan.org/address/${nftMembershipAddress}`)
  console.log(`https://sepolia.basescan.org/address/${referralPoolAddress}\n`)

  console.log('═══════════════════════════════════════════════════════')
  console.log('   NEXT STEPS:')
  console.log('═══════════════════════════════════════════════════════')
  console.log('1. Verify contracts on Basescan (wait 30 seconds):')
  deploymentInfo.verificationCommands.forEach(cmd => console.log(`   ${cmd}`))
  console.log('\n2. Configure SwapRouter:')
  console.log('   - Register liquidity pools: registerPool(tokenA, tokenB, poolAddress)')
  console.log('   - Set price oracle: setPriceOracle(oracleAddress)')
  console.log('\n3. Fund ReferralPool:')
  console.log('   - Approve DWT spending: dwtToken.approve(referralPoolAddress, amount)')
  console.log('   - Fund pool: referralPool.fundPool(amount)')
  console.log('\n4. Configure NFTMembership tiers (if needed):')
  console.log('   - configureTier(tier, ethPrice, dwtPrice, dwtHoldReq, maxSupply, duration, baseURI, soulbound, enabled)')
  console.log('\n5. Update frontend with new contract addresses')
  console.log('═══════════════════════════════════════════════════════\n')

  return deployedContracts
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('\n❌ Deployment failed:', error)
    process.exit(1)
  })
