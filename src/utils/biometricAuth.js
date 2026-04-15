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

    // Create a new credential
    const challenge = crypto.getRandomValues(new Uint8Array(32))
    const userId = crypto.getRandomValues(new Uint8Array(16))
    
    const credential = await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: {
          name: 'Toklo Wallet',
          id: window.location.hostname
        },
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
      throw new Error('No biometric credential found')
    }

    // Create authentication request
    const challenge = crypto.getRandomValues(new Uint8Array(32))
    
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge,
        allowCredentials: [{
          id: base64ToArrayBuffer(credentialData.id),
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
 * Helper: Convert ArrayBuffer to base64 string
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
