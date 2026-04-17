import { useState } from 'react'
import { useWallet } from '../hooks/useWallet'
import { generateMnemonic, mnemonicToSeedSync } from '../utils/bip39'
import { deriveWalletFromSeed } from '../utils/crypto'

export default function WalletCreationModal({ onSuccess, onCancel }) {
  const { addWallet, notify } = useWallet()
  const [step, setStep] = useState('create') // 'create', 'backup', 'verify', 'password'
  const [mnemonic, setMnemonic] = useState('')
  const [walletData, setWalletData] = useState(null)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [verifyWords, setVerifyWords] = useState({})
  const [verifyError, setVerifyError] = useState('')
  const [seedLength, setSeedLength] = useState(12)  // 12 or 24 words

  // Step 1: Generate new wallet
  const handleGenerate = async () => {
    setLoading(true)
    setError('')
    
    try {
      const newMnemonic = generateMnemonic(seedLength)
      const seed = mnemonicToSeedSync(newMnemonic)
      const derived = deriveWalletFromSeed(seed, 0)
      
      const data = {
        mnemonic: newMnemonic,
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
      }
      
      setMnemonic(newMnemonic)
      setWalletData(data)
      setStep('backup')
    } catch (err) {
      setError('Failed to generate wallet. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Step 3: Verify seed phrase
  const handleVerify = () => {
    const words = mnemonic.split(' ')
    const verifyIndices = [0, Math.floor(words.length / 2), words.length - 1]
    
    let allCorrect = true
    verifyIndices.forEach(idx => {
      if (verifyWords[idx]?.trim().toLowerCase() !== words[idx].toLowerCase()) {
        allCorrect = false
      }
    })
    
    if (allCorrect) {
      setStep('password')
    } else {
      setVerifyError('Incorrect words. Please check your answers.')
    }
  }

  // Step 4: Create wallet with password
  const handleCreate = async () => {
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
      notify('✓ Wallet created successfully', 'success')
      onSuccess()
    } catch (err) {
      setError(err.message || 'Failed to create wallet')
    } finally {
      setLoading(false)
    }
  }

  const words = mnemonic.split(' ')
  const verifyIndices = words.length > 0 ? [0, Math.floor(words.length / 2), words.length - 1] : []

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
            {step === 'create' && 'Create New Wallet'}
            {step === 'backup' && 'Backup Seed Phrase'}
            {step === 'verify' && 'Verify Seed Phrase'}
            {step === 'password' && 'Set Password'}
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

        {/* Step 1: Create */}
        {step === 'create' && (
          <div>
            <div
              style={{
                padding: 20,
                background: 'rgba(99,102,241,0.1)',
                borderRadius: 12,
                marginBottom: 20,
                border: '1px solid rgba(99,102,241,0.2)',
              }}
            >
              <p style={{ fontSize: 24, margin: '0 0 8px' }}>🔐</p>
              <p
                style={{
                  fontSize: 14,
                  color: 'var(--text)',
                  margin: 0,
                  lineHeight: 1.6,
                }}
              >
                A new wallet will be generated with a unique seed phrase. 
                This phrase is the only way to recover your wallet.
              </p>
            </div>

            <div
              style={{
                display: 'flex',
                gap: 10,
                marginBottom: 20,
              }}
            >
              {[12, 24].map(length => (
                <button
                  key={length}
                  onClick={() => setSeedLength(length)}
                  style={{
                    flex: 1,
                    padding: '14px 16px',
                    background: seedLength === length ? 'rgba(99,102,241,0.1)' : 'var(--bg3)',
                    border: `2px solid ${seedLength === length ? 'var(--accent)' : 'var(--border)'}`,
                    borderRadius: 10,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    textAlign: 'center',
                  }}
                >
                  <div
                    style={{
                      fontSize: 18,
                      fontWeight: 700,
                      color: seedLength === length ? 'var(--accent)' : 'var(--text)',
                      marginBottom: 4,
                    }}
                  >
                    {length} words
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: seedLength === length ? 'var(--accent)' : 'var(--text3)',
                    }}
                  >
                    {length === 12 ? 'Standard' : 'Extended'}
                  </div>
                </button>
              ))}
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
              onClick={handleGenerate}
              disabled={loading}
              style={{
                width: '100%',
                padding: '14px',
                background: loading ? 'rgba(99,102,241,0.3)' : 'var(--accent)',
                border: 'none',
                borderRadius: 10,
                color: 'white',
                fontSize: 14,
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily: 'var(--font)',
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? 'Generating...' : 'Generate New Wallet'}
            </button>
          </div>
        )}

        {/* Step 2: Backup */}
        {step === 'backup' && (
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
                ⚠️ Important: Write down these words in order
              </p>
              <p style={{ fontSize: 12, color: 'var(--text2)', margin: 0, lineHeight: 1.5 }}>
                This seed phrase is the ONLY way to recover your wallet. 
                Never share it with anyone or store it digitally.
              </p>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 8,
                marginBottom: 20,
              }}
            >
              {words.map((word, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '10px 8px',
                    background: 'var(--bg3)',
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    textAlign: 'center',
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
                I have written down my seed phrase securely
              </span>
            </label>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setStep('verify')}
                disabled={!confirmed}
                style={{
                  flex: 1,
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
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Verify */}
        {step === 'verify' && (
          <div>
            <p
              style={{
                fontSize: 13,
                color: 'var(--text2)',
                margin: '0 0 16px',
                lineHeight: 1.5,
              }}
            >
              Enter the words for positions shown below to verify you've saved your seed phrase:
            </p>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                marginBottom: 20,
              }}
            >
              {verifyIndices.map(idx => (
                <div key={idx}>
                  <label
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: 'var(--text2)',
                      marginBottom: 6,
                      display: 'block',
                    }}
                  >
                    Word #{idx + 1}
                  </label>
                  <input
                    type="text"
                    value={verifyWords[idx] || ''}
                    onChange={e => {
                      setVerifyWords({ ...verifyWords, [idx]: e.target.value })
                      setVerifyError('')
                    }}
                    placeholder={`Enter word ${idx + 1}`}
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: 'var(--bg3)',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      fontSize: 14,
                      color: 'var(--text)',
                      fontFamily: 'var(--font-mono)',
                      outline: 'none',
                    }}
                  />
                </div>
              ))}
            </div>

            {verifyError && (
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
                {verifyError}
              </p>
            )}

            <button
              onClick={handleVerify}
              style={{
                width: '100%',
                padding: '14px',
                background: 'var(--accent)',
                border: 'none',
                borderRadius: 10,
                color: 'white',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'var(--font)',
              }}
            >
              Verify & Continue
            </button>
          </div>
        )}

        {/* Step 4: Password */}
        {step === 'password' && (
          <div>
            <p
              style={{
                fontSize: 13,
                color: 'var(--text2)',
                margin: '0 0 16px',
                lineHeight: 1.5,
              }}
            >
              Set a strong password to encrypt your wallet. This password is required to unlock your wallet.
            </p>

            <div style={{ marginBottom: 12 }}>
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
                  padding: '12px',
                  background: 'var(--bg3)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  fontSize: 14,
                  color: 'var(--text)',
                  fontFamily: 'var(--font)',
                  outline: 'none',
                  marginBottom: 12,
                }}
              />
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
              onClick={handleCreate}
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
                  Creating Wallet...
                </span>
              ) : (
                'Create Wallet'
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
