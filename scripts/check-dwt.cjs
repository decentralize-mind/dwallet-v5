const { ethers } = require('hardhat')
require('dotenv').config()

async function main() {
  const DWT_ADDR = '0x8e9fabcFf4A97eEBa63943D0530705302e519102'
  const DWT = await ethers.getContractAt(
    'contracts/layer1/DWTToken.sol:DWTToken',
    DWT_ADDR,
  )
  const supply = await DWT.totalSupply()
  const owner = await DWT.owner()
  console.log('DWT Total Supply:', ethers.formatEther(supply))
  console.log('DWT Owner:', owner)
}

main().catch(console.error)
