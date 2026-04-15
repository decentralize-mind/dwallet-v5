// Quick diagnostic script to check wallet balance and gas costs
const { ethers } = require('ethers')

async function checkWallet() {
  const WALLET_ADDRESS = '0x5d5af2f531a46afe719dadc5830e899d4d066447'
  const INFURA_KEY = '83c1e84032b24b0cb759b8e9fce69893'
  
  // Check different networks
  const networks = {
    ethereum: `https://mainnet.infura.io/v3/${INFURA_KEY}`,
    sepolia: `https://sepolia.infura.io/v3/${INFURA_KEY}`,
    base: 'https://mainnet.base.org',
    baseSepolia: 'https://sepolia.base.org',
  }
  
  console.log('\n🔍 Checking wallet:', WALLET_ADDRESS)
  console.log('═'.repeat(60))
  
  for (const [name, rpcUrl] of Object.entries(networks)) {
    try {
      const provider = new ethers.JsonRpcProvider(rpcUrl)
      const balance = await provider.getBalance(WALLET_ADDRESS)
      const feeData = await provider.getFeeData()
      
      const ethBalance = parseFloat(ethers.formatEther(balance))
      const gasPrice = parseFloat(ethers.formatUnits(feeData.maxFeePerGas || feeData.gasPrice, 'gwei'))
      const estimatedGasCost = 21000 * gasPrice / 1e9 // 21k gas limit for simple transfer
      
      console.log(`\n${name.toUpperCase()}:`)
      console.log(`  Balance: ${ethBalance.toFixed(6)} ETH`)
      console.log(`  Gas Price: ${gasPrice.toFixed(2)} Gwei`)
      console.log(`  Est. Transfer Cost: ~${estimatedGasCost.toFixed(6)} ETH`)
      console.log(`  Can Send Max: ~${Math.max(0, ethBalance - estimatedGasCost).toFixed(6)} ETH`)
      
      if (ethBalance > 0 && ethBalance < estimatedGasCost) {
        console.log(`  ⚠️  WARNING: Balance too low to cover gas!`)
      } else if (ethBalance === 0) {
        console.log(`  ❌ No funds on this network`)
      } else {
        console.log(`  ✅ Has funds`)
      }
    } catch (error) {
      console.log(`\n${name.toUpperCase()}: Error - ${error.message}`)
    }
  }
  
  console.log('\n' + '═'.repeat(60))
  console.log('\n💡 To send 0.01 ETH, you need:')
  console.log('   Transfer amount: 0.01 ETH')
  console.log('   Plus gas fees: ~0.0004-0.001 ETH (varies by network congestion)')
  console.log('   Total needed: ~0.0104-0.011 ETH\n')
}

checkWallet().catch(console.error)
