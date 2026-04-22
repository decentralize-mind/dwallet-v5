import { useState, useEffect } from 'react'
import adminAPI from '../../services/adminAPI'
import '../../styles/admin-settings.css'

export default function SecurityMonitor() {
  const [threatLevel, setThreatLevel] = useState('LOW')
  const [alerts, setAlerts] = useState([])
  const [monitoringActive, setMonitoringActive] = useState(true)
  const [circuitBreakerStatus, setCircuitBreakerStatus] = useState('Inactive')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  
  // Real-time security metrics
  const [securityMetrics, setSecurityMetrics] = useState({
    activeMonitors: 0,
    unresolvedAlerts: 0,
    blockedThreats: 0,
    checksLast24h: 0
  })
  
  // Anomaly detection thresholds
  const [thresholds, setThresholds] = useState({
    volumeSpike: 5.0,
    txFrequency: 3.0,
    priceDeviation: 3,
    whaleAlert: 100000
  })
  const [thresholdsLoading, setThresholdsLoading] = useState(false)
  const [thresholdsSaving, setThresholdsSaving] = useState(false)

  useEffect(() => {
    loadSecurityData()
    loadSecurityMetrics()
    loadThresholds()
    // Refresh every 60 seconds
    const interval = setInterval(() => {
      loadSecurityData()
      loadSecurityMetrics()
    }, 60000)
    return () => clearInterval(interval)
  }, [])

  const loadSecurityData = async () => {
    try {
      setLoading(true)
      const alertsRes = await adminAPI.get('/api/admin/security/alerts')
      
      if (alertsRes.success) {
        setAlerts(alertsRes.data.alerts || [])
      }
      setError(null)
    } catch (err) {
      console.error('Failed to load security data:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const loadSecurityMetrics = async () => {
    try {
      const metricsRes = await adminAPI.get('/api/admin/security/metrics')
      
      if (metricsRes.success) {
        setSecurityMetrics(metricsRes.data)
        // Update unresolved alerts from metrics if available
        if (metricsRes.data.unresolvedAlerts !== undefined) {
          setAlerts(prev => {
            const unresolvedCount = prev.filter(a => !a.resolved).length
            // If API provides count, trust it over local calculation
            if (unresolvedCount !== metricsRes.data.unresolvedAlerts) {
              // The count is managed server-side, just update the display
            }
          })
        }
      }
    } catch (err) {
      console.error('Failed to load security metrics:', err)
    }
  }

  const loadThresholds = async () => {
    try {
      setThresholdsLoading(true)
      const thresholdsRes = await adminAPI.get('/api/admin/security/thresholds')
      
      if (thresholdsRes.success) {
        setThresholds(thresholdsRes.data)
      }
    } catch (err) {
      console.error('Failed to load thresholds:', err)
    } finally {
      setThresholdsLoading(false)
    }
  }

  const getThreatLevelConfig = (level) => {
    const configs = {
      'NONE': { color: 'var(--green)', icon: '🟢', bg: 'rgba(16,185,129,0.1)' },
      'LOW': { color: 'var(--green)', icon: '🟢', bg: 'rgba(16,185,129,0.1)' },
      'MEDIUM': { color: 'var(--yellow)', icon: '🟡', bg: 'rgba(245,158,11,0.1)' },
      'HIGH': { color: 'var(--orange)', icon: '🟠', bg: 'rgba(249,115,22,0.1)' },
      'CRITICAL': { color: 'var(--red)', icon: '🔴', bg: 'rgba(239,68,68,0.1)' }
    }
    return configs[level] || configs['LOW']
  }

  const handleToggleMonitoring = () => {
    setMonitoringActive(!monitoringActive)
  }

  const handleResolveAlert = async (alertId) => {
    try {
      await adminAPI.post(`/api/admin/security/alerts/${alertId}/resolve`, {})
      // Reload alerts after resolving
      loadSecurityData()
    } catch (err) {
      console.error('Failed to resolve alert:', err)
      alert('Failed to resolve alert: ' + err.message)
    }
  }

  const handleTriggerCircuitBreaker = async () => {
    if (window.confirm('🚨 TRIGGER CIRCUIT BREAKER? This will pause all contract operations.')) {
      try {
        await adminAPI.post('/api/admin/security/circuit-breaker/trigger', {
          reason: 'Manually triggered by admin'
        })
        setCircuitBreakerStatus('Active')
        setThreatLevel('CRITICAL')
        loadSecurityData()
      } catch (err) {
        console.error('Failed to trigger circuit breaker:', err)
        alert('Failed to trigger circuit breaker: ' + err.message)
      }
    }
  }

  const handleResetCircuitBreaker = async () => {
    if (window.confirm('Reset circuit breaker and resume operations?')) {
      try {
        await adminAPI.post('/api/admin/security/circuit-breaker/reset', {
          reason: 'Manually reset by admin'
        })
        setCircuitBreakerStatus('Inactive')
        setThreatLevel('LOW')
        loadSecurityData()
      } catch (err) {
        console.error('Failed to reset circuit breaker:', err)
        alert('Failed to reset circuit breaker: ' + err.message)
      }
    }
  }

  const handleSaveThresholds = async () => {
    try {
      setThresholdsSaving(true)
      
      // Validate thresholds
      if (thresholds.volumeSpike < 1 || thresholds.volumeSpike > 20) {
        alert('Volume Spike must be between 1.0 and 20.0')
        return
      }
      if (thresholds.txFrequency < 1 || thresholds.txFrequency > 10) {
        alert('TX Frequency must be between 1.0 and 10.0')
        return
      }
      if (thresholds.priceDeviation < 1 || thresholds.priceDeviation > 50) {
        alert('Price Deviation must be between 1% and 50%')
        return
      }
      if (thresholds.whaleAlert < 1000 || thresholds.whaleAlert > 10000000) {
        alert('Whale Alert must be between $1,000 and $10,000,000')
        return
      }

      const result = await adminAPI.post('/api/admin/security/thresholds', thresholds)
      
      if (result.success) {
        alert('✅ Thresholds updated successfully!')
        loadThresholds() // Reload to confirm
      }
    } catch (err) {
      console.error('Failed to save thresholds:', err)
      alert('Failed to save thresholds: ' + err.message)
    } finally {
      setThresholdsSaving(false)
    }
  }

  const handleThresholdChange = (key, value) => {
    setThresholds(prev => ({
      ...prev,
      [key]: parseFloat(value) || 0
    }))
  }

  const threatConfig = getThreatLevelConfig(threatLevel)

  return (
    <div className="admin-panel">
      <div className="admin-panel-header">
        <h2 className="admin-panel-title">Security Monitor</h2>
        <div className="admin-panel-badges">
          <span className={`admin-panel-badge ${monitoringActive ? 'live' : 'inactive'}`}>
            {monitoringActive ? '● Monitoring' : '○ Paused'}
          </span>
        </div>
      </div>

      {/* Threat Level Display */}
      <div className="admin-threat-display" style={{ borderColor: threatConfig.color, background: threatConfig.bg }}>
        <div className="admin-threat-left">
          <span className="admin-threat-icon">{threatConfig.icon}</span>
          <div>
            <p className="admin-threat-label">Current Threat Level</p>
            <p className="admin-threat-value" style={{ color: threatConfig.color }}>
              {threatLevel}
            </p>
          </div>
        </div>
        <div className="admin-threat-actions">
          <button
            className={`admin-btn ${monitoringActive ? 'secondary' : 'primary'}`}
            onClick={handleToggleMonitoring}
          >
            {monitoringActive ? '⏸️ Pause Monitoring' : '▶️ Resume Monitoring'}
          </button>
        </div>
      </div>

      {/* Circuit Breaker Status */}
      <div className="admin-section">
        <h3 className="admin-section-title">Circuit Breaker</h3>
        <div className={`admin-circuit-breaker ${circuitBreakerStatus === 'Active' ? 'active' : 'inactive'}`}>
          <div className="admin-circuit-info">
            <span className="admin-circuit-icon">
              {circuitBreakerStatus === 'Active' ? '🚨' : '✅'}
            </span>
            <div>
              <p className="admin-circuit-label">Status</p>
              <p className="admin-circuit-value">{circuitBreakerStatus}</p>
            </div>
          </div>
          <div className="admin-circuit-actions">
            {circuitBreakerStatus === 'Inactive' ? (
              <button
                className="admin-btn danger"
                onClick={handleTriggerCircuitBreaker}
              >
                🚨 Trigger Breaker
              </button>
            ) : (
              <button
                className="admin-btn primary"
                onClick={handleResetCircuitBreaker}
              >
                🔄 Reset Breaker
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Security Metrics - Compact Table */}
      <table className="admin-metrics-table">
        <tbody>
          <tr>
            <td className="admin-metric-cell">
              <span className="admin-metric-icon">🔍</span>
              <span className="admin-metric-label">Active Monitors</span>
            </td>
            <td className="admin-metric-value-cell">
              {securityMetrics.activeMonitors}
            </td>
            <td className="admin-metric-cell">
              <span className="admin-metric-icon">⚠️</span>
              <span className="admin-metric-label">Unresolved Alerts</span>
            </td>
            <td className="admin-metric-value-cell">
              {securityMetrics.unresolvedAlerts}
            </td>
          </tr>
          <tr>
            <td className="admin-metric-cell">
              <span className="admin-metric-icon">🛡️</span>
              <span className="admin-metric-label">Blocked Threats</span>
            </td>
            <td className="admin-metric-value-cell">
              {securityMetrics.blockedThreats}
            </td>
            <td className="admin-metric-cell">
              <span className="admin-metric-icon">📊</span>
              <span className="admin-metric-label">Checks (24h)</span>
            </td>
            <td className="admin-metric-value-cell">
              {securityMetrics.checksLast24h.toLocaleString()}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Alerts List */}
      <div className="admin-section">
        <h3 className="admin-section-title">Security Alerts</h3>
        <div className="admin-alerts-list">
          {alerts.map(alert => {
            const alertConfig = getThreatLevelConfig(alert.level)
            return (
              <div 
                key={alert.id} 
                className={`admin-alert-item ${alert.resolved ? 'resolved' : ''}`}
              >
                <div className="admin-alert-left">
                  <span className="admin-alert-level" style={{ background: alertConfig.bg, color: alertConfig.color }}>
                    {alert.level}
                  </span>
                  <div className="admin-alert-content">
                    <p className="admin-alert-type">{alert.type}</p>
                    <p className="admin-alert-message">{alert.message}</p>
                    <p className="admin-alert-time">{alert.timestamp}</p>
                  </div>
                </div>
                {!alert.resolved && (
                  <button
                    className="admin-btn-small success"
                    onClick={() => handleResolveAlert(alert.id)}
                  >
                    ✓ Resolve
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Anomaly Detection Settings */}
      <div className="admin-section">
        <h3 className="admin-section-title">Anomaly Detection Thresholds</h3>
        {thresholdsLoading ? (
          <div className="admin-loading">Loading thresholds...</div>
        ) : (
          <div className="admin-thresholds-grid">
            <div className="admin-threshold-item">
              <label className="admin-threshold-label">Volume Spike</label>
              <input 
                type="number" 
                className="admin-threshold-input"
                value={thresholds.volumeSpike}
                onChange={(e) => handleThresholdChange('volumeSpike', e.target.value)}
                step="0.5"
                min="1"
                max="20"
              />
              <span className="admin-threshold-unit">x baseline</span>
            </div>

            <div className="admin-threshold-item">
              <label className="admin-threshold-label">TX Frequency</label>
              <input 
                type="number" 
                className="admin-threshold-input"
                value={thresholds.txFrequency}
                onChange={(e) => handleThresholdChange('txFrequency', e.target.value)}
                step="0.5"
                min="1"
                max="10"
              />
              <span className="admin-threshold-unit">x baseline</span>
            </div>

            <div className="admin-threshold-item">
              <label className="admin-threshold-label">Price Deviation</label>
              <input 
                type="number" 
                className="admin-threshold-input"
                value={thresholds.priceDeviation}
                onChange={(e) => handleThresholdChange('priceDeviation', e.target.value)}
                step="1"
                min="1"
                max="50"
              />
              <span className="admin-threshold-unit">%</span>
            </div>

            <div className="admin-threshold-item">
              <label className="admin-threshold-label">Whale Alert</label>
              <input 
                type="number" 
                className="admin-threshold-input"
                value={thresholds.whaleAlert}
                onChange={(e) => handleThresholdChange('whaleAlert', e.target.value)}
                step="10000"
                min="1000"
                max="10000000"
              />
              <span className="admin-threshold-unit">USD</span>
            </div>
          </div>
        )}
        <button 
          className="admin-btn primary" 
          style={{ marginTop: '16px' }}
          onClick={handleSaveThresholds}
          disabled={thresholdsSaving || thresholdsLoading}
        >
          {thresholdsSaving ? '💾 Saving...' : '💾 Save Thresholds'}
        </button>
      </div>
    </div>
  )
}
