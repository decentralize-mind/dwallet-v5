/**
 * 🔒 Secure Session Management & CSRF Protection
 * 
 * Features:
 * - CSRF token generation and validation
 * - Session integrity verification
 * - Session binding to browser fingerprint
 * - Secure session storage with tamper detection
 * - Anti-session fixation protection
 * - Session rotation
 * - Secure cookie flags (if cookies are used)
 */

// ─────────────────────────────────────────────────────────────────────
//  CSRF PROTECTION
// ─────────────────────────────────────────────────────────────────────

/**
 * Generate cryptographically secure CSRF token
 */
export function generateCSRFToken() {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * Store CSRF token in session storage (bound to session)
 */
export function storeCSRFToken() {
  const token = generateCSRFToken()
  sessionStorage.setItem('csrf_token', token)
  sessionStorage.setItem('csrf_token_created', Date.now().toString())
  
  // Also store in memory for validation
  window.__CSRF_TOKEN = token
  
  return token
}

/**
 * Get current CSRF token
 */
export function getCSRFToken() {
  // Try memory first (fastest)
  if (window.__CSRF_TOKEN) {
    return window.__CSRF_TOKEN
  }
  
  // Fall back to session storage
  return sessionStorage.getItem('csrf_token')
}

/**
 * Validate CSRF token
 */
export function validateCSRFToken(token) {
  if (!token) return false
  
  const storedToken = getCSRFToken()
  if (!storedToken) return false
  
  // Constant-time comparison to prevent timing attacks
  return secureCompare(token, storedToken)
}

/**
 * Validate CSRF token from request headers
 */
export function validateCSRFHeader(headers) {
  const token = headers?.['X-CSRF-Token'] || headers?.['x-csrf-token']
  return validateCSRFToken(token)
}

/**
 * Add CSRF token to fetch request headers
 */
export function withCSRF(headers = {}) {
  const token = getCSRFToken()
  if (token) {
    return {
      ...headers,
      'X-CSRF-Token': token
    }
  }
  return headers
}

/**
 * Secure string comparison (constant-time to prevent timing attacks)
 */
function secureCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') {
    return false
  }
  
  if (a.length !== b.length) {
    return false
  }
  
  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  
  return result === 0
}

// ─────────────────────────────────────────────────────────────────────
//  SESSION INTEGRITY & TAMPER DETECTION
// ─────────────────────────────────────────────────────────────────────

/**
 * Generate browser fingerprint for session binding
 */
export function generateBrowserFingerprint() {
  const components = [
    navigator.userAgent,
    navigator.language,
    navigator.platform,
    screen.width + 'x' + screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
    // Don't include IP address (privacy)
  ]
  
  const fingerprint = components.join('|')
  
  // Hash the fingerprint
  return hashString(fingerprint)
}

/**
 * Simple string hash (for fingerprinting)
 */
function hashString(str) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return hash.toString(36)
}

/**
 * Create session integrity token
 */
export function createSessionIntegrityToken(sessionData) {
  const fingerprint = generateBrowserFingerprint()
  const timestamp = Date.now()
  
  const integrityData = {
    fingerprint,
    timestamp,
    sessionHash: hashString(JSON.stringify(sessionData))
  }
  
  const token = btoa(JSON.stringify(integrityData))
  sessionStorage.setItem('session_integrity', token)
  
  return token
}

/**
 * Validate session integrity
 */
export function validateSessionIntegrity(sessionData) {
  try {
    const token = sessionStorage.getItem('session_integrity')
    if (!token) return false
    
    const integrityData = JSON.parse(atob(token))
    
    // Check if fingerprint matches (session hijacking detection)
    const currentFingerprint = generateBrowserFingerprint()
    if (integrityData.fingerprint !== currentFingerprint) {
      console.warn('⚠️ Session fingerprint mismatch - possible session hijacking')
      return false
    }
    
    // Check if session data has been tampered with
    const currentHash = hashString(JSON.stringify(sessionData))
    if (integrityData.sessionHash !== currentHash) {
      console.warn('⚠️ Session data hash mismatch - possible tampering')
      return false
    }
    
    // Check if integrity token is too old (24 hours max)
    const age = Date.now() - integrityData.timestamp
    const maxAge = 24 * 60 * 60 * 1000 // 24 hours
    if (age > maxAge) {
      console.warn('⚠️ Session integrity token expired')
      return false
    }
    
    return true
  } catch (error) {
    console.error('❌ Session integrity validation failed:', error)
    return false
  }
}

// ─────────────────────────────────────────────────────────────────────
//  SECURE SESSION STORAGE
// ─────────────────────────────────────────────────────────────────────

