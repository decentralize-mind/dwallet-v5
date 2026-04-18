require('@nomicfoundation/hardhat-toolbox')
require('dotenv').config()

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: '0.8.24',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true,
    },
  },

  networks: {
    // ─── Local ────────────────────────────────────────────────────
    hardhat: {
      chainId: 31337,
    },

    localhost: {
      url: 'http://127.0.0.1:8545',
      chainId: 31337,
    },

    // ─── Base Sepolia (Testnet) ────────────────────────────────────
    baseSepolia: {
      url: process.env.BASE_SEPOLIA_RPC || 'https://sepolia.base.org',
      chainId: 84532,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      gasPrice: 'auto',
      gas: 'auto',
      // Bump timeout for complex multi-contract deployments
      timeout: 120_000,
    },

    // ─── Base Mainnet ──────────────────────────────────────────────
    base: {
      url: process.env.BASE_MAINNET_RPC || 'https://mainnet.base.org',
      chainId: 8453,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      gasPrice: 'auto',
      gas: 'auto',
    },
  },

  etherscan: {
    apiKey: {
      baseSepolia: process.env.BASESCAN_API_KEY || '',
      base: process.env.BASESCAN_API_KEY || '',
    },
    customChains: [
      {
        network: 'baseSepolia',
        chainId: 84532,
        urls: {
          apiURL: 'https://api-sepolia.basescan.org/api',
          browserURL: 'https://sepolia.basescan.org',
        },
      },
      {
        network: 'base',
        chainId: 8453,
        urls: {
          apiURL: 'https://api.basescan.org/api',
          browserURL: 'https://basescan.org',
        },
      },
    ],
  },

  gasReporter: {
    enabled: process.env.REPORT_GAS === 'true',
    currency: 'USD',
    gasPrice: 21,
  },

  paths: {
    sources: './contracts',
    tests: './test',
    cache: './cache',
    artifacts: './artifacts',
  },
}
