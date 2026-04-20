import { useState } from 'react'
import '../../styles/admin-settings.css'

export default function GovernancePanel() {
  const [activeTab, setActiveTab] = useState('proposals')
  const [showCreateModal, setShowCreateModal] = useState(false)

  // Layer 1: Governance Proposals
  const proposals = [
    {
      id: 1,
      title: 'Increase Staking Rewards by 2%',
      status: 'active',
      votes: { for: 245000, against: 32000, abstain: 15000 },
      endTime: '2024-01-27 15:00',
      proposer: '0x742d...bEb',
      description: 'Proposal to increase DWT staking rewards from 5% to 7% APY'
    },
    {
      id: 2,
      title: 'Treasury Fund Allocation for Marketing',
      status: 'active',
      votes: { for: 180000, against: 45000, abstain: 8000 },
      endTime: '2024-01-28 12:00',
      proposer: '0x5aAe...Aed',
      description: 'Allocate 500,000 DWT from treasury for Q1 marketing campaign'
    },
    {
      id: 3,
      title: 'Deploy Layer 10 Advanced DeFi',
      status: 'passed',
      votes: { for: 520000, against: 12000, abstain: 5000 },
      endTime: '2024-01-15 18:00',
      proposer: '0xfB69...d359',
      description: 'Approve deployment of options and perpetuals contracts'
    },
    {
      id: 4,
      title: 'Reduce Transaction Fees by 15%',
      status: 'rejected',
      votes: { for: 85000, against: 310000, abstain: 22000 },
      endTime: '2024-01-10 09:00',
      proposer: '0x1234...5678',
      description: 'Proposal to reduce DEX transaction fees from 0.3% to 0.255%'
    }
  ]

  // Layer 1: Timelock Queue
  const timelockQueue = [
    {
      id: 1,
      action: 'Update Staking Rewards',
      scheduledTime: '2024-01-22 15:00',
      proposalId: 3,
      status: 'ready',
      eta: '2 hours'
    },
    {
      id: 2,
      action: 'Deploy New Liquidity Pool',
      scheduledTime: '2024-01-23 10:00',
      proposalId: 5,
      status: 'queued',
      eta: '20 hours'
    }
  ]

  // Layer 5: veDWT Voting Power
  const topVoters = [
    { rank: 1, address: '0x742d...bEb', votingPower: '1,250,000', lockEnd: '2025-06-15', gauge: 'DWT-ETH Pool' },
    { rank: 2, address: '0x5aAe...Aed', votingPower: '890,000', lockEnd: '2025-03-20', gauge: 'Staking Rewards' },
    { rank: 3, address: '0xfB69...d359', votingPower: '654,000', lockEnd: '2024-12-30', gauge: 'Treasury Allocation' },
    { rank: 4, address: '0x9876...dcba', votingPower: '432,000', lockEnd: '2025-01-15', gauge: 'DWT-USDC Pool' },
    { rank: 5, address: '0x1234...5678', votingPower: '321,000', lockEnd: '2024-11-28', gauge: 'Insurance Fund' }
  ]

  // Layer 1, 6: DAO Treasury
  const treasury = {
    totalBalance: '12,500,000 DWT',
    usdValue: '$43.75M',
    allocated: '8,200,000 DWT',
    available: '4,300,000 DWT',
    monthlyBudget: '500,000 DWT',
    allocations: [
      { category: 'Development', amount: '3,500,000', percentage: 42.7 },
      { category: 'Marketing', amount: '2,100,000', percentage: 25.6 },
      { category: 'Liquidity', amount: '1,800,000', percentage: 22.0 },
      { category: 'Reserve', amount: '800,000', percentage: 9.7 }
    ]
  }

  const getStatusBadge = (status) => {
    const styles = {
      active: 'admin-status-badge warning',
      passed: 'admin-status-badge success',
      rejected: 'admin-status-badge danger',
      queued: 'admin-status-badge info',
      ready: 'admin-status-badge success',
      executed: 'admin-status-badge success'
    }
    return styles[status] || 'admin-status-badge'
  }

  const formatVotes = (votes) => {
    const total = votes.for + votes.against + votes.abstain
    const forPercent = ((votes.for / total) * 100).toFixed(1)
    const againstPercent = ((votes.against / total) * 100).toFixed(1)
    return { forPercent, againstPercent, total }
  }

  return (
    <div className="admin-panel">
      <div className="admin-panel-header">
        <div>
          <h2 className="admin-panel-title">🏛️ Governance & DAO</h2>
          <p className="admin-panel-subtitle">Decentralized governance management across all layers</p>
        </div>
        <button 
          className="admin-action-btn primary"
          onClick={() => setShowCreateModal(true)}
        >
          <span>➕</span>
          <span>New Proposal</span>
        </button>
      </div>

      {/* Treasury Overview */}
      <div className="gov-treasury-banner">
        <div className="gov-treasury-main">
          <div className="gov-treasury-item">
            <p className="gov-treasury-label">Total Treasury</p>
            <p className="gov-treasury-value">{treasury.totalBalance}</p>
            <p className="gov-treasury-usd">{treasury.usdValue}</p>
          </div>
          <div className="gov-treasury-divider"></div>
          <div className="gov-treasury-item">
            <p className="gov-treasury-label">Available</p>
            <p className="gov-treasury-value success">{treasury.available}</p>
          </div>
          <div className="gov-treasury-divider"></div>
          <div className="gov-treasury-item">
            <p className="gov-treasury-label">Allocated</p>
            <p className="gov-treasury-value warning">{treasury.allocated}</p>
          </div>
          <div className="gov-treasury-divider"></div>
          <div className="gov-treasury-item">
            <p className="gov-treasury-label">Monthly Budget</p>
            <p className="gov-treasury-value">{treasury.monthlyBudget}</p>
          </div>
        </div>
        
        <div className="gov-allocation-bars">
          {treasury.allocations.map((alloc, idx) => (
            <div key={idx} className="gov-allocation-item">
              <div className="gov-allocation-header">
                <span className="gov-allocation-name">{alloc.category}</span>
                <span className="gov-allocation-amount">{alloc.amount} DWT ({alloc.percentage}%)</span>
              </div>
              <div className="gov-allocation-bar">
                <div 
                  className="gov-allocation-fill" 
                  style={{ width: `${alloc.percentage}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="gov-tabs">
        <button 
          className={`gov-tab ${activeTab === 'proposals' ? 'active' : ''}`}
          onClick={() => setActiveTab('proposals')}
        >
          📋 Proposals
        </button>
        <button 
          className={`gov-tab ${activeTab === 'timelock' ? 'active' : ''}`}
          onClick={() => setActiveTab('timelock')}
        >
          ⏱️ Timelock Queue
        </button>
        <button 
          className={`gov-tab ${activeTab === 'voting' ? 'active' : ''}`}
          onClick={() => setActiveTab('voting')}
        >
          🗳️ Voting Power
        </button>
      </div>

      {/* Proposals Tab */}
      {activeTab === 'proposals' && (
        <div className="gov-section">
          <h3 className="gov-section-title">Active & Recent Proposals</h3>
          <div className="gov-proposals-list">
            {proposals.map(proposal => {
              const { forPercent, againstPercent, total } = formatVotes(proposal.votes)
              return (
                <div key={proposal.id} className="gov-proposal-card">
                  <div className="gov-proposal-header">
                    <h4 className="gov-proposal-title">{proposal.title}</h4>
                    <span className={getStatusBadge(proposal.status)}>{proposal.status.toUpperCase()}</span>
                  </div>
                  <p className="gov-proposal-desc">{proposal.description}</p>
                  <div className="gov-proposal-meta">
                    <span className="gov-proposal-proposer">👤 {proposal.proposer}</span>
                    <span className="gov-proposal-end">⏰ Ends: {proposal.endTime}</span>
                  </div>
                  <div className="gov-voting-progress">
                    <div className="gov-vote-bar">
                      <div 
                        className="gov-vote-bar-fill for" 
                        style={{ width: `${forPercent}%` }}
                      ></div>
                      <div 
                        className="gov-vote-bar-fill against" 
                        style={{ width: `${againstPercent}%` }}
                      ></div>
                    </div>
                    <div className="gov-vote-stats">
                      <span className="gov-vote-stat success">✓ {proposal.votes.for.toLocaleString()} ({forPercent}%)</span>
                      <span className="gov-vote-stat danger">✕ {proposal.votes.against.toLocaleString()} ({againstPercent}%)</span>
                      <span className="gov-vote-stat">⊘ {proposal.votes.abstain.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Timelock Queue Tab */}
      {activeTab === 'timelock' && (
        <div className="gov-section">
          <h3 className="gov-section-title">Timelock Queue</h3>
          <div className="gov-timelock-list">
            {timelockQueue.map(item => (
              <div key={item.id} className="gov-timelock-card">
                <div className="gov-timelock-header">
                  <h4 className="gov-timelock-action">{item.action}</h4>
                  <span className={getStatusBadge(item.status)}>{item.status.toUpperCase()}</span>
                </div>
                <div className="gov-timelock-details">
                  <div className="gov-timelock-detail-item">
                    <span className="gov-timelock-label">Scheduled:</span>
                    <span className="gov-timelock-value">{item.scheduledTime}</span>
                  </div>
                  <div className="gov-timelock-detail-item">
                    <span className="gov-timelock-label">Proposal ID:</span>
                    <span className="gov-timelock-value">#{item.proposalId}</span>
                  </div>
                  <div className="gov-timelock-detail-item">
                    <span className="gov-timelock-label">ETA:</span>
                    <span className="gov-timelock-value warning">{item.eta}</span>
                  </div>
                </div>
                {item.status === 'ready' && (
                  <button className="admin-action-btn primary" style={{ marginTop: '16px' }}>
                    <span>▶️</span>
                    <span>Execute Now</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Voting Power Tab */}
      {activeTab === 'voting' && (
        <div className="gov-section">
          <h3 className="gov-section-title">Top veDWT Voters</h3>
          <div className="gov-table-container">
            <table className="gov-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Address</th>
                  <th>Voting Power</th>
                  <th>Lock End Date</th>
                  <th>Preferred Gauge</th>
                </tr>
              </thead>
              <tbody>
                {topVoters.map(voter => (
                  <tr key={voter.rank}>
                    <td><span className="gov-rank-badge">{voter.rank}</span></td>
                    <td>{voter.address}</td>
                    <td><strong>{voter.votingPower}</strong></td>
                    <td>{voter.lockEnd}</td>
                    <td>{voter.gauge}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Proposal Modal */}
      {showCreateModal && (
        <div className="admin-modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>🏛️ Create New Proposal</h3>
              <button 
                className="admin-modal-close"
                onClick={() => setShowCreateModal(false)}
              >
                ✕
              </button>
            </div>
            
            <div className="admin-modal-content">
              <div className="admin-form-group">
                <label className="admin-form-label">Proposal Title</label>
                <input
                  type="text"
                  className="admin-form-input"
                  placeholder="Enter proposal title..."
                />
              </div>

              <div className="admin-form-group">
                <label className="admin-form-label">Description</label>
                <textarea
                  className="admin-form-input"
                  placeholder="Describe your proposal..."
                  rows="4"
                ></textarea>
              </div>

              <div className="admin-form-group">
                <label className="admin-form-label">Target Contract</label>
                <select className="admin-form-input">
                  <option>Select contract...</option>
                  <option>Layer 1 - DWT Token</option>
                  <option>Layer 2 - DEX Router</option>
                  <option>Layer 4 - Staking Pool</option>
                  <option>Layer 6 - Treasury</option>
                  <option>Layer 8 - Cross-Chain Bridge</option>
                </select>
              </div>

              <div className="admin-form-group">
                <label className="admin-form-label">Calldata (hex)</label>
                <input
                  type="text"
                  className="admin-form-input"
                  placeholder="0x..."
                />
              </div>

              <div className="admin-form-warning">
                ⚠️ Proposals require 100,000 DWT to create and will be subject to a 48-hour timelock
              </div>

              <div className="admin-modal-actions">
                <button className="admin-btn primary">
                  🏛️ Create Proposal
                </button>
                <button 
                  className="admin-btn secondary"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
