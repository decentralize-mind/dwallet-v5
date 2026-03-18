import { useState, useEffect } from "react";
import { useWallet } from "../context/WalletContext";
import { DEFAULT_TOKENS } from "../data/chains";
import { isValidAddress } from "../utils/crypto";
import { resolveENS } from "../utils/blockchain";
import { getPrice } from "../utils/prices";

export default function SendModal({ onClose }) {
  const { sendTransaction, chainBalances, activeChain, gasInfo } = useWallet();
  const [recipient,     setRecipient]     = useState("");
  const [resolvedAddr,  setResolvedAddr]  = useState("");
  const [ensDisplay,    setEnsDisplay]    = useState("");
  const [resolvingENS,  setResolvingENS]  = useState(false);
  const [amount,        setAmount]        = useState("");
  const [token,         setToken]         = useState(DEFAULT_TOKENS[activeChain]?.[0] || "ETH");
  const [step,          setStep]          = useState("form");
  const [txHash,        setTxHash]        = useState("");
  const [error,         setError]         = useState("");
  const [sending,       setSending]       = useState(false);

  const tokens     = DEFAULT_TOKENS[activeChain] || [];
  const balance    = chainBalances[token] || 0;
  const price      = getPrice(token);
  const usdValue   = (parseFloat(amount || 0) * price).toFixed(2);
  const finalAddr  = resolvedAddr || recipient;

  // ENS resolution with debounce
  useEffect(() => {
    if (!recipient || isValidAddress(recipient)) {
      setResolvedAddr("");
      setEnsDisplay("");
      return;
    }
    if (!recipient.includes(".")) return;

    const t = setTimeout(async () => {
      setResolvingENS(true);
      try {
        const addr = await resolveENS(recipient);
        if (addr) {
          setResolvedAddr(addr);
          setEnsDisplay(addr);
        } else {
          setResolvedAddr("");
          setEnsDisplay("");
          setError("ENS name not found");
        }
      } catch {
        setResolvedAddr("");
      } finally {
        setResolvingENS(false);
      }
    }, 600);
    return () => clearTimeout(t);
  }, [recipient]);

  const validate = () => {
    if (!finalAddr || !isValidAddress(finalAddr)) {
      setError(recipient.includes(".") ? "ENS name could not be resolved" : "Invalid recipient address");
      return false;
    }
    if (!amount || parseFloat(amount) <= 0) { setError("Enter a valid amount"); return false; }
    if (parseFloat(amount) > balance)        { setError("Insufficient balance"); return false; }
    return true;
  };

  const handleSend = async () => {
    setSending(true);
    setError("");
    try {
      const tx = await sendTransaction(finalAddr, amount, token, activeChain);
      setTxHash(tx.hash);
      setStep("success");
    } catch (e) {
      setError(e.message);
    } finally {
      setSending(false);
    }
  };

  const explorerBase = { ethereum: "https://etherscan.io", bnb: "https://bscscan.com", polygon: "https://polygonscan.com" };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Send</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {step === "form" && (
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Token</label>
              <select className="field" value={token} onChange={e => setToken(e.target.value)}>
                {tokens.map(t => (
                  <option key={t} value={t}>{t} — {(chainBalances[t]||0).toFixed(4)}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Recipient address or ENS name</label>
              <input
                className="field"
                placeholder="0x... or vitalik.eth"
                value={recipient}
                onChange={e => { setRecipient(e.target.value); setError(""); }}
              />
              {resolvingENS && <p className="field-hint">Resolving ENS name...</p>}
              {ensDisplay && !resolvingENS && (
                <p className="field-hint positive">✓ Resolved: {ensDisplay.slice(0,10)}...{ensDisplay.slice(-4)}</p>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Amount</label>
              <div className="amount-input-row">
                <input
                  className="field"
                  type="number"
                  placeholder="0.0"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  min="0" step="any"
                />
                <button className="max-btn" onClick={() => setAmount(balance.toFixed(6))}>MAX</button>
              </div>
              <p className="field-hint">≈ ${usdValue} · Balance: {balance.toFixed(4)} {token}</p>
            </div>

            <div className="gas-row">
              <span className="gas-label">⛽ Gas price</span>
              <span className="gas-value">{gasInfo.gwei} Gwei (~{gasInfo.ethCost} ETH)</span>
            </div>

            {error && <p className="error-msg">{error}</p>}

            <button className="btn-primary full-width" onClick={() => { setError(""); if (validate()) setStep("confirm"); }}>
              Review Transaction →
            </button>
          </div>
        )}

        {step === "confirm" && (
          <div className="modal-body">
            <div className="confirm-card">
              <p className="confirm-label">Sending</p>
              <p className="confirm-amount">{amount} {token}</p>
              <p className="confirm-usd">≈ ${usdValue}</p>
            </div>
            <div className="confirm-detail">
              <div className="confirm-row">
                <span>To</span>
                <span className="mono">{recipient.includes(".") ? recipient : finalAddr.slice(0,10)+"..."+finalAddr.slice(-6)}</span>
              </div>
              {resolvedAddr && <div className="confirm-row"><span>Resolved to</span><span className="mono small">{resolvedAddr.slice(0,10)}...{resolvedAddr.slice(-4)}</span></div>}
              <div className="confirm-row"><span>Network</span><span>{activeChain}</span></div>
              <div className="confirm-row"><span>Gas</span><span>~{gasInfo.ethCost} ETH ({gasInfo.gwei} Gwei)</span></div>
            </div>
            <div className="confirm-warning">⚠️ Transactions are irreversible. Verify the address carefully.</div>
            {error && <p className="error-msg">{error}</p>}
            <div className="btn-row">
              <button className="btn-secondary" onClick={() => setStep("form")}>Edit</button>
              <button className="btn-primary" onClick={handleSend} disabled={sending}>
                {sending ? "Sending..." : "Confirm Send"}
              </button>
            </div>
          </div>
        )}

        {step === "success" && (
          <div className="modal-body center">
            <div className="success-icon">✓</div>
            <h3 className="success-title">Transaction Sent!</h3>
            <p className="success-sub">Broadcasting to the {activeChain} network</p>
            <div className="tx-hash-box">
              <span className="tx-hash-label">Tx Hash</span>
              <span className="tx-hash-value mono">{txHash.slice(0,22)}...</span>
            </div>
            <a
              href={`${explorerBase[activeChain] || "https://etherscan.io"}/tx/${txHash}`}
              target="_blank" rel="noreferrer"
              className="btn-secondary full-width"
              style={{ textAlign:"center", display:"block", marginTop:"8px" }}
            >
              View on Explorer ↗
            </a>
            <button className="btn-primary full-width" onClick={onClose} style={{ marginTop:"8px" }}>Done</button>
          </div>
        )}
      </div>
    </div>
  );
}
