/**
 * 🔒 DeFi Security Validation & Protection
 * 
 * Features:
 * - Input validation for DeFi operations
 * - Token and address validation
 * - Transaction parameter verification
 * - Rate limiting protection
 * - Balance re-verification
 * - Circuit breaker for failed operations
 */

import { sanitizeNumber, isValidEthAddress } from './dataValidation.js'
import { MAINNET_TOKENS, AAVE_ASSETS, SWAP_TOKENS } from '../data/defi.js'
import { TOKEN_PRICES } from '../data/chains.js'

// ─────────────────────────────────────────────────────────────────────
//  TRANSACTION VALUE LIMITS
// ─────────────────────────────────────────────────────────────────────

/**
 * Maximum transaction values (in USD)
 */
export const TRANSACTION_LIMITS = {
  WARNING_THRESHOLD: 10000,    // $10,000 - Show warning
  CRITICAL_THRESHOLD: 50000,   // $50,000 - Require explicit confirmation
  MAX_SINGLE_TX: 100000,       // $100,000 - Maximum allowed
  MAX_ETH_SINGLE: 50,          // 50 ETH maximum per transaction
  MAX_TOKEN_SINGLE: 1000000    // 1M tokens maximum per transaction
}

/**
 * Calculate USD value of a transaction
 */
export function calculateTransactionValue(tokenSymbol, amount) {
  const price = TOKEN_PRICES[tokenSymbol] || 0
  return parseFloat(amount) * price
}

/**
 * Validate transaction value against limits
 */
export function validateTransactionValue(tokenSymbol, amount) {
  const usdValue = calculateTransactionValue(tokenSymbol, amount)
  const numAmount = parseFloat(amount)
  
  // Check maximum ETH limit
  if (tokenSymbol === 'ETH' && numAmount > TRANSACTION_LIMITS.MAX_ETH_SINGLE) {
    return {
      valid: false,
      error: `Transaction exceeds maximum ETH limit (${TRANSACTION_LIMITS.MAX_ETH_SINGLE} ETH)`,
      level: 'critical'
    }
  }
  
  // Check maximum token limit
  if (numAmount > TRANSACTION_LIMITS.MAX_TOKEN_SINGLE) {
    return {
      valid: false,
      error: `Transaction exceeds maximum token limit (${TRANSACTION_LIMITS.MAX_TOKEN_SINGLE.toLocaleString()} tokens)`,
      level: 'critical'
    }
  }
  
  // Check maximum USD value
  if (usdValue > TRANSACTION_LIMITS.MAX_SINGLE_TX) {
    return {
      valid: false,
      error: `Transaction value ($${usdValue.toLocaleString()}) exceeds maximum limit ($${TRANSACTION_LIMITS.MAX_SINGLE_TX.toLocaleString()})`,
      level: 'critical'
    }
  }
  
  // Check warning threshold
  if (usdValue >= TRANSACTION_LIMITS.WARNING_THRESHOLD) {
    return {
      valid: true,
      warning: `Large transaction: $${usdValue.toLocaleString()}`,
      level: usdValue >= TRANSACTION_LIMITS.CRITICAL_THRESHOLD ? 'critical' : 'warning',
      usdValue
    }
  }
  
  return {
    valid: true,
    level: 'normal',
    usdValue
  }
}

// ─────────────────────────────────────────────────────────────────────
//  TOKEN & ADDRESS VALIDATION
// ─────────────────────────────────────────────────────────────────────

/**
 * Validate token symbol against allowlist
 */
export function validateTokenSymbol(symbol, allowlist = null) {
  if (typeof symbol !== 'string' || !symbol.trim()) {
    return { valid: false, error: 'Invalid token symbol' }
  }
  
  const cleanSymbol = symbol.trim().toUpperCase()
  const list = allowlist || Object.keys(MAINNET_TOKENS)
  
  if (!list.includes(cleanSymbol)) {
    return { valid: false, error: `Token ${symbol} not supported` }
  }
  
  return { valid: true, symbol: cleanSymbol }
}

/**
 * Validate contract address
 */
