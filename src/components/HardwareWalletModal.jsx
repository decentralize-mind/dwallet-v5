import { useState } from 'react'
import { useWallet } from '../hooks/useWallet'
import { 
  connectLedger, 
  getLedgerAddress,
  getHardwareWalletIcon,
  getHardwareWalletName,
  checkHardwareWalletSupport 
} from '../utils/hardwareWallet'

const HARDWARE_WALLET_TYPES = [
  {
    type: 'ledger',
    name: 'Ledger',
    icon: '🔷',
    description: 'Ledger Nano S, Nano X, Nano S Plus',
    supported: true,
  },
  {
    type: 'trezor',
    name: 'Trezor',
    icon: '🔶',
    description: 'Trezor One, Model T, Safe 3',
    supported: true,
  },
  {
    type: 'walletconnect',
    name: 'WalletConnect',
    icon: '📱',
    description: 'Mobile hardware wallets via QR code',
    supported: true,
  },
]

export default function HardwareWalletModal({ onSuccess, onCancel }) {
  const { addWallet, notify } = useWallet()
  const [step, setStep] = useState('select') // 'select', 'connecting', 'connected', 'password'
  const [selectedType, setSelectedType] = useState(null)
  const [connection, setConnection] = useState(null)
  const [address, setAddress] = useState(null)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [derivationPath, setDerivationPath] = useState("44'/60'/0'/0/0")

  const support = checkHardwareWalletSupport()

  // Step 1: Select hardware wallet type
  const handleSelectType = (type) => {
    setSelectedType(type)
    setStep('connecting')
    handleConnect(type)
  }

  // Step 2: Connect to hardware wallet
  const handleConnect = async (type) => {
    setLoading(true)
    setError('')

    try {
      if (type === 'ledger') {
        const conn = await connectLedger()
        const addr = await getLedgerAddress(conn.eth, derivationPath)
        
        setConnection(conn)
        setAddress(addr)
        setStep('connected')
      } else if (type === 'trezor') {
        // Trezor requires initialization first
        setError('Trezor support coming soon. Please use Ledger or WalletConnect.')
        setStep('select')
      } else if (type === 'walletconnect') {
        setError('WalletConnect support coming soon. Please use Ledger for now.')
        setStep('select')
      }
    } catch (err) {
      setError(err.message || 'Failed to connect')
      setStep('select')
    } finally {
      setLoading(false)
    }
  }

  // Step 3: Save hardware wallet with password
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
      const walletName = `${getHardwareWalletName(selectedType)} ${address.slice(0, 6)}`
      
      // Create wallet data structure for hardware wallet
      const walletData = {
        mnemonic: null, // Hardware wallets don't expose seed phrases
        accounts: [
          {
            name: 'Account 1',
            address: address,
            privateKey: null, // Hardware wallets don't expose private keys
            index: 0,
            isHardware: true,
            hardwareType: selectedType,
            derivationPath: derivationPath,
          },
        ],
        activeAccount: 0,
        createdAt: Date.now(),
        isHardwareWallet: true,
        hardwareType: selectedType,
      }

      await addWallet(walletData, password)
      notify(`✓ ${walletName} added`, 'success')
      onSuccess()
    } catch (err) {
      setError(err.message || 'Failed to save wallet')
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
            {step === 'select' && 'Connect Hardware Wallet'}
            {step === 'connecting' && 'Connecting...'}
            {step === 'connected' && 'Wallet Connected'}
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

        {/* Step 1: Select Type */}
        {step === 'select' && (
          <div>
            <p
              style={{
                fontSize: 13,
                color: 'var(--text2)',
                margin: '0 0 20px',
                lineHeight: 1.5,
              }}
            >
              Choose your hardware wallet type:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {HARDWARE_WALLET_TYPES.map(wallet => (
                <button
                  key={wallet.type}
                  onClick={() => handleSelectType(wallet.type)}
                  disabled={!wallet.supported || loading}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    padding: 16,
                    background: 'var(--bg3)',
                    border: '2px solid var(--border)',
                    borderRadius: 12,
                    cursor: wallet.supported ? 'pointer' : 'not-allowed',
                    opacity: wallet.supported ? 1 : 0.5,
                    transition: 'all 0.2s',
                    fontFamily: 'var(--font)',
                    textAlign: 'left',
                  }}
                  onMouseEnter={e => {
                    if (wallet.supported) {
                      e.currentTarget.style.borderColor = 'var(--accent)'
                      e.currentTarget.style.background = 'rgba(99,102,241,0.05)'
                    }
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'var(--border)'
                    e.currentTarget.style.background = 'var(--bg3)'
                  }}
                >
                  <span style={{ fontSize: 32 }}>{wallet.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>
                        {wallet.name}
                      </span>
                      {!wallet.supported && (
                        <span
                          style={{
                            fontSize: 10,
                            padding: '2px 8px',
                            borderRadius: 10,
                            background: 'var(--bg4)',
                            color: 'var(--text3)',
                            fontWeight: 600,
                          }}
                        >
                          Coming Soon
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--text3)', margin: '4px 0 0' }}>
                      {wallet.description}
                    </p>
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
                  margin: '16px 0 0',
                }}
              >
                {error}
              </p>
            )}
          </div>
        )}

        {/* Step 2: Connecting */}
        {step === 'connecting' && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div
              style={{
                fontSize: 64,
                marginBottom: 20,
              }}
            >
              {getHardwareWalletIcon(selectedType)}
            </div>
            <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>
              Connecting to {getHardwareWalletName(selectedType)}...
            </p>
            <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 24 }}>
              Please approve the connection on your device
            </p>
            <div
              style={{
                width: 40,
                height: 40,
                border: '4px solid var(--bg3)',
                borderTopColor: 'var(--accent)',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto',
              }}
            />
          </div>
        )}

        {/* Step 3: Connected */}
        {step === 'connected' && (
          <div>
            <div
              style={{
                padding: 20,
                background: 'rgba(16,185,129,0.1)',
                borderRadius: 12,
                marginBottom: 20,
                border: '1px solid rgba(16,185,129,0.2)',
                textAlign: 'center',
              }}
            >
              <p style={{ fontSize: 48, margin: '0 0 12px' }}>
                {getHardwareWalletIcon(selectedType)}
              </p>
              <p style={{ fontSize: 16, fontWeight: 700, color: '#10b981', margin: '0 0 8px' }}>
                ✓ {getHardwareWalletName(selectedType)} Connected
              </p>
              <p
                style={{
                  fontSize: 12,
                  color: 'var(--text)',
                  margin: 0,
                  fontFamily: 'var(--font-mono)',
                  background: 'var(--bg2)',
                  padding: '8px 12px',
                  borderRadius: 8,
                  display: 'inline-block',
                }}
              >
                {address}
              </p>
            </div>

            {/* Derivation Path */}
            <div style={{ marginBottom: 20 }}>
              <label
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--text2)',
                  marginBottom: 8,
                  display: 'block',
                }}
              >
                Derivation Path
              </label>
              <input
                type="text"
                value={derivationPath}
                onChange={e => setDerivationPath(e.target.value)}
                placeholder="44'/60'/0'/0/0"
                style={{
                  width: '100%',
                  padding: '12px',
                  background: 'var(--bg3)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  fontSize: 13,
                  color: 'var(--text)',
                  fontFamily: 'var(--font-mono)',
                  outline: 'none',
                }}
              />
              <p style={{ fontSize: 11, color: 'var(--text3)', margin: '4px 0 0' }}>
                Default: 44'/60'/0'/0/0 (Ethereum)
              </p>
            </div>

            {/* Password */}
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 12, lineHeight: 1.5 }}>
                Set a password to encrypt this wallet connection:
              </p>
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
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
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
                  Saving...
                </span>
              ) : (
                'Add Hardware Wallet'
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
