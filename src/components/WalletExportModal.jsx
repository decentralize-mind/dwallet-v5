import { useState } from 'react'
import { useWallet } from '../hooks/useWallet'

export default function WalletExportModal({ walletIndex, onSuccess, onCancel }) {
  const { wallets, ensureKeys } = useWallet()
  const [step, setStep] = useState('password') // 'password', 'show', 'confirm'
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [seedPhrase, setSeedPhrase] = useState('')
  const [copied, setCopied] = useState(false)
  const [confirmed, setConfirmed] = useState(false)

  const walletMeta = wallets[walletIndex]

  // Step 1: Verify password and decrypt wallet
  const handleVerify = async (e) => {
    e.preventDefault()
    if (!password) {
      setError('Password is required')
      return
    }

    setLoading(true)
    setError('')

    try {
      const walletStorageKey = `dwallet_v5_encrypted_${walletMeta.id}`
      const stored = localStorage.getItem(walletStorageKey)
      
      if (!stored) {
        setError('Wallet data not found')
        return
      }

      // Decrypt wallet to get seed phrase
      const { decryptData } = await import('../utils/crypto')
      const walletData = JSON.parse(await decryptData(stored, password))
      
      if (!walletData.mnemonic) {
        setError('This wallet does not have a seed phrase (possibly a hardware wallet)')
        return
      }

      setSeedPhrase(walletData.mnemonic)
      setStep('show')
    } catch (err) {
      setError('Incorrect password. Please try again.')
      setPassword('')
    } finally {
      setLoading(false)
    }
  }

  // Step 3: Confirm and close
  const handleConfirm = () => {
    if (confirmed) {
      onSuccess()
    }
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(seedPhrase)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
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
          width: '95%',
          maxWidth: 500,
          maxHeight: '85vh',
          overflowY: 'auto',
          padding: '24px',
          boxShadow: '0 8px 40px rgba(0,0,0,0.25)',
          animation: 'fadeIn 0.2s ease',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 20,
          }}
        >
          <h3
            style={{
              fontSize: 18,
              fontWeight: 700,
              margin: 0,
              color: 'var(--text)',
            }}
          >
            {step === 'password' && 'Export Wallet'}
            {step === 'show' && 'Your Seed Phrase'}
            {step === 'confirm' && 'Confirmation'}
          </h3>
          <button
            onClick={onCancel}
            style={{
              background: 'var(--bg3)',
              border: '1px solid var(--border)',
              borderRadius: '50%',
              width: 30,
              height: 30,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: 13,
              color: 'var(--text2)',
            }}
          >
            ✕
          </button>
        </div>

        {/* Step 1: Password Verification */}
        {step === 'password' && (
          <div>
            <div
              style={{
                padding: 16,
                background: 'rgba(239,68,68,0.1)',
                borderRadius: 12,
                marginBottom: 20,
                border: '1px solid rgba(239,68,68,0.2)',
              }}
            >
              <p style={{ fontSize: 13, color: '#ef4444', margin: '0 0 8px', fontWeight: 600 }}>
                ⚠️ Security Warning
              </p>
              <p style={{ fontSize: 12, color: 'var(--text2)', margin: 0, lineHeight: 1.5 }}>
                Your seed phrase gives full access to your wallet. Never share it with anyone 
                or store it digitally. Only export if you plan to write it down on paper.
              </p>
            </div>

            <p
              style={{
                fontSize: 13,
                color: 'var(--text2)',
                margin: '0 0 16px',
                lineHeight: 1.5,
              }}
            >
              Enter password for <strong>{walletMeta?.name || 'Wallet'}</strong> to decrypt your seed phrase:
            </p>

            <form onSubmit={handleVerify}>
              <div
                style={{
                  position: 'relative',
                  marginBottom: 16,
                }}
              >
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={e => {
                    setPassword(e.target.value)
                    setError('')
                  }}
                  placeholder="Enter wallet password"
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
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  style={{
                    position: 'absolute',
                    right: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
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
                    fontSize: 13,
                    color: '#ef4444',
                    background: 'rgba(239,68,68,0.1)',
                    padding: '10px 12px',
                    borderRadius: 8,
                    margin: '0 0 16px',
                  }}
                >
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading || !password}
                style={{
                  width: '100%',
                  padding: '14px',
                  background: loading || !password ? 'rgba(99,102,241,0.3)' : 'var(--accent)',
                  border: 'none',
                  borderRadius: 10,
                  color: 'white',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: loading || !password ? 'not-allowed' : 'pointer',
                  fontFamily: 'var(--font)',
                  opacity: loading || !password ? 0.6 : 1,
                }}
              >
                {loading ? 'Decrypting...' : 'Decrypt & Show Seed Phrase'}
              </button>
            </form>
          </div>
        )}

        {/* Step 2: Show Seed Phrase */}
        {step === 'show' && (
          <div>
            <div
              style={{
                padding: 16,
                background: 'rgba(245,158,11,0.1)',
                borderRadius: 12,
                marginBottom: 20,
                border: '1px solid rgba(245,158,11,0.2)',
              }}
            >
              <p style={{ fontSize: 13, color: '#f59e0b', margin: '0 0 8px', fontWeight: 600 }}>
                🔐 Keep this secure and private
              </p>
              <p style={{ fontSize: 12, color: 'var(--text2)', margin: 0, lineHeight: 1.5 }}>
                Write down these words in order. Store in a safe place. Never share digitally.
              </p>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 8,
                marginBottom: 16,
                padding: 16,
                background: 'var(--bg3)',
                borderRadius: 12,
                border: '1px solid var(--border)',
              }}
            >
              {seedPhrase.split(' ').map((word, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '8px',
                    background: 'var(--bg2)',
                    borderRadius: 6,
                    textAlign: 'center',
                    border: '1px solid var(--border)',
                  }}
                >
                  <span
                    style={{
                      fontSize: 10,
                      color: 'var(--text3)',
                      display: 'block',
                      marginBottom: 4,
                    }}
                  >
                    {idx + 1}
                  </span>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: 'var(--text)',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    {word}
                  </span>
                </div>
              ))}
            </div>

            <button
              onClick={handleCopy}
              style={{
                width: '100%',
                padding: '12px',
                background: copied ? 'rgba(16,185,129,0.1)' : 'var(--bg3)',
                border: `1px solid ${copied ? 'rgba(16,185,129,0.3)' : 'var(--border)'}`,
                borderRadius: 10,
                color: copied ? '#10b981' : 'var(--text2)',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'var(--font)',
                marginBottom: 16,
              }}
            >
              {copied ? '✓ Copied to clipboard' : '📋 Copy to clipboard'}
            </button>

            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 16,
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={confirmed}
                onChange={e => setConfirmed(e.target.checked)}
                style={{
                  width: 18,
                  height: 18,
                  cursor: 'pointer',
                }}
              />
              <span style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.4 }}>
                I understand the security risks and have stored this securely
              </span>
            </label>

            <button
              onClick={handleConfirm}
              disabled={!confirmed}
              style={{
                width: '100%',
                padding: '14px',
                background: confirmed ? 'var(--accent)' : 'var(--bg3)',
                border: 'none',
                borderRadius: 10,
                color: confirmed ? 'white' : 'var(--text3)',
                fontSize: 14,
                fontWeight: 600,
                cursor: confirmed ? 'pointer' : 'not-allowed',
                fontFamily: 'var(--font)',
                opacity: confirmed ? 1 : 0.5,
              }}
            >
              I've Saved My Seed Phrase
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
