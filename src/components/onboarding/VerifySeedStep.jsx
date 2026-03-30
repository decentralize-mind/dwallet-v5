export function VerifySeedStep({
  words,
  verifyIdxs,
  verifyWords,
  setVerifyWords,
  error,
  onVerify,
  onBack,
}) {
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {verifyIdxs.map(idx => {
          const val = verifyWords[idx] || ''
          const correct =
            val.trim().toLowerCase() === words[idx]?.toLowerCase()
          const attempted = val.length > 0
          return (
            <div
              key={idx}
              style={{ display: 'flex', alignItems: 'center', gap: 10 }}
            >
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 8,
                  flexShrink: 0,
                  background: 'var(--accent-light)',
                  color: 'var(--accent)',
                  fontSize: 12,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                #{idx + 1}
              </div>
              <input
                className="field"
                style={{
                  flex: 1,
                  margin: 0,
                  fontFamily: 'var(--font-mono)',
                  borderColor: !attempted
                    ? undefined
                    : correct
                      ? 'rgba(16,185,129,0.6)'
                      : 'rgba(239,68,68,0.5)',
                }}
                placeholder={`Word number ${idx + 1}`}
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
                    fontSize: 18,
                    flexShrink: 0,
                    color: correct ? 'var(--green)' : 'var(--red)',
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
        disabled={verifyIdxs.some(idx => !verifyWords[idx]?.trim())}
      >
        Verify & enter wallet →
      </button>
      <button className="btn-link" onClick={onBack}>
        ← Back to seed phrase
      </button>
    </div>
  )
}
