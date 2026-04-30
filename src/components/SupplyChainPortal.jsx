import { useState, useEffect, useCallback } from 'react'
import { ethers } from 'ethers'
import SupplyChainLogin from './SupplyChainLogin'
import SupplyChainDashboard from './SupplyChainDashboard'
import SupplyChainInvoices from './SupplyChainInvoices'
import SupplyChainEscrows from './SupplyChainEscrows'
import SupplyChainEntities from './SupplyChainEntities'
import SupplyChainFinancing from './SupplyChainFinancing'
import SupplyChainIoT from './SupplyChainIoT'
import SupplyChainWarehouse from './SupplyChainWarehouse'
import SupplyChainManufacturing from './SupplyChainManufacturing'
import SupplyChainAnalytics from './admin/SupplyChainAnalytics'
import SupplyChainSettings from './SupplyChainSettings'
import '../styles/supply-chain-portal.css'

// Smart Contract Configuration
const CONTRACTS = {
  INVOICE_NFT: "0x213AC061FEe90Daed5aa345F56B9331501a89c38",
  ESCROW: "0x653e5B9884d2678CE5eCe6cc85Ea21Ba04c05378",
  IDENTITY_REGISTRY: "0xaaE1D2a14FD9DDA015db9494550769FEeA3AD3a6",
  ORACLE_ADAPTER: "0xc6afA5dd7C494b0d7D74949b639199cDD2B2761e",
  MILESTONE_DIST: "0xe7Be58eE05BD7a8DC77CFD2A01b9798f6b3BDeF5",
  FINANCING_POOL: "0x32b2A1356b8b52CAE5C65d7d683C92164416D08b",
  DWT_TOKEN: "0x75A884C401A69481d4377F79dc1918b3D18e2aE8",
  RETURNS: "0x...", // Add when deployed
  WAREHOUSE: "0x...", // Add when deployed
  MANUFACTURING: "0x..." // Add when deployed
}

const CONTRACT_ABIS = {
  INVOICE_NFT: [
    "function totalSupply() view returns (uint256)",
    "function getInvoice(uint256 invoiceId) view returns (address supplier, address buyer, uint256 amount, uint256 dueDate, uint8 status, string metadataURI)",
    "function mintInvoice(address supplier, address buyer, uint256 amount, uint256 dueDate, string metadataURI) returns (uint256)",
    "function approveInvoice(uint256 invoiceId)",
    "function payInvoice(uint256 invoiceId)",
    "function hasRole(bytes32 role, address account) view returns (bool)",
    "function MINTER_ROLE() view returns (bytes32)",
    "function DEFAULT_ADMIN_ROLE() view returns (bytes32)",
    "event InvoiceMinted(uint256 invoiceId, address supplier, address buyer, uint256 amount)"
  ],
  ESCROW: [
    "function getEscrow(uint256 escrowId) view returns (address buyer, address supplier, uint256 amount, uint256 invoiceId, uint8 status)",
    "function createEscrow(uint256 invoiceId, address supplier, uint256 amount) returns (uint256)",
    "function confirmDelivery(uint256 escrowId, string deliveryProof)",
    "function resolveDispute(uint256 escrowId, bool refundToBuyer)",
    "function releaseFunds(uint256 escrowId)",
    "event EscrowCreated(uint256 escrowId, uint256 invoiceId)",
    "event EscrowReleased(uint256 escrowId)"
  ],
  IDENTITY_REGISTRY: [
    "function isRegistered(address entity) view returns (bool)",
    "function getEntityProfile(address entity) view returns (string name, uint8 entityType, string registrationId, uint8 kycStatus, uint256 reputationScore, bool isBlacklisted, string documentHash)",
    "function registerEntity(string name, uint8 entityType, string registrationId, string documentHash)",
    "function updateKYCStatus(address entity, uint8 kycStatus, string notes)",
    "function updateReputation(address entity, uint256 score)",
    "function VERIFIER_ROLE() view returns (bytes32)"
  ],
  ORACLE_ADAPTER: [
    "function getOracleEvent(uint256 eventId) view returns (uint256 invoiceId, uint8 eventType, uint256 timestamp, uint8 status, uint256 confirmations, uint256 requiredConfirmations, string proofURI)",
    "function submitEvent(uint256 invoiceId, uint8 eventType, string proofURI) returns (uint256)",
    "function confirmEvent(uint256 eventId)",
    "function ORACLE_ROLE() view returns (bytes32)"
  ],
  MILESTONE_DIST: [
    "function getDistribution(address beneficiary) view returns (address beneficiary, uint256 totalAllocation, uint256 totalReleased, uint256 milestoneCount, bool isActive)",
    "function createDistribution(address beneficiary, uint256 totalAllocation, string[] milestoneNames, string[] milestoneDescriptions, uint256[] milestoneRewards)",
    "function submitMilestoneProof(uint256 milestoneId, string proofURI)",
    "function approveMilestone(uint256 milestoneId)"
  ],
  FINANCING_POOL: [
    "function getTotalLiquidity() view returns (uint256)",
    "function getLoanDetails(uint256 loanId) view returns (address borrower, uint256 principal, uint256 interest, uint256 duration, uint8 status)",
    "function requestLoan(uint256 invoiceId, uint256 amount, uint256 duration) returns (uint256)",
    "function repayLoan(uint256 loanId)",
    "function provideLiquidity(uint256 amount)",
    "function withdrawLiquidity(uint256 amount)"
  ],
  DWT_TOKEN: [
    "function balanceOf(address account) view returns (uint256)",
    "function totalSupply() view returns (uint256)",
    "function transfer(address to, uint256 amount) returns (bool)",
    "function approve(address spender, uint256 amount) returns (bool)"
  ]
}

