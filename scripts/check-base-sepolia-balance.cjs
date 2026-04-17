const hre = require('hardhat');

async function main() {
  console.log('🔍 Checking Base Sepolia Deployment Status...\n');
  
  const [deployer] = await hre.ethers.getSigners();
  console.log('📍 Deployer Address:', deployer.address);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log('💰 Balance:', ethers.formatEther(balance), 'ETH');
  
  const network = await hre.ethers.provider.getNetwork();
  console.log('🌐 Network:', hre.network.name);
  console.log('🔗 Chain ID:', network.chainId);
  console.log('');
  
  const balanceEth = parseFloat(ethers.formatEther(balance));
  
  if (balanceEth < 0.01) {
    console.log('❌ Insufficient balance! You need at least 0.05 ETH');
    console.log('');
    console.log('📥 Get free Base Sepolia ETH from:');
    console.log('   - https://faucets.chain.link/base-sepolia');
    console.log('   - https://www.alchemy.com/faucets/base-sepolia');
    console.log('   - https://cloud.google.com/application/web3/faucet/ethereum/base-sepolia');
    process.exit(1);
  }
  
  console.log('✅ Balance sufficient for deployment');
  console.log('');
  console.log('📋 Ready to deploy to Base Sepolia testnet');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error.message);
    process.exit(1);
  });
