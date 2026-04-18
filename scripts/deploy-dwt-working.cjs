const { ethers, network } = require('hardhat')
require('dotenv').config()

/**
 * WORKING DWT DEPLOYMENT
 * 
 * Based on successful test: The simple DWTToken works!
 * We just need to add proper delays between operations.
 */

const sleep = (ms) => new Promise(r => setTimeout(r, ms))

async function main() {
  const [deployer] = await ethers.getSigners()
  
  console.log('\n🚀 Deploying DWT Token (Working Version)\n')
  console.log('Network:', network.name)
  console.log('Deployer:', deployer.address)
  const balance = await ethers.provider.getBalance(deployer.address)
  console.log('Balance:', ethers.formatEther(balance), 'ETH\n')
  
  // ═══════════════════════════════════════════════════════
  // 1. Deploy Token
  // ═══════════════════════════════════════════════════════
  console.log('═'.repeat(60))
  console.log('1. Deploying DWT Token...')
  console.log('═'.repeat(60))
  
  const DWTToken = await ethers.getContractFactory('DWTToken')
  const token = await DWTToken.deploy(deployer.address)
  await token.waitForDeployment()
  
  const tokenAddr = await token.getAddress()
  const owner = await token.owner()
  const name = await token.name()
  
  console.log(`✅ Token: ${tokenAddr}`)
  console.log(`   Name: ${name}`)
  console.log(`   Owner: ${owner}`)
  console.log(`   Verified: ${owner === deployer.address}\n`)
  
  await sleep(1000) // Wait 1 second
  
  // ═══════════════════════════════════════════════════════
  // 2. Mint to ALL 25 Recipients
  // ═══════════════════════════════════════════════════════
  console.log('═'.repeat(60))
  console.log('2. Minting to 25 Recipients...')
  console.log('═'.repeat(60))
  
  const allocations = []
  const add = (a, b, c) => {
    const addr = process.env[a]
    const amt = process.env[b]
    if (addr && amt && ethers.isAddress(addr)) {
      allocations.push({ address: addr, amount: amt.replace(/,/g, '').trim(), label: c })
    }
  }

  for (let i = 1; i <= 3; i++) add(`FOUNDER_${i}_ADDRESS`, `FOUNDER_${i}_AMOUNT`, `Founder ${i}`)
  for (let i = 1; i <= 11; i++) add(`TEAM_${i}_ADDRESS`, `TEAM_${i}_AMOUNT`, `Team ${i}`)
  add(`INVESTOR_1_ADDRESS`, `INVESTOR_1_AMOUNT`, `Investor 1`)
  for (let i = 1; i <= 5; i++) add(`ADVISOR_${i}_ADDRESS`, `ADVISOR_${i}_AMOUNT`, `Advisor ${i}`)
  for (let i = 1; i <= 3; i++) add(`MARKETING_${i}_ADDRESS`, `MARKETING_${i}_AMOUNT`, `Marketing ${i}`)
  add('DAO_TREASURY_ADDRESS', 'DAO_TREASURY_AMOUNT', 'DAO Treasury')
  add('COMMUNITY_REWARDS_ADDRESS', 'COMMUNITY_REWARDS_AMOUNT', 'Community Rewards')
  add('AIRDROP_ADDRESS', 'AIRDROP_AMOUNT', 'Airdrop')
  add('LIQUIDITY_DEX_ADDRESS', 'LIQUIDITY_DEX_AMOUNT', 'Liquidity')

  console.log(`\nTotal: ${allocations.length} recipients\n`)
  
  let totalMinted = 0n
  let success = 0
  
  for (let i = 0; i < allocations.length; i++) {
    const a = allocations[i]
    const amt = ethers.parseEther(a.amount)
    
    process.stdout.write(`[${i+1}/${allocations.length}] ${a.label.padEnd(20)} ${a.amount.padStart(10)} DWT `)
    
    try {
      const tx = await token.mint(a.address, amt)
      await tx.wait()
      totalMinted += amt
      success++
      console.log('✅')
      await sleep(300) // Small delay
    } catch (e) {
      console.log('❌', e.shortMessage || 'reverted')
    }
  }
  
  console.log(`\n✅ Minted: ${success}/${allocations.length}`)
  console.log(`   Total: ${ethers.formatEther(totalMinted)} DWT\n`)
  
  // ═══════════════════════════════════════════════════════
  // 3. Deploy Timelock
  // ═══════════════════════════════════════════════════════
  console.log('═'.repeat(60))
  console.log('3. Deploying Timelock...')
  console.log('═'.repeat(60))
  
  const TimelockFactory = await ethers.getContractFactory(
    '@openzeppelin/contracts/governance/TimelockController.sol:TimelockController'
  )
  const timelock = await TimelockFactory.deploy(
    48 * 60 * 60, // 48 hours
    [],
    [ethers.ZeroAddress],
    deployer.address
  )
  await timelock.waitForDeployment()
  const timelockAddr = await timelock.getAddress()
  
  console.log(`✅ Timelock: ${timelockAddr}\n`)
  await sleep(1000)
  
  // ═══════════════════════════════════════════════════════
  // 4. Transfer Ownership
  // ═══════════════════════════════════════════════════════
  console.log('═'.repeat(60))
  console.log('4. Transferring Ownership to Timelock...')
  console.log('═'.repeat(60))
  
  const tx = await token.transferOwnership(timelockAddr)
  await tx.wait()
  
  const newOwner = await token.owner()
  console.log(`✅ New owner: ${newOwner}`)
  console.log(`   Is timelock: ${newOwner === timelockAddr}\n`)
  
  // ═══════════════════════════════════════════════════════
  // 5. Deploy Airdrop
  // ═══════════════════════════════════════════════════════
  console.log('═'.repeat(60))
  console.log('5. Deploying Airdrop Contract...')
  console.log('═'.repeat(60))
  
  const SimpleAirdrop = await ethers.getContractFactory('SimpleAirdrop')
  const airdrop = await SimpleAirdrop.deploy(tokenAddr)
  await airdrop.waitForDeployment()
  const airdropAddr = await airdrop.getAddress()
  
  console.log(`✅ Airdrop: ${airdropAddr}\n`)
  
  // ═══════════════════════════════════════════════════════
  // Summary
  // ═══════════════════════════════════════════════════════
  console.log('═'.repeat(60))
  console.log('🎉 DEPLOYMENT COMPLETE!')
  console.log('═'.repeat(60))
  
  console.log(`\nToken: ${tokenAddr}`)
  console.log(`Timelock: ${timelockAddr}`)
  console.log(`Airdrop: ${airdropAddr}`)
  console.log(`\nTotal Minted: ${ethers.formatEther(totalMinted)} DWT`)
  console.log(`Recipients: ${success}/${allocations.length}`)
  console.log(`\n🔗 https://sepolia.basescan.org/address/${tokenAddr}\n`)
  
  // Save
  const fs = require('fs')
  const data = {
    network: network.name,
    token: tokenAddr,
    timelock: timelockAddr,
    airdrop: airdropAddr,
    totalMinted: ethers.formatEther(totalMinted),
    recipients: success,
    deployedAt: new Date().toISOString()
  }
  
  const file = `deployment-final-${Date.now()}.json`
  fs.writeFileSync(file, JSON.stringify(data, null, 2))
  console.log(`Saved: ${file}\n`)
}

main()
  .then(() => process.exit(0))
  .catch(e => {
    console.error('\n❌ Failed:', e.message)
    process.exit(1)
  })
