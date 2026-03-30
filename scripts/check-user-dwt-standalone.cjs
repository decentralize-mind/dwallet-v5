const { ethers } = require('ethers');

async function main() {
  const RPC_URL = 'https://sepolia.base.org';
  const DWT_ADDR = '0xcDa9a9C0FC151Af06C8Fde002563133b86D45123';
  
  console.log('Connecting to Base Sepolia...');
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  
  const ERC20_ABI = [
    'function name() view returns (string)',
    'function symbol() view returns (string)',
    'function decimals() view returns (uint8)',
    'function totalSupply() view returns (uint256)',
    'function balanceOf(address) view returns (uint256)',
    'function owner() view returns (address)'
  ];

  console.log('Checking DWT contract at:', DWT_ADDR);
  
  try {
    const code = await provider.getCode(DWT_ADDR);
    if (code === '0x') {
      console.error('ERROR: No contract found at this address on Base Sepolia!');
      return;
    }

    const DWT = new ethers.Contract(DWT_ADDR, ERC20_ABI, provider);
    
    const [name, symbol, decimals, supply] = await Promise.all([
      DWT.name().catch(() => 'Unknown'),
      DWT.symbol().catch(() => 'Unknown'),
      DWT.decimals().catch(() => 18),
      DWT.totalSupply().catch(() => 0n)
    ]);
    
    console.log('--- Contract Details ---');
    console.log('Name:', name);
    console.log('Symbol:', symbol);
    console.log('Decimals:', decimals);
    console.log('Total Supply:', ethers.formatUnits(supply, decimals));
    
    try {
        const owner = await DWT.owner();
        console.log('Owner:', owner);
    } catch (e) {
        console.log('Owner: (not ownable or function missing)');
    }
    
  } catch (err) {
    console.error('Error checking contract:', err.message);
  }
}

main().catch(console.error);
