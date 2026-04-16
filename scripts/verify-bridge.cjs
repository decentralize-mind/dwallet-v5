const { ethers } = require('hardhat');

/**
 * Bridge Transaction Verification Script
 * 
 * This script helps verify that ETH has been successfully bridged from
 * Sepolia to Base Sepolia.
 * 
 * Usage:
 *   node scripts/verify-bridge.js [your-address]
 */

async function main() {
  const address = process.argv[2] || '0x0e82e924FD6B402fF146d36756d6119C17912363';
  
  console.log('🌉 Bridge Transaction Verification');
  console.log('='.repeat(60));
  console.log('Address:', address);
  console.log('='.repeat(60));
  
  // Setup providers
  const sepoliaProvider = new ethers.JsonRpcProvider(
    `https://sepolia.infura.io/v3/${process.env.INFURA_KEY}`
  );
  const baseSepoliaProvider = new ethers.JsonRpcProvider('https://sepolia.base.org');
  
  // Get current balances
  console.log('\n📊 Current Balances:');
  
  const sepoliaBalance = await sepoliaProvider.getBalance(address);
  const baseSepoliaBalance = await baseSepoliaProvider.getBalance(address);
  
  console.log(`   Sepolia:      ${ethers.formatEther(sepoliaBalance)} ETH`);
  console.log(`   Base Sepolia: ${ethers.formatEther(baseSepoliaBalance)} ETH`);
  
  // Get latest blocks
  const sepoliaBlock = await sepoliaProvider.getBlockNumber();
  const baseSepoliaBlock = await baseSepoliaProvider.getBlockNumber();
  
  console.log('\n📦 Latest Blocks:');
  console.log(`   Sepolia:      ${sepoliaBlock}`);
  console.log(`   Base Sepolia: ${baseSepoliaBlock}`);
  
  // Bridge verification tips
  console.log('\n' + '='.repeat(60));
  console.log('✅ Bridge Verification Checklist:');
  console.log('='.repeat(60));
  console.log('');
  console.log('1. Check Base Sepolia Balance:');
  console.log('   - Go to: https://bridge.base.org');
  console.log('   - Connect your wallet');
  console.log('   - Look for pending or completed transfers');
  console.log('');
  console.log('2. View on Block Explorers:');
  console.log('   - Sepolia:       https://sepolia.etherscan.io/address/' + address);
  console.log('   - Base Sepolia:  https://sepolia.basescan.org/address/' + address);
  console.log('');
  console.log('3. Bridge Transaction Status:');
  console.log('   - Official Base Bridge: https://bridge.base.org');
  console.log('   - Look for your transaction in the bridge UI');
  console.log('');
  console.log('4. Expected Bridge Time:');
  console.log('   - Sepolia → Base Sepolia: 1-5 minutes');
  console.log('   - If longer than 10 min, check bridge status');
  console.log('');
  console.log('5. Gas Requirements:');
  console.log('   - Need Sepolia ETH for bridge transaction');
  console.log('   - Need Base Sepolia ETH for contract interactions');
  console.log('');
  console.log('='.repeat(60));
  console.log('💡 Quick Commands:');
  console.log('='.repeat(60));
  console.log('   Check balances:    npx hardhat run scripts/check-balances.js --network sepolia');
  console.log('   Verify bridge:     node scripts/verify-bridge.js');
  console.log('   View contracts:    npx hardhat run scripts/verify-contracts.js --network baseSepolia');
  console.log('='.repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error.message);
    process.exit(1);
  });
