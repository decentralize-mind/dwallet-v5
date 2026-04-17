const hre = require('hardhat');
const fs = require('fs');
const path = require('path');

async function main() {
  console.log('📊 dWallet v5 - Base Sepolia Deployment Status\n');
  console.log('═'.repeat(60));
  
  const [deployer] = await hre.ethers.getSigners();
  console.log('👤 Deployer:', deployer.address);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log('💰 Balance:', ethers.formatEther(balance), 'ETH');
  
  const network = await hre.ethers.provider.getNetwork();
  console.log('🌐 Network:', hre.network.name, '(Chain ID:', network.chainId, ')');
  console.log('');
  
  // Find all deployment files
  const deploymentDir = path.join(__dirname, '..');
  const files = fs.readdirSync(deploymentDir);
  const deploymentFiles = files.filter(f => f.startsWith('deployment-') && f.endsWith('.json'));
  
  if (deploymentFiles.length === 0) {
    console.log('❌ No deployment files found');
    return;
  }
  
  console.log('📁 Found', deploymentFiles.length, 'deployment file(s)\n');
  
  for (const file of deploymentFiles) {
    const filePath = path.join(deploymentDir, file);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    console.log('╔' + '═'.repeat(58) + '╗');
    console.log('║', (file).padEnd(56), '║');
    console.log('╠' + '═'.repeat(58) + '╣');
    console.log('║', 'Network:', data.network.padEnd(46), '║');
    console.log('║', 'Deployer:', data.deployer.padEnd(47), '║');
    console.log('║', 'Timestamp:', data.timestamp.padEnd(46), '║');
    console.log('╠' + '═'.repeat(58) + '╣');
    console.log('║', 'CONTRACTS'.padEnd(56), '║');
    console.log('╠' + '═'.repeat(58) + '╣');
    
    if (data.contracts) {
      for (const [name, address] of Object.entries(data.contracts)) {
        const paddedName = name.padEnd(15);
        const explorerUrl = `https://sepolia.basescan.org/address/${address}`;
        console.log('║', `${paddedName} ${address}`.padEnd(56), '║');
        console.log('║', `  🔗 ${explorerUrl}`.padEnd(56), '║');
      }
    }
    
    console.log('╚' + '═'.repeat(58) + '╝');
    console.log('');
  }
  
  // Summary
  console.log('📋 DEPLOYMENT SUMMARY');
  console.log('═'.repeat(60));
  console.log('');
  console.log('✅ Already Deployed on Base Sepolia:');
  console.log('   • Layer 7 - Security Controller');
  console.log('   • Layer 9 - Ecosystem (Lending, NFT, DEX, etc.)');
  console.log('');
  console.log('🔧 Ready to Deploy:');
  console.log('   • Layer 1 - Core (Token, Governance, Timelock)');
  console.log('   • Layer 2 - DEX & Oracle');
  console.log('   • Layer 3 - Infrastructure');
  console.log('   • Layer 4 - Staking');
  console.log('   • Layer 5 - Cross-Chain Hub');
  console.log('   • Layer 6 - Treasury & Vesting');
  console.log('   • Layer 8 - Multichain Bridge');
  console.log('   • Layer 10 - Advanced DeFi');
  console.log('');
  console.log('💡 Next Steps:');
  console.log('   1. Review deployed contracts on BaseScan');
  console.log('   2. Test existing functionality');
  console.log('   3. Deploy missing layers as needed');
  console.log('   4. Configure cross-chain bridges');
  console.log('');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  });
