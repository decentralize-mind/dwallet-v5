const { ethers, network } = require('hardhat')
require('dotenv').config()

async function main() {
  const [deployer] = await ethers.getSigners()
  const balance = await ethers.provider.getBalance(deployer.address)
  
  console.log('\n╔══════════════════════════════════════════════════╗')
  console.log('║   DWT Token - Minimal Deployment & Distribution   ║')
  console.log('╚══════════════════════════════════════════════════╝')
  console.log('Network:  ', network.name)
  console.log('Deployer: ', deployer.address)
  console.log('Balance:  ', ethers.formatEther(balance), 'ETH\n')

  if (parseFloat(ethers.formatEther(balance)) < 0.01) {
    throw new Error('Need at least 0.01 ETH for gas')
  }

  console.log('📋 Step 1: Deploying Layer 7 Security (Required First)...')
  
  // Deploy minimal security contracts first
  const LockEngine = await ethers.getContractFactory('LockEngine')
  const lockEngine = await LockEngine.deploy()
  await lockEngine.waitForDeployment()
  const lockEngineAddr = await lockEngine.getAddress()
  console.log('✅ LockEngine deployed:', lockEngineAddr)

  const InvariantChecker = await ethers.getContractFactory('InvariantChecker')
  const invariantChecker = await InvariantChecker.deploy()
  await invariantChecker.waitForDeployment()
  const invariantCheckerAddr = await invariantChecker.getAddress()
  console.log('✅ InvariantChecker deployed:', invariantCheckerAddr)

  const SecurityController = await ethers.getContractFactory('SecurityController')
  const securityController = await SecurityController.deploy(deployer.address)
  await securityController.waitForDeployment()
  const securityControllerAddr = await securityController.getAddress()
  console.log('✅ SecurityController deployed:', securityControllerAddr)

  console.log('\n📋 Step 2: Deploying Layer 0 Registry...')
  
  const ProtocolRegistry = await ethers.getContractFactory('ProtocolRegistry')
  const protocolRegistry = await ProtocolRegistry.deploy(
    deployer.address,
    securityControllerAddr,
    lockEngineAddr,
    invariantCheckerAddr
  )
  await protocolRegistry.waitForDeployment()
  const protocolRegistryAddr = await protocolRegistry.getAddress()
  console.log('✅ ProtocolRegistry deployed:', protocolRegistryAddr)

  console.log('\n📋 Step 3: Deploying DWT Token...')
  
  const DWTToken = await ethers.getContractFactory('DWTToken')
  const dwtToken = await DWTToken.deploy(
    deployer.address,              // initialOwner
    securityControllerAddr,        // securityController
    protocolRegistryAddr,          // registry
    lockEngineAddr,                // lockEngine
    invariantCheckerAddr,          // invariantChecker
    ethers.parseEther('1000'),     // tier1 threshold
    ethers.parseEther('10000'),    // tier2 threshold
    ethers.parseEther('100000')    // tier3 threshold
  )
  await dwtToken.waitForDeployment()
  const dwtTokenAddr = await dwtToken.getAddress()
  console.log('✅ DWTToken deployed:', dwtTokenAddr)
  
  const maxSupply = await dwtToken.MAX_SUPPLY()
  console.log('📊 Max Supply:', ethers.formatEther(maxSupply), 'DWT')

  console.log('\n📋 Step 4: Distributing 70M DWT tokens from .env...\n')
  
  // Parse allocations from .env
  const allocations = []
  
  // Helper to add allocation
  const addAlloc = (addressKey, amountKey, label) => {
    const addr = process.env[addressKey]
    const amt = process.env[amountKey]
    if (addr && amt && ethers.isAddress(addr)) {
      allocations.push({
        address: addr,
        amount: amt.toString().replace(/,/g, '').trim(),
        label: label
      })
    }
  }

  // Add all allocations from .env
  for (let i = 1; i <= 3; i++) addAlloc(`FOUNDER_${i}_ADDRESS`, `FOUNDER_${i}_AMOUNT`, `Founder ${i}`)
  for (let i = 1; i <= 11; i++) addAlloc(`TEAM_${i}_ADDRESS`, `TEAM_${i}_AMOUNT`, `Team ${i}`)
  for (let i = 1; i <= 1; i++) addAlloc(`INVESTOR_${i}_ADDRESS`, `INVESTOR_${i}_AMOUNT`, `Investor ${i}`)
  for (let i = 1; i <= 5; i++) addAlloc(`ADVISOR_${i}_ADDRESS`, `ADVISOR_${i}_AMOUNT`, `Advisor ${i}`)
  for (let i = 1; i <= 3; i++) addAlloc(`MARKETING_${i}_ADDRESS`, `MARKETING_${i}_AMOUNT`, `Marketing ${i}`)
  
  addAlloc('DAO_TREASURY_ADDRESS', 'DAO_TREASURY_AMOUNT', 'DAO Treasury')
  addAlloc('COMMUNITY_REWARDS_ADDRESS', 'COMMUNITY_REWARDS_AMOUNT', 'Community Rewards')
  addAlloc('AIRDROP_ADDRESS', 'AIRDROP_AMOUNT', 'Airdrop')
  addAlloc('LIQUIDITY_DEX_ADDRESS', 'LIQUIDITY_DEX_AMOUNT', 'Liquidity & DEX')

  console.log(`Found ${allocations.length} recipients\n`)

  let totalMinted = 0n
  
  // Mint tokens to each recipient
  for (const alloc of allocations) {
    const amountWei = ethers.parseEther(alloc.amount)
    totalMinted += amountWei
    
    console.log(`Minting ${alloc.amount.padStart(12)} DWT to ${alloc.label.padEnd(25)} (${alloc.address})`)
    
    try {
      const tx = await dwtToken.mint(alloc.address, amountWei)
      await tx.wait()
      console.log(`  ✅ Success (tx: ${tx.hash.slice(0, 10)}...)\n`)
    } catch (error) {
      console.error(`  ❌ Failed: ${error.message}\n`)
    }
    
    // Small delay to avoid nonce issues
    await new Promise(r => setTimeout(r, 500))
  }

  console.log('\n╔══════════════════════════════════════════════════╗')
  console.log('║   ✅ DEPLOYMENT & DISTRIBUTION COMPLETE!          ║')
  console.log('╚══════════════════════════════════════════════════╝')
  
  console.log('\n📊 Summary:')
  console.log('  DWT Token Address:', dwtTokenAddr)
  console.log('  Total Minted:', ethers.formatEther(totalMinted), 'DWT')
  console.log('  Max Supply:', ethers.formatEther(maxSupply), 'DWT')
  console.log('  Remaining:', ethers.formatEther(maxSupply - totalMinted), 'DWT')
  
  console.log('\n🔗 Contract Addresses:')
  console.log('  LockEngine:', lockEngineAddr)
  console.log('  InvariantChecker:', invariantCheckerAddr)
  console.log('  SecurityController:', securityControllerAddr)
  console.log('  ProtocolRegistry:', protocolRegistryAddr)
  console.log('  DWTToken:', dwtTokenAddr)
  
  console.log('\n🔍 Verify on BaseScan:')
  console.log(`  https://sepolia.basescan.org/address/${dwtTokenAddr}`)
  
  console.log('\n📝 Next Steps:')
  console.log('  1. Verify contracts on BaseScan')
  console.log('  2. Add token to MetaMask')
  console.log('  3. Test token transfers')
  console.log('  4. Deploy remaining layers')
  
  // Save deployment info
  const fs = require('fs')
  const deploymentInfo = {
    network: network.name,
    chainId: network.config.chainId,
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    contracts: {
      lockEngine: lockEngineAddr,
      invariantChecker: invariantCheckerAddr,
      securityController: securityControllerAddr,
      protocolRegistry: protocolRegistryAddr,
      dwtToken: dwtTokenAddr
    },
    totalMinted: ethers.formatEther(totalMinted),
    maxSupply: ethers.formatEther(maxSupply),
    allocations: allocations.length
  }
  
  const outFile = `deployment-${network.name}-${Date.now()}.json`
  fs.writeFileSync(outFile, JSON.stringify(deploymentInfo, null, 2))
  console.log(`\n💾 Deployment info saved to: ${outFile}`)
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('\n❌ Deployment failed:', error)
    process.exit(1)
  })
