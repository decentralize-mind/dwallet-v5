const { ethers } = require('hardhat')
require('dotenv').config()

async function main() {
  const DWT_ADDR = '0x8d4a7Bb80aFc56Ba0aACCF31610Dd571aBAD9272'
  const dwt = await ethers.getContractAt(
    'contracts/layer1/DWTToken.sol:DWTToken',
    DWT_ADDR,
  )

  const accounts = [
    { name: 'FOUNDER_1', addr: process.env.FOUNDER_1_ADDRESS },
    { name: 'TEAM_1', addr: process.env.TEAM_1_ADDRESS },
    { name: 'INVESTOR_1', addr: process.env.INVESTOR_1_ADDRESS },
    { name: 'DAO_TREASURY', addr: process.env.DAO_TREASURY_ADDRESS },
    { name: 'COMMUNITY_REWARDS', addr: process.env.COMMUNITY_REWARDS_ADDRESS },
  ]

  for (const a of accounts) {
    if (a.addr) {
      const bal = await dwt.balanceOf(a.addr)
      console.log(`${a.name}: ${ethers.formatEther(bal)} DWT`)
    }
  }
  console.log('Total Supply:', ethers.formatEther(await dwt.totalSupply()))
}

main().catch(console.error)
