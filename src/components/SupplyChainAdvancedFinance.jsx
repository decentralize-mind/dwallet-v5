import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { LAYER11_ADDRESSES, LAYER11_ABIS } from '../config/layer11-contracts'

export default function SupplyChainAdvancedFinance({ signer, walletAddress }) {
  const [financings, setFinancings] = useState([])
  const [poolBalance, setPoolBalance] = useState(0)
  const [loading, setLoading] = useState(true)

  const financeContract = new ethers.Contract(
    LAYER11_ADDRESSES.baseSepolia.ADVANCED_FINANCING,
    LAYER11_ABIS.ADVANCED_FINANCING,
    signer
  )

  useEffect(() => {
    loadFinanceData()
  }, [signer])

  const loadFinanceData = async () => {
    try {
      const balance = await financeContract.totalDeposits()
      setPoolBalance(Number(ethers.formatEther(balance)))
      setFinancings([])
      setLoading(false)
    } catch (error) {
      console.error('Failed to load finance data:', error)
      setLoading(false)
    }
  }

  const requestFinancing = async (invoiceId, amount, financingType) => {
    try {
      const tx = await financeContract.requestFinancing(invoiceId, amount, parseInt(financingType))
      await tx.wait()
      alert('✅ Financing request submitted successfully!')
      loadFinanceData()
    } catch (error) {
      console.error('Failed to request financing:', error)
      alert('❌ Failed to request financing: ' + error.message)
    }
  }

  const approveFinancing = async (financingId) => {
    try {
      const tx = await financeContract.approveFinancing(financingId)
      await tx.wait()
      alert('✅ Financing approved successfully!')
      loadFinanceData()
    } catch (error) {
      console.error('Failed to approve financing:', error)
      alert('❌ Failed to approve financing: ' + error.message)
    }
  }

  const repayFinancing = async (financingId) => {
    try {
      const tx = await financeContract.repayFinancing(financingId)
      await tx.wait()
      alert('✅ Financing repaid successfully!')
      loadFinanceData()
    } catch (error) {
      console.error('Failed to repay financing:', error)
      alert('❌ Failed to repay financing: ' + error.message)
    }
  }

  const depositFunds = async (amount) => {
    try {
      const tx = await financeContract.depositFunds({
        value: ethers.parseEther(amount.toString())
      })
      await tx.wait()
      alert('✅ Funds deposited successfully!')
      loadFinanceData()
    } catch (error) {
      console.error('Failed to deposit funds:', error)
      alert('❌ Failed to deposit funds: ' + error.message)
    }
  }

  const withdrawFunds = async (amount) => {
    try {
      const tx = await financeContract.withdrawFunds(amount)
      await tx.wait()
      alert('✅ Funds withdrawn successfully!')
      loadFinanceData()
    } catch (error) {
      console.error('Failed to withdraw funds:', error)
      alert('❌ Failed to withdraw funds: ' + error.message)
    }
  }

  if (loading) {
    return <div className="sc-loading"><p>Loading financing data...</p></div>
  }

  return (
    <div className="sc-advanced-finance">
      <div className="sc-section-header">
        <h2>💼 Advanced Financing</h2>
        <div className="sc-actions">
          <button 
            className="sc-btn-primary"
            onClick={() => requestFinancing(
              prompt('Invoice ID:'),
              prompt('Amount (DWT):'),
              prompt('Type (0=Invoice, 1=Purchase, 2=Working):')
            )}
          >
            Request Financing
          </button>
          <button 
            className="sc-btn-secondary"
            onClick={() => depositFunds(prompt('Amount (ETH):'))}
          >
            Deposit Funds
          </button>
        </div>
      </div>

      {/* Pool Status */}
      <div className="sc-stats-grid">
        <div className="sc-stat-card highlight">
          <div className="sc-stat-icon">💰</div>
          <div className="sc-stat-content">
            <div className="sc-stat-value">{poolBalance.toLocaleString()}</div>
            <div className="sc-stat-label">Pool Balance (ETH)</div>
          </div>
        </div>

        <div className="sc-stat-card">
          <div className="sc-stat-icon">📄</div>
          <div className="sc-stat-content">
            <div className="sc-stat-value">{financings.length}</div>
            <div className="sc-stat-label">Active Financings</div>
          </div>
        </div>
      </div>

      {/* Financing Requests */}
      <div className="sc-section">
        <h3>💼 Financing Requests</h3>
        {financings.length === 0 ? (
          <div className="sc-empty-state">
            <div className="sc-empty-icon">💼</div>
            <p>No financing requests yet</p>
            <button 
              className="sc-btn-primary"
              onClick={() => requestFinancing(
                prompt('Invoice ID:'),
                prompt('Amount:'),
                prompt('Type (0-2):')
              )}
            >
              Request First Financing
            </button>
          </div>
        ) : (
          <div className="sc-financings-grid">
            {financings.map((fin) => (
              <div key={fin.id} className="sc-financing-card">
                <div className="sc-financing-header">
                  <h4>Financing #{fin.id}</h4>
                  <span className={`sc-status-badge sc-status-${fin.status.toLowerCase()}`}>
                    {fin.status}
                  </span>
                </div>

                <div className="sc-financing-details">
                  <p><strong>Invoice ID:</strong> #{fin.invoiceId}</p>
                  <p><strong>Amount:</strong> {fin.amount.toLocaleString()} DWT</p>
                  <p><strong>Type:</strong> {['Invoice', 'Purchase Order', 'Working Capital'][fin.type]}</p>
                  <p><strong>Interest Rate:</strong> {fin.interestRate}%</p>
                  <p><strong>Duration:</strong> {fin.duration} days</p>
                </div>

                <div className="sc-financing-actions">
                  {fin.status === 'Pending' && (
                    <>
                      <button 
                        className="sc-btn-sm sc-btn-success"
                        onClick={() => approveFinancing(fin.id)}
                      >
                        Approve
                      </button>
                      <button 
                        className="sc-btn-sm sc-btn-danger"
                        onClick={() => {/* reject logic */}}
                      >
                        Reject
                      </button>
                    </>
                  )}
                  {fin.status === 'Active' && (
                    <button 
                      className="sc-btn-sm sc-btn-primary"
                      onClick={() => repayFinancing(fin.id)}
                    >
                      Repay Financing
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Liquidity Management */}
      <div className="sc-section">
        <h3>💧 Liquidity Management</h3>
        <div className="sc-liquidity-actions">
          <div className="sc-liquidity-card">
            <h4>Deposit Funds</h4>
            <p>Add ETH to the financing pool</p>
            <button 
              className="sc-btn-primary"
              onClick={() => depositFunds(prompt('Amount (ETH):'))}
            >
              Deposit
            </button>
          </div>

          <div className="sc-liquidity-card">
            <h4>Withdraw Funds</h4>
            <p>Withdraw your deposited funds</p>
            <button 
              className="sc-btn-secondary"
              onClick={() => withdrawFunds(prompt('Amount:'))}
            >
              Withdraw
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
