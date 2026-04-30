import { useState, useEffect } from 'react'
import { ethers } from 'ethers'

export default function SupplyChainInvoices({ contracts }) {
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [showMintModal, setShowMintModal] = useState(false)
  const [formData, setFormData] = useState({
    supplier: '',
    buyer: '',
    amount: '',
    dueDate: '',
    metadataURI: ''
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadInvoices()
  }, [contracts])

  const loadInvoices = async () => {
    if (!contracts.INVOICE_NFT) return

    try {
      const totalSupply = await contracts.INVOICE_NFT.totalSupply()
      const loadedInvoices = []

      for (let i = 0; i < Number(totalSupply); i++) {
        try {
          const invoice = await contracts.INVOICE_NFT.getInvoice(i)
          loadedInvoices.push({
            id: i,
            supplier: invoice.supplier,
            buyer: invoice.buyer,
            amount: ethers.formatEther(invoice.amount),
            dueDate: new Date(Number(invoice.dueDate) * 1000).toLocaleDateString(),
            status: ['Pending', 'Approved', 'Paid', 'Disputed'][Number(invoice.status)],
            metadataURI: invoice.metadataURI
          })
        } catch (e) {
          // Skip invalid
        }
      }

      setInvoices(loadedInvoices)
      setLoading(false)
    } catch (error) {
      console.error('Failed to load invoices:', error)
      setLoading(false)
    }
  }

  const handleMint = async (e) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const dueDateTimestamp = Math.floor(new Date(formData.dueDate).getTime() / 1000)
      
      const tx = await contracts.INVOICE_NFT.mintInvoice(
        formData.supplier,
        formData.buyer,
        ethers.parseEther(formData.amount),
        dueDateTimestamp,
        formData.metadataURI || `ipfs://QmDefault${Date.now()}`
      )
      
      await tx.wait()
      alert('✅ Invoice minted successfully!')
      setShowMintModal(false)
      setFormData({ supplier: '', buyer: '', amount: '', dueDate: '', metadataURI: '' })
      loadInvoices()
    } catch (error) {
      alert('❌ Failed: ' + error.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleApprove = async (invoiceId) => {
    try {
      const tx = await contracts.INVOICE_NFT.approveInvoice(invoiceId)
      await tx.wait()
      alert('✅ Invoice approved!')
      loadInvoices()
    } catch (error) {
      alert('❌ Failed: ' + error.message)
    }
  }

  const handlePay = async (invoiceId) => {
    try {
      const tx = await contracts.INVOICE_NFT.payInvoice(invoiceId)
      await tx.wait()
      alert('✅ Invoice paid!')
      loadInvoices()
    } catch (error) {
      alert('❌ Failed: ' + error.message)
    }
  }

  if (loading) {
    return <div className="sc-loading"><div className="sc-spinner"></div><p>Loading invoices...</p></div>
  }

  return (
    <div className="sc-dashboard">
      {/* Stats Overview */}
      <div className="sc-stats-grid">
        <div className="sc-stat-card">
          <div className="sc-stat-icon">📄</div>
          <div className="sc-stat-content">
            <div className="sc-stat-value">{invoices.length}</div>
            <div className="sc-stat-label">Total Invoices</div>
          </div>
        </div>

        <div className="sc-stat-card">
          <div className="sc-stat-icon">⏳</div>
          <div className="sc-stat-content">
            <div className="sc-stat-value">{invoices.filter(i => i.status === 'Pending').length}</div>
            <div className="sc-stat-label">Pending Approval</div>
          </div>
        </div>

        <div className="sc-stat-card">
          <div className="sc-stat-icon">✓</div>
          <div className="sc-stat-content">
            <div className="sc-stat-value">{invoices.filter(i => i.status === 'Approved').length}</div>
            <div className="sc-stat-label">Approved</div>
          </div>
        </div>

        <div className="sc-stat-card highlight">
          <div className="sc-stat-icon">💵</div>
          <div className="sc-stat-content">
            <div className="sc-stat-value">{invoices.filter(i => i.status === 'Paid').length}</div>
            <div className="sc-stat-label">Paid Invoices</div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="sc-dashboard-sections">
        <div className="sc-section">
          <div className="sc-section-header">
            <h2>📄 Invoice Management</h2>
            <button className="sc-btn-primary" onClick={() => setShowMintModal(true)}>
              + Mint New Invoice
            </button>
          </div>

          {invoices.length === 0 ? (
            <div className="sc-empty-state">
              <div className="sc-empty-icon">📄</div>
              <p>No invoices found</p>
              <button className="sc-btn-primary" onClick={() => setShowMintModal(true)}>
                Create First Invoice
              </button>
            </div>
          ) : (
            <div className="sc-table-container">
              <table className="sc-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Supplier</th>
                    <th>Buyer</th>
                    <th>Amount (DWT)</th>
                    <th>Due Date</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv.id}>
                      <td>#{inv.id}</td>
                      <td className="sc-address">{inv.supplier.slice(0, 6)}...{inv.supplier.slice(-4)}</td>
                      <td className="sc-address">{inv.buyer.slice(0, 6)}...{inv.buyer.slice(-4)}</td>
                      <td>{Number(inv.amount).toLocaleString()}</td>
                      <td>{inv.dueDate}</td>
                      <td>
                        <span className={`sc-status-badge sc-status-${inv.status.toLowerCase()}`}>
                          {inv.status}
                        </span>
                      </td>
                      <td>
                        <div className="sc-action-btns">
                          <button className="sc-btn-sm" onClick={() => handleApprove(inv.id)}>
                            Approve
                          </button>
                          <button className="sc-btn-sm sc-btn-success" onClick={() => handlePay(inv.id)}>
                            Pay
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
            <button className="sc-action-card" onClick={() => setShowMintModal(true)}>
              <span className="sc-action-icon">📝</span>
              <span className="sc-action-label">Mint Invoice</span>
            </button>
            <button className="sc-action-card">
              <span className="sc-action-icon">🔍</span>
              <span className="sc-action-label">View Details</span>
            </button>
            <button className="sc-action-card">
              <span className="sc-action-icon">📊</span>
              <span className="sc-action-label">Export Report</span>
            </button>
            <button className="sc-action-card">
              <span className="sc-action-icon">🔔</span>
              <span className="sc-action-label">Set Alerts</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mint Modal */}
      {showMintModal && (
        <div className="sc-modal-overlay" onClick={() => setShowMintModal(false)}>
          <div className="sc-modal" onClick={(e) => e.stopPropagation()}>
            <div className="sc-modal-header">
              <h3>📝 Mint New Invoice</h3>
              <button className="sc-modal-close" onClick={() => setShowMintModal(false)}>✕</button>
            </div>
            <form onSubmit={handleMint} className="sc-modal-body">
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
                <label>Buyer Address</label>
                <input
                  type="text"
                  value={formData.buyer}
                  onChange={(e) => setFormData({...formData, buyer: e.target.value})}
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
              <div className="sc-form-group">
                <label>Due Date</label>
                <input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({...formData, dueDate: e.target.value})}
                  required
                />
              </div>
              <div className="sc-form-group">
                <label>Metadata URI (Optional)</label>
                <input
                  type="text"
                  value={formData.metadataURI}
                  onChange={(e) => setFormData({...formData, metadataURI: e.target.value})}
                  placeholder="ipfs://Qm..."
                />
              </div>
              <div className="sc-modal-footer">
                <button type="button" className="sc-btn-secondary" onClick={() => setShowMintModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="sc-btn-primary" disabled={submitting}>
                  {submitting ? 'Minting...' : 'Mint Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
