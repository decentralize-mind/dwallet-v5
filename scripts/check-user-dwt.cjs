const { ethers } = require('hardhat');

async function main() {
  const DWT_ADDR = '0xcDa9a9C0FC151Af06C8Fde002563133b86D45123';
  console.log('Checking DWT contract at:', DWT_ADDR);
  
  try {
    const DWT = await ethers.getContractAt('IERC20', DWT_ADDR);
    const supply = await DWT.totalSupply();
    const decimals = await DWT.decimals();
    const name = await DWT.name();
    const symbol = await DWT.symbol();
    
    console.log('Name:', name);
    console.log('Symbol:', symbol);
    console.log('Decimals:', decimals);
    console.log('Total Supply:', ethers.formatUnits(supply, decimals));
    
    // Check if it has an owner (Ownable)
    try {
        const owner = await DWT.owner();
        console.log('Owner:', owner);
    } catch (e) {
        console.log('Owner function not found (Contract might not be Ownable)');
    }
    
  } catch (err) {
    console.error('Error checking contract:', err.message);
  }
}

main().catch(console.error);
