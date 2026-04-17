// ═══════════════════════════════════════════════════════
// Multi-Chain Network Configuration Template
// Add these networks to your hardhat.config.cjs
// ═══════════════════════════════════════════════════════

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
    // Local Development
    hardhat: { chainId: 31337 },
    localhost: { url: 'http://127.0.0.1:8545', chainId: 31337 },

    // ═══════════════════════════════════════════════════
    // TESTNETS
    // ═══════════════════════════════════════════════════

    // Ethereum Testnet
    sepolia: {
      url: `https://sepolia.infura.io/v3/${INFURA_KEY}`,
      accounts: [`0x${DEPLOYER_PRIVATE_KEY}`],
      chainId: 11155111,
      gasPrice: 'auto',
      timeout: 120000,
    },

    // Base Testnet (L2)
    baseSepolia: {
      url: 'https://sepolia.base.org',
      accounts: [`0x${DEPLOYER_PRIVATE_KEY}`],
      chainId: 84532,
      gasPrice: 'auto',
      timeout: 120000,
    },

    // Arbitrum Testnet (L2)
    arbitrumSepolia: {
      url: 'https://sepolia-rollup.arbitrum.io/rpc',
      accounts: [`0x${DEPLOYER_PRIVATE_KEY}`],
      chainId: 421614,
      gasPrice: 'auto',
      timeout: 120000,
    },

    // Polygon Testnet (L2)
    polygonAmoy: {
      url: 'https://rpc-amoy.polygon.technology',
      accounts: [`0x${DEPLOYER_PRIVATE_KEY}`],
      chainId: 80002,
      gasPrice: 'auto',
      timeout: 120000,
    },

    // Optimism Testnet (L2)
    optimismSepolia: {
      url: 'https://sepolia.optimism.io',
      accounts: [`0x${DEPLOYER_PRIVATE_KEY}`],
      chainId: 11155420,
      gasPrice: 'auto',
      timeout: 120000,
    },

    // zkSync Testnet (L2)
    zkSyncSepolia: {
      url: 'https://sepolia.era.zksync.dev',
      accounts: [`0x${DEPLOYER_PRIVATE_KEY}`],
      chainId: 300,
      gasPrice: 'auto',
      timeout: 120000,
      zksync: true, // Required for zkSync
    },

    // Scroll Testnet (L2)
    scrollSepolia: {
      url: 'https://sepolia-rpc.scroll.io',
      accounts: [`0x${DEPLOYER_PRIVATE_KEY}`],
      chainId: 534351,
      gasPrice: 'auto',
      timeout: 120000,
    },

    // ═══════════════════════════════════════════════════
    // MAINNETS
    // ═══════════════════════════════════════════════════

    // Ethereum Mainnet (L1)
    mainnet: {
      url: `https://mainnet.infura.io/v3/${INFURA_KEY}`,
      accounts: [`0x${DEPLOYER_PRIVATE_KEY}`],
      chainId: 1,
      gasPrice: 'auto',
      timeout: 120000,
    },

    // Base Mainnet (L2 - Coinbase)
    base: {
      url: 'https://mainnet.base.org',
      accounts: [`0x${DEPLOYER_PRIVATE_KEY}`],
      chainId: 8453,
      gasPrice: 'auto',
      timeout: 120000,
    },

    // Arbitrum Mainnet (L2)
    arbitrum: {
      url: 'https://arb1.arbitrum.io/rpc',
      accounts: [`0x${DEPLOYER_PRIVATE_KEY}`],
      chainId: 42161,
      gasPrice: 'auto',
      timeout: 120000,
    },

    // Polygon Mainnet (L2/Sidechain)
    polygon: {
      url: 'https://polygon-rpc.com',
      accounts: [`0x${DEPLOYER_PRIVATE_KEY}`],
      chainId: 137,
      gasPrice: 'auto',
      timeout: 120000,
    },

    // Optimism Mainnet (L2)
    optimism: {
      url: 'https://mainnet.optimism.io',
      accounts: [`0x${DEPLOYER_PRIVATE_KEY}`],
      chainId: 10,
      gasPrice: 'auto',
      timeout: 120000,
    },

    // zkSync Mainnet (L2)
    zkSync: {
      url: 'https://mainnet.era.zksync.io',
      accounts: [`0x${DEPLOYER_PRIVATE_KEY}`],
      chainId: 324,
      gasPrice: 'auto',
      timeout: 120000,
      zksync: true, // Required for zkSync
    },

    // Scroll Mainnet (L2)
    scroll: {
      url: 'https://rpc.scroll.io',
      accounts: [`0x${DEPLOYER_PRIVATE_KEY}`],
      chainId: 534352,
      gasPrice: 'auto',
      timeout: 120000,
    },

    // BNB Chain Mainnet (Alternative L1)
    bsc: {
      url: 'https://bsc-dataseed.binance.org',
      accounts: [`0x${DEPLOYER_PRIVATE_KEY}`],
      chainId: 56,
      gasPrice: 'auto',
      timeout: 120000,
    },

    // Avalanche Mainnet (Alternative L1)
    avalanche: {
      url: 'https://api.avax.network/ext/bc/C/rpc',
      accounts: [`0x${DEPLOYER_PRIVATE_KEY}`],
      chainId: 43114,
      gasPrice: 'auto',
      timeout: 120000,
    },
  },

  // ═══════════════════════════════════════════════════
  // ETHERSCAN API KEYS FOR VERIFICATION
  // ═══════════════════════════════════════════════════

  etherscan: {
    apiKey: {
      // Ethereum
      mainnet: ETHERSCAN_KEY,
      sepolia: ETHERSCAN_KEY,

      // Base
      base: BASESCAN_KEY,
      baseSepolia: BASESCAN_KEY,
      'base-sepolia': BASESCAN_KEY,

      // Arbitrum
      arbitrumOne: process.env.ARBISCAN_KEY || '',
      'arbitrum-sepolia': process.env.ARBISCAN_KEY || '',

      // Polygon
      polygon: process.env.POLYGONSCAN_KEY || '',
      polygonAmoy: process.env.POLYGONSCAN_KEY || '',

      // Optimism
      optimisticEthereum: process.env.OPTIMISM_KEY || '',
      'optimism-sepolia': process.env.OPTIMISM_KEY || '',

      // zkSync (uses different verification method)
      // zkSync: process.env.ZKSYNC_KEY || '',

      // Scroll
      scroll: process.env.SCROLLSCAN_KEY || '',
      'scroll-sepolia': process.env.SCROLLSCAN_KEY || '',

      // BNB Chain
      bsc: process.env.BSCSCAN_KEY || '',

      // Avalanche
      avalanche: process.env.SNOWTRACE_KEY || '',
    },
    customChains: [
      {
        network: 'base',
        chainId: 8453,
        urls: {
          apiURL: 'https://api.basescan.org/api',
          browserURL: 'https://basescan.org',
        },
      },
      {
        network: 'baseSepolia',
        chainId: 84532,
        urls: {
          apiURL: 'https://api-sepolia.basescan.org/api',
          browserURL: 'https://sepolia.basescan.org',
        },
      },
      {
        network: 'arbitrum-sepolia',
        chainId: 421614,
        urls: {
          apiURL: 'https://api-sepolia.arbiscan.io/api',
          browserURL: 'https://sepolia.arbiscan.io',
        },
      },
      {
        network: 'polygonAmoy',
        chainId: 80002,
        urls: {
          apiURL: 'https://api-amoy.polygonscan.com/api',
          browserURL: 'https://amoy.polygonscan.com',
        },
      },
      {
        network: 'optimism-sepolia',
        chainId: 11155420,
        urls: {
          apiURL: 'https://api-sepolia-optimistic.etherscan.io/api',
          browserURL: 'https://sepolia-optimism.etherscan.io',
        },
      },
      {
        network: 'scroll-sepolia',
        chainId: 534351,
        urls: {
          apiURL: 'https://api-sepolia.scrollscan.com/api',
          browserURL: 'https://sepolia.scrollscan.com',
        },
      },
    ],
  },

  sourcify: { enabled: false },

  paths: {
    sources: './contracts',
    tests: './test',
    cache: './cache',
    artifacts: './artifacts',
  },

  mocha: {
    timeout: 100000,
  },
}

// ═══════════════════════════════════════════════════════
// NETWORK CHAIN ID REFERENCE
// ═══════════════════════════════════════════════════════
//
// Testnets:
// - Sepolia:            11155111
// - Base Sepolia:       84532
// - Arbitrum Sepolia:   421614
// - Polygon Amoy:       80002
// - Optimism Sepolia:   11155420
// - zkSync Sepolia:     300
// - Scroll Sepolia:     534351
//
// Mainnets:
// - Ethereum:           1
// - Base:               8453
// - Arbitrum:           42161
// - Polygon:            137
// - Optimism:           10
// - zkSync:             324
// - Scroll:             534352
// - BNB Chain:          56
// - Avalanche:          43114
//
// ═══════════════════════════════════════════════════════
