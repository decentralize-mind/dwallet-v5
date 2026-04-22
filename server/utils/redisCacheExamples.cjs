/**
 * 📝 Redis Caching Implementation Examples
 * 
 * This file demonstrates how to use Redis caching in your API routes
 * to improve performance and reduce database load.
 */

const { redisCache, createCacheMiddleware, CACHE_TTL, priceCacheKey, balanceCacheKey } = require('./redisCache.cjs');

// ─────────────────────────────────────────────────────────────────────
//  EXAMPLE 1: Manual Caching (Fine-Grained Control)
// ─────────────────────────────────────────────────────────────────────

/**
 * Example: Cache token price with manual get/set
 * 
 * Benefits:
 * - Full control over cache logic
 * - Can add custom fallback behavior
 * - Easy to debug
 */
async function example_manualCaching(req, res) {
  const { tokenAddress } = req.params;
  const cacheKey = priceCacheKey(tokenAddress, 'USD');
  
  try {
    // Try to get from cache first
    const cachedPrice = await redisCache.get(cacheKey);
    
    if (cachedPrice) {
      // Cache HIT - return immediately
      console.log('✅ Cache HIT for token price');
      return res.json({
        source: 'cache',
        ...cachedPrice,
      });
    }
    
    // Cache MISS - fetch from external API
    console.log('⚠️ Cache MISS - fetching from API');
    const axios = require('axios');
    const response = await axios.get(`https://api.coingecko.com/api/v3/simple/token_price/ethereum`, {
      params: {
        contract_addresses: tokenAddress,
        vs_currencies: 'usd',
      },
    });
    
    const priceData = {
      price: response.data[tokenAddress.toLowerCase()]?.usd || 0,
      timestamp: Date.now(),
    };
    
    // Cache for 30 seconds (prices change frequently)
    await redisCache.set(cacheKey, priceData, CACHE_TTL.PRICE);
    
    res.json({
      source: 'api',
      ...priceData,
    });
  } catch (error) {
    console.error('Error fetching price:', error.message);
    res.status(500).json({ error: 'Failed to fetch price' });
  }
}

// ─────────────────────────────────────────────────────────────────────
//  EXAMPLE 2: Middleware Caching (Automatic)
// ─────────────────────────────────────────────────────────────────────

/**
 * Example: Use middleware to automatically cache GET responses
 * 
 * Benefits:
 * - Zero code changes to existing routes
 * - Automatic cache invalidation via TTL
 * - Consistent caching behavior
 */

const express = require('express');
const router = express.Router();

// Apply cache middleware to specific routes
router.get(
  '/api/tokens/:address/price',
  createCacheMiddleware({
    ttl: CACHE_TTL.PRICE, // 30 seconds
    keyGenerator: (req) => priceCacheKey(req.params.address, 'USD'),
  }),
  async (req, res) => {
    // Your existing route logic - response will be auto-cached
    const price = await fetchTokenPrice(req.params.address);
    res.json({ price, timestamp: Date.now() });
  }
);

// Cache user balance for 1 minute
router.get(
  '/api/users/:address/balance',
  createCacheMiddleware({
    ttl: CACHE_TTL.BALANCE, // 1 minute
    keyGenerator: (req) => balanceCacheKey(req.params.address, req.query.tokenAddress),
  }),
  async (req, res) => {
    const balance = await getUserBalance(req.params.address, req.query.tokenAddress);
    res.json({ balance });
  }
);

// ─────────────────────────────────────────────────────────────────────
//  EXAMPLE 3: Cache Invalidation on Write Operations
// ─────────────────────────────────────────────────────────────────────

/**
 * Example: Invalidate cache when data changes
 * 
 * Best Practice:
 * - Always invalidate related cache on CREATE/UPDATE/DELETE
 * - Use patterns to clear multiple related keys
 */
