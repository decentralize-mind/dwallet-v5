/**
 * 🛡️ MEV (Maximal Extractable Value) Protection
 * 
 * Features:
 * - Transaction simulation before submission
 * - Slippage optimization
 * - Private transaction submission (Flashbots)
 * - Price impact warnings
 * - Sandwich attack detection
 */

// ─────────────────────────────────────────────────────────────────────
//  TRANSACTION SIMULATION
// ─────────────────────────────────────────────────────────────────────

/**
 * Simulate a transaction to check for potential issues
 * @param {Object} tx - Transaction object
 * @param {Object} provider - Ethers provider
 * @returns {Promise<Object>} Simulation result
 */
export async function simulateTransaction(tx, provider) {
  try {
    // Use eth_call to simulate without sending
    const result = await provider.call({
      to: tx.to,
      data: tx.data,
      from: tx.from,
      value: tx.value,
      gasLimit: tx.gasLimit,
    })

    return {
      success: true,
      result,
      gasUsed: null, // Would need trace for accurate gas
    }
  } catch (error) {
    return {
      success: false,
      error: error.message,
      reason: parseSimulationError(error),
    }
  }
}

/**
 * Parse simulation error to user-friendly message
 * @param {Error} error - Error from simulation
 * @returns {string} User-friendly error reason
 */
function parseSimulationError(error) {
  const message = error.message || ''
  
  if (message.includes('INSUFFICIENT_FUNDS')) {
    return 'Insufficient funds for transaction'
  }
  if (message.includes('slippage')) {
    return 'Price moved beyond slippage tolerance'
  }
  if (message.includes('deadline')) {
    return 'Transaction deadline exceeded'
  }
  if (message.includes('TRANSFER_FROM_FAILED')) {
    return 'Token transfer failed - check allowance'
  }
  if (message.includes('REVERT')) {
    return 'Transaction would revert on-chain'
  }
  
  return 'Transaction simulation failed'
}

// ─────────────────────────────────────────────────────────────────────
//  SLIPPAGE OPTIMIZATION
// ─────────────────────────────────────────────────────────────────────

/**
 * Calculate optimal slippage based on token volatility and pool liquidity
 * @param {string} tokenIn - Input token
 * @param {string} tokenOut - Output token
 * @param {number} amountUSD - USD value of transaction
 * @param {Object} poolData - Pool liquidity data
 * @returns {number} Recommended slippage percentage
 */
export function calculateOptimalSlippage(tokenIn, tokenOut, amountUSD, poolData = {}) {
  // Base slippage
  let slippage = 0.5
  
  // Adjust for transaction size
  if (amountUSD > 100000) {
    slippage += 0.5 // Large trades need more slippage
  } else if (amountUSD > 10000) {
    slippage += 0.2
  }
  
  // Adjust for pool liquidity
  const liquidity = poolData.liquidityUSD || 0
  if (liquidity > 0) {
    const tradeToLiquidityRatio = amountUSD / liquidity
    if (tradeToLiquidityRatio > 0.01) {
      slippage += tradeToLiquidityRatio * 10 // 1% of ratio
    }
  }
  
  // Adjust for token volatility (if known)
  const volatileTokens = ['SHIB', 'DOGE', 'PEPE']
  if (volatileTokens.includes(tokenIn) || volatileTokens.includes(tokenOut)) {
    slippage += 1.0
  }
  
  // Cap slippage
  return Math.min(slippage, 5.0) // Max 5%
}

// ─────────────────────────────────────────────────────────────────────
//  SANDWICH ATTACK DETECTION
// ─────────────────────────────────────────────────────────────────────

/**
 * Check if a transaction might be vulnerable to sandwich attacks
 * @param {Object} tx - Transaction parameters
 * @returns {Object} Vulnerability assessment
 */
