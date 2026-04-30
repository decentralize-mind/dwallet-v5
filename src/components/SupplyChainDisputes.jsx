import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { LAYER11_ADDRESSES, LAYER11_ABIS } from '../config/layer11-contracts'

export default function SupplyChainDisputes({ signer, walletAddress }) {
  const [disputes, setDisputes] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedDispute, setSelectedDispute] = useState(null)
  const [evidence, setEvidence] = useState('')
  const [vote, setVote] = useState(null)

  const disputeContract = new ethers.Contract(
    LAYER11_ADDRESSES.baseSepolia.DISPUTE_RESOLUTION,
    LAYER11_ABIS.DISPUTE_RESOLUTION,
    signer
  )

  useEffect(() => {
    loadDisputes()
  }, [signer])

  const loadDisputes = async () => {
    try {
      // In a real app, you'd get total disputes from contract events
      // For now, we'll show a placeholder
      setDisputes([])
      setLoading(false)
    } catch (error) {
      console.error('Failed to load disputes:', error)
      setLoading(false)
    }
  }

  const createDispute = async (escrowId, evidence) => {
    try {
      const tx = await disputeContract.createDispute(escrowId, evidence)
      await tx.wait()
      alert('✅ Dispute created successfully!')
      loadDisputes()
    } catch (error) {
      console.error('Failed to create dispute:', error)
      alert('❌ Failed to create dispute: ' + error.message)
    }
  }

  const submitEvidence = async (disputeId, evidence) => {
    try {
      const tx = await disputeContract.submitEvidence(disputeId, evidence)
      await tx.wait()
      alert('✅ Evidence submitted successfully!')
      loadDisputes()
    } catch (error) {
      console.error('Failed to submit evidence:', error)
      alert('❌ Failed to submit evidence: ' + error.message)
    }
  }

  const voteResolution = async (disputeId, voteForBuyer) => {
    try {
      const tx = await disputeContract.voteResolution(disputeId, voteForBuyer)
      await tx.wait()
      alert('✅ Vote submitted successfully!')
      loadDisputes()
    } catch (error) {
      console.error('Failed to vote:', error)
      alert('❌ Failed to vote: ' + error.message)
    }
  }

  const executeResolution = async (disputeId) => {
    try {
      const tx = await disputeContract.executeResolution(disputeId)
      await tx.wait()
      alert('✅ Resolution executed successfully!')
      loadDisputes()
    } catch (error) {
      console.error('Failed to execute resolution:', error)
      alert('❌ Failed to execute resolution: ' + error.message)
    }
  }

  if (loading) {
    return <div className="sc-loading"><p>Loading disputes...</p></div>
  }

  return (
    <div className="sc-disputes">
      <div className="sc-section-header">
        <h2>⚖️ Dispute Resolution</h2>
        <button className="sc-btn-primary" onClick={() => createDispute(prompt('Escrow ID:'), prompt('Evidence:'))}>
          Create New Dispute
        </button>
      </div>

      {disputes.length === 0 ? (
        <div className="sc-empty-state">
          <div className="sc-empty-icon">⚖️</div>
          <p>No disputes yet</p>
          <p className="sc-text-muted">Disputes will appear here when created</p>
        </div>
      ) : (
        <div className="sc-disputes-grid">
          {disputes.map((dispute) => (
            <div key={dispute.id} className="sc-dispute-card">
              <div className="sc-dispute-header">
                <h3>Dispute #{dispute.id}</h3>
                <span className={`sc-status-badge sc-status-${dispute.status.toLowerCase()}`}>
                  {dispute.status}
                </span>
              </div>
              
              <div className="sc-dispute-details">
                <p><strong>Escrow ID:</strong> #{dispute.escrowId}</p>
                <p><strong>Created:</strong> {new Date(dispute.createdAt * 1000).toLocaleDateString()}</p>
                <p><strong>Buyer Wins:</strong> {dispute.buyerWins ? 'Yes' : 'No'}</p>
                <p><strong>Votes For Buyer:</strong> {dispute.votesForBuyer.toString()}</p>
                <p><strong>Votes For Supplier:</strong> {dispute.votesForSupplier.toString()}</p>
              </div>

              <div className="sc-dispute-actions">
                <button 
                  className="sc-btn-sm"
                  onClick={() => submitEvidence(dispute.id, prompt('Enter evidence:'))}
                >
                  Submit Evidence
                </button>
                <button 
                  className="sc-btn-sm"
                  onClick={() => voteResolution(dispute.id, true)}
                >
                  Vote for Buyer
                </button>
                <button 
                  className="sc-btn-sm"
                  onClick={() => voteResolution(dispute.id, false)}
                >
                  Vote for Supplier
                </button>
                <button 
                  className="sc-btn-sm sc-btn-warning"
                  onClick={() => executeResolution(dispute.id)}
                >
                  Execute Resolution
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="sc-section">
        <h3>📊 Dispute Statistics</h3>
        <div className="sc-stats-grid">
          <div className="sc-stat-card">
            <div className="sc-stat-value">{disputes.length}</div>
            <div className="sc-stat-label">Total Disputes</div>
          </div>
          <div className="sc-stat-card">
            <div className="sc-stat-value">
              {disputes.filter(d => d.status === 'Active').length}
            </div>
            <div className="sc-stat-label">Active Disputes</div>
          </div>
          <div className="sc-stat-card">
            <div className="sc-stat-value">
              {disputes.filter(d => d.status === 'Resolved').length}
            </div>
            <div className="sc-stat-label">Resolved</div>
          </div>
        </div>
      </div>
    </div>
  )
}
