/**
 * 🛡️ Supply Chain Admin Frontend Security
 * 
 * Client-side security measures:
 * - Secure authentication flow
 * - Session management
 * - Transaction signing
 * - XSS prevention
 * - Secure storage
 */

import { ethers } from 'ethers';

// ─────────────────────────────────────────────────────────────────────
//  SECURE AUTHENTICATION
// ─────────────────────────────────────────────────────────────────────

export class SupplyChainAuth {
  constructor() {
    this.sessionData = null;
    this.authTimeout = null;
  }

  /**
   * Authenticate wallet with signature
   */
  async authenticate() {
    try {
      if (!window.ethereum) {
        throw new Error('MetaMask not installed');
      }

      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });

      const address = accounts[0];
      
      // Get current network
      const chainId = await window.ethereum.request({
        method: 'eth_chainId'
      });

      const network = this.getNetworkName(chainId);
      
      // Create authentication message
      const timestamp = Date.now();
      const message = `Supply Chain Admin Authentication

Address: ${address}
Timestamp: ${timestamp}
Network: ${network}

By signing this message, you are authenticating as a supply chain administrator.

Nonce: ${this.generateNonce()}`;

      // Request signature
      const signature = await window.ethereum.request({
        method: 'personal_sign',
        params: [ethers.hexlify(ethers.toUtf8Bytes(message)), address]
      });

      // Send to backend for verification
      const response = await fetch('/api/supply-chain/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          address,
          signature,
          message,
          timestamp,
          network
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Authentication failed');
      }

      // Store session securely (in memory, not localStorage)
      const sessionId = response.headers.get('X-Session-ID');
      const sessionExpires = response.headers.get('X-Session-Expires');

      this.sessionData = {
        address,
        sessionId,
        network,
        expiresAt: new Date(sessionExpires).getTime()
      };

      // Setup session timeout
      this.setupSessionTimeout();

      // Setup network change listener
      this.setupNetworkChangeListener();

      return this.sessionData;

    } catch (error) {
      console.error('Authentication failed:', error);
      throw error;
    }
  }

  /**
   * Verify session is still valid
   */
  isSessionValid() {
    if (!this.sessionData) {
      return false;
    }

    // Check expiration
    if (Date.now() > this.sessionData.expiresAt) {
      this.clearSession();
      return false;
    }

    return true;
  }

  /**
   * Get session data
   */
  getSession() {
    if (!this.isSessionValid()) {
      return null;
    }

    return this.sessionData;
  }

  /**
   * Clear session
   */
  clearSession() {
    this.sessionData = null;
    
    if (this.authTimeout) {
      clearTimeout(this.authTimeout);
      this.authTimeout = null;
    }
  }

  /**
   * Setup session timeout
   */
  setupSessionTimeout() {
    if (this.authTimeout) {
      clearTimeout(this.authTimeout);
    }

    const timeUntilExpiry = this.sessionData.expiresAt - Date.now();
    
    this.authTimeout = setTimeout(() => {
      console.log('Session expired');
      this.clearSession();
      
      // Redirect to login
      window.location.reload();
    }, timeUntilExpiry);
  }

  /**
   * Setup network change listener
   */
  setupNetworkChangeListener() {
    if (window.ethereum) {
      window.ethereum.on('chainChanged', (chainId) => {
        const network = this.getNetworkName(chainId);
        
        if (network !== this.sessionData?.network) {
          console.log('Network changed, clearing session');
          this.clearSession();
          window.location.reload();
        }
      });

      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length === 0 || accounts[0] !== this.sessionData?.address) {
          console.log('Account changed, clearing session');
          this.clearSession();
          window.location.reload();
        }
      });
    }
  }

  /**
   * Get network name from chain ID
   */
  getNetworkName(chainId) {
    const networks = {
      '0x14a33': 'base-sepolia',
      '0x2105': 'base-mainnet'
    };

    return networks[chainId] || 'unknown';
  }

  /**
   * Generate cryptographic nonce
   */
  generateNonce() {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }
}

// ─────────────────────────────────────────────────────────────────────
//  SECURE API CLIENT
// ─────────────────────────────────────────────────────────────────────

