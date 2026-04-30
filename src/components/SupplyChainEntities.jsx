import { useState, useEffect } from 'react'

export default function SupplyChainEntities({ contracts }) {
  const [entities, setEntities] = useState([])
  const [loading, setLoading] = useState(true)
  const [showRegisterModal, setShowRegisterModal] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    entityType: '1',
    registrationId: '',
    documentHash: ''
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadEntities()
  }, [contracts])

  const loadEntities = async () => {
    if (!contracts.IDENTITY_REGISTRY) {
      setLoading(false)
      return
    }

    try {
      // In production, track entities via events or backend
      setEntities([])
      setLoading(false)
    } catch (error) {
      console.error('Failed to load entities:', error)
      setLoading(false)
    }
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const tx = await contracts.IDENTITY_REGISTRY.registerEntity(
        formData.name,
        parseInt(formData.entityType),
        formData.registrationId,
        formData.documentHash || `hash-${Date.now()}`
      )
      
      await tx.wait()
      alert('✅ Entity registered successfully!')
      setShowRegisterModal(false)
      setFormData({ name: '', entityType: '1', registrationId: '', documentHash: '' })
      loadEntities()
    } catch (error) {
      alert('❌ Failed: ' + error.message)
    } finally {
      setSubmitting(false)
    }
  }

  const getEntityTypeName = (type) => {
    const types = ['Unknown', 'Supplier', 'Buyer', 'Manufacturer', 'Logistics', 'Admin']
    return types[parseInt(type)] || 'Unknown'
  }

  const getKYCStatusName = (status) => {
    const statuses = ['Pending', 'Approved', 'Rejected']
    return statuses[parseInt(status)] || 'Unknown'
  }

  if (loading) {
    return <div className="sc-loading"><div className="sc-spinner"></div><p>Loading entities...</p></div>
  }

  return (
    <div className="sc-dashboard">
      {/* Stats Overview */}
      <div className="sc-stats-grid">
        <div className="sc-stat-card">
          <div className="sc-stat-icon">👥</div>
          <div className="sc-stat-content">
            <div className="sc-stat-value">{entities.length}</div>
            <div className="sc-stat-label">Total Entities</div>
          </div>
        </div>

        <div className="sc-stat-card">
          <div className="sc-stat-icon">✓</div>
          <div className="sc-stat-content">
            <div className="sc-stat-value">{entities.filter(e => getKYCStatusName(e.kycStatus) === 'Approved').length}</div>
            <div className="sc-stat-label">Verified Entities</div>
          </div>
        </div>

        <div className="sc-stat-card">
          <div className="sc-stat-icon">⏳</div>
          <div className="sc-stat-content">
            <div className="sc-stat-value">{entities.filter(e => getKYCStatusName(e.kycStatus) === 'Pending').length}</div>
            <div className="sc-stat-label">Pending KYC</div>
          </div>
        </div>

        <div className="sc-stat-card highlight">
          <div className="sc-stat-icon">⭐</div>
          <div className="sc-stat-content">
            <div className="sc-stat-value">{entities.length > 0 ? (entities.reduce((sum, e) => sum + Number(e.reputation || 0), 0) / entities.length).toFixed(0) : 0}</div>
            <div className="sc-stat-label">Avg Reputation</div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="sc-dashboard-sections">
        <div className="sc-section">
          <div className="sc-section-header">
            <h2>👥 Entity Registry</h2>
            <button className="sc-btn-primary" onClick={() => setShowRegisterModal(true)}>
              + Register Entity
            </button>
          </div>

          {entities.length === 0 ? (
            <div className="sc-empty-state">
              <div className="sc-empty-icon">👥</div>
              <p>No entities registered yet</p>
              <button className="sc-btn-primary" onClick={() => setShowRegisterModal(true)}>
                Register First Entity
              </button>
            </div>
          ) : (
            <div className="sc-table-container">
              <table className="sc-table">
                <thead>
                  <tr>
                    <th>Address</th>
                    <th>Name</th>
                    <th>Type</th>
                    <th>Registration ID</th>
                    <th>KYC Status</th>
                    <th>Reputation</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {entities.map((entity) => (
                    <tr key={entity.address}>
                      <td className="sc-address">{entity.address.slice(0, 6)}...{entity.address.slice(-4)}</td>
                      <td>{entity.name}</td>
                      <td>
                        <span className="sc-type-badge">{getEntityTypeName(entity.type)}</span>
                      </td>
                      <td>{entity.registrationId}</td>
                      <td>
                        <span className={`sc-status-badge sc-status-${getKYCStatusName(entity.kycStatus).toLowerCase()}`}>
                          {getKYCStatusName(entity.kycStatus)}
                        </span>
                      </td>
                      <td>
                        <div className="sc-reputation-score">{entity.reputation}/100</div>
                      </td>
                      <td>
                        <button className="sc-btn-sm">View Profile</button>
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
            <button className="sc-action-card" onClick={() => setShowRegisterModal(true)}>
              <span className="sc-action-icon">👤</span>
              <span className="sc-action-label">Register Entity</span>
            </button>
            <button className="sc-action-card">
              <span className="sc-action-icon">🔍</span>
              <span className="sc-action-label">Verify KYC</span>
            </button>
            <button className="sc-action-card">
              <span className="sc-action-icon">📊</span>
              <span className="sc-action-label">View Reports</span>
            </button>
            <button className="sc-action-card">
              <span className="sc-action-icon">🏆</span>
              <span className="sc-action-label">Top Rated</span>
            </button>
          </div>
        </div>
      </div>

      {/* Register Modal */}
      {showRegisterModal && (
        <div className="sc-modal-overlay" onClick={() => setShowRegisterModal(false)}>
          <div className="sc-modal" onClick={(e) => e.stopPropagation()}>
            <div className="sc-modal-header">
              <h3>👤 Register New Entity</h3>
              <button className="sc-modal-close" onClick={() => setShowRegisterModal(false)}>✕</button>
            </div>
            <form onSubmit={handleRegister} className="sc-modal-body">
              <div className="sc-form-group">
                <label>Entity Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Company Name"
                  required
                />
              </div>
              <div className="sc-form-group">
                <label>Entity Type</label>
                <select
                  value={formData.entityType}
                  onChange={(e) => setFormData({...formData, entityType: e.target.value})}
                >
                  <option value="1">Supplier</option>
                  <option value="2">Buyer</option>
                  <option value="3">Manufacturer</option>
                  <option value="4">Logistics Provider</option>
                  <option value="5">Administrator</option>
                </select>
              </div>
              <div className="sc-form-group">
                <label>Registration ID</label>
                <input
                  type="text"
                  value={formData.registrationId}
                  onChange={(e) => setFormData({...formData, registrationId: e.target.value})}
                  placeholder="REG-2026-001"
                  required
                />
              </div>
              <div className="sc-form-group">
                <label>Document Hash (Optional)</label>
                <input
                  type="text"
                  value={formData.documentHash}
                  onChange={(e) => setFormData({...formData, documentHash: e.target.value})}
                  placeholder="ipfs://Qm... or hash"
                />
              </div>
              <div className="sc-modal-footer">
                <button type="button" className="sc-btn-secondary" onClick={() => setShowRegisterModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="sc-btn-primary" disabled={submitting}>
                  {submitting ? 'Registering...' : 'Register Entity'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
