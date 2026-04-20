/**
 * ✅ Network Matching Validation
 * 
 * Features:
 * - Detects recipient's likely network from address history
 * - Validates sender and receiver are on compatible networks
 * - Warns about cross-chain transfers
 * - Suggests bridges for cross-chain transfers
 * - Prevents accidental fund loss
 */

// ─────────────────────────────────────────────────────────────────────
//  CHAIN CONFIGURATION
// ─────────────────────────────────────────────────────────────────────

export const CHAIN_CONFIG = {
  ethereum: {
    name: 'Ethereum Mainnet',
    chainId: 1,
    type: 'mainnet',
    nativeToken: 'ETH',
    explorer: 'https://etherscan.io',
    color: '#627EEA',
    compatibleChains: ['arbitrum', 'optimism', 'base'], // L2s
  },
  sepolia: {
    name: 'Ethereum Sepolia',
    chainId: 11155111,
    type: 'testnet',
    nativeToken: 'ETH',
    explorer: 'https://sepolia.etherscan.io',
    color: '#6366f1',
    compatibleChains: ['baseSepolia'],
  },
  base: {
    name: 'Base Mainnet',
    chainId: 8453,
    type: 'mainnet',
    nativeToken: 'ETH',
    explorer: 'https://basescan.org',
    color: '#0052FF',
    compatibleChains: ['ethereum'], // L2 of Ethereum
  },
  baseSepolia: {
    name: 'Base Sepolia',
    chainId: 84532,
    type: 'testnet',
    nativeToken: 'ETH',
    explorer: 'https://sepolia.basescan.org',
    color: '#0052FF',
    compatibleChains: ['sepolia'],
  },
  bnb: {
    name: 'BNB Chain',
    chainId: 56,
    type: 'mainnet',
    nativeToken: 'BNB',
    explorer: 'https://bscscan.com',
    color: '#F0B90B',
    compatibleChains: [],
  },
  polygon: {
    name: 'Polygon',
    chainId: 137,
    type: 'mainnet',
    nativeToken: 'MATIC',
    explorer: 'https://polygonscan.com',
    color: '#8247E5',
    compatibleChains: ['ethereum'],
  },
  arbitrum: {
    name: 'Arbitrum One',
    chainId: 42161,
    type: 'mainnet',
    nativeToken: 'ETH',
    explorer: 'https://arbiscan.io',
    color: '#12AAFF',
    compatibleChains: ['ethereum'],
  },
}

// ─────────────────────────────────────────────────────────────────────
//  NETWORK VALIDATION
// ─────────────────────────────────────────────────────────────────────

/**
 * Check if two chains are the same network
 */
export function isSameNetwork(chain1, chain2) {
  return chain1 === chain2
}

/**
 * Check if two chains are compatible (e.g., L1 and its L2)
 */
export function isCompatibleNetwork(chain1, chain2) {
  const config1 = CHAIN_CONFIG[chain1]
  if (!config1) return false
  
  return config1.compatibleChains.includes(chain2)
}

/**
 * Get network mismatch severity level
 */
export function getMismatchSeverity(fromChain, toChain) {
  // Same network - no issue
  if (isSameNetwork(fromChain, toChain)) {
    return {
      level: 'safe',
      message: 'Same network - direct transfer',
      color: '#10b981', // green
      icon: '✓',
      requiresConfirmation: false,
    }
  }
  
  // Compatible networks (L1 <-> L2)
  if (isCompatibleNetwork(fromChain, toChain)) {
    return {
      level: 'compatible',
      message: 'Different but compatible networks - may require bridge',
      color: '#f59e0b', // amber
      icon: '⚠',
      requiresConfirmation: true,
    }
  }
  
  // Completely different networks
  const fromConfig = CHAIN_CONFIG[fromChain]
  const toConfig = CHAIN_CONFIG[toChain]
  
  // Check if one is testnet and other is mainnet
  if (fromConfig?.type !== toConfig?.type) {
    return {
      level: 'critical',
      message: `Cannot transfer between ${fromConfig?.type} and ${toConfig?.type}`,
      color: '#ef4444', // red
      icon: '✕',
      requiresConfirmation: false,
      blockTransfer: true,
    }
  }
  
  // Different mainnets
  return {
    level: 'warning',
    message: 'Different networks - funds may be lost if sent directly',
    color: '#ef4444', // red
    icon: '⚠',
    requiresConfirmation: true,
    blockTransfer: false,
  }
}

/**
 * Validate network matching before sending
 */
