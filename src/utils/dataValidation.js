/**
 * 🔒 Data Validation & Input Sanitization
 * 
 * Features:
 * - Input sanitization for user inputs
 * - API response validation and sanitization
 * - Type checking and range validation
 * - XSS prevention
 * - Data integrity checks
 */

// ─────────────────────────────────────────────────────────────────────
//  INPUT SANITIZATION
// ─────────────────────────────────────────────────────────────────────

/**
 * Sanitize string input to prevent XSS
 * Removes or escapes dangerous characters
 */
export function sanitizeString(input, maxLength = 1000) {
  if (typeof input !== 'string') {
    return ''
  }
  
  // Trim whitespace
  let sanitized = input.trim()
  
  // Limit length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength)
  }
  
  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '')
  
  // Escape HTML entities to prevent XSS
  sanitized = sanitized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
  
  return sanitized
}

/**
 * Sanitize search input
 * More restrictive than general string sanitization
 */
export function sanitizeSearchInput(input, maxLength = 100) {
  if (typeof input !== 'string') {
    return ''
  }
  
  // Only allow alphanumeric, spaces, and basic punctuation
  let sanitized = input.trim()
  sanitized = sanitized.replace(/[^a-zA-Z0-9\s\-_.]/g, '')
  
  // Limit length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength)
  }
  
  return sanitized
}

/**
 * Validate and sanitize number input
 */
export function sanitizeNumber(input, options = {}) {
  const {
    min = -Infinity,
    max = Infinity,
    decimals = 2,
    required = false
  } = options
  
  if (input === '' || input === null || input === undefined) {
    return required ? null : 0
  }
  
  // Convert to number
  const num = typeof input === 'string' ? parseFloat(input) : Number(input)
  
  // Check if valid number
  if (isNaN(num) || !isFinite(num)) {
    return required ? null : 0
  }
  
  // Clamp to range
  const clamped = Math.min(Math.max(num, min), max)
  
  // Round to specified decimals
  return Math.round(clamped * Math.pow(10, decimals)) / Math.pow(10, decimals)
}

/**
 * Validate Ethereum address
 */
export function isValidEthAddress(address) {
  if (typeof address !== 'string') return false
  return /^0x[a-fA-F0-9]{40}$/.test(address)
}

/**
 * Sanitize Ethereum address
 */
export function sanitizeEthAddress(address) {
  if (typeof address !== 'string') return ''
  
  // Trim and lowercase
  let cleaned = address.trim().toLowerCase()
  
  // Add 0x prefix if missing
  if (!cleaned.startsWith('0x')) {
    cleaned = '0x' + cleaned
  }
  
  // Validate format
  if (!isValidEthAddress(cleaned)) {
    return ''
  }
  
  return cleaned
}

/**
 * Validate transaction amount
 */
export function validateTransactionAmount(amount, balance) {
  const numAmount = sanitizeNumber(amount, {
    min: 0.00000001, // Minimum transaction (1 wei equivalent)
    max: 1e15, // Max reasonable amount
    decimals: 18, // Ethereum decimals
    required: true
  })
  
  if (numAmount === null) {
    return { valid: false, error: 'Invalid amount' }
  }
  
  if (numAmount <= 0) {
    return { valid: false, error: 'Amount must be greater than 0' }
  }
  
  if (numAmount > balance) {
    return { valid: false, error: 'Insufficient balance' }
  }
  
  return { valid: true, amount: numAmount }
}

// ─────────────────────────────────────────────────────────────────────
//  API RESPONSE VALIDATION
// ─────────────────────────────────────────────────────────────────────

/**
 * Validate and sanitize market data from CoinGecko
 */
export function validateMarketData(data) {
  if (!Array.isArray(data)) {
    console.warn('⚠️ Market data validation failed: not an array')
    return []
  }
  
  return data
    .filter(coin => validateCoinData(coin))
    .map(coin => sanitizeCoinData(coin))
}

/**
 * Validate individual coin data
 */
function validateCoinData(coin) {
  if (!coin || typeof coin !== 'object') {
    return false
  }
  
  // Required fields must exist
  if (!coin.id || typeof coin.id !== 'string') {
    return false
  }
  
  // Symbol must be a string
  if (!coin.symbol || typeof coin.symbol !== 'string') {
    return false
  }
  
  // Price must be a non-negative number
  if (typeof coin.current_price !== 'number' || coin.current_price < 0) {
    return false
  }
  
  // Market cap must be non-negative if present
  if (coin.market_cap !== undefined && (typeof coin.market_cap !== 'number' || coin.market_cap < 0)) {
    return false
  }
  
  return true
}

/**
 * Sanitize coin data to safe format
 */
