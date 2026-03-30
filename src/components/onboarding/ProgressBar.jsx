export function ProgressBar({ steps, current }) {
  const idx = steps.indexOf(current)
  const isExcluded = idx <= 0 || current === 'welcome' || current === 'unlock'
  if (isExcluded) return null
  const pct = Math.round((idx / (steps.length - 1)) * 100)
  
  return (
    <div style={{ marginBottom: 20 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 11,
          color: 'var(--text3)',
          marginBottom: 6,
        }}
      >
        <span>
          Step {idx} of {steps.length - 1}
        </span>
        <span>{pct}%</span>
      </div>
      <div
        style={{
          background: 'var(--bg4)',
          borderRadius: 4,
          height: 4,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: pct + '%',
            height: '100%',
            background: 'linear-gradient(90deg,#6366f1,#a78bfa)',
            borderRadius: 4,
            transition: 'width 0.4s ease',
          }}
        />
      </div>
    </div>
  )
}
