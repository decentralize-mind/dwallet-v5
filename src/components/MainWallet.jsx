import { useState } from "react";
import { useWallet } from "../context/WalletContext";
import Dashboard from "./Dashboard";
import SendModal from "./SendModal";
import ReceiveModal from "./ReceiveModal";
import SwapModal from "./SwapModal";
import NFTsView from "./NFTsView";
import DAppsView from "./DAppsView";
import SettingsView from "./SettingsView";
import TransactionHistory from "./TransactionHistory";
import ChainSelector from "./ChainSelector";
import AccountSelector from "./AccountSelector";
import DefiView from "./DefiView";
import { CHAINS } from "../data/chains";
import { formatAddress } from "../utils/crypto";

const NAV_ITEMS = [
  { id: "dashboard", label: "Home",     icon: "⊞" },
  { id: "defi",      label: "DeFi",     icon: "◈" },
  { id: "history",   label: "Activity", icon: "↕"  },
  { id: "nfts",      label: "NFTs",     icon: "◇"  },
  { id: "dapps",     label: "dApps",    icon: "⬡"  },
  { id: "settings",  label: "Settings", icon: "⚙"  },
];

export default function MainWallet() {
  const { wallet, currentAddress, activeChain, totalUSDValue, lockWallet } = useWallet();
  const [activeTab,           setActiveTab]           = useState("dashboard");
  const [modal,               setModal]               = useState(null);
  const [showChainSelector,   setShowChainSelector]   = useState(false);
  const [showAccountSelector, setShowAccountSelector] = useState(false);

  const chain         = CHAINS[activeChain];
  const activeAccount = wallet?.accounts?.[wallet?.activeAccount];

  return (
    <div className="wallet-shell">
      <header className="topbar">
        <div className="topbar-left">
          <span className="wallet-logo">◈ dWallet</span>
        </div>
        <div className="topbar-center">
          <button className="chain-badge" onClick={() => setShowChainSelector(true)}>
            <span className="chain-dot" style={{ background: chain.color }} />
            {chain.name}
            <span className="chevron">▾</span>
          </button>
        </div>
        <div className="topbar-right">
          <button className="account-btn" onClick={() => setShowAccountSelector(true)}>
            <div className="account-avatar">{activeAccount?.name?.[0] || "A"}</div>
            <span className="account-label">{formatAddress(currentAddress)}</span>
          </button>
          <button className="icon-btn" onClick={lockWallet} title="Lock wallet">🔒</button>
        </div>
      </header>

      <main className="wallet-main">
        {activeTab === "dashboard" && <Dashboard onSend={() => setModal("send")} onReceive={() => setModal("receive")} onSwap={() => setActiveTab("defi")} />}
        {activeTab === "defi"      && <DefiView />}
        {activeTab === "history"   && <TransactionHistory />}
        {activeTab === "nfts"      && <NFTsView />}
        {activeTab === "dapps"     && <DAppsView />}
        {activeTab === "settings"  && <SettingsView />}
      </main>

      <nav className="bottom-nav">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            className={`nav-item ${activeTab === item.id ? "nav-item--active" : ""}`}
            onClick={() => setActiveTab(item.id)}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </button>
        ))}
      </nav>

      {modal === "send"    && <SendModal    onClose={() => setModal(null)} />}
      {modal === "receive" && <ReceiveModal onClose={() => setModal(null)} />}
      {showChainSelector   && <ChainSelector   onClose={() => setShowChainSelector(false)} />}
      {showAccountSelector && <AccountSelector onClose={() => setShowAccountSelector(false)} />}
    </div>
  );
}
