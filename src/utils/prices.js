// Live token prices via CoinGecko free API (no key required)
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
    if (!res.ok) throw new Error('CoinGecko API error')
    const data = await res.json()

    const updated = { ...priceCache }
    for (const [symbol, geckoId] of Object.entries(COINGECKO_IDS)) {
      if (data[geckoId]?.usd) updated[symbol] = data[geckoId].usd
    }
    priceCache = updated
    lastFetch = now
    return priceCache
  } catch {
    // Return cached/fallback silently
    return priceCache
  }
}

export function getPrice(symbol) {
  return priceCache[symbol] ?? FALLBACK_PRICES[symbol] ?? 1
}

// Fetch 7-day chart data for a token
export async function fetchPriceHistory(symbol, days = 7) {
  const geckoId = COINGECKO_IDS[symbol]
  if (!geckoId) return []
  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/coins/${geckoId}/market_chart?vs_currency=usd&days=${days}`,
      { signal: AbortSignal.timeout(5000) },
    )
    if (!res.ok) throw new Error()
    const data = await res.json()
    return data.prices.map(([ts, price]) => ({ ts, price }))
  } catch {
    return []
  }
}
