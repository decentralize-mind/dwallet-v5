const { ethers, network } = require('hardhat')
require('dotenv').config()

/**
 * ╔══════════════════════════════════════════════════════════╗
 * ║   COMPLETE DWT TOKEN DEPLOYMENT - CLEAN VERSION        ║
 * ║                                                         ║
 * ║   Using new simple DWTToken (no complex extensions)    ║
 * ╚══════════════════════════════════════════════════════════╝
 */

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function log(msg) { console.log(msg) }
function section(title) {
  console.log('\n' + '═'.repeat(70))
  console.log(`  ${title}`)
  console.log('═'.repeat(70))
}

async function main() {
  const [deployer] = await ethers.getSigners()
  const balance = await ethers.provider.getBalance(deployer.address)

  console.log('\n╔══════════════════════════════════════════════════════════╗')
  console.log('║   COMPLETE DWT TOKEN DEPLOYMENT - CLEAN VERSION          ║')
  console.log('╚══════════════════════════════════════════════════════════╝\n')
  log(`📍 Network: ${network.name}`)
  log(`👤 Deployer: ${deployer.address}`)
  log(`💰 Balance: ${ethers.formatEther(balance)} ETH\n`)

  if (parseFloat(ethers.formatEther(balance)) < 0.05) {
    throw new Error('❌ Need at least 0.05 ETH for gas')
  }

  const deployed = {}

  // ═══════════════════════════════════════════════════════
  // STEP 1: Deploy Simple DWT Token
  // ═══════════════════════════════════════════════════════
  section('STEP 1: Deploy DWT Token')
  
  log('\n📦 Deploying DWTToken (simple version)...')
  const DWTToken = await ethers.getContractFactory('DWTToken')
  const token = await DWTToken.deploy(deployer.address)
  await token.waitForDeployment()
  
  deployed.token = await token.getAddress()
  const owner = await token.owner()
  const name = await token.name()
  const symbol = await token.symbol()
  const maxSupply = await token.MAX_SUPPLY()
  
  log(`✅ Token deployed: ${deployed.token}`)
  log(`   Name: ${name}`)
  log(`   Symbol: ${symbol}`)
  log(`   Owner: ${owner}`)
  log(`   Max Supply: ${ethers.formatEther(maxSupply)} DWT`)
  
  if (owner !== deployer.address) {
    throw new Error('❌ Deployer is not the owner!')
  }

  // ═══════════════════════════════════════════════════════
  // STEP 2: Mint to ALL Recipients
  // ═══════════════════════════════════════════════════════
  section('STEP 2: Mint Tokens to All Recipients')
  
  const allocations = []
  
  const add = (addrEnv, amtEnv, label) => {
    const addr = process.env[addrEnv]
    const amt = process.env[amtEnv]
    if (addr && amt && ethers.isAddress(addr)) {
      allocations.push({ address: addr, amount: amt.replace(/,/g, '').trim(), label })
    }
  }

  // All 25 recipients
  for (let i = 1; i <= 3; i++) add(`FOUNDER_${i}_ADDRESS`, `FOUNDER_${i}_AMOUNT`, `Founder ${i}`)
  for (let i = 1; i <= 11; i++) add(`TEAM_${i}_ADDRESS`, `TEAM_${i}_AMOUNT`, `Team ${i}`)
  add(`INVESTOR_1_ADDRESS`, `INVESTOR_1_AMOUNT`, `Investor 1`)
  for (let i = 1; i <= 5; i++) add(`ADVISOR_${i}_ADDRESS`, `ADVISOR_${i}_AMOUNT`, `Advisor ${i}`)
  for (let i = 1; i <= 3; i++) add(`MARKETING_${i}_ADDRESS`, `MARKETING_${i}_AMOUNT`, `Marketing ${i}`)
  add('DAO_TREASURY_ADDRESS', 'DAO_TREASURY_AMOUNT', 'DAO Treasury')
  add('COMMUNITY_REWARDS_ADDRESS', 'COMMUNITY_REWARDS_AMOUNT', 'Community Rewards')
  add('AIRDROP_ADDRESS', 'AIRDROP_AMOUNT', 'Airdrop Pool')
  add('LIQUIDITY_DEX_ADDRESS', 'LIQUIDITY_DEX_AMOUNT', 'Liquidity')

  log(`\n📋 Found ${allocations.length} recipients\n`)

  let totalMinted = 0n
  let successCount = 0

  for (let i = 0; i < allocations.length; i++) {
    const alloc = allocations[i]
    const amount = ethers.parseEther(alloc.amount)
    
    process.stdout.write(`[${i + 1}/${allocations.length}] ${alloc.label.padEnd(25)} ${alloc.amount.padStart(10)} DWT ... `)
    
    try {
      const tx = await token.mint(alloc.address, amount)
      await tx.wait()
      totalMinted += amount
      successCount++
      log('✅')
    } catch (e) {
      log(`❌ ${e.shortMessage || e.reason || 'reverted'}`)
    }
    
    await sleep(200) // Small delay between mints
  }

  log(`\n📊 Minting Summary:`)
  log(`   ✅ Successful: ${successCount}/${allocations.length}`)
  log(`   Total minted: ${ethers.formatEther(totalMinted)} DWT`)
  log(`   Remaining supply: ${ethers.formatEther(maxSupply - totalMinted)} DWT`)

  if (successCount === 0) {
    throw new Error('❌ No mints succeeded!')
  }

  // ═══════════════════════════════════════════════════════
  // STEP 3: Deploy Governance System
  // ═══════════════════════════════════════════════════════
  section('STEP 3: Deploy Governance')
  
  const TIMELOCK_DELAY = 48 * 60 * 60 // 48 hours
  
  // Deploy Timelock
  log('\n⏰ Deploying TimelockController...')
  const TimelockFactory = await ethers.getContractFactory(
    '@openzeppelin/contracts/governance/TimelockController.sol:TimelockController'
  )
  const timelock = await TimelockFactory.deploy(
    TIMELOCK_DELAY,
    [],
    [ethers.ZeroAddress],
    deployer.address
  )
  await timelock.waitForDeployment()
  deployed.timelock = await timelock.getAddress()
  log(`✅ Timelock: ${deployed.timelock}`)
  
  // Deploy Governor (if DWTGovernor exists and works)
  try {
    log('\n🗳️  Deploying DWTGovernor...')
    const GovernorFactory = await ethers.getContractFactory('DWTGovernor')
    const governor = await GovernorFactory.deploy(deployed.token, deployed.timelock)
    await governor.waitForDeployment()
    deployed.governor = await governor.getAddress()
    log(`✅ Governor: ${deployed.governor}`)
    
    // Grant roles
    log('\n🎫 Granting roles...')
    const PROPOSER_ROLE = await timelock.PROPOSER_ROLE()
    const CANCELLER_ROLE = await timelock.CANCELLER_ROLE()
    
    let tx = await timelock.grantRole(PROPOSER_ROLE, deployed.governor)
    await tx.wait()
    log('✅ PROPOSER_ROLE granted to Governor')
    
    tx = await timelock.grantRole(CANCELLER_ROLE, deployed.governor)
    await tx.wait()
    log('✅ CANCELLER_ROLE granted to Governor')
  } catch (e) {
    log(`⚠️  Governor deployment failed: ${e.message}`)
    log('   Continuing without Governor...')
  }

  // ═══════════════════════════════════════════════════════
  // STEP 4: Transfer Ownership to Timelock
  // ═══════════════════════════════════════════════════════
  section('STEP 4: Transfer Ownership')
  
  log(`\n🔄 Transferring token ownership to Timelock...`)
  const tx1 = await token.transferOwnership(deployed.timelock)
  await tx1.wait()
  
  const newOwner = await token.owner()
  log(`✅ New owner: ${newOwner}`)
  log(`✅ Is Timelock: ${newOwner === deployed.timelock}`)
  
  // Renounce admin
  log('\n🗑️  Renouncing TIMELOCK_ADMIN_ROLE...')
  const ADMIN_ROLE = await timelock.DEFAULT_ADMIN_ROLE()
  const tx2 = await timelock.renounceRole(ADMIN_ROLE, deployer.address)
  await tx2.wait()
  log('✅ Admin role renounced')

  // ═══════════════════════════════════════════════════════
  // STEP 5: Deploy Airdrop Contract
  // ═══════════════════════════════════════════════════════
  section('STEP 5: Deploy Airdrop')
  
  log('\n🎁 Deploying SimpleAirdrop...')
  const SimpleAirdrop = await ethers.getContractFactory('SimpleAirdrop')
  const airdrop = await SimpleAirdrop.deploy(deployed.token)
  await airdrop.waitForDeployment()
  deployed.airdrop = await airdrop.getAddress()
  log(`✅ SimpleAirdrop: ${deployed.airdrop}`)

  // ═══════════════════════════════════════════════════════
  // STEP 6: Deploy Security Infrastructure (Optional)
  // ═══════════════════════════════════════════════════════
  section('STEP 6: Deploy Security Infrastructure')
  
  try {
    log('\n🔒 Deploying LockEngine...')
    const LockEngine = await ethers.getContractFactory('LockEngine')
    const lockEngine = await LockEngine.deploy(deployer.address)
    await lockEngine.waitForDeployment()
    deployed.lockEngine = await lockEngine.getAddress()
    log(`✅ LockEngine: ${deployed.lockEngine}`)
    
    log('\n🛡️  Deploying SecurityController...')
    const SecurityController = await ethers.getContractFactory(
      'contracts/security/SecurityController.sol:SecurityController'
    )
    const securityController = await SecurityController.deploy(deployer.address)
    await securityController.waitForDeployment()
    deployed.securityController = await securityController.getAddress()
    log(`✅ SecurityController: ${deployed.securityController}`)
    
    log('\n⏱️  Deploying RateLimiter...')
    const RateLimiter = await ethers.getContractFactory('RateLimiter')
    const rateLimiter = await RateLimiter.deploy(deployer.address)
    await rateLimiter.waitForDeployment()
    deployed.rateLimiter = await rateLimiter.getAddress()
    log(`✅ RateLimiter: ${deployed.rateLimiter}`)
    
    log('\n🔍 Deploying InvariantChecker...')
    const InvariantChecker = await ethers.getContractFactory('InvariantChecker')
    const invariantChecker = await InvariantChecker.deploy()
    await invariantChecker.waitForDeployment()
    deployed.invariantChecker = await invariantChecker.getAddress()
    log(`✅ InvariantChecker: ${deployed.invariantChecker}`)
  } catch (e) {
    log(`⚠️  Security deployment skipped: ${e.message}`)
  }

  // ═══════════════════════════════════════════════════════
  // SAVE DEPLOYMENT
  // ═══════════════════════════════════════════════════════
  const fs = require('fs')
  const deploymentData = {
    network: network.name,
    chainId: network.config.chainId,
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    
    token: {
      address: deployed.token,
      owner: newOwner,
      ownerIsTimelock: newOwner === deployed.timelock,
      totalMinted: ethers.formatEther(totalMinted),
      maxSupply: ethers.formatEther(maxSupply),
      mintSuccessRate: `${successCount}/${allocations.length}`,
    },
    
    governance: {
      timelock: deployed.timelock,
      governor: deployed.governor || 'Not deployed',
      timelockDelay: '48 hours',
    },
    
    airdrop: deployed.airdrop,
    security: {
      lockEngine: deployed.lockEngine,
      securityController: deployed.securityController,
      rateLimiter: deployed.rateLimiter,
      invariantChecker: deployed.invariantChecker,
    },
    
    allocations: allocations,
  }

  const outFile = `deployment-clean-${network.name}-${Date.now()}.json`
  fs.writeFileSync(outFile, JSON.stringify(deploymentData, null, 2))
  
  // ═══════════════════════════════════════════════════════
  // FINAL SUMMARY
  // ═══════════════════════════════════════════════════════
  section('🎉 DEPLOYMENT COMPLETE!')
  
  log(`\n📄 Token: ${deployed.token}`)
  log(`💰 Total Minted: ${ethers.formatEther(totalMinted)} DWT`)
  log(`👥 Recipients: ${successCount}/${allocations.length}`)
  log(`⏰ Timelock: ${deployed.timelock}`)
  log(`🗳️  Governor: ${deployed.governor || 'Not deployed'}`)
  log(`🎁 Airdrop: ${deployed.airdrop}`)
  
  log(`\n🔗 BaseScan: https://sepolia.basescan.org/address/${deployed.token}`)
  log(`\n💾 Deployment saved: ${outFile}\n`)
  
  log('📋 Next steps:')
  log(`   1. Fund airdrop: Transfer ${process.env.AIRDROP_AMOUNT} DWT to ${deployed.airdrop}`)
  log(`   2. Verify contracts on BaseScan`)
  log(`   3. Set up Gnosis Safe for multisig`)
  log(`   4. Add DEX liquidity\n`)
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\n❌ DEPLOYMENT FAILED:', err.message)
    console.error(err.stack)
    process.exit(1)
  })
