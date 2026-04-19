import { useWallet } from '../hooks/useWallet'
import { useNetworkDetection } from '../hooks/useNetworkDetection'
import { CHAINS } from '../data/chains'

export default function ChainSelector({ onClose }) {
  const { activeChain, setActiveChain } = useWallet()
  const {
    isDetecting,
    detectedChain,
    error: detectionError,
    autoDetectEnabled,
    toggleAutoDetect,
    refreshDetection,
    hasEthereumWallet,
  } = useNetworkDetection()

  const handleSelect = chainId => {
    setActiveChain(chainId)
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal small-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Select Network</h2>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="modal-body">
          {/* Auto-detection status */}
          {hasEthereumWallet && (
            <div className="network-detection-status" style={{
              padding: '12px',
              marginBottom: '16px',
              background: autoDetectEnabled ? '#f0f9ff' : '#f9fafb',
              border: `1px solid ${autoDetectEnabled ? '#3b82f6' : '#e5e7eb'}`,
              borderRadius: '8px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '16px' }}>{isDetecting ? '🔄' : detectedChain ? '✓' : '⚠️'}</span>
                  <div>
                    <p style={{ fontSize: '13px', fontWeight: '600', margin: 0 }}>
                      {isDetecting ? 'Detecting Network...' : 
                       detectedChain ? `Auto-detected: ${CHAINS[detectedChain]?.name}` : 
                       'Network Detection'}
                    </p>
                    {detectionError && (
                      <p style={{ fontSize: '11px', color: '#ef4444', margin: '4px 0 0 0' }}>
                        {detectionError}
                      </p>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {detectedChain && (
                    <button
                      onClick={refreshDetection}
                      style={{
                        padding: '4px 8px',
                        fontSize: '11px',
                        background: 'white',
                        border: '1px solid #d1d5db',
                        borderRadius: '4px',
                        cursor: 'pointer',
                      }}
                    >
                      🔄 Refresh
                    </button>
                  )}
                  <button
                    onClick={toggleAutoDetect}
                    style={{
                      padding: '4px 8px',
                      fontSize: '11px',
                      background: autoDetectEnabled ? '#3b82f6' : 'white',
                      color: autoDetectEnabled ? 'white' : '#374151',
                      border: `1px solid ${autoDetectEnabled ? '#3b82f6' : '#d1d5db'}`,
                      borderRadius: '4px',
                      cursor: 'pointer',
                    }}
                  >
                    {autoDetectEnabled ? 'Auto ON' : 'Auto OFF'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Network list */}
          <div className="chain-list">
            {Object.values(CHAINS).map(chain => (
              <button
                key={chain.id}
                className={`chain-option ${activeChain === chain.id ? 'chain-option--active' : ''}`}
                onClick={() => handleSelect(chain.id)}
              >
                <div className="chain-option-left">
                  <span
                    className="chain-option-dot"
                    style={{ background: chain.color }}
                  />
                  <div>
                    <p className="chain-option-name">{chain.name}</p>
                    <p className="chain-option-id">
                      Chain ID: {chain.chainId ?? '—'}
                    </p>
                  </div>
                </div>
                {activeChain === chain.id && (
                  <span className="chain-check">✓</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
