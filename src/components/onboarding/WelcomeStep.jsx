import { useState, useEffect } from 'react'

export function WelcomeStep({ onSelectCreate, onSelectImport, onBack }) {
  const [selectedLength, setSelectedLength] = useState(12)
  const [walletCount, setWalletCount] = useState(12847)
  const [todayCount, setTodayCount] = useState(42)
  
  // Simulate live growth
  useEffect(() => {
    const interval = setInterval(() => {
      setTodayCount(prev => prev + 1)
      setWalletCount(prev => prev + 1)
    }, 15000) // New wallet every 15 seconds
    
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="step-content">
      {onBack && (
        <button 
          className="back-to-home-btn"
          onClick={onBack}
          style={{
            position: 'absolute',
            top: 20,
            left: 20,
            background: 'none',
            border: 'none',
            color: '#6366f1',
            cursor: 'pointer',
            fontSize: 14,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          ← Back to Home
        </button>
      )}
      <div style={{ textAlign: 'center', marginBottom: 6 }}>
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            background: 'linear-gradient(135deg,#6366f1,#a78bfa)',
            boxShadow: '0 8px 16px rgba(99,102,241,0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 32,
            margin: '0 auto 16px',
            color: 'white',
          }}
        >
          ◈
        </div>
        <h1 className="step-title" style={{ fontSize: 24, marginBottom: 8 }}>
          Welcome to Toklo
        </h1>
        <p
          className="step-sub"
          style={{
            fontSize: 14,
            marginBottom: 20,
            lineHeight: 1.6,
            padding: '0 4px',
          }}
        >
          A non-custodial Web3 wallet with built-in DeFi, live market prices, and
          an AI agent — all free.
        </p>

        {/* Social Proof - Belonging Trigger */}
        <div
          style={{
            padding: '12px 16px',
            background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(167,139,250,0.1))',
            border: '1px solid rgba(99,102,241,0.2)',
            borderRadius: 10,
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 20 }}>👥</span>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, margin: 0, color: '#0f172a' }}>
                Join {walletCount.toLocaleString()}+ users
              </p>
              <p style={{ fontSize: 11, margin: '2px 0 0', color: '#10b981', fontWeight: 600 }}>
                ↑ +{todayCount} wallets created today
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: -8 }}>
            {['🟣', '🔵', '🟢', '🟡'].map((emoji, i) => (
              <span
                key={i}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: 'white',
                  border: '2px solid white',
                  marginLeft: i > 0 ? '-8px' : '0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                }}
              >
                {emoji}
              </span>
            ))}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            marginBottom: 20,
          }}
        >
          {[
            ['⇄', 'Swap, stake and lend', 'Uniswap V3 · Aave · Lido'],
            ['◈', 'Earn with DWT token', 'Stake DWT → earn ETH rewards'],
            ['📈', 'Live prices — 20 coins', 'BTC, ETH, SOL and more'],
          ].map(([icon, title, sub]) => (
            <div
              key={title}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 14px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 10,
              }}
            >
              <span
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: 'rgba(99,102,241,0.1)',
                  color: '#6366f1',
                  fontSize: 16,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {icon}
              </span>
              <div style={{ textAlign: 'left' }}>
                <p
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    margin: 0,
                    color: '#0f172a',
                  }}
                >
                  {title}
                </p>
                <p
                  style={{
                    fontSize: 11,
                    color: '#94a3b8',
                    margin: '2px 0 0',
                  }}
                >
                  {sub}
                </p>
              </div>
            </div>
          ))}
        </div>

        <button
          className="btn-primary full-width"
          onClick={() => onSelectCreate(selectedLength)}
          style={{ marginBottom: 10 }}
        >
          Create new wallet →
        </button>

        {/* Exclusivity & Status Triggers */}
        <div
          style={{
            padding: '10px 14px',
            background: 'rgba(245,158,11,0.08)',
            border: '1px solid rgba(245,158,11,0.2)',
            borderRadius: 8,
            marginBottom: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span style={{ fontSize: 16 }}>⚡</span>
          <p style={{ fontSize: 11, margin: 0, color: '#f59e0b', fontWeight: 600 }}>
            Early adopters get exclusive NFT badge + bonus DWT rewards
          </p>
        </div>

        <div
          style={{
            display: 'flex',
            gap: 10,
            marginBottom: 12,
          }}
        >
          {[12, 24].map(length => (
            <button
              key={length}
              onClick={() => setSelectedLength(length)}
              style={{
                flex: 1,
                padding: '14px 16px',
                background: selectedLength === length ? 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(167,139,250,0.15))' : '#f8fafc',
                border: `2px solid ${selectedLength === length ? '#6366f1' : '#e2e8f0'}`,
                borderRadius: 10,
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                textAlign: 'center',
                position: 'relative',
                transform: selectedLength === length ? 'scale(1.02)' : 'scale(1)',
                boxShadow: selectedLength === length ? '0 4px 12px rgba(99,102,241,0.2)' : 'none',
              }}
            >
              {length === 24 && (
                <span
                  style={{
                    position: 'absolute',
                    top: -8,
                    right: -8,
                    background: 'linear-gradient(135deg, #f59e0b, #fbbf24)',
                    color: 'white',
                    fontSize: 9,
                    fontWeight: 700,
                    padding: '3px 6px',
                    borderRadius: 6,
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  }}
                >
                  PRO
                </span>
              )}
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: selectedLength === length ? '#6366f1' : '#0f172a',
                  marginBottom: 4,
                }}
              >
                {length} words
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: selectedLength === length ? '#6366f1' : '#94a3b8',
                  marginBottom: 4,
                }}
              >
                {length === 12 ? 'Standard' : 'Extended'}
              </div>
              {length === 24 && (
                <div
                  style={{
                    fontSize: 9,
                    color: '#f59e0b',
                    fontWeight: 600,
                  }}
                >
                  256-bit security
                </div>
              )}
              {length === 12 && (
                <div
                  style={{
                    fontSize: 9,
                    color: '#10b981',
                    fontWeight: 600,
                  }}
                >
                  128-bit security
                </div>
              )}
            </button>
          ))}
        </div>

        <button
          className="btn-secondary full-width"
          onClick={onSelectImport}
        >
          Import existing wallet
        </button>
        
        {/* Fear + Curiosity Gap Trigger */}
        <div
          style={{
            marginTop: 12,
            padding: '10px 14px',
            background: 'rgba(239,68,68,0.05)',
            border: '1px solid rgba(239,68,68,0.15)',
            borderRadius: 8,
          }}
        >
          <p style={{ fontSize: 10, margin: '0 0 4px', color: '#ef4444', fontWeight: 600 }}>
            ⚠️ Don't lose access to your crypto
          </p>
          <p style={{ fontSize: 10, margin: 0, color: '#94a3b8', lineHeight: 1.5 }}>
            1 in 4 crypto users lose access to their funds. Your seed phrase is the ONLY way to recover your wallet.
          </p>
        </div>
        
        <p
          style={{
            fontSize: 11,
            color: '#94a3b8',
            textAlign: 'center',
            marginTop: 12,
            lineHeight: 1.6,
          }}
        >
          🔒 Your keys never leave your device · Free forever · Open source
        </p>
      </div>
    </div>
  )
}
