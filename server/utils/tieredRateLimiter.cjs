/**
 * 🛡️ Tiered Rate Limiting System
 * 
 * Implements different rate limits based on user tiers:
 * - Free users: 30 req/min
 * - Premium users: 100 req/min
 * - VIP users: 300 req/min
 * - Admin users: 1000 req/min
 * 
 * Features:
 * - Redis-backed for distributed systems
 * - In-memory fallback for development
 * - Automatic tier detection
 * - Graceful degradation
 */

const Redis = require('ioredis');

// Tier configuration
const TIER_CONFIG = {
  free: {
    windowMs: 60 * 1000,      // 1 minute
    maxRequests: 30,           // 30 requests per minute
    burstLimit: 10,            // Max burst requests
    burstWindowMs: 10 * 1000,  // 10 second burst window
  },
  premium: {
    windowMs: 60 * 1000,
    maxRequests: 100,
    burstLimit: 30,
    burstWindowMs: 10 * 1000,
  },
  vip: {
    windowMs: 60 * 1000,
    maxRequests: 300,
    burstLimit: 50,
    burstWindowMs: 10 * 1000,
  },
  admin: {
    windowMs: 60 * 1000,
    maxRequests: 1000,
    burstLimit: 100,
    burstWindowMs: 10 * 1000,
  },
};

// Endpoint-specific rate limits (multipliers)
const ENDPOINT_MULTIPLIERS = {
  '/api/auth/': 0.5,        // Stricter for auth
  '/api/transactions/': 1.5, // More lenient for transactions
  '/api/prices/': 2.0,       // Very lenient for prices (cached)
  '/api/admin/': 0.8,        // Slightly stricter for admin
  '/api/health': 5.0,        // Very lenient for health checks
};

/**
 * In-memory rate limiter for development/fallback
 */
class InMemoryTieredRateLimiter {
  constructor() {
    this.requests = new Map();
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  async checkLimit(key, tier = 'free', endpoint = '/') {
    const now = Date.now();
    const tierConfig = TIER_CONFIG[tier] || TIER_CONFIG.free;
    
    // Apply endpoint multiplier
    const multiplier = this.getEndpointMultiplier(endpoint);
    const maxRequests = Math.floor(tierConfig.maxRequests * multiplier);
    const windowMs = tierConfig.windowMs;
    
    // Check burst limit
    const burstKey = `${key}:burst`;
    const burstAllowed = this.checkBurst(burstKey, tierConfig, now);
    if (!burstAllowed) {
      return {
        allowed: false,
        retryAfter: Math.ceil(tierConfig.burstWindowMs / 1000),
        remaining: 0,
        limit: maxRequests,
        tier,
        resetTime: new Date(now + tierConfig.burstWindowMs).toISOString(),
        reason: 'burst_limit',
      };
    }
    
    // Get request history
    const requestKey = `${key}:main`;
    if (!this.requests.has(requestKey)) {
      this.requests.set(requestKey, []);
    }
    
    const requestHistory = this.requests.get(requestKey);
    const windowStart = now - windowMs;
    const recentRequests = requestHistory.filter(t => t > windowStart);
    
    // Check if limit exceeded
    if (recentRequests.length >= maxRequests) {
      const resetTime = recentRequests[0] + windowMs;
      const retryAfter = Math.ceil((resetTime - now) / 1000);
      
      return {
        allowed: false,
        retryAfter,
        remaining: 0,
        limit: maxRequests,
        tier,
        resetTime: new Date(resetTime).toISOString(),
        reason: 'rate_limit',
      };
    }
    
    // Record this request
    recentRequests.push(now);
    this.requests.set(requestKey, recentRequests);
    
    return {
      allowed: true,
      remaining: maxRequests - recentRequests.length,
      limit: maxRequests,
      tier,
      resetTime: new Date(now + windowMs).toISOString(),
    };
  }

  checkBurst(key, tierConfig, now) {
    if (!this.requests.has(key)) {
      this.requests.set(key, []);
    }
    
    const burstHistory = this.requests.get(key);
    const burstStart = now - tierConfig.burstWindowMs;
    const recentBursts = burstHistory.filter(t => t > burstStart);
    
    if (recentBursts.length >= tierConfig.burstLimit) {
      return false;
    }
    
    recentBursts.push(now);
    this.requests.set(key, recentBursts);
    return true;
  }

  getEndpointMultiplier(endpoint) {
    for (const [path, multiplier] of Object.entries(ENDPOINT_MULTIPLIERS)) {
      if (endpoint.startsWith(path)) {
        return multiplier;
      }
    }
    return 1.0;
  }

  cleanup() {
    const now = Date.now();
    const maxAge = 3600000; // 1 hour
    
    for (const [key, timestamps] of this.requests.entries()) {
      const recent = timestamps.filter(t => now - t < maxAge);
      if (recent.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, recent);
      }
    }
  }

