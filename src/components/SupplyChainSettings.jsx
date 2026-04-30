import { useState } from 'react'

export default function SupplyChainSettings() {
  const [settings, setSettings] = useState({
    notifications: true,
    emailAlerts: false,
    autoApprove: false,
    darkMode: true,
    language: 'en',
    timezone: 'UTC'
  })

  const handleToggle = (key) => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }))
  }

  const handleChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }))
  }

  return (
    <div className="sc-dashboard">
      {/* Stats Overview */}
      <div className="sc-stats-grid">
        <div className="sc-stat-card">
          <div className="sc-stat-icon">⚙️</div>
          <div className="sc-stat-content">
            <div className="sc-stat-value">6</div>
            <div className="sc-stat-label">Settings Categories</div>
          </div>
        </div>

        <div className="sc-stat-card">
          <div className="sc-stat-icon">🔔</div>
          <div className="sc-stat-content">
            <div className="sc-stat-value">{settings.notifications ? 'On' : 'Off'}</div>
            <div className="sc-stat-label">Notifications</div>
          </div>
        </div>

        <div className="sc-stat-card">
          <div className="sc-stat-icon">🌙</div>
          <div className="sc-stat-content">
            <div className="sc-stat-value">{settings.darkMode ? 'Dark' : 'Light'}</div>
            <div className="sc-stat-label">Theme</div>
          </div>
        </div>

        <div className="sc-stat-card highlight">
          <div className="sc-stat-icon">🌍</div>
          <div className="sc-stat-content">
            <div className="sc-stat-value">{settings.language.toUpperCase()}</div>
            <div className="sc-stat-label">Language</div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="sc-dashboard-sections">
        {/* General Settings */}
        <div className="sc-section">
          <div className="sc-section-header">
            <h2>⚙️ General Settings</h2>
          </div>

          <div className="sc-settings-grid">
            <div className="sc-setting-card">
              <div className="sc-setting-header">
                <span className="sc-setting-icon">🔔</span>
                <div>
                  <p className="sc-setting-title">Notifications</p>
                  <p className="sc-setting-desc">Enable system notifications</p>
                </div>
              </div>
              <label className="sc-toggle">
                <input
                  type="checkbox"
                  checked={settings.notifications}
                  onChange={() => handleToggle('notifications')}
                />
                <span className="sc-toggle-slider"></span>
              </label>
            </div>

            <div className="sc-setting-card">
              <div className="sc-setting-header">
                <span className="sc-setting-icon">📧</span>
                <div>
                  <p className="sc-setting-title">Email Alerts</p>
                  <p className="sc-setting-desc">Receive email notifications</p>
                </div>
              </div>
              <label className="sc-toggle">
                <input
                  type="checkbox"
                  checked={settings.emailAlerts}
                  onChange={() => handleToggle('emailAlerts')}
                />
                <span className="sc-toggle-slider"></span>
              </label>
            </div>

            <div className="sc-setting-card">
              <div className="sc-setting-header">
                <span className="sc-setting-icon">✓</span>
                <div>
                  <p className="sc-setting-title">Auto Approve</p>
                  <p className="sc-setting-desc">Automatically approve low-risk transactions</p>
                </div>
              </div>
              <label className="sc-toggle">
                <input
                  type="checkbox"
                  checked={settings.autoApprove}
                  onChange={() => handleToggle('autoApprove')}
                />
                <span className="sc-toggle-slider"></span>
              </label>
            </div>

            <div className="sc-setting-card">
              <div className="sc-setting-header">
                <span className="sc-setting-icon">🌙</span>
                <div>
                  <p className="sc-setting-title">Dark Mode</p>
                  <p className="sc-setting-desc">Use dark theme</p>
                </div>
              </div>
              <label className="sc-toggle">
                <input
                  type="checkbox"
                  checked={settings.darkMode}
                  onChange={() => handleToggle('darkMode')}
                />
                <span className="sc-toggle-slider"></span>
              </label>
            </div>
          </div>
        </div>

        {/* Regional Settings */}
        <div className="sc-section">
          <div className="sc-section-header">
            <h2>🌍 Regional Settings</h2>
          </div>

          <div className="sc-settings-form">
            <div className="sc-form-group">
              <label>Language</label>
              <select
                value={settings.language}
                onChange={(e) => handleChange('language', e.target.value)}
                className="sc-select"
              >
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="de">German</option>
                <option value="zh">Chinese</option>
              </select>
            </div>

            <div className="sc-form-group">
              <label>Timezone</label>
              <select
                value={settings.timezone}
                onChange={(e) => handleChange('timezone', e.target.value)}
                className="sc-select"
              >
                <option value="UTC">UTC</option>
                <option value="EST">Eastern Time</option>
                <option value="PST">Pacific Time</option>
                <option value="GMT">GMT</option>
                <option value="CET">Central European Time</option>
              </select>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="sc-section">
          <h2>⚡ Quick Actions</h2>
          <div className="sc-actions-grid">
            <button className="sc-action-card">
              <span className="sc-action-icon">💾</span>
              <span className="sc-action-label">Save Settings</span>
            </button>
            <button className="sc-action-card">
              <span className="sc-action-icon">🔄</span>
              <span className="sc-action-label">Reset Defaults</span>
            </button>
            <button className="sc-action-card">
              <span className="sc-action-icon">📤</span>
              <span className="sc-action-label">Export Config</span>
            </button>
            <button className="sc-action-card">
              <span className="sc-action-icon">📥</span>
              <span className="sc-action-label">Import Config</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
