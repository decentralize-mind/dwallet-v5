/**
 * Network Validation Test Script
 * Tests all network matching features
 */

import { 
  validateNetworkMatch, 
  detectRecipientNetwork, 
  getBridgeRecommendation,
  getNetworkInfo,
  isSameNetwork,
  isCompatibleNetwork,
  getMismatchSeverity
} from '../src/utils/networkValidation.js'

// Test data
const TEST_ADDRESS_1 = '0x1234567890123456789012345678901234567890'
const TEST_ADDRESS_2 = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd'

const mockTransactions = [
  { to: TEST_ADDRESS_1, chain: 'ethereum', amount: 1, timestamp: Date.now() - 86400000 },
  { to: TEST_ADDRESS_1, chain: 'ethereum', amount: 0.5, timestamp: Date.now() - 172800000 },
  { to: TEST_ADDRESS_1, chain: 'ethereum', amount: 2, timestamp: Date.now() - 259200000 },
  { to: TEST_ADDRESS_2, chain: 'base', amount: 100, timestamp: Date.now() - 86400000 },
]

console.log('\n═══════════════════════════════════════════════════')
console.log('   Network Validation Test Suite')
console.log('═══════════════════════════════════════════════════\n')

// Test 1: Same network validation
console.log('Test 1: Same Network Validation')
console.log('───────────────────────────────────────────────────')
const test1 = validateNetworkMatch({
  fromChain: 'ethereum',
  toChain: 'ethereum',
  recipientAddress: TEST_ADDRESS_1,
  transactionHistory: mockTransactions,
})
console.log('✓ Valid:', test1.valid)
console.log('✓ Can proceed:', test1.canProceed)
console.log('✓ Severity:', test1.severity.level)
console.log('✓ Errors:', test1.errors.length)
console.log('✓ Warnings:', test1.warnings.length)
console.log('')

// Test 2: Compatible networks (L1 -> L2)
console.log('Test 2: Compatible Networks (Ethereum -> Base)')
console.log('───────────────────────────────────────────────────')
const test2 = validateNetworkMatch({
  fromChain: 'ethereum',
  toChain: 'base',
  recipientAddress: TEST_ADDRESS_1,
  transactionHistory: mockTransactions,
})
console.log('✓ Valid:', test2.valid)
console.log('✓ Can proceed:', test2.canProceed)
console.log('✓ Severity:', test2.severity.level)
console.log('✓ Requires confirmation:', test2.requiresConfirmation)
console.log('✓ Warnings:', test2.warnings.length)
console.log('✓ Suggestions:', test2.suggestions.length)
if (test2.suggestions.length > 0) {
  console.log('  -', test2.suggestions[0])
}
console.log('')

// Test 3: Testnet to mainnet (should block)
console.log('Test 3: Testnet to Mainnet (Should Block)')
console.log('───────────────────────────────────────────────────')
const test3 = validateNetworkMatch({
  fromChain: 'sepolia',
  toChain: 'ethereum',
  recipientAddress: TEST_ADDRESS_1,
  transactionHistory: mockTransactions,
})
console.log('✓ Valid:', test3.valid)
console.log('✓ Can proceed:', test3.canProceed)
console.log('✓ Severity:', test3.severity.level)
console.log('✓ Block transfer:', test3.severity.blockTransfer)
console.log('✓ Errors:', test3.errors.length)
if (test3.errors.length > 0) {
  console.log('  -', test3.errors[0])
}
console.log('')

// Test 4: Different mainnets (warning)
console.log('Test 4: Different Mainnets (Ethereum -> BNB)')
console.log('───────────────────────────────────────────────────')
const test4 = validateNetworkMatch({
  fromChain: 'ethereum',
  toChain: 'bnb',
  recipientAddress: TEST_ADDRESS_1,
  transactionHistory: mockTransactions,
})
console.log('✓ Valid:', test4.valid)
console.log('✓ Can proceed:', test4.canProceed)
console.log('✓ Severity:', test4.severity.level)
console.log('✓ Warnings:', test4.warnings.length)
if (test4.warnings.length > 0) {
  console.log('  -', test4.warnings[0])
}
console.log('')

