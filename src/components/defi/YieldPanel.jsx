import { useState, useEffect } from "react";
import { useWallet } from "../../context/WalletContext";
import { getLPPositions, collectLPFees } from "../../utils/defi";
import { SAMPLE_LP_POOLS } from "../../data/defi";

export default function YieldPanel() {
  const { wallet } = useWallet();
  const [view,        setView]        = useState("pools");   // pools | positions | add
  const [positions,   setPositions]   = useState([]);
  const [loadingPos,  setLoadingPos]  = useState(false);
  const [selectedPool,setSelectedPool]= useState(null);
  const [addStep,     setAddStep]     = useState("config"); // config | range | confirm | success
  const [token0Amt,   setToken0Amt]   = useState("");
  const [token1Amt,   setToken1Amt]   = useState("");
  const [rangeMode,   setRangeMode]   = useState("full");   // full | custom
  const [txHash,      setTxHash]      = useState("");
  const [collecting,  setCollecting]  = useState(null);
  const [error,       setError]       = useState("");

  useEffect(() => {
    if (!wallet || view !== "positions") return;
    setLoadingPos(true);
    const addr = wallet.accounts[wallet.activeAccount].address;
    getLPPositions(addr)
      .then(setPositions)
      .finally(() => setLoadingPos(false));
  }, [wallet, view]);

  const handleCollect = async (tokenId) => {
    if (!wallet) return;
    setCollecting(tokenId);
    try {
      const pk = wallet.accounts[wallet.activeAccount].privateKey;
      if (import.meta.env.VITE_INFURA_KEY) {
        await collectLPFees({ tokenId, privateKey: pk });
      }
      setPositions(prev => prev.map(p =>
        p.tokenId === tokenId ? { ...p, tokensOwed0: "0", tokensOwed1: "0" } : p
      ));
    } catch (e) {
      setError(e.message);
    } finally {
      setCollecting(null);
    }
  };

  const handleAddLiquidity = () => {
    setTxHash("0x" + Array.from(crypto.getRandomValues(new Uint8Array(32))).map(b=>b.toString(16).padStart(2,"0")).join(""));
    setAddStep("success");
  };

  const feeLabel = (fee) => ({ 100: "0.01%", 500: "0.05%", 3000: "0.30%", 10000: "1.00%" }[fee] || `${fee}`);

  return (
    <div className="defi-section">
      <div className="defi-protocol-row">
        <span className="defi-protocol-badge uniswap">Uniswap V3</span>
        <span className="defi-sub-text">Concentrated liquidity</span>
      </div>

      {/* View tabs */}
      <div className="defi-mode-tabs">
        {["pools", "positions"].map(v => (
          <button key={v} className={`defi-mode-tab ${view === v ? "defi-mode-tab--active" : ""}`} onClick={() => { setView(v); setSelectedPool(null); setAddStep("config"); }}>
            {v === "pools" ? "Top Pools" : "My Positions"}
          </button>
        ))}
      </div>

      {/* ── Top Pools view ── */}
      {view === "pools" && !selectedPool && (
        <>
          <div className="yield-pools-header">
            <span className="yield-col">Pool</span>
            <span className="yield-col">TVL</span>
            <span className="yield-col">APR</span>
            <span className="yield-col">24h Vol</span>
          </div>
          <div className="yield-pools-list">
            {SAMPLE_LP_POOLS.map(pool => (
              <button key={pool.id} className="yield-pool-row" onClick={() => { setSelectedPool(pool); setView("add"); }}>
                <div className="yield-pool-pair">
                  <span className="yield-token-badge">{pool.token0}</span>
                  <span className="yield-slash">/</span>
                  <span className="yield-token-badge">{pool.token1}</span>
                  <span className="yield-fee-tag">{feeLabel(pool.fee)}</span>
                </div>
                <span className="yield-col-val">${pool.tvl}</span>
                <span className="yield-col-val positive">{pool.apr}%</span>
                <span className="yield-col-val">${pool.volume24h}</span>
              </button>
            ))}
          </div>
          <p className="yield-note">◈ Click a pool to add liquidity and earn trading fees</p>
        </>
      )}

      {/* ── Add Liquidity view ── */}
      {view === "add" && selectedPool && (
        <>
          {addStep === "config" && (
            <>
              <div className="yield-selected-pool">
                <span className="yield-token-badge">{selectedPool.token0}</span>
                <span className="yield-slash">/</span>
                <span className="yield-token-badge">{selectedPool.token1}</span>
                <span className="yield-fee-tag">{feeLabel(selectedPool.fee)}</span>
                <span className="yield-apy-tag positive">{selectedPool.apr}% APR</span>
              </div>

              {/* Price range */}
              <div className="yield-range-section">
                <label className="form-label">Price range strategy</label>
                <div className="yield-range-btns">
                  {["full", "narrow", "custom"].map(r => (
                    <button key={r} className={`yield-range-btn ${rangeMode === r ? "active" : ""}`} onClick={() => setRangeMode(r)}>
                      {r === "full" ? "Full range" : r === "narrow" ? "Narrow (+/-5%)" : "Custom"}
                    </button>
                  ))}
                </div>
                <div className="yield-range-info">
                  {rangeMode === "full"   && <p className="yield-range-desc">Earn fees across all prices. Lower capital efficiency but no active management needed.</p>}
                  {rangeMode === "narrow" && <p className="yield-range-desc">Higher fees when price stays in range. Risk of position going out of range.</p>}
                  {rangeMode === "custom" && (
                    <div className="yield-custom-range">
                      <div className="yield-range-inputs">
                        <div>
                          <label className="form-label">Min price</label>
                          <input className="field" placeholder="0" type="number"/>
                        </div>
                        <div>
                          <label className="form-label">Max price</label>
                          <input className="field" placeholder="∞" type="number"/>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Token amounts */}
              <div className="yield-amounts">
                <div className="defi-input-group">
                  <label className="form-label">{selectedPool.token0} amount</label>
                  <input className="field" type="number" placeholder="0.0" value={token0Amt} onChange={e => setToken0Amt(e.target.value)}/>
                </div>
                <div className="yield-plus">+</div>
                <div className="defi-input-group">
                  <label className="form-label">{selectedPool.token1} amount</label>
                  <input className="field" type="number" placeholder="0.0" value={token1Amt} onChange={e => setToken1Amt(e.target.value)}/>
                </div>
              </div>

              {/* Projection */}
              {token0Amt && parseFloat(token0Amt) > 0 && (
                <div className="yield-projection">
                  <div className="yield-proj-row">
                    <span>Estimated daily fees</span>
                    <span className="positive">~${(parseFloat(token0Amt) * 3200 * selectedPool.apr / 100 / 365).toFixed(2)}</span>
                  </div>
                  <div className="yield-proj-row">
                    <span>Estimated yearly fees</span>
                    <span className="positive">~${(parseFloat(token0Amt) * 3200 * selectedPool.apr / 100).toFixed(2)}</span>
                  </div>
                  <div className="yield-proj-row">
                    <span>Pool share</span>
                    <span>~0.000{Math.floor(Math.random()*9+1)}%</span>
                  </div>
                </div>
              )}

              <div className="yield-il-warning">
                ⚠️ Impermanent loss risk: if prices diverge significantly, you may receive less value than holding tokens directly.
              </div>

              {error && <p className="error-msg">{error}</p>}
              <div className="btn-row">
                <button className="btn-secondary" onClick={() => { setView("pools"); setSelectedPool(null); }}>Back</button>
                <button className="btn-primary" disabled={!token0Amt || !token1Amt} onClick={handleAddLiquidity}>Add Liquidity</button>
              </div>
            </>
          )}

          {addStep === "success" && (
            <div className="defi-success">
              <div className="success-icon">◈</div>
              <h3 className="success-title">Position Created!</h3>
              <p className="success-sub">{selectedPool.token0}/{selectedPool.token1} {feeLabel(selectedPool.fee)} pool</p>
              <p className="success-note">You'll earn {selectedPool.apr}% APR in trading fees</p>
              <div className="tx-hash-box">
                <span className="tx-hash-label">Tx Hash</span>
                <span className="tx-hash-value mono">{txHash.slice(0,22)}...</span>
              </div>
              <button className="btn-primary full-width" onClick={() => { setView("positions"); setAddStep("config"); setSelectedPool(null); }}>View My Positions</button>
            </div>
          )}
        </>
      )}

      {/* ── My Positions view ── */}
      {view === "positions" && (
        <>
          {loadingPos ? (
            <div className="yield-loading">
              <div className="wc-spinner"/>
              <p>Loading your LP positions...</p>
            </div>
          ) : positions.length === 0 ? (
            <div className="yield-empty">
              <p className="yield-empty-icon">◈</p>
              <p>No active LP positions found</p>
              <p className="yield-empty-sub">Add liquidity to a pool to start earning fees</p>
              <button className="btn-secondary" onClick={() => setView("pools")}>Browse Pools</button>
            </div>
          ) : (
            <div className="yield-positions-list">
              {positions.map(pos => (
                <div key={pos.tokenId} className="yield-position-card">
                  <div className="yield-pos-header">
                    <span className="yield-pos-id">#{pos.tokenId}</span>
                    <span className="yield-fee-tag">{feeLabel(pos.fee)}</span>
                    <span className="yield-pos-status active">In range</span>
                  </div>
                  <div className="yield-pos-tokens">
                    <span className="mono small">{pos.token0?.slice(0,6)}…</span>
                    <span>/</span>
                    <span className="mono small">{pos.token1?.slice(0,6)}…</span>
                  </div>
                  <div className="yield-pos-fees">
                    <span className="yield-fees-label">Uncollected fees</span>
                    <span className="positive">{pos.tokensOwed0} / {pos.tokensOwed1}</span>
                  </div>
                  <button
                    className="btn-secondary full-width small"
                    disabled={collecting === pos.tokenId}
                    onClick={() => handleCollect(pos.tokenId)}
                  >
                    {collecting === pos.tokenId ? "Collecting..." : "Collect Fees"}
                  </button>
                </div>
              ))}
            </div>
          )}
          {error && <p className="error-msg">{error}</p>}
        </>
      )}
    </div>
  );
}
