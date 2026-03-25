import { useState, useEffect } from "react";
import { decryptData } from "../utils/crypto";
import { useWallet } from "../context/WalletContext";

function getReferralLink(address) {
  const code = address ? "DW" + address.slice(2,8).toUpperCase() : "DWALLET";
  return "https://www.toklo.xyz/?ref=" + code;
}

export default function SettingsView({ onNavigate }) {
  const { wallet, lockWallet, resetWallet, transactions, currentAddress, verifyPassword } = useWallet();
  const [showSeed,    setShowSeed]    = useState(false);
  const [showReset,   setShowReset]   = useState(false);
  const [seedPwd,     setSeedPwd]     = useState("");
  const [seedErr,     setSeedErr]     = useState("");
  const [seedError, setSeedError] = useState("");
  const [decryptedMnemonic, setDecryptedMnemonic] = useState("");
  const [revealed,    setRevealed]    = useState(false);
  const [currency,    setCurrency]    = useState(localStorage.getItem("dwallet_currency")||"USD");
  const [themeVal,    setThemeVal]    = useState(localStorage.getItem("dwallet_theme")||"dark");
  const [copied,      setCopied]      = useState(false);
  const [notifPerm,   setNotifPerm]   = useState(typeof Notification !== "undefined" ? Notification.permission : "default");

  useEffect(() => { localStorage.setItem("dwallet_currency", currency); }, [currency]);

  useEffect(() => {
    localStorage.setItem("dwallet_theme", themeVal);
    const r = document.documentElement;
    if (themeVal === "light") {
      r.style.setProperty("--bg",     "#ffffff");
      r.style.setProperty("--bg2",    "#f8f9fa");
      r.style.setProperty("--bg3",    "#f0f2f5");
      r.style.setProperty("--bg4",    "#e4e6ea");
      r.style.setProperty("--text",   "#0d0f14");
      r.style.setProperty("--text2",  "#4a5568");
      r.style.setProperty("--text3",  "#9aa5b4");
      r.style.setProperty("--border", "rgba(0,0,0,0.1)");
    } else {
      ["--bg","--bg2","--bg3","--bg4","--text","--text2","--text3","--border"]
        .forEach(v => r.style.removeProperty(v));
    }
  }, [themeVal]);

    const handleExport = () => {
    if (!transactions || transactions.length === 0) {
      setExportStatus("empty");
      setTimeout(() => setExportStatus(""), 3000);
      return;
    }
    const ok = exportTransactionsCSV(transactions, currentAddress || "wallet");
    if (ok) {
      setExportStatus("success");
      setTimeout(() => setExportStatus(""), 3000);
    }
  };

  const handleCopyRef = () => {
    navigator.clipboard.writeText(getReferralLink(currentAddress));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleEnableNotif = async () => {
    if (typeof Notification === "undefined") return;
    const status = await Notification.requestPermission();
    setNotifPerm(status);
  };



  const handleRevealSeed = async () => {
    if (!seedPassword.trim()) return setSeedError("Enter your password");
    setSeedError("");
    try {
      const stored = localStorage.getItem("dwallet_v5_encrypted");
      if (!stored) return setSeedError("No wallet found in storage");
      const data = JSON.parse(await decryptData(stored, seedPassword));
      const phrase = data?.mnemonic || null;
      if (phrase && phrase.trim().split(" ").length >= 12) {
        setDecryptedMnemonic(phrase.trim());
        setRevealed(true);
      } else {
        setSeedError("Seed phrase not found in wallet data");
      }
    } catch(e) {
      setSeedError("Incorrect password — please try again");
    }
  };

  return (
    <div className="view-container">
      <div className="view-header"><h2 className="view-title">Settings</h2></div>

      <section className="settings-section">
        <h3 className="settings-group-title">Wallet</h3>
        <div className="settings-list">
          <div className="settings-item">
            <div><p className="settings-label">Accounts</p><p className="settings-sub">{wallet?.accounts?.length||0} account(s)</p></div>
          </div>
          <div className="settings-item clickable" onClick={() => setShowSeed(true)}>
            <div><p className="settings-label">Secret Recovery Phrase</p><p className="settings-sub">Back up your seed phrase</p></div>
            <span className="settings-arrow">›</span>
          </div>
          <div className="settings-item clickable" onClick={lockWallet}>
            <div><p className="settings-label">Lock Wallet</p></div>
            <span className="settings-arrow">›</span>
          </div>
        </div>
      </section>

      <section className="settings-section">
        <h3 className="settings-group-title">Tools</h3>
        <div className="settings-list">
          {[
            ["Address Book",      "Save contacts",              "addressbook"],
            ["Price Alerts",      "Get notified on price moves","alerts"],
            ["Gas Tracker",       "Monitor gas prices",         "gas"],
            ["Import Token",      "Add any ERC-20 token",       "tokenimport"],
          ].map(([label, sub, view]) => (
            <div key={view} className="settings-item clickable" onClick={() => onNavigate?.(view)}>
              <div><p className="settings-label">{label}</p><p className="settings-sub">{sub}</p></div>
              <span className="settings-arrow">›</span>
            </div>
          ))}
          <div
            className="settings-item clickable"
            onClick={handleExport}
            style={{flexDirection:"column",alignItems:"stretch",gap:0}}
          >
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div>
                <p className="settings-label">Export Transactions</p>
                <p className="settings-sub">
                  Download CSV for taxes
                  {transactions?.length > 0 && (
                    <span style={{marginLeft:6,color:"var(--accent)",fontWeight:600}}>
                      ({transactions.length} tx)
                    </span>
                  )}
                </p>
              </div>
              <span style={{
                fontSize:18,
                color: exportStatus==="success"
                  ? "var(--green)"
                  : exportStatus==="empty"
                  ? "var(--amber)"
                  : "var(--text3)"
              }}>
                {exportStatus==="success" ? "✓" : exportStatus==="empty" ? "⚠" : "↓"}
              </span>
            </div>
            {exportStatus==="success" && (
              <p style={{
                fontSize:11,color:"var(--green)",fontWeight:600,
                margin:"6px 0 0",padding:"6px 10px",
                background:"rgba(16,185,129,0.08)",
                border:"1px solid rgba(16,185,129,0.2)",
                borderRadius:6
              }}>
                ✓ CSV downloaded — check your Downloads folder
              </p>
            )}
            {exportStatus==="empty" && (
              <p style={{
                fontSize:11,color:"var(--amber)",fontWeight:600,
                margin:"6px 0 0",padding:"6px 10px",
                background:"rgba(245,158,11,0.08)",
                border:"1px solid rgba(245,158,11,0.2)",
                borderRadius:6
              }}>
                No transactions yet — make a swap or send first
              </p>
            )}
            <span className="settings-arrow">↓</span>
          </div>
        </div>
      </section>

      <section className="settings-section">
        <h3 className="settings-group-title">Preferences</h3>
        <div className="settings-list">
          <div className="settings-item">
            <div><p className="settings-label">Currency</p></div>
            <select className="settings-select" value={currency} onChange={e => setCurrency(e.target.value)}>
              {["USD","EUR","GBP","JPY","KHR","SGD"].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="settings-item" style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <p className="settings-label" style={{margin:0}}>Theme</p>
            <select className="settings-select" value={themeVal} onChange={e => setThemeVal(e.target.value)}>
              <option value="dark">Dark</option>
              <option value="light">Light</option>
            </select>
          </div>
          <div className="settings-item">
            <div><p className="settings-label">Push notifications</p><p className="settings-sub">{notifPerm==="granted"?"Enabled":"Click to enable"}</p></div>
            {notifPerm === "granted"
              ? <span style={{fontSize:12,color:"var(--green)"}}>✓ On</span>
              : <button className="btn-secondary" style={{padding:"4px 10px",fontSize:12}} onClick={handleEnableNotif}>Enable</button>
            }
          </div>
        </div>
      </section>

      <section className="settings-section">
        <h3 className="settings-group-title">Referral Program</h3>
        <div className="settings-list">
          <div className="settings-item" style={{flexDirection:"column",alignItems:"flex-start",gap:10}}>
            <div><p className="settings-label">Your referral link</p><p className="settings-sub">Share and earn 50 DWT per signup</p></div>
            <div style={{display:"flex",alignItems:"center",gap:8,background:"var(--bg3)",border:"1px solid var(--border)",borderRadius:"var(--radius-sm)",padding:"8px 12px",width:"100%"}}>
              <span style={{flex:1,fontSize:11,color:"var(--text3)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontFamily:"var(--font-mono)"}}>
                {getReferralLink(currentAddress)}
              </span>
              <button onClick={handleCopyRef}
                style={{background:"var(--accent)",color:"white",border:"none",borderRadius:6,padding:"5px 12px",fontSize:12,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap",fontFamily:"var(--font)"}}>
                {copied ? "✓ Copied!" : "Copy"}
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="settings-section">
        <h3 className="settings-group-title">Install App (PWA)</h3>
        <div className="settings-list">
          <div className="settings-item" style={{flexDirection:"column",alignItems:"flex-start",gap:8}}>
            <div><p className="settings-label">Add to home screen</p></div>
            <div style={{display:"flex",flexDirection:"column",gap:4}}>
              <p style={{fontSize:12,color:"var(--text2)"}}>📱 iOS Safari: Share → "Add to Home Screen"</p>
              <p style={{fontSize:12,color:"var(--text2)"}}>🤖 Android Chrome: Menu → "Add to Home Screen"</p>
              <p style={{fontSize:12,color:"var(--text2)"}}>💻 Desktop Chrome: Install icon in address bar</p>
            </div>
          </div>
        </div>
      </section>

      <section className="settings-section">
        <h3 className="settings-group-title">About</h3>
        <div className="settings-list">
          <div className="settings-item"><p className="settings-label">Version</p><span className="settings-value">Toklo v1.0.0</span></div>
          <div className="settings-item"><p className="settings-label">Network</p><span className="settings-value">Mainnet</span></div>
        </div>
      </section>

      <section className="settings-section danger-section">
        <h3 className="settings-group-title danger-title">Danger Zone</h3>
        <button className="btn-danger" onClick={() => setShowReset(true)}>Reset Wallet</button>
      </section>

      {showSeed && (
        <div className="modal-overlay" onClick={() => { setShowSeed(false); setRevealed(false); setSeedPwd(""); }}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Secret Recovery Phrase</h2>
              <button className="modal-close" onClick={() => { setShowSeed(false); setRevealed(false); setSeedPwd(""); }}>✕</button>
            </div>
            <div className="modal-body">
              {!revealed ? (
                <>
                  <div className="seed-warning">⚠️ Never share your seed phrase.</div>
                  <input type="password" className="field" placeholder="Enter your password" value={seedPwd} onChange={e => setSeedPwd(e.target.value)}/>
                  {seedErr && <p className="error-msg">{seedErr}</p>}
                  <button className="btn-primary full-width" onClick={() => { if(!seedPwd.trim()) return setSeedErr("Enter password"); setRevealed(true); }}>Reveal</button>
                </>
              ) : (
                <>
                  <div className="seed-grid">
                    {(decryptedMnemonic).split(" ").filter(w => w.length > 0).map((word, i) => (
                      <div key={i} className="seed-word"><span className="seed-num">{i+1}</span><span className="seed-text">{word}</span></div>
                    ))}
                  </div>
                  <button className="btn-secondary full-width" onClick={() => navigator.clipboard.writeText(decryptedMnemonic)}>Copy</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {showReset && (
        <div className="modal-overlay" onClick={() => setShowReset(false)}>
          <div className="modal small-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Reset Wallet</h2>
              <button className="modal-close" onClick={() => setShowReset(false)}>✕</button>
            </div>
            <div className="modal-body">
              <p className="danger-warning">⚠️ This permanently deletes your wallet. Make sure you have your seed phrase.</p>
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