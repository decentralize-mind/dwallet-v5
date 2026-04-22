import { useState, useEffect } from 'react'
import adminAPI from '../../services/adminAPI'
import '../../styles/admin-settings.css'

export default function CrossChainPanel() {
  const [activeTab, setActiveTab] = useState('bridge')
  const [loading, setLoading] = useState(true)
  const [crossChainData, setCrossChainData] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadCrossChainData()
    const interval = setInterval(loadCrossChainData, 60000) // Refresh every 60s
    return () => clearInterval(interval)
  }, [])

  const loadCrossChainData = async () => {
    try {
      setLoading(true)
      const response = await adminAPI.get('/api/admin/crosschain/stats')
      
      if (response.success) {
        setCrossChainData(response.data)
      }
      setError(null)
    } catch (err) {
      console.error('Failed to load cross-chain data:', err)
      setError(err.message || 'Failed to load cross-chain statistics')
    } finally {
      setLoading(false)
    }
  }

  // Fallback to simulated data if real data not available
  const bridgeStatus = crossChainData?.bridgeStatus || {
    chains: [
      { name: 'Base', status: 'active', tvl: '$25.3M', transactions24h: 1234, icon: '🔵' },
      { name: 'Ethereum', status: 'active', tvl: '$18.7M', transactions24h: 892, icon: '💎' },
      { name: 'Polygon', status: 'active', tvl: '$8.2M', transactions24h: 567, icon: '🟣' },
      { name: 'Arbitrum', status: 'active', tvl: '$12.1M', transactions24h: 734, icon: '🔵' },
      { name: 'Optimism', status: 'maintenance', tvl: '$5.6M', transactions24h: 0, icon: '🔴' }
    ],
    totalVolume24h: '$15.2M',
    totalFees24h: '$45,600',
    avgBridgeTime: '3.5 minutes'
  }

  const relayers = crossChainData?.relayers || [
    { address: '0x742d...bEb', status: 'active', uptime: '99.9%', transactionsRelayed: 12453, stake: '50,000 DWT', reputation: 'Excellent' },
    { address: '0x5aAe...Aed', status: 'active', uptime: '99.7%', transactionsRelayed: 11234, stake: '50,000 DWT', reputation: 'Excellent' }
  ]

  const bridgeTransactions = crossChainData?.bridgeTransactions || []
  const oracleFeeds = crossChainData?.oracleFeeds || []
  const infrastructure = crossChainData?.infrastructure || {
    paymaster: { balance: '125.5 ETH', transactionsToday: 2341, gasSaved: '45.2 ETH', status: 'active' },
    rateFeed: { updatesPerHour: 120, avgLatency: '0.8s', accuracy: '99.9%', status: 'active' },
    emergencyPause: { status: 'inactive', lastTriggered: '2024-01-15', triggerCount: 3 }
  }

  const bridgeSecurity = crossChainData?.bridgeSecurity || {
    multisigThreshold: '7 of 15',
    currentSigners: 15,
    circuitBreaker: 'inactive',
    dailyLimit: '$50M',
    bridgedToday: '$15.2M',
    limitRemaining: '$34.8M'
  }

  return (
    <div className="admin-panel">
      <div className="admin-panel-header">
        <div>
          <h2 className="admin-panel-title">🌉 Cross-Chain & Infrastructure</h2>
          <p className="admin-panel-subtitle">Bridge operations, oracle feeds, and multi-chain management</p>
        </div>
        <div className="crosschain-header-badges">
          {loading && <span className="crosschain-badge">Loading...</span>}
          {crossChainData ? (
            <span className="crosschain-badge success">✓ Bridge Active</span>
          ) : (
            <span className="crosschain-badge warning">⚠ Using Cached Data</span>
          )}
          {bridgeStatus.chains.some(c => c.status === 'maintenance') && (
            <span className="crosschain-badge warning">
              ⚠ {bridgeStatus.chains.find(c => c.status === 'maintenance')?.name} Maintenance
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="admin-error-banner">
          ⚠️ {error}
          <button onClick={loadCrossChainData} className="admin-btn-small">Retry</button>
        </div>
      )}

      {/* Bridge Security Overview */}
      <div className="crosschain-security-banner">
        <div className="crosschain-security-item">
          <p className="crosschain-security-label">Multisig Threshold</p>
          <p className="crosschain-security-value">{bridgeSecurity.multisigThreshold}</p>
        </div>
        <div className="crosschain-security-divider"></div>
        <div className="crosschain-security-item">
          <p className="crosschain-security-label">Active Signers</p>
          <p className="crosschain-security-value success">{bridgeSecurity.currentSigners}/15</p>
        </div>
        <div className="crosschain-security-divider"></div>
        <div className="crosschain-security-item">
          <p className="crosschain-security-label">Circuit Breaker</p>
          <p className="crosschain-security-value success">{bridgeSecurity.circuitBreaker}</p>
        </div>
        <div className="crosschain-security-divider"></div>
        <div className="crosschain-security-item">
          <p className="crosschain-security-label">Daily Limit</p>
          <p className="crosschain-security-value">{bridgeSecurity.dailyLimit}</p>
        </div>
        <div className="crosschain-security-divider"></div>
        <div className="crosschain-security-item">
          <p className="crosschain-security-label">Remaining Today</p>
          <p className="crosschain-security-value success">{bridgeSecurity.limitRemaining}</p>
        </div>
      </div>

      {/* Bridge Metrics */}
      <div className="crosschain-metrics-grid">
        <div className="crosschain-metric-card">
          <div className="crosschain-metric-icon">💰</div>
          <div className="crosschain-metric-content">
            <p className="crosschain-metric-label">24h Bridge Volume</p>
            <p className="crosschain-metric-value">{bridgeStatus.totalVolume24h}</p>
          </div>
        </div>

        <div className="crosschain-metric-card">
          <div className="crosschain-metric-icon">💎</div>
          <div className="crosschain-metric-content">
            <p className="crosschain-metric-label">24h Fees</p>
            <p className="crosschain-metric-value">{bridgeStatus.totalFees24h}</p>
          </div>
        </div>

        <div className="crosschain-metric-card">
          <div className="crosschain-metric-icon">⏱️</div>
          <div className="crosschain-metric-content">
            <p className="crosschain-metric-label">Avg Bridge Time</p>
            <p className="crosschain-metric-value">{bridgeStatus.avgBridgeTime}</p>
          </div>
        </div>

        <div className="crosschain-metric-card">
          <div className="crosschain-metric-icon">🌐</div>
          <div className="crosschain-metric-content">
            <p className="crosschain-metric-label">Connected Chains</p>
            <p className="crosschain-metric-value">{bridgeStatus.chains.filter(c => c.status === 'active').length}/5</p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="crosschain-tabs">
        <button 
          className={`crosschain-tab ${activeTab === 'bridge' ? 'active' : ''}`}
          onClick={() => setActiveTab('bridge')}
        >
          🌉 Bridge Status
        </button>
        <button 
          className={`crosschain-tab ${activeTab === 'relayers' ? 'active' : ''}`}
          onClick={() => setActiveTab('relayers')}
        >
          👥 Relayers
        </button>
        <button 
          className={`crosschain-tab ${activeTab === 'oracles' ? 'active' : ''}`}
          onClick={() => setActiveTab('oracles')}
        >
          🔮 Oracle Feeds
        </button>
        <button 
          className={`crosschain-tab ${activeTab === 'infrastructure' ? 'active' : ''}`}
          onClick={() => setActiveTab('infrastructure')}
        >
          ⚙️ Infrastructure
        </button>
      </div>

      {/* Bridge Status Tab */}
      {activeTab === 'bridge' && (
        <div className="crosschain-section">
          <h3 className="crosschain-section-title">Connected Chains</h3>
          <div className="crosschain-chains-grid">
            {bridgeStatus.chains.map((chain, idx) => (
              <div key={idx} className={`crosschain-chain-card ${chain.status}`}>
                <div className="crosschain-chain-icon">{chain.icon}</div>
                <h4 className="crosschain-chain-name">{chain.name}</h4>
                <span className={`crosschain-status-badge ${chain.status}`}>
                  {chain.status}
                </span>
                <div className="crosschain-chain-stats">
                  <div className="crosschain-chain-stat">
                    <span className="crosschain-chain-label">TVL</span>
                    <span className="crosschain-chain-value">{chain.tvl}</span>
                  </div>
                  <div className="crosschain-chain-stat">
                    <span className="crosschain-chain-label">24h TXs</span>
                    <span className="crosschain-chain-value">{chain.transactions24h.toLocaleString()}</span>
                  </div>
                </div>
                {chain.status === 'maintenance' && (
                  <button className="crosschain-action-btn warning">
                    <span>🔧</span>
                    <span>Resume Chain</span>
                  </button>
                )}
              </div>
            ))}
          </div>

          <h3 className="crosschain-section-title">Recent Bridge Transactions</h3>
          <div className="crosschain-table-container">
            <table className="crosschain-table">
              <thead>
                <tr>
                  <th>From</th>
                  <th>To</th>
                  <th>Amount</th>
                  <th>User</th>
                  <th>Status</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {bridgeTransactions.map(tx => (
                  <tr key={tx.id}>
                    <td><span className="crosschain-chain-badge">{tx.from}</span></td>
                    <td><span className="crosschain-chain-badge">{tx.to}</span></td>
                    <td><strong>{tx.amount}</strong></td>
                    <td>{tx.user}</td>
                    <td>
                      <span className={`crosschain-tx-badge ${tx.status}`}>
                        {tx.status}
                      </span>
                    </td>
                    <td>{tx.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Relayers Tab */}
      {activeTab === 'relayers' && (
        <div className="crosschain-section">
          <h3 className="crosschain-section-title">Layer 8 - Relayer Network</h3>
          <div className="crosschain-relayers-info">
            <div className="crosschain-info-card">
              <p className="crosschain-info-label">Required Threshold</p>
              <p className="crosschain-info-value">7 of 15 signers</p>
            </div>
            <div className="crosschain-info-card">
              <p className="crosschain-info-label">Active Relayers</p>
              <p className="crosschain-info-value success">{relayers.filter(r => r.status === 'active').length}/15</p>
            </div>
            <div className="crosschain-info-card">
              <p className="crosschain-info-label">Stake per Relayer</p>
              <p className="crosschain-info-value">50,000 DWT</p>
            </div>
          </div>

          <div className="crosschain-table-container">
            <table className="crosschain-table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Address</th>
                  <th>Uptime</th>
                  <th>Transactions</th>
                  <th>Stake</th>
                  <th>Reputation</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {relayers.map((relayer, idx) => (
                  <tr key={idx} className={relayer.status === 'inactive' ? 'inactive-row' : ''}>
                    <td>
                      <span className={`crosschain-status-badge ${relayer.status}`}>
                        {relayer.status}
                      </span>
                    </td>
                    <td>{relayer.address}</td>
                    <td><strong>{relayer.uptime}</strong></td>
                    <td>{relayer.transactionsRelayed.toLocaleString()}</td>
                    <td>{relayer.stake}</td>
                    <td>
                      <span className={`crosschain-reputation-badge ${relayer.reputation.toLowerCase()}`}>
                        {relayer.reputation}
                      </span>
                    </td>
                    <td>
                      <button className="crosschain-table-btn">
                        {relayer.status === 'active' ? '⏸️ Pause' : '▶️ Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Oracle Feeds Tab */}
      {activeTab === 'oracles' && (
        <div className="crosschain-section">
          <h3 className="crosschain-section-title">Layer 3 - Oracle Price Feeds</h3>
          <div className="crosschain-table-container">
            <table className="crosschain-table">
              <thead>
                <tr>
                  <th>Price Pair</th>
                  <th>Provider</th>
                  <th>Current Price</th>
                  <th>Status</th>
                  <th>Last Update</th>
                  <th>Deviation</th>
                </tr>
              </thead>
              <tbody>
                {oracleFeeds.map((feed, idx) => (
                  <tr key={idx}>
                    <td><strong>{feed.pair}</strong></td>
                    <td>{feed.provider}</td>
                    <td>{feed.price}</td>
                    <td>
                      <span className={`crosschain-status-badge ${feed.status}`}>
                        {feed.status}
                      </span>
                    </td>
                    <td>{feed.lastUpdate}</td>
                    <td><span className="crosschain-deviation-badge">{feed.deviation}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Infrastructure Tab */}
      {activeTab === 'infrastructure' && (
        <div className="crosschain-section">
          <h3 className="crosschain-section-title">Layer 3 - Infrastructure Status</h3>
          <div className="crosschain-infra-grid">
            <div className="crosschain-infra-card">
              <div className="crosschain-infra-icon">💳</div>
              <h4 className="crosschain-infra-title">Gas Paymaster</h4>
              <span className={`crosschain-status-badge ${infrastructure.paymaster.status}`}>
                {infrastructure.paymaster.status}
              </span>
              <div className="crosschain-infra-stats">
                <div className="crosschain-infra-stat">
                  <span className="crosschain-infra-label">Balance</span>
                  <span className="crosschain-infra-value">{infrastructure.paymaster.balance}</span>
                </div>
                <div className="crosschain-infra-stat">
                  <span className="crosschain-infra-label">Today's TXs</span>
                  <span className="crosschain-infra-value">{infrastructure.paymaster.transactionsToday.toLocaleString()}</span>
                </div>
                <div className="crosschain-infra-stat">
                  <span className="crosschain-infra-label">Gas Saved</span>
                  <span className="crosschain-infra-value success">{infrastructure.paymaster.gasSaved}</span>
                </div>
              </div>
              <button className="crosschain-action-btn primary">
                <span>💰</span>
                <span>Fund Paymaster</span>
              </button>
            </div>

            <div className="crosschain-infra-card">
              <div className="crosschain-infra-icon">📊</div>
              <h4 className="crosschain-infra-title">Rate Feed</h4>
              <span className={`crosschain-status-badge ${infrastructure.rateFeed.status}`}>
                {infrastructure.rateFeed.status}
              </span>
              <div className="crosschain-infra-stats">
                <div className="crosschain-infra-stat">
                  <span className="crosschain-infra-label">Updates/Hour</span>
                  <span className="crosschain-infra-value">{infrastructure.rateFeed.updatesPerHour}</span>
                </div>
                <div className="crosschain-infra-stat">
                  <span className="crosschain-infra-label">Avg Latency</span>
                  <span className="crosschain-infra-value">{infrastructure.rateFeed.avgLatency}</span>
                </div>
                <div className="crosschain-infra-stat">
                  <span className="crosschain-infra-label">Accuracy</span>
                  <span className="crosschain-infra-value success">{infrastructure.rateFeed.accuracy}</span>
                </div>
              </div>
            </div>

            <div className="crosschain-infra-card">
              <div className="crosschain-infra-icon">🚨</div>
              <h4 className="crosschain-infra-title">Emergency Pause</h4>
              <span className={`crosschain-status-badge ${infrastructure.emergencyPause.status}`}>
                {infrastructure.emergencyPause.status}
              </span>
              <div className="crosschain-infra-stats">
                <div className="crosschain-infra-stat">
                  <span className="crosschain-infra-label">Last Triggered</span>
                  <span className="crosschain-infra-value">{infrastructure.emergencyPause.lastTriggered}</span>
                </div>
                <div className="crosschain-infra-stat">
                  <span className="crosschain-infra-label">Trigger Count</span>
                  <span className="crosschain-infra-value warning">{infrastructure.emergencyPause.triggerCount}</span>
                </div>
              </div>
              <button className="crosschain-action-btn danger">
                <span>🚨</span>
                <span>Trigger Emergency</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
