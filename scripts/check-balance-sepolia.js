import * as ethers from 'ethers';

// Base Sepolia RPC
const RPC_URL = 'https://sepolia.base.org';
const provider = new ethers.JsonRpcProvider(RPC_URL);

// Addresses
const TOKEN_ADDRESS = '0x3400b0167dA5b2dba0b88b9604eE7df4BFc1f1fa';
const WALLET_ADDRESS = '0x4C0B7314441dfE8E61267C0d87Fc1A657611dCf5';

// Simple ERC20 ABI for balance check
const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function name() view returns (string)',
  'function totalSupply() view returns (uint256)'
];

async function checkBalances() {
  console.log('🔍 Checking balances on Base Sepolia...\n');
  console.log(`Network: Base Sepolia`);
  console.log(`Wallet: ${WALLET_ADDRESS}\n`);

  try {
    // Check ETH balance
    const ethBalance = await provider.getBalance(WALLET_ADDRESS);
    const ethBalanceFormatted = ethers.formatEther(ethBalance);
    console.log(`💰 ETH Balance: ${ethBalanceFormatted} ETH\n`);

    // Check token balance
    const tokenContract = new ethers.Contract(TOKEN_ADDRESS, ERC20_ABI, provider);
    
    const [balance, decimals, symbol, name, totalSupply] = await Promise.all([
      tokenContract.balanceOf(WALLET_ADDRESS),
      tokenContract.decimals(),
      tokenContract.symbol(),
      tokenContract.name(),
      tokenContract.totalSupply()
    ]);

    const tokenBalanceFormatted = ethers.formatUnits(balance, decimals);
    const totalSupplyFormatted = ethers.formatUnits(totalSupply, decimals);

    console.log(`🪙 Token Details:`);
    console.log(`   Name: ${name}`);
    console.log(`   Symbol: ${symbol}`);
    console.log(`   Decimals: ${decimals}`);
    console.log(`   Contract: ${TOKEN_ADDRESS}`);
    console.log(`\n💵 Token Balance: ${parseFloat(tokenBalanceFormatted).toLocaleString()} ${symbol}`);
    console.log(`📊 Total Supply: ${parseFloat(totalSupplyFormatted).toLocaleString()} ${symbol}`);

    // Check if balance matches 1M transfer
    const balanceNumber = parseFloat(tokenBalanceFormatted);
    if (balanceNumber >= 1000000) {
      console.log(`\n✅ Balance confirms receipt of 1M+ tokens!`);
    } else {
      console.log(`\n⚠️  Balance is less than 1M tokens`);
    }

  } catch (error) {
    console.error('❌ Error checking balances:', error.message);
    console.error('\nTrying alternative token address...');
    
    // Try the alternative token address from deployment file
    const ALT_TOKEN_ADDRESS = '0x769F23dd0F6bc92C9d9d914190Ae9006d3FbDe48';
    try {
      const altTokenContract = new ethers.Contract(ALT_TOKEN_ADDRESS, ERC20_ABI, provider);
      const balance = await altTokenContract.balanceOf(WALLET_ADDRESS);
      const decimals = await altTokenContract.decimals();
      const symbol = await altTokenContract.symbol();
      const name = await altTokenContract.name();
      
      const tokenBalanceFormatted = ethers.formatUnits(balance, decimals);
      
      console.log(`\n🪙 Alternative Token Found:`);
      console.log(`   Name: ${name}`);
      console.log(`   Symbol: ${symbol}`);
      console.log(`   Contract: ${ALT_TOKEN_ADDRESS}`);
      console.log(`   Balance: ${parseFloat(tokenBalanceFormatted).toLocaleString()} ${symbol}`);
    } catch (altError) {
      console.error('❌ Alternative token also failed:', altError.message);
    }
  }
}

checkBalances()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });