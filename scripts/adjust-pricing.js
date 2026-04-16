const { ethers } = require('hardhat')

async function main() {
  console.log('🎛️  NFTMembership Pricing Adjustment Tool')
  console.log('='.repeat(60))

  // Get contract address from environment
  const nftAddress = process.env.VITE_NFT_MEMBERSHIP_ADDRESS
  if (!nftAddress) {
    console.error('❌ Error: VITE_NFT_MEMBERSHIP_ADDRESS not set in .env')
    process.exit(1)
  }

  const [owner] = await ethers.getSigners()
  console.log(`\n📍 Owner: ${owner.address}`)
  console.log(`📍 Contract: ${nftAddress}`)

  // Connect to contract
  const NFTMembership = await ethers.getContractFactory('contracts/layer9/NFTMembership.sol:NFTMembership')
  const nftMembership = NFTMembership.attach(nftAddress)

  // Verify ownership
  const contractOwner = await nftMembership.owner()
  if (contractOwner.toLowerCase() !== owner.address.toLowerCase()) {
    console.error(`\n❌ Error: You are not the contract owner!`)
    console.error(`   Contract owner: ${contractOwner}`)
    console.error(`   Your address: ${owner.address}`)
    process.exit(1)
  }

  console.log('✅ Ownership verified\n')

  // Display current pricing
  console.log('='.repeat(60))
  console.log('Current Tier Configuration')
  console.log('='.repeat(60))

  const tierNames = ['Bronze 🥉', 'Silver 🥈', 'Gold 🥇', 'Platinum 💎']
  const currentConfigs = []

  for (let i = 0; i < 4; i++) {
    const config = await nftMembership.tierConfigs(i)
    currentConfigs.push(config)
    
    console.log(`\n${tierNames[i]} (Tier ${i}):`)
    console.log(`   ETH Price: ${ethers.formatEther(config.ethPrice)} ETH`)
    console.log(`   DWT Price: ${ethers.formatEther(config.dwtPrice)} DWT`)
    console.log(`   DWT Hold Required: ${ethers.formatEther(config.dwtHoldRequirement)} DWT`)
    console.log(`   Supply: ${config.currentSupply}/${config.maxSupply === 0n ? 'Unlimited' : config.maxSupply}`)
    console.log(`   Duration: ${Number(config.durationSeconds) / (24 * 3600)} days`)
    console.log(`   Soulbound: ${config.soulbound}`)
    console.log(`   Enabled: ${config.enabled}`)
  }

  // Menu
  console.log('\n' + '='.repeat(60))
  console.log('What would you like to do?')
  console.log('='.repeat(60))
  console.log('\n1. Update tier prices')
  console.log('2. Enable/disable tier')
  console.log('3. Update supply cap')
  console.log('4. Update DWT holding requirement')
  console.log('5. Set mint cooldown')
  console.log('6. Set max mints per user')
  console.log('7. View revenue stats')
  console.log('0. Exit\n')

  // For automated execution, check command line args
  const action = process.argv[2]
  
  if (!action) {
    console.log('💡 Usage examples:')
    console.log('\n# Update Bronze tier price to 0.08 ETH')
    console.log('npx hardhat run scripts/adjust-pricing.js --network baseSepolia update-price 0 0.08 100')
    console.log('\n# Disable a tier')
    console.log('npx hardhat run scripts/adjust-pricing.js --network baseSepolia disable-tier 1')
    console.log('\n# Update supply cap')
    console.log('npx hardhat run scripts/adjust-pricing.js --network baseSepolia update-supply 0 500')
    console.log('\n# Set mint cooldown to 30 minutes')
    console.log('npx hardhat run scripts/adjust-pricing.js --network baseSepolia set-cooldown 1800')
    console.log('\n# View revenue')
    console.log('npx hardhat run scripts/adjust-pricing.js --network baseSepolia revenue')
    process.exit(0)
  }

  // Execute command
  switch(action) {
    case 'update-price':
      await updatePrice(nftMembership)
      break
    case 'disable-tier':
      await toggleTier(nftMembership, false)
      break
    case 'enable-tier':
      await toggleTier(nftMembership, true)
      break
    case 'update-supply':
      await updateSupply(nftMembership)
      break
    case 'set-cooldown':
      await setCooldown(nftMembership)
      break
    case 'set-max-mints':
      await setMaxMints(nftMembership)
      break
    case 'revenue':
      await viewRevenue(nftMembership)
      break
    default:
      console.log(`❌ Unknown action: ${action}`)
      process.exit(1)
  }
}

