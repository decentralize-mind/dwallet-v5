/**
 * 🔒 Secure Error Handling & Graceful Degradation
 * 
 * Features:
 * - Generic error messages to prevent information leakage
 * - Detailed internal logging for debugging
 * - Graceful degradation when services fail
 * - Error categorization and handling strategies
 * - Retry logic with exponential backoff
 * - Service health monitoring
 */

// ─────────────────────────────────────────────────────────────────────
//  ERROR CATEGORIZATION
// ─────────────────────────────────────────────────────────────────────

/**
 * Error categories for appropriate handling
 */
export const ERROR_CATEGORIES = {
  AUTHENTICATION: 'authentication',
  NETWORK: 'network',
  VALIDATION: 'validation',
  PERMISSION: 'permission',
  RATE_LIMIT: 'rate_limit',
  TIMEOUT: 'timeout',
  SERVICE_UNAVAILABLE: 'service_unavailable',
  UNKNOWN: 'unknown'
}

/**
 * Categorize an error
 */
export function categorizeError(error) {
  if (!error) return ERROR_CATEGORIES.UNKNOWN
  
  const message = error.message?.toLowerCase() || ''
  const code = error.code?.toLowerCase() || ''
  
  // Authentication errors
  if (message.includes('incorrect password') || 
      message.includes('invalid credentials') ||
      message.includes('authentication failed')) {
    return ERROR_CATEGORIES.AUTHENTICATION
  }
  
  // Network errors
  if (message.includes('network') || 
      message.includes('connection') ||
      message.includes('fetch failed') ||
      code === 'network_error' ||
      code === 'enetunreach') {
    return ERROR_CATEGORIES.NETWORK
  }
  
  // Validation errors
  if (message.includes('invalid') || 
      message.includes('validation') ||
      message.includes('malformed')) {
    return ERROR_CATEGORIES.VALIDATION
  }
  
  // Permission errors
  if (message.includes('permission') || 
      message.includes('unauthorized') ||
      message.includes('forbidden') ||
      code === '403' ||
      code === '401') {
    return ERROR_CATEGORIES.PERMISSION
  }
  
  // Rate limit errors
  if (message.includes('rate limit') || 
      message.includes('too many requests') ||
      code === '429') {
    return ERROR_CATEGORIES.RATE_LIMIT
  }
  
  // Timeout errors
  if (message.includes('timeout') || 
      message.includes('timed out') ||
      code === 'timeout' ||
      code === 'etimeout') {
    return ERROR_CATEGORIES.TIMEOUT
  }
  
  // Service unavailable
  if (message.includes('service unavailable') || 
      message.includes('503') ||
      message.includes('502') ||
      code === '503' ||
      code === '502') {
    return ERROR_CATEGORIES.SERVICE_UNAVAILABLE
  }
  
  return ERROR_CATEGORIES.UNKNOWN
}

// ─────────────────────────────────────────────────────────────────────
//  USER-SAFE ERROR MESSAGES
// ─────────────────────────────────────────────────────────────────────

/**
 * Get user-safe error message (no sensitive information)
 */
