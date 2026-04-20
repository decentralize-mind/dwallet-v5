import { useState, useEffect } from 'react'
import adminAPI from '../services/adminAPI'

/**
 * 🔒 IP Lists Management Portal
 * Comprehensive IP whitelist/blacklist management
 */
export default function IPListsManagement() {
  const [activeTab, setActiveTab] = useState('whitelist')
  const [whitelist, setWhitelist] = useState([])
  const [bannedIPs, setBannedIPs] = useState([])
  const [activity, setActivity] = useState([])
  const [stats, setStats] = useState({})
  const [loading, setLoading] = useState(false)
  const [newIP, setNewIP] = useState('')
  const [newIPDescription, setNewIPDescription] = useState('')
  const [banIPAddress, setBanIPAddress] = useState('')
  const [banReason, setBanReason] = useState('')
  const [banType, setBanType] = useState('temporary')
  const [banDuration, setBanDuration] = useState(24)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [searchIP, setSearchIP] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [whitelistRes, bannedRes, activityRes, statsRes] = await Promise.all([
        adminAPI.get('/api/admin/ip-lists/whitelist'),
        adminAPI.get('/api/admin/ip-lists/banned'),
        adminAPI.get('/api/admin/ip-lists/activity?limit=50'),
        adminAPI.get('/api/admin/ip-lists/stats')
      ])

      setWhitelist(whitelistRes.data.whitelist || [])
      setBannedIPs(bannedRes.data.bannedIPs || [])
      setActivity(activityRes.data.activity || [])
      setStats(statsRes.data || {})
    } catch (error) {
      showMessage('error', 'Failed to load IP data')
    }
    setLoading(false)
  }

  const showMessage = (type, text) => {
    setMessage({ type, text })
    setTimeout(() => setMessage({ type: '', text: '' }), 3000)
  }

  const addToWhitelist = async () => {
    if (!newIP || !/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(newIP)) {
      showMessage('error', 'Please enter a valid IP address')
      return
    }

    try {
      await adminAPI.post('/api/admin/ip-lists/whitelist/add', {
        ip: newIP,
        description: newIPDescription
      })
      showMessage('success', `IP ${newIP} added to whitelist`)
      setNewIP('')
      setNewIPDescription('')
      loadData()
    } catch (error) {
      showMessage('error', error.response?.data?.error || 'Failed to add IP')
    }
  }

  const removeFromWhitelist = async (ip) => {
    if (!confirm(`Remove ${ip} from whitelist?`)) return

    try {
      await adminAPI.post('/api/admin/ip-lists/whitelist/remove', { ip })
      showMessage('success', `IP ${ip} removed from whitelist`)
      loadData()
    } catch (error) {
      showMessage('error', 'Failed to remove IP')
    }
  }

  const handleBanIP = async () => {
    if (!banIPAddress || !banReason) {
      showMessage('error', 'IP address and reason required')
      return
    }

    try {
      await adminAPI.post('/api/admin/ip-lists/ban', {
        ip: banIPAddress,
        reason: banReason,
        banType,
        duration: banDuration
      })
      showMessage('success', `IP ${banIPAddress} banned successfully`)
      setBanIPAddress('')
      setBanReason('')
      loadData()
    } catch (error) {
      showMessage('error', error.response?.data?.error || 'Failed to ban IP')
    }
  }

  const unbanIP = async (ip) => {
    if (!confirm(`Unban ${ip}?`)) return

    try {
      await adminAPI.post('/api/admin/ip-lists/unban', { ip })
      showMessage('success', `IP ${ip} unbanned successfully`)
      loadData()
    } catch (error) {
      showMessage('error', 'Failed to unban IP')
    }
  }

  const filteredActivity = searchIP 
    ? activity.filter(a => a.ip_address?.includes(searchIP))
    : activity

  return (
    <div className="ip-management-portal">
      <div className="ip-portal-header">
        <div>
          <h1 className="ip-portal-title">🔒 IP Lists Management</h1>
          <p className="ip-portal-subtitle">
            Comprehensive IP whitelist, blacklist, and access monitoring
          </p>
        </div>
        <button className="ip-refresh-btn" onClick={loadData} disabled={loading}>
          {loading ? '⏳' : '🔄'} {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {/* Message Display */}
      {message.text && (
        <div className={`ip-message ip-message--${message.type}`}>
          {message.type === 'success' ? '✅' : '❌'} {message.text}
        </div>
      )}

      {/* Statistics Cards */}
      <div className="ip-stats-grid">
        <div className="ip-stat-card">
          <div className="ip-stat-icon">✅</div>
          <div className="ip-stat-info">
            <div className="ip-stat-value">{stats.whitelistedIPs || 0}</div>
            <div className="ip-stat-label">Whitelisted IPs</div>
          </div>
        </div>
        <div className="ip-stat-card ip-stat-card--danger">
          <div className="ip-stat-icon">🚫</div>
          <div className="ip-stat-info">
            <div className="ip-stat-value">{stats.bannedIPs || 0}</div>
            <div className="ip-stat-label">Banned IPs</div>
          </div>
        </div>
        <div className="ip-stat-card ip-stat-card--warning">
          <div className="ip-stat-icon">⛔</div>
          <div className="ip-stat-info">
            <div className="ip-stat-value">{stats.blocksLast24h || 0}</div>
            <div className="ip-stat-label">Blocks (24h)</div>
          </div>
        </div>
        <div className="ip-stat-card ip-stat-card--info">
          <div className="ip-stat-icon">🌐</div>
          <div className="ip-stat-info">
            <div className="ip-stat-value">{stats.uniqueIPsLast7d || 0}</div>
            <div className="ip-stat-label">Unique IPs (7d)</div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="ip-tabs">
        <button
          className={`ip-tab ${activeTab === 'whitelist' ? 'active' : ''}`}
          onClick={() => setActiveTab('whitelist')}
        >
          ✅ Whitelist ({whitelist.length})
        </button>
        <button
          className={`ip-tab ${activeTab === 'banned' ? 'active' : ''}`}
          onClick={() => setActiveTab('banned')}
        >
          🚫 Banned IPs ({bannedIPs.length})
        </button>
        <button
          className={`ip-tab ${activeTab === 'activity' ? 'active' : ''}`}
          onClick={() => setActiveTab('activity')}
        >
          📊 Activity Log ({activity.length})
        </button>
      </div>

      {/* Whitelist Tab */}
      {activeTab === 'whitelist' && (
        <div className="ip-tab-content">
          <div className="ip-add-form">
            <h3>Add IP to Whitelist</h3>
            <div className="ip-form-row">
              <input
                type="text"
                className="ip-input"
                placeholder="IP Address (e.g., 192.168.1.100)"
                value={newIP}
                onChange={(e) => setNewIP(e.target.value)}
              />
              <input
                type="text"
                className="ip-input"
                placeholder="Description (optional)"
                value={newIPDescription}
                onChange={(e) => setNewIPDescription(e.target.value)}
              />
              <button className="ip-btn ip-btn--primary" onClick={addToWhitelist}>
                ➕ Add to Whitelist
              </button>
            </div>
          </div>

          <div className="ip-list">
            <h3>Whitelisted IPs ({whitelist.length})</h3>
            {whitelist.length === 0 ? (
              <div className="ip-empty-state">
                <div className="ip-empty-icon">📋</div>
                <p>No IPs in whitelist</p>
                <p className="ip-empty-hint">Add trusted IPs above</p>
              </div>
            ) : (
              <table className="ip-table">
                <thead>
                  <tr>
                    <th>IP Address</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {whitelist.map((ip, index) => (
                    <tr key={index}>
                      <td>
                        <span className="ip-address">{ip}</span>
                      </td>
                      <td>
                        <span className="ip-badge ip-badge--success">✅ Allowed</span>
                      </td>
                      <td>
                        <button 
                          className="ip-btn ip-btn--danger"
                          onClick={() => removeFromWhitelist(ip)}
                        >
                          🗑️ Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Banned IPs Tab */}
      {activeTab === 'banned' && (
        <div className="ip-tab-content">
          <div className="ip-add-form">
            <h3>Ban IP Address</h3>
            <div className="ip-form-row">
              <input
                type="text"
                className="ip-input"
                placeholder="IP Address to ban"
                value={banIPAddress}
                onChange={(e) => setBanIPAddress(e.target.value)}
              />
              <select 
                className="ip-select"
                value={banType}
                onChange={(e) => setBanType(e.target.value)}
              >
                <option value="temporary">Temporary</option>
                <option value="permanent">Permanent</option>
              </select>
              {banType === 'temporary' && (
                <input
                  type="number"
                  className="ip-input"
                  placeholder="Hours"
                  value={banDuration}
                  onChange={(e) => setBanDuration(parseInt(e.target.value))}
                  min="1"
                  max="720"
                />
              )}
            </div>
            <div className="ip-form-row">
              <input
                type="text"
                className="ip-input ip-input--full"
                placeholder="Reason for ban"
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
              />
              <button className="ip-btn ip-btn--danger" onClick={handleBanIP}>
                🚫 Ban IP
              </button>
            </div>
          </div>

          <div className="ip-list">
            <h3>Banned IPs ({bannedIPs.length})</h3>
            {bannedIPs.length === 0 ? (
              <div className="ip-empty-state">
                <div className="ip-empty-icon">✅</div>
                <p>No banned IPs</p>
                <p className="ip-empty-hint">All IPs are allowed</p>
              </div>
            ) : (
              <table className="ip-table">
                <thead>
                  <tr>
                    <th>IP Address</th>
                    <th>Reason</th>
                    <th>Type</th>
                    <th>Expires</th>
                    <th>Banned On</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {bannedIPs.map((ban) => (
                    <tr key={ban.id} className={!ban.is_active ? 'ip-row--inactive' : ''}>
                      <td>
                        <span className="ip-address">{ban.ip_address}</span>
                      </td>
                      <td>{ban.reason}</td>
                      <td>
                        <span className={`ip-badge ${ban.ban_type === 'permanent' ? 'ip-badge--danger' : 'ip-badge--warning'}`}>
                          {ban.ban_type === 'permanent' ? '🔴 Permanent' : '🟡 Temporary'}
                        </span>
                      </td>
                      <td>
                        {ban.expires_at 
                          ? new Date(ban.expires_at).toLocaleString()
                          : 'Never'}
                      </td>
                      <td>{new Date(ban.created_at).toLocaleString()}</td>
                      <td>
                        {ban.is_active !== false && (
                          <button 
                            className="ip-btn ip-btn--success"
                            onClick={() => unbanIP(ban.ip_address)}
                          >
                            ✅ Unban
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Activity Log Tab */}
      {activeTab === 'activity' && (
        <div className="ip-tab-content">
          <div className="ip-search-bar">
            <input
              type="text"
              className="ip-input"
              placeholder="🔍 Search by IP address..."
              value={searchIP}
              onChange={(e) => setSearchIP(e.target.value)}
            />
            <button className="ip-btn ip-btn--secondary" onClick={() => setSearchIP('')}>
              ✖ Clear
            </button>
          </div>

          <div className="ip-list">
            <h3>IP Access Activity ({filteredActivity.length})</h3>
            {filteredActivity.length === 0 ? (
              <div className="ip-empty-state">
                <div className="ip-empty-icon">📊</div>
                <p>No activity found</p>
              </div>
            ) : (
              <table className="ip-table">
                <thead>
                  <tr>
                    <th>IP Address</th>
                    <th>Action</th>
                    <th>Status</th>
                    <th>Time</th>
                    <th>User Agent</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredActivity.slice(0, 50).map((log, index) => (
                    <tr key={index}>
                      <td>
                        <span className="ip-address">{log.ip_address}</span>
                      </td>
                      <td>{log.action}</td>
                      <td>
                        <span className={`ip-badge ${log.success ? 'ip-badge--success' : 'ip-badge--danger'}`}>
                          {log.success ? '✅ Success' : '❌ Failed'}
                        </span>
                      </td>
                      <td>{new Date(log.created_at).toLocaleString()}</td>
                      <td className="ip-user-agent">{log.user_agent}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
