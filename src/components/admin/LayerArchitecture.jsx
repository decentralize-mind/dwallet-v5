import { useState } from 'react'
import '../../styles/admin-settings.css'

export default function LayerArchitecture() {
  const [selectedLayer, setSelectedLayer] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Complete Layer 0-10 Architecture
  const layers = [
    {
      id: 0,
      name: 'Protocol Registry & Infrastructure',
      icon: '🏗️',
      status: 'deployed',
      security: '9.5/10',
      contracts: [
        { name: 'ProtocolRegistry', address: '0x...', deployed: true },
        { name: 'NetworkConfig', address: '0x...', deployed: true }
      ],
      description: 'Core protocol registry and network configuration',
      features: ['Contract registry', 'Network parameters', 'Protocol metadata'],
      color: '#6366f1'
    },
    {
      id: 1,
      name: 'Governance & Token',
      icon: '🏛️',
      status: 'deployed',
      security: '10/10',
      contracts: [
        { name: 'DWTToken', address: '0x3400b0167dA5b2dba0b88b9604eE7df4BFc1f1fa', deployed: true },
        { name: 'DWTGovernor', address: '0xD1779aD62De0bEeD47Fe60d481593BF5EA0f1c21', deployed: true },
        { name: 'TimeLockController', address: '0x1A8AEe3E1B69959DCfF9E4A0bd0757e8451a49c4', deployed: true },
        { name: 'Treasury', address: '0x...', deployed: true }
      ],
      description: 'ERC20 token, DAO governance, timelock, and treasury management',
      features: ['Token minting/burning', 'Proposal creation', 'Voting mechanism', '48h timelock'],
      color: '#8b5cf6'
    },
    {
      id: 2,
      name: 'DEX & Liquidity',
      icon: '🔄',
      status: 'partial',
      security: '9/10',
      contracts: [
        { name: 'SwapRouter', address: '0x...', deployed: false },
        { name: 'FeeRouter', address: '0x94cC0AaC535CCDB3C01d6787D6413C739ae12bc4', deployed: true },
        { name: 'LiquidityIncentive', address: '0x...', deployed: false }
      ],
      description: 'Automated market maker and liquidity pool management',
      features: ['Token swaps', 'LP rewards', 'Fee distribution', 'Limit orders'],
      color: '#ec4899'
    },
    {
      id: 3,
      name: 'Infrastructure & Oracles',
      icon: '🔮',
      status: 'deployed',
      security: '9.5/10',
      contracts: [
        { name: 'DWTPriceOracle', address: '0x...', deployed: true },
        { name: 'RateFeed', address: '0x...', deployed: true },
        { name: 'Paymaster', address: '0x...', deployed: true }
      ],
      description: 'Price feeds, gas paymaster, and infrastructure services',
      features: ['Chainlink feeds', 'Gas abstraction', 'Rate limiting', 'Emergency pause'],
      color: '#f59e0b'
    },
    {
      id: 4,
      name: 'Staking & Rewards',
      icon: '💎',
      status: 'deployed',
      security: '10/10',
      contracts: [
        { name: 'StakingPool', address: '0x87a1F9a1daE18fA1a6a00A4a55fff66b3af86D4a', deployed: true },
        { name: 'DWTStaking', address: '0x...', deployed: true }
      ],
      description: 'Auto-compounding staking and reward distribution',
      features: ['sDWT tokens', 'ETH rewards', 'Lock periods', 'Auto-compound'],
      color: '#10b981'
    },
    {
      id: 5,
      name: 'Cross-Chain Hub & Flash Loans',
      icon: '⚡',
      status: 'partial',
      security: '9/10',
      contracts: [
        { name: 'FlashLoanProvider', address: '0x...', deployed: true },
        { name: 'CrossChainHub', address: '0x...', deployed: false },
        { name: 'VeDWT', address: '0x...', deployed: false }
      ],
      description: 'Flash loan protocol and cross-chain coordination',
      features: ['Flash loans', 'veDWT escrow', 'Gauge voting', 'Cross-chain msgs'],
      color: '#06b6d4'
    },
    {
      id: 6,
      name: 'Treasury & Vesting',
      icon: '💰',
      status: 'deployed',
      security: '9.5/10',
      contracts: [
        { name: 'FeeSplitter', address: '0x...', deployed: true },
        { name: 'BuybackAndBurn', address: '0x...', deployed: true },
        { name: 'VestingContract', address: '0x...', deployed: true }
      ],
      description: 'Fee distribution, token buyback, and team vesting',
      features: ['Fee routing', 'Buyback burns', 'Team vesting', 'Treasury mgmt'],
      color: '#84cc16'
    },
    {
      id: 7,
      name: 'Security Controller',
      icon: '🛡️',
      status: 'deployed',
      security: '10/10',
      contracts: [
        { name: 'Layer7Security', address: '0x20d859c9EB3FA612C604213F74dcC6Ae49Cd040c', deployed: true },
        { name: 'SecurityController', address: '0xBc864c087E89607F7A7fF2fE993Bbe5d7d05D8eC', deployed: true },
        { name: 'LockEngine', address: '0xb961B0164251A86cdA96992Fad8E8c17E9D04E01', deployed: true },
        { name: 'RateLimiter', address: '0xe619317dE0CF667e2ce29Db0372f64007fa2A56e', deployed: true }
      ],
      description: 'Unified security layer with emergency controls',
      features: ['Circuit breaker', 'Rate limiting', 'Emergency pause', 'Invariant checks'],
      color: '#ef4444'
    },
    {
      id: 8,
      name: 'Cross-Chain Bridge',
      icon: '🌉',
      status: 'deployed',
      security: '9.8/10',
      contracts: [
        { name: 'Layer8Bridge', address: '0x...', deployed: true },
        { name: 'BridgedToken', address: '0x...', deployed: true },
        { name: 'CrossChainStaking', address: '0x...', deployed: true },
        { name: 'CrossChainGovernance', address: '0x...', deployed: true }
      ],
      description: 'Multi-chain bridge with 7-of-15 relayer multisig',
      features: ['7/15 multisig', 'Relayer network', 'Cross-chain tokens', 'Bridge limits'],
      color: '#3b82f6'
    },
    {
      id: 9,
      name: 'Ecosystem Extensions',
      icon: '🎮',
      status: 'deployed',
      security: '9/10',
      contracts: [
        { name: 'LendingMarket', address: '0x...', deployed: true },
        { name: 'NFTMembership', address: '0x77c3f6A47a37AE3eF26F48A73430EAed79Af59b7', deployed: true },
        { name: 'SwapRouter', address: '0x...', deployed: true },
        { name: 'DWalletStablecoin', address: '0x...', deployed: true }
      ],
      description: 'Lending protocol, NFT membership, and stablecoin',
      features: ['Lending/borrowing', 'NFT tiers', 'Stablecoin minting', 'Affiliate rewards'],
      color: '#a855f7'
    },
    {
      id: 10,
      name: 'Advanced DeFi',
      icon: '📈',
      status: 'partial',
      security: '8.5/10',
      contracts: [
        { name: 'OptionsProtocol', address: '0x...', deployed: false },
        { name: 'PerpetualsExchange', address: '0x...', deployed: false },
        { name: 'PredictionMarket', address: '0x...', deployed: false },
        { name: 'YieldVault', address: '0x...', deployed: true }
      ],
      description: 'Options, perpetuals, prediction markets, and yield strategies',
      features: ['Options trading', 'Perpetuals', 'Prediction markets', 'Yield vaults'],
      color: '#f97316'
    }
  ]

  const getStatusColor = (status) => {
    switch(status) {
      case 'deployed': return 'var(--green)';
      case 'partial': return 'var(--yellow)';
      case 'not_deployed': return 'var(--red)';
      default: return 'var(--text2)';
    }
  }

  const copyAddress = (address) => {
    navigator.clipboard.writeText(address)
    alert(`✅ Address copied: ${address}`)
  }

  const filteredLayers = layers.filter(layer =>
    layer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    layer.contracts.some(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const totalContracts = layers.reduce((sum, l) => sum + l.contracts.length, 0)
  const deployedContracts = layers.reduce((sum, l) => sum + l.contracts.filter(c => c.deployed).length, 0)

  return (
    <div className="admin-panel">
      <div className="admin-panel-header">
        <div>
          <h2 className="admin-panel-title">🏗️ Layer Architecture</h2>
          <p className="admin-panel-subtitle">Complete Layer 0-10 contract deployment overview</p>
        </div>
        <div className="layer-stats">
          <span className="layer-stat-badge">
            {deployedContracts}/{totalContracts} Contracts Deployed
          </span>
        </div>
      </div>

      {/* Architecture Overview */}
      <div className="layer-overview-banner">
        <div className="layer-overview-item">
          <p className="layer-overview-label">Total Layers</p>
          <p className="layer-overview-value">11</p>
          <p className="layer-overview-desc">Layer 0 - 10</p>
        </div>
        <div className="layer-overview-divider"></div>
        <div className="layer-overview-item">
          <p className="layer-overview-label">Deployed</p>
          <p className="layer-overview-value success">{layers.filter(l => l.status === 'deployed').length}</p>
          <p className="layer-overview-desc">Fully operational</p>
        </div>
        <div className="layer-overview-divider"></div>
        <div className="layer-overview-item">
          <p className="layer-overview-label">Partial</p>
          <p className="layer-overview-value warning">{layers.filter(l => l.status === 'partial').length}</p>
          <p className="layer-overview-desc">Some contracts pending</p>
        </div>
        <div className="layer-overview-divider"></div>
        <div className="layer-overview-item">
          <p className="layer-overview-label">Avg Security</p>
          <p className="layer-overview-value success">9.4/10</p>
          <p className="layer-overview-desc">Across all layers</p>
        </div>
      </div>

      {/* Search */}
      <div className="layer-search-container">
        <input
          type="text"
          className="layer-search-input"
          placeholder="🔍 Search layers or contracts..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Layers Grid */}
      <div className="layers-grid">
        {filteredLayers.map(layer => (
          <div 
            key={layer.id} 
            className={`layer-card ${selectedLayer === layer.id ? 'selected' : ''}`}
            onClick={() => setSelectedLayer(selectedLayer === layer.id ? null : layer.id)}
            style={{ '--layer-color': layer.color }}
          >
            <div className="layer-card-header">
              <div className="layer-icon-wrapper">
                <span className="layer-icon">{layer.icon}</span>
                <span className="layer-number">L{layer.id}</span>
              </div>
              <div className="layer-status-group">
                <span 
                  className="layer-status-badge"
                  style={{ 
                    background: `${getStatusColor(layer.status)}20`,
                    color: getStatusColor(layer.status),
                    border: `1px solid ${getStatusColor(layer.status)}40`
                  }}
                >
                  {layer.status}
                </span>
                <span className="layer-security-badge">
                  🔒 {layer.security}
                </span>
              </div>
            </div>

            <h3 className="layer-name">{layer.name}</h3>
            <p className="layer-description">{layer.description}</p>

            <div className="layer-contracts-preview">
              <span className="layer-contracts-count">
                {layer.contracts.filter(c => c.deployed).length}/{layer.contracts.length} contracts
              </span>
            </div>

            {selectedLayer === layer.id && (
              <div className="layer-details">
                <div className="layer-features">
                  <h4 className="layer-features-title">Key Features</h4>
                  <ul className="layer-features-list">
                    {layer.features.map((feature, idx) => (
                      <li key={idx}>{feature}</li>
                    ))}
                  </ul>
                </div>

                <div className="layer-contracts-list">
                  <h4 className="layer-contracts-title">Contracts</h4>
                  {layer.contracts.map((contract, idx) => (
                    <div key={idx} className={`layer-contract-item ${contract.deployed ? '' : 'not-deployed'}`}>
                      <div className="layer-contract-info">
                        <span className={`layer-contract-status ${contract.deployed ? 'deployed' : 'pending'}`}>
                          {contract.deployed ? '✓' : '○'}
                        </span>
                        <span className="layer-contract-name">{contract.name}</span>
                      </div>
                      {contract.deployed && (
                        <button 
                          className="layer-copy-btn"
                          onClick={(e) => {
                            e.stopPropagation()
                            copyAddress(contract.address)
                          }}
                        >
                          📋 Copy
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="layer-actions">
                  <button className="layer-action-btn primary">
                    🔗 View on BaseScan
                  </button>
                  <button className="layer-action-btn secondary">
                    📄 View ABI
                  </button>
                  {layer.status === 'partial' && (
                    <button className="layer-action-btn warning">
                      🚀 Deploy Remaining
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
