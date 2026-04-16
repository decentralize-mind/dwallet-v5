import { ethers } from 'ethers'

/**
 * Transaction Decoder and Risk Analyzer
 * Provides detailed transaction preview with risk assessment
 */

// Known risky function signatures
const RISKY_FUNCTIONS = {
  '0xa9059cbb': { name: 'transfer', risk: 'medium', description: 'Transfer tokens' },
  '0x095ea7b3': { name: 'approve', risk: 'high', description: 'Approve spending allowance' },
  '0x23b872dd': { name: 'transferFrom', risk: 'high', description: 'Transfer tokens from another address' },
  '0x7ff36ab5': { name: 'swapExactETHForTokens', risk: 'medium', description: 'Swap ETH for tokens' },
  '0x18cbafe5': { name: 'swapExactTokensForETH', risk: 'medium', description: 'Swap tokens for ETH' },
  '0x38ed1739': { name: 'swapExactTokensForTokens', risk: 'medium', description: 'Swap tokens' },
  '0xd0e30db0': { name: 'deposit', risk: 'low', description: 'Deposit ETH' },
  '0x2e1a7d4d': { name: 'withdraw', risk: 'medium', description: 'Withdraw tokens' },
  '0x40c10f19': { name: 'mint', risk: 'low', description: 'Mint new tokens' },
  '0x9dc29fac': { name: 'burn', risk: 'medium', description: 'Burn tokens' },
}

// High-risk patterns
const HIGH_RISK_PATTERNS = [
  'selfdestruct',
  'delegatecall',
  'callcode',
]

/**
 * Decode transaction data
 */
export function decodeTransaction(tx) {
  const decoded = {
    to: tx.to || 'Contract Creation',
    from: tx.from || 'Unknown',
    value: tx.value ? `${ethers.formatEther(tx.value)} ETH` : '0 ETH',
    gasLimit: tx.gasLimit || 'Unknown',
    maxFeePerGas: tx.maxFeePerGas ? `${ethers.formatUnits(tx.maxFeePerGas, 'gwei')} Gwei` : 'Unknown',
    maxPriorityFeePerGas: tx.maxPriorityFeePerGas ? `${ethers.formatUnits(tx.maxPriorityFeePerGas, 'gwei')} Gwei` : 'Unknown',
    nonce: tx.nonce || 'Unknown',
    chainId: tx.chainId || 'Unknown',
    data: tx.data || '0x',
    functionCall: null,
    riskLevel: 'low',
    warnings: [],
    riskScore: 0,
  }

  // Decode function call if data exists
  if (tx.data && tx.data !== '0x' && tx.data.length >= 10) {
    const functionSelector = tx.data.slice(0, 10)
    const functionInfo = RISKY_FUNCTIONS[functionSelector]
    
    if (functionInfo) {
      decoded.functionCall = functionInfo
      decoded.riskScore += functionInfo.risk === 'high' ? 30 : functionInfo.risk === 'medium' ? 15 : 5
    } else {
      decoded.functionCall = {
        name: 'Unknown Function',
        risk: 'unknown',
        description: `Function: ${functionSelector}`,
      }
      decoded.riskScore += 10
    }
  }

  // Check for high-risk patterns
  const dataLower = tx.data?.toLowerCase() || ''
  HIGH_RISK_PATTERNS.forEach(pattern => {
    if (dataLower.includes(pattern.toLowerCase())) {
      decoded.warnings.push(`⚠️ Contains risky operation: ${pattern}`)
      decoded.riskScore += 40
    }
  })

  // Check for large value transfers
  if (tx.value) {
    try {
      const valueInEth = parseFloat(ethers.formatEther(tx.value))
      if (valueInEth > 10) {
        decoded.warnings.push(`💰 Large ETH transfer: ${valueInEth.toFixed(2)} ETH`)
        decoded.riskScore += 20
      }
      if (valueInEth > 100) {
        decoded.warnings.push(`🚨 Very large ETH transfer: ${valueInEth.toFixed(2)} ETH`)
        decoded.riskScore += 30
      }
    } catch (err) {
      // Ignore parsing errors
    }
  }

  // Check for contract interactions
  if (tx.to && tx.data && tx.data !== '0x') {
    decoded.warnings.push('📝 Interacting with smart contract')
    decoded.riskScore += 5
  }

  // Determine overall risk level
  if (decoded.riskScore >= 50) {
    decoded.riskLevel = 'high'
  } else if (decoded.riskScore >= 20) {
    decoded.riskLevel = 'medium'
  } else {
    decoded.riskLevel = 'low'
  }

  return decoded
}

/**
 * Get risk level color
 */
export function getRiskColor(riskLevel) {
  switch (riskLevel) {
    case 'high':
      return '#ef4444'
    case 'medium':
      return '#f59e0b'
    case 'low':
      return '#10b981'
    default:
      return '#6b7280'
  }
}

/**
 * Get risk level icon
 */
export function getRiskIcon(riskLevel) {
  switch (riskLevel) {
    case 'high':
      return '🚨'
    case 'medium':
      return '⚠️'
    case 'low':
      return '✅'
    default:
      return '❓'
  }
}

/**
 * Format transaction summary
 */
export function getTransactionSummary(decoded) {
  const parts = []
  
  if (decoded.value !== '0 ETH') {
    parts.push(`Send ${decoded.value}`)
  }
  
  if (decoded.functionCall) {
    parts.push(decoded.functionCall.description)
  }
  
  if (decoded.to !== 'Contract Creation') {
    parts.push(`to ${decoded.to.slice(0, 10)}...${decoded.to.slice(-4)}`)
  }
  
  return parts.join(' ')
}
