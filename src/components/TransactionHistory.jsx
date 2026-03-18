import { useState } from "react";
import { useWallet } from "../context/WalletContext";
import { formatAddress } from "../utils/crypto";
import { getPrice } from "../utils/prices";

const EXPLORERS = {
  ethereum: "https://etherscan.io",
  bnb:      "https://bscscan.com",
  polygon:  "https://polygonscan.com",
};

export default function TransactionHistory() {
  const { transactions, currentAddress, loadingTx, activeChain } = useWallet();
  const [filter,   setFilter]   = useState("all");
  const [selected, setSelected] = useState(null);

  const filtered = transactions.filter(tx => filter === "all" || tx.type === filter);

  const formatDate = ts => new Date(ts).toLocaleDateString("en-US", {
    month:"short", day:"numeric", hour:"2-digit", minute:"2-digit"
  });

  const formatAmt = tx => parseFloat(tx.amount ?? tx.value ?? 0).toFixed(4);

  return (
    <div className="view-container">
      <div className="view-header">
        <h2 className="view-title">Activity</h2>
        {loadingTx && <span className="view-count">loading...</span>}
      </div>

      <div className="filter-tabs">
        {["all","send","receive","swap"].map(f => (
          <button key={f} className={`filter-tab ${filter===f?"filter-tab--active":""}`} onClick={() => setFilter(f)}>
            {f.charAt(0).toUpperCase()+f.slice(1)}
          </button>
        ))}
      </div>

      <div className="tx-list">
        {filtered.length === 0 ? (
          <div className="empty-state-big"><p>{loadingTx ? "Loading transactions..." : "No transactions found"}</p></div>
        ) : (
          filtered.map(tx => {
            const price    = getPrice(tx.token);
            const usd      = (parseFloat(formatAmt(tx)) * price).toFixed(2);
            const isSelected = selected?.hash === tx.hash;
            const explorer   = EXPLORERS[tx.chain] || EXPLORERS.ethereum;
            return (
              <div key={tx.hash} className="tx-item">
                <div className="tx-row" onClick={() => setSelected(isSelected ? null : tx)}>
                  <div className={`tx-icon tx-icon--${tx.type}`}>
                    {tx.type==="send"?"↑":tx.type==="receive"?"↓":"⇄"}
                  </div>
                  <div className="tx-details">
                    <span className="tx-type">{tx.type.charAt(0).toUpperCase()+tx.type.slice(1)}</span>
                    <span className="tx-date">{formatDate(tx.timestamp)}</span>
                  </div>
                  <div className="tx-amounts">
                    <span className={`tx-amount ${tx.type==="receive"?"positive":""}`}>
                      {tx.type==="receive"?"+":"-"}{formatAmt(tx)} {tx.token}
                    </span>
                    <span className="tx-usd">${usd}</span>
                  </div>
                  <span className={`tx-status-badge tx-status-badge--${tx.status}`}>{tx.status}</span>
                </div>

                {isSelected && (
                  <div className="tx-expanded">
                    <div className="tx-exp-row"><span>Hash</span><span className="mono small">{tx.hash?.slice(0,20)}...</span></div>
                    <div className="tx-exp-row"><span>From</span><span className="mono small">{formatAddress(tx.from)}</span></div>
                    <div className="tx-exp-row"><span>To</span><span className="mono small">{formatAddress(tx.to)}</span></div>
                    <div className="tx-exp-row"><span>Gas paid</span><span>{tx.gasUsed} ETH</span></div>
                    <div className="tx-exp-row"><span>Network</span><span>{tx.chain}</span></div>
                    <a href={`${explorer}/tx/${tx.hash}`} target="_blank" rel="noreferrer" className="view-explorer">
                      View on {tx.chain === "bnb" ? "BscScan" : tx.chain === "polygon" ? "Polygonscan" : "Etherscan"} ↗
                    </a>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
