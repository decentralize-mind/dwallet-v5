import { useState } from "react";
import { DAPPS } from "../data/chains";
import { useWallet } from "../context/WalletContext";
import { useWalletConnect } from "../context/WalletConnectContext";
import { WalletConnectModal, ActiveSessionsList } from "./WalletConnectModal";

export default function DAppsView() {
  const { currentAddress } = useWallet();
  const { wcReady, hasProjectId } = useWalletConnect();
  const [showWCModal, setShowWCModal]   = useState(false);
  const [connecting, setConnecting]     = useState(null);   // legacy mock connect
  const [connected, setConnected]       = useState([]);
  const [category, setCategory]         = useState("All");

  const categories = ["All", "DEX", "Lending", "NFT", "Stablecoin"];
  const filtered = DAPPS.filter((d) => category === "All" || d.category === category);

  const handleLegacyConnect = (dapp) => setConnecting(dapp);
  const confirmLegacyConnect = () => {
    if (connecting) {
      setConnected((prev) => [...prev, connecting.name]);
      setConnecting(null);
    }
  };
  const disconnect = (name) => setConnected((prev) => prev.filter((n) => n !== name));

  return (
    <div className="view-container">
      <div className="view-header">
        <h2 className="view-title">dApps</h2>
        {/* WalletConnect connect button */}
        <button className="wc-connect-btn" onClick={() => setShowWCModal(true)}>
          <span className="wc-logo">◈</span>
          WalletConnect
        </button>
      </div>

      {/* Active WC Sessions */}
      <section className="wc-sessions-section">
        <h3 className="section-title">Active Sessions</h3>
        <ActiveSessionsList />
      </section>

      {/* Category filter */}
      <div className="filter-tabs">
        {categories.map((c) => (
          <button
            key={c}
            className={`filter-tab ${category === c ? "filter-tab--active" : ""}`}
            onClick={() => setCategory(c)}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Legacy mock connections banner */}
      {connected.length > 0 && (
        <div className="connected-banner">
          <span>🔗 Connected: {connected.join(", ")}</span>
        </div>
      )}

      {/* dApp grid */}
      <div className="dapp-grid">
        {filtered.map((dapp) => {
          const isConnected = connected.includes(dapp.name);
          return (
            <div key={dapp.name} className="dapp-card">
              <div className="dapp-icon">{dapp.icon}</div>
              <p className="dapp-name">{dapp.name}</p>
              <p className="dapp-category">{dapp.category}</p>
              <p className="dapp-chain">{dapp.chain}</p>
              {isConnected ? (
                <div className="dapp-actions">
                  <span className="connected-dot">● Connected</span>
                  <button className="btn-link small" onClick={() => disconnect(dapp.name)}>Disconnect</button>
                </div>
              ) : (
                <div className="dapp-actions">
                  <button className="btn-secondary small" onClick={() => handleLegacyConnect(dapp)}>
                    Open
                  </button>
                  <button className="btn-wc-small" onClick={() => setShowWCModal(true)} title="Connect via WalletConnect">
                    WC
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* WalletConnect pairing modal */}
      {showWCModal && <WalletConnectModal onClose={() => setShowWCModal(false)} />}

      {/* Legacy connect confirmation */}
      {connecting && (
        <div className="modal-overlay" onClick={() => setConnecting(null)}>
          <div className="modal small-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Connect to {connecting.name}</h2>
              <button className="modal-close" onClick={() => setConnecting(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="connect-dapp-icon">{connecting.icon}</div>
              <p className="connect-text">
                <strong>{connecting.name}</strong> is requesting to connect to your wallet.
              </p>
              <div className="connect-permissions">
                <p className="permissions-title">This site will be able to:</p>
                <ul className="permissions-list">
                  <li>✓ View your wallet address</li>
                  <li>✓ View your token balances</li>
                  <li>✗ Move funds without your approval</li>
                </ul>
              </div>
              <div className="connect-address">
                <span>Connecting with:</span>
                <span className="mono">{currentAddress?.slice(0, 10)}...{currentAddress?.slice(-4)}</span>
              </div>
              <div className="btn-row">
                <button className="btn-secondary" onClick={() => setConnecting(null)}>Reject</button>
                <button className="btn-primary" onClick={confirmLegacyConnect}>Connect</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
