// Live token prices via CoinGecko free API (no key required)
import { validatePriceData, validatePriceHistory, sanitizeNumber } from './dataValidation'

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
  if (now - lastFetch < CACHE_TTL) return priceCache

  const ids = symbols
    .map(s => COINGECKO_IDS[s])
    .filter(Boolean)
    .join(',')

  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`,
      { signal: AbortSignal.timeout(5000) },
    )
    if (!res.ok) throw new Error('CoinGecko API returned status: ' + res.status)
    
    const rawData = await res.json()
    
    // Validate and sanitize price data
    const validatedData = validatePriceData(rawData, COINGECKO_IDS)
    
    if (Object.keys(validatedData).length === 0) {
      console.warn('⚠️ Price data validation returned empty')
      throw new Error('Invalid price data structure')
    }
    
    console.log(`✅ Price data validated: ${Object.keys(validatedData).length} tokens`)
    
    const updated = { ...priceCache, ...validatedData }
    priceCache = updated
    lastFetch = now
    return priceCache
  } catch (error) {
    console.error('❌ Price fetch error:', error.message)
    // Return cached/fallback silently
    return priceCache
  }
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
  
  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/coins/${geckoId}/market_chart?vs_currency=usd&days=${validDays}`,
      { signal: AbortSignal.timeout(5000) },
    )
    if (!res.ok) throw new Error('CoinGecko API returned status: ' + res.status)
    
    const rawData = await res.json()
    
    // Validate price history data
    if (!rawData || !rawData.prices || !Array.isArray(rawData.prices)) {
      console.warn('⚠️ Price history data structure invalid')
      return []
    }
    
    const validatedHistory = validatePriceHistory(rawData.prices)
    
    if (validatedHistory.length === 0) {
      console.warn('⚠️ Price history validation returned empty')
      return []
    }
    
    console.log(`✅ Price history validated: ${validatedHistory.length} points for ${symbol}`)
    return validatedHistory
  } catch (error) {
    console.error('❌ Price history fetch error:', error.message)
    return []
  }
}
