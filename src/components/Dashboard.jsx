import { useState, useEffect, useMemo } from "react";
import { useWallet } from "../hooks/useWallet";
import { DEFAULT_TOKENS } from "../data/chains";
import { DWT, getDWTTier, formatDWT } from "../utils/dwt";
import { fetchPriceHistory, getPrice } from "../utils/prices";
import { fetchMarketData, formatPrice, formatMarketCap } from "../utils/market";
import PortfolioChart from "./PortfolioChart";

const TOKEN_ICONS = { ETH: "⟠", BNB: "⬡", MATIC: "◈", SOL: "◎", USDC: "$", USDT: "₮", DAI: "⬙", WBTC: "₿", UNI: "🦄", LINK: "⬡" };

function Sparkline({ data }) {
  if (!data || data.length < 2) return <span className="spark-placeholder">—</span>;
  const prices = data.map(d => d.price);
  const min = Math.min(...prices), max = Math.max(...prices);
  const range = max - min || 1;
  const w = 60, h = 24;
  const pts = prices.map((p, i) => `${(i / (prices.length - 1)) * w},${h - ((p - min) / range) * h}`).join(" ");
  const isUp = prices[prices.length - 1] >= prices[0];
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ overflow: "visible" }}>
      <polyline points={pts} fill="none" stroke={isUp ? "#10b981" : "#ef4444"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}


