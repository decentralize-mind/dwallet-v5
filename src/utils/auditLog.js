/**
 * Security Audit Log Utility
 * Tracks all sensitive operations for security monitoring
 */

const AUDIT_LOG_KEY = 'dwallet_audit_log'
const MAX_LOG_ENTRIES = 100

/**
 * Event types for audit logging
 */
export const AUDIT_EVENTS = {
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILED: 'LOGIN_FAILED',
  LOGOUT: 'LOGOUT',
  PASSWORD_CHANGE: 'PASSWORD_CHANGE',
  SEED_PHRASE_VIEW: 'SEED_PHRASE_VIEW',
  SEED_PHRASE_COPY: 'SEED_PHRASE_COPY',
  TRANSACTION_SENT: 'TRANSACTION_SENT',
  TRANSACTION_FAILED: 'TRANSACTION_FAILED',
  SETTINGS_CHANGE: 'SETTINGS_CHANGE',
  BIOMETRIC_ENABLED: 'BIOMETRIC_ENABLED',
  BIOMETRIC_DISABLED: 'BIOMETRIC_DISABLED',
  HARDWARE_WALLET_CONNECTED: 'HARDWARE_WALLET_CONNECTED',
  HARDWARE_WALLET_DISCONNECTED: 'HARDWARE_WALLET_DISCONNECTED',
  LIMITS_CHANGED: 'LIMITS_CHANGED',
  ADDRESS_WHITELISTED: 'ADDRESS_WHITELISTED',
  ADDRESS_REMOVED: 'ADDRESS_REMOVED',
  WALLET_CREATED: 'WALLET_CREATED',
  WALLET_IMPORTED: 'WALLET_IMPORTED',
  WALLET_RESET: 'WALLET_RESET',
  ACCOUNT_ADDED: 'ACCOUNT_ADDED',
  ACCOUNT_SWITCHED: 'ACCOUNT_SWITCHED'
}

/**
 * Log a security event
 */
export function logSecurityEvent(event, details = {}) {
  try {
    const logs = getAuditLogs()
    
    const entry = {
      id: generateId(),
      event,
      details,
      timestamp: Date.now(),
      date: new Date().toISOString(),
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      // Hash IP if available (privacy-preserving)
      ipHash: hashIPAddress(details.ip || null)
    }
    
    // Add to beginning (newest first)
    logs.unshift(entry)
    
    // Keep only last MAX_LOG_ENTRIES
    if (logs.length > MAX_LOG_ENTRIES) {
      logs.length = MAX_LOG_ENTRIES
    }
    
    localStorage.setItem(AUDIT_LOG_KEY, JSON.stringify(logs))
    
    console.log(`📝 Audit log: ${event}`, details)
    return entry
  } catch (error) {
    console.error('Failed to log security event:', error)
    return null
  }
}

/**
 * Get all audit logs
 */
export function getAuditLogs() {
  try {
    const logs = localStorage.getItem(AUDIT_LOG_KEY)
    return logs ? JSON.parse(logs) : []
  } catch {
    return []
  }
}

/**
 * Get logs filtered by event type
 */
export function getLogsByEvent(eventType) {
  const logs = getAuditLogs()
  return logs.filter(log => log.event === eventType)
}

/**
 * Get logs from last N hours
 */
export function getRecentLogs(hours = 24) {
  const logs = getAuditLogs()
  const cutoff = Date.now() - (hours * 60 * 60 * 1000)
  
  return logs.filter(log => log.timestamp > cutoff)
}

/**
 * Get suspicious activity indicators
 */
