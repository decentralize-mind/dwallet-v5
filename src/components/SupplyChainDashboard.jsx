import { useState, useEffect } from 'react'
import { ethers } from 'ethers'

export default function SupplyChainDashboard({ contracts, walletAddress, network }) {
  const [stats, setStats] = useState({
    totalInvoices: 0,
    activeEscrows: 0,
    registeredEntities: 0,
    pendingMilestones: 0,
    totalLiquidity: 0,
    dwtBalance: 0,
    totalSupply: 0
  })
  const [recentInvoices, setRecentInvoices] = useState([])
  const [recentEscrows, setRecentEscrows] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [contracts])

  const loadDashboardData = async () => {
    if (!contracts.INVOICE_NFT) {
      setLoading(false)
      return
    }

    try {
      // Load invoice count
      const invoiceCount = await contracts.INVOICE_NFT.totalSupply()
      
      // Load DWT balance
      if (contracts.DWT_TOKEN && walletAddress) {
        const balance = await contracts.DWT_TOKEN.balanceOf(walletAddress)
        const totalSupply = await contracts.DWT_TOKEN.totalSupply()
        
        setStats(prev => ({
          ...prev,
          dwtBalance: Number(ethers.formatEther(balance)),
          totalSupply: Number(ethers.formatEther(totalSupply))
        }))
      }

      // Load total liquidity
      if (contracts.FINANCING_POOL) {
        const liquidity = await contracts.FINANCING_POOL.getTotalLiquidity()
        setStats(prev => ({
          ...prev,
          totalLiquidity: Number(ethers.formatEther(liquidity))
        }))
      }

      // Load recent invoices
      const invoices = []
      const count = Math.min(Number(invoiceCount), 10)
      for (let i = count - 1; i >= 0; i--) {
        try {
          const invoice = await contracts.INVOICE_NFT.getInvoice(i)
          invoices.push({
            id: i,
            supplier: invoice.supplier,
            buyer: invoice.buyer,
            amount: ethers.formatEther(invoice.amount),
            dueDate: new Date(Number(invoice.dueDate) * 1000).toLocaleDateString(),
            status: ['Pending', 'Approved', 'Paid', 'Disputed'][Number(invoice.status)]
          })
        } catch (e) {
          // Skip invalid invoices
        }
      }
      setRecentInvoices(invoices)

      setStats(prev => ({
        ...prev,
        totalInvoices: Number(invoiceCount)
      }))

      setLoading(false)
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="sc-loading">
        <div className="sc-spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    )
  }

  return (
    <div className="sc-dashboard">
      {/* Stats Grid */}
      <div className="sc-stats-grid">
        <div className="sc-stat-card">
          <div className="sc-stat-icon">📄</div>
          <div className="sc-stat-content">
            <div className="sc-stat-value">{stats.totalInvoices}</div>
            <div className="sc-stat-label">Total Invoices</div>
          </div>
        </div>

        <div className="sc-stat-card">
          <div className="sc-stat-icon">🔒</div>
          <div className="sc-stat-content">
            <div className="sc-stat-value">{stats.activeEscrows}</div>
            <div className="sc-stat-label">Active Escrows</div>
          </div>
        </div>

        <div className="sc-stat-card">
          <div className="sc-stat-icon">👥</div>
          <div className="sc-stat-content">
            <div className="sc-stat-value">{stats.registeredEntities}</div>
            <div className="sc-stat-label">Registered Entities</div>
          </div>
        </div>

        <div className="sc-stat-card">
          <div className="sc-stat-icon">🎯</div>
          <div className="sc-stat-content">
            <div className="sc-stat-value">{stats.pendingMilestones}</div>
            <div className="sc-stat-label">Pending Milestones</div>
          </div>
        </div>

        <div className="sc-stat-card highlight">
          <div className="sc-stat-icon">💰</div>
          <div className="sc-stat-content">
            <div className="sc-stat-value">{stats.totalLiquidity.toLocaleString()}</div>
            <div className="sc-stat-label">Pool Liquidity (DWT)</div>
          </div>
        </div>

        <div className="sc-stat-card highlight">
          <div className="sc-stat-icon">💎</div>
          <div className="sc-stat-content">
            <div className="sc-stat-value">{stats.dwtBalance.toLocaleString()}</div>
            <div className="sc-stat-label">Your DWT Balance</div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="sc-dashboard-sections">
        {/* Recent Invoices */}
        <div className="sc-section">
          <div className="sc-section-header">
            <h2>📄 Recent Invoices</h2>
            <button className="sc-btn-sm">View All →</button>
          </div>
          
          {recentInvoices.length === 0 ? (
            <div className="sc-empty-state">
              <div className="sc-empty-icon">📄</div>
              <p>No invoices yet</p>
              <button className="sc-btn-primary">Create First Invoice</button>
            </div>
          ) : (
            <div className="sc-table-container">
              <table className="sc-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Supplier</th>
                    <th>Buyer</th>
                    <th>Amount</th>
                    <th>Due Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentInvoices.map((inv) => (
                    <tr key={inv.id}>
                      <td>#{inv.id}</td>
                      <td className="sc-address">{inv.supplier.slice(0, 6)}...{inv.supplier.slice(-4)}</td>
                      <td className="sc-address">{inv.buyer.slice(0, 6)}...{inv.buyer.slice(-4)}</td>
                      <td>{Number(inv.amount).toLocaleString()} DWT</td>
                      <td>{inv.dueDate}</td>
                      <td>
                        <span className={`sc-status-badge sc-status-${inv.status.toLowerCase()}`}>
                          {inv.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="sc-section">
          <h2>⚡ Quick Actions</h2>
          <div className="sc-actions-grid">
            <button className="sc-action-card">
              <span className="sc-action-icon">📝</span>
              <span className="sc-action-label">Mint Invoice</span>
            </button>
            <button className="sc-action-card">
              <span className="sc-action-icon">🔐</span>
              <span className="sc-action-label">Create Escrow</span>
            </button>
            <button className="sc-action-card">
              <span className="sc-action-icon">👤</span>
              <span className="sc-action-label">Register Entity</span>
            </button>
            <button className="sc-action-card">
              <span className="sc-action-icon">💰</span>
              <span className="sc-action-label">Request Loan</span>
            </button>
          </div>
        </div>

        {/* System Status */}
        <div className="sc-section">
          <h2>📊 System Status</h2>
          <div className="sc-status-grid">
            <div className="sc-status-item">
              <div className="sc-status-label">Network</div>
              <div className="sc-status-value">
                {network ? `Chain ID: ${network.chainId}` : 'Not Connected'}
              </div>
            </div>
            <div className="sc-status-item">
              <div className="sc-status-label">Wallet</div>
              <div className="sc-status-value">
                {walletAddress ? `${walletAddress.slice(0, 10)}...` : 'Not Connected'}
              </div>
            </div>
            <div className="sc-status-item">
              <div className="sc-status-label">Contracts</div>
              <div className="sc-status-value">
                {Object.keys(contracts).length} Active
              </div>
            </div>
            <div className="sc-status-item">
              <div className="sc-status-label">Total Supply</div>
              <div className="sc-status-value">
                {stats.totalSupply.toLocaleString()} DWT
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
