const { ethers, network } = require('hardhat')
require('dotenv').config()

async function main() {
  const [deployer] = await ethers.getSigners()
  let currentNonce = await deployer.getNonce('pending')

  console.log('\n🚀 Starting Robust Genesis Mint...')
  console.log('Account:', deployer.address)
  console.log('Starting Nonce:', currentNonce)

  const TokenAddr =
    process.env.BASE_DWT_TOKEN ||
    process.env.DWT_TOKEN_ADDRESS ||
    process.env.DWT_TOKEN
  if (!TokenAddr) throw new Error('❌ Missing DWT_TOKEN in .env')

  const dwtToken = await ethers.getContractAt('DWTToken', TokenAddr)
  const owner = await dwtToken.owner()

  if (owner.toLowerCase() !== deployer.address.toLowerCase()) {
    console.error(
      '❌ ERROR: Deployer is NOT the owner. Ownership likely transferred to Timelock.',
    )
    process.exit(1)
  }

  const allocations = []
  const addAlloc = (addressKey, amountKey, label) => {
    const addr = process.env[addressKey]
    const amt = process.env[amountKey]
    if (addr && amt) {
      allocations.push({ address: addr, amount: amt, label })
    }
  }

  // Founders, Team, Investors, Marketing, Advisors
  for (let i = 1; i <= 3; i++)
    addAlloc(`FOUNDER_${i}_ADDRESS`, `FOUNDER_${i}_AMOUNT`, 'Founder')
  for (let i = 1; i <= 11; i++)
    addAlloc(`TEAM_${i}_ADDRESS`, `TEAM_${i}_AMOUNT`, 'Team Member')
  for (let i = 1; i <= 1; i++)
    addAlloc(`INVESTOR_${i}_ADDRESS`, `INVESTOR_${i}_AMOUNT`, 'Investor')
  for (let i = 1; i <= 2; i++)
    addAlloc(`MARKETING_${i}_ADDRESS`, `MARKETING_${i}_AMOUNT`, 'Marketing')
  for (let i = 1; i <= 5; i++)
    addAlloc(`ADVISOR_${i}_ADDRESS`, `ADVISOR_${i}_AMOUNT`, 'Advisor')

  // Static totals
  if (process.env.DAO_TREASURY_ADDRESS)
    allocations.push({
      address: process.env.DAO_TREASURY_ADDRESS,
      amount: '14000000',
      label: 'DAO Treasury',
    })
  if (process.env.COMMUNITY_REWARDS_ADDRESS)
    allocations.push({
      address: process.env.COMMUNITY_REWARDS_ADDRESS,
      amount: '10500000',
      label: 'Community Rewards',
    })
  if (process.env.AIRDROP_ADDRESS)
    allocations.push({
      address: process.env.AIRDROP_ADDRESS,
      amount: '5600000',
      label: 'Airdrop',
    })
  if (process.env.LIQUIDITY_DEX_ADDRESS)
    allocations.push({
      address: process.env.LIQUIDITY_DEX_ADDRESS,
      amount: '12600000',
      label: 'Liquidity & DEX',
    })

  console.log(`\n💎 Processing ${allocations.length} targets...`)

  for (const alloc of allocations) {
    const amountWei = ethers.parseEther(
      alloc.amount.toString().replace(/,/g, ''),
    )
    const bal = await dwtToken.balanceOf(alloc.address)

    // Skip if already has balance (prevents double minting on retry)
    if (bal >= amountWei) {
      console.log(
        `✅ Skipping ${alloc.label} (${alloc.address}) - Already funded.`,
      )
      continue
    }

    console.log(
      `Minting ${alloc.amount.padStart(10)} DWT to ${alloc.address} (${alloc.label}) [Nonce: ${currentNonce}]`,
    )
    try {
      const tx = await dwtToken.mint(alloc.address, amountWei, {
        nonce: currentNonce++,
      })
      await tx.wait()
      console.log(`   ✅ Success: ${tx.hash}`)
    } catch (e) {
      console.log(`   ❌ FAILED: ${e.message}`)
      // If nonce error, resync and try again once
      if (e.message.includes('nonce too low')) {
        currentNonce = await deployer.getNonce('pending')
        console.log(`   ♻️ Retrying with synced nonce: ${currentNonce}...`)
        const retryTx = await dwtToken.mint(alloc.address, amountWei, {
          nonce: currentNonce++,
        })
        await retryTx.wait()
        console.log(`   ✅ Success (Retry): ${retryTx.hash}`)
      }
    }
  }

  console.log('\n✅ Robust Genesis Minting Sequence Complete.')
}

main().catch(console.error)
