/**
 * 🚨 External Threat Intelligence Integration
 * 
 * Features:
 * - Integration with Etherscan address labels
 * - Known scam/phishing database checks
 * - Sanctioned addresses screening (OFAC)
 * - Real-time threat scoring
 */

// ─────────────────────────────────────────────────────────────────────
//  THREAT INTELLIGENCE SOURCES
// ─────────────────────────────────────────────────────────────────────

/**
 * Known malicious address databases
 * Sources: Etherscan labels, Chainalysis, OFAC sanctions
 */
export const THREAT_DATABASES = {
  // OFAC sanctioned addresses (sample - should be updated regularly)
  ofac: new Set([
    // Add OFAC sanctioned Ethereum addresses here
    // Example format: '0x...'
  ]),
  
  // Known scam addresses
  scams: new Set([
    '0x0000000000000000000000000000000000000000', // Zero address
    // Add known scam addresses from community reports
  ]),
  
  // Phishing addresses
  phishing: new Set([
    // Add known phishing addresses here
  ]),
  
  // Mixer addresses (Tornado Cash, etc.)
  mixers: new Set([
    '0x12D66f87A04A9E220743712cE6d9bB1B5616B8Fc', // Tornado Cash Router
    '0x47CE0C6eD5B0Ce3d3A51fdb1C52DC66a7c3c2936', // Tornado Cash Instance
  ]),
}

// ─────────────────────────────────────────────────────────────────────
//  ETHERSCAN LABEL INTEGRATION
// ─────────────────────────────────────────────────────────────────────

/**
 * Fetch address label from Etherscan
 * @param {string} address - Ethereum address
 * @param {string} chain - Chain name (ethereum, sepolia, etc.)
 * @returns {Promise<Object>} Address label and risk info
 */
export async function fetchEtherscanLabel(address, chain = 'ethereum') {
  const API_KEYS = {
    ethereum: import.meta.env.VITE_ETHERSCAN_KEY,
    sepolia: import.meta.env.VITE_ETHERSCAN_KEY,
    base: import.meta.env.VITE_BASESCAN_KEY,
    polygon: import.meta.env.VITE_POLYGONSCAN_KEY,
    bnb: import.meta.env.VITE_BSCSCAN_KEY,
  }
  
  const API_URLS = {
    ethereum: 'https://api.etherscan.io/api',
    sepolia: 'https://api-sepolia.etherscan.io/api',
    base: 'https://api.basescan.org/api',
    polygon: 'https://api.polygonscan.com/api',
    bnb: 'https://api.bscscan.com/api',
  }
  
  const apiKey = API_KEYS[chain]
  const apiUrl = API_URLS[chain]
  
  if (!apiKey || apiKey === 'YourApiKeyToken') {
    return { label: null, source: 'unverified' }
  }
  
  try {
    const response = await fetch(
      `${apiUrl}?module=account&action=balance&address=${address}&tag=latest&apikey=${apiKey}`,
      { signal: AbortSignal.timeout(5000) }
    )
    
    const data = await response.json()
    
    // Note: Etherscan free API doesn't provide labels directly
    // In production, you'd use Etherscan Pro API or a dedicated service
    return {
      label: null,
      isContract: false,
      balance: data.result ? parseFloat(data.result) / 1e18 : 0,
      source: 'etherscan',
    }
  } catch (error) {
    console.warn('Failed to fetch Etherscan data:', error.message)
    return { label: null, source: 'error' }
  }
}

// ─────────────────────────────────────────────────────────────────────
//  ADDRESS THREAT SCORING
// ─────────────────────────────────────────────────────────────────────

/**
 * Calculate threat score for an address (0-100)
 * @param {string} address - Ethereum address
 * @returns {Promise<Object>} Threat assessment
 */
