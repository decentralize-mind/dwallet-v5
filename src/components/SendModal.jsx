import { useState, useEffect } from 'react'
import { useWallet } from '../hooks/useWallet'
import { isValidAddress } from '../utils/crypto'
import { resolveENS } from '../utils/blockchain'
import { getPrice } from '../utils/prices'
import { getContacts } from '../utils/addressBook'
import { DWT } from '../utils/dwt'

const CHAIN_TOKENS = {
  ethereum: ['ETH', 'USDC', 'USDT', 'DAI', 'WBTC', 'UNI', 'LINK', 'DWT'],
  bnb: ['BNB', 'CAKE', 'USDT', 'BUSD'],
  polygon: ['MATIC', 'USDC', 'USDT'],
  sepolia: ['ETH', 'DWT'],
  baseSepolia: ['ETH', 'DWT'],
  base: ['ETH', 'DWT', 'USDC'],
  arbitrum: ['ETH', 'USDC', 'USDT'],
}

const EXPLORERS = {
  ethereum: 'https://etherscan.io',
  bnb: 'https://bscscan.com',
  polygon: 'https://polygonscan.com',
  sepolia: 'https://sepolia.etherscan.io',
  baseSepolia: 'https://sepolia.basescan.org',
  base: 'https://basescan.org',
  arbitrum: 'https://arbiscan.io',
}