export function getUserSafeError(error, context = 'general') {
  const category = categorizeError(error)
  
  // Context-specific error messages
  const errorMessages = {
    // Authentication context
    login: {
      [ERROR_CATEGORIES.AUTHENTICATION]: 'Unable to sign in. Please check your credentials and try again.',
      [ERROR_CATEGORIES.RATE_LIMIT]: error.message || 'Too many attempts. Please wait before trying again.',
      [ERROR_CATEGORIES.TIMEOUT]: 'Sign-in request timed out. Please try again.',
      default: 'Unable to sign in. Please try again later.'
    },
    
    // Transaction context
    transaction: {
      [ERROR_CATEGORIES.NETWORK]: 'Unable to connect to the network. Please check your internet connection.',
      [ERROR_CATEGORIES.PERMISSION]: 'Transaction not authorized. Please ensure you have sufficient permissions.',
      [ERROR_CATEGORIES.RATE_LIMIT]: 'Too many transactions. Please wait a moment before trying again.',
      [ERROR_CATEGORIES.TIMEOUT]: 'Transaction timed out. Please try again.',
      [ERROR_CATEGORIES.VALIDATION]: 'Invalid transaction details. Please check and try again.',
      default: 'Transaction failed. Please try again later.'
    },
    
    // Data fetching context
    data_fetch: {
      [ERROR_CATEGORIES.NETWORK]: 'Unable to fetch data. Please check your internet connection.',
      [ERROR_CATEGORIES.TIMEOUT]: 'Request timed out. Please try again.',
      [ERROR_CATEGORIES.SERVICE_UNAVAILABLE]: 'Service temporarily unavailable. Please try again later.',
      default: 'Unable to load data. Please try again later.'
    },
    
    // General context
    general: {
      [ERROR_CATEGORIES.NETWORK]: 'Connection error. Please check your internet connection.',
      [ERROR_CATEGORIES.TIMEOUT]: 'Request timed out. Please try again.',
      [ERROR_CATEGORIES.SERVICE_UNAVAILABLE]: 'Service temporarily unavailable.',
      [ERROR_CATEGORIES.RATE_LIMIT]: 'Too many requests. Please wait before trying again.',
      default: 'An error occurred. Please try again later.'
    }
  }
  
  // Get appropriate message
  const contextErrors = errorMessages[context] || errorMessages.general
  return contextErrors[category] || contextErrors.default
}

/**
 * Get detailed error for logging (never shown to user)
 */
export function getDetailedErrorLog(error, context = 'general') {
  return {
    timestamp: new Date().toISOString(),
    context,
    category: categorizeError(error),
    message: error.message || 'Unknown error',
    code: error.code || null,
    stack: error.stack || null,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null
  }
}

// ─────────────────────────────────────────────────────────────────────
//  GRACEFUL DEGRADATION
// ─────────────────────────────────────────────────────────────────────

/**
 * Service fallback configuration
 */
const SERVICE_FALLBACKS = {
  // Blockchain providers
  blockchain: {
    primary: 'infura',
    fallbacks: ['alchemy', 'cloudflare', 'publicnode'],
    timeout: 10000,
    retries: 3
  },
  
  // Price APIs
  prices: {
    primary: 'coingecko',
    fallbacks: ['cached'],
    timeout: 5000,
    retries: 2
  },
  
  // Market data APIs
  market_data: {
    primary: 'coingecko',
    fallbacks: ['cached', 'static'],
    timeout: 8000,
    retries: 2
  }
}

/**
 * Execute function with graceful degradation
 */
export async function withGracefulDegradation(
  primaryFn,
  fallbackFn,
  options = {}
) {
  const {
    context = 'general',
    maxRetries = 2,
    timeout = 5000,
    logErrors = true
  } = options
  
  // Try primary function
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Operation timed out')), timeout)
      })
      
      const result = await Promise.race([primaryFn(), timeoutPromise])
      
      if (logErrors && attempt > 1) {
        console.log(`✅ ${context} succeeded on attempt ${attempt}`)
      }
      
      return {
        success: true,
        data: result,
        source: 'primary',
        attempt
      }
    } catch (error) {
      if (logErrors) {
        const log = getDetailedErrorLog(error, context)
        console.warn(`⚠️ ${context} attempt ${attempt}/${maxRetries} failed:`, error.message)
      }
      
      // If last attempt, try fallback
      if (attempt === maxRetries) {
        break
      }
      
      // Wait before retry (exponential backoff)
      await sleep(1000 * Math.pow(2, attempt - 1))
    }
  }
  
  // Try fallback
  if (fallbackFn) {
    try {
      console.log(`🔄 Using fallback for ${context}`)
      const fallbackData = await fallbackFn()
      
      return {
        success: true,
        data: fallbackData,
        source: 'fallback',
        attempt: 1
      }
    } catch (fallbackError) {
      if (logErrors) {
        console.error(`❌ Fallback for ${context} also failed:`, fallbackError.message)
      }
    }
  }
  
  // Both primary and fallback failed
  return {
    success: false,
    data: null,
    source: null,
    error: getUserSafeError(new Error('Service unavailable'), context)
  }
}

