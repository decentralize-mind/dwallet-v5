import pkg from 'hardhat';
const { ethers } = pkg;

/**
 * Send DWT from deployer wallet to test wallet
 * 
 * This script uses the deployer private key from .env to send DWT tokens
 * to the test wallet for NFT membership minting.
 */

async function main() {
  console.log('💸 DWT Transfer from Deployer to Test Wallet')
  console.log('='.repeat(60))

  // Configuration
  const TO_ADDRESS = '0x181A416d6a3C9100F435faE2Ba7Cb17511F6c178'
  const DWT_ADDRESS = '0x3A4B1a7aD971be03dEe83A7B61d575304C9C0b0f'
  const AMOUNT_DWT = 1000 // Send 1000 DWT (enough for any tier)

  console.log(`\n📤 From: Deployer Wallet (from .env)`)
  console.log(`📥 To: ${TO_ADDRESS}`)
  console.log(`💰 Amount: ${AMOUNT_DWT} DWT`)
  console.log(`🪙 DWT Token: ${DWT_ADDRESS}`)

  // Get deployer signer
  const [deployer] = await ethers.getSigners()
  console.log(`\n👤 Deployer address: ${deployer.address}`)
  
  // Check deployer ETH balance (for gas)
  const deployerETH = await ethers.provider.getBalance(deployer.address)
  console.log(`💎 Deployer ETH: ${ethers.formatEther(deployerETH)} ETH`)

  if (deployerETH === 0n) {
    console.log('\n❌ Deployer has no ETH for gas fees!')
    console.log('   Please fund the deployer wallet with some Base Sepolia ETH')
    process.exit(1)
  }

  // DWT Token ABI
  const DWT_ABI = [
    'function balanceOf(address) view returns (uint256)',
    'function transfer(address to, uint256 amount) returns (bool)',
    'function decimals() view returns (uint8)',
    'function symbol() view returns (string)',
  ]

  const dwtContract = new ethers.Contract(DWT_ADDRESS, DWT_ABI, deployer)

  // Check deployer DWT balance
  console.log('\n' + '='.repeat(60))
  console.log('Step 1: Checking Deployer DWT Balance')
  console.log('='.repeat(60))

  const deployerBalance = await dwtContract.balanceOf(deployer.address)
  const decimals = await dwtContract.decimals()
  const symbol = await dwtContract.symbol()
  const deployerDWTFormatted = ethers.formatUnits(deployerBalance, decimals)

  console.log(`\n💰 Deployer DWT balance: ${deployerDWTFormatted} ${symbol}`)
  console.log(`📤 Amount to send: ${AMOUNT_DWT} ${symbol}`)

  const amountToSend = ethers.parseUnits(AMOUNT_DWT.toString(), decimals)

  if (deployerBalance < amountToSend) {
    console.log(`\n❌ Insufficient DWT balance!`)
    console.log(`   Need: ${AMOUNT_DWT} ${symbol}`)
    console.log(`   Have: ${deployerDWTFormatted} ${symbol}`)
    console.log(`\n💡 Options:`)
    console.log(`   1. Reduce the amount to send`)
    console.log(`   2. Mint more DWT to deployer (if you have owner access)`)
    process.exit(1)
  }

  console.log(`✅ Sufficient balance confirmed`)

  // Check recipient balance before
  console.log('\n' + '='.repeat(60))
  console.log('Step 2: Checking Recipient Balance')
  console.log('='.repeat(60))

  const recipientBalanceBefore = await dwtContract.balanceOf(TO_ADDRESS)
  console.log(`\n📥 Recipient current balance: ${ethers.formatUnits(recipientBalanceBefore, decimals)} ${symbol}`)

  // Execute transfer
  console.log('\n' + '='.repeat(60))
  console.log('Step 3: Executing Transfer')
  console.log('='.repeat(60))

  try {
    console.log(`\n⏳ Sending ${AMOUNT_DWT} ${symbol}...`)
    
    const tx = await dwtContract.transfer(TO_ADDRESS, amountToSend, {
      gasLimit: 100000
    })
    
    console.log(`📝 Transaction hash: ${tx.hash}`)
    console.log(`⏳ Waiting for confirmation...`)
    
    const receipt = await tx.wait()
    
    console.log(`\n✅ Transfer confirmed!`)
    console.log(`📦 Block number: ${receipt.blockNumber}`)
    console.log(`⛽ Gas used: ${receipt.gasUsed.toString()}`)

    // Check balances after
    console.log('\n' + '='.repeat(60))
    console.log('Step 4: Verifying Transfer')
    console.log('='.repeat(60))

    const deployerBalanceAfter = await dwtContract.balanceOf(deployer.address)
    const recipientBalanceAfter = await dwtContract.balanceOf(TO_ADDRESS)

    console.log(`\n📤 Deployer balance:`)
    console.log(`   Before: ${deployerDWTFormatted} ${symbol}`)
    console.log(`   After:  ${ethers.formatUnits(deployerBalanceAfter, decimals)} ${symbol}`)
    
    console.log(`\n📥 Recipient balance:`)
    console.log(`   Before: ${ethers.formatUnits(recipientBalanceBefore, decimals)} ${symbol}`)
    console.log(`   After:  ${ethers.formatUnits(recipientBalanceAfter, decimals)} ${symbol}`)

    // Verify the transfer
    const expectedRecipientBalance = recipientBalanceBefore + amountToSend
    if (recipientBalanceAfter === expectedRecipientBalance) {
      console.log(`\n✅ Transfer verified successfully!`)
    } else {
      console.log(`\n⚠️  Transfer verification mismatch!`)
    }

    // Summary
    console.log('\n' + '='.repeat(60))
    console.log('🎉 Transfer Complete!')
    console.log('='.repeat(60))

    const recipientBalanceNum = parseFloat(ethers.formatUnits(recipientBalanceAfter, decimals))

    console.log(`
✅ Successfully sent ${AMOUNT_DWT} ${symbol}

📊 Summary:
   • From: Deployer (${deployer.address})
   • To: ${TO_ADDRESS}
   • Amount: ${AMOUNT_DWT} ${symbol}
   • TX Hash: ${tx.hash}
   • Block: ${receipt.blockNumber}
   • Recipient New Balance: ${recipientBalanceNum.toFixed(2)} ${symbol}

🔍 View on Basescan:
   https://sepolia.basescan.org/tx/${tx.hash}

🎯 What You Can Now Mint:
`)

    if (recipientBalanceNum >= 100) {
      console.log(`   ✅ Bronze Pass (100 DWT) - You can mint this!`)
    }
    if (recipientBalanceNum >= 500) {
      console.log(`   ✅ Silver Pass (500 DWT) - You can mint this!`)
    }
    if (recipientBalanceNum >= 2000) {
      console.log(`   ✅ Gold Pass (2,000 DWT) - You can mint this!`)
    }
    if (recipientBalanceNum >= 5000) {
      console.log(`   ✅ Platinum Pass (5,000 DWT) - You can mint this!`)
    }

    console.log(`
🚀 Next Steps:
   1. Open: http://localhost:5173/
   2. Connect wallet: ${TO_ADDRESS}
   3. Go to Membership tab
   4. Your DWT balance should show: ${recipientBalanceNum.toFixed(2)} DWT
   5. Click "Mint Pass" on your preferred tier!
    `)

  } catch (error) {
    console.error('\n❌ Transfer failed:')
    console.error(error.reason || error.message)
    console.error('\nFull error:', error)
    process.exit(1)
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Script failed:')
    console.error(error)
    process.exit(1)
  })
