/**
 * 🚀 Redis Caching Layer for dWallet Backend
 * 
 * Features:
 * - Intelligent caching for frequently accessed data
 * - Cache invalidation strategies
 * - Performance monitoring
 * - Fallback to database on cache miss
 * 
 * Use Cases:
 * - Token prices & exchange rates
 * - User balance queries
 * - Transaction history
 * - Contract state reads
 * - API response caching
 */

const Redis = require('ioredis');

class RedisCache {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.stats = {
      hits: 0,
      misses: 0,
      errors: 0,
    };
  }

  /**
   * Initialize Redis connection
   * @returns {Promise<boolean>} Connection success
   */
  async connect() {
    try {
      const redisUrl = process.env.REDIS_URL;
      
      if (!redisUrl) {
        console.warn('⚠️ REDIS_URL not configured - caching disabled');
        return false;
      }

      this.client = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => {
          if (times > 3) {
            console.error('❌ Redis connection failed after 3 retries');
            return null; // Stop retrying
          }
          return Math.min(times * 200, 2000); // Exponential backoff
        },
        lazyConnect: true,
      });

      this.client.on('connect', () => {
        console.log('✅ Redis connected successfully');
        this.isConnected = true;
      });

      this.client.on('error', (err) => {
        console.error('❌ Redis error:', err.message);
        this.isConnected = false;
        this.stats.errors++;
      });

      this.client.on('close', () => {
        console.warn('⚠️ Redis connection closed');
        this.isConnected = false;
      });

      await this.client.connect();
      return true;
    } catch (error) {
      console.error('❌ Redis connection failed:', error.message);
      this.isConnected = false;
      return false;
    }
  }

  /**
   * Get value from cache
   * @param {string} key - Cache key
   * @returns {Promise<any>} Cached value or null
   */
  async get(key) {
    if (!this.isConnected || !this.client) {
      this.stats.misses++;
      return null;
    }

    try {
      const value = await this.client.get(key);
      
      if (value === null) {
        this.stats.misses++;
        return null;
      }

      this.stats.hits++;
      return JSON.parse(value);
    } catch (error) {
      console.error(`Cache GET error for key ${key}:`, error.message);
      this.stats.errors++;
      return null;
    }
  }

  /**
   * Set value in cache
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - Time to live in seconds (default: 300 = 5 min)
   * @returns {Promise<boolean>} Success status
   */
  async set(key, value, ttl = 300) {
    if (!this.isConnected || !this.client) {
      return false;
    }

    try {
      const serialized = JSON.stringify(value);
      await this.client.set(key, serialized, 'EX', ttl);
      return true;
    } catch (error) {
      console.error(`Cache SET error for key ${key}:`, error.message);
      this.stats.errors++;
      return false;
    }
  }

  /**
   * Delete value from cache
   * @param {string} key - Cache key
   * @returns {Promise<boolean>} Success status
   */
  async del(key) {
    if (!this.isConnected || !this.client) {
      return false;
    }

    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      console.error(`Cache DEL error for key ${key}:`, error.message);
      this.stats.errors++;
      return false;
    }
  }

  /**
   * Delete multiple keys by pattern
   * @param {string} pattern - Key pattern (e.g., 'price:*')
   * @returns {Promise<number>} Number of deleted keys
   */
  async delByPattern(pattern) {
    if (!this.isConnected || !this.client) {
      return 0;
    }

    try {
      const keys = await this.client.keys(pattern);
      if (keys.length === 0) return 0;
      
      await this.client.del(...keys);
      return keys.length;
    } catch (error) {
      console.error(`Cache DEL pattern error for ${pattern}:`, error.message);
      this.stats.errors++;
      return 0;
    }
  }

  /**
   * Check if key exists in cache
   * @param {string} key - Cache key
   * @returns {Promise<boolean>} Exists status
   */
  async exists(key) {
    if (!this.isConnected || !this.client) {
      return false;
    }

    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      console.error(`Cache EXISTS error for key ${key}:`, error.message);
      return false;
    }
  }

  /**
   * Set cache with hash field (for structured data)
   * @param {string} key - Cache key
   * @param {string} field - Hash field
   * @param {any} value - Field value
   * @param {number} ttl - Time to live in seconds
   * @returns {Promise<boolean>} Success status
   */
  async hset(key, field, value, ttl = 300) {
    if (!this.isConnected || !this.client) {
      return false;
    }

    try {
      const serialized = JSON.stringify(value);
      await this.client.hset(key, field, serialized);
      await this.client.expire(key, ttl);
      return true;
    } catch (error) {
      console.error(`Cache HSET error for key ${key}:`, error.message);
      this.stats.errors++;
      return false;
    }
  }

  /**
   * Get hash field from cache
   * @param {string} key - Cache key
   * @param {string} field - Hash field
   * @returns {Promise<any>} Field value or null
   */
  async hget(key, field) {
    if (!this.isConnected || !this.client) {
      return null;
    }

    try {
      const value = await this.client.hget(key, field);
      if (value === null) return null;
      
      return JSON.parse(value);
    } catch (error) {
      console.error(`Cache HGET error for key ${key}:`, error.message);
      this.stats.errors++;
      return null;
    }
  }

  /**
   * Get cache hit rate statistics
   * @returns {Object} Cache statistics
   */
  getStats() {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? ((this.stats.hits / total) * 100).toFixed(2) : 0;
    
    return {
      ...this.stats,
      hitRate: `${hitRate}%`,
      isConnected: this.isConnected,
    };
  }

  /**
   * Reset cache statistics
   */
  resetStats() {
    this.stats = { hits: 0, misses: 0, errors: 0 };
  }

  /**
   * Flush all cache data (DANGER: Use only in development)
   * @returns {Promise<boolean>} Success status
   */
  async flushAll() {
    if (!this.isConnected || !this.client) {
      return false;
    }

    if (process.env.NODE_ENV === 'production') {
      console.error('❌ FLUSHALL disabled in production for safety');
      return false;
    }

    try {
      await this.client.flushall();
      console.warn('⚠️ Cache flushed');
      return true;
    } catch (error) {
      console.error('Cache FLUSHALL error:', error.message);
      return false;
    }
  }

  /**
   * Close Redis connection
   */
  async disconnect() {
    if (this.client) {
      await this.client.quit();
      this.isConnected = false;
      console.log('🔌 Redis disconnected');
    }
  }
}

