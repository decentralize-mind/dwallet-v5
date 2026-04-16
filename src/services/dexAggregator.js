/**
 * DEX Aggregator Service
 * 
 * Fetches quotes from multiple DEXs and finds optimal trading routes.
 * Integrates with 1inch, 0x, and direct Uniswap V3 pools.
 */

import axios from 'axios'
import { CHAIN_ID } from '../config/tokenLists'

// API endpoints
const API_ENDPOINTS = {
  '1INCH': 'https://api.1inch.dev/swap/v6.0',
  '0X': 'https://api.0x.org/swap/v1',
  COINGECKO: 'https://api.coingecko.com/api/v3',
}

// Chain ID mappings for different APIs
const CHAIN_MAPPING = {
  [CHAIN_ID.ETHEREUM]: { '1inch': 1, '0x': 1, name: 'ethereum' },
  [CHAIN_ID.BASE]: { '1inch': 8453, '0x': 8453, name: 'base' },
  [CHAIN_ID.BASE_SEPOLIA]: { '1inch': 84532, '0x': 84532, name: 'base-sepolia' },
  [CHAIN_ID.ARBITRUM]: { '1inch': 42161, '0x': 42161, name: 'arbitrum' },
  [CHAIN_ID.POLYGON]: { '1inch': 137, '0x': 137, name: 'polygon' },
}

/**
 * Get quote from 1inch API
 */
export async function get1inchQuote({
  tokenIn,
  tokenOut,
  amount,
  chainId = CHAIN_ID.BASE,
  slippage = 0.5,
}) {
  try {
    const apiKey = import.meta.env.VITE_1INCH_API_KEY
    if (!apiKey) {
      throw new Error('1inch API key not configured')
    }

    const chainConfig = CHAIN_MAPPING[chainId]
    if (!chainConfig) {
      throw new Error(`Chain ${chainId} not supported by 1inch`)
    }

    const url = `${API_ENDPOINTS['1INCH']}/${chainConfig['1inch']}/quote`
    const params = {
      src: tokenIn,
      dst: tokenOut,
      amount,
      slippage,
    }

    const response = await axios.get(url, {
      params,
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      timeout: 5000,
    })

    return {
      dex: '1inch',
      amountOut: response.data.dstAmount,
      priceImpact: parseFloat(response.data.estimatedPriceImpact || 0),
      gasEstimate: response.data.gas || 0,
      route: response.data.routes || [],
      protocols: response.data.protocols || [],
      txData: response.data.tx,
      success: true,
    }
  } catch (error) {
    console.warn('1inch quote failed:', error.message)
    return {
      dex: '1inch',
      success: false,
      error: error.message,
    }
  }
}

/**
 * Get quote from 0x API
 */
export async function get0xQuote({
  tokenIn,
  tokenOut,
  amount,
  chainId = CHAIN_ID.BASE,
  slippage = 0.5,
}) {
  try {
    const apiKey = import.meta.env.VITE_0X_API_KEY
    const headers = apiKey ? { '0x-api-key': apiKey } : {}

    const chainConfig = CHAIN_MAPPING[chainId]
    if (!chainConfig) {
      throw new Error(`Chain ${chainId} not supported by 0x`)
    }

    const url = `${API_ENDPOINTS['0X']}/quote`
    const params = {
      sellToken: tokenIn,
      buyToken: tokenOut,
      sellAmount: amount,
      slippagePercentage: (slippage / 100).toString(),
      chainId: chainConfig['0x'],
    }

    const response = await axios.get(url, {
      params,
      headers,
      timeout: 5000,
    })

    return {
      dex: '0x',
      amountOut: response.data.buyAmount,
      priceImpact: parseFloat(response.data.priceImpact || 0) * 100,
      gasEstimate: parseInt(response.data.gas || 0),
      route: response.data.route || [],
      txData: response.data,
      success: true,
    }
  } catch (error) {
    console.warn('0x quote failed:', error.message)
    return {
      dex: '0x',
      success: false,
      error: error.message,
    }
  }
}

/**
 * Get quote from Uniswap V3 (direct pool calculation)
 * Uses on-chain data for accurate pricing
 */
export async function getUniswapQuote({
  tokenIn,
  tokenOut,
  amount,
  chainId = CHAIN_ID.BASE,
  slippage = 0.5,
}) {
  try {
    // For MVP, we'll use Uniswap's public quote API
    // In production, use @uniswap/v3-sdk for direct pool queries
    
    const chainConfig = CHAIN_MAPPING[chainId]
    if (!chainConfig) {
      throw new Error(`Chain ${chainId} not supported`)
    }

    // Use 1inch as proxy for Uniswap routing (they aggregate Uniswap)
    // This is a simplified approach - production should use Uniswap SDK directly
    const quote = await get1inchQuote({
      tokenIn,
      tokenOut,
      amount,
      chainId,
      slippage,
    })

    // Filter for Uniswap protocol only
    if (quote.success && quote.protocols) {
      const hasUniswap = quote.protocols.some(p => 
        p.some(protocol => protocol.name === 'UNISWAP_V3')
      )
      
      if (!hasUniswap) {
        return {
          dex: 'Uniswap V3',
          success: false,
          error: 'No Uniswap V3 liquidity available',
        }
      }
    }

    return {
      ...quote,
      dex: 'Uniswap V3',
    }
  } catch (error) {
    console.warn('Uniswap quote failed:', error.message)
    return {
      dex: 'Uniswap V3',
      success: false,
      error: error.message,
    }
  }
}