export class SecureAPIClient {
  constructor(auth) {
    this.auth = auth;
    this.baseURL = '/api/supply-chain';
  }

  /**
   * Make authenticated API request
   */
  async request(endpoint, options = {}) {
    const session = this.auth.getSession();
    
    if (!session) {
      throw new Error('Not authenticated');
    }

    const headers = {
      'Content-Type': 'application/json',
      'X-Session-ID': session.sessionId,
      ...options.headers
    };

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        ...options,
        headers
      });

      // Handle session expiration
      if (response.status === 401) {
        this.auth.clearSession();
        window.location.reload();
        throw new Error('Session expired');
      }

      // Handle rate limiting
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After') || 60;
        throw new Error(`Rate limited. Try again in ${retryAfter} seconds`);
      }

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Request failed');
      }

      return await response.json();

    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // ───────────────────────────────────────────────────────────────────
  //  SUPPLY CHAIN OPERATIONS
  // ───────────────────────────────────────────────────────────────────

  /**
   * Mint new invoice
   */
  async mintInvoice(invoiceData) {
    return this.request('/invoices/mint', {
      method: 'POST',
      body: JSON.stringify({
        ...invoiceData,
        contractAddress: '0x213AC061FEe90Daed5aa345F56B9331501a89c38',
        functionName: 'mintInvoice'
      })
    });
  }

  /**
   * Register entity
   */
  async registerEntity(entityData) {
    return this.request('/entities/register', {
      method: 'POST',
      body: JSON.stringify({
        ...entityData,
        contractAddress: '0xaaE1D2a14FD9DDA015db9494550769FEeA3AD3a6',
        functionName: 'registerEntity'
      })
    });
  }

  /**
   * Create escrow
   */
  async createEscrow(escrowData) {
    return this.request('/escrows/create', {
      method: 'POST',
      body: JSON.stringify({
        ...escrowData,
        contractAddress: '0x653e5B9884d2678CE5eCe6cc85Ea21Ba04c05378',
        functionName: 'createEscrow'
      })
    });
  }

  /**
   * Setup milestone distribution
   */
  async setupMilestone(milestoneData) {
    return this.request('/milestones/setup', {
      method: 'POST',
      body: JSON.stringify({
        ...milestoneData,
        contractAddress: '0xe7Be58eE05BD7a8DC77CFD2A01b9798f6b3BDeF5',
        functionName: 'createDistribution'
      })
    });
  }

  /**
   * Grant role
   */
  async grantRole(roleData) {
    return this.request('/roles/grant', {
      method: 'POST',
      body: JSON.stringify({
        ...roleData,
        highValueConfirmed: true // Role changes are critical
      })
    });
  }

  /**
   * Get dashboard stats
   */
  async getStats() {
    return this.request('/stats', {
      method: 'GET'
    });
  }

  /**
   * Get invoices
   */
  async getInvoices(filters = {}) {
    const params = new URLSearchParams(filters);
    return this.request(`/invoices?${params}`, {
      method: 'GET'
    });
  }

  /**
   * Get entities
   */
  async getEntities(filters = {}) {
    const params = new URLSearchParams(filters);
    return this.request(`/entities?${params}`, {
      method: 'GET'
    });
  }
}

// ─────────────────────────────────────────────────────────────────────
//  TRANSACTION SIGNER
// ─────────────────────────────────────────────────────────────────────

export class TransactionSigner {
  constructor() {
    this.pendingTransactions = new Map();
  }