/**
 * Sleep utility
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// ─────────────────────────────────────────────────────────────────────
//  RETRY LOGIC WITH EXPONENTIAL BACKOFF
// ─────────────────────────────────────────────────────────────────────

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff(
  fn,
  options = {}
) {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 30000,
    backoffMultiplier = 2,
    context = 'operation',
    logErrors = true
  } = options
  
  let lastError
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await fn()
      
      if (logErrors && attempt > 1) {
        console.log(`✅ ${context} succeeded on attempt ${attempt}`)
      }
      
      return {
        success: true,
        data: result,
        attempt
      }
    } catch (error) {
      lastError = error
      
      if (logErrors) {
        console.warn(`⚠️ ${context} attempt ${attempt}/${maxRetries} failed:`, error.message)
      }
      
      // If last attempt, throw
      if (attempt === maxRetries) {
        break
      }
      
      // Calculate delay with exponential backoff
      const delay = Math.min(
        baseDelay * Math.pow(backoffMultiplier, attempt - 1),
        maxDelay
      )
      
      if (logErrors) {
        console.log(`⏳ Retrying ${context} in ${delay}ms...`)
      }
      
      await sleep(delay)
    }
  }
  
  // All retries exhausted
  return {
    success: false,
    data: null,
    error: getUserSafeError(lastError, context),
    attempt: maxRetries,
    lastError
  }
}

// ─────────────────────────────────────────────────────────────────────
//  SERVICE HEALTH MONITORING
// ─────────────────────────────────────────────────────────────────────

/**
 * Service health tracker
 */
class ServiceHealthTracker {
  constructor() {
    this.services = new Map()
  }
  
  /**
   * Record service success
   */
  recordSuccess(serviceName, responseTime = 0) {
    const service = this.services.get(serviceName) || {
      name: serviceName,
      successes: 0,
      failures: 0,
      lastSuccess: null,
      lastFailure: null,
      averageResponseTime: 0,
      healthy: true
    }
    
    service.successes++
    service.lastSuccess = new Date().toISOString()
    
    // Update average response time
    const totalRequests = service.successes + service.failures
    service.averageResponseTime = 
      (service.averageResponseTime * (totalRequests - 1) + responseTime) / totalRequests
    
    // Mark as healthy if success rate > 80%
    service.healthy = service.successes / totalRequests > 0.8
    
    this.services.set(serviceName, service)
  }
  
  /**
   * Record service failure
   */
  recordFailure(serviceName, error = null) {
    const service = this.services.get(serviceName) || {
      name: serviceName,
      successes: 0,
      failures: 0,
      lastSuccess: null,
      lastFailure: null,
      averageResponseTime: 0,
      healthy: true
    }
    
    service.failures++
    service.lastFailure = new Date().toISOString()
    
    // Mark as unhealthy if success rate < 50%
    const totalRequests = service.successes + service.failures
    service.healthy = service.successes / totalRequests >= 0.5
    
    this.services.set(serviceName, service)
  }
  
  /**
   * Get service health status
   */
  getServiceHealth(serviceName) {
    return this.services.get(serviceName) || null
  }
  
  /**
   * Check if service is healthy
   */
  isServiceHealthy(serviceName) {
    const service = this.services.get(serviceName)
    return service?.healthy ?? true
  }
  
  /**
   * Get all service health status
   */
  getAllServiceHealth() {
    return Object.fromEntries(this.services)
  }
}

export const serviceHealth = new ServiceHealthTracker()

// ─────────────────────────────────────────────────────────────────────
//  ERROR BOUNDARY UTILITIES
// ─────────────────────────────────────────────────────────────────────

/**
 * Safe execution wrapper - never throws, always returns result object
 */
