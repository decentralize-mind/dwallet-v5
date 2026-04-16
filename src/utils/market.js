import { validateMarketData, sanitizeString, sanitizeNumber } from './dataValidation'
import { 
  withGracefulDegradation,
  getDetailedErrorLog,
  serviceHealth
} from './errorHandling'

// CoinMarketCap API configuration
const CMC_API_KEY = import.meta.env.VITE_CMC_API_KEY || '4d9b36ecced349f0a9e412daa69504d9'
const CMC_BASE_URL = 'https://pro-api.coinmarketcap.com/v1'

// DeFi Llama API configuration (FREE, no key needed)
const DEFI_LLAMA_BASE_URL = 'https://coins.llama.fi'

// Cache configuration
const MARKET_CACHE_KEY = 'dwallet_market_cache'
const USAGE_KEY = 'dwallet_api_usage'
const CACHE_TTL = 60000 // 1 minute

// CoinGecko ID mapping for DeFi Llama compatibility
const COINGECKO_IDS = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  SOL: 'solana',
  BNB: 'binancecoin',
  XRP: 'ripple',
  ADA: 'cardano',
  AVAX: 'avalanche-2',
  DOT: 'polkadot',
  MATIC: 'matic-network',
  LINK: 'chainlink',
  DOGE: 'dogecoin',
  ATOM: 'cosmos',
  NEAR: 'near',
  ARB: 'arbitrum',
  OP: 'optimism',
  AAVE: 'aave',
  UNI: 'uniswap',
  USDC: 'usd-coin',
}

const MARKET_COINS = [
  { symbol: 'BTC', name: 'Bitcoin', icon: '₿' },
  { symbol: 'ETH', name: 'Ethereum', icon: '⟠' },
  { symbol: 'SOL', name: 'Solana', icon: '◎' },
  { symbol: 'BNB', name: 'BNB', icon: '⬡' },
  { symbol: 'XRP', name: 'XRP', icon: '✕' },
  { symbol: 'ADA', name: 'Cardano', icon: '₳' },
  { symbol: 'AVAX', name: 'Avalanche', icon: '▲' },
  { symbol: 'DOT', name: 'Polkadot', icon: '●' },
  { symbol: 'MATIC', name: 'Polygon', icon: '◈' },
  { symbol: 'LINK', name: 'Chainlink', icon: '⬡' },
  { symbol: 'DOGE', name: 'Dogecoin', icon: 'Ð' },
  { symbol: 'ATOM', name: 'Cosmos', icon: '⚛' },
  { symbol: 'NEAR', name: 'NEAR', icon: 'Ⓝ' },
  { symbol: 'ARB', name: 'Arbitrum', icon: '◌' },
  { symbol: 'OP', name: 'Optimism', icon: '○' },
  { symbol: 'AAVE', name: 'Aave', icon: '👻' },
  { symbol: 'UNI', name: 'Uniswap', icon: '🦄' },
  { symbol: 'USDC', name: 'USD Coin', icon: '$' },
]

const FALLBACK = {
  BTC: { price: 67000, change: 2.1 },
  ETH: { price: 3200, change: 1.8 },
  SOL: { price: 180, change: 3.2 },
  BNB: { price: 420, change: 0.9 },
  XRP: { price: 0.62, change: -0.5 },
  ADA: { price: 0.45, change: 1.2 },
  AVAX: { price: 38, change: 2.4 },
  DOT: { price: 7.8, change: -1.1 },
  MATIC: { price: 0.85, change: 1.5 },
  LINK: { price: 14.2, change: 2.8 },
  DOGE: { price: 0.12, change: 4.2 },
  ATOM: { price: 9.4, change: -0.8 },
  NEAR: { price: 5.8, change: 3.1 },
  ARB: { price: 1.12, change: 1.9 },
  OP: { price: 2.34, change: 2.2 },
  AAVE: { price: 92, change: 1.4 },
  UNI: { price: 8.5, change: 1.3 },
  USDC: { price: 1.0, change: 0.0 },
}