// ── DWT Banner component ─────────────────────────────────────────────────────
function DWTBanner({ chainBalances, activeChain }) {
  const dwtBal  = parseFloat(chainBalances?.DWT ?? 0);
  const hasDWT  = dwtBal > 0;
  const tier    = getDWTTier(dwtBal);
  const explorer = DWT.explorerUrl(activeChain) || DWT.explorerUrl("sepolia");
  const dwtAddr  = DWT.addresses[activeChain] || DWT.addresses.sepolia;

  const [copied, setCopied] = useState(false);
  const copyAddr = () => {
    if (dwtAddr) {
      navigator.clipboard.writeText(dwtAddr);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div style={{
      background: hasDWT
        ? "rgba(99,102,241,0.07)"
        : "var(--bg3)",
      border: "1px solid " + (hasDWT ? "rgba(99,102,241,0.3)" : "var(--border)"),
      borderRadius: "var(--radius-sm)",
      padding: "14px 16px",
      marginBottom: 16,
    }}>
      {/* Top row */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{
            width:38,height:38,borderRadius:"50%",
            background:"rgba(99,102,241,0.15)",
            border:"1.5px solid rgba(99,102,241,0.4)",
            display:"flex",alignItems:"center",justifyContent:"center",
            fontSize:18,color:"var(--accent)",fontWeight:800,flexShrink:0
          }}>◈</div>
          <div>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <p style={{fontSize:14,fontWeight:700,margin:0,color:"var(--text)"}}>DWT</p>
              <span style={{
                fontSize:9,padding:"2px 6px",borderRadius:8,fontWeight:700,
                background:"rgba(99,102,241,0.15)",color:"var(--accent)"
              }}>dWallet Token</span>
              {DWT.addresses[activeChain] && (
                <span style={{
                  fontSize:9,padding:"2px 6px",borderRadius:8,fontWeight:700,
                  background:"rgba(16,185,129,0.12)",color:"var(--green)"
                }}>● Live</span>
              )}
            </div>
            <p style={{fontSize:11,color:"var(--text3)",margin:"1px 0 0"}}>
              Toklo native token · backbone of the protocol
            </p>
          </div>
        </div>
        <div style={{textAlign:"right",flexShrink:0}}>
          <p style={{fontSize:16,fontWeight:800,margin:0,color:"var(--accent)"}}>
            {hasDWT ? formatDWT(dwtBal) : "0 DWT"}
          </p>
          <p style={{fontSize:10,color:"var(--text3)",margin:"1px 0 0"}}>
            ≈ ${hasDWT ? (dwtBal * 0.10).toFixed(2) : "0.00"}
          </p>
        </div>
      </div>

      {/* Fee tier row */}
      <div style={{
        display:"flex",alignItems:"center",justifyContent:"space-between",
        padding:"8px 10px",
        background:"var(--bg2)",border:"1px solid var(--border)",
        borderRadius:8,marginBottom:10
      }}>
        <div>
          <p style={{fontSize:11,fontWeight:700,margin:0,color:"var(--text)"}}>
            {tier.name} — Swap fee: {tier.label}
          </p>
          <p style={{fontSize:10,color:"var(--text3)",margin:"2px 0 0"}}>
            {hasDWT ? `You hold ${dwtBal.toLocaleString()} DWT` : "Hold DWT to unlock lower fees"}
          </p>
        </div>
        <div>
          {DWT.tiers.map(t => (
            <div key={t.name} style={{display:"flex",alignItems:"center",gap:4,marginBottom:2}}>
              <span style={{
                width:6,height:6,borderRadius:"50%",flexShrink:0,
                background: dwtBal >= t.hold ? "var(--green)" : "var(--border)"
              }}/>
              <span style={{
                fontSize:9,fontWeight: dwtBal >= t.hold ? 700 : 400,
                color: dwtBal >= t.hold ? "var(--green)" : "var(--text3)"
              }}>
                {(t.hold/1000).toFixed(0)}K → {t.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom links */}
      <div style={{display:"flex",gap:6}}>
        {explorer && (
          <a
            href={explorer}
            target="_blank"
            rel="noreferrer"
            style={{
              flex: 1,
              padding: '6px 0',
              textAlign: 'center',
              background: 'rgba(99,102,241,0.10)',
              border: '1px solid rgba(99,102,241,0.25)',
              borderRadius: 7,
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--accent)',
              textDecoration: 'none',
              display: 'block',
            }}
          >
            View on Explorer ↗
          </a>
        )}
        <button
          onClick={copyAddr}
          style={{
            flex:1,padding:"6px 0",textAlign:"center",
            background:"var(--bg3)",
            border:"1px solid var(--border)",
            borderRadius:7,fontSize:11,fontWeight:600,
            color: copied ? "var(--green)" : "var(--text2)",
            cursor:"pointer",fontFamily:"var(--font)"
          }}
        >
          {(() => {
            if (copied) return "✓ Copied";
            if (!dwtAddr) return "Mainnet coming soon";
            return dwtAddr.slice(0, 8) + "..." + dwtAddr.slice(-6);
          })()}
        </button>
      </div>
    </div>
  );
}

export default function Dashboard({ onSend, onReceive, onSwap }) {
  const { chainBalances, totalUSDValue, activeChain, transactions, prices, loadingBal, notification, currentAddress } = useWallet();
  const tokens = useMemo(() => DEFAULT_TOKENS[activeChain] || [], [activeChain]);
  const [sparklines, setSparklines] = useState({});
  const recentTxs = transactions.slice(0, 5);


  const [marketData,setMarketData]=useState([]);
  const [marketTab,setMarketTab]=useState("top");
  const [selectedCoin,setSelectedCoin]=useState(null);
  const [marketFilter,setMarketFilter]=useState("");
  const [loadingMkt,setLoadingMkt]=useState(true);

  useEffect(()=>{
    fetchMarketData().then(d=>{setMarketData(d);setLoadingMkt(false);});
    const t=setInterval(()=>fetchMarketData().then(setMarketData),60000);
    return()=>clearInterval(t);
  },[]);
  // Fetch sparklines for visible tokens
  useEffect(() => {
    tokens.forEach(async token => {
      if (sparklines[token]) return;
      const hist = await fetchPriceHistory(token, 7);
      if (hist.length > 0) setSparklines(prev => ({ ...prev, [token]: hist }));
    });
  }, [tokens, sparklines]);

  const pctChange = (token) => {
    const hist = sparklines[token];
    if (!hist || hist.length < 2) return null;
    const first = hist[0].price, last = hist[hist.length - 1].price;
    return ((last - first) / first * 100).toFixed(2);
  };

  return (
    <div className="dashboard">
      {/* Notification toast */}
      {notification && (
        <div className={`toast toast--${notification.type}`}>{notification.message}</div>
      )}

      {/* Balance card */}
      <div className="balance-card">
        <p className="balance-label">Total Portfolio</p>
        <h2 className="balance-amount">
          ${totalUSDValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </h2>
        <p className="balance-sub">Across all networks {loadingBal && "· refreshing..."}</p>
      </div>

      <DWTBanner chainBalances={chainBalances} activeChain={activeChain} />

      <PortfolioChart balances={chainBalances} prices={prices}/>

      {/* Action buttons */}
      <div className="action-row">
        <button className="action-btn" onClick={onSend}><span className="action-icon">↑</span><span>Send</span></button>
        <button className="action-btn" onClick={onReceive}><span className="action-icon">↓</span><span>Receive</span></button>
        <button className="action-btn" onClick={onSwap}><span className="action-icon">⇄</span><span>Swap</span></button>
        <button className="action-btn" onClick={() => {
          const key = import.meta.env.VITE_MOONPAY_KEY;
          const params = new URLSearchParams({
            apiKey: key,
            walletAddress: currentAddress || "",
            currencyCode: "eth",
            baseCurrencyCode: "usd",
            baseCurrencyAmount: "100",
            colorCode: "%236366f1",
          });
          window.open(
            `https://buy.moonpay.com?${params}`,
            "_blank",
            "width=450,height=650"
          );
        }}>
          <span className="action-icon">⊕</span>
          <span>Buy</span>
        </button>

      </div>

      {/* Token list */}
      <section className="section">
        <h3 className="section-title">Assets</h3>
<div className="token-list">
          {tokens.map(token => {
            const balance = chainBalances[token] || 0;
            const price = prices[token] ?? getPrice(token);
            const usdValue = balance * price;
            const change = pctChange(token);
            const icon = TOKEN_ICONS[token] || token[0];
            return (
              <div key={token} className="token-row">
                <div className="token-icon-wrap">{icon}</div>
                <div className="token-info">
                  <span className="token-name">{token}</span>
                  <span className="token-network">${price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: price < 1 ? 4 : 2 })}</span>
                </div>
                <div className="token-sparkline">
                  <Sparkline data={sparklines[token]} />
                  {change !== null && (
                    <span className={`token-change ${parseFloat(change) >= 0 ? "positive" : "negative"}`}>
                      {parseFloat(change) >= 0 ? "▲" : "▼"} {Math.abs(change)}%
                    </span>
                  )}
                </div>
                <div className="token-balance">
                  <span className="token-amount">{balance.toFixed(4)} {token}</span>
                  <span className="token-usd">${usdValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>


      <section className="section">
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,marginBottom:10}}>
          <h3 className="section-title" style={{margin:0}}>Market</h3>
          <input
            style={{flex:1,maxWidth:150,background:"var(--bg3)",border:"1px solid var(--border)",borderRadius:20,padding:"5px 12px",fontSize:12,color:"var(--text)",fontFamily:"var(--font)",outline:"none"}}
            placeholder="Search BTC, SOL..."
            value={marketFilter}
            onChange={e=>setMarketFilter(e.target.value)}
          />
        </div>
        <div style={{display:"flex",alignItems:"center",gap:4,marginBottom:8}}>
          {[{k:"top",l:"Top"},{k:"gainers",l:"Gainers"},{k:"losers",l:"Losers"}].map(t=>(
            <button key={t.k}
              onClick={()=>setMarketTab(t.k)}
              style={{background:marketTab===t.k?"var(--accent)":"none",border:"1px solid "+(marketTab===t.k?"var(--accent)":"var(--border)"),borderRadius:16,padding:"4px 12px",fontSize:12,fontWeight:500,cursor:"pointer",color:marketTab===t.k?"white":"var(--text3)",fontFamily:"var(--font)"}}>
              {t.l}
            </button>
          ))}
          {!loadingMkt&&<span style={{marginLeft:"auto",fontSize:11,color:"var(--green)",fontWeight:600}}>● Live</span>}
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:2}}>
          {(() => {
            if (loadingMkt) {
              return (
                <div style={{display:"flex",alignItems:"center",gap:10,padding:"16px 0"}}>
                  <div className="wc-spinner" style={{width:24,height:24,borderWidth:2}}/>
                  <span style={{fontSize:13,color:"var(--text3)"}}>Loading market data...</span>
                </div>
              );
            }
            return marketData
              .filter(c => !marketFilter || c.symbol.toLowerCase().includes(marketFilter.toLowerCase()) || c.name.toLowerCase().includes(marketFilter.toLowerCase()))
              .sort((a, b) => {
                if (marketTab === 'gainers') return b.change24h - a.change24h;
                if (marketTab === 'losers') return a.change24h - b.change24h;
                return a.rank - b.rank;
              })
              .slice(0, 10)
              .map(coin => {
                const isUp = coin.change24h >= 0;
                return (
                  <div key={coin.symbol}
                    onClick={() => {
                      const isSelected = selectedCoin?.symbol === coin.symbol
                      setSelectedCoin(isSelected ? null : coin)
                    }}
                    style={{display:"flex",alignItems:"center",gap:10,padding:"10px 8px",borderRadius:"var(--radius-sm)",cursor:"pointer",background:selectedCoin?.symbol===coin.symbol?"var(--bg3)":"transparent"}}>
                    <div style={{width:20,fontSize:11,color:"var(--text3)",textAlign:"center"}}>{coin.rank}</div>
                    <div style={{width:32,height:32,borderRadius:"50%",background:"var(--bg3)",border:"1px solid var(--border)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0}}>{coin.icon}</div>
                    <div style={{flex:1,display:"flex",flexDirection:"column",gap:2}}>
                      <span style={{fontSize:13,fontWeight:700}}>{coin.symbol}</span>
                      <span style={{fontSize:11,color:"var(--text3)"}}>{coin.name}</span>
                    </div>
                    <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:2}}>
                      <span style={{fontSize:13,fontWeight:600}}>{formatPrice(coin.price)}</span>
                      <span style={{fontSize:11,fontWeight:600,color:isUp?"var(--green)":"var(--red)"}}>{isUp?"▲":"▼"} {Math.abs(coin.change24h).toFixed(2)}%</span>
                    </div>
                    {selectedCoin?.symbol===coin.symbol&&(
                      <div style={{position:"absolute",left:0,right:0,marginTop:60,background:"var(--bg2)",border:"1px solid var(--border)",borderRadius:"var(--radius)",padding:12,zIndex:10,display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                        <div style={{background:"var(--bg3)",borderRadius:"var(--radius-sm)",padding:"8px 10px"}}><div style={{fontSize:11,color:"var(--text3)"}}>Market cap</div><div style={{fontSize:13,fontWeight:600}}>{formatMarketCap(coin.marketCap)}</div></div>
                        <div style={{background:"var(--bg3)",borderRadius:"var(--radius-sm)",padding:"8px 10px"}}><div style={{fontSize:11,color:"var(--text3)"}}>24h volume</div><div style={{fontSize:13,fontWeight:600}}>{formatMarketCap(coin.volume24h)}</div></div>
                      </div>
                    )}
                  </div>
                );
              });
          })()}
        </div>
        {marketFilter&&<button onClick={()=>setMarketFilter("")} style={{width:"100%",background:"none",border:"none",color:"var(--text3)",fontSize:11,cursor:"pointer",padding:"8px 0 0",fontFamily:"var(--font)"}}>Clear search</button>}
      </section>

      {/* Recent activity */}
      <section className="section">
        <h3 className="section-title">Recent Activity</h3>
        {recentTxs.length === 0 ? (
          <p className="empty-state">No transactions yet</p>
        ) : (
          <div className="tx-mini-list">
            {recentTxs.map(tx => (
              <div key={tx.hash} className="tx-mini-row">
                <div className={`tx-type-badge tx-type--${tx.type}`}>
                  {(() => {
                    if (tx.type === 'send') return '↑'
                    if (tx.type === 'receive') return '↓'
                    return '⇄'
                  })()}
                </div>
                <div className="tx-mini-info">
                  <span className="tx-mini-label">{tx.type.charAt(0).toUpperCase() + tx.type.slice(1)} {tx.token}</span>
                  <span className="tx-mini-date">{new Date(tx.timestamp).toLocaleDateString()}</span>
                </div>
                <div className="tx-mini-amount">
                  <span className={tx.type === "receive" ? "positive" : ""}>
                    {tx.type === "receive" ? "+" : "-"}{parseFloat(tx.amount || tx.value || 0).toFixed(4)} {tx.token}
                  </span>
                  <span className={`tx-status tx-status--${tx.status}`}>{tx.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
