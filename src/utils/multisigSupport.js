/**
 * 🔐 Multi-Signature Support for High-Value Transactions
 * 
 * Features:
 * - Multi-sig wallet creation and management
 * - Transaction proposal and approval workflow
 * - Configurable signature thresholds
 * - High-value transaction protection
 */

// ─────────────────────────────────────────────────────────────────────
//  MULTI-SIG CONFIGURATION
// ─────────────────────────────────────────────────────────────────────

export const MULTISIG_CONFIG = {
  // Transaction value thresholds (USD)
  thresholds: {
    single: 10000,        // $10,000 - Single signature OK
    multisig: 50000,      // $50,000 - Requires multi-sig
    highValue: 100000,    // $100,000 - Requires enhanced multi-sig
  },
  
  // Signature requirements
  requirements: {
    standard: { required: 2, total: 3 },    // 2-of-3 for standard
    enhanced: { required: 3, total: 5 },    // 3-of-5 for high-value
  },
  
  // Time lock for high-value transactions (24 hours)
  timelock: 24 * 60 * 60 * 1000,
}

// ─────────────────────────────────────────────────────────────────────
//  MULTI-SIG WALLET MANAGEMENT
// ─────────────────────────────────────────────────────────────────────

const MULTISIG_STORAGE_KEY = 'dwallet_multisig_config'

/**
 * Create a multi-signature wallet configuration
 * @param {Array<string>} owners - Array of owner addresses
 * @param {number} requiredSignatures - Number of signatures required
 * @returns {Object} Multi-sig configuration
 */
export function createMultisigWallet(owners, requiredSignatures) {
  if (!owners || owners.length < 2) {
    throw new Error('Multi-sig wallet requires at least 2 owners')
  }
  
  if (requiredSignatures < 1 || requiredSignatures > owners.length) {
    throw new Error('Invalid signature requirement')
  }
  
  const config = {
    owners: owners.map(addr => addr.toLowerCase()),
    requiredSignatures,
    totalOwners: owners.length,
    createdAt: Date.now(),
    id: generateMultisigId(owners),
  }
  
  // Save to storage
  saveMultisigConfig(config)
  
  return config
}

/**
 * Get multi-sig configuration
 * @returns {Object|null} Multi-sig config or null
 */
export function getMultisigConfig() {
  try {
    const stored = localStorage.getItem(MULTISIG_STORAGE_KEY)
    return stored ? JSON.parse(stored) : null
  } catch {
    return null
  }
}

/**
 * Save multi-sig configuration
 * @param {Object} config - Multi-sig config
 */
function saveMultisigConfig(config) {
  localStorage.setItem(MULTISIG_STORAGE_KEY, JSON.stringify(config))
}

/**
 * Generate unique multi-sig ID from owners
 */
function generateMultisigId(owners) {
  const sorted = [...owners].sort().join('')
  return 'multisig_' + sorted.slice(0, 40)
}

// ─────────────────────────────────────────────────────────────────────
//  TRANSACTION PROPOSAL WORKFLOW
// ─────────────────────────────────────────────────────────────────────

const MULTISIG_TX_KEY = 'dwallet_multisig_transactions'

/**
 * Propose a transaction for multi-sig approval
 * @param {Object} tx - Transaction details
 * @returns {Object} Proposal with ID
 */
export function proposeTransaction(tx) {
  const proposals = getMultisigProposals()
  
  const proposal = {
    id: 'proposal_' + Date.now(),
    ...tx,
    status: 'pending',
    approvals: [],
    rejections: [],
    createdAt: Date.now(),
    createdBy: tx.from,
    expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000), // 7 days
  }
  
  proposals.unshift(proposal)
  saveMultisigProposals(proposals)
  
  return proposal
}

/**
 * Approve a proposed transaction
 * @param {string} proposalId - Proposal ID
 * @param {string} approver - Approver address
 * @param {string} signature - Approval signature
 * @returns {Object} Updated proposal
 */
export function approveTransaction(proposalId, approver, signature) {
  const proposals = getMultisigProposals()
  const proposal = proposals.find(p => p.id === proposalId)
  
  if (!proposal) {
    throw new Error('Proposal not found')
  }
  
  if (proposal.status !== 'pending') {
    throw new Error(`Proposal is ${proposal.status}, cannot approve`)
  }
  
  // Check if already approved by this address
  if (proposal.approvals.some(a => a.address.toLowerCase() === approver.toLowerCase())) {
    throw new Error('Already approved by this address')
  }
  
  // Add approval
  proposal.approvals.push({
    address: approver.toLowerCase(),
    signature,
    timestamp: Date.now(),
  })
  
  // Check if enough approvals
  const config = getMultisigConfig()
  if (config && proposal.approvals.length >= config.requiredSignatures) {
    proposal.status = 'approved'
    proposal.approvedAt = Date.now()
  }
  
  saveMultisigProposals(proposals)
  return proposal
}

/**
 * Reject a proposed transaction
 * @param {string} proposalId - Proposal ID
 * @param {string} rejector - Rejector address
 * @param {string} reason - Rejection reason
 * @returns {Object} Updated proposal
 */
