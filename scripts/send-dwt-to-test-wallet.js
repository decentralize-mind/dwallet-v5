import pkg from 'hardhat';
import { ethers } from 'ethers';
const { ethers: hardhatEthers } = pkg;

/**
 * Send 200 DWT from Advisor_2 to new test wallet
 * 
 * From: 0x81ac6b27625582F5a453fa9E3955A9bbbD2AE14E (Advisor_2)
 * To: 0x181A416d6a3C9100F435faE2Ba7Cb17511F6c178
 * Amount: 200 DWT
 * 
 * IMPORTANT: You need the private key for Advisor_2 address!
 * Set it in .env as: ADVISOR_2_PRIVATE_KEY=your_key_here
 */

async function main() {
  console.log('💸 DWT Transfer Script')
  console.log('='.repeat(60))

  // Configuration
  const FROM_ADDRESS = '0x81ac6b27625582F5a453fa9E3955A9bbbD2AE14E'
  const TO_ADDRESS = '0x181A416d6a3C9100F435faE2Ba7Cb17511F6c178'
  const DWT_ADDRESS = '0x3A4B1a7aD971be03dEe83A7B61d575304C9C0b0f'
  const AMOUNT_DWT = 200

  console.log(`\n📤 From: ${FROM_ADDRESS}`)
  console.log(`📥 To: ${TO_ADDRESS}`)
  console.log(`💰 Amount: ${AMOUNT_DWT} DWT`)
  console.log(`🪙 DWT Token: ${DWT_ADDRESS}`)

  // Get signer - try to use Advisor_2 private key if available
  let signer
  const advisor2PrivateKey = process.env.ADVISOR_2_PRIVATE_KEY
  
  if (advisor2PrivateKey) {
    // Use Advisor_2 private key directly
    const provider = hardhatEthers.provider
    signer = new ethers.Wallet(advisor2PrivateKey, provider)
    console.log(`\n👤 Using Advisor_2 signer: ${signer.address}`)
  } else {
    // Fall back to default signer
    const [defaultSigner] = await hardhatEthers.getSigners()
    signer = defaultSigner
    console.log(`\n👤 Using default signer: ${signer.address}`)
    console.log(`⚠️  Note: Set ADVISOR_2_PRIVATE_KEY in .env to use Advisor_2`)
  }

  // Check if signer matches FROM_ADDRESS
  if (signer.address.toLowerCase() !== FROM_ADDRESS.toLowerCase()) {
    console.log('\n⚠️  WARNING: Signer does not match FROM_ADDRESS')
    console.log(`   Current signer: ${signer.address}`)
    console.log(`   Expected: ${FROM_ADDRESS}`)
    console.log('\n❌ You need to use the private key of the FROM_ADDRESS')
    console.log('\n💡 Solution:')
    console.log('   1. Add to .env file:')
    console.log('      ADVISOR_2_PRIVATE_KEY=your_private_key_here')
    console.log('   2. Or manually transfer DWT using MetaMask')
    process.exit(1)
  }

  // DWT Token ABI (minimal for transfer)
  const DWT_ABI = [
    'function balanceOf(address) view returns (uint256)',
    'function transfer(address to, uint256 amount) returns (bool)',
    'function decimals() view returns (uint8)',
    'function symbol() view returns (string)'
  ]

  const dwtContract = new ethers.Contract(DWT_ADDRESS, DWT_ABI, signer)

  // Check balance
  console.log('\n' + '='.repeat(60))
  console.log('Step 1: Checking DWT Balance')
  console.log('='.repeat(60))

  const balance = await dwtContract.balanceOf(FROM_ADDRESS)
  const decimals = await dwtContract.decimals()
  const symbol = await dwtContract.symbol()
  const balanceFormatted = ethers.formatUnits(balance, decimals)

  console.log(`\n💰 Current balance: ${balanceFormatted} ${symbol}`)
  console.log(`📤 Amount to send: ${AMOUNT_DWT} ${symbol}`)

  const amountToSend = ethers.parseUnits(AMOUNT_DWT.toString(), decimals)

  if (balance < amountToSend) {
    console.log(`\n❌ Insufficient balance!`)
    console.log(`   Need: ${AMOUNT_DWT} ${symbol}`)
    console.log(`   Have: ${balanceFormatted} ${symbol}`)
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

    const senderBalanceAfter = await dwtContract.balanceOf(FROM_ADDRESS)
    const recipientBalanceAfter = await dwtContract.balanceOf(TO_ADDRESS)

    console.log(`\n📤 Sender balance:`)
    console.log(`   Before: ${balanceFormatted} ${symbol}`)
    console.log(`   After:  ${ethers.formatUnits(senderBalanceAfter, decimals)} ${symbol}`)
    
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

    console.log(`
✅ Successfully sent ${AMOUNT_DWT} ${symbol}

📊 Summary:
   • From: ${FROM_ADDRESS}
   • To: ${TO_ADDRESS}
   • Amount: ${AMOUNT_DWT} ${symbol}
   • TX Hash: ${tx.hash}
   • Block: ${receipt.blockNumber}

🔍 View on Basescan:
   https://sepolia.basescan.org/tx/${tx.hash}

🎯 Next Steps:
   1. Connect wallet ${TO_ADDRESS} to UI
   2. Navigate to Membership tab
   3. Mint Bronze pass (100 DWT)
   4. You'll have 100 DWT remaining!

💡 With ${AMOUNT_DWT} DWT, the recipient can:
   ✅ Mint Bronze pass (100 DWT)
   ❌ Need 300 more for Silver (500 DWT)
   ❌ Need 1,800 more for Gold (2,000 DWT)
   ❌ Need 4,800 more for Platinum (5,000 DWT)
    `)

  } catch (error) {
    console.error('\n❌ Transfer failed:')
    console.error(error.reason || error.message)
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
