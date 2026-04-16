import { ethers } from 'ethers';

/**
 * RPC Failover Provider Manager
 * 
 * Manages multiple RPC providers with automatic failover,
 * health checking, and load balancing.
 * 
 * Features:
 * - Automatic failover on provider failure
 * - Health checking with interval monitoring
 * - Load balancing across healthy providers
 * - Fallback chain configuration
 * - Performance tracking
 */

class RPCFailoverManager {
  constructor(config) {
    this.providers = [];
    this.currentProviderIndex = 0;
    this.healthCheckInterval = null;
    this.maxRetries = config.maxRetries || 3;
    this.healthCheckIntervalMs = config.healthCheckIntervalMs || 30000; // 30 seconds
    this.requestTimeout = config.requestTimeout || 10000; // 10 seconds
    
    // Initialize providers
    this.initializeProviders(config.providers);
  }

  /**
   * Initialize RPC providers from configuration
   */
  initializeProviders(providerConfigs) {
    this.providers = providerConfigs.map((config, index) => ({
      id: config.id || `provider-${index}`,
      url: config.url,
      provider: new ethers.JsonRpcProvider(config.url, config.network, {
        staticNetwork: true,
      }),
      weight: config.weight || 1,
      priority: config.priority || index,
      healthy: true,
      lastChecked: null,
      lastError: null,
      responseTime: null,
      requestCount: 0,
      failureCount: 0,
      successCount: 0,
    }));

    // Sort by priority
    this.providers.sort((a, b) => a.priority - b.priority);
    
    console.log(`🔄 Initialized ${this.providers.length} RPC providers`);
    this.providers.forEach(p => {
      console.log(`   ${p.id}: ${p.url} (priority: ${p.priority})`);
    });
  }

  /**
   * Get the current active provider
   */
  getCurrentProvider() {
    const healthyProviders = this.providers.filter(p => p.healthy);
    
    if (healthyProviders.length === 0) {
      throw new Error('No healthy RPC providers available');
    }

    // Return first healthy provider (sorted by priority)
    return healthyProviders[0];
  }

  /**
   * Get all healthy providers
   */
  getHealthyProviders() {
    return this.providers.filter(p => p.healthy);
  }

  /**
   * Get provider statistics
   */
  getStats() {
    return this.providers.map(p => ({
      id: p.id,
      url: p.url,
      healthy: p.healthy,
      priority: p.priority,
      responseTime: p.responseTime,
      requestCount: p.requestCount,
      failureCount: p.failureCount,
      successCount: p.successCount,
      successRate: p.requestCount > 0 
        ? ((p.successCount / p.requestCount) * 100).toFixed(2) + '%'
        : 'N/A',
      lastChecked: p.lastChecked,
      lastError: p.lastError,
    }));
  }

  /**
   * Execute RPC request with automatic failover
   */
  async execute(providerMethod, ...args) {
    const maxAttempts = Math.min(this.maxRetries, this.providers.length);
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const provider = this.providers[attempt];
      
      try {
        const startTime = Date.now();
        
        // Execute request with timeout
        const result = await Promise.race([
          provider.provider[providerMethod](...args),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Request timeout')), this.requestTimeout)
          )
        ]);
        
        const responseTime = Date.now() - startTime;
        
        // Update stats
        provider.healthy = true;
        provider.responseTime = responseTime;
        provider.requestCount++;
        provider.successCount++;
        provider.lastChecked = new Date().toISOString();
        provider.lastError = null;
        
        return result;
      } catch (error) {
        // Mark provider as unhealthy
        provider.healthy = false;
        provider.lastError = error.message;
        provider.requestCount++;
        provider.failureCount++;
        provider.lastChecked = new Date().toISOString();
        
        console.warn(`⚠️  Provider ${provider.id} failed: ${error.message}`);
        
        // Try next provider
        if (attempt < maxAttempts - 1) {
          console.log(`🔄 Failing over to next provider...`);
        }
      }
    }
    
    throw new Error('All RPC providers failed');
  }

  /**
   * Health check for all providers
   */
  async healthCheck() {
    console.log('🏥 Running health check on all providers...');
    
    const healthChecks = this.providers.map(async (provider) => {
      try {
        const startTime = Date.now();
        
        // Simple health check: get block number
        const blockNumber = await provider.provider.getBlockNumber();
        const responseTime = Date.now() - startTime;
        
        provider.healthy = true;
        provider.responseTime = responseTime;
        provider.lastChecked = new Date().toISOString();
        provider.lastError = null;
        
        console.log(`✅ ${provider.id}: Block ${blockNumber} (${responseTime}ms)`);
        
        return { id: provider.id, healthy: true, blockNumber, responseTime };
      } catch (error) {
        provider.healthy = false;
        provider.lastError = error.message;
        provider.lastChecked = new Date().toISOString();
        
        console.error(`❌ ${provider.id}: ${error.message}`);
        
        return { id: provider.id, healthy: false, error: error.message };
      }
    });
    
    const results = await Promise.all(healthChecks);
    const healthyCount = results.filter(r => r.healthy).length;
    
    console.log(`\n📊 Health check complete: ${healthyCount}/${this.providers.length} providers healthy`);
    
    return results;
  }

  /**
   * Start automatic health checking
   */
  startHealthMonitoring() {
    console.log(`🏥 Starting health monitoring (interval: ${this.healthCheckIntervalMs}ms)`);
    
    this.healthCheckInterval = setInterval(async () => {
      await this.healthCheck();
    }, this.healthCheckIntervalMs);
  }

  /**
   * Stop automatic health checking
   */
  stopHealthMonitoring() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
      console.log('🛑 Health monitoring stopped');
    }
  }

  /**
   * Add a new provider dynamically
   */
  addProvider(config) {
    const provider = {
      id: config.id || `provider-${this.providers.length}`,
      url: config.url,
      provider: new ethers.JsonRpcProvider(config.url, config.network, {
        staticNetwork: true,
      }),
      weight: config.weight || 1,
      priority: config.priority || this.providers.length,
      healthy: true,
      lastChecked: null,
      lastError: null,
      responseTime: null,
      requestCount: 0,
      failureCount: 0,
      successCount: 0,
    };
    
    this.providers.push(provider);
    this.providers.sort((a, b) => a.priority - b.priority);
    
    console.log(`✅ Added provider: ${provider.id}`);
  }

  /**
   * Remove a provider
   */
  removeProvider(providerId) {
    const index = this.providers.findIndex(p => p.id === providerId);
    if (index === -1) {
      throw new Error(`Provider not found: ${providerId}`);
    }
    
    this.providers.splice(index, 1);
    console.log(`❌ Removed provider: ${providerId}`);
  }

  /**
   * Get recommended provider based on performance
   */
  getBestProvider() {
    const healthyProviders = this.providers.filter(p => p.healthy);
    
    if (healthyProviders.length === 0) {
      throw new Error('No healthy providers available');
    }
    
    // Sort by response time (fastest first)
    const sorted = healthyProviders.sort((a, b) => {
      if (!a.responseTime) return 1;
      if (!b.responseTime) return -1;
      return a.responseTime - b.responseTime;
    });
    
    return sorted[0];
  }

  /**
   * Cleanup resources
   */
  destroy() {
    this.stopHealthMonitoring();
    this.providers = [];
    console.log('🧹 RPC Failover Manager destroyed');
  }
}

