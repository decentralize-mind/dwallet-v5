import pkg from 'hardhat';
const { ethers } = pkg;

/**
 * Quick balance check for test wallet
 */

async function main() {
  console.log('🔍 Checking DWT Balance')
  console.log('='.repeat(60))

  const WALLET_ADDRESS = '0x181A416d6a3C9100F435faE2Ba7Cb17511F6c178'
  const DWT_ADDRESS = '0x3A4B1a7aD971be03dEe83A7B61d575304C9C0b0f'
  
  console.log(`\n📍 Wallet: ${WALLET_ADDRESS}`)
  console.log(`🪙 DWT Contract: ${DWT_ADDRESS}`)

  // DWT ABI
  const DWT_ABI = [
    'function balanceOf(address) view returns (uint256)',
    'function symbol() view returns (string)',
    'function decimals() view returns (uint8)',
  ]

  const dwtContract = new ethers.Contract(DWT_ADDRESS, DWT_ABI, ethers.provider)

  // Check balance
  const balance = await dwtContract.balanceOf(WALLET_ADDRESS)
  const symbol = await dwtContract.symbol()
  const decimals = await dwtContract.decimals()
  const balanceFormatted = ethers.formatUnits(balance, decimals)

  console.log('\n' + '='.repeat(60))
  console.log('💰 Balance Result')
  console.log('='.repeat(60))
  
  console.log(`\n✅ DWT Balance: ${balanceFormatted} ${symbol}`)
  console.log(`💵 USD Value (at $3.50): $${(parseFloat(balanceFormatted) * 3.50).toFixed(2)}`)

  // Check ETH balance too
  const ethBalance = await ethers.provider.getBalance(WALLET_ADDRESS)
  console.log(`\n💎 ETH Balance: ${ethers.formatEther(ethBalance)} ETH`)

  console.log('\n' + '='.repeat(60))
  console.log('🎯 What You Can Mint')
  console.log('='.repeat(60))

  const balanceNum = parseFloat(balanceFormatted)
  
  if (balanceNum >= 100) {
    console.log('\n✅ Bronze Pass (100 DWT) - You can mint this!')
  } else {
    console.log('\n❌ Bronze Pass (100 DWT) - Not enough DWT')
  }

  if (balanceNum >= 500) {
    console.log('✅ Silver Pass (500 DWT) - You can mint this!')
  } else {
    console.log(`❌ Silver Pass (500 DWT) - Need ${(500 - balanceNum).toFixed(0)} more DWT`)
  }

  if (balanceNum >= 2000) {
    console.log('✅ Gold Pass (2,000 DWT) - You can mint this!')
  } else {
    console.log(`❌ Gold Pass (2,000 DWT) - Need ${(2000 - balanceNum).toFixed(0)} more DWT`)
  }

  if (balanceNum >= 5000) {
    console.log('✅ Platinum Pass (5,000 DWT) - You can mint this!')
  } else {
    console.log(`❌ Platinum Pass (5,000 DWT) - Need ${(5000 - balanceNum).toFixed(0)} more DWT`)
  }

  console.log('\n' + '='.repeat(60))
  console.log('🔗 View on Basescan')
  console.log('='.repeat(60))
  console.log(`\nDWT Token Balance:\nhttps://sepolia.basescan.org/token/${DWT_ADDRESS}?a=${WALLET_ADDRESS}`)
  console.log(`\nWallet Transactions:\nhttps://sepolia.basescan.org/address/${WALLET_ADDRESS}`)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Error:', error.message)
    process.exit(1)
  })