/**
 * Save session with integrity protection
 */
export function saveSecureSession(sessionKey, sessionData) {
  try {
    // Save session data
    sessionStorage.setItem(sessionKey, JSON.stringify(sessionData))
    
    // Create integrity token
    createSessionIntegrityToken(sessionData)
    
    // Ensure CSRF token exists
    if (!getCSRFToken()) {
      storeCSRFToken()
    }
    
    return true
  } catch (error) {
    console.error('❌ Failed to save secure session:', error)
    return false
  }
}

/**
 * Load session with integrity verification
 */
export function loadSecureSession(sessionKey) {
  try {
    const raw = sessionStorage.getItem(sessionKey)
    if (!raw) return null
    
    const sessionData = JSON.parse(raw)
    
    // Validate integrity
    if (!validateSessionIntegrity(sessionData)) {
      console.warn('⚠️ Session integrity validation failed, clearing session')
      clearSecureSession(sessionKey)
      return null
    }
    
    return sessionData
  } catch (error) {
    console.error('❌ Failed to load secure session:', error)
    return null
  }
}

/**
 * Clear session securely
 */
export function clearSecureSession(sessionKey) {
  try {
    sessionStorage.removeItem(sessionKey)
    sessionStorage.removeItem('session_integrity')
    sessionStorage.removeItem('csrf_token')
    sessionStorage.removeItem('csrf_token_created')
    
    // Clear memory
    window.__CSRF_TOKEN = null
  } catch (error) {
    console.error('❌ Failed to clear secure session:', error)
  }
}

/**
 * Rotate session (prevent session fixation)
 */
export function rotateSession(oldSessionKey, newSessionKey, sessionData) {
  try {
    // Clear old session
    clearSecureSession(oldSessionKey)
    
    // Create new session
    const success = saveSecureSession(newSessionKey, sessionData)
    
    if (success) {
      console.log('✅ Session rotated successfully')
    }
    
    return success
  } catch (error) {
    console.error('❌ Session rotation failed:', error)
    return false
  }
}

// ─────────────────────────────────────────────────────────────────────
//  SESSION TIMEOUT & AUTO-LOCK
// ─────────────────────────────────────────────────────────────────────

/**
 * Check if session has expired
 */
export function isSessionExpired(sessionData, maxAgeMs = 30 * 60 * 1000) {
  if (!sessionData || !sessionData.savedAt) return true
  
  const age = Date.now() - sessionData.savedAt
  return age > maxAgeMs
}

/**
 * Get session time remaining
 */
export function getSessionTimeRemaining(sessionData, maxAgeMs = 30 * 60 * 1000) {
  if (!sessionData || !sessionData.savedAt) return 0
  
  const age = Date.now() - sessionData.savedAt
  const remaining = maxAgeMs - age
  
  return Math.max(0, remaining)
}

/**
 * Get session time remaining in minutes
 */
export function getSessionMinutesRemaining(sessionData, maxAgeMs = 30 * 60 * 1000) {
  const remaining = getSessionTimeRemaining(sessionData, maxAgeMs)
  return Math.ceil(remaining / 60000)
}

// ─────────────────────────────────────────────────────────────────────
//  SECURE COOKIE UTILITIES (If cookies are used)
// ─────────────────────────────────────────────────────────────────────

/**
 * Set secure cookie with proper flags
 */
export function setSecureCookie(name, value, options = {}) {
  const {
    maxAge = 3600,           // 1 hour default
    path = '/',
    sameSite = 'Strict',     // CSRF protection
    secure = true,           // HTTPS only
    httpOnly = true,         // Not accessible via JavaScript
    domain = undefined
  } = options
  
  const cookieParts = [
    `${encodeURIComponent(name)}=${encodeURIComponent(value)}`,
    `Max-Age=${maxAge}`,
    `Path=${path}`,
    `SameSite=${sameSite}`,
  ]
  
  if (secure) {
    cookieParts.push('Secure')
  }
  
  if (httpOnly) {
    cookieParts.push('HttpOnly')
  }
  
  if (domain) {
    cookieParts.push(`Domain=${domain}`)
  }
  
  document.cookie = cookieParts.join('; ')
}

/**
 * Get cookie value
 */
export function getCookie(name) {
  const cookies = document.cookie.split(';')
  
  for (const cookie of cookies) {
    const [cookieName, cookieValue] = cookie.trim().split('=')
    
    if (decodeURIComponent(cookieName) === name) {
      return decodeURIComponent(cookieValue)
    }
  }
  
  return null
}

/**
 * Delete cookie securely
 */
