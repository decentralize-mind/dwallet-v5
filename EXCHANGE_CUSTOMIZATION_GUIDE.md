# 🔧 Exchange Customization Guide

This guide shows you how to easily customize the crypto exchange feature for your specific needs.

---

## 📍 Quick Access Configuration

All exchange settings are now centralized in one file:

**`src/config/exchangeConfig.js`**

This file contains all customizable settings with clear comments.

---

## ⚡ Common Customizations

### 1. **Adjust Rate Limits**

**Location:** `src/config/exchangeConfig.js` → `rateLimiting`

```javascript
rateLimiting: {
  maxAttempts: 10,           // Increase to allow more requests
  windowMs: 60000,           // Change time window (currently 1 minute)
  cooldownMs: 5000,          // Reduce/increase cooldown (currently 5 seconds)
},
```

**Examples:**

```javascript
// More lenient (for testing)
rateLimiting: {
  maxAttempts: 50,
  windowMs: 60000,
  cooldownMs: 1000,  // 1 second cooldown
}

// More strict (for production)
rateLimiting: {
  maxAttempts: 5,
  windowMs: 60000,
  cooldownMs: 10000,  // 10 seconds cooldown
}
```

---

### 2. **Adjust Cache Duration**

**Location:** `src/config/exchangeConfig.js` → `cache`

```javascript
cache: {
  rateCacheDuration: 15000,   // Increase for less API calls
  priceCacheDuration: 30000,  // Increase for faster performance
  maxCacheSize: 100,          // Maximum cached items
},
```

**Examples:**

```javascript
// Aggressive caching (faster, less fresh data)
cache: {
  rateCacheDuration: 60000,   // 1 minute
  priceCacheDuration: 120000, // 2 minutes
  maxCacheSize: 200,
}

// Minimal caching (slower, fresh data)
cache: {
  rateCacheDuration: 5000,    // 5 seconds
  priceCacheDuration: 10000,  // 10 seconds
  maxCacheSize: 50,
}
```

---

### 3. **Add More Tokens**

**Location:** `src/config/exchangeConfig.js` → `tokens`

#### Step 1: Add to supported tokens list

```javascript
tokens: {
  supported: [
    'ETH', 'USDC', 'USDT', 'DAI', 'WBTC', 'UNI', 'LINK', 
    'BNB', 'MATIC', 'CAKE', 'BUSD', 'WETH', 'AAVE',
    'SHIB',  // ← Add new token here
    'PEPE',  // ← Add more tokens
  ],
```

#### Step 2: Add token decimals

```javascript
decimals: {
  ETH: 18,
  USDC: 6,
  SHIB: 18,  // ← Add decimals for new token
  PEPE: 18,
  // ...
},
```

#### Step 3: Add token price (fallback)

```javascript
prices: {
  ETH: 3200,
  USDC: 1,
  SHIB: 0.00001,  // ← Add price for new token
  PEPE: 0.000001,
  // ...
},
```

#### Step 4: Add to chain token list

**Location:** `src/data/chains.js`

```javascript
export const DEFAULT_TOKENS = {
  ethereum: ['ETH', 'USDC', 'USDT', 'DAI', 'DWT', 'SHIB'],  // ← Add here
  base: ['ETH', 'DWT', 'USDC', 'USDT'],
  // ...
}
```

---

### 4. **Adjust Transaction Limits**

**Location:** `src/config/exchangeConfig.js` → `limits`

```javascript
limits: {
  minAmount: 0.0001,              // Minimum exchange amount
  maxAmount: 1e15,                // Maximum exchange amount
  largeTransactionThreshold: 1000000,  // Warning for >$1M
  dustThreshold: 0.0001,          // Below this = dust
  gasReserve: {
    ETH: 0.001,    // Keep 0.001 ETH for gas
    BNB: 0.001,
    MATIC: 0.01,
  },
},
```

**Examples:**

