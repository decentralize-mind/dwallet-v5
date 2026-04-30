import { useState } from 'react'
import '../styles/supply-chain-login.css'

export default function SupplyChainLogin({ onLogin }) {
  const [authMethod, setAuthMethod] = useState('email')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showRegister, setShowRegister] = useState(false)
  
  // Registration form
  const [regName, setRegName] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regRole, setRegRole] = useState('supplier')

  const handleEmailLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Use relative URL to leverage Vite's proxy configuration
      // This avoids CSP issues and CORS problems
      const apiUrl = '' // Empty string = same origin (uses Vite proxy)
      console.log('Attempting login to:', `/api/auth/login`)
      
      const response = await fetch(`/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Login failed')
      }

      const data = await response.json()
      console.log('Login successful:', data)
      
      // Check if 2FA required
      if (data.requires2FA) {
        setError('2FA verification required')
        // Handle 2FA flow
        return
      }

      onLogin({
        token: data.token,
        user: data.user,
        expires: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
      })
    } catch (err) {
      console.error('Login error:', err)
      setError(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const handleWalletLogin = async () => {
    if (!window.ethereum) {
      setError('Please install MetaMask or another Web3 wallet')
      return
    }

    setLoading(true)
    setError('')

    try {
      const { ethers } = await import('ethers')
      const provider = new ethers.BrowserProvider(window.ethereum)
      const accounts = await provider.send("eth_requestAccounts", [])
      const signer = await provider.getSigner()
      const address = await signer.getAddress()

      // Create message to sign
      const message = `Sign this message to authenticate with TOKLO Supply Chain\n\nAddress: ${address}\nTimestamp: ${Date.now()}\nNonce: ${Math.random().toString(36).substring(7)}`
      const signature = await signer.signMessage(message)

      // Verify signature with backend using relative URL (Vite proxy)
      const response = await fetch('/api/auth/wallet-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address,
          message,
          signature
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Wallet authentication failed')
      }

      const data = await response.json()
      onLogin({
        token: data.token,
        user: data.user,
        expires: Date.now() + (24 * 60 * 60 * 1000)
      })
    } catch (err) {
      setError(err.message || 'Wallet authentication failed')
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: regName,
          email: regEmail,
          password: regPassword,
          role: regRole
        })
      })

      // Get response text first to handle any format
      const text = await response.text()
      console.log('Registration response:', text)
      
      // Try to parse JSON
      let data
      try {
        // Find the last JSON object in the response (in case there are logs before it)
        const jsonMatch = text.match(/\{[\s\S]*\}$/)
        if (jsonMatch) {
          data = JSON.parse(jsonMatch[0])
        } else {
          throw new Error('Invalid response format')
        }
      } catch (parseError) {
        console.error('Failed to parse response:', parseError)
        throw new Error('Registration completed but response format error')
      }

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed')
      }

      alert('✅ Registration successful! Please login with your credentials.')
      setShowRegister(false)
      // Clear form
      setRegName('')
      setRegEmail('')
      setRegPassword('')
      setRegRole('admin')
    } catch (err) {
      console.error('Registration error:', err)
      setError(err.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  if (showRegister) {
    return (
      <div className="sc-login-container">
        <div className="sc-login-background">
          <div className="sc-bg-circle sc-bg-circle-1"></div>
          <div className="sc-bg-circle sc-bg-circle-2"></div>
          <div className="sc-bg-circle sc-bg-circle-3"></div>
        </div>
        
        <div className="sc-login-box">
          <div className="sc-login-card">
            <div className="sc-login-header">
              <div className="sc-login-logo-wrapper">
                <div className="sc-login-logo">🏭</div>
                <div className="sc-logo-ring"></div>
              </div>
              <h1>Create Account</h1>
              <p>Join TOKLO Supply Chain Network</p>
            </div>

            <form onSubmit={handleRegister} className="sc-login-form">
              <div className="sc-form-group">
                <label className="sc-form-label">
                  <span className="sc-label-icon">👤</span>
                  Full Name
                </label>
                <input
                  type="text"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="John Doe"
                  className="sc-form-input"
                  required
                />
              </div>

              <div className="sc-form-group">
                <label className="sc-form-label">
                  <span className="sc-label-icon">📧</span>
                  Email
                </label>
                <input
                  type="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="john@company.com"
                  className="sc-form-input"
                  required
                />
              </div>

              <div className="sc-form-group">
                <label className="sc-form-label">
                  <span className="sc-label-icon">🔒</span>
                  Password
                </label>
                <input
                  type="password"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="Min 8 characters"
                  className="sc-form-input"
                  minLength="8"
                  required
                />
              </div>

              <div className="sc-form-group">
                <label className="sc-form-label">
                  <span className="sc-label-icon">👔</span>
                  Role
                </label>
                <select value={regRole} onChange={(e) => setRegRole(e.target.value)} className="sc-form-select">
                  <option value="supplier">Supplier</option>
                  <option value="buyer">Buyer</option>
                  <option value="manufacturer">Manufacturer</option>
                  <option value="logistics">Logistics Provider</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>

              {error && <div className="sc-login-error">⚠️ {error}</div>}

              <button type="submit" className="sc-login-btn sc-btn-gradient" disabled={loading}>
                {loading ? (
                  <span className="sc-btn-loading">
                    <span className="sc-spinner"></span>
                    Creating Account...
                  </span>
                ) : (
                  <span>🚀 Create Account</span>
                )}
              </button>

              <div className="sc-login-divider">
                <span>or</span>
              </div>

              <div className="sc-login-footer">
                Already have an account?{' '}
                <button type="button" className="sc-link-btn" onClick={() => setShowRegister(false)}>
                  Login here
                </button>
              </div>
            </form>
          </div>

          <div className="sc-login-security">
            <div className="sc-security-item">
              <span className="sc-security-icon">🔒</span>
              <span>Secured by blockchain authentication</span>
            </div>
            <div className="sc-security-item">
              <span className="sc-security-icon">🛡️</span>
              <span>Enterprise-grade encryption</span>
            </div>
            <div className="sc-security-item">
              <span className="sc-security-icon">📝</span>
              <span>All actions audited on-chain</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="sc-login-container">
      <div className="sc-login-background">
        <div className="sc-bg-circle sc-bg-circle-1"></div>
        <div className="sc-bg-circle sc-bg-circle-2"></div>
        <div className="sc-bg-circle sc-bg-circle-3"></div>
      </div>
      
      <div className="sc-login-box">
        <div className="sc-login-card">
          <div className="sc-login-header">
            <div className="sc-login-logo-wrapper">
              <div className="sc-login-logo">🏭</div>
              <div className="sc-logo-ring"></div>
            </div>
            <h1>TOKLO Supply Chain</h1>
            <p>Enterprise Supply Chain Management</p>
          </div>

          {/* Auth Method Tabs */}
          <div className="sc-auth-tabs">
            <button
              className={`sc-auth-tab ${authMethod === 'email' ? 'active' : ''}`}
              onClick={() => setAuthMethod('email')}
            >
              <span className="sc-tab-icon">📧</span>
              <span className="sc-tab-label">Email</span>
            </button>
            <button
              className={`sc-auth-tab ${authMethod === 'wallet' ? 'active' : ''}`}
              onClick={() => setAuthMethod('wallet')}
            >
              <span className="sc-tab-icon">👛</span>
              <span className="sc-tab-label">Wallet</span>
            </button>
          </div>

          {authMethod === 'email' ? (
            <form onSubmit={handleEmailLogin} className="sc-login-form">
              <div className="sc-form-group">
                <label className="sc-form-label">
                  <span className="sc-label-icon">📧</span>
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="sc-form-input"
                  required
                />
              </div>

              <div className="sc-form-group">
                <label className="sc-form-label">
                  <span className="sc-label-icon">🔒</span>
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="sc-form-input"
                  required
                />
              </div>

              {error && <div className="sc-login-error">⚠️ {error}</div>}

              <button type="submit" className="sc-login-btn sc-btn-gradient" disabled={loading}>
                {loading ? (
                  <span className="sc-btn-loading">
                    <span className="sc-spinner"></span>
                    Authenticating...
                  </span>
                ) : (
                  <span>🔐 Login</span>
                )}
              </button>

              <div className="sc-login-divider">
                <span>or</span>
              </div>

              <div className="sc-login-footer">
                Don't have an account?{' '}
                <button type="button" className="sc-link-btn" onClick={() => setShowRegister(true)}>
                  Register here
                </button>
              </div>
            </form>
          ) : (
            <div className="sc-wallet-login">
              <div className="sc-wallet-card">
                <div className="sc-wallet-icon-wrapper">
                  <div className="sc-wallet-icon">🔐</div>
                  <div className="sc-wallet-pulse"></div>
                </div>
                <h3>Connect Your Wallet</h3>
                <p>Authenticate securely with your Web3 wallet</p>
                <ul className="sc-wallet-benefits">
                  <li><span className="sc-benefit-check">✓</span> No password required</li>
                  <li><span className="sc-benefit-check">✓</span> Cryptographic security</li>
                  <li><span className="sc-benefit-check">✓</span> Instant verification</li>
                  <li><span className="sc-benefit-check">✓</span> Decentralized identity</li>
                </ul>
              </div>

              {error && <div className="sc-login-error">⚠️ {error}</div>}

              <button className="sc-login-btn sc-wallet-btn" onClick={handleWalletLogin} disabled={loading}>
                {loading ? (
                  <span className="sc-btn-loading">
                    <span className="sc-spinner"></span>
                    Connecting...
                  </span>
                ) : (
                  <span>🔗 Connect Wallet & Sign</span>
                )}
              </button>
            </div>
          )}
        </div>

        <div className="sc-login-security">
          <div className="sc-security-item">
            <span className="sc-security-icon">🔒</span>
            <span>Secured by blockchain authentication</span>
          </div>
          <div className="sc-security-item">
            <span className="sc-security-icon">🛡️</span>
            <span>Enterprise-grade encryption</span>
          </div>
          <div className="sc-security-item">
            <span className="sc-security-icon">📝</span>
            <span>All actions audited on-chain</span>
          </div>
        </div>
      </div>
    </div>
  )
}