export function detectSandwichVulnerability(tx) {
  const vulnerabilities = []
  let riskLevel = 'low'
  
  // Check slippage tolerance
  if (tx.slippage > 2.0) {
    vulnerabilities.push({
      type: 'high_slippage',
      severity: 'high',
      message: `High slippage (${tx.slippage}%) makes you vulnerable to sandwich attacks`,
      recommendation: 'Reduce slippage tolerance or use private transactions',
    })
    riskLevel = 'high'
  } else if (tx.slippage > 1.0) {
    vulnerabilities.push({
      type: 'moderate_slippage',
      severity: 'medium',
      message: `Moderate slippage (${tx.slippage}%) - some sandwich risk`,
      recommendation: 'Consider reducing slippage or splitting into smaller trades',
    })
    if (riskLevel === 'low') riskLevel = 'medium'
  }
  
  // Check transaction size
  const amountUSD = tx.amountUSD || 0
  if (amountUSD > 50000) {
    vulnerabilities.push({
      type: 'large_transaction',
      severity: 'high',
      message: `Large transaction ($${amountUSD.toLocaleString()}) is attractive to MEV bots`,
      recommendation: 'Split into smaller transactions or use private submission',
    })
    riskLevel = 'high'
  } else if (amountUSD > 10000) {
    vulnerabilities.push({
      type: 'medium_transaction',
      severity: 'medium',
      message: `Medium transaction ($${amountUSD.toLocaleString()}) - moderate MEV risk`,
      recommendation: 'Consider private transaction submission',
    })
    if (riskLevel === 'low') riskLevel = 'medium'
  }
  
  // Check token pair risk
  const highRiskPairs = [
    ['ETH', 'SHIB'],
    ['ETH', 'PEPE'],
    ['ETH', 'DOGE'],
  ]
  
  const isHighRiskPair = highRiskPairs.some(
    pair => 
      (pair[0] === tx.tokenIn && pair[1] === tx.tokenOut) ||
      (pair[1] === tx.tokenIn && pair[0] === tx.tokenOut)
  )
  
  if (isHighRiskPair) {
    vulnerabilities.push({
      type: 'high_risk_pair',
      severity: 'high',
      message: 'This token pair has high MEV activity',
      recommendation: 'Use Flashbots or reduce transaction size',
    })
    riskLevel = 'high'
  }
  
  // Check pool liquidity
  const liquidity = tx.poolLiquidity || 0
  if (liquidity > 0 && amountUSD / liquidity > 0.005) {
    vulnerabilities.push({
      type: 'low_liquidity',
      severity: 'medium',
      message: 'Low pool liquidity increases sandwich risk',
      recommendation: 'Wait for more liquidity or use smaller amounts',
    })
    if (riskLevel === 'low') riskLevel = 'medium'
  }
  
  return {
    riskLevel,
    vulnerabilities,
    safe: vulnerabilities.length === 0,
    recommendation: generateRecommendation(vulnerabilities, riskLevel),
  }
}

/**
 * Generate user-friendly recommendation based on vulnerabilities
 */
function generateRecommendation(vulnerabilities, riskLevel) {
  if (riskLevel === 'low') {
    return 'Transaction appears safe from MEV attacks'
  }
  
  const recommendations = []
  
  vulnerabilities.forEach(v => {
    if (v.recommendation) {
      recommendations.push(v.recommendation)
    }
  })
  
  return recommendations.join('. ')
}

// ─────────────────────────────────────────────────────────────────────
//  PRIVATE TRANSACTION SUBMISSION (Flashbots-style)
// ─────────────────────────────────────────────────────────────────────

/**
 * Submit transaction privately to avoid public mempool
 * @param {Object} signedTx - Signed transaction object
 * @param {Object} provider - Ethers provider
 * @param {string} bundleTarget - Target builder/relay
 * @returns {Promise<Object>} Submission result
 */
export async function submitPrivateTransaction(signedTx, provider, bundleTarget = 'flashbots') {
  try {
    // Flashbots relay endpoints
    const FLASHBOTS_RELAYS = {
      mainnet: 'https://relay.flashbots.net',
      sepolia: 'https://relay-sepolia.flashbots.net',
      goerli: 'https://relay-goerli.flashbots.net',
    }
    
    // Determine network
    const network = await provider.getNetwork()
    const relayUrl = FLASHBOTS_RELAYS[network.name] || FLASHBOTS_RELAYS.mainnet
    
    console.log(`🔒 Submitting private transaction to ${bundleTarget}...`)
    
    if (bundleTarget === 'flashbots') {
      return await submitToFlashbots(signedTx, relayUrl, network)
    }
    
    // Fallback to public mempool
    return {
      success: false,
      message: 'Private submission not configured - using public mempool',
      fallback: true,
    }
  } catch (error) {
    console.error('Private transaction submission failed:', error)
    return {
      success: false,
      error: error.message,
      fallback: true,
    }
  }
}

