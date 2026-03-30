/**
 * Environment Configuration
 * Determines current environment and loads appropriate settings
 */

export const ENV = {
  // Current environment: 'development' | 'preproduction' | 'production'
  CURRENT: import.meta.env.VITE_ENVIRONMENT || 'development',
  
  // Network type: 'sepolia' | 'mainnet' | other testnets
  NETWORK: import.meta.env.VITE_NETWORK || 'localhost',
  
  // Feature flags based on environment
  isDevelopment: () => import.meta.env.DEV,
  isPreProduction: () => import.meta.env.VITE_ENVIRONMENT === 'preproduction',
  isProduction: () => import.meta.env.VITE_ENVIRONMENT === 'production',
  
  // Network helpers
  isTestnet: () => {
    const network = import.meta.env.VITE_NETWORK || 'localhost';
    return network === 'sepolia' || network === 'goerli' || network === 'localhost';
  },
  
  isMainnet: () => import.meta.env.VITE_NETWORK === 'mainnet',
};

// Environment-specific configurations
export const CONFIG = {
  // API endpoints
  RPC: {
    URL: import.meta.env.VITE_INFURA_KEY 
      ? `https://${ENV.NETWORK}.infura.io/v3/${import.meta.env.VITE_INFURA_KEY}`
      : '',
  },
  
  // Explorer URLs based on environment
  EXPLORER: ENV.isMainnet() 
    ? 'https://etherscan.io' 
    : 'https://sepolia.etherscan.io',
  
  // Contract addresses (will be populated after deployment)
  CONTRACTS: {
    DWT_TOKEN: import.meta.env.VITE_DWT_TOKEN_ADDRESS || '',
    STAKING_POOL: import.meta.env.VITE_STAKING_POOL_ADDRESS || '',
    // Add other contract addresses as needed
  },
  
  // Environment-specific features
  FEATURES: {
    // Enable stricter validation in pre-production
    STRICT_VALIDATION: ENV.isPreProduction() || ENV.isProduction(),
    
    // Show debug info only in development
    DEBUG_MODE: ENV.isDevelopment(),
    
    // Disable certain features in pre-production for testing
    DISABLE_MAINNET_TX: ENV.isPreProduction(),
  },
  
  // Warning banners for non-production environments
  BANNERS: {
    showTestnetWarning: ENV.isTestnet() && !ENV.isDevelopment(),
    environment: ENV.CURRENT,
    network: ENV.NETWORK,
  },
};

// Security warnings
if (CONFIG.BANNERS.showTestnetWarning) {
  console.warn(
    `⚠️ ${ENV.CURRENT.toUpperCase()} MODE - Connected to ${ENV.NETWORK.toUpperCase()} testnet. ` +
    'No real value should be at risk.'
  );
}

if (ENV.isProduction()) {
  console.info('🔒 PRODUCTION MODE - All transactions are real and irreversible.');
}

export default ENV;
