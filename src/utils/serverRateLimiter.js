/**
 * 🛡️ Server-Side Rate Limiting Middleware
 * 
 * Features:
 * - Express.js middleware for API rate limiting
 * - Redis-backed rate limiting for production
 * - In-memory fallback for development
 * - Per-IP and per-user rate limits
 */

// ─────────────────────────────────────────────────────────────────────
//  IN-MEMORY RATE LIMITER (Development)
// ─────────────────────────────────────────────────────────────────────

class InMemoryRateLimiter {
  constructor() {
    this.requests = new Map()
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000)
  }
  
  /**
   * Check if request is allowed
   * @param {string} key - Rate limit key (IP or user ID)
   * @param {Object} limits - Rate limits
   * @returns {Object} Rate limit status
   */
  checkLimit(key, limits) {
    const now = Date.now()
    const { windowMs, maxRequests } = limits
    
    // Get or create request history
    if (!this.requests.has(key)) {
      this.requests.set(key, [])
    }
    
    const requestHistory = this.requests.get(key)
    
    // Remove old requests outside window
    const windowStart = now - windowMs
    const recentRequests = requestHistory.filter(t => t > windowStart)
    
    // Check if limit exceeded
    if (recentRequests.length >= maxRequests) {
      const resetTime = recentRequests[0] + windowMs
      const retryAfter = Math.ceil((resetTime - now) / 1000)
      
      return {
        allowed: false,
        retryAfter,
        remaining: 0,
        limit: maxRequests,
        resetTime: new Date(resetTime).toISOString(),
      }
    }
    
    // Record this request
    recentRequests.push(now)
    this.requests.set(key, recentRequests)
    
    return {
      allowed: true,
      remaining: maxRequests - recentRequests.length,
      limit: maxRequests,
      resetTime: new Date(now + windowMs).toISOString(),
    }
  }
  
  /**
   * Clean up old entries
   */
  cleanup() {
    const now = Date.now()
    const maxAge = 3600000 // 1 hour
    
    for (const [key, timestamps] of this.requests.entries()) {
      const recent = timestamps.filter(t => now - t < maxAge)
      if (recent.length === 0) {
        this.requests.delete(key)
      } else {
        this.requests.set(key, recent)
      }
    }
  }
  
  /**
   * Reset rate limiter
   */
  reset() {
    this.requests.clear()
  }
}

// ─────────────────────────────────────────────────────────────────────
//  REDIS RATE LIMITER (Production)
// ─────────────────────────────────────────────────────────────────────

class RedisRateLimiter {
  constructor(redisClient) {
    this.redis = redisClient
  }
  
  /**
   * Check if request is allowed using Redis
   * @param {string} key - Rate limit key
   * @param {Object} limits - Rate limits
   * @returns {Promise<Object>} Rate limit status
   */
  async checkLimit(key, limits) {
    const { windowMs, maxRequests } = limits
    const now = Date.now()
    const windowStart = now - windowMs
    
    // Use Redis sorted set for efficient sliding window
    const redisKey = `rate_limit:${key}`
    
    // Remove old entries
    await this.redis.zremrangebyscore(redisKey, 0, windowStart)
    
    // Count recent requests
    const requestCount = await this.redis.zcard(redisKey)
    
    if (requestCount >= maxRequests) {
      // Get oldest request in window to calculate reset time
      const oldestRequests = await this.redis.zrange(redisKey, 0, 0, 'WITHSCORES')
      const oldestTime = parseInt(oldestRequests[1])
      const resetTime = oldestTime + windowMs
      const retryAfter = Math.ceil((resetTime - now) / 1000)
      
      return {
        allowed: false,
        retryAfter,
        remaining: 0,
        limit: maxRequests,
        resetTime: new Date(resetTime).toISOString(),
      }
    }
    
    // Add current request
    await this.redis.zadd(redisKey, now, `${now}:${Math.random()}`)
    await this.redis.expire(redisKey, Math.ceil(windowMs / 1000))
    
    return {
      allowed: true,
      remaining: maxRequests - requestCount - 1,
      limit: maxRequests,
      resetTime: new Date(now + windowMs).toISOString(),
    }
  }
}

// ─────────────────────────────────────────────────────────────────────
//  RATE LIMIT CONFIGURATION
// ─────────────────────────────────────────────────────────────────────

export const RATE_LIMIT_CONFIG = {
  // General API requests
  general: {
    windowMs: 15 * 60 * 1000,  // 15 minutes
    maxRequests: 100,           // 100 requests per 15 min
  },
  
  // Authentication endpoints
  auth: {
    windowMs: 60 * 60 * 1000,  // 1 hour
    maxRequests: 20,            // 20 attempts per hour
  },
  
  // Transaction submission
  transactions: {
    windowMs: 60 * 1000,       // 1 minute
    maxRequests: 3,             // 3 transactions per minute
  },
  
  // Price API calls
  prices: {
    windowMs: 60 * 1000,       // 1 minute
    maxRequests: 30,            // 30 price checks per minute
  },
  
  // Threat intelligence checks
  threatCheck: {
    windowMs: 60 * 1000,       // 1 minute
    maxRequests: 10,            // 10 checks per minute
  },
}

