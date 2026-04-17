import * as ethers from 'ethers';

const RPC_URL = 'https://sepolia.base.org';
const provider = new ethers.JsonRpcProvider(RPC_URL);

const TOKEN_ADDRESS = '0x769F23dd0F6bc92C9d9d914190Ae9006d3FbDe48';
const WALLET_ADDRESS = '0x4C0B7314441dfE8E61267C0d87Fc1A657611dCf5';

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function name() view returns (string)'
];

async function verify() {
  console.log('✅ Verifying 500K DWT tokens...\n');
  
  const tokenContract = new ethers.Contract(TOKEN_ADDRESS, ERC20_ABI, provider);
  const [balance, decimals, symbol, name] = await Promise.all([
    tokenContract.balanceOf(WALLET_ADDRESS),
    tokenContract.decimals(),
    tokenContract.symbol(),
    tokenContract.name()
  ]);
  
  const balanceFormatted = ethers.formatUnits(balance, decimals);
  
  console.log(`Token: ${name} (${symbol})`);
  console.log(`Contract: ${TOKEN_ADDRESS}`);
  console.log(`Wallet: ${WALLET_ADDRESS}`);
  console.log(`\n💰 Balance: ${parseFloat(balanceFormatted).toLocaleString()} ${symbol}`);
  
  if (parseFloat(balanceFormatted) >= 500000) {
    console.log('\n✅ VERIFIED! You have 500K+ DWT tokens ready for Layer 5 deployment!');
  } else {
    console.log('\n⚠️  Balance is less than expected');
  }
}

verify()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