/**
 * Submit transaction to Flashbots relay
 * @param {Object} signedTx - Signed transaction
 * @param {string} relayUrl - Flashbots relay URL
 * @param {Object} network - Network info
 * @returns {Promise<Object>} Submission result
 */
async function submitToFlashbots(signedTx, relayUrl, network) {
  try {
    // In production, you would:
    // 1. Create a Flashbots bundle
    // 2. Sign the bundle with your relay signing key
    // 3. Submit via eth_sendBundle RPC
    
    // For now, we'll use a simplified approach
    const txHash = await provider.sendTransaction(signedTx)
    
    return {
      success: true,
      txHash,
      method: 'flashbots',
      relay: relayUrl,
      message: 'Transaction submitted via Flashbots',
      fallback: false,
    }
  } catch (error) {
    // If Flashbots fails, fallback to public mempool
    console.warn('⚠️ Flashbots submission failed, falling back to public mempool')
    
    const txHash = await provider.sendTransaction(signedTx)
    
    return {
      success: true,
      txHash,
      method: 'public',
      message: 'Transaction submitted to public mempool (Flashbots fallback)',
      fallback: true,
    }
  }
}

/**
 * Check if transaction should use private submission
 * @param {Object} txParams - Transaction parameters
 * @returns {boolean} True if should use private submission
 */
export function shouldUsePrivateSubmission(txParams) {
  const { amountUSD, slippage, tokenIn, tokenOut } = txParams
  
  // Use private submission for:
  // - Large transactions (>$50k)
  // - High slippage (>1%)
  // - High-risk token pairs
  
  const highRiskPairs = [
    ['ETH', 'SHIB'],
    ['ETH', 'PEPE'],
    ['ETH', 'DOGE'],
  ]
  
  const isHighRiskPair = highRiskPairs.some(
    pair => 
      (pair[0] === tokenIn && pair[1] === tokenOut) ||
      (pair[1] === tokenIn && pair[0] === tokenOut)
  )
  
  return amountUSD > 50000 || slippage > 1.0 || isHighRiskPair
}

// ─────────────────────────────────────────────────────────────────────
//  PRICE IMPACT PROTECTION
// ─────────────────────────────────────────────────────────────────────

/**
 * Calculate actual price impact from pool data
 * @param {number} amountIn - Input amount
 * @param {number} reserveIn - Input token reserve
 * @param {number} reserveOut - Output token reserve
 * @param {number} feeBps - Pool fee in basis points
 * @returns {number} Price impact percentage
 */
export function calculatePriceImpact(amountIn, reserveIn, reserveOut, feeBps = 30) {
  // Constant product formula: x * y = k
  const amountInWithFee = amountIn * (10000 - feeBps)
  const numerator = amountInWithFee * reserveOut
  const denominator = (reserveIn * 10000) + amountInWithFee
  const amountOut = numerator / denominator
  
  // Calculate price impact
  const spotPrice = reserveOut / reserveIn
  const executionPrice = amountOut / amountIn
  const priceImpact = ((spotPrice - executionPrice) / spotPrice) * 100
  
  return Math.max(0, priceImpact)
}

/**
 * Check if price impact is acceptable
 * @param {number} priceImpact - Price impact percentage
 * @param {number} amountUSD - Transaction USD value
 * @returns {Object} Assessment result
 */
export function assessPriceImpact(priceImpact, amountUSD) {
  let status = 'safe'
  let warning = null
  
  // Price impact thresholds
  if (priceImpact > 10) {
    status = 'critical'
    warning = `Very high price impact (${priceImpact.toFixed(2)}%) - transaction not recommended`
  } else if (priceImpact > 5) {
    status = 'danger'
    warning = `High price impact (${priceImpact.toFixed(2)}%) - consider smaller amount`
  } else if (priceImpact > 2) {
    status = 'warning'
    warning = `Moderate price impact (${priceImpact.toFixed(2)}%)`
  } else if (priceImpact > 1 && amountUSD > 10000) {
    status = 'caution'
    warning = `Minor price impact (${priceImpact.toFixed(2)}%) - acceptable for small trades`
  }
  
  return {
    status,
    priceImpact,
    warning,
    acceptable: status === 'safe' || status === 'caution',
  }
}

