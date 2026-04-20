import { useState, useEffect } from 'react'
import adminAPI from '../../services/adminAPI'
import { QRCodeSVG } from 'qrcode.react'
import '../../styles/admin-settings.css'

export default function SettingsPanel() {
  const [settings, setSettings] = useState({
    maintenanceMode: false,
    allowNewUsers: true,
    maxTransactionLimit: '100000',
    minTransactionLimit: '1',
    gasPriceMultiplier: '1.2',
    enableNotifications: true,
    enableAnalytics: true,
    sessionTimeout: '30',
    maxLoginAttempts: '5',
    apiRateLimit: '1000'
  })

  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saveLoading, setSaveLoading] = useState(false)
  const [error, setError] = useState(null)
  
  // 2FA State
  const [twoFAStatus, setTwoFAStatus] = useState('disabled') // disabled, setup, enabled
  const [twoFASecret, setTwoFASecret] = useState(null)
  const [twoFAVerifyToken, setTwoFAVerifyToken] = useState('')
  const [twoFAError, setTwoFAError] = useState('')
  const [twoFALoading, setTwoFALoading] = useState(false)

  useEffect(() => {
    loadSettings()
    load2FAStatus()
  }, [])

  const loadSettings = async () => {
    try {
      setLoading(true)
      // In production, fetch from backend
      // const response = await adminAPI.get('/api/admin/settings')
      // setSettings(response.data)
      setError(null)
    } catch (err) {
      console.error('Failed to load settings:', err)
    } finally {
      setLoading(false)
    }
  }

  const load2FAStatus = async () => {
    try {
      const response = await adminAPI.get('/api/admin/auth/2fa/status')
      if (response.success) {
        setTwoFAStatus(response.enabled ? 'enabled' : 'disabled')
      }
    } catch (err) {
      console.error('Failed to load 2FA status:', err)
    }
  }

  const handleToggle = (key) => {
    setSettings({
      ...settings,
      [key]: !settings[key]
    })
  }

  const handleChange = (key, value) => {
    setSettings({
      ...settings,
      [key]: value
    })
  }

  const handleSave = async () => {
    try {
      setSaveLoading(true)
      // In production: save to backend
      // await adminAPI.put('/api/admin/settings', settings)
      
      console.log('Saving settings:', settings)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      console.error('Failed to save settings:', err)
      alert('Failed to save settings: ' + err.message)
    } finally {
      setSaveLoading(false)
    }
  }

  const handleReset = () => {
    if (window.confirm('Reset all settings to defaults?')) {
      setSettings({
        maintenanceMode: false,
        allowNewUsers: true,
        maxTransactionLimit: '100000',
        minTransactionLimit: '1',
        gasPriceMultiplier: '1.2',
        enableNotifications: true,
        enableAnalytics: true,
        sessionTimeout: '30',
        maxLoginAttempts: '5',
        apiRateLimit: '1000'
      })
    }
  }

  // 2FA Handlers
  const handle2FASetup = async () => {
    setTwoFALoading(true)
    setTwoFAError('')
    
    try {
      const response = await adminAPI.post('/api/admin/auth/2fa/setup', {})
      setTwoFASecret(response)
      setTwoFAStatus('setup')
    } catch (error) {
      setTwoFAError(error.message || 'Failed to setup 2FA')
    } finally {
      setTwoFALoading(false)
    }
  }

  const handle2FAVerify = async () => {
    if (!twoFAVerifyToken || twoFAVerifyToken.length !== 6) {
      setTwoFAError('Please enter a valid 6-digit code')
      return
    }

    setTwoFALoading(true)
    setTwoFAError('')

    try {
      await adminAPI.post('/api/admin/auth/2fa/verify', {
        token: twoFAVerifyToken
      })
      setTwoFAStatus('enabled')
      setTwoFASecret(null)
      setTwoFAVerifyToken('')
      load2FAStatus()
      alert('✅ 2FA enabled successfully!')
    } catch (error) {
      setTwoFAError(error.message || 'Invalid 2FA code')
    } finally {
      setTwoFALoading(false)
    }
  }

  const handle2FADisable = async () => {
    if (!window.confirm('⚠️ Disable 2FA? This reduces your account security.')) {
      return
    }

    setTwoFALoading(true)
    
    try {
      await adminAPI.post('/api/admin/auth/2fa/disable', {})
      setTwoFAStatus('disabled')
      setTwoFASecret(null)
      load2FAStatus()
      alert('2FA disabled')
    } catch (error) {
      setTwoFAError(error.message || 'Failed to disable 2FA')
    } finally {
      setTwoFALoading(false)
    }
  }

  return (
    <div className="admin-panel">
      <div className="admin-panel-header">
        <h2 className="admin-panel-title">Settings & Configuration</h2>
        {saved && <span className="admin-panel-badge success">✓ Saved</span>}
      </div>

      {/* System Settings */}
      <div className="admin-section">
        <h3 className="admin-section-title">System Settings</h3>
        <div className="admin-settings-grid">
          <div className="admin-setting-card">
            <div className="admin-setting-header">
              <span className="admin-setting-icon">🔧</span>
              <div>
                <p className="admin-setting-title">Maintenance Mode</p>
                <p className="admin-setting-desc">Disable all user operations</p>
              </div>
            </div>
            <label className="admin-toggle">
              <input
                type="checkbox"
                checked={settings.maintenanceMode}
                onChange={() => handleToggle('maintenanceMode')}
              />
              <span className="admin-toggle-slider"></span>
            </label>
          </div>

          <div className="admin-setting-card">
            <div className="admin-setting-header">
              <span className="admin-setting-icon">👥</span>
              <div>
                <p className="admin-setting-title">Allow New Users</p>
                <p className="admin-setting-desc">Enable new user registration</p>
              </div>
            </div>
            <label className="admin-toggle">
              <input
                type="checkbox"
                checked={settings.allowNewUsers}
                onChange={() => handleToggle('allowNewUsers')}
              />
              <span className="admin-toggle-slider"></span>
            </label>
          </div>

          <div className="admin-setting-card">
            <div className="admin-setting-header">
              <span className="admin-setting-icon">🔔</span>
              <div>
                <p className="admin-setting-title">Notifications</p>
                <p className="admin-setting-desc">Enable system notifications</p>
              </div>
            </div>
            <label className="admin-toggle">
              <input
                type="checkbox"
                checked={settings.enableNotifications}
                onChange={() => handleToggle('enableNotifications')}
              />
              <span className="admin-toggle-slider"></span>
            </label>
          </div>

          <div className="admin-setting-card">
            <div className="admin-setting-header">
              <span className="admin-setting-icon">📊</span>
              <div>
                <p className="admin-setting-title">Analytics</p>
                <p className="admin-setting-desc">Enable analytics tracking</p>
              </div>
            </div>
            <label className="admin-toggle">
              <input
                type="checkbox"
                checked={settings.enableAnalytics}
                onChange={() => handleToggle('enableAnalytics')}
              />
              <span className="admin-toggle-slider"></span>
            </label>
          </div>
        </div>
      </div>

      {/* Transaction Limits */}
      <div className="admin-section">
        <h3 className="admin-section-title">Transaction Limits</h3>
        <div className="admin-form-grid">
          <div className="admin-form-group">
            <label className="admin-form-label">Max Transaction Limit (DWT)</label>
            <input
              type="number"
              className="admin-form-input"
              value={settings.maxTransactionLimit}
              onChange={(e) => handleChange('maxTransactionLimit', e.target.value)}
            />
          </div>

          <div className="admin-form-group">
            <label className="admin-form-label">Min Transaction Limit (DWT)</label>
            <input
              type="number"
              className="admin-form-input"
              value={settings.minTransactionLimit}
              onChange={(e) => handleChange('minTransactionLimit', e.target.value)}
            />
          </div>

          <div className="admin-form-group">
            <label className="admin-form-label">Gas Price Multiplier</label>
            <input
              type="number"
              className="admin-form-input"
              value={settings.gasPriceMultiplier}
              onChange={(e) => handleChange('gasPriceMultiplier', e.target.value)}
              step="0.1"
              min="0.5"
              max="5"
            />
          </div>
        </div>
      </div>

      {/* Security Settings */}
      <div className="admin-section">
        <h3 className="admin-section-title">Security Settings</h3>
        
        {/* 2FA Configuration */}
        <div className="admin-2fa-container">
          <div className="admin-2fa-header">
            <div className="admin-2fa-title-group">
              <div className="admin-2fa-icon">
                <span>🔐</span>
              </div>
              <div>
                <h4 className="admin-2fa-title">Two-Factor Authentication (2FA)</h4>
                <p className="admin-2fa-subtitle">
                  {twoFAStatus === 'enabled' ? '✅ 2FA is enabled' : 
                   twoFAStatus === 'setup' ? '⏳ Setup in progress' : 
                   '❌ 2FA is disabled - Enable for maximum security'}
                </p>
              </div>
            </div>
            {twoFAStatus === 'enabled' ? (
              <span className="admin-2fa-status-badge enabled">
                ENABLED
              </span>
            ) : twoFAStatus === 'disabled' ? (
              <button 
                className="admin-btn primary"
                onClick={handle2FASetup}
                disabled={twoFALoading}
                style={{ padding: '8px 16px', fontSize: '13px' }}
              >
                {twoFALoading ? 'Setting up...' : 'Enable 2FA'}
              </button>
            ) : null}
          </div>

          {/* 2FA Setup Wizard */}
          {twoFAStatus === 'setup' && twoFASecret && (
            <div className="admin-2fa-setup">
              <h5 style={{ margin: '0 0 16px', fontSize: '14px' }}>Setup Instructions:</h5>
              
              <ol className="admin-2fa-instructions">
                <li>Open Google Authenticator app on your phone</li>
                <li>Tap the "+" button to add a new account</li>
                <li>Scan the QR code below OR enter the secret key manually</li>
                <li>Enter the 6-digit code shown in your app to verify</li>
              </ol>

              <div className="admin-2fa-qr-container">
                <p className="admin-2fa-qr-label">📱 Scan QR Code with Google Authenticator:</p>
                <div className="admin-2fa-qr-code">
                  <QRCodeSVG 
                    value={twoFASecret.otpauth_url} 
                    size={256}
                    level="H"
                    includeMargin={true}
                  />
                </div>
                <p className="admin-2fa-qr-hint">Point your phone camera at this QR code</p>
              </div>

              <div className="admin-2fa-divider">OR</div>

              <div className="admin-2fa-secret-container">
                <p className="admin-2fa-secret-label">🔑 Manual Setup - Secret Key:</p>
                <p className="admin-2fa-secret-hint">If QR code doesn't work, copy this key into Google Authenticator</p>
                <code className="admin-2fa-secret-code">
                  {twoFASecret.secret}
                </code>
                <button 
                  className="admin-2fa-copy-btn"
                  onClick={() => {
                    navigator.clipboard.writeText(twoFASecret.secret)
                    alert('✅ Secret key copied to clipboard!')
                  }}
                >
                  📋 Copy Secret Key
                </button>
              </div>

              <div className="admin-2fa-verify-section">
                <p className="admin-2fa-verify-label">Enter 6-digit code from Google Authenticator:</p>
                <div className="admin-2fa-verify-row">
                  <input
                    type="text"
                    value={twoFAVerifyToken}
                    onChange={(e) => setTwoFAVerifyToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    maxLength={6}
                    className="admin-2fa-input"
                  />
                  <button 
                    className="admin-btn primary"
                    onClick={handle2FAVerify}
                    disabled={twoFALoading || twoFAVerifyToken.length !== 6}
                    style={{ padding: '12px 24px' }}
                  >
                    {twoFALoading ? 'Verifying...' : '✓ Verify & Enable'}
                  </button>
                </div>
              </div>

              {twoFAError && (
                <div className="admin-2fa-error">
                  ⚠️ {twoFAError}
                </div>
              )}
            </div>
          )}

          {/* 2FA Enabled Status */}
          {twoFAStatus === 'enabled' && (
            <div className="admin-2fa-success">
              <p className="admin-2fa-success-text">
                ✅ Your account is protected with 2FA. You'll need to enter a 6-digit code from your authenticator app each time you login.
              </p>
              <button 
                className="admin-btn warning"
                onClick={handle2FADisable}
                disabled={twoFALoading}
                style={{ padding: '8px 16px', fontSize: '13px' }}
              >
                Disable 2FA
              </button>
            </div>
          )}
        </div>

        <div className="admin-form-grid">
          <div className="admin-form-group">
            <label className="admin-form-label">Session Timeout (minutes)</label>
            <input
              type="number"
              className="admin-form-input"
              value={settings.sessionTimeout}
              onChange={(e) => handleChange('sessionTimeout', e.target.value)}
            />
          </div>

          <div className="admin-form-group">
            <label className="admin-form-label">Max Login Attempts</label>
            <input
              type="number"
              className="admin-form-input"
              value={settings.maxLoginAttempts}
              onChange={(e) => handleChange('maxLoginAttempts', e.target.value)}
            />
          </div>

          <div className="admin-form-group">
            <label className="admin-form-label">API Rate Limit (req/min)</label>
            <input
              type="number"
              className="admin-form-input"
              value={settings.apiRateLimit}
              onChange={(e) => handleChange('apiRateLimit', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Environment Info */}
      <div className="admin-section">
        <h3 className="admin-section-title">Environment Information</h3>
        <div className="admin-info-grid">
          <div className="admin-info-card">
            <p className="admin-info-label">Network</p>
            <p className="admin-info-value">{import.meta.env.VITE_NETWORK_NAME || 'Sepolia'}</p>
          </div>
          <div className="admin-info-card">
            <p className="admin-info-label">Chain ID</p>
            <p className="admin-info-value">{import.meta.env.VITE_CHAIN_ID || '11155111'}</p>
          </div>
          <div className="admin-info-card">
            <p className="admin-info-label">RPC URL</p>
            <p className="admin-info-value" style={{ fontSize: '11px' }}>
              {import.meta.env.VITE_RPC_URL || 'https://sepolia.infura.io'}
            </p>
          </div>
          <div className="admin-info-card">
            <p className="admin-info-label">Version</p>
            <p className="admin-info-value">v5.0.0</p>
          </div>
        </div>
      </div>

      {/* Contract Addresses */}
      <div className="admin-section">
        <h3 className="admin-section-title">Contract Addresses</h3>
        <div className="admin-contracts-list">
          <div className="admin-contract-address-row">
            <span className="admin-contract-name">DWT Token:</span>
            <code className="admin-contract-addr">
              {import.meta.env.VITE_DWT_TOKEN_ADDRESS || 'Not configured'}
            </code>
          </div>
          <div className="admin-contract-address-row">
            <span className="admin-contract-name">DEX Router:</span>
            <code className="admin-contract-addr">
              {import.meta.env.VITE_DEX_ROUTER_ADDRESS || 'Not configured'}
            </code>
          </div>
          <div className="admin-contract-address-row">
            <span className="admin-contract-name">Staking:</span>
            <code className="admin-contract-addr">
              {import.meta.env.VITE_STAKING_ADDRESS || 'Not configured'}
            </code>
          </div>
          <div className="admin-contract-address-row">
            <span className="admin-contract-name">NFT Membership:</span>
            <code className="admin-contract-addr">
              {import.meta.env.VITE_NFT_MEMBERSHIP_ADDRESS || 'Not configured'}
            </code>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="admin-actions-footer">
        <button className="admin-btn primary" onClick={handleSave}>
          💾 Save All Settings
        </button>
        <button className="admin-btn secondary" onClick={handleReset}>
          🔄 Reset to Defaults
        </button>
        <button className="admin-btn warning">
          📤 Export Config
        </button>
      </div>
    </div>
  )
}
