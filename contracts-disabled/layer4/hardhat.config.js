require('@nomicfoundation/hardhat-toolbox')
require('dotenv').config({ path: '../../.env' })

const PK = process.env.DEPLOYER_PRIVATE_KEY || process.env.PRIVATE_KEY || ''
const accounts = PK ? [`0x${PK.replace(/^0x/, '')}`] : []

module.exports = {
  solidity: '0.8.20',
  networks: {
    baseSepolia: {
      url: 'https://sepolia.base.org',
      accounts: accounts,
    },
  },
  paths: {
    sources: './contracts',
    tests: './test',
    cache: './cache',
    artifacts: './artifacts',
  },
}
