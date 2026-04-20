// Exchange Security Utilities
// Features: Rate limiting, parameter validation, MEV protection

import { sanitizeNumber } from './dataValidation'

// ─────────────────────────────────────────────────────────────────────
//  RATE LIMITING
// ─────────────────────────────────────────────────────────────────────

/**
 * Exchange-specific rate limiter to prevent abuse and ensure fair usage
 */
export function getExchangeRateLimiter(options = {}) {
  const {
    maxAttempts = 10,
    windowMs = 60000, // 1 minute
    cooldownMs = 5000, // 5 seconds between requests
  } = options

  let attempts = []
  let lastExecution = 0

  return {
    canExecute() {
      const now = Date.now()

      // Check cooldown
      if (now - lastExecution < cooldownMs) {
        const waitTime = Math.ceil((cooldownMs - (now - lastExecution)) / 1000)
        return {
          allowed: false,
          error: `Please wait ${waitTime} seconds before next exchange`,
          retryAfter: cooldownMs - (now - lastExecution),
        }
      }

      // Clean old attempts
      attempts = attempts.filter(t => now - t < windowMs)

      // Check rate limit
      if (attempts.length >= maxAttempts) {
        const oldestAttempt = attempts[0]
        const resetTime = windowMs - (now - oldestAttempt)
        return {
          allowed: false,
          error: `Rate limit exceeded. Try again in ${Math.ceil(resetTime / 1000)} seconds`,
          retryAfter: resetTime,
        }
      }

      return {
        allowed: true,
        remaining: maxAttempts - attempts.length,
        resetIn: windowMs,
      }
    },

    recordExecution() {
      const now = Date.now()
      attempts.push(now)
      lastExecution = now
    },

    getStats() {
      const now = Date.now()
      const recentAttempts = attempts.filter(t => now - t < windowMs)
      return {
        attemptsInWindow: recentAttempts.length,
        remaining: maxAttempts - recentAttempts.length,
        lastExecution,
      }
    },

    reset() {
      attempts = []
      lastExecution = 0
    },
  }
}

// ─────────────────────────────────────────────────────────────────────
//  PARAMETER VALIDATION
// ─────────────────────────────────────────────────────────────────────

/**
 * Validate exchange parameters with security checks
 */
export function validateExchangeParams(params) {
  const { fromToken, toToken, amount, balance } = params

  // Validate tokens
  if (!fromToken || typeof fromToken !== 'string') {
    return { valid: false, error: 'Invalid source token' }
  }

  if (!toToken || typeof toToken !== 'string') {
    return { valid: false, error: 'Invalid destination token' }
  }

  // Cannot swap same token
  if (fromToken.toUpperCase() === toToken.toUpperCase()) {
    return { valid: false, error: 'Cannot exchange same token' }
  }

  // Validate token symbols (whitelist)
  const allowedTokens = ['ETH', 'USDC', 'USDT', 'DAI', 'WBTC', 'UNI', 'LINK', 'BNB', 'MATIC']
  if (!allowedTokens.includes(fromToken.toUpperCase())) {
    return { valid: false, error: `Token ${fromToken} not supported` }
  }
  if (!allowedTokens.includes(toToken.toUpperCase())) {
    return { valid: false, error: `Token ${toToken} not supported` }
  }

  // Validate amount
  const validatedAmount = sanitizeNumber(amount, {
    min: 0.00000001,
    max: 1e15,
    decimals: 18,
    required: true,
  })

  if (!validatedAmount || validatedAmount <= 0) {
    return { valid: false, error: 'Invalid exchange amount' }
  }

  // Check sufficient balance
  if (balance !== undefined && balance < validatedAmount) {
    return {
      valid: false,
      error: `Insufficient balance. You have ${balance} ${fromToken}`,
    }
  }

  // Check for dust amounts (too small)
  if (validatedAmount < 0.0001) {
    return {
      valid: false,
      error: 'Amount too small. Minimum is 0.0001',
    }
  }

  // Check for unusually large amounts (warning threshold)
  if (validatedAmount > 1000000) {
    return {
      valid: true,
      warning: 'Large transaction - please verify details carefully',
      params: {
        ...params,
        amount: validatedAmount,
      },
    }
  }

  return {
    valid: true,
    params: {
      ...params,
      amount: validatedAmount,
    },
  }
}

