const { ethers, network } = require('hardhat')

/**
 * Verify all deployed contracts on BaseScan
 */

async function main() {
  console.log('\n🔍 Verifying contracts on BaseScan...\n')

  // Contract addresses from deployment
  const CONTRACTS = {
    dwtToken: '0x1CB40295553B64b02fdee3520125f524040A4290',
    timelock: '0x92AcbD29B223d49BAB27dbFc2D91636B72b96CF0',
    governor: '0x3355d11Ba3d0E88Add7825998a9bEd543c241523',
    simpleAirdrop: '0xa82160955D058a01c539b2C98De834274E345882',
    lockEngine: '0xeb383551b388801f789Cc472227D99D31d161607',
    invariantChecker: '0xc411848C2bDdEDb362D44ad88ec34f21AF9fd5D6',
    securityController: '0x9F18276AFB187bCC1Eb05882A4670Ae7F77f499B',
    rateLimiter: '0xaa1Cf0eC89Eb1B9aac2B68A76B8D54c921c9f5A0'
  }

  const deployer = '0x4C0B7314441dfE8E61267C0d87Fc1A657611dCf5'
  const TIMELOCK_DELAY = 172800 // 48 hours

  console.log('📋 Contracts to verify:\n')

  for (const [name, address] of Object.entries(CONTRACTS)) {
    console.log(`${name}: ${address}`)
  }

  console.log('\n' + '='.repeat(70))
  console.log('📝 Copy and run these commands:\n')

  // 1. DWT Token (DWTTokenSimple)
  console.log('1️⃣  DWT Token:')
  console.log(`npx hardhat verify --network ${network.name} ${CONTRACTS.dwtToken} "${deployer}"\n`)

  // 2. TimelockController
  console.log('2️⃣  TimelockController:')
  console.log(`npx hardhat verify --network ${network.name} \\`)
  console.log(`  ${CONTRACTS.timelock} \\`)
  console.log(`  "${TIMELOCK_DELAY}" \\`)
  console.log(`  "[]" \\`)
  console.log(`  "[0x0000000000000000000000000000000000000000]" \\`)
  console.log(`  "${deployer}"\n`)

  // 3. DWTGovernor
  console.log('3️⃣  DWTGovernor:')
  console.log(`npx hardhat verify --network ${network.name} \\`)
  console.log(`  ${CONTRACTS.governor} \\`)
  console.log(`  "${CONTRACTS.dwtToken}" \\`)
  console.log(`  "${CONTRACTS.timelock}"\n`)

  // 4. SimpleAirdrop
  console.log('4️⃣  SimpleAirdrop:')
  console.log(`npx hardhat verify --network ${network.name} ${CONTRACTS.simpleAirdrop} "${CONTRACTS.dwtToken}"\n`)

  // 5. LockEngine
  console.log('5️⃣  LockEngine:')
  console.log(`npx hardhat verify --network ${network.name} ${CONTRACTS.lockEngine} "${deployer}"\n`)

  // 6. InvariantChecker (no constructor args)
  console.log('6️⃣  InvariantChecker:')
  console.log(`npx hardhat verify --network ${network.name} ${CONTRACTS.invariantChecker}\n`)

  // 7. SecurityController
  console.log('7️⃣  SecurityController:')
  console.log(`npx hardhat verify --network ${network.name} ${CONTRACTS.securityController} "${deployer}"\n`)

  // 8. RateLimiter
  console.log('8️⃣  RateLimiter:')
  console.log(`npx hardhat verify --network ${network.name} ${CONTRACTS.rateLimiter} "${deployer}"\n`)

  console.log('='.repeat(70))
  console.log('\n💡 Tips:')
  console.log('   - Run each command one at a time')
  console.log('   - Wait 30 seconds between verifications')
  console.log('   - If verification fails, wait 2 minutes and retry')
  console.log('   - View contracts at: https://sepolia.basescan.org/address/[ADDRESS]\n')
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Error:', error)
    process.exit(1)
  })