async function updatePrice(nftMembership) {
  const tierIndex = parseInt(process.argv[3])
  const ethPrice = process.argv[4]
  const dwtPrice = process.argv[5]

  if (isNaN(tierIndex) || tierIndex < 0 || tierIndex > 3) {
    console.error('❌ Invalid tier index (0-3)')
    process.exit(1)
  }

  if (!ethPrice || !dwtPrice) {
    console.error('❌ Usage: update-price <tier> <ethPrice> <dwtPrice>')
    console.error('   Example: update-price 0 0.08 150')
    process.exit(1)
  }

  const config = await nftMembership.tierConfigs(tierIndex)
  
  console.log(`\n📝 Updating Tier ${tierIndex} pricing...`)
  console.log(`   Old ETH Price: ${ethers.formatEther(config.ethPrice)} ETH`)
  console.log(`   New ETH Price: ${ethPrice} ETH`)
  console.log(`   Old DWT Price: ${ethers.formatEther(config.dwtPrice)} DWT`)
  console.log(`   New DWT Price: ${dwtPrice} DWT`)

  const tx = await nftMembership.configureTier(
    tierIndex,
    ethers.parseEther(ethPrice),
    ethers.parseEther(dwtPrice),
    config.dwtHoldRequirement,
    config.maxSupply,
    config.durationSeconds,
    config.baseURI,
    config.soulbound,
    config.enabled
  )

  console.log(`\n⏳ Transaction sent: ${tx.hash}`)
  await tx.wait()
  console.log('✅ Tier pricing updated!')
}

async function toggleTier(nftMembership, enable) {
  const tierIndex = parseInt(process.argv[3])
  
  if (isNaN(tierIndex) || tierIndex < 0 || tierIndex > 3) {
    console.error('❌ Invalid tier index (0-3)')
    process.exit(1)
  }

  const config = await nftMembership.tierConfigs(tierIndex)
  const action = enable ? 'Enabling' : 'Disabling'
  
  console.log(`\n📝 ${action} Tier ${tierIndex}...`)

  const tx = await nftMembership.configureTier(
    tierIndex,
    config.ethPrice,
    config.dwtPrice,
    config.dwtHoldRequirement,
    config.maxSupply,
    config.durationSeconds,
    config.baseURI,
    config.soulbound,
    enable
  )

  console.log(`\n⏳ Transaction sent: ${tx.hash}`)
  await tx.wait()
  console.log(`✅ Tier ${enable ? 'enabled' : 'disabled'}!`)
}

async function updateSupply(nftMembership) {
  const tierIndex = parseInt(process.argv[3])
  const newSupply = process.argv[4]

  if (isNaN(tierIndex) || tierIndex < 0 || tierIndex > 3) {
    console.error('❌ Invalid tier index (0-3)')
    process.exit(1)
  }

  if (!newSupply) {
    console.error('❌ Usage: update-supply <tier> <newMaxSupply>')
    console.error('   Example: update-supply 0 500')
    process.exit(1)
  }

  const config = await nftMembership.tierConfigs(tierIndex)
  
  console.log(`\n📝 Updating Tier ${tierIndex} supply cap...`)
  console.log(`   Old Max Supply: ${config.maxSupply === 0n ? 'Unlimited' : config.maxSupply}`)
  console.log(`   New Max Supply: ${newSupply}`)
  console.log(`   Current Supply: ${config.currentSupply}`)

  if (BigInt(newSupply) < config.currentSupply) {
    console.error(`\n❌ Error: New supply (${newSupply}) is less than current supply (${config.currentSupply})!`)
    process.exit(1)
  }

  const tx = await nftMembership.configureTier(
    tierIndex,
    config.ethPrice,
    config.dwtPrice,
    config.dwtHoldRequirement,
    newSupply,
    config.durationSeconds,
    config.baseURI,
    config.soulbound,
    config.enabled
  )

  console.log(`\n⏳ Transaction sent: ${tx.hash}`)
  await tx.wait()
  console.log('✅ Supply cap updated!')
}

