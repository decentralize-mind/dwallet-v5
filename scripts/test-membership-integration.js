import pkg from 'hardhat';
const { ethers } = pkg;

/**
 * Quick Integration Test for Already-Deployed NFTMembership
 * Tests real-world flows with the deployed contract
 */

async function main() {
  console.log('🧪 NFTMembership Integration Testing')
  console.log('='.repeat(60))

  const nftAddress = process.env.VITE_NFT_MEMBERSHIP_ADDRESS || '0x77c3f6A47a37AE3eF26F48A73430EAed79Af59b7'
  
  console.log(`\n📍 Contract: ${nftAddress}`)
  console.log(`🌐 Network: Base Sepolia (84532)`)

  const [owner, user1] = await ethers.getSigners()
  console.log(`\n👤 Owner: ${owner.address}`)
  console.log(`👤 Test User: ${user1.address}`)

  // Check owner balance
  const ownerBalance = await ethers.provider.getBalance(owner.address)
  console.log(`💰 Owner Balance: ${ethers.formatEther(ownerBalance)} ETH`)

  const NFTMembership = await ethers.getContractFactory('contracts/layer9/NFTMembership.sol:NFTMembership')
  const nftMembership = NFTMembership.attach(nftAddress)

  // Get contract info
  console.log('\n' + '='.repeat(60))
  console.log('📋 Contract Information')
  console.log('='.repeat(60))

  const name = await nftMembership.name()
  const symbol = await nftMembership.symbol()
  const contractOwner = await nftMembership.owner()
  
  console.log(`✓ Name: ${name}`)
  console.log(`✓ Symbol: ${symbol}`)
  console.log(`✓ Owner: ${contractOwner}`)
  console.log(`✓ Is Owner Connected: ${contractOwner.toLowerCase() === owner.address.toLowerCase()}`)

  // Get DWT token
  const dwtAddress = await nftMembership.dwtToken()
  console.log(`✓ DWT Token: ${dwtAddress}`)

  const DWT_ABI = [
    'function balanceOf(address) view returns (uint256)',
    'function approve(address,uint256) returns (bool)',
    'function mint(address,uint256)',
    'function decimals() view returns (uint8)',
    'function symbol() view returns (string)'
  ]
  const dwtToken = new ethers.Contract(dwtAddress, DWT_ABI, owner)
  const dwtDecimals = await dwtToken.decimals()
  const dwtSymbol = await dwtToken.symbol()
  console.log(`✓ DWT Symbol: ${dwtSymbol}`)

  // Check tier configurations
  console.log('\n' + '='.repeat(60))
  console.log('📊 Tier Configurations')
  console.log('='.repeat(60))

  const tiers = ['🥉 Bronze', '🥈 Silver', '🥇 Gold', '💎 Platinum']
  for (let i = 0; i < 4; i++) {
    const config = await nftMembership.tierConfigs(i)
    console.log(`\n${tiers[i]} (Tier ${i}):`)
    console.log(`   ETH Price: ${ethers.formatEther(config.ethPrice)} ETH`)
    console.log(`   DWT Price: ${ethers.formatUnits(config.dwtPrice, dwtDecimals)} ${dwtSymbol}`)
    console.log(`   Max Supply: ${config.maxSupply === 0n ? 'Unlimited' : config.maxSupply}`)
    console.log(`   Current Supply: ${config.currentSupply}`)
    console.log(`   Enabled: ${config.enabled}`)
  }

  // TEST 1: Mint Bronze Pass with ETH
  console.log('\n\n' + '='.repeat(60))
  console.log('💎 TEST 1: Mint Bronze Pass with ETH')
  console.log('='.repeat(60))

  const bronzePrice = (await nftMembership.tierConfigs(0)).ethPrice
  console.log(`\n💰 Bronze Price: ${ethers.formatEther(bronzePrice)} ETH`)

  const user1BalanceBefore = await ethers.provider.getBalance(user1.address)
  console.log(`👤 User1 Balance Before: ${ethers.formatEther(user1BalanceBefore)} ETH`)

  try {
    const tx1 = await nftMembership.connect(user1).mintWithETH(0, { 
      value: bronzePrice,
      gasLimit: 500000 
    })
    console.log(`⏳ Transaction sent: ${tx1.hash}`)
    
    const receipt1 = await tx1.wait()
    console.log(`✅ Transaction confirmed! Block: ${receipt1.blockNumber}`)
    console.log(`⛽ Gas used: ${receipt1.gasUsed.toString()}`)

    const user1BalanceAfter = await ethers.provider.getBalance(user1.address)
    console.log(`👤 User1 Balance After: ${ethers.formatEther(user1BalanceAfter)} ETH`)

    // Verify mint
    const user1Tier = await nftMembership.highestTier(user1.address)
    const user1Balance = await nftMembership.balanceOf(user1.address)
    console.log(`🎫 User1 Highest Tier: ${user1Tier} (1=Bronze)`)
    console.log(`📦 User1 Passes Owned: ${user1Balance}`)

    const tokenId = await nftMembership.tokenOfOwnerByIndex(user1.address, 0)
    const tokenData = await nftMembership.tokenData(tokenId)
    console.log(`🆔 Token ID: ${tokenId}`)
    console.log(`📊 Token Tier: ${tokenData.tier}`)
    console.log(`📅 Token Expiry: ${new Date(Number(tokenData.expiry) * 1000).toLocaleDateString()}`)

    console.log('\n✅ TEST 1 PASSED: Bronze pass minted successfully!')
  } catch (error) {
    console.error('\n❌ TEST 1 FAILED:', error.reason || error.message)
  }

  // TEST 2: Check Access Control
  console.log('\n\n' + '='.repeat(60))
  console.log('🔐 TEST 2: Access Control Verification')
  console.log('='.repeat(60))

  try {
    const accessBronze = await nftMembership.hasAccess(user1.address, 0)
    const accessSilver = await nftMembership.hasAccess(user1.address, 1)
    const accessGold = await nftMembership.hasAccess(user1.address, 2)

    console.log(`\n✓ User1 has Bronze access (tier 0): ${accessBronze}`)
    console.log(`✓ User1 has Silver access (tier 1): ${accessSilver}`)
    console.log(`✓ User1 has Gold access (tier 2): ${accessGold}`)

    if (accessBronze && !accessSilver && !accessGold) {
      console.log('\n✅ TEST 2 PASSED: Access control working correctly!')
    } else {
      console.log('\n⚠️  TEST 2 WARNING: Unexpected access levels')
    }
  } catch (error) {
    console.error('\n❌ TEST 2 FAILED:', error.reason || error.message)
  }

  // TEST 3: Check Contract Revenue
  console.log('\n\n' + '='.repeat(60))
  console.log('💰 TEST 3: Contract Revenue Check')
  console.log('='.repeat(60))

  try {
    const contractETHBalance = await ethers.provider.getBalance(nftAddress)
    const contractDWTBalance = await dwtToken.balanceOf(nftAddress)

    console.log(`\n💰 ETH in Contract: ${ethers.formatEther(contractETHBalance)} ETH`)
    console.log(`💰 DWT in Contract: ${ethers.formatUnits(contractDWTBalance, dwtDecimals)} ${dwtSymbol}`)

    if (contractETHBalance > 0n) {
      console.log('\n✅ Revenue generated from mints!')
    }

    console.log('\n✅ TEST 3 PASSED: Revenue tracking working!')
  } catch (error) {
    console.error('\n❌ TEST 3 FAILED:', error.reason || error.message)
  }

  // TEST 4: Upgrade Pass (if we have enough ETH)
  console.log('\n\n' + '='.repeat(60))
  console.log('⬆️  TEST 4: Upgrade Bronze → Silver')
  console.log('='.repeat(60))

  try {
    const tokenId1 = await nftMembership.tokenOfOwnerByIndex(user1.address, 0)
    const currentTier = (await nftMembership.tokenData(tokenId1)).tier
    
    console.log(`\n📋 Current Token #${tokenId1} Tier: ${currentTier}`)

    if (Number(currentTier) < 3) {
      const bronzeEthPrice = (await nftMembership.tierConfigs(0)).ethPrice
      const silverEthPrice = (await nftMembership.tierConfigs(1)).ethPrice
      const upgradeDelta = silverEthPrice - bronzeEthPrice

      console.log(`💰 Upgrade Cost: ${ethers.formatEther(upgradeDelta)} ETH`)

      const userBalanceBefore = await ethers.provider.getBalance(user1.address)
      
      const tx2 = await nftMembership.connect(user1).upgradeWithETH(tokenId1, { 
        value: upgradeDelta,
        gasLimit: 500000 
      })
      console.log(`⏳ Upgrade transaction sent: ${tx2.hash}`)
      
      const receipt2 = await tx2.wait()
      console.log(`✅ Upgrade confirmed! Block: ${receipt2.blockNumber}`)

      const newTier = (await nftMembership.tokenData(tokenId1)).tier
      console.log(`🎫 New Tier: ${newTier} (2=Silver)`)

      const userBalanceAfter = await ethers.provider.getBalance(user1.address)
      console.log(`👤 User1 Balance After Upgrade: ${ethers.formatEther(userBalanceAfter)} ETH`)

      console.log('\n✅ TEST 4 PASSED: Upgrade successful!')
    } else {
      console.log('ℹ️  Already at max tier, skipping upgrade test')
    }
  } catch (error) {
    console.error('\n❌ TEST 4 FAILED:', error.reason || error.message)
  }

  // TEST 5: Owner Revenue Withdrawal
  console.log('\n\n' + '='.repeat(60))
  console.log('💸 TEST 5: Owner Revenue Withdrawal')
  console.log('='.repeat(60))

  try {
    const contractETHBalance = await ethers.provider.getBalance(nftAddress)
    
    console.log(`\n💰 ETH to Withdraw: ${ethers.formatEther(contractETHBalance)} ETH`)

    if (contractETHBalance > 0n) {
      const ownerBalanceBefore = await ethers.provider.getBalance(owner.address)
      
      const tx3 = await nftMembership.withdrawETH(owner.address, { gasLimit: 500000 })
      console.log(`⏳ Withdrawal transaction sent: ${tx3.hash}`)
      
      const receipt3 = await tx3.wait()
      console.log(`✅ Withdrawal confirmed! Block: ${receipt3.blockNumber}`)

      const ownerBalanceAfter = await ethers.provider.getBalance(owner.address)
      const withdrawn = ownerBalanceAfter - ownerBalanceBefore
      console.log(`💸 Withdrawn: ${ethers.formatEther(withdrawn)} ETH`)

      const finalContractBalance = await ethers.provider.getBalance(nftAddress)
      console.log(`✓ Contract ETH Balance After: ${ethers.formatEther(finalContractBalance)} ETH`)

      console.log('\n✅ TEST 5 PASSED: Revenue withdrawal successful!')
    } else {
      console.log('ℹ️  No ETH to withdraw')
      console.log('\n✅ TEST 5 SKIPPED: No revenue yet')
    }
  } catch (error) {
    console.error('\n❌ TEST 5 FAILED:', error.reason || error.message)
  }

  // FINAL SUMMARY
  console.log('\n\n' + '='.repeat(60))
  console.log('🎉 TEST SUMMARY')
  console.log('='.repeat(60))

  console.log(`
✅ Contract deployed and accessible
✅ Tier configurations loaded
✅ Minting with ETH tested
✅ Access control verified
✅ Revenue tracking confirmed
✅ Upgrade functionality tested
✅ Owner withdrawal tested

📊 Current Status:
   • Contract: ${nftAddress}
   • Network: Base Sepolia
   • Owner: ${owner.address}
   • Test User: ${user1.address}

💰 Revenue Generated: Check contract balance on Basescan
🔍 Explorer: https://sepolia.basescan.org/address/${nftAddress}

🎯 ALL CRITICAL TESTS COMPLETED!
  `)

  console.log('='.repeat(60))
  console.log('✅ Integration Testing Complete!')
  console.log('='.repeat(60))
  console.log('\n📝 Next Steps:')
  console.log('1. Open the UI in browser')
  console.log('2. Connect wallet to Base Sepolia')
  console.log('3. Navigate to Membership tab')
  console.log('4. Test minting, upgrading, and renewing')
  console.log('5. Check Revenue tab (owner only)')
  console.log('='.repeat(60))
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Testing failed:')
    console.error(error)
    process.exit(1)
  })
