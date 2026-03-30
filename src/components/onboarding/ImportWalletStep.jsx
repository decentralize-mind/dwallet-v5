export function ImportWalletStep({
  importInput,
  setImportInput,
  password,
  setPassword,
  confirmPwd,
  setConfirmPwd,
  showPwd,
  setShowPwd,
  loading,
  error,
  onImport,
  onBack,
}) {
  const raw = importInput.trim()
  const wordArr = raw.length > 0 ? raw.split(/\s+/) : []
  const wordCount = wordArr.length
  const isValid12 = wordCount === 12
  const isValid24 = wordCount === 24
  const isValid = isValid12 || isValid24
  const isOver = wordCount > 24
  const pctFill12 = Math.min((wordCount / 12) * 100, 100)
  const pctFill24 = Math.min((wordCount / 24) * 100, 100)

  const barColor = isValid
    ? 'var(--green)'
    : isOver
      ? 'var(--red)'
      : wordCount >= 8
        ? 'var(--amber)'
        : 'var(--accent)'

  const canSubmit =
    isValid &&
    password.length >= 8 &&
    password === confirmPwd &&
    !loading

  return (
    <div className="step-content">
      <div style={{ textAlign: 'center', marginBottom: 4 }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: 'rgba(99,102,241,0.12)',
            border: '2px solid var(--accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 26,
            margin: '0 auto 10px',
          }}
        >
          📥
        </div>
        <h2
          className="step-title"
          style={{ fontSize: 20, marginBottom: 4 }}
        >
          Import your wallet
        </h2>
        <p className="step-sub" style={{ margin: 0 }}>
          Enter your 12 or 24-word recovery phrase to restore access.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        {[12, 24].map(n => (
          <div
            key={n}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: 'var(--radius-sm)',
              border: `1px solid ${wordCount === n ? 'var(--accent)' : 'var(--border)'}`,
              background:
                wordCount === n ? 'var(--accent-light)' : 'var(--bg3)',
              textAlign: 'center',
              transition: 'all 0.2s',
            }}
          >
            <p
              style={{
                fontSize: 13,
                fontWeight: 700,
                margin: 0,
                color: wordCount === n ? 'var(--accent)' : 'var(--text3)',
              }}
            >
              {n} words
            </p>
            <p
              style={{
                fontSize: 10,
                margin: '2px 0 0',
                color: wordCount === n ? 'var(--accent)' : 'var(--text3)',
              }}
            >
              {n === 12 ? 'Standard' : 'Extended'}
            </p>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--text2)',
          }}
        >
          Recovery phrase
        </label>
        <textarea
          className="field textarea"
          placeholder="Enter words separated by spaces: word1 word2 word3..."
          value={importInput}
          onChange={e => setImportInput(e.target.value.toLowerCase())}
          rows={4}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 13,
            lineHeight: 1.8,
            resize: 'none',
            borderColor:
              raw.length > 0
                ? isValid
                  ? 'rgba(16,185,129,0.6)'
                  : isOver
                    ? 'rgba(239,68,68,0.5)'
                    : 'var(--border)'
                : undefined,
          }}
        />
        {raw.length > 0 && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span style={{ fontSize: 11, color: 'var(--text3)' }}>
                {wordCount} {wordCount === 1 ? 'word' : 'words'} entered
              </span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: isValid
                    ? 'var(--green)'
                    : isOver
                      ? 'var(--red)'
                      : 'var(--text3)',
                }}
              >
                {isValid12
                  ? '✓ Valid 12-word phrase'
                  : isValid24
                    ? '✓ Valid 24-word phrase'
                    : isOver
                      ? '✗ Too many words'
                      : wordCount < 12
                        ? `${12 - wordCount} more for 12-word`
                        : `${24 - wordCount} more for 24-word`}
              </span>
            </div>
            {[
              { n: 12, pct: pctFill12, valid: isValid12 },
              { n: 24, pct: pctFill24, valid: isValid24 },
            ].map(({ n, pct, valid }) => (
              <div
                key={n}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <span
                  style={{
                    fontSize: 10,
                    color: 'var(--text3)',
                    width: 14,
                    textAlign: 'right',
                  }}
                >
                  {n}
                </span>
                <div
                  style={{
                    flex: 1,
                    height: 5,
                    background: 'var(--bg4)',
                    borderRadius: 3,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: pct + '%',
                      height: '100%',
                      background: valid ? 'var(--green)' : barColor,
                      borderRadius: 3,
                      transition: 'width 0.2s',
                    }}
                  />
                </div>
                {valid && (
                  <span style={{ fontSize: 11, color: 'var(--green)' }}>✓</span>
                )}
              </div>
            ))}
          </div>
        )}

        {isValid && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3,1fr)',
              gap: 4,
              padding: 10,
              background: 'var(--bg3)',
              border: '1px solid rgba(16,185,129,0.2)',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            {wordArr.map((word, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '4px 6px',
                  background: 'var(--bg2)',
                  border: '1px solid var(--border)',
                  borderRadius: 6,
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
                    fontSize: 11,
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--text)',
                  }}
                >
                  {word}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '4px 0',
        }}
      >
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        <span
          style={{
            fontSize: 11,
            color: 'var(--text3)',
            whiteSpace: 'nowrap',
          }}
        >
          Set a password for this device
        </span>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div className="pwd-input-wrap">
          <input
            type={showPwd ? 'text' : 'password'}
            placeholder="New password (min 8 characters)"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="field"
            style={{ paddingRight: 52 }}
          />
          <button
            className="pwd-toggle"
            onClick={() => setShowPwd(v => !v)}
          >
            {showPwd ? 'hide' : 'show'}
          </button>
        </div>
        <div style={{ position: 'relative' }}>
          <input
            type={showPwd ? 'text' : 'password'}
            placeholder="Confirm password"
            value={confirmPwd}
            onChange={e => setConfirmPwd(e.target.value)}
            className="field"
            style={{
              paddingRight: 36,
              borderColor: confirmPwd
                ? password === confirmPwd
                  ? 'rgba(16,185,129,0.6)'
                  : 'rgba(239,68,68,0.5)'
                : undefined,
            }}
            onKeyDown={e => e.key === 'Enter' && canSubmit && onImport()}
          />
          {confirmPwd && (
            <span
              style={{
                position: 'absolute',
                right: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: 16,
                color: password === confirmPwd ? 'var(--green)' : 'var(--red)',
              }}
            >
              {password === confirmPwd ? '✓' : '✗'}
            </span>
          )}
        </div>
        {confirmPwd && password !== confirmPwd && (
          <p style={{ fontSize: 12, color: 'var(--red)', margin: 0 }}>
            Passwords do not match
          </p>
        )}
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 8,
          padding: '10px 12px',
          background: 'rgba(239,68,68,0.06)',
          border: '1px solid rgba(239,68,68,0.2)',
          borderRadius: 'var(--radius-sm)',
        }}
      >
        <span style={{ fontSize: 14, flexShrink: 0 }}>⚠️</span>
        <p
          style={{
            fontSize: 11,
            color: 'var(--text3)',
            margin: 0,
            lineHeight: 1.6,
          }}
        >
          Only enter your seed phrase on a trusted, private device. Never import
          on a shared or public computer.
        </p>
      </div>

      {error && <p className="error-msg">{error}</p>}

      <button
        className="btn-primary full-width"
        onClick={onImport}
        disabled={!canSubmit}
        style={{
          opacity: canSubmit ? 1 : 0.45,
          transition: 'opacity 0.2s',
        }}
      >
        {loading ? (
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <span
              style={{
                width: 16,
                height: 16,
                border: '2px solid rgba(255,255,255,0.4)',
                borderTopColor: 'white',
                borderRadius: '50%',
                display: 'inline-block',
                animation: 'spin 0.8s linear infinite',
              }}
            />
            Importing wallet...
          </span>
        ) : (
          'Restore wallet'
        )}
      </button>

      <button className="btn-link" onClick={onBack}>
        ← Back
      </button>
    </div>
  )
}
