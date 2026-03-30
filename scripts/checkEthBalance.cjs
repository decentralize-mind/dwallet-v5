const { ethers } = require('hardhat')

async function main() {
  const [deployer] = await ethers.getSigners()
  const balance = await deployer.provider.getBalance(deployer.address)
  console.log('Deployer Address:', deployer.address)
  console.log('Deployer ETH balance:', ethers.formatEther(balance), 'ETH')
}

main().catch(console.error)
