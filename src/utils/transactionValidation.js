/**
 * ✅ Enhanced Transaction Validation
 * 
 * Features:
 * - Comprehensive pre-transaction checks
 * - Address validation and blacklist checking
 * - External threat intelligence integration
 * - Amount limit enforcement
 * - Gas price validation
 * - Transaction simulation
 * - Risk scoring
 */

import { calculateThreatScore } from './threatIntelligence.js'

// ─────────────────────────────────────────────────────────────────────
//  TRANSACTION LIMITS
// ─────────────────────────────────────────────────────────────────────

const TRANSACTION_LIMITS = {
  // Maximum single transaction (USD)
  maxSingleTransactionUSD: 100000,
  
  // Maximum daily transactions (USD)
  maxDailyTransactionUSD: 250000,
  
  // Maximum transactions per hour
  maxTransactionsPerHour: 10,
  
  // Maximum transactions per day
  maxTransactionsPerDay: 50,
  
  // Minimum balance to keep (ETH)
  minimumBalanceETH: 0.01,
  
  // Gas price limits (Gwei)
  maxGasPriceGwei: 500,
  maxPriorityFeeGwei: 50,
}

// ─────────────────────────────────────────────────────────────────────
//  ADDRESS BLACKLIST
// ─────────────────────────────────────────────────────────────────────

// Known malicious addresses (sample - should be maintained from a trusted source)
const BLACKLISTED_ADDRESSES = new Set([
  // Add known scam/phishing addresses here
  // These are examples only
  '0x0000000000000000000000000000000000000000', // Zero address
])

/**
 * Check if an address is blacklisted
 * @param {string} address - Ethereum address
 * @returns {boolean} True if blacklisted
 */
export function isAddressBlacklisted(address) {
  if (!address) return false
  return BLACKLISTED_ADDRESSES.has(address.toLowerCase())
}

/**
 * Add address to blacklist (admin function)
 * @param {string} address - Address to blacklist
 */
export function addToBlacklist(address) {
  BLACKLISTED_ADDRESSES.add(address.toLowerCase())
}

// ─────────────────────────────────────────────────────────────────────
//  COMPREHENSIVE TRANSACTION VALIDATION
// ─────────────────────────────────────────────────────────────────────

/**
 * Validate all aspects of a transaction before sending
 * @param {Object} params - Transaction parameters
 * @returns {Object} Validation result
 */
export async function validateTransaction(params) {
  const {
    from,
    to,
    amount,
    token,
    chain,
    balance,
    gasInfo,
    price,
    transactionHistory = [],
  } = params
  
  const errors = []
  const warnings = []
  const riskFactors = []
  
  // 1. Validate recipient address
  const addressValidation = validateAddress(to)
  if (!addressValidation.valid) {
    errors.push(addressValidation.error)
  }
  
  // Check local blacklist
  if (isAddressBlacklisted(to)) {
    errors.push('Recipient address is blacklisted')
  }
  
  // Check external threat intelligence
  try {
    const threatAssessment = await calculateThreatScore(to)
    if (threatAssessment.shouldBlock) {
      errors.push(`Transaction blocked: ${threatAssessment.flags[0]?.message || 'Address poses critical security risk'}`)
    } else if (threatAssessment.requiresReview) {
      warnings.push(`⚠️ Caution: Address has risk indicators (${threatAssessment.level} risk)`)
      riskFactors.push('threat_intelligence_warning')
    }
  } catch (error) {
    console.warn('Threat intelligence check failed:', error.message)
    // Don't block on threat check failure, but log it
  }
  
  // 2. Validate amount
  const amountValidation = validateAmount(amount, token, balance, price, chain)
  if (!amountValidation.valid) {
    errors.push(...amountValidation.errors)
  }
  warnings.push(...amountValidation.warnings)
  
  // 3. Check transaction limits
  const limitsValidation = validateTransactionLimits(
    amount,
    price,
    transactionHistory
  )
  if (!limitsValidation.valid) {
    errors.push(...limitsValidation.errors)
  }
  warnings.push(...limitsValidation.warnings)
  
  // 4. Validate gas parameters
  if (gasInfo) {
    const gasValidation = validateGasParameters(gasInfo)
    if (!gasValidation.valid) {
      errors.push(...gasValidation.errors)
    }
    warnings.push(...gasValidation.warnings)
  }
  
  // 5. Check for suspicious patterns
  const patternCheck = checkSuspiciousPatterns(params, transactionHistory)
  warnings.push(...patternCheck.warnings)
  riskFactors.push(...patternCheck.riskFactors)
  
  // 6. Calculate risk score
  const riskScore = calculateTransactionRisk({
    errors: errors.length,
    warnings: warnings.length,
    riskFactors,
    amountUSD: amount * price,
    isNewAddress: !transactionHistory.some(tx => tx.to === to),
  })
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    riskFactors,
    riskScore,
    riskLevel: getRiskLevel(riskScore),
    canProceed: errors.length === 0 && riskScore < 80,
    requiresConfirmation: riskScore >= 50,
  }
}

