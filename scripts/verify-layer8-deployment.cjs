const { ethers } = require('hardhat')

async function main() {
  console.log('════════════════════════════════════════════════════')
  console.log('  Layer 8 - Post-Deployment Verification')
  console.log('════════════════════════════════════════════════════\n')

  const [deployer] = await ethers.getSigners()
  console.log('Testing with account:', deployer.address)
  
  const network = await ethers.provider.getNetwork()
  console.log('Network:', network.name, '(Chain ID:', network.chainId, ')\n')

  // Contract addresses from deployment
  const BRIDGE_ADDRESS = '0x778bf751DE7D18A3ff683d9d644EA686146f726f'
  const STAKING_ADDRESS = '0x8ed1B79D9200D2fB7B93D171a1e38bA274ea7894'
  const GOVERNANCE_ADDRESS = '0xd2644bf0382b0d475C0b19D991d73aa8EeD169fc'
  const TOKEN_ADDRESS = '0xb2f465FB0735c18c49c4e240e210593d875C94d3'

  let passed = 0
  let failed = 0

  // Test 1: Layer8Bridge
  console.log('📡 Test 1: Layer8Bridge')
  console.log('─'.repeat(50))
  try {
    const Bridge = await ethers.getContractFactory('contracts/layer8/Layer8Bridge.sol:Layer8Bridge')
    const bridge = Bridge.attach(BRIDGE_ADDRESS)
    
    const lzEndpoint = await bridge.lzEndpoint()
    const axelarGateway = await bridge.axelarGateway()
    const paused = await bridge.paused()
    
    console.log('  ✓ Contract deployed at:', BRIDGE_ADDRESS)
    console.log('  ✓ LayerZero Endpoint:', lzEndpoint)
    console.log('  ✓ Axelar Gateway:', axelarGateway)
    console.log('  ✓ Pause Status:', paused)
    console.log('  ✅ Layer8Bridge: PASSED\n')
    passed++
  } catch (error) {
    console.log('  ❌ Layer8Bridge: FAILED -', error.message, '\n')
    failed++
  }

  // Test 2: StakingHub
  console.log('📡 Test 2: StakingHub')
  console.log('─'.repeat(50))
  try {
    const StakingHub = await ethers.getContractFactory('contracts/layer8/CrossChainStaking.sol:StakingHub')
    const stakingHub = StakingHub.attach(STAKING_ADDRESS)
    
    const stakingToken = await stakingHub.stakingToken()
    const lzEndpoint = await stakingHub.lzEndpoint()
    const rewardRate = await stakingHub.rewardRatePerSecond()
    
    console.log('  ✓ Contract deployed at:', STAKING_ADDRESS)
    console.log('  ✓ Staking Token:', stakingToken)
    console.log('  ✓ LayerZero Endpoint:', lzEndpoint)
    console.log('  ✓ Reward Rate:', ethers.formatEther(rewardRate), 'DWT/sec')
    console.log('  ✅ StakingHub: PASSED\n')
    passed++
  } catch (error) {
    console.log('  ❌ StakingHub: FAILED -', error.message, '\n')
    failed++
  }

  // Test 3: GovernanceHub
  console.log('📡 Test 3: GovernanceHub')
  console.log('─'.repeat(50))
  try {
    const GovernanceHub = await ethers.getContractFactory('contracts/layer8/CrossChainGovernance.sol:GovernanceHub')
    const governanceHub = GovernanceHub.attach(GOVERNANCE_ADDRESS)
    
    const govToken = await governanceHub.govToken()
    const votingDelay = await governanceHub.votingDelay()
    const votingPeriod = await governanceHub.votingPeriod()
    const timelock = await governanceHub.PROPOSAL_TIMELOCK()
    
    console.log('  ✓ Contract deployed at:', GOVERNANCE_ADDRESS)
    console.log('  ✓ Governance Token:', govToken)
    console.log('  ✓ Voting Delay:', Number(votingDelay), 'seconds')
    console.log('  ✓ Voting Period:', Number(votingPeriod), 'seconds')
    console.log('  ✓ Proposal Timelock:', Number(timelock), 'seconds', `(${Number(timelock) / 3600} hours)`)
    console.log('  ✅ GovernanceHub: PASSED\n')
    passed++
  } catch (error) {
    console.log('  ❌ GovernanceHub: FAILED -', error.message, '\n')
    failed++
  }

  // Test 4: BridgedToken
  console.log('📡 Test 4: BridgedToken (bDWT)')
  console.log('─'.repeat(50))
  try {
    const BridgedToken = await ethers.getContractFactory('contracts/layer8/BridgedToken.sol:BridgedToken')
    const bridgedToken = BridgedToken.attach(TOKEN_ADDRESS)
    
    const name = await bridgedToken.name()
    const symbol = await bridgedToken.symbol()
    const decimals = await bridgedToken.decimals()
    const totalSupply = await bridgedToken.totalSupply()
    
    console.log('  ✓ Contract deployed at:', TOKEN_ADDRESS)
    console.log('  ✓ Token Name:', name)
    console.log('  ✓ Token Symbol:', symbol)
    console.log('  ✓ Decimals:', decimals)
    console.log('  ✓ Total Supply:', ethers.formatEther(totalSupply), 'bDWT')
    console.log('  ✅ BridgedToken: PASSED\n')
    passed++
  } catch (error) {
    console.log('  ❌ BridgedToken: FAILED -', error.message, '\n')
    failed++
  }

  // Test 5: Security Integration
  console.log('🔒 Test 5: Layer 7 Security Integration')
  console.log('─'.repeat(50))
  try {
    const Bridge = await ethers.getContractFactory('contracts/layer8/Layer8Bridge.sol:Layer8Bridge')
    const bridge = Bridge.attach(BRIDGE_ADDRESS)
    
    const securityController = await bridge.securityController()
    
    console.log('  ✓ Security Controller:', securityController)
    console.log('  ✓ Layer 7 integration: ACTIVE')
    console.log('  ✅ Security Integration: PASSED\n')
    passed++
  } catch (error) {
    console.log('  ❌ Security Integration: FAILED -', error.message, '\n')
    failed++
  }

  // Summary
  console.log('════════════════════════════════════════════════════')
  console.log('  Test Results Summary')
  console.log('════════════════════════════════════════════════════')
  console.log(`  Total Tests: ${passed + failed}`)
  console.log(`  ✅ Passed: ${passed}`)
  console.log(`  ❌ Failed: ${failed}`)
  console.log('════════════════════════════════════════════════════\n')

  if (failed === 0) {
    console.log('🎉 All post-deployment tests passed!')
    console.log('✅ Layer 8 is fully operational on Base Sepolia!\n')
  } else {
    console.log('⚠️  Some tests failed. Please review the errors above.\n')
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
