import { useState, useEffect } from 'react'
import { ethers } from 'ethers'

export default function SupplyChainEscrows({ contracts }) {
  const [escrows, setEscrows] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [formData, setFormData] = useState({
    invoiceId: '',
    supplier: '',
    amount: ''
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadEscrows()
  }, [contracts])

  const loadEscrows = async () => {
    if (!contracts.ESCROW) {
      setLoading(false)
      return
    }

    try {
      // In production, you'd track escrow IDs via events
      // For now, we'll show empty state
      setEscrows([])
      setLoading(false)
    } catch (error) {
      console.error('Failed to load escrows:', error)
      setLoading(false)
    }
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const tx = await contracts.ESCROW.createEscrow(
        formData.invoiceId,
        formData.supplier,
        ethers.parseEther(formData.amount)
      )
      
      await tx.wait()
      alert('✅ Escrow created successfully!')
      setShowCreateModal(false)
      setFormData({ invoiceId: '', supplier: '', amount: '' })
      loadEscrows()
    } catch (error) {
      alert('❌ Failed: ' + error.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleRelease = async (escrowId) => {
    try {
      const tx = await contracts.ESCROW.releaseFunds(escrowId)
      await tx.wait()
      alert('✅ Funds released!')
      loadEscrows()
    } catch (error) {
      alert('❌ Failed: ' + error.message)
    }
  }

  const handleConfirmDelivery = async (escrowId) => {
    try {
      const tx = await contracts.ESCROW.confirmDelivery(escrowId, 'ipfs://delivery-proof')
      await tx.wait()
      alert('✅ Delivery confirmed!')
      loadEscrows()
    } catch (error) {
      alert('❌ Failed: ' + error.message)
    }
  }

  if (loading) {
    return <div className="sc-loading"><div className="sc-spinner"></div><p>Loading escrows...</p></div>
  }

  return (
    <div className="sc-dashboard">
      {/* Stats Overview */}
      <div className="sc-stats-grid">
        <div className="sc-stat-card">
          <div className="sc-stat-icon">🔒</div>
          <div className="sc-stat-content">
            <div className="sc-stat-value">{escrows.length}</div>
            <div className="sc-stat-label">Total Escrows</div>
          </div>
        </div>

        <div className="sc-stat-card">
          <div className="sc-stat-icon">⏳</div>
          <div className="sc-stat-content">
            <div className="sc-stat-value">{escrows.filter(e => e.status === 'Active').length}</div>
            <div className="sc-stat-label">Active Escrows</div>
          </div>
        </div>

        <div className="sc-stat-card">
          <div className="sc-stat-icon">✓</div>
          <div className="sc-stat-content">
            <div className="sc-stat-value">{escrows.filter(e => e.status === 'Completed').length}</div>
            <div className="sc-stat-label">Completed</div>
          </div>
        </div>

        <div className="sc-stat-card highlight">
          <div className="sc-stat-icon">💰</div>
          <div className="sc-stat-content">
            <div className="sc-stat-value">{escrows.reduce((sum, e) => sum + Number(e.amount || 0), 0).toLocaleString()}</div>
            <div className="sc-stat-label">Total Value (DWT)</div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="sc-dashboard-sections">
        <div className="sc-section">
          <div className="sc-section-header">
            <h2>🔒 Escrow Management</h2>
            <button className="sc-btn-primary" onClick={() => setShowCreateModal(true)}>
              + Create Escrow
            </button>
          </div>

          {escrows.length === 0 ? (
            <div className="sc-empty-state">
              <div className="sc-empty-icon">🔒</div>
              <p>No escrows found</p>
              <button className="sc-btn-primary" onClick={() => setShowCreateModal(true)}>
                Create First Escrow
              </button>
            </div>
          ) : (
            <div className="sc-table-container">
              <table className="sc-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Buyer</th>
                    <th>Supplier</th>
                    <th>Amount</th>
                    <th>Invoice ID</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {escrows.map((escrow) => (
                    <tr key={escrow.id}>
                      <td>#{escrow.id}</td>
                      <td className="sc-address">{escrow.buyer.slice(0, 6)}...{escrow.buyer.slice(-4)}</td>
                      <td className="sc-address">{escrow.supplier.slice(0, 6)}...{escrow.supplier.slice(-4)}</td>
                      <td>{escrow.amount} DWT</td>
                      <td>#{escrow.invoiceId}</td>
                      <td>
                        <span className={`sc-status-badge sc-status-${escrow.status.toLowerCase()}`}>
                          {escrow.status}
                        </span>
                      </td>
                      <td>
                        <div className="sc-action-btns">
                          <button className="sc-btn-sm sc-btn-success" onClick={() => handleConfirmDelivery(escrow.id)}>
                            Confirm Delivery
                          </button>
                          <button className="sc-btn-sm" onClick={() => handleRelease(escrow.id)}>
                            Release Funds
                          </button>
                        </div>
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
            <button className="sc-action-card" onClick={() => setShowCreateModal(true)}>
              <span className="sc-action-icon">🔐</span>
              <span className="sc-action-label">Create Escrow</span>
            </button>
            <button className="sc-action-card">
              <span className="sc-action-icon">📋</span>
              <span className="sc-action-label">View Contracts</span>
            </button>
            <button className="sc-action-card">
              <span className="sc-action-icon">⚠️</span>
              <span className="sc-action-label">Report Issue</span>
            </button>
            <button className="sc-action-card">
              <span className="sc-action-icon">📊</span>
              <span className="sc-action-label">Analytics</span>
            </button>
          </div>
        </div>
      </div>

      {/* Create Escrow Modal */}
      {showCreateModal && (
        <div className="sc-modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="sc-modal" onClick={(e) => e.stopPropagation()}>
            <div className="sc-modal-header">
              <h3>🔐 Create Escrow</h3>
              <button className="sc-modal-close" onClick={() => setShowCreateModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreate} className="sc-modal-body">
              <div className="sc-form-group">
                <label>Invoice ID</label>
                <input
                  type="number"
                  value={formData.invoiceId}
                  onChange={(e) => setFormData({...formData, invoiceId: e.target.value})}
                  placeholder="123"
                  required
                />
              </div>
              <div className="sc-form-group">
                <label>Supplier Address</label>
                <input
                  type="text"
                  value={formData.supplier}
                  onChange={(e) => setFormData({...formData, supplier: e.target.value})}
                  placeholder="0x..."
                  required
                />
              </div>
              <div className="sc-form-group">
                <label>Amount (DWT)</label>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({...formData, amount: e.target.value})}
                  placeholder="50000"
                  required
                />
              </div>
              <div className="sc-modal-footer">
                <button type="button" className="sc-btn-secondary" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="sc-btn-primary" disabled={submitting}>
                  {submitting ? 'Creating...' : 'Create Escrow'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
