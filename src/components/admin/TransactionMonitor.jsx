import { useState, useEffect } from 'react'

export default function TransactionMonitor() {
  const [transactions, setTransactions] = useState([])
  const [filterType, setFilterType] = useState('all')
  const [searchHash, setSearchHash] = useState('')
  const [showTxDetails, setShowTxDetails] = useState(null)

  useEffect(() => {
    // Sample transaction data
    const sampleTxs = [
      {
        hash: '0x1a2b3c4d5e6f...',
        type: 'transfer',
        from: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        to: '0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed',
        amount: '1,500 DWT',
        timestamp: '2024-01-20 15:45:32',
        status: 'confirmed',
        gasUsed: '0.002 ETH',
        block: 18234567
      },
      {
        hash: '0x7g8h9i0j1k2l...',
        type: 'swap',
        from: '0xfB6916095ca1df60bB79Ce92cE3Ea74c37c5d359',
        to: 'DEX Router',
        amount: '500 DWT → 0.25 ETH',
        timestamp: '2024-01-20 15:32:10',
        status: 'confirmed',
        gasUsed: '0.005 ETH',
        block: 18234555
      },
      {
        hash: '0x3m4n5o6p7q8r...',
        type: 'stake',
        from: '0x1234567890abcdef1234567890abcdef12345678',
        to: 'Staking Contract',
        amount: '10,000 DWT',
        timestamp: '2024-01-20 15:15:45',
        status: 'confirmed',
        gasUsed: '0.003 ETH',
        block: 18234540
      },
      {
        hash: '0x9s0t1u2v3w4x...',
        type: 'transfer',
        from: '0x9876543210fedcba9876543210fedcba98765432',
        to: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        amount: '2,000 DWT',
        timestamp: '2024-01-20 14:58:22',
        status: 'pending',
        gasUsed: '0.002 ETH',
        block: 18234520
      },
      {
        hash: '0x5y6z7a8b9c0d...',
        type: 'mint',
        from: 'Treasury',
        to: '0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed',
        amount: '5,000 DWT',
        timestamp: '2024-01-20 14:30:15',
        status: 'confirmed',
        gasUsed: '0.004 ETH',
        block: 18234500
      }
    ]
    setTransactions(sampleTxs)
  }, [])

  const filteredTxs = transactions.filter(tx => {
    const matchesFilter = filterType === 'all' || tx.type === filterType
    const matchesSearch = !searchHash || tx.hash.toLowerCase().includes(searchHash.toLowerCase())
    return matchesFilter && matchesSearch
  })

  const getStatusBadge = (status) => {
    const badges = {
      'confirmed': { class: 'success', label: '✓ Confirmed' },
      'pending': { class: 'warning', label: '⏳ Pending' },
      'failed': { class: 'danger', label: '✕ Failed' }
    }
    return badges[status] || badges['pending']
  }

  const getTypeIcon = (type) => {
    const icons = {
      'transfer': '🔄',
      'swap': '⇄',
      'stake': '💎',
      'mint': '✨',
      'burn': '🔥'
    }
    return icons[type] || '📄'
  }

  return (
    <div className="admin-panel">
      <div className="admin-panel-header">
        <h2 className="admin-panel-title">Transaction Monitor</h2>
        <span className="admin-panel-badge live">● Live</span>
      </div>

      {/* Transaction Stats - Compact Table */}
      <table className="admin-metrics-table">
        <tbody>
          <tr>
            <td className="admin-metric-cell">
              <span className="admin-metric-icon">📊</span>
              <span className="admin-metric-label">Total (24h)</span>
            </td>
            <td className="admin-metric-value-cell">
              1,234
            </td>
            <td className="admin-metric-cell">
              <span className="admin-metric-icon">⏳</span>
              <span className="admin-metric-label">Pending</span>
            </td>
            <td className="admin-metric-value-cell">
              {transactions.filter(t => t.status === 'pending').length}
            </td>
          </tr>
          <tr>
            <td className="admin-metric-cell">
              <span className="admin-metric-icon">✓</span>
              <span className="admin-metric-label">Confirmed</span>
            </td>
            <td className="admin-metric-value-cell">
              {transactions.filter(t => t.status === 'confirmed').length}
            </td>
            <td className="admin-metric-cell">
              <span className="admin-metric-icon">💰</span>
              <span className="admin-metric-label">Volume (24h)</span>
            </td>
            <td className="admin-metric-value-cell">
              $2.4M
            </td>
          </tr>
        </tbody>
      </table>

      {/* Filters */}
      <div className="admin-controls">
        <input
          type="text"
          placeholder="Search by tx hash..."
          value={searchHash}
          onChange={(e) => setSearchHash(e.target.value)}
          className="admin-search-input"
        />
        
        <div className="admin-filter-group">
          {['all', 'transfer', 'swap', 'stake', 'mint', 'burn'].map(type => (
            <button
              key={type}
              className={`admin-filter-btn ${filterType === type ? 'active' : ''}`}
              onClick={() => setFilterType(type)}
            >
              {getTypeIcon(type)} {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Transactions Table */}
      <div className="admin-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Type</th>
              <th>Hash</th>
              <th>From</th>
              <th>To</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Time</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredTxs.map(tx => {
              const statusBadge = getStatusBadge(tx.status)
              return (
                <tr key={tx.hash}>
                  <td>
                    <span className="admin-tx-type">
                      {getTypeIcon(tx.type)} {tx.type}
                    </span>
                  </td>
                  <td>
                    <code className="admin-tx-hash">{tx.hash}</code>
                  </td>
                  <td>
                    <span className="admin-tx-address">
                      {tx.from.slice(0, 6)}...{tx.from.slice(-4)}
                    </span>
                  </td>
                  <td>
                    <span className="admin-tx-address">
                      {tx.to.includes('0x') ? `${tx.to.slice(0, 6)}...${tx.to.slice(-4)}` : tx.to}
                    </span>
                  </td>
                  <td>
                    <span className="admin-tx-amount">{tx.amount}</span>
                  </td>
                  <td>
                    <span className={`admin-status-badge ${statusBadge.class}`}>
                      {statusBadge.label}
                    </span>
                  </td>
                  <td>
                    <span className="admin-tx-time">{tx.timestamp.split(' ')[1]}</span>
                  </td>
                  <td>
                    <button
                      className="admin-btn-small"
                      onClick={() => setShowTxDetails(tx)}
                    >
                      👁️ View
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Transaction Details Modal */}
      {showTxDetails && (
        <div className="admin-modal-overlay" onClick={() => setShowTxDetails(null)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>Transaction Details</h3>
              <button 
                className="admin-modal-close"
                onClick={() => setShowTxDetails(null)}
              >
                ✕
              </button>
            </div>
            
            <div className="admin-modal-content">
              <div className="admin-detail-row">
                <span className="admin-detail-label">Hash:</span>
                <code className="admin-detail-value">{showTxDetails.hash}</code>
              </div>
              <div className="admin-detail-row">
                <span className="admin-detail-label">Type:</span>
                <span className="admin-detail-value">
                  {getTypeIcon(showTxDetails.type)} {showTxDetails.type}
                </span>
              </div>
              <div className="admin-detail-row">
                <span className="admin-detail-label">From:</span>
                <span className="admin-detail-value">{showTxDetails.from}</span>
              </div>
              <div className="admin-detail-row">
                <span className="admin-detail-label">To:</span>
                <span className="admin-detail-value">{showTxDetails.to}</span>
              </div>
              <div className="admin-detail-row">
                <span className="admin-detail-label">Amount:</span>
                <span className="admin-detail-value">{showTxDetails.amount}</span>
              </div>
              <div className="admin-detail-row">
                <span className="admin-detail-label">Status:</span>
                <span className={`admin-status-badge ${getStatusBadge(showTxDetails.status).class}`}>
                  {getStatusBadge(showTxDetails.status).label}
                </span>
              </div>
              <div className="admin-detail-row">
                <span className="admin-detail-label">Block:</span>
                <span className="admin-detail-value">#{showTxDetails.block}</span>
              </div>
              <div className="admin-detail-row">
                <span className="admin-detail-label">Gas Used:</span>
                <span className="admin-detail-value">{showTxDetails.gasUsed}</span>
              </div>
              <div className="admin-detail-row">
                <span className="admin-detail-label">Timestamp:</span>
                <span className="admin-detail-value">{showTxDetails.timestamp}</span>
              </div>

              <div className="admin-modal-actions">
                <button
                  className="admin-btn primary"
                  onClick={() => window.open(`https://etherscan.io/tx/${showTxDetails.hash}`, '_blank')}
                >
                  🔗 View on Explorer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
