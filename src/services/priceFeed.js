/**
 * Price Feed Service
 * 
 * Fetches and caches token prices from multiple sources.
 * Provides real-time price updates with fallback mechanisms.
 */

import axios from 'axios'
import { getTokenPrice } from './dexAggregator'

// Price cache with TTL
const priceCache = new Map()
const CACHE_TTL = 30000 // 30 seconds

/**
 * Get token price with caching
 */
export async function getCachedTokenPrice(tokenSymbol, currency = 'usd') {
  const cacheKey = `${tokenSymbol}_${currency}`
  const cached = priceCache.get(cacheKey)

  // Return cached price if still valid
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.price
  }

  // Fetch fresh price
  const price = await getTokenPrice(tokenSymbol, currency)
  
  if (price !== null) {
    priceCache.set(cacheKey, {
      price,
      timestamp: Date.now(),
    })
  }

  return price
}

/**
 * Get prices for multiple tokens
 */
export async function getTokenPrices(tokenSymbols, currency = 'usd') {
  const prices = {}
  
  // Fetch all in parallel
  const promises = tokenSymbols.map(async symbol => {
    const price = await getCachedTokenPrice(symbol, currency)
    return { symbol, price }
  })

  const results = await Promise.allSettled(promises)
  
  results.forEach(result => {
    if (result.status === 'fulfilled') {
      prices[result.value.symbol] = result.value.price
    }
  })

  return prices
}

/**
 * Calculate USD value of token amount
 */
export async function calculateUSDValue({
  tokenSymbol,
  amount,
  currency = 'usd',
}) {
  const price = await getCachedTokenPrice(tokenSymbol, currency)
  
  if (!price) return null
  
  return (parseFloat(amount) * price).toFixed(2)
}

/**
 * Get price change percentage (24h)
 */
export async function getPriceChange24h(tokenSymbol) {
  try {
    const tokenMap = {
      ETH: 'ethereum',
      WETH: 'ethereum',
      USDC: 'usd-coin',
      USDT: 'tether',
      DAI: 'dai',
    }

    const coinId = tokenMap[tokenSymbol.toUpperCase()]
    if (!coinId) return null

    const response = await axios.get(
      `https://api.coingecko.com/api/v3/simple/price`,
      {
        params: {
          ids: coinId,
          vs_currencies: 'usd',
          include_24hr_change: true,
        },
        timeout: 3000,
      }
    )

    return response.data[coinId]?.usd_24h_change || null
  } catch (error) {
    console.warn('Failed to fetch price change:', error.message)
    return null
  }
}

/**
 * Clear price cache
 */
export function clearPriceCache() {
  priceCache.clear()
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
  return {
    size: priceCache.size,
    entries: Array.from(priceCache.entries()).map(([key, value]) => ({
      key,
      age: Date.now() - value.timestamp,
      ttl: CACHE_TTL,
    })),
  }
}

/**
 * Price alert system
 * Monitors prices and triggers callbacks when thresholds are reached
 */
export class PriceAlertManager {
  constructor() {
    this.alerts = []
    this.monitoring = false
    this.interval = null
  }

  /**
   * Add price alert
   */
  addAlert({
    tokenSymbol,
    targetPrice,
    condition, // 'above' or 'below'
    callback,
  }) {
    const alert = {
      id: Date.now().toString(),
      tokenSymbol,
      targetPrice,
      condition,
      callback,
      active: true,
    }

    this.alerts.push(alert)
    
    // Start monitoring if not already
    if (!this.monitoring) {
      this.startMonitoring()
    }

    return alert.id
  }

  /**
   * Remove price alert
   */
  removeAlert(alertId) {
    this.alerts = this.alerts.filter(a => a.id !== alertId)
  }

  /**
   * Start monitoring prices
   */
  startMonitoring() {
    if (this.monitoring) return

    this.monitoring = true
    this.interval = setInterval(async () => {
      await this.checkAlerts()
    }, 10000) // Check every 10 seconds
  }

  /**
   * Stop monitoring prices
   */
  stopMonitoring() {
    this.monitoring = false
    if (this.interval) {
      clearInterval(this.interval)
      this.interval = null
    }
  }

  /**
   * Check all alerts
   */
  async checkAlerts() {
    const uniqueTokens = [...new Set(this.alerts.map(a => a.tokenSymbol))]
    
    for (const token of uniqueTokens) {
      const price = await getCachedTokenPrice(token)
      if (!price) continue

      const tokenAlerts = this.alerts.filter(
        a => a.tokenSymbol === token && a.active
      )

      for (const alert of tokenAlerts) {
        let triggered = false

        if (alert.condition === 'above' && price >= alert.targetPrice) {
          triggered = true
        } else if (alert.condition === 'below' && price <= alert.targetPrice) {
          triggered = true
        }

        if (triggered) {
          alert.callback({
            token: alert.tokenSymbol,
            price,
            targetPrice: alert.targetPrice,
            condition: alert.condition,
          })

          // One-time alert, deactivate
          alert.active = false
        }
      }
    }
  }

  /**
   * Get active alerts
   */
  getActiveAlerts() {
    return this.alerts.filter(a => a.active)
  }
}

// Singleton instance
export const priceAlertManager = new PriceAlertManager()
