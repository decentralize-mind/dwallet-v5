import { useState, useEffect } from 'react'
import { simulateTransaction } from '../utils/mevProtection'
import { validateTransaction } from '../utils/transactionValidation'

/**
 * Transaction Simulation & Preview Component
 * Shows users exactly what will happen before they confirm
 */
export default function TransactionSimulation({ 
  txData, 
  onClose, 
  onConfirm,
  type = 'send' // 'send' | 'swap'
}) {
  const [simulation, setSimulation] = useState(null)
  const [validation, setValidation] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showDetails, setShowDetails] = useState(false)

  useEffect(() => {
    runSimulation()
  }, [txData])

  const runSimulation = async () => {
    setLoading(true)
    
    try {
      // Run validation
      const validationResult = await validateTransaction(txData)
      setValidation(validationResult)
      
      // Run simulation if provider is available
      if (txData.provider) {
        const simResult = await simulateTransaction(txData, txData.provider)
        setSimulation(simResult)
      }
    } catch (error) {
      console.error('Simulation failed:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '550px' }}>
          <div className="modal-body" style={{ padding: '40px', textAlign: 'center' }}>
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
              Simulating Transaction...
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--text2)' }}>
              Checking for potential issues
            </p>
          </div>
        </div>
      </div>
    )
  }

  const isSafe = validation?.valid && (!simulation || simulation.success)
  const riskLevel = validation?.riskLevel || 'unknown'
  
  const riskColors = {
    minimal: '#10b981',
    low: '#10b981',
    medium: '#f59e0b',
    high: '#ef4444',
    critical: '#dc2626',
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '550px' }}>
        <div className="modal-header">
          <h2 className="modal-title">
            {type === 'swap' ? '⇄ Swap Preview' : '↑ Transaction Preview'}
          </h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {/* Risk Assessment Banner */}
          <div style={{
            padding: '16px',
            marginBottom: '20px',
            background: `${riskColors[riskLevel]}15`,
            border: `2px solid ${riskColors[riskLevel]}`,
            borderRadius: '12px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>
              {isSafe ? '✅' : '⚠️'}
            </div>
            <h3 style={{ 
              fontSize: '18px', 
              fontWeight: '700', 
              marginBottom: '4px',
              color: riskColors[riskLevel]
            }}>
              {isSafe ? 'Transaction Looks Safe' : 'Warning: Issues Detected'}
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text2)', margin: 0 }}>
              Risk Level: <strong style={{ textTransform: 'uppercase' }}>{riskLevel}</strong> 
              {validation?.riskScore !== undefined && ` (${validation.riskScore}/100)`}
            </p>
          </div>

          {/* Transaction Details */}
          <div style={{
            background: 'var(--bg3)',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '16px'
          }}>
            <h4 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '12px', color: 'var(--text2)' }}>
              Transaction Details
            </h4>

            {type === 'send' ? (
              <SendPreview txData={txData} />
            ) : (
              <SwapPreview txData={txData} />
            )}
          </div>

          {/* Validation Warnings */}
          {validation?.warnings && validation.warnings.length > 0 && (
            <div style={{
              background: 'rgba(245, 158, 11, 0.1)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '16px'
            }}>
              <h4 style={{ fontSize: '13px', fontWeight: '700', color: '#f59e0b', marginBottom: '8px' }}>
                ⚠️ Warnings ({validation.warnings.length})
              </h4>
              <ul style={{ margin: 0, paddingLeft: '20px' }}>
                {validation.warnings.map((warning, idx) => (
                  <li key={idx} style={{ fontSize: '12px', color: 'var(--text2)', marginBottom: '4px' }}>
                    {warning}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Validation Errors */}
          {validation?.errors && validation.errors.length > 0 && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '16px'
            }}>
              <h4 style={{ fontSize: '13px', fontWeight: '700', color: '#ef4444', marginBottom: '8px' }}>
                ❌ Errors ({validation.errors.length})
              </h4>
              <ul style={{ margin: 0, paddingLeft: '20px' }}>
                {validation.errors.map((error, idx) => (
                  <li key={idx} style={{ fontSize: '12px', color: '#ef4444', marginBottom: '4px' }}>
                    {error}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Simulation Result */}
          {simulation && !simulation.success && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '16px'
            }}>
              <h4 style={{ fontSize: '13px', fontWeight: '700', color: '#ef4444', marginBottom: '8px' }}>
                🚫 Simulation Failed
              </h4>
              <p style={{ fontSize: '12px', color: '#ef4444', margin: 0 }}>
                {simulation.reason || simulation.error}
              </p>
            </div>
          )}

          {/* Expandable Details */}
          <button
            onClick={() => setShowDetails(!showDetails)}
            style={{
              width: '100%',
              padding: '12px',
              background: 'var(--bg3)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              cursor: 'pointer',
              fontFamily: 'var(--font)',
              fontSize: '13px',
              fontWeight: '600',
              color: 'var(--text2)',
              marginBottom: '16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <span>{showDetails ? 'Hide' : 'Show'} Technical Details</span>
            <span style={{ transform: showDetails ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
              ▼
            </span>
          </button>

          {showDetails && (
            <div style={{
              background: 'var(--bg3)',
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '16px',
              fontSize: '11px',
              fontFamily: 'monospace',
              color: 'var(--text2)',
              maxHeight: '200px',
              overflow: 'auto'
            }}>
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                {JSON.stringify({ validation: validation?.riskScore, simulation: simulation?.success }, null, 2)}
              </pre>
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <button 
              className="btn-secondary" 
              onClick={onClose}
              style={{ flex: 1 }}
            >
              Cancel
            </button>
            <button
              className="btn-primary"
              onClick={() => onConfirm(txData)}
              disabled={!isSafe && riskLevel === 'critical'}
              style={{ 
                flex: 1,
                opacity: (!isSafe && riskLevel === 'critical') ? 0.5 : 1,
                cursor: (!isSafe && riskLevel === 'critical') ? 'not-allowed' : 'pointer'
              }}
            >
              {isSafe ? 'Confirm & Send' : 'Proceed Anyway'}
            </button>
          </div>
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

/**
 * Send Transaction Preview
 */
function SendPreview({ txData }) {
  const amountUSD = (txData.amount * txData.price).toFixed(2)
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <PreviewRow label="From" value={`${txData.from?.slice(0, 10)}...${txData.from?.slice(-4)}`} />
      <PreviewRow label="To" value={`${txData.to?.slice(0, 10)}...${txData.to?.slice(-4)}`} />
      <PreviewRow label="Amount" value={`${txData.amount} ${txData.token}`} highlight />
      <PreviewRow label="USD Value" value={`$${amountUSD}`} />
      <PreviewRow label="Network" value={txData.chain} />
      <PreviewRow label="Est. Gas" value={`${txData.gasInfo?.ethCost || '—'} ETH`} />
    </div>
  )
}

/**
 * Swap Transaction Preview
 */
function SwapPreview({ txData }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <PreviewRow label="From" value={`${txData.amountIn} ${txData.tokenIn}`} />
      <PreviewRow label="To (Estimated)" value={`~${txData.amountOut} ${txData.tokenOut}`} highlight />
      <PreviewRow label="Rate" value={`1 ${txData.tokenIn} = ${txData.rate} ${txData.tokenOut}`} />
      <PreviewRow label="Slippage" value={`${txData.slippage}%`} />
      <PreviewRow label="Deadline" value={`${txData.deadline} minutes`} />
      <PreviewRow label="Price Impact" value={`${txData.priceImpact || '0.3'}%`} />
    </div>
  )
}

/**
 * Preview Row Component
 */
function PreviewRow({ label, value, highlight = false }) {
  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center',
      padding: '8px 0',
      borderBottom: '1px solid var(--border)'
    }}>
      <span style={{ fontSize: '13px', color: 'var(--text2)' }}>{label}</span>
      <span style={{ 
        fontSize: '14px', 
        fontWeight: highlight ? '700' : '600',
        color: highlight ? 'var(--accent)' : 'var(--text)',
        fontFamily: highlight ? 'monospace' : 'inherit'
      }}>
        {value}
      </span>
    </div>
  )
}