// ─────────────────────────────────────────────────────────────────────
//  MEV PROTECTION UTILITIES
// ─────────────────────────────────────────────────────────────────────

/**
 * Detect sandwich attack vulnerabilities
 */
export function detectSandwichVulnerability(params) {
  const { tokenIn, tokenOut, slippage, amountUSD, poolLiquidity } = params

  const vulnerabilities = []
  let riskLevel = 'low'

  // Check slippage tolerance
  if (slippage > 2) {
    vulnerabilities.push({
      type: 'high_slippage',
      severity: 'high',
      message: `High slippage tolerance (${slippage}%) makes transaction vulnerable to sandwich attacks`,
      recommendation: 'Reduce slippage to < 1% for better protection',
    })
    riskLevel = 'high'
  } else if (slippage > 1) {
    vulnerabilities.push({
      type: 'medium_slippage',
      severity: 'medium',
      message: `Moderate slippage tolerance (${slippage}%) may expose to MEV`,
      recommendation: 'Consider reducing slippage to < 0.5%',
    })
    if (riskLevel === 'low') riskLevel = 'medium'
  }

  // Check transaction size relative to pool
  if (amountUSD > 0 && poolLiquidity > 0) {
    const poolPercentage = (amountUSD / poolLiquidity) * 100
    
    if (poolPercentage > 1) {
      vulnerabilities.push({
        type: 'large_transaction',
        severity: 'high',
        message: `Transaction size is ${poolPercentage.toFixed(2)}% of pool liquidity`,
        recommendation: 'Consider splitting into smaller transactions',
      })
      riskLevel = 'high'
    } else if (poolPercentage > 0.1) {
      vulnerabilities.push({
        type: 'medium_transaction',
        severity: 'medium',
        message: `Transaction size is ${poolPercentage.toFixed(2)}% of pool liquidity`,
        recommendation: 'Monitor for potential price impact',
      })
      if (riskLevel === 'low') riskLevel = 'medium'
    }
  }

  // Check token pair risk
  const highRiskPairs = [
    ['ETH', 'SHIB'],
    ['ETH', 'DOGE'],
    ['ETH', 'PEPE'],
  ]

  const pairKey = [tokenIn.toUpperCase(), tokenOut.toUpperCase()].sort().join('-')
  const isHighRiskPair = highRiskPairs.some(pair => 
    pair.sort().join('-') === pairKey
  )

  if (isHighRiskPair) {
    vulnerabilities.push({
      type: 'risky_pair',
      severity: 'medium',
      message: 'This token pair is commonly targeted by MEV bots',
      recommendation: 'Use private transaction submission',
    })
    if (riskLevel === 'low') riskLevel = 'medium'
  }

  return {
    riskLevel,
    vulnerabilities,
    isSafe: riskLevel === 'low',
  }
}

/**
 * Determine if transaction should use private submission
 */
export function shouldUsePrivateSubmission(params) {
  const { amountUSD, slippage, tokenIn, tokenOut } = params

  // Use private submission for:
  // 1. Large transactions (>$10k)
  // 2. High slippage (>1%)
  // 3. High-value tokens
  // 4. Known MEV-targeted pairs

  const highValueTokens = ['WBTC', 'ETH']
  const isHighValueToken = highValueTokens.includes(tokenIn.toUpperCase()) ||
                           highValueTokens.includes(tokenOut.toUpperCase())

  return (
    amountUSD > 10000 ||
    slippage > 1 ||
    isHighValueToken ||
    detectSandwichVulnerability(params).riskLevel === 'high'
  )
}

