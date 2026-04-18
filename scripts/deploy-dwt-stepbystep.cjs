const { ethers, network } = require('hardhat')
require('dotenv').config()

/**
 * ╔══════════════════════════════════════════════════════════╗
 * ║   STEP-BY-STEP DWT DEPLOYMENT                          ║
 * ║   We'll deploy in phases and test each one             ║
 * ╚══════════════════════════════════════════════════════════╝
 * 
 * PHASE 1: Deploy Token Contract
 * PHASE 2: Test Minting (1 recipient)
 * PHASE 3: Mint to ALL recipients
 * PHASE 4: Deploy Governance (Timelock + Governor)
 * PHASE 5: Transfer Ownership
 * PHASE 6: Deploy Supporting Contracts (Airdrop, etc.)
 */

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
  console.log('║   STEP-BY-STEP DWT DEPLOYMENT                          ║')
  console.log('╚══════════════════════════════════════════════════════════╝\n')
  log(`📍 Network: ${network.name}`)
  log(`👤 Deployer: ${deployer.address}`)
  log(`💰 Balance: ${ethers.formatEther(balance)} ETH\n`)

  const deployed = {}

  // ═══════════════════════════════════════════════════════
  // PHASE 1: Deploy Token Contract
  // ═══════════════════════════════════════════════════════
  section('PHASE 1: Deploy Token Contract')
  
  try {
    log('\n📦 Deploying DWTTokenSimple...')
    const DWTToken = await ethers.getContractFactory('DWTTokenSimple')
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
    log(`   Is deployer owner: ${owner === deployer.address}`)
    
    if (owner !== deployer.address) {
      throw new Error('❌ Deployer is not the owner!')
    }
    
    log('✅ PHASE 1 COMPLETE')
  } catch (e) {
    log(`❌ PHASE 1 FAILED: ${e.message}`)
    throw e
  }

  // ═══════════════════════════════════════════════════════
  // PHASE 2: Test Minting (Single Recipient)
  // ═══════════════════════════════════════════════════════
  section('PHASE 2: Test Minting')
  
  try {
    const DWTToken = await ethers.getContractFactory('DWTTokenSimple')
    const token = DWTToken.attach(deployed.token)
    
    // Test with a fresh wallet
    const testWallet = ethers.Wallet.createRandom()
    const testAmount = ethers.parseEther('1000')
    
    log(`\n🧪 Testing mint of 1000 DWT to: ${testWallet.address}`)
    
    const tx = await token.mint(testWallet.address, testAmount)
    await tx.wait()
    
    const balance = await token.balanceOf(testWallet.address)
    const totalSupply = await token.totalSupply()
    
    log(`✅ Mint successful!`)
    log(`   Test wallet balance: ${ethers.formatEther(balance)} DWT`)
    log(`   Total supply: ${ethers.formatEther(totalSupply)} DWT`)
    log('✅ PHASE 2 COMPLETE')
  } catch (e) {
    log(`❌ PHASE 2 FAILED: ${e.message}`)
    throw e
  }

  // ═══════════════════════════════════════════════════════
  // PHASE 3: Mint to ALL 25 Recipients
  // ═══════════════════════════════════════════════════════
  section('PHASE 3: Mint to All Recipients')
  
  try {
    const DWTToken = await ethers.getContractFactory('DWTTokenSimple')
    const token = DWTToken.attach(deployed.token)
    
    // Build allocation list from .env
    const allocations = []
    
    const add = (addrEnv, amtEnv, label) => {
      const addr = process.env[addrEnv]
      const amt = process.env[amtEnv]
      if (addr && amt && ethers.isAddress(addr)) {
        allocations.push({ address: addr, amount: amt.replace(/,/g, '').trim(), label })
      }
    }

    // Add all recipients
    for (let i = 1; i <= 3; i++) add(`FOUNDER_${i}_ADDRESS`, `FOUNDER_${i}_AMOUNT`, `Founder ${i}`)
    for (let i = 1; i <= 11; i++) add(`TEAM_${i}_ADDRESS`, `TEAM_${i}_AMOUNT`, `Team ${i}`)
    add(`INVESTOR_1_ADDRESS`, `INVESTOR_1_AMOUNT`, `Investor 1`)
    for (let i = 1; i <= 5; i++) add(`ADVISOR_${i}_ADDRESS`, `ADVISOR_${i}_AMOUNT`, `Advisor ${i}`)
    for (let i = 1; i <= 3; i++) add(`MARKETING_${i}_ADDRESS`, `MARKETING_${i}_AMOUNT`, `Marketing ${i}`)
    add('DAO_TREASURY_ADDRESS', 'DAO_TREASURY_AMOUNT', 'DAO Treasury')
    add('COMMUNITY_REWARDS_ADDRESS', 'COMMUNITY_REWARDS_AMOUNT', 'Community Rewards')
    add('AIRDROP_ADDRESS', 'AIRDROP_AMOUNT', 'Airdrop Pool')
    add('LIQUIDITY_DEX_ADDRESS', 'LIQUIDITY_DEX_AMOUNT', 'Liquidity')

    log(`\n📋 Total recipients: ${allocations.length}\n`)

    let totalMinted = 0n
    let successCount = 0
    let failCount = 0

    // Mint one by one
    for (let i = 0; i < allocations.length; i++) {
      const alloc = allocations[i]
      const amount = ethers.parseEther(alloc.amount)
      
      process.stdout.write(`[${i + 1}/${allocations.length}] ${alloc.label.padEnd(25)} ${alloc.amount.padStart(10)} DWT ... `)
      
      try {
        // Verify ownership before each mint
        const currentOwner = await token.owner()
        if (currentOwner !== deployer.address) {
          throw new Error(`Owner changed to ${currentOwner}!`)
        }
        
        const tx = await token.mint(alloc.address, amount)
        await tx.wait()
        
        totalMinted += amount
        successCount++
        log('✅')
      } catch (e) {
        failCount++
        log(`❌ ${e.shortMessage || e.message.slice(0, 60)}`)
      }
    }

    log(`\n📊 Minting Summary:`)
    log(`   Successful: ${successCount}/${allocations.length}`)
    log(`   Failed: ${failCount}/${allocations.length}`)
    log(`   Total minted: ${ethers.formatEther(totalMinted)} DWT`)
    
    if (successCount === 0) {
      throw new Error('❌ No mints succeeded!')
    }
    
    log('✅ PHASE 3 COMPLETE')
  } catch (e) {
    log(`❌ PHASE 3 FAILED: ${e.message}`)
    throw e
  }

  // ═══════════════════════════════════════════════════════
  // PHASE 4: Deploy Governance (Timelock + Governor)
  // ═══════════════════════════════════════════════════════
  section('PHASE 4: Deploy Governance')
  
  try {
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
    log(`✅ Timelock: ${deployed.timelock} (delay: 48h)`)
    
    // Deploy Governor
    log('\n🗳️  Deploying DWTGovernor...')
    const GovernorFactory = await ethers.getContractFactory('DWTGovernor')
    const governor = await GovernorFactory.deploy(deployed.token, deployed.timelock)
    await governor.waitForDeployment()
    deployed.governor = await governor.getAddress()
    log(`✅ Governor: ${deployed.governor}`)
    
    // Grant roles
    log('\n🎫 Granting roles to Governor...')
    const PROPOSER_ROLE = await timelock.PROPOSER_ROLE()
    const CANCELLER_ROLE = await timelock.CANCELLER_ROLE()
    
    let tx = await timelock.grantRole(PROPOSER_ROLE, deployed.governor)
    await tx.wait()
    log('✅ PROPOSER_ROLE granted')
    
    tx = await timelock.grantRole(CANCELLER_ROLE, deployed.governor)
    await tx.wait()
    log('✅ CANCELLER_ROLE granted')
    
    log('✅ PHASE 4 COMPLETE')
  } catch (e) {
    log(`❌ PHASE 4 FAILED: ${e.message}`)
    throw e
  }

  // ═══════════════════════════════════════════════════════
  // PHASE 5: Transfer Ownership to Timelock
  // ═══════════════════════════════════════════════════════
  section('PHASE 5: Transfer Ownership')
  
  try {
    const DWTToken = await ethers.getContractFactory('DWTTokenSimple')
    const token = DWTToken.attach(deployed.token)
    
    log(`\n🔄 Transferring token ownership to Timelock...`)
    log(`   From: ${deployer.address}`)
    log(`   To: ${deployed.timelock}`)
    
    const tx = await token.transferOwnership(deployed.timelock)
    await tx.wait()
    
    const newOwner = await token.owner()
    log(`✅ New owner: ${newOwner}`)
    log(`✅ Is Timelock: ${newOwner === deployed.timelock}`)
    
    // Renounce admin role
    log('\n🗑️  Renouncing TIMELOCK_ADMIN_ROLE...')
    const ADMIN_ROLE = await (await ethers.getContractAt(
      '@openzeppelin/contracts/governance/TimelockController.sol:TimelockController',
      deployed.timelock
    )).DEFAULT_ADMIN_ROLE()
    
    const Timelock = await ethers.getContractAt(
      '@openzeppelin/contracts/governance/TimelockController.sol:TimelockController',
      deployed.timelock
    )
    
    tx = await Timelock.renounceRole(ADMIN_ROLE, deployer.address)
    await tx.wait()
    log('✅ Admin role renounced')
    
    log('✅ PHASE 5 COMPLETE')
  } catch (e) {
    log(`❌ PHASE 5 FAILED: ${e.message}`)
    throw e
  }

  // ═══════════════════════════════════════════════════════
  // PHASE 6: Deploy Supporting Contracts
  // ═══════════════════════════════════════════════════════
  section('PHASE 6: Deploy Supporting Contracts')
  
  try {
    // Deploy Airdrop
    log('\n🎁 Deploying SimpleAirdrop...')
    const SimpleAirdrop = await ethers.getContractFactory('SimpleAirdrop')
    const airdrop = await SimpleAirdrop.deploy(deployed.token)
    await airdrop.waitForDeployment()
    deployed.airdrop = await airdrop.getAddress()
    log(`✅ SimpleAirdrop: ${deployed.airdrop}`)
    
    log('✅ PHASE 6 COMPLETE')
  } catch (e) {
    log(`❌ PHASE 6 FAILED: ${e.message}`)
    throw e
  }

  // ═══════════════════════════════════════════════════════
  // FINAL SUMMARY
  // ═══════════════════════════════════════════════════════
  section('🎉 DEPLOYMENT COMPLETE - SUMMARY')
  
  const fs = require('fs')
  const deploymentData = {
    network: network.name,
    chainId: network.config.chainId,
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    contracts: deployed,
  }

  const outFile = `deployment-stepbystep-${network.name}-${Date.now()}.json`
  fs.writeFileSync(outFile, JSON.stringify(deploymentData, null, 2))
  
  log(`\n📄 Token: ${deployed.token}`)
  log(`⏰ Timelock: ${deployed.timelock}`)
  log(`🗳️  Governor: ${deployed.governor}`)
  log(`🎁 Airdrop: ${deployed.airdrop}`)
  log(`\n💾 Saved to: ${outFile}`)
  log(`\n🔗 BaseScan: https://sepolia.basescan.org/address/${deployed.token}\n`)
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\n❌ DEPLOYMENT FAILED:', err.message)
    process.exit(1)
  })
