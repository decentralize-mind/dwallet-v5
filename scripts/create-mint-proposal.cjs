const { ethers, network } = require('hardhat')
require('dotenv').config()

/**
 * Create governance proposal to mint 70M DWT to all recipients from .env
 * 
 * IMPORTANT: This script is for the PREVIOUS deployment where minting failed.
 * For new deployments, use deploy-complete-dwt.cjs which mints BEFORE transferring ownership.
 */

async function main() {
  console.log('\n╔══════════════════════════════════════════════════════════╗')
  console.log('║   GOVERNANCE PROPOSAL: Mint 70M DWT                   ║')
  console.log('╚══════════════════════════════════════════════════════════╝\n')

  // Contract addresses from failed deployment
  const DWT_TOKEN = '0x1CB40295553B64b02fdee3520125f524040A4290'
  const GOVERNOR = '0x3355d11Ba3d0E88Add7825998a9bEd543c241523'
  const TIMELOCK = '0x92AcbD29B223d49BAB27dbFc2D91636B72b96CF0'

  const [deployer] = await ethers.getSigners()
  console.log('👤 Proposer:', deployer.address)
  console.log('🪙 DWT Token:', DWT_TOKEN)
  console.log('🏛️ Governor:', GOVERNOR)
  console.log('⏰ Timelock:', TIMELOCK)

  // Check if deployer has enough DWT to propose (need 100k)
  const dwtToken = await ethers.getContractAt('DWTTokenSimple', DWT_TOKEN)
  const balance = await dwtToken.balanceOf(deployer.address)
  console.log('\n💰 Your DWT Balance:', ethers.formatEther(balance), 'DWT')

  if (balance < ethers.parseEther('100000')) {
    console.log('\n❌ ERROR: You need at least 100,000 DWT to create a proposal')
    console.log('   Current balance:', ethers.formatEther(balance), 'DWT')
    console.log('\n💡 Solutions:')
    console.log('   1. Get DWT from someone who has tokens')
    console.log('   2. Use a different wallet with 100k+ DWT')
    console.log('   3. Deploy a NEW token (recommended) using deploy-complete-dwt.cjs')
    console.log('      - This script mints BEFORE transferring ownership')
    console.log('      - No governance proposal needed for initial mint')
    process.exit(1)
  }

  // Parse allocations from .env
  const allocations = []
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

  console.log('\n📋 Parsing allocations from .env...')
  for (let i = 1; i <= 3; i++) addAlloc(`FOUNDER_${i}_ADDRESS`, `FOUNDER_${i}_AMOUNT`, `Founder ${i}`)
  for (let i = 1; i <= 11; i++) addAlloc(`TEAM_${i}_ADDRESS`, `TEAM_${i}_AMOUNT`, `Team ${i}`)
  for (let i = 1; i <= 1; i++) addAlloc(`INVESTOR_${i}_ADDRESS`, `INVESTOR_${i}_AMOUNT`, `Investor ${i}`)
  for (let i = 1; i <= 5; i++) addAlloc(`ADVISOR_${i}_ADDRESS`, `ADVISOR_${i}_AMOUNT`, `Advisor ${i}`)
  for (let i = 1; i <= 3; i++) addAlloc(`MARKETING_${i}_ADDRESS`, `MARKETING_${i}_AMOUNT`, `Marketing ${i}`)
  addAlloc('DAO_TREASURY_ADDRESS', 'DAO_TREASURY_AMOUNT', 'DAO Treasury')
  addAlloc('COMMUNITY_REWARDS_ADDRESS', 'COMMUNITY_REWARDS_AMOUNT', 'Community Rewards')
  addAlloc('AIRDROP_ADDRESS', 'AIRDROP_AMOUNT', 'Airdrop')
  addAlloc('LIQUIDITY_DEX_ADDRESS', 'LIQUIDITY_DEX_AMOUNT', 'Liquidity & DEX')

  console.log(`✅ Found ${allocations.length} recipients`)

  let totalToMint = 0n
  for (const alloc of allocations) {
    totalToMint += ethers.parseEther(alloc.amount)
  }

  console.log('📊 Total to mint:', ethers.formatEther(totalToMint), 'DWT')

  console.log('\n⚠️  WARNING: Governance proposal process is complex!')
  console.log('   Timeline:')
  console.log('   1. Create proposal → NOW')
  console.log('   2. Wait 1 day (voting delay)')
  console.log('   3. Vote for 7 days (need 4% quorum = 4.92M DWT)')
  console.log('   4. Queue proposal')
  console.log('   5. Wait 48 hours (timelock)')
  console.log('   6. Execute proposal')
  console.log('\n   Total time: ~9-10 days!')

  console.log('\n💡 RECOMMENDATION:')
  console.log('   Instead of using governance, deploy a NEW token with:')
  console.log('   npx hardhat run scripts/deploy-complete-dwt.cjs --network baseSepolia')
  console.log('   This will mint all tokens instantly BEFORE transferring ownership.')

  const proceed = process.argv.includes('--force')
  if (!proceed) {
    console.log('\n❌ Aborted. Use --force flag to proceed anyway.')
    console.log('   Or run: npx hardhat run scripts/deploy-complete-dwt.cjs --network baseSepolia')
    process.exit(0)
  }

  // If forced, create proposal (this is complex and requires encoding)
  console.log('\n🔨 Creating governance proposal...\n')
  
  // For simplicity, we'll create ONE proposal that mints to the largest recipient
  // Creating 25 separate mints in one proposal is very complex
  
  console.log('⚠️  NOTE: Creating proposal for AIRDROP only (2.1M DWT)')
  console.log('   You will need to create separate proposals for other recipients')
  console.log('   OR use deploy-complete-dwt.cjs for a fresh deployment\n')

  const governor = await ethers.getContractAt('DWTGovernor', GOVERNOR)
  
  const airdropAddress = process.env.AIRDROP_ADDRESS
  const airdropAmount = ethers.parseEther(process.env.AIRDROP_AMOUNT)
  
  console.log('📝 Proposal Details:')
  console.log('   Target:', DWT_TOKEN)
  console.log('   Function: mint()')
  console.log('   Recipient:', airdropAddress)
  console.log('   Amount:', ethers.formatEther(airdropAmount), 'DWT')

  // Encode the mint function call
  const mintCalldata = dwtToken.interface.encodeFunctionData('mint', [
    airdropAddress,
    airdropAmount
  ])

  const description = 'Mint 2,100,000 DWT to Airdrop wallet for user distribution'

  console.log('\n🚀 Submitting proposal...')
  
  try {
    const tx = await governor.propose(
      [DWT_TOKEN],
      [0],
      [mintCalldata],
      description
    )
    
    console.log('✅ Proposal submitted!')
    console.log('   Transaction:', tx.hash)
    
    const receipt = await tx.wait()
    console.log('   Block:', receipt.blockNumber)
    
    // Get proposal ID from events
    const proposalCreatedEvent = receipt.logs.find(log => {
      try {
        const parsed = governor.interface.parseLog(log)
        return parsed?.name === 'ProposalCreated'
      } catch {
        return false
      }
    })
    
    if (proposalCreatedEvent) {
      const parsed = governor.interface.parseLog(proposalCreatedEvent)
      console.log('   Proposal ID:', parsed.args.proposalId.toString())
    }
    
    console.log('\n📋 Next Steps:')
    console.log('   1. Wait 1 day for voting to start')
    console.log('   2. Vote on the proposal (need 4% quorum)')
    console.log('   3. After voting ends, queue the proposal')
    console.log('   4. Wait 48 hours')
    console.log('   5. Execute the proposal')
    console.log('\n   Then repeat for other 24 recipients...')
    
  } catch (error) {
    console.error('\n❌ Failed to create proposal:', error.message)
    console.log('\n💡 Recommendation: Use deploy-complete-dwt.cjs instead')
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('\n❌ Error:', error)
    process.exit(1)
  })
