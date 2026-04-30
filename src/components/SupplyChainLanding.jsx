import { useState, useEffect } from 'react'
import '../styles/supply-chain-landing.css'

export default function SupplyChainLanding() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(true)
  }, [])

  const handleGetStarted = () => {
    window.location.href = '/supplychain/portal'
  }

  const handleLearnMore = () => {
    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="sc-landing">
      {/* Animated Background */}
      <div className="sc-landing-bg">
        <div className="bg-grid"></div>
        <div className="bg-gradient"></div>
        <div className="floating-shapes">
          <div className="shape shape-1"></div>
          <div className="shape shape-2"></div>
          <div className="shape shape-3"></div>
          <div className="shape shape-4"></div>
        </div>
      </div>

      {/* Navigation */}
      <nav className={`sc-landing-nav ${isVisible ? 'visible' : ''}`}>
        <div className="nav-container">
          <div className="nav-brand">
            <div className="brand-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <span className="brand-text">TOKLO Supply Chain</span>
          </div>
          <div className="nav-actions">
            <button className="btn-secondary" onClick={handleLearnMore}>
              Learn More
            </button>
            <button className="btn-secondary" onClick={() => window.location.href = '/admin-supplychain-v2'}>
              Admin Dashboard
            </button>
            <button className="btn-primary" onClick={handleGetStarted}>
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className={`sc-hero ${isVisible ? 'visible' : ''}`}>
        <div className="hero-content">
          <div className="hero-badge">
            <span className="badge-icon">⚡</span>
            <span>Blockchain-Powered Enterprise Solution</span>
          </div>
          
          <h1 className="hero-title">
            Next-Generation
            <span className="gradient-text"> Supply Chain</span>
            <br />Management Platform
          </h1>
          
          <p className="hero-subtitle">
            Transform your supply chain with blockchain technology, real-time tracking, 
            smart contracts, and AI-powered analytics. Built for enterprises that demand 
            transparency, security, and efficiency.
          </p>

          <div className="hero-actions">
            <button className="btn-large btn-primary" onClick={handleGetStarted}>
              <span>Start Free Trial</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
            <button className="btn-large btn-outline" onClick={handleLearnMore}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polygon points="10 8 16 12 10 16 10 8" fill="currentColor" />
              </svg>
              <span>Watch Demo</span>
            </button>
          </div>

          <div className="hero-stats">
            <div className="stat-item">
              <div className="stat-value">7</div>
              <div className="stat-label">Smart Contracts</div>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-item">
              <div className="stat-value">100%</div>
              <div className="stat-label">Blockchain Secured</div>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-item">
              <div className="stat-value">24/7</div>
              <div className="stat-label">Real-time Tracking</div>
            </div>
          </div>
        </div>

        {/* Hero Visual */}
        <div className="hero-visual">
          <div className="visual-card">
            <div className="card-header">
              <div className="card-dots">
                <span></span><span></span><span></span>
              </div>
              <span className="card-title">Live Dashboard</span>
            </div>
            <div className="card-content">
              <div className="dashboard-preview">
                <div className="preview-row">
                  <div className="preview-metric">
                    <div className="metric-icon">📦</div>
                    <div className="metric-info">
                      <div className="metric-value">1,247</div>
                      <div className="metric-label">Active Shipments</div>
                    </div>
                  </div>
                  <div className="preview-metric">
                    <div className="metric-icon">💰</div>
                    <div className="metric-info">
                      <div className="metric-value">$2.4M</div>
                      <div className="metric-label">Escrow Value</div>
                    </div>
                  </div>
                </div>
                <div className="preview-chart">
                  <div className="chart-bar" style={{height: '60%'}}></div>
                  <div className="chart-bar" style={{height: '80%'}}></div>
                  <div className="chart-bar" style={{height: '45%'}}></div>
                  <div className="chart-bar" style={{height: '90%'}}></div>
                  <div className="chart-bar" style={{height: '70%'}}></div>
                  <div className="chart-bar" style={{height: '85%'}}></div>
                  <div className="chart-bar" style={{height: '65%'}}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="sc-features">
        <div className="features-header">
          <h2>Powerful Features for Modern Supply Chains</h2>
          <p>Everything you need to manage, track, and optimize your supply chain operations</p>
        </div>

        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon invoice">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
            </div>
            <h3>NFT Invoices</h3>
            <p>Digital invoices as NFTs with immutable records, automatic transfers, and complete audit trails</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon escrow">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
              </svg>
            </div>
            <h3>Smart Escrows</h3>
            <p>Automated milestone-based payments with multi-signature approval and dispute resolution</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon tracking">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
              </svg>
            </div>
            <h3>Product Tracking</h3>
            <p>End-to-end traceability from manufacturer to end customer with real-time status updates</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon iot">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2a10 10 0 1 0 10 10H12V2z" />
                <path d="M12 2a10 10 0 0 1 10 10" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </div>
            <h3>IoT Integration</h3>
            <p>Real-time sensor data from IoT devices with automated alerts and condition monitoring</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon finance">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="1" x2="12" y2="23" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </div>
            <h3>Supply Chain Finance</h3>
            <p>Decentralized lending pools, invoice factoring, and liquidity management for suppliers</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon analytics">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="20" x2="18" y2="10" />
                <line x1="12" y1="20" x2="12" y2="4" />
                <line x1="6" y1="20" x2="6" y2="14" />
              </svg>
            </div>
            <h3>Advanced Analytics</h3>
            <p>AI-powered insights, predictive analytics, and comprehensive KPI dashboards</p>
          </div>
        </div>
      </section>

      {/* Technology Stack */}
      <section className="sc-tech">
        <div className="tech-content">
          <h2>Built with Cutting-Edge Technology</h2>
          <div className="tech-grid">
            <div className="tech-item">
              <div className="tech-logo">⛓️</div>
              <h4>Blockchain</h4>
              <p>Base Sepolia Network</p>
            </div>
            <div className="tech-item">
              <div className="tech-logo">📜</div>
              <h4>Smart Contracts</h4>
              <p>Solidity & Ethers.js</p>
            </div>
            <div className="tech-item">
              <div className="tech-logo">🗄️</div>
              <h4>Database</h4>
              <p>PostgreSQL</p>
            </div>
            <div className="tech-item">
              <div className="tech-logo">⚡</div>
              <h4>Backend</h4>
              <p>Node.js & Express</p>
            </div>
            <div className="tech-item">
              <div className="tech-logo">⚛️</div>
              <h4>Frontend</h4>
              <p>React & Vite</p>
            </div>
            <div className="tech-item">
              <div className="tech-logo">🔐</div>
              <h4>Security</h4>
              <p>Enterprise-Grade</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="sc-cta">
        <div className="cta-content">
          <h2>Ready to Transform Your Supply Chain?</h2>
          <p>Join thousands of enterprises already using TOKLO Supply Chain</p>
          <button className="btn-large btn-primary" onClick={handleGetStarted}>
            <span>Get Started Now</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="sc-landing-footer">
        <div className="footer-content">
          <div className="footer-brand">
            <div className="brand-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <span>TOKLO Supply Chain</span>
          </div>
          <div className="footer-links">
            <a href="#features">Features</a>
            <a href="#">Documentation</a>
            <a href="#">Support</a>
            <a href="#">Privacy</a>
          </div>
          <div className="footer-copyright">
            © 2026 TOKLO. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}