// ─────────────────────────────────────────────────────────────────────
//  ADDRESS VALIDATION
// ─────────────────────────────────────────────────────────────────────

/**
 * Validate and sanitize blockchain addresses
 */
export function validateAddress(address) {
  if (!address || typeof address !== 'string') {
    return { valid: false, error: 'Invalid address' }
  }

  // Check Ethereum address format
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return { valid: false, error: 'Invalid Ethereum address format' }
  }

  return { valid: true, address: address.toLowerCase() }
}

// ─────────────────────────────────────────────────────────────────────
//  AMOUNT SANITIZATION
// ─────────────────────────────────────────────────────────────────────

/**
 * Sanitize and validate amounts for exchange
 */
export function sanitizeExchangeAmount(amount, token) {
  const decimals = {
    ETH: 18,
    BNB: 18,
    MATIC: 18,
    USDC: 6,
    USDT: 6,
    DAI: 18,
    WBTC: 8,
    UNI: 18,
    LINK: 18,
  }

  const tokenDecimals = decimals[token] || 18

  const sanitized = sanitizeNumber(amount, {
    min: 0,
    max: 1e15,
    decimals: tokenDecimals,
    required: true,
  })

  if (!sanitized) {
    return { valid: false, error: 'Invalid amount' }
  }

  return {
    valid: true,
    amount: sanitized,
    decimals: tokenDecimals,
  }
}

// ─────────────────────────────────────────────────────────────────────
//  SECURITY AUDIT LOG
// ─────────────────────────────────────────────────────────────────────

/**
 * Log security events for auditing
 */
export function logSecurityEvent(event) {
  const logEntry = {
    timestamp: Date.now(),
    event: event.type,
    details: event.details,
    severity: event.severity || 'info',
  }

  try {
    const logs = JSON.parse(localStorage.getItem('security_audit_log') || '[]')
    logs.unshift(logEntry)

    // Keep only last 500 logs
    if (logs.length > 500) {
      logs.length = 500
    }

    localStorage.setItem('security_audit_log', JSON.stringify(logs))
  } catch (error) {
    console.error('Failed to log security event:', error)
  }

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Security Audit] ${event.type}:`, event.details)
  }
}

/**
 * Get security audit logs
 */
export function getSecurityLogs(limit = 50) {
  try {
    const logs = JSON.parse(localStorage.getItem('security_audit_log') || '[]')
    return logs.slice(0, limit)
  } catch {
    return []
  }
}

// ─────────────────────────────────────────────────────────────────────
//  CIRCUIT BREAKER
// ─────────────────────────────────────────────────────────────────────

/**
 * Circuit breaker to prevent cascading failures
 */
export function getCircuitBreaker(options = {}) {
  const {
    failureThreshold = 5,
    recoveryTimeout = 60000, // 1 minute
  } = options

  let failures = 0
  let lastFailure = 0
  let state = 'closed' // closed | open | half-open

  return {
    canExecute() {
      if (state === 'closed') {
        return { allowed: true }
      }

      if (state === 'open') {
        const timeSinceFailure = Date.now() - lastFailure
        if (timeSinceFailure > recoveryTimeout) {
          state = 'half-open'
          return { allowed: true, state: 'half-open' }
        }
        return {
          allowed: false,
          error: 'Service temporarily unavailable. Please try again later.',
          retryAfter: recoveryTimeout - timeSinceFailure,
        }
      }

      // half-open state
      return { allowed: true, state: 'half-open' }
    },

    recordSuccess() {
      failures = 0
      state = 'closed'
    },

    recordFailure() {
      failures++
      lastFailure = Date.now()

      if (failures >= failureThreshold) {
        state = 'open'
        logSecurityEvent({
          type: 'circuit_breaker_opened',
          details: `Circuit breaker opened after ${failures} failures`,
          severity: 'warning',
        })
      }
    },

    getState() {
      return {
        state,
        failures,
        lastFailure,
      }
    },

    reset() {
      failures = 0
      lastFailure = 0
      state = 'closed'
    },
  }
}
