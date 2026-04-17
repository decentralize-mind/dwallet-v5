import * as ethers from 'ethers';

// Base Sepolia RPC
const RPC_URL = 'https://sepolia.base.org';
const provider = new ethers.JsonRpcProvider(RPC_URL);

// Addresses
const TOKEN_ADDRESS = '0x3400b0167dA5b2dba0b88b9604eE7df4BFc1f1fa';
const WALLET_ADDRESS = '0x4C0B7314441dfE8E61267C0d87Fc1A657611dCf5';

// ERC20 Transfer event signature
const TRANSFER_EVENT = 'Transfer(address,address,uint256)';

async function getRecentTransfers() {
  console.log('🔍 Fetching recent token transfers...\n');
  console.log(`Wallet: ${WALLET_ADDRESS}`);
  console.log(`Token: ${TOKEN_ADDRESS}\n`);

  try {
    // Get the latest block number
    const latestBlock = await provider.getBlockNumber();
    console.log(`Current Block: ${latestBlock}\n`);

    // Look back 10000 blocks (approximately last ~14 hours)
    const fromBlock = latestBlock - 10000;

    // Filter for Transfer events involving this wallet
    const filter = {
      address: TOKEN_ADDRESS,
      topics: [
        ethers.id(TRANSFER_EVENT)
      ],
      fromBlock: fromBlock,
      toBlock: latestBlock
    };

    const logs = await provider.getLogs(filter);
    
    console.log(`Found ${logs.length} transfer events in last 10000 blocks\n`);

    // Filter transfers involving our wallet
    const relevantTransfers = [];
    
    for (const log of logs) {
      const parsed = ethers.AbiCoder.defaultAbiCoder().decode(
        ['address', 'address', 'uint256'],
        log.data
      );
      
      const from = parsed[0];
      const to = parsed[1];
      const amount = parsed[2];

      // Check if wallet is involved
      if (from.toLowerCase() === WALLET_ADDRESS.toLowerCase() || 
          to.toLowerCase() === WALLET_ADDRESS.toLowerCase()) {
        
        // Get block details
        const block = await provider.getBlock(log.blockNumber);
        const date = new Date(block.timestamp * 1000);
        
        // Get token decimals
        const tokenContract = new ethers.Contract(
          TOKEN_ADDRESS,
          ['function decimals() view returns (uint8)', 'function symbol() view returns (string)'],
          provider
        );
        
        const decimals = await tokenContract.decimals();
        const symbol = await tokenContract.symbol();
        const formattedAmount = ethers.formatUnits(amount, decimals);

        relevantTransfers.push({
          blockNumber: log.blockNumber,
          timestamp: date.toISOString(),
          from: from,
          to: to,
          amount: formattedAmount,
          symbol: symbol,
          txHash: log.transactionHash,
          isIncoming: to.toLowerCase() === WALLET_ADDRESS.toLowerCase()
        });
      }
    }

    // Sort by block number (most recent first)
    relevantTransfers.sort((a, b) => b.blockNumber - a.blockNumber);

    // Display transfers
    if (relevantTransfers.length === 0) {
      console.log('⚠️  No recent transfers found in last 10000 blocks');
      console.log('\nTo view all transfers, check:');
      console.log(`https://sepolia.basescan.org/address/${WALLET_ADDRESS}`);
    } else {
      console.log(`📝 Recent Transfers (${relevantTransfers.length} found):\n`);
      
      relevantTransfers.slice(0, 10).forEach((transfer, index) => {
        const arrow = transfer.isIncoming ? '📥 IN' : '📤 OUT';
        console.log(`${index + 1}. ${arrow} ${parseFloat(transfer.amount).toLocaleString()} ${transfer.symbol}`);
        console.log(`   From: ${transfer.from}`);
        console.log(`   To: ${transfer.to}`);
        console.log(`   Time: ${transfer.timestamp}`);
        console.log(`   Block: ${transfer.blockNumber}`);
        console.log(`   TX: https://sepolia.basescan.org/tx/${transfer.txHash}`);
        console.log('');
      });

      if (relevantTransfers.length > 10) {
        console.log(`... and ${relevantTransfers.length - 10} more transfers\n`);
      }
    }

  } catch (error) {
    console.error('❌ Error fetching transfers:', error.message);
    console.error('\nYou can manually check transfers at:');
    console.log(`https://sepolia.basescan.org/address/${WALLET_ADDRESS}`);
  }
}

getRecentTransfers()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
