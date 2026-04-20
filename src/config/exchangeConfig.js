// Exchange Configuration
// Customize rate limits, cache duration, supported tokens, and security settings

export const EXCHANGE_CONFIG = {
  // ─────────────────────────────────────────────────────────────────────
  //  RATE LIMITING SETTINGS
  // ─────────────────────────────────────────────────────────────────────
  rateLimiting: {
    maxAttempts: 10,           // Maximum requests per window
    windowMs: 60000,           // Time window in milliseconds (1 minute)
    cooldownMs: 5000,          // Cooldown between requests (5 seconds)
  },

  // ─────────────────────────────────────────────────────────────────────
  //  CACHE SETTINGS
  // ─────────────────────────────────────────────────────────────────────
  cache: {
    rateCacheDuration: 15000,   // Exchange rate cache duration (15 seconds)
    priceCacheDuration: 30000,  // Price cache duration (30 seconds)
    maxCacheSize: 100,          // Maximum number of cached items
  },

  // ─────────────────────────────────────────────────────────────────────
  //  TRANSACTION LIMITS
  // ─────────────────────────────────────────────────────────────────────
  limits: {
    minAmount: 0.0001,          // Minimum exchange amount
    maxAmount: 1e15,            // Maximum exchange amount
    largeTransactionThreshold: 1000000,  // Warning threshold (in USD)
    dustThreshold: 0.0001,      // Below this is considered dust
    gasReserve: {               // Reserve for gas fees
      ETH: 0.001,
      BNB: 0.001,
      MATIC: 0.01,
    },
  },

  // ─────────────────────────────────────────────────────────────────────
  //  SECURITY SETTINGS
  // ─────────────────────────────────────────────────────────────────────
  security: {
    // MEV Protection
    mevProtection: {
      enableSandwichDetection: true,
      highSlippageThreshold: 2,      // Above 2% = high risk
      mediumSlippageThreshold: 1,    // Above 1% = medium risk
      largeTransactionPoolPercent: 1, // Above 1% of pool = high risk
      mediumTransactionPoolPercent: 0.1, // Above 0.1% of pool = medium risk
    },

    // Private Submission
    privateSubmission: {
      enableAutoDetection: true,
      amountUSDThreshold: 10000,     // Auto-use private for >$10k
      slippageThreshold: 1,          // Auto-use private for >1% slippage
    },

    // Circuit Breaker
    circuitBreaker: {
      failureThreshold: 5,           // Trip after 5 failures
      recoveryTimeout: 60000,        // Recovery time (1 minute)
    },

    // High Risk Pairs (commonly targeted by MEV bots)
    highRiskPairs: [
      ['ETH', 'SHIB'],
      ['ETH', 'DOGE'],
      ['ETH', 'PEPE'],
      ['ETH', 'FLOKI'],
      ['ETH', 'BONK'],
    ],
  },

  // ─────────────────────────────────────────────────────────────────────
  //  SUPPORTED TOKENS
  // ─────────────────────────────────────────────────────────────────────
  tokens: {
    // Token whitelist for exchange
    supported: [
      'ETH', 'USDC', 'USDT', 'DAI', 'WBTC', 'UNI', 'LINK', 
      'BNB', 'MATIC', 'CAKE', 'BUSD', 'WETH', 'AAVE'
    ],

    // Token decimals for accurate calculations
    decimals: {
      ETH: 18,
      BNB: 18,
      MATIC: 18,
      SOL: 9,
      USDC: 6,
      USDT: 6,
      DAI: 18,
      WBTC: 8,
      UNI: 18,
      LINK: 18,
      CAKE: 18,
      BUSD: 18,
      WETH: 18,
      AAVE: 18,
      DWT: 18,
    },

    // Token price fallback (USD)
    prices: {
      ETH: 3200,
      BNB: 420,
      MATIC: 0.85,
      SOL: 180,
      USDC: 1,
      USDT: 1,
      DAI: 1,
      WBTC: 65000,
      UNI: 8,
      LINK: 15,
      CAKE: 2.5,
      BUSD: 1,
      WETH: 3200,
      AAVE: 95,
      DWT: 3.50,
    },
  },

  // ─────────────────────────────────────────────────────────────────────
  //  DEX ROUTER ADDRESSES
  // ─────────────────────────────────────────────────────────────────────
  routers: {
    ethereum: {
      uniswapV2: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
      uniswapV3: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
      sushiSwap: '0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F',
    },
    base: {
      aerodrome: '0x4752ba5dbc23f44d87826276bf6fd6b1c372ad24',
      uniswapV3: '0x2626664c2603336E57B271c5C0b26F421741e481',
    },
    polygon: {
      quickSwap: '0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff',
      sushiSwap: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
    },
    bnb: {
      pancakeSwap: '0x10ED43C718714eb63d5aA57B78B54704E256024E',
      biSwap: '0x3a6d8cA21D1CF76F653A67577FA0D27453350dD8',
    },
  },

  // ─────────────────────────────────────────────────────────────────────
  //  HISTORY & ANALYTICS
  // ─────────────────────────────────────────────────────────────────────
  history: {
    maxItems: 200,                // Maximum transactions to store
    enableAnalytics: true,        // Enable analytics tracking
    enableExport: true,           // Enable CSV/JSON export
    enableTaxReports: true,       // Enable tax report generation
  },

  // ─────────────────────────────────────────────────────────────────────
  //  UI SETTINGS
  // ─────────────────────────────────────────────────────────────────────
  ui: {
    debounceDelay: 300,           // Debounce delay for rate calculation (ms)
    autoRefreshInterval: 60000,   // Auto-refresh interval (1 minute)
    showPriceImpact: true,        // Show price impact warning
    showSecurityNotice: true,     // Show security notice
    defaultSlippage: 0.5,         // Default slippage tolerance (%)
    slippageOptions: [0.1, 0.5, 1, 2], // Slippage options for users
  },

  // ─────────────────────────────────────────────────────────────────────
  //  API ENDPOINTS
  // ─────────────────────────────────────────────────────────────────────
  apis: {
    coingecko: {
      baseUrl: 'https://api.coingecko.com/api/v3',
      timeout: 5000,
      enable: true,
    },
    // Add more APIs as needed
    // oneinch: {
    //   baseUrl: 'https://api.1inch.dev/swap',
    //   apiKey: process.env.VITE_1INCH_API_KEY,
    //   enable: false,
    // },
  },
}

// Helper function to get config value with fallback
export function getExchangeConfig(path, defaultValue = null) {
  const keys = path.split('.')
  let value = EXCHANGE_CONFIG
  
  for (const key of keys) {
    if (value[key] === undefined) {
      return defaultValue
    }
    value = value[key]
  }
  
  return value
}

// Helper function to update config (for runtime customization)
export function updateExchangeConfig(path, value) {
  const keys = path.split('.')
  let current = EXCHANGE_CONFIG
  
  for (let i = 0; i < keys.length - 1; i++) {
    if (current[keys[i]] === undefined) {
      current[keys[i]] = {}
    }
    current = current[keys[i]]
  }
  
  current[keys[keys.length - 1]] = value
}