async function example_cacheInvalidation(req, res) {
  const { userAddress } = req.params;
  const { amount } = req.body;
  
  try {
    // Perform database operation
    const result = await pool.query(
      'UPDATE balances SET amount = $1 WHERE address = $2',
      [amount, userAddress]
    );
    
    // Invalidate all cache for this user
    await redisCache.delByPattern(`balance:${userAddress.toLowerCase()}:*`);
    await redisCache.delByPattern(`tx_history:${userAddress.toLowerCase()}:*`);
    
    console.log('✅ Cache invalidated for user:', userAddress);
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// ─────────────────────────────────────────────────────────────────────
//  EXAMPLE 4: Hash-Based Caching (Structured Data)
// ─────────────────────────────────────────────────────────────────────

/**
 * Example: Use Redis hashes for structured data
 * 
 * Use Case:
 * - Caching multiple related fields
 * - Updating individual fields without re-caching everything
 */
async function example_hashCaching(req, res) {
  const { contractAddress } = req.params;
  const cacheKey = `contract:${contractAddress.toLowerCase()}`;
  
  try {
    // Get individual fields from cache
    const totalSupply = await redisCache.hget(cacheKey, 'totalSupply');
    const decimals = await redisCache.hget(cacheKey, 'decimals');
    const name = await redisCache.hget(cacheKey, 'name');
    
    // If all fields cached, return immediately
    if (totalSupply && decimals && name) {
      return res.json({
        source: 'cache',
        totalSupply,
        decimals,
        name,
      });
    }
    
    // Fetch from blockchain
    const contract = new ethers.Contract(
      contractAddress,
      ['function totalSupply() view returns (uint256)', 'function decimals() view returns (uint8)', 'function name() view returns (string)'],
      provider
    );
    
    const [newTotalSupply, newDecimals, newName] = await Promise.all([
      contract.totalSupply(),
      contract.decimals(),
      contract.name(),
    ]);
    
    // Cache individual fields
    await redisCache.hset(cacheKey, 'totalSupply', newTotalSupply.toString(), CACHE_TTL.CONTRACT_STATE);
    await redisCache.hset(cacheKey, 'decimals', newDecimals, CACHE_TTL.CONTRACT_STATE);
    await redisCache.hset(cacheKey, 'name', newName, CACHE_TTL.TOKEN_METADATA);
    
    res.json({
      source: 'blockchain',
      totalSupply: newTotalSupply.toString(),
      decimals: newDecimals,
      name: newName,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// ─────────────────────────────────────────────────────────────────────
//  EXAMPLE 5: Cache Warming (Pre-populate Cache)
// ─────────────────────────────────────────────────────────────────────

/**
 * Example: Pre-warm cache with frequently accessed data
 * 
 * Use Case:
 * - Application startup
 * - Scheduled jobs (every 5 minutes)
 * - After deployment
 */
async function warmCache() {
  console.log('🔥 Warming up cache...');
  
  const popularTokens = [
    '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH
    '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC
    '0xdAC17F958D2ee523a2206206994597C13D831ec7', // USDT
  ];
  
  for (const token of popularTokens) {
    try {
      const cacheKey = priceCacheKey(token, 'USD');
      
      // Skip if already cached
      if (await redisCache.exists(cacheKey)) {
        continue;
      }
      
      // Fetch and cache
      const price = await fetchTokenPrice(token);
      await redisCache.set(cacheKey, { price, timestamp: Date.now() }, CACHE_TTL.PRICE);
      
      console.log(`✅ Cached price for ${token}`);
    } catch (error) {
      console.error(`❌ Failed to cache ${token}:`, error.message);
    }
  }
  
  console.log('✅ Cache warming complete');
}

// Schedule cache warming every 5 minutes
setInterval(warmCache, 5 * 60 * 1000);

// ─────────────────────────────────────────────────────────────────────
//  EXAMPLE 6: Rate Limiter + Cache Combo
// ─────────────────────────────────────────────────────────────────────

/**
 * Example: Combine rate limiting with caching
 * 
 * Benefits:
 * - Reduces API calls to external services
 * - Protects against abuse
 * - Improves response times
 */
async function example_rateLimitPlusCache(req, res) {
  const { address } = req.params;
  const cacheKey = `threat_check:${address.toLowerCase()}`;
  
  try {
    // Check cache first
    const cachedResult = await redisCache.get(cacheKey);
    if (cachedResult) {
      return res.json({ source: 'cache', ...cachedResult });
    }
    
    // Check threat intelligence API
    const threatScore = await checkThreatIntelligence(address);
    const result = { score: threatScore, timestamp: Date.now() };
    
    // Cache for 5 minutes (threat data doesn't change often)
    await redisCache.set(cacheKey, result, CACHE_TTL.API_GENERAL);
    
    res.json({ source: 'api', ...result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// ─────────────────────────────────────────────────────────────────────
//  EXAMPLE 7: Cache Statistics Dashboard
// ─────────────────────────────────────────────────────────────────────

/**
 * Example: Monitor cache performance
 */
async function example_cacheDashboard(req, res) {
  const stats = redisCache.getStats();
  
  res.json({
    success: true,
    data: {
      ...stats,
      recommendation: getCacheRecommendation(stats),
    },
  });
}

function getCacheRecommendation(stats) {
  const hitRate = parseFloat(stats.hitRate);
  
  if (hitRate > 80) {
    return '✅ Excellent cache performance';
  } else if (hitRate > 50) {
    return '⚠️ Consider increasing TTL or caching more endpoints';
  } else {
    return '❌ Low hit rate - review caching strategy';
  }
}

// ─────────────────────────────────────────────────────────────────────
//  EXPORTS
// ─────────────────────────────────────────────────────────────────────

module.exports = {
  example_manualCaching,
  example_cacheInvalidation,
  example_hashCaching,
  warmCache,
  example_rateLimitPlusCache,
  example_cacheDashboard,
};
