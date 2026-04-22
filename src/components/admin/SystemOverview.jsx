import { useState, useEffect } from 'react'
import { useWallet } from '../../hooks/useWallet'
import adminAPI from '../../services/adminAPI'
import '../../styles/admin-settings.css'

export default function SystemOverview() {
  const { currentAddress } = useWallet()
  const [systemStats, setSystemStats] = useState({
    totalUsers: 0,
    activeUsers24h: 0,
    totalTransactions: 0,
    totalVolume: '0',
    contractStatus: 'Active',
    threatLevel: 'LOW',
    uptime: '99.9%',
    lastUpdate: new Date()
  })
  const [systemHealth, setSystemHealth] = useState({
    apiGateway: { status: 'Checking...' },
    smartContracts: { status: 'Checking...' },
    database: { status: 'Checking...' },
    monitoring: { status: 'Checking...' }
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadStats()
    const interval = setInterval(loadStats, 30000) // Update every 30s
    return () => clearInterval(interval)
  }, [])

  const loadStats = async () => {
    try {
      setLoading(true)
      const response = await adminAPI.getStats()
      
      if (response.success) {
        setSystemStats({
          ...response.data,
          lastUpdate: new Date()
        })
      }
      
      // Also fetch system health
      try {
        const healthResponse = await adminAPI.getSystemHealth()
        if (healthResponse.success) {
          setSystemHealth(healthResponse.data)
        }
      } catch (healthErr) {
        console.error('Failed to load system health:', healthErr)
      }
      
      setError(null)
    } catch (err) {
      console.error('Failed to load stats:', err)
      setError(err.message || 'Failed to load system statistics')
      // Keep showing last known data
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status) => {
    const colors = {
      'Active': 'var(--green)',
      'Paused': 'var(--red)',
      'LOW': 'var(--green)',
      'MEDIUM': 'var(--yellow)',
      'HIGH': 'var(--orange)',
      'CRITICAL': 'var(--red)'
    }
    return colors[status] || 'var(--text3)'
  }

  return (
    <div className="admin-panel">
      <div className="admin-panel-header">
        <h2 className="admin-panel-title">System Overview</h2>
        <div className="admin-panel-badges">
          <span className="admin-panel-badge live">● Live</span>
          {loading && <span className="admin-panel-badge">Loading...</span>}
        </div>
      </div>

      {error && (
        <div className="admin-error-banner">
          ⚠️ {error}
          <button onClick={loadStats} className="admin-btn-small">Retry</button>
        </div>
      )}

      {/* Key Metrics - Compact Table Format */}
      <table className="admin-metrics-table">
        <tbody>
          <tr>
            <td className="admin-metric-cell">
              <span className="admin-metric-icon">👥</span>
              <span className="admin-metric-label">Total Users</span>
            </td>
            <td className="admin-metric-value-cell">
              {systemStats.totalUsers.toLocaleString()}
            </td>
            <td className="admin-metric-cell">
              <span className="admin-metric-icon">⚡</span>
              <span className="admin-metric-label">Active (24h)</span>
            </td>
            <td className="admin-metric-value-cell">
              {systemStats.activeUsers24h}
            </td>
          </tr>
          <tr>
            <td className="admin-metric-cell">
              <span className="admin-metric-icon">🔄</span>
              <span className="admin-metric-label">Total Transactions</span>
            </td>
            <td className="admin-metric-value-cell">
              {systemStats.totalTransactions.toLocaleString()}
            </td>
            <td className="admin-metric-cell">
              <span className="admin-metric-icon">💰</span>
              <span className="admin-metric-label">Total Volume</span>
            </td>
            <td className="admin-metric-value-cell">
              ${systemStats.totalVolume}
            </td>
          </tr>
          <tr>
            <td className="admin-metric-cell">
              <span className="admin-metric-icon">📜</span>
              <span className="admin-metric-label">Contract Status</span>
            </td>
            <td className="admin-metric-value-cell">
              <span style={{ color: getStatusColor(systemStats.contractStatus) }}>
                {systemStats.contractStatus}
              </span>
            </td>
            <td className="admin-metric-cell">
              <span className="admin-metric-icon">🛡️</span>
              <span className="admin-metric-label">Threat Level</span>
            </td>
            <td className="admin-metric-value-cell">
              <span style={{ color: getStatusColor(systemStats.threatLevel) }}>
                {systemStats.threatLevel}
              </span>
            </td>
          </tr>
          <tr>
            <td className="admin-metric-cell">
              <span className="admin-metric-icon">⏱️</span>
              <span className="admin-metric-label">Uptime</span>
            </td>
            <td className="admin-metric-value-cell">
              {systemStats.uptime}
            </td>
            <td className="admin-metric-cell">
              <span className="admin-metric-icon">🕐</span>
              <span className="admin-metric-label">Last Update</span>
            </td>
            <td className="admin-metric-value-cell">
              {systemStats.lastUpdate.toLocaleTimeString()}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Quick Actions - Compact */}
      <div className="admin-section">
        <h3 className="admin-section-title">Quick Actions</h3>
        <div className="admin-quick-actions-compact">
          <button className="admin-action-btn-compact primary">
            <span className="admin-action-btn-icon">📊</span>
            <span>Generate Report</span>
          </button>
          <button className="admin-action-btn-compact secondary">
            <span className="admin-action-btn-icon">🔄</span>
            <span>Refresh Data</span>
          </button>
          <button className="admin-action-btn-compact warning">
            <span className="admin-action-btn-icon">⚠️</span>
            <span>System Alerts</span>
          </button>
          <button className="admin-action-btn-compact danger">
            <span className="admin-action-btn-icon">🚨</span>
            <span>Emergency Stop</span>
          </button>
        </div>
      </div>

      {/* System Health - Compact Table */}
      <div className="admin-section">
        <h3 className="admin-section-title">System Health</h3>
        <table className="admin-health-table">
          <tbody>
            <tr>
              <td className="admin-health-cell">
                <span className="admin-health-icon">✓</span>
                <span className="admin-health-label">API Gateway</span>
              </td>
              <td className={`admin-health-status-cell ${systemHealth.apiGateway.status === 'Operational' ? 'healthy' : 'warning'}`}>
                {systemHealth.apiGateway.status}
              </td>
              <td className="admin-health-cell">
                <span className="admin-health-icon">✓</span>
                <span className="admin-health-label">Smart Contracts</span>
              </td>
              <td className={`admin-health-status-cell ${systemHealth.smartContracts.status === 'Active' ? 'healthy' : 'warning'}`}>
                {systemHealth.smartContracts.status}
              </td>
            </tr>
            <tr>
              <td className="admin-health-cell">
                <span className="admin-health-icon">✓</span>
                <span className="admin-health-label">Database</span>
              </td>
              <td className={`admin-health-status-cell ${systemHealth.database.status === 'Connected' ? 'healthy' : 'warning'}`}>
                {systemHealth.database.status}
              </td>
              <td className="admin-health-cell">
                <span className="admin-health-icon">✓</span>
                <span className="admin-health-label">Monitoring</span>
              </td>
              <td className={`admin-health-status-cell ${systemHealth.monitoring.status === 'Running' ? 'healthy' : 'warning'}`}>
                {systemHealth.monitoring.status}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