```javascript
// Allow smaller transactions
limits: {
  minAmount: 0.00001,  // Reduced from 0.0001
  dustThreshold: 0.00001,
}

// Stricter limits
limits: {
  minAmount: 0.001,    // Increased minimum
  maxAmount: 1e12,     // Lower maximum
  largeTransactionThreshold: 100000,  // Warn at $100k instead of $1M
}
```

---

### 5. **Customize MEV Protection**

**Location:** `src/config/exchangeConfig.js` → `security.mevProtection`

```javascript
security: {
  mevProtection: {
    enableSandwichDetection: true,
    highSlippageThreshold: 2,      // Above 2% = high risk
    mediumSlippageThreshold: 1,    // Above 1% = medium risk
    largeTransactionPoolPercent: 1, // >1% of pool = high risk
    mediumTransactionPoolPercent: 0.1,
  },
```

**Examples:**

```javascript
// Stricter MEV protection
mevProtection: {
  highSlippageThreshold: 1,      // Warn at 1% instead of 2%
  mediumSlippageThreshold: 0.5,  // Warn at 0.5% instead of 1%
  largeTransactionPoolPercent: 0.5,
}

// Relaxed MEV protection (for testing)
mevProtection: {
  enableSandwichDetection: false,  // Disable detection
  highSlippageThreshold: 5,
  mediumSlippageThreshold: 3,
}
```

---

### 6. **Adjust Private Submission Settings**

**Location:** `src/config/exchangeConfig.js` → `security.privateSubmission`

```javascript
privateSubmission: {
  enableAutoDetection: true,
  amountUSDThreshold: 10000,     // Auto-use private for >$10k
  slippageThreshold: 1,          // Auto-use private for >1% slippage
},
```

**Examples:**

```javascript
// Use private submission more often
privateSubmission: {
  amountUSDThreshold: 1000,      // >$1k instead of >$10k
  slippageThreshold: 0.5,        // >0.5% instead of >1%
}

// Use private submission less often
privateSubmission: {
  amountUSDThreshold: 50000,     // >$50k
  slippageThreshold: 2,          // >2%
}
```

---

### 7. **Customize Circuit Breaker**

**Location:** `src/config/exchangeConfig.js` → `security.circuitBreaker`

```javascript
circuitBreaker: {
  failureThreshold: 5,           // Trip after 5 failures
  recoveryTimeout: 60000,        // Recovery time (1 minute)
},
```

**Examples:**

```javascript
// More tolerant
circuitBreaker: {
  failureThreshold: 10,          // Allow 10 failures
  recoveryTimeout: 30000,        // Recover after 30 seconds
}

// More sensitive
circuitBreaker: {
  failureThreshold: 3,           // Trip after only 3 failures
  recoveryTimeout: 120000,       // Wait 2 minutes before recovery
}
```

---

### 8. **Add/Remove High-Risk Pairs**

**Location:** `src/config/exchangeConfig.js` → `security.highRiskPairs`

```javascript
highRiskPairs: [
  ['ETH', 'SHIB'],
  ['ETH', 'DOGE'],
  ['ETH', 'PEPE'],
  ['ETH', 'FLOKI'],  // ← Add new risky pair
  ['ETH', 'BONK'],
],
```

---

### 9. **Customize UI Settings**

**Location:** `src/config/exchangeConfig.js` → `ui`

```javascript
ui: {
  debounceDelay: 300,               // Debounce delay (ms)
  autoRefreshInterval: 60000,       // Auto-refresh (1 minute)
  showPriceImpact: true,            // Show price impact
  showSecurityNotice: true,         // Show security notice
  defaultSlippage: 0.5,             // Default slippage (%)
  slippageOptions: [0.1, 0.5, 1, 2], // User options
},
```

**Examples:**

```javascript
// Faster UI response
ui: {
  debounceDelay: 100,  // Reduced from 300ms
}

// Different default slippage
ui: {
  defaultSlippage: 1,  // Changed from 0.5%
  slippageOptions: [0.5, 1, 2, 5],
}
```

---

### 10. **Adjust History Settings**

**Location:** `src/config/exchangeConfig.js` → `history`