  reset() {
    this.requests.clear();
  }
}

/**
 * Redis-backed tiered rate limiter for production
 */
class RedisTieredRateLimiter {
  constructor(redisClient) {
    this.redis = redisClient;
  }

  async checkLimit(key, tier = 'free', endpoint = '/') {
    const now = Date.now();
    const tierConfig = TIER_CONFIG[tier] || TIER_CONFIG.free;
    
    // Apply endpoint multiplier
    const multiplier = this.getEndpointMultiplier(endpoint);
    const maxRequests = Math.floor(tierConfig.maxRequests * multiplier);
    const windowMs = tierConfig.windowMs;
    
    const windowStart = now - windowMs;
    const mainKey = `rate_tier:${key}:main`;
    const burstKey = `rate_tier:${key}:burst`;
    
    // Use Redis pipeline for atomic operations
    const pipeline = this.redis.pipeline();
    
    // Remove old entries
    pipeline.zremrangebyscore(mainKey, 0, windowStart);
    pipeline.zremrangebyscore(burstKey, 0, now - tierConfig.burstWindowMs);
    
    // Get counts
    pipeline.zcard(mainKey);
    pipeline.zcard(burstKey);
    
    const results = await pipeline.exec();
    const mainCount = results[2][1];
    const burstCount = results[3][1];
    
    // Check burst limit
    if (burstCount >= tierConfig.burstLimit) {
      return {
        allowed: false,
        retryAfter: Math.ceil(tierConfig.burstWindowMs / 1000),
        remaining: 0,
        limit: maxRequests,
        tier,
        resetTime: new Date(now + tierConfig.burstWindowMs).toISOString(),
        reason: 'burst_limit',
      };
    }
    
    // Check main limit
    if (mainCount >= maxRequests) {
      const oldestRequests = await this.redis.zrange(mainKey, 0, 0, 'WITHSCORES');
      const oldestTime = parseInt(oldestRequests[1]);
      const resetTime = oldestTime + windowMs;
      const retryAfter = Math.ceil((resetTime - now) / 1000);
      
      return {
        allowed: false,
        retryAfter,
        remaining: 0,
        limit: maxRequests,
        tier,
        resetTime: new Date(resetTime).toISOString(),
        reason: 'rate_limit',
      };
    }
    
    // Add current request
    const requestID = `${now}:${Math.random()}`;
    pipeline = this.redis.pipeline();
    pipeline.zadd(mainKey, now, requestID);
    pipeline.zadd(burstKey, now, requestID);
    pipeline.expire(mainKey, Math.ceil(windowMs / 1000));
    pipeline.expire(burstKey, Math.ceil(tierConfig.burstWindowMs / 1000));
    await pipeline.exec();
    
    return {
      allowed: true,
      remaining: maxRequests - mainCount - 1,
      limit: maxRequests,
      tier,
      resetTime: new Date(now + windowMs).toISOString(),
    };
  }

  getEndpointMultiplier(endpoint) {
    for (const [path, multiplier] of Object.entries(ENDPOINT_MULTIPLIERS)) {
      if (endpoint.startsWith(path)) {
        return multiplier;
      }
    }
    return 1.0;
  }

