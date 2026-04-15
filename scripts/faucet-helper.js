// Browser Console Helper for dWallet Faucets
// Paste this in browser console (F12) to get quick faucet links

(function() {
  const WALLET_ADDRESS = '0x5d5af2f531a46afe719dadc5830e899d4d066447'
  
  const FAUCETS = {
    sepolia: [
      { name: 'Alchemy Faucet', url: 'https://sepoliafaucet.com/', delay: 24 * 60 * 60 * 1000 },
      { name: 'Chainlink Faucet', url: 'https://faucets.chain.link/sepolia', delay: 24 * 60 * 60 * 1000 },
      { name: 'Infura Faucet', url: 'https://www.infura.io/faucet/sepolia', delay: 24 * 60 * 60 * 1000 },
    ],
    baseSepolia: [
      { name: 'Base Faucet', url: 'https://faucets.chain.link/base-sepolia', delay: 24 * 60 * 60 * 1000 },
      { name: 'Coinbase Faucet', url: 'https://faucet.base.org/', delay: 24 * 60 * 60 * 1000 },
    ],
  }

  console.log('\n' + '='.repeat(60))
  console.log('🚰 dWallet Testnet Faucet Helper')
  console.log('='.repeat(60))
  console.log('\n💼 Wallet Address:', WALLET_ADDRESS)
  console.log('\n📋 Available Faucets:\n')

  Object.entries(FAUCETS).forEach(([network, faucets]) => {
    console.log(`\n${network.toUpperCase()}:`)
    faucets.forEach((faucet, index) => {
      const lastUsed = localStorage.getItem(`faucet_${network}_${index}_lastUsed`)
      const canUseNow = !lastUsed || (Date.now() - parseInt(lastUsed)) > faucet.delay
      
      console.log(`  ${index + 1}. ${faucet.name}`)
      console.log(`     URL: ${faucet.url}`)
      console.log(`     Status: ${canUseNow ? '✅ Available' : '⏳ Wait ' + Math.round((faucet.delay - (Date.now() - parseInt(lastUsed))) / (60 * 60 * 1000)) + ' hours'}`)
    })
  })

  console.log('\n\n📖 Commands:')
  console.log('  openFaucet("sepolia", 0)     - Open first Sepolia faucet')
  console.log('  openFaucet("baseSepolia", 1) - Open second Base faucet')
  console.log('  listFaucets()                - Show this info again')
  console.log('  checkBalances()              - Check wallet balances on all networks')

  window.openFaucet = function(network, index) {
    const faucets = FAUCETS[network]
    if (!faucets || !faucets[index]) {
      console.error('❌ Invalid network or index')
      return
    }
    
    const faucet = faucets[index]
    const lastUsed = localStorage.getItem(`faucet_${network}_${index}_lastUsed`)
    const canUseNow = !lastUsed || (Date.now() - parseInt(lastUsed)) > faucet.delay
    
    if (!canUseNow) {
      const hoursLeft = Math.round((faucet.delay - (Date.now() - parseInt(lastUsed))) / (60 * 60 * 1000))
      console.error(`⏳ Please wait ${hoursLeft} more hours before using this faucet again`)
      return
    }
    
    console.log(`🚰 Opening ${faucet.name}...`)
    console.log('💡 Copy your address:', WALLET_ADDRESS)
    window.open(faucet.url, '_blank', 'width=800,height=600')
    
    // Track usage (for user's own reference)
    localStorage.setItem(`faucet_${network}_${index}_lastUsed`, Date.now().toString())
  }

  window.checkBalances = async function() {
    const INFURA_KEY = '83c1e84032b24b0cb759b8e9fce69893'
    const networks = {
      ethereum: `https://mainnet.infura.io/v3/${INFURA_KEY}`,
      sepolia: `https://sepolia.infura.io/v3/${INFURA_KEY}`,
      base: 'https://mainnet.base.org',
      baseSepolia: 'https://sepolia.base.org',
    }
    
    console.log('\n🔍 Checking balances...\n')
    
    for (const [name, rpcUrl] of Object.entries(networks)) {
      try {
        const response = await fetch(rpcUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'eth_getBalance',
            params: [WALLET_ADDRESS, 'latest']
          })
        })
        
        const data = await response.json()
        const balance = parseInt(data.result, 16) / 1e18
        console.log(`${name.toUpperCase()}: ${balance.toFixed(6)} ETH`)
      } catch (error) {
        console.log(`${name.toUpperCase()}: Error checking balance`)
      }
    }
  }

  window.listFaucets = function() {
    // Re-run the display logic
    location.reload() // Hacky but works
  }

  console.log('\n✨ Helper loaded! Use the commands above.')
  console.log('='.repeat(60) + '\n')
})()
