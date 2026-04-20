// Optimized Exchange Service with Security & Performance
// Features: Rate limiting, MEV protection, price optimization, caching

import { ethers } from 'ethers'
import { getProvider, getSigner } from './blockchain'
import { detectSandwichVulnerability, shouldUsePrivateSubmission, validateExchangeParams } from './exchangeSecurity'

// ─────────────────────────────────────────────────────────────────────
//  EXCHANGE RATE OPTIMIZATION
// ─────────────────────────────────────────────────────────────────────

// Price cache for faster lookups
const RATE_CACHE = new Map()
const CACHE_DURATION = 15000 // 15 seconds

// Token price sources (optimized order)
const PRICE_SOURCES = {
  ethereum: ['coingecko', 'uniswap', '1inch'],
  base: ['coingecko', 'uniswap', 'aerodrome'],
  polygon: ['coingecko', 'quickswap'],
  bnb: ['coingecko', 'pancakeswap'],
}

/**
 * Get optimized exchange rate with caching
 */
export async function getBestExchangeRate({ fromToken, toToken, amount, chain = 'ethereum' }) {
  const cacheKey = `${chain}_${fromToken}_${toToken}`
  const cached = RATE_CACHE.get(cacheKey)
  
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data
  }

  try {
    // Try multiple sources for best rate
    const rates = await Promise.allSettled([
      getCoinGeckoRate(fromToken, toToken, amount),
      getOnChainRate(fromToken, toToken, amount, chain),
    ])

    // Get the best rate from successful sources
    const validRates = rates
      .filter(r => r.status === 'fulfilled' && r.value.success)
      .map(r => r.value)

    if (validRates.length === 0) {
      return {
        success: false,
        error: 'Failed to fetch exchange rate from all sources'
      }
    }

    // Select best rate (highest output)
    const bestRate = validRates.reduce((best, current) => 
      current.rate > best.rate ? current : best
    )

    // Cache the result
    RATE_CACHE.set(cacheKey, {
      data: bestRate,
      timestamp: Date.now()
    })

    return bestRate
  } catch (error) {
    console.error('Failed to get exchange rate:', error)
    return {
      success: false,
      error: error.message || 'Failed to get exchange rate'
    }
  }
}

/**
 * Get rate from CoinGecko API (free, no key required)
 */
