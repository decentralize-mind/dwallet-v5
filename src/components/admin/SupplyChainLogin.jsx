import { useState } from 'react'
import { ethers } from 'ethers'

export default function SupplyChainLogin({ onLoginSuccess }) {
  const [authMethod, setAuthMethod] = useState('email') // 'email' or 'wallet'
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [step, setStep] = useState('login') // 'login', '2fa', 'register', 'forgot'
  const [twoFAData, setTwoFAData] = useState(null)
  const [twoFACode, setTwoFACode] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [message, setMessage] = useState('')

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
    setError('')
  }

  // ─────────────────────────────────────────────────────────────────────
  //  EMAIL/PASSWORD LOGIN
  // ─────────────────────────────────────────────────────────────────────

  const handleEmailLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Login failed')
        return
      }

      // Check if 2FA is required
      if (data.requires2FA) {
        setTwoFAData({
          sessionToken: data.twoFASessionToken,
          method: data.twoFAMethod
        })
        setStep('2fa')
        return
      }

      // Login successful
      localStorage.setItem('auth_token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))
      onLoginSuccess(data.user, data.token)

    } catch (error) {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ─────────────────────────────────────────────────────────────────────
  //  WALLET LOGIN
  // ─────────────────────────────────────────────────────────────────────

  const handleWalletLogin = async () => {
    if (!window.ethereum) {
      setError('Please install MetaMask or another Web3 wallet')
      return
    }

    setLoading(true)
    setError('')

    try {
      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()
      const address = await signer.getAddress()

      const timestamp = Date.now()
      const nonce = Math.random().toString(36).substring(2, 15)
      const message = `Supply Chain Admin Login\n\nAddress: ${address}\nTimestamp: ${timestamp}\nNonce: ${nonce}`

      const signature = await signer.signMessage(message)

      const response = await fetch('/api/wallet-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, signature, message, timestamp, nonce })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Wallet authentication failed')
        return
      }

      localStorage.setItem('auth_token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))
      onLoginSuccess(data.user, data.token)

    } catch (error) {
      setError(error.message || 'Wallet connection failed')
    } finally {
      setLoading(false)
    }
  }

  // ─────────────────────────────────────────────────────────────────────
  //  2FA VERIFICATION
  // ─────────────────────────────────────────────────────────────────────

  const handle2FAVerify = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          code: twoFACode,
          sessionToken: twoFAData.sessionToken
        })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Invalid 2FA code')
        return
      }

      localStorage.setItem('auth_token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))
      onLoginSuccess(data.user, data.token)

    } catch (error) {
      setError('Verification failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ─────────────────────────────────────────────────────────────────────
  //  REGISTRATION
  // ─────────────────────────────────────────────────────────────────────

  const handleRegister = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Registration failed')
        return
      }

      setMessage(data.message)
      setStep('login')

    } catch (error) {
      setError('Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ─────────────────────────────────────────────────────────────────────
  //  FORGOT PASSWORD
  // ─────────────────────────────────────────────────────────────────────

  const handleForgotPassword = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to process request')
        return
      }

      setMessage('Password reset link sent to your email')

    } catch (error) {
      setError('Failed to process request. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ─────────────────────────────────────────────────────────────────────
  //  RENDER LOGIN FORM
  // ─────────────────────────────────────────────────────────────────────

  if (step === '2fa') {
    return (
      <div className="sc-login-container">
        <div className="sc-login-card">
          <h1 className="sc-login-title">🔐 Two-Factor Authentication</h1>
          <p className="sc-login-subtitle">
            Enter the verification code sent to your {twoFAData?.method}
          </p>

          <form onSubmit={handle2FAVerify} className="sc-login-form">
            <div className="sc-form-group">
              <label className="sc-form-label">Verification Code</label>
              <input
                type="text"
                className="sc-form-input sc-2fa-input"
                value={twoFACode}
                onChange={(e) => setTwoFACode(e.target.value)}
                placeholder="Enter 6-digit code"
                maxLength="6"
                required
              />
            </div>

            {error && <div className="sc-alert sc-alert-error">{error}</div>}

            <button
              type="submit"
              className="sc-btn sc-btn-primary sc-btn-full"
              disabled={loading || twoFACode.length !== 6}
            >
              {loading ? 'Verifying...' : 'Verify Code'}
            </button>

            <button
              type="button"
              className="sc-btn sc-btn-secondary sc-btn-full"
              onClick={() => setStep('login')}
            >
              ← Back to Login
            </button>
          </form>
        </div>
      </div>
    )
  }

  if (step === 'register') {
    return (
      <div className="sc-login-container">
        <div className="sc-login-card">
          <h1 className="sc-login-title">📝 Create Admin Account</h1>
          <p className="sc-login-subtitle">Register for supply chain admin access</p>

          <form onSubmit={handleRegister} className="sc-login-form">
            <div className="sc-form-group">
              <label className="sc-form-label">Full Name</label>
              <input
                type="text"
                name="name"
                className="sc-form-input"
                value={formData.name || ''}
                onChange={handleInputChange}
                placeholder="Enter your full name"
                required
              />
            </div>

            <div className="sc-form-group">
              <label className="sc-form-label">Email Address</label>
              <input
                type="email"
                name="email"
                className="sc-form-input"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="Enter your email"
                required
              />
            </div>

            <div className="sc-form-group">
              <label className="sc-form-label">Password</label>
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                className="sc-form-input"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="Min 8 characters"
                minLength="8"
                required
              />
              <button
                type="button"
                className="sc-show-password-btn"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>

            {error && <div className="sc-alert sc-alert-error">{error}</div>}
            {message && <div className="sc-alert sc-alert-success">{message}</div>}

            <button
              type="submit"
              className="sc-btn sc-btn-primary sc-btn-full"
              disabled={loading}
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>

            <button
              type="button"
              className="sc-btn sc-btn-secondary sc-btn-full"
              onClick={() => setStep('login')}
            >
              ← Back to Login
            </button>
          </form>
        </div>
      </div>
    )
  }

  if (step === 'forgot') {
    return (
      <div className="sc-login-container">
        <div className="sc-login-card">
          <h1 className="sc-login-title">🔑 Reset Password</h1>
          <p className="sc-login-subtitle">Enter your email to receive a reset link</p>

          <form onSubmit={handleForgotPassword} className="sc-login-form">
            <div className="sc-form-group">
              <label className="sc-form-label">Email Address</label>
              <input
                type="email"
                name="email"
                className="sc-form-input"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="Enter your email"
                required
              />
            </div>

            {error && <div className="sc-alert sc-alert-error">{error}</div>}
            {message && <div className="sc-alert sc-alert-success">{message}</div>}

            <button
              type="submit"
              className="sc-btn sc-btn-primary sc-btn-full"
              disabled={loading}
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>

            <button
              type="button"
              className="sc-btn sc-btn-secondary sc-btn-full"
              onClick={() => setStep('login')}
            >
              ← Back to Login
            </button>
          </form>
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────
  //  MAIN LOGIN FORM
  // ─────────────────────────────────────────────────────────────────────

  return (
    <div className="sc-login-container">
      <div className="sc-login-card">
        <h1 className="sc-login-title">🏭 Supply Chain Admin</h1>
        <p className="sc-login-subtitle">Sign in to access your dashboard</p>

        {/* Auth Method Tabs */}
        <div className="sc-auth-tabs">
          <button
            className={`sc-auth-tab ${authMethod === 'email' ? 'active' : ''}`}
            onClick={() => setAuthMethod('email')}
          >
            📧 Email
          </button>
          <button
            className={`sc-auth-tab ${authMethod === 'wallet' ? 'active' : ''}`}
            onClick={() => setAuthMethod('wallet')}
          >
            🔗 Wallet
          </button>
        </div>

        {authMethod === 'email' ? (
          <form onSubmit={handleEmailLogin} className="sc-login-form">
            <div className="sc-form-group">
              <label className="sc-form-label">Email Address</label>
              <input
                type="email"
                name="email"
                className="sc-form-input"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="Enter your email"
                required
              />
            </div>

            <div className="sc-form-group">
              <label className="sc-form-label">Password</label>
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                className="sc-form-input"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="Enter your password"
                required
              />
              <button
                type="button"
                className="sc-show-password-btn"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>

            {error && <div className="sc-alert sc-alert-error">{error}</div>}

            <button
              type="submit"
              className="sc-btn sc-btn-primary sc-btn-full"
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>

            <div className="sc-login-links">
              <button
                type="button"
                className="sc-login-link"
                onClick={() => setStep('forgot')}
              >
                Forgot Password?
              </button>
              <span className="sc-login-divider">|</span>
              <button
                type="button"
                className="sc-login-link"
                onClick={() => setStep('register')}
              >
                Create Account
              </button>
            </div>
          </form>
        ) : (
          <div className="sc-wallet-login">
            <p className="sc-wallet-description">
              Connect your Web3 wallet to authenticate securely
            </p>

            {error && <div className="sc-alert sc-alert-error">{error}</div>}

            <button
              onClick={handleWalletLogin}
              className="sc-btn sc-btn-primary sc-btn-full"
              disabled={loading}
            >
              {loading ? 'Connecting...' : '🦊 Connect MetaMask'}
            </button>

            <div className="sc-wallet-info">
              <p>✓ No password required</p>
              <p>✓ Cryptographically secure</p>
              <p>✓ Instant authentication</p>
            </div>
          </div>
        )}

        <div className="sc-login-footer">
          <p>Protected by advanced security</p>
          <div className="sc-security-badges">
            <span>🔒 SSL/TLS</span>
            <span>🛡️ 2FA Ready</span>
            <span>⚡ Real-time Monitoring</span>
          </div>
        </div>
      </div>

      <style jsx>{`
        .sc-login-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 20px;
        }

        .sc-login-card {
          background: white;
          border-radius: 16px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          padding: 40px;
          max-width: 450px;
          width: 100%;
        }

        .sc-login-title {
          font-size: 28px;
          font-weight: 700;
          text-align: center;
          margin-bottom: 8px;
          color: #1a202c;
        }

        .sc-login-subtitle {
          text-align: center;
          color: #718096;
          margin-bottom: 24px;
        }

        .sc-auth-tabs {
          display: flex;
          gap: 12px;
          margin-bottom: 24px;
        }

        .sc-auth-tab {
          flex: 1;
          padding: 12px;
          border: 2px solid #e2e8f0;
          background: white;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.2s;
        }

        .sc-auth-tab.active {
          background: #667eea;
          color: white;
          border-color: #667eea;
        }

        .sc-login-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .sc-form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
          position: relative;
        }

        .sc-form-label {
          font-weight: 600;
          color: #2d3748;
          font-size: 14px;
        }

        .sc-form-input {
          padding: 12px 16px;
          border: 2px solid #e2e8f0;
          border-radius: 8px;
          font-size: 16px;
          transition: all 0.2s;
        }

        .sc-form-input:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        .sc-show-password-btn {
          position: absolute;
          right: 12px;
          top: 38px;
          background: none;
          border: none;
          color: #667eea;
          cursor: pointer;
          font-size: 12px;
          font-weight: 600;
        }

        .sc-2fa-input {
          text-align: center;
          font-size: 24px;
          letter-spacing: 8px;
          font-weight: 700;
        }

        .sc-btn {
          padding: 14px 24px;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
          font-size: 16px;
        }

        .sc-btn-primary {
          background: #667eea;
          color: white;
        }

        .sc-btn-primary:hover:not(:disabled) {
          background: #5568d3;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }

        .sc-btn-secondary {
          background: #e2e8f0;
          color: #2d3748;
        }

        .sc-btn-full {
          width: 100%;
        }

        .sc-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .sc-alert {
          padding: 12px 16px;
          border-radius: 8px;
          font-size: 14px;
        }

        .sc-alert-error {
          background: #fed7d7;
          color: #c53030;
          border: 1px solid #feb2b2;
        }

        .sc-alert-success {
          background: #c6f6d5;
          color: #276749;
          border: 1px solid #9ae6b4;
        }

        .sc-login-links {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 12px;
          font-size: 14px;
        }

        .sc-login-link {
          background: none;
          border: none;
          color: #667eea;
          cursor: pointer;
          font-weight: 600;
        }

        .sc-login-divider {
          color: #cbd5e0;
        }

        .sc-wallet-login {
          text-align: center;
        }

        .sc-wallet-description {
          color: #718096;
          margin-bottom: 24px;
        }

        .sc-wallet-info {
          margin-top: 24px;
          padding: 16px;
          background: #f7fafc;
          border-radius: 8px;
          text-align: left;
        }

        .sc-wallet-info p {
          color: #2d3748;
          font-size: 14px;
          margin: 8px 0;
        }

        .sc-login-footer {
          margin-top: 32px;
          text-align: center;
          color: #718096;
          font-size: 12px;
        }

        .sc-security-badges {
          display: flex;
          justify-content: center;
          gap: 16px;
          margin-top: 12px;
          flex-wrap: wrap;
        }

        .sc-security-badges span {
          background: #f7fafc;
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 11px;
        }
      `}</style>
    </div>
  )
}
