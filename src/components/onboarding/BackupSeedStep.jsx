export function BackupSeedStep({
  words,
  newMnemonic,
  seedRevealed,
  setSeedRevealed,
  seedCopied,
  setSeedCopied,
  checkedWrite,
  setCheckedWrite,
  checkedStore,
  setCheckedStore,
  onNext,
}) {
  return (
    <div className="step-content">
      {/* Progress Indicator */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 20,
          padding: '0 4px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: '#6366f1', fontWeight: 700 }}>
            Step 2 of 4
          </span>
          <span style={{ fontSize: 11, color: '#94a3b8' }}>
            50%
          </span>
        </div>
        <div style={{ flex: 1, marginLeft: 12 }}>
          <div
            style={{
              height: 4,
              background: '#e2e8f0',
              borderRadius: 2,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: '50%',
                height: '100%',
                background: 'linear-gradient(90deg, #6366f1, #a78bfa)',
                borderRadius: 2,
                transition: 'width 0.3s ease',
              }}
            />
          </div>
        </div>
      </div>

      <div style={{ textAlign: 'center', marginBottom: 4 }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: 'rgba(245,158,11,0.12)',
            border: '2px solid var(--amber)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 26,
            margin: '0 auto 10px',
          }}
        >
          📝
        </div>
        <h2
          className="step-title"
          style={{ fontSize: 20, marginBottom: 4 }}
        >
          Back up your recovery phrase
        </h2>
        <p className="step-sub" style={{ margin: 0 }}>
          These {words.length} words are the only way to recover your wallet. Write them on
          paper — in order.
        </p>
      </div>

      {/* Fear Trigger - Statistics */}
      <div
        style={{
          padding: '12px 14px',
          background: 'rgba(239,68,68,0.06)',
          border: '1px solid rgba(239,68,68,0.2)',
          borderRadius: 10,
          marginBottom: 16,
          display: 'flex',
          alignItems: 'flex-start',
          gap: 10,
        }}
      >
        <span style={{ fontSize: 20, flexShrink: 0 }}>⚠️</span>
        <div>
          <p style={{ fontSize: 12, fontWeight: 700, margin: '0 0 4px', color: '#ef4444' }}>
            $2.4B lost in 2025 due to poor seed backup
          </p>
          <p style={{ fontSize: 11, margin: 0, color: '#94a3b8', lineHeight: 1.5 }}>
            Don't become a statistic. This is the MOST critical step in wallet creation.
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {[
          [
            '✗',
            'var(--red)',
            'rgba(239,68,68,0.08)',
            'rgba(239,68,68,0.25)',
            'Never screenshot or save digitally',
          ],
          [
            '✗',
            'var(--red)',
            'rgba(239,68,68,0.08)',
            'rgba(239,68,68,0.25)',
            'Never share with anyone — including Toklo support',
          ],
          [
            '✓',
            'var(--green)',
            'rgba(16,185,129,0.08)',
            'rgba(16,185,129,0.25)',
            'Write on paper and store offline in a safe place',
          ],
        ].map(([icon, color, bg, border, text]) => (
          <div
            key={text}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '9px 12px',
              background: bg,
              border: `1px solid ${border}`,
              borderRadius: 'var(--radius-sm)',
            }}
          >
            <span
              style={{
                width: 20,
                height: 20,
                borderRadius: '50%',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                fontWeight: 700,
                background: color,
                color: 'white',
              }}
            >
              {icon}
            </span>
            <span
              style={{
                fontSize: 12,
                color: 'var(--text2)',
                fontWeight: 500,
              }}
            >
              {text}
            </span>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--text2)',
            }}
          >
            Your {words.length}-word recovery phrase
          </span>
          {seedRevealed && (
            <button
              onClick={() => setSeedRevealed(false)}
              style={{
                background: 'none',
                border: 'none',
                fontSize: 11,
                color: 'var(--text3)',
                cursor: 'pointer',
                fontFamily: 'var(--font)',
                padding: '2px 6px',
              }}
            >
              Hide 🙈
            </button>
          )}
        </div>
        <div
          style={{
            position: 'relative',
            borderRadius: 'var(--radius-sm)',
            overflow: 'hidden',
          }}
        >
          {!seedRevealed && (
            <div
              onClick={() => setSeedRevealed(true)}
              style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(10,12,20,0.88)',
                backdropFilter: 'blur(2px)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                zIndex: 10,
                gap: 10,
                borderRadius: 'var(--radius-sm)',
              }}
            >
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: '50%',
                  background: 'rgba(99,102,241,0.2)',
                  border: '2px solid rgba(99,102,241,0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 24,
                  animation: 'pulse 2s ease infinite',
                }}
              >
                👁
              </div>
              <div style={{ textAlign: 'center' }}>
                <p
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: 'white',
                    margin: '0 0 4px',
                  }}
                >
                  Tap to reveal your {words.length} words
                </p>
                <p
                  style={{
                    fontSize: 11,
                    color: 'rgba(255,255,255,0.45)',
                    margin: 0,
                    lineHeight: 1.5,
                  }}
                >
                  Make sure no one around you can see your screen
                </p>
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '5px 14px',
                  background: 'rgba(99,102,241,0.25)',
                  border: '1px solid rgba(99,102,241,0.4)',
                  borderRadius: 20,
                }}
              >
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>
                  🔒 Blurred for your privacy
                </span>
              </div>
              {/* Curiosity Gap */}
              <div
                style={{
                  marginTop: 8,
                  padding: '6px 12px',
                  background: 'rgba(245,158,11,0.15)',
                  border: '1px solid rgba(245,158,11,0.3)',
                  borderRadius: 6,
                }}
              >
                <span style={{ fontSize: 10, color: '#fbbf24', fontWeight: 600 }}>
                  👆 These words are worth real money — protect them!
                </span>
              </div>
            </div>
          )}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3,1fr)',
              gap: 6,
              padding: 12,
              background: 'var(--bg3)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              filter: seedRevealed ? 'none' : 'blur(6px)',
              userSelect: seedRevealed ? 'text' : 'none',
              transition: 'filter 0.3s',
            }}
          >
            {words.map((word, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 10px',
                  background: 'var(--bg2)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                }}
              >
                <span
                  style={{
                    fontSize: 9,
                    color: 'var(--text3)',
                    minWidth: 14,
                    fontWeight: 700,
                  }}
                >
                  {i + 1}
                </span>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--text)',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  {word}
                </span>
              </div>
            ))}
          </div>
        </div>
        {seedRevealed && (
          <>
            <button
              onClick={() => {
                navigator.clipboard.writeText(newMnemonic)
                setSeedCopied(true)
                setTimeout(() => setSeedCopied(false), 2500)
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: '9px 16px',
                width: '100%',
                fontFamily: 'var(--font)',
                background: seedCopied ? 'rgba(16,185,129,0.12)' : 'var(--bg3)',
                border: `1px solid ${seedCopied ? 'rgba(16,185,129,0.4)' : 'var(--border)'}`,
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 600,
                color: seedCopied ? 'var(--green)' : 'var(--text2)',
                transition: 'all 0.2s',
              }}
            >
              {seedCopied ? (
                <>
                  <span>✓</span>
                  <span>Copied to clipboard</span>
                </>
              ) : (
                <>
                  <span>⎘</span>
                  <span>Copy all {words.length} words</span>
                </>
              )}
            </button>
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 8,
                padding: '9px 12px',
                background: 'rgba(99,102,241,0.06)',
                border: '1px solid rgba(99,102,241,0.15)',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              <span style={{ fontSize: 13, flexShrink: 0 }}>💡</span>
              <p
                style={{
                  fontSize: 11,
                  color: 'var(--text3)',
                  margin: 0,
                  lineHeight: 1.6,
                }}
              >
                Best practice: write on paper, place in an envelope, store in a
                fireproof safe. Never save in a password manager, cloud drive,
                or email.
              </p>
            </div>
          </>
        )}
      </div>
      {seedRevealed && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            padding: '14px 16px',
            background: 'var(--bg3)',
            border: '2px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
          }}
        >
          <p
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: '#ef4444',
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            ⚠️ Critical Security Checkpoint
          </p>
          <label
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
              cursor: 'pointer',
              padding: '8px 10px',
              background: 'rgba(16,185,129,0.05)',
              borderRadius: 6,
            }}
          >
            <input
              type="checkbox"
              checked={checkedWrite}
              onChange={e => setCheckedWrite(e.target.checked)}
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
                color: 'var(--text)',
                lineHeight: 1.6,
                fontWeight: 500,
              }}
            >
              I have written down all {words.length} words{' '}
              <strong style={{ color: '#10b981' }}>in the correct order</strong> on paper
            </span>
          </label>
          <label
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
              cursor: 'pointer',
              padding: '8px 10px',
              background: 'rgba(239,68,68,0.05)',
              borderRadius: 6,
            }}
          >
            <input
              type="checkbox"
              checked={checkedStore}
              onChange={e => setCheckedStore(e.target.checked)}
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
                color: 'var(--text)',
                lineHeight: 1.6,
                fontWeight: 500,
              }}
            >
              I understand that losing this phrase means{' '}
              <strong style={{ color: '#ef4444' }}>PERMANENT LOSS</strong> of all my funds — no recovery possible
            </span>
          </label>
        </div>
      )}
      {!seedRevealed && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '12px 14px',
            background: 'linear-gradient(135deg, rgba(245,158,11,0.1), rgba(251,191,36,0.05))',
            border: '1px solid rgba(245,158,11,0.3)',
            borderRadius: 'var(--radius-sm)',
          }}
        >
          <span style={{ fontSize: 16, flexShrink: 0 }}>👆</span>
          <span
            style={{
              fontSize: 12,
              color: '#f59e0b',
              fontWeight: 600,
            }}
          >
            Tap the phrase above to reveal your {words.length} words
          </span>
        </div>
      )}
      <button
        className="btn-primary full-width"
        disabled={!seedRevealed || !checkedWrite || !checkedStore}
        style={{
          opacity: seedRevealed && checkedWrite && checkedStore ? 1 : 0.45,
          transition: 'opacity 0.2s',
        }}
        onClick={onNext}
      >
        I&apos;ve saved it safely — Continue →
      </button>
    </div>
  )
}