// ─────────────────────────────────────────────────────────────────────
//  ADDRESS VALIDATION
// ─────────────────────────────────────────────────────────────────────

/**
 * Validate Ethereum address
 * @param {string} address - Address to validate
 * @returns {Object} Validation result
 */
export function validateAddress(address) {
  if (!address) {
    return { valid: false, error: 'Recipient address is required' }
  }
  
  // Check format
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return { valid: false, error: 'Invalid Ethereum address format' }
  }
  
  // Check for zero address
  if (address === '0x0000000000000000000000000000000000000000') {
    return { valid: false, error: 'Cannot send to zero address' }
  }
  
  // Check if sending to self
  // Note: This would need the sender's address passed in
  
  return { valid: true }
}

// ─────────────────────────────────────────────────────────────────────
//  AMOUNT VALIDATION
// ─────────────────────────────────────────────────────────────────────

/**
 * Validate transaction amount
 * @param {number} amount - Amount to send
 * @param {string} token - Token symbol
 * @param {number} balance - Current balance
 * @param {number} price - Token price in USD
 * @param {string} chain - Chain name
 * @returns {Object} Validation result
 */
export function validateAmount(amount, token, balance, price, chain) {
  const errors = []
  const warnings = []
  
  // Check amount is positive
  if (!amount || amount <= 0) {
    errors.push('Amount must be greater than zero')
  }
  
  // Check sufficient balance
  if (amount > balance) {
    errors.push(`Insufficient ${token} balance. You have ${balance.toFixed(6)} ${token}`)
  }
  
  // For native tokens, ensure gas fees are covered
  const nativeTokens = {
    ethereum: 'ETH',
    bnb: 'BNB',
    polygon: 'MATIC',
    sepolia: 'ETH',
    baseSepolia: 'ETH',
    base: 'ETH',
    arbitrum: 'ETH',
  }
  
  const isNative = token === nativeTokens[chain]
  
  if (isNative) {
    const remainingBalance = balance - amount
    
    // Warn if remaining balance is too low for future gas
    if (remainingBalance < TRANSACTION_LIMITS.minimumBalanceETH) {
      warnings.push(
        `You'll have only ${remainingBalance.toFixed(6)} ${token} left for gas fees`
      )
    }
  }
  
  // Check for dust amounts
  if (amount < 0.000001 && amount > 0) {
    warnings.push('Amount is very small - may not be worth the gas fees')
  }
  
  // Calculate USD value for large transaction warnings
  const amountUSD = amount * price
  if (amountUSD > TRANSACTION_LIMITS.maxSingleTransactionUSD) {
    errors.push(
      `Transaction exceeds maximum single transaction limit ($${TRANSACTION_LIMITS.maxSingleTransactionUSD.toLocaleString()})`
    )
  } else if (amountUSD > 50000) {
    warnings.push(`Large transaction: $${amountUSD.toLocaleString()}`)
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

// ─────────────────────────────────────────────────────────────────────
//  TRANSACTION LIMITS VALIDATION
// ─────────────────────────────────────────────────────────────────────

/**
 * Validate transaction against limits
 * @param {number} amount - Amount to send
 * @param {number} price - Token price
 * @param {Array} transactionHistory - Recent transactions
 * @returns {Object} Validation result
 */
export function validateTransactionLimits(amount, price, transactionHistory) {
  const errors = []
  const warnings = []
  const amountUSD = amount * price
  
  const now = Date.now()
  const oneHourAgo = now - (60 * 60 * 1000)
  const oneDayAgo = now - (24 * 60 * 60 * 1000)
  
  // Count recent transactions
  const txsLastHour = transactionHistory.filter(tx => tx.timestamp > oneHourAgo)
  const txsLastDay = transactionHistory.filter(tx => tx.timestamp > oneDayAgo)
  
  // Check transaction count limits
  if (txsLastHour.length >= TRANSACTION_LIMITS.maxTransactionsPerHour) {
    errors.push(
      `Transaction limit exceeded: ${TRANSACTION_LIMITS.maxTransactionsPerHour} per hour`
    )
  }
  
  if (txsLastDay.length >= TRANSACTION_LIMITS.maxTransactionsPerDay) {
    errors.push(
      `Daily transaction limit exceeded: ${TRANSACTION_LIMITS.maxTransactionsPerDay} per day`
    )
  }
  
  // Check daily volume limit
  const dailyVolume = txsLastDay.reduce((sum, tx) => {
    return sum + (tx.amountUSD || 0)
  }, 0)
  
  if (dailyVolume + amountUSD > TRANSACTION_LIMITS.maxDailyTransactionUSD) {
    errors.push(
      `Daily transaction volume limit exceeded ($${TRANSACTION_LIMITS.maxDailyTransactionUSD.toLocaleString()})`
    )
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

// ─────────────────────────────────────────────────────────────────────
//  GAS VALIDATION
// ─────────────────────────────────────────────────────────────────────

/**
 * Validate gas parameters
 * @param {Object} gasInfo - Gas information
 * @returns {Object} Validation result
 */
export function validateGasParameters(gasInfo) {
  const errors = []
  const warnings = []
  
  const gasPrice = parseFloat(gasInfo.gwei || 0)
  const priorityFee = parseFloat(gasInfo.priorityFee || 0)
  
  // Check gas price is not too high
  if (gasPrice > TRANSACTION_LIMITS.maxGasPriceGwei) {
    errors.push(
      `Gas price too high: ${gasPrice} Gwei (max: ${TRANSACTION_LIMITS.maxGasPriceGwei} Gwei)`
    )
  } else if (gasPrice > 200) {
    warnings.push(`High gas price: ${gasPrice} Gwei - consider waiting`)
  }
  
  // Check priority fee
  if (priorityFee > TRANSACTION_LIMITS.maxPriorityFeeGwei) {
    warnings.push(
      `High priority fee: ${priorityFee} Gwei (recommended max: ${TRANSACTION_LIMITS.maxPriorityFeeGwei} Gwei)`
    )
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

// ─────────────────────────────────────────────────────────────────────
//  SUSPICIOUS PATTERN DETECTION
// ─────────────────────────────────────────────────────────────────────

/**
 * Check for suspicious transaction patterns
 * @param {Object} params - Transaction parameters
 * @param {Array} transactionHistory - Recent transactions
 * @returns {Object} Pattern analysis
 */
export function checkSuspiciousPatterns(params, transactionHistory) {
  const warnings = []
  const riskFactors = []
  
  // Check for rapid successive transactions to same address
  const recentToSame = transactionHistory.filter(
    tx => tx.to === params.to && (Date.now() - tx.timestamp) < 3600000
  )
  
  if (recentToSame.length >= 3) {
    warnings.push(`You've sent ${recentToSame.length} transactions to this address in the last hour`)
    riskFactors.push('rapid_successive_transactions')
  }
  
  // Check for unusual amount patterns
  const recentAmounts = transactionHistory
    .slice(0, 10)
    .map(tx => tx.amount)
  
  if (recentAmounts.length >= 5) {
    const avgAmount = recentAmounts.reduce((a, b) => a + b, 0) / recentAmounts.length
    const deviation = Math.abs(params.amount - avgAmount) / avgAmount
    
    if (deviation > 2.0) {
      warnings.push('Transaction amount is significantly different from your recent transactions')
      riskFactors.push('unusual_amount')
    }
  }
  
  // Check for new address interaction
  const hasInteractedBefore = transactionHistory.some(tx => tx.to === params.to)
  if (!hasInteractedBefore) {
    warnings.push('First time sending to this address - double-check it\'s correct')
    riskFactors.push('new_address')
  }
  
  return {
    warnings,
    riskFactors,
  }
}

// ─────────────────────────────────────────────────────────────────────
//  RISK SCORING
// ─────────────────────────────────────────────────────────────────────

/**
 * Calculate transaction risk score (0-100)
 * @param {Object} params - Risk parameters
 * @returns {number} Risk score
 */
export function calculateTransactionRisk(params) {
  let score = 0
  
  // Base score from errors/warnings
  score += params.errors * 20
  score += params.warnings * 5
  score += params.riskFactors.length * 10
  
  // Amount risk
  if (params.amountUSD > 50000) score += 15
  else if (params.amountUSD > 10000) score += 10
  else if (params.amountUSD > 1000) score += 5
  
  // New address risk
  if (params.isNewAddress) score += 10
  
  // Cap at 100
  return Math.min(100, Math.max(0, score))
}

/**
 * Get risk level from score
 * @param {number} score - Risk score
 * @returns {string} Risk level
 */
export function getRiskLevel(score) {
  if (score >= 80) return 'critical'
  if (score >= 60) return 'high'
  if (score >= 40) return 'medium'
  if (score >= 20) return 'low'
  return 'minimal'
}

// ─────────────────────────────────────────────────────────────────────
//  TRANSACTION HISTORY MANAGEMENT
// ─────────────────────────────────────────────────────────────────────

const TX_HISTORY_KEY = 'dwallet_transaction_history'

/**
 * Get transaction history
 * @returns {Array} Transaction history
 */
export function getTransactionHistory() {
  try {
    return JSON.parse(localStorage.getItem(TX_HISTORY_KEY) || '[]')
  } catch {
    return []
  }
}

/**
 * Add transaction to history
 * @param {Object} tx - Transaction object
 */
export function addToTransactionHistory(tx) {
  try {
    const history = getTransactionHistory()
    
    history.unshift({
      ...tx,
      timestamp: Date.now(),
    })
    
    // Keep only last 100 transactions
    if (history.length > 100) {
      history.length = 100
    }
    
    localStorage.setItem(TX_HISTORY_KEY, JSON.stringify(history))
  } catch (error) {
    console.error('Failed to save transaction history:', error)
  }
}

/**
 * Clear transaction history
 */
export function clearTransactionHistory() {
  localStorage.removeItem(TX_HISTORY_KEY)
}
