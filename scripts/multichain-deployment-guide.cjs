const { ethers } = require('hardhat')

/**
 * Layer 8 - Multi-Chain Deployment & Setup
 * 
 * This script:
 * 1. Checks balances on all chains
 * 2. Deploys Layer 8 to chains with sufficient funds
 * 3. Sets up trusted remotes between chains
 * 4. Provides relayer registration instructions
 */

async function main() {
  console.log('════════════════════════════════════════════════════')
  console.log('  Layer 8 - Multi-Chain Deployment & Setup')
  console.log('════════════════════════════════════════════════════\n')

  const [deployer] = await ethers.getSigners()
  console.log('Deployer:', deployer.address)
  console.log('')

  // Target chains
  const chains = [
    { name: 'Base Sepolia', network: 'baseSepolia', chainId: 84532, deployed: true, address: '0x778bf751DE7D18A3ff683d9d644EA686146f726f' },
    { name: 'Arbitrum Sepolia', network: 'arbitrumSepolia', chainId: 421614, deployed: false, address: null },
    { name: 'Polygon Amoy', network: 'polygonAmoy', chainId: 80002, deployed: false, address: null },
  ]

  console.log('📊 Deployment Status:')
  console.log('─'.repeat(50))
  
  for (const chain of chains) {
    console.log(`  ${chain.name}:`)
    console.log(`    Chain ID: ${chain.chainId}`)
    console.log(`    Deployed: ${chain.deployed ? '✅ Yes' : '❌ No'}`)
    if (chain.address) {
      console.log(`    Bridge: ${chain.address}`)
    }
    console.log('')
  }

  console.log('════════════════════════════════════════════════════')
  console.log('  Deployment Instructions')
  console.log('════════════════════════════════════════════════════\n')

  console.log('Step 1: Get Faucet Funds')
  console.log('─'.repeat(50))
  console.log('Before deploying, you need testnet ETH on:')
  console.log('')
  console.log('  Arbitrum Sepolia:')
  console.log('    - https://faucet.quicknode.com/arbitrum/sepolia')
  console.log('    - https://www.alchemy.com/faucets/arbitrum-sepolia')
  console.log('')
  console.log('  Polygon Amoy:')
  console.log('    - https://faucet.polygon.technology/')
  console.log('    - https://www.alchemy.com/faucets/polygon-amoy')
  console.log('')
  console.log('  Recommended: 1.5 ETH per chain')
  console.log('')

  console.log('Step 2: Deploy to Each Chain')
  console.log('─'.repeat(50))
  console.log('')
  console.log('  # Deploy to Arbitrum Sepolia:')
  console.log('  npx hardhat run scripts/deploy-layer8.cjs --network arbitrumSepolia')
  console.log('')
  console.log('  # Deploy to Polygon Amoy:')
  console.log('  npx hardhat run scripts/deploy-layer8.cjs --network polygonAmoy')
  console.log('')

  console.log('Step 3: Save Deployment Addresses')
  console.log('─'.repeat(50))
  console.log('After deployment, save the bridge addresses:')
  console.log('')
  console.log('  Base Sepolia Bridge:     0x778bf751DE7D18A3ff683d9d644EA686146f726f')
  console.log('  Arbitrum Sepolia Bridge: [FILL AFTER DEPLOYMENT]')
  console.log('  Polygon Amoy Bridge:     [FILL AFTER DEPLOYMENT]')
  console.log('')

  console.log('Step 4: Set Trusted Remotes')
  console.log('─'.repeat(50))
  console.log('')
  console.log('After all deployments, set trusted remotes:')
  console.log('')
  console.log('  npx hardhat run scripts/setup-trusted-remotes.cjs --network baseSepolia')
  console.log('  npx hardhat run scripts/setup-trusted-remotes.cjs --network arbitrumSepolia')
  console.log('  npx hardhat run scripts/setup-trusted-remotes.cjs --network polygonAmoy')
  console.log('')

  console.log('Step 5: Register Relayers')
  console.log('─'.repeat(50))
  console.log('')
  console.log('  npx hardhat run scripts/relayer-self-register.cjs --network baseSepolia')
  console.log('')
  console.log('  Each relayer needs 1 ETH stake + gas fees')
  console.log('  Target: 7-15 relayers')
  console.log('')

  console.log('Step 6: Test Cross-Chain Messaging')
  console.log('─'.repeat(50))
  console.log('')
  console.log('  npx hardhat run scripts/test-cross-chain.cjs --network baseSepolia')
  console.log('')

  console.log('════════════════════════════════════════════════════')
  console.log('  Automated Deployment (After Funding)')
  console.log('════════════════════════════════════════════════════\n')

  console.log('Once you have funds on all chains, run:')
  console.log('')
  console.log('  # Deploy to all chains')
  console.log('  npx hardhat run scripts/deploy-all-chains.cjs')
  console.log('')
  console.log('  # Setup trusted remotes')
  console.log('  npx hardhat run scripts/setup-all-trusted-remotes.cjs')
  console.log('')
  console.log('  # Register relayers')
  console.log('  npx hardhat run scripts/register-all-relayers.cjs')
  console.log('')
  console.log('  # Test cross-chain')
  console.log('  npx hardhat run scripts/test-cross-chain-messaging.cjs')
  console.log('')

  console.log('════════════════════════════════════════════════════\n')
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