export function validateContractAddress(address, expectedAddress = null) {
  if (!isValidEthAddress(address)) {
    return { valid: false, error: 'Invalid contract address' }
  }
  
  if (expectedAddress && address.toLowerCase() !== expectedAddress.toLowerCase()) {
    return { valid: false, error: 'Contract address mismatch' }
  }
  
  return { valid: true, address: address.toLowerCase() }
}

/**
 * Validate token address against registry
 */
export function validateTokenAddress(symbol, address) {
  const tokenValidation = validateTokenSymbol(symbol)
  if (!tokenValidation.valid) {
    return tokenValidation
  }
  
  const expectedToken = MAINNET_TOKENS[symbol.toUpperCase()]
  if (!expectedToken) {
    return { valid: false, error: `Token ${symbol} not found in registry` }
  }
  
  if (address && address.toLowerCase() !== expectedToken.address.toLowerCase()) {
    return { valid: false, error: `Token address mismatch for ${symbol}` }
  }
  
  return { 
    valid: true, 
    symbol: symbol.toUpperCase(),
    address: expectedToken.address,
    decimals: expectedToken.decimals
  }
}

// ─────────────────────────────────────────────────────────────────────
//  TRANSACTION PARAMETER VALIDATION
// ─────────────────────────────────────────────────────────────────────

/**
 * Validate swap parameters
 */
export function validateSwapParams(params) {
  const { tokenIn, tokenOut, amountIn, amountOutMin, feeTier, slippage } = params
  
  // Validate tokens
  const tokenInValidation = validateTokenSymbol(tokenIn, ['ETH', 'WBTC', 'USDC', 'USDT', 'DAI', 'UNI', 'LINK'])
  if (!tokenInValidation.valid) {
    return { valid: false, error: tokenInValidation.error }
  }
  
  const tokenOutValidation = validateTokenSymbol(tokenOut, ['ETH', 'WBTC', 'USDC', 'USDT', 'DAI', 'UNI', 'LINK'])
  if (!tokenOutValidation.valid) {
    return { valid: false, error: tokenOutValidation.error }
  }
  
  // Cannot swap same token
  if (tokenIn.toUpperCase() === tokenOut.toUpperCase()) {
    return { valid: false, error: 'Cannot swap same token' }
  }
  
  // Validate amount
  const validatedAmount = sanitizeNumber(amountIn, {
    min: 0.00000001,
    max: 1e15,
    decimals: 18,
    required: true
  })
  
  if (!validatedAmount || validatedAmount <= 0) {
    return { valid: false, error: 'Invalid swap amount' }
  }
  
  // Validate minimum output
  if (amountOutMin !== undefined) {
    const validatedMinOut = sanitizeNumber(amountOutMin, {
      min: 0.00000001,
      max: 1e15,
      decimals: 18,
      required: true
    })
    
    if (!validatedMinOut || validatedMinOut <= 0) {
      return { valid: false, error: 'Invalid minimum output amount' }
    }
  }
  
  // Validate fee tier
  const validFeeTiers = [100, 500, 3000, 10000]
  if (feeTier && !validFeeTiers.includes(Number(feeTier))) {
    return { valid: false, error: 'Invalid fee tier' }
  }
  
  // Validate slippage
  const validatedSlippage = sanitizeNumber(slippage, {
    min: 0.01,
    max: 50,
    decimals: 2,
    required: false
  })
  
  if (slippage && (validatedSlippage < 0.01 || validatedSlippage > 50)) {
    return { valid: false, error: 'Slippage must be between 0.01% and 50%' }
  }
  
  return {
    valid: true,
    params: {
      tokenIn: tokenInValidation.symbol,
      tokenOut: tokenOutValidation.symbol,
      amountIn: validatedAmount,
      amountOutMin: amountOutMin ? sanitizeNumber(amountOutMin, { min: 0, max: 1e15, decimals: 18 }) : null,
      feeTier: feeTier ? Number(feeTier) : 3000,
      slippage: validatedSlippage || 0.5
    }
  }
}

/**
 * Validate lending parameters
 */
