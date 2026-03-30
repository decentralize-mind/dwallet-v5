import { useState, useEffect } from 'react'
import { useWallet } from '../hooks/useWallet'
import Dashboard from './Dashboard'
import SendModal from './SendModal'
import ReceiveModal from './ReceiveModal'
import NFTsView from './NFTsView'
import DAppsView from './DAppsView'
import SettingsView from './SettingsView'
import TransactionHistory from './TransactionHistory'
import ChainSelector from './ChainSelector'
import AccountSelector from './AccountSelector'
import DefiView from './DefiView'
import AddressBook from './AddressBook'
import PriceAlertsPanel from './PriceAlertsPanel'
import GasTracker from './GasTracker'
import TokenImport from './TokenImport'
import { CHAINS } from '../data/chains'
import { formatAddress } from '../utils/crypto'

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Home', icon: '⊞' },
  { id: 'defi', label: 'DeFi', icon: '◈' },
  { id: 'history', label: 'Activity', icon: '↕' },
  { id: 'nfts', label: 'NFTs', icon: '◇' },
  { id: 'dapps', label: 'dApps', icon: '⬡' },
  { id: 'settings', label: 'Settings', icon: '⚙' },
]

export default function MainWallet() {
  const { wallet, currentAddress, activeChain, lockWallet } = useWallet()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [subView, setSubView] = useState(null)
  const [modal, setModal] = useState(null)
  const [showChainSelector, setShowChainSelector] = useState(false)
  const [showAccountSelector, setShowAccountSelector] = useState(false)

  const chain = CHAINS[activeChain] || CHAINS.ethereum
  const activeAccount = wallet?.accounts?.[wallet?.activeAccount]

  // Apply saved theme safely
  useEffect(() => {
    try {
      const saved = localStorage.getItem('dwallet_theme') || 'dark'
      const r = document.documentElement
      if (saved === 'light') {
        r.style.setProperty('--bg', '#ffffff')
        r.style.setProperty('--bg2', '#f8f9fa')
        r.style.setProperty('--bg3', '#f0f2f5')
        r.style.setProperty('--bg4', '#e4e6ea')
        r.style.setProperty('--text', '#0d0f14')
        r.style.setProperty('--text2', '#4a5568')
        r.style.setProperty('--text3', '#9aa5b4')
        r.style.setProperty('--border', 'rgba(0,0,0,0.1)')
      }
    } catch {
      // Ignore theme setting errors
    }
  }, [])

  const handleNavTab = tab => {
    setActiveTab(tab)
    setSubView(null)
  }

  const renderMain = () => {
    if (subView === 'addressbook') return <AddressBook onSelect={null} />
    if (subView === 'alerts') return <PriceAlertsPanel />
    if (subView === 'gas') return <GasTracker />
    if (subView === 'tokenimport')
      return (
        <TokenImport
          activeChain={activeChain}
          walletAddress={currentAddress}
          onAdded={() => {}}
        />
      )

    switch (activeTab) {
      case 'defi':
        return <DefiView />
      case 'history':
        return <TransactionHistory />
      case 'nfts':
        return <NFTsView />
      case 'dapps':
        return <DAppsView />
      case 'settings':
        return <SettingsView onNavigate={setSubView} />
      case 'dashboard':
      default:
        return (
          <Dashboard
            onSend={() => setModal('send')}
            onReceive={() => setModal('receive')}
            onSwap={() => setActiveTab('defi')}
          />
        )
    }
  }

  return (
    <div className="wallet-shell">
      <header className="topbar">
        <div className="topbar-left">
          {subView ? (
            <button
              className="icon-btn"
              onClick={() => setSubView(null)}
              style={{ fontSize: 18 }}
            >
              ←
            </button>
          ) : (
            <span className="wallet-logo">◈ Toklo</span>
          )}
        </div>
        <div className="topbar-center">
          <button
            className="chain-badge"
            onClick={() => setShowChainSelector(true)}
          >
            <span className="chain-dot" style={{ background: chain.color }} />
            {chain.name}
            <span className="chevron">▾</span>
          </button>
        </div>
        <div className="topbar-right">
          <button
            className="account-btn"
            onClick={() => setShowAccountSelector(true)}
          >
            <div className="account-avatar">
              {activeAccount?.name?.[0] || 'A'}
            </div>
            <span className="account-label">
              {formatAddress(currentAddress)}
            </span>
          </button>
          <button className="icon-btn" onClick={lockWallet} title="Lock">
            🔒
          </button>
        </div>
      </header>

      <main className="wallet-main">{renderMain()}</main>

      <nav className="bottom-nav">
        {NAV_ITEMS.map(item => (
          <button
            key={item.id}
            className={
              'nav-item ' +
              (activeTab === item.id && !subView ? 'nav-item--active' : '')
            }
            onClick={() => handleNavTab(item.id)}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </button>
        ))}
      </nav>

      {modal === 'send' && <SendModal onClose={() => setModal(null)} />}
      {modal === 'receive' && <ReceiveModal onClose={() => setModal(null)} />}
      {showChainSelector && (
        <ChainSelector onClose={() => setShowChainSelector(false)} />
      )}
      {showAccountSelector && (
        <AccountSelector onClose={() => setShowAccountSelector(false)} />
      )}
    </div>
  )
}
