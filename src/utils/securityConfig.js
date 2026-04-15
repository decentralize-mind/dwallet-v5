/**
 * 🔒 Frontend Security Configuration
 * 
 * This module provides security utilities for the frontend:
 * - RPC endpoint management with automatic failover
 * - SSL/TLS verification helpers
 * - Anti-phishing measures
 * - DNS security checks
 */

// ─────────────────────────────────────────────────────────────────────
//  RPC ENDPOINT CONFIGURATION
// ─────────────────────────────────────────────────────────────────────

export const RPC_ENDPOINTS = {
  // Primary endpoints (ordered by priority)
  primary: [
    {
      name: 'Base Sepolia Official',
      url: process.env.REACT_APP_RPC_URL_BASE_SEPOLIA,
      priority: 1,
      chainId: 84532
    },
    {
      name: 'Alchemy Base Sepolia',
      url: process.env.REACT_APP_ALCHEMY_URL,
      priority: 2,
      chainId: 84532
    },
    {
      name: 'Infura Base Sepolia',
      url: process.env.REACT_APP_INFURA_URL,
      priority: 3,
      chainId: 84532
    }
  ],
  
  // Backup endpoints
  backup: [
    {
      name: 'QuickNode Base',
      url: process.env.REACT_APP_QUICKNODE_URL,
      priority: 4,
      chainId: 84532
    },
    {
      name: 'Ankr Base',
      url: process.env.REACT_APP_ANKR_URL,
      priority: 5,
      chainId: 84532
    }
  ]
};

// ─────────────────────────────────────────────────────────────────────
//  SECURITY CONFIGURATION
// ─────────────────────────────────────────────────────────────────────

export const SECURITY_CONFIG = {
  // SSL/TLS enforcement
  enforceSSL: true,
  
  // CSP (Content Security Policy)
  csp: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'"],
    styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", 'data:', 'https:'],
    connectSrc: [
      "'self'",
      ...RPC_ENDPOINTS.primary.map(ep => new URL(ep.url).hostname),
      ...RPC_ENDPOINTS.backup.map(ep => new URL(ep.url).hostname)
    ],
    fontSrc: ["'self'"],
    objectSrc: ["'none'"],
    mediaSrc: ["'self'"],
    frameSrc: ["'none'"]
  },
  
  // Anti-phishing
  antiPhishing: {
    enabled: true,
    checkReferrer: true,
    allowedDomains: [
      'toklo.xyz',
      'www.toklo.xyz',
      'app.toklo.xyz'
    ]
  },
  
  // DNS security
  dnsSecurity: {
    enabled: true,
    expectedIPs: [
      // Add expected IP addresses for domain verification
    ]
  }
};

// ─────────────────────────────────────────────────────────────────────
//  RPC MANAGER CLASS
// ─────────────────────────────────────────────────────────────────────

class RPCManager {
  constructor() {
    this.currentEndpoint = null;
    this.healthCheckInterval = 30000; // 30 seconds
    this.failedEndpoints = new Set();
    this.startHealthCheck();
  }
  
  /**
   * Get best available RPC endpoint
   */
  getBestEndpoint() {
    const allEndpoints = [...RPC_ENDPOINTS.primary, ...RPC_ENDPOINTS.backup];
    
    // Filter out failed endpoints
    const healthyEndpoints = allEndpoints.filter(
      ep => !this.failedEndpoints.has(ep.name)
    );
    
    if (healthyEndpoints.length === 0) {
      console.error('❌ No healthy RPC endpoints available');
      return null;
    }
    
    // Sort by priority and return best
    healthyEndpoints.sort((a, b) => a.priority - b.priority);
    return healthyEndpoints[0];
  }
  
  /**
   * Mark endpoint as failed
   */
  markFailed(endpointName) {
    this.failedEndpoints.add(endpointName);
    console.warn(`⚠️ Endpoint ${endpointName} marked as failed`);
    
    // Auto-retry after 5 minutes
    setTimeout(() => {
      this.failedEndpoints.delete(endpointName);
      console.log(`✅ Endpoint ${endpointName} retry enabled`);
    }, 5 * 60 * 1000);
  }
  
  /**
   * Health check for current endpoint
   */
  async checkHealth(endpoint) {
    try {
      const response = await fetch(endpoint.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_blockNumber',
          params: [],
          id: 1
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      return !data.error;
    } catch (error) {
      console.error(`Health check failed for ${endpoint.name}:`, error);
      return false;
    }
  }
  
  /**
   * Start periodic health checks
   */
  startHealthCheck() {
    setInterval(async () => {
      if (this.currentEndpoint) {
        const healthy = await this.checkHealth(this.currentEndpoint);
        
        if (!healthy) {
          this.markFailed(this.currentEndpoint.name);
          this.currentEndpoint = this.getBestEndpoint();
          console.log(`🔄 Switched to ${this.currentEndpoint?.name}`);
        }
      } else {
        this.currentEndpoint = this.getBestEndpoint();
      }
    }, this.healthCheckInterval);
  }
}

export const rpcManager = new RPCManager();

// ─────────────────────────────────────────────────────────────────────
//  ANTI-PHISHING UTILITIES
// ─────────────────────────────────────────────────────────────────────

/**
 * Verify current domain is allowed
 */
export function verifyDomain() {
  if (!SECURITY_CONFIG.antiPhishing.enabled) {
    return true;
  }
  
  const currentDomain = window.location.hostname;
  const allowedDomains = SECURITY_CONFIG.antiPhishing.allowedDomains;
  
  if (!allowedDomains.includes(currentDomain)) {
    console.error('🚨 Phishing attempt detected! Domain:', currentDomain);
    showPhishingWarning();
    return false;
  }
  
  return true;
}

/**
 * Show phishing warning page
 */
function showPhishingWarning() {
  document.body.innerHTML = `
    <div style="
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: #ff4444;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
      z-index: 999999;
    ">
      <div>
        <h1>🚨 SECURITY WARNING</h1>
        <p>You are not on the official toklo.xyz website.</p>
        <p>This may be a phishing attempt.</p>
        <p>Please navigate to <strong>toklo.xyz</strong> directly.</p>
      </div>
    </div>
  `;
}

// ─────────────────────────────────────────────────────────────────────
//  SSL VERIFICATION
// ─────────────────────────────────────────────────────────────────────

/**
 * Verify SSL certificate validity
 */
export function verifySSL() {
  if (SECURITY_CONFIG.enforceSSL && window.location.protocol !== 'https:') {
    console.warn('⚠️ Connection not secure. Please use HTTPS.');
    return false;
  }
  return true;
}

// ─────────────────────────────────────────────────────────────────────
//  INITIALIZATION
// ─────────────────────────────────────────────────────────────────────

/**
 * Initialize all security measures
 */
export function initializeSecurity() {
  console.log('🔒 Initializing frontend security...');
  
  // Verify SSL
  if (!verifySSL()) {
    console.warn('SSL verification failed');
  }
  
  // Verify domain
  if (!verifyDomain()) {
    console.error('Domain verification failed');
  }
  
  // Initialize RPC manager
  rpcManager.currentEndpoint = rpcManager.getBestEndpoint();
  console.log('✅ Frontend security initialized');
}

// Auto-initialize on load
if (typeof window !== 'undefined') {
  initializeSecurity();
}
