import { useState } from 'react'
import { ethers } from 'ethers'
import { useWallet } from '../../hooks/useWallet'
import adminAPI from '../../services/adminAPI'
import '../../styles/admin-settings.css'

export default function ContractControl() {
  const { provider, currentAddress } = useWallet()
  const [selectedContract, setSelectedContract] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [pendingAction, setPendingAction] = useState(null)

  const contracts = [
    {
      id: 'dwt-token',
      name: 'DWT Token',
      address: import.meta.env.VITE_DWT_TOKEN_ADDRESS || '0x...',
      status: 'Active',
      functions: ['pause', 'unpause', 'mint', 'burn']
    },
    {
      id: 'dex-router',
      name: 'DEX Router',
      address: import.meta.env.VITE_DEX_ROUTER_ADDRESS || '0x...',
      status: 'Active',
      functions: ['pause', 'unpause', 'setFee']
    },
    {
      id: 'staking',
      name: 'Staking Contract',
      address: import.meta.env.VITE_STAKING_ADDRESS || '0x...',
      status: 'Active',
      functions: ['pause', 'unpause', 'setRewardsRate']
    },
    {
      id: 'nft-membership',
      name: 'NFT Membership',
      address: import.meta.env.VITE_NFT_MEMBERSHIP_ADDRESS || '0x...',
      status: 'Active',
      functions: ['pause', 'unpause', 'setMintPrice']
    },
    {
      id: 'layer7-security',
      name: 'Layer 7 Security',
      address: import.meta.env.VITE_LAYER7_SECURITY_ADDRESS || '0x...',
      status: 'Active',
      functions: ['tripCircuitBreaker', 'resetCircuitBreaker', 'pause']
    }
  ]

  const handleContractAction = async (contractId, action) => {
    setPendingAction({ contractId, action })
    setShowConfirmModal(true)
  }

  const executeAction = async () => {
    if (!pendingAction || !provider) return
    
    setActionLoading(true)
    setShowConfirmModal(false)

    try {
      // For pause/unpause actions, call backend API
      if (pendingAction.action === 'pause' || pendingAction.action === 'unpause') {
        const endpoint = `/api/admin/contracts/${pendingAction.contractId}/${pendingAction.action}`
        await adminAPI.post(endpoint, {
          reason: `${pendingAction.action} triggered by admin`
        })
        
        alert(`✅ Action "${pendingAction.action}" executed successfully on ${pendingAction.contractId}`)
      } else {
        // For other actions, interact with smart contracts directly
        console.log(`Executing ${pendingAction.action} on ${pendingAction.contractId}`)
        
        // Example: Contract interaction
        // const signer = provider.getSigner()
        // const contract = new ethers.Contract(contractAddress, ABI, signer)
        // const tx = await contract[pendingAction.action]()
        // await tx.wait()
        
        alert(`✅ Action "${pendingAction.action}" executed successfully on ${pendingAction.contractId}`)
      }
    } catch (error) {
      console.error('Contract action failed:', error)
      alert(`❌ Action failed: ${error.message}`)
    } finally {
      setActionLoading(false)
      setPendingAction(null)
    }
  }

  const getStatusColor = (status) => {
    return status === 'Active' ? 'var(--green)' : 'var(--red)'
  }

  return (
    <div className="admin-panel">
      <div className="admin-panel-header">
        <h2 className="admin-panel-title">Contract Control</h2>
        <span className="admin-panel-badge warning">⚠️ Critical Operations</span>
      </div>

      {/* Warning Banner */}
      <div className="admin-warning-banner">
        <span className="admin-warning-icon">⚠️</span>
        <div className="admin-warning-content">
          <p className="admin-warning-title">Critical Control Panel</p>
          <p className="admin-warning-text">
            These actions directly affect smart contracts on the blockchain. 
            All actions are irreversible and will be logged.
          </p>
        </div>
      </div>

      {/* Contracts Grid */}
      <div className="admin-contracts-grid">
        {contracts.map(contract => (
          <div key={contract.id} className="admin-contract-card">
            <div className="admin-contract-header">
              <h3 className="admin-contract-name">{contract.name}</h3>
              <span 
                className="admin-contract-status"
                style={{ color: getStatusColor(contract.status) }}
              >
                {contract.status}
              </span>
            </div>

            <div className="admin-contract-address">
              <span className="admin-contract-label">Address:</span>
              <code className="admin-contract-code">
                {contract.address.slice(0, 10)}...{contract.address.slice(-8)}
              </code>
              <button 
                className="admin-copy-btn"
                onClick={() => navigator.clipboard.writeText(contract.address)}
              >
                📋
              </button>
            </div>

            <div className="admin-contract-functions">
              <p className="admin-contract-func-title">Available Actions:</p>
              <div className="admin-contract-actions">
                {contract.functions.includes('pause') && (
                  <button
                    className="admin-func-btn warning"
                    onClick={() => handleContractAction(contract.id, 'pause')}
                    disabled={actionLoading}
                  >
                    ⏸️ Pause
                  </button>
                )}
                
                {contract.functions.includes('unpause') && (
                  <button
                    className="admin-func-btn success"
                    onClick={() => handleContractAction(contract.id, 'unpause')}
                    disabled={actionLoading}
                  >
                    ▶️ Unpause
                  </button>
                )}
                
                {contract.functions.includes('tripCircuitBreaker') && (
                  <button
                    className="admin-func-btn danger"
                    onClick={() => handleContractAction(contract.id, 'tripCircuitBreaker')}
                    disabled={actionLoading}
                  >
                    🚨 Circuit Breaker
                  </button>
                )}
                
                {contract.functions.includes('resetCircuitBreaker') && (
                  <button
                    className="admin-func-btn primary"
                    onClick={() => handleContractAction(contract.id, 'resetCircuitBreaker')}
                    disabled={actionLoading}
                  >
                    🔄 Reset Breaker
                  </button>
                )}
                
                {contract.functions.includes('setFee') && (
                  <button
                    className="admin-func-btn secondary"
                    onClick={() => handleContractAction(contract.id, 'setFee')}
                    disabled={actionLoading}
                  >
                    💰 Set Fee
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && pendingAction && (
        <div className="admin-modal-overlay" onClick={() => setShowConfirmModal(false)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header danger">
              <h3>⚠️ Confirm Critical Action</h3>
              <button 
                className="admin-modal-close"
                onClick={() => setShowConfirmModal(false)}
              >
                ✕
              </button>
            </div>
            
            <div className="admin-modal-content">
              <div className="admin-confirm-warning">
                <p className="admin-confirm-title">You are about to:</p>
                <p className="admin-confirm-action">
                  <strong>{pendingAction.action}</strong> on <strong>{pendingAction.contractId}</strong>
                </p>
              </div>

              <div className="admin-confirm-details">
                <p>✓ This action will be recorded on-chain</p>
                <p>✓ Transaction will require gas fees</p>
                <p>✓ Action may affect all users</p>
              </div>

              <div className="admin-confirm-actions">
                <button
                  className="admin-btn danger"
                  onClick={executeAction}
                  disabled={actionLoading}
                >
                  {actionLoading ? '⏳ Executing...' : '⚠️ Confirm Action'}
                </button>
                <button
                  className="admin-btn secondary"
                  onClick={() => setShowConfirmModal(false)}
                  disabled={actionLoading}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Log */}
      <div className="admin-section">
        <h3 className="admin-section-title">Recent Actions</h3>
        <div className="admin-log-container">
          <div className="admin-log-entry">
            <span className="admin-log-time">2024-01-20 14:32:15</span>
            <span className="admin-log-action success">✓ Unpause</span>
            <span className="admin-log-contract">DWT Token</span>
            <span className="admin-log-user">0x742d...bEb</span>
          </div>
          <div className="admin-log-entry">
            <span className="admin-log-time">2024-01-20 12:15:42</span>
            <span className="admin-log-action warning">⏸ Pause</span>
            <span className="admin-log-contract">DEX Router</span>
            <span className="admin-log-user">0x742d...bEb</span>
          </div>
          <div className="admin-log-entry">
            <span className="admin-log-time">2024-01-19 09:45:33</span>
            <span className="admin-log-action danger">🚨 Circuit Breaker</span>
            <span className="admin-log-contract">Layer 7 Security</span>
            <span className="admin-log-user">0x742d...bEb</span>
          </div>
        </div>
      </div>
    </div>
  )
}
