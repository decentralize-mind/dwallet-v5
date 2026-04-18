import { useState, useEffect } from 'react'
import { getAnalyticsSummary, exportAnalytics, resetAnalytics } from '../utils/analytics'

export default function AnalyticsDashboard() {
  const [summary, setSummary] = useState(null)
  const [showReset, setShowReset] = useState(false)

  useEffect(() => {
    refreshAnalytics()
  }, [])

  const refreshAnalytics = () => {
    setSummary(getAnalyticsSummary())
  }

  const handleExport = () => {
    exportAnalytics()
  }

  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset all analytics data? This cannot be undone.')) {
      resetAnalytics()
      refreshAnalytics()
      setShowReset(false)
    }
  }

  if (!summary) {
    return <div className="view-container"><p>Loading analytics...</p></div>
  }

  return (
    <div className="view-container">
      <div className="view-header">
        <h2 className="view-title">Analytics Dashboard</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn-secondary" onClick={handleExport}>
            Export Data
          </button>
          <button className="btn-secondary" onClick={() => setShowReset(!showReset)}>
            Reset
          </button>
        </div>
      </div>

      {showReset && (
        <div style={{
          padding: '16px',
          background: 'rgba(239,68,68,0.08)',
          border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: 'var(--radius-sm)',
          marginBottom: '16px'
        }}>
          <p style={{ fontSize: '13px', fontWeight: 600, margin: '0 0 12px', color: 'var(--red)' }}>
            ⚠️ Reset all analytics data?
          </p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn-primary" style={{ background: 'var(--red)' }} onClick={handleReset}>
              Yes, Reset
            </button>
            <button className="btn-secondary" onClick={() => setShowReset(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Overview Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '12px',
        marginBottom: '24px'
      }}>
        <div className="stat-card">
          <p className="stat-label">Total Sessions</p>
          <p className="stat-value">{summary.totalSessions}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Feature Views</p>
          <p className="stat-value">{summary.totalFeatureViews}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Avg Session Time</p>
          <p className="stat-value">{summary.avgSessionTime}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Last Visit</p>
          <p className="stat-value" style={{ fontSize: '14px' }}>
            {summary.lastVisit ? new Date(summary.lastVisit).toLocaleDateString() : 'N/A'}
          </p>
        </div>
      </div>

      {/* Retention */}
      <div style={{
        background: 'var(--bg2)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-sm)',
        padding: '16px',
        marginBottom: '24px'
      }}>
        <h3 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 12px' }}>Retention Milestones</h3>
        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: summary.retention.day1 ? 'var(--green)' : 'var(--bg3)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '8px'
            }}>
              {summary.retention.day1 ? '✓' : '1'}
            </div>
            <p style={{ fontSize: '11px', margin: 0, color: 'var(--text3)' }}>Day 1</p>
          </div>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: summary.retention.day7 ? 'var(--green)' : 'var(--bg3)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '8px'
            }}>
              {summary.retention.day7 ? '✓' : '7'}
            </div>
            <p style={{ fontSize: '11px', margin: 0, color: 'var(--text3)' }}>Day 7</p>
          </div>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: summary.retention.day30 ? 'var(--green)' : 'var(--bg3)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '8px'
            }}>
              {summary.retention.day30 ? '✓' : '30'}
            </div>
            <p style={{ fontSize: '11px', margin: 0, color: 'var(--text3)' }}>Day 30</p>
          </div>
        </div>
      </div>

      {/* Conversions */}
      <div style={{
        background: 'var(--bg2)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-sm)',
        padding: '16px',
        marginBottom: '24px'
      }}>
        <h3 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 12px' }}>Conversion Events</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
          {Object.entries(summary.conversions).map(([key, value]) => (
            <div key={key} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px',
              background: value ? 'rgba(16,185,129,0.08)' : 'var(--bg3)',
              borderRadius: '6px'
            }}>
              <span style={{ color: value ? 'var(--green)' : 'var(--text3)' }}>
                {value ? '✓' : '○'}
              </span>
              <span style={{ fontSize: '12px', color: 'var(--text2)' }}>
                {key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Top Features */}
      <div style={{
        background: 'var(--bg2)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-sm)',
        padding: '16px'
      }}>
        <h3 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 12px' }}>Top Features by Views</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {summary.topFeatures.map((feature, index) => (
            <div key={feature.name} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '10px',
              background: 'var(--bg3)',
              borderRadius: '6px'
            }}>
              <div style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: index === 0 ? 'var(--accent)' : 'var(--bg4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '11px',
                fontWeight: 700,
                color: index === 0 ? 'white' : 'var(--text3)'
              }}>
                {index + 1}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '13px', fontWeight: 600, margin: 0, color: 'var(--text)' }}>
                  {feature.name.charAt(0).toUpperCase() + feature.name.slice(1)}
                </p>
              </div>
              <div style={{
                fontSize: '14px',
                fontWeight: 700,
                color: 'var(--accent)'
              }}>
                {feature.views} views
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