export function validateLendingParams(params) {
  const { action, asset, amount } = params
  
  // Validate action
  const validActions = ['supply', 'withdraw', 'borrow', 'repay']
  if (!validActions.includes(action)) {
    return { valid: false, error: `Invalid action: ${action}` }
  }
  
  // Validate asset
  const assetValidation = validateTokenSymbol(asset, AAVE_ASSETS.map(a => a.symbol))
  if (!assetValidation.valid) {
    return { valid: false, error: assetValidation.error }
  }
  
  // Validate amount
  const validatedAmount = sanitizeNumber(amount, {
    min: 0.00000001,
    max: 1e15,
    decimals: 18,
    required: true
  })
  
  if (!validatedAmount || validatedAmount <= 0) {
    return { valid: false, error: 'Invalid amount' }
  }
  
  return {
    valid: true,
    params: {
      action,
      asset: assetValidation.symbol,
      amount: validatedAmount
    }
  }
}

/**
 * Validate staking parameters
 */
export function validateStakingParams(params) {
  const { protocol, amount, minStake } = params
  
  // Validate protocol
  const validProtocols = ['lido', 'rocketpool']
  if (!validProtocols.includes(protocol)) {
    return { valid: false, error: `Invalid staking protocol: ${protocol}` }
  }
  
  // Validate amount
  const validatedAmount = sanitizeNumber(amount, {
    min: minStake || 0.01,
    max: 1e6,
    decimals: 18,
    required: true
  })
  
  if (!validatedAmount || validatedAmount < (minStake || 0.01)) {
    return { valid: false, error: `Amount must be at least ${minStake || 0.01} ETH` }
  }
  
  return {
    valid: true,
    params: {
      protocol,
      amount: validatedAmount
    }
  }
}

/**
 * Validate liquidity pool (LP) parameters
 */
export function validateLPParams(params) {
  const { token0, token1, amount0, amount1, fee, tickLower, tickUpper } = params
  
  // Validate tokens
  const token0Validation = validateTokenSymbol(token0, ['ETH', 'WBTC', 'USDC', 'USDT', 'DAI', 'UNI', 'LINK'])
  if (!token0Validation.valid) {
    return { valid: false, error: token0Validation.error }
  }
  
  const token1Validation = validateTokenSymbol(token1, ['ETH', 'WBTC', 'USDC', 'USDT', 'DAI', 'UNI', 'LINK'])
  if (!token1Validation.valid) {
    return { valid: false, error: token1Validation.error }
  }
  
  // Cannot add liquidity for same token
  if (token0.toUpperCase() === token1.toUpperCase()) {
    return { valid: false, error: 'Cannot add liquidity for same token pair' }
  }
  
  // Validate amounts
  const validatedAmount0 = sanitizeNumber(amount0, {
    min: 0.00000001,
    max: 1e15,
    decimals: 18,
    required: true
  })
  
  if (!validatedAmount0 || validatedAmount0 <= 0) {
    return { valid: false, error: 'Invalid token0 amount' }
  }
  
  const validatedAmount1 = sanitizeNumber(amount1, {
    min: 0.00000001,
    max: 1e15,
    decimals: 18,
    required: true
  })
  
  if (!validatedAmount1 || validatedAmount1 <= 0) {
    return { valid: false, error: 'Invalid token1 amount' }
  }
  
  // Validate fee tier
  const validFeeTiers = [100, 500, 3000, 10000]
  if (fee && !validFeeTiers.includes(Number(fee))) {
    return { valid: false, error: 'Invalid fee tier' }
  }
  
  // Validate tick range (if provided)
  if (tickLower !== undefined && tickUpper !== undefined) {
    const lower = Number(tickLower)
    const upper = Number(tickUpper)
    
    if (lower >= upper) {
      return { valid: false, error: 'Tick lower must be less than tick upper' }
    }
    
    // Uniswap v3 tick bounds
    if (lower < -887272 || upper > 887272) {
      return { valid: false, error: 'Tick out of valid range (-887272 to 887272)' }
    }
  }
  
  return {
    valid: true,
    params: {
      token0: token0Validation.symbol,
      token1: token1Validation.symbol,
      amount0: validatedAmount0,
      amount1: validatedAmount1,
      fee: fee ? Number(fee) : 3000,
      tickLower,
      tickUpper
    }
  }
}

