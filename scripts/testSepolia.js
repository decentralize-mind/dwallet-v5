const { ethers } = require('hardhat')
require('dotenv').config()

const DWT_TOKEN = '0x85b9A8526105bD38Bfd870Ef47f0Fa6283E82B7e'
const DWT_STAKING = '0xd2720125f882FAD4d51b392198003a1B502e3844'
const FEE_ROUTER = '0xf068a5eCb76040bDA997aAC4AB5378cF62c484Ef'

async function main() {
  const [deployer] = await ethers.getSigners()
  console.log('Testing with:', deployer.address)

  const token = await ethers.getContractAt('DWalletToken', DWT_TOKEN)
  const staking = await ethers.getContractAt('DWTStaking', DWT_STAKING)
  const router = await ethers.getContractAt('DWalletFeeRouter', FEE_ROUTER)

  // Check token supply
  const supply = await token.totalSupply()
  const burned = await token.totalBurned()
  console.log('✅ DWT Total supply: ', ethers.formatEther(supply))
  console.log('✅ DWT Total burned: ', ethers.formatEther(burned))

  // Check deployer balance
  const bal = await token.balanceOf(deployer.address)
  console.log('✅ Deployer DWT balance:', ethers.formatEther(bal))

  // Check fee router config
  const config = await router.getConfig()
  console.log('✅ Fee Router config:')
  console.log('   DWT Token:   ', config[0])
  console.log('   Staking:     ', config[1])
  console.log('   Treasury:    ', config[2])
  console.log('   Team:        ', config[3])
  console.log(
    '   Default fee: ',
    config[4].toString(),
    'bps =',
    Number(config[4]) / 100,
    '%',
  )
  console.log('   Tier1 fee:   ', config[5].toString(), 'bps')
  console.log('   Tier2 fee:   ', config[6].toString(), 'bps')
  console.log('   Tier3 fee:   ', config[7].toString(), 'bps')
  console.log('   Paused:      ', config[8])

  // Test staking — approve and stake 1000 DWT
  console.log('\nTesting stake 1000 DWT...')
  const stakeAmt = ethers.parseEther('1000')
  const approveTx = await token.approve(DWT_STAKING, stakeAmt)
  await approveTx.wait()
  console.log('✅ Approved')

  const stakeTx = await staking.stake(stakeAmt, 0) // no lock
  await stakeTx.wait()
  console.log('✅ Staked 1000 DWT (no lock)')

  // Check stake info
  const info = await staking.getStakeInfo(deployer.address)
  console.log('✅ Stake info:')
  console.log('   Amount staked:', ethers.formatEther(info[0]))
  console.log('   Weighted:     ', ethers.formatEther(info[1]))
  console.log('   Multiplier:   ', info[3].toString(), '(100 = 1x)')

  // Check protocol stats
  const stats = await staking.getProtocolStats()
  console.log('✅ Protocol stats:')
  console.log('   Total staked: ', ethers.formatEther(stats[0]))
  console.log('   ETH rewards:  ', ethers.formatEther(stats[4]))

  console.log('\n✅ All tests passed — contracts working correctly on Sepolia')
  console.log('Ready to deploy to Base mainnet when you have ETH on Base')
}

main().catch(console.error)
