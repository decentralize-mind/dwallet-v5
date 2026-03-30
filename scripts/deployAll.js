const { ethers, run, network } = require('hardhat')
require('dotenv').config()

async function main() {
  const [deployer] = await ethers.getSigners()
  const balance = await ethers.provider.getBalance(deployer.address)
  const isMainnet = ['mainnet', 'base', 'arbitrum', 'polygon'].includes(
    network.name,
  )

  console.log('\n╔══════════════════════════════════════════╗')
  console.log('║   Toklo Protocol — Full Deployment        ║')
  console.log('╚══════════════════════════════════════════╝')
  console.log(
    'Network:  ',
    network.name,
    isMainnet ? '(MAINNET ⚠️)' : '(testnet)',
  )
  console.log('Deployer: ', deployer.address)
  console.log('Balance:  ', ethers.formatEther(balance), 'ETH')

  if (parseFloat(ethers.formatEther(balance)) < 0.01)
    throw new Error('Need at least 0.01 ETH')

  if (isMainnet) {
    console.log('\n⚠️  MAINNET — 10s countdown — Ctrl+C to cancel...')
    await new Promise(r => setTimeout(r, 10000))
  }

  const FOUNDER = process.env.FOUNDER_WALLET || deployer.address
  const COMMUNITY = process.env.COMMUNITY_WALLET || deployer.address
  const LIQUIDITY = process.env.LIQUIDITY_WALLET || deployer.address
  const TREASURY = process.env.TREASURY_WALLET || deployer.address
  const MARKETING = process.env.MARKETING_WALLET || deployer.address
  const TEAM = process.env.TEAM_WALLET || deployer.address

  console.log('\n[1/4] Deploying DWT Token...')
  const Token = await ethers.getContractFactory('DWalletToken')
  const token = await Token.deploy(
    FOUNDER,
    COMMUNITY,
    LIQUIDITY,
    TREASURY,
    MARKETING,
  )
  await token.waitForDeployment()
  const tokenAddr = await token.getAddress()
  console.log('✅ DWT Token:   ', tokenAddr)

  console.log('\n[2/4] Deploying DWT Staking...')
  const Staking = await ethers.getContractFactory('DWTStaking')
  const staking = await Staking.deploy(tokenAddr, deployer.address)
  await staking.waitForDeployment()
  const stakingAddr = await staking.getAddress()
  console.log('✅ DWT Staking: ', stakingAddr)

  console.log('\n[3/4] Deploying Fee Router...')
  const Router = await ethers.getContractFactory('DWalletFeeRouter')
  const router = await Router.deploy(tokenAddr, stakingAddr, TREASURY, TEAM)
  await router.waitForDeployment()
  const routerAddr = await router.getAddress()
  console.log('✅ Fee Router:  ', routerAddr)

  console.log('\n[4/4] Wiring contracts...')
  const tx = await staking.addRewardDepositor(routerAddr)
  await tx.wait()
  console.log('✅ Fee Router granted REWARD_DEPOSITOR_ROLE')

  // Verify
  const scanKey = process.env.BASESCAN_API_KEY || process.env.ETHERSCAN_API_KEY
  if (scanKey) {
    console.log('\nWaiting 30s for block explorer...')
    await new Promise(r => setTimeout(r, 30000))
    const contracts = [
      {
        name: 'DWT Token',
        addr: tokenAddr,
        args: [FOUNDER, COMMUNITY, LIQUIDITY, TREASURY, MARKETING],
      },
      {
        name: 'DWT Staking',
        addr: stakingAddr,
        args: [tokenAddr, deployer.address],
      },
      {
        name: 'Fee Router',
        addr: routerAddr,
        args: [tokenAddr, stakingAddr, TREASURY, TEAM],
      },
    ]
    for (const c of contracts) {
      try {
        await run('verify:verify', {
          address: c.addr,
          constructorArguments: c.args,
        })
        console.log('✅ Verified:', c.name)
      } catch (e) {
        console.log('⚠️  Verify later:', c.name, c.addr)
      }
    }
  }

  // Save addresses
  const fs = require('fs')
  const out = {
    network: network.name,
    chainId: network.config.chainId,
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    DWT_TOKEN: tokenAddr,
    DWT_STAKING: stakingAddr,
    FEE_ROUTER: routerAddr,
  }
  fs.writeFileSync(
    'deployed-' + network.name + '.json',
    JSON.stringify(out, null, 2),
  )

  console.log('\n╔══════════════════════════════════╗')
  console.log('║   ✅ ALL CONTRACTS DEPLOYED        ║')
  console.log('╚══════════════════════════════════╝')
  console.log('DWT Token:   ', tokenAddr)
  console.log('DWT Staking: ', stakingAddr)
  console.log('Fee Router:  ', routerAddr)
  console.log('\n📄 Saved to deployed-' + network.name + '.json')
  console.log('\n📋 Next steps:')
  console.log('1. Update src/utils/defi.js with contract addresses')
  console.log('2. Create Uniswap V3 DWT/ETH liquidity pool')
  console.log('3. Run distributeTeam.js for team allocations')
  console.log('4. Lock liquidity on team.finance')
}

main().catch(e => {
  console.error('\n❌', e.message)
  process.exit(1)
})
