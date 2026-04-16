/**
 * IPFS Gateway Configuration
 * 
 * Centralized configuration for all IPFS gateways used in the dWallet application.
 * Provides gateway URLs, priorities, and metadata for failover management.
 * 
 * Gateway Status (as of 2026-04-16):
 * - IPFS.io: ✅ Working (Primary)
 * - Dweb.link: ✅ Working (Backup)
 * - Pinata.cloud: ⚠️ Requires API key for gateway access
 * - Cloudflare-ipfs.com: ❌ DNS resolution issues
 */

// Current IPFS Content Hash (CID) for deployed frontend
export const CURRENT_IPFS_CID = 'bafybeicmhmthzgn6r3nvwtvd3mjt3vzwwzmyyujmjcn4jvczlwli7zrc4m';

/**
 * IPFS Gateway configurations
 * 
 * Priority levels:
 * 1 = Primary (fastest, most reliable)
 * 2 = Secondary (good backup)
 * 3 = Tertiary (fallback option)
 * 4 = Last resort (may have issues)
 */
export const IPFS_GATEWAYS = [
  {
    id: 'ipfs-io',
    name: 'IPFS.io Official Gateway',
    url: 'https://ipfs.io',
    type: 'path', // path-based: https://ipfs.io/ipfs/{cid}
    priority: 1,
    weight: 10,
    status: 'active',
    description: 'Official IPFS public gateway, most reliable',
    supportsSubdomain: false,
  },
  {
    id: 'dweb-link',
    name: 'Dweb.link Gateway',
    url: 'https://dweb.link',
    type: 'path', // path-based: https://dweb.link/ipfs/{cid}
    priority: 2,
    weight: 8,
    status: 'active',
    description: 'Maintained by Protocol Labs, excellent fallback',
    supportsSubdomain: true,
    subdomainTemplate: 'https://{cid}.ipfs.dweb.link',
  },
  {
    id: 'pinata-gateway',
    name: 'Pinata Gateway',
    url: 'https://gateway.pinata.cloud',
    type: 'path', // path-based: https://gateway.pinata.cloud/ipfs/{cid}
    priority: 3,
    weight: 5,
    status: 'limited', // Requires API key for some features
    description: 'Pinata public gateway, may require authentication',
    supportsSubdomain: true,
    subdomainTemplate: 'https://{cid}.ipfs.pinata.cloud',
    note: 'Subdomain gateway may have DNS propagation delays',
  },
  {
    id: 'cloudflare-ipfs',
    name: 'Cloudflare IPFS Gateway',
    url: 'https://cloudflare-ipfs.com',
    type: 'path', // path-based: https://cloudflare-ipfs.com/ipfs/{cid}
    priority: 4,
    weight: 3,
    status: 'degraded', // DNS resolution issues detected
    description: 'Cloudflare IPFS gateway, fast when cached',
    supportsSubdomain: false,
    note: 'Experiencing DNS issues, use as last resort',
  },
  {
    id: 'w3s-link',
    name: 'Web3.storage Gateway',
    url: 'https://w3s.link',
    type: 'path', // path-based: https://w3s.link/ipfs/{cid}
    priority: 2,
    weight: 7,
    status: 'active',
    description: 'Web3.storage gateway, reliable alternative',
    supportsSubdomain: true,
    subdomainTemplate: 'https://{cid}.ipfs.w3s.link',
  },
];

/**
 * Get gateway URL for a specific CID
 * @param {string} cid - IPFS Content ID
 * @param {string} gatewayId - Gateway ID (optional, uses primary if not specified)
 * @returns {string} Full URL to access the content
 */
export function getIPFSUrl(cid, gatewayId = null) {
  const gateway = gatewayId 
    ? IPFS_GATEWAYS.find(g => g.id === gatewayId)
    : IPFS_GATEWAYS.find(g => g.priority === 1);

  if (!gateway) {
    throw new Error(`Gateway not found: ${gatewayId}`);
  }

  if (gateway.type === 'path') {
    return `${gateway.url}/ipfs/${cid}`;
  }

  return cid; // Fallback
}

/**
 * Get all gateway URLs for a specific CID
 * @param {string} cid - IPFS Content ID
 * @returns {Array<{id: string, name: string, url: string, priority: number}>}
 */
export function getAllGatewayUrls(cid) {
  return IPFS_GATEWAYS
    .filter(gateway => gateway.status === 'active' || gateway.status === 'limited')
    .map(gateway => ({
      id: gateway.id,
      name: gateway.name,
      url: getIPFSUrl(cid, gateway.id),
      priority: gateway.priority,
      status: gateway.status,
    }))
    .sort((a, b) => a.priority - b.priority);
}

/**
 * Get active gateways only (exclude degraded/inactive)
 * @returns {Array}
 */
export function getActiveGateways() {
  return IPFS_GATEWAYS.filter(gateway => 
    gateway.status === 'active' || gateway.status === 'limited'
  );
}

/**
 * Default IPFS CID for the application
 */
export const DEFAULT_CID = CURRENT_IPFS_CID;

/**
 * Environment variable override for IPFS CID
 * Allows testing with different deployments
 */
export const CONFIGURED_CID = import.meta.env.VITE_IPFS_CID || DEFAULT_CID;

/**
 * Gateway timeout settings (in milliseconds)
 */
export const GATEWAY_TIMEOUT = 10000; // 10 seconds
export const GATEWAY_HEALTH_CHECK_INTERVAL = 60000; // 1 minute

/**
 * IPNS configuration (for mutable references)
 */
export const IPNS_CONFIG = {
  enabled: false, // Set to true when IPNS is configured
  name: null, // IPNS name (e.g., k51qzi5uqu5...)
  getUrl: function() {
    if (!this.enabled || !this.name) {
      return null;
    }
    return `https://ipfs.io/ipns/${this.name}`;
  }
};

/**
 * ENS domain configuration for IPFS
 */
export const ENS_CONFIG = {
  domain: null, // Set your ENS domain (e.g., 'dwallet.eth')
  gateway: 'https://dwallet.eth.limo', // ENS gateway
  getUrl: function() {
    if (!this.domain) {
      return null;
    }
    return this.gateway;
  }
};