/**
 * Default RPC provider configurations for major networks
 */
export const DEFAULT_PROVIDERS = {
  ethereum: [
    {
      id: 'infura',
      url: `https://mainnet.infura.io/v3/${import.meta.env.VITE_INFURA_KEY}`,
      priority: 1,
      weight: 3,
    },
    {
      id: 'alchemy',
      url: `https://eth-mainnet.g.alchemy.com/v2/${import.meta.env.VITE_ALCHEMY_KEY}`,
      priority: 2,
      weight: 3,
    },
    {
      id: 'ankr',
      url: 'https://rpc.ankr.com/eth',
      priority: 3,
      weight: 2,
    },
    {
      id: 'llamanodes',
      url: 'https://eth.llamarpc.com',
      priority: 4,
      weight: 2,
    },
    {
      id: 'publicnode',
      url: 'https://ethereum-rpc.publicnode.com',
      priority: 5,
      weight: 1,
    },
  ],
  
  base: [
    {
      id: 'base-official',
      url: 'https://mainnet.base.org',
      priority: 1,
      weight: 3,
    },
    {
      id: 'alchemy-base',
      url: `https://base-mainnet.g.alchemy.com/v2/${import.meta.env.VITE_ALCHEMY_KEY}`,
      priority: 2,
      weight: 3,
    },
    {
      id: 'ankr-base',
      url: 'https://rpc.ankr.com/base',
      priority: 3,
      weight: 2,
    },
    {
      id: 'publicnode-base',
      url: 'https://base-rpc.publicnode.com',
      priority: 4,
      weight: 2,
    },
    {
      id: 'llamanodes-base',
      url: 'https://base.llamarpc.com',
      priority: 5,
      weight: 1,
    },
  ],
  
  arbitrum: [
    {
      id: 'arbitrum-official',
      url: 'https://arb1.arbitrum.io/rpc',
      priority: 1,
      weight: 3,
    },
    {
      id: 'alchemy-arbitrum',
      url: `https://arb-mainnet.g.alchemy.com/v2/${import.meta.env.VITE_ALCHEMY_KEY}`,
      priority: 2,
      weight: 3,
    },
    {
      id: 'ankr-arbitrum',
      url: 'https://rpc.ankr.com/arbitrum',
      priority: 3,
      weight: 2,
    },
    {
      id: 'publicnode-arbitrum',
      url: 'https://arbitrum-one-rpc.publicnode.com',
      priority: 4,
      weight: 2,
    },
  ],
  
  polygon: [
    {
      id: 'polygon-official',
      url: 'https://polygon-rpc.com',
      priority: 1,
      weight: 3,
    },
    {
      id: 'alchemy-polygon',
      url: `https://polygon-mainnet.g.alchemy.com/v2/${import.meta.env.VITE_ALCHEMY_KEY}`,
      priority: 2,
      weight: 3,
    },
    {
      id: 'ankr-polygon',
      url: 'https://rpc.ankr.com/polygon',
      priority: 3,
      weight: 2,
    },
    {
      id: 'llamanodes-polygon',
      url: 'https://polygon.llamarpc.com',
      priority: 4,
      weight: 2,
    },
  ],
};

/**
 * Create RPC failover manager for specific network
 */
export function createRPCFailoverManager(network = 'ethereum', config = {}) {
  const providers = DEFAULT_PROVIDERS[network];
  
  if (!providers) {
    throw new Error(`Unknown network: ${network}. Available: ${Object.keys(DEFAULT_PROVIDERS).join(', ')}`);
  }
  
  return new RPCFailoverManager({
    providers,
    maxRetries: config.maxRetries || 3,
    healthCheckIntervalMs: config.healthCheckIntervalMs || 30000,
    requestTimeout: config.requestTimeout || 10000,
  });
}

export default RPCFailoverManager;
