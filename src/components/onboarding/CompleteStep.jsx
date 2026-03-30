export function CompleteStep({ flow }) {
  return (
    <div
      className="step-content"
      style={{ textAlign: 'center', padding: '8px 0' }}
    >
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: '50%',
          background: 'var(--green-light)',
          border: '2px solid var(--green)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 32,
          margin: '0 auto 16px',
        }}
      >
        ✓
      </div>
      <h2 className="step-title" style={{ fontSize: 22 }}>
        {flow === 'import' ? 'Wallet imported!' : 'Wallet created!'}
      </h2>
      <p className="step-sub" style={{ marginBottom: 20 }}>
        {flow === 'import'
          ? 'Your wallet is ready. You now have full access to your funds on Toklo.'
          : 'Your wallet is secured and your seed phrase is backed up. Welcome to Toklo.'}
      </p>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          marginBottom: 20,
          textAlign: 'left',
        }}
      >
        {[
          flow === 'import'
            ? '✓ Wallet successfully restored'
            : '✓ Wallet created and encrypted',
          flow === 'import'
            ? '✓ Password set for this device'
            : '✓ Seed phrase backed up',
          '✓ Connected to Ethereum mainnet',
          '✓ Live prices loading for 20+ coins',
        ].map(item => (
          <div
            key={item}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 12px',
              background: 'var(--bg3)',
              border: '1px solid rgba(16,185,129,0.2)',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            <span
              style={{
                color: 'var(--green)',
                fontWeight: 700,
                fontSize: 13,
              }}
            >
              {item}
            </span>
          </div>
        ))}
      </div>
      <div
        style={{
          padding: '12px 16px',
          background: 'var(--accent-light)',
          border: '1px solid rgba(99,102,241,0.2)',
          borderRadius: 'var(--radius-sm)',
          marginBottom: 20,
          textAlign: 'left',
        }}
      >
        <p
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: 'var(--accent)',
            margin: '0 0 4px',
          }}
        >
          ◈ Welcome gift
        </p>
        <p
          style={{
            fontSize: 12,
            color: 'var(--text2)',
            margin: 0,
            lineHeight: 1.5,
          }}
        >
          Share your referral link from Settings and earn 50 DWT for every friend
          who creates a wallet.
        </p>
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          justifyContent: 'center',
          fontSize: 12,
          color: 'var(--text3)',
        }}
      >
        <div
          style={{
            width: 20,
            height: 20,
            borderRadius: '50%',
            border: '2px solid var(--accent)',
            borderTopColor: 'transparent',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        Entering your wallet...
      </div>
    </div>
  )
}