// ─────────────────────────────────────────────────────────────────────
//  RATE LIMITING
// ─────────────────────────────────────────────────────────────────────

/**
 * Rate limiter for DeFi operations
 */
export class DeFiRateLimiter {
  constructor(options = {}) {
    this.cooldown = options.cooldown || 5000 // 5 seconds default
    this.maxAttempts = options.maxAttempts || 3
    this.attemptWindow = options.attemptWindow || 60000 // 1 minute window
    this.lastAction = 0
    this.attempts = []
  }
  
  /**
   * Check if action is allowed
   */
  canExecute() {
    const now = Date.now()
    
    // Check cooldown
    if (now - this.lastAction < this.cooldown) {
      const waitTime = Math.ceil((this.cooldown - (now - this.lastAction)) / 1000)
      return { 
        allowed: false, 
        error: `Please wait ${waitTime}s before next action` 
      }
    }
    
    // Check attempt rate
    this.attempts = this.attempts.filter(t => now - t < this.attemptWindow)
    if (this.attempts.length >= this.maxAttempts) {
      return { 
        allowed: false, 
        error: `Too many attempts. Please try again later.` 
      }
    }
    
    return { allowed: true }
  }
  
  /**
   * Record successful execution
   */
  recordExecution() {
    this.lastAction = Date.now()
    this.attempts.push(this.lastAction)
  }
  
  /**
   * Reset rate limiter
   */
  reset() {
    this.lastAction = 0
    this.attempts = []
  }
}

// ─────────────────────────────────────────────────────────────────────
//  CIRCUIT BREAKER
// ─────────────────────────────────────────────────────────────────────

/**
 * Circuit breaker for DeFi operations
 */
export class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 3
    this.recoveryTimeout = options.recoveryTimeout || 60000 // 1 minute
    this.failureCount = 0
    this.lastFailureTime = 0
    this.state = 'CLOSED' // CLOSED, OPEN, HALF_OPEN
  }
  
  /**
   * Check if operation is allowed
   */
  canExecute() {
    if (this.state === 'CLOSED') {
      return { allowed: true }
    }
    
    if (this.state === 'OPEN') {
      const now = Date.now()
      if (now - this.lastFailureTime > this.recoveryTimeout) {
        this.state = 'HALF_OPEN'
        return { allowed: true, state: 'HALF_OPEN' }
      }
      
      const waitTime = Math.ceil((this.recoveryTimeout - (now - this.lastFailureTime)) / 1000)
      return { 
        allowed: false, 
        error: `Service temporarily unavailable. Try again in ${waitTime}s` 
      }
    }
    
    // HALF_OPEN state - allow one test request
    return { allowed: true, state: 'HALF_OPEN' }
  }
  
  /**
   * Record successful operation
   */
  recordSuccess() {
    this.failureCount = 0
    this.state = 'CLOSED'
  }
  
  /**
   * Record failed operation
   */
  recordFailure() {
    this.failureCount++
    this.lastFailureTime = Date.now()
    
    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN'
    }
  }
  
  /**
   * Get circuit breaker status
   */
  getStatus() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime
    }
  }
  
  /**
   * Reset circuit breaker
   */
  reset() {
    this.failureCount = 0
    this.lastFailureTime = 0
    this.state = 'CLOSED'
  }
}

// ─────────────────────────────────────────────────────────────────────
//  BALANCE VERIFICATION
// ─────────────────────────────────────────────────────────────────────

/**
 * Re-verify balance before transaction execution
 */