  async getUsageStats(key, tier = 'free') {
    const tierConfig = TIER_CONFIG[tier] || TIER_CONFIG.free;
    const mainKey = `rate_tier:${key}:main`;
    
    const count = await this.redis.zcard(mainKey);
    const multiplier = this.getEndpointMultiplier('/');
    const maxRequests = Math.floor(tierConfig.maxRequests * multiplier);
    
    return {
      used: count,
      limit: maxRequests,
      remaining: Math.max(0, maxRequests - count),
      tier,
    };
  }

  async resetLimit(key) {
    await this.redis.del([
      `rate_tier:${key}:main`,
      `rate_tier:${key}:burst`,
    ]);
  }
}

/**
 * Create tiered rate limiting middleware
 * @param {Object} options - Configuration options
 * @returns {Function} Express middleware
 */
function createTieredRateLimiter(options = {}) {
  const {
    tierResolver = (req) => 'free', // Function to determine user tier
    keyGenerator = (req) => req.ip,  // Function to generate rate limit key
    message = 'Rate limit exceeded. Please upgrade your plan for higher limits.',
    onRateLimit = null, // Callback when rate limit hit
  } = options;

  // Choose rate limiter based on Redis availability
  let rateLimiter;
  if (process.env.REDIS_URL && process.env.NODE_ENV === 'production') {
    const redisClient = new Redis(process.env.REDIS_URL);
    rateLimiter = new RedisTieredRateLimiter(redisClient);
  } else {
    rateLimiter = new InMemoryTieredRateLimiter();
  }

  return async (req, res, next) => {
    try {
      const key = keyGenerator(req);
      const tier = tierResolver(req);
      const limitResult = await rateLimiter.checkLimit(key, tier, req.path);

      // Set rate limit headers
      res.set({
        'X-RateLimit-Limit': limitResult.limit.toString(),
        'X-RateLimit-Remaining': limitResult.remaining.toString(),
        'X-RateLimit-Reset': limitResult.resetTime,
        'X-RateLimit-Tier': tier,
        'Retry-After': limitResult.retryAfter?.toString() || '0',
      });

      if (!limitResult.allowed) {
        // Rate limit exceeded
        if (onRateLimit) {
          onRateLimit(req, limitResult);
        }

        return res.status(429).json({
          success: false,
          error: message,
          retryAfter: limitResult.retryAfter,
          tier: limitResult.tier,
          limit: limitResult.limit,
          reason: limitResult.reason,
          upgradeHint: getUpgradeHint(tier),
        });
      }

      next();
    } catch (error) {
      console.error('Tiered rate limiter error:', error.message);
      // Fail open - allow request if rate limiter fails
      next();
    }
  };
}

/**
 * Get upgrade hint based on current tier
 */
function getUpgradeHint(currentTier) {
  const hints = {
    free: 'Upgrade to Premium for 3x higher rate limits',
    premium: 'Upgrade to VIP for 3x higher rate limits',
    vip: 'Contact us for custom enterprise limits',
    admin: 'You have maximum rate limits',
  };
  return hints[currentTier] || '';
}

/**
 * Resolve user tier from request
 * This should be customized based on your authentication system
 */
function resolveUserTier(req) {
  // Check JWT token for tier
  if (req.user && req.user.tier) {
    return req.user.tier;
  }

  // Check API key for tier
  if (req.apiKey && req.apiKey.tier) {
    return req.apiKey.tier;
  }

  // Default to free tier
  return 'free';
}

/**
 * Get tier configuration
 */
function getTierConfig(tier = 'free') {
  return TIER_CONFIG[tier] || TIER_CONFIG.free;
}

/**
 * Get all tier configurations
 */
function getAllTierConfigs() {
  return { ...TIER_CONFIG };
}

// ─────────────────────────────────────────────────────────────────────
//  EXPORTS
// ─────────────────────────────────────────────────────────────────────

module.exports = {
  createTieredRateLimiter,
  resolveUserTier,
  getTierConfig,
  getAllTierConfigs,
  TIER_CONFIG,
  InMemoryTieredRateLimiter,
  RedisTieredRateLimiter,
};
