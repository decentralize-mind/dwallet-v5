import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { LAYER11_ADDRESSES, LAYER11_ABIS } from '../config/layer11-contracts'

export default function SupplyChainReturns({ signer, walletAddress }) {
  const [returnRequests, setReturnRequests] = useState([])
  const [loading, setLoading] = useState(true)

  const returnsContract = new ethers.Contract(
    LAYER11_ADDRESSES.baseSepolia.RETURNS,
    LAYER11_ABIS.RETURNS,
    signer
  )

  useEffect(() => {
    loadReturns()
  }, [signer])

  const loadReturns = async () => {
    try {
      setReturnRequests([])
      setLoading(false)
    } catch (error) {
      console.error('Failed to load returns:', error)
      setLoading(false)
    }
  }

  const requestReturn = async (invoiceId, reason, amount) => {
    try {
      const tx = await returnsContract.requestReturn(invoiceId, reason, amount)
      await tx.wait()
      alert('✅ Return request submitted successfully!')
      loadReturns()
    } catch (error) {
      console.error('Failed to request return:', error)
      alert('❌ Failed to request return: ' + error.message)
    }
  }

  const approveReturn = async (returnId, notes) => {
    try {
      const tx = await returnsContract.approveReturnAndRefund(returnId, notes)
      await tx.wait()
      alert('✅ Return approved and refund processed!')
      loadReturns()
    } catch (error) {
      console.error('Failed to approve return:', error)
      alert('❌ Failed to approve return: ' + error.message)
    }
  }

  const rejectReturn = async (returnId, notes) => {
    try {
      const tx = await returnsContract.rejectReturn(returnId, notes)
      await tx.wait()
      alert('✅ Return rejected')
      loadReturns()
    } catch (error) {
      console.error('Failed to reject return:', error)
      alert('❌ Failed to reject return: ' + error.message)
    }
  }

  if (loading) {
    return <div className="sc-loading"><p>Loading returns...</p></div>
  }

  return (
    <div className="sc-returns">
      <div className="sc-section-header">
        <h2>↩️ Returns & Refunds</h2>
        <button 
          className="sc-btn-primary"
          onClick={() => requestReturn(
            prompt('Invoice ID:'),
            prompt('Return Reason:'),
            prompt('Refund Amount (DWT):')
          )}
        >
          Request Return
        </button>
      </div>

      {returnRequests.length === 0 ? (
        <div className="sc-empty-state">
          <div className="sc-empty-icon">↩️</div>
          <p>No return requests</p>
          <p className="sc-text-muted">Return requests will appear here when submitted</p>
        </div>
      ) : (
        <div className="sc-returns-grid">
          {returnRequests.map((ret) => (
            <div key={ret.id} className="sc-return-card">
              <div className="sc-return-header">
                <h3>Return #{ret.id}</h3>
                <span className={`sc-status-badge sc-status-${ret.status.toLowerCase()}`}>
                  {ret.status}
                </span>
              </div>

              <div className="sc-return-details">
                <p><strong>Invoice ID:</strong> #{ret.invoiceId}</p>
                <p><strong>Reason:</strong> {ret.reason}</p>
                <p><strong>Refund Amount:</strong> {ret.amount.toLocaleString()} DWT</p>
                <p><strong>Requested:</strong> {new Date(ret.requestedAt * 1000).toLocaleDateString()}</p>
                <p><strong>Status:</strong> {ret.status}</p>
              </div>

              <div className="sc-return-actions">
                <button 
                  className="sc-btn-sm sc-btn-success"
                  onClick={() => approveReturn(ret.id, prompt('Approval Notes:'))}
                >
                  Approve & Refund
                </button>
                <button 
                  className="sc-btn-sm sc-btn-danger"
                  onClick={() => rejectReturn(ret.id, prompt('Rejection Notes:'))}
                >
                  Reject Return
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="sc-section">
        <h3>📊 Return Statistics</h3>
        <div className="sc-stats-grid">
          <div className="sc-stat-card">
            <div className="sc-stat-value">{returnRequests.length}</div>
            <div className="sc-stat-label">Total Returns</div>
          </div>
          <div className="sc-stat-card">
            <div className="sc-stat-value">
              {returnRequests.filter(r => r.status === 'Pending').length}
            </div>
            <div className="sc-stat-label">Pending</div>
          </div>
          <div className="sc-stat-card">
            <div className="sc-stat-value">
              {returnRequests.filter(r => r.status === 'Approved').length}
            </div>
            <div className="sc-stat-label">Approved</div>
          </div>
          <div className="sc-stat-card">
            <div className="sc-stat-value">
              {returnRequests.filter(r => r.status === 'Rejected').length}
            </div>
            <div className="sc-stat-label">Rejected</div>
          </div>
        </div>
      </div>
    </div>
  )
}
