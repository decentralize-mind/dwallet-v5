export function CreateWalletStep({
  password,
  setPassword,
  confirmPwd,
  setConfirmPwd,
  showPwd,
  setShowPwd,
  pwdStrong,
  pwdChecks,
  loading,
  error,
  onCreate,
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
          🔐
        </div>
        <h2
          className="step-title"
          style={{ fontSize: 20, marginBottom: 4 }}
        >
          Set your password
        </h2>
        <p className="step-sub" style={{ margin: 0 }}>
          This encrypts your wallet on this device only.
        </p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label
          style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)' }}
        >
          Password
        </label>
        <div className="pwd-input-wrap">
          <input
            type={showPwd ? 'text' : 'password'}
            placeholder="Minimum 12 characters recommended"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="field"
            autoFocus
            style={{ paddingRight: 52 }}
          />
          <button
            className="pwd-toggle"
            onClick={() => setShowPwd(v => !v)}
          >
            {showPwd ? 'hide' : 'show'}
          </button>
        </div>
      </div>
      {password.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span style={{ fontSize: 11, color: 'var(--text3)' }}>
              Password strength
            </span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color:
                  pwdStrong <= 1
                    ? 'var(--red)'
                    : pwdStrong === 2
                      ? 'var(--amber)'
                      : pwdStrong === 3
                        ? '#3b82f6'
                        : 'var(--green)',
              }}
            >
              {['', 'Weak', 'Fair', 'Good', 'Strong'][pwdStrong]}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 4, height: 6 }}>
            {[1, 2, 3, 4].map(seg => (
              <div
                key={seg}
                style={{
                  flex: 1,
                  borderRadius: 3,
                  transition: 'background 0.3s',
                  background:
                    pwdStrong >= seg
                      ? pwdStrong === 1
                        ? 'var(--red)'
                        : pwdStrong === 2
                          ? 'var(--amber)'
                          : pwdStrong === 3
                            ? '#3b82f6'
                            : 'var(--green)'
                      : 'var(--bg4)',
                }}
              />
            ))}
          </div>
        </div>
      )}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 6,
        }}
      >
        {pwdChecks.map(c => (
          <div
            key={c.label}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              padding: '8px 10px',
              borderRadius: 'var(--radius-sm)',
              background: c.ok ? 'rgba(16,185,129,0.08)' : 'var(--bg3)',
              border: `1px solid ${c.ok ? 'rgba(16,185,129,0.3)' : 'var(--border)'}`,
              transition: 'all 0.2s',
            }}
          >
            <div
              style={{
                width: 18,
                height: 18,
                borderRadius: '50%',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 10,
                fontWeight: 700,
                background: c.ok ? 'var(--green)' : 'var(--bg4)',
                color: c.ok ? 'white' : 'var(--text3)',
                transition: 'all 0.2s',
              }}
            >
              {c.ok ? '✓' : '○'}
            </div>
            <span
              style={{
                fontSize: 12,
                fontWeight: c.ok ? 600 : 400,
                color: c.ok ? 'var(--green)' : 'var(--text3)',
                transition: 'color 0.2s',
              }}
            >
              {c.label}
            </span>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label
          style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)' }}
        >
          Confirm password
        </label>
        <div style={{ position: 'relative' }}>
          <input
            type={showPwd ? 'text' : 'password'}
            placeholder="Re-enter your password"
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
            onKeyDown={e => e.key === 'Enter' && onCreate()}
          />
          {confirmPwd && (
            <span
              style={{
                position: 'absolute',
                right: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: 16,
                color:
                  password === confirmPwd ? 'var(--green)' : 'var(--red)',
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
        {confirmPwd && password === confirmPwd && (
          <p style={{ fontSize: 12, color: 'var(--green)', margin: 0 }}>
            ✓ Passwords match
          </p>
        )}
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 8,
          padding: '10px 12px',
          background: 'rgba(99,102,241,0.06)',
          border: '1px solid rgba(99,102,241,0.2)',
          borderRadius: 'var(--radius-sm)',
        }}
      >
        <span style={{ fontSize: 14, flexShrink: 0 }}>💡</span>
        <p
          style={{
            fontSize: 11,
            color: 'var(--text3)',
            margin: 0,
            lineHeight: 1.6,
          }}
        >
          Use a passphrase like{' '}
          <em style={{ color: 'var(--text2)' }}>
            correct-horse-battery-staple
          </em>{' '}
          — easy to remember, hard to crack.
        </p>
      </div>
      {error && <p className="error-msg">{error}</p>}
      <button
        className="btn-primary full-width"
        onClick={onCreate}
        disabled={
          loading ||
          pwdStrong < 2 ||
          password !== confirmPwd ||
          !confirmPwd
        }
        style={{
          opacity:
            !loading &&
            pwdStrong >= 2 &&
            password === confirmPwd &&
            confirmPwd
              ? 1
              : 0.45,
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
            Creating your wallet...
          </span>
        ) : (
          'Create wallet →'
        )}
      </button>
      <button className="btn-link" onClick={onBack}>
        ← Back
      </button>
    </div>
  )
}
