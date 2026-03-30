const { ethers } = require('hardhat')
require('dotenv').config()

async function main() {
  const [deployer] = await ethers.getSigners()
  const TokenAddr =
    process.env.BASE_DWT_TOKEN ||
    process.env.DWT_TOKEN_ADDRESS ||
    process.env.DWT_TOKEN
  const dwtToken = await ethers.getContractAt('DWTToken', TokenAddr)

  console.log('Token:', TokenAddr)
  console.log('Owner:', await dwtToken.owner())
  console.log(
    'Total Supply:',
    ethers.formatEther(await dwtToken.totalSupply()),
    'DWT',
  )
  console.log(
    'Max Supply:',
    ethers.formatEther(await dwtToken.MAX_SUPPLY()),
    'DWT',
  )
  console.log('Deployer:', deployer.address)
}

main().catch(console.error)
