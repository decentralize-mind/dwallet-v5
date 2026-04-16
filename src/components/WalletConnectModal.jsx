import { useState } from 'react'
import { useWallet } from '../hooks/useWallet'
import { useWalletConnect } from '../context/WalletConnectContext'
import { decodeTransaction, getRiskColor, getRiskIcon, getTransactionSummary } from '../utils/transactionPreview'
import { QRCodeScanner, QRCodeDisplay } from './QRCodeScanner'

export function WalletConnectModal({ onClose }) {
  const { currentAddress, activeChain } = useWallet()
  const { connectWithUri, wcReady } = useWalletConnect()
  const [uri, setUri] = useState('')
  const [step, setStep] = useState('input') // input | connecting | proposal | connected | error
  const [dappInfo, setDappInfo] = useState(null)
  const [session, setSession] = useState(null)
  const [error, setError] = useState('')
  const [showQRScanner, setShowQRScanner] = useState(false)
  const [showQRDisplay, setShowQRDisplay] = useState(false)

  const handleConnect = async () => {
    if (!uri.trim()) return setError('Paste a WalletConnect URI first')
    if (!uri.startsWith('wc:'))
      return setError('Invalid URI — must start with wc:')
    setStep('connecting')
    setError('')
    try {
      await connectWithUri(uri)
      // The proposal will arrive via the context's pendingProposal
      // We'll detect it in a useEffect or just wait a bit for demo
      setTimeout(() => {
        setDappInfo({
          name: 'Connected dApp',
          description: 'Requesting wallet connection',
          url: uri.split('?')[0].replace('wc:', ''),
          icons: [],
        })
        setStep('proposal')
      }, 1500)
    } catch (e) {
      setError(e.message)
      setStep('input')
    }
  }

  const handleApprove = async () => {
    try {
      // This will be handled by the SessionProposalModal via context
      // For the manual URI flow, we just show success
      setStep('connected')
    } catch (e) {
      setError(e.message)
      setStep('input')
    }
  }

  const handleReject = async () => {
    setStep('input')
    setUri('')
    setDappInfo(null)
  }

  const handleQRScan = async (scannedUri) => {
    setShowQRScanner(false)
    setUri(scannedUri)
    // Auto-connect if URI is valid
    if (scannedUri.startsWith('wc:')) {
      await handleConnect()
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">WalletConnect</h2>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-body">
          {/* ── Input ── */}
          {step === 'input' && (
            <>
              <p className="step-sub" style={{ marginBottom: '12px' }}>
                Connect to any dApp using WalletConnect v2
              </p>
              <div className="wc-how">
                <div className="wc-step-row">
                  <span className="wc-step-num">1</span>
                  <span>Open a dApp (e.g. app.uniswap.org)</span>
                </div>
                <div className="wc-step-row">
                  <span className="wc-step-num">2</span>
                  <span>Click "Connect Wallet" → WalletConnect</span>
                </div>
                <div className="wc-step-row">
                  <span className="wc-step-num">3</span>
                  <span>
                    Copy the <code>wc:</code> URI and paste below, or scan QR code
                  </span>
                </div>
              </div>
              
              {/* QR Code Buttons */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                <button
                  className="btn-secondary"
                  style={{ flex: 1 }}
                  onClick={() => setShowQRScanner(true)}
                >
                  📷 Scan QR
                </button>
                <button
                  className="btn-secondary"
                  style={{ flex: 1 }}
                  onClick={() => setShowQRDisplay(true)}
                >
                  📱 Show QR
                </button>
              </div>
              
              <textarea
                className="field textarea"
                rows={3}
                placeholder="wc:a1b2c3...@2?relay-protocol=irn&symKey=..."
                value={uri}
                onChange={e => {
                  setUri(e.target.value)
                  setError('')
                }}
                style={{ fontFamily: 'var(--font-mono)', fontSize: '11px' }}
              />
              {error && <p className="error-msg">{error}</p>}
              <button
                className="btn-primary full-width"
                onClick={handleConnect}
                disabled={!uri.trim()}
              >
                Connect to dApp →
              </button>
              <div className="wc-note">
                WalletConnect v2 · Your private key never leaves this device
              </div>
            </>
          )}

          {/* ── Connecting ── */}
          {step === 'connecting' && (
            <div className="wc-loading">
              <div className="wc-spinner" />
              <p className="wc-loading-text">Connecting to dApp...</p>
              <p className="wc-loading-sub">Waiting for session proposal</p>
            </div>
          )}

          {/* ── Proposal ── */}
          {step === 'proposal' && dappInfo && (
            <>
              <div className="wc-proposal-card">
                <div className="wc-dapp-icon">{dappInfo.name?.[0] || 'D'}</div>
                <h3 className="wc-dapp-name">{dappInfo.name}</h3>
                <p className="wc-dapp-desc">{dappInfo.description}</p>
              </div>
              <div className="wc-permissions">
                <p className="wc-perm-title">
                  This dApp is requesting permission to:
                </p>
                <div className="wc-perm-row">
                  <span className="wc-perm-icon wc-perm--ok">✓</span>
                  <span>View your wallet address</span>
                </div>
                <div className="wc-perm-row">
                  <span className="wc-perm-icon wc-perm--ok">✓</span>
                  <span>Request transaction signatures</span>
                </div>
                <div className="wc-perm-row">
                  <span className="wc-perm-icon wc-perm--warn">!</span>
                  <span>Cannot move funds without your approval</span>
                </div>
              </div>
              <div className="wc-connecting-as">
                <span className="wc-connecting-label">Connecting as</span>
                <span className="wc-connecting-addr mono">
                  {currentAddress?.slice(0, 10)}...{currentAddress?.slice(-4)}
                </span>
              </div>
              {error && <p className="error-msg">{error}</p>}
              <div className="btn-row">
                <button className="btn-secondary" onClick={handleReject}>
                  Reject
                </button>
                <button className="btn-primary" onClick={handleApprove}>
                  Connect ✓
                </button>
              </div>
            </>
          )}

          {/* ── Connected ── */}
          {step === 'connected' && (
            <div className="wc-connected">
              <div className="success-icon">✓</div>
              <h3 className="success-title">Connected!</h3>
              <p className="success-sub">
                {dappInfo?.name} is now connected to your wallet. Any
                transaction requests will appear here for your approval.
              </p>
              <div className="wc-session-info">
                <div className="confirm-row">
                  <span>dApp</span>
                  <span>{dappInfo?.name}</span>
                </div>
                <div className="confirm-row">
                  <span>Address</span>
                  <span className="mono small">
                    {currentAddress?.slice(0, 10)}...{currentAddress?.slice(-4)}
                  </span>
                </div>
                <div className="confirm-row">
                  <span>Network</span>
                  <span>{activeChain}</span>
                </div>
              </div>
              <button
                className="btn-secondary full-width"
                onClick={() => {
                  setStep('input')
                  setUri('')
                  setDappInfo(null)
                  setSession(null)
                }}
              >
                Connect another dApp
              </button>
              <button
                className="btn-primary full-width"
                style={{ marginTop: '8px' }}
                onClick={onClose}
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>

      {/* QR Scanner Modal */}
      {showQRScanner && (
        <QRCodeScanner
          onScan={handleQRScan}
          onClose={() => setShowQRScanner(false)}
        />
      )}

      {/* QR Display Modal */}
      {showQRDisplay && (
        <QRCodeDisplay
          uri={uri || 'wc:example@2?relay-protocol=irn&symKey=example'}
          onClose={() => setShowQRDisplay(false)}
        />
      )}
    </div>
  )
}

export function SessionProposalModal() {
  const { pendingProposal, approveSession: handleApprove, rejectSession: handleReject } = useWalletConnect()
  const { currentAddress, activeChain } = useWallet()

  if (!pendingProposal) return null

  const { params } = pendingProposal
  const { proposer, requiredNamespaces } = params
  const dappMetadata = proposer.metadata

  const handleApproveClick = async () => {
    try {
      await handleApprove()
    } catch (error) {
      console.error('Failed to approve session:', error)
    }
  }

  const handleRejectClick = async () => {
    try {
      await handleReject()
    } catch (error) {
      console.error('Failed to reject session:', error)
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Connection Request</h2>
        </div>

        <div className="modal-body">
          <div className="wc-proposal-card">
            {dappMetadata.icons && dappMetadata.icons.length > 0 && (
              <img 
                src={dappMetadata.icons[0]} 
                alt={dappMetadata.name}
                className="wc-dapp-icon-img"
                style={{ width: '64px', height: '64px', borderRadius: '12px' }}
              />
            )}
            {!dappMetadata.icons && (
              <div className="wc-dapp-icon">{dappMetadata.name?.[0] || 'D'}</div>
            )}
            <h3 className="wc-dapp-name">{dappMetadata.name}</h3>
            <p className="wc-dapp-desc">{dappMetadata.description}</p>
            <a 
              href={dappMetadata.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="wc-dapp-url"
              style={{ fontSize: '12px', color: '#666' }}
            >
              {dappMetadata.url}
            </a>
          </div>

          <div className="wc-permissions">
            <p className="wc-perm-title">
              This dApp is requesting permission to:
            </p>
            {requiredNamespaces.eip155 && (
              <>
                <div className="wc-perm-row">
                  <span className="wc-perm-icon wc-perm--ok">✓</span>
                  <span>View your wallet address</span>
                </div>
                <div className="wc-perm-row">
                  <span className="wc-perm-icon wc-perm--ok">✓</span>
                  <span>Request transaction signatures</span>
                </div>
                <div className="wc-perm-row">
                  <span className="wc-perm-icon wc-perm--warn">!</span>
                  <span>Cannot move funds without your approval</span>
                </div>
              </>
            )}
          </div>

          <div className="wc-connecting-as">
            <span className="wc-connecting-label">Connecting as</span>
            <span className="wc-connecting-addr mono">
              {currentAddress?.slice(0, 10)}...{currentAddress?.slice(-4)}
            </span>
          </div>

          <div className="btn-row">
            <button className="btn-secondary" onClick={handleRejectClick}>
              Reject
            </button>
            <button className="btn-primary" onClick={handleApproveClick}>
              Approve ✓
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
export function SessionRequestModal() {
  const { pendingRequest, approveRequest, rejectRequest } = useWalletConnect()
  const { wallet } = useWallet()

  if (!pendingRequest) return null

  const { params } = pendingRequest
  const { request, chainId } = params

  const getRequestInfo = () => {
    switch (request.method) {
      case 'personal_sign':
        return {
          type: 'Sign Message',
          icon: '✍️',
          description: 'Sign a message with your wallet',
          data: request.params[0],
        }
      case 'eth_sign':
        return {
          type: 'Sign Message',
          icon: '✍️',
          description: 'Sign a message with your wallet',
          data: request.params[1],
        }
      case 'eth_sendTransaction':
      case 'eth_signTransaction':
        const tx = request.params[0]
        const decoded = decodeTransaction(tx)
        const summary = getTransactionSummary(decoded)
        
        return {
          type: request.method === 'eth_sendTransaction' ? 'Send Transaction' : 'Sign Transaction',
          icon: request.method === 'eth_sendTransaction' ? '📤' : '📝',
          description: summary,
          decoded,
          data: {
            to: tx.to,
            value: tx.value ? `${Number(tx.value) / 1e18} ETH` : '0 ETH',
            data: tx.data,
          },
        }
      case 'eth_signTypedData_v4':
      case 'eth_signTypedData':
        return {
          type: 'Sign Typed Data',
          icon: '📋',
          description: 'Sign structured data',
          data: request.params[1],
        }
      default:
        return {
          type: 'Unknown Request',
          icon: '❓',
          description: `Method: ${request.method}`,
          data: request.params,
        }
    }
  }

  const requestInfo = getRequestInfo()

  const handleApproveClick = async () => {
    try {
      await approveRequest()
    } catch (error) {
      console.error('Failed to approve request:', error)
    }
  }

  const handleRejectClick = async () => {
    try {
      await rejectRequest()
    } catch (error) {
      console.error('Failed to reject request:', error)
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">
            {requestInfo.icon} {requestInfo.type}
          </h2>
        </div>

        <div className="modal-body">
          <div className="wc-request-card">
            <p className="wc-request-desc">{requestInfo.description}</p>
          </div>

          {/* Transaction Preview with Risk Analysis */}
          {requestInfo.decoded && (
            <div className="wc-tx-preview" style={{ marginTop: '16px' }}>
              <div 
                className="wc-risk-badge"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px',
                  background: `${getRiskColor(requestInfo.decoded.riskLevel)}15`,
                  border: `2px solid ${getRiskColor(requestInfo.decoded.riskLevel)}`,
                  borderRadius: '8px',
                  marginBottom: '12px',
                }}
              >
                <span style={{ fontSize: '20px' }}>{getRiskIcon(requestInfo.decoded.riskLevel)}</span>
                <div>
                  <p style={{ margin: 0, fontWeight: 'bold', color: getRiskColor(requestInfo.decoded.riskLevel) }}>
                    {requestInfo.decoded.riskLevel.toUpperCase()} RISK
                  </p>
                  <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#666' }}>
                    Risk Score: {requestInfo.decoded.riskScore}/100
                  </p>
                </div>
              </div>

              {requestInfo.decoded.warnings.length > 0 && (
                <div className="wc-warnings" style={{ marginBottom: '12px' }}>
                  <p style={{ fontWeight: 'bold', marginBottom: '8px' }}>⚠️ Warnings:</p>
                  {requestInfo.decoded.warnings.map((warning, idx) => (
                    <p key={idx} style={{ margin: '4px 0', fontSize: '13px', color: '#f59e0b' }}>
                      {warning}
                    </p>
                  ))}
                </div>
              )}

              <div className="wc-tx-details" style={{
                background: '#f9fafb',
                padding: '12px',
                borderRadius: '8px',
                fontSize: '13px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: '#666' }}>To:</span>
                  <span className="mono" style={{ fontSize: '11px' }}>
                    {requestInfo.decoded.to.slice(0, 10)}...{requestInfo.decoded.to.slice(-4)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: '#666' }}>Value:</span>
                  <span style={{ fontWeight: 'bold' }}>{requestInfo.decoded.value}</span>
                </div>
                {requestInfo.decoded.functionCall && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ color: '#666' }}>Function:</span>
                    <span>{requestInfo.decoded.functionCall.name}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: '#666' }}>Gas Limit:</span>
                  <span className="mono">{requestInfo.decoded.gasLimit}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#666' }}>Max Fee:</span>
                  <span className="mono">{requestInfo.decoded.maxFeePerGas}</span>
                </div>
              </div>
            </div>
          )}

          {!requestInfo.decoded && (
            <div className="wc-request-data">
              <p className="wc-request-data-title">Request Details:</p>
              <pre className="wc-request-data-content">
                {typeof requestInfo.data === 'string'
                  ? requestInfo.data
                  : JSON.stringify(requestInfo.data, null, 2)}
              </pre>
            </div>
          )}

          {chainId && (
            <div className="wc-request-chain">
              <span>Chain ID:</span>
              <span className="mono">{chainId}</span>
            </div>
          )}

          <div className="btn-row">
            <button className="btn-secondary" onClick={handleRejectClick}>
              Reject
            </button>
            <button className="btn-primary" onClick={handleApproveClick}>
              Approve ✓
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function ActiveSessionsList() {
  const { sessions, sessionMetadata, disconnect, switchNetwork } = useWalletConnect()
  const sessionEntries = Object.entries(sessions)
  const [switchingTopic, setSwitchingTopic] = useState(null)
  const [showNetworkSelector, setShowNetworkSelector] = useState(null) // topic

  if (sessionEntries.length === 0) {
    return (
      <div className="wc-no-sessions">
        <p>No active WalletConnect sessions</p>
      </div>
    )
  }

  const handleDisconnect = async (topic, dappName) => {
    if (window.confirm(`Disconnect from ${dappName}?`)) {
      try {
        await disconnect(topic)
      } catch (error) {
        console.error('Failed to disconnect:', error)
      }
    }
  }

  const handleNetworkSwitch = async (topic, newChain) => {
    setSwitchingTopic(topic)
    try {
      await switchNetwork(topic, newChain)
      setShowNetworkSelector(null)
    } catch (error) {
      console.error('Failed to switch network:', error)
      alert(error.message)
    } finally {
      setSwitchingTopic(null)
    }
  }

  const networks = [
    { key: 'ethereum', name: 'Ethereum', chainId: 1 },
    { key: 'sepolia', name: 'Sepolia', chainId: 11155111 },
    { key: 'base', name: 'Base', chainId: 8453 },
    { key: 'baseSepolia', name: 'Base Sepolia', chainId: 84532 },
    { key: 'polygon', name: 'Polygon', chainId: 137 },
    { key: 'arbitrum', name: 'Arbitrum', chainId: 42161 },
    { key: 'optimism', name: 'Optimism', chainId: 10 },
  ]

  return (
    <div className="wc-sessions-list">
      {sessionEntries.map(([topic, session]) => {
        const dappMetadata = session.peer?.metadata || {}
        const dappName = dappMetadata.name || 'Unknown dApp'
        const dappUrl = dappMetadata.url || '#'
        const dappIcon = dappMetadata.icons?.[0]
        const metadata = sessionMetadata[topic] || {}
        const currentNetwork = metadata.network || 'Unknown'
        const currentChainId = metadata.chainId || 'Unknown'

        return (
          <div key={topic} className="wc-session-item">
            <div className="wc-session-info">
              {dappIcon && (
                <img 
                  src={dappIcon} 
                  alt={dappName}
                  className="wc-session-icon"
                  style={{ width: '32px', height: '32px', borderRadius: '8px' }}
                />
              )}
              {!dappIcon && (
                <div className="wc-session-icon-placeholder">
                  {dappName[0] || 'D'}
                </div>
              )}
              <div className="wc-session-details">
                <p className="wc-session-name">{dappName}</p>
                <a 
                  href={dappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="wc-session-url"
                  style={{ fontSize: '11px', color: '#666' }}
                >
                  {dappUrl}
                </a>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                  <span className="mono" style={{ fontSize: '10px', color: '#999' }}>
                    Chain: {currentChainId}
                  </span>
                  <button
                    className="btn-small"
                    onClick={() => setShowNetworkSelector(showNetworkSelector === topic ? null : topic)}
                    disabled={switchingTopic === topic}
                    style={{
                      fontSize: '10px',
                      padding: '2px 6px',
                      background: '#f3f4f6',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      cursor: 'pointer',
                    }}
                  >
                    {switchingTopic === topic ? 'Switching...' : 'Switch Network'}
                  </button>
                </div>
                
                {/* Network Selector Dropdown */}
                {showNetworkSelector === topic && (
                  <div 
                    className="wc-network-selector"
                    style={{
                      position: 'absolute',
                      background: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      padding: '8px',
                      boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                      zIndex: 1000,
                      marginTop: '4px',
                      minWidth: '200px',
                    }}
                  >
                    <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '8px' }}>
                      Select Network:
                    </p>
                    {networks.map(network => (
                      <button
                        key={network.key}
                        onClick={() => handleNetworkSwitch(topic, network.key)}
                        disabled={network.chainId === currentChainId}
                        style={{
                          display: 'block',
                          width: '100%',
                          padding: '6px 8px',
                          marginBottom: '4px',
                          fontSize: '12px',
                          textAlign: 'left',
                          background: network.chainId === currentChainId ? '#f3f4f6' : 'white',
                          border: '1px solid #e5e7eb',
                          borderRadius: '4px',
                          cursor: network.chainId === currentChainId ? 'not-allowed' : 'pointer',
                          opacity: network.chainId === currentChainId ? 0.5 : 1,
                        }}
                      >
                        {network.name} {network.chainId === currentChainId && '✓'}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <button
              className="btn-disconnect-small"
              onClick={() => handleDisconnect(topic, dappName)}
              title="Disconnect"
            >
              ✕
            </button>
          </div>
        )
      })}
    </div>
  )
}
