import { useState, useEffect } from 'react'
import { useWallet } from '../hooks/useWallet'
import adminAPI from '../services/adminAPI'
import * as Sentry from '@sentry/react'
import { isBiometricSupported, authenticateWithBiometric } from '../utils/biometricAuth'

// Admin Panel Components
import SystemOverview from './admin/SystemOverview'
import UserManagement from './admin/UserManagement'
import ContractControl from './admin/ContractControl'
import SecurityMonitor from './admin/SecurityMonitor'
import TokenManagement from './admin/TokenManagement'
import TransactionMonitor from './admin/TransactionMonitor'
import SettingsPanel from './admin/SettingsPanel'
import GovernancePanel from './admin/GovernancePanel'
import DeFiOperationsPanel from './admin/DeFiOperationsPanel'
import CrossChainPanel from './admin/CrossChainPanel'
import LayerArchitecture from './admin/LayerArchitecture'
import IPListsManagement from './IPListsManagement'

// Admin Configuration - NO SECRETS IN FRONTEND
const ADMIN_API_ENABLED = import.meta.env.VITE_ADMIN_API_URL ? true : false;

// Helper function to convert ArrayBuffer to Base64
function arrayBufferToBase64(buffer) {
  let binary = ''
  const bytes = new Uint8Array(buffer)
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return window.btoa(binary)
}

