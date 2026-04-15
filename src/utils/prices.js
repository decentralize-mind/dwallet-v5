// Live token prices via CoinGecko free API (no key required)
import { validatePriceData, validatePriceHistory, sanitizeNumber } from './dataValidation'
import { 
  withGracefulDegradation,
  serviceHealth
} from './errorHandling'

const COINGECKO_IDS = {
  ETH: 'ethereum',
  WETH: 'weth',
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

export async function fetchPrices(symbols = Object.keys(COINGECKO_IDS)) {
  const now = Date.now()
  if (now - lastFetch < CACHE_TTL) {
    console.log('📦 Using cached prices')
    return priceCache
  }

  const ids = symbols
    .map(s => COINGECKO_IDS[s])
    .filter(Boolean)
    .join(',')

  // Try to fetch with graceful degradation
  const result = await withGracefulDegradation(
    // Primary: Fetch from CoinGecko
    async () => {
      const startTime = Date.now()
      
      const res = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`,
        { signal: AbortSignal.timeout(5000) },
      )
      
      if (!res.ok) {
        throw new Error(`CoinGecko API returned status: ${res.status}`)
      }
      
      const rawData = await res.json()
      const validatedData = validatePriceData(rawData, COINGECKO_IDS)
      
      if (Object.keys(validatedData).length === 0) {
        throw new Error('Invalid price data structure')
      }
      
      const responseTime = Date.now() - startTime
      serviceHealth.recordSuccess('coingecko_price', responseTime)
      console.log(`✅ Price data validated: ${Object.keys(validatedData).length} tokens (${responseTime}ms)`)
      
      return validatedData
    },
    
    // Fallback: Use cached prices
    async () => {
      serviceHealth.recordFailure('coingecko_price')
      console.warn('⚠️ Price fetch failed, using cached prices')
      return null // Signal to use existing cache
    },
    
    {
      context: 'price_fetch',
      maxRetries: 2,
      timeout: 5000
    }
  )
  
  // Update cache if successful
  if (result.success && result.data) {
    const updated = { ...priceCache, ...result.data }
    priceCache = updated
    lastFetch = now
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

// Fetch 7-day chart data for a token
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
  
  const geckoId = COINGECKO_IDS[symbol]
  if (!geckoId) {
    console.warn('⚠️ Unknown CoinGecko ID for symbol:', symbol)
    return []
  }
  
  // Try to fetch with graceful degradation
  const result = await withGracefulDegradation(
    // Primary: Fetch from CoinGecko
    async () => {
      const startTime = Date.now()
      
      const res = await fetch(
        `https://api.coingecko.com/api/v3/coins/${geckoId}/market_chart?vs_currency=usd&days=${validDays}`,
        { signal: AbortSignal.timeout(5000) },
      )
      
      if (!res.ok) {
        // Handle rate limiting (429) gracefully
        if (res.status === 429) {
          console.warn(`⚠️ CoinGecko rate limited for ${symbol}, using fallback`)
          throw new Error('Rate limited')
        }
        throw new Error(`CoinGecko API returned status: ${res.status}`)
      }
      
      const rawData = await res.json()
      
      if (!rawData || !rawData.prices || !Array.isArray(rawData.prices)) {
        throw new Error('Invalid price history structure')
      }
      
      const validatedHistory = validatePriceHistory(rawData.prices)
      
      if (validatedHistory.length === 0) {
        throw new Error('No valid price history data')
      }
      
      const responseTime = Date.now() - startTime
      serviceHealth.recordSuccess('coingecko_history', responseTime)
      console.log(`✅ Price history validated: ${validatedHistory.length} points for ${symbol} (${responseTime}ms)`)
      
      return validatedHistory
    },
    
    // Fallback: Return empty array (silent failure for chart data)
    async () => {
      serviceHealth.recordFailure('coingecko_history')
      console.warn(`⚠️ Price history fetch failed for ${symbol}, showing empty chart`)
      return []
    },
    
    {
      context: `price_history_${symbol}`,
      maxRetries: 1, // Only 1 retry for rate limiting
      timeout: 5000
    }
  )
  
  return result.success ? result.data : []
}
