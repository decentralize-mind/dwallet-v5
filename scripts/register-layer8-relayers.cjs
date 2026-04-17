const { ethers } = require('hardhat')

/**
 * Layer 8 - Relayer Registration Script
 * 
 * This script registers relayers for the EnhancedCrossChainMessenger
 * Each relayer must stake 1 ETH to participate
 * Target: 7-of-15 multisig threshold
 */

async function main() {
  console.log('════════════════════════════════════════════════════')
  console.log('  Layer 8 - Relayer Registration')
  console.log('════════════════════════════════════════════════════\n')

  const [deployer] = await ethers.getSigners()
  console.log('Registering relayers with account:', deployer.address)
  
  const network = await ethers.provider.getNetwork()
  console.log('Network:', network.name, '(Chain ID:', network.chainId, ')\n')

  // EnhancedCrossChainMessenger address (Base Sepolia)
  const MESSENGER_ADDRESS = '0x2595640594d53974aF31174d1803a6838b89C334' // From .env BASE_CROSS_CHAIN_MSG
  
  // Relayer addresses (replace with actual relayer addresses)
  // In production, these would be addresses of trusted relayer operators
  const RELAYER_ADDRESSES = [
    '0x1234567890123456789012345678901234567890', // Relayer 1
    '0x2345678901234567890123456789012345678901', // Relayer 2
    '0x3456789012345678901234567890123456789012', // Relayer 3
    '0x4567890123456789012345678901234567890123', // Relayer 4
    '0x5678901234567890123456789012345678901234', // Relayer 5
    '0x6789012345678901234567890123456789012345', // Relayer 6
    '0x7890123456789012345678901234567890123456', // Relayer 7
    '0x8901234567890123456789012345678901234567', // Relayer 8
    '0x9012345678901234567890123456789012345678', // Relayer 9
    '0x0123456789012345678901234567890123456789', // Relayer 10
    '0x1123456789012345678901234567890123456780', // Relayer 11
    '0x2123456789012345678901234567890123456781', // Relayer 12
    '0x3123456789012345678901234567890123456782', // Relayer 13
    '0x4123456789012345678901234567890123456783', // Relayer 14
    '0x5123456789012345678901234567890123456784', // Relayer 15
  ]

  const RELAYER_STAKE = ethers.parseEther('1') // 1 ETH per relayer

  console.log('📋 Relayer Registration Plan:')
  console.log('─'.repeat(50))
  console.log('  Messenger Contract:', MESSENGER_ADDRESS)
  console.log('  Required Stake per Relayer:', ethers.formatEther(RELAYER_STAKE), 'ETH')
  console.log('  Target Relayers:', RELAYER_ADDRESSES.length)
  console.log('  Multisig Threshold: 7-of-15')
  console.log('  Total ETH Required:', ethers.formatEther(RELAYER_STAKE * BigInt(RELAYER_ADDRESSES.length)), 'ETH\n')

  // Get the EnhancedCrossChainMessenger contract
  const Messenger = await ethers.getContractFactory('contracts/layer8/EnhancedCrossChainMessenger.sol:EnhancedCrossChainMessenger')
  const messenger = Messenger.attach(MESSENGER_ADDRESS)

  // Check current relayer count
  const currentCount = await messenger.getRelayerCount()
  const activeCount = await messenger.getActiveRelayerCount()
  console.log('📊 Current Status:')
  console.log('  Total Relayers:', currentCount)
  console.log('  Active Relayers:', activeCount)
  console.log('  Required Signatures:', await messenger.requiredSignatures())
  console.log('')

  // Register relayers
  console.log('🔐 Registering Relayers...')
  console.log('─'.repeat(50))

  let registered = 0
  let failed = 0

  for (let i = 0; i < RELAYER_ADDRESSES.length; i++) {
    const relayerAddress = RELAYER_ADDRESSES[i]
    
    try {
      // Check if already a relayer
      const isRelayer = await messenger.isRelayer(relayerAddress)
      if (isRelayer) {
        console.log(`  ⏭️  Relayer ${i + 1} (${relayerAddress.slice(0, 10)}...) already registered`)
        continue
      }

      // In production, each relayer would call registerRelayer() themselves with their own ETH
      // For this demo, we're showing the process
      console.log(`  📝 Relayer ${i + 1} (${relayerAddress.slice(0, 10)}...)`)
      console.log(`     Status: ⏳ Pending (relayer must call registerRelayer() with 1 ETH)`)
      console.log('')
      
      // Example of how a relayer would register themselves:
      // await messenger.connect(relayerSigner).registerRelayer({ value: RELAYER_STAKE })
      
      registered++
    } catch (error) {
      console.log(`  ❌ Relayer ${i + 1} failed:`, error.message)
      failed++
    }
  }

  console.log('════════════════════════════════════════════════════')
  console.log('  Registration Summary')
  console.log('════════════════════════════════════════════════════')
  console.log(`  ✅ Ready to Register: ${registered}`)
  console.log(`  ❌ Failed: ${failed}`)
  console.log(`  📊 Total Needed: ${RELAYER_ADDRESSES.length}`)
  console.log('')

  // Instructions for relayers
  console.log('════════════════════════════════════════════════════')
  console.log('  Instructions for Relayer Operators')
  console.log('════════════════════════════════════════════════════\n')
  
  console.log('Each relayer operator must:')
  console.log('1. Fund their wallet with at least 1.1 ETH (1 ETH stake + 0.1 ETH for gas)')
  console.log('2. Run the following command:')
  console.log('')
  console.log('   npx hardhat run scripts/relayer-self-register.cjs --network baseSepolia')
  console.log('     --relayer-address <RELAYER_ADDRESS>')
  console.log('')
  console.log('3. Verify registration:')
  console.log('   - Check isRelayer(<address>) returns true')
  console.log('   - Check relayerInfo(<address>) shows correct stake')
  console.log('')

  console.log('════════════════════════════════════════════════════')
  console.log('  Relayer Requirements')
  console.log('════════════════════════════════════════════════════\n')
  
  console.log('✅ Minimum Stake: 1 ETH')
  console.log('✅ Uptime: 99.9% required')
  console.log('✅ Performance: Auto-removed after 100 failed messages')
  console.log('✅ Security: Must maintain secure signing infrastructure')
  console.log('✅ Monitoring: Must monitor message queue and respond promptly')
  console.log('')

  console.log('════════════════════════════════════════════════════')
  console.log('  Next Steps')
  console.log('════════════════════════════════════════════════════\n')
  
  console.log('1. Distribute relayer addresses to trusted operators')
  console.log('2. Each operator funds their wallet and self-registers')
  console.log('3. Verify all 15 relayers are registered')
  console.log('4. Test cross-chain message signing and execution')
  console.log('5. Monitor relayer performance metrics')
  console.log('')
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