```javascript
history: {
  maxItems: 200,                // Maximum transactions stored
  enableAnalytics: true,        // Enable analytics
  enableExport: true,           // Enable export
  enableTaxReports: true,       // Enable tax reports
},
```

**Examples:**

```javascript
// Store more history
history: {
  maxItems: 500,  // Increased from 200
}

// Disable features you don't need
history: {
  enableAnalytics: false,
  enableTaxReports: false,
}
```

---

## 🔧 Advanced Customizations

### Add Custom API Endpoints

**Location:** `src/config/exchangeConfig.js` → `apis`

```javascript
apis: {
  coingecko: {
    baseUrl: 'https://api.coingecko.com/api/v3',
    timeout: 5000,
    enable: true,
  },
  // Add 1inch API
  oneinch: {
    baseUrl: 'https://api.1inch.dev/swap/v5.2',
    apiKey: process.env.VITE_1INCH_API_KEY,
    enable: true,  // Set to true after adding API key
  },
  // Add other APIs
},
```

### Add DEX Routers for New Chains

**Location:** `src/config/exchangeConfig.js` → `routers`

```javascript
routers: {
  ethereum: { ... },
  base: { ... },
  polygon: { ... },
  bnb: { ... },
  // Add new chain
  arbitrum: {
    uniswapV3: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
    sushiSwap: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
  },
},
```

---

## 🎯 Runtime Customization

You can also modify settings at runtime using the helper functions:

```javascript
import { getExchangeConfig, updateExchangeConfig } from './config/exchangeConfig'

// Get current setting
const maxAttempts = getExchangeConfig('rateLimiting.maxAttempts')
console.log(maxAttempts) // 10

// Update setting at runtime
updateExchangeConfig('rateLimiting.maxAttempts', 20)
updateExchangeConfig('cache.rateCacheDuration', 30000)

// Nested settings
updateExchangeConfig('security.mevProtection.highSlippageThreshold', 1.5)
```

---

## 📊 Testing Your Changes

After making changes:

1. **Restart the dev server:**
   ```bash
   npm run dev
   ```

2. **Test the exchange:**
   - Navigate to Exchange tab
   - Try making an exchange
   - Verify rate limits work
   - Check cache behavior

3. **Monitor console logs:**
   - Watch for configuration warnings
   - Check rate limit messages
   - Verify cache hits/misses

---

## 💾 Backup Your Configuration

Before making changes, backup your config:

```bash
cp src/config/exchangeConfig.js src/config/exchangeConfig.js.backup
```

To restore:

```bash
cp src/config/exchangeConfig.js.backup src/config/exchangeConfig.js
```

---

## 🎓 Best Practices

### ✅ DO:
- Test changes on testnet first
- Start with conservative limits
- Monitor analytics after changes
- Document your customizations
- Use environment variables for API keys

### ❌ DON'T:
- Disable security features in production
- Set rate limits too high (abuse risk)
- Set cache duration too low (performance hit)
- Remove token validation
- Skip testing before deployment

---

## 📝 Example: Production Configuration

Here's a recommended production setup:

```javascript
export const EXCHANGE_CONFIG = {
  rateLimiting: {
    maxAttempts: 5,           // Strict limit
    windowMs: 60000,
    cooldownMs: 10000,        // 10 seconds
  },
  cache: {
    rateCacheDuration: 30000,  // 30 seconds
    priceCacheDuration: 60000, // 1 minute
  },
  security: {
    mevProtection: {
      enableSandwichDetection: true,
      highSlippageThreshold: 1,
      mediumSlippageThreshold: 0.5,
    },
    privateSubmission: {
      enableAutoDetection: true,
      amountUSDThreshold: 5000,  // More conservative
    },
    circuitBreaker: {
      failureThreshold: 3,       // More sensitive
      recoveryTimeout: 120000,   // 2 minutes
    },
  },
}
```

---

## 🆘 Need Help?

If you're unsure about a setting:

1. Check the comments in `exchangeConfig.js`
2. Review this guide
3. Test with conservative values first
4. Monitor performance and adjust

---

**Last Updated:** April 20, 2026
