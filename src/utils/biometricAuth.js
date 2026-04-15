/**
 * Biometric Authentication Utility (WebAuthn)
 * Supports: Touch ID, Face ID, Windows Hello, Android Biometric
 */

const CREDENTIAL_KEY = 'dwallet_biometric_credential'
const BIOMETRIC_ENABLED_KEY = 'dwallet_biometric_enabled'

/**
 * Check if biometric authentication is supported
 */
export function isBiometricSupported() {
  return window.PublicKeyCredential !== undefined && 
         navigator.credentials !== undefined
}

/**
 * Check if biometrics are enabled for this wallet
 */
export function isBiometricEnabled() {
  return localStorage.getItem(BIOMETRIC_ENABLED_KEY) === 'true'
}

/**
 * Enable biometric authentication
 * Creates a new credential linked to the wallet
 */
export async function enableBiometric(walletAddress, password) {
  try {
    if (!isBiometricSupported()) {
      throw new Error('Biometric authentication is not supported on this device')
    }

    // Clear any existing corrupted credentials first
    const existingCred = localStorage.getItem(CREDENTIAL_KEY)
    if (existingCred) {
      console.log('⚠️  Clearing existing biometric credential before re-enabling')
      disableBiometric()
    }

    // Create a new credential
    const challenge = crypto.getRandomValues(new Uint8Array(32))
    const userId = crypto.getRandomValues(new Uint8Array(16))
    
    // For localhost or empty hostname, don't specify rp.id (use default)
    const rpConfig = {
      name: 'Toklo Wallet'
    }
    
    // Only set rp.id for non-localhost domains
    if (window.location.hostname && 
        window.location.hostname !== 'localhost' && 
        window.location.hostname !== '127.0.0.1') {
      rpConfig.id = window.location.hostname
    }
    
    const credential = await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: rpConfig,
        user: {
          id: userId,
          name: walletAddress,
          displayName: 'Toklo Wallet User'
        },
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' },   // ES256
          { alg: -257, type: 'public-key' }  // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform', // Use platform authenticator (Touch ID, Face ID, etc.)
          userVerification: 'required',
          residentKey: 'required'
        },
        timeout: 60000,
        attestation: 'direct'
      }
    })

    // Store credential info (not the private key - that stays in secure enclave)
    const publicKey = credential.response.getPublicKey ? credential.response.getPublicKey() : new Uint8Array(0)
    const credentialData = {
      id: credential.id,
      rawId: arrayBufferToBase64Url(credential.rawId),
      publicKey: arrayBufferToBase64(publicKey),
      createdAt: Date.now()
    }

    localStorage.setItem(CREDENTIAL_KEY, JSON.stringify(credentialData))
    localStorage.setItem(BIOMETRIC_ENABLED_KEY, 'true')

    console.log('✅ Biometric authentication enabled')
    return credentialData
  } catch (error) {
    console.error('Failed to enable biometric:', error)
    throw error
  }
}

/**
 * Authenticate using biometrics
 * Returns success if authentication passes
 */
export async function authenticateWithBiometric() {
  try {
    if (!isBiometricSupported()) {
      throw new Error('Biometric authentication is not supported')
    }

    if (!isBiometricEnabled()) {
      throw new Error('Biometric authentication is not enabled')
    }

    const credentialData = JSON.parse(localStorage.getItem(CREDENTIAL_KEY))
    if (!credentialData) {
      throw new Error('No biometric credential found. Please set up biometric authentication first.')
    }

    // Check if we have the rawId (new format)
    if (!credentialData.rawId) {
      console.warn('⚠️  Old credential format detected. Please re-enable biometric.')
      throw new Error('Biometric credential is outdated. Please disable and re-enable biometric authentication.')
    }

    // Create authentication request
    const challenge = crypto.getRandomValues(new Uint8Array(32))
    
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge,
        allowCredentials: [{
          id: base64UrlToArrayBuffer(credentialData.rawId),
          type: 'public-key',
          transports: ['internal']
        }],
        timeout: 60000,
        userVerification: 'required'
      }
    })

    console.log('✅ Biometric authentication successful')
    return {
      success: true,
      credentialId: assertion.id
    }
  } catch (error) {
    console.error('Biometric authentication failed:', error)
    
    // Provide user-friendly error messages
    if (error.name === 'NotAllowedError') {
      throw new Error('Biometric authentication was cancelled or failed. Please try again or use your password.')
    }
    
    if (error.message && error.message.includes('atob')) {
      throw new Error('Biometric credential is corrupted. Please disable and re-enable biometric authentication.')
    }
    
    throw error
  }
}

/**
 * Disable biometric authentication
 */
export function disableBiometric() {
  localStorage.removeItem(CREDENTIAL_KEY)
  localStorage.removeItem(BIOMETRIC_ENABLED_KEY)
  console.log('✅ Biometric authentication disabled')
}

/**
 * Check if platform authenticator is available
 */
export async function isPlatformAuthenticatorAvailable() {
  try {
    if (isBiometricSupported() && PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable) {
      return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
    }
    return false
  } catch {
    return false
  }
}

/**
 * Get biometric status info
 */
export function getBiometricStatus() {
  const supported = isBiometricSupported()
  const enabled = isBiometricEnabled()
  const credential = localStorage.getItem(CREDENTIAL_KEY)
  
  return {
    supported,
    enabled,
    hasCredential: !!credential,
    credential: credential ? JSON.parse(credential) : null
  }
}

/**
 * Helper: Convert ArrayBuffer to base64 string (standard)
 */
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return window.btoa(binary)
}

/**
 * Helper: Convert ArrayBuffer to base64url string (URL-safe)
 */
function arrayBufferToBase64Url(buffer) {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  // Convert to base64url (replace + with -, / with _, remove =)
  return window.btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

/**
 * Helper: Convert base64url string to ArrayBuffer
 */
function base64UrlToArrayBuffer(base64url) {
  // If it's already an ArrayBuffer, return it
  if (base64url instanceof ArrayBuffer) {
    return base64url
  }
  
  // Convert base64url back to standard base64
  const base64 = base64url
    .replace(/-/g, '+')
    .replace(/_/g, '/')
  
  // Add padding if needed
  const pad = base64.length % 4
  const paddedBase64 = pad ? base64 + '='.repeat(4 - pad) : base64
  
  // Decode base64 string
  const binaryString = window.atob(paddedBase64)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return bytes.buffer
}

/**
 * Helper: Convert base64 string to ArrayBuffer
 */
function base64ToArrayBuffer(base64) {
  // If it's already an ArrayBuffer (from storage), return it
  if (base64 instanceof ArrayBuffer) {
    return base64
  }
  
  // Decode base64 string
  const binaryString = window.atob(base64)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return bytes.buffer
}
