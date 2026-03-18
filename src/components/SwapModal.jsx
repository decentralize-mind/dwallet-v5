import { useState } from "react";
import { useWallet } from "../context/WalletContext";
import { DEFAULT_TOKENS, TOKEN_PRICES, SWAP_PAIRS } from "../data/chains";

export default function SwapModal({ onClose }) {
  const { chainBalances, activeChain } = useWallet();
  const tokens = DEFAULT_TOKENS[activeChain] || [];
  const [fromToken, setFromToken] = useState(tokens[0] || "ETH");
  const [toToken, setToToken] = useState(tokens[1] || "USDC");
  const [fromAmount, setFromAmount] = useState("");
  const [slippage, setSlippage] = useState(0.5);
  const [step, setStep] = useState("form");

  const fromPrice = TOKEN_PRICES[fromToken] || 1;
  const toPrice = TOKEN_PRICES[toToken] || 1;
  const rate = fromPrice / toPrice;
  const toAmount = fromAmount ? (parseFloat(fromAmount) * rate * (1 - 0.003)).toFixed(6) : "";
  const fromBalance = chainBalances[fromToken] || 0;
  const priceImpact = parseFloat(fromAmount || 0) * fromPrice > 10000 ? 2.1 : 0.3;

  const swap = () => {
    setFromToken(toToken);
    setToToken(fromToken);
    setFromAmount("");
  };

  const handleConfirm = () => {
    setStep("success");
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Swap</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {step === "form" && (
          <div className="modal-body">
            {/* Powered by */}
            <p className="powered-by">Powered by Uniswap V3</p>

            {/* From */}
            <div className="swap-panel">
              <div className="swap-row-top">
                <label className="form-label">From</label>
                <span className="balance-hint">Balance: {fromBalance.toFixed(4)}</span>
              </div>
              <div className="swap-input-row">
                <input
                  className="swap-amount-input"
                  type="number"
                  placeholder="0.0"
                  value={fromAmount}
                  onChange={(e) => setFromAmount(e.target.value)}
                />
                <select className="swap-token-select" value={fromToken} onChange={(e) => setFromToken(e.target.value)}>
                  {tokens.filter((t) => t !== toToken).map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <p className="usd-equiv">≈ ${(parseFloat(fromAmount || 0) * fromPrice).toFixed(2)}</p>
            </div>

            {/* Swap arrow */}
            <div className="swap-arrow-row">
              <button className="swap-arrow-btn" onClick={swap}>⇅</button>
            </div>

            {/* To */}
            <div className="swap-panel">
              <div className="swap-row-top">
                <label className="form-label">To (estimated)</label>
              </div>
              <div className="swap-input-row">
                <input className="swap-amount-input" readOnly value={toAmount} placeholder="0.0"/>
                <select className="swap-token-select" value={toToken} onChange={(e) => setToToken(e.target.value)}>
                  {tokens.filter((t) => t !== fromToken).map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <p className="usd-equiv">≈ ${(parseFloat(toAmount || 0) * toPrice).toFixed(2)}</p>
            </div>

            {/* Details */}
            <div className="swap-details">
              <div className="swap-detail-row">
                <span>Rate</span>
                <span>1 {fromToken} = {rate.toFixed(4)} {toToken}</span>
              </div>
              <div className="swap-detail-row">
                <span>Fee (0.3%)</span>
                <span>{(parseFloat(fromAmount || 0) * 0.003).toFixed(6)} {fromToken}</span>
              </div>
              <div className="swap-detail-row">
                <span>Price impact</span>
                <span className={priceImpact > 1 ? "warn" : "positive"}>{priceImpact}%</span>
              </div>
              <div className="swap-detail-row">
                <span>Slippage tolerance</span>
                <div className="slippage-btns">
                  {[0.1, 0.5, 1.0].map((s) => (
                    <button key={s} className={`slippage-btn ${slippage === s ? "active" : ""}`} onClick={() => setSlippage(s)}>
                      {s}%
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              className="btn-primary full-width"
              onClick={handleConfirm}
              disabled={!fromAmount || parseFloat(fromAmount) <= 0}
            >
              Swap {fromToken} → {toToken}
            </button>
          </div>
        )}

        {step === "success" && (
          <div className="modal-body center">
            <div className="success-icon">⇄</div>
            <h3 className="success-title">Swap Submitted!</h3>
            <p className="success-sub">Swapping {fromAmount} {fromToken} → ~{toAmount} {toToken}</p>
            <p className="success-note">Estimated completion: ~15 seconds</p>
            <button className="btn-primary full-width" onClick={onClose}>Done</button>
          </div>
        )}
      </div>
    </div>
  );
}
