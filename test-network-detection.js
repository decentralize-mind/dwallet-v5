/**
 * Test script for automatic network detection
 * Run this in browser console to verify functionality
 */

console.log('🧪 Testing Automatic Network Detection...\n')

// Test 1: Check if window.ethereum is available
console.log('Test 1: Browser Wallet Detection')
console.log('window.ethereum available:', !!window.ethereum)
console.log('')

// Test 2: Get current chain ID
async function testChainId() {
  console.log('Test 2: Current Chain ID')
  if (!window.ethereum) {
    console.log('❌ No browser wallet detected')
    return
  }

  try {
    const chainId = await window.ethereum.request({ 
      method: 'eth_chainId' 
    })
    const chainIdNumber = parseInt(chainId, 16)
    console.log('✅ Chain ID (hex):', chainId)
    console.log('✅ Chain ID (number):', chainIdNumber)
    
    // Map to network name
    const networkMap = {
      1: 'Ethereum Mainnet',
      11155111: 'Sepolia Testnet',
      84532: 'Base Sepolia',
      8453: 'Base Mainnet',
      56: 'BNB Chain',
      137: 'Polygon',
      42161: 'Arbitrum',
      10: 'Optimism',
      43114: 'Avalanche',
    }
    
    const networkName = networkMap[chainIdNumber] || 'Unknown Network'
    console.log('✅ Network:', networkName)
  } catch (err) {
    console.log('❌ Failed to get chain ID:', err.message)
  }
}

// Test 3: Test chain ID to key conversion
function testChainIdConversion() {
  console.log('\nTest 3: Chain ID Conversion')
  
  const testCases = [
    { input: '0x1', expected: 'ethereum' },
    { input: '0x13881', expected: 'sepolia' },
    { input: '0x14a34', expected: 'baseSepolia' },
    { input: '0x2105', expected: 'base' },
    { input: '0x38', expected: 'bnb' },
    { input: '0x89', expected: 'polygon' },
    { input: 1, expected: 'ethereum' },
    { input: 11155111, expected: 'sepolia' },
  ]
  
  // Import the utility function (if available in your build)
  // For testing, we'll implement it inline
  const CHAIN_ID_TO_KEY = {
    1: 'ethereum',
    11155111: 'sepolia',
    84532: 'baseSepolia',
    8453: 'base',
    56: 'bnb',
    137: 'polygon',
    42161: 'arbitrum',
    10: 'optimism',
    43114: 'avalanche',
  }
  
  function chainIdToKey(chainId) {
    const chainIdNumber = typeof chainId === 'string' 
      ? parseInt(chainId, 16) 
      : chainId
    return CHAIN_ID_TO_KEY[chainIdNumber] || null
  }
  
  testCases.forEach(({ input, expected }) => {
    const result = chainIdToKey(input)
    const passed = result === expected
    console.log(`${passed ? '✅' : '❌'} ${input} → ${result} ${passed ? '' : `(expected: ${expected})`}`)
  })
}

// Test 4: Listen for chain changes
function testChainChangeListener() {
  console.log('\nTest 4: Chain Change Listener')
  if (!window.ethereum) {
    console.log('❌ No browser wallet detected')
    return
  }
  
  console.log('✅ Setting up chain change listener...')
  console.log('💡 Try switching networks in your wallet now!')
  
  window.ethereum.on('chainChanged', (chainId) => {
    const chainIdNumber = parseInt(chainId, 16)
    console.log('🔄 Network changed!')
    console.log('   Chain ID (hex):', chainId)
    console.log('   Chain ID (number):', chainIdNumber)
  })
  
  console.log('✅ Listener active')
}

// Run all tests
async function runAllTests() {
  await testChainId()
  testChainIdConversion()
  testChainChangeListener()
  
  console.log('\n✅ All tests completed!')
  console.log('💡 Switch networks in your wallet to see real-time detection')
}

// Export for use
window.testNetworkDetection = runAllTests

console.log('📝 Run all tests: testNetworkDetection()')
console.log('📝 Test chain ID only: testChainId()')
console.log('📝 Test conversion only: testChainIdConversion()')
console.log('📝 Test listener only: testChainChangeListener()')
console.log('')
