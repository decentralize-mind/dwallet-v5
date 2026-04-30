import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { LAYER11_ADDRESSES, LAYER11_ABIS } from '../../config/layer11-contracts'
import SupplyChainAnalytics from './SupplyChainAnalytics'
import SupplyChainDisputes from '../SupplyChainDisputes'
import SupplyChainInsurance from '../SupplyChainInsurance'
import SupplyChainReturns from '../SupplyChainReturns'
import SupplyChainAdvancedFinance from '../SupplyChainAdvancedFinance'
import SupplyChainMarketplace from '../SupplyChainMarketplace'
import '../../styles/admin-supplychain.css'

// Supply chain contract addresses - Updated April 28, 2026
const CONTRACTS = LAYER11_ADDRESSES.baseSepolia
const CONTRACT_ABIS = LAYER11_ABIS

export default function SupplyChainAdmin() {
  const [activeTab, setActiveTab] = useState('overview')
  const [provider, setProvider] = useState(null)
  const [signer, setSigner] = useState(null)
  const [contracts, setContracts] = useState({})
  const [loading, setLoading] = useState(true)
  const [adminAddress, setAdminAddress] = useState('')
  
  // Data states
  const [stats, setStats] = useState({
    totalInvoices: 0,
    activeEscrows: 0,
    registeredEntities: 0,
    pendingMilestones: 0,
    totalFinanced: 0,
    dwtBalance: 0
  })
  const [invoices, setInvoices] = useState([])
  const [entities, setEntities] = useState([])
  const [escrows, setEscrows] = useState([])
  const [milestones, setMilestones] = useState([])

  // Form states
  const [showMintModal, setShowMintModal] = useState(false)
  const [showRegisterModal, setShowRegisterModal] = useState(false)
  const [showEscrowModal, setShowEscrowModal] = useState(false)
  const [showMilestoneModal, setShowMilestoneModal] = useState(false)

  // Initialize blockchain connection
  useEffect(() => {
    initBlockchain()
  }, [])

  const initBlockchain = async () => {
    try {
      if (!window.ethereum) {
        alert('Please install MetaMask!')
        return
      }

      const web3Provider = new ethers.BrowserProvider(window.ethereum)
      const accounts = await web3Provider.send("eth_requestAccounts", [])
      const web3Signer = await web3Provider.getSigner()
      const address = await web3Signer.getAddress()

      setProvider(web3Provider)
      setSigner(web3Signer)
      setAdminAddress(address)

      // Load all contracts
      const loadedContracts = {}
      for (const [name, address] of Object.entries(CONTRACTS)) {
        loadedContracts[name] = new ethers.Contract(address, CONTRACT_ABIS[name], web3Signer)
      }
      setContracts(loadedContracts)

      // Load data
      await loadAllData(loadedContracts, web3Provider)
      setLoading(false)
    } catch (error) {
      console.error('Failed to initialize blockchain:', error)
      setLoading(false)
    }
  }

  const loadAllData = async (contracts, provider) => {
    try {
      // Load invoice count
      const invoiceCount = await contracts.INVOICE_NFT.totalSupply()
      
      // Load DWT balance
      const balance = await contracts.DWT_TOKEN.balanceOf(adminAddress)
      
      // Load total supply
      const totalSupply = await contracts.DWT_TOKEN.totalSupply()

      setStats({
        totalInvoices: Number(invoiceCount),
        activeEscrows: 0, // Will be calculated
        registeredEntities: 0, // Will be calculated
        pendingMilestones: 0, // Will be calculated
        totalFinanced: 0,
        dwtBalance: Number(ethers.formatEther(balance)),
        totalSupply: Number(ethers.formatEther(totalSupply))
      })

      // Load recent invoices
      const recentInvoices = []
      for (let i = 0; i < Math.min(Number(invoiceCount), 10); i++) {
        try {
          const invoice = await contracts.INVOICE_NFT.getInvoice(i)
          recentInvoices.push({
            id: i,
            supplier: invoice.supplier,
            buyer: invoice.buyer,
            amount: ethers.formatEther(invoice.amount),
            dueDate: new Date(Number(invoice.dueDate) * 1000).toLocaleDateString(),
            status: ['Pending', 'Approved', 'Paid', 'Disputed'][Number(invoice.status)],
            metadataURI: invoice.metadataURI
          })
        } catch (e) {
          // Skip if invoice doesn't exist
        }
      }
      setInvoices(recentInvoices)

    } catch (error) {
      console.error('Failed to load data:', error)
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // RENDER FUNCTIONS
  // ───────────────────────────────────────────────────────────────────────────

  const renderOverview = () => (
    <div className="sc-admin-overview">
      <div className="sc-admin-header">
        <h1>🏭 Supply Chain Admin Dashboard</h1>
        <div className="sc-admin-wallet">
          <span className="sc-admin-address">{adminAddress.slice(0, 6)}...{adminAddress.slice(-4)}</span>
          <span className="sc-admin-network">Base Sepolia</span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="sc-stats-grid">
        <div className="sc-stat-card">
          <div className="sc-stat-icon">📄</div>
          <div className="sc-stat-info">
            <div className="sc-stat-value">{stats.totalInvoices}</div>
            <div className="sc-stat-label">Total Invoices</div>
          </div>
        </div>
        <div className="sc-stat-card">
          <div className="sc-stat-icon">🔒</div>
          <div className="sc-stat-info">
            <div className="sc-stat-value">{stats.activeEscrows}</div>
            <div className="sc-stat-label">Active Escrows</div>
          </div>
        </div>
        <div className="sc-stat-card">
          <div className="sc-stat-icon">👥</div>
          <div className="sc-stat-info">
            <div className="sc-stat-value">{stats.registeredEntities}</div>
            <div className="sc-stat-label">Registered Entities</div>
          </div>
        </div>
        <div className="sc-stat-card">
          <div className="sc-stat-icon">🎯</div>
          <div className="sc-stat-info">
            <div className="sc-stat-value">{stats.pendingMilestones}</div>
            <div className="sc-stat-label">Pending Milestones</div>
          </div>
        </div>
        <div className="sc-stat-card">
          <div className="sc-stat-icon">💰</div>
          <div className="sc-stat-info">
            <div className="sc-stat-value">{stats.totalFinanced.toLocaleString()}</div>
            <div className="sc-stat-label">Total Financed (DWT)</div>
          </div>
        </div>
        <div className="sc-stat-card highlight">
          <div className="sc-stat-icon">💎</div>
          <div className="sc-stat-info">
            <div className="sc-stat-value">{stats.dwtBalance.toLocaleString()}</div>
            <div className="sc-stat-label">Your DWT Balance</div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="sc-quick-actions">
        <h2>⚡ Quick Actions</h2>
        <div className="sc-actions-grid">
          <button className="sc-action-btn" onClick={() => setShowMintModal(true)}>
            <span className="sc-action-icon">📝</span>
            <span>Mint Invoice</span>
          </button>
          <button className="sc-action-btn" onClick={() => setShowRegisterModal(true)}>
            <span className="sc-action-icon">👤</span>
            <span>Register Entity</span>
          </button>
          <button className="sc-action-btn" onClick={() => setShowEscrowModal(true)}>
            <span className="sc-action-icon">🔐</span>
            <span>Create Escrow</span>
          </button>
          <button className="sc-action-btn" onClick={() => setShowMilestoneModal(true)}>
            <span className="sc-action-icon">🏆</span>
            <span>Setup Milestone</span>
          </button>
        </div>
      </div>

      {/* Contract Addresses */}
      <div className="sc-contracts-info">
        <h2>📍 Contract Addresses</h2>
        <div className="sc-contract-list">
          <div className="sc-contract-item">
            <span className="sc-contract-label">Invoice NFT</span>
            <code className="sc-contract-address">{CONTRACTS.INVOICE_NFT}</code>
          </div>
          <div className="sc-contract-item">
            <span className="sc-contract-label">Escrow</span>
            <code className="sc-contract-address">{CONTRACTS.ESCROW}</code>
          </div>
          <div className="sc-contract-item">
            <span className="sc-contract-label">Identity Registry</span>
            <code className="sc-contract-address">{CONTRACTS.IDENTITY_REGISTRY}</code>
          </div>
          <div className="sc-contract-item">
            <span className="sc-contract-label">Oracle Adapter</span>
            <code className="sc-contract-address">{CONTRACTS.ORACLE_ADAPTER}</code>
          </div>
          <div className="sc-contract-item">
            <span className="sc-contract-label">Milestone Distribution</span>
            <code className="sc-contract-address">{CONTRACTS.MILESTONE_DIST}</code>
          </div>
          <div className="sc-contract-item">
            <span className="sc-contract-label">Financing Pool</span>
            <code className="sc-contract-address">{CONTRACTS.FINANCING_POOL}</code>
          </div>
        </div>
      </div>
    </div>
  )

  const renderInvoices = () => (
    <div className="sc-admin-section">
      <div className="sc-section-header">
        <h2>📄 Invoice Management</h2>
        <button className="sc-btn-primary" onClick={() => setShowMintModal(true)}>
          + Mint New Invoice
        </button>
      </div>

      <div className="sc-table-container">
        <table className="sc-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Supplier</th>
              <th>Buyer</th>
              <th>Amount (DWT)</th>
              <th>Due Date</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {invoices.length === 0 ? (
              <tr>
                <td colSpan="7" className="sc-empty-state">No invoices yet. Click "Mint New Invoice" to create one.</td>
              </tr>
            ) : (
              invoices.map((inv) => (
                <tr key={inv.id}>
                  <td>#{inv.id}</td>
                  <td className="sc-address">{inv.supplier.slice(0, 6)}...{inv.supplier.slice(-4)}</td>
                  <td className="sc-address">{inv.buyer.slice(0, 6)}...{inv.buyer.slice(-4)}</td>
                  <td>{Number(inv.amount).toLocaleString()}</td>
                  <td>{inv.dueDate}</td>
                  <td>
                    <span className={`sc-status-badge sc-status-${inv.status.toLowerCase()}`}>
                      {inv.status}
                    </span>
                  </td>
                  <td>
                    <button className="sc-btn-sm">View</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )

  const renderEntities = () => (
    <div className="sc-admin-section">
      <div className="sc-section-header">
        <h2>👥 Entity Management</h2>
        <button className="sc-btn-primary" onClick={() => setShowRegisterModal(true)}>
          + Register Entity
        </button>
      </div>

      <div className="sc-table-container">
        <table className="sc-table">
          <thead>
            <tr>
              <th>Address</th>
              <th>Name</th>
              <th>Type</th>
              <th>KYC Status</th>
              <th>Reputation</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan="6" className="sc-empty-state">
                No entities registered yet. Click "Register Entity" to add one.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )

  const renderEscrows = () => (
    <div className="sc-admin-section">
      <div className="sc-section-header">
        <h2>🔒 Escrow Management</h2>
        <button className="sc-btn-primary" onClick={() => setShowEscrowModal(true)}>
          + Create Escrow
        </button>
      </div>

      <div className="sc-empty-state-box">
        <p>No active escrows yet</p>
      </div>
    </div>
  )

  const renderMilestones = () => (
    <div className="sc-admin-section">
      <div className="sc-section-header">
        <h2>🎯 Milestone Distribution</h2>
        <button className="sc-btn-primary" onClick={() => setShowMilestoneModal(true)}>
          + Setup Distribution
        </button>
      </div>

      <div className="sc-empty-state-box">
        <p>No milestone distributions active</p>
      </div>
    </div>
  )

  const renderRoles = () => (
    <div className="sc-admin-section">
      <h2>🔑 Role Management</h2>
      <p className="sc-section-desc">Manage role assignments across all supply chain contracts</p>

      <div className="sc-roles-grid">
        <div className="sc-role-card">
          <h3>Invoice NFT Roles</h3>
          <div className="sc-role-item">
            <span>MINTER_ROLE</span>
            <button className="sc-btn-sm">Grant</button>
          </div>
          <div className="sc-role-item">
            <span>APPROVER_ROLE</span>
            <button className="sc-btn-sm">Grant</button>
          </div>
        </div>

        <div className="sc-role-card">
          <h3>Identity Registry Roles</h3>
          <div className="sc-role-item">
            <span>VERIFIER_ROLE</span>
            <button className="sc-btn-sm">Grant</button>
          </div>
        </div>

        <div className="sc-role-card">
          <h3>Oracle Roles</h3>
          <div className="sc-role-item">
            <span>ORACLE_ROLE</span>
            <button className="sc-btn-sm">Grant</button>
          </div>
        </div>

        <div className="sc-role-card">
          <h3>Escrow Roles</h3>
          <div className="sc-role-item">
            <span>ARBITRATOR_ROLE</span>
            <button className="sc-btn-sm">Grant</button>
          </div>
        </div>
      </div>
    </div>
  )

  const renderAnalytics = () => (
    <div className="sc-admin-section">
      <SupplyChainAnalytics />
    </div>
  )

  // ───────────────────────────────────────────────────────────────────────────
  // MAIN RENDER
  // ───────────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="sc-admin-loading">
        <div className="sc-loading-spinner"></div>
        <p>Loading Supply Chain Admin...</p>
      </div>
    )
  }

  return (
    <div className="sc-admin-dashboard">
      {/* Sidebar */}
      <aside className="sc-admin-sidebar">
        <div className="sc-sidebar-header">
          <h2>🏭 TOKLO</h2>
          <span>Supply Chain</span>
        </div>

        <nav className="sc-sidebar-nav">
          <button 
            className={`sc-nav-item ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <span className="sc-nav-icon">📊</span>
            <span>Overview</span>
          </button>
          <button 
            className={`sc-nav-item ${activeTab === 'invoices' ? 'active' : ''}`}
            onClick={() => setActiveTab('invoices')}
          >
            <span className="sc-nav-icon">📄</span>
            <span>Invoices</span>
          </button>
          <button 
            className={`sc-nav-item ${activeTab === 'escrows' ? 'active' : ''}`}
            onClick={() => setActiveTab('escrows')}
          >
            <span className="sc-nav-icon">🔒</span>
            <span>Escrows</span>
          </button>
          <button 
            className={`sc-nav-item ${activeTab === 'entities' ? 'active' : ''}`}
            onClick={() => setActiveTab('entities')}
          >
            <span className="sc-nav-icon">👥</span>
            <span>Entities</span>
          </button>
          <button 
            className={`sc-nav-item ${activeTab === 'financing' ? 'active' : ''}`}
            onClick={() => setActiveTab('financing')}
          >
            <span className="sc-nav-icon">💰</span>
            <span>Financing</span>
          </button>
          <button 
            className={`sc-nav-item ${activeTab === 'disputes' ? 'active' : ''}`}
            onClick={() => setActiveTab('disputes')}
          >
            <span className="sc-nav-icon">⚖️</span>
            <span>Disputes</span>
          </button>
          <button 
            className={`sc-nav-item ${activeTab === 'insurance' ? 'active' : ''}`}
            onClick={() => setActiveTab('insurance')}
          >
            <span className="sc-nav-icon">🛡️</span>
            <span>Insurance</span>
          </button>
          <button 
            className={`sc-nav-item ${activeTab === 'returns' ? 'active' : ''}`}
            onClick={() => setActiveTab('returns')}
          >
            <span className="sc-nav-icon">↩️</span>
            <span>Returns</span>
          </button>
          <button 
            className={`sc-nav-item ${activeTab === 'marketplace' ? 'active' : ''}`}
            onClick={() => setActiveTab('marketplace')}
          >
            <span className="sc-nav-icon">🏪</span>
            <span>Marketplace</span>
          </button>
          <button 
            className={`sc-nav-item ${activeTab === 'milestones' ? 'active' : ''}`}
            onClick={() => setActiveTab('milestones')}
          >
            <span className="sc-nav-icon">🎯</span>
            <span>Milestones</span>
          </button>
          <button 
            className={`sc-nav-item ${activeTab === 'roles' ? 'active' : ''}`}
            onClick={() => setActiveTab('roles')}
          >
            <span className="sc-nav-icon">🔑</span>
            <span>Roles</span>
          </button>
          <button 
            className={`sc-nav-item ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveTab('analytics')}
          >
            <span className="sc-nav-icon">📈</span>
            <span>Analytics</span>
          </button>
        </nav>

        <div className="sc-sidebar-footer">
          <div className="sc-admin-profile">
            <div className="sc-admin-avatar">👤</div>
            <div className="sc-admin-info">
              <div className="sc-admin-name">Admin</div>
              <div className="sc-admin-addr">{adminAddress.slice(0, 10)}...</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="sc-admin-content">
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'invoices' && renderInvoices()}
        {activeTab === 'entities' && renderEntities()}
        {activeTab === 'escrows' && renderEscrows()}
        {activeTab === 'milestones' && renderMilestones()}
        {activeTab === 'roles' && renderRoles()}
        {activeTab === 'analytics' && renderAnalytics()}
        
        {/* New Layer 11 Tabs */}
        {activeTab === 'financing' && (
          <SupplyChainAdvancedFinance signer={signer} walletAddress={adminAddress} />
        )}
        {activeTab === 'disputes' && (
          <SupplyChainDisputes signer={signer} walletAddress={adminAddress} />
        )}
        {activeTab === 'insurance' && (
          <SupplyChainInsurance signer={signer} walletAddress={adminAddress} />
        )}
        {activeTab === 'returns' && (
          <SupplyChainReturns signer={signer} walletAddress={adminAddress} />
        )}
        {activeTab === 'marketplace' && (
          <SupplyChainMarketplace signer={signer} walletAddress={adminAddress} />
        )}
      </main>

      {/* Modals will be added here */}
      {showMintModal && (
        <MintInvoiceModal 
          contracts={contracts} 
          onClose={() => setShowMintModal(false)}
          onSuccess={() => loadAllData(contracts, provider)}
        />
      )}
    </div>
  )
}

// ───────────────────────────────────────────────────────────────────────────
// MODAL COMPONENTS
// ───────────────────────────────────────────────────────────────────────────

function MintInvoiceModal({ contracts, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    supplier: '',
    buyer: '',
    amount: '',
    dueDate: '',
    metadataURI: ''
  })
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const dueDateTimestamp = Math.floor(new Date(formData.dueDate).getTime() / 1000)
      
      const tx = await contracts.INVOICE_NFT.mintInvoice(
        formData.supplier,
        formData.buyer,
        ethers.parseEther(formData.amount),
        dueDateTimestamp,
        formData.metadataURI || 'ipfs://QmDefault'
      )
      
      await tx.wait()
      alert('✅ Invoice minted successfully!')
      onSuccess()
      onClose()
    } catch (error) {
      alert('❌ Failed to mint invoice: ' + error.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="sc-modal-overlay" onClick={onClose}>
      <div className="sc-modal" onClick={(e) => e.stopPropagation()}>
        <div className="sc-modal-header">
          <h3>📝 Mint New Invoice</h3>
          <button className="sc-modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit} className="sc-modal-body">
          <div className="sc-form-group">
            <label>Supplier Address</label>
            <input
              type="text"
              value={formData.supplier}
              onChange={(e) => setFormData({...formData, supplier: e.target.value})}
              placeholder="0x..."
              required
            />
          </div>
          <div className="sc-form-group">
            <label>Buyer Address</label>
            <input
              type="text"
              value={formData.buyer}
              onChange={(e) => setFormData({...formData, buyer: e.target.value})}
              placeholder="0x..."
              required
            />
          </div>
          <div className="sc-form-group">
            <label>Amount (DWT)</label>
            <input
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData({...formData, amount: e.target.value})}
              placeholder="50000"
              required
            />
          </div>
          <div className="sc-form-group">
            <label>Due Date</label>
            <input
              type="date"
              value={formData.dueDate}
              onChange={(e) => setFormData({...formData, dueDate: e.target.value})}
              required
            />
          </div>
          <div className="sc-form-group">
            <label>Metadata URI (Optional)</label>
            <input
              type="text"
              value={formData.metadataURI}
              onChange={(e) => setFormData({...formData, metadataURI: e.target.value})}
              placeholder="ipfs://Qm..."
            />
          </div>
          <div className="sc-modal-footer">
            <button type="button" className="sc-btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="sc-btn-primary" disabled={submitting}>
              {submitting ? 'Minting...' : 'Mint Invoice'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
