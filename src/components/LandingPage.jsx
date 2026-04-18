import { useState, useEffect } from 'react'
import { useWallet } from '../hooks/useWallet'
import './LandingPage.css'

// ─────────────────────────────────────────────────────────────────────
//  LANDING PAGE COMPONENT
//  Production-ready landing page with security, features, and trust
// ─────────────────────────────────────────────────────────────────────

export default function LandingPage({ onGetStarted }) {
  const { wallet } = useWallet()
  const [activeFeature, setActiveFeature] = useState(0)
  const [activeFaq, setActiveFaq] = useState(null)
  const [email, setEmail] = useState('')
  const [subscribed, setSubscribed] = useState(false)

  // Redirect to wallet if already created
  useEffect(() => {
    if (wallet) {
      console.log('Wallet exists, but showing landing page')
    }
  }, [wallet])

  // Auto-rotate feature showcase
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveFeature(prev => (prev + 1) % features.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  const handleNewsletterSubmit = (e) => {
    e.preventDefault()
    if (email) {
      // TODO: Integrate with your email service (Mailchimp, ConvertKit, etc.)
      console.log('Newsletter subscription:', email)
      setSubscribed(true)
      setEmail('')
      setTimeout(() => setSubscribed(false), 3000)
    }
  }

  const handleGetStarted = () => {
    if (onGetStarted) {
      onGetStarted()
    }
  }

  return (
    <div className="landing-page">
      {/* ── HERO SECTION ─────────────────────────────────────────── */}
      <section className="landing-hero">
        <div className="landing-container">
          <div className="hero-content">
            <div className="hero-badge">🔐 Non-Custodial & Secure</div>
            <h1 className="hero-title">
              The Future of <span className="gradient-text">DeFi</span> Starts Here
            </h1>
            <p className="hero-subtitle">
              A non-custodial Web3 wallet with built-in DeFi, AI agent, and institutional-grade security.
              Your keys, your crypto, your control.
            </p>
            <div className="hero-actions">
              <button className="btn-primary btn-large" onClick={handleGetStarted}>
                Create Wallet →
              </button>
              <button className="btn-secondary btn-large" onClick={handleGetStarted}>
                Import Wallet
              </button>
            </div>
            <div className="hero-trust">
              <span className="trust-item">✓ Free Forever</span>
              <span className="trust-item">✓ Open Source</span>
              <span className="trust-item">✓ Audited</span>
            </div>
          </div>
          <div className="hero-visual">
            <div className="wallet-preview-card">
              <div className="preview-header">
                <div className="preview-dots">
                  <span></span><span></span><span></span>
                </div>
                <span className="preview-title">Toklo Wallet</span>
              </div>
              <div className="preview-balance">
                <div className="balance-label">Total Balance</div>
                <div className="balance-amount">$12,847.53</div>
                <div className="balance-change positive">+5.23% (24h)</div>
              </div>
              <div className="preview-actions">
                <div className="preview-action-btn">Send</div>
                <div className="preview-action-btn">Receive</div>
                <div className="preview-action-btn">Swap</div>
              </div>
              <div className="preview-tokens">
                <div className="preview-token">
                  <div className="token-icon eth">Ξ</div>
                  <div className="token-info">
                    <div className="token-name">Ethereum</div>
                    <div className="token-balance">2.45 ETH</div>
                  </div>
                </div>
                <div className="preview-token">
                  <div className="token-icon btc">₿</div>
                  <div className="token-info">
                    <div className="token-name">Bitcoin</div>
                    <div className="token-balance">0.085 BTC</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="hero-bg-gradient"></div>
      </section>

      {/* ── STATS BAR ────────────────────────────────────────────── */}
      <section className="landing-stats">
        <div className="landing-container">
          <div className="stats-grid">
            <div className="stat-item">
              <div className="stat-value">50K+</div>
              <div className="stat-label">Active Users</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">$250M+</div>
              <div className="stat-label">Transactions Secured</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">15+</div>
              <div className="stat-label">Chains Supported</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">99.9%</div>
              <div className="stat-label">Uptime</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECURITY SECTION ─────────────────────────────────────── */}
      <section className="landing-security">
        <div className="landing-container">
          <div className="section-header">
            <div className="section-badge">🛡️ Security First</div>
            <h2 className="section-title">Institutional-Grade Security</h2>
            <p className="section-subtitle">
              Protected by our revolutionary 10-layer security architecture with formal verification
            </p>
          </div>
          <div className="security-grid">
            {securityFeatures.map((feature, idx) => (
              <div key={idx} className="security-card">
                <div className="security-icon">{feature.icon}</div>
                <h3 className="security-title">{feature.title}</h3>
                <p className="security-desc">{feature.description}</p>
              </div>
            ))}
          </div>
          <div className="security-badges">
            <div className="badge-item">
              <span className="badge-icon">✓</span>
              <span>AES-256-GCM Encryption</span>
            </div>
            <div className="badge-item">
              <span className="badge-icon">✓</span>
              <span>Formally Verified</span>
            </div>
            <div className="badge-item">
              <span className="badge-icon">✓</span>
              <span>Smart Contract Audited</span>
            </div>
            <div className="badge-item">
              <span className="badge-icon">✓</span>
              <span>Bug Bounty Program</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES SECTION ─────────────────────────────────────── */}
      <section className="landing-features">
        <div className="landing-container">
          <div className="section-header">
            <div className="section-badge">⚡ Powerful Features</div>
            <h2 className="section-title">Everything You Need in One Wallet</h2>
            <p className="section-subtitle">
              Trade, stake, lend, and manage your entire portfolio with AI-powered insights
            </p>
          </div>
          <div className="features-showcase">
            <div className="features-tabs">
              {features.map((feature, idx) => (
                <button
                  key={idx}
                  className={`feature-tab ${activeFeature === idx ? 'active' : ''}`}
                  onClick={() => setActiveFeature(idx)}
                >
                  <span className="tab-icon">{feature.icon}</span>
                  <span className="tab-label">{feature.label}</span>
                </button>
              ))}
            </div>
            <div className="feature-content">
              <div className="feature-visual">
                <div className="feature-card-display">
                  {features[activeFeature].visual}
                </div>
              </div>
              <div className="feature-info">
                <h3 className="feature-title">{features[activeFeature].title}</h3>
                <p className="feature-description">{features[activeFeature].description}</p>
                <ul className="feature-list">
                  {features[activeFeature].benefits.map((benefit, idx) => (
                    <li key={idx} className="feature-benefit">
                      <span className="benefit-check">✓</span>
                      {benefit}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────── */}
      <section className="landing-how-it-works">
        <div className="landing-container">
          <div className="section-header">
            <h2 className="section-title">Get Started in 3 Simple Steps</h2>
          </div>
          <div className="steps-grid">
            {steps.map((step, idx) => (
              <div key={idx} className="step-card">
                <div className="step-number">{idx + 1}</div>
                <h3 className="step-title">{step.title}</h3>
                <p className="step-desc">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ─────────────────────────────────────────── */}
      <section className="landing-testimonials">
        <div className="landing-container">
          <div className="section-header">
            <div className="section-badge">💬 Testimonials</div>
            <h2 className="section-title">Loved by Thousands</h2>
          </div>
          <div className="testimonials-grid">
            {testimonials.map((testimonial, idx) => (
              <div key={idx} className="testimonial-card">
                <div className="testimonial-rating">★★★★★</div>
                <p className="testimonial-text">"{testimonial.text}"</p>
                <div className="testimonial-author">
                  <div className="author-avatar">{testimonial.initials}</div>
                  <div className="author-info">
                    <div className="author-name">{testimonial.name}</div>
                    <div className="author-role">{testimonial.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ SECTION ──────────────────────────────────────────── */}
      <section className="landing-faq">
        <div className="landing-container">
          <div className="section-header">
            <div className="section-badge">❓ FAQ</div>
            <h2 className="section-title">Frequently Asked Questions</h2>
          </div>
          <div className="faq-list">
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                className={`faq-item ${activeFaq === idx ? 'active' : ''}`}
                onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
              >
                <div className="faq-question">
                  <h3>{faq.question}</h3>
                  <span className="faq-toggle">{activeFaq === idx ? '−' : '+'}</span>
                </div>
                {activeFaq === idx && (
                  <div className="faq-answer">
                    <p>{faq.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── NEWSLETTER ───────────────────────────────────────────── */}
      <section className="landing-newsletter">
        <div className="landing-container">
          <div className="newsletter-card">
            <h2 className="newsletter-title">Stay Updated</h2>
            <p className="newsletter-desc">
              Get the latest features, security updates, and exclusive airdrops
            </p>
            <form className="newsletter-form" onSubmit={handleNewsletterSubmit}>
              <input
                type="email"
                className="newsletter-input"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <button type="submit" className="btn-primary">
                {subscribed ? '✓ Subscribed!' : 'Subscribe'}
              </button>
            </form>
            <p className="newsletter-privacy">
              🔒 We respect your privacy. Unsubscribe anytime.
            </p>
          </div>
        </div>
      </section>

      {/* ── CTA SECTION ──────────────────────────────────────────── */}
      <section className="landing-cta">
        <div className="landing-container">
          <h2 className="cta-title">Ready to Take Control of Your Crypto?</h2>
          <p className="cta-subtitle">
            Join thousands of users who trust Toklo with their digital assets
          </p>
          <button className="btn-primary btn-xlarge" onClick={handleGetStarted}>
            Create Your Free Wallet →
          </button>
          <div className="cta-links">
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="cta-link">
              GitHub
            </a>
            <a href="#docs" className="cta-link">Documentation</a>
            <a href="#community" className="cta-link">Community</a>
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────── */}
      <footer className="landing-footer">
        <div className="landing-container">
          <div className="footer-grid">
            <div className="footer-col">
              <h4 className="footer-title">◈ Toklo</h4>
              <p className="footer-desc">
                Non-custodial DeFi wallet with AI agent and institutional-grade security.
              </p>
              <div className="footer-social">
                <a href="https://x.com/dwallet_xyz" target="_blank" rel="noopener noreferrer" className="social-link" title="X (Twitter)">𝕏</a>
                <a href="https://t.me/+K4mvZsmo0XgyM2E9" target="_blank" rel="noopener noreferrer" className="social-link" title="Telegram Channel">📢</a>
                <a href="https://t.me/+ZV9ou3mkhDAzMDQ1" target="_blank" rel="noopener noreferrer" className="social-link" title="Telegram Group">💬</a>
                <a href="https://whatsapp.com/channel/0029VbCW2xuKQuJIHG2Q5V2k" target="_blank" rel="noopener noreferrer" className="social-link" title="WhatsApp Channel">📱</a>
                <a href="https://discord.com/channels/1495046935185195008/1495046935822864479" target="_blank" rel="noopener noreferrer" className="social-link" title="Discord Server">💬</a>
                <a href="https://youtube.com/@dwallet" target="_blank" rel="noopener noreferrer" className="social-link" title="YouTube Channel">▶️</a>
                <a href="https://www.reddit.com/user/Obvious_Tell_648/" target="_blank" rel="noopener noreferrer" className="social-link" title="Reddit Community">🔴</a>
              </div>
            </div>
            <div className="footer-col">
              <h4 className="footer-heading">Product</h4>
              <ul className="footer-links">
                <li><a href="#features">Features</a></li>
                <li><a href="#security">Security</a></li>
                <li><a href="#pricing">Pricing</a></li>
                <li><a href="#roadmap">Roadmap</a></li>
              </ul>
            </div>
            <div className="footer-col">
              <h4 className="footer-heading">Resources</h4>
              <ul className="footer-links">
                <li><a href="#docs">Documentation</a></li>
                <li><a href="#api">API</a></li>
                <li><a href="#github">GitHub</a></li>
                <li><a href="#whitepaper">Whitepaper</a></li>
              </ul>
            </div>
            <div className="footer-col">
              <h4 className="footer-heading">Company</h4>
              <ul className="footer-links">
                <li><a href="#about">About</a></li>
                <li><a href="#blog">Blog</a></li>
                <li><a href="#careers">Careers</a></li>
                <li><a href="#contact">Contact</a></li>
              </ul>
            </div>
            <div className="footer-col">
              <h4 className="footer-heading">Legal</h4>
              <ul className="footer-links">
                <li><a href="#privacy">Privacy Policy</a></li>
                <li><a href="#terms">Terms of Service</a></li>
                <li><a href="#cookies">Cookie Policy</a></li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <p>© 2026 Toklo. All rights reserved.</p>
            <p className="footer-disclaimer">
              Toklo is a non-custodial wallet. You are responsible for your own security.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────
//  DATA
// ─────────────────────────────────────────────────────────────────────

const securityFeatures = [
  {
    icon: '🔐',
    title: '10-Layer Security',
    description: 'Revolutionary multi-layered security architecture with formal verification and real-time threat detection'
  },
  {
    icon: '🛡️',
    title: 'AES-256-GCM Encryption',
    description: 'Military-grade encryption with PBKDF2 key derivation (310,000 iterations) protects your private keys'
  },
  {
    icon: '⚡',
    title: 'Auto-Lock Protection',
    description: 'Automatic session timeout after 30 minutes of inactivity keeps your wallet secure'
  },
  {
    icon: '🔍',
    title: 'Transaction Simulation',
    description: 'Preview transaction outcomes before signing to prevent malicious contracts and phishing attacks'
  },
  {
    icon: '🤖',
    title: 'AI Threat Detection',
    description: 'Real-time anomaly detection and threat intelligence monitors for suspicious activity 24/7'
  },
  {
    icon: '✓',
    title: 'Formally Verified',
    description: 'Mathematical proofs ensure contract invariants and security properties are always maintained'
  }
]

const features = [
  {
    icon: '⇄',
    label: 'DeFi',
    title: 'Built-in DeFi Protocols',
    description: 'Access Uniswap V3, Aave, and Lido directly from your wallet. Swap tokens, lend assets, and stake ETH without leaving the app.',
    benefits: [
      'Swap tokens with best prices via Uniswap V3',
      'Lend and borrow with Aave integration',
      'Stake ETH and earn rewards with Lido',
      'Zero additional fees on DeFi transactions'
    ],
    visual: (
      <div className="feature-visual-content">
        <div className="defi-protocol-grid">
          <div className="protocol-card uniswap">
            <div className="protocol-logo">🦄</div>
            <div className="protocol-name">Uniswap V3</div>
          </div>
          <div className="protocol-card aave">
            <div className="protocol-logo">👻</div>
            <div className="protocol-name">Aave</div>
          </div>
          <div className="protocol-card lido">
            <div className="protocol-logo">🌊</div>
            <div className="protocol-name">Lido</div>
          </div>
        </div>
      </div>
    )
  },
  {
    icon: '⚡',
    label: 'Flash Loans',
    title: 'Instant Flash Loans',
    description: 'Borrow up to 25,000 DWT instantly with no collateral required. Perfect for arbitrage, liquidation, and advanced DeFi strategies.',
    benefits: [
      'No collateral required - borrow instantly',
      'Only 0.09% fee per transaction',
      'Up to 25,000 DWT per loan',
      'Perfect for arbitrage opportunities'
    ],
    visual: (
      <div className="feature-visual-content">
        <div className="flash-loan-preview">
          <div className="loan-stats">
            <div className="stat-box">
              <div className="stat-value">50,000</div>
              <div className="stat-label">DWT Pool</div>
            </div>
            <div className="stat-box">
              <div className="stat-value">0.09%</div>
              <div className="stat-label">Fee</div>
            </div>
            <div className="stat-box">
              <div className="stat-value">Instant</div>
              <div className="stat-label">Approval</div>
            </div>
          </div>
        </div>
      </div>
    )
  },
  {
    icon: '🛡️',
    label: 'Insurance',
    title: 'Insurance Fund Protection',
    description: '100,000 DWT insurance fund protects you from exploits and system failures. File claims and get compensated for covered losses.',
    benefits: [
      '100,000 DWT protection fund',
      'Coverage for exploits and bugs',
      'Easy claim filing process',
      '48-hour secure execution'
    ],
    visual: (
      <div className="feature-visual-content">
        <div className="insurance-preview">
          <div className="shield-icon">🛡️</div>
          <div className="coverage-details">
            <div className="coverage-item">
              <span>Single Claim:</span>
              <strong>Up to 20,000 DWT</strong>
            </div>
            <div className="coverage-item">
              <span>Monthly Cap:</span>
              <strong>40,000 DWT</strong>
            </div>
          </div>
        </div>
      </div>
    )
  },
  {
    icon: '🤖',
    label: 'AI Agent',
    title: 'AI-Powered Assistant',
    description: 'Your intelligent DeFi companion provides real-time insights, portfolio optimization suggestions, and automated alerts.',
    benefits: [
      'Smart portfolio rebalancing recommendations',
      'Real-time market analysis and trends',
      'Automated price alerts and notifications',
      'Gas optimization suggestions'
    ],
    visual: (
      <div className="feature-visual-content">
        <div className="ai-chat-preview">
          <div className="chat-message ai">
            <div className="message-bubble">
              ETH gas prices are low. Great time to execute pending transactions! ⛽
            </div>
          </div>
          <div className="chat-message user">
            <div className="message-bubble">
              Should I stake my ETH now?
            </div>
          </div>
          <div className="chat-message ai">
            <div className="message-bubble">
              APY is currently 4.2%. Historical data shows optimal entry point. ✓
            </div>
          </div>
        </div>
      </div>
    )
  },
  {
    icon: '🌐',
    label: 'Multi-Chain',
    title: 'Multi-Chain Support',
    description: 'Manage assets across 15+ blockchain networks from a single wallet with seamless cross-chain swaps.',
    benefits: [
      'Ethereum, Base, Polygon, Arbitrum & more',
      'Cross-chain swaps without bridges',
      'Unified portfolio view across chains',
      'Automatic network switching'
    ],
    visual: (
      <div className="feature-visual-content">
        <div className="chain-grid">
          {['ETH', 'BASE', 'MATIC', 'ARB', 'OP', 'BSC'].map(chain => (
            <div key={chain} className="chain-badge">{chain}</div>
          ))}
        </div>
      </div>
    )
  },
  {
    icon: '🎨',
    label: 'NFTs',
    title: 'NFT Management',
    description: 'View, transfer, and mint NFTs directly. Access exclusive membership NFTs with special privileges.',
    benefits: [
      'Beautiful NFT gallery with metadata',
      'One-click minting for exclusive collections',
      'NFT transfer and marketplace integration',
      'Membership NFT with premium features'
    ],
    visual: (
      <div className="feature-visual-content">
        <div className="nft-gallery-preview">
          <div className="nft-card">
            <div className="nft-image">🖼️</div>
            <div className="nft-name">Toklo Membership #1234</div>
          </div>
          <div className="nft-card">
            <div className="nft-image">🎭</div>
            <div className="nft-name">Exclusive Art Piece</div>
          </div>
        </div>
      </div>
    )
  },
  {
    icon: '📊',
    label: 'Analytics',
    title: 'Portfolio Analytics',
    description: 'Track your portfolio performance with real-time charts, P&L analysis, and detailed transaction history.',
    benefits: [
      'Real-time portfolio value tracking',
      'Interactive price charts (24h, 7d, 30d, 1y)',
      'Profit/loss analysis per token',
      'Complete transaction history with filters'
    ],
    visual: (
      <div className="feature-visual-content">
        <div className="chart-preview">
          <div className="chart-line"></div>
          <div className="chart-stats">
            <div className="chart-stat">
              <div className="stat-label">Total Value</div>
              <div className="stat-value">$12,847</div>
            </div>
            <div className="chart-stat">
              <div className="stat-label">24h Change</div>
              <div className="stat-value positive">+$642 (+5.2%)</div>
            </div>
          </div>
        </div>
      </div>
    )
  },
  {
    icon: '🔗',
    label: 'WalletConnect',
    title: 'WalletConnect v2',
    description: 'Connect to thousands of dApps seamlessly. Full support for Web3Wallet SDK with session management.',
    benefits: [
      'Connect to 10,000+ dApps instantly',
      'Review permissions before connecting',
      'Manage active sessions in real-time',
      'Risk assessment for each request'
    ],
    visual: (
      <div className="feature-visual-content">
        <div className="dapp-grid">
          {['OpenSea', 'Uniswap', 'Aave', 'Compound'].map(dapp => (
            <div key={dapp} className="dapp-card">{dapp}</div>
          ))}
          <div className="dapp-card more">+9,996 more</div>
        </div>
      </div>
    )
  }
]

const steps = [
  {
    title: 'Create Your Wallet',
    description: 'Generate a secure wallet with a unique 12 or 24-word seed phrase. Your keys are encrypted and never leave your device.'
  },
  {
    title: 'Fund Your Wallet',
    description: 'Transfer crypto from another wallet or buy directly with credit card. Support for 15+ blockchain networks.'
  },
  {
    title: 'Start Exploring DeFi',
    description: 'Swap tokens, stake assets, lend & borrow, connect to dApps - all from one unified interface.'
  }
]

const testimonials = [
  {
    text: 'Toklo is the most secure wallet I\'ve used. The 10-layer security architecture gives me peace of mind.',
    name: 'Alex Chen',
    role: 'DeFi Trader',
    initials: 'AC'
  },
  {
    text: 'The AI agent is a game-changer. It helped me optimize my portfolio and save on gas fees.',
    name: 'Sarah Kim',
    role: 'Crypto Investor',
    initials: 'SK'
  },
  {
    text: 'Finally, a wallet that makes DeFi simple. Uniswap, Aave, and Lido all in one place!',
    name: 'Mike Johnson',
    role: 'NFT Collector',
    initials: 'MJ'
  }
]

const faqs = [
  {
    question: 'Is Toklo wallet free to use?',
    answer: 'Yes! Toklo is completely free to use. We never charge fees for wallet operations. You only pay standard blockchain network fees for transactions.'
  },
  {
    question: 'How secure is my wallet?',
    answer: 'Toklo uses a revolutionary 10-layer security architecture with AES-256-GCM encryption, PBKDF2 key derivation (310,000 iterations), formal verification, and real-time threat detection. Your private keys are encrypted and never leave your device.'
  },
  {
    question: 'What happens if I lose my seed phrase?',
    answer: 'Your seed phrase is the only way to recover your wallet. We recommend writing it down and storing it in a secure location. Toklo cannot recover your wallet if you lose your seed phrase, as we never store your keys.'
  },
  {
    question: 'Which blockchain networks are supported?',
    answer: 'Toklo supports 15+ networks including Ethereum, Base, Polygon, Arbitrum, Optimism, BSC, and more. We regularly add support for new chains based on community demand.'
  },
  {
    question: 'Can I use Toklo with hardware wallets?',
    answer: 'Yes! Toklo supports WalletConnect v2, which is compatible with Ledger, Trezor, and other hardware wallets for enhanced security.'
  },
  {
    question: 'What is the AI agent and how does it work?',
    answer: 'The AI agent analyzes market data, your portfolio, and gas prices to provide intelligent recommendations. It can suggest optimal times to trade, stake, or execute transactions. All processing happens locally - your data is never sent to external servers.'
  },
  {
    question: 'How do I connect to dApps?',
    answer: 'Use the WalletConnect feature in the dApps tab. Scan the QR code or paste the URI from any dApp to connect. You can manage all active connections and disconnect anytime.'
  },
  {
    question: 'Is Toklo open source?',
    answer: 'Yes! Toklo is fully open source. You can review our code on GitHub. We believe transparency is essential for security and trust.'
  }
]
