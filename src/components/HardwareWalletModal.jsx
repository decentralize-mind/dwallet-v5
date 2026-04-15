import { useState, useEffect } from 'react'
import { useWallet } from '../context/WalletContext'
import {
  checkHardwareWalletSupport,
  connectLedger,
  getLedgerAddress,
  getHardwareWalletIcon,
  getHardwareWalletName
} from '../utils/hardwareWallet'

export default function HardwareWalletModal({ onClose, onConnect }) {
  const { notify } = useWallet()
  const [selectedType, setSelectedType] = useState(null)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState('')
  const [detectedDevices, setDetectedDevices] = useState({})
  const [connectionStep, setConnectionStep] = useState('select') // select | connecting | success
  const [derivedAddress, setDerivedAddress] = useState('')

  useEffect(() => {
    // Check which hardware wallets are supported
    const support = checkHardwareWalletSupport()
    setDetectedDevices(support)
  }, [])

  const handleConnect = async () => {
    if (!selectedType) {
      setError('Please select a hardware wallet type')
      return
    }

    setConnecting(true)
    setError('')
    setConnectionStep('connecting')

    try {
      if (selectedType === 'ledger') {
        await connectLedgerDevice()
      } else if (selectedType === 'trezor') {
        await connectTrezorDevice()
      } else if (selectedType === 'walletconnect') {
        await connectWalletConnectDevice()
      }
    } catch (err) {
      console.error('Hardware wallet connection failed:', err)
      setError(err.message || 'Connection failed')
      setConnectionStep('select')
    } finally {
      setConnecting(false)
    }
  }

  const connectLedgerDevice = async () => {
    try {
      // Import dynamically to avoid bundle bloat
      const { connectLedger: connect, getLedgerAddress: getAddress } = await import('../utils/hardwareWallet')
      
      setConnectionStep('connecting')
      
      const connection = await connect()
      const address = await getAddress(connection.eth, "44'/60'/0'/0/0")
      
      setDerivedAddress(address)
      setConnectionStep('success')
      
      notify('✓ Ledger connected successfully', 'success')
      
      // Pass connection to parent
      setTimeout(() => {
        onConnect({
          type: 'ledger',
          connection,
          address,
          path: "44'/60'/0'/0/0"
        })
      }, 1000)
    } catch (err) {
      if (err.message.includes('USB')) {
        throw new Error('Ledger device not detected. Please connect via USB and unlock the device.')
      }
      throw err
    }
  }

  const connectTrezorDevice = async () => {
    try {
      const { getTrezorAddress } = await import('../utils/hardwareWallet')
      
      setConnectionStep('connecting')
      
      // Initialize Trezor Connect if not already done
      if (!window.TrezorConnect) {
        const script = document.createElement('script')
        script.src = 'https://connect.trezor.io/9/trezor-connect.js'
        script.onload = async () => {
          window.TrezorConnect.init({
            manifest: {
              email: 'support@dwallet.io',
              appUrl: window.location.origin
            }
          })
          
          const address = await getTrezorAddress("m/44'/60'/0'/0/0")
          setDerivedAddress(address)
          setConnectionStep('success')
          
          notify('✓ Trezor connected successfully', 'success')
          
          setTimeout(() => {
            onConnect({
              type: 'trezor',
              connection: { provider: window.TrezorConnect },
              address,
              path: "m/44'/60'/0'/0/0"
            })
          }, 1000)
        }
        document.head.appendChild(script)
      } else {
        const address = await getTrezorAddress("m/44'/60'/0'/0/0")
        setDerivedAddress(address)
        setConnectionStep('success')
        
        notify('✓ Trezor connected successfully', 'success')
        
        setTimeout(() => {
          onConnect({
            type: 'trezor',
            connection: { provider: window.TrezorConnect },
            address,
            path: "m/44'/60'/0'/0/0"
          })
        }, 1000)
      }
    } catch (err) {
      throw new Error('Trezor connection failed. Please ensure device is connected and unlocked.')
    }
  }

  const connectWalletConnectDevice = async () => {
    try {
      const { connectWalletConnect } = await import('../utils/hardwareWallet')
      
      setConnectionStep('connecting')
      
      const connection = await connectWalletConnect({
        projectId: process.env.REACT_APP_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID',
        chains: [1, 11155111, 8453, 84532] // Ethereum, Sepolia, Base, Base Sepolia
      })
      
      setDerivedAddress(connection.accounts[0])
      setConnectionStep('success')
      
      notify('✓ WalletConnect device connected', 'success')
      
      setTimeout(() => {
        onConnect({
          type: 'walletconnect',
          connection,
          address: connection.accounts[0],
          path: null
        })
      }, 1000)
    } catch (err) {
      throw new Error('WalletConnect failed. Please try again.')
    }
  }

  const walletTypes = [
    {
      type: 'ledger',
      name: 'Ledger',
      icon: '🔷',
      description: 'Connect via USB',
      supported: detectedDevices.ledger,
      popular: true
    },
    {
      type: 'trezor',
      name: 'Trezor',
      icon: '🔶',
      description: 'Connect via web browser',
      supported: detectedDevices.trezor,
      popular: true
    },
    {
      type: 'walletconnect',
      name: 'WalletConnect',
      icon: '📱',
      description: 'Scan QR code with mobile wallet',
      supported: detectedDevices.walletconnect,
      popular: false
    }
  ]

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
        <div className="modal-header">
          <h2 className="modal-title">Connect Hardware Wallet</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {connectionStep === 'select' && (
            <>
              <div style={{
                padding: '12px',
                marginBottom: '16px',
                background: 'rgba(59, 130, 246, 0.1)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                borderRadius: '8px'
              }}>
                <p style={{ fontSize: '13px', color: '#3b82f6', margin: 0 }}>
                  🔐 Hardware wallets keep your private keys secure on the device
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {walletTypes.map(wallet => (
                  <button
                    key={wallet.type}
                    onClick={() => setSelectedType(wallet.type)}
                    disabled={!wallet.supported}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px',
                      padding: '16px',
                      background: selectedType === wallet.type ? 'rgba(99, 102, 241, 0.1)' : 'var(--bg3)',
                      border: `2px solid ${selectedType === wallet.type ? 'var(--accent)' : 'var(--border)'}`,
                      borderRadius: '12px',
                      cursor: wallet.supported ? 'pointer' : 'not-allowed',
                      opacity: wallet.supported ? 1 : 0.5,
                      transition: 'all 0.2s',
                      fontFamily: 'var(--font)',
                      textAlign: 'left'
                    }}
                  >
                    <span style={{ fontSize: '32px' }}>{wallet.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text)' }}>
                          {wallet.name}
                        </span>
                        {wallet.popular && (
                          <span style={{
                            fontSize: '10px',
                            padding: '2px 8px',
                            borderRadius: '10px',
                            background: 'rgba(16, 185, 129, 0.2)',
                            color: '#10b981',
                            fontWeight: '600'
                          }}>
                            Popular
                          </span>
                        )}
                      </div>
                      <p style={{ fontSize: '13px', color: 'var(--text2)', margin: '4px 0 0' }}>
                        {wallet.description}
                      </p>
                    </div>
                    {selectedType === wallet.type && (
                      <span style={{ fontSize: '20px', color: 'var(--accent)' }}>✓</span>
                    )}
                  </button>
                ))}
              </div>

              {error && (
                <div style={{
                  marginTop: '16px',
                  padding: '12px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '8px',
                  fontSize: '13px',
                  color: '#ef4444'
                }}>
                  {error}
                </div>
              )}

              <div style={{ marginTop: '20px', display: 'flex', gap: '12px' }}>
                <button className="btn-secondary" onClick={onClose} style={{ flex: 1 }}>
                  Cancel
                </button>
                <button
                  className="btn-primary"
                  onClick={handleConnect}
                  disabled={!selectedType || connecting}
                  style={{ flex: 1 }}
                >
                  Connect {selectedType ? getHardwareWalletName(selectedType) : 'Device'}
                </button>
              </div>
            </>
          )}

          {connectionStep === 'connecting' && (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div style={{
                width: '60px',
                height: '60px',
                border: '4px solid rgba(99, 102, 241, 0.2)',
                borderTopColor: 'var(--accent)',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 20px'
              }} />
              <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>
                Connecting to {getHardwareWalletName(selectedType)}...
              </h3>
              <p style={{ fontSize: '14px', color: 'var(--text2)' }}>
                Please follow the prompts on your device
              </p>
            </div>
          )}

          {connectionStep === 'success' && (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: 'rgba(16, 185, 129, 0.2)',
                border: '3px solid #10b981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px',
                fontSize: '40px'
              }}>
                ✓
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '8px', color: '#10b981' }}>
                Connected Successfully!
              </h3>
              <div style={{
                padding: '12px',
                background: 'var(--bg3)',
                borderRadius: '8px',
                margin: '16px 0'
              }}>
                <p style={{ fontSize: '12px', color: 'var(--text2)', marginBottom: '4px' }}>
                  Address
                </p>
                <p style={{
                  fontSize: '13px',
                  fontFamily: 'monospace',
                  color: 'var(--text)',
                  wordBreak: 'break-all'
                }}>
                  {derivedAddress}
                </p>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text2)' }}>
                Redirecting to wallet...
              </p>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