// Test 5: Detect recipient network
console.log('Test 5: Detect Recipient Network from History')
console.log('───────────────────────────────────────────────────')
const test5 = detectRecipientNetwork(TEST_ADDRESS_1, mockTransactions)
console.log('✓ Detected:', test5.detected)
console.log('✓ Likely chain:', test5.likelyChain)
console.log('✓ Confidence:', test5.confidence.toFixed(0) + '%')
console.log('✓ Transaction count:', test5.transactionCount)
console.log('✓ Message:', test5.message)
console.log('')

// Test 6: Bridge recommendation
console.log('Test 6: Bridge Recommendations')
console.log('───────────────────────────────────────────────────')
const bridge1 = getBridgeRecommendation('ethereum', 'base')
console.log('Ethereum -> Base:')
console.log('  ✓ Name:', bridge1?.name)
console.log('  ✓ URL:', bridge1?.url)
console.log('  ✓ Official:', bridge1?.official)

const bridge2 = getBridgeRecommendation('ethereum', 'arbitrum')
console.log('Ethereum -> Arbitrum:')
console.log('  ✓ Name:', bridge2?.name)
console.log('  ✓ URL:', bridge2?.url)
console.log('')

// Test 7: Network info
console.log('Test 7: Network Information')
console.log('───────────────────────────────────────────────────')
const networks = ['ethereum', 'base', 'sepolia', 'bnb', 'polygon']
networks.forEach(chain => {
  const info = getNetworkInfo(chain)
  console.log(`${chain}:`)
  console.log(`  Name: ${info.name}`)
  console.log(`  Type: ${info.type}`)
  console.log(`  Color: ${info.color}`)
  console.log(`  Is testnet: ${info.isTestnet}`)
})
console.log('')

// Test 8: Helper functions
console.log('Test 8: Helper Functions')
console.log('───────────────────────────────────────────────────')
console.log('isSameNetwork(ethereum, ethereum):', isSameNetwork('ethereum', 'ethereum'))
console.log('isSameNetwork(ethereum, base):', isSameNetwork('ethereum', 'base'))
console.log('isCompatibleNetwork(ethereum, base):', isCompatibleNetwork('ethereum', 'base'))
console.log('isCompatibleNetwork(ethereum, bnb):', isCompatibleNetwork('ethereum', 'bnb'))

const severity1 = getMismatchSeverity('ethereum', 'ethereum')
console.log('Mismatch severity (same):', severity1.level)

const severity2 = getMismatchSeverity('ethereum', 'base')
console.log('Mismatch severity (compatible):', severity2.level)

const severity3 = getMismatchSeverity('sepolia', 'ethereum')
console.log('Mismatch severity (testnet->mainnet):', severity3.level)
console.log('')

// Summary
console.log('═══════════════════════════════════════════════════')
console.log('   Test Summary')
console.log('═══════════════════════════════════════════════════\n')

const tests = [
  { name: 'Same Network Validation', passed: test1.valid && test1.canProceed },
  { name: 'Compatible Networks', passed: test2.valid && test2.warnings.length > 0 },
  { name: 'Testnet to Mainnet Block', passed: !test3.valid && test3.severity.blockTransfer },
  { name: 'Different Mainnets Warning', passed: test4.valid && test4.warnings.length > 0 },
  { name: 'Recipient Network Detection', passed: test5.detected && test5.confidence > 0 },
  { name: 'Bridge Recommendations', passed: bridge1 !== null && bridge2 !== null },
  { name: 'Network Information', passed: networks.every(n => getNetworkInfo(n).name) },
  { name: 'Helper Functions', passed: true },
]

let passed = 0
let failed = 0

tests.forEach(test => {
  if (test.passed) {
    console.log(`✅ ${test.name}`)
    passed++
  } else {
    console.log(`❌ ${test.name}`)
    failed++
  }
})

console.log('\n───────────────────────────────────────────────────')
console.log(`Total: ${passed} passed, ${failed} failed out of ${tests.length} tests`)
console.log('═══════════════════════════════════════════════════\n')

if (failed === 0) {
  console.log('🎉 All network validation tests passed!\n')
  process.exit(0)
} else {
  console.log('⚠️  Some tests failed. Review the output above.\n')
  process.exit(1)
}
