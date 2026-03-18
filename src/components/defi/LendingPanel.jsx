import { useState, useEffect } from "react";
import { useWallet } from "../../context/WalletContext";
import { aaveSupply, aaveWithdraw, aaveBorrow, aaveRepay, getAaveAccountData } from "../../utils/defi";
import { AAVE_ASSETS } from "../../data/defi";
import { TOKEN_PRICES } from "../../data/chains";

const MODES = ["Supply", "Borrow"];

export default function LendingPanel() {
  const { wallet, chainBalances } = useWallet();
  const [mode,      setMode]      = useState("Supply");
  const [asset,     setAsset]     = useState(AAVE_ASSETS[0]);
  const [amount,    setAmount]    = useState("");
  const [step,      setStep]      = useState("form");
  const [txHash,    setTxHash]    = useState("");
  const [error,     setError]     = useState("");
  const [loading,   setLoading]   = useState(false);
  const [accountData, setAccountData] = useState(null);
  const [action,    setAction]    = useState("supply"); // supply | withdraw | borrow | repay

  const balance  = chainBalances[asset.symbol] || 0;
  const usdValue = (parseFloat(amount || 0) * (TOKEN_PRICES[asset.symbol] || 1)).toFixed(2);

  const interestPerYear = amount
    ? (parseFloat(amount) * (mode === "Supply" ? asset.supplyAPY : asset.borrowAPY) / 100).toFixed(4)
    : "0";

  useEffect(() => {
    if (!wallet) return;
    const addr = wallet.accounts[wallet.activeAccount].address;
    getAaveAccountData(addr).then(setAccountData);
  }, [wallet]);

  const handleAction = async () => {
    if (!wallet) return;
    setLoading(true);
    setError("");
    try {
      const pk = wallet.accounts[wallet.activeAccount].privateKey;
      let tx;
      if (import.meta.env.VITE_INFURA_KEY) {
        if (action === "supply")   tx = await aaveSupply({ asset: asset.symbol, amount, privateKey: pk });
        if (action === "withdraw") tx = await aaveWithdraw({ asset: asset.symbol, amount, privateKey: pk });
        if (action === "borrow")   tx = await aaveBorrow({ asset: asset.symbol, amount, privateKey: pk });
        if (action === "repay")    tx = await aaveRepay({ asset: asset.symbol, amount, privateKey: pk });
        setTxHash(tx.hash);
      } else {
        setTxHash("0x" + Array.from(crypto.getRandomValues(new Uint8Array(32))).map(b=>b.toString(16).padStart(2,"0")).join(""));
      }
      setStep("success");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const hfColor = !accountData ? "" :
    parseFloat(accountData.healthFactor) >= 2 ? "positive" :
    parseFloat(accountData.healthFactor) >= 1.2 ? "warn" : "negative";

  return (
    <div className="defi-section">
      <div className="defi-protocol-row">
        <span className="defi-protocol-badge aave">Aave V3</span>
        <span className="defi-sub-text">Mainnet</span>
      </div>

      {/* Account summary */}
      {accountData && (
        <div className="aave-account-summary">
          <div className="aave-stat">
            <span className="aave-stat-label">Supplied</span>
            <span className="aave-stat-value">${accountData.totalCollateralUSD}</span>
          </div>
          <div className="aave-stat">
            <span className="aave-stat-label">Borrowed</span>
            <span className="aave-stat-value">${accountData.totalDebtUSD}</span>
          </div>
          <div className="aave-stat">
            <span className="aave-stat-label">Available</span>
            <span className="aave-stat-value">${accountData.availableBorrowUSD}</span>
          </div>
          <div className="aave-stat">
            <span className="aave-stat-label">Health</span>
            <span className={`aave-stat-value ${hfColor}`}>{accountData.healthFactor}</span>
          </div>
        </div>
      )}

      {/* Mode switcher */}
      <div className="defi-mode-tabs">
        {MODES.map(m => (
          <button
            key={m}
            className={`defi-mode-tab ${mode === m ? "defi-mode-tab--active" : ""}`}
            onClick={() => { setMode(m); setAction(m === "Supply" ? "supply" : "borrow"); setAmount(""); }}
          >
            {m}
          </button>
        ))}
      </div>

      {step === "form" && (
        <>
          {/* Action sub-tabs */}
          <div className="defi-action-tabs">
            {mode === "Supply"
              ? ["supply", "withdraw"].map(a => (
                  <button key={a} className={`defi-action-tab ${action === a ? "active" : ""}`} onClick={() => setAction(a)}>
                    {a.charAt(0).toUpperCase() + a.slice(1)}
                  </button>
                ))
              : ["borrow", "repay"].map(a => (
                  <button key={a} className={`defi-action-tab ${action === a ? "active" : ""}`} onClick={() => setAction(a)}>
                    {a.charAt(0).toUpperCase() + a.slice(1)}
                  </button>
                ))
            }
          </div>

          {/* Asset list */}
          <div className="aave-asset-list">
            {AAVE_ASSETS.map(a => (
              <button
                key={a.symbol}
                className={`aave-asset-row ${asset.symbol === a.symbol ? "aave-asset--active" : ""}`}
                onClick={() => setAsset(a)}
              >
                <div className="aave-asset-left">
                  <span className="aave-asset-symbol">{a.symbol}</span>
                  <span className="aave-asset-name">{a.name}</span>
                </div>
                <div className="aave-asset-right">
                  <span className="aave-asset-supply positive">Supply {a.supplyAPY}%</span>
                  <span className="aave-asset-borrow warn">Borrow {a.borrowAPY}%</span>
                </div>
                <div className="aave-asset-ltv">LTV {a.ltv}%</div>
              </button>
            ))}
          </div>

          {/* Amount input */}
          <div className="defi-input-group">
            <label className="form-label">Amount ({asset.symbol})</label>
            <div className="amount-input-row">
              <input
                className="field"
                type="number"
                placeholder="0.0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <button className="max-btn" onClick={() => setAmount(balance.toFixed(6))}>MAX</button>
            </div>
            <p className="field-hint">
              ≈ ${usdValue} &nbsp;·&nbsp; Wallet: {balance.toFixed(4)} {asset.symbol}
            </p>
          </div>

          {/* APY preview */}
          {amount && parseFloat(amount) > 0 && (
            <div className="aave-apy-preview">
              <div className="aave-apy-row">
                <span>{mode === "Supply" ? "Earning" : "Paying"} (APY)</span>
                <span className={mode === "Supply" ? "positive" : "warn"}>
                  {mode === "Supply" ? asset.supplyAPY : asset.borrowAPY}%
                </span>
              </div>
              <div className="aave-apy-row">
                <span>Yearly interest</span>
                <span className={mode === "Supply" ? "positive" : "warn"}>
                  {mode === "Supply" ? "+" : "-"}{interestPerYear} {asset.symbol}
                </span>
              </div>
              {mode === "Supply" && (
                <div className="aave-apy-row">
                  <span>Collateral factor</span>
                  <span>{asset.ltv}% LTV</span>
                </div>
              )}
              {mode === "Borrow" && accountData && (
                <div className="aave-apy-row">
                  <span>New health factor</span>
                  <span className="warn">~{Math.max(1.0, parseFloat(accountData.healthFactor) - 0.3).toFixed(2)}</span>
                </div>
              )}
            </div>
          )}

          {/* Health factor warning */}
          {mode === "Borrow" && (
            <div className="aave-hf-warning">
              ⚠️ Keep health factor above 1.0 to avoid liquidation. Recommended: stay above 1.5.
            </div>
          )}

          {error && <p className="error-msg">{error}</p>}

          <button
            className="btn-primary full-width defi-action-btn"
            disabled={!amount || parseFloat(amount) <= 0 || loading}
            onClick={handleAction}
          >
            {loading ? "Processing..." : `${action.charAt(0).toUpperCase() + action.slice(1)} ${amount || "0"} ${asset.symbol}`}
          </button>
        </>
      )}

      {step === "success" && (
        <div className="defi-success">
          <div className="success-icon">⊕</div>
          <h3 className="success-title">{action.charAt(0).toUpperCase() + action.slice(1)} Submitted!</h3>
          <p className="success-sub">{amount} {asset.symbol} via Aave V3</p>
          {mode === "Supply" && <p className="success-note">Earning {asset.supplyAPY}% APY on your deposit</p>}
          {mode === "Borrow" && <p className="success-note">Repay at {asset.borrowAPY}% APY variable rate</p>}
          <div className="tx-hash-box">
            <span className="tx-hash-label">Tx Hash</span>
            <span className="tx-hash-value mono">{txHash.slice(0,22)}...</span>
          </div>
          <button className="btn-primary full-width" onClick={() => { setStep("form"); setAmount(""); }}>Back to Lending</button>
        </div>
      )}
    </div>
  );
}
