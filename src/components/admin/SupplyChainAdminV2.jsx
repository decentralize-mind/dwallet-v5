import { useState, useEffect } from 'react'
import { LAYER11_ADDRESSES, LAYER11_ABIS } from '../../config/layer11-contracts'
import { ethers } from 'ethers'
import SupplyChainInvoices from '../SupplyChainInvoices'
import SupplyChainEscrows from '../SupplyChainEscrows'
import SupplyChainEntities from '../SupplyChainEntities'
import SupplyChainDisputes from '../SupplyChainDisputes'
import SupplyChainInsurance from '../SupplyChainInsurance'
import SupplyChainReturns from '../SupplyChainReturns'
import SupplyChainAdvancedFinance from '../SupplyChainAdvancedFinance'
import SupplyChainMarketplace from '../SupplyChainMarketplace'
import SupplyChainIoT from '../SupplyChainIoT'
import SupplyChainWarehouse from '../SupplyChainWarehouse'
import SupplyChainSettings from '../SupplyChainSettings'
import SupplyChainAnalytics from './SupplyChainAnalytics'
import '../../styles/supply-chain-admin-v2.css'

// Contract addresses
const CONTRACTS = LAYER11_ADDRESSES.baseSepolia
export default function SupplyChainAdminV2() {
  const [activeModule, setActiveModule] = useState('dashboard')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [walletAddress, setWalletAddress] = useState('')
  const [signer, setSigner] = useState(null)
  const [loading, setLoading] = useState(true)
  const [contracts, setContracts] = useState({})
  const [stats, setStats] = useState({
    totalInvoices: 0,
    activeEscrows: 0,
    registeredEntities: 0,
    totalVolume: '0',
    pendingApprovals: 0,
    systemHealth: 100
  })

  // Initialize blockchain connection
  useEffect(() => {
    connectWallet()
  }, [])

  const connectWallet = async () => {
    try {
      if (!window.ethereum) {
        alert('Please install MetaMask!')
        setLoading(false)
        return
      }

      // Switch to Base Sepolia network
      const BASE_SEPOLIA_CHAIN_ID = '0x14a34' // 84532 in hex
      
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: BASE_SEPOLIA_CHAIN_ID }],
        })
      } catch (switchError) {
        // This error code indicates that the chain has not been added to MetaMask
        if (switchError.code === 4902) {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: BASE_SEPOLIA_CHAIN_ID,
                chainName: 'Base Sepolia',
                nativeCurrency: {
                  name: 'ETH',
                  symbol: 'ETH',
                  decimals: 18,
                },
                rpcUrls: ['https://sepolia.base.org'],
                blockExplorerUrls: ['https://sepolia.basescan.org'],
              },
            ],
          })
        } else {
          throw switchError
        }
      }

      const provider = new ethers.BrowserProvider(window.ethereum)
      const accounts = await provider.send("eth_requestAccounts", [])
      const web3Signer = await provider.getSigner()
      const address = await web3Signer.getAddress()

      setSigner(web3Signer)
      setWalletAddress(address)
      setIsConnected(true)
      
      // Initialize all contracts
      const initializedContracts = {}
      for (const [name, address] of Object.entries(LAYER11_ADDRESSES.baseSepolia)) {
        if (LAYER11_ABIS[name]) {
          initializedContracts[name] = new ethers.Contract(address, LAYER11_ABIS[name], web3Signer)
        }
      }
      setContracts(initializedContracts)
      
      setLoading(false)
      loadDashboardData()
    } catch (error) {
      console.error('Failed to connect wallet:', error)
      alert('Failed to connect wallet: ' + error.message)
      setLoading(false)
    }
  }

  const loadDashboardData = async () => {
    // Simulated data - replace with actual contract calls
    setStats({
      totalInvoices: 1247,
      activeEscrows: 89,
      registeredEntities: 156,
      totalVolume: '$2.4M',
      pendingApprovals: 23,
      systemHealth: 98.5
    })
    setLoading(false)
  }

  const modules = [
    { id: 'dashboard', name: 'Dashboard', icon: '📊' },
    { id: 'invoices', name: 'Invoices', icon: '📄' },
    { id: 'escrows', name: 'Escrows', icon: '🔒' },
    { id: 'entities', name: 'Entities', icon: '👥' },
    { id: 'financing', name: 'Financing', icon: '💰' },
    { id: 'disputes', name: 'Disputes', icon: '⚖️' },
    { id: 'insurance', name: 'Insurance', icon: '🛡️' },
    { id: 'returns', name: 'Returns', icon: '↩️' },
    { id: 'marketplace', name: 'Marketplace', icon: '🏪' },
    { id: 'iot', name: 'IoT Oracle', icon: '📡' },
    { id: 'warehouse', name: 'Warehouse', icon: '🏭' },
    { id: 'analytics', name: 'Analytics', icon: '📈' },
    { id: 'settings', name: 'Settings', icon: '⚙️' }
  ]

  if (loading) {
    return (
      <div className="sc-admin-v2-loading">
        <div className="loading-content">
          <div className="loading-spinner"></div>
          <p>Initializing Supply Chain Admin...</p>
        </div>
      </div>
    )
  }

  if (!isConnected) {
    return (
      <div className="sc-admin-v2-connect">
        <div className="connect-card">
          <div className="connect-icon">🔐</div>
          <h2>Connect Wallet to Continue</h2>
          <p>Connect your Web3 wallet to access the supply chain admin dashboard</p>
          <button className="btn-connect" onClick={connectWallet}>
            <span>Connect Wallet</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
            </svg>
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`sc-admin-v2 ${sidebarCollapsed ? 'collapsed' : ''}`}>
      {/* Sidebar */}
      <aside className="sc-admin-v2-sidebar">
        <div className="sidebar-header">
          <div className="brand">
            <div className="brand-icon">⛓️</div>
            {!sidebarCollapsed && <span className="brand-text">Supply Chain Admin</span>}
          </div>
          <button 
            className="btn-collapse"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            {sidebarCollapsed ? '→' : '←'}
          </button>
        </div>

        <nav className="sidebar-nav">
          {modules.map(module => (
            <button
              key={module.id}
              className={`nav-item ${activeModule === module.id ? 'active' : ''}`}
              onClick={() => setActiveModule(module.id)}
            >
              <span className="nav-icon">{module.icon}</span>
              {!sidebarCollapsed && <span className="nav-label">{module.name}</span>}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="wallet-info">
            <div className="wallet-icon">👛</div>
            {!sidebarCollapsed && (
              <span className="wallet-address">
                {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
              </span>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="sc-admin-v2-content">
        {/* Top Bar */}
        <header className="sc-admin-v2-header">
          <div className="header-left">
            <h1 className="page-title">
              {modules.find(m => m.id === activeModule)?.name || 'Dashboard'}
            </h1>
          </div>
          <div className="header-right">
            <div className="status-badge healthy">
              <span className="status-dot"></span>
              System Healthy
            </div>
            <button className="btn-refresh" onClick={loadDashboardData}>
              ↻
            </button>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="sc-admin-v2-body">
          {/* Module Content */}
          {activeModule === 'dashboard' && (
            <>
              {/* Stats Grid */}
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-header">
                    <div className="stat-icon invoices">📄</div>
                    <span className="stat-trend positive">+12%</span>
                  </div>
                  <div className="stat-value">{stats.totalInvoices.toLocaleString()}</div>
                  <div className="stat-label">Total Invoices</div>
                </div>

                <div className="stat-card">
                  <div className="stat-header">
                    <div className="stat-icon escrows">🔒</div>
                    <span className="stat-trend positive">+8%</span>
                  </div>
                  <div className="stat-value">{stats.activeEscrows}</div>
                  <div className="stat-label">Active Escrows</div>
                </div>

                <div className="stat-card">
                  <div className="stat-header">
                    <div className="stat-icon entities">👥</div>
                    <span className="stat-trend positive">+15%</span>
                  </div>
                  <div className="stat-value">{stats.registeredEntities}</div>
                  <div className="stat-label">Registered Entities</div>
                </div>

                <div className="stat-card">
                  <div className="stat-header">
                    <div className="stat-icon volume">💵</div>
                    <span className="stat-trend positive">+23%</span>
                  </div>
                  <div className="stat-value">{stats.totalVolume}</div>
                  <div className="stat-label">Total Volume</div>
                </div>

                <div className="stat-card">
                  <div className="stat-header">
                    <div className="stat-icon approvals">⏳</div>
                    <span className="stat-trend negative">-5%</span>
                  </div>
                  <div className="stat-value">{stats.pendingApprovals}</div>
                  <div className="stat-label">Pending Approvals</div>
                </div>

                <div className="stat-card">
                  <div className="stat-header">
                    <div className="stat-icon health">💚</div>
                    <span className="stat-trend positive">99.9%</span>
                  </div>
                  <div className="stat-value">{stats.systemHealth}%</div>
                  <div className="stat-label">System Health</div>
                </div>
              </div>

              {/* Recent Activity & Quick Actions */}
              <div className="dashboard-grid">
                <div className="panel">
                  <div className="panel-header">
                    <h3>Recent Activity</h3>
                    <button className="btn-view-all">View All</button>
                  </div>
                  <div className="activity-list">
                    <div className="activity-item">
                      <div className="activity-icon success">✓</div>
                      <div className="activity-content">
                        <div className="activity-title">Invoice #1247 Minted</div>
                        <div className="activity-meta">2 minutes ago • 0x1234...5678</div>
                      </div>
                    </div>
                    <div className="activity-item">
                      <div className="activity-icon pending">⏳</div>
                      <div className="activity-content">
                        <div className="activity-title">Escrow Release Pending</div>
                        <div className="activity-meta">15 minutes ago • $5,000</div>
                      </div>
                    </div>
                    <div className="activity-item">
                      <div className="activity-icon info">👤</div>
                      <div className="activity-content">
                        <div className="activity-title">New Entity Registered</div>
                        <div className="activity-meta">1 hour ago • Supplier Corp</div>
                      </div>
                    </div>
                    <div className="activity-item">
                      <div className="activity-icon warning">⚠️</div>
                      <div className="activity-content">
                        <div className="activity-title">IoT Alert: Temperature Spike</div>
                        <div className="activity-meta">2 hours ago • Shipment #892</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="panel">
                  <div className="panel-header">
                    <h3>Quick Actions</h3>
                  </div>
                  <div className="quick-actions">
                    <button className="action-btn">
                      <span className="action-icon">📄</span>
                      <span className="action-text">Mint Invoice</span>
                    </button>
                    <button className="action-btn">
                      <span className="action-icon">🔒</span>
                      <span className="action-text">Create Escrow</span>
                    </button>
                    <button className="action-btn">
                      <span className="action-icon">👤</span>
                      <span className="action-text">Register Entity</span>
                    </button>
                    <button className="action-btn">
                      <span className="action-icon">💰</span>
                      <span className="action-text">Request Loan</span>
                    </button>
                    <button className="action-btn">
                      <span className="action-icon">📡</span>
                      <span className="action-text">Submit IoT Event</span>
                    </button>
                    <button className="action-btn">
                      <span className="action-icon">✅</span>
                      <span className="action-text">Approve Milestone</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Contract Status */}
              <div className="panel">
                <div className="panel-header">
                  <h3>Smart Contract Status</h3>
                </div>
                <div className="contracts-grid">
                  {Object.entries(CONTRACTS).map(([name, address]) => (
                    <div key={name} className="contract-item">
                      <div className="contract-info">
                        <div className="contract-name">{name.replace(/_/g, ' ')}</div>
                        <div className="contract-address">{address}</div>
                      </div>
                      <div className="contract-status">
                        <span className="status-dot active"></span>
                        Active
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Non-Dashboard Modules */}
          {activeModule === 'invoices' && <SupplyChainInvoices contracts={contracts} />}
          {activeModule === 'escrows' && <SupplyChainEscrows contracts={contracts} />}
          {activeModule === 'entities' && <SupplyChainEntities contracts={contracts} />}
          {activeModule === 'financing' && <SupplyChainAdvancedFinance signer={signer} walletAddress={walletAddress} />}
          {activeModule === 'disputes' && <SupplyChainDisputes signer={signer} walletAddress={walletAddress} />}
          {activeModule === 'insurance' && <SupplyChainInsurance signer={signer} walletAddress={walletAddress} />}
          {activeModule === 'returns' && <SupplyChainReturns signer={signer} walletAddress={walletAddress} />}
          {activeModule === 'marketplace' && <SupplyChainMarketplace signer={signer} walletAddress={walletAddress} />}
          
          {activeModule === 'iot' && <SupplyChainIoT contracts={contracts} />}
          
          {activeModule === 'warehouse' && <SupplyChainWarehouse />}
          
          {activeModule === 'analytics' && <SupplyChainAnalytics />}
          
          {activeModule === 'settings' && <SupplyChainSettings />}
        </div>
      </main>
    </div>
  )
}
