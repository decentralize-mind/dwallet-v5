export function VerifySeedStep({
  words,
  verifyIdxs,
  verifyWords,
  setVerifyWords,
  error,
  onVerify,
  onBack,
}) {
  // Calculate completion
  const completedCount = verifyIdxs.filter(idx => verifyWords[idx]?.trim()).length
  const totalCount = verifyIdxs.length
  const allCorrect = verifyIdxs.every(idx => 
    verifyWords[idx]?.trim().toLowerCase() === words[idx]?.toLowerCase()
  )
  const allFilled = completedCount === totalCount

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
            Step 3 of 4
          </span>
          <span style={{ fontSize: 11, color: '#94a3b8' }}>
            75%
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
                width: '75%',
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
            background: 'var(--accent-light)',
            border: '2px solid var(--accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 26,
            margin: '0 auto 10px',
          }}
        >
          ✅
        </div>
        <h2
          className="step-title"
          style={{ fontSize: 20, marginBottom: 4 }}
        >
          Verify your backup
        </h2>
        <p className="step-sub" style={{ margin: 0 }}>
          Enter the 3 words below to confirm you saved your phrase correctly.
        </p>
      </div>

      {/* Encouragement + Status */}
      {allFilled && allCorrect ? (
        <div
          style={{
            padding: '12px 14px',
            background: 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(52,211,153,0.05))',
            border: '1px solid rgba(16,185,129,0.3)',
            borderRadius: 10,
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <span style={{ fontSize: 24 }}>🎉</span>
          <div>
            <p style={{ fontSize: 12, fontWeight: 700, margin: '0 0 2px', color: '#10b981' }}>
              Perfect! All words correct
            </p>
            <p style={{ fontSize: 11, margin: 0, color: '#94a3b8' }}>
              You're 75% done — just one more step!
            </p>
          </div>
        </div>
      ) : allFilled && !allCorrect ? (
        <div
          style={{
            padding: '12px 14px',
            background: 'rgba(239,68,68,0.06)',
            border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: 10,
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <span style={{ fontSize: 20 }}>⚠️</span>
          <div>
            <p style={{ fontSize: 12, fontWeight: 700, margin: '0 0 2px', color: '#ef4444' }}>
              Some words are incorrect
            </p>
            <p style={{ fontSize: 11, margin: 0, color: '#94a3b8' }}>
              Check your written backup and try again
            </p>
          </div>
        </div>
      ) : (
        <div
          style={{
            padding: '10px 14px',
            background: 'rgba(99,102,241,0.06)',
            border: '1px solid rgba(99,102,241,0.15)',
            borderRadius: 10,
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span style={{ fontSize: 16 }}>💡</span>
          <p style={{ fontSize: 11, margin: 0, color: '#6366f1', fontWeight: 600 }}>
            {completedCount}/{totalCount} completed — This ensures your backup is correct
          </p>
        </div>
      )}

      {/* Security Reminder */}
      <div
        style={{
          padding: '10px 14px',
          background: 'rgba(245,158,11,0.06)',
          border: '1px solid rgba(245,158,11,0.2)',
          borderRadius: 8,
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <span style={{ fontSize: 14, flexShrink: 0 }}>🔒</span>
        <p style={{ fontSize: 10, margin: 0, color: '#f59e0b', lineHeight: 1.5 }}>
          This verification ensures you won't lose access to your funds later
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {verifyIdxs.map(idx => {
          const val = verifyWords[idx] || ''
          const correct =
            val.trim().toLowerCase() === words[idx]?.toLowerCase()
          const attempted = val.length > 0
          return (
            <div
              key={idx}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 12,
                padding: attempted && correct ? '12px' : '0',
                background: attempted && correct ? 'rgba(16,185,129,0.05)' : 'transparent',
                borderRadius: 8,
                transition: 'all 0.3s ease',
              }}
            >
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 10,
                  flexShrink: 0,
                  background: attempted 
                    ? correct 
                      ? 'linear-gradient(135deg, #10b981, #34d399)' 
                      : 'rgba(239,68,68,0.1)'
                    : 'var(--accent-light)',
                  color: attempted ? (correct ? 'white' : 'var(--red)') : 'var(--accent)',
                  fontSize: 13,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.3s ease',
                  boxShadow: attempted && correct ? '0 4px 12px rgba(16,185,129,0.3)' : 'none',
                }}
              >
                {attempted && correct ? '✓' : `#${idx + 1}`}
              </div>
              <input
                className="field"
                style={{
                  flex: 1,
                  margin: 0,
                  fontFamily: 'var(--font-mono)',
                  fontSize: 14,
                  fontWeight: 600,
                  borderColor: !attempted
                    ? undefined
                    : correct
                      ? 'rgba(16,185,129,0.6)'
                      : 'rgba(239,68,68,0.5)',
                  background: attempted && correct ? 'rgba(16,185,129,0.05)' : undefined,
                  transition: 'all 0.3s ease',
                }}
                placeholder={`Word #${idx + 1}`}
                value={val}
                onChange={e =>
                  setVerifyWords(prev => ({
                    ...prev,
                    [idx]: e.target.value,
                  }))
                }
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
              />
              {attempted && (
                <span
                  style={{
                    fontSize: 20,
                    flexShrink: 0,
                    color: correct ? 'var(--green)' : 'var(--red)',
                    animation: correct ? 'bounce 0.5s ease' : 'none',
                  }}
                >
                  {correct ? '✓' : '✗'}
                </span>
              )}
            </div>
          )
        })}
      </div>
      {error && <p className="error-msg">{error}</p>}
      <button
        className="btn-primary full-width"
        onClick={onVerify}
        disabled={!allFilled || !allCorrect}
        style={{
          opacity: allFilled && allCorrect ? 1 : 0.45,
          transition: 'opacity 0.2s',
          marginTop: 8,
        }}
      >
        {allFilled && allCorrect 
          ? '✓ Verify & Enter Wallet →' 
          : allFilled && !allCorrect
            ? '✗ Fix incorrect words'
            : `Enter ${totalCount - completedCount} more word${totalCount - completedCount !== 1 ? 's' : ''}`
        }
      </button>
      <button className="btn-link" onClick={onBack}>
        ← Back to seed phrase
      </button>
    </div>
  )
}