function sanitizeCoinData(coin) {
  return {
    id: sanitizeString(coin.id, 100),
    symbol: sanitizeString(coin.symbol.toUpperCase(), 20),
    name: sanitizeString(coin.name || coin.symbol, 100),
    price: sanitizeNumber(coin.current_price, { min: 0, max: 1e15, decimals: 8 }),
    change24h: sanitizeNumber(coin.price_change_percentage_24h, { min: -100, max: 10000, decimals: 2 }),
    marketCap: sanitizeNumber(coin.market_cap || 0, { min: 0, max: 1e18, decimals: 0 }),
    volume24h: sanitizeNumber(coin.total_volume || 0, { min: 0, max: 1e18, decimals: 0 }),
    rank: sanitizeNumber(coin.market_cap_rank || 999, { min: 1, max: 9999, decimals: 0 }),
    icon: getCoinIcon(coin.symbol),
  }
}

/**
 * Validate and sanitize price data from CoinGecko
 */
export function validatePriceData(data, expectedSymbols) {
  if (!data || typeof data !== 'object') {
    console.warn('⚠️ Price data validation failed: not an object')
    return {}
  }
  
  const sanitized = {}
  
  for (const [symbol, geckoId] of Object.entries(expectedSymbols)) {
    if (data[geckoId] && typeof data[geckoId] === 'object') {
      const price = data[geckoId].usd
      
      // Validate price is a reasonable number
      if (typeof price === 'number' && price >= 0 && price < 1e15) {
        sanitized[symbol] = price
      }
    }
  }
  
  return sanitized
}

/**
 * Validate and sanitize price history data
 */
export function validatePriceHistory(data) {
  if (!Array.isArray(data)) {
    console.warn('⚠️ Price history validation failed: not an array')
    return []
  }
  
  return data
    .filter(point => {
      // Must be array with [timestamp, price]
      if (!Array.isArray(point) || point.length < 2) {
        return false
      }
      
      const [timestamp, price] = point
      
      // Timestamp must be valid number
      if (typeof timestamp !== 'number' || timestamp <= 0) {
        return false
      }
      
      // Price must be non-negative number
      if (typeof price !== 'number' || price < 0 || price > 1e15) {
        return false
      }
      
      return true
    })
    .map(([timestamp, price]) => ({
      ts: timestamp,
      price: sanitizeNumber(price, { min: 0, max: 1e15, decimals: 8 }),
      date: new Date(timestamp).toISOString()
    }))
}

// ─────────────────────────────────────────────────────────────────────
//  TYPE CHECKING UTILITIES
// ─────────────────────────────────────────────────────────────────────

/**
 * Safe type checking
 */
export function isString(value) {
  return typeof value === 'string'
}

export function isNumber(value) {
  return typeof value === 'number' && !isNaN(value) && isFinite(value)
}

export function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

export function isArray(value) {
  return Array.isArray(value)
}

export function isBoolean(value) {
  return typeof value === 'boolean'
}

/**
 * Check if value is within safe range
 */
export function isSafeNumber(value, min = -Number.MAX_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER) {
  return isNumber(value) && value >= min && value <= max
}

// ─────────────────────────────────────────────────────────────────────
//  DATA INTEGRITY CHECKS
// ─────────────────────────────────────────────────────────────────────

/**
 * Validate balance data structure
 */
export function validateBalanceData(balances) {
  if (!balances || typeof balances !== 'object') {
    return {}
  }
  
  const sanitized = {}
  
  for (const [key, value] of Object.entries(balances)) {
    // Key must be a valid token symbol
    if (typeof key !== 'string' || key.length > 20 || /[^a-zA-Z0-9]/.test(key)) {
      continue
    }
    
    // Value must be a non-negative number
    if (typeof value === 'number' && value >= 0 && value < 1e18) {
      sanitized[key] = value
    } else if (typeof value === 'string') {
      const parsed = parseFloat(value)
      if (!isNaN(parsed) && parsed >= 0 && parsed < 1e18) {
        sanitized[key] = parsed
      }
    }
  }
  
  return sanitized
}

/**
 * Validate transaction data
 */
export function validateTransactionData(tx) {
  if (!tx || typeof tx !== 'object') {
    return null
  }
  
  const sanitized = {}
  
  // Hash
  if (typeof tx.hash === 'string' && tx.hash.startsWith('0x')) {
    sanitized.hash = sanitizeString(tx.hash, 100)
  }
  
  // From/To addresses
  if (isValidEthAddress(tx.from)) {
    sanitized.from = sanitizeEthAddress(tx.from)
  }
  if (isValidEthAddress(tx.to)) {
    sanitized.to = sanitizeEthAddress(tx.to)
  }
  
  // Amount
  if (isNumber(tx.amount) && tx.amount > 0) {
    sanitized.amount = tx.amount
  }
  
  // Token symbol
  if (typeof tx.token === 'string' && tx.token.length <= 20) {
    sanitized.token = sanitizeString(tx.token.toUpperCase(), 20)
  }
  
  // Type
  if (['send', 'receive', 'swap'].includes(tx.type)) {
    sanitized.type = tx.type
  }
  
  // Status
  if (['pending', 'confirmed', 'failed'].includes(tx.status)) {
    sanitized.status = tx.status
  }
  
  // Timestamp
  if (isNumber(tx.timestamp) && tx.timestamp > 0) {
    sanitized.timestamp = tx.timestamp
  }
  
  return Object.keys(sanitized).length > 0 ? sanitized : null
}