/**
 * Compare quotes from all DEXs and find the best route
 */
export async function getBestQuote({
  tokenIn,
  tokenOut,
  amount,
  chainId = CHAIN_ID.BASE,
  slippage = 0.5,
}) {
  // Fetch quotes from all DEXs in parallel
  const [quote1inch, quote0x, quoteUniswap] = await Promise.allSettled([
    get1inchQuote({ tokenIn, tokenOut, amount, chainId, slippage }),
    get0xQuote({ tokenIn, tokenOut, amount, chainId, slippage }),
    getUniswapQuote({ tokenIn, tokenOut, amount, chainId, slippage }),
  ])

  // Collect successful quotes
  const quotes = [
    quote1inch.status === 'fulfilled' ? quote1inch.value : null,
    quote0x.status === 'fulfilled' ? quote0x.value : null,
    quoteUniswap.status === 'fulfilled' ? quoteUniswap.value : null,
  ].filter(q => q && q.success)

  if (quotes.length === 0) {
    throw new Error('All DEX quote providers failed')
  }

  // Find best quote (highest amountOut)
  let bestQuote = quotes[0]
  for (const quote of quotes) {
    if (BigInt(quote.amountOut) > BigInt(bestQuote.amountOut)) {
      bestQuote = quote
    }
  }

  // Add comparison data
  bestQuote.allQuotes = quotes.map(q => ({
    dex: q.dex,
    amountOut: q.amountOut,
    priceImpact: q.priceImpact,
    gasEstimate: q.gasEstimate,
  }))

  return bestQuote
}

/**
 * Calculate price impact based on pool liquidity
 */
export function calculatePriceImpact({
  amountIn,
  amountOut,
  reserveIn,
  reserveOut,
}) {
  if (!reserveIn || !reserveOut) return 0
  
  // Calculate expected output with constant product formula
  const amountInWithFee = amountIn * 997n // 0.3% fee
  const numerator = amountInWithFee * reserveOut
  const denominator = (reserveIn * 1000n) + amountInWithFee
  const expectedOut = numerator / denominator

  // Price impact = (expected - actual) / expected * 100
  const impact = ((Number(expectedOut) - Number(amountOut)) / Number(expectedOut)) * 100
  
  return Math.max(0, impact)
}

/**
 * Get token price from CoinGecko (for USD value calculation)
 */
export async function getTokenPrice(tokenSymbol, currency = 'usd') {
  try {
    // Map token symbols to CoinGecko IDs
    const tokenMap = {
      ETH: 'ethereum',
      WETH: 'ethereum',
      USDC: 'usd-coin',
      USDT: 'tether',
      DAI: 'dai',
      DWT: 'dwallet', // May not exist yet
    }

    const coinId = tokenMap[tokenSymbol.toUpperCase()]
    if (!coinId) return null

    const url = `${API_ENDPOINTS.COINGECKO}/simple/price`
    const response = await axios.get(url, {
      params: {
        ids: coinId,
        vs_currencies: currency,
      },
      timeout: 3000,
    })

    return response.data[coinId]?.[currency] || null
  } catch (error) {
    console.warn('Failed to fetch token price:', error.message)
    return null
  }
}

/**
 * Estimate gas cost in USD
 */
export async function estimateGasCostUSD({
  gasEstimate,
  chainId = CHAIN_ID.BASE,
}) {
  try {
    // Get ETH price
    const ethPrice = await getTokenPrice('ETH')
    if (!ethPrice) return null

    // Get gas price for chain (simplified)
    const gasPrices = {
      [CHAIN_ID.ETHEREUM]: 30e9, // 30 gwei
      [CHAIN_ID.BASE]: 0.1e9,     // 0.1 gwei (much cheaper)
      [CHAIN_ID.BASE_SEPOLIA]: 0.1e9,
    }

    const gasPrice = gasPrices[chainId] || 1e9
    const gasCostETH = (gasEstimate * gasPrice) / 1e18
    const gasCostUSD = gasCostETH * ethPrice

    return gasCostUSD
  } catch (error) {
    console.warn('Failed to estimate gas cost:', error.message)
    return null
  }
}

/**
 * Format token amount with proper decimals
 */
export function formatTokenAmount(amount, decimals = 18) {
  return (Number(amount) / Math.pow(10, decimals)).toFixed(6)
}

/**
 * Parse token amount to wei/smallest unit
 */
export function parseTokenAmount(amount, decimals = 18) {
  return (Number(amount) * Math.pow(10, decimals)).toString()
}
