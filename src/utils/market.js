const MARKET_COINS = [
  { symbol: 'BTC', id: 'bitcoin', name: 'Bitcoin', icon: '₿' },
  { symbol: 'ETH', id: 'ethereum', name: 'Ethereum', icon: '⟠' },
  { symbol: 'SOL', id: 'solana', name: 'Solana', icon: '◎' },
  { symbol: 'BNB', id: 'binancecoin', name: 'BNB', icon: '⬡' },
  { symbol: 'XRP', id: 'ripple', name: 'XRP', icon: '✕' },
  { symbol: 'ADA', id: 'cardano', name: 'Cardano', icon: '₳' },
  { symbol: 'AVAX', id: 'avalanche-2', name: 'Avalanche', icon: '▲' },
  { symbol: 'DOT', id: 'polkadot', name: 'Polkadot', icon: '●' },
  { symbol: 'MATIC', id: 'matic-network', name: 'Polygon', icon: '◈' },
  { symbol: 'LINK', id: 'chainlink', name: 'Chainlink', icon: '⬡' },
  { symbol: 'DOGE', id: 'dogecoin', name: 'Dogecoin', icon: 'Ð' },
  { symbol: 'ATOM', id: 'cosmos', name: 'Cosmos', icon: '⚛' },
  { symbol: 'NEAR', id: 'near', name: 'NEAR', icon: 'Ⓝ' },
  { symbol: 'ARB', id: 'arbitrum', name: 'Arbitrum', icon: '◌' },
  { symbol: 'OP', id: 'optimism', name: 'Optimism', icon: '○' },
  { symbol: 'AAVE', id: 'aave', name: 'Aave', icon: '👻' },
  { symbol: 'UNI', id: 'uniswap', name: 'Uniswap', icon: '🦄' },
  { symbol: 'USDC', id: 'usd-coin', name: 'USD Coin', icon: '$' },
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
  if (marketCache && now - lastFetch < CACHE_TTL) return marketCache
  const ids = MARKET_COINS.map(c => c.id).join(',')
  try {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=' +
        ids +
        '&order=market_cap_desc&per_page=20&sparkline=false&price_change_percentage=24h',
      { signal: AbortSignal.timeout(8000) },
    )
    if (!res.ok) throw new Error('api error')
    const data = await res.json()
    const result = MARKET_COINS.map(coin => {
      const live = data.find(d => d.id === coin.id)
      const fb = FALLBACK[coin.symbol] || { price: 0, change: 0 }
      return {
        ...coin,
        price: live?.current_price ?? fb.price,
        change24h: live?.price_change_percentage_24h ?? fb.change,
        marketCap: live?.market_cap ?? 0,
        volume24h: live?.total_volume ?? 0,
        rank: live?.market_cap_rank ?? 99,
      }
    })
    marketCache = result
    lastFetch = now
    return result
  } catch {
    if (marketCache) return marketCache
    return MARKET_COINS.map(coin => ({
      ...coin,
      price: FALLBACK[coin.symbol]?.price ?? 0,
      change24h: FALLBACK[coin.symbol]?.change ?? 0,
      marketCap: 0,
      volume24h: 0,
      rank: 99,
    }))
  }
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
