import { useState, useEffect } from 'react'
import { ethers } from 'ethers'

export default function SupplyChainFinancing({ contracts, walletAddress }) {
  const [loans, setLoans] = useState([])
  const [liquidity, setLiquidity] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showLoanModal, setShowLoanModal] = useState(false)
  const [showLiquidityModal, setShowLiquidityModal] = useState(false)
  const [loanForm, setLoanForm] = useState({
    invoiceId: '',
    amount: '',
    duration: ''
  })
  const [liquidityForm, setLiquidityForm] = useState({ amount: '' })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadFinancingData()
  }, [contracts])

  const loadFinancingData = async () => {
    if (!contracts.FINANCING_POOL) {
      setLoading(false)
      return
    }

    try {
      const totalLiquidity = await contracts.FINANCING_POOL.getTotalLiquidity()
      setLiquidity(Number(ethers.formatEther(totalLiquidity)))
      setLoans([]) // Load from events in production
      setLoading(false)
    } catch (error) {
      console.error('Failed to load financing data:', error)
      setLoading(false)
    }
  }

  const handleRequestLoan = async (e) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const tx = await contracts.FINANCING_POOL.requestLoan(
        loanForm.invoiceId,
        ethers.parseEther(loanForm.amount),
        loanForm.duration
      )
      
      await tx.wait()
      alert('✅ Loan requested successfully!')
      setShowLoanModal(false)
      setLoanForm({ invoiceId: '', amount: '', duration: '' })
      loadFinancingData()
    } catch (error) {
      alert('❌ Failed: ' + error.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleRepayLoan = async (loanId) => {
    try {
      const tx = await contracts.FINANCING_POOL.repayLoan(loanId)
      await tx.wait()
      alert('✅ Loan repaid successfully!')
      loadFinancingData()
    } catch (error) {
      alert('❌ Failed: ' + error.message)
    }
  }

  const handleProvideLiquidity = async (e) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const tx = await contracts.FINANCING_POOL.provideLiquidity(
        ethers.parseEther(liquidityForm.amount)
      )
      
      await tx.wait()
      alert('✅ Liquidity provided successfully!')
      setShowLiquidityModal(false)
      setLiquidityForm({ amount: '' })
      loadFinancingData()
    } catch (error) {
      alert('❌ Failed: ' + error.message)
    } finally {
      setSubmitting(false)
    }
  }

  const getLoanStatusName = (status) => {
    const statuses = ['Pending', 'Approved', 'Active', 'Repaid', 'Defaulted']
    return statuses[parseInt(status)] || 'Unknown'
  }

  if (loading) {
    return <div className="sc-loading"><div className="sc-spinner"></div><p>Loading financing data...</p></div>
  }

  return (
    <div className="sc-dashboard">
      {/* Stats Overview */}
      <div className="sc-stats-grid">
        <div className="sc-stat-card">
          <div className="sc-stat-icon">💎</div>
          <div className="sc-stat-content">
            <div className="sc-stat-value">{liquidity.toLocaleString()}</div>
            <div className="sc-stat-label">Pool Liquidity (DWT)</div>
          </div>
        </div>

        <div className="sc-stat-card">
          <div className="sc-stat-icon">📊</div>
          <div className="sc-stat-content">
            <div className="sc-stat-value">{loans.length}</div>
            <div className="sc-stat-label">Active Loans</div>
          </div>
        </div>

        <div className="sc-stat-card">
          <div className="sc-stat-icon">✓</div>
          <div className="sc-stat-content">
            <div className="sc-stat-value">{loans.filter(l => getLoanStatusName(l.status) === 'Repaid').length}</div>
            <div className="sc-stat-label">Repaid Loans</div>
          </div>
        </div>

        <div className="sc-stat-card highlight">
          <div className="sc-stat-icon">💰</div>
          <div className="sc-stat-content">
            <div className="sc-stat-value">{loans.reduce((sum, l) => sum + Number(l.principal || 0), 0).toLocaleString()}</div>
            <div className="sc-stat-label">Total Loaned (DWT)</div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="sc-dashboard-sections">
        <div className="sc-section">
          <div className="sc-section-header">
            <h2>💰 Financing & Loans</h2>
            <div className="sc-header-actions">
              <button className="sc-btn-secondary" onClick={() => setShowLiquidityModal(true)}>
                + Provide Liquidity
              </button>
              <button className="sc-btn-primary" onClick={() => setShowLoanModal(true)}>
                + Request Loan
              </button>
            </div>
          </div>

          {/* Loans Table */}
          {loans.length === 0 ? (
            <div className="sc-empty-state">
              <div className="sc-empty-icon">💰</div>
              <p>No loans yet</p>
              <button className="sc-btn-primary" onClick={() => setShowLoanModal(true)}>
                Request First Loan
              </button>
            </div>
          ) : (
            <div className="sc-table-container">
              <table className="sc-table">
                <thead>
                  <tr>
                    <th>Loan ID</th>
                    <th>Borrower</th>
                    <th>Principal</th>
                    <th>Interest</th>
                    <th>Duration</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loans.map((loan) => (
                    <tr key={loan.id}>
                      <td>#{loan.id}</td>
                      <td className="sc-address">{loan.borrower.slice(0, 6)}...{loan.borrower.slice(-4)}</td>
                      <td>{loan.principal} DWT</td>
                      <td>{loan.interest}%</td>
                      <td>{loan.duration} days</td>
                      <td>
                        <span className={`sc-status-badge sc-status-${getLoanStatusName(loan.status).toLowerCase()}`}>
                          {getLoanStatusName(loan.status)}
                        </span>
                      </td>
                      <td>
                        {loan.status === 2 && (
                          <button className="sc-btn-sm sc-btn-success" onClick={() => handleRepayLoan(loan.id)}>
                            Repay
                          </button>
                        )}
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
            <button className="sc-action-card" onClick={() => setShowLoanModal(true)}>
              <span className="sc-action-icon">💵</span>
              <span className="sc-action-label">Request Loan</span>
            </button>
            <button className="sc-action-card" onClick={() => setShowLiquidityModal(true)}>
              <span className="sc-action-icon">💎</span>
              <span className="sc-action-label">Provide Liquidity</span>
            </button>
            <button className="sc-action-card">
              <span className="sc-action-icon">📊</span>
              <span className="sc-action-label">View Analytics</span>
            </button>
            <button className="sc-action-card">
              <span className="sc-action-icon">🏦</span>
              <span className="sc-action-label">Pool Stats</span>
            </button>
          </div>
        </div>
      </div>

      {/* Request Loan Modal */}
      {showLoanModal && (
        <div className="sc-modal-overlay" onClick={() => setShowLoanModal(false)}>
          <div className="sc-modal" onClick={(e) => e.stopPropagation()}>
            <div className="sc-modal-header">
              <h3>💵 Request Loan</h3>
              <button className="sc-modal-close" onClick={() => setShowLoanModal(false)}>✕</button>
            </div>
            <form onSubmit={handleRequestLoan} className="sc-modal-body">
              <div className="sc-form-group">
                <label>Invoice ID (Collateral)</label>
                <input
                  type="number"
                  value={loanForm.invoiceId}
                  onChange={(e) => setLoanForm({...loanForm, invoiceId: e.target.value})}
                  placeholder="123"
                  required
                />
              </div>
              <div className="sc-form-group">
                <label>Loan Amount (DWT)</label>
                <input
                  type="number"
                  value={loanForm.amount}
                  onChange={(e) => setLoanForm({...loanForm, amount: e.target.value})}
                  placeholder="10000"
                  required
                />
              </div>
              <div className="sc-form-group">
                <label>Duration (Days)</label>
                <input
                  type="number"
                  value={loanForm.duration}
                  onChange={(e) => setLoanForm({...loanForm, duration: e.target.value})}
                  placeholder="30"
                  required
                />
              </div>
              <div className="sc-modal-footer">
                <button type="button" className="sc-btn-secondary" onClick={() => setShowLoanModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="sc-btn-primary" disabled={submitting}>
                  {submitting ? 'Requesting...' : 'Request Loan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Provide Liquidity Modal */}
      {showLiquidityModal && (
        <div className="sc-modal-overlay" onClick={() => setShowLiquidityModal(false)}>
          <div className="sc-modal" onClick={(e) => e.stopPropagation()}>
            <div className="sc-modal-header">
              <h3>💎 Provide Liquidity</h3>
              <button className="sc-modal-close" onClick={() => setShowLiquidityModal(false)}>✕</button>
            </div>
            <form onSubmit={handleProvideLiquidity} className="sc-modal-body">
              <div className="sc-form-group">
                <label>Amount (DWT)</label>
                <input
                  type="number"
                  value={liquidityForm.amount}
                  onChange={(e) => setLiquidityForm({...liquidityForm, amount: e.target.value})}
                  placeholder="50000"
                  required
                />
              </div>
              <div className="sc-modal-footer">
                <button type="button" className="sc-btn-secondary" onClick={() => setShowLiquidityModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="sc-btn-primary" disabled={submitting}>
                  {submitting ? 'Providing...' : 'Provide Liquidity'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
