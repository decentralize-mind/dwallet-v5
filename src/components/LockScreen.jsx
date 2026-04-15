import { useState, useEffect } from 'react'
import { useWallet } from '../hooks/useWallet'

export default function LockScreen() {
  const { unlockWallet, isLocked, getLockoutTimeRemaining, biometricSupported, unlockWithBiometric } = useWallet()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [lockoutTime, setLockoutTime] = useState(null)
  const [biometricLoading, setBiometricLoading] = useState(false)

  const handleUnlock = async (e) => {
    e.preventDefault()
    setError('')
    
    if (!password.trim()) {
      setError('Enter your password')
      return
    }

    setLoading(true)
    try {
      await unlockWallet(password)
      setPassword('')
    } catch (err) {
      console.error('Unlock failed:', err)
      setError(err.message || 'Incorrect password')
      
      // Check if account is now locked out
      const remaining = getLockoutTimeRemaining()
      if (remaining) {
        setLockoutTime(remaining)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleBiometricUnlock = async () => {
    setError('')
    setBiometricLoading(true)
    
    try {
      await unlockWithBiometric()
      // Biometric verified - user still needs to enter password for decryption
      // But we can show a success message
      setError('')
    } catch (err) {
      console.error('Biometric unlock failed:', err)
      setError(err.message || 'Biometric authentication failed')
    } finally {
      setBiometricLoading(false)
    }
  }

  // Update lockout timer every minute
  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = getLockoutTimeRemaining()
      setLockoutTime(remaining)
    }, 60000)
    return () => clearInterval(interval)
  }, [getLockoutTimeRemaining])

  if (!isLocked) return null

  return (
    <div className="lock-screen">
      <div className="lock-screen-content">
        {/* Logo */}
        <div className="lock-logo">
          <span style={{ fontSize: '48px' }}>◈</span>
        </div>
        
        <h1 className="lock-title">Wallet Locked</h1>
        <p className="lock-subtitle">
          Enter your password to unlock
        </p>

        {/* Lockout Warning */}
        {lockoutTime && (
          <div
            style={{
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.3)',
              padding: '12px',
              borderRadius: '8px',
              marginBottom: '20px',
              textAlign: 'center'
            }}
          >
            <p style={{ fontSize: '13px', color: '#ef4444', margin: 0, fontWeight: '600' }}>
              🔒 Too many failed attempts. Try again in {lockoutTime} minute{lockoutTime !== 1 ? 's' : ''}.
            </p>
          </div>
        )}

        {/* Unlock Form */}
        <form onSubmit={handleUnlock} className="lock-form">
          <div className="form-group">
            <input
              type="password"
              className="lock-input"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={lockoutTime > 0}
              autoFocus
              style={{
                fontSize: '16px',
                padding: '14px 16px',
                background: 'var(--bg2)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                color: 'var(--text)',
                width: '100%',
                fontFamily: 'var(--font)',
                outline: 'none'
              }}
            />
          </div>

          {error && (
            <p className="lock-error" style={{
              fontSize: '13px',
              color: '#ef4444',
              margin: '12px 0 0',
              textAlign: 'center',
              fontWeight: '500'
            }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            className="lock-button"
            disabled={loading || lockoutTime > 0}
            style={{
              marginTop: '20px',
              width: '100%',
              padding: '14px',
              background: lockoutTime > 0 ? 'var(--bg3)' : 'var(--accent)',
              color: lockoutTime > 0 ? 'var(--text3)' : 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: lockoutTime > 0 ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--font)',
              transition: 'all 0.2s'
            }}
          >
            {loading ? (
              <span>
                <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite', marginRight: '8px' }}>
                  ⟳
                </span>
                Unlocking...
              </span>
            ) : lockoutTime > 0 ? (
              `Locked (${lockoutTime}m)`
            ) : (
              'Unlock Wallet'
            )}
          </button>

          {/* Biometric Unlock Button */}
          {biometricSupported && (
            <>
              <div style={{ 
                textAlign: 'center', 
                margin: '20px 0',
                color: 'var(--text3)',
                fontSize: '13px'
              }}>
                — or —
              </div>
              <button
                type="button"
                onClick={handleBiometricUnlock}
                disabled={biometricLoading || lockoutTime > 0}
                style={{
                  width: '100%',
                  padding: '14px',
                  background: 'var(--bg3)',
                  color: 'var(--text)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: biometricLoading || lockoutTime > 0 ? 'not-allowed' : 'pointer',
                  fontFamily: 'var(--font)',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                {biometricLoading ? (
                  <>
                    <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⟳</span>
                    Authenticating...
                  </>
                ) : (
                  <>
                    <span style={{ fontSize: '20px' }}>👆</span>
                    Use Biometric (Touch ID / Face ID)
                  </>
                )}
              </button>
            </>
          )}
        </form>

        {/* Security Info */}
        <div className="lock-security-info" style={{
          marginTop: '32px',
          padding: '16px',
          background: 'var(--bg2)',
          borderRadius: '8px',
          border: '1px solid var(--border)'
        }}>
          <p style={{ fontSize: '12px', color: 'var(--text3)', margin: 0, textAlign: 'center', lineHeight: '1.6' }}>
            🔒 Your wallet is encrypted and secure<br />
            Wrong password? Your wallet data is safe — just try again
          </p>
        </div>

        {/* Anti-Phishing Code (if set) */}
        {(() => {
          const code = localStorage.getItem('dwallet_phishing_code')
          if (code) {
            return (
              <div style={{
                marginTop: '16px',
                padding: '12px',
                background: 'rgba(99,102,241,0.1)',
                border: '1px solid rgba(99,102,241,0.3)',
                borderRadius: '8px',
                textAlign: 'center'
              }}>
                <p style={{ fontSize: '11px', color: 'var(--text3)', margin: '0 0 4px' }}>
                  Your security code:
                </p>
                <p style={{ 
                  fontSize: '20px', 
                  fontWeight: 'bold', 
                  color: 'var(--accent)',
                  margin: 0,
                  letterSpacing: '4px'
                }}>
                  {code}
                </p>
              </div>
            )
          }
          return null
        })()}
      </div>

      {/* CSS Animation */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