export function validateNetworkMatch({
  fromChain,
  toChain,
  recipientAddress,
  transactionHistory = [],
}) {
  const errors = []
  const warnings = []
  const suggestions = []
  
  // Get severity
  const severity = getMismatchSeverity(fromChain, toChain)
  
  // Check transaction history for this address
  const previousTransactions = transactionHistory.filter(
    tx => tx.to === recipientAddress
  )
  
  const hasHistoryOnThisChain = previousTransactions.some(
    tx => tx.chain === toChain
  )
  
  const hasHistoryOnDifferentChain = previousTransactions.some(
    tx => tx.chain !== fromChain && tx.chain !== toChain
  )
  
  // Validation logic
  if (severity.blockTransfer) {
    errors.push(severity.message)
    
    // Suggest alternative
    if (fromChain === 'sepolia' && toChain && CHAIN_CONFIG[toChain]?.type === 'mainnet') {
      suggestions.push('You are on testnet. Switch to mainnet to send real tokens.')
    } else if (fromChain && CHAIN_CONFIG[fromChain]?.type === 'testnet') {
      suggestions.push('Testnet tokens cannot be sent to mainnet addresses.')
    }
  } else if (severity.level === 'warning') {
    warnings.push(severity.message)
    warnings.push(
      `You are on ${CHAIN_CONFIG[fromChain]?.name}. Recipient may expect tokens on ${CHAIN_CONFIG[toChain]?.name}.`
    )
    
    suggestions.push('Use a cross-chain bridge to transfer between networks safely.')
  } else if (severity.level === 'compatible') {
    warnings.push(severity.message)
    suggestions.push(
      `Consider using the official bridge between ${CHAIN_CONFIG[fromChain]?.name} and ${CHAIN_CONFIG[toChain]?.name}.`
    )
  }
  
  // Address history warnings
  if (hasHistoryOnDifferentChain && !hasHistoryOnThisChain) {
    warnings.push(
      `You've previously sent to this address on a different network. Double-check the correct network.`
    )
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    suggestions,
    severity,
    requiresConfirmation: severity.requiresConfirmation,
    canProceed: errors.length === 0,
  }
}

/**
 * Detect recipient's likely network from address
 * This uses heuristics and transaction history
 */
export function detectRecipientNetwork(recipientAddress, transactionHistory = []) {
  // Look for previous transactions to this address
  const previousTx = transactionHistory.filter(tx => tx.to === recipientAddress)
  
  if (previousTx.length === 0) {
    return {
      detected: false,
      likelyChain: null,
      confidence: 0,
      message: 'No transaction history with this address',
    }
  }
  
  // Count transactions per chain
  const chainCounts = {}
  previousTx.forEach(tx => {
    chainCounts[tx.chain] = (chainCounts[tx.chain] || 0) + 1
  })
  
  // Find most common chain
  const likelyChain = Object.entries(chainCounts).sort((a, b) => b[1] - a[1])[0][0]
  const confidence = Math.min(
    (chainCounts[likelyChain] / previousTx.length) * 100,
    100
  )
  
  return {
    detected: true,
    likelyChain,
    confidence,
    transactionCount: previousTx.length,
    message: `Recipient previously used on ${CHAIN_CONFIG[likelyChain]?.name} (${previousTx.length} transactions)`,
  }
}

/**
 * Get bridge recommendations for cross-chain transfers
 */
export function getBridgeRecommendation(fromChain, toChain) {
  const bridges = {
    'ethereum-base': {
      name: 'Base Bridge',
      url: 'https://bridge.base.org',
      official: true,
    },
    'ethereum-arbitrum': {
      name: 'Arbitrum Bridge',
      url: 'https://bridge.arbitrum.io',
      official: true,
    },
    'ethereum-polygon': {
      name: 'Polygon PoS Bridge',
      url: 'https://wallet.polygon.technology/bridge',
      official: true,
    },
    'base-ethereum': {
      name: 'Base Bridge',
      url: 'https://bridge.base.org',
      official: true,
    },
    'arbitrum-ethereum': {
      name: 'Arbitrum Bridge',
      url: 'https://bridge.arbitrum.io',
      official: true,
    },
    'polygon-ethereum': {
      name: 'Polygon PoS Bridge',
      url: 'https://wallet.polygon.technology/bridge',
      official: true,
    },
  }
  
  const key = `${fromChain}-${toChain}`
  return bridges[key] || null
}

/**
 * Get network info for display
 */
export function getNetworkInfo(chain) {
  const config = CHAIN_CONFIG[chain]
  if (!config) {
    return {
      name: 'Unknown Network',
      type: 'unknown',
      color: '#9ca3af',
      icon: '?',
    }
  }
  
  return {
    name: config.name,
    type: config.type,
    color: config.color,
    icon: config.type === 'testnet' ? '🧪' : '🌐',
    chainId: config.chainId,
    nativeToken: config.nativeToken,
    isTestnet: config.type === 'testnet',
  }
}

/**
 * Format network warning message for UI
 */
export function formatNetworkWarning(validation) {
  if (validation.valid) {
    return null
  }
  
  let message = ''
  
  if (validation.errors.length > 0) {
    message += '❌ ' + validation.errors.join('\n') + '\n\n'
  }
  
  if (validation.warnings.length > 0) {
    message += '⚠️ ' + validation.warnings.join('\n') + '\n\n'
  }
  
  if (validation.suggestions.length > 0) {
    message += '💡 ' + validation.suggestions.join('\n')
  }
  
  return message.trim()
}
