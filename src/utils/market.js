import { validateMarketData, sanitizeString, sanitizeNumber } from './dataValidation'
import { 
  withGracefulDegradation,
  getDetailedErrorLog,
  serviceHealth
} from './errorHandling'

// CoinMarketCap API configuration
const CMC_API_KEY = import.meta.env.VITE_CMC_API_KEY || '4d9b36ecced349f0a9e412daa69504d9'
const CMC_BASE_URL = 'https://pro-api.coinmarketcap.com/v1'

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
let marketCache = null,
  lastFetch = 0
const CACHE_TTL = 60000

export async function fetchMarketData() {
  const now = Date.now()
  if (marketCache && now - lastFetch < CACHE_TTL) {
    console.log('📦 Returning cached market data')
    return marketCache
  }
  
  const symbols = MARKET_COINS.map(c => c.symbol).join(',')
  
  // Try to fetch with graceful degradation
  const result = await withGracefulDegradation(
    // Primary: Fetch from CoinMarketCap
    async () => {
      const startTime = Date.now()
      
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
      console.log(`✅ Market data validated: ${validatedData.length} coins (${responseTime}ms)`)
      
      return validatedData
    },
    
    // Fallback: Use cached or static data
    async () => {
      serviceHealth.recordFailure('cmc_market')
      console.warn('⚠️ Using fallback market data')
      
      if (marketCache) {
        console.log('📦 Returning stale cached market data')
        return null // Signal to use existing cache
      }
      
      // Static fallback data
      return MARKET_COINS.map(coin => ({
        ...coin,
        price: FALLBACK[coin.symbol]?.price ?? 0,
        change24h: FALLBACK[coin.symbol]?.change ?? 0,
        marketCap: 0,
        volume24h: 0,
        rank: 99,
      }))
    },
    
    {
      context: 'market_data_fetch',
      maxRetries: 2,
      timeout: 8000
    }
  )
  
  // Process result
  if (result.success && result.data) {
    marketCache = result.data
    lastFetch = now
    return result.data
  }
  
  // Use existing cache if available
  if (marketCache) {
    console.log('📦 Using existing cached market data')
    return marketCache
  }
  
  // Final fallback
  console.log('🔄 Using static fallback market data')
  return MARKET_COINS.map(coin => ({
    ...coin,
    price: FALLBACK[coin.symbol]?.price ?? 0,
    change24h: FALLBACK[coin.symbol]?.change ?? 0,
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
