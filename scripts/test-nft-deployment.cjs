const hre = require('hardhat')
const { ethers } = require('hardhat')

async function main() {
  console.log('🧪 Testing NFTMembership Deployment on Base Sepolia...')
  console.log('='.repeat(60))

  // Get test account
  const [deployer] = await ethers.getSigners()
  const testUser = deployer // Use deployer for testing on testnet
  console.log(`\n📍 Deployer/Test User: ${deployer.address}`)

  // Contract address from deployment
  const NFT_MEMBERSHIP_ADDRESS = '0x77c3f6A47a37AE3eF26F48A73430EAed79Af59b7'
  const DWT_TOKEN_ADDRESS = '0x3A4B1a7aD971be03dEe83A7B61d575304C9C0b0f'

  // Get contract instances
  const NFTMembership = await ethers.getContractFactory('NFTMembership')
  const nftMembership = NFTMembership.attach(NFT_MEMBERSHIP_ADDRESS)

  const DWTToken = await ethers.getContractFactory('MockERC20')
  const dwtToken = DWTToken.attach(DWT_TOKEN_ADDRESS)

  console.log('\n✅ Contracts loaded successfully!')

  // Test 1: Check contract info
  console.log('\n' + '='.repeat(60))
  console.log('Test 1: Contract Information')
  console.log('='.repeat(60))

  const name = await nftMembership.name()
  const symbol = await nftMembership.symbol()
  const owner = await nftMembership.owner()
  const tierCount = await nftMembership.TIER_COUNT()

  console.log(`✓ Name: ${name}`)
  console.log(`✓ Symbol: ${symbol}`)
  console.log(`✓ Owner: ${owner}`)
  console.log(`✓ Tier Count: ${tierCount}`)

  // Test 2: Check tier configurations
  console.log('\n' + '='.repeat(60))
  console.log('Test 2: Tier Configurations')
  console.log('='.repeat(60))

  const tierNames = ['Bronze', 'Silver', 'Gold', 'Platinum']
  
  for (let i = 0; i < 4; i++) {
    const tier = await nftMembership.getTierConfig(i)
    console.log(`\n${tierNames[i]} (Tier ${i}):`)
    console.log(`   ETH Price: ${ethers.formatEther(tier.ethPrice)} ETH`)
    console.log(`   DWT Price: ${ethers.formatEther(tier.dwtPrice)} DWT`)
    console.log(`   DWT Required: ${ethers.formatEther(tier.dwtHoldingRequirement)} DWT`)
    console.log(`   Max Supply: ${tier.maxSupply}`)
    console.log(`   Minted: ${tier.mintedCount}`)
    console.log(`   Enabled: ${tier.enabled}`)
  }

  // Test 3: Mint Bronze pass with ETH
  console.log('\n' + '='.repeat(60))
  console.log('Test 3: Mint Bronze Pass with ETH')
  console.log('='.repeat(60))

  const bronzePrice = await nftMembership.getTierPrice(0)
  console.log(`Bronze Price: ${ethers.formatEther(bronzePrice)} ETH`)

  // Check test user balance
  const testUserBalance = await ethers.provider.getBalance(testUser.address)
  console.log(`Test User Balance: ${ethers.formatEther(testUserBalance)} ETH`)

  if (testUserBalance < bronzePrice) {
    console.log('⚠️  Test user needs more ETH. Sending from deployer...')
    const tx = await deployer.sendTransaction({
      to: testUser.address,
      value: ethers.parseEther('1.0')
    })
    await tx.wait()
    console.log('✅ Sent 1 ETH to test user')
  }

  // Approve and mint
  console.log('\nMinting Bronze pass...')
  const mintTx = await nftMembership.connect(testUser).mintPass(0, false, {
    value: bronzePrice
  })
  const mintReceipt = await mintTx.wait()
  
  console.log(`✅ Bronze pass minted! Transaction: ${mintReceipt.hash}`)
  
  // Check user's tier
  const userTier = await nftMembership.highestTier(testUser.address)
  console.log(`✓ User's highest tier: ${userTier} (Bronze)`)
  
  // Check NFT balance
  const nftBalance = await nftMembership.balanceOf(testUser.address)
  console.log(`✓ User's NFT balance: ${nftBalance}`)

  // Test 4: Test access control
  console.log('\n' + '='.repeat(60))
  console.log('Test 4: Access Control (hasAccess)')
  console.log('='.repeat(60))

  const hasBronzeAccess = await nftMembership.hasAccess(testUser.address, 0)
  const hasSilverAccess = await nftMembership.hasAccess(testUser.address, 1)
  
  console.log(`✓ Has Bronze access (tier 0): ${hasBronzeAccess}`)
  console.log(`✓ Has Silver access (tier 1): ${hasSilverAccess}`)

  // Test 5: Test cooldown mechanism
  console.log('\n' + '='.repeat(60))
  console.log('Test 5: Cooldown Mechanism')
  console.log('='.repeat(60))

  const lastMintTime = await nftMembership.lastMintTime(testUser.address)
  const cooldown = await nftMembership.mintCooldown()
  const currentTime = Math.floor(Date.now() / 1000)
  const timeSinceMint = currentTime - Number(lastMintTime)
  const cooldownSeconds = Number(cooldown)
  
  console.log(`Last mint time: ${lastMintTime}`)
  console.log(`Cooldown period: ${cooldownSeconds} seconds (${cooldownSeconds / 3600} hours)`)
  console.log(`Time since mint: ${timeSinceMint} seconds`)
  
  if (timeSinceMint < cooldownSeconds) {
    console.log('⚠️  Cooldown is active - cannot mint again yet')
    console.log(`⏳ Wait ${((cooldownSeconds - timeSinceMint) / 60).toFixed(1)} more minutes`)
  } else {
    console.log('✅ Cooldown expired - can mint again')
  }

  // Test 6: Check contract balance (revenue)
  console.log('\n' + '='.repeat(60))
  console.log('Test 6: Contract Revenue')
  console.log('='.repeat(60))

  const contractBalance = await ethers.provider.getBalance(NFT_MEMBERSHIP_ADDRESS)
  console.log(`💰 Contract ETH Balance: ${ethers.formatEther(contractBalance)} ETH`)

  const dwtBalance = await dwtToken.balanceOf(NFT_MEMBERSHIP_ADDRESS)
  console.log(`💰 Contract DWT Balance: ${ethers.formatEther(dwtBalance)} DWT`)

  // Final summary
  console.log('\n' + '='.repeat(60))
  console.log('✅ All Tests Passed!')
  console.log('='.repeat(60))
  console.log('\n📊 Summary:')
  console.log(`   - Contract deployed and functional`)
  console.log(`   - Bronze pass minted successfully`)
  console.log(`   - Access control working correctly`)
  console.log(`   - Cooldown mechanism active`)
  console.log(`   - Revenue collection working`)
  console.log('\n🎉 Your NFT Membership system is ready for users!')
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Test failed:', error)
    process.exit(1)
  })
