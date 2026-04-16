const { ethers } = require('hardhat')

async function main() {
  console.log('💰 Withdrawing NFTMembership Revenue...')
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

  console.log('✅ Ownership verified')

  // Check ETH balance
  console.log('\n' + '='.repeat(60))
  console.log('Step 1: Checking ETH Balance...')
  console.log('='.repeat(60))

  const ethBalance = await ethers.provider.getBalance(nftAddress)
  console.log(`\n💰 ETH in contract: ${ethers.formatEther(ethBalance)} ETH`)

  if (ethBalance > 0n) {
    console.log(`\n💵 Withdrawing ${ethers.formatEther(ethBalance)} ETH to ${owner.address}...`)
    
    const tx1 = await nftMembership.withdrawETH(owner.address)
    console.log(`⏳ Transaction sent: ${tx1.hash}`)
    
    const receipt1 = await tx1.wait()
    console.log(`✅ ETH withdrawal confirmed!`)
    console.log(`   Gas used: ${receipt1.gasUsed.toString()}`)
  } else {
    console.log('\n⚠️  No ETH to withdraw')
  }

  // Check DWT balance
  console.log('\n' + '='.repeat(60))
  console.log('Step 2: Checking DWT Balance...')
  console.log('='.repeat(60))

  const dwtAddress = await nftMembership.dwtToken()
  console.log(`\n📍 DWT Token: ${dwtAddress}`)

  const ERC20_ABI = [
    'function balanceOf(address) view returns (uint256)',
    'function decimals() view returns (uint8)',
    'function symbol() view returns (string)'
  ]

  const dwtContract = new ethers.Contract(dwtAddress, ERC20_ABI, ethers.provider)
  const dwtBalance = await dwtContract.balanceOf(nftAddress)
  const dwtDecimals = await dwtContract.decimals()
  const dwtSymbol = await dwtContract.symbol()

  console.log(`💰 ${dwtSymbol} in contract: ${ethers.formatUnits(dwtBalance, dwtDecimals)}`)

  if (dwtBalance > 0n) {
    console.log(`\n💵 Withdrawing ${ethers.formatUnits(dwtBalance, dwtDecimals)} ${dwtSymbol}...`)
    
    const tx2 = await nftMembership.withdrawDWT(owner.address, dwtBalance)
    console.log(`⏳ Transaction sent: ${tx2.hash}`)
    
    const receipt2 = await tx2.wait()
    console.log(`✅ ${dwtSymbol} withdrawal confirmed!`)
    console.log(`   Gas used: ${receipt2.gasUsed.toString()}`)
  } else {
    console.log(`\n⚠️  No ${dwtSymbol} to withdraw`)
  }

  // Final summary
  console.log('\n' + '='.repeat(60))
  console.log('Withdrawal Summary')
  console.log('='.repeat(60))

  const finalEthBalance = await ethers.provider.getBalance(nftAddress)
  const finalDwtBalance = await dwtContract.balanceOf(nftAddress)

  console.log(`\n✅ All revenue withdrawn!`)
  console.log(`\nRemaining in contract:`)
  console.log(`   ETH: ${ethers.formatEther(finalEthBalance)} ETH`)
  console.log(`   ${dwtSymbol}: ${ethers.formatUnits(finalDwtBalance, dwtDecimals)}`)

  console.log('\n💾 Funds sent to:')
  console.log(`   ${owner.address}`)

  console.log('\n' + '='.repeat(60))
  console.log('✅ Revenue Withdrawal Complete!')
  console.log('='.repeat(60))
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Withdrawal failed:')
    console.error(error)
    process.exit(1)
  })
