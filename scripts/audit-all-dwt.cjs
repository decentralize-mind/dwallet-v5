const { ethers } = require('hardhat')
require('dotenv').config()

async function main() {
  const DWT_ADDR = '0x8d4a7Bb80aFc56Ba0aACCF31610Dd571aBAD9272'
  const dwt = await ethers.getContractAt(
    'contracts/layer1/DWTToken.sol:DWTToken',
    DWT_ADDR,
  )

  // Check all env vars
  const amounts = [
    'FOUNDER_1',
    'FOUNDER_2',
    'FOUNDER_3',
    'TEAM_1',
    'TEAM_2',
    'TEAM_3',
    'TEAM_4',
    'TEAM_5',
    'TEAM_6',
    'TEAM_7',
    'TEAM_8',
    'TEAM_9',
    'TEAM_10',
    'TEAM_11',
    'INVESTOR_1',
    'DAO_TREASURY',
    'COMMUNITY_REWARDS',
  ]

  for (const name of amounts) {
    const addr = process.env[`${name}_ADDRESS`]
    if (addr) {
      const bal = await dwt.balanceOf(addr)
      console.log(`${name}: ${ethers.formatEther(bal)} DWT`)
    }
  }
}

main().catch(console.error)
