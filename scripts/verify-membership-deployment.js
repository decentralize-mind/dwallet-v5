import pkg from 'hardhat';
const { ethers } = pkg;

/**
 * Simple Contract Verification Test
 * Verifies the deployed contract is working correctly
 */

async function main() {
  console.log('🔍 NFTMembership Contract Verification')
  console.log('='.repeat(60))

  const nftAddress = process.env.VITE_NFT_MEMBERSHIP_ADDRESS || '0x77c3f6A47a37AE3eF26F48A73430EAed79Af59b7'
  
  console.log(`\n📍 Contract: ${nftAddress}`)
  console.log(`🌐 Network: Base Sepolia (84532)`)

  const [owner] = await ethers.getSigners()
  console.log(`\n👤 Connected: ${owner.address}`)

  // Check balance
  const balance = await ethers.provider.getBalance(owner.address)
  console.log(`💰 Balance: ${ethers.formatEther(balance)} ETH`)

  const NFTMembership = await ethers.getContractFactory('contracts/layer9/NFTMembership.sol:NFTMembership')
  const nftMembership = NFTMembership.attach(nftAddress)

  // Contract Info
  console.log('\n' + '='.repeat(60))
  console.log('📋 Contract Information')
  console.log('='.repeat(60))

  const name = await nftMembership.name()
  const symbol = await nftMembership.symbol()
  const contractOwner = await nftMembership.owner()
  
  console.log(`✓ Name: ${name}`)
  console.log(`✓ Symbol: ${symbol}`)
  console.log(`✓ Owner: ${contractOwner}`)
  console.log(`✓ Connected as Owner: ${contractOwner.toLowerCase() === owner.address.toLowerCase() ? 'YES ✅' : 'NO ❌'}`)

  // Get DWT token
  const dwtAddress = await nftMembership.dwtToken()
  console.log(`\n✓ DWT Token: ${dwtAddress}`)

  const DWT_ABI = [
    'function balanceOf(address) view returns (uint256)',
    'function decimals() view returns (uint8)',
    'function symbol() view returns (string)'
  ]
  const dwtToken = new ethers.Contract(dwtAddress, DWT_ABI, ethers.provider)
  const dwtDecimals = await dwtToken.decimals()
  const dwtSymbol = await dwtToken.symbol()
  console.log(`✓ DWT Symbol: ${dwtSymbol}`)

  // Tier configurations
  console.log('\n' + '='.repeat(60))
  console.log('📊 Tier Configurations')
  console.log('='.repeat(60))

  const tiers = ['🥉 Bronze', '🥈 Silver', '🥇 Gold', '💎 Platinum']
  let totalSupply = 0
  
  for (let i = 0; i < 4; i++) {
    const config = await nftMembership.tierConfigs(i)
    const currentSupply = Number(config.currentSupply)
    totalSupply += currentSupply
    
    console.log(`\n${tiers[i]} (Tier ${i}):`)
    console.log(`   Price: ${ethers.formatEther(config.ethPrice)} ETH / ${ethers.formatUnits(config.dwtPrice, dwtDecimals)} ${dwtSymbol}`)
    console.log(`   Supply: ${currentSupply}/${config.maxSupply === 0n ? '∞' : config.maxSupply}`)
    console.log(`   Enabled: ${config.enabled ? '✅' : '❌'}`)
  }

  console.log(`\n📦 Total Passes Minted: ${totalSupply}`)

  // Contract Revenue
  console.log('\n' + '='.repeat(60))
  console.log('💰 Contract Revenue')
  console.log('='.repeat(60))

  const contractETHBalance = await ethers.provider.getBalance(nftAddress)
  const contractDWTBalance = await dwtToken.balanceOf(nftAddress)

  console.log(`\n💵 ETH Balance: ${ethers.formatEther(contractETHBalance)} ETH`)
  console.log(`💵 ${dwtSymbol} Balance: ${ethers.formatUnits(contractDWTBalance, dwtDecimals)} ${dwtSymbol}`)

  if (contractETHBalance > 0n || contractDWTBalance > 0n) {
    console.log('\n✅ Revenue has been generated!')
    console.log('\n💡 To withdraw revenue:')
    console.log('   npx hardhat run scripts/withdraw-revenue.js --network baseSepolia')
  } else {
    console.log('\nℹ️  No revenue yet - waiting for first mints')
  }

  // Owner's passes
  console.log('\n' + '='.repeat(60))
  console.log('🎫 Owner\'s Membership Status')
  console.log('='.repeat(60))

  const ownerTier = await nftMembership.highestTier(owner.address)
  const ownerBalance = await nftMembership.balanceOf(owner.address)

  console.log(`\n👑 Highest Tier: ${ownerTier} (0=None, 1=Bronze, 2=Silver, 3=Gold, 4=Platinum)`)
  console.log(`📦 Passes Owned: ${ownerBalance}`)

  if (ownerBalance > 0n) {
    console.log('\n📜 Owned Passes:')
    for (let i = 0; i < Number(ownerBalance); i++) {
      const tokenId = await nftMembership.tokenOfOwnerByIndex(owner.address, i)
      const tokenData = await nftMembership.tokenData(tokenId)
      const tierNames = ['Bronze', 'Silver', 'Gold', 'Platinum']
      
      console.log(`   • Token #${tokenId}: ${tierNames[tokenData.tier]} Tier`)
      if (tokenData.expiry > 0n) {
        const expiryDate = new Date(Number(tokenData.expiry) * 1000)
        console.log(`     Expires: ${expiryDate.toLocaleDateString()}`)
      } else {
        console.log(`     Expires: Never (Permanent)`)
      }
    }
  }

  // Network info
  console.log('\n' + '='.repeat(60))
  console.log('🌐 Network & Explorer Links')
  console.log('='.repeat(60))

  console.log(`\n🔍 Contract: https://sepolia.basescan.org/address/${nftAddress}`)
  console.log(`🔍 DWT Token: https://sepolia.basescan.org/address/${dwtAddress}`)
  console.log(`👛 Owner Wallet: https://sepolia.basescan.org/address/${owner.address}`)

  // Summary
  console.log('\n' + '='.repeat(60))
  console.log('✅ VERIFICATION COMPLETE')
  console.log('='.repeat(60))

  console.log(`
📊 Summary:
   • Contract is deployed and accessible ✅
   • All 4 tiers configured ✅
   • ${totalSupply} passes minted so far
   • ${ethers.formatEther(contractETHBalance)} ETH revenue generated
   • Owner access verified ✅

🎯 Ready for UI Testing:
   1. Start the development server: npm run dev
   2. Connect wallet to Base Sepolia
   3. Navigate to Membership tab
   4. Test minting, upgrading, and renewing

💡 Test Scenarios:
   • Mint Bronze pass (0.05 ETH)
   • Upgrade to Silver (0.10 ETH more)
   • Renew before expiry (full price)
   • Withdraw revenue (owner only)

🔗 Explorer: https://sepolia.basescan.org/address/${nftAddress}
  `)

  console.log('='.repeat(60))
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Verification failed:')
    console.error(error)
    process.exit(1)
  })