export default function AdminDashboard() {
  const { currentAddress, provider } = useWallet()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [activePanel, setActivePanel] = useState('overview')
  const [authMethod, setAuthMethod] = useState('key')
  const [adminKey, setAdminKey] = useState('')
  const [showAuthModal, setShowAuthModal] = useState(true)
  const [authError, setAuthError] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [apiHealth, setApiHealth] = useState('checking')
  const [requires2FA, setRequires2FA] = useState(false)
  const [twoFAToken, setTwoFAToken] = useState('')
  const [pendingAuth, setPendingAuth] = useState(null)
  const [show2FASetup, setShow2FASetup] = useState(false)
  const [twoFASecret, setTwoFASecret] = useState(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [biometricSupported, setBiometricSupported] = useState(false)
  const [biometricLoading, setBiometricLoading] = useState(false)

  // Check if already authenticated on mount
  useEffect(() => {
    if (adminAPI.isAuthenticated()) {
      setIsAuthenticated(true)
      setShowAuthModal(false)
      
      // Set Sentry user context
      Sentry.setUser({
        id: 'admin',
        ip_address: '{{auto}}'
      });
    }
    
    // Check API health
    checkAPIHealth()
    
    // Check biometric support
    setBiometricSupported(isBiometricSupported())
  }, [])

  const checkAPIHealth = async () => {
    const health = await adminAPI.healthCheck()
    setApiHealth(health.status)
  }

  const handleAuth = async () => {
    setAuthLoading(true)
    setAuthError('')

    try {
      if (authMethod === 'key') {
        if (!adminKey) {
          setAuthError('Please enter admin key')
          setAuthLoading(false)
          return
        }

        const response = await adminAPI.loginWithKey(adminKey)
        
        // Check if 2FA is required
        if (response.requires2FA) {
          setPendingAuth({ type: 'key', adminKey })
          setRequires2FA(true)
          setAuthLoading(false)
          return
        }

        // Store admin key securely for biometric auth
        localStorage.setItem('admin_key_secure', adminKey)

        setIsAuthenticated(true)
        setShowAuthModal(false)
        
      } else if (authMethod === 'wallet') {
        if (!provider || !currentAddress) {
          setAuthError('Please connect your wallet first. Click "Connect MetaMask" button above.')
          setAuthLoading(false)
          return
        }

        const signer = await provider.getSigner()
        const response = await adminAPI.loginWithWallet(signer)
        
        if (response.requires2FA) {
          setPendingAuth({ type: 'wallet', signer })
          setRequires2FA(true)
          setAuthLoading(false)
          return
        }

        setIsAuthenticated(true)
        setShowAuthModal(false)
      } else if (authMethod === 'biometric') {
        await handleBiometricAuth()
      }
    } catch (error) {
      console.error('Authentication error:', error)
      setAuthError(error.message || 'Authentication failed')
    } finally {
      setAuthLoading(false)
    }
  }

  const handle2FAVerify = async () => {
    if (!twoFAToken || twoFAToken.length !== 6) {
      setAuthError('Please enter valid 6-digit 2FA code')
      return
    }

    setAuthLoading(true)
    setAuthError('')

    try {
      if (pendingAuth.type === 'key') {
        await adminAPI.loginWithKey(pendingAuth.adminKey, twoFAToken)
      } else if (pendingAuth.type === 'wallet') {
        await adminAPI.loginWithWallet(pendingAuth.signer, twoFAToken)
      }

      setIsAuthenticated(true)
      setShowAuthModal(false)
      setRequires2FA(false)
      setPendingAuth(null)
    } catch (error) {
      setAuthError(error.message || '2FA verification failed')
    } finally {
      setAuthLoading(false)
    }
  }

  const handleBiometricAuth = async () => {
    setBiometricLoading(true)
    setAuthError('')

    try {
      if (!biometricSupported) {
        throw new Error('Biometric authentication is not supported on this device')
      }

      // Check if biometric credential is stored
      const biometricCredential = localStorage.getItem('admin_biometric_credential')
      if (!biometricCredential) {
        throw new Error('Biometric authentication is not enabled. Please setup biometric first.')
      }

      const credential = JSON.parse(biometricCredential)

      // Get authentication challenge from server
      const challengeResponse = await fetch(`${import.meta.env.VITE_ADMIN_API_URL || 'http://localhost:3001'}/api/admin/auth/biometric/challenge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credentialId: credential.id })
      })

      if (!challengeResponse.ok) {
        throw new Error('Failed to get authentication challenge')
      }

      const { challenge, allowCredentials } = await challengeResponse.json()

      // Authenticate with WebAuthn
      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge: Uint8Array.from(atob(challenge), c => c.charCodeAt(0)),
          allowCredentials: allowCredentials,
          timeout: 60000,
          userVerification: 'required'
        }
      })

      if (!assertion) {
        throw new Error('Biometric authentication cancelled or failed')
      }

      // Send authentication response to server
      const verifyResponse = await fetch(`${import.meta.env.VITE_ADMIN_API_URL || 'http://localhost:3001'}/api/admin/auth/biometric/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credentialId: assertion.id,
          authenticatorData: btoa(String.fromCharCode(...new Uint8Array(assertion.response.authenticatorData))),
          clientDataJSON: btoa(String.fromCharCode(...new Uint8Array(assertion.response.clientDataJSON))),
          signature: btoa(String.fromCharCode(...new Uint8Array(assertion.response.signature))),
          userHandle: assertion.response.userHandle ? btoa(String.fromCharCode(...new Uint8Array(assertion.response.userHandle))) : null
        })
      })

      if (!verifyResponse.ok) {
        const error = await verifyResponse.json()
        throw new Error(error.error || 'Biometric verification failed')
      }

      const data = await verifyResponse.json()

      // Store JWT token
      localStorage.setItem('admin_token', data.token)
      
      setIsAuthenticated(true)
      setShowAuthModal(false)
    } catch (error) {
      console.error('Biometric authentication error:', error)
      setAuthError(error.message || 'Biometric authentication failed')
    } finally {
      setBiometricLoading(false)
    }
  }

  const handle2FASetup = async () => {
    try {
      const response = await adminAPI.post('/api/admin/auth/2fa/setup', {})
      setTwoFASecret(response)
      setShow2FASetup(true)
    } catch (error) {
      console.error('2FA setup error:', error)
    }
  }

  const handleLogout = () => {
    adminAPI.logout()
    setIsAuthenticated(false)
    setShowAuthModal(true)
    setAdminKey('')
    setActivePanel('overview')
    // Clear stored admin key on logout for security
    localStorage.removeItem('admin_key_secure')
  }

  if (!isAuthenticated) {
    return (
      <div className="admin-auth-modal">
        <div className="admin-auth-box">
          <div className="admin-auth-header">
            <span className="admin-auth-icon">🔐</span>
            <h2>Admin Access Required</h2>
            <p>Secure authentication via backend server</p>
            
            {/* API Health Indicator */}
            <div className={`api-health-badge ${apiHealth}`}>
              {apiHealth === 'healthy' ? '✅ API Connected' : 
               apiHealth === 'checking' ? '⏳ Checking...' : 
               '❌ API Offline'}
            </div>
          </div>

          {/* Authentication Method Selector */}
          <div className="auth-method-tabs">
            <button 
              className={`auth-method-tab ${authMethod === 'key' ? 'active' : ''}`}
              onClick={() => setAuthMethod('key')}
            >
              🔑 Admin Key
            </button>
            <button 
              className={`auth-method-tab ${authMethod === 'wallet' ? 'active' : ''}`}
              onClick={() => setAuthMethod('wallet')}
            >
              👛 Wallet
            </button>
            {biometricSupported && (
              <button 
                className={`auth-method-tab ${authMethod === 'biometric' ? 'active' : ''}`}
                onClick={() => setAuthMethod('biometric')}
              >
                👆 Biometric
              </button>
            )}
          </div>

          <div className="admin-auth-form">
            {authMethod === 'key' ? (
              <input
                type="password"
                value={adminKey}
                onChange={(e) => setAdminKey(e.target.value)}
                placeholder="Enter admin key..."
                className="admin-auth-input"
                onKeyPress={(e) => e.key === 'Enter' && handleAuth()}
                disabled={authLoading}
              />
            ) : authMethod === 'wallet' ? (
              <div className="wallet-auth-info">
                <p>🔗 Connected: {currentAddress ? `${currentAddress.slice(0, 6)}...${currentAddress.slice(-4)}` : 'Not connected'}</p>
                {!currentAddress && (
                  <button 
                    className="admin-auth-btn secondary"
                    onClick={async () => {
                      try {
                        if (window.ethereum) {
                          await window.ethereum.request({ method: 'eth_requestAccounts' });
                          // WalletContext will automatically update currentAddress
                        } else {
                          setAuthError('MetaMask not detected. Please install MetaMask!');
                        }
                      } catch (error) {
                        setAuthError('Wallet connection rejected');
                      }
                    }}
                    style={{ marginTop: '12px', width: '100%' }}
                  >
                    🔌 Connect MetaMask
                  </button>
                )}
                {currentAddress && (
                  <p className="wallet-auth-note">Click authenticate to sign a message with your wallet</p>
                )}
              </div>
            ) : authMethod === 'biometric' ? (
              <div className="biometric-auth-info">
                <div className="biometric-icon" style={{ fontSize: '48px', textAlign: 'center', margin: '20px 0' }}>
                  {biometricLoading ? '⏳' : '👆'}
                </div>
                <p style={{ textAlign: 'center', color: 'var(--text2)', fontSize: '14px' }}>
                  {biometricLoading 
                    ? 'Authenticating with biometrics...'
                    : 'Use your fingerprint, face ID, or device PIN to authenticate'
                  }
                </p>
                {!biometricSupported && (
                  <p style={{ textAlign: 'center', color: 'var(--danger)', fontSize: '13px', marginTop: '12px' }}>
                    ⚠️ Biometric authentication is not supported on this device
                  </p>
                )}
                {biometricSupported && (
                  <p style={{ textAlign: 'center', color: 'var(--success)', fontSize: '13px', marginTop: '12px' }}>
                    ✅ Biometric authentication is available
                  </p>
                )}
                {biometricSupported && (
                  <button 
                    className="admin-auth-btn secondary"
                    onClick={async () => {
                      try {
                        // Check if already authenticated
                        if (!isAuthenticated) {
                          setAuthError('Please login with Admin Key or Wallet first to enable biometric auth')
                          return
                        }
                        
                        setBiometricLoading(true)
                        setAuthError('')
                        
                        // Generate registration challenge
                        const challenge = crypto.getRandomValues(new Uint8Array(32))
                        const userId = crypto.getRandomValues(new Uint8Array(16))
                        
                        // Create WebAuthn credential
                        const rpConfig = {
                          name: 'dWallet Admin'
                        }
                        
                        // Only set rp.id for non-localhost domains
                        if (window.location.hostname && 
                            window.location.hostname !== 'localhost' && 
                            window.location.hostname !== '127.0.0.1') {
                          rpConfig.id = window.location.hostname
                        }
                        
                        const credential = await navigator.credentials.create({
                          publicKey: {
                            challenge,
                            rp: rpConfig,
                            user: {
                              id: userId,
                              name: `admin-${Date.now()}`,
                              displayName: 'dWallet Admin'
                            },
                            pubKeyCredParams: [
                              { alg: -7, type: 'public-key' },   // ES256
                              { alg: -257, type: 'public-key' }  // RS256
                            ],
                            authenticatorSelection: {
                              authenticatorAttachment: 'platform',
                              userVerification: 'required',
                              residentKey: 'required'
                            },
                            timeout: 60000,
                            attestation: 'direct'
                          }
                        })
                        
                        if (!credential) {
                          throw new Error('Biometric registration cancelled')
                        }
                        
                        // Extract public key
                        const publicKey = credential.response.getPublicKey 
                          ? arrayBufferToBase64(credential.response.getPublicKey())
                          : null
                        
                        // Send credential to server
                        const response = await fetch(`${import.meta.env.VITE_ADMIN_API_URL || 'http://localhost:3001'}/api/admin/auth/biometric/register`, {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
                          },
                          body: JSON.stringify({
                            credentialData: {
                              id: credential.id,
                              publicKey: publicKey
                            }
                          })
                        })
                        
                        if (!response.ok) {
                          const error = await response.json()
                          throw new Error(error.error || 'Failed to register biometric')
                        }
                        
                        // Store credential locally for future logins
                        localStorage.setItem('admin_biometric_credential', JSON.stringify({
                          id: credential.id,
                          createdAt: Date.now()
                        }))
                        
                        alert('✅ Biometric authentication enabled! You can now use it to login.')
                      } catch (error) {
                        console.error('Biometric setup error:', error)
                        setAuthError(error.message || 'Failed to setup biometric')
                      } finally {
                        setBiometricLoading(false)
                      }
                    }}
                    disabled={biometricLoading}
                    style={{ marginTop: '16px', width: '100%' }}
                  >
                    {biometricLoading ? '⏳ Setting up...' : '🔐 Setup Biometric'}
                  </button>
                )}
              </div>
            ) : null}
            
            {authError && (
              <div className="admin-auth-error">{authError}</div>
            )}

            <div className="admin-auth-actions">
              <button 
                className="admin-auth-btn primary" 
                onClick={handleAuth}
                disabled={authLoading}
              >
                {authLoading ? '⏳ Authenticating...' : 'Authenticate'}
              </button>
              <button 
                className="admin-auth-btn secondary"
                onClick={() => window.history.back()}
                disabled={authLoading}
              >
                Cancel
              </button>
            </div>
          </div>

          <div className="admin-auth-info">
            <p>🔒 All authentication is server-side validated</p>
            <p>🛡️ Rate limited: 5 attempts per 15 minutes</p>
            <p>📝 All actions are logged and audited</p>
          </div>
        </div>
      </div>
    )
  }

  const panels = [
    { id: 'overview', label: 'System Overview', icon: '📊', description: 'Dashboard & metrics' },
    { id: 'layers', label: 'Layer Architecture', icon: '🏗️', description: 'Smart contract layers' },
    { id: 'governance', label: 'Governance', icon: '🏛️', description: 'DAO & voting' },
    { id: 'defi', label: 'DeFi Operations', icon: '💰', description: 'Lending & yields' },
    { id: 'crosschain', label: 'Cross-Chain', icon: '🌉', description: 'Bridge & transfers' },
    { id: 'tokens', label: 'Token Management', icon: '💎', description: 'Mint & distribute' },
    { id: 'contracts', label: 'Contract Control', icon: '📜', description: 'Deploy & manage' },
    { id: 'security', label: 'Security Monitor', icon: '🛡️', description: 'Threats & alerts' },
    { id: 'users', label: 'User Management', icon: '👥', description: 'Accounts & roles' },
    { id: 'transactions', label: 'Transactions', icon: '🔄', description: 'History & monitoring' },
    { id: 'ip-lists', label: 'IP Lists', icon: '🔒', description: 'Whitelist & blacklist' },
    { id: 'settings', label: 'Settings', icon: '⚙️', description: 'Configuration' },
  ]

  // Determine layout classes
  const dashboardClass = `admin-dashboard admin-dashboard--nav-left ${sidebarCollapsed ? 'admin-dashboard--sidebar-collapsed' : ''}`

  return (
    <div className={dashboardClass}>
      {/* Professional Left Sidebar */}
      <aside className={`admin-sidebar ${sidebarCollapsed ? 'admin-sidebar--collapsed' : ''}`}>
          {/* Sidebar Header / Branding */}
          <div className="admin-sidebar-header">
            <div className="admin-sidebar-logo">
              {!sidebarCollapsed ? (
                <div className="admin-sidebar-logo-text">
                  <h2 className="toklo-logo">TOKLO</h2>
                  <span>Admin Panel</span>
                </div>
              ) : (
                <div className="admin-sidebar-logo-text">
                  <h2 className="toklo-logo-small">T</h2>
                </div>
              )}
            </div>
            <button 
              className="admin-sidebar-toggle"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {sidebarCollapsed ? '▶' : '◀'}
            </button>
          </div>

          {/* Navigation Menu */}
          <nav className="admin-sidebar-nav">
            {panels.map(panel => (
              <button
                key={panel.id}
                className={`admin-sidebar-btn ${activePanel === panel.id ? 'active' : ''}`}
                onClick={() => setActivePanel(panel.id)}
                title={sidebarCollapsed ? panel.label : undefined}
              >
                <span className="admin-sidebar-icon">{panel.icon}</span>
                {!sidebarCollapsed && (
                  <div className="admin-sidebar-btn-content">
                    <span className="admin-sidebar-btn-label">{panel.label}</span>
                    <span className="admin-sidebar-btn-desc">{panel.description}</span>
                  </div>
                )}
              </button>
            ))}
          </nav>

          {/* Sidebar Footer */}
          <div className="admin-sidebar-footer">
            <div className="admin-sidebar-user">
              <div className="admin-sidebar-user-avatar">👛</div>
              {!sidebarCollapsed && (
                <div className="admin-sidebar-user-info">
                  <span className="admin-sidebar-user-address">
                    {currentAddress ? `${currentAddress.slice(0, 6)}...${currentAddress.slice(-4)}` : 'Not connected'}
                  </span>
                  <button className="admin-sidebar-logout" onClick={handleLogout}>
                    🚪 Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </aside>
      {/* Admin Header */}
      <div className="admin-header">
        <div className="admin-header-left">
          <h1 className="admin-title">
            <span className="admin-title-icon">⚡</span>
            Admin Control Center
          </h1>
          <p className="admin-subtitle">Centralized Management Dashboard</p>
        </div>
        
        <div className="admin-header-right">
          {/* Header is minimal - user info is in sidebar */}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="admin-content">
        {activePanel === 'overview' && <SystemOverview />}
        {activePanel === 'layers' && <LayerArchitecture />}
        {activePanel === 'governance' && <GovernancePanel />}
        {activePanel === 'defi' && <DeFiOperationsPanel />}
        {activePanel === 'crosschain' && <CrossChainPanel />}
        {activePanel === 'tokens' && <TokenManagement />}
        {activePanel === 'contracts' && <ContractControl />}
        {activePanel === 'security' && <SecurityMonitor />}
        {activePanel === 'users' && <UserManagement />}
        {activePanel === 'transactions' && <TransactionMonitor />}
        {activePanel === 'ip-lists' && <IPListsManagement />}
        {activePanel === 'settings' && <SettingsPanel />}
      </div>
    </div>
  )
}
