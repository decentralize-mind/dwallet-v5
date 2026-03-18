import { useState } from "react";
import { useWallet } from "../context/WalletContext";

// Steps: welcome → create/import → backup → verify → done
//                              ↑ CANNOT SKIP

export default function OnboardingScreen() {
  const { createWallet, importWallet, unlockWallet, isLocked } = useWallet();
  const [step,           setStep]           = useState(isLocked ? "unlock" : "welcome");
  const [newMnemonic,    setNewMnemonic]    = useState("");
  const [verifyInput,    setVerifyInput]    = useState("");
  const [password,       setPassword]       = useState("");
  const [confirmPwd,     setConfirmPwd]     = useState("");
  const [importInput,    setImportInput]    = useState("");
  const [error,          setError]          = useState("");
  const [loading,        setLoading]        = useState(false);
  const [seedRevealed,   setSeedRevealed]   = useState(false);
  const [seedCopied,     setSeedCopied]     = useState(false);
  const [checkedWrite,   setCheckedWrite]   = useState(false);
  const [checkedStore,   setCheckedStore]   = useState(false);
  const [showPwd,        setShowPwd]        = useState(false);

  // ── Create ─────────────────────────────────────────────────────────────────
  const handleCreate = async () => {
    if (password.length < 8)          return setError("Password must be at least 8 characters");
    if (password !== confirmPwd)       return setError("Passwords do not match");
    setLoading(true); setError("");
    try {
      const phrase = await createWallet(password);
      setNewMnemonic(phrase);
      setStep("backup");
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  // ── Import ─────────────────────────────────────────────────────────────────
  const handleImport = async () => {
    if (password.length < 8)    return setError("Password must be at least 8 characters");
    if (password !== confirmPwd) return setError("Passwords do not match");
    setLoading(true); setError("");
    try {
      await importWallet(importInput, password);
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  // ── Unlock ─────────────────────────────────────────────────────────────────
  const handleUnlock = async () => {
    setLoading(true); setError("");
    try {
      await unlockWallet(password);
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  // ── Verify seed phrase ─────────────────────────────────────────────────────
  const handleVerify = () => {
    const input  = verifyInput.trim().toLowerCase();
    const actual = newMnemonic.trim().toLowerCase();
    if (input === actual) {
      setError("");
      setStep("done");
      // Wallet is already created — context will detect it and show main wallet
      window.location.reload();
    } else {
      setError("Seed phrase doesn't match. Check each word carefully.");
    }
  };

  const copyMnemonic = () => {
    navigator.clipboard.writeText(newMnemonic);
    setSeedCopied(true);
    setTimeout(() => setSeedCopied(false), 2000);
  };

  const words = newMnemonic.split(" ");

  return (
    <div className="onboarding">
      <div className="onboarding-card">

        {/* Logo */}
        <div className="logo-area">
          <div className="logo-icon">◈</div>
          <h1 className="logo-title">dWallet</h1>
          <p className="logo-sub">Your keys. Your crypto. Your freedom.</p>
        </div>

        {/* ── Welcome ── */}
        {step === "welcome" && (
          <div className="step-content">
            <button className="btn-primary" onClick={() => setStep("create")}>
              Create New Wallet
            </button>
            <button className="btn-secondary" onClick={() => setStep("import")}>
              Import Existing Wallet
            </button>
          </div>
        )}

        {/* ── Unlock ── */}
        {step === "unlock" && (
          <div className="step-content">
            <h2 className="step-title">Welcome back</h2>
            <p className="step-sub">Enter your password to unlock</p>
            <div className="pwd-input-wrap">
              <input
                type={showPwd ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleUnlock()}
                className="field"
              />
              <button className="pwd-toggle" onClick={() => setShowPwd(v=>!v)}>
                {showPwd ? "hide" : "show"}
              </button>
            </div>
            {error && <p className="error-msg">{error}</p>}
            <button className="btn-primary" onClick={handleUnlock} disabled={loading}>
              {loading ? "Unlocking..." : "Unlock Wallet"}
            </button>
            <button className="btn-link" onClick={() => { if (confirm("This will delete your wallet from this device. Make sure you have your seed phrase.")) { localStorage.clear(); sessionStorage.clear(); window.location.reload(); } }}>
              Forgot password? Reset wallet
            </button>
          </div>
        )}

        {/* ── Create ── */}
        {step === "create" && (
          <div className="step-content">
            <h2 className="step-title">Create wallet</h2>
            <p className="step-sub">Set a strong password. You'll need it to unlock your wallet.</p>
            <div className="pwd-input-wrap">
              <input
                type={showPwd ? "text" : "password"}
                placeholder="Password (min 8 characters)"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="field"
              />
              <button className="pwd-toggle" onClick={() => setShowPwd(v=>!v)}>
                {showPwd ? "hide" : "show"}
              </button>
            </div>
            <input
              type={showPwd ? "text" : "password"}
              placeholder="Confirm password"
              value={confirmPwd}
              onChange={e => setConfirmPwd(e.target.value)}
              className="field"
            />
            <div className="pwd-strength">
              {["length","upper","number","special"].map((check, i) => {
                const passed = [
                  password.length >= 8,
                  /[A-Z]/.test(password),
                  /[0-9]/.test(password),
                  /[^a-zA-Z0-9]/.test(password),
                ][i];
                return <span key={check} className={`pwd-check ${passed ? "passed" : ""}`}>
                  {passed ? "✓" : "○"} {["8+ chars","Uppercase","Number","Symbol"][i]}
                </span>;
              })}
            </div>
            {error && <p className="error-msg">{error}</p>}
            <button className="btn-primary" onClick={handleCreate} disabled={loading}>
              {loading ? "Creating..." : "Create Wallet →"}
            </button>
            <button className="btn-link" onClick={() => setStep("welcome")}>← Back</button>
          </div>
        )}

        {/* ── Backup seed phrase ── CANNOT SKIP ── */}
        {step === "backup" && (
          <div className="step-content">
            <div className="backup-header">
              <h2 className="step-title">Back up your seed phrase</h2>
              <div className="backup-warning-badge">⚠️ Required</div>
            </div>
            <div className="backup-rules">
              <div className="backup-rule">
                <span className="rule-icon rule-icon--warn">✗</span>
                <span>Never share it with anyone — not even us</span>
              </div>
              <div className="backup-rule">
                <span className="rule-icon rule-icon--warn">✗</span>
                <span>Never take a screenshot or save it digitally</span>
              </div>
              <div className="backup-rule">
                <span className="rule-icon rule-icon--ok">✓</span>
                <span>Write it on paper and store it somewhere safe</span>
              </div>
            </div>

            {/* Seed grid — blurred until revealed */}
            <div className={`seed-reveal-wrap ${seedRevealed ? "revealed" : ""}`}>
              {!seedRevealed && (
                <div className="seed-blur-overlay" onClick={() => setSeedRevealed(true)}>
                  <span className="seed-blur-btn">👁 Tap to reveal</span>
                </div>
              )}
              <div className="seed-grid">
                {words.map((word, i) => (
                  <div key={i} className="seed-word">
                    <span className="seed-num">{i + 1}</span>
                    <span className="seed-text">{word}</span>
                  </div>
                ))}
              </div>
            </div>

            {seedRevealed && (
              <button className={`btn-secondary ${seedCopied ? "btn-success" : ""}`} onClick={copyMnemonic}>
                {seedCopied ? "✓ Copied!" : "Copy to clipboard"}
              </button>
            )}

            {/* Confirmation checkboxes */}
            <div className="backup-checks">
              <label className="backup-check-row">
                <input type="checkbox" checked={checkedWrite} onChange={e => setCheckedWrite(e.target.checked)}/>
                <span>I have written down all 12 words in order</span>
              </label>
              <label className="backup-check-row">
                <input type="checkbox" checked={checkedStore} onChange={e => setCheckedStore(e.target.checked)}/>
                <span>I understand losing this phrase means losing my funds</span>
              </label>
            </div>

            <button
              className="btn-primary"
              disabled={!seedRevealed || !checkedWrite || !checkedStore}
              onClick={() => setStep("verify")}
            >
              I've saved it — Continue →
            </button>
          </div>
        )}

        {/* ── Verify seed phrase ── */}
        {step === "verify" && (
          <div className="step-content">
            <h2 className="step-title">Verify your seed phrase</h2>
            <p className="step-sub">
              Type all 12 words exactly as written, separated by spaces.
              This confirms you've saved them correctly.
            </p>
            <textarea
              className="field textarea"
              placeholder="word1 word2 word3 ... word12"
              value={verifyInput}
              onChange={e => setVerifyInput(e.target.value)}
              rows={4}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
            />
            {error && <p className="error-msg">{error}</p>}
            <button className="btn-primary" onClick={handleVerify} disabled={!verifyInput.trim()}>
              Verify & Enter Wallet →
            </button>
            <button className="btn-link" onClick={() => setStep("backup")}>← Back to seed phrase</button>
          </div>
        )}

        {/* ── Import ── */}
        {step === "import" && (
          <div className="step-content">
            <h2 className="step-title">Import wallet</h2>
            <p className="step-sub">Enter your 12 or 24-word seed phrase</p>
            <textarea
              className="field textarea"
              placeholder="word1 word2 word3 ... word12"
              value={importInput}
              onChange={e => setImportInput(e.target.value)}
              rows={3}
              autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false}
            />
            <div className="pwd-input-wrap">
              <input
                type={showPwd ? "text" : "password"}
                placeholder="New password (min 8 characters)"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="field"
              />
              <button className="pwd-toggle" onClick={() => setShowPwd(v=>!v)}>
                {showPwd ? "hide" : "show"}
              </button>
            </div>
            <input
              type={showPwd ? "text" : "password"}
              placeholder="Confirm password"
              value={confirmPwd}
              onChange={e => setConfirmPwd(e.target.value)}
              className="field"
            />
            {error && <p className="error-msg">{error}</p>}
            <button className="btn-primary" onClick={handleImport} disabled={loading}>
              {loading ? "Importing..." : "Import Wallet →"}
            </button>
            <button className="btn-link" onClick={() => setStep("welcome")}>← Back</button>
          </div>
        )}

      </div>
    </div>
  );
}
