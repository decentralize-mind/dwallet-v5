import * as ethers from 'ethers';

// Base Sepolia RPC
const RPC_URL = 'https://sepolia.base.org';
const provider = new ethers.JsonRpcProvider(RPC_URL);

// Alternative token address (from deployment file)
const TOKEN_ADDRESS = '0x769F23dd0F6bc92C9d9d914190Ae9006d3FbDe48';
const WALLET_ADDRESS = '0x4C0B7314441dfE8E61267C0d87Fc1A657611dCf5';

const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function name() view returns (string)',
  'function totalSupply() view returns (uint256)'
];

async function checkAltTokenBalance() {
  console.log('🔍 Checking alternative token contract...\n');
  console.log(`Contract: ${TOKEN_ADDRESS}`);
  console.log(`Wallet: ${WALLET_ADDRESS}\n`);

  try {
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
    console.log(`\n💵 Your Balance: ${parseFloat(tokenBalanceFormatted).toLocaleString()} ${symbol}`);
    console.log(`📊 Total Supply: ${parseFloat(totalSupplyFormatted).toLocaleString()} ${symbol}`);

    const balanceNumber = parseFloat(tokenBalanceFormatted);
    if (balanceNumber >= 1000000) {
      console.log(`\n✅ Balance confirms 1M+ tokens!`);
    } else if (balanceNumber > 0) {
      console.log(`\n⚠️  Balance is ${balanceNumber.toLocaleString()} tokens (less than 1M)`);
    } else {
      console.log(`\n❌ No tokens found in this contract`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkAltTokenBalance()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
