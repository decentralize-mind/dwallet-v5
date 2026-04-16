const { ethers } = require('hardhat');

/**
 * Wallet Setup Script for Base Sepolia
 * 
 * This script verifies your wallet setup and provides configuration
 * details for interacting with deployed contracts on Base Sepolia.
 */

async function main() {
  const address = '0x0e82e924FD6B402fF146d36756d6119C17912363';
  
  console.log('🔐 Wallet Setup for Base Sepolia');
  console.log('='.repeat(70));
  console.log('Wallet Address:', address);
  console.log('='.repeat(70));
  
  // Setup Base Sepolia provider
  const baseSepoliaProvider = new ethers.JsonRpcProvider('https://sepolia.base.org');
  
  // Get wallet balance
  console.log('\n💰 Current Balance:');
  const balance = await baseSepoliaProvider.getBalance(address);
  const balanceEth = ethers.formatEther(balance);
  console.log(`   ${balanceEth} ETH`);
  
  // Get network info
  const network = await baseSepoliaProvider.getNetwork();
  console.log('\n🌐 Network Information:');
  console.log(`   Network Name: Base Sepolia`);
  console.log(`   Chain ID: ${network.chainId}`);
  console.log(`   RPC URL: https://sepolia.base.org`);
  
  // Wallet configuration for MetaMask
  console.log('\n' + '='.repeat(70));
  console.log('📱 MetaMask Configuration:');
  console.log('='.repeat(70));
  console.log('');
  console.log('Network Name:         Base Sepolia');
  console.log('RPC URL:              https://sepolia.base.org');
  console.log('Chain ID:             84532');
  console.log('Currency Symbol:      ETH');
  console.log('Block Explorer URL:   https://sepolia.basescan.org');
  console.log('');
  
  // Deployed contracts on Base Sepolia
  console.log('\n' + '='.repeat(70));
  console.log('📦 Your Deployed Contracts on Base Sepolia:');
  console.log('='.repeat(70));
  console.log('');
  console.log('Layer 6 - Treasury & Fees:');
  console.log('   Treasury Vault:       0x583d99aDc3918980DDE95d3EB6a2Bad895340C05');
  console.log('   Fee Splitter:         0xf96DC0a8103fC9911bDB9EDa14E0257fa5dD355b');
  console.log('   Buyback & Burn:       0x7Fb8E292Af468df19d6c5dD6964657A1b7c888d1');
  console.log('   Vesting Contract:     0xFDC9343BE7AB0B828d4a458aF54D6b4f6d76d7Ed');
  console.log('');
  console.log('Layer 7 - Security:');
  console.log('   Security Module:      0xA43879bADD1444DD33c27e644E738757DC0792b5');
  console.log('');
  console.log('Layer 8 - Multichain:');
  console.log('   Bridge Gateway:       0xc8249c5fe1e6D977728d8e315D6003D7D7289275');
  console.log('   Staking Hub:          0x5664Dc5966b738693532cb7739fbd99e9Fa02b49');
  console.log('   Governance Hub:       0xAE38f9bFF6B495aC9da05B670D83CC07E621bA79');
  console.log('   Bridged Token:        0x6C1c722E4Df7FaE164E7A5007E935B130676f05B');
  console.log('');
  console.log('Layer 9 - Ecosystem:');
  console.log('   NFT Membership:       0x43cC5E18E321364d343a8539AAAb42A93d460437');
  console.log('   Lending Market:       0x941bCb6f6E863fA5313D470F3fDe2A8989339FD5');
  console.log('   Launchpad:            0x1cA5667EAA2684384420f26D635Cb97B2805c67B');
  console.log('   Affiliate Rewards:    0xF333898531ba2D69BD68ac17d9329C8147267316');
  console.log('');
  console.log('Layer 10 - Advanced DeFi:');
  console.log('   Mock USDC:            0xeE163C1D75C13ca3A53620310c795d70E92B0036');
  console.log('   DWT Oracle:           0x7dB636545a021EDc5332df39a5d0dE03855A4528');
  console.log('   Options:              0xF982A3377d44Fa5B9598197d99549E077A60B8ad');
  console.log('   Perpetuals:           0x2898809010C38F2028e98Eb8a9FB779F73bca1E8');
  console.log('   Prediction Market:    0x8b25Cf293a46bD43B663daD0e511a5707f4833cF');
  console.log('   Yield Vault:          0xfa1c4E79AEc8797328D22D8cFF8baCa4E0DB5305');
  console.log('');
  
  // Quick verification steps
  console.log('\n' + '='.repeat(70));
  console.log('✅ Verification Steps:');
  console.log('='.repeat(70));
  console.log('');
  console.log('1. Add Base Sepolia to MetaMask (use config above)');
  console.log('2. Switch to Base Sepolia network');
  console.log('3. Bridge ETH from Sepolia → Base Sepolia:');
  console.log('   https://bridge.base.org');
  console.log('4. Verify balance appears in MetaMask');
  console.log('5. View your contracts on BaseScan:');
  console.log('   https://sepolia.basescan.org/address/' + address);
  console.log('');
  
  // Next steps
  console.log('\n' + '='.repeat(70));
  console.log('🚀 Next Steps After Bridging:');
  console.log('='.repeat(70));
  console.log('');
  console.log('1. Interact with Contracts:');
  console.log('   npx hardhat run scripts/interact.js --network baseSepolia');
  console.log('');
  console.log('2. View All Contract Details:');
  console.log('   npx hardhat run scripts/verify-contracts.js --network baseSepolia');
  console.log('');
  console.log('3. Test Contract Functions:');
  console.log('   Use MetaMask + BaseScan to interact with contracts');
  console.log('');
  console.log('='.repeat(70));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error.message);
    process.exit(1);
  });
