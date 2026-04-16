const { ethers } = require('hardhat');

async function main() {
  const address = '0x0e82e924FD6B402fF146d36756d6119C17912363';
  
  console.log('🔍 Checking balances for address:', address);
  console.log('='.repeat(60));
  
  // Check Sepolia balance
  console.log('\n📍 Sepolia Testnet (Chain ID: 11155111)');
  const sepoliaProvider = new ethers.JsonRpcProvider(
    `https://sepolia.infura.io/v3/${process.env.INFURA_KEY}`
  );
  
  try {
    const sepoliaBalance = await sepoliaProvider.getBalance(address);
    const sepoliaBalanceEth = ethers.formatEther(sepoliaBalance);
    console.log(`   Balance: ${sepoliaBalanceEth} ETH`);
    console.log(`   Raw: ${sepoliaBalance.toString()} wei`);
  } catch (error) {
    console.error('   ❌ Error fetching Sepolia balance:', error.message);
  }
  
  // Check Base Sepolia balance
  console.log('\n📍 Base Sepolia Testnet (Chain ID: 84532)');
  const baseSepoliaProvider = new ethers.JsonRpcProvider('https://sepolia.base.org');
  
  try {
    const baseSepoliaBalance = await baseSepoliaProvider.getBalance(address);
    const baseSepoliaBalanceEth = ethers.formatEther(baseSepoliaBalance);
    console.log(`   Balance: ${baseSepoliaBalanceEth} ETH`);
    console.log(`   Raw: ${baseSepoliaBalance.toString()} wei`);
  } catch (error) {
    console.error('   ❌ Error fetching Base Sepolia balance:', error.message);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('💡 Next Steps:');
  console.log('   1. If Sepolia balance > 0: Use https://bridge.base.org to bridge to Base Sepolia');
  console.log('   2. Wait 1-5 minutes for bridge to complete');
  console.log('   3. Verify Base Sepolia balance increased');
  console.log('='.repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