/**
 * Validate chain configuration
 */
export function validateChainData(chain) {
  if (!chain || typeof chain !== 'object') {
    return null
  }
  
  const sanitized = {}
  
  // Chain ID
  if (isNumber(chain.chainId) && chain.chainId > 0) {
    sanitized.chainId = chain.chainId
  }
  
  // Name
  if (typeof chain.name === 'string' && chain.name.length > 0) {
    sanitized.name = sanitizeString(chain.name, 50)
  }
  
  // RPC URL
  if (typeof chain.rpcUrl === 'string' && chain.rpcUrl.startsWith('https://')) {
    sanitized.rpcUrl = sanitizeString(chain.rpcUrl, 500)
  }
  
  // Explorer URL
  if (typeof chain.explorerUrl === 'string' && chain.explorerUrl.startsWith('https://')) {
    sanitized.explorerUrl = sanitizeString(chain.explorerUrl, 500)
  }
  
  // Native currency
  if (typeof chain.nativeCurrency === 'string') {
    sanitized.nativeCurrency = sanitizeString(chain.nativeCurrency.toUpperCase(), 20)
  }
  
  return Object.keys(sanitized).length > 0 ? sanitized : null
}

// ─────────────────────────────────────────────────────────────────────
//  SECURITY UTILITIES
// ─────────────────────────────────────────────────────────────────────

/**
 * Get coin icon based on symbol
 */
function getCoinIcon(symbol) {
  const icons = {
    BTC: '₿',
    ETH: '⟠',
    SOL: '◎',
    BNB: '⬡',
    XRP: '✕',
    ADA: '₳',
    AVAX: '▲',
    DOT: '●',
    MATIC: '◈',
    LINK: '⬡',
    DOGE: 'Ð',
    ATOM: '⚛',
    NEAR: 'Ⓝ',
    ARB: '◌',
    OP: '○',
    AAVE: '👻',
    UNI: '🦄',
    USDC: '$',
    USDT: '₮',
    DAI: '⬙',
    WBTC: '₿',
    DWT: '◈',
  }
  
  return icons[symbol.toUpperCase()] || '●'
}

/**
 * Detect potentially malicious data patterns
 */
export function detectMaliciousData(data) {
  const patterns = [
    /<script/i,
    /javascript:/i,
    /data:text\/html/i,
    /on\w+\s*=/i,  // Event handlers like onclick=
    /eval\(/i,
    /document\.cookie/i,
    /window\.location/i,
  ]
  
  const dataStr = typeof data === 'string' ? data : JSON.stringify(data)
  
  for (const pattern of patterns) {
    if (pattern.test(dataStr)) {
      console.warn('🚨 Potentially malicious data detected:', pattern)
      return true
    }
  }
  
  return false
}

/**
 * Safe JSON parse with validation
 */
export function safeJsonParse(jsonString, fallback = null) {
  try {
    const parsed = JSON.parse(jsonString)
    
    // Check for malicious content
    if (detectMaliciousData(parsed)) {
      console.warn('🚨 Malicious content detected in JSON')
      return fallback
    }
    
    return parsed
  } catch (error) {
    console.warn('⚠️ JSON parse error:', error.message)
    return fallback
  }
}

/**
 * Create a validated copy of object with only allowed keys
 */
export function whitelistObject(obj, allowedKeys) {
  if (!obj || typeof obj !== 'object') {
    return {}
  }
  
  const whitelisted = {}
  
  for (const key of allowedKeys) {
    if (key in obj) {
      whitelisted[key] = obj[key]
    }
  }
  
  return whitelisted
}

// ─────────────────────────────────────────────────────────────────────
//  CONVERSION UTILITIES
// ─────────────────────────────────────────────────────────────────────

/**
 * Safely convert to boolean
 */
export function toBoolean(value, defaultValue = false) {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') {
    const lower = value.toLowerCase()
    if (lower === 'true' || lower === '1' || lower === 'yes') return true
    if (lower === 'false' || lower === '0' || lower === 'no') return false
  }
  if (typeof value === 'number') return value !== 0
  return defaultValue
}

/**
 * Safely convert to integer
 */
export function toInteger(value, defaultValue = 0) {
  if (typeof value === 'number') return Math.floor(value)
  if (typeof value === 'string') {
    const parsed = parseInt(value, 10)
    return isNaN(parsed) ? defaultValue : parsed
  }
  return defaultValue
}

/**
 * Safely convert to float
 */
export function toFloat(value, defaultValue = 0.0) {
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const parsed = parseFloat(value)
    return isNaN(parsed) ? defaultValue : parsed
  }
  return defaultValue
}