let marketCache = null, lastFetch = 0

// ─────────────────────────────────────────────────────────────────────
//  LOCAL STORAGE CACHING & API USAGE TRACKING
// ─────────────────────────────────────────────────────────────────────

/**
 * Load cached market data from localStorage
 */
function loadCacheFromStorage() {
  try {
    const cached = localStorage.getItem(MARKET_CACHE_KEY)
    if (cached) {
      const { data, timestamp } = JSON.parse(cached)
      // Use cache if less than 5 minutes old
      if (Date.now() - timestamp < 5 * 60 * 1000) {
        console.log('📦 Loaded market data from localStorage cache')
        return data
      }
    }
  } catch (err) {
    console.warn('⚠️ Failed to load market cache from localStorage:', err)
  }
  return null
}

/**
 * Save market data to localStorage
 */
function saveCacheToStorage(data) {
  try {
    localStorage.setItem(MARKET_CACHE_KEY, JSON.stringify({
      data,
      timestamp: Date.now()
    }))
  } catch (err) {
    console.warn('⚠️ Failed to save market cache to localStorage:', err)
  }
}

/**
 * Track API usage to stay within rate limits
 */
function trackAPIUsage(provider) {
  try {
    const usage = JSON.parse(localStorage.getItem(USAGE_KEY) || '{}')
    const today = new Date().toISOString().split('T')[0]
    
    if (!usage[today]) {
      usage[today] = {}
    }
    
    if (!usage[today][provider]) {
      usage[today][provider] = 0
    }
    
    usage[today][provider]++
    
    // Save with 7-day retention
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    Object.keys(usage).forEach(date => {
      if (date < cutoff) delete usage[date]
    })
    
    localStorage.setItem(USAGE_KEY, JSON.stringify(usage))
    
    return usage[today][provider]
  } catch (err) {
    console.warn('⚠️ Failed to track API usage:', err)
    return 0
  }
}

/**
 * Get API usage for today
 */
function getAPIUsage(provider) {
  try {
    const usage = JSON.parse(localStorage.getItem(USAGE_KEY) || '{}')
    const today = new Date().toISOString().split('T')[0]
    return usage[today]?.[provider] || 0
  } catch (err) {
    return 0
  }
}

/**
 * Get all API usage statistics
 */
export function getAPIUsageStats() {
  try {
    const usage = JSON.parse(localStorage.getItem(USAGE_KEY) || '{}')
    const today = new Date().toISOString().split('T')[0]
    
    const stats = {
      today: usage[today] || {},
      totalToday: Object.values(usage[today] || {}).reduce((sum, count) => sum + count, 0),
      history: usage,
    }
    
    return stats
  } catch (err) {
    console.warn('⚠️ Failed to get API usage stats:', err)
    return { today: {}, totalToday: 0, history: {} }
  }
}

/**
 * Clear API usage tracking data
 */
export function clearAPIUsage() {
  try {
    localStorage.removeItem(USAGE_KEY)
    console.log('🗑️ API usage tracking cleared')
    return true
  } catch (err) {
    console.warn('⚠️ Failed to clear API usage:', err)
    return false
  }
}

/**
 * Clear all caches
 */
export function clearAllCaches() {
  try {
    localStorage.removeItem(MARKET_CACHE_KEY)
    localStorage.removeItem('dwallet_price_cache')
    marketCache = null
    lastFetch = 0
    console.log('🗑️ All caches cleared')
    return true
  } catch (err) {
    console.warn('⚠️ Failed to clear caches:', err)
    return false
  }
}

/**
 * Automatic cache management when approaching rate limits
 * Should be called before making API requests
 */
