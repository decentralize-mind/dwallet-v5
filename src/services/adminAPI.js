/**
 * 🔐 Secure Admin API Client
 * 
 * This service handles all admin API communications with:
 * - JWT token management
 * - CSRF token handling
 * - Secure request/response interception
 * - Error handling
 * - Token refresh logic
 */

// Use environment variable if set, otherwise use relative path for Vite proxy
// This avoids CORS issues in Microsoft Edge during development
const API_BASE_URL = import.meta.env.VITE_ADMIN_API_URL || (import.meta.env.DEV ? '' : 'http://localhost:3001');

class AdminAPIClient {
  constructor() {
    this.token = localStorage.getItem('admin_token');
    this.csrfToken = null;
    this.tokenExpiry = null;
  }

  /**
   * Get stored JWT token
   */
  getToken() {
    return this.token;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    if (!this.token) return false;
    
    // Check token expiry
    if (this.tokenExpiry && Date.now() > this.tokenExpiry) {
      this.logout();
      return false;
    }
    
    return true;
  }

  /**
   * Generic POST request with authentication
   */
  async post(endpoint, data) {
    await this.fetchCSRFToken();
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`,
        'X-CSRF-Token': this.csrfToken || ''
      },
      credentials: 'include',
      body: JSON.stringify(data)
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Request failed');
    }

    return result;
  }

  /**
   * Login with admin key
   */
  async loginWithKey(adminKey, twoFactorToken = null) {
    try {
      // Fetch CSRF token first
      await this.fetchCSRFToken();

      const response = await fetch(`${API_BASE_URL}/api/admin/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': this.csrfToken || ''
        },
        credentials: 'include',
        body: JSON.stringify({
          type: 'key',
          credentials: { adminKey },
          twoFactorToken: twoFactorToken || undefined
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      // Store token
      this.token = data.token;
      localStorage.setItem('admin_token', data.token);
      
      // Set expiry (4 hours from now)
      this.tokenExpiry = Date.now() + (4 * 60 * 60 * 1000);

      return data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  /**
   * Login with wallet signature
   */
  async loginWithWallet(signer, twoFactorToken = null) {
    try {
      const address = await signer.getAddress();
      
      // Create message with timestamp (prevent replay attacks)
      const message = JSON.stringify({
        action: 'admin_login',
        address,
        timestamp: Date.now()
      });

      // Sign message
      const signature = await signer.signMessage(message);

      // Fetch CSRF token first
      await this.fetchCSRFToken();

      const response = await fetch(`${API_BASE_URL}/api/admin/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': this.csrfToken || ''
        },
        credentials: 'include',
        body: JSON.stringify({
          type: 'wallet',
          credentials: { address, signature, message },
          twoFactorToken: twoFactorToken || undefined
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Wallet login failed');
      }

      // Store token
      this.token = data.token;
      localStorage.setItem('admin_token', data.token);
      
      // Set expiry (4 hours from now)
      this.tokenExpiry = Date.now() + (4 * 60 * 60 * 1000);

      return data;
    } catch (error) {
      console.error('Wallet login error:', error);
      throw error;
    }
  }

  /**
   * Fetch CSRF token from server
   */
  async fetchCSRFToken() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/auth/csrf-token`, {
        credentials: 'include'
      });

      const data = await response.json();
      this.csrfToken = data.csrfToken;
      
      return this.csrfToken;
    } catch (error) {
      console.error('Failed to fetch CSRF token:', error);
      return null;
    }
  }

  /**
   * Logout
   */
  logout() {
    this.token = null;
    this.csrfToken = null;
    this.tokenExpiry = null;
    localStorage.removeItem('admin_token');
  }

  /**
   * Make authenticated API request
   */
  async request(endpoint, options = {}) {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.token}`,
      ...options.headers
    };

    // Add CSRF token for state-changing requests
    if (['POST', 'PUT', 'DELETE'].includes(options.method)) {
      if (this.csrfToken) {
        headers['X-CSRF-Token'] = this.csrfToken;
      }
    }

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
        credentials: 'include'
      });

      // Handle token expiry
      if (response.status === 401) {
        this.logout();
        throw new Error('Session expired. Please login again.');
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Request failed');
      }

      return data;
    } catch (error) {
      console.error(`API Error (${endpoint}):`, error);
      throw error;
    }
  }

  /**
   * GET request
   */
  async get(endpoint, options = {}) {
    let url = `${API_BASE_URL}${endpoint}`
      
    // Add query parameters if provided
    if (options.params) {
      const searchParams = new URLSearchParams()
      Object.entries(options.params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, value)
        }
      })
      const queryString = searchParams.toString()
      if (queryString) {
        url += `?${queryString}`
      }
    }
      
    return this.request(url, { method: 'GET' })
  }

  /**
   * POST request
   */
  async post(endpoint, data) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  /**
   * PUT request
   */
  async put(endpoint, data) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  /**
   * DELETE request
   */
  async delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }

  // ─────────────────────────────────────────────────────────────────────
  //  ADMIN API METHODS
  // ─────────────────────────────────────────────────────────────────────

  /**
   * Get system statistics
   */
  async getStats() {
    return this.get('/api/admin/stats');
  }

  /**
   * Get audit logs
   */
  async getAuditLogs(limit = 100, offset = 0) {
    return this.get(`/api/admin/audit-logs?limit=${limit}&offset=${offset}`);
  }

  /**
   * Suspend user
   */
  async suspendUser(userId, reason) {
    return this.post(`/api/admin/users/${userId}/suspend`, { reason });
  }

  /**
   * Activate user
   */
  async activateUser(userId, reason) {
    return this.post(`/api/admin/users/${userId}/activate`, { reason });
  }

  /**
   * Pause contract
   */
  async pauseContract(contractId, reason) {
    return this.post(`/api/admin/contracts/${contractId}/pause`, { reason });
  }

  /**
   * Unpause contract
   */
  async unpauseContract(contractId, reason) {
    return this.post(`/api/admin/contracts/${contractId}/unpause`, { reason });
  }

  /**
   * Mint tokens
   */
  async mintTokens(address, amount) {
    return this.post('/api/admin/tokens/mint', { address, amount });
  }

  /**
   * Burn tokens
   */
  async burnTokens(amount, reason) {
    return this.post('/api/admin/tokens/burn', { amount, reason });
  }

  /**
   * Trigger circuit breaker
   */
  async triggerCircuitBreaker(reason) {
    return this.post('/api/admin/security/circuit-breaker/trigger', { reason });
  }

  /**
   * Reset circuit breaker
   */
  async resetCircuitBreaker(reason) {
    return this.post('/api/admin/security/circuit-breaker/reset', { reason });
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/health`);
      return await response.json();
    } catch (error) {
      console.error('Health check failed:', error);
      return { status: 'unreachable' };
    }
  }

  /**
   * Get detailed system health status
   */
  async getSystemHealth() {
    return this.get('/api/admin/system-health');
  }

  /**
   * Get DeFi statistics
   */
  async getDeFiStats() {
    return this.get('/api/admin/defi/stats');
  }

  /**
   * Register a new user (public endpoint - no auth required)
   */
  async registerUser(walletAddress, referralCode = null) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/users/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          walletAddress,
          referralCode
        })
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('User registration failed:', data.error);
        return { success: false, error: data.error };
      }

      return data;
    } catch (error) {
      console.error('User registration error:', error);
      return { success: false, error: error.message };
    }
  }
}

// Export singleton instance
export const adminAPI = new AdminAPIClient();
export default adminAPI;
