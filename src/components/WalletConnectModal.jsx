import { useState } from 'react'
import { useWallet } from '../hooks/useWallet'
import {
  pairWithDapp,
  approveSession,
  rejectSession,
} from '../utils/walletconnect'

export function WalletConnectModal({ onClose }) {
  const { currentAddress, activeChain } = useWallet()
  const [uri, setUri] = useState('')
  const [step, setStep] = useState('input') // input | connecting | proposal | connected | error
  const [dappInfo, setDappInfo] = useState(null)
  const [session, setSession] = useState(null)
  const [error, setError] = useState('')

  const handleConnect = async () => {
    if (!uri.trim()) return setError('Paste a WalletConnect URI first')
    if (!uri.startsWith('wc:'))
      return setError('Invalid URI — must start with wc:')
    setStep('connecting')
    setError('')
    try {
      await pairWithDapp(uri)
      // Simulate proposal arriving
      setTimeout(() => {
        setDappInfo({
          name: 'Connected dApp',
          description: 'Requesting wallet connection',
          url: uri.split('?')[0].replace('wc:', ''),
          icons: [],
        })
        setStep('proposal')
      }, 1000)
    } catch (e) {
      setError(e.message)
      setStep('input')
    }
  }

  const handleApprove = async () => {
    try {
      const sess = await approveSession(
        {
          params: { proposer: { metadata: dappInfo }, requiredNamespaces: {} },
        },
        [currentAddress],
      )
      setSession(sess)
      setStep('connected')
    } catch (e) {
      setError(e.message)
      setStep('input')
    }
  }

  const handleReject = async () => {
    await rejectSession()
    setStep('input')
    setUri('')
    setDappInfo(null)
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
                    Copy the <code>wc:</code> URI and paste below
                  </span>
                </div>
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
    </div>
  )
}

export function SessionProposalModal() {
  return null
}
export function SessionRequestModal() {
  return null
}

export function ActiveSessionsList() {
  return null
}