export function checkAndClearIfApproachingLimit() {
  const cmcUsage = getAPIUsage('coinmarketcap')
  
  // At 9K calls (90% of limit), clear caches to maximize fresh data from DeFi Llama
  if (cmcUsage >= 9000) {
    console.warn('🚨 CoinMarketCap at 90% limit (', cmcUsage, '/10K). Clearing caches to prioritize DeFi Llama.')
    clearAllCaches()
    return true
  }
  
  // At 8K calls (80% of limit), warn but don't clear yet
  if (cmcUsage >= 8000) {
    console.warn('⚠️ CoinMarketCap approaching limit:', cmcUsage, '/10K')
    return false
  }
  
  return false
}

export async function fetchMarketData() {
  const now = Date.now()
  
  // Check if we're approaching rate limits before fetching
  checkAndClearIfApproachingLimit()
  
  // Try to load from localStorage cache first
  const storedCache = loadCacheFromStorage()
  if (storedCache && now - lastFetch < CACHE_TTL) {
    console.log('📦 Using in-memory cached market data')
    return marketCache
  }
  
  if (storedCache && Array.isArray(storedCache) && storedCache.length > 0) {
    console.log('📦 Using localStorage cached market data')
    marketCache = storedCache
    lastFetch = now
    return marketCache
  }
  
  const symbols = MARKET_COINS.map(c => c.symbol).join(',')
  
  // ─────────────────────────────────────────────────────────────────────
  //  MULTI-API FALLBACK STRATEGY
  //  1. DeFi Llama (FREE, no key, unlimited)
  //  2. CoinMarketCap (10K calls/month)
  //  3. Fallback to existing cache
  // ─────────────────────────────────────────────────────────────────────
  
  // Try to fetch with graceful degradation
  const result = await withGracefulDegradation(
    // Primary: Fetch from DeFi Llama (FREE, no key needed)
    async () => {
      const startTime = Date.now()
      const usage = trackAPIUsage('defi_llama_market')
      
      console.log(`🦙 Fetching market data from DeFi Llama (call #${usage} today)`)
      
      // Build coin queries for DeFi Llama
      const coinQueries = MARKET_COINS
        .filter(c => COINGECKO_IDS[c.symbol])
        .map(c => `coingecko:${COINGECKO_IDS[c.symbol]}`)
        .join(',')
      
      const res = await fetch(
        `${DEFI_LLAMA_BASE_URL}/prices/current/${coinQueries}`,
        { signal: AbortSignal.timeout(8000) },
      )
      
      if (!res.ok) {
        throw new Error(`DeFi Llama API returned status: ${res.status}`)
      }
      
      const rawData = await res.json()
      
      // Transform DeFi Llama response to our format
      const validatedData = []
      if (rawData.coins) {
        MARKET_COINS.forEach(coin => {
          const geckoId = COINGECKO_IDS[coin.symbol]
          if (geckoId) {
            const key = `coingecko:${geckoId}`
            const data = rawData.coins[key]
            
            if (data && data.price) {
              validatedData.push({
                symbol: coin.symbol,
                name: coin.name,
                icon: coin.icon,
                price: sanitizeNumber(data.price, { min: 0, max: 1e15, decimals: 8 }),
                change24h: 0, // DeFi Llama doesn't provide 24h change in this endpoint
                marketCap: 0, // Not available in this endpoint
                volume24h: 0, // Not available in this endpoint
                rank: 99,
              })
            }
          }
        })
      }
      
      if (validatedData.length === 0) {
        throw new Error('No valid market data from DeFi Llama')
      }
      
      const responseTime = Date.now() - startTime
      serviceHealth.recordSuccess('defi_llama_market', responseTime)
      console.log(`✅ DeFi Llama market data: ${validatedData.length} coins (${responseTime}ms)`)
      
      return validatedData
    },
    
    // Fallback 1: Fetch from CoinMarketCap
    async () => {
      const usage = getAPIUsage('coinmarketcap')
      
      // Check if we're approaching rate limit (8K/10K)
      if (usage >= 8000) {
        console.warn('⚠️ CoinMarketCap approaching rate limit:', usage)
        throw new Error('CoinMarketCap rate limit warning')
      }
      
      const startTime = Date.now()
      const callNum = trackAPIUsage('coinmarketcap')
      
      console.log(`💰 Fetching market data from CoinMarketCap (call #${callNum} today, limit: 10K)`)
      
      const res = await fetch(
        `${CMC_BASE_URL}/cryptocurrency/quotes/latest?symbol=${symbols}&convert=USD`,
        {
          headers: {
            'X-CMC_PRO_API_KEY': CMC_API_KEY,
          },
          signal: AbortSignal.timeout(8000),
        },
      )
      
      if (!res.ok) {
        throw new Error(`CoinMarketCap API returned status: ${res.status}`)
      }
      
      const rawData = await res.json()
      
      // Check API response structure
      if (rawData.status?.error_code !== 0) {
        throw new Error(`CoinMarketCap API error: ${rawData.status?.error_message || 'Unknown error'}`)
      }
      
      // Transform CoinMarketCap response to our format
      const validatedData = []
      if (rawData.data) {
        Object.entries(rawData.data).forEach(([symbol, data]) => {
          const coinInfo = MARKET_COINS.find(c => c.symbol === symbol)
          if (coinInfo && data.quote?.USD) {
            validatedData.push({
              symbol: symbol,
              name: coinInfo.name,
              icon: coinInfo.icon,
              price: sanitizeNumber(data.quote.USD.price, { min: 0, max: 1e15, decimals: 8 }),
              change24h: sanitizeNumber(data.quote.USD.percent_change_24h, { min: -100, max: 10000, decimals: 2 }),
              marketCap: sanitizeNumber(data.quote.USD.market_cap, { min: 0, max: 1e15, decimals: 0 }),
              volume24h: sanitizeNumber(data.quote.USD.volume_24h, { min: 0, max: 1e15, decimals: 0 }),
              rank: data.cmc_rank || 99,
            })
          }
        })
      }
      
      if (!Array.isArray(validatedData) || validatedData.length === 0) {
        throw new Error('Invalid market data structure')
      }
      
      const responseTime = Date.now() - startTime
      serviceHealth.recordSuccess('cmc_market', responseTime)
      console.log(`✅ CoinMarketCap market data: ${validatedData.length} coins (${responseTime}ms)`)
      
      return validatedData
    },
    
    // Fallback 2: Use cached data
    async () => {
      serviceHealth.recordFailure('market_fetch')
      console.warn('⚠️ All market data APIs failed, using cached data')
      return null // Signal to use existing cache
    },
    
    {
      context: 'market_fetch',
      maxRetries: 1,
      timeout: 8000
    }
  )
  
  // Update cache if successful
  if (result.success && result.data) {
    marketCache = result.data
    lastFetch = now
    
    // Save to localStorage for persistence
    saveCacheToStorage(marketCache)
    
    return marketCache
  }
  
  // Use existing cache
  if (marketCache) {
    console.log('📦 Using existing cached market data')
    return marketCache
  }
  
  // Last resort: use fallback prices
  console.warn('⚠️ No cache available, using fallback market data')
  return MARKET_COINS.map(coin => ({
    symbol: coin.symbol,
    name: coin.name,
    icon: coin.icon,
    price: FALLBACK[coin.symbol]?.price || 0,
    change24h: FALLBACK[coin.symbol]?.change || 0,
    marketCap: 0,
    volume24h: 0,
    rank: 99,
  }))
}

export function formatPrice(p) {
  if (p >= 1000)
    return '$' + p.toLocaleString('en-US', { maximumFractionDigits: 0 })
  if (p >= 1) return '$' + p.toFixed(2)
  if (p >= 0.01) return '$' + p.toFixed(4)
  return '$' + p.toFixed(6)
}

export function formatMarketCap(mc) {
  if (mc >= 1e12) return '$' + (mc / 1e12).toFixed(2) + 'T'
  if (mc >= 1e9) return '$' + (mc / 1e9).toFixed(1) + 'B'
  if (mc >= 1e6) return '$' + (mc / 1e6).toFixed(1) + 'M'
  return '$' + mc.toFixed(0)
}
