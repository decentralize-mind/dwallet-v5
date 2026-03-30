import React, { useState, useEffect, useMemo } from "react";
import { useWallet } from "../hooks/useWallet";
import { DEFAULT_TOKENS } from "../data/chains";
import { DWT as DWT_CONFIG, getDWTTier, formatDWT } from "../utils/dwt";
import { fetchPriceHistory, getPrice } from "../utils/prices";
import { fetchMarketData, formatPrice, formatMarketCap } from "../utils/market";
import PortfolioChart from "./PortfolioChart";

const TOKEN_ICONS = {
  DWT:"◈", ETH: "⟠", BNB: "⬡", MATIC: "◈", SOL: "◎", USDC: "$", USDT: "₮", DAI: "⬙", WBTC: "₿", UNI: "🦄", LINK: "⬡", DWT: "◈" };

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
  const dwtBal   = parseFloat(chainBalances?.DWT ?? 0);
  const hasDWT   = dwtBal > 0;
  const tier     = getDWTTier(dwtBal);
  const explorer = DWT.explorerUrl(activeChain) || DWT.explorerUrl("sepolia");
  const dwtAddr  = DWT.addresses[activeChain] || DWT.addresses.sepolia;
  const price    = 3.50;
  const mktCap   = 4_500_000_000;
  const change   = 12.4;
  const usdVal   = (dwtBal * price).toFixed(2);

  const [copied, setCopied] = React.useState(false);
  const copyAddr = () => {
    if (!dwtAddr) return;
    navigator.clipboard.writeText(dwtAddr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Mini sparkline — always green trending up
  const spark = DWT_SPARKLINE;
  const min   = Math.min(...spark);
  const max   = Math.max(...spark);
  const W = 80; const H = 28;
  const pts = spark.map((v, i) => {
    const x = (i / (spark.length - 1)) * W;
    const y = H - ((v - min) / (max - min || 1)) * H;
    return x + "," + y;
  }).join(" ");

  const formatMktCap = (n) => {
    if (n >= 1e9) return "$" + (n/1e9).toFixed(1) + "B";
    if (n >= 1e6) return "$" + (n/1e6).toFixed(0) + "M";
    return "$" + n.toLocaleString();
  };

  return (
    <div style={{
      background: "linear-gradient(135deg, rgba(99,102,241,0.10) 0%, rgba(99,102,241,0.03) 100%)",
      border: "1px solid rgba(99,102,241,0.28)",
      borderRadius: "var(--radius-sm)",
      padding: "14px 16px",
      marginBottom: 16,
    }}>

      {/* Row 1: logo + name + price */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{
            width:40,height:40,borderRadius:"50%",flexShrink:0,
            background:"rgba(99,102,241,0.18)",
            border:"2px solid rgba(99,102,241,0.5)",
            display:"flex",alignItems:"center",justifyContent:"center",
            fontSize:20,color:"var(--accent)",fontWeight:900
          }}>◈</div>
          <div>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <p style={{fontSize:15,fontWeight:800,margin:0,color:"var(--text)"}}>DWT</p>
              <span style={{
                fontSize:9,padding:"2px 6px",borderRadius:8,fontWeight:700,
                background:"rgba(99,102,241,0.15)",color:"var(--accent)"
              }}>dWallet Token</span>
              <span style={{
                fontSize:9,padding:"2px 6px",borderRadius:8,fontWeight:700,
                background:"rgba(16,185,129,0.12)",color:"var(--green)"
              }}>
                {"▲ +" + change + "%"}
              </span>
            </div>
            <p style={{fontSize:10,color:"var(--text3)",margin:"1px 0 0"}}>
              {"Mkt cap: " + formatMktCap(mktCap) + "  ·  Supply: 67.5M"}
            </p>
          </div>
        </div>

        {/* Price + sparkline */}
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <svg width={W} height={H} style={{overflow:"visible"}}>
            <defs>
              <linearGradient id="dwtGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.3"/>
                <stop offset="100%" stopColor="#10b981" stopOpacity="0"/>
              </linearGradient>
            </defs>
            <polyline
              fill="none"
              stroke="#10b981"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={pts}
            />
          </svg>
          <div style={{textAlign:"right",minWidth:60}}>
            <p style={{fontSize:17,fontWeight:800,margin:0,color:"var(--text)"}}>
              {"$" + price.toFixed(2)}
            </p>
            <p style={{fontSize:10,fontWeight:700,color:"var(--green)",margin:"1px 0 0"}}>
              {"▲ +" + change + "%"}
            </p>
          </div>
        </div>
      </div>

      {/* Row 2: your balance */}
      {hasDWT && (
        <div style={{
          display:"flex",alignItems:"center",justifyContent:"space-between",
          padding:"8px 10px",marginBottom:10,
          background:"var(--bg2)",border:"1px solid var(--border)",borderRadius:8
        }}>
          <div>
            <p style={{fontSize:11,color:"var(--text3)",margin:0}}>Your balance</p>
            <p style={{fontSize:14,fontWeight:700,margin:"2px 0 0",color:"var(--text)"}}>
              {formatDWT(dwtBal)}
            </p>
          </div>
          <div style={{textAlign:"right"}}>
            <p style={{fontSize:11,color:"var(--text3)",margin:0}}>USD value</p>
            <p style={{fontSize:14,fontWeight:700,margin:"2px 0 0",color:"var(--accent)"}}>
              {"$" + usdVal}
            </p>
          </div>
        </div>
      )}

      {/* Row 3: fee tier */}
      <div style={{
        display:"flex",alignItems:"center",justifyContent:"space-between",
        padding:"8px 10px",marginBottom:10,
        background:"var(--bg2)",border:"1px solid var(--border)",borderRadius:8
      }}>
        <div>
          <p style={{fontSize:11,fontWeight:700,margin:0,color:"var(--text)"}}>
            {"⚡ " + tier.name + " — Swap fee: " + tier.label}
          </p>
          <p style={{fontSize:10,color:"var(--text3)",margin:"2px 0 0"}}>
            {hasDWT ? "You hold " + dwtBal.toLocaleString() + " DWT" : "Hold DWT to unlock lower fees"}
          </p>
        </div>
        <div>
          {DWT.tiers.map(function(t) {
            return (
              <div key={t.name} style={{display:"flex",alignItems:"center",gap:4,marginBottom:2}}>
                <span style={{
                  width:6,height:6,borderRadius:"50%",flexShrink:0,
                  background: dwtBal >= t.hold ? "var(--green)" : "var(--border)"
                }}/>
                <span style={{
                  fontSize:9,fontWeight: dwtBal >= t.hold ? 700 : 400,
                  color: dwtBal >= t.hold ? "var(--green)" : "var(--text3)"
                }}>
                  {(t.hold/1000).toFixed(0) + "K → " + t.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Row 4: links */}
      <div style={{display:"flex",gap:6}}>
        {explorer && (
          <a
            href={explorer}
            target="_blank"
            rel="noreferrer"
            style={{
              flex:1,padding:"7px 0",textAlign:"center",
              background:"rgba(99,102,241,0.10)",
              border:"1px solid rgba(99,102,241,0.25)",
              borderRadius:7,fontSize:11,fontWeight:600,
              color:"var(--accent)",textDecoration:"none",display:"block"
            }}
          >
            View on Explorer ↗
          </a>
        )}
        <button
          onClick={copyAddr}
          style={{
            flex:1,padding:"7px 0",textAlign:"center",
            background:"var(--bg3)",border:"1px solid var(--border)",
            borderRadius:7,fontSize:11,fontWeight:600,
            color: copied ? "var(--green)" : "var(--text2)",
            cursor:"pointer",fontFamily:"var(--font)"
          }}
        >
          {copied ? "✓ Copied" : dwtAddr ? dwtAddr.slice(0,8)+"..."+dwtAddr.slice(-6) : "Mainnet soon"}
        </button>
      </div>
    </div>
  );
}


// ── DWT always-green sparkline ────────────────────────────────────────────────
function generateDWTSparkline() {
  const base   = 3.50;
  const points = 14;
  const data   = [];
  let   price  = base * 0.88;
  for (let i = 0; i < points; i++) {
    price += (Math.random() * 0.06 + 0.02) * base; // always trending up
    price  = Math.min(price, base * 1.05);
    data.push(parseFloat(price.toFixed(4)));
  }
  data[data.length - 1] = base; // end exactly at current price
  return data;
}
const DWT_SPARKLINE = generateDWTSparkline();

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

          {/* ── DWT always shown under assets ── */}
          {(() => {
            const dwtBal = parseFloat(chainBalances?.DWT ?? 0);
            const dwtPx  = 3.50;
            const dwtUSD = (dwtBal * dwtPx).toFixed(2);
            return (
              <div className="token-row" style={{borderColor:"rgba(99,102,241,0.2)"}}>
                <div className="token-icon-wrap" style={{
                  background:"rgba(99,102,241,0.12)",
                  color:"var(--accent)",fontSize:16,fontWeight:800
                }}>◈</div>
                <div className="token-info">
                  <span className="token-name">DWT</span>
                  <span className="token-network" style={{color:"var(--accent)",fontWeight:600}}>
                    dWallet Token
                  </span>
                </div>
                <div className="token-sparkline">
                  <svg width="60" height="24" style={{overflow:"visible"}}>
                    <polyline
                      fill="none" stroke="#10b981" strokeWidth="1.8"
                      strokeLinecap="round" strokeLinejoin="round"
                      points={DWT_SPARKLINE.map((v,i)=>{
                        const min=Math.min(...DWT_SPARKLINE);
                        const max=Math.max(...DWT_SPARKLINE);
                        const x=(i/(DWT_SPARKLINE.length-1))*60;
                        const y=24-((v-min)/(max-min||1))*22;
                        return x+","+y;
                      }).join(" ")}
                    />
                  </svg>
                  <span className="token-change positive">▲ +12.4%</span>
                </div>
                <div className="token-balance">
                  <span className="token-amount">{dwtBal.toFixed(4)} DWT</span>
                  <span className="token-usd">{"$" + dwtUSD}</span>
                </div>
              </div>
            );
          })()}

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
