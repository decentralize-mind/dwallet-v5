import { useState, useEffect, useRef, useCallback } from 'react'
import { decryptData } from '../utils/crypto'
import { useWallet } from '../hooks/useWallet'
import { exportTransactionsCSV } from '../utils/csvExport'

function getReferralLink(address) {
  const code = address ? 'DW' + address.slice(2, 8).toUpperCase() : 'DWALLET'
  return 'https://www.toklo.xyz/?ref=' + code
}

export default function SettingsView({ onNavigate }) {
  console.log('SettingsView rendering...')
  
  const {
    wallet,
    lockWallet,
    resetWallet,
    transactions,
    currentAddress,
  } = useWallet()
  
  console.log('SettingsView wallet state:', { wallet, currentAddress, transactions })
  const [showSeed, setShowSeed] = useState(false)
  const [showReset, setShowReset] = useState(false)
  const [seedPwd, setSeedPwd] = useState('')
  const [seedErr, setSeedErr] = useState('')
  const [exportStatus, setExportStatus] = useState('')
  const [decryptedMnemonic, setDecryptedMnemonic] = useState('')
  const [revealed, setRevealed] = useState(false)
  const [currency, setCurrency] = useState(
    localStorage.getItem('dwallet_currency') || 'USD',
  )
  const [themeVal, setThemeVal] = useState(
    localStorage.getItem('dwallet_theme') || 'dark',
  )
  const [copied, setCopied] = useState(false)
  const [notifPerm, setNotifPerm] = useState('default')
  
  // Anti-phishing code state
  const [phishingCode, setPhishingCode] = useState(
    localStorage.getItem('dwallet_phishing_code') || ''
  )
  const [showPhishingSetup, setShowPhishingSetup] = useState(false)
  const [customPhishingCode, setCustomPhishingCode] = useState('')
  
  // Seed phrase security features
  const [seedCountdown, setSeedCountdown] = useState(30) // Auto-hide after 30 seconds
  const [revealedWords, setRevealedWords] = useState({}) // Track which words are revealed
  const seedTimerRef = useRef(null)
  const countdownRef = useRef(null)

  useEffect(() => {
    if (typeof Notification !== 'undefined') {
      setNotifPerm(Notification.permission)
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('dwallet_currency', currency)
  }, [currency])

  useEffect(() => {
    localStorage.setItem('dwallet_theme', themeVal)
    try {
      const r = document.documentElement
      if (themeVal === 'light') {
        r.style.setProperty('--bg', '#ffffff')
        r.style.setProperty('--bg2', '#f8f9fa')
        r.style.setProperty('--bg3', '#f0f2f5')
        r.style.setProperty('--bg4', '#e4e6ea')
        r.style.setProperty('--text', '#0d0f14')
        r.style.setProperty('--text2', '#4a5568')
        r.style.setProperty('--text3', '#9aa5b4')
        r.style.setProperty('--border', 'rgba(0,0,0,0.1)')
      } else {
        ;[
          '--bg',
          '--bg2',
          '--bg3',
          '--bg4',
          '--text',
          '--text2',
          '--text3',
          '--border',
        ].forEach(v => r.style.removeProperty(v))
      }
    } catch (err) {
      console.error('Theme application error:', err)
    }
  }, [themeVal])

  const handleExport = () => {
    if (!transactions || transactions.length === 0) {
      setExportStatus('empty')
      setTimeout(() => setExportStatus(''), 3000)
      return
    }
    const ok = exportTransactionsCSV(transactions, currentAddress || 'wallet')
    if (ok) {
      setExportStatus('success')
      setTimeout(() => setExportStatus(''), 3000)
    }
  }

  const handleCopyRef = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(getReferralLink(currentAddress))
        .then(() => {
          setCopied(true)
          setTimeout(() => setCopied(false), 2000)
        })
        .catch(err => console.error('Copy failed:', err))
    }
  }

  const handleEnableNotif = async () => {
    if (typeof Notification === 'undefined') return
    const status = await Notification.requestPermission()
    setNotifPerm(status)
  }

  const handleRevealSeed = async () => {
    if (!seedPwd.trim()) return setSeedErr('Enter your password')
    setSeedErr('')
    try {
      const stored = localStorage.getItem('dwallet_v5_encrypted')
      if (!stored) return setSeedErr('No wallet found in storage')
      const data = JSON.parse(await decryptData(stored, seedPwd))
      const phrase = data?.mnemonic || null
      if (phrase && phrase.trim().split(' ').length >= 12) {
        setDecryptedMnemonic(phrase.trim())
        setRevealed(true)
        setSeedCountdown(30)
        
        // Start countdown timer
        if (countdownRef.current) clearInterval(countdownRef.current)
        countdownRef.current = setInterval(() => {
          setSeedCountdown(prev => {
            if (prev <= 1) {
              // Auto-hide seed phrase
              setShowSeed(false)
              setRevealed(false)
              setSeedPwd('')
              setRevealedWords({})
              if (countdownRef.current) clearInterval(countdownRef.current)
              if (seedTimerRef.current) clearTimeout(seedTimerRef.current)
              return 0
            }
            return prev - 1
          })
        }, 1000)
      } else {
        setSeedErr('Seed phrase not found in wallet data')
      }
    } catch (err) {
      console.error('Seed reveal failure:', err)
      setSeedErr('Incorrect password — please try again')
    }
  }
  
  // Toggle individual word reveal
  const toggleWordReveal = useCallback((index) => {
    setRevealedWords(prev => ({
      ...prev,
      [index]: !prev[index]
    }))
  }, [])
  
  // Reveal all words
  const revealAllWords = useCallback(() => {
    const words = decryptedMnemonic.split(' ').filter(w => w.length > 0)
    const allRevealed = words.reduce((acc, _, i) => {
      acc[i] = true
      return acc
    }, {})
    setRevealedWords(allRevealed)
  }, [decryptedMnemonic])
  
  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current)
      if (seedTimerRef.current) clearTimeout(seedTimerRef.current)
    }
  }, [])
  
  // Anti-phishing code functions
  const generatePhishingCode = () => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase()
    localStorage.setItem('dwallet_phishing_code', code)
    setPhishingCode(code)
    setShowPhishingSetup(false)
  }
  
  const saveCustomPhishingCode = () => {
    if (customPhishingCode.trim().length < 4) {
      alert('Code must be at least 4 characters')
      return
    }
    if (customPhishingCode.trim().length > 20) {
      alert('Code must be less than 20 characters')
      return
    }
    const code = customPhishingCode.trim().toUpperCase()
    localStorage.setItem('dwallet_phishing_code', code)
    setPhishingCode(code)
    setShowPhishingSetup(false)
    setCustomPhishingCode('')
  }
  
  const clearPhishingCode = () => {
    localStorage.removeItem('dwallet_phishing_code')
    setPhishingCode('')
  }

  return (
    <div className="view-container">
      <div className="view-header">
        <h2 className="view-title">Settings</h2>
      </div>

      <section className="settings-section">
        <h3 className="settings-group-title">Wallet</h3>
        <div className="settings-list">
          <div className="settings-item">
            <div>
              <p className="settings-label">Accounts</p>
              <p className="settings-sub">
                {wallet?.accounts?.length || 0} account(s)
              </p>
            </div>
          </div>
          <div
            className="settings-item clickable"
            onClick={() => setShowSeed(true)}
          >
            <div>
              <p className="settings-label">Secret Recovery Phrase</p>
              <p className="settings-sub">Back up your seed phrase</p>
            </div>
            <span className="settings-arrow">›</span>
          </div>
          <div className="settings-item clickable" onClick={lockWallet}>
            <div>
              <p className="settings-label">Lock Wallet</p>
            </div>
            <span className="settings-arrow">›</span>
          </div>
        </div>
      </section>

      <section className="settings-section">
        <h3 className="settings-group-title">Tools</h3>
        <div className="settings-list">
          {[
            ['Address Book', 'Save contacts', 'addressbook'],
            ['Price Alerts', 'Get notified on price moves', 'alerts'],
            ['Gas Tracker', 'Monitor gas prices', 'gas'],
            ['Import Token', 'Add any ERC-20 token', 'tokenimport'],
          ].map(([label, sub, view]) => (
            <div
              key={view}
              className="settings-item clickable"
              onClick={() => onNavigate?.(view)}
            >
              <div>
                <p className="settings-label">{label}</p>
                <p className="settings-sub">{sub}</p>
              </div>
              <span className="settings-arrow">›</span>
            </div>
          ))}
          <div
            className="settings-item clickable"
            onClick={handleExport}
            style={{ flexDirection: 'column', alignItems: 'stretch', gap: 0 }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <p className="settings-label">Export Transactions</p>
                <p className="settings-sub">
                  Download CSV for taxes
                  {transactions?.length > 0 && (
                    <span
                      style={{
                        marginLeft: 6,
                        color: 'var(--accent)',
                        fontWeight: 600,
                      }}
                    >
                      ({transactions.length} tx)
                    </span>
                  )}
                </p>
              </div>
              <span
                style={{
                  fontSize: 18,
                  color: (() => {
                    if (exportStatus === 'success') return 'var(--green)'
                    if (exportStatus === 'empty') return 'var(--amber)'
                    return 'var(--text3)'
                  })(),
                }}
              >
                {(() => {
                  if (exportStatus === 'success') return '✓'
                  if (exportStatus === 'empty') return '⚠'
                  return '↓'
                })()}
              </span>
            </div>
            {exportStatus === 'success' && (
              <p
                style={{
                  fontSize: 11,
                  color: 'var(--green)',
                  fontWeight: 600,
                  margin: '6px 0 0',
                  padding: '6px 10px',
                  background: 'rgba(16,185,129,0.08)',
                  border: '1px solid rgba(16,185,129,0.2)',
                  borderRadius: 6,
                }}
              >
                ✓ CSV downloaded — check your Downloads folder
              </p>
            )}
            {exportStatus === 'empty' && (
              <p
                style={{
                  fontSize: 11,
                  color: 'var(--amber)',
                  fontWeight: 600,
                  margin: '6px 0 0',
                  padding: '6px 10px',
                  background: 'rgba(245,158,11,0.08)',
                  border: '1px solid rgba(245,158,11,0.2)',
                  borderRadius: 6,
                }}
              >
                No transactions yet — make a swap or send first
              </p>
            )}
            <span className="settings-arrow">↓</span>
          </div>
        </div>
      </section>

      <section className="settings-section">
        <h3 className="settings-group-title">Preferences</h3>
        <div className="settings-list">
          <div className="settings-item">
            <div>
              <p className="settings-label">Currency</p>
            </div>
            <select
              className="settings-select"
              value={currency}
              onChange={e => setCurrency(e.target.value)}
            >
              {['USD', 'EUR', 'GBP', 'JPY', 'KHR', 'SGD'].map(c => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div
            className="settings-item"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <p className="settings-label" style={{ margin: 0 }}>
              Theme
            </p>
            <select
              className="settings-select"
              value={themeVal}
              onChange={e => setThemeVal(e.target.value)}
            >
              <option value="dark">Dark</option>
              <option value="light">Light</option>
            </select>
          </div>
          <div className="settings-item">
            <div>
              <p className="settings-label">Push notifications</p>
              <p className="settings-sub">
                {notifPerm === 'granted' ? 'Enabled' : 'Click to enable'}
              </p>
            </div>
            {notifPerm === 'granted' ? (
              <span style={{ fontSize: 12, color: 'var(--green)' }}>✓ On</span>
            ) : (
              <button
                className="btn-secondary"
                style={{ padding: '4px 10px', fontSize: 12 }}
                onClick={handleEnableNotif}
              >
                Enable
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="settings-section">
        <h3 className="settings-group-title">Security</h3>
        <div className="settings-list">
          {/* Anti-Phishing Code */}
          <div
            className="settings-item"
            style={{ flexDirection: 'column', gap: 12 }}
          >
            <div>
              <p className="settings-label">Anti-Phishing Code</p>
              <p className="settings-sub">
                Unique code shown on every page to verify you're on the real site
              </p>
            </div>
            {!phishingCode ? (
              <div style={{ display: 'flex', gap: 8, width: '100%' }}>
                <button
                  className="btn-primary"
                  onClick={() => setShowPhishingSetup(true)}
                  style={{ flex: 1 }}
                >
                  Generate Random Code
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => setShowPhishingSetup(true)}
                  style={{ flex: 1 }}
                >
                  Custom Code
                </button>
              </div>
            ) : (
              <div style={{ width: '100%' }}>
                <div
                  style={{
                    background: 'var(--bg3)',
                    padding: '16px',
                    borderRadius: '8px',
                    textAlign: 'center',
                    fontSize: '28px',
                    fontWeight: 'bold',
                    letterSpacing: '6px',
                    color: 'var(--accent)',
                    marginBottom: '12px',
                    border: '2px solid var(--accent)',
                  }}
                >
                  {phishingCode}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    className="btn-secondary"
                    onClick={() => {
                      setShowPhishingSetup(true)
                      setCustomPhishingCode('')
                    }}
                    style={{ flex: 1, fontSize: '12px' }}
                  >
                    Change Code
                  </button>
                  <button
                    className="btn-danger"
                    onClick={clearPhishingCode}
                    style={{ flex: 1, fontSize: '12px', padding: '8px' }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="settings-section">
        <h3 className="settings-group-title">Referral Program</h3>
        <div className="settings-list">
          <div
            className="settings-item"
            style={{
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: 10,
            }}
          >
            <div>
              <p className="settings-label">Your referral link</p>
              <p className="settings-sub">Share and earn 50 DWT per signup</p>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: 'var(--bg3)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                padding: '8px 12px',
                width: '100%',
              }}
            >
              <span
                style={{
                  flex: 1,
                  fontSize: 11,
                  color: 'var(--text3)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                {getReferralLink(currentAddress)}
              </span>
              <button
                onClick={handleCopyRef}
                style={{
                  background: 'var(--accent)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 6,
                  padding: '5px 12px',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  fontFamily: 'var(--font)',
                }}
              >
                {copied ? '✓ Copied!' : 'Copy'}
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="settings-section">
        <h3 className="settings-group-title">Install App (PWA)</h3>
        <div className="settings-list">
          <div
            className="settings-item"
            style={{
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: 8,
            }}
          >
            <div>
              <p className="settings-label">Add to home screen</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <p style={{ fontSize: 12, color: 'var(--text2)' }}>
                📱 iOS Safari: Share → &quot;Add to Home Screen&quot;
              </p>
              <p style={{ fontSize: 12, color: 'var(--text2)' }}>
                🤖 Android Chrome: Menu → &quot;Add to Home Screen&quot;
              </p>
              <p style={{ fontSize: 12, color: 'var(--text2)' }}>
                💻 Desktop Chrome: Install icon in address bar
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="settings-section">
        <h3 className="settings-group-title">About</h3>
        <div className="settings-list">
          <div className="settings-item">
            <p className="settings-label">Version</p>
            <span className="settings-value">Toklo v1.0.0</span>
          </div>
          <div className="settings-item">
            <p className="settings-label">Network</p>
            <span className="settings-value">Mainnet</span>
          </div>
        </div>
      </section>

      <section className="settings-section danger-section">
        <h3 className="settings-group-title danger-title">Danger Zone</h3>
        <button className="btn-danger" onClick={() => setShowReset(true)}>
          Reset Wallet
        </button>
      </section>

      {showSeed && (
        <div
          className="modal-overlay"
          onClick={() => {
            setShowSeed(false)
            setRevealed(false)
            setSeedPwd('')
            setRevealedWords({})
            if (countdownRef.current) clearInterval(countdownRef.current)
          }}
        >
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Secret Recovery Phrase</h2>
              <button
                className="modal-close"
                onClick={() => {
                  setShowSeed(false)
                  setRevealed(false)
                  setSeedPwd('')
                  setRevealedWords({})
                  if (countdownRef.current) clearInterval(countdownRef.current)
                }}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              {!revealed ? (
                <>
                  <div className="seed-warning" style={{
                    background: 'rgba(239,68,68,0.1)',
                    border: '2px solid rgba(239,68,68,0.3)',
                    padding: '16px',
                    borderRadius: '8px',
                    marginBottom: '16px'
                  }}>
                    <h3 style={{ color: '#ef4444', margin: '0 0 12px', fontSize: '14px' }}>
                      ⚠️ CRITICAL WARNING
                    </h3>
                    <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', lineHeight: '1.8', color: 'var(--text2)' }}>
                      <li><strong>Never share this phrase with ANYONE</strong></li>
                      <li>Toklo support will <strong>NEVER</strong> ask for this</li>
                      <li>Clipboard may be monitored by malicious apps</li>
                      <li>Write it down on paper and store securely</li>
                      <li>This phrase will <strong>auto-hide in 30 seconds</strong></li>
                    </ul>
                  </div>
                  <input
                    type="password"
                    className="field"
                    placeholder="Enter your password"
                    value={seedPwd}
                    onChange={e => setSeedPwd(e.target.value)}
                  />
                  {seedErr && <p className="error-msg">{seedErr}</p>}
                  <button
                    className="btn-primary full-width"
                    onClick={handleRevealSeed}
                  >
                    Reveal
                  </button>
                </>
              ) : (
                <>
                  {/* Countdown timer */}
                  <div style={{
                    background: seedCountdown <= 10 ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
                    border: `1px solid ${seedCountdown <= 10 ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)'}`,
                    padding: '12px',
                    borderRadius: '8px',
                    textAlign: 'center',
                    marginBottom: '16px'
                  }}>
                    <span style={{
                      fontSize: '14px',
                      fontWeight: '600',
                      color: seedCountdown <= 10 ? '#ef4444' : '#f59e0b'
                    }}>
                      ⏱️ Auto-hiding in {seedCountdown} seconds
                    </span>
                  </div>
                  
                  {/* Tap-to-reveal instruction */}
                  <p style={{
                    fontSize: '12px',
                    color: 'var(--text3)',
                    textAlign: 'center',
                    margin: '0 0 12px'
                  }}>
                    👆 Tap each word to reveal • 
                    <button
                      onClick={revealAllWords}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--accent)',
                        cursor: 'pointer',
                        fontSize: '12px',
                        textDecoration: 'underline',
                        padding: 0
                      }}
                    >
                      Reveal All
                    </button>
                  </p>
                  
                  <div className="seed-grid">
                    {decryptedMnemonic
                      .split(' ')
                      .filter(w => w.length > 0)
                      .map((word, i) => (
                        <div
                          key={i}
                          className="seed-word"
                          onClick={() => toggleWordReveal(i)}
                          style={{
                            cursor: 'pointer',
                            userSelect: 'none',
                            position: 'relative'
                          }}
                          title="Click to reveal/hide"
                        >
                          <span className="seed-num">{i + 1}</span>
                          <span className="seed-text" style={{
                            filter: revealedWords[i] ? 'none' : 'blur(8px)',
                            transition: 'filter 0.2s'
                          }}>
                            {word}
                          </span>
                          {!revealedWords[i] && (
                            <span style={{
                              position: 'absolute',
                              top: '50%',
                              left: '50%',
                              transform: 'translate(-50%, -50%)',
                              fontSize: '10px',
                              color: 'var(--text3)',
                              pointerEvents: 'none'
                            }}>
                              Tap
                            </span>
                          )}
                        </div>
                      ))}
                  </div>
                  <button
                    className="btn-secondary full-width"
                    onClick={() => {
                      if (navigator.clipboard) {
                        navigator.clipboard.writeText(decryptedMnemonic)
                          .then(() => {
                            setCopied(true)
                            setTimeout(() => setCopied(false), 2000)
                          })
                          .catch(err => console.error('Copy failed:', err))
                      }
                    }}
                    style={{
                      marginTop: '12px',
                      background: copied ? 'rgba(16,185,129,0.1)' : 'var(--bg3)',
                      color: copied ? '#10b981' : 'var(--text2)',
                      border: '1px solid rgba(245,158,11,0.3)'
                    }}
                  >
                    {copied ? '✓ Copied!' : '⚠️ Copy to Clipboard (Warning: May be monitored)'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {showReset && (
        <div className="modal-overlay" onClick={() => setShowReset(false)}>
          <div className="modal small-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Reset Wallet</h2>
              <button
                className="modal-close"
                onClick={() => setShowReset(false)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <p className="danger-warning">
                ⚠️ This permanently deletes your wallet. Make sure you have your
                seed phrase.
              </p>
              <div className="btn-row">
                <button
                  className="btn-secondary"
                  onClick={() => setShowReset(false)}
                >
                  Cancel
                </button>
                <button className="btn-danger" onClick={resetWallet}>
                  Reset
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Anti-Phishing Code Setup Modal */}
      {showPhishingSetup && (
        <div
          className="modal-overlay"
          onClick={() => {
            setShowPhishingSetup(false)
            setCustomPhishingCode('')
          }}
        >
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Set Anti-Phishing Code</h2>
              <button
                className="modal-close"
                onClick={() => {
                  setShowPhishingSetup(false)
                  setCustomPhishingCode('')
                }}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div
                style={{
                  background: 'rgba(99,102,241,0.1)',
                  border: '1px solid rgba(99,102,241,0.3)',
                  padding: '12px',
                  borderRadius: '8px',
                  marginBottom: '16px'
                }}
              >
                <p style={{ fontSize: '13px', color: 'var(--text2)', margin: 0, lineHeight: '1.6' }}>
                  💡 <strong>What is this?</strong> Your unique code will be shown on every page.
                  If you don't see your code, you might be on a fake site!
                </p>
              </div>

              {!phishingCode ? (
                <>
                  <button
                    className="btn-primary full-width"
                    onClick={generatePhishingCode}
                    style={{ marginBottom: '12px' }}
                  >
                    🎲 Generate Random Code
                  </button>
                  
                  <div style={{ textAlign: 'center', margin: '12px 0' }}>
                    <span style={{ color: 'var(--text3)', fontSize: '12px' }}>— OR —</span>
                  </div>
                  
                  <div>
                    <p style={{ fontSize: '12px', color: 'var(--text2)', marginBottom: '8px' }}>
                      Enter your own code (4-20 characters):
                    </p>
                    <input
                      type="text"
                      className="field"
                      placeholder="e.g., MYSAFE2024"
                      value={customPhishingCode}
                      onChange={e => setCustomPhishingCode(e.target.value)}
                      maxLength={20}
                      style={{ textTransform: 'uppercase' }}
                    />
                    <button
                      className="btn-primary full-width"
                      onClick={saveCustomPhishingCode}
                      disabled={customPhishingCode.trim().length < 4}
                      style={{ marginTop: '12px' }}
                    >
                      Save Custom Code
                    </button>
                  </div>
                </>
              ) : (
                <div>
                  <p style={{ fontSize: '13px', color: 'var(--text2)', marginBottom: '12px' }}>
                    Enter new code to replace: <strong>{phishingCode}</strong>
                  </p>
                  <input
                    type="text"
                    className="field"
                    placeholder="NEW CODE"
                    value={customPhishingCode}
                    onChange={e => setCustomPhishingCode(e.target.value)}
                    maxLength={20}
                    style={{ textTransform: 'uppercase' }}
                  />
                  <button
                    className="btn-primary full-width"
                    onClick={saveCustomPhishingCode}
                    disabled={customPhishingCode.trim().length < 4}
                    style={{ marginTop: '12px' }}
                  >
                    Update Code
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