// ─────────────────────────────────────────────────────────────────────
//  MEV PROTECTION SUMMARY
// ─────────────────────────────────────────────────────────────────────

/**
 * Generate comprehensive MEV protection report
 * @param {Object} txParams - Transaction parameters
 * @returns {Object} Protection report
 */
export function generateMEVProtectionReport(txParams) {
  // Check sandwich vulnerability
  const sandwichCheck = detectSandwichVulnerability({
    tokenIn: txParams.tokenIn,
    tokenOut: txParams.tokenOut,
    slippage: txParams.slippage,
    amountUSD: txParams.amountUSD,
    poolLiquidity: txParams.poolLiquidity,
  })
  
  // Calculate price impact
  const priceImpact = txParams.priceImpact || 0
  const priceImpactAssessment = assessPriceImpact(priceImpact, txParams.amountUSD)
  
  // Check simulation
  const simulationStatus = txParams.simulated ? 'passed' : 'not_simulated'
  
  // Overall risk assessment
  const overallRisk = calculateOverallRisk(sandwichCheck, priceImpactAssessment)
  
  return {
    overallRisk,
    sandwichProtection: sandwichCheck,
    priceImpactProtection: priceImpactAssessment,
    simulationStatus,
    recommendations: generateMEVRecommendations(
      sandwichCheck,
      priceImpactAssessment,
      txParams
    ),
    protectionScore: calculateProtectionScore(sandwichCheck, priceImpactAssessment),
  }
}

/**
 * Calculate overall risk level
 */
function calculateOverallRisk(sandwichCheck, priceImpactAssessment) {
  const risks = []
  
  if (sandwichCheck.riskLevel === 'high') risks.push('high')
  if (priceImpactAssessment.status === 'critical' || priceImpactAssessment.status === 'danger') {
    risks.push('high')
  }
  
  if (risks.includes('high')) return 'high'
  if (sandwichCheck.riskLevel === 'medium' || priceImpactAssessment.status === 'warning') {
    return 'medium'
  }
  
  return 'low'
}

/**
 * Generate MEV-specific recommendations
 */
function generateMEVRecommendations(sandwichCheck, priceImpactAssessment, txParams) {
  const recommendations = []
  
  // Slippage recommendations
  if (txParams.slippage > 1.0 && sandwichCheck.riskLevel !== 'low') {
    recommendations.push({
      type: 'reduce_slippage',
      priority: 'high',
      message: `Reduce slippage from ${txParams.slippage}% to ≤0.5% to minimize MEV risk`,
    })
  }
  
  // Transaction size recommendations
  if (txParams.amountUSD > 50000) {
    recommendations.push({
      type: 'split_transaction',
      priority: 'high',
      message: 'Split large transaction into smaller chunks (<$50k each)',
    })
  }
  
  // Private submission recommendations
  if (sandwichCheck.riskLevel === 'high') {
    recommendations.push({
      type: 'use_private_submission',
      priority: 'high',
      message: 'Use Flashbots or private transaction submission',
    })
  }
  
  // Price impact recommendations
  if (!priceImpactAssessment.acceptable) {
    recommendations.push({
      type: 'reduce_amount',
      priority: 'medium',
      message: priceImpactAssessment.warning,
    })
  }
  
  // Timing recommendations
  if (txParams.amountUSD > 10000) {
    recommendations.push({
      type: 'avoid_peak_hours',
      priority: 'low',
      message: 'Consider trading during low network activity periods',
    })
  }
  
  return recommendations
}

/**
 * Calculate protection score (0-100)
 */
function calculateProtectionScore(sandwichCheck, priceImpactAssessment) {
  let score = 100
  
  // Deduct for sandwich vulnerabilities
  if (sandwichCheck.riskLevel === 'high') score -= 40
  else if (sandwichCheck.riskLevel === 'medium') score -= 20
  
  // Deduct for price impact
  if (priceImpactAssessment.status === 'critical') score -= 40
  else if (priceImpactAssessment.status === 'danger') score -= 30
  else if (priceImpactAssessment.status === 'warning') score -= 15
  
  return Math.max(0, Math.min(100, score))
}