export async function safeExecute(fn, options = {}) {
  const {
    context = 'operation',
    fallbackValue = null,
    logErrors = true
  } = options
  
  try {
    const result = await fn()
    return {
      success: true,
      data: result,
      error: null
    }
  } catch (error) {
    if (logErrors) {
      const log = getDetailedErrorLog(error, context)
      console.error(`❌ ${context} failed:`, log)
    }
    
    return {
      success: false,
      data: fallbackValue,
      error: getUserSafeError(error, context),
      details: getDetailedErrorLog(error, context)
    }
  }
}

/**
 * Safe synchronous execution
 */
export function safeExecuteSync(fn, options = {}) {
  const {
    context = 'operation',
    fallbackValue = null,
    logErrors = true
  } = options
  
  try {
    const result = fn()
    return {
      success: true,
      data: result,
      error: null
    }
  } catch (error) {
    if (logErrors) {
      const log = getDetailedErrorLog(error, context)
      console.error(`❌ ${context} failed:`, log)
    }
    
    return {
      success: false,
      data: fallbackValue,
      error: getUserSafeError(error, context),
      details: getDetailedErrorLog(error, context)
    }
  }
}

// ─────────────────────────────────────────────────────────────────────
//  SPECIFIC ERROR HANDLERS
// ─────────────────────────────────────────────────────────────────────

/**
 * Handle blockchain provider errors
 */
export function handleBlockchainError(error, chainId = 'unknown') {
  const category = categorizeError(error)
  
  // Log detailed error internally
  console.error(`❌ Blockchain error on ${chainId}:`, getDetailedErrorLog(error, 'blockchain'))
  
  // Return user-safe message
  const userMessage = getUserSafeError(error, 'transaction')
  
  return {
    success: false,
    error: userMessage,
    category,
    chainId,
    retryable: category === ERROR_CATEGORIES.NETWORK || 
               category === ERROR_CATEGORIES.TIMEOUT ||
               category === ERROR_CATEGORIES.SERVICE_UNAVAILABLE
  }
}

/**
 * Handle price fetching errors
 */
export function handlePriceError(error, symbol = 'unknown') {
  const category = categorizeError(error)
  
  // Log detailed error internally
  console.error(`❌ Price fetch error for ${symbol}:`, getDetailedErrorLog(error, 'prices'))
  
  // Return user-safe message (usually silent fallback)
  return {
    success: false,
    category,
    symbol,
    useFallback: true
  }
}

/**
 * Handle authentication errors
 */
export function handleAuthError(error) {
  const category = categorizeError(error)
  
  // Log detailed error internally
  console.error('❌ Authentication error:', getDetailedErrorLog(error, 'auth'))
  
  // Return user-safe message
  const userMessage = getUserSafeError(error, 'login')
  
  return {
    success: false,
    error: userMessage,
    category,
    retryable: category === ERROR_CATEGORIES.NETWORK || 
               category === ERROR_CATEGORIES.TIMEOUT
  }
}

// ─────────────────────────────────────────────────────────────────────
//  ERROR REPORTING (Optional)
// ─────────────────────────────────────────────────────────────────────

/**
 * Error reporter interface (can be connected to Sentry, etc.)
 */
class ErrorReporter {
  constructor() {
    this.enabled = false
    this.endpoint = null
  }
  
  /**
   * Configure error reporting
   */
  configure(options = {}) {
    this.enabled = options.enabled ?? false
    this.endpoint = options.endpoint
    this.apiKey = options.apiKey
  }
  
  /**
   * Report error to external service
   */
  async report(error, context = {}) {
    if (!this.enabled || !this.endpoint) {
      return
    }
    
    try {
      const report = {
        ...getDetailedErrorLog(error, context.context || 'unknown'),
        ...context,
        timestamp: new Date().toISOString()
      }
      
      // Send to error reporting service
      await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(report)
      })
    } catch (reportError) {
      // Silently fail - don't crash on error reporting failure
      console.warn('Failed to report error:', reportError.message)
    }
  }
}

export const errorReporter = new ErrorReporter()
