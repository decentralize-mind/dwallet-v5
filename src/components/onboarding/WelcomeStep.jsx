export function WelcomeStep({ onSelectCreate, onSelectImport }) {
  return (
    <div className="step-content">
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
          onClick={onSelectCreate}
        >
          Create new wallet →
        </button>
        <button
          className="btn-secondary full-width"
          onClick={onSelectImport}
        >
          Import existing wallet
        </button>
        <p
          style={{
            fontSize: 11,
            color: '#94a3b8',
            textAlign: 'center',
            marginTop: 6,
            lineHeight: 1.6,
          }}
        >
          Your keys never leave your device · Free forever
        </p>
      </div>
    </div>
  )
}
