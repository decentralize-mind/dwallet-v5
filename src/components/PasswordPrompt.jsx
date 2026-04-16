import { useState } from 'react'
import { useWallet } from '../hooks/useWallet'

export default function PasswordPrompt({ 
  title = 'Enter Password',
  message = 'Please enter your password to continue',
  onSuccess, 
  onCancel,
  buttonText = 'Continue',
  showBiometric = false,
  onBiometricClick
}) {
  const { verifyPassword, notify } = useWallet()
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!password) {
      setError('Password is required')
      return
    }

    setLoading(true)
    setError('')

    try {
      const mnemonic = await verifyPassword(password)
      if (mnemonic !== null) {
        notify('✓ Password verified', 'success')
        onSuccess(password)
      } else {
        setError('Incorrect password. Please try again.')
        setPassword('')
      }
    } catch (err) {
      setError(err.message || 'Password verification failed')
      setPassword('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="modal-overlay"
      onClick={onCancel}
      style={{ alignItems: 'center', justifyContent: 'center' }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--bg2)',
          borderRadius: '20px',
          width: '90%',
          maxWidth: 400,
          padding: '24px',
          boxShadow: '0 8px 40px rgba(0,0,0,0.25)',
          animation: 'fadeIn 0.2s ease',
        }}
      >
        <h3
          style={{
            fontSize: 18,
            fontWeight: 700,
            margin: '0 0 8px',
            color: 'var(--text)',
          }}
        >
          {title}
        </h3>
        <p
          style={{
            fontSize: 13,
            color: 'var(--text2)',
            margin: '0 0 20px',
            lineHeight: 1.5,
          }}
        >
          {message}
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <div
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <input
                type={showPwd ? 'text' : 'password'}
                value={password}
                onChange={e => {
                  setPassword(e.target.value)
                  setError('')
                }}
                placeholder="Enter password"
                autoFocus
                style={{
                  width: '100%',
                  padding: '12px 40px 12px 12px',
                  background: 'var(--bg3)',
                  border: error ? '1.5px solid #ef4444' : '1px solid var(--border)',
                  borderRadius: 10,
                  fontSize: 14,
                  color: 'var(--text)',
                  fontFamily: 'var(--font)',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPwd(!showPwd)}
                style={{
                  position: 'absolute',
                  right: 12,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 16,
                  padding: 4,
                  opacity: 0.6,
                }}
              >
                {showPwd ? '🙈' : '👁️'}
              </button>
            </div>
            {error && (
              <p
                style={{
                  fontSize: 12,
                  color: '#ef4444',
                  margin: '8px 0 0',
                  lineHeight: 1.4,
                }}
              >
                {error}
              </p>
            )}
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            <button
              type="submit"
              disabled={loading || !password}
              style={{
                padding: '14px',
                background: loading || !password ? 'rgba(99,102,241,0.3)' : 'var(--accent)',
                border: 'none',
                borderRadius: 10,
                color: 'white',
                fontSize: 14,
                fontWeight: 600,
                cursor: loading || !password ? 'not-allowed' : 'pointer',
                fontFamily: 'var(--font)',
                transition: 'all 0.2s',
                opacity: loading || !password ? 0.6 : 1,
              }}
            >
              {loading ? (
                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                  }}
                >
                  <span
                    style={{
                      width: 16,
                      height: 16,
                      border: '2px solid rgba(255,255,255,0.3)',
                      borderTopColor: 'white',
                      borderRadius: '50%',
                      display: 'inline-block',
                      animation: 'spin 0.8s linear infinite',
                    }}
                  />
                  Verifying...
                </span>
              ) : (
                buttonText
              )}
            </button>
            {showBiometric && onBiometricClick && (
              <button
                type="button"
                onClick={onBiometricClick}
                disabled={loading}
                style={{
                  padding: '14px',
                  background: 'var(--bg3)',
                  border: '1px solid var(--border)',
                  borderRadius: 10,
                  color: 'var(--text)',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontFamily: 'var(--font)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  opacity: loading ? 0.5 : 1,
                }}
              >
                <span style={{ fontSize: 18 }}>👆</span>
                Use Biometric (Face ID / Touch ID)
              </button>
            )}
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              style={{
                padding: '12px',
                background: 'none',
                border: 'none',
                color: 'var(--text3)',
                fontSize: 13,
                cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily: 'var(--font)',
                opacity: loading ? 0.5 : 1,
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
