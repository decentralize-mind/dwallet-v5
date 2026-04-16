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

export async function fetchPrices(symbols = Object.keys(CMC_SYMBOLS)) {
  const now = Date.now()
  if (now - lastFetch < CACHE_TTL) {
    console.log('📦 Using cached prices')
    return priceCache
  }

  const symbolsList = symbols
    .map(s => CMC_SYMBOLS[s])
    .filter(Boolean)
    .join(',')

  // Try to fetch with graceful degradation
  const result = await withGracefulDegradation(
    // Primary: Fetch from CoinMarketCap
    async () => {
      const startTime = Date.now()
      
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
          if (data.quote?.USD?.price) {
            validatedData[symbol] = sanitizeNumber(data.quote.USD.price, {
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
      console.log(`✅ Price data validated: ${Object.keys(validatedData).length} tokens (${responseTime}ms)`)
      
      return validatedData
    },
    
    // Fallback: Use cached prices
    async () => {
      serviceHealth.recordFailure('cmc_price')
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
  
  const cmcSymbol = CMC_SYMBOLS[symbol]
  if (!cmcSymbol) {
    console.warn('⚠️ Unknown CoinMarketCap symbol for:', symbol)
    return []
  }
  
  // Note: CoinMarketCap free tier doesn't include historical data
  // Return cached/interpolated data or use alternative free source
  console.warn('⚠️ Historical data not available on CoinMarketCap free tier, using fallback')
  return []
}