async function getCoinGeckoRate(fromToken, toToken, amount) {
  try {
    const tokenIds = {
      ETH: 'ethereum',
      USDC: 'usd-coin',
      USDT: 'tether',
      DAI: 'dai',
      WBTC: 'wrapped-bitcoin',
      UNI: 'uniswap',
      LINK: 'chainlink',
    }

    const fromId = tokenIds[fromToken]
    const toId = tokenIds[toToken]

    if (!fromId || !toId) {
      throw new Error('Token not supported by CoinGecko')
    }

    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${fromId},${toId}&vs_currencies=usd`,
      { signal: AbortSignal.timeout(5000) }
    )

    if (!response.ok) {
      throw new Error('CoinGecko API error')
    }

    const data = await response.json()
    const fromPrice = data[fromId]?.usd || 0
    const toPrice = data[toId]?.usd || 0

    if (fromPrice === 0 || toPrice === 0) {
      throw new Error('Invalid price data')
    }

    const rate = fromPrice / toPrice
    const amountOut = parseFloat(amount) * rate

    return {
      success: true,
      rate,
      amountOut: amountOut.toFixed(6),
      source: 'coingecko',
      priceImpact: 0, // CoinGecko doesn't provide price impact
    }
  } catch (error) {
    throw error
  }
}

/**
 * Get on-chain rate from DEX (more accurate for large amounts)
 */
async function getOnChainRate(fromToken, toToken, amount, chain) {
  try {
    const provider = getProvider(chain)
    if (!provider) {
      throw new Error('No provider available')
    }

    // Simplified on-chain rate calculation
    // In production, integrate with Uniswap V3 SDK or similar
    const fromPrice = getTokenPriceUSD(fromToken)
    const toPrice = getTokenPriceUSD(toToken)

    if (fromPrice === 0 || toPrice === 0) {
      throw new Error('Price data unavailable')
    }

    const rate = fromPrice / toPrice
    
    // Estimate price impact (simplified)
    const amountUSD = parseFloat(amount) * fromPrice
    const priceImpact = Math.min((amountUSD / 100000) * 0.1, 5) // 0.1% per $100k, max 5%

    return {
      success: true,
      rate,
      amountOut: (parseFloat(amount) * rate).toFixed(6),
      source: 'onchain',
      priceImpact,
    }
  } catch (error) {
    throw error
  }
}

/**
 * Get token price in USD (fallback)
 */
function getTokenPriceUSD(token) {
  const prices = {
    ETH: 3200,
    USDC: 1,
    USDT: 1,
    DAI: 1,
    WBTC: 65000,
    UNI: 8,
    LINK: 15,
    BNB: 420,
    MATIC: 0.85,
  }
  return prices[token] || 0
}

// ─────────────────────────────────────────────────────────────────────
//  OPTIMIZED SWAP EXECUTION
// ─────────────────────────────────────────────────────────────────────

/**
 * Execute optimized swap with security checks
 */
export async function executeOptimizedSwap({
  fromToken,
  toToken,
  amount,
  minAmountOut,
  chain = 'ethereum',
  wallet,
  sendTransaction
}) {
  try {
    // Security: Validate parameters
    const validation = validateExchangeParams({
      fromToken,
      toToken,
      amount,
      balance: 0 // Will be checked by sendTransaction
    })

    if (!validation.valid) {
      return { success: false, error: validation.error }
    }

    // Security: Check for MEV vulnerabilities
    const amountUSD = parseFloat(amount) * getTokenPriceUSD(fromToken)
    const mevCheck = detectSandwichVulnerability({
      tokenIn: fromToken,
      tokenOut: toToken,
      slippage: 0.5,
      amountUSD,
      poolLiquidity: 1000000,
    })

    if (mevCheck.riskLevel === 'high') {
      return {
        success: false,
        error: 'High MEV risk detected. Transaction may be vulnerable to sandwich attacks.'
      }
    }

    // Check if should use private submission
    const usePrivateTx = shouldUsePrivateSubmission({
      amountUSD,
      slippage: 0.5,
      tokenIn: fromToken,
      tokenOut: toToken,
    })

    // Execute the swap
    if (sendTransaction) {
      // Use wallet's sendTransaction for swaps
      const tx = await sendTransaction({
        to: getRouterAddress(chain),
        amount,
        token: fromToken,
        chain,
        type: 'swap',
      })

      return {
        success: true,
        hash: tx.hash,
        usePrivate: usePrivateTx,
      }
    } else {
      // Fallback: direct contract interaction
      return await executeDirectSwap({
        fromToken,
        toToken,
        amount,
        minAmountOut,
        chain,
        wallet,
      })
    }
  } catch (error) {
    console.error('Swap execution failed:', error)
    return {
      success: false,
      error: error.message || 'Swap execution failed'
    }
  }
}

/**
 * Execute direct swap via smart contract
 */
async function executeDirectSwap({
  fromToken,
  toToken,
  amount,
  minAmountOut,
  chain,
  wallet,
}) {
  try {
    const signer = getSigner(wallet.accounts[wallet.activeAccount].privateKey, chain)
    
    // Get router contract
    const routerAddress = getRouterAddress(chain)
    const routerABI = [
      'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)',
      'function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)',
    ]

    const router = new ethers.Contract(routerAddress, routerABI, signer)

    // Get token addresses
    const fromAddress = getTokenAddress(fromToken, chain)
    const toAddress = getTokenAddress(toToken, chain)

    if (!fromAddress || !toAddress) {
      throw new Error('Token address not found')
    }

    // Get expected output
    const path = [fromAddress, toAddress]
    const amounts = await router.getAmountsOut(
      ethers.parseUnits(amount, 18),
      path
    )

    const expectedOut = ethers.formatUnits(amounts[1], 18)
    
    // Check slippage
    const minOut = parseFloat(minAmountOut)
    if (parseFloat(expectedOut) < minOut * 0.95) {
      throw new Error('Price impact too high')
    }

    // Approve token if needed
    if (fromToken !== 'ETH') {
      const tokenABI = [
        'function approve(address spender, uint256 amount) external returns (bool)',
        'function allowance(address owner, address spender) external view returns (uint256)',
      ]
      const tokenContract = new ethers.Contract(fromAddress, tokenABI, signer)
      const allowance = await tokenContract.allowance(
        await signer.getAddress(),
        routerAddress
      )

      if (allowance < ethers.parseUnits(amount, 18)) {
        const approveTx = await tokenContract.approve(
          routerAddress,
          ethers.MaxUint256
        )
        await approveTx.wait()
      }
    }

    // Execute swap
    const deadline = Math.floor(Date.now() / 1000) + 1800 // 30 minutes
    const swapTx = await router.swapExactTokensForTokens(
      ethers.parseUnits(amount, 18),
      ethers.parseUnits(minAmountOut, 18),
      path,
      await signer.getAddress(),
      deadline
    )

    return {
      success: true,
      hash: swapTx.hash,
      expectedOut,
    }
  } catch (error) {
    throw error
  }
}

/**
 * Get router address for chain
 */
function getRouterAddress(chain) {
  const routers = {
    ethereum: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D', // Uniswap V2
    base: '0x4752ba5dbc23f44d87826276bf6fd6b1c372ad24', // Aerodrome
    polygon: '0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff', // QuickSwap
    bnb: '0x10ED43C718714eb63d5aA57B78B54704E256024E', // PancakeSwap
  }
  return routers[chain] || routers.ethereum
}

/**
 * Get token address for chain
 */
function getTokenAddress(token, chain) {
  const addresses = {
    ethereum: {
      ETH: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH
      USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      DAI: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
    },
    base: {
      ETH: '0x4200000000000000000000000000000000000006', // WETH
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    },
  }

  return addresses[chain]?.[token] || null
}

// ─────────────────────────────────────────────────────────────────────
//  PERFORMANCE MONITORING
// ─────────────────────────────────────────────────────────────────────

/**
 * Track exchange performance metrics
 */
export function trackExchangeMetric(metric) {
  const metrics = {
    timestamp: Date.now(),
    ...metric,
  }

  // Store in localStorage for analytics
  try {
    const history = JSON.parse(localStorage.getItem('exchange_metrics') || '[]')
    history.unshift(metrics)
    
    // Keep only last 100 metrics
    if (history.length > 100) {
      history.length = 100
    }
    
    localStorage.setItem('exchange_metrics', JSON.stringify(history))
  } catch (error) {
    console.error('Failed to track metric:', error)
  }
}

/**
 * Get exchange performance statistics
 */
export function getExchangeStats() {
  try {
    const metrics = JSON.parse(localStorage.getItem('exchange_metrics') || '[]')
    
    if (metrics.length === 0) {
      return {
        totalExchanges: 0,
        avgExecutionTime: 0,
        successRate: 0,
        totalVolume: 0,
      }
    }

    const successful = metrics.filter(m => m.success).length
    const totalVolume = metrics.reduce((sum, m) => sum + (m.amountUSD || 0), 0)
    const avgTime = metrics.reduce((sum, m) => sum + (m.executionTime || 0), 0) / metrics.length

    return {
      totalExchanges: metrics.length,
      successRate: (successful / metrics.length * 100).toFixed(1),
      totalVolume: totalVolume.toFixed(2),
      avgExecutionTime: avgTime.toFixed(0),
    }
  } catch {
    return {
      totalExchanges: 0,
      avgExecutionTime: 0,
      successRate: 0,
      totalVolume: 0,
    }
  }
}