export function getSuspiciousActivity() {
  const logs = getAuditLogs()
  const suspicious = []
  const now = Date.now()
  const last24Hours = now - (24 * 60 * 60 * 1000)
  
  // Check for multiple failed login attempts
  const recentFailedLogins = logs.filter(
    log => log.event === AUDIT_EVENTS.LOGIN_FAILED && log.timestamp > last24Hours
  )
  
  if (recentFailedLogins.length >= 3) {
    suspicious.push({
      type: 'MULTIPLE_FAILED_LOGINS',
      severity: 'high',
      count: recentFailedLogins.length,
      message: `${recentFailedLogins.length} failed login attempts in last 24 hours`,
      timestamps: recentFailedLogins.map(log => log.timestamp)
    })
  }
  
  // Check for seed phrase viewed
  const recentSeedViews = logs.filter(
    log => log.event === AUDIT_EVENTS.SEED_PHRASE_VIEW && log.timestamp > last24Hours
  )
  
  if (recentSeedViews.length > 0) {
    suspicious.push({
      type: 'SEED_PHRASE_ACCESSED',
      severity: 'medium',
      count: recentSeedViews.length,
      message: `Seed phrase viewed ${recentSeedViews.length} time(s) in last 24 hours`,
      timestamps: recentSeedViews.map(log => log.timestamp)
    })
  }
  
  // Check for large transactions
  const recentTransactions = logs.filter(
    log => log.event === AUDIT_EVENTS.TRANSACTION_SENT && log.timestamp > last24Hours
  )
  
  const largeTransactions = recentTransactions.filter(
    log => log.details?.amountUSD > 5000
  )
  
  if (largeTransactions.length > 0) {
    suspicious.push({
      type: 'LARGE_TRANSACTIONS',
      severity: 'medium',
      count: largeTransactions.length,
      message: `${largeTransactions.length} large transaction(s) (> $5,000) in last 24 hours`,
      transactions: largeTransactions.map(log => ({
        hash: log.details.txHash,
        amount: log.details.amountUSD,
        timestamp: log.timestamp
      }))
    })
  }
  
  // Check for settings changes
  const recentSettingsChanges = logs.filter(
    log => log.event === AUDIT_EVENTS.SETTINGS_CHANGE && log.timestamp > last24Hours
  )
  
  if (recentSettingsChanges.length >= 5) {
    suspicious.push({
      type: 'FREQUENT_SETTINGS_CHANGES',
      severity: 'low',
      count: recentSettingsChanges.length,
      message: `${recentSettingsChanges.length} settings changes in last 24 hours`,
      timestamps: recentSettingsChanges.map(log => log.timestamp)
    })
  }
  
  return suspicious
}

/**
 * Export audit logs as JSON
 */
export function exportAuditLogsJSON() {
  const logs = getAuditLogs()
  const dataStr = JSON.stringify(logs, null, 2)
  const dataBlob = new Blob([dataStr], { type: 'application/json' })
  
  downloadFile(dataBlob, `toklo-audit-log-${getTimestamp()}.json`)
}

/**
 * Export audit logs as CSV
 */
export function exportAuditLogsCSV() {
  const logs = getAuditLogs()
  
  const headers = ['Date', 'Event', 'Details', 'Platform']
  const rows = logs.map(log => [
    new Date(log.timestamp).toLocaleString(),
    log.event,
    JSON.stringify(log.details),
    log.platform
  ])
  
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n')
  
  const csvBlob = new Blob([csvContent], { type: 'text/csv' })
  downloadFile(csvBlob, `toklo-audit-log-${getTimestamp()}.csv`)
}

/**
 * Clear audit logs (requires confirmation)
 */
export function clearAuditLogs() {
  localStorage.removeItem(AUDIT_LOG_KEY)
  console.log('✅ Audit logs cleared')
}

/**
 * Get log statistics
 */
export function getLogStatistics() {
  const logs = getAuditLogs()
  
  const stats = {
    totalEvents: logs.length,
    dateRange: {
      earliest: logs.length > 0 ? logs[logs.length - 1].timestamp : null,
      latest: logs.length > 0 ? logs[0].timestamp : null
    },
    eventCounts: {},
    last24Hours: 0,
    last7Days: 0
  }
  
  const now = Date.now()
  const last24Hours = now - (24 * 60 * 60 * 1000)
  const last7Days = now - (7 * 24 * 60 * 60 * 1000)
  
  logs.forEach(log => {
    // Count by event type
    stats.eventCounts[log.event] = (stats.eventCounts[log.event] || 0) + 1
    
    // Count by time period
    if (log.timestamp > last24Hours) stats.last24Hours++
    if (log.timestamp > last7Days) stats.last7Days++
  })
  
  return stats
}

/**
 * Helper: Generate unique ID
 */
function generateId() {
  return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Helper: Simple hash for IP (privacy-preserving)
 */
function hashIPAddress(ip) {
  if (!ip) return null
  
  // Simple hash - in production, use proper cryptographic hash
  let hash = 0
  for (let i = 0; i < ip.length; i++) {
    const char = ip.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return hash.toString(36)
}

/**
 * Helper: Get timestamp string
 */
function getTimestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-').split('T').join('_')
}

/**
 * Helper: Download file
 */
function downloadFile(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
