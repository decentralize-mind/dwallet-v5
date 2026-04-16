/**
 * 🔍 Transaction Simulation Service
 * 
 * Features:
 * - Simulate transactions before sending
 * - Estimate gas usage accurately
 * - Detect potential failures
 * - Validate contract interactions
 */

import { getProvider } from './blockchain.js'

// ─────────────────────────────────────────────────────────────────────
//  TRANSACTION SIMULATION
// ─────────────────────────────────────────────────────────────────────

/**
 * Simulate a transaction to check for potential issues
 * @param {Object} txParams - Transaction parameters
 * @returns {Promise<Object>} Simulation result
 */
export async function simulateTransaction(txParams) {
  const {
    from,
    to,
    value = '0',
    data = '0x',
    chain = 'ethereum',
  } = txParams
  
  const startTime = Date.now()
  
  try {
    const provider = getProvider(chain)
    if (!provider) {
      return {
        success: false,
        error: 'Provider not available',
        simulationTime: 0,
      }
    }
    
    // Use eth_call to simulate without sending
    const result = await provider.call({
      from,
      to,
      value,
      data,
    })
    
    // Estimate gas
    const gasEstimate = await provider.estimateGas({
      from,
      to,
      value,
      data,
    })
    
    const simulationTime = Date.now() - startTime
    
    return {
      success: true,
      result,
      gasEstimate: gasEstimate.toString(),
      gasEstimateFormatted: parseFloat(gasEstimate.toString()),
      simulationTime,
      wouldSucceed: true,
      returnValue: result,
    }
  } catch (error) {
    const simulationTime = Date.now() - startTime
    
    // Parse error to determine failure reason
    const failureReason = parseSimulationError(error)
    
    return {
      success: false,
      error: error.message,
      reason: failureReason,
      simulationTime,
      wouldSucceed: false,
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
  
  // Common error patterns
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
  if (message.includes('execution reverted')) {
    return 'Transaction would fail (contract reverted)'
  }
  if (message.includes('out of gas')) {
    return 'Transaction would run out of gas'
  }
  if (message.includes('nonce')) {
    return 'Invalid nonce - check pending transactions'
  }
  
  return 'Transaction simulation failed'
}

// ─────────────────────────────────────────────────────────────────────
//  CONTRACT INTERACTION SIMULATION
// ─────────────────────────────────────────────────────────────────────

/**
 * Simulate ERC20 token transfer
 * @param {string} tokenAddress - Token contract address
 * @param {string} from - Sender address
 * @param {string} to - Recipient address
 * @param {string} amount - Amount to transfer
 * @param {number} decimals - Token decimals
 * @param {string} chain - Chain name
 * @returns {Promise<Object>} Simulation result
 */
export async function simulateTokenTransfer(tokenAddress, from, to, amount, decimals, chain = 'ethereum') {
  const ERC20_TRANSFER_ABI = [
    'function transfer(address to, uint256 amount) returns (bool)',
    'function balanceOf(address) view returns (uint256)',
    'function allowance(address owner, address spender) view returns (uint256)',
  ]
  
  try {
    const provider = getProvider(chain)
    if (!provider) {
      return { success: false, error: 'Provider not available' }
    }
    
    const contract = new (await import('ethers')).Contract(tokenAddress, ERC20_TRANSFER_ABI, provider)
    
    // Check balance
    const balance = await contract.balanceOf(from)
    const amountParsed = (await import('ethers')).parseUnits(amount, decimals)
    
    if (balance < amountParsed) {
      return {
        success: false,
        reason: 'Insufficient token balance',
        balance: (await import('ethers')).formatUnits(balance, decimals),
        required: amount,
      }
    }
    
    // Simulate transfer
    const transferData = contract.interface.encodeFunctionData('transfer', [to, amountParsed])
    
    const simulation = await simulateTransaction({
      from,
      to: tokenAddress,
      data: transferData,
      chain,
    })
    
    return simulation
  } catch (error) {
    return {
      success: false,
      error: error.message,
      reason: parseSimulationError(error),
    }
  }
}

/**
 * Simulate contract approval
 * @param {string} tokenAddress - Token contract address
 * @param {string} owner - Owner address
 * @param {string} spender - Spender address
 * @param {string} amount - Amount to approve
 * @param {number} decimals - Token decimals
 * @param {string} chain - Chain name
 * @returns {Promise<Object>} Simulation result
 */
export async function simulateApproval(tokenAddress, owner, spender, amount, decimals, chain = 'ethereum') {
  const ERC20_APPROVE_ABI = [
    'function approve(address spender, uint256 amount) returns (bool)',
    'function allowance(address owner, address spender) view returns (uint256)',
  ]
  
  try {
    const provider = getProvider(chain)
    if (!provider) {
      return { success: false, error: 'Provider not available' }
    }
    
    const contract = new (await import('ethers')).Contract(tokenAddress, ERC20_APPROVE_ABI, provider)
    
    // Check current allowance
    const currentAllowance = await contract.allowance(owner, spender)
    const amountParsed = (await import('ethers')).parseUnits(amount, decimals)
    
    if (currentAllowance >= amountParsed) {
      return {
        success: true,
        reason: 'Sufficient allowance already exists',
        currentAllowance: (await import('ethers')).formatUnits(currentAllowance, decimals),
        wouldSucceed: true,
        skipApproval: true,
      }
    }
    
    // Simulate approval
    const approveData = contract.interface.encodeFunctionData('approve', [spender, amountParsed])
    
    const simulation = await simulateTransaction({
      from: owner,
      to: tokenAddress,
      data: approveData,
      chain,
    })
    
    return {
      ...simulation,
      currentAllowance: (await import('ethers')).formatUnits(currentAllowance, decimals),
      newAllowance: amount,
    }
  } catch (error) {
    return {
      success: false,
      error: error.message,
      reason: parseSimulationError(error),
    }
  }
}

// ─────────────────────────────────────────────────────────────────────
//  SWAP SIMULATION
// ─────────────────────────────────────────────────────────────────────

/**
 * Simulate a token swap to check for issues
 * @param {Object} swapParams - Swap parameters
 * @returns {Promise<Object>} Simulation result
 */
export async function simulateSwap(swapParams) {
  const {
    tokenIn,
    tokenOut,
    amountIn,
    minAmountOut,
    routerAddress,
    from,
    chain = 'ethereum',
  } = swapParams
  
  try {
    // First simulate approval if needed
    if (tokenIn !== 'ETH') {
      const approvalSim = await simulateApproval(
        tokenIn,
        from,
        routerAddress,
        amountIn,
        18, // Adjust based on token
        chain
      )
      
      if (!approvalSim.success && !approvalSim.skipApproval) {
        return {
          success: false,
          reason: 'Approval would fail',
          approval: approvalSim,
        }
      }
    }
    
    // Simulate the swap transaction
    const swapSimulation = await simulateTransaction({
      from,
      to: routerAddress,
      value: tokenIn === 'ETH' ? amountIn : '0',
      chain,
    })
    
    return {
      success: swapSimulation.success,
      swap: swapSimulation,
      recommendation: swapSimulation.success
        ? 'Swap simulation passed'
        : 'Swap would likely fail - check parameters',
    }
  } catch (error) {
    return {
      success: false,
      error: error.message,
      reason: parseSimulationError(error),
    }
  }
}

// ─────────────────────────────────────────────────────────────────────
//  BATCH SIMULATION
// ─────────────────────────────────────────────────────────────────────

/**
 * Simulate multiple transactions in batch
 * @param {Array<Object>} transactions - Array of transaction parameters
 * @returns {Promise<Array<Object>} Simulation results
 */
export async function simulateBatch(transactions) {
  const results = []
  
  for (const tx of transactions) {
    const result = await simulateTransaction(tx)
    results.push(result)
    
    // Stop on first failure if sequential
    if (tx.sequential && !result.success) {
      break
    }
  }
  
  return results
}

// ─────────────────────────────────────────────────────────────────────
//  SIMULATION STATISTICS & CACHING
// ─────────────────────────────────────────────────────────────────────

const SIMULATION_CACHE_KEY = 'dwallet_simulation_cache'
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

/**
 * Get cached simulation result
 * @param {string} cacheKey - Cache key
 * @returns {Object|null} Cached result or null
 */
export function getCachedSimulation(cacheKey) {
  try {
    const cache = JSON.parse(localStorage.getItem(SIMULATION_CACHE_KEY) || '{}')
    const entry = cache[cacheKey]
    
    if (!entry) return null
    
    // Check if expired
    if (Date.now() - entry.timestamp > CACHE_TTL) {
      delete cache[cacheKey]
      localStorage.setItem(SIMULATION_CACHE_KEY, JSON.stringify(cache))
      return null
    }
    
    return entry.result
  } catch {
    return null
  }
}

/**
 * Cache simulation result
 * @param {string} cacheKey - Cache key
 * @param {Object} result - Simulation result
 */
export function cacheSimulation(cacheKey, result) {
  try {
    const cache = JSON.parse(localStorage.getItem(SIMULATION_CACHE_KEY) || '{}')
    
    cache[cacheKey] = {
      result,
      timestamp: Date.now(),
    }
    
    // Limit cache size
    const keys = Object.keys(cache)
    if (keys.length > 50) {
      // Remove oldest entries
      keys.sort((a, b) => cache[a].timestamp - cache[b].timestamp)
      keys.slice(0, keys.length - 50).forEach(key => delete cache[key])
    }
    
    localStorage.setItem(SIMULATION_CACHE_KEY, JSON.stringify(cache))
  } catch (error) {
    console.warn('Failed to cache simulation:', error)
  }
}

/**
 * Generate cache key from transaction parameters
 * @param {Object} txParams - Transaction parameters
 * @returns {string} Cache key
 */
export function generateCacheKey(txParams) {
  const keyData = {
    from: txParams.from,
    to: txParams.to,
    value: txParams.value,
    data: txParams.data?.slice(0, 100), // First 100 chars of data
    chain: txParams.chain,
  }
  
  return 'sim_' + btoa(JSON.stringify(keyData)).slice(0, 50)
}
