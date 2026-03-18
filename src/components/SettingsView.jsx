import { useState } from "react";
import { useWallet } from "../context/WalletContext";

export default function SettingsView() {
  const { wallet, lockWallet, resetWallet } = useWallet();
  const [showSeed, setShowSeed] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [seedPassword, setSeedPassword] = useState("");
  const [seedError, setSeedError] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [currency, setCurrency] = useState("USD");
  const [theme, setTheme] = useState("system");
  const [notifications, setNotifications] = useState(true);

  const handleRevealSeed = () => {
    if (seedPassword.length < 1) return setSeedError("Enter your password");
    // In a real wallet, decrypt and verify password
    setRevealed(true);
    setSeedError("");
  };

  return (
    <div className="view-container">
      <div className="view-header">
        <h2 className="view-title">Settings</h2>
      </div>

      {/* Wallet info */}
      <section className="settings-section">
        <h3 className="settings-group-title">Wallet</h3>
        <div className="settings-list">
          <div className="settings-item">
            <div>
              <p className="settings-label">Accounts</p>
              <p className="settings-sub">{wallet?.accounts?.length || 0} account(s)</p>
            </div>
          </div>
          <div className="settings-item clickable" onClick={() => setShowSeed(true)}>
            <div>
              <p className="settings-label">Secret Recovery Phrase</p>
              <p className="settings-sub">Back up your seed phrase</p>
            </div>
            <span className="settings-arrow">›</span>
          </div>
          <div className="settings-item clickable" onClick={lockWallet}>
            <div>
              <p className="settings-label">Lock Wallet</p>
              <p className="settings-sub">Require password to access</p>
            </div>
            <span className="settings-arrow">›</span>
          </div>
        </div>
      </section>

      {/* Preferences */}
      <section className="settings-section">
        <h3 className="settings-group-title">Preferences</h3>
        <div className="settings-list">
          <div className="settings-item">
            <div>
              <p className="settings-label">Currency</p>
            </div>
            <select className="settings-select" value={currency} onChange={(e) => setCurrency(e.target.value)}>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
              <option value="JPY">JPY</option>
            </select>
          </div>
          <div className="settings-item">
            <div>
              <p className="settings-label">Theme</p>
            </div>
            <select className="settings-select" value={theme} onChange={(e) => setTheme(e.target.value)}>
              <option value="system">System</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>
          <div className="settings-item">
            <div>
              <p className="settings-label">Transaction notifications</p>
            </div>
            <label className="toggle-switch">
              <input type="checkbox" checked={notifications} onChange={() => setNotifications(!notifications)} />
              <span className="toggle-slider" />
            </label>
          </div>
        </div>
      </section>

      {/* Security */}
      <section className="settings-section">
        <h3 className="settings-group-title">Security</h3>
        <div className="settings-list">
          <div className="settings-item">
            <div>
              <p className="settings-label">Auto-lock timer</p>
              <p className="settings-sub">Lock after inactivity</p>
            </div>
            <select className="settings-select">
              <option>5 minutes</option>
              <option>15 minutes</option>
              <option>1 hour</option>
              <option>Never</option>
            </select>
          </div>
        </div>
      </section>

      {/* About */}
      <section className="settings-section">
        <h3 className="settings-group-title">About</h3>
        <div className="settings-list">
          <div className="settings-item">
            <p className="settings-label">Version</p>
            <span className="settings-value">dWallet v1.0.0</span>
          </div>
          <div className="settings-item">
            <p className="settings-label">Network</p>
            <span className="settings-value">Mainnet</span>
          </div>
        </div>
      </section>

      {/* Danger zone */}
      <section className="settings-section danger-section">
        <h3 className="settings-group-title danger-title">Danger Zone</h3>
        <button className="btn-danger" onClick={() => setShowReset(true)}>
          Reset Wallet
        </button>
      </section>

      {/* Seed phrase modal */}
      {showSeed && (
        <div className="modal-overlay" onClick={() => { setShowSeed(false); setRevealed(false); setSeedPassword(""); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Secret Recovery Phrase</h2>
              <button className="modal-close" onClick={() => { setShowSeed(false); setRevealed(false); setSeedPassword(""); }}>✕</button>
            </div>
            <div className="modal-body">
              {!revealed ? (
                <>
                  <div className="seed-warning">
                    ⚠️ Never share your seed phrase. Anyone with it has full access to your wallet.
                  </div>
                  <input
                    type="password"
                    className="field"
                    placeholder="Enter your password to reveal"
                    value={seedPassword}
                    onChange={(e) => setSeedPassword(e.target.value)}
                  />
                  {seedError && <p className="error-msg">{seedError}</p>}
                  <button className="btn-primary full-width" onClick={handleRevealSeed}>
                    Reveal Seed Phrase
                  </button>
                </>
              ) : (
                <>
                  <div className="seed-grid">
                    {wallet?.mnemonic?.split(" ").map((word, i) => (
                      <div key={i} className="seed-word">
                        <span className="seed-num">{i + 1}</span>
                        <span className="seed-text">{word}</span>
                      </div>
                    ))}
                  </div>
                  <button
                    className="btn-secondary full-width"
                    onClick={() => navigator.clipboard.writeText(wallet?.mnemonic || "")}
                  >
                    Copy to Clipboard
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reset confirmation */}
      {showReset && (
        <div className="modal-overlay" onClick={() => setShowReset(false)}>
          <div className="modal small-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Reset Wallet</h2>
              <button className="modal-close" onClick={() => setShowReset(false)}>✕</button>
            </div>
            <div className="modal-body">
              <p className="danger-warning">
                ⚠️ This will permanently delete your wallet from this device. Make sure you have your seed phrase backed up.
              </p>
              <div className="btn-row">
                <button className="btn-secondary" onClick={() => setShowReset(false)}>Cancel</button>
                <button className="btn-danger" onClick={resetWallet}>Reset</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