  /**
   * Sign and send transaction
   */
  async signTransaction(contract, methodName, args, options = {}) {
    try {
      if (!window.ethereum) {
        throw new Error('MetaMask not installed');
      }

      // Get signer
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      // Estimate gas
      const gasEstimate = await contract[methodName].estimateGas(...args);
      const gasLimit = (gasEstimate * 120n) / 100n; // Add 20% buffer

      // Prepare transaction
      const tx = {
        to: await contract.getAddress(),
        data: contract.interface.encodeFunctionData(methodName, args),
        gasLimit,
        ...options
      };

      // Send transaction
      const txResponse = await signer.sendTransaction(tx);
      
      // Track transaction
      const txId = this.generateTxId();
      this.pendingTransactions.set(txId, {
        hash: txResponse.hash,
        startTime: Date.now(),
        status: 'pending'
      });

      // Wait for confirmation
      const receipt = await txResponse.wait();
      
      // Update status
      this.pendingTransactions.set(txId, {
        hash: txResponse.hash,
        startTime: Date.now(),
        status: 'confirmed',
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString()
      });

      return {
        hash: txResponse.hash,
        receipt,
        txId
      };

    } catch (error) {
      console.error('Transaction failed:', error);
      
      // Handle specific errors
      if (error.code === 4001) {
        throw new Error('Transaction rejected by user');
      }
      
      if (error.code === -32603) {
        throw new Error('Transaction execution failed');
      }
      
      throw error;
    }
  }

  /**
   * Generate transaction ID
   */
  generateTxId() {
    return `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get transaction status
   */
  getTransactionStatus(txId) {
    return this.pendingTransactions.get(txId);
  }
}

// ─────────────────────────────────────────────────────────────────────
//  XSS PREVENTION
// ─────────────────────────────────────────────────────────────────────

export const XSSProtection = {
  /**
   * Sanitize string to prevent XSS
   */
  sanitize(str) {
    if (typeof str !== 'string') return str;

    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  },

  /**
   * Sanitize object recursively
   */
  sanitizeObject(obj) {
    if (typeof obj !== 'object' || obj === null) {
      return this.sanitize(obj);
    }

    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = this.sanitizeObject(value);
    }

    return sanitized;
  },

  /**
   * Validate Ethereum address
   */
  isValidAddress(address) {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  },

  /**
   * Validate URI (IPFS, HTTP, etc.)
   */
  isValidURI(uri) {
    try {
      const url = new URL(uri);
      return ['http:', 'https:', 'ipfs:'].includes(url.protocol);
    } catch {
      return false;
    }
  }
};

// ─────────────────────────────────────────────────────────────────────
//  SECURE STORAGE (In-memory only, no localStorage for sensitive data)
// ─────────────────────────────────────────────────────────────────────

export class SecureStorage {
  constructor() {
    this.data = new Map();
  }

  set(key, value) {
    // Only store in memory
    this.data.set(key, value);
  }

  get(key) {
    return this.data.get(key);
  }

  delete(key) {
    this.data.delete(key);
  }

  clear() {
    this.data.clear();
  }

  /**
   * NEVER store sensitive data in localStorage
   * This method is intentionally not implemented
   */
  storeInLocalStorage() {
    throw new Error('Sensitive data must NOT be stored in localStorage');
  }
}

// ─────────────────────────────────────────────────────────────────────
//  EXPORT SINGLETONS
// ─────────────────────────────────────────────────────────────────────

export const auth = new SupplyChainAuth();
export const apiClient = new SecureAPIClient(auth);
export const txSigner = new TransactionSigner();
export const secureStorage = new SecureStorage();

// ─────────────────────────────────────────────────────────────────────
//  USAGE EXAMPLE
// ─────────────────────────────────────────────────────────────────────

/*
// In your SupplyChainAdmin component:

import { auth, apiClient, txSigner, XSSProtection } from '../utils/supplyChainSecurity';

// Authenticate on mount
useEffect(() => {
  const initAuth = async () => {
    try {
      await auth.authenticate();
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Auth failed:', error);
    }
  };
  
  initAuth();
}, []);

// Mint invoice with security
const handleMintInvoice = async (formData) => {
  try {
    // Validate input
    if (!XSSProtection.isValidAddress(formData.supplier)) {
      throw new Error('Invalid supplier address');
    }
    
    // Sanitize input
    const sanitizedData = XSSProtection.sanitizeObject(formData);
    
    // Send via secure API
    const result = await apiClient.mintInvoice(sanitizedData);
    
    console.log('Invoice minted:', result);
    
  } catch (error) {
    console.error('Failed to mint invoice:', error);
    alert(error.message);
  }
};
*/
