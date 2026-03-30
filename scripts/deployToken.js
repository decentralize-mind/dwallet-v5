const { ethers, run, network } = require('hardhat')
require('dotenv').config()

async function main() {
  const [deployer] = await ethers.getSigners()
  const balance = await ethers.provider.getBalance(deployer.address)

  console.log('\n═══════════════════════════════════════════════')
  console.log('   DWT Token Deployment')
  console.log('═══════════════════════════════════════════════')
  console.log('Network:  ', network.name)
  console.log('Deployer: ', deployer.address)
  console.log('Balance:  ', ethers.formatEther(balance), 'ETH')

  // Using deployer address for all wallets during testing
  // On mainnet replace each with a separate dedicated wallet
  const TEAM = deployer.address
  const COMMUNITY = deployer.address
  const LIQUIDITY = deployer.address
  const TREASURY = deployer.address
  const MARKETING = deployer.address

  console.log('\nDeploying DWalletToken...')
  const Token = await ethers.getContractFactory('DWalletToken')
  const token = await Token.deploy(
    TEAM,
    COMMUNITY,
    LIQUIDITY,
    TREASURY,
    MARKETING,
  )
  await token.waitForDeployment()

  const address = await token.getAddress()
  console.log('\n✅ DWalletToken deployed to:', address)

  const DEAD = '0x000000000000000000000000000000000000dEaD'
  const burned = await token.balanceOf(DEAD)
  const total = await token.totalSupply()

  console.log('\nVerification:')
  console.log('Total supply:', ethers.formatEther(total), 'DWT')
  console.log('Burned:      ', ethers.formatEther(burned), 'DWT')

  if (network.name !== 'hardhat' && network.name !== 'localhost') {
    console.log('\nWaiting 30s for Etherscan...')
    await new Promise(r => setTimeout(r, 30000))
    try {
      await run('verify:verify', {
        address,
        constructorArguments: [TEAM, COMMUNITY, LIQUIDITY, TREASURY, MARKETING],
      })
      console.log('✅ Verified on Etherscan!')
    } catch (e) {
      console.log('⚠️  Verify manually:')
      console.log(
        `npx hardhat verify --network ${network.name} ${address} "${TEAM}" "${COMMUNITY}" "${LIQUIDITY}" "${TREASURY}" "${MARKETING}"`,
      )
    }
  }

  console.log('\n═══════════════════════════════════════════════')
  console.log('Token address:', address)
  console.log(
    `View: https://${network.name === 'sepolia' ? 'sepolia.' : ''}etherscan.io/token/${address}`,
  )
  console.log('═══════════════════════════════════════════════\n')
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
