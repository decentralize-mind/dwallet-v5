/**
 * Enhanced referral tracking utilities
 * Provides comprehensive tracking and analytics for the referral system
 */

const REFERRAL_KEY = 'dwallet_referral'
const REFERRAL_CACHE_KEY = 'referral_address_cache'
const PENDING_REFERRAL_KEY = 'pending_referral'
const REFERRAL_HISTORY_KEY = 'referral_history'

/**
 * Get current referral statistics
 * @returns {{signups: number, earned: number}}
 */
export function getReferralStats() {
  try {
    return JSON.parse(localStorage.getItem(REFERRAL_KEY) || '{"signups":0,"earned":0}')
  } catch {
    return { signups: 0, earned: 0 }
  }
}

/**
 * Update referral statistics after a successful referral
 * @param {number} signupsToAdd - Number of new signups (usually 1)
 * @param {number} earningsToAdd - Amount earned (usually 10 DWT)
 */
export function updateReferralStats(signupsToAdd = 1, earningsToAdd = 10) {
  try {
    const stats = getReferralStats()
    stats.signups += signupsToAdd
    stats.earned += earningsToAdd
    localStorage.setItem(REFERRAL_KEY, JSON.stringify(stats))
    return stats
  } catch (err) {
    console.error('Error updating referral stats:', err)
    return null
  }
}

/**
 * Generate referral code from address
 * @param {string} address - Ethereum address
 * @returns {string} Referral code
 */
export function getReferralCode(address) {
  if (!address) return 'TOKLO'
  // Using 'DW' prefix for dWallet referral codes
  return 'DW' + address.slice(2, 8).toUpperCase()
}

/**
 * Generate full referral link
 * @param {string} address - Ethereum address
 * @returns {string} Complete referral URL
 */
export function getReferralLink(address) {
  return 'https://www.toklo.xyz/?ref=' + getReferralCode(address)
}

/**
 * Get referral reward amount per signup
 * @returns {number} DWT reward amount
 */
export function getReferralRewardAmount() {
  return 10 // 10 DWT per referral
}

/**
 * Check for incoming referral code in URL
 * @returns {string|null} Referral code if found
 */
export function checkIncomingReferral() {
  try {
    const params = new URLSearchParams(window.location.search)
    const ref = params.get('ref')
    if (ref) {
      sessionStorage.setItem('toklo_ref', ref)
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname)
      return ref
    }
    return null
  } catch {
    return null
  }
}

/**
 * Get stored referral code from session
 * @returns {string|null}
 */
export function getStoredReferralCode() {
  return sessionStorage.getItem('toklo_ref')
}

/**
 * Cache referral code to address mapping
 * @param {string} address - Ethereum address
 */
export function cacheReferralAddress(address) {
  try {
    const code = getReferralCode(address)
    const cache = JSON.parse(localStorage.getItem(REFERRAL_CACHE_KEY) || '{}')
    cache[code] = address
    localStorage.setItem(REFERRAL_CACHE_KEY, JSON.stringify(cache))
  } catch (err) {
    console.error('Error caching referral address:', err)
  }
}

/**
 * Resolve referral code to address
 * @param {string} code - Referral code
 * @returns {string|null} Ethereum address
 */
export function resolveReferralCode(code) {
  try {
    const cache = JSON.parse(localStorage.getItem(REFERRAL_CACHE_KEY) || '{}')
    return cache[code] || null
  } catch {
    return null
  }
}

/**
 * Save pending referral for later processing
 * @param {string} referrer - Referrer address
 * @param {string} referee - New user address
 */
export function savePendingReferral(referrer, referee) {
  try {
    const pendingData = {
      referrer,
      referee,
      timestamp: Date.now(),
      status: 'pending'
    }
    localStorage.setItem(PENDING_REFERRAL_KEY, JSON.stringify(pendingData))
    return pendingData
  } catch (err) {
    console.error('Error saving pending referral:', err)
    return null
  }
}

/**
 * Get pending referral data
 * @returns {object|null}
 */
export function getPendingReferral() {
  try {
    const data = localStorage.getItem(PENDING_REFERRAL_KEY)
    return data ? JSON.parse(data) : null
  } catch {
    return null
  }
}

/**
 * Clear pending referral after processing
 */
export function clearPendingReferral() {
  localStorage.removeItem(PENDING_REFERRAL_KEY)
}

/**
 * Add entry to referral history
 * @param {object} referralData - Referral event data
 */
export function addToReferralHistory(referralData) {
  try {
    const history = JSON.parse(localStorage.getItem(REFERRAL_HISTORY_KEY) || '[]')
    history.unshift({
      ...referralData,
      timestamp: Date.now(),
      id: Date.now().toString()
    })
    // Keep only last 50 entries
    if (history.length > 50) {
      history.length = 50
    }
    localStorage.setItem(REFERRAL_HISTORY_KEY, JSON.stringify(history))
  } catch (err) {
    console.error('Error adding to referral history:', err)
  }
}

/**
 * Get referral history
 * @returns {Array}
 */
export function getReferralHistory() {
  try {
    return JSON.parse(localStorage.getItem(REFERRAL_HISTORY_KEY) || '[]')
  } catch {
    return []
  }
}

/**
 * Copy referral link to clipboard
 * @param {string} address - Ethereum address
 * @returns {string} The referral link
 */
export function copyReferralLink(address) {
  const link = getReferralLink(address)
  try {
    navigator.clipboard.writeText(link)
  } catch {
    // Silent failure if clipboard access is denied
  }
  return link
}

/**
 * Get comprehensive referral analytics
 * @returns {object} Analytics data
 */
export function getReferralAnalytics() {
  const stats = getReferralStats()
  const history = getReferralHistory()
  const pending = getPendingReferral()
  
  return {
    totalReferrals: stats.signups,
    totalEarned: stats.earned,
    rewardPerReferral: getReferralRewardAmount(),
    pendingReferral: pending,
    recentActivity: history.slice(0, 10),
    conversionRate: stats.signups > 0 ? '100%' : '0%',
    averageEarnings: stats.signups > 0 ? (stats.earned / stats.signups).toFixed(2) : '0'
  }
}

/**
 * Reset all referral data (for testing)
 */
export function resetReferralData() {
  localStorage.removeItem(REFERRAL_KEY)
  localStorage.removeItem(REFERRAL_CACHE_KEY)
  localStorage.removeItem(PENDING_REFERRAL_KEY)
  localStorage.removeItem(REFERRAL_HISTORY_KEY)
  sessionStorage.removeItem('toklo_ref')
}
