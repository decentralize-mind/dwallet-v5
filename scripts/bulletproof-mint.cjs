const { ethers, network } = require('hardhat')
require('dotenv').config()

/**
 * BULLETPROOF TOKEN DEPLOYMENT
 * 
 * GUARANTEED SEQUENCE:
 * 1. Deploy token (deployer = owner)
 * 2. Mint ALL tokens (while deployer is STILL owner)
 * 3. ONLY THEN transfer ownership to Timelock
 */

async function main() {
  const [deployer] = await ethers.getSigners()
  const balance = await ethers.provider.getBalance(deployer.address)

  console.log('\n╔════════════════════════════════════════════════════════╗')
  console.log('║   BULLETPROOF DWT DEPLOYMENT - MINT FIRST!            ║')
  console.log('╚════════════════════════════════════════════════════════╝\n')
  console.log(`Network: ${network.name}`)
  console.log(`Deployer: ${deployer.address}`)
  console.log(`Balance: ${ethers.formatEther(balance)} ETH\n`)

  // ═══════════════════════════════════════════════════════════════════
  // PHASE 1: Deploy Token & Verify Deployer is Owner
  // ═══════════════════════════════════════════════════════════════════
  console.log('═'.repeat(60))
  console.log('PHASE 1: Deploy Token')
  console.log('═'.repeat(60))
  
  const DWTToken = await ethers.getContractFactory('DWTTokenSimple')
  console.log('\nDeploying DWTTokenSimple...')
  const token = await DWTToken.deploy(deployer.address)
  await token.waitForDeployment()
  const tokenAddr = await token.getAddress()
  
  // VERIFY ownership immediately
  const owner = await token.owner()
  console.log(`✅ Token deployed: ${tokenAddr}`)
  console.log(`✅ Owner verified: ${owner}`)
  console.log(`✅ Is deployer: ${owner === deployer.address}`)
  
  if (owner !== deployer.address) {
    throw new Error('❌ CRITICAL: Deployer is not owner immediately after deployment!')
  }

  // ═══════════════════════════════════════════════════════════════════
  // PHASE 2: Mint ALL Tokens (BEFORE ANY ownership transfer!)
  // ═══════════════════════════════════════════════════════════════════
  console.log('\n' + '═'.repeat(60))
  console.log('PHASE 2: MINT ALL TOKENS (25 Recipients)')
  console.log('═'.repeat(60))
  
  // Build allocation list
  const allocations = []
  
  const add = (addr, amtEnv, label) => {
    const addrVal = process.env[addr]
    const amtVal = process.env[amtEnv]
    if (addrVal && amtVal && ethers.isAddress(addrVal)) {
      allocations.push({ address: addrVal, amount: amtVal.replace(/,/g, '').trim(), label })
    }
  }

  // All recipients from .env
  for (let i = 1; i <= 3; i++) add(`FOUNDER_${i}_ADDRESS`, `FOUNDER_${i}_AMOUNT`, `Founder ${i}`)
  for (let i = 1; i <= 11; i++) add(`TEAM_${i}_ADDRESS`, `TEAM_${i}_AMOUNT`, `Team ${i}`)
  for (let i = 1; i <= 1; i++) add(`INVESTOR_${i}_ADDRESS`, `INVESTOR_${i}_AMOUNT`, `Investor ${i}`)
  for (let i = 1; i <= 5; i++) add(`ADVISOR_${i}_ADDRESS`, `ADVISOR_${i}_AMOUNT`, `Advisor ${i}`)
  for (let i = 1; i <= 3; i++) add(`MARKETING_${i}_ADDRESS`, `MARKETING_${i}_AMOUNT`, `Marketing ${i}`)
  add('DAO_TREASURY_ADDRESS', 'DAO_TREASURY_AMOUNT', 'DAO Treasury')
  add('COMMUNITY_REWARDS_ADDRESS', 'COMMUNITY_REWARDS_AMOUNT', 'Community Rewards')
  add('AIRDROP_ADDRESS', 'AIRDROP_AMOUNT', 'Airdrop Pool')
  add('LIQUIDITY_DEX_ADDRESS', 'LIQUIDITY_DEX_AMOUNT', 'Liquidity')

  console.log(`\nTotal recipients: ${allocations.length}\n`)

  // MINT ALL TOKENS - STOP ON FIRST FAILURE
  let totalMinted = 0n
  let mintedCount = 0

  for (let i = 0; i < allocations.length; i++) {
    const alloc = allocations[i]
    const amount = ethers.parseEther(alloc.amount)
    
    // Verify owner BEFORE each mint
    const currentOwner = await token.owner()
    if (currentOwner !== deployer.address) {
      console.error(`\n❌ CRITICAL ERROR at mint #${i + 1}!`)
      console.error(`   Owner changed to: ${currentOwner}`)
      console.error(`   Deployer lost ownership!`)
      console.error(`   Successfully minted: ${mintedCount}/${allocations.length}`)
      throw new Error('Ownership transferred before all mints completed!')
    }
    
    process.stdout.write(`[${i + 1}/${allocations.length}] Minting ${alloc.amount.padStart(10)} DWT to ${alloc.label.padEnd(25)} `)
    
    try {
      const tx = await token.mint(alloc.address, amount)
      await tx.wait()
      totalMinted += amount
      mintedCount++
      console.log('✅')
    } catch (e) {
      console.log('❌')
      console.error(`   Error: ${e.message}`)
      console.error(`\n❌ MINTING FAILED AT #${i + 1}! STOPPING.`)
      console.error(`   This should not happen - deployer is still owner.`)
      throw e
    }
  }

  console.log(`\n✅ ALL MINTS COMPLETED SUCCESSFULLY!`)
  console.log(`   Total minted: ${ethers.formatEther(totalMinted)} DWT`)
  console.log(`   Recipients: ${mintedCount}/${allocations.length}`)
  console.log(`   Remaining supply: ${ethers.formatEther(ethers.parseEther('123000000') - totalMinted)} DWT`)

  // ═══════════════════════════════════════════════════════════════════
  // PHASE 3: Transfer Ownership to Timelock (AFTER ALL MINTS!)
  // ═══════════════════════════════════════════════════════════════════
  console.log('\n' + '═'.repeat(60))
  console.log('PHASE 3: Transfer Ownership to Timelock')
  console.log('═'.repeat(60))
  
  const TIMELOCK = '0x9C0697Cd70d8325D5fb405cbE0841031ba2C14Ab'
  
  console.log(`\nTransferring ownership to: ${TIMELOCK}`)
  const tx = await token.transferOwnership(TIMELOCK)
  await tx.wait()
  
  const newOwner = await token.owner()
  console.log(`✅ New owner: ${newOwner}`)
  console.log(`✅ Is Timelock: ${newOwner === TIMELOCK}`)

  // ═══════════════════════════════════════════════════════════════════
  // SUMMARY
  // ═══════════════════════════════════════════════════════════════════
  console.log('\n╔════════════════════════════════════════════════════════╗')
  console.log('║   🎉 BULLETPROOF DEPLOYMENT COMPLETE!                 ║')
  console.log('╚════════════════════════════════════════════════════════╝\n')
  
  console.log(`Token: ${tokenAddr}`)
  console.log(`Total Minted: ${ethers.formatEther(totalMinted)} DWT`)
  console.log(`Owner: ${newOwner} (Timelock)`)
  console.log(`\n🔗 https://sepolia.basescan.org/address/${tokenAddr}\n`)
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\n❌ DEPLOYMENT FAILED:', err.message)
    console.error(err.stack)
    process.exit(1)
  })
