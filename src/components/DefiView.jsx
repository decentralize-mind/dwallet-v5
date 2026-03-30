import { useState } from 'react'
import SwapPanel from './defi/SwapPanel'
import StakingPanel from './defi/StakingPanel'
import LendingPanel from './defi/LendingPanel'
import YieldPanel from './defi/YieldPanel'
import DWTStakingPanel from './DWTStakingPanel'

const TABS = [
  { id: 'swap', label: 'Swap', icon: '⇄' },
  { id: 'stake', label: 'Stake', icon: '⬡' },
  { id: 'lending', label: 'Lend', icon: '⊕' },
  { id: 'yield', label: 'Yield LP', icon: '◈' },
]

export default function DefiView() {
  const [activeTab, setActiveTab] = useState('swap')

  return (
    <div className="view-container defi-view">
      <div className="view-header">
        <h2 className="view-title">DeFi</h2>
        <span className="defi-badge">Mainnet</span>
      </div>

      {/* Tab switcher */}
      <div className="defi-tabs">
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`defi-tab ${activeTab === tab.id ? 'defi-tab--active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="defi-tab-icon">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      <DWTStakingPanel />

      {/* Panel content */}
      <div className="defi-panel">
        {activeTab === 'swap' && <SwapPanel />}
        {activeTab === 'stake' && <StakingPanel />}
        {activeTab === 'lending' && <LendingPanel />}
        {activeTab === 'yield' && <YieldPanel />}
      </div>
    </div>
  )
}
