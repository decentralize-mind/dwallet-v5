import { CHAINS } from '../data/chains'

/**
 * Map of chain ID to chain key
 * Used for automatic network detection
 */
export const CHAIN_ID_TO_KEY = {
  1: 'ethereum',
  11155111: 'sepolia',
  84532: 'baseSepolia',
  8453: 'base',
  56: 'bnb',
  137: 'polygon',
  42161: 'arbitrum',
  10: 'optimism',
  43114: 'avalanche',
}

/**
 * Convert chain ID (hex or number) to chain key
 * @param {string|number} chainId - Chain ID in hex (0x...) or number format
 * @returns {string|null} Chain key (e.g., 'ethereum', 'sepolia') or null if not found
 */
export function chainIdToKey(chainId) {
  const chainIdNumber = typeof chainId === 'string' 
    ? parseInt(chainId, 16) 
    : chainId
  
  return CHAIN_ID_TO_KEY[chainIdNumber] || null
}

/**
 * Get chain ID in hex format from chain key
 * @param {string} chainKey - Chain key (e.g., 'ethereum', 'sepolia')
 * @returns {string|null} Chain ID in hex format (0x...) or null if not found
 */
export function keyToChainIdHex(chainKey) {
  const chain = CHAINS[chainKey]
  if (!chain || !chain.chainId) return null
  
  return '0x' + chain.chainId.toString(16)
}

/**
 * Get chain ID in number format from chain key
 * @param {string} chainKey - Chain key (e.g., 'ethereum', 'sepolia')
 * @returns {number|null} Chain ID as number or null if not found
 */
export function keyToChainIdNumber(chainKey) {
  const chain = CHAINS[chainKey]
  if (!chain || !chain.chainId) return null
  
  return chain.chainId
}

/**
 * Get chain information from chain ID
 * @param {string|number} chainId - Chain ID in hex or number format
 * @returns {object|null} Chain object or null if not found
 */
export function getChainFromChainId(chainId) {
  const chainKey = chainIdToKey(chainId)
  if (!chainKey) return null
  
  return CHAINS[chainKey] || null
}

/**
 * Detect current network from browser wallet (MetaMask, etc.)
 * @returns {Promise<{chainKey: string, chainId: number}|null>} Detected chain info or null
 */
export async function detectBrowserWalletNetwork() {
  if (!window.ethereum) {
    return null
  }

  try {
    const chainId = await window.ethereum.request({ 
      method: 'eth_chainId' 
    })
    
    const chainKey = chainIdToKey(chainId)
    const chainIdNumber = typeof chainId === 'string' 
      ? parseInt(chainId, 16) 
      : chainId

    if (chainKey) {
      return {
        chainKey,
        chainId: chainIdNumber,
        chain: CHAINS[chainKey],
      }
    }

    return null
  } catch (err) {
    console.error('Failed to detect browser wallet network:', err)
    return null
  }
}
