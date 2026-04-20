import { useState } from 'react'
import { ethers } from 'ethers'
import { useWallet } from '../../hooks/useWallet'
import adminAPI from '../../services/adminAPI'
import '../../styles/admin-settings.css'

export default function TokenManagement() {
  const { provider, currentAddress } = useWallet()
  const [showMintModal, setShowMintModal] = useState(false)
  const [showBurnModal, setShowBurnModal] = useState(false)
  const [mintAmount, setMintAmount] = useState('')
  const [burnAmount, setBurnAmount] = useState('')
  const [mintAddress, setMintAddress] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  const tokenStats = {
    totalSupply: '67,500,000',
    circulatingSupply: '45,000,000',
    burnedTokens: '2,500,000',
    holders: 1247,
    marketCap: '$236.25M',
    price: '$3.50'
  }

  const handleMint = async () => {
    if (!mintAmount || !mintAddress) {
      alert('Please fill in all fields')
      return
    }

    setActionLoading(true)
    try {
      // Validate address format
      if (!ethers.isAddress(mintAddress)) {
        alert('Invalid Ethereum address')
        return
      }

      // Call backend API
      await adminAPI.post('/api/admin/tokens/mint', {
        address: mintAddress,
        amount: mintAmount
      })
      
      alert(`✅ Successfully minted ${mintAmount} DWT`)
      setShowMintModal(false)
      setMintAmount('')
      setMintAddress('')
    } catch (error) {
      console.error('Mint failed:', error)
      alert(`❌ Mint failed: ${error.message}`)
    } finally {
      setActionLoading(false)
    }
  }

  const handleBurn = async () => {
    if (!burnAmount) {
      alert('Please enter burn amount')
      return
    }

    setActionLoading(true)
    try {
      // Call backend API
      await adminAPI.post('/api/admin/tokens/burn', {
        amount: burnAmount,
        reason: 'Admin burn request'
      })
      
      alert(`✅ Successfully burned ${burnAmount} DWT`)
      setShowBurnModal(false)
      setBurnAmount('')
    } catch (error) {
      console.error('Burn failed:', error)
      alert(`❌ Burn failed: ${error.message}`)
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div className="admin-panel">
      <div className="admin-panel-header">
        <h2 className="admin-panel-title">Token Management</h2>
        <span className="admin-panel-badge">DWT Token</span>
      </div>

      {/* Token Stats - Compact Table */}
      <table className="admin-metrics-table">
        <tbody>
          <tr>
            <td className="admin-metric-cell">
              <span className="admin-metric-icon">💎</span>
              <span className="admin-metric-label">Total Supply</span>
            </td>
            <td className="admin-metric-value-cell">
              {tokenStats.totalSupply}
            </td>
            <td className="admin-metric-cell">
              <span className="admin-metric-icon">🔄</span>
              <span className="admin-metric-label">Circulating</span>
            </td>
            <td className="admin-metric-value-cell">
              {tokenStats.circulatingSupply}
            </td>
          </tr>
          <tr>
            <td className="admin-metric-cell">
              <span className="admin-metric-icon">🔥</span>
              <span className="admin-metric-label">Burned</span>
            </td>
            <td className="admin-metric-value-cell">
              {tokenStats.burnedTokens}
            </td>
            <td className="admin-metric-cell">
              <span className="admin-metric-icon">👥</span>
              <span className="admin-metric-label">Holders</span>
            </td>
            <td className="admin-metric-value-cell">
              {tokenStats.holders.toLocaleString()}
            </td>
          </tr>
          <tr>
            <td className="admin-metric-cell">
              <span className="admin-metric-icon">💰</span>
              <span className="admin-metric-label">Market Cap</span>
            </td>
            <td className="admin-metric-value-cell">
              {tokenStats.marketCap}
            </td>
            <td className="admin-metric-cell">
              <span className="admin-metric-icon">📈</span>
              <span className="admin-metric-label">Price</span>
            </td>
            <td className="admin-metric-value-cell">
              {tokenStats.price}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Token Actions */}
      <div className="admin-section">
        <h3 className="admin-section-title">Token Operations</h3>
        <div className="admin-token-actions">
          <button
            className="admin-action-card primary"
            onClick={() => setShowMintModal(true)}
          >
            <span className="admin-action-icon">✨</span>
            <h4>Mint Tokens</h4>
            <p>Create new DWT tokens</p>
          </button>

          <button
            className="admin-action-card danger"
            onClick={() => setShowBurnModal(true)}
          >
            <span className="admin-action-icon">🔥</span>
            <h4>Burn Tokens</h4>
            <p>Permanently remove DWT</p>
          </button>

          <button className="admin-action-card secondary">
            <span className="admin-action-icon">📊</span>
            <h4>View Holders</h4>
            <p>See all token holders</p>
          </button>

          <button className="admin-action-card warning">
            <span className="admin-action-icon">⚠️</span>
            <h4>Freeze Address</h4>
            <p>Block specific address</p>
          </button>
        </div>
      </div>

      {/* Recent Token Transfers */}
      <div className="admin-section">
        <h3 className="admin-section-title">Recent Large Transfers</h3>
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>From</th>
                <th>To</th>
                <th>Amount</th>
                <th>Timestamp</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>0x742d...bEb</td>
                <td>0x5aAe...Aed</td>
                <td>10,000 DWT</td>
                <td>2024-01-20 15:32</td>
                <td><span className="admin-status-badge success">Completed</span></td>
              </tr>
              <tr>
                <td>0xfB69...d359</td>
                <td>0x1234...5678</td>
                <td>5,500 DWT</td>
                <td>2024-01-20 14:15</td>
                <td><span className="admin-status-badge success">Completed</span></td>
              </tr>
              <tr>
                <td>Treasury</td>
                <td>0x9876...dcba</td>
                <td>50,000 DWT</td>
                <td>2024-01-20 12:45</td>
                <td><span className="admin-status-badge success">Completed</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Mint Modal */}
      {showMintModal && (
        <div className="admin-modal-overlay" onClick={() => setShowMintModal(false)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>✨ Mint DWT Tokens</h3>
              <button 
                className="admin-modal-close"
                onClick={() => setShowMintModal(false)}
              >
                ✕
              </button>
            </div>
            
            <div className="admin-modal-content">
              <div className="admin-form-group">
                <label className="admin-form-label">Recipient Address</label>
                <input
                  type="text"
                  className="admin-form-input"
                  placeholder="0x..."
                  value={mintAddress}
                  onChange={(e) => setMintAddress(e.target.value)}
                />
              </div>

              <div className="admin-form-group">
                <label className="admin-form-label">Amount (DWT)</label>
                <input
                  type="number"
                  className="admin-form-input"
                  placeholder="1000"
                  value={mintAmount}
                  onChange={(e) => setMintAmount(e.target.value)}
                  step="0.01"
                  min="0"
                />
              </div>

              <div className="admin-form-warning">
                ⚠️ Minting will increase the total token supply
              </div>

              <div className="admin-modal-actions">
                <button
                  className="admin-btn primary"
                  onClick={handleMint}
                  disabled={actionLoading || !mintAmount || !mintAddress}
                >
                  {actionLoading ? '⏳ Minting...' : '✨ Mint Tokens'}
                </button>
                <button
                  className="admin-btn secondary"
                  onClick={() => setShowMintModal(false)}
                  disabled={actionLoading}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Burn Modal */}
      {showBurnModal && (
        <div className="admin-modal-overlay" onClick={() => setShowBurnModal(false)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header danger">
              <h3>🔥 Burn DWT Tokens</h3>
              <button 
                className="admin-modal-close"
                onClick={() => setShowBurnModal(false)}
              >
                ✕
              </button>
            </div>
            
            <div className="admin-modal-content">
              <div className="admin-form-group">
                <label className="admin-form-label">Amount to Burn (DWT)</label>
                <input
                  type="number"
                  className="admin-form-input"
                  placeholder="1000"
                  value={burnAmount}
                  onChange={(e) => setBurnAmount(e.target.value)}
                  step="0.01"
                  min="0"
                />
              </div>

              <div className="admin-form-warning danger">
                🚨 Burning tokens is IRREVERSIBLE. Tokens will be permanently removed.
              </div>

              <div className="admin-modal-actions">
                <button
                  className="admin-btn danger"
                  onClick={handleBurn}
                  disabled={actionLoading || !burnAmount}
                >
                  {actionLoading ? '⏳ Burning...' : '🔥 Burn Tokens'}
                </button>
                <button
                  className="admin-btn secondary"
                  onClick={() => setShowBurnModal(false)}
                  disabled={actionLoading}
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