export default function SendModal({ onClose }) {
  const { sendTransaction, chainBalances, activeChain, gasInfo } = useWallet()
  const tokens = CHAIN_TOKENS[activeChain] || ['ETH']

  const [token, setToken] = useState(tokens[0])
  const [recipient, setRecipient] = useState('')
  const [resolvedAddr, setResolvedAddr] = useState('')
  const [ensDisplay, setEnsDisplay] = useState('')
  const [resolvingENS, setResolvingENS] = useState(false)
  const [amount, setAmount] = useState('')
  const [step, setStep] = useState('form')
  const [txHash, setTxHash] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const [showContacts, setShowContacts] = useState(false)

  const contacts = getContacts()
  const balance = chainBalances[token] || 0
  const price = getPrice(token)
  const usdValue = (parseFloat(amount || 0) * price).toFixed(2)
  const finalAddr = resolvedAddr || recipient
  const isDWT = token === 'DWT'
  const isTestnet = activeChain === 'sepolia' || activeChain === 'baseSepolia'

  useEffect(() => {
    const t = CHAIN_TOKENS[activeChain] || ['ETH']
    setToken(t[0])
    setAmount('')
    setError('')
  }, [activeChain])

  useEffect(() => {
    if (!recipient || isValidAddress(recipient)) {
      setResolvedAddr('')
      setEnsDisplay('')
      return
    }
    if (!recipient.includes('.')) return
    const t = setTimeout(async () => {
      setResolvingENS(true)
      try {
        const addr = await resolveENS(recipient)
        if (addr) {
          setResolvedAddr(addr)
          setEnsDisplay(addr)
        } else {
          setResolvedAddr('')
          setError('ENS name not found')
        }
      } catch {
        setResolvedAddr('')
      } finally {
        setResolvingENS(false)
      }
    }, 600)
    return () => clearTimeout(t)
  }, [recipient])

  const validate = () => {
    if (!finalAddr || !isValidAddress(finalAddr)) {
      setError(
        recipient.includes('.')
          ? 'ENS could not be resolved'
          : 'Invalid wallet address',
      )
      return false
    }
    if (!amount || parseFloat(amount) <= 0) {
      setError('Enter an amount')
      return false
    }
    if (parseFloat(amount) > balance) {
      setError('Insufficient balance')
      return false
    }
    return true
  }

  const handleSend = async () => {
    setSending(true)
    setError('')
    try {
      const tx = await sendTransaction(finalAddr, amount, token, activeChain)
      setTxHash(tx.hash)
      setStep('success')
    } catch (e) {
      setError(e.message || 'Transaction failed')
    } finally {
      setSending(false)
    }
  }

  const explorerTxUrl =
    (EXPLORERS[activeChain] || EXPLORERS.ethereum) + '/tx/' + txHash

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        onClick={function (e) {
          e.stopPropagation()
        }}
      >
        <div className="modal-header">
          <h2 className="modal-title">Send</h2>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        {step === 'form' && (
          <div className="modal-body">
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 12px',
                marginBottom: 14,
                background: isTestnet ? 'rgba(245,158,11,0.08)' : 'var(--bg3)',
                border:
                  '1px solid ' +
                  (isTestnet ? 'rgba(245,158,11,0.25)' : 'var(--border)'),
                borderRadius: 'var(--radius-sm)',
              }}
            >
              <span style={{ fontSize: 12 }}>
                {activeChain === 'baseSepolia'
                  ? '🔵'
                  : activeChain === 'sepolia'
                    ? '⬡'
                    : '🌐'}
              </span>
              <span
                style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)' }}
              >
                {activeChain === 'baseSepolia'
                  ? 'Base Sepolia (testnet)'
                  : activeChain === 'sepolia'
                    ? 'Ethereum Sepolia (testnet)'
                    : activeChain}
              </span>
              {isTestnet && (
                <span
                  style={{
                    fontSize: 10,
                    color: 'var(--amber)',
                    fontWeight: 600,
                    marginLeft: 'auto',
                  }}
                >
                  Testnet only
                </span>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Token</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {tokens.map(function (t) {
                  return (
                    <button
                      key={t}
                      onClick={function () {
                        setToken(t)
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                        padding: '6px 12px',
                        borderRadius: 20,
                        background:
                          token === t ? 'var(--accent)' : 'var(--bg3)',
                        color: token === t ? 'white' : 'var(--text2)',
                        border:
                          '1px solid ' +
                          (token === t ? 'var(--accent)' : 'var(--border)'),
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontFamily: 'var(--font)',
                      }}
                    >
                      {t === 'DWT' && <span>◈</span>}
                      {t} — {(chainBalances[t] || 0).toFixed(4)}
                    </button>
                  )
                })}
              </div>
              {isDWT && (
                <p
                  style={{
                    fontSize: 10,
                    color: 'var(--accent)',
                    margin: '6px 0 0',
                    fontWeight: 600,
                  }}
                >
                  ◈ dWallet Token ·{' '}
                  {(
                    DWT.addresses[activeChain] ||
                    DWT.addresses.sepolia ||
                    ''
                  ).slice(0, 14)}
                  ...
                </p>
              )}
            </div>

            <div className="form-group">
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: 4,
                }}
              >
                <label className="form-label" style={{ margin: 0 }}>
                  Recipient
                </label>
                {contacts.length > 0 && (
                  <button
                    onClick={function () {
                      setShowContacts(function (v) {
                        return !v
                      })
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--accent)',
                      fontSize: 11,
                      cursor: 'pointer',
                      fontFamily: 'var(--font)',
                      fontWeight: 600,
                    }}
                  >
                    📒 Contacts
                  </button>
                )}
              </div>
              <input
                className="field"
                placeholder="0x... or vitalik.eth"
                value={recipient}
                onChange={function (e) {
                  setRecipient(e.target.value)
                  setError('')
                  setResolvedAddr('')
                }}
              />
              {resolvingENS && <p className="field-hint">Resolving ENS...</p>}
              {ensDisplay && !resolvingENS && (
                <p className="field-hint positive">
                  ✓ {ensDisplay.slice(0, 10)}...{ensDisplay.slice(-4)}
                </p>
              )}
              {showContacts && contacts.length > 0 && (
                <div
                  style={{
                    marginTop: 6,
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    overflow: 'hidden',
                    maxHeight: 160,
                    overflowY: 'auto',
                  }}
                >
                  {contacts.map(function (c) {
                    return (
                      <button
                        key={c.address}
                        onClick={function () {
                          setRecipient(c.address)
                          setShowContacts(false)
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          width: '100%',
                          padding: '8px 12px',
                          background: 'var(--bg3)',
                          border: 'none',
                          borderBottom: '1px solid var(--border)',
                          cursor: 'pointer',
                          fontFamily: 'var(--font)',
                          textAlign: 'left',
                        }}
                      >
                        <span
                          style={{
                            fontWeight: 700,
                            fontSize: 12,
                            color: 'var(--text)',
                          }}
                        >
                          {c.name}
                        </span>
                        <span
                          style={{
                            fontSize: 10,
                            color: 'var(--text3)',
                            fontFamily: 'var(--font-mono)',
                          }}
                        >
                          {c.address.slice(0, 10)}...{c.address.slice(-6)}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Amount</label>
              <div className="amount-input-row">
                <input
                  className="field"
                  type="number"
                  placeholder="0.0"
                  value={amount}
                  min="0"
                  step="any"
                  onChange={function (e) {
                    setAmount(e.target.value)
                  }}
                />
                <button
                  className="max-btn"
                  onClick={function () {
                    setAmount(String(balance))
                  }}
                >
                  MAX
                </button>
              </div>
              <p className="field-hint">
                {'≈ $' +
                  usdValue +
                  ' · Balance: ' +
                  balance.toFixed(6) +
                  ' ' +
                  token}
              </p>
            </div>

            <div className="gas-row">
              <span className="gas-label">⛽ Est. gas</span>
              <span className="gas-value">
                {(gasInfo && gasInfo.gwei) || '—'} Gwei
              </span>
            </div>

            {error && <p className="error-msg">{error}</p>}

            <button
              className="btn-primary full-width"
              onClick={function () {
                setError('')
                if (validate()) setStep('confirm')
              }}
            >
              Review →
            </button>
          </div>
        )}

        {step === 'confirm' && (
          <div className="modal-body">
            <div className="confirm-card">
              <p className="confirm-label">Sending</p>
              <p className="confirm-amount">
                {amount} {token}
              </p>
              <p className="confirm-usd">{'≈ $' + usdValue}</p>
            </div>
            <div className="confirm-detail">
              <div className="confirm-row">
                <span>To</span>
                <span className="mono">
                  {finalAddr.slice(0, 10)}...{finalAddr.slice(-6)}
                </span>
              </div>
              <div className="confirm-row">
                <span>Network</span>
                <span>{activeChain}</span>
              </div>
              <div className="confirm-row">
                <span>Gas</span>
                <span>
                  {'~' + ((gasInfo && gasInfo.ethCost) || '—') + ' ETH'}
                </span>
              </div>
            </div>
            <div className="confirm-warning">
              ⚠️ Transactions cannot be reversed. Verify all details.
            </div>
            {error && <p className="error-msg">{error}</p>}
            <div className="btn-row">
              <button
                className="btn-secondary"
                onClick={function () {
                  setStep('form')
                }}
              >
                Edit
              </button>
              <button
                className="btn-primary"
                onClick={handleSend}
                disabled={sending}
              >
                {sending ? 'Sending...' : 'Confirm Send'}
              </button>
            </div>
          </div>
        )}

        {step === 'success' && (
          <div className="modal-body center">
            <div className="success-icon">✓</div>
            <h3 className="success-title">Sent!</h3>
            <p className="success-sub">
              {amount + ' ' + token + ' sent successfully'}
            </p>
            <div className="tx-hash-box">
              <span className="tx-hash-label">Tx Hash</span>
              <span className="tx-hash-value mono">
                {txHash.slice(0, 22) + '...'}
              </span>
            </div>
            <a
              href={explorerTxUrl}
              target="_blank"
              rel="noreferrer"
              className="btn-secondary full-width"
              style={{ textAlign: 'center', display: 'block', marginTop: 8 }}
            >
              View on Explorer ↗
            </a>
            <button
              className="btn-primary full-width"
              onClick={onClose}
              style={{ marginTop: 8 }}
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