async function setCooldown(nftMembership) {
  const cooldownSeconds = parseInt(process.argv[3])

  if (isNaN(cooldownSeconds) || cooldownSeconds < 0) {
    console.error('❌ Invalid cooldown value')
    console.error('   Example: set-cooldown 1800 (30 minutes)')
    process.exit(1)
  }

  const currentCooldown = await nftMembership.mintCooldown()
  
  console.log(`\n📝 Updating mint cooldown...`)
  console.log(`   Current: ${Number(currentCooldown) / 60} minutes`)
  console.log(`   New: ${cooldownSeconds / 60} minutes`)

  const tx = await nftMembership.setMintCooldown(cooldownSeconds)
  console.log(`\n⏳ Transaction sent: ${tx.hash}`)
  await tx.wait()
  console.log('✅ Mint cooldown updated!')
}

async function setMaxMints(nftMembership) {
  const maxMints = parseInt(process.argv[3])

  if (isNaN(maxMints) || maxMints < 1) {
    console.error('❌ Invalid max mints value (must be >= 1)')
    process.exit(1)
  }

  const currentMax = await nftMembership.maxMintsPerUser()
  
  console.log(`\n📝 Updating max mints per user...`)
  console.log(`   Current: ${currentMax}`)
  console.log(`   New: ${maxMints}`)

  const tx = await nftMembership.setMaxMintsPerUser(maxMints)
  console.log(`\n⏳ Transaction sent: ${tx.hash}`)
  await tx.wait()
  console.log('✅ Max mints per user updated!')
}

async function viewRevenue(nftMembership) {
  const contractAddress = await nftMembership.getAddress()
  
  console.log('\n' + '='.repeat(60))
  console.log('Revenue Statistics')
  console.log('='.repeat(60))

  // ETH balance
  const ethBalance = await ethers.provider.getBalance(contractAddress)
  console.log(`\n💰 ETH Revenue: ${ethers.formatEther(ethBalance)} ETH`)

  // DWT balance
  const dwtAddress = await nftMembership.dwtToken()
  const ERC20_ABI = [
    'function balanceOf(address) view returns (uint256)',
    'function symbol() view returns (string)'
  ]
  const dwtContract = new ethers.Contract(dwtAddress, ERC20_ABI, ethers.provider)
  const dwtBalance = await dwtContract.balanceOf(contractAddress)
  const dwtSymbol = await dwtContract.symbol()
  
  console.log(`💰 ${dwtSymbol} Revenue: ${ethers.formatUnits(dwtBalance, 18)} ${dwtSymbol}`)

  // Tier sales
  console.log('\n📊 Tier Sales:')
  const tierNames = ['Bronze 🥉', 'Silver 🥈', 'Gold 🥇', 'Platinum 💎']
  
  let totalRevenueETH = 0n
  for (let i = 0; i < 4; i++) {
    const config = await nftMembership.tierConfigs(i)
    const revenue = config.ethPrice * config.currentSupply
    totalRevenueETH += revenue
    
    console.log(`   ${tierNames[i]}: ${config.currentSupply} sold = ${ethers.formatEther(revenue)} ETH`)
  }

  console.log(`\n💵 Total ETH Revenue (from sales): ${ethers.formatEther(totalRevenueETH)} ETH`)
  console.log(`💵 Current Contract Balance: ${ethers.formatEther(ethBalance)} ETH`)
  
  if (totalRevenueETH > ethBalance) {
    console.log(`⚠️  Warning: Some ETH may have been withdrawn already`)
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Operation failed:')
    console.error(error)
    process.exit(1)
  })
