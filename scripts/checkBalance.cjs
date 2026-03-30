const { ethers } = require('hardhat')

async function main() {
  const [deployer] = await ethers.getSigners()
  const TOKEN = '0x2656f902c4d404e90673931857761483A33541aa'
  const ABI = ['function balanceOf(address) view returns (uint256)']
  const token = new ethers.Contract(TOKEN, ABI, deployer)
  const bal = await token.balanceOf(deployer.address)
  console.log('Deployer DWT balance:', ethers.formatEther(bal), 'DWT')
}

main().catch(console.error)
