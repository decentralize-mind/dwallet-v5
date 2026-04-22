import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { useWallet } from '../../hooks/useWallet'
import adminAPI from '../../services/adminAPI'
import dwtTokenService from '../../services/dwtTokenService'
import '../../styles/admin-settings.css'

export default function TokenManagement() {
  const { wallet, provider: walletProvider, currentAddress } = useWallet()
  const [showMintModal, setShowMintModal] = useState(false)
  const [showBurnModal, setShowBurnModal] = useState(false)
  const [showHoldersModal, setShowHoldersModal] = useState(false)
  const [showFreezeModal, setShowFreezeModal] = useState(false)
  const [mintAmount, setMintAmount] = useState('')
  const [burnAmount, setBurnAmount] = useState('')
  const [mintAddress, setMintAddress] = useState('')
  const [freezeAddress, setFreezeAddress] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [tokenStats, setTokenStats] = useState({
    totalSupply: '0',
    maxSupply: '0',
    circulatingSupply: '0',
    burnedTokens: '0',
    holders: 0,
    marketCap: '$0',
    price: '$0'
  })
  const [error, setError] = useState(null)
  const [txStatus, setTxStatus] = useState(null) // { type, hash, status, message }
  const [holders, setHolders] = useState([])
  const [freezeStatus, setFreezeStatus] = useState(null)

  // Create signer from wallet
  const signer = wallet && walletProvider 
    ? walletProvider.getSigner ? walletProvider.getSigner() : walletProvider 
    : null

  // Fetch real token data from blockchain
  useEffect(() => {
    let mounted = true

    async function fetchTokenData() {
      try {
        setLoading(true)
        setError(null)
        
        const stats = await dwtTokenService.getTokenStats()
        
        if (mounted) {
          // Format numbers for display
          setTokenStats({
            totalSupply: dwtTokenService.formatNumber(stats.totalSupply),
            maxSupply: dwtTokenService.formatNumber(stats.maxSupply),
            circulatingSupply: dwtTokenService.formatNumber(stats.circulatingSupply),
            burnedTokens: dwtTokenService.formatNumber(stats.burnedTokens),
            holders: stats.holderCount > 0 ? stats.holderCount : 'N/A',
            marketCap: stats.marketCap !== '0' ? stats.marketCap : 'N/A',
            price: stats.price !== '0' ? stats.price : 'N/A'
          })
        }
      } catch (err) {
        console.error('Failed to fetch token data:', err)
        if (mounted) {
          setError('Failed to load token data from blockchain')
          // Fallback to show error state
          setTokenStats({
            totalSupply: 'Error',
            maxSupply: 'Error',
            circulatingSupply: 'Error',
            burnedTokens: 'Error',
            holders: 'Error',
            marketCap: 'Error',
            price: 'Error'
          })
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    fetchTokenData()
    
    // Refresh data every 30 seconds
    const interval = setInterval(fetchTokenData, 30000)
    
    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [])

  const handleMint = async () => {
    if (!mintAmount || !mintAddress) {
      alert('Please fill in all fields')
      return
    }

    if (!signer) {
      alert('Please connect your wallet first')
      return
    }

    setActionLoading(true)
    setTxStatus({ type: 'mint', status: 'pending', message: 'Initiating mint transaction...' })
    
    try {
      // Validate address format
      if (!ethers.isAddress(mintAddress)) {
        throw new Error('Invalid Ethereum address')
      }

      setTxStatus({ type: 'mint', status: 'processing', message: 'Please confirm transaction in your wallet...' })
      
      // Call smart contract mint function
      const result = await dwtTokenService.mintTokens(signer, mintAddress, mintAmount)
      
      setTxStatus({ 
        type: 'mint', 
        status: 'success', 
        message: `Successfully minted ${mintAmount} DWT to ${mintAddress.slice(0, 6)}...${mintAddress.slice(-4)}`,
        hash: result.hash
      })
      
      // Refresh token stats
      const stats = await dwtTokenService.getTokenStats()
      setTokenStats({
        totalSupply: dwtTokenService.formatNumber(stats.totalSupply),
        maxSupply: dwtTokenService.formatNumber(stats.maxSupply),
        circulatingSupply: dwtTokenService.formatNumber(stats.circulatingSupply),
        burnedTokens: dwtTokenService.formatNumber(stats.burnedTokens),
        holders: stats.holderCount > 0 ? stats.holderCount : 'N/A',
        marketCap: stats.marketCap !== '0' ? stats.marketCap : 'N/A',
        price: stats.price !== '0' ? stats.price : 'N/A'
      })
      
      setShowMintModal(false)
      setMintAmount('')
      setMintAddress('')
      
      // Clear status after 5 seconds
      setTimeout(() => setTxStatus(null), 5000)
    } catch (error) {
      console.error('Mint failed:', error)
      setTxStatus({ 
        type: 'mint', 
        status: 'error', 
        message: error.reason || error.message || 'Mint transaction failed'
      })
    } finally {
      setActionLoading(false)
    }
  }

  const handleBurn = async () => {
    if (!burnAmount) {
      alert('Please enter burn amount')
      return
    }

    if (!signer) {
      alert('Please connect your wallet first')
      return
    }

    setActionLoading(true)
    setTxStatus({ type: 'burn', status: 'pending', message: 'Initiating burn transaction...' })
    
    try {
      setTxStatus({ type: 'burn', status: 'processing', message: 'Please confirm transaction in your wallet...' })
      
      // Call smart contract burn function
      const result = await dwtTokenService.burnTokens(signer, burnAmount)
      
      setTxStatus({ 
        type: 'burn', 
        status: 'success', 
        message: `Successfully burned ${burnAmount} DWT`,
        hash: result.hash
      })
      
      // Refresh token stats
      const stats = await dwtTokenService.getTokenStats()
      setTokenStats({
        totalSupply: dwtTokenService.formatNumber(stats.totalSupply),
        maxSupply: dwtTokenService.formatNumber(stats.maxSupply),
        circulatingSupply: dwtTokenService.formatNumber(stats.circulatingSupply),
        burnedTokens: dwtTokenService.formatNumber(stats.burnedTokens),
        holders: stats.holderCount > 0 ? stats.holderCount : 'N/A',
        marketCap: stats.marketCap !== '0' ? stats.marketCap : 'N/A',
        price: stats.price !== '0' ? stats.price : 'N/A'
      })
      
      setShowBurnModal(false)
      setBurnAmount('')
      
      // Clear status after 5 seconds
      setTimeout(() => setTxStatus(null), 5000)
    } catch (error) {
      console.error('Burn failed:', error)
      setTxStatus({ 
        type: 'burn', 
        status: 'error', 
        message: error.reason || error.message || 'Burn transaction failed'
      })
    } finally {
      setActionLoading(false)
    }
  }

  const handleViewHolders = async () => {
    setShowHoldersModal(true)
    setActionLoading(true)
    
    try {
      // Fetch holders from service
      const holdersList = await dwtTokenService.getTokenHolders()
      setHolders(holdersList)
      
      if (holdersList.length === 0) {
        console.log('No holders data available - requires external API integration')
      }
    } catch (error) {
      console.error('Failed to fetch holders:', error)
    } finally {
      setActionLoading(false)
    }
  }

  const handleFreezeAddress = async () => {
    if (!freezeAddress) {
      alert('Please enter an address to freeze')
      return
    }

    if (!signer) {
      alert('Please connect your wallet first')
      return
    }

    setActionLoading(true)
    setTxStatus({ type: 'freeze', status: 'pending', message: 'Initiating freeze transaction...' })
    
    try {
      // Validate address format
      if (!ethers.isAddress(freezeAddress)) {
        throw new Error('Invalid Ethereum address')
      }

      setTxStatus({ type: 'freeze', status: 'processing', message: 'Please confirm transaction in your wallet...' })
      
      // Check current freeze status
      const isFrozen = await dwtTokenService.isAddressFrozen(freezeAddress)
      
      // Call smart contract freeze/unfreeze function
      let result
      if (isFrozen) {
        result = await dwtTokenService.unfreezeAddress(signer, freezeAddress)
        setFreezeStatus({ address: freezeAddress, frozen: false })
      } else {
        result = await dwtTokenService.freezeAddress(signer, freezeAddress)
        setFreezeStatus({ address: freezeAddress, frozen: true })
      }
      
      const action = isFrozen ? 'unfrozen' : 'frozen'
      setTxStatus({ 
        type: 'freeze', 
        status: 'success', 
        message: `Successfully ${action} address ${freezeAddress.slice(0, 6)}...${freezeAddress.slice(-4)}`,
        hash: result.hash
      })
      
      setShowFreezeModal(false)
      setFreezeAddress('')
      
      // Clear status after 5 seconds
      setTimeout(() => setTxStatus(null), 5000)
    } catch (error) {
      console.error('Freeze failed:', error)
      setTxStatus({ 
        type: 'freeze', 
        status: 'error', 
        message: error.reason || error.message || 'Freeze transaction failed'
      })
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

      {/* Loading State */}
      {loading && (
        <div className="admin-loading">
          <div className="admin-spinner"></div>
          <p>Loading token data from blockchain...</p>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="admin-alert admin-alert-error">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* Token Stats - Compact Table */}
      {!loading && (
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
                <span className="admin-metric-icon">🎯</span>
                <span className="admin-metric-label">Max Supply</span>
              </td>
              <td className="admin-metric-value-cell">
                {tokenStats.maxSupply}
              </td>
            </tr>
            <tr>
              <td className="admin-metric-cell">
                <span className="admin-metric-icon">🔄</span>
                <span className="admin-metric-label">Circulating</span>
              </td>
              <td className="admin-metric-value-cell">
                {tokenStats.circulatingSupply}
              </td>
              <td className="admin-metric-cell">
                <span className="admin-metric-icon">🔥</span>
                <span className="admin-metric-label">Burned</span>
              </td>
              <td className="admin-metric-value-cell">
                {tokenStats.burnedTokens}
              </td>
            </tr>
            <tr>
              <td className="admin-metric-cell">
                <span className="admin-metric-icon">👥</span>
                <span className="admin-metric-label">Holders</span>
              </td>
              <td className="admin-metric-value-cell">
                {typeof tokenStats.holders === 'number' ? tokenStats.holders.toLocaleString() : tokenStats.holders}
              </td>
              <td className="admin-metric-cell">
                <span className="admin-metric-icon">💰</span>
                <span className="admin-metric-label">Market Cap</span>
              </td>
              <td className="admin-metric-value-cell">
                {tokenStats.marketCap}
              </td>
            </tr>
            <tr>
              <td className="admin-metric-cell">
                <span className="admin-metric-icon">📈</span>
                <span className="admin-metric-label">Price</span>
              </td>
              <td className="admin-metric-value-cell">
                {tokenStats.price}
              </td>
              <td className="admin-metric-cell">
                <span className="admin-metric-icon">📊</span>
                <span className="admin-metric-label">Utilization</span>
              </td>
              <td className="admin-metric-value-cell">
                {(() => {
                  const total = parseFloat(tokenStats.totalSupply.replace(/,/g, ''))
                  const max = parseFloat(tokenStats.maxSupply.replace(/,/g, ''))
                  if (max > 0 && !isNaN(total) && !isNaN(max)) {
                    return ((total / max) * 100).toFixed(2) + '%'
                  }
                  return 'N/A'
                })()}
              </td>
            </tr>
          </tbody>
        </table>
      )}

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

          <button 
            className="admin-action-card secondary"
            onClick={handleViewHolders}
          >
            <span className="admin-action-icon">📊</span>
            <h4>View Holders</h4>
            <p>See all token holders</p>
          </button>

          <button 
            className="admin-action-card warning"
            onClick={() => setShowFreezeModal(true)}
          >
            <span className="admin-action-icon">⚠️</span>
            <h4>Freeze Address</h4>
            <p>Block specific address</p>
          </button>
        </div>
      </div>

      {/* Transaction Status */}
      {txStatus && (
        <div className={`admin-alert admin-alert-${txStatus.status === 'success' ? 'success' : txStatus.status === 'error' ? 'error' : 'warning'}`}>
          <span>
            {txStatus.status === 'success' ? '✅' : txStatus.status === 'error' ? '❌' : '⏳'}
          </span>
          <div style={{ flex: 1 }}>
            <div>{txStatus.message}</div>
            {txStatus.hash && (
              <div style={{ fontSize: '12px', marginTop: '4px', opacity: 0.8 }}>
                Tx: {txStatus.hash.slice(0, 10)}...{txStatus.hash.slice(-8)}
              </div>
            )}
          </div>
        </div>
      )}

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

      {/* View Holders Modal */}
      {showHoldersModal && (
        <div className="admin-modal-overlay" onClick={() => setShowHoldersModal(false)}>
          <div className="admin-modal admin-modal--large" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>📊 DWT Token Holders</h3>
              <button 
                className="admin-modal-close"
                onClick={() => setShowHoldersModal(false)}
              >
                ✕
              </button>
            </div>
            
            <div className="admin-modal-content">
              {holders.length > 0 ? (
                <div className="admin-table-container">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Rank</th>
                        <th>Address</th>
                        <th>Balance</th>
                        <th>% of Supply</th>
                      </tr>
                    </thead>
                    <tbody>
                      {holders.map((holder, index) => (
                        <tr key={holder.address}>
                          <td>#{index + 1}</td>
                          <td>
                            <code style={{ fontSize: '12px' }}>
                              {holder.address.slice(0, 6)}...{holder.address.slice(-4)}
                            </code>
                          </td>
                          <td>{dwtTokenService.formatNumber(holder.balance)} DWT</td>
                          <td>{holder.percentage}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="admin-empty-state">
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
                  <h4>Holder Data Requires External API</h4>
                  <p style={{ color: 'var(--text2)', marginTop: '8px' }}>
                    To display token holders, integrate with one of these services:
                  </p>
                  <ul style={{ marginTop: '16px', textAlign: 'left', maxWidth: '400px', margin: '16px auto' }}>
                    <li><strong>The Graph</strong> - Create a subgraph for DWT token</li>
                    <li><strong>Alchemy API</strong> - Use alchemy_getTokenHolders</li>
                    <li><strong>Covalent API</strong> - Token holders endpoint</li>
                    <li><strong>Moralis API</strong> - ERC20 token owners</li>
                  </ul>
                  <p style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '16px' }}>
                    See dwtTokenService.js getTokenHolders() function for implementation details
                  </p>
                </div>
              )}

              <div className="admin-modal-actions">
                <button
                  className="admin-btn secondary"
                  onClick={() => setShowHoldersModal(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Freeze Address Modal */}
      {showFreezeModal && (
        <div className="admin-modal-overlay" onClick={() => setShowFreezeModal(false)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header warning">
              <h3>⚠️ Freeze/Unfreeze Address</h3>
              <button 
                className="admin-modal-close"
                onClick={() => setShowFreezeModal(false)}
              >
                ✕
              </button>
            </div>
            
            <div className="admin-modal-content">
              <div className="admin-form-group">
                <label className="admin-form-label">Address to Freeze/Unfreeze</label>
                <input
                  type="text"
                  className="admin-form-input"
                  placeholder="0x..."
                  value={freezeAddress}
                  onChange={(e) => setFreezeAddress(e.target.value)}
                />
              </div>

              {freezeAddress && ethers.isAddress(freezeAddress) && (
                <div className="admin-form-info">
                  ℹ️ Address: {freezeAddress.slice(0, 10)}...{freezeAddress.slice(-8)}
                  {freezeStatus && freezeStatus.address === freezeAddress && (
                    <div style={{ marginTop: '8px' }}>
                      Current status: <strong>{freezeStatus.frozen ? '🔒 FROZEN' : '✅ Active'}</strong>
                    </div>
                  )}
                </div>
              )}

              <div className="admin-form-warning warning">
                ⚠️ Freezing an address will block all token transfers for that address. This action requires owner permissions.
              </div>

              <div className="admin-modal-actions">
                <button
                  className="admin-btn warning"
                  onClick={handleFreezeAddress}
                  disabled={actionLoading || !freezeAddress || !ethers.isAddress(freezeAddress)}
                >
                  {actionLoading 
                    ? '⏳ Processing...' 
                    : (freezeStatus?.address === freezeAddress && freezeStatus.frozen 
                        ? '🔓 Unfreeze Address' 
                        : '🔒 Freeze Address')}
                </button>
                <button
                  className="admin-btn secondary"
                  onClick={() => setShowFreezeModal(false)}
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