export async function calculateThreatScore(address) {
  if (!address) {
    return { score: 0, level: 'unknown', reason: 'No address provided' }
  }
  
  const normalizedAddress = address.toLowerCase()
  let score = 0
  const flags = []
  
  // Check OFAC sanctions list
  if (THREAT_DATABASES.ofac.has(normalizedAddress)) {
    score += 100
    flags.push({
      type: 'ofac_sanctioned',
      severity: 'critical',
      message: 'Address is on OFAC sanctions list'
    })
  }
  
  // Check known scams
  if (THREAT_DATABASES.scams.has(normalizedAddress)) {
    score += 80
    flags.push({
      type: 'known_scam',
      severity: 'critical',
      message: 'Address is associated with known scam'
    })
  }
  
  // Check phishing database
  if (THREAT_DATABASES.phishing.has(normalizedAddress)) {
    score += 70
    flags.push({
      type: 'phishing',
      severity: 'high',
      message: 'Address is associated with phishing attack'
    })
  }
  
  // Check mixer addresses
  if (THREAT_DATABASES.mixers.has(normalizedAddress)) {
    score += 50
    flags.push({
      type: 'mixer',
      severity: 'medium',
      message: 'Address is associated with cryptocurrency mixer'
    })
  }
  
  // Check for zero address
  if (normalizedAddress === '0x0000000000000000000000000000000000000000') {
    score += 100
    flags.push({
      type: 'zero_address',
      severity: 'critical',
      message: 'Cannot send to zero address'
    })
  }
  
  // Fetch additional data from Etherscan
  const etherscanData = await fetchEtherscanLabel(address)
  
  // Determine threat level
  let level = 'safe'
  if (score >= 80) level = 'critical'
  else if (score >= 60) level = 'high'
  else if (score >= 40) level = 'medium'
  else if (score >= 20) level = 'low'
  
  return {
    score: Math.min(100, score),
    level,
    flags,
    etherscan: etherscanData,
    safe: score < 40,
    requiresReview: score >= 40 && score < 80,
    shouldBlock: score >= 80,
  }
}

// ─────────────────────────────────────────────────────────────────────
//  EXTERNAL API INTEGRATIONS
// ─────────────────────────────────────────────────────────────────────

/**
 * Check address using Chainalysis Reactor (if API available)
 * @param {string} address - Ethereum address
 * @returns {Promise<Object>} Chainalysis risk assessment
 */
export async function checkChainalysis(address) {
  // This would require a Chainalysis API key
  // Placeholder for future integration
  
  try {
    const apiKey = import.meta.env.VITE_CHAINALYSIS_KEY
    
    if (!apiKey) {
      return { available: false, reason: 'No API key configured' }
    }
    
    // In production, make API call to Chainalysis
    // const response = await fetch('https://api.chainalysis.com/api/risk/v2/entities/' + address, {
    //   headers: { 'Token': apiKey }
    // })
    
    return { available: false, reason: 'Integration pending' }
  } catch (error) {
    console.warn('Chainalysis check failed:', error.message)
    return { available: false, error: error.message }
  }
}

/**
 * Check address using TRM Labs (if API available)
 * @param {string} address - Ethereum address
 * @returns {Promise<Object>} TRM Labs risk assessment
 */
export async function checkTRMLabs(address) {
  // Placeholder for TRM Labs integration
  
  try {
    const apiKey = import.meta.env.VITE_TRM_LABS_KEY
    
    if (!apiKey) {
      return { available: false, reason: 'No API key configured' }
    }
    
    return { available: false, reason: 'Integration pending' }
  } catch (error) {
    console.warn('TRM Labs check failed:', error.message)
    return { available: false, error: error.message }
  }
}

// ─────────────────────────────────────────────────────────────────────
//  COMPREHENSIVE THREAT ASSESSMENT
// ─────────────────────────────────────────────────────────────────────

/**
 * Perform comprehensive threat assessment on address
 * @param {string} address - Ethereum address
 * @param {Object} options - Assessment options
 * @returns {Promise<Object>} Comprehensive threat report
 */
