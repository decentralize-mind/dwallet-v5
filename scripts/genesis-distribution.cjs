const { ethers, network } = require('hardhat')
require('dotenv').config()

async function main() {
  const [deployer] = await ethers.getSigners()
  console.log('\n🚀 Generating Genesis Distribution Proposal...')
  console.log('Network:', network.name)
  console.log('Account:', deployer.address)

  const GovernorAddr = process.env.BASE_GOVERNOR || process.env.GOVERNOR
  const TokenAddr =
    process.env.BASE_DWT_TOKEN ||
    process.env.DWT_TOKEN_ADDRESS ||
    process.env.DWT_TOKEN

  if (!GovernorAddr || !TokenAddr) {
    throw new Error('❌ Missing GOVERNOR or DWT_TOKEN in .env')
  }

  const governor = await ethers.getContractAt('DWTGovernor', GovernorAddr)
  const dwtToken = await ethers.getContractAt('DWTToken', TokenAddr)

  // ─── 1. Map Allocations from .env ────────────────────────────────────────
  const allocations = []

  // Helper to add from env
  const addAlloc = (addressKey, amountKey, label) => {
    const addr = process.env[addressKey]
    const amt = process.env[amountKey]
    if (addr && amt) {
      allocations.push({
        address: addr,
        amount: amt,
        label: `${label} (${addressKey})`,
      })
    } else if (addr && !amt) {
      // Handle cases like DAO Treasury which might have a total but no per-entry amount var
      // If DAO_TREASURY_ADDRESS exists but DAO_TREASURY_AMOUNT doesn't, we check if there's a comment-based total
      let fallbackAmt = '0'
      if (addressKey === 'DAO_TREASURY_ADDRESS') fallbackAmt = '14000000'
      if (addressKey === 'COMMUNITY_REWARDS_ADDRESS') fallbackAmt = '10500000'
      if (addressKey === 'AIRDROP_ADDRESS') fallbackAmt = '5600000'
      if (fallbackAmt !== '0') {
        allocations.push({
          address: addr,
          amount: fallbackAmt,
          label: `${label} (Manual Total)`,
        })
      }
    }
  }

  // Founders (1-3)
  for (let i = 1; i <= 3; i++)
    addAlloc(`FOUNDER_${i}_ADDRESS`, `FOUNDER_${i}_AMOUNT`, 'Founder')

  // Team (1-11)
  for (let i = 1; i <= 11; i++)
    addAlloc(`TEAM_${i}_ADDRESS`, `TEAM_${i}_AMOUNT`, 'Team Member')

  // Investors (1)
  for (let i = 1; i <= 1; i++)
    addAlloc(`INVESTOR_${i}_ADDRESS`, `INVESTOR_${i}_AMOUNT`, 'Investor')

  // Marketing (1-2)
  for (let i = 1; i <= 2; i++)
    addAlloc(`MARKETING_${i}_ADDRESS`, `MARKETING_${i}_AMOUNT`, 'Marketing')

  // Advisors (1-5)
  for (let i = 1; i <= 5; i++)
    addAlloc(`ADVISOR_${i}_ADDRESS`, `ADVISOR_${i}_AMOUNT`, 'Advisor')

  // Singular entries
  addAlloc('DAO_TREASURY_ADDRESS', 'DAO_TREASURY_AMOUNT', 'DAO Treasury')
  addAlloc(
    'COMMUNITY_REWARDS_ADDRESS',
    'COMMUNITY_REWARDS_AMOUNT',
    'Community Rewards',
  )
  addAlloc('AIRDROP_ADDRESS', 'AIRDROP_AMOUNT', 'Airdrop')
  addAlloc('LIQUIDITY_DEX_ADDRESS', 'LIQUIDITY_DEX_AMOUNT', 'Liquidity & DEX')

  console.log(`\n📋 Prepared ${allocations.length} distribution targets:`)
  let totalMint = 0n
  const targets = []
  const values = []
  const calldatas = []

  for (const alloc of allocations) {
    const amountWei = ethers.parseEther(
      alloc.amount.toString().replace(/,/g, ''),
    )
    totalMint += amountWei

    targets.push(TokenAddr)
    values.push(0n)

    // Encode dwtToken.mint(address, amount)
    const calldata = dwtToken.interface.encodeFunctionData('mint', [
      alloc.address,
      amountWei,
    ])
    calldatas.push(calldata)

    console.log(
      `  - ${alloc.label.padEnd(25)}: ${alloc.amount.toString().padStart(10)} DWT → ${alloc.address}`,
    )
  }

  console.log('\n----------------------------------------------------')
  console.log(`💎 Total to Mint: ${ethers.formatEther(totalMint)} DWT`)
  console.log('----------------------------------------------------\n')

  const description = `Genesis Token Distribution: Minting ${ethers.formatEther(totalMint)} DWT to Founders, Team, Investors, and Treasury.`

  // ─── 2. Submit Proposal ──────────────────────────────────────────────────
  console.log('📡 Submitting proposal to Governor...')
  try {
    const tx = await governor.propose(targets, values, calldatas, description)
    const receipt = await tx.wait()

    // Extract proposalId from event
    // In OpenZeppelin Governor, the event is ProposalCreated(proposalId, caller, ...)
    const proposalId = receipt.logs[0].args[0]

    console.log('\n✅ Proposal Submitted Successfully!')
    console.log('Proposal ID:', proposalId.toString())
    console.log('Description:', description)
    console.log('\n⚠️ NEXT STEPS:')
    console.log('1. Wait for Voting Delay (usually 1 block or 1 day)')
    console.log('2. Vote on the proposal: governor.castVote(proposalId, 1)')
    console.log('3. Wait for Voting Period to end')
    console.log('4. Queue the proposal in Timelock')
    console.log('5. Execute (after 48h Timelock Delay)')
  } catch (e) {
    console.error('\n❌ FAILED TO SUBMIT PROPOSAL:')
    console.error(e.message)
    console.log(
      '\n💡 Possible reason: You might need to delegate your DWT votes to yourself first.',
    )
  }
}

main().catch(console.error)
