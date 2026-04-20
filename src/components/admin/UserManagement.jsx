import { useState, useEffect } from 'react'
import adminAPI from '../../services/adminAPI'

export default function UserManagement() {
  const [users, setUsers] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [showUserDetails, setShowUserDetails] = useState(null)
  const [loading, setLoading] = useState(true)
  const [totalUsers, setTotalUsers] = useState(0)

  useEffect(() => {
    loadUsers()
  }, [filterStatus, searchTerm])

  const loadUsers = async () => {
    try {
      setLoading(true)
      const params = {
        limit: 50,
        offset: 0
      }
      
      if (filterStatus !== 'all') {
        params.status = filterStatus
      }
      
      if (searchTerm) {
        params.search = searchTerm
      }
      
      const response = await adminAPI.get('/api/admin/users', { params })
      
      if (response.success) {
        setUsers(response.data.users || [])
        setTotalUsers(response.data.total || 0)
      }
    } catch (err) {
      console.error('Failed to load users:', err)
    } finally {
      setLoading(false)
    }
  }

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.referralCode.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = filterStatus === 'all' || user.status === filterStatus
    return matchesSearch && matchesFilter
  })

  const handleSuspendUser = async (userId) => {
    if (window.confirm('Are you sure you want to suspend this user?')) {
      try {
        await adminAPI.post(`/api/admin/users/${userId}/suspend`, {
          reason: 'Suspended by admin'
        })
        loadUsers()
      } catch (err) {
        console.error('Failed to suspend user:', err)
        alert('Failed to suspend user: ' + err.message)
      }
    }
  }

  const handleActivateUser = async (userId) => {
    try {
      await adminAPI.post(`/api/admin/users/${userId}/activate`, {
        reason: 'Activated by admin'
      })
      loadUsers()
    } catch (err) {
      console.error('Failed to activate user:', err)
      alert('Failed to activate user: ' + err.message)
    }
  }

  const handleBanUser = (userId) => {
    if (window.confirm('⚠️ BAN this user? This action cannot be undone.')) {
      setUsers(users.map(u => 
        u.id === userId ? { ...u, status: 'banned' } : u
      ))
    }
  }

  return (
    <div className="admin-panel">
      <div className="admin-panel-header">
        <h2 className="admin-panel-title">User Management</h2>
        <span className="admin-panel-badge">{users.length} Users</span>
      </div>

      {/* Search and Filters */}
      <div className="admin-controls">
        <input
          type="text"
          placeholder="Search by address or referral code..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="admin-search-input"
        />
        
        <div className="admin-filter-group">
          <button
            className={`admin-filter-btn ${filterStatus === 'all' ? 'active' : ''}`}
            onClick={() => setFilterStatus('all')}
          >
            All
          </button>
          <button
            className={`admin-filter-btn ${filterStatus === 'active' ? 'active' : ''}`}
            onClick={() => setFilterStatus('active')}
          >
            Active
          </button>
          <button
            className={`admin-filter-btn ${filterStatus === 'suspended' ? 'active' : ''}`}
            onClick={() => setFilterStatus('suspended')}
          >
            Suspended
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="admin-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Status</th>
              <th>Balance</th>
              <th>Transactions</th>
              <th>KYC</th>
              <th>Last Active</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map(user => (
              <tr key={user.id}>
                <td>
                  <div className="admin-user-cell">
                    <span className="admin-user-avatar">👤</span>
                    <div>
                      <p className="admin-user-address">
                        {user.address.slice(0, 6)}...{user.address.slice(-4)}
                      </p>
                      <p className="admin-user-ref">{user.referralCode}</p>
                    </div>
                  </div>
                </td>
                <td>
                  <span className={`admin-status-badge ${user.status}`}>
                    {user.status}
                  </span>
                </td>
                <td>{user.balance}</td>
                <td>{user.transactions}</td>
                <td>
                  <span className={`admin-kyc-badge ${user.kycStatus}`}>
                    {user.kycStatus}
                  </span>
                </td>
                <td>{user.lastActive}</td>
                <td>
                  <div className="admin-actions-cell">
                    <button 
                      className="admin-btn-small"
                      onClick={() => setShowUserDetails(user)}
                    >
                      👁️ View
                    </button>
                    
                    {user.status === 'active' && (
                      <button 
                        className="admin-btn-small warning"
                        onClick={() => handleSuspendUser(user.id)}
                      >
                        ⏸️ Suspend
                      </button>
                    )}
                    
                    {user.status === 'suspended' && (
                      <button 
                        className="admin-btn-small success"
                        onClick={() => handleActivateUser(user.id)}
                      >
                        ▶️ Activate
                      </button>
                    )}
                    
                    {user.status !== 'banned' && (
                      <button 
                        className="admin-btn-small danger"
                        onClick={() => handleBanUser(user.id)}
                      >
                        🚫 Ban
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* User Details Modal */}
      {showUserDetails && (
        <div className="admin-modal-overlay" onClick={() => setShowUserDetails(null)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>User Details</h3>
              <button 
                className="admin-modal-close"
                onClick={() => setShowUserDetails(null)}
              >
                ✕
              </button>
            </div>
            
            <div className="admin-modal-content">
              <div className="admin-detail-row">
                <span className="admin-detail-label">Address:</span>
                <span className="admin-detail-value">{showUserDetails.address}</span>
              </div>
              <div className="admin-detail-row">
                <span className="admin-detail-label">Status:</span>
                <span className={`admin-status-badge ${showUserDetails.status}`}>
                  {showUserDetails.status}
                </span>
              </div>
              <div className="admin-detail-row">
                <span className="admin-detail-label">Balance:</span>
                <span className="admin-detail-value">{showUserDetails.balance}</span>
              </div>
              <div className="admin-detail-row">
                <span className="admin-detail-label">Transactions:</span>
                <span className="admin-detail-value">{showUserDetails.transactions}</span>
              </div>
              <div className="admin-detail-row">
                <span className="admin-detail-label">KYC Status:</span>
                <span className={`admin-kyc-badge ${showUserDetails.kycStatus}`}>
                  {showUserDetails.kycStatus}
                </span>
              </div>
              <div className="admin-detail-row">
                <span className="admin-detail-label">Join Date:</span>
                <span className="admin-detail-value">{showUserDetails.joinDate}</span>
              </div>
              <div className="admin-detail-row">
                <span className="admin-detail-label">Last Active:</span>
                <span className="admin-detail-value">{showUserDetails.lastActive}</span>
              </div>
              <div className="admin-detail-row">
                <span className="admin-detail-label">Referral Code:</span>
                <span className="admin-detail-value">{showUserDetails.referralCode}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
