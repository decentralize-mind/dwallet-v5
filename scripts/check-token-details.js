import * as ethers from 'ethers';

// Base Sepolia RPC
const RPC_URL = 'https://sepolia.base.org';
const provider = new ethers.JsonRpcProvider(RPC_URL);

// Token addresses to check
const TOKEN_ADDRESSES = [
  '0x3400b0167dA5b2dba0b88b9604eE7df4BFc1f1fa',
  '0x769F23dd0F6bc92C9d9d914190Ae9006d3FbDe48'
];

// Extended ERC20 ABI
const ERC20_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
  'function owner() view returns (address)',
  'function balanceOf(address) view returns (uint256)',
  'function transfer(address,uint256) returns (bool)',
  'function allowance(address,address) view returns (uint256)',
  'function paused() view returns (bool)'
];

async function checkTokenDetails() {
  console.log('🔍 Checking token contract details on Base Sepolia...\n');

  for (const TOKEN_ADDRESS of TOKEN_ADDRESSES) {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`Contract: ${TOKEN_ADDRESS}`);
    console.log('='.repeat(70));

    try {
      const contract = new ethers.Contract(TOKEN_ADDRESS, ERC20_ABI, provider);

      // Get basic info
      const [name, symbol, decimals, totalSupply] = await Promise.all([
        contract.name(),
        contract.symbol(),
        contract.decimals(),
        contract.totalSupply()
      ]);

      const totalSupplyFormatted = ethers.formatUnits(totalSupply, decimals);

      console.log(`\n📋 Basic Information:`);
      console.log(`   Name: ${name}`);
      console.log(`   Symbol: ${symbol}`);
      console.log(`   Decimals: ${decimals}`);
      console.log(`   Total Supply: ${parseFloat(totalSupplyFormatted).toLocaleString()} ${symbol}`);

      // Try to get owner (if Ownable)
      try {
        const owner = await contract.owner();
        console.log(`   Owner: ${owner}`);
      } catch (e) {
        console.log(`   Owner: N/A (not Ownable or different pattern)`);
      }

      // Try to check if paused (if Pausable)
      try {
        const paused = await contract.paused();
        console.log(`   Paused: ${paused}`);
      } catch (e) {
        console.log(`   Paused: N/A (not Pausable)`);
      }

      // Get contract creation info
      const code = await provider.getCode(TOKEN_ADDRESS);
      const codeSize = code.length - 2; // Remove '0x' prefix
      console.log(`   Contract Size: ${codeSize} bytes`);

      // Check if contract is verified on Basescan
      console.log(`\n🔗 Verify on Base Sepolia Explorer:`);
      console.log(`   https://sepolia.basescan.org/address/${TOKEN_ADDRESS}`);

      // Check top holders
      console.log(`\n💼 Checking major holders...`);
      const addressesToCheck = [
        '0x4C0B7314441dfE8E61267C0d87Fc1A657611dCf5', // Your wallet
        '0xb5002AC3EE2f8d10f6dCB5F3a9070d625d8d4417', // DAO Treasury
        '0xd623AbBAc02cBB4984294c922E2f19bd3e98aF8d', // Community Rewards
        '0xC8F1A0DbC619CDCe46fbD5d5067a11Dc4dC81c5c', // Airdrop
        '0x6259648010922027A7ED105b3196FB63Dd4Beb9d'  // Liquidity
      ];

      console.log('\n📊 Top Address Balances:');
      for (const addr of addressesToCheck) {
        try {
          const balance = await contract.balanceOf(addr);
          const balanceFormatted = ethers.formatUnits(balance, decimals);
          const balanceNum = parseFloat(balanceFormatted);
          
          if (balanceNum > 0) {
            const percentage = (balanceNum / parseFloat(totalSupplyFormatted)) * 100;
            console.log(`   ${addr}`);
            console.log(`      Balance: ${balanceNum.toLocaleString()} ${symbol} (${percentage.toFixed(2)}%)`);
          }
        } catch (e) {
          // Skip if error
        }
      }

    } catch (error) {
      console.log(`\n⚠️  Error accessing contract: ${error.message}`);
      console.log(`   This address may not be a valid token contract`);
    }
  }

  console.log(`\n${'='.repeat(70)}`);
  console.log('✅ Token details check complete!');
  console.log('='.repeat(70));
}

checkTokenDetails()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
