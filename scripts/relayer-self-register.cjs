const { ethers } = require('hardhat')

/**
 * Layer 8 - Relayer Self-Registration Script
 * 
 * Each relayer operator runs this script to register themselves
 * Requires: 1 ETH stake + gas fees
 */

async function main() {
  console.log('════════════════════════════════════════════════════')
  console.log('  Layer 8 - Relayer Self-Registration')
  console.log('════════════════════════════════════════════════════\n')

  const [relayer] = await ethers.getSigners()
  console.log('Relayer Address:', relayer.address)
  
  const network = await ethers.provider.getNetwork()
  console.log('Network:', network.name, '(Chain ID:', network.chainId, ')\n')

  // Check balance
  const balance = await ethers.provider.getBalance(relayer.address)
  console.log('Current Balance:', ethers.formatEther(balance), 'ETH')
  
  const RELAYER_STAKE = ethers.parseEther('1')
  if (balance < RELAYER_STAKE) {
    console.log('\n❌ ERROR: Insufficient balance!')
    console.log('   Required:', ethers.formatEther(RELAYER_STAKE), 'ETH')
    console.log('   Available:', ethers.formatEther(balance), 'ETH')
    console.log('\n   Please get testnet ETH from a faucet first.')
    return
  }

  // EnhancedCrossChainMessenger address
  const MESSENGER_ADDRESS = process.env.MESSENGER_ADDRESS || '0x2595640594d53974aF31174d1803a6838b89C334'
  
  console.log('\n📋 Registration Details:')
  console.log('─'.repeat(50))
  console.log('  Messenger Contract:', MESSENGER_ADDRESS)
  console.log('  Required Stake:', ethers.formatEther(RELAYER_STAKE), 'ETH')
  console.log('')

  // Get the EnhancedCrossChainMessenger contract
  const Messenger = await ethers.getContractFactory('contracts/layer8/EnhancedCrossChainMessenger.sol:EnhancedCrossChainMessenger')
  const messenger = Messenger.attach(MESSENGER_ADDRESS)

  // Check if already registered
  const isRelayer = await messenger.isRelayer(relayer.address)
  if (isRelayer) {
    console.log('⚠️  Already registered as relayer!')
    const info = await messenger.relayerInfo(relayer.address)
    console.log('  Stake:', ethers.formatEther(info.stake), 'ETH')
    console.log('  Messages Relayed:', info.messagesRelayed)
    console.log('  Failed Messages:', info.failedMessages)
    console.log('  Active:', info.active)
    return
  }

  // Register as relayer
  console.log('🔐 Registering as relayer...')
  console.log('─'.repeat(50))
  
  try {
    const tx = await messenger.connect(relayer).registerRelayer({ 
      value: RELAYER_STAKE 
    })
    
    console.log('  Transaction Hash:', tx.hash)
    console.log('  Waiting for confirmation...')
    
    await tx.wait()
    
    console.log('\n✅ Successfully registered as relayer!')
    console.log('')
    
    // Verify registration
    const newIsRelayer = await messenger.isRelayer(relayer.address)
    const info = await messenger.relayerInfo(relayer.address)
    
    console.log('📊 Registration Verified:')
    console.log('─'.repeat(50))
    console.log('  Is Relayer:', newIsRelayer)
    console.log('  Stake:', ethers.formatEther(info.stake), 'ETH')
    console.log('  Messages Relayed:', info.messagesRelayed)
    console.log('  Failed Messages:', info.failedMessages)
    console.log('  Active:', info.active)
    console.log('  Registered At:', new Date(Number(info.registeredAt) * 1000).toISOString())
    console.log('')
    
    // Check relayer count
    const count = await messenger.getRelayerCount()
    const activeCount = await messenger.getActiveRelayerCount()
    const requiredSigs = await messenger.requiredSignatures()
    
    console.log('📈 Current Relayer Stats:')
    console.log('─'.repeat(50))
    console.log('  Total Relayers:', count)
    console.log('  Active Relayers:', activeCount)
    console.log('  Required Signatures:', requiredSigs)
    console.log('  Progress:', `${activeCount}/15 relayers registered`)
    console.log('')
    
    if (activeCount < 7) {
      console.log('⏳ Need at least 7 active relayers for multisig')
      console.log(`   Current: ${activeCount}/7`)
      console.log('')
    } else {
      console.log('✅ Sufficient relayers registered!')
      console.log('   Cross-chain messaging is now operational')
      console.log('')
    }
    
    console.log('════════════════════════════════════════════════════')
    console.log('  Next Steps')
    console.log('════════════════════════════════════════════════════\n')
    console.log('1. Monitor relayer dashboard (if available)')
    console.log('2. Sign incoming cross-chain messages promptly')
    console.log('3. Maintain high uptime (>99.9%)')
    console.log('4. Monitor performance metrics')
    console.log('5. Report any issues to the team')
    console.log('')
    
  } catch (error) {
    console.log('\n❌ Registration failed!')
    console.log('   Error:', error.message)
    console.log('')
    
    if (error.message.includes('Already relayer')) {
      console.log('   You are already registered as a relayer.')
    } else if (error.message.includes('Max relayers')) {
      console.log('   Maximum number of relayers (15) has been reached.')
    } else if (error.message.includes('Insufficient stake')) {
      console.log('   Insufficient stake sent. Required: 1 ETH')
    }
    console.log('')
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
