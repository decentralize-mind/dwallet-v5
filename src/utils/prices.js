// Live token prices via CoinMarketCap API with DeFi Llama fallback
import { validatePriceData, validatePriceHistory, sanitizeNumber } from './dataValidation'
import { 
  withGracefulDegradation,
  serviceHealth
} from './errorHandling'

// CoinMarketCap API configuration
const CMC_API_KEY = import.meta.env.VITE_CMC_API_KEY || '4d9b36ecced349f0a9e412daa69504d9'
const CMC_BASE_URL = 'https://pro-api.coinmarketcap.com/v1'

// DeFi Llama API configuration (FREE, no key needed)
const DEFI_LLAMA_BASE_URL = 'https://coins.llama.fi'

// CoinMarketCap symbol mapping
const CMC_SYMBOLS = {
  ETH: 'ethereum',
  WETH: 'ethereum',
  BTC: 'bitcoin',
  WBTC: 'wrapped-bitcoin',
  BNB: 'binancecoin',
  MATIC: 'matic-network',
  SOL: 'solana',
  USDC: 'usd-coin',
  USDT: 'tether',
  DAI: 'dai',
  UNI: 'uniswap',
  LINK: 'chainlink',
  CAKE: 'pancakeswap-token',
  AAVE: 'aave',
  stETH: 'staked-ether',
  rETH: 'rocket-pool-eth',
}

// Fallback prices used when API is unavailable
const FALLBACK_PRICES = {
  ETH: 3200,
  WETH: 3200,
  BTC: 67000,
  WBTC: 67000,
  BNB: 420,
  MATIC: 0.85,
  SOL: 180,
  USDC: 1,
  USDT: 1,
  DAI: 1,
  UNI: 8.5,
  LINK: 14.2,
  CAKE: 2.5,
  AAVE: 92,
  stETH: 3185,
  rETH: 3350,
  DWT: 3.5,
}

let priceCache = { ...FALLBACK_PRICES }
let lastFetch = 0
const CACHE_TTL = 60_000 // 1 minute

// ─────────────────────────────────────────────────────────────────────
//  LOCAL STORAGE CACHING & API USAGE TRACKING
// ─────────────────────────────────────────────────────────────────────

const CACHE_KEY = 'dwallet_price_cache'
const USAGE_KEY = 'dwallet_api_usage'

/**
 * Load cached prices from localStorage
 */
function loadCacheFromStorage() {
  try {
    const cached = localStorage.getItem(CACHE_KEY)
    if (cached) {
      const { data, timestamp } = JSON.parse(cached)
      // Use cache if less than 5 minutes old
      if (Date.now() - timestamp < 5 * 60 * 1000) {
        console.log('📦 Loaded prices from localStorage cache')
        return data
      }
    }
  } catch (err) {
    console.warn('⚠️ Failed to load price cache from localStorage:', err)
  }
  return null
}

/**
 * Save prices to localStorage
 */