// ─────────────────────────────────────────────────────────────────────
//  EXPRESS MIDDLEWARE
// ─────────────────────────────────────────────────────────────────────

/**
 * Create rate limiting middleware
 * @param {Object} options - Middleware options
 * @returns {Function} Express middleware
 */
export function createRateLimiter(options = {}) {
  const {
    type = 'general',
    keyGenerator = (req) => req.ip,
    message = 'Too many requests, please try again later',
    skipFailedRequests = false,
    skipSuccessfulRequests = false,
  } = options
  
  const config = RATE_LIMIT_CONFIG[type] || RATE_LIMIT_CONFIG.general
  
  // Choose rate limiter based on environment
  const useRedis = process.env.REDIS_URL && process.env.NODE_ENV === 'production'
  let rateLimiter
  
  if (useRedis) {
    // Redis rate limiter for production
    const Redis = require('ioredis')
    const redisClient = new Redis(process.env.REDIS_URL)
    rateLimiter = new RedisRateLimiter(redisClient)
  } else {
    // In-memory rate limiter for development
    rateLimiter = new InMemoryRateLimiter()
  }
  
  return async (req, res, next) => {
    try {
      const key = keyGenerator(req)
      const result = await rateLimiter.checkLimit(key, config)
      
      // Set rate limit headers
      res.set({
        'X-RateLimit-Limit': config.maxRequests.toString(),
        'X-RateLimit-Remaining': result.remaining?.toString() || '0',
        'X-RateLimit-Reset': result.resetTime,
      })
      
      if (!result.allowed) {
        res.set('Retry-After', result.retryAfter?.toString() || '60')
        return res.status(429).json({
          success: false,
          error: message,
          retryAfter: result.retryAfter,
        })
      }
      
      next()
    } catch (error) {
      console.error('Rate limiter error:', error)
      // Fail open - allow request if rate limiter fails
      next()
    }
  }
}

// ─────────────────────────────────────────────────────────────────────
//  SPECIFIC RATE LIMITERS
// ─────────────────────────────────────────────────────────────────────

/**
 * Rate limiter for authentication endpoints
 */
export const authRateLimiter = createRateLimiter({
  type: 'auth',
  keyGenerator: (req) => `auth:${req.ip}`,
  message: 'Too many authentication attempts. Please wait before trying again.',
})

/**
 * Rate limiter for transaction endpoints
 */
export const transactionRateLimiter = createRateLimiter({
  type: 'transactions',
  keyGenerator: (req) => `tx:${req.body?.from || req.ip}`,
  message: 'Transaction rate limit exceeded. Please wait before submitting another transaction.',
})

/**
 * Rate limiter for price API endpoints
 */
export const priceRateLimiter = createRateLimiter({
  type: 'prices',
  keyGenerator: (req) => `price:${req.ip}`,
  message: 'Price API rate limit exceeded. Please try again later.',
})

/**
 * Rate limiter for threat intelligence checks
 */
export const threatCheckRateLimiter = createRateLimiter({
  type: 'threatCheck',
  keyGenerator: (req) => `threat:${req.body?.address || req.ip}`,
  message: 'Threat check rate limit exceeded. Please try again later.',
})

// ─────────────────────────────────────────────────────────────────────
//  SERVER SETUP EXAMPLE
// ─────────────────────────────────────────────────────────────────────

/**
 * Example Express server setup with rate limiting
 * 
 * Usage:
 * ```javascript
 * import express from 'express'
 * import { 
 *   authRateLimiter, 
 *   transactionRateLimiter, 
 *   priceRateLimiter,
 *   threatCheckRateLimiter 
 * } from './serverRateLimiter.js'
 * 
 * const app = express()
 * 
 * // Apply rate limiters to routes
 * app.post('/api/auth/login', authRateLimiter, loginHandler)
 * app.post('/api/transactions/send', transactionRateLimiter, sendTxHandler)
 * app.get('/api/prices/:symbol', priceRateLimiter, getPriceHandler)
 * app.post('/api/threat/check', threatCheckRateLimiter, threatCheckHandler)
 * 
 * // General rate limiter for all other routes
 * app.use('/api/', createRateLimiter({ type: 'general' }))
 * ```
 */

export function setupRateLimiting(app) {
  // General API rate limiting
  app.use('/api/', createRateLimiter({ type: 'general' }))
  
  // Specific endpoint rate limiting
  app.use('/api/auth/', authRateLimiter)
  app.use('/api/transactions/', transactionRateLimiter)
  app.use('/api/prices/', priceRateLimiter)
  app.use('/api/threat/', threatCheckRateLimiter)
  
  console.log('✅ Rate limiting configured')
}
