/**
 * Transaction Limits Utility
 * Enforces daily and per-transaction spending limits
 */

const LIMITS_KEY = 'dwallet_transaction_limits'
const SPENDING_LOG_KEY = 'dwallet_spending_log'

/**
 * Default limits
 */
const DEFAULT_LIMITS = {
  dailyLimit: 10000, // $10,000 per day
  perTxLimit: 5000,  // $5,000 per transaction
  enabled: false
}

/**
 * Get current transaction limits
 */
export function getTransactionLimits() {
  try {
    const limits = localStorage.getItem(LIMITS_KEY)
    return limits ? JSON.parse(limits) : DEFAULT_LIMITS
  } catch {
    return DEFAULT_LIMITS
  }
}

/**
 * Update transaction limits
 * Requires 48-hour delay for increases
 */
export function updateTransactionLimits(newLimits, currentLimits) {
  const current = currentLimits || getTransactionLimits()
  
  // Check if limits are being increased
  if (newLimits.dailyLimit > current.dailyLimit || newLimits.perTxLimit > current.perTxLimit) {
    // Set pending increase with 48-hour delay
    const pendingIncrease = {
      newDailyLimit: newLimits.dailyLimit,
      newPerTxLimit: newLimits.perTxLimit,
      requestedAt: Date.now(),
      effectiveAt: Date.now() + (48 * 60 * 60 * 1000) // 48 hours
    }
    
    localStorage.setItem('dwallet_pending_limit_increase', JSON.stringify(pendingIncrease))
    
    return {
      ...current,
      pendingIncrease
    }
  }
  
  // Decreases take effect immediately
  const updated = {
    dailyLimit: newLimits.dailyLimit,
    perTxLimit: newLimits.perTxLimit,
    enabled: newLimits.enabled !== undefined ? newLimits.enabled : current.enabled,
    updatedAt: Date.now()
  }
  
  localStorage.setItem(LIMITS_KEY, JSON.stringify(updated))
  return updated
}

/**
 * Check if pending limit increase is ready to apply
 */
export function applyPendingLimitIncrease() {
  try {
    const pending = localStorage.getItem('dwallet_pending_limit_increase')
    if (!pending) return false
    
    const increase = JSON.parse(pending)
    const now = Date.now()
    
    if (now >= increase.effectiveAt) {
      // Apply the increase
      const current = getTransactionLimits()
      const updated = {
        dailyLimit: increase.newDailyLimit,
        perTxLimit: increase.newPerTxLimit,
        enabled: current.enabled,
        updatedAt: now
      }
      
      localStorage.setItem(LIMITS_KEY, JSON.stringify(updated))
      localStorage.removeItem('dwallet_pending_limit_increase')
      
      console.log('✅ Pending limit increase applied')
      return true
    }
    
    return false
  } catch {
    return false
  }
}

/**
 * Check if transaction is within limits
 * Returns: { allowed: boolean, reason?: string, remaining?: object }
 */
export function checkTransactionLimits(amountUSD, currentLimits) {
  const limits = currentLimits || getTransactionLimits()
  
  // If limits are not enabled, allow all transactions
  if (!limits.enabled) {
    return { allowed: true }
  }
  
  // Check per-transaction limit
  if (amountUSD > limits.perTxLimit) {
    return {
      allowed: false,
      reason: `Transaction amount ($${amountUSD.toFixed(2)}) exceeds per-transaction limit ($${limits.perTxLimit.toFixed(2)})`,
      limit: limits.perTxLimit,
      amount: amountUSD
    }
  }
  
  // Check daily limit
  const spentToday = getTodaySpending()
  const remaining = limits.dailyLimit - spentToday
  
  if (amountUSD > remaining) {
    return {
      allowed: false,
      reason: `Transaction would exceed daily limit. Spent: $${spentToday.toFixed(2)} / $${limits.dailyLimit.toFixed(2)}, Remaining: $${remaining.toFixed(2)}`,
      limit: limits.dailyLimit,
      spent: spentToday,
      remaining: Math.max(0, remaining)
    }
  }
  
  return {
    allowed: true,
    remaining: {
      daily: remaining - amountUSD,
      perTx: limits.perTxLimit
    }
  }
}

/**
 * Log a transaction for daily spending tracking
 */
export function logTransaction(amountUSD, txHash) {
  const log = getSpendingLog()
  
  log.push({
    amount: amountUSD,
    txHash,
    timestamp: Date.now(),
    date: new Date().toISOString().split('T')[0] // YYYY-MM-DD
  })
  
  // Keep only last 90 days
  const cutoff = Date.now() - (90 * 24 * 60 * 60 * 1000)
  const filtered = log.filter(entry => entry.timestamp > cutoff)
  
  localStorage.setItem(SPENDING_LOG_KEY, JSON.stringify(filtered))
}

/**
 * Get today's spending
 */
export function getTodaySpending() {
  const log = getSpendingLog()
  const today = new Date().toISOString().split('T')[0]
  
  const todayTransactions = log.filter(entry => entry.date === today)
  return todayTransactions.reduce((sum, tx) => sum + tx.amount, 0)
}

/**
 * Get spending log
 */
function getSpendingLog() {
  try {
    const log = localStorage.getItem(SPENDING_LOG_KEY)
    return log ? JSON.parse(log) : []
  } catch {
    return []
  }
}

/**
 * Get daily spending for last 7 days
 */
export function getWeeklySpending() {
  const log = getSpendingLog()
  const days = []
  
  for (let i = 6; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString().split('T')[0]
    
    const dayTransactions = log.filter(entry => entry.date === dateStr)
    const total = dayTransactions.reduce((sum, tx) => sum + tx.amount, 0)
    
    days.push({
      date: dateStr,
      total,
      count: dayTransactions.length
    })
  }
  
  return days
}

/**
 * Get limit usage percentage
 */
export function getLimitUsage() {
  const limits = getTransactionLimits()
  const spentToday = getTodaySpending()
  
  return {
    dailyLimit: limits.dailyLimit,
    spentToday,
    remaining: Math.max(0, limits.dailyLimit - spentToday),
    percentage: (spentToday / limits.dailyLimit) * 100,
    perTxLimit: limits.perTxLimit
  }
}

/**
 * Enable or disable transaction limits
 */
export function setLimitsEnabled(enabled, password) {
  // In production, verify password here
  const current = getTransactionLimits()
  const updated = {
    ...current,
    enabled,
    updatedAt: Date.now()
  }
  
  localStorage.setItem(LIMITS_KEY, JSON.stringify(updated))
  return updated
}

/**
 * Get time remaining until pending increase takes effect
 */
export function getPendingIncreaseTimeRemaining() {
  try {
    const pending = localStorage.getItem('dwallet_pending_limit_increase')
    if (!pending) return null
    
    const increase = JSON.parse(pending)
    const now = Date.now()
    const remaining = increase.effectiveAt - now
    
    if (remaining <= 0) return null
    
    const hours = Math.floor(remaining / (1000 * 60 * 60))
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60))
    
    return {
      hours,
      minutes,
      effectiveAt: new Date(increase.effectiveAt).toLocaleString()
    }
  } catch {
    return null
  }
}

/**
 * Reset all limits to defaults
 */
export function resetLimits() {
  localStorage.setItem(LIMITS_KEY, JSON.stringify(DEFAULT_LIMITS))
  localStorage.removeItem('dwallet_pending_limit_increase')
  return DEFAULT_LIMITS
}
