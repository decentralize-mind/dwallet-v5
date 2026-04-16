import { useState } from 'react'
import { useWallet } from '../hooks/useWallet'
import { mnemonicToSeedSync } from '../utils/bip39'
import { deriveWalletFromSeed } from '../utils/crypto'

export default function WalletImportModal({ onSuccess, onCancel }) {
  const { addWallet, notify } = useWallet()
  const [step, setStep] = useState('input') // 'input', 'password'
  const [seedPhrase, setSeedPhrase] = useState('')
  const [walletData, setWalletData] = useState(null)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Step 1: Validate and import seed phrase
  const handleImport = () => {
    setError('')
    
    const words = seedPhrase.trim().split(/\s+/)
    
    if (words.length !== 12 && words.length !== 24) {
      setError('Seed phrase must be 12 or 24 words')
      return
    }

    // Validate each word
    const validWords = words.every(word => /^[a-z]+$/i.test(word))
    if (!validWords) {
      setError('Seed phrase contains invalid characters')
      return
    }

    try {
      const seed = mnemonicToSeedSync(seedPhrase.trim())
      const derived = deriveWalletFromSeed(seed, 0)
      
      const data = {
        mnemonic: seedPhrase.trim(),
        accounts: [
          {
            name: 'Account 1',
            address: derived.address,
            privateKey: derived.privateKey,
            index: 0,
          },
        ],
        activeAccount: 0,
        createdAt: Date.now(),
        imported: true,
      }
      
      setWalletData(data)
      setStep('password')
    } catch (err) {
      setError('Invalid seed phrase. Please check and try again.')
    }
  }

  // Step 2: Set password and save wallet
  const handleSave = async () => {
    if (!password || password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    setError('')

    try {
      await addWallet(walletData, password)
      notify('✓ Wallet imported successfully', 'success')
      onSuccess()
    } catch (err) {
      setError(err.message || 'Failed to import wallet')
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
            {step === 'input' ? 'Import Wallet' : 'Set Password'}
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

        {/* Step 1: Input Seed Phrase */}
        {step === 'input' && (
          <div>
            <div
              style={{
                padding: 16,
                background: 'rgba(59,130,246,0.1)',
                borderRadius: 12,
                marginBottom: 20,
                border: '1px solid rgba(59,130,246,0.2)',
              }}
            >
              <p style={{ fontSize: 13, color: '#3b82f6', margin: '0 0 8px', fontWeight: 600 }}>
                🔑 Enter your seed phrase
              </p>
              <p style={{ fontSize: 12, color: 'var(--text2)', margin: 0, lineHeight: 1.5 }}>
                Enter your 12 or 24 word recovery phrase. Words should be separated by spaces.
              </p>
            </div>

            <textarea
              value={seedPhrase}
              onChange={e => {
                setSeedPhrase(e.target.value)
                setError('')
              }}
              placeholder="Enter your 12 or 24 word seed phrase..."
              rows={4}
              style={{
                width: '100%',
                padding: '12px',
                background: 'var(--bg3)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                fontSize: 14,
                color: 'var(--text)',
                fontFamily: 'var(--font-mono)',
                outline: 'none',
                resize: 'vertical',
                marginBottom: 16,
                lineHeight: 1.6,
              }}
            />

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

            <div
              style={{
                display: 'flex',
                gap: 10,
              }}
            >
              <button
                onClick={handleImport}
                disabled={loading || !seedPhrase.trim()}
                style={{
                  flex: 1,
                  padding: '14px',
                  background: loading || !seedPhrase.trim() ? 'rgba(99,102,241,0.3)' : 'var(--accent)',
                  border: 'none',
                  borderRadius: 10,
                  color: 'white',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: loading || !seedPhrase.trim() ? 'not-allowed' : 'pointer',
                  fontFamily: 'var(--font)',
                  opacity: loading || !seedPhrase.trim() ? 0.6 : 1,
                }}
              >
                {loading ? 'Validating...' : 'Continue'}
              </button>
            </div>

            <p
              style={{
                fontSize: 11,
                color: 'var(--text3)',
                textAlign: 'center',
                margin: '16px 0 0',
                lineHeight: 1.5,
              }}
            >
              🔒 Your seed phrase is encrypted and never leaves your device
            </p>
          </div>
        )}

        {/* Step 2: Set Password */}
        {step === 'password' && (
          <div>
            <div
              style={{
                padding: 16,
                background: 'rgba(16,185,129,0.1)',
                borderRadius: 12,
                marginBottom: 20,
                border: '1px solid rgba(16,185,129,0.2)',
              }}
            >
              <p style={{ fontSize: 13, color: '#10b981', margin: '0 0 8px', fontWeight: 600 }}>
                ✓ Seed phrase validated
              </p>
              <p style={{ fontSize: 12, color: 'var(--text2)', margin: 0, lineHeight: 1.5 }}>
                Set a strong password to encrypt this wallet. You'll need this password to access your wallet.
              </p>
            </div>

            <div style={{ marginBottom: 12 }}>
              <div
                style={{
                  position: 'relative',
                  marginBottom: 12,
                }}
              >
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={e => {
                    setPassword(e.target.value)
                    setError('')
                  }}
                  placeholder="Password (min 8 characters)"
                  style={{
                    width: '100%',
                    padding: '12px 40px 12px 12px',
                    background: 'var(--bg3)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
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

              <input
                type={showPwd ? 'text' : 'password'}
                value={confirmPassword}
                onChange={e => {
                  setConfirmPassword(e.target.value)
                  setError('')
                }}
                placeholder="Confirm password"
                style={{
                  width: '100%',
                  padding: '12px',
                  background: 'var(--bg3)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  fontSize: 14,
                  color: 'var(--text)',
                  fontFamily: 'var(--font)',
                  outline: 'none',
                }}
              />
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
              onClick={handleSave}
              disabled={loading || !password || !confirmPassword}
              style={{
                width: '100%',
                padding: '14px',
                background: loading || !password || !confirmPassword ? 'rgba(99,102,241,0.3)' : 'var(--accent)',
                border: 'none',
                borderRadius: 10,
                color: 'white',
                fontSize: 14,
                fontWeight: 600,
                cursor: loading || !password || !confirmPassword ? 'not-allowed' : 'pointer',
                fontFamily: 'var(--font)',
                opacity: loading || !password || !confirmPassword ? 0.6 : 1,
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
                  Importing Wallet...
                </span>
              ) : (
                'Import Wallet'
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