export async function verifyBalanceBeforeTransaction(
  provider,
  address,
  tokenSymbol,
  requiredAmount,
  tokenRegistry = MAINNET_TOKENS
) {
  const tokenValidation = validateTokenSymbol(tokenSymbol, Object.keys(tokenRegistry))
  if (!tokenValidation.valid) {
    throw new Error(tokenValidation.error)
  }
  
  const token = tokenRegistry[tokenValidation.symbol]
  
  try {
    let balance
    
    if (tokenSymbol.toUpperCase() === 'ETH') {
      // Get ETH balance
      const balanceWei = await provider.getBalance(address)
      balance = Number(require('ethers').formatUnits(balanceWei, 18))
    } else {
      // Get ERC20 token balance
      const { ethers } = await import('ethers')
      const ERC20_ABI = [
        'function balanceOf(address) view returns (uint256)',
        'function decimals() view returns (uint8)'
      ]
      
      const tokenContract = new ethers.Contract(token.address, ERC20_ABI, provider)
      const balanceRaw = await tokenContract.balanceOf(address)
      const decimals = await tokenContract.decimals()
      balance = Number(ethers.formatUnits(balanceRaw, decimals))
    }
    
    if (balance < requiredAmount) {
      return {
        verified: false,
        error: `Insufficient ${tokenSymbol} balance. Required: ${requiredAmount}, Available: ${balance}`
      }
    }
    
    return {
      verified: true,
      balance,
      required: requiredAmount
    }
  } catch (error) {
    return {
      verified: false,
      error: `Failed to verify balance: ${error.message}`
    }
  }
}

// ─────────────────────────────────────────────────────────────────────
//  TRANSACTION SIMULATION
// ─────────────────────────────────────────────────────────────────────

/**
 * Simulate transaction before execution
 */
export async function simulateTransaction(provider, txParams) {
  try {
    // Use callStatic to simulate the transaction
    const simulation = await provider.call({
      from: txParams.from,
      to: txParams.to,
      data: txParams.data,
      value: txParams.value || 0
    })
    
    // If simulation returns without error, transaction should succeed
    return {
      simulated: true,
      result: simulation
    }
  } catch (error) {
    return {
      simulated: false,
      error: `Transaction simulation failed: ${error.message}`
    }
  }
}

/**
 * Validate gas estimation
 */
export async function validateGasEstimation(provider, txParams, balance) {
  try {
    const gasEstimate = await provider.estimateGas(txParams)
    const feeData = await provider.getFeeData()
    
    const maxFeePerGas = feeData.maxFeePerGas || feeData.gasPrice
    const estimatedCost = Number(gasEstimate) * Number(maxFeePerGas)
    const estimatedCostEth = Number(require('ethers').formatUnits(estimatedCost, 18))
    
    if (estimatedCostEth > balance * 0.5) {
      return {
        valid: false,
        error: `Gas cost (${estimatedCostEth.toFixed(6)} ETH) exceeds 50% of balance`
      }
    }
    
    return {
      valid: true,
      gasEstimate: gasEstimate.toString(),
      estimatedCostEth: estimatedCostEth.toFixed(6)
    }
  } catch (error) {
    return {
      valid: false,
      error: `Gas estimation failed: ${error.message}`
    }
  }
}

// ─────────────────────────────────────────────────────────────────────
//  COMPREHENSIVE TRANSACTION VALIDATOR
// ─────────────────────────────────────────────────────────────────────

/**
 * Comprehensive pre-transaction validation
 */
export async function validateTransaction({
  provider,
  address,
  tokenSymbol,
  amount,
  txParams,
  rateLimiter,
  circuitBreaker
}) {
  // Check rate limiter
  if (rateLimiter) {
    const rateCheck = rateLimiter.canExecute()
    if (!rateCheck.allowed) {
      return { valid: false, error: rateCheck.error }
    }
  }
  
  // Check circuit breaker
  if (circuitBreaker) {
    const circuitCheck = circuitBreaker.canExecute()
    if (!circuitCheck.allowed) {
      return { valid: false, error: circuitCheck.error }
    }
  }
  
  // Verify balance
  const balanceCheck = await verifyBalanceBeforeTransaction(
    provider,
    address,
    tokenSymbol,
    amount
  )
  
  if (!balanceCheck.verified) {
    return { valid: false, error: balanceCheck.error }
  }
  
  // Simulate transaction if params provided
  if (txParams) {
    const simulation = await simulateTransaction(provider, txParams)
    if (!simulation.simulated) {
      return { valid: false, error: simulation.error }
    }
  }
  
  return { valid: true }
}