export function rejectTransaction(proposalId, rejector, reason) {
  const proposals = getMultisigProposals()
  const proposal = proposals.find(p => p.id === proposalId)
  
  if (!proposal) {
    throw new Error('Proposal not found')
  }
  
  if (proposal.status !== 'pending') {
    throw new Error(`Proposal is ${proposal.status}, cannot reject`)
  }
  
  // Add rejection
  proposal.rejections.push({
    address: rejector.toLowerCase(),
    reason,
    timestamp: Date.now(),
  })
  
  // Auto-reject if majority rejects
  const config = getMultisigConfig()
  if (config && proposal.rejections.length > config.totalOwners / 2) {
    proposal.status = 'rejected'
    proposal.rejectedAt = Date.now()
  }
  
  saveMultisigProposals(proposals)
  return proposal
}

/**
 * Get all multi-sig proposals
 * @returns {Array} Proposals
 */
export function getMultisigProposals() {
  try {
    return JSON.parse(localStorage.getItem(MULTISIG_TX_KEY) || '[]')
  } catch {
    return []
  }
}

/**
 * Save multi-sig proposals
 * @param {Array} proposals - Proposals to save
 */
function saveMultisigProposals(proposals) {
  // Keep only last 100 proposals
  const trimmed = proposals.slice(0, 100)
  localStorage.setItem(MULTISIG_TX_KEY, JSON.stringify(trimmed))
}

// ─────────────────────────────────────────────────────────────────────
//  HIGH-VALUE TRANSACTION PROTECTION
// ─────────────────────────────────────────────────────────────────────

/**
 * Check if transaction requires multi-sig approval
 * @param {number} amountUSD - Transaction amount in USD
 * @returns {Object} Requirement assessment
 */
export function checkMultisigRequirement(amountUSD) {
  if (amountUSD >= MULTISIG_CONFIG.thresholds.highValue) {
    return {
      required: true,
      level: 'enhanced',
      ...MULTISIG_CONFIG.requirements.enhanced,
      reason: `High-value transaction ($${amountUSD.toLocaleString()}) requires ${MULTISIG_CONFIG.requirements.enhanced.required}-of-${MULTISIG_CONFIG.requirements.enhanced.total} signatures`,
      timelock: MULTISIG_CONFIG.timelock,
    }
  }
  
  if (amountUSD >= MULTISIG_CONFIG.thresholds.multisig) {
    return {
      required: true,
      level: 'standard',
      ...MULTISIG_CONFIG.requirements.standard,
      reason: `Transaction ($${amountUSD.toLocaleString()}) requires ${MULTISIG_CONFIG.requirements.standard.required}-of-${MULTISIG_CONFIG.requirements.standard.total} signatures`,
      timelock: 0,
    }
  }
  
  return {
    required: false,
    level: 'single',
    reason: 'Single signature sufficient',
  }
}

/**
 * Execute approved multi-sig transaction
 * @param {string} proposalId - Proposal ID
 * @returns {Object} Execution result
 */
export function executeMultisigTransaction(proposalId) {
  const proposals = getMultisigProposals()
  const proposal = proposals.find(p => p.id === proposalId)
  
  if (!proposal) {
    throw new Error('Proposal not found')
  }
  
  if (proposal.status !== 'approved') {
    throw new Error(`Proposal is ${proposal.status}, cannot execute`)
  }
  
  // Check timelock for high-value transactions
  if (proposal.timelock) {
    const timelockEnd = proposal.approvedAt + proposal.timelock
    if (Date.now() < timelockEnd) {
      const remaining = timelockEnd - Date.now()
      throw new Error(`Timelock active. Can execute in ${Math.ceil(remaining / 3600000)} hours`)
    }
  }
  
  // Mark as executed
  proposal.status = 'executed'
  proposal.executedAt = Date.now()
  
  saveMultisigProposals(proposals)
  
  return {
    success: true,
    proposal,
    message: 'Multi-sig transaction executed successfully',
  }
}

// ─────────────────────────────────────────────────────────────────────
//  VALIDATION UTILITIES
// ─────────────────────────────────────────────────────────────────────

/**
 * Validate if address is a multi-sig owner
 * @param {string} address - Address to check
 * @returns {boolean} True if owner
 */
export function isMultisigOwner(address) {
  const config = getMultisigConfig()
  if (!config) return false
  
  return config.owners.includes(address.toLowerCase())
}

/**
 * Get pending proposals for an address
 * @param {string} address - User address
 * @returns {Array} Pending proposals
 */
export function getPendingProposals(address) {
  const proposals = getMultisigProposals()
  
  return proposals.filter(p => {
    if (p.status !== 'pending') return false
    
    // Filter proposals user hasn't approved yet
    return !p.approvals.some(
      a => a.address.toLowerCase() === address.toLowerCase()
    )
  })
}

/**
 * Calculate multisig protection score (0-100)
 * @param {Object} txParams - Transaction parameters
 * @returns {number} Protection score
 */
export function calculateMultisigProtectionScore(txParams) {
  const { amountUSD, hasMultisig, requiredSignatures, approvalCount } = txParams
  
  let score = 0
  
  // Base score for having multisig
  if (hasMultisig) {
    score += 40
    
    // Score based on signature threshold
    if (requiredSignatures >= 3) score += 20
    else if (requiredSignatures >= 2) score += 10
    
    // Score for actual approvals
    if (approvalCount >= requiredSignatures) score += 20
    else if (approvalCount > 0) score += 10
  }
  
  // Score for high-value protection
  if (amountUSD >= MULTISIG_CONFIG.thresholds.highValue) {
    score += 20
  }
  
  return Math.min(100, score)
}