function saveCacheToStorage(data) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      data,
      timestamp: Date.now()
    }))
  } catch (err) {
    console.warn('⚠️ Failed to save price cache to localStorage:', err)
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
 * Check if we're approaching rate limits and clear cache if needed
 */
export function checkAndClearIfApproachingLimit() {
  const cmcUsage = getAPIUsage('coinmarketcap')
  
  // At 9K calls (90% of limit), clear caches to maximize fresh data from DeFi Llama
  if (cmcUsage >= 9000) {
    console.warn('🚨 CoinMarketCap at 90% limit (', cmcUsage, '/10K). Clearing caches to prioritize DeFi Llama.')
    try {
      localStorage.removeItem(CACHE_KEY)
      localStorage.removeItem('dwallet_market_cache')
      priceCache = { ...FALLBACK_PRICES }
      lastFetch = 0
      console.log('🗑️ Price caches cleared')
    } catch (err) {
      console.warn('⚠️ Failed to clear price caches:', err)
    }
    return true
  }
  
  // At 8K calls (80% of limit), warn but don't clear yet
  if (cmcUsage >= 8000) {
    console.warn('⚠️ CoinMarketCap approaching limit:', cmcUsage, '/10K')
    return false
  }
  
  return false
}

export async function fetchPrices(symbols = Object.keys(CMC_SYMBOLS)) {
  const now = Date.now()
  
  // Check if we're approaching rate limits before fetching
  checkAndClearIfApproachingLimit()
  
  // Try to load from localStorage cache first
  const storedCache = loadCacheFromStorage()
  if (storedCache && now - lastFetch < CACHE_TTL) {
    console.log('📦 Using in-memory cached prices')
    return priceCache
  }
  
  if (storedCache && Object.keys(storedCache).length > 0) {
    console.log('📦 Using localStorage cached prices')
    priceCache = { ...priceCache, ...storedCache }
    lastFetch = now
    return priceCache
  }

  const symbolsList = symbols
    .map(s => CMC_SYMBOLS[s])
    .filter(Boolean)
    .join(',')

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
      const usage = trackAPIUsage('defi_llama')
      
      console.log(`🦙 Fetching from DeFi Llama (call #${usage} today)`)
      
      // DeFi Llama accepts coin addresses in format: chain:address
      // For common tokens, we can use their symbols
      const coinQueries = symbols
        .filter(s => CMC_SYMBOLS[s])
        .map(s => {
          // Map common symbols to DeFi Llama format
          const mapping = {
            'ETH': 'coingecko:ethereum',
            'BTC': 'coingecko:bitcoin',
            'WBTC': 'coingecko:wrapped-bitcoin',
            'USDC': 'coingecko:usd-coin',
            'USDT': 'coingecko:tether',
            'DAI': 'coingecko:dai',
            'UNI': 'coingecko:uniswap',
            'LINK': 'coingecko:chainlink',
            'AAVE': 'coingecko:aave',
            'SOL': 'coingecko:solana',
            'BNB': 'coingecko:binancecoin',
            'MATIC': 'coingecko:matic-network',
            'stETH': 'coingecko:staked-ether',
            'rETH': 'coingecko:rocket-pool-eth',
          }
          return mapping[s] || `coingecko:${CMC_SYMBOLS[s]}`
        })
        .join(',')
      
      const res = await fetch(
        `${DEFI_LLAMA_BASE_URL}/prices/current/${coinQueries}`,
        { signal: AbortSignal.timeout(5000) },
      )
      
      if (!res.ok) {
        throw new Error(`DeFi Llama API returned status: ${res.status}`)
      }
      
      const rawData = await res.json()
      
      // Transform DeFi Llama response to our format
      const validatedData = {}
      if (rawData.coins) {
        Object.entries(rawData.coins).forEach(([key, data]) => {
          if (data.price) {
            // Extract symbol from key (e.g., "coingecko:ethereum" -> "ETH")
            const geckoId = key.split(':')[1]
            const symbol = Object.keys(CMC_SYMBOLS).find(
              s => CMC_SYMBOLS[s] === geckoId
            )
            if (symbol) {
              validatedData[symbol] = sanitizeNumber(data.price, {
                min: 0,
                max: 1e15,
                decimals: 8
              })
            }
          }
        })
      }
      
      if (Object.keys(validatedData).length === 0) {
        throw new Error('No valid price data from DeFi Llama')
      }
      
      const responseTime = Date.now() - startTime
      serviceHealth.recordSuccess('defi_llama_price', responseTime)
      console.log(`✅ DeFi Llama price data: ${Object.keys(validatedData).length} tokens (${responseTime}ms)`)
      
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
      
      console.log(`💰 Fetching from CoinMarketCap (call #${callNum} today, limit: 10K)`)
      
      const res = await fetch(
        `${CMC_BASE_URL}/cryptocurrency/quotes/latest?symbol=${symbolsList}&convert=USD`,
        {
          headers: {
            'X-CMC_PRO_API_KEY': CMC_API_KEY,
          },
          signal: AbortSignal.timeout(5000),
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
      const validatedData = {}
      if (rawData.data) {
        Object.entries(rawData.data).forEach(([symbol, data]) => {
          // Reverse mapping: CMC symbol -> our symbol
          const ourSymbol = Object.keys(CMC_SYMBOLS).find(
            s => CMC_SYMBOLS[s] === symbol || s === symbol
          )
          if (ourSymbol && data.quote?.USD?.price) {
            validatedData[ourSymbol] = sanitizeNumber(data.quote.USD.price, {
              min: 0,
              max: 1e15,
              decimals: 8
            })
          }
        })
      }
      
      if (Object.keys(validatedData).length === 0) {
        throw new Error('Invalid price data structure')
      }
      
      const responseTime = Date.now() - startTime
      serviceHealth.recordSuccess('cmc_price', responseTime)
      console.log(`✅ CoinMarketCap price data: ${Object.keys(validatedData).length} tokens (${responseTime}ms)`)
      
      return validatedData
    },
    
    // Fallback 2: Use cached prices
    async () => {
      serviceHealth.recordFailure('price_fetch')
      console.warn('⚠️ All price APIs failed, using cached prices')
      return null // Signal to use existing cache
    },
    
    {
      context: 'price_fetch',
      maxRetries: 1,
      timeout: 5000
    }
  )
  
  // Update cache if successful
  if (result.success && result.data) {
    const updated = { ...priceCache, ...result.data }
    priceCache = updated
    lastFetch = now
    
    // Save to localStorage for persistence
    saveCacheToStorage(priceCache)
    
    return priceCache
  }
  
  // Use existing cache
  console.log('📦 Using existing cached prices')
  return priceCache
}

export function getPrice(symbol) {
  // Validate symbol
  if (typeof symbol !== 'string' || symbol.length === 0 || symbol.length > 20) {
    console.warn('⚠️ Invalid price symbol:', symbol)
    return 1
  }
  
  const price = priceCache[symbol] ?? FALLBACK_PRICES[symbol] ?? 1
  
  // Ensure price is a valid number
  return sanitizeNumber(price, { min: 0, max: 1e15, decimals: 8 })
}

// Fetch historical price chart data for a token using DeFi Llama (FREE)
export async function fetchPriceHistory(symbol, days = 7) {
  // Validate symbol
  if (typeof symbol !== 'string' || symbol.length === 0 || symbol.length > 20) {
    console.warn('⚠️ Invalid price history symbol:', symbol)
    return []
  }
  
  // Validate days parameter
  const validDays = sanitizeNumber(days, { min: 1, max: 365, decimals: 0 })
  if (validDays < 1) {
    console.warn('⚠️ Invalid days parameter:', days)
    return []
  }
  
  const geckoId = CMC_SYMBOLS[symbol]
  if (!geckoId) {
    console.warn('⚠️ Unknown symbol for price history:', symbol)
    return []
  }
  
  // Try to fetch with graceful degradation
  const result = await withGracefulDegradation(
    // Primary: Fetch from DeFi Llama (FREE, no key needed)
    async () => {
      const startTime = Date.now()
      const usage = trackAPIUsage('defi_llama_history')
      
      console.log(`🦙 Fetching price history from DeFi Llama (call #${usage} today)`)
      
      const res = await fetch(
        `${DEFI_LLAMA_BASE_URL}/chart/${geckoId}`,
        { signal: AbortSignal.timeout(5000) },
      )
      
      if (!res.ok) {
        throw new Error(`DeFi Llama chart API returned status: ${res.status}`)
      }
      
      const rawData = await res.json()
      
      // DeFi Llama returns: [{ timestamp, price }]
      if (!Array.isArray(rawData) || rawData.length === 0) {
        throw new Error('Invalid price history structure')
      }
      
      // Validate and transform data
      const validatedHistory = rawData
        .filter(point => point.timestamp && point.price)
        .map(point => [
          point.timestamp * 1000, // Convert to milliseconds
          sanitizeNumber(point.price, { min: 0, max: 1e15, decimals: 8 })
        ])
        .filter(point => point[1] > 0)
      
      if (validatedHistory.length === 0) {
        throw new Error('No valid price history data')
      }
      
      const responseTime = Date.now() - startTime
      serviceHealth.recordSuccess('defi_llama_history', responseTime)
      console.log(`✅ Price history from DeFi Llama: ${validatedHistory.length} points (${responseTime}ms)`)
      
      return validatedHistory
    },
    
    // Fallback: Return empty array (silent failure for chart data)
    async () => {
      serviceHealth.recordFailure('defi_llama_history')
      console.warn(`⚠️ Price history fetch failed for ${symbol}, showing empty chart`)
      return []
    },
    
    {
      context: `price_history_${symbol}`,
      maxRetries: 1,
      timeout: 5000
    }
  )
  
  return result.success ? result.data : []
}
