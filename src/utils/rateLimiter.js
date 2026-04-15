/**
 * 🔒 Advanced Rate Limiting with Exponential Backoff
 * 
 * Features:
 * - Exponential backoff for login attempts
 * - Transaction submission rate limiting
 * - Sliding window rate limiting
 * - Progressive penalties for repeated violations
 */

// ─────────────────────────────────────────────────────────────────────
//  LOGIN RATE LIMITING WITH EXPONENTIAL BACKOFF
// ─────────────────────────────────────────────────────────────────────

const LOGIN_RATE_LIMIT_KEY = 'dwallet_login_rate_limit'

export const LOGIN_CONFIG = {
  maxAttempts: 5,              // Attempts before first lockout
  baseLockoutMs: 15 * 60 * 1000,   // Base lockout: 15 minutes
  maxLockoutMs: 24 * 60 * 60 * 1000, // Max lockout: 24 hours
  backoffMultiplier: 2,        // Double lockout each time
  windowMs: 60 * 60 * 1000,    // 1 hour sliding window
}

/**
 * Get login rate limit state
 */
export function getLoginRateLimitState() {
  try {
    const raw = localStorage.getItem(LOGIN_RATE_LIMIT_KEY)
    if (!raw) return null
    
    const state = JSON.parse(raw)
    
    // Check if lockout has expired
    if (state.lockedUntil && Date.now() >= state.lockedUntil) {
      // Lockout expired, reset
      localStorage.removeItem(LOGIN_RATE_LIMIT_KEY)
      return null
    }
    
    return state
  } catch {
    return null
  }
}

/**
 * Check if login attempt is allowed
 * @returns {Object} { allowed: boolean, waitMs?: number, attemptsRemaining?: number }
 */
export function checkLoginRateLimit() {
  const state = getLoginRateLimitState()
  
  if (!state) {
    return { allowed: true, attemptsRemaining: LOGIN_CONFIG.maxAttempts }
  }
  
  // Check if currently locked out
  if (state.lockedUntil && Date.now() < state.lockedUntil) {
    const waitMs = state.lockedUntil - Date.now()
    return {
      allowed: false,
      waitMs,
      waitMinutes: Math.ceil(waitMs / 60000),
      lockedUntil: new Date(state.lockedUntil).toISOString(),
      lockoutLevel: state.lockoutLevel || 1
    }
  }
  
  // Check sliding window
  const now = Date.now()
  const windowStart = now - LOGIN_CONFIG.windowMs
  const recentAttempts = (state.attempts || []).filter(t => t > windowStart)
  
  if (recentAttempts.length >= LOGIN_CONFIG.maxAttempts) {
    return {
      allowed: false,
      waitMs: LOGIN_CONFIG.windowMs,
      waitMinutes: Math.ceil(LOGIN_CONFIG.windowMs / 60000),
      attemptsRemaining: 0
    }
  }
  
  return {
    allowed: true,
    attemptsRemaining: LOGIN_CONFIG.maxAttempts - recentAttempts.length,
    recentAttempts: recentAttempts.length
  }
}

/**
 * Record a failed login attempt with exponential backoff
 */
export function recordFailedLoginAttempt() {
  try {
    const state = getLoginRateLimitState() || {
      attempts: [],
      lockoutLevel: 0,
      totalFailures: 0
    }
    
    const now = Date.now()
    state.attempts.push(now)
    state.totalFailures = (state.totalFailures || 0) + 1
    
    // Keep only attempts within sliding window
    const windowStart = now - LOGIN_CONFIG.windowMs
    state.attempts = state.attempts.filter(t => t > windowStart)
    
    // Check if should trigger lockout
    if (state.attempts.length >= LOGIN_CONFIG.maxAttempts) {
      state.lockoutLevel = (state.lockoutLevel || 0) + 1
      
      // Calculate exponential backoff
      const backoffMs = Math.min(
        LOGIN_CONFIG.baseLockoutMs * Math.pow(LOGIN_CONFIG.backoffMultiplier, state.lockoutLevel - 1),
        LOGIN_CONFIG.maxLockoutMs
      )
      
      state.lockedUntil = now + backoffMs
      state.attempts = [] // Reset attempts after lockout
      
      console.warn(`🔒 Login lockout #${state.lockoutLevel}: ${Math.round(backoffMs / 60000)} minutes`)
    }
    
    localStorage.setItem(LOGIN_RATE_LIMIT_KEY, JSON.stringify(state))
    
    return {
      locked: !!state.lockedUntil,
      lockoutLevel: state.lockoutLevel,
      attemptsRemaining: Math.max(0, LOGIN_CONFIG.maxAttempts - state.attempts.length)
    }
  } catch (err) {
    console.error('Failed to record login attempt:', err)
    return { locked: false, error: err.message }
  }
}