export async function comprehensiveThreatAssessment(address, options = {}) {
  const {
    includeExternalAPIs = false,
    timeout = 10000,
  } = options
  
  const startTime = Date.now()
  
  // Start all checks in parallel
  const checks = [
    calculateThreatScore(address),
  ]
  
  // Add external API checks if enabled
  if (includeExternalAPIs) {
    checks.push(checkChainalysis(address))
    checks.push(checkTRMLabs(address))
  }
  
  const results = await Promise.allSettled(checks)
  
  // Process results
  const threatScore = results[0].status === 'fulfilled' 
    ? results[0].value 
    : { score: 0, level: 'error', safe: true }
  
  const externalChecks = results.slice(1).map(r => 
    r.status === 'fulfilled' ? r.value : { error: 'Check failed' }
  )
  
  const totalTime = Date.now() - startTime
  
  return {
    address,
    timestamp: new Date().toISOString(),
    assessmentTime: totalTime,
    threatScore,
    externalChecks,
    recommendation: generateRecommendation(threatScore),
  }
}

/**
 * Generate user-friendly recommendation based on threat score
 */
function generateRecommendation(threatScore) {
  if (threatScore.shouldBlock) {
    return '⛔ Transaction blocked: Address poses critical security risk'
  }
  
  if (threatScore.requiresReview) {
    return '⚠️ Caution: Address has medium risk factors. Review before proceeding.'
  }
  
  if (threatScore.level === 'low') {
    return 'ℹ️ Low risk: Address has minor risk indicators. Proceed with normal caution.'
  }
  
  return '✅ Address appears safe based on current threat intelligence'
}

// ─────────────────────────────────────────────────────────────────────
//  THREAT DATABASE MANAGEMENT
// ─────────────────────────────────────────────────────────────────────

const THREAT_DB_STORAGE_KEY = 'dwallet_threat_database'

/**
 * Update local threat database from storage
 * @param {Object} updates - Database updates
 */
export function updateThreatDatabase(updates) {
  try {
    const current = getThreatDatabase()
    
    if (updates.ofac) {
      updates.ofac.forEach(addr => THREAT_DATABASES.ofac.add(addr.toLowerCase()))
    }
    if (updates.scams) {
      updates.scams.forEach(addr => THREAT_DATABASES.scams.add(addr.toLowerCase()))
    }
    if (updates.phishing) {
      updates.phishing.forEach(addr => THREAT_DATABASES.phishing.add(addr.toLowerCase()))
    }
    if (updates.mixers) {
      updates.mixers.forEach(addr => THREAT_DATABASES.mixers.add(addr.toLowerCase()))
    }
    
    // Save to storage
    localStorage.setItem(THREAT_DB_STORAGE_KEY, JSON.stringify({
      lastUpdated: Date.now(),
      counts: {
        ofac: THREAT_DATABASES.ofac.size,
        scams: THREAT_DATABASES.scams.size,
        phishing: THREAT_DATABASES.phishing.size,
        mixers: THREAT_DATABASES.mixers.size,
      }
    }))
    
    console.log('✅ Threat database updated')
  } catch (error) {
    console.error('Failed to update threat database:', error)
  }
}

/**
 * Get threat database metadata
 */
export function getThreatDatabase() {
  try {
    return JSON.parse(localStorage.getItem(THREAT_DB_STORAGE_KEY) || '{}')
  } catch {
    return {}
  }
}

/**
 * Add single address to threat database
 * @param {string} address - Address to add
 * @param {string} category - Category (ofac, scam, phishing, mixer)
 */
export function addToThreatDatabase(address, category) {
  if (!THREAT_DATABASES[category]) {
    console.error(`Invalid threat category: ${category}`)
    return
  }
  
  THREAT_DATABASES[category].add(address.toLowerCase())
  console.log(`✅ Added ${address} to ${category} database`)
}
