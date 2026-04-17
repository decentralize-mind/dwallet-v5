const { ethers } = require('hardhat')

async function main() {
  console.log('════════════════════════════════════════════════════')
  console.log('  Layer 8 - Setting Up Trusted Remotes')
  console.log('════════════════════════════════════════════════════\n')

  const [deployer] = await ethers.getSigners()
  console.log('Setting up with account:', deployer.address)
  
  const network = await ethers.provider.getNetwork()
  console.log('Network:', network.name, '(Chain ID:', network.chainId, ')\n')

  // Contract addresses
  const BRIDGE_ADDRESS = '0x778bf751DE7D18A3ff683d9d644EA686146f726f'
  const TOKEN_ADDRESS = '0xb2f465FB0735c18c49c4e240e210593d875C94d3'

  // Target chain IDs (example chains - update with actual chain IDs)
  const TARGET_CHAINS = [
    { chainId: 1, name: 'Ethereum Mainnet' },
    { chainId: 11155111, name: 'Sepolia' },
    { chainId: 8453, name: 'Base Mainnet' },
    { chainId: 42161, name: 'Arbitrum One' },
    { chainId: 421614, name: 'Arbitrum Sepolia' },
    { chainId: 137, name: 'Polygon' },
    { chainId: 80002, name: 'Polygon Amoy' },
  ]

  console.log('📡 Step 1: Configure Layer8Bridge Trusted Remotes')
  console.log('─'.repeat(50))
  
  try {
    const Bridge = await ethers.getContractFactory('contracts/layer8/Layer8Bridge.sol:Layer8Bridge')
    const bridge = Bridge.attach(BRIDGE_ADDRESS)

    // For each target chain, set trusted remote
    // Note: In production, you would deploy bridge contracts on each chain first
    // and then set their addresses as trusted remotes
    
    console.log('⚠️  NOTE: Trusted remotes require deployed bridge contracts on target chains.')
    console.log('   This script shows the setup process.\n')

    for (const chain of TARGET_CHAINS) {
      console.log(`  Chain: ${chain.name} (ID: ${chain.chainId})`)
      console.log(`  Status: ⏳ Pending (deploy bridge on target chain first)`)
      console.log('')
      
      // Example of how to set trusted remote (commented out - requires actual addresses)
      /*
      const trustedRemoteAddress = '0x...' // Bridge address on target chain
      const path = ethers.solidityPacked(
        ['address', 'address'],
        [BRIDGE_ADDRESS, trustedRemoteAddress]
      )
      
      await bridge.setTrustedRemote(chain.chainId, path)
      console.log(`  ✅ Set trusted remote for ${chain.name}`)
      */
    }

    console.log('✅ Bridge trusted remote setup process documented\n')
  } catch (error) {
    console.log('❌ Error:', error.message, '\n')
  }

  console.log('📡 Step 2: Configure BridgedToken Trusted Remotes')
  console.log('─'.repeat(50))
  
  try {
    const BridgedToken = await ethers.getContractFactory('contracts/layer8/BridgedToken.sol:BridgedToken')
    const bridgedToken = BridgedToken.attach(TOKEN_ADDRESS)

    console.log('⚠️  NOTE: BridgedToken trusted remotes require deployed tokens on target chains.\n')

    for (const chain of TARGET_CHAINS) {
      console.log(`  Chain: ${chain.name} (ID: ${chain.chainId})`)
      console.log(`  Status: ⏳ Pending (deploy bridged token on target chain first)`)
      console.log('')
      
      // Example of how to set trusted remote (commented out - requires actual addresses)
      /*
      const trustedRemoteAddress = '0x...' // BridgedToken address on target chain
      const path = ethers.solidityPacked(
        ['address', 'address'],
        [TOKEN_ADDRESS, trustedRemoteAddress]
      )
      
      await bridgedToken.setTrustedRemote(chain.chainId, path)
      console.log(`  ✅ Set trusted remote for ${chain.name}`)
      */
    }

    console.log('✅ BridgedToken trusted remote setup process documented\n')
  } catch (error) {
    console.log('❌ Error:', error.message, '\n')
  }

  console.log('════════════════════════════════════════════════════')
  console.log('  Next Steps for Cross-Chain Setup')
  console.log('════════════════════════════════════════════════════\n')
  
  console.log('1. Deploy Layer8Bridge on target chains')
  console.log('   - Use scripts/deploy-layer8.cjs')
  console.log('   - Target networks: Ethereum, Arbitrum, Polygon, etc.\n')
  
  console.log('2. Deploy BridgedToken on target chains')
  console.log('   - Same deployment script handles this\n')
  
  console.log('3. Set trusted remotes on each chain')
  console.log('   - Call setTrustedRemote(chainId, path) on each bridge')
  console.log('   - Path format: abi.encodePacked(localBridge, remoteBridge)\n')
  
  console.log('4. Register relayers (7-of-15 multisig)')
  console.log('   - Each relayer stakes 1 ETH')
  console.log('   - Call registerRelayer() with 1 ETH\n')
  
  console.log('5. Configure LayerZero & Axelar endpoints')
  console.log('   - Update with actual endpoint addresses')
  console.log('   - Test cross-chain message flow\n')
  
  console.log('════════════════════════════════════════════════════\n')
  
  console.log('📋 Trusted Remote Configuration Template:')
  console.log('─'.repeat(50))
  console.log('')
  console.log('// Example code to set trusted remotes:')
  console.log('const path = ethers.solidityPacked(')
  console.log('  ["address", "address"],')
  console.log('  [localBridgeAddress, remoteBridgeAddress]')
  console.log(')')
  console.log('await bridge.setTrustedRemote(targetChainId, path)')
  console.log('')
  console.log('════════════════════════════════════════════════════\n')
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