/**
 * Clear login rate limit on successful authentication
 */
export function clearLoginRateLimit() {
  localStorage.removeItem(LOGIN_RATE_LIMIT_KEY)
  console.log('✅ Login rate limit cleared')
}

/**
 * Get time remaining until lockout expires
 * @returns {Object|null} Time breakdown or null if not locked
 */
export function getLoginLockoutTimeRemaining() {
  const state = getLoginRateLimitState()
  
  if (!state || !state.lockedUntil) return null
  if (Date.now() >= state.lockedUntil) return null
  
  const remaining = state.lockedUntil - Date.now()
  
  return {
    milliseconds: remaining,
    seconds: Math.ceil(remaining / 1000),
    minutes: Math.ceil(remaining / 60000),
    hours: Math.ceil(remaining / (60 * 60 * 1000)),
    lockedUntil: new Date(state.lockedUntil).toISOString(),
    lockoutLevel: state.lockoutLevel || 1
  }
}

// ─────────────────────────────────────────────────────────────────────
//  TRANSACTION RATE LIMITING
// ─────────────────────────────────────────────────────────────────────

const TX_RATE_LIMIT_KEY = 'dwallet_transaction_rate_limit'

export const TX_RATE_CONFIG = {
  maxTxsPerMinute: 3,          // Max transactions per minute
  maxTxsPerHour: 10,           // Max transactions per hour
  maxTxsPerDay: 50,            // Max transactions per day
  cooldownAfterMax: 60 * 1000, // 1 minute cooldown after hitting limit
}

/**
 * Get transaction rate limit state
 */
function getTxRateLimitState() {
  try {
    const raw = localStorage.getItem(TX_RATE_LIMIT_KEY)
    if (!raw) return {
      timestamps: [],
      violations: 0,
      lastViolation: 0
    }
    
    const state = JSON.parse(raw)
    
    // Clean old timestamps (older than 24 hours)
    const cutoff = Date.now() - (24 * 60 * 60 * 1000)
    state.timestamps = (state.timestamps || []).filter(t => t > cutoff)
    
    return state
  } catch {
    return { timestamps: [], violations: 0, lastViolation: 0 }
  }
}

/**
 * Check if transaction submission is allowed
 * @returns {Object} { allowed: boolean, reason?: string, limits?: object }
 */
export function checkTransactionRateLimit() {
  const state = getTxRateLimitState()
  const now = Date.now()
  
  // Count transactions in different windows
  const oneMinuteAgo = now - (60 * 1000)
  const oneHourAgo = now - (60 * 60 * 1000)
  const oneDayAgo = now - (24 * 60 * 60 * 1000)
  
  const txsLastMinute = state.timestamps.filter(t => t > oneMinuteAgo).length
  const txsLastHour = state.timestamps.filter(t => t > oneHourAgo).length
  const txsLastDay = state.timestamps.filter(t => t > oneDayAgo).length
  
  // Check if in cooldown period
  if (state.lastViolation && (now - state.lastViolation) < TX_RATE_CONFIG.cooldownAfterMax) {
    const cooldownRemaining = TX_RATE_CONFIG.cooldownAfterMax - (now - state.lastViolation)
    return {
      allowed: false,
      reason: `Rate limit exceeded. Please wait ${Math.ceil(cooldownRemaining / 1000)} seconds before submitting another transaction.`,
      cooldownMs: cooldownRemaining,
      cooldownSeconds: Math.ceil(cooldownRemaining / 1000),
      violationCount: state.violations || 0
    }
  }
  
  // Check limits
  if (txsLastMinute >= TX_RATE_CONFIG.maxTxsPerMinute) {
    return {
      allowed: false,
      reason: `Too many transactions. Maximum ${TX_RATE_CONFIG.maxTxsPerMinute} transactions per minute.`,
      limit: 'per_minute',
      current: txsLastMinute,
      max: TX_RATE_CONFIG.maxTxsPerMinute
    }
  }
  
  if (txsLastHour >= TX_RATE_CONFIG.maxTxsPerHour) {
    return {
      allowed: false,
      reason: `Hourly limit reached. Maximum ${TX_RATE_CONFIG.maxTxsPerHour} transactions per hour.`,
      limit: 'per_hour',
      current: txsLastHour,
      max: TX_RATE_CONFIG.maxTxsPerHour
    }
  }
  
  if (txsLastDay >= TX_RATE_CONFIG.maxTxsPerDay) {
    return {
      allowed: false,
      reason: `Daily limit reached. Maximum ${TX_RATE_CONFIG.maxTxsPerDay} transactions per day.`,
      limit: 'per_day',
      current: txsLastDay,
      max: TX_RATE_CONFIG.maxTxsPerDay
    }
  }
  
  return {
    allowed: true,
    limits: {
      perMinute: { current: txsLastMinute, max: TX_RATE_CONFIG.maxTxsPerMinute, remaining: TX_RATE_CONFIG.maxTxsPerMinute - txsLastMinute },
      perHour: { current: txsLastHour, max: TX_RATE_CONFIG.maxTxsPerHour, remaining: TX_RATE_CONFIG.maxTxsPerHour - txsLastHour },
      perDay: { current: txsLastDay, max: TX_RATE_CONFIG.maxTxsPerDay, remaining: TX_RATE_CONFIG.maxTxsPerDay - txsLastDay }
    }
  }
}

