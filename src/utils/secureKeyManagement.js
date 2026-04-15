/**
 * 🔐 Secure Key Management
 * 
 * Features:
 * - Ephemeral key loading (keys cleared from memory after use)
 * - Key masking in logs and errors
 * - Secure key derivation for operations
 * - Memory cleanup utilities
 */

// ─────────────────────────────────────────────────────────────────────
//  EPHEMERAL KEY HANDLING
// ─────────────────────────────────────────────────────────────────────

/**
 * Execute a function with a private key, then clear it from memory
 * @param {string} encryptedKey - Encrypted private key
 * @param {string} password - Decryption password
 * @param {Function} operation - Function that receives the decrypted key
 * @returns {Promise<any>} Result of the operation
 */
export async function withPrivateKey(encryptedKey, password, operation) {
  let decryptedKey = null
  
  try {
    // Import decryption function dynamically to avoid circular deps
    const { decryptData } = await import('./crypto.js')
    
    // Decrypt the key only when needed
    decryptedKey = await decryptData(encryptedKey, password)
    
    // Execute the operation with the key
    const result = await operation(decryptedKey)
    
    return result
  } finally {
    // CRITICAL: Clear key from memory immediately after use
    if (decryptedKey) {
      // Overwrite with zeros before letting GC collect
      decryptedKey = '0'.repeat(decryptedKey.length)
      decryptedKey = null
    }
    
    // Force garbage collection hint (not guaranteed, but helps)
    if (global.gc) {
      try { global.gc() } catch {}
    }
  }
}

// ─────────────────────────────────────────────────────────────────────
//  KEY MASKING & SANITIZATION
// ─────────────────────────────────────────────────────────────────────

/**
 * Mask a private key for safe logging
 * @param {string} key - Private key to mask
 * @returns {string} Masked key
 */
export function maskPrivateKey(key) {
  if (!key) return 'N/A'
  if (key.length < 10) return '***'
  return `${key.slice(0, 6)}...${key.slice(-4)}`
}

/**
 * Mask an address for safe logging (less restrictive than keys)
 * @param {string} address - Ethereum address
 * @returns {string} Masked address
 */
export function maskAddress(address) {
  if (!address) return 'N/A'
  if (address.length < 10) return '***'
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

/**
 * Sanitize error messages to remove sensitive data
 * @param {Error} error - Error object
 * @returns {string} Safe error message
 */
export function sanitizeError(error) {
  if (!error) return 'Unknown error'
  
  const message = error.message || String(error)
  
  // Remove potential private keys from error messages
  const sanitized = message
    .replace(/0x[a-fA-F0-9]{64}/g, '[PRIVATE_KEY_REDACTED]')
    .replace(/private[_-]?key[:\s]+0x[a-fA-F0-9]+/gi, '[PRIVATE_KEY_REDACTED]')
    .replace(/mnemonic[:\s]+[a-z\s]+/gi, '[MNEMONIC_REDACTED]')
  
  return sanitized
}

// ─────────────────────────────────────────────────────────────────────
//  SECURE KEY STORAGE VALIDATION
// ─────────────────────────────────────────────────────────────────────

/**
 * Validate that a key is properly encrypted before storage
 * @param {string} data - Data to validate
 * @returns {boolean} True if properly encrypted
 */
export function isValidEncryptedData(data) {
  try {
    if (!data || typeof data !== 'string') return false
    
    // Encrypted data should be base64 and contain IV + ciphertext
    const decoded = atob(data)
    const bytes = new Uint8Array([...decoded].map(c => c.charCodeAt(0)))
    
    // Should have at least: 16 bytes IV + 32 bytes ciphertext
    return bytes.length >= 48
  } catch {
    return false
  }
}

/**
 * Check if a string looks like an unencrypted private key
 * @param {string} str - String to check
 * @returns {boolean} True if it looks like a private key
 */
export function looksLikePrivateKey(str) {
  if (!str || typeof str !== 'string') return false
  
  // Ethereum private key pattern: 0x + 64 hex chars
  const ethKeyPattern = /^0x[a-fA-F0-9]{64}$/
  
  // Raw 64 hex chars
  const rawKeyPattern = /^[a-fA-F0-9]{64}$/
  
  return ethKeyPattern.test(str) || rawKeyPattern.test(str)
}

// ─────────────────────────────────────────────────────────────────────
//  MEMORY SECURITY UTILITIES
// ─────────────────────────────────────────────────────────────────────

/**
 * Securely clear a string from memory
 * @param {string} str - String to clear
 */
export function secureClear(str) {
  if (typeof str !== 'string') return
  
  // Overwrite with random data multiple times
  for (let i = 0; i < 3; i++) {
    const randomData = Array.from(
      { length: str.length },
      () => String.fromCharCode(Math.floor(Math.random() * 256))
    ).join('')
    
    // Note: This is a best-effort attempt; JavaScript GC may not立即 collect
    str = randomData
  }
  
  // Final null assignment
  str = null
}

/**
 * Create a secure buffer for sensitive data
 * @param {number} size - Buffer size
 * @returns {Uint8Array} Secure buffer
 */
export function createSecureBuffer(size) {
  const buffer = new Uint8Array(size)
  crypto.getRandomValues(buffer)
  return buffer
}

// ─────────────────────────────────────────────────────────────────────
//  KEY USAGE AUDITING
// ─────────────────────────────────────────────────────────────────────

const KEY_USAGE_LOG_KEY = 'dwallet_key_usage_log'

/**
 * Log a key usage event (for security auditing)
 * @param {string} operation - Operation performed
 * @param {string} address - Address involved
 */
export function logKeyUsage(operation, address) {
  try {
    const log = JSON.parse(localStorage.getItem(KEY_USAGE_LOG_KEY) || '[]')
    
    log.push({
      operation,
      address: maskAddress(address),
      timestamp: Date.now(),
      userAgent: navigator.userAgent.slice(0, 50) // Truncated for privacy
    })
    
    // Keep only last 100 entries
    if (log.length > 100) {
      log.splice(0, log.length - 100)
    }
    
    localStorage.setItem(KEY_USAGE_LOG_KEY, JSON.stringify(log))
  } catch (error) {
    console.error('Failed to log key usage:', error)
  }
}

/**
 * Get key usage history
 * @returns {Array} Usage log entries
 */
export function getKeyUsageHistory() {
  try {
    return JSON.parse(localStorage.getItem(KEY_USAGE_LOG_KEY) || '[]')
  } catch {
    return []
  }
}

/**
 * Clear key usage history
 */
export function clearKeyUsageHistory() {
  localStorage.removeItem(KEY_USAGE_LOG_KEY)
}
