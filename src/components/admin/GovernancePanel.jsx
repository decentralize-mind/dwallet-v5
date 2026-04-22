import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { CONTRACT_ADDRESSES } from '../../config/contracts'
import { DWTToken_ABI, DWTGovernor_ABI, GovernanceHub_ABI } from '../../config/abis'
import '../../styles/admin-settings.css'

export default function GovernancePanel() {
  const [activeTab, setActiveTab] = useState('proposals')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  // Real blockchain data
  const [treasury, setTreasury] = useState(null)
  const [proposals, setProposals] = useState([])
  const [timelockQueue, setTimelockQueue] = useState([])
  const [topVoters, setTopVoters] = useState([])
  const [userVotingPower, setUserVotingPower] = useState('0')
  const [dwtPrice, setDwtPrice] = useState(0)
  
  // Network state
  const [network, setNetwork] = useState('baseSepolia')
  const [provider, setProvider] = useState(null)
  const [signer, setSigner] = useState(null)
  const [userAddress, setUserAddress] = useState(null)

  useEffect(() => {
    initializeBlockchain()
  }, [])

  const initializeBlockchain = async () => {
    try {
      setLoading(true)
      setError(null)

      if (!window.ethereum) {
        setError('MetaMask not detected. Please install MetaMask to view governance data.')
        setLoading(false)
        return
      }

      const ethProvider = new ethers.BrowserProvider(window.ethereum)
      const ethSigner = await ethProvider.getSigner()
      const address = await ethSigner.getAddress()
      const net = await ethProvider.getNetwork()
      
      setProvider(ethProvider)
      setSigner(ethSigner)
      setUserAddress(address)
      
      // Determine network
      const chainId = Number(net.chainId)
      const networkName = chainId === 84532 ? 'baseSepolia' : chainId === 8453 ? 'base' : 'sepolia'
      setNetwork(networkName)

      // Fetch all data in parallel
      await Promise.all([
        fetchTreasuryData(ethProvider, networkName),
        fetchProposals(ethProvider, networkName),
        fetchTimelockQueue(ethProvider, networkName),
        fetchTopVoters(ethProvider, networkName),
        fetchUserVotingPower(ethSigner, networkName),
        fetchDWTPrice()
      ])

      setLoading(false)
    } catch (err) {
      console.error('Failed to initialize blockchain:', err)
      setError(`Failed to connect: ${err.message}`)
      setLoading(false)
    }
  }

  const fetchTreasuryData = async (ethProvider, networkName) => {
    try {
      const addresses = CONTRACT_ADDRESSES[networkName]
      if (!addresses) return

      // Get DWT token balance of treasury
      const dwtContract = new ethers.Contract(addresses.DWT, DWTToken_ABI, ethProvider)
      const treasuryAddress = process.env.DAO_TREASURY_ADDRESS || addresses.Treasury || '0x0000000000000000000000000000000000000000'
      
      const treasuryBalance = await dwtContract.balanceOf(treasuryAddress)
      const totalSupply = await dwtContract.totalSupply()
      
      // Get token price (fallback to mock if API fails)
      const price = dwtPrice || 3.50 // $3.50 per DWT
      
      const balanceFormatted = Number(ethers.formatEther(treasuryBalance))
      const totalSupplyFormatted = Number(ethers.formatEther(totalSupply))
      
      // Mock allocation data (can be fetched from treasury contract if deployed)
      const allocations = [
        { category: 'Development', amount: Math.floor(balanceFormatted * 0.427), percentage: 42.7 },
        { category: 'Marketing', amount: Math.floor(balanceFormatted * 0.256), percentage: 25.6 },
        { category: 'Liquidity', amount: Math.floor(balanceFormatted * 0.22), percentage: 22.0 },
        { category: 'Reserve', amount: Math.floor(balanceFormatted * 0.097), percentage: 9.7 }
      ]

      const allocated = allocations.reduce((sum, a) => sum + a.amount, 0)
      const available = balanceFormatted - allocated
      const monthlyBudget = Math.floor(balanceFormatted * 0.04) // 4% monthly

      setTreasury({
        totalBalance: `${balanceFormatted.toLocaleString()} DWT`,
        usdValue: `$${(balanceFormatted * price).toLocaleString(undefined, { maximumFractionDigits: 2 })}M`,
        allocated: `${allocated.toLocaleString()} DWT`,
        available: `${available.toLocaleString()} DWT`,
        monthlyBudget: `${monthlyBudget.toLocaleString()} DWT`,
        allocations
      })
    } catch (err) {
      console.error('Failed to fetch treasury data:', err)
    }
  }

  const fetchProposals = async (ethProvider, networkName) => {
    try {
      const addresses = CONTRACT_ADDRESSES[networkName]
      if (!addresses?.Governance) return

      const governanceContract = new ethers.Contract(addresses.Governance, DWTGovernor_ABI, ethProvider)
      
      // Get proposal count (proposalCounter)
      let proposalCount = 0
      try {
        proposalCount = await governanceContract.proposalCounter()
      } catch {
        // Fallback: try proposalCount
        try {
          proposalCount = await governanceContract.proposalCount()
        } catch {
          console.warn('Could not fetch proposal count')
          return
        }
      }

      const proposalList = []
      
      // Fetch last 10 proposals (or all if less)
      const startIndex = Math.max(1, Number(proposalCount) - 9)
      
      for (let i = Number(proposalCount); i >= startIndex; i--) {
        try {
          const proposal = await governanceContract.proposals(i)
          const state = await governanceContract.state(i)
          const votes = await governanceContract.proposalVotes(i)
          
          // Map state: 0=Pending, 1=Active, 2=Canceled, 3=Defeated, 4=Succeeded, 5=Queued, 6=Expired, 7=Executed
          const statusMap = {
            0: 'pending',
            1: 'active',
            2: 'cancelled',
            3: 'rejected',
            4: 'passed',
            5: 'queued',
            6: 'expired',
            7: 'executed'
          }
          
          // Extract description from targets[0] calldata or use placeholder
          let title = `Proposal #${i}`
          let description = 'Governance proposal'
          
          try {
            const descriptionHash = proposal.description
            // In real implementation, parse IPFS hash or metadata
            title = `Proposal #${i}: ${proposal.proposer.slice(0, 6)}...`
            description = `On-chain governance proposal`
          } catch {
            // Use default
          }

          const forVotes = Number(ethers.formatEther(votes.forVotes))
          const againstVotes = Number(ethers.formatEther(votes.againstVotes))
          const abstainVotes = Number(ethers.formatEther(votes.abstainVotes))

          proposalList.push({
            id: i,
            title,
            status: statusMap[state] || 'unknown',
            votes: {
              for: forVotes,
              against: againstVotes,
              abstain: abstainVotes
            },
            endTime: new Date(Number(proposal.endTimestamp) * 1000).toLocaleString(),
            proposer: `${proposal.proposer.slice(0, 6)}...${proposal.proposer.slice(-4)}`,
            description
          })
        } catch (err) {
          console.warn(`Failed to fetch proposal ${i}:`, err)
        }
      }

      setProposals(proposalList)
    } catch (err) {
      console.error('Failed to fetch proposals:', err)
    }
  }

  const fetchTimelockQueue = async (ethProvider, networkName) => {
    try {
      const addresses = CONTRACT_ADDRESSES[networkName]
      if (!addresses?.Timelock) return

      const timelockContract = new ethers.Contract(addresses.Timelock, GovernanceHub_ABI, ethProvider)
      
      // Get queued transactions (this depends on your timelock implementation)
      // This is a simplified version - adapt based on your actual timelock ABI
      const queue = []
      
      try {
        // Example: get queued proposal IDs
        const queueLength = await timelockQueue.getLength?.() || 0
        
        for (let i = 0; i < Math.min(queueLength, 5); i++) {
          const item = await timelockContract.getQueueItem?.(i)
          if (item) {
            const executeAfter = Number(item.executeAfter)
            const now = Math.floor(Date.now() / 1000)
            const eta = executeAfter - now
            
            queue.push({
              id: i + 1,
              action: `Execute Proposal #${item.proposalId || 'Unknown'}`,
              scheduledTime: new Date(executeAfter * 1000).toLocaleString(),
              proposalId: item.proposalId || i + 1,
              status: eta <= 0 ? 'ready' : 'queued',
              eta: eta > 0 ? `${Math.floor(eta / 3600)} hours` : 'Ready'
            })
          }
        }
      } catch {
        console.warn('Could not fetch timelock queue - using fallback')
      }

      setTimelockQueue(queue)
    } catch (err) {
      console.error('Failed to fetch timelock queue:', err)
    }
  }

  const fetchTopVoters = async (ethProvider, networkName) => {
    try {
      const addresses = CONTRACT_ADDRESSES[networkName]
      if (!addresses?.VeDWT && !addresses?.DWT) return

      // Use DWT token with voting extension
      const dwtContract = new ethers.Contract(addresses.DWT, DWTToken_ABI, ethProvider)
      
      // Get top voters by checking balances of known addresses
      // In production, you'd query The Graph or use indexer
      const sampleAddresses = [
        '0x742d35Cc6634C0532925a3b844Bc9e7595f5bEb',
        '0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed',
        '0xfB6916095ca1df60bB79Ce92cE3Ea74c37c5d359',
        '0xdbF03B407c01E7cD3CBea99509d93f8DDDC8C6FB',
        '0xD1220A0cf47c7B9Be7A2E6BA89F429762e7b9aDB'
      ]

      const voters = []
      
      for (const addr of sampleAddresses) {
        try {
          const votingPower = await dwtContract.getVotes?.(addr) || 
                             await dwtContract.balanceOf(addr)
          
          const formattedPower = Number(ethers.formatEther(votingPower))
          
          if (formattedPower > 0) {
            voters.push({
              address: `${addr.slice(0, 6)}...${addr.slice(-4)}`,
              votingPower: formattedPower.toLocaleString(),
              lockEnd: '2025-12-31', // Get from VeDWT contract
              gauge: 'Staking Rewards'
            })
          }
        } catch (err) {
          console.warn(`Failed to fetch voter ${addr}:`, err)
        }
      }

      // Sort by voting power and add rank
      voters.sort((a, b) => Number(b.votingPower.replace(/,/g, '')) - Number(a.votingPower.replace(/,/g, '')))
      voters.forEach((v, i) => v.rank = i + 1)

      setTopVoters(voters.slice(0, 10))
    } catch (err) {
      console.error('Failed to fetch top voters:', err)
    }
  }

  const fetchUserVotingPower = async (ethSigner, networkName) => {
    try {
      const addresses = CONTRACT_ADDRESSES[networkName]
      if (!addresses?.DWT) return

      const dwtContract = new ethers.Contract(addresses.DWT, DWTToken_ABI, ethSigner)
      const userAddr = await ethSigner.getAddress()
      
      const votingPower = await dwtContract.getVotes?.(userAddr) || 
                         await dwtContract.balanceOf(userAddr)
      
      setUserVotingPower(ethers.formatEther(votingPower))
    } catch (err) {
      console.error('Failed to fetch user voting power:', err)
    }
  }

  const fetchDWTPrice = async () => {
    try {
      // Try CoinGecko or other price API
      // For now, use mock price
      setDwtPrice(3.50)
    } catch (err) {
      console.error('Failed to fetch DWT price:', err)
      setDwtPrice(3.50)
    }
  }

  const getStatusBadge = (status) => {
    const styles = {
      active: 'admin-status-badge warning',
      passed: 'admin-status-badge success',
      rejected: 'admin-status-badge danger',
      queued: 'admin-status-badge info',
      ready: 'admin-status-badge success',
      executed: 'admin-status-badge success',
      pending: 'admin-status-badge info',
      cancelled: 'admin-status-badge danger',
      expired: 'admin-status-badge danger'
    }
    return styles[status] || 'admin-status-badge'
  }

  const formatVotes = (votes) => {
    const total = votes.for + votes.against + votes.abstain
    if (total === 0) return { forPercent: '0.0', againstPercent: '0.0', total: 0 }
    
    const forPercent = ((votes.for / total) * 100).toFixed(1)
    const againstPercent = ((votes.against / total) * 100).toFixed(1)
    return { forPercent, againstPercent, total }
  }

  if (loading) {
    return (
      <div className="admin-panel">
        <div className="admin-panel-header">
          <h2 className="admin-panel-title">🏛️ Governance & DAO</h2>
        </div>
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text2)' }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>⏳</div>
          <p>Loading governance data from blockchain...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="admin-panel">
        <div className="admin-panel-header">
          <h2 className="admin-panel-title">🏛️ Governance & DAO</h2>
        </div>
        <div style={{ 
          background: 'var(--bg2)', 
          border: '2px solid var(--danger)', 
          borderRadius: '12px', 
          padding: '32px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>⚠️</div>
          <p style={{ color: 'var(--danger)', marginBottom: '16px' }}>{error}</p>
          <button 
            className="admin-action-btn primary"
            onClick={initializeBlockchain}
          >
            <span>🔄</span>
            <span>Retry Connection</span>
          </button>
        </div>
      </div>
    )
  }

  // Show treasury banner only if data loaded
  const treasuryData = treasury || {
    totalBalance: 'Loading...',
    usdValue: 'Loading...',
    allocated: 'Loading...',
    available: 'Loading...',
    monthlyBudget: 'Loading...',
    allocations: []
  }

  return (
    <div className="admin-panel">
      <div className="admin-panel-header">
        <div>
          <h2 className="admin-panel-title">🏛️ Governance & DAO</h2>
          <p className="admin-panel-subtitle">
            Decentralized governance management across all layers
            {userAddress && (
              <span style={{ marginLeft: '12px', fontSize: '13px', color: 'var(--success)' }}>
                ● Connected: {userVotingPower} DWT voting power
              </span>
            )}
          </p>
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
      {treasury && (
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
                  <span className="gov-allocation-amount">{alloc.amount.toLocaleString()} DWT ({alloc.percentage}%)</span>
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
      )}

      {/* Tab Navigation */}
      <div className="gov-tabs">
        <button 
          className={`gov-tab ${activeTab === 'proposals' ? 'active' : ''}`}
          onClick={() => setActiveTab('proposals')}
        >
          📋 Proposals {proposals.length > 0 && `(${proposals.length})`}
        </button>
        <button 
          className={`gov-tab ${activeTab === 'timelock' ? 'active' : ''}`}
          onClick={() => setActiveTab('timelock')}
        >
          ⏱️ Timelock Queue {timelockQueue.length > 0 && `(${timelockQueue.length})`}
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
          {proposals.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '40px', 
              color: 'var(--text2)',
              background: 'var(--bg2)',
              borderRadius: '12px',
              border: '2px dashed var(--border)'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
              <p>No proposals found</p>
              <p style={{ fontSize: '13px', marginTop: '8px' }}>
                Create the first governance proposal to get started
              </p>
            </div>
          ) : (
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
          )}
        </div>
      )}

      {/* Timelock Queue Tab */}
      {activeTab === 'timelock' && (
        <div className="gov-section">
          <h3 className="gov-section-title">Timelock Queue</h3>
          {timelockQueue.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '40px', 
              color: 'var(--text2)',
              background: 'var(--bg2)',
              borderRadius: '12px',
              border: '2px dashed var(--border)'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏱️</div>
              <p>No proposals in timelock queue</p>
            </div>
          ) : (
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
          )}
        </div>
      )}

      {/* Voting Power Tab */}
      {activeTab === 'voting' && (
        <div className="gov-section">
          <h3 className="gov-section-title">Top veDWT Voters</h3>
          {topVoters.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '40px', 
              color: 'var(--text2)',
              background: 'var(--bg2)',
              borderRadius: '12px',
              border: '2px dashed var(--border)'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🗳️</div>
              <p>No voting data available</p>
              <p style={{ fontSize: '13px', marginTop: '8px' }}>
                Vote locking and delegation will appear here
              </p>
            </div>
          ) : (
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
          )}
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