/**
 * Record a transaction submission
 */
export function recordTransactionSubmission() {
  try {
    const state = getTxRateLimitState()
    const now = Date.now()
    
    state.timestamps.push(now)
    
    // Keep only last 24 hours
    const cutoff = now - (24 * 60 * 60 * 1000)
    state.timestamps = state.timestamps.filter(t => t > cutoff)
    
    localStorage.setItem(TX_RATE_LIMIT_KEY, JSON.stringify(state))
    
    return {
      recorded: true,
      timestamp: now,
      totalToday: state.timestamps.filter(t => t > now - (24 * 60 * 60 * 1000)).length
    }
  } catch (err) {
    console.error('Failed to record transaction:', err)
    return { recorded: false, error: err.message }
  }
}

/**
 * Record a rate limit violation
 */
export function recordTransactionViolation() {
  try {
    const state = getTxRateLimitState()
    
    state.violations = (state.violations || 0) + 1
    state.lastViolation = Date.now()
    
    localStorage.setItem(TX_RATE_LIMIT_KEY, JSON.stringify(state))
    
    console.warn(`⚠️ Transaction rate limit violation #${state.violations}`)
    
    return {
      violations: state.violations,
      lastViolation: state.lastViolation
    }
  } catch (err) {
    console.error('Failed to record violation:', err)
    return { error: err.message }
  }
}

/**
 * Clear transaction rate limit (admin function)
 */
export function clearTransactionRateLimit() {
  localStorage.removeItem(TX_RATE_LIMIT_KEY)
  console.log('✅ Transaction rate limit cleared')
}

/**
 * Get transaction rate limit statistics
 */
export function getTransactionRateLimitStats() {
  const state = getTxRateLimitState()
  const now = Date.now()
  
  const oneMinuteAgo = now - (60 * 1000)
  const oneHourAgo = now - (60 * 60 * 1000)
  const oneDayAgo = now - (24 * 60 * 60 * 1000)
  
  return {
    lastMinute: state.timestamps.filter(t => t > oneMinuteAgo).length,
    lastHour: state.timestamps.filter(t => t > oneHourAgo).length,
    lastDay: state.timestamps.filter(t => t > oneDayAgo).length,
    totalViolations: state.violations || 0,
    lastViolation: state.lastViolation ? new Date(state.lastViolation).toISOString() : null,
    limits: TX_RATE_CONFIG
  }
}

// ─────────────────────────────────────────────────────────────────────
//  UTILITY FUNCTIONS
// ─────────────────────────────────────────────────────────────────────

/**
 * Format milliseconds to human-readable string
 */
export function formatDuration(ms) {
  const seconds = Math.ceil(ms / 1000)
  const minutes = Math.ceil(ms / (60 * 1000))
  const hours = Math.ceil(ms / (60 * 60 * 1000))
  const days = Math.ceil(ms / (24 * 60 * 60 * 1000))
  
  if (days > 1) return `${days} days`
  if (hours > 1) return `${hours} hours`
  if (minutes > 1) return `${minutes} minutes`
  if (seconds > 1) return `${seconds} seconds`
  return `${Math.ceil(ms / 1000)} second${Math.ceil(ms / 1000) !== 1 ? 's' : ''}`
}

/**
 * Reset all rate limits (emergency function)
 */
export function resetAllRateLimits() {
  localStorage.removeItem(LOGIN_RATE_LIMIT_KEY)
  localStorage.removeItem(TX_RATE_LIMIT_KEY)
  console.log('✅ All rate limits reset')
}
