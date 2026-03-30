export function SecurityBriefingStep({ agreedTerms, setAgreedTerms, onBack, onNext }) {
  return (
    <div className="step-content">
      <div style={{ textAlign: 'center', marginBottom: 4 }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: 'var(--accent-light)',
            border: '2px solid var(--accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 26,
            margin: '0 auto 10px',
          }}
        >
          🛡️
        </div>
        <h2
          className="step-title"
          style={{ fontSize: 20, marginBottom: 4 }}
        >
          Your wallet, your rules
        </h2>
        <p className="step-sub" style={{ margin: 0 }}>
          Toklo is non-custodial. Read these 4 facts before continuing.
        </p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[
          [
            '🔑',
            'rgba(99,102,241,0.06)',
            'rgba(99,102,241,0.25)',
            '#818cf8',
            'You own your keys',
            'Your private key is generated on your device and encrypted with your password. Toklo never sees it, stores it, or has any way to access your funds.',
          ],
          [
            '📝',
            'rgba(245,158,11,0.06)',
            'rgba(245,158,11,0.25)',
            'var(--amber)',
            'Seed phrase = master key',
            'Your 12-word recovery phrase can restore your wallet on any device. Write it on paper. Store it offline. Never screenshot, save in a file, or share it with anyone.',
          ],
          [
            '⚠️',
            'rgba(239,68,68,0.06)',
            'rgba(239,68,68,0.25)',
            'var(--red)',
            'No recovery without your seed',
            'If you lose your password AND your seed phrase, your funds are permanently inaccessible. Not even Toklo, Ethereum, or any government can help.',
          ],
          [
            '⛓',
            'rgba(16,185,129,0.06)',
            'rgba(16,185,129,0.25)',
            'var(--green)',
            'No one can freeze your funds',
            "No company, government, or institution can block, freeze, or seize your wallet. Your access is guaranteed by cryptography — not by Toklo's permission.",
          ],
        ].map(([icon, bg, border, color, title, desc]) => (
          <div
            key={title}
            style={{
              background: bg,
              border: `1px solid ${border}`,
              borderRadius: 'var(--radius-sm)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 14px',
                borderBottom: `1px solid ${border}`,
              }}
            >
              <span
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: border,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 16,
                  flexShrink: 0,
                }}
              >
                {icon}
              </span>
              <p
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  margin: 0,
                  color,
                }}
              >
                {title}
              </p>
            </div>
            <p
              style={{
                fontSize: 12,
                color: 'var(--text2)',
                margin: 0,
                padding: '10px 14px',
                lineHeight: 1.6,
              }}
            >
              {desc}
            </p>
          </div>
        ))}
      </div>
      <div
        style={{
          background: 'var(--bg3)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          padding: '12px 14px',
        }}
      >
        <label
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
            cursor: 'pointer',
          }}
        >
          <input
            type="checkbox"
            checked={agreedTerms}
            onChange={e => setAgreedTerms(e.target.checked)}
            style={{
              marginTop: 2,
              flexShrink: 0,
              width: 16,
              height: 16,
              accentColor: 'var(--accent)',
            }}
          />
          <span
            style={{
              fontSize: 12,
              color: 'var(--text2)',
              lineHeight: 1.6,
            }}
          >
            I have read and understood all of the above. I am solely
            responsible for my wallet and seed phrase. I know that Toklo{' '}
            <strong>cannot</strong> recover lost funds or access my
            wallet.
          </span>
        </label>
      </div>
      <button
        className="btn-primary full-width"
        disabled={!agreedTerms}
        style={{
          opacity: agreedTerms ? 1 : 0.45,
          transition: 'opacity 0.2s',
        }}
        onClick={onNext}
      >
        I understand — set up my wallet →
      </button>
      <button className="btn-link" onClick={onBack}>
        ← Back
      </button>
    </div>
  )
}