export default function SupplyChainPortal({ authToken }) {
  const [isAuthenticated, setIsAuthenticated] = useState(!!authToken)
  const [user, setUser] = useState(null)
  const [activeModule, setActiveModule] = useState('dashboard')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  
  // Blockchain state
  const [provider, setProvider] = useState(null)
  const [signer, setSigner] = useState(null)
  const [contracts, setContracts] = useState({})
  const [walletAddress, setWalletAddress] = useState('')
  const [network, setNetwork] = useState(null)
  const [loading, setLoading] = useState(false)

  // Check authentication on mount
  useEffect(() => {
    // If authToken is provided via props, use it
    if (authToken) {
      setIsAuthenticated(true)
      initializeBlockchain()
      return
    }

    const authData = localStorage.getItem('sc_auth')
    if (authData) {
      try {
        const parsed = JSON.parse(authData)
        if (parsed.token && parsed.expires > Date.now()) {
          setIsAuthenticated(true)
          setUser(parsed.user)
          initializeBlockchain()
        } else {
          localStorage.removeItem('sc_auth')
        }
      } catch (e) {
        localStorage.removeItem('sc_auth')
      }
    }
  }, [authToken])

  const initializeBlockchain = async () => {
    try {
      if (!window.ethereum) {
        console.warn('MetaMask not detected')
        return
      }

      const web3Provider = new ethers.BrowserProvider(window.ethereum)
      const accounts = await web3Provider.send("eth_requestAccounts", [])
      const web3Signer = await web3Provider.getSigner()
      const address = await web3Signer.getAddress()
      const networkInfo = await web3Provider.getNetwork()

      setProvider(web3Provider)
      setSigner(web3Signer)
      setWalletAddress(address)
      setNetwork(networkInfo)

      // Initialize all contracts
      const loadedContracts = {}
      for (const [name, address] of Object.entries(CONTRACTS)) {
        if (address && address !== "0x...") {
          loadedContracts[name] = new ethers.Contract(address, CONTRACT_ABIS[name], web3Signer)
        }
      }
      setContracts(loadedContracts)
    } catch (error) {
      console.error('Blockchain initialization failed:', error)
    }
  }

  const handleLogin = useCallback((authData) => {
    setIsAuthenticated(true)
    setUser(authData.user)
    localStorage.setItem('sc_auth', JSON.stringify(authData))
    initializeBlockchain()
  }, [])

  const handleLogout = useCallback(() => {
    setIsAuthenticated(false)
    setUser(null)
    setProvider(null)
    setSigner(null)
    setContracts({})
    setWalletAddress('')
    localStorage.removeItem('sc_auth')
  }, [])

  const handleAuthRequired = useCallback(() => {
    handleLogout()
  }, [handleLogout])

  if (!isAuthenticated) {
    return <SupplyChainLogin onLogin={handleLogin} />
  }

  const modules = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊', description: 'Overview & metrics' },
    { id: 'invoices', label: 'Invoices', icon: '📄', description: 'Create & manage invoices' },
    { id: 'escrows', label: 'Escrows', icon: '🔒', description: 'Secure payments' },
    { id: 'entities', label: 'Entities', icon: '👥', description: 'Identity registry' },
    { id: 'financing', label: 'Financing', icon: '💰', description: 'Loans & liquidity' },
    { id: 'iot', label: 'IoT Oracle', icon: '📡', description: 'Event tracking' },
    { id: 'warehouse', label: 'Warehouse', icon: '🏭', description: 'Inventory management' },
    { id: 'manufacturing', label: 'Manufacturing', icon: '⚙️', description: 'Production tracking' },
    { id: 'analytics', label: 'Analytics', icon: '📈', description: 'Reports & insights' },
    { id: 'settings', label: 'Settings', icon: '⚙️', description: 'Configuration' },
  ]

  const renderModule = () => {
    const props = {
      contracts,
      provider,
      signer,
      walletAddress,
      network,
      onAuthRequired: handleAuthRequired
    }

    switch (activeModule) {
      case 'dashboard':
        return <SupplyChainDashboard {...props} />
      case 'invoices':
        return <SupplyChainInvoices {...props} />
      case 'escrows':
        return <SupplyChainEscrows {...props} />
      case 'entities':
        return <SupplyChainEntities {...props} />
      case 'financing':
        return <SupplyChainFinancing {...props} />
      case 'iot':
        return <SupplyChainIoT {...props} />
      case 'warehouse':
        return <SupplyChainWarehouse {...props} />
      case 'manufacturing':
        return <SupplyChainManufacturing {...props} />
      case 'analytics':
        return <SupplyChainAnalytics />
      case 'settings':
        return <SupplyChainSettings />
      default:
        return <SupplyChainDashboard {...props} />
    }
  }

  return (
    <div className={`sc-portal ${sidebarCollapsed ? 'sc-portal--sidebar-collapsed' : ''}`}>
      {/* Sidebar */}
      <aside className="sc-portal-sidebar">
        <div className="sc-sidebar-header">
          <div className="sc-logo">
            <span className="sc-logo-icon">🏭</span>
            {!sidebarCollapsed && <span className="sc-logo-text">TOKLO Supply Chain</span>}
          </div>
          <button 
            className="sc-sidebar-toggle"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            title={sidebarCollapsed ? 'Expand' : 'Collapse'}
          >
            {sidebarCollapsed ? '▶' : '◀'}
          </button>
        </div>

        <nav className="sc-sidebar-nav">
          {modules.map(module => (
            <button
              key={module.id}
              className={`sc-nav-item ${activeModule === module.id ? 'active' : ''}`}
              onClick={() => setActiveModule(module.id)}
              title={sidebarCollapsed ? module.label : undefined}
            >
              <span className="sc-nav-icon">{module.icon}</span>
              {!sidebarCollapsed && (
                <div className="sc-nav-content">
                  <span className="sc-nav-label">{module.label}</span>
                  <span className="sc-nav-desc">{module.description}</span>
                </div>
              )}
            </button>
          ))}
        </nav>

        <div className="sc-sidebar-footer">
          <div className="sc-user-profile">
            <div className="sc-user-avatar">👤</div>
            {!sidebarCollapsed && (
              <div className="sc-user-info">
                <div className="sc-user-name">{user?.name || 'User'}</div>
                <div className="sc-user-address">
                  {walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : 'Not connected'}
                </div>
              </div>
            )}
          </div>
          <button className="sc-logout-btn" onClick={handleLogout}>
            <span className="sc-logout-icon">🚪</span>
            {!sidebarCollapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="sc-portal-content">
        <header className="sc-portal-header">
          <div className="sc-header-left">
            <h1 className="sc-page-title">
              {modules.find(m => m.id === activeModule)?.icon} {modules.find(m => m.id === activeModule)?.label}
            </h1>
          </div>
          <div className="sc-header-right">
            <div className="sc-network-badge">
              <span className="sc-network-dot"></span>
              {network ? `Chain ID: ${network.chainId}` : 'Connecting...'}
            </div>
            <div className="sc-wallet-badge">
              {walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : 'No Wallet'}
            </div>
          </div>
        </header>

        <div className="sc-portal-body">
          {renderModule()}
        </div>
      </main>
    </div>
  )
}
