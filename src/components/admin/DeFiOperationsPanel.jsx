import { useState } from 'react'
import '../../styles/admin-settings.css'

export default function DeFiOperationsPanel() {
  const [activeTab, setActiveTab] = useState('staking')

  // Layer 4: Staking Pools
  const stakingPools = [
    {
      name: 'DWT Auto-Compound',
      tvl: '15,200,000 DWT',
      apy: '12.5%',
      stakers: 1247,
      status: 'active',
      lockPeriod: '30 days',
      rewards: 'DWT'
    },
    {
      name: 'DWT → ETH Rewards',
      tvl: '8,500,000 DWT',
      apy: '8.3%',
      stakers: 892,
      status: 'active',
      lockPeriod: '90 days',
      rewards: 'ETH'
    },
    {
      name: 'veDWT Governance',
      tvl: '22,000,000 DWT',
      apy: 'Variable',
      stakers: 456,
      status: 'active',
      lockPeriod: '1-4 years',
      rewards: 'Voting Power'
    }
  ]

  // Layer 2: DEX Pools
  const dexPools = [
    { pair: 'DWT/ETH', tvl: '$12.5M', volume24h: '$2.3M', fees24h: '$6,900', apr: '18.5%' },
    { pair: 'DWT/USDC', tvl: '$8.2M', volume24h: '$1.8M', fees24h: '$5,400', apr: '15.2%' },
    { pair: 'DWT/DAI', tvl: '$3.1M', volume24h: '$890K', fees24h: '$2,670', apr: '12.8%' },
    { pair: 'DWT/WBTC', tvl: '$5.6M', volume24h: '$1.2M', fees24h: '$3,600', apr: '21.3%' }
  ]

  // Layer 9: Lending Market
  const lendingStats = {
    totalDeposited: '$45.2M',
    totalBorrowed: '$28.7M',
    utilizationRate: '63.5%',
    markets: [
      { asset: 'DWT', deposited: '12.5M', borrowed: '7.8M', supplyAPY: '4.2%', borrowAPY: '6.8%' },
      { asset: 'ETH', deposited: '8,234', borrowed: '5,120', supplyAPY: '2.1%', borrowAPY: '3.9%' },
      { asset: 'USDC', deposited: '15.2M', borrowed: '9.8M', supplyAPY: '5.5%', borrowAPY: '8.2%' }
    ]
  }

  // Layer 10: Advanced DeFi
  const advancedDeFi = {
    options: {
      totalVolume: '$1.2M',
      openPositions: 234,
      totalPremiums: '$45,000'
    },
    perpetuals: {
      openInterest: '$8.5M',
      activeTraders: 567,
      fundingRate: '0.01%'
    },
    predictionMarkets: {
      activeMarkets: 12,
      totalLiquidity: '$2.3M',
      resolvedToday: 5
    },
    yieldVaults: {
      totalTVL: '$18.5M',
      activeVaults: 8,
      avgAPY: '15.3%'
    }
  }

  // Layer 9: NFT Membership
  const nftMembership = {
    totalMinted: 5000,
    activeMembers: 4234,
    floorPrice: '2.5 ETH',
    tradingVolume: '12,500 ETH',
    tiers: [
      { tier: 'Diamond', holders: 234, benefits: '0% fees, priority support' },
      { tier: 'Gold', holders: 892, benefits: '25% fee discount' },
      { tier: 'Silver', holders: 1567, benefits: '10% fee discount' },
      { tier: 'Bronze', holders: 1541, benefits: 'Early access' }
    ]
  }

  // Layer 9: Affiliate Rewards
  const affiliateStats = {
    totalAffiliates: 2341,
    totalRewardsPaid: '450,000 DWT',
    topReferrers: [
      { address: '0x742d...bEb', referrals: 234, rewards: '45,000 DWT' },
      { address: '0x5aAe...Aed', referrals: 189, rewards: '38,000 DWT' },
      { address: '0xfB69...d359', referrals: 156, rewards: '31,000 DWT' }
    ]
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
            <p className="defi-metric-value">$89.5M</p>
            <p className="defi-metric-change success">↑ 12.3%</p>
          </div>
        </div>

        <div className="defi-metric-card">
          <div className="defi-metric-icon">📊</div>
          <div className="defi-metric-content">
            <p className="defi-metric-label">24h Volume</p>
            <p className="defi-metric-value">$6.2M</p>
            <p className="defi-metric-change success">↑ 8.7%</p>
          </div>
        </div>

        <div className="defi-metric-card">
          <div className="defi-metric-icon">💰</div>
          <div className="defi-metric-content">
            <p className="defi-metric-label">24h Fees</p>
            <p className="defi-metric-value">$18,570</p>
            <p className="defi-metric-change success">↑ 15.2%</p>
          </div>
        </div>

        <div className="defi-metric-card">
          <div className="defi-metric-icon">👥</div>
          <div className="defi-metric-content">
            <p className="defi-metric-label">Active Users</p>
            <p className="defi-metric-value">3,847</p>
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
                    <span className="defi-staking-value">{pool.tvl}</span>
                  </div>
                  <div className="defi-staking-stat">
                    <span className="defi-staking-label">APY</span>
                    <span className="defi-staking-value success">{pool.apy}</span>
                  </div>
                  <div className="defi-staking-stat">
                    <span className="defi-staking-label">Stakers</span>
                    <span className="defi-staking-value">{pool.stakers.toLocaleString()}</span>
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