// ─────────────────────────────────────────────────────────────────────
//  CACHE HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────

/**
 * Generate cache key for token prices
 * @param {string} tokenAddress - Token contract address
 * @param {string} currency - Quote currency (USD, ETH, etc.)
 * @returns {string} Cache key
 */
function priceCacheKey(tokenAddress, currency = 'USD') {
  return `price:${tokenAddress.toLowerCase()}:${currency}`;
}

/**
 * Generate cache key for user balance
 * @param {string} userAddress - User wallet address
 * @param {string} tokenAddress - Token contract address
 * @returns {string} Cache key
 */
function balanceCacheKey(userAddress, tokenAddress) {
  return `balance:${userAddress.toLowerCase()}:${tokenAddress.toLowerCase()}`;
}

/**
 * Generate cache key for transaction history
 * @param {string} userAddress - User wallet address
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @returns {string} Cache key
 */
function txHistoryCacheKey(userAddress, page = 1, limit = 20) {
  return `tx_history:${userAddress.toLowerCase()}:p${page}:l${limit}`;
}

/**
 * Generate cache key for contract state
 * @param {string} contractAddress - Contract address
 * @param {string} method - Read method name
 * @param {Array} params - Method parameters
 * @returns {string} Cache key
 */
function contractStateCacheKey(contractAddress, method, params = []) {
  const paramsHash = params.join(':');
  return `contract:${contractAddress.toLowerCase()}:${method}:${paramsHash}`;
}

/**
 * Generate cache key for API response
 * @param {string} endpoint - API endpoint
 * @param {Object} queryParams - Query parameters
 * @returns {string} Cache key
 */
function apiCacheKey(endpoint, queryParams = {}) {
  const params = Object.keys(queryParams)
    .sort()
    .map(k => `${k}=${queryParams[k]}`)
    .join('&');
  return `api:${endpoint}:${params}`;
}

// ─────────────────────────────────────────────────────────────────────
//  CACHE TTL CONFIGURATION
// ─────────────────────────────────────────────────────────────────────

const CACHE_TTL = {
  // Token prices (volatile)
  PRICE: 30,              // 30 seconds
  
  // User balances (moderate)
  BALANCE: 60,            // 1 minute
  
  // Transaction history (static)
  TX_HISTORY: 300,        // 5 minutes
  
  // Contract state (varies by type)
  CONTRACT_STATE: 120,    // 2 minutes
  
  // User profile (rarely changes)
  USER_PROFILE: 600,      // 10 minutes
  
  // Exchange rates (moderate)
  EXCHANGE_RATE: 60,      // 1 minute
  
  // Token metadata (static)
  TOKEN_METADATA: 3600,   // 1 hour
  
  // API responses (varies)
  API_GENERAL: 300,       // 5 minutes
  API_STATS: 120,         // 2 minutes
};

// ─────────────────────────────────────────────────────────────────────
//  EXPRESS MIDDLEWARE FOR API CACHING
// ─────────────────────────────────────────────────────────────────────

/**
 * Create API response caching middleware
 * @param {Object} options - Middleware options
 * @returns {Function} Express middleware
 */
function createCacheMiddleware(options = {}) {
  const {
    ttl = CACHE_TTL.API_GENERAL,
    keyGenerator = (req) => apiCacheKey(req.path, req.query),
    skipCache = (req) => req.method !== 'GET', // Only cache GET requests
  } = options;

  return async (req, res, next) => {
    // Skip caching for non-GET requests or if skipCache returns true
    if (skipCache(req)) {
      return next();
    }

    const cache = req.app.get('redisCache');
    if (!cache || !cache.isConnected) {
      return next();
    }

    try {
      const key = keyGenerator(req);
      const cached = await cache.get(key);

      if (cached) {
        // Return cached response
        res.set('X-Cache', 'HIT');
        return res.json(cached);
      }

      // Intercept res.json to cache the response
      const originalJson = res.json.bind(res);
      res.json = (body) => {
        cache.set(key, body, ttl);
        res.set('X-Cache', 'MISS');
        return originalJson(body);
      };

      next();
    } catch (error) {
      console.error('Cache middleware error:', error.message);
      next(); // Continue without caching
    }
  };
}

// ─────────────────────────────────────────────────────────────────────
//  EXPORTS
// ─────────────────────────────────────────────────────────────────────

// Singleton instance
const redisCache = new RedisCache();

module.exports = {
  RedisCache,
  redisCache,
  createCacheMiddleware,
  priceCacheKey,
  balanceCacheKey,
  txHistoryCacheKey,
  contractStateCacheKey,
  apiCacheKey,
  CACHE_TTL,
};
