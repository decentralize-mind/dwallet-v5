import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { LAYER11_ADDRESSES, LAYER11_ABIS } from '../config/layer11-contracts'

export default function SupplyChainInsurance({ signer, walletAddress }) {
  const [poolBalance, setPoolBalance] = useState(0)
  const [solvencyRatio, setSolvencyRatio] = useState(0)
  const [policies, setPolicies] = useState([])
  const [claims, setClaims] = useState([])
  const [loading, setLoading] = useState(true)

  const insuranceContract = new ethers.Contract(
    LAYER11_ADDRESSES.baseSepolia.INSURANCE,
    LAYER11_ABIS.INSURANCE,
    signer
  )

  useEffect(() => {
    loadInsuranceData()
  }, [signer])

  const loadInsuranceData = async () => {
    try {
      const balance = await insuranceContract.getTotalPoolBalance()
      const ratio = await insuranceContract.getMinimumSolvencyRatio()
      
      setPoolBalance(Number(ethers.formatEther(balance)))
      setSolvencyRatio(Number(ratio))
      setPolicies([])
      setClaims([])
      setLoading(false)
    } catch (error) {
      console.error('Failed to load insurance data:', error)
      setLoading(false)
    }
  }

  const purchasePolicy = async (invoiceId, coverageAmount, premium) => {
    try {
      const tx = await insuranceContract.purchasePolicy(invoiceId, coverageAmount, {
        value: ethers.parseEther(premium.toString())
      })
      await tx.wait()
      alert('✅ Insurance policy purchased successfully!')
      loadInsuranceData()
    } catch (error) {
      console.error('Failed to purchase policy:', error)
      alert('❌ Failed to purchase policy: ' + error.message)
    }
  }

  const fileClaim = async (policyId, claimReason, evidence) => {
    try {
      const tx = await insuranceContract.fileClaim(policyId, claimReason, evidence)
      await tx.wait()
      alert('✅ Claim filed successfully!')
      loadInsuranceData()
    } catch (error) {
      console.error('Failed to file claim:', error)
      alert('❌ Failed to file claim: ' + error.message)
    }
  }

  const approveClaim = async (claimId) => {
    try {
      const tx = await insuranceContract.approveClaim(claimId)
      await tx.wait()
      alert('✅ Claim approved successfully!')
      loadInsuranceData()
    } catch (error) {
      console.error('Failed to approve claim:', error)
      alert('❌ Failed to approve claim: ' + error.message)
    }
  }

  const rejectClaim = async (claimId) => {
    try {
      const tx = await insuranceContract.rejectClaim(claimId)
      await tx.wait()
      alert('✅ Claim rejected')
      loadInsuranceData()
    } catch (error) {
      console.error('Failed to reject claim:', error)
      alert('❌ Failed to reject claim: ' + error.message)
    }
  }

  if (loading) {
    return <div className="sc-loading"><p>Loading insurance data...</p></div>
  }

  return (
    <div className="sc-insurance">
      <div className="sc-section-header">
        <h2>🛡️ Supply Chain Insurance</h2>
        <button 
          className="sc-btn-primary"
          onClick={() => purchasePolicy(
            prompt('Invoice ID:'),
            prompt('Coverage Amount (DWT):'),
            prompt('Premium (ETH):')
          )}
        >
          Purchase Policy
        </button>
      </div>

      {/* Pool Status */}
      <div className="sc-stats-grid">
        <div className="sc-stat-card highlight">
          <div className="sc-stat-icon">💰</div>
          <div className="sc-stat-content">
            <div className="sc-stat-value">{poolBalance.toLocaleString()}</div>
            <div className="sc-stat-label">Pool Balance (DWT)</div>
          </div>
        </div>

        <div className="sc-stat-card highlight">
          <div className="sc-stat-icon">📊</div>
          <div className="sc-stat-content">
            <div className="sc-stat-value">{solvencyRatio}%</div>
            <div className="sc-stat-label">Min Solvency Ratio</div>
          </div>
        </div>

        <div className="sc-stat-card">
          <div className="sc-stat-icon">📄</div>
          <div className="sc-stat-content">
            <div className="sc-stat-value">{policies.length}</div>
            <div className="sc-stat-label">Active Policies</div>
          </div>
        </div>

        <div className="sc-stat-card">
          <div className="sc-stat-icon">⚠️</div>
          <div className="sc-stat-content">
            <div className="sc-stat-value">{claims.length}</div>
            <div className="sc-stat-label">Pending Claims</div>
          </div>
        </div>
      </div>

      {/* Policies */}
      <div className="sc-section">
        <h3>📄 Insurance Policies</h3>
        {policies.length === 0 ? (
          <div className="sc-empty-state">
            <div className="sc-empty-icon">🛡️</div>
            <p>No insurance policies yet</p>
            <button 
              className="sc-btn-primary"
              onClick={() => purchasePolicy(prompt('Invoice ID:'), prompt('Coverage:'), prompt('Premium:'))}
            >
              Purchase First Policy
            </button>
          </div>
        ) : (
          <div className="sc-table-container">
            <table className="sc-table">
              <thead>
                <tr>
                  <th>Policy ID</th>
                  <th>Invoice ID</th>
                  <th>Coverage</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {policies.map((policy) => (
                  <tr key={policy.id}>
                    <td>#{policy.id}</td>
                    <td>#{policy.invoiceId}</td>
                    <td>{policy.coverage.toLocaleString()} DWT</td>
                    <td>
                      <span className={`sc-status-badge sc-status-${policy.status.toLowerCase()}`}>
                        {policy.status}
                      </span>
                    </td>
                    <td>
                      <button 
                        className="sc-btn-sm"
                        onClick={() => fileClaim(policy.id, prompt('Reason:'), prompt('Evidence:'))}
                      >
                        File Claim
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Claims */}
      <div className="sc-section">
        <h3>⚠️ Insurance Claims</h3>
        {claims.length === 0 ? (
          <div className="sc-empty-state">
            <div className="sc-empty-icon">✅</div>
            <p>No claims filed</p>
          </div>
        ) : (
          <div className="sc-claims-grid">
            {claims.map((claim) => (
              <div key={claim.id} className="sc-claim-card">
                <div className="sc-claim-header">
                  <h4>Claim #{claim.id}</h4>
                  <span className={`sc-status-badge sc-status-${claim.status.toLowerCase()}`}>
                    {claim.status}
                  </span>
                </div>
                
                <div className="sc-claim-details">
                  <p><strong>Policy ID:</strong> #{claim.policyId}</p>
                  <p><strong>Reason:</strong> {claim.reason}</p>
                  <p><strong>Filed:</strong> {new Date(claim.filedAt * 1000).toLocaleDateString()}</p>
                </div>

                <div className="sc-claim-actions">
                  <button 
                    className="sc-btn-sm sc-btn-success"
                    onClick={() => approveClaim(claim.id)}
                  >
                    Approve Claim
                  </button>
                  <button 
                    className="sc-btn-sm sc-btn-danger"
                    onClick={() => rejectClaim(claim.id)}
                  >
                    Reject Claim
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
