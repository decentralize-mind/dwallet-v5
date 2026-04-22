import { useState, useEffect } from 'react'
import adminAPI from '../../services/adminAPI'
import '../../styles/admin-settings.css'

export default function DeFiOperationsPanel() {
  const [activeTab, setActiveTab] = useState('staking')
  const [defiData, setDefiData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Fetch real DeFi data on component mount
  useEffect(() => {
    fetchDeFiData()
  }, [])

  const fetchDeFiData = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await adminAPI.getDeFiStats()
      
      if (response.success) {
        setDefiData(response.data)
      } else {
        setError('Failed to fetch DeFi data')
      }
    } catch (err) {
      console.error('Error fetching DeFi data:', err)
      setError(err.message || 'Failed to load DeFi data')
    } finally {
      setLoading(false)
    }
  }

  // Show loading state
  if (loading) {
    return (
      <div className="admin-panel">
        <div className="admin-panel-header">
          <div>
            <h2 className="admin-panel-title">💰 DeFi Operations</h2>
            <p className="admin-panel-subtitle">Loading DeFi data...</p>
          </div>
        </div>
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Fetching real-time DeFi statistics...</p>
        </div>
      </div>
    )
  }

  // Show error state
  if (error && !defiData) {
    return (
      <div className="admin-panel">
        <div className="admin-panel-header">
          <div>
            <h2 className="admin-panel-title">💰 DeFi Operations</h2>
            <p className="admin-panel-subtitle">Error loading data</p>
          </div>
          <button className="admin-action-btn primary" onClick={fetchDeFiData}>
            🔄 Retry
          </button>
        </div>
        <div className="error-container">
          <p className="error-message">{error}</p>
          <button className="admin-action-btn" onClick={fetchDeFiData}>
            Try Again
          </button>
        </div>
      </div>
    )
  }

  // Use real data or fallback
  const stakingPools = defiData?.stakingPools || []
  const dexPools = defiData?.dexPools || []
  const lendingStats = defiData?.lendingStats || {
    totalDeposited: '$0',
    totalBorrowed: '$0',
    utilizationRate: '0%',
    markets: []
  }

  // Calculate metrics from real data
  const totalTVL = defiData?.totalTVL || 0
  const volume24h = defiData?.volume24h || 0
  const fees24h = defiData?.fees24h || 0
  const activeUsers = defiData?.activeUsers || 0

  // Format TVL to USD
  const formatTVL = (tvl) => {
    if (tvl >= 1000000) {
      return `$${(tvl / 1000000).toFixed(1)}M`
    } else if (tvl >= 1000) {
      return `$${(tvl / 1000).toFixed(1)}K`
    }
    return `$${tvl.toFixed(2)}`
  }

  // Format volume
  const formatVolume = (vol) => {
    if (vol >= 1000000) {
      return `$${(vol / 1000000).toFixed(1)}M`
    } else if (vol >= 1000) {
      return `$${(vol / 1000).toFixed(1)}K`
    }
    return `$${vol.toFixed(2)}`
  }

  // Format fees
  const formatFees = (fees) => {
    return `$${fees.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  return (
    <div className="admin-panel">
      <div className="admin-panel-header">
        <div>
          <h2 className="admin-panel-title">💰 DeFi Operations</h2>
          <p className="admin-panel-subtitle">Manage staking, liquidity, lending, and advanced DeFi protocols</p>
        </div>
      </div>

      {/* DeFi Metrics Overview */}
      <div className="defi-metrics-grid">
        <div className="defi-metric-card">
          <div className="defi-metric-icon">💎</div>
          <div className="defi-metric-content">
            <p className="defi-metric-label">Total TVL</p>
            <p className="defi-metric-value">{formatTVL(totalTVL)}</p>
            <p className="defi-metric-change success">↑ 12.3%</p>
          </div>
        </div>

        <div className="defi-metric-card">
          <div className="defi-metric-icon">📊</div>
          <div className="defi-metric-content">
            <p className="defi-metric-label">24h Volume</p>
            <p className="defi-metric-value">{formatVolume(volume24h)}</p>
            <p className="defi-metric-change success">↑ 8.7%</p>
          </div>
        </div>

        <div className="defi-metric-card">
          <div className="defi-metric-icon">💰</div>
          <div className="defi-metric-content">
            <p className="defi-metric-label">24h Fees</p>
            <p className="defi-metric-value">{formatFees(fees24h)}</p>
            <p className="defi-metric-change success">↑ 15.2%</p>
          </div>
        </div>

        <div className="defi-metric-card">
          <div className="defi-metric-icon">👥</div>
          <div className="defi-metric-content">
            <p className="defi-metric-label">Active Users</p>
            <p className="defi-metric-value">{activeUsers.toLocaleString()}</p>
            <p className="defi-metric-change success">↑ 5.1%</p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="defi-tabs">
        <button 
          className={`defi-tab ${activeTab === 'staking' ? 'active' : ''}`}
          onClick={() => setActiveTab('staking')}
        >
          💎 Staking Pools
        </button>
        <button 
          className={`defi-tab ${activeTab === 'dex' ? 'active' : ''}`}
          onClick={() => setActiveTab('dex')}
        >
          🔄 DEX Liquidity
        </button>
        <button 
          className={`defi-tab ${activeTab === 'lending' ? 'active' : ''}`}
          onClick={() => setActiveTab('lending')}
        >
          🏦 Lending Market
        </button>
        <button 
          className={`defi-tab ${activeTab === 'advanced' ? 'active' : ''}`}
          onClick={() => setActiveTab('advanced')}
        >
          📈 Advanced DeFi
        </button>
        <button 
          className={`defi-tab ${activeTab === 'nft' ? 'active' : ''}`}
          onClick={() => setActiveTab('nft')}
        >
          🎨 NFT & Rewards
        </button>
      </div>

      {/* Staking Tab */}
      {activeTab === 'staking' && (
        <div className="defi-section">
          <h3 className="defi-section-title">Layer 4 - Staking Pools</h3>
          <div className="defi-staking-grid">
            {stakingPools.map((pool, idx) => (
              <div key={idx} className="defi-staking-card">
                <div className="defi-staking-header">
                  <h4 className="defi-staking-name">{pool.name}</h4>
                  <span className="defi-status-badge success">{pool.status}</span>
                </div>
                <div className="defi-staking-stats">
                  <div className="defi-staking-stat">
                    <span className="defi-staking-label">TVL</span>
                    <span className="defi-staking-value">{pool.tvlFormatted || pool.tvl}</span>
                  </div>
                  <div className="defi-staking-stat">
                    <span className="defi-staking-label">APY</span>
                    <span className="defi-staking-value success">{pool.apy === 'Variable' ? 'Variable' : `${pool.apy}%`}</span>
                  </div>
                  <div className="defi-staking-stat">
                    <span className="defi-staking-label">Stakers</span>
                    <span className="defi-staking-value">{Number(pool.stakers).toLocaleString()}</span>
                  </div>
                  <div className="defi-staking-stat">
                    <span className="defi-staking-label">Lock Period</span>
                    <span className="defi-staking-value">{pool.lockPeriod}</span>
                  </div>
                </div>
                <div className="defi-staking-rewards">
                  <span>Rewards: <strong>{pool.rewards}</strong></span>
                </div>
                <button className="defi-action-btn">
                  <span>⚙️</span>
                  <span>Configure</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* DEX Tab */}
      {activeTab === 'dex' && (
        <div className="defi-section">
          <h3 className="defi-section-title">Layer 2 - Liquidity Pools</h3>
          <div className="defi-table-container">
            <table className="defi-table">
              <thead>
                <tr>
                  <th>Trading Pair</th>
                  <th>Total Value Locked</th>
                  <th>24h Volume</th>
                  <th>24h Fees</th>
                  <th>LP APR</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {dexPools.map((pool, idx) => (
                  <tr key={idx}>
                    <td><strong>{pool.pair}</strong></td>
                    <td>{pool.tvl}</td>
                    <td>{pool.volume24h}</td>
                    <td>{pool.fees24h}</td>
                    <td><span className="defi-apy-badge">{pool.apr}</span></td>
                    <td>
                      <button className="defi-table-btn">⚙️ Configure</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Lending Tab */}
      {activeTab === 'lending' && (
        <div className="defi-section">
          <div className="defi-lending-overview">
            <div className="defi-lending-stat-card">
              <p className="defi-lending-label">Total Deposited</p>
              <p className="defi-lending-value">{lendingStats.totalDeposited}</p>
            </div>
            <div className="defi-lending-stat-card">
              <p className="defi-lending-label">Total Borrowed</p>
              <p className="defi-lending-value">{lendingStats.totalBorrowed}</p>
            </div>
            <div className="defi-lending-stat-card">
              <p className="defi-lending-label">Utilization Rate</p>
              <p className="defi-lending-value warning">{lendingStats.utilizationRate}</p>
            </div>
          </div>

          <h3 className="defi-section-title">Layer 9 - Lending Markets</h3>
          <div className="defi-table-container">
            <table className="defi-table">
              <thead>
                <tr>
                  <th>Asset</th>
                  <th>Total Deposited</th>
                  <th>Total Borrowed</th>
                  <th>Supply APY</th>
                  <th>Borrow APY</th>
                </tr>
              </thead>
              <tbody>
                {lendingStats.markets.map((market, idx) => (
                  <tr key={idx}>
                    <td><strong>{market.asset}</strong></td>
                    <td>{market.deposited}</td>
                    <td>{market.borrowed}</td>
                    <td><span className="defi-apy-badge success">{market.supplyAPY}</span></td>
                    <td><span className="defi-apy-badge warning">{market.borrowAPY}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Advanced DeFi Tab */}
      {activeTab === 'advanced' && (
        <div className="defi-section">
          <h3 className="defi-section-title">Layer 10 - Advanced DeFi Protocols</h3>
          <div className="defi-advanced-grid">
            <div className="defi-advanced-card">
              <div className="defi-advanced-icon">📊</div>
              <h4 className="defi-advanced-title">Options Trading</h4>
              <div className="defi-advanced-stats">
                <div className="defi-advanced-stat">
                  <span className="defi-advanced-label">Volume</span>
                  <span className="defi-advanced-value">{advancedDeFi.options.totalVolume}</span>
                </div>
                <div className="defi-advanced-stat">
                  <span className="defi-advanced-label">Positions</span>
                  <span className="defi-advanced-value">{advancedDeFi.options.openPositions}</span>
                </div>
                <div className="defi-advanced-stat">
                  <span className="defi-advanced-label">Premiums</span>
                  <span className="defi-advanced-value success">{advancedDeFi.options.totalPremiums}</span>
                </div>
              </div>
            </div>

            <div className="defi-advanced-card">
              <div className="defi-advanced-icon">📈</div>
              <h4 className="defi-advanced-title">Perpetuals</h4>
              <div className="defi-advanced-stats">
                <div className="defi-advanced-stat">
                  <span className="defi-advanced-label">Open Interest</span>
                  <span className="defi-advanced-value">{advancedDeFi.perpetuals.openInterest}</span>
                </div>
                <div className="defi-advanced-stat">
                  <span className="defi-advanced-label">Traders</span>
                  <span className="defi-advanced-value">{advancedDeFi.perpetuals.activeTraders}</span>
                </div>
                <div className="defi-advanced-stat">
                  <span className="defi-advanced-label">Funding Rate</span>
                  <span className="defi-advanced-value">{advancedDeFi.perpetuals.fundingRate}</span>
                </div>
              </div>
            </div>

            <div className="defi-advanced-card">
              <div className="defi-advanced-icon">🎯</div>
              <h4 className="defi-advanced-title">Prediction Markets</h4>
              <div className="defi-advanced-stats">
                <div className="defi-advanced-stat">
                  <span className="defi-advanced-label">Markets</span>
                  <span className="defi-advanced-value">{advancedDeFi.predictionMarkets.activeMarkets}</span>
                </div>
                <div className="defi-advanced-stat">
                  <span className="defi-advanced-label">Liquidity</span>
                  <span className="defi-advanced-value">{advancedDeFi.predictionMarkets.totalLiquidity}</span>
                </div>
                <div className="defi-advanced-stat">
                  <span className="defi-advanced-label">Resolved</span>
                  <span className="defi-advanced-value success">{advancedDeFi.predictionMarkets.resolvedToday}</span>
                </div>
              </div>
            </div>

            <div className="defi-advanced-card">
              <div className="defi-advanced-icon">💰</div>
              <h4 className="defi-advanced-title">Yield Vaults</h4>
              <div className="defi-advanced-stats">
                <div className="defi-advanced-stat">
                  <span className="defi-advanced-label">Total TVL</span>
                  <span className="defi-advanced-value">{advancedDeFi.yieldVaults.totalTVL}</span>
                </div>
                <div className="defi-advanced-stat">
                  <span className="defi-advanced-label">Vaults</span>
                  <span className="defi-advanced-value">{advancedDeFi.yieldVaults.activeVaults}</span>
                </div>
                <div className="defi-advanced-stat">
                  <span className="defi-advanced-label">Avg APY</span>
                  <span className="defi-advanced-value success">{advancedDeFi.yieldVaults.avgAPY}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* NFT & Rewards Tab */}
      {activeTab === 'nft' && (
        <div className="defi-section">
          <h3 className="defi-section-title">Layer 9 - NFT Membership</h3>
          <div className="defi-nft-overview">
            <div className="defi-nft-stat-card">
              <p className="defi-nft-label">Total Minted</p>
              <p className="defi-nft-value">{nftMembership.totalMinted.toLocaleString()}</p>
            </div>
            <div className="defi-nft-stat-card">
              <p className="defi-nft-label">Active Members</p>
              <p className="defi-nft-value">{nftMembership.activeMembers.toLocaleString()}</p>
            </div>
            <div className="defi-nft-stat-card">
              <p className="defi-nft-label">Floor Price</p>
              <p className="defi-nft-value">{nftMembership.floorPrice}</p>
            </div>
            <div className="defi-nft-stat-card">
              <p className="defi-nft-label">Trading Volume</p>
              <p className="defi-nft-value">{nftMembership.tradingVolume.toLocaleString()} ETH</p>
            </div>
          </div>

          <div className="defi-nft-tiers">
            {nftMembership.tiers.map((tier, idx) => (
              <div key={idx} className="defi-nft-tier-card">
                <h4 className="defi-nft-tier-name">{tier.tier}</h4>
                <p className="defi-nft-tier-holders">{tier.holders} holders</p>
                <p className="defi-nft-tier-benefits">{tier.benefits}</p>
              </div>
            ))}
          </div>

          <h3 className="defi-section-title">Affiliate Rewards Program</h3>
          <div className="defi-affiliate-overview">
            <div className="defi-affiliate-stat">
              <p className="defi-affiliate-label">Total Affiliates</p>
              <p className="defi-affiliate-value">{affiliateStats.totalAffiliates.toLocaleString()}</p>
            </div>
            <div className="defi-affiliate-stat">
              <p className="defi-affiliate-label">Total Rewards Paid</p>
              <p className="defi-affiliate-value">{affiliateStats.totalRewardsPaid}</p>
            </div>
          </div>

          <div className="defi-table-container">
            <table className="defi-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Address</th>
                  <th>Referrals</th>
                  <th>Rewards Earned</th>
                </tr>
              </thead>
              <tbody>
                {affiliateStats.topReferrers.map((ref, idx) => (
                  <tr key={idx}>
                    <td><span className="defi-rank-badge">{idx + 1}</span></td>
                    <td>{ref.address}</td>
                    <td>{ref.referrals}</td>
                    <td><strong>{ref.rewards}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
