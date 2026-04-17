const { ethers } = require('hardhat')

/**
 * Bridge ETH from Base Sepolia to other testnets
 * 
 * This script helps you transfer ETH from Base Sepolia to:
 * - Arbitrum Sepolia
 * - Polygon Amoy
 * 
 * Note: For testnet bridging, we'll use official testnet bridges
 * This script provides the instructions and verification
 */

async function main() {
  console.log('════════════════════════════════════════════════════')
  console.log('  Bridge ETH from Base Sepolia to Other Testnets')
  console.log('════════════════════════════════════════════════════\n')

  const [deployer] = await ethers.getSigners()
  console.log('From Address:', deployer.address)
  
  const network = await ethers.provider.getNetwork()
  console.log('Current Network:', network.name, '(Chain ID:', network.chainId, ')')
  
  // Check balance on Base Sepolia
  const balance = await ethers.provider.getBalance(deployer.address)
  console.log('Current Balance:', ethers.formatEther(balance), 'ETH\n')

  const AMOUNT_TO_BRIDGE = ethers.parseEther('1.5') // 1.5 ETH per chain
  
  console.log('📋 Bridge Plan:')
  console.log('─'.repeat(50))
  console.log('  From: Base Sepolia')
  console.log('  To: Arbitrum Sepolia (1.5 ETH)')
  console.log('  To: Polygon Amoy (1.5 ETH)')
  console.log('  Total: 3.0 ETH')
  console.log('  Remaining on Base Sepolia:', ethers.formatEther(balance - AMOUNT_TO_BRIDGE * 2n), 'ETH')
  console.log('')

  console.log('════════════════════════════════════════════════════')
  console.log('  Step 1: Bridge to Arbitrum Sepolia')
  console.log('════════════════════════════════════════════════════\n')

  console.log('Use the official Arbitrum Bridge:')
  console.log('🔗 https://bridge.arbitrum.io/?destinationChain=arbitrum-sepolia&sourceChain=base-sepolia')
  console.log('')
  console.log('Steps:')
  console.log('1. Connect your wallet (0x4C0B7314441dfE8E61267C0d87Fc1A657611dCf5)')
  console.log('2. Select Base Sepolia as source')
  console.log('3. Select Arbitrum Sepolia as destination')
  console.log('4. Enter amount: 1.5 ETH')
  console.log('5. Click "Move funds to Arbitrum Sepolia"')
  console.log('6. Approve and confirm transaction')
  console.log('7. Wait for bridge to complete (~5-15 minutes)')
  console.log('')

  console.log('════════════════════════════════════════════════════')
  console.log('  Step 2: Bridge to Polygon Amoy')
  console.log('════════════════════════════════════════════════════\n')

  console.log('Use the Polygon PoS Bridge or third-party bridge:')
  console.log('🔗 https://portal.polygon.technology/bridge')
  console.log('')
  console.log('Alternative bridges (if official bridge doesn\'t support Base Sepolia):')
  console.log('🔗 https://cbridge.celer.network/')
  console.log('🔗 https://app.symbiosis.finance/')
  console.log('')
  console.log('Steps:')
  console.log('1. Connect your wallet (0x4C0B7314441dfE8E61267C0d87Fc1A657611dCf5)')
  console.log('2. Select Base Sepolia as source')
  console.log('3. Select Polygon Amoy as destination')
  console.log('4. Enter amount: 1.5 ETH')
  console.log('5. Complete the bridge transaction')
  console.log('6. Wait for bridge to complete (~5-15 minutes)')
  console.log('')

  console.log('════════════════════════════════════════════════════')
  console.log('  Step 3: Verify Balances')
  console.log('════════════════════════════════════════════════════\n')

  console.log('After bridging, verify your balances:\n')

  console.log('# Check Arbitrum Sepolia balance:')
  console.log('cast balance 0x4C0B7314441dfE8E61267C0d87Fc1A657611dCf5 \\')
  console.log('  --rpc-url https://sepolia-rollup.arbitrum.io/rpc')
  console.log('')

  console.log('# Check Polygon Amoy balance:')
  console.log('cast balance 0x4C0B7314441dfE8E61267C0d87Fc1A657611dCf5 \\')
  console.log('  --rpc-url https://rpc-amoy.polygon.technology')
  console.log('')

  console.log('════════════════════════════════════════════════════')
  console.log('  Alternative: Manual Faucet (Faster)')
  console.log('════════════════════════════════════════════════════\n')

  console.log('If bridging is complex, you can also use faucets directly:')
  console.log('')
  console.log('Arbitrum Sepolia Faucets:')
  console.log('  - https://faucet.quicknode.com/arbitrum/sepolia')
  console.log('  - https://www.alchemy.com/faucets/arbitrum-sepolia')
  console.log('')
  console.log('Polygon Amoy Faucets:')
  console.log('  - https://faucet.polygon.technology/')
  console.log('  - https://www.alchemy.com/faucets/polygon-amoy')
  console.log('')

  console.log('════════════════════════════════════════════════════')
  console.log('  After Funding - Next Steps')
  console.log('════════════════════════════════════════════════════\n')

  console.log('Once you have funds on both chains:')
  console.log('')
  console.log('1. Deploy Layer 8 to Arbitrum Sepolia:')
  console.log('   npx hardhat run scripts/deploy-layer8.cjs --network arbitrumSepolia')
  console.log('')
  console.log('2. Deploy Layer 8 to Polygon Amoy:')
  console.log('   npx hardhat run scripts/deploy-layer8.cjs --network polygonAmoy')
  console.log('')
  console.log('3. Come back here and tell me the deployed addresses!')
  console.log('   I\'ll help you set up trusted remotes and relayers.')
  console.log('')

  console.log('════════════════════════════════════════════════════\n')
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
