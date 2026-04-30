import { useState, useEffect } from 'react'

export default function SupplyChainIoT({ contracts }) {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [showSubmitModal, setShowSubmitModal] = useState(false)
  const [formData, setFormData] = useState({
    invoiceId: '',
    eventType: '1',
    proofURI: ''
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadEvents()
  }, [contracts])

  const loadEvents = async () => {
    if (!contracts.ORACLE_ADAPTER) {
      setLoading(false)
      return
    }

    try {
      // Load from events in production
      setEvents([])
      setLoading(false)
    } catch (error) {
      console.error('Failed to load IoT events:', error)
      setLoading(false)
    }
  }

  const handleSubmitEvent = async (e) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const tx = await contracts.ORACLE_ADAPTER.submitEvent(
        formData.invoiceId,
        parseInt(formData.eventType),
        formData.proofURI || `ipfs://proof-${Date.now()}`
      )
      
      await tx.wait()
      alert('✅ Event submitted successfully!')
      setShowSubmitModal(false)
      setFormData({ invoiceId: '', eventType: '1', proofURI: '' })
      loadEvents()
    } catch (error) {
      alert('❌ Failed: ' + error.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleConfirmEvent = async (eventId) => {
    try {
      const tx = await contracts.ORACLE_ADAPTER.confirmEvent(eventId)
      await tx.wait()
      alert('✅ Event confirmed!')
      loadEvents()
    } catch (error) {
      alert('❌ Failed: ' + error.message)
    }
  }

  const getEventTypeName = (type) => {
    const types = ['Unknown', 'Shipment', 'Delivery', 'Quality Check', 'Temperature', 'Customs']
    return types[parseInt(type)] || 'Unknown'
  }

  const getEventStatusName = (status) => {
    const statuses = ['Pending', 'Confirmed', 'Rejected']
    return statuses[parseInt(status)] || 'Unknown'
  }

  if (loading) {
    return <div className="sc-loading"><div className="sc-spinner"></div><p>Loading IoT events...</p></div>
  }

  return (
    <div className="sc-dashboard">
      {/* Stats Overview */}
      <div className="sc-stats-grid">
        <div className="sc-stat-card">
          <div className="sc-stat-icon">📡</div>
          <div className="sc-stat-content">
            <div className="sc-stat-value">{events.length}</div>
            <div className="sc-stat-label">Total Events</div>
          </div>
        </div>

        <div className="sc-stat-card">
          <div className="sc-stat-icon">⏳</div>
          <div className="sc-stat-content">
            <div className="sc-stat-value">{events.filter(e => getEventStatusName(e.status) === 'Pending').length}</div>
            <div className="sc-stat-label">Pending Confirmation</div>
          </div>
        </div>

        <div className="sc-stat-card">
          <div className="sc-stat-icon">✓</div>
          <div className="sc-stat-content">
            <div className="sc-stat-value">{events.filter(e => getEventStatusName(e.status) === 'Confirmed').length}</div>
            <div className="sc-stat-label">Confirmed Events</div>
          </div>
        </div>

        <div className="sc-stat-card highlight">
          <div className="sc-stat-icon">🌡️</div>
          <div className="sc-stat-content">
            <div className="sc-stat-value">{events.filter(e => getEventTypeName(e.type) === 'Temperature Reading').length}</div>
            <div className="sc-stat-label">IoT Readings</div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="sc-dashboard-sections">
        <div className="sc-section">
          <div className="sc-section-header">
            <h2>📡 IoT Oracle Events</h2>
            <button className="sc-btn-primary" onClick={() => setShowSubmitModal(true)}>
              + Submit Event
            </button>
          </div>

          {events.length === 0 ? (
            <div className="sc-empty-state">
              <div className="sc-empty-icon">📡</div>
              <p>No IoT events recorded yet</p>
              <button className="sc-btn-primary" onClick={() => setShowSubmitModal(true)}>
                Submit First Event
              </button>
            </div>
          ) : (
            <div className="sc-table-container">
              <table className="sc-table">
                <thead>
                  <tr>
                    <th>Event ID</th>
                    <th>Invoice ID</th>
                    <th>Event Type</th>
                    <th>Timestamp</th>
                    <th>Status</th>
                    <th>Confirmations</th>
                    <th>Proof URI</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((event) => (
                    <tr key={event.id}>
                      <td>#{event.id}</td>
                      <td>#{event.invoiceId}</td>
                      <td>
                        <span className="sc-type-badge">{getEventTypeName(event.type)}</span>
                      </td>
                      <td>{new Date(event.timestamp * 1000).toLocaleString()}</td>
                      <td>
                        <span className={`sc-status-badge sc-status-${getEventStatusName(event.status).toLowerCase()}`}>
                          {getEventStatusName(event.status)}
                        </span>
                      </td>
                      <td>{event.confirmations}/{event.requiredConfirmations}</td>
                      <td className="sc-address">{event.proofURI.slice(0, 20)}...</td>
                      <td>
                        {event.status === 0 && (
                          <button className="sc-btn-sm sc-btn-success" onClick={() => handleConfirmEvent(event.id)}>
                            Confirm
                          </button>
                        )}
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
            <button className="sc-action-card" onClick={() => setShowSubmitModal(true)}>
              <span className="sc-action-icon">📡</span>
              <span className="sc-action-label">Submit Event</span>
            </button>
            <button className="sc-action-card">
              <span className="sc-action-icon">🌡️</span>
              <span className="sc-action-label">Temperature Logs</span>
            </button>
            <button className="sc-action-card">
              <span className="sc-action-icon">📍</span>
              <span className="sc-action-label">GPS Tracking</span>
            </button>
            <button className="sc-action-card">
              <span className="sc-action-icon">📊</span>
              <span className="sc-action-label">Analytics</span>
            </button>
          </div>
        </div>
      </div>

      {/* Submit Event Modal */}
      {showSubmitModal && (
        <div className="sc-modal-overlay" onClick={() => setShowSubmitModal(false)}>
          <div className="sc-modal" onClick={(e) => e.stopPropagation()}>
            <div className="sc-modal-header">
              <h3>📡 Submit IoT Event</h3>
              <button className="sc-modal-close" onClick={() => setShowSubmitModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmitEvent} className="sc-modal-body">
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
                <label>Event Type</label>
                <select
                  value={formData.eventType}
                  onChange={(e) => setFormData({...formData, eventType: e.target.value})}
                >
                  <option value="1">Shipment</option>
                  <option value="2">Delivery</option>
                  <option value="3">Quality Check</option>
                  <option value="4">Temperature Reading</option>
                  <option value="5">Customs Clearance</option>
                </select>
              </div>
              <div className="sc-form-group">
                <label>Proof URI (IPFS)</label>
                <input
                  type="text"
                  value={formData.proofURI}
                  onChange={(e) => setFormData({...formData, proofURI: e.target.value})}
                  placeholder="ipfs://Qm..."
                />
              </div>
              <div className="sc-modal-footer">
                <button type="button" className="sc-btn-secondary" onClick={() => setShowSubmitModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="sc-btn-primary" disabled={submitting}>
                  {submitting ? 'Submitting...' : 'Submit Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
