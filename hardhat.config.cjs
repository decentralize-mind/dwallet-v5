require('@nomicfoundation/hardhat-toolbox')
require('dotenv').config()

const INFURA_KEY = process.env.INFURA_KEY || ''
const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY || '0'.repeat(64)
const ETHERSCAN_KEY = process.env.ETHERSCAN_KEY || ''
const BASESCAN_KEY = process.env.BASESCAN_API_KEY || ''

module.exports = {
  solidity: {
    compilers: [
      {
        version: '0.8.24',
        settings: {
          optimizer: { enabled: true, runs: 400 },
          evmVersion: 'cancun',
          viaIR: true,
          
        },
      },
      {
        version: '0.8.20',
        settings: {
          optimizer: { enabled: true, runs: 400 },
          evmVersion: 'paris',
        },
      },
    ],
  },

  networks: {
    hardhat: { chainId: 31337 },
    localhost: { url: 'http://127.0.0.1:8545', chainId: 31337 },

    sepolia: {
      url: `https://sepolia.infura.io/v3/${INFURA_KEY}`,
      accounts: [`0x${DEPLOYER_PRIVATE_KEY}`],
      chainId: 11155111,
    },
    mainnet: {
      url: `https://mainnet.infura.io/v3/${INFURA_KEY}`,
      accounts: [`0x${DEPLOYER_PRIVATE_KEY}`],
      chainId: 1,
    },
    base: {
      url: 'https://mainnet.base.org',
      accounts: [`0x${DEPLOYER_PRIVATE_KEY}`],
      chainId: 8453,
      gasPrice: 'auto',
    },
    baseSepolia: {
      url: 'https://sepolia.base.org',
      accounts: [`0x${DEPLOYER_PRIVATE_KEY}`],
      chainId: 84532,
      gasPrice: 'auto',
      timeout: 120000, // 2 minutes
    },
    arbitrum: {
      url: 'https://arb1.arbitrum.io/rpc',
      accounts: [`0x${DEPLOYER_PRIVATE_KEY}`],
      chainId: 42161,
    },
    arbitrumSepolia: {
      url: 'https://sepolia-rollup.arbitrum.io/rpc',
      accounts: [`0x${DEPLOYER_PRIVATE_KEY}`],
      chainId: 421614,
      gasPrice: 'auto',
    },
    polygon: {
      url: 'https://polygon-rpc.com',
      accounts: [`0x${DEPLOYER_PRIVATE_KEY}`],
      chainId: 137,
    },
    polygonAmoy: {
      url: 'https://rpc-amoy.polygon.technology',
      accounts: [`0x${DEPLOYER_PRIVATE_KEY}`],
      chainId: 80002,
      gasPrice: 'auto',
    },
  },

  etherscan: {
    apiKey: {
      mainnet: ETHERSCAN_KEY,
      sepolia: ETHERSCAN_KEY,
      base: BASESCAN_KEY,
      baseSepolia: BASESCAN_KEY,
      'base-sepolia': BASESCAN_KEY,
      arbitrumOne: process.env.ARBISCAN_KEY || '',
      polygon: process.env.POLYGONSCAN_KEY || '',
    },
  },

  sourcify: { enabled: false },

  paths: {
    sources: './contracts',
    tests: './test',
    cache: './cache',
    artifacts: './artifacts',
  },
  
  // Exclude problematic contracts from compilation
  mocha: {
    timeout: 100000,
  },
}
