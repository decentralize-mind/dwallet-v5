const { ethers } = require('hardhat')
require('dotenv').config()

async function main() {
  // Address from the user's recent output:
  const TokenAddr = '0x9f2D94bda3F341C9623588b768A3a66625d4F2EB'
  const dwtToken = await ethers.getContractAt('DWTToken', TokenAddr)
  const supply = await dwtToken.totalSupply()
  console.log('Current Total Supply:', ethers.formatEther(supply), 'DWT')
}

main().catch(console.error)
