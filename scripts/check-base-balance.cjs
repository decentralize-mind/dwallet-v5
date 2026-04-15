// Check actual on-chain balance for specific wallet
const { ethers } = require('ethers')

async function checkBaseSepoliaBalance() {
  const WALLET = '0x5d5af2f531a46afe719dadc5830e899d4d066447'
  
  // Base Sepolia RPC endpoints
  const rpcUrls = [
    'https://sepolia.base.org',
    'https://base-sepolia-rpc.publicnode.com',
  ]
  
  console.log('\n🔍 Checking Base Sepolia Balance')
  console.log('Wallet:', WALLET)
  console.log('='.repeat(60))
  
  for (const rpcUrl of rpcUrls) {
    try {
      console.log(`\nTrying: ${rpcUrl}`)
      const provider = new ethers.JsonRpcProvider(rpcUrl)
      
      // Get balance
      const balance = await provider.getBalance(WALLET)
      const ethBalance = parseFloat(ethers.formatEther(balance))
      
      // Get transaction count (to see if wallet is active)
      const txCount = await provider.getTransactionCount(WALLET)
      
      // Get current gas price
      const feeData = await provider.getFeeData()
      const gasPrice = parseFloat(ethers.formatUnits(feeData.maxFeePerGas || feeData.gasPrice, 'gwei'))
      
      console.log(`  ✅ Balance: ${ethBalance.toFixed(8)} ETH`)
      console.log(`  📊 Transaction Count: ${txCount}`)
      console.log(`  ⛽ Gas Price: ${gasPrice.toFixed(2)} Gwei`)
      console.log(`  💰 Can Send Max: ~${Math.max(0, ethBalance - (21000 * gasPrice / 1e9)).toFixed(6)} ETH`)
      
      // Check if balance is enough for typical transaction
      const estimatedGas = 21000 * gasPrice / 1e9
      if (ethBalance > estimatedGas) {
        console.log(`  ✅ Has enough for transactions (need ~${estimatedGas.toFixed(6)} ETH for gas)`)
      } else {
        console.log(`  ❌ Balance too low for even basic transfer!`)
      }
      
      break // Success, no need to try other RPCs
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`)
    }
  }
  
  console.log('\n' + '='.repeat(60))
  console.log('\n💡 To check on block explorer:')
  console.log(`https://sepolia.basescan.org/address/${WALLET}\n`)
}

checkBaseSepoliaBalance().catch(console.error)