export function deleteCookie(name) {
  document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Strict; Secure; HttpOnly`
}

// ─────────────────────────────────────────────────────────────────────
//  SESSION VALIDATION MIDDLEWARE
// ─────────────────────────────────────────────────────────────────────

/**
 * Validate session before sensitive operations
 */
export function validateSessionForSensitiveOperation(sessionData) {
  const checks = {
    exists: !!sessionData,
    notExpired: !isSessionExpired(sessionData),
    integrityValid: validateSessionIntegrity(sessionData),
    csrfTokenPresent: !!getCSRFToken(),
    fingerprintValid: true // Already checked in integrity validation
  }
  
  const allValid = Object.values(checks).every(Boolean)
  
  if (!allValid) {
    console.warn('⚠️ Session validation failed for sensitive operation:', checks)
  }
  
  return {
    valid: allValid,
    checks
  }
}

/**
 * Session validator for API requests
 */
export function createSessionValidator() {
  let lastValidation = 0
  const validationInterval = 5 * 60 * 1000 // Validate every 5 minutes
  
  return function(sessionData) {
    const now = Date.now()
    
    // Skip validation if recently validated
    if (now - lastValidation < validationInterval) {
      return true
    }
    
    const result = validateSessionForSensitiveOperation(sessionData)
    lastValidation = now
    
    return result.valid
  }
}

// ─────────────────────────────────────────────────────────────────────
//  ANTI-SESSION FIXATION
// ─────────────────────────────────────────────────────────────────────

/**
 * Regenerate session after authentication (prevent session fixation)
 */
export function regenerateSessionAfterAuth(oldSessionData) {
  // Clear old session completely
  clearSecureSession('dwallet_v5_session')
  
  // Generate new CSRF token
  storeCSRFToken()
  
  // Create new session with same data
  if (oldSessionData) {
    return saveSecureSession('dwallet_v5_session', oldSessionData)
  }
  
  return true
}

/**
 * Check if session might be fixed (created before authentication)
 */
export function detectSessionFixation(sessionData) {
  try {
    const integrityToken = sessionStorage.getItem('session_integrity')
    if (!integrityToken) return false
    
    const integrityData = JSON.parse(atob(integrityToken))
    const csrfCreated = sessionStorage.getItem('csrf_token_created')
    
    // If CSRF token was created before session, might be fixation
    if (csrfCreated && integrityData.timestamp > parseInt(csrfCreated)) {
      console.warn('⚠️ Possible session fixation detected')
      return true
    }
    
    return false
  } catch {
    return false
  }
}

// ─────────────────────────────────────────────────────────────────────
//  SESSION MONITORING
// ─────────────────────────────────────────────────────────────────────

/**
 * Monitor for suspicious session activity
 */
export function monitorSessionActivity(sessionData) {
  const alerts = []
  
  // Check for rapid session changes
  const lastActivity = sessionStorage.getItem('last_activity_time')
  if (lastActivity) {
    const timeSinceLastActivity = Date.now() - parseInt(lastActivity)
    if (timeSinceLastActivity < 1000) { // Less than 1 second
      alerts.push({
        type: 'rapid_activity',
        message: 'Unusually rapid session activity detected'
      })
    }
  }
  
  // Update last activity time
  sessionStorage.setItem('last_activity_time', Date.now().toString())
  
  return alerts
}

/**
 * Log security event
 */
export function logSessionSecurityEvent(event, details = {}) {
  const logEntry = {
    event,
    timestamp: new Date().toISOString(),
    fingerprint: generateBrowserFingerprint(),
    ...details
  }
  
  // Store in session for debugging (not sensitive)
  const logs = JSON.parse(sessionStorage.getItem('session_security_logs') || '[]')
  logs.push(logEntry)
  
  // Keep only last 50 entries
  if (logs.length > 50) {
    logs.splice(0, logs.length - 50)
  }
  
  sessionStorage.setItem('session_security_logs', JSON.stringify(logs))
  
  console.log('🔒 Session security event:', event, details)
}

// ─────────────────────────────────────────────────────────────────────
//  INITIALIZATION
// ─────────────────────────────────────────────────────────────────────

/**
 * Initialize secure session management
 */
export function initializeSecureSession() {
  // Generate CSRF token if not exists
  if (!getCSRFToken()) {
    storeCSRFToken()
    logSessionSecurityEvent('csrf_token_generated')
  }
  
  // Log session initialization
  logSessionSecurityEvent('session_initialized', {
    userAgent: navigator.userAgent.substring(0, 50) + '...'
  })
  
  return {
    csrfToken: getCSRFToken(),
    fingerprint: generateBrowserFingerprint()
  }
}
