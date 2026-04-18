import React, { useState, useEffect, useMemo } from "react";
import { useWallet } from "../hooks/useWallet";
import { DEFAULT_TOKENS } from "../data/chains";
import { DWT as DWT_CONFIG, getDWTTier, formatDWT } from "../utils/dwt";
import { fetchPriceHistory, getPrice } from "../utils/prices";
import { fetchMarketData, formatPrice, formatMarketCap } from "../utils/market";
import { sanitizeSearchInput, validateBalanceData, sanitizeNumber } from "../utils/dataValidation";
import PortfolioChart from "./PortfolioChart";
import { getReferralStats, getReferralCode, getReferralLink } from "../utils/referral";

const TOKEN_ICONS = {
  DWT:"◈", ETH: "⟠", BNB: "⬡", MATIC: "◈", SOL: "◎", USDC: "$", USDT: "₮", DAI: "⬙", WBTC: "₿", UNI: "🦄", LINK: "⬡" };

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
  // Validate chainBalances
  const validatedBalances = validateBalanceData(chainBalances)
  const dwtBal   = sanitizeNumber(validatedBalances?.DWT ?? 0, { min: 0, max: 1e18, decimals: 18 })
  const hasDWT   = dwtBal > 0
  const tier     = getDWTTier(dwtBal)
  const explorer = DWT_CONFIG.explorerUrl(activeChain) || DWT_CONFIG.explorerUrl("sepolia")
  const dwtAddr  = DWT_CONFIG.addresses[activeChain] || DWT_CONFIG.addresses.sepolia
  const price    = 3.50
  const mktCap   = 4_500_000_000
  const change   = 12.4
  const usdVal   = (dwtBal * price).toFixed(2)

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
  const W = 100; const H = 40;
  const pts = spark.map((v, i) => {
    const x = (i / (spark.length - 1)) * W;
    const y = H - ((v - min) / (max - min || 1)) * H;
    return x + "," + y;
  }).join(" ");

  const formatMktCap = (n) => {
    if (n >= 1e9) return "$" + (n/1e9).toFixed(2) + "B";
    if (n >= 1e6) return "$" + (n/1e6).toFixed(1) + "M";
    return "$" + n.toLocaleString();
  };

  return (
    <div style={{
      background: "linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(99,102,241,0.04) 100%)",
      border: "1px solid rgba(99,102,241,0.25)",
      borderRadius: "12px",
      padding: "16px",
      marginBottom: 16,
      boxShadow: "0 2px 12px rgba(99,102,241,0.1)",
    }}>

      {/* Header Row: Logo + Token Info + Price + Market Cap */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 14,
        gap: 12
      }}>
        {/* Left: Logo + Token Name */}
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{
            width:36,height:36,borderRadius:"8px",flexShrink:0,
            background:"linear-gradient(135deg, rgba(99,102,241,0.2) 0%, rgba(99,102,241,0.1) 100%)",
            border:"1.5px solid rgba(99,102,241,0.35)",
            display:"flex",alignItems:"center",justifyContent:"center",
            fontSize:18,color:"var(--accent)",fontWeight:900
          }}>◈</div>
          <div>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <p style={{fontSize:15,fontWeight:800,margin:0,color:"var(--text)"}}>DWT</p>
              <span style={{
                fontSize:9,padding:"2px 5px",borderRadius:"4px",fontWeight:600,
                background:"rgba(99,102,241,0.12)",color:"var(--accent)",
                border:"1px solid rgba(99,102,241,0.18)"
              }}>dWallet</span>
            </div>
          </div>
        </div>

        {/* Center: Price + Change */}
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <p style={{fontSize:18,fontWeight:800,margin:0,color:"var(--text)"}}>
            ${price.toFixed(2)}
          </p>
          <span style={{
            fontSize:11,fontWeight:700,color:"var(--green)",
            background:"rgba(16,185,129,0.1)",padding:"2px 6px",borderRadius:"4px"
          }}>
            +{change}%
          </span>
        </div>

        {/* Right: Market Cap */}
        <div style={{textAlign:"right"}}>
          <p style={{fontSize:9,color:"var(--text3)",margin:"0 0 2px 0",fontWeight:600,textTransform:"uppercase",letterSpacing:"0.3px"}}>
            Market Cap
          </p>
          <p style={{fontSize:13,fontWeight:700,margin:0,color:"var(--text)"}}>
            {formatMktCap(mktCap)}
          </p>
        </div>
      </div>

      {/* Compact Stats Row: Supply + Balance + Fee Tier */}
      <div style={{
        display: "flex",
        gap: 10,
        marginBottom: 10,
        padding: "10px",
        background: "rgba(0,0,0,0.15)",
        borderRadius: "8px",
        border: "1px solid rgba(99,102,241,0.12)"
      }}>
        {/* Supply */}
        <div style={{flex: 1}}>
          <p style={{fontSize:9,color:"var(--text3)",margin:"0 0 3px 0",fontWeight:600,textTransform:"uppercase",letterSpacing:"0.3px"}}>Supply</p>
          <p style={{fontSize:14,fontWeight:800,margin:0,color:"var(--text)"}}>67.5M <span style={{fontSize:10,fontWeight:600,color:"var(--text3)"}}>DWT</span></p>
          <p style={{fontSize:9,color:"var(--text3)",margin:"2px 0 0",fontWeight:500}}>Circulating</p>
        </div>
      
        {/* Divider */}
        <div style={{width:"1px",background:"rgba(99,102,241,0.15)"}} />
      
        {/* Your Balance */}
        <div style={{flex: 1}}>
          <p style={{fontSize:9,color:"var(--text3)",margin:"0 0 3px 0",fontWeight:600,textTransform:"uppercase",letterSpacing:"0.3px"}}>Your Balance</p>
          <p style={{fontSize:14,fontWeight:800,margin:0,color:"var(--text)"}}>
            {dwtBal > 0 ? formatDWT(dwtBal) : '0'}
          </p>
          <p style={{fontSize:9,color:"var(--green)",margin:"2px 0 0",fontWeight:600}}>
            {dwtBal > 0 ? `≈ $${usdVal}` : 'No holdings'}
          </p>
        </div>
      
        {/* Divider */}
        <div style={{width:"1px",background:"rgba(99,102,241,0.15)"}} />
      
        {/* Fee Tier */}
        <div style={{flex: 1}}>
          <p style={{fontSize:9,color:"var(--text3)",margin:"0 0 3px 0",fontWeight:600,textTransform:"uppercase",letterSpacing:"0.3px"}}>Fee Tier</p>
          <div style={{display:"flex",alignItems:"baseline",gap:4}}>
            <p style={{fontSize:14,fontWeight:800,margin:0,color:"var(--accent)"}}>{tier.label}</p>
            <p style={{fontSize:9,color:"var(--text3)",margin:0,fontWeight:600}}>({tier.name})</p>
          </div>
          <p style={{fontSize:9,color:"var(--text3)",margin:"2px 0 0",fontWeight:500}}>Current rate</p>
        </div>
      </div>
      
      {/* Fee Tiers Progress - Compact Row */}
      <div style={{
        padding:"8px",
        background:"rgba(0,0,0,0.12)",
        borderRadius:"6px",
        border:"1px solid rgba(99,102,241,0.1)",
        marginBottom: 10
      }}>
        <div style={{display:"flex",gap:6}}>
          {DWT_CONFIG.tiers.map(function(t, idx) {
            const unlocked = dwtBal >= t.hold;
            return (
              <div key={t.name} style={{
                flex:1,
                padding:"6px 4px",
                background: unlocked 
                  ? "rgba(16,185,129,0.08)" 
                  : "rgba(0,0,0,0.1)",
                border: unlocked ? "1px solid rgba(16,185,129,0.2)" : "1px solid rgba(99,102,241,0.06)",
                borderRadius:"5px",
                textAlign:"center"
              }}>
                <p style={{
                  fontSize:10,fontWeight: unlocked ? 700 : 500,
                  color: unlocked ? "var(--green)" : "var(--text3)",
                  margin:0
                }}>
                  {(t.hold/1000).toFixed(0)}K
                </p>
                <p style={{
                  fontSize:9,fontWeight:600,
                  color: unlocked ? "var(--green)" : "var(--text3)",
                  margin:"2px 0 0"
                }}>
                  {t.label}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{display:"flex",gap:6}}>
        {explorer && (
          <a
            href={explorer}
            target="_blank"
            rel="noreferrer"
            style={{
              flex:1,padding:"8px 12px",textAlign:"center",
              background:"rgba(99,102,241,0.12)",
              border:"1px solid rgba(99,102,241,0.25)",
              borderRadius:"8px",
              fontSize:11,fontWeight:600,
              color:"var(--accent)",textDecoration:"none",display:"block"
            }}
          >
            Explorer ↗
          </a>
        )}
        <button
          onClick={copyAddr}
          style={{
            flex:1,padding:"8px 12px",textAlign:"center",
            background:"rgba(255,255,255,0.04)",
            border:"1px solid rgba(99,102,241,0.2)",
            borderRadius:"8px",
            fontSize:11,fontWeight:600,
            color: copied ? "var(--green)" : "var(--text2)",
            cursor:"pointer",fontFamily:"var(--font)"
          }}
        >
          {copied ? "✓ Copied" : dwtAddr ? dwtAddr.slice(0,6)+"..."+dwtAddr.slice(-6) : "Mainnet Soon"}
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

// ── DWT Summary Card with Airdrop & Referral Info ───────────────────────────
function DWTSummaryCard({ chainBalances, currentAddress, setActiveTab }) {
  const validatedBalances = validateBalanceData(chainBalances)
  const dwtBal = sanitizeNumber(validatedBalances?.DWT ?? 0, { min: 0, max: 1e18, decimals: 18 })
  const price = 3.50
  const usdVal = (dwtBal * price).toFixed(2)
  
  // Get referral stats
  const referralStats = getReferralStats()
  const referralCode = currentAddress ? getReferralCode(currentAddress) : ''
  const referralLink = currentAddress ? getReferralLink(currentAddress) : ''
  
  const [copiedLink, setCopiedLink] = useState(false)
  
  const handleCopyLink = async () => {
    if (!referralLink) return
    try {
      await navigator.clipboard.writeText(referralLink)
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2000)
    } catch (err) {
      console.error('Copy failed:', err)
    }
  }
  
  return (
    <div style={{
      background: "linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(168,85,247,0.08) 100%)",
      border: "1px solid rgba(99,102,241,0.2)",
      borderRadius: "12px",
      padding: "14px",
      marginBottom: 16,
    }}>
      {/* Header */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 12
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 20 }}>◈</span>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "var(--text)" }}>
            Toklo Rewards
          </h3>
        </div>
        <span style={{
          fontSize: 10,
          padding: "3px 8px",
          borderRadius: "6px",
          fontWeight: 700,
          background: "rgba(16,185,129,0.12)",
          color: "var(--green)",
          border: "1px solid rgba(16,185,129,0.2)"
        }}>
          Live
        </span>
      </div>
      
      {/* Stats Grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr",
        gap: 10,
        marginBottom: 12
      }}>
        {/* DWT Balance */}
        <div style={{
          padding: "10px",
          background: "rgba(0,0,0,0.2)",
          borderRadius: "8px",
          border: "1px solid rgba(99,102,241,0.1)"
        }}>
          <p style={{ fontSize: 9, color: "var(--text3)", margin: "0 0 4px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.3px" }}>
            DWT Balance
          </p>
          <p style={{ fontSize: 16, fontWeight: 800, margin: "0 0 2px", color: "var(--text)" }}>
            {dwtBal > 0 ? formatDWT(dwtBal) : '0'}
          </p>
          <p style={{ fontSize: 10, color: "var(--green)", margin: 0, fontWeight: 600 }}>
            ≈ ${usdVal}
          </p>
        </div>
        
        {/* Airdrop Status */}
        <div style={{
          padding: "10px",
          background: "rgba(0,0,0,0.2)",
          borderRadius: "8px",
          border: "1px solid rgba(99,102,241,0.1)"
        }}>
          <p style={{ fontSize: 9, color: "var(--text3)", margin: "0 0 4px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.3px" }}>
            Airdrop
          </p>
          <p style={{ fontSize: 16, fontWeight: 800, margin: "0 0 2px", color: "var(--accent)" }}>
            5 DWT
          </p>
          <p style={{ fontSize: 10, color: "var(--text3)", margin: 0, fontWeight: 600 }}>
            Claim Available
          </p>
        </div>
        
        {/* Referral Earnings */}
        <div style={{
          padding: "10px",
          background: "rgba(0,0,0,0.2)",
          borderRadius: "8px",
          border: "1px solid rgba(99,102,241,0.1)"
        }}>
          <p style={{ fontSize: 9, color: "var(--text3)", margin: "0 0 4px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.3px" }}>
            Referrals
          </p>
          <p style={{ fontSize: 16, fontWeight: 800, margin: "0 0 2px", color: "var(--text)" }}>
            {referralStats.signups}
          </p>
          <p style={{ fontSize: 10, color: "var(--green)", margin: 0, fontWeight: 600 }}>
            {referralStats.earned} DWT earned
          </p>
        </div>
      </div>
      
      {/* Quick Actions */}
      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={() => setActiveTab && setActiveTab('defi')}
          style={{
            flex: 1,
            padding: "8px 12px",
            background: "rgba(99,102,241,0.15)",
            border: "1px solid rgba(99,102,241,0.3)",
            borderRadius: "8px",
            fontSize: 11,
            fontWeight: 700,
            color: "var(--accent)",
            cursor: "pointer",
            fontFamily: "var(--font)",
            transition: "all 0.2s"
          }}
        >
          💎 Stake DWT
        </button>
        <button
          onClick={() => setActiveTab && setActiveTab('referral')}
          style={{
            flex: 1,
            padding: "8px 12px",
            background: "rgba(16,185,129,0.12)",
            border: "1px solid rgba(16,185,129,0.25)",
            borderRadius: "8px",
            fontSize: 11,
            fontWeight: 700,
            color: "var(--green)",
            cursor: "pointer",
            fontFamily: "var(--font)",
            transition: "all 0.2s"
          }}
        >
          🎁 Refer Friends
        </button>
        <button
          onClick={handleCopyLink}
          style={{
            flex: 1,
            padding: "8px 12px",
            background: copiedLink ? "rgba(16,185,129,0.2)" : "rgba(255,255,255,0.05)",
            border: "1px solid rgba(99,102,241,0.2)",
            borderRadius: "8px",
            fontSize: 11,
            fontWeight: 700,
            color: copiedLink ? "var(--green)" : "var(--text2)",
            cursor: "pointer",
            fontFamily: "var(--font)",
            transition: "all 0.2s"
          }}
        >
          {copiedLink ? "✓ Copied" : "📋 Copy Link"}
        </button>
      </div>
    </div>
  )
}

export default function Dashboard({ onSend, onReceive, onSwap, setActiveTab }) {
  const { chainBalances, totalUSDValue, activeChain, transactions, prices, loadingBal, notification, currentAddress } = useWallet()
  
  // Validate balances
  const validatedBalances = validateBalanceData(chainBalances)
  const tokens = useMemo(() => DEFAULT_TOKENS[activeChain] || [], [activeChain])
  const [sparklines, setSparklines] = useState({})
  const [activityFilter, setActivityFilter] = useState('all')
  
  // Filter and limit recent transactions
  const filteredTxs = transactions.filter(tx => activityFilter === 'all' || tx.type === activityFilter)
  const recentTxs = filteredTxs.slice(0, 5)


  const [marketData,setMarketData]=useState([])
  const [marketTab,setMarketTab]=useState("top")
  const [selectedCoin,setSelectedCoin]=useState(null)
  const [marketFilter,setMarketFilter]=useState("")
  const [loadingMkt,setLoadingMkt]=useState(true)

  useEffect(()=>{
    fetchMarketData().then(d=>{
      console.log('✅ Market data loaded:', d.length, 'coins')
      setMarketData(d)
      setLoadingMkt(false)
    }).catch(err => {
      console.error('❌ Failed to load market data:', err.message)
      setLoadingMkt(false)
    })
    const t=setInterval(()=>{
      fetchMarketData().then(d => {
        console.log('🔄 Market data refreshed:', d.length, 'coins')
        setMarketData(d)
      }).catch(err => {
        console.error('❌ Market data refresh error:', err.message)
      })
    },60000)
    return()=>clearInterval(t)
  },[])
  // Fetch sparklines for visible tokens
  useEffect(() => {
    tokens.forEach(async token => {
      if (sparklines[token]) return
      
      // Validate token symbol
      if (typeof token !== 'string' || token.length === 0) {
        console.warn('⚠️ Invalid token symbol:', token)
        return
      }
      
      const hist = await fetchPriceHistory(token, 7)
      if (hist.length > 0) {
        console.log(`✅ Price history loaded for ${token}: ${hist.length} points`)
        setSparklines(prev => ({ ...prev, [token]: hist }))
      } else {
        console.warn(`⚠️ No price history for ${token}`)
      }
    })
  }, [tokens, sparklines])

  const pctChange = (token) => {
    const hist = sparklines[token]
    if (!hist || hist.length < 2) return null
    
    const first = hist[0].price
    const last = hist[hist.length - 1].price
    
    // Validate prices
    if (typeof first !== 'number' || typeof last !== 'number' || first <= 0) {
      return null
    }
    
    const change = ((last - first) / first * 100)
    
    // Sanitize result
    return sanitizeNumber(change, { min: -100, max: 10000, decimals: 2 })
  }

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

      <DWTSummaryCard 
        chainBalances={chainBalances} 
        currentAddress={currentAddress}
        setActiveTab={setActiveTab}
      />

      <PortfolioChart balances={chainBalances} prices={prices}/>

      {/* Action buttons */}
      <div className="action-row">
        {/* Get Testnet Tokens - Shows on testnets when balance is low */}
        {(activeChain === 'sepolia' || activeChain === 'baseSepolia') && 
         Object.values(chainBalances).every(bal => bal < 0.001) && (
          <button 
            className="action-btn" 
            style={{ 
              background: 'linear-gradient(135deg, rgba(59,130,246,0.2) 0%, rgba(147,51,234,0.2) 100%)',
              border: '1px solid rgba(59,130,246,0.4)',
            }}
            onClick={() => {
              const faucets = activeChain === 'sepolia' 
                ? [
                    { name: 'Alchemy Faucet', url: 'https://sepoliafaucet.com/' },
                    { name: 'Chainlink Faucet', url: 'https://faucets.chain.link/sepolia' },
                  ]
                : [
                    { name: 'Base Faucet', url: 'https://faucets.chain.link/base-sepolia' },
                    { name: 'Coinbase Faucet', url: 'https://faucet.base.org/' },
                  ];
              
              // Open first faucet in new window
              if (faucets[0]) {
                window.open(faucets[0].url, '_blank', 'width=800,height=600');
              }
            }}
          >
            <span className="action-icon">🚰</span>
            <span>Get {activeChain === 'sepolia' ? 'ETH' : 'ETH'} Faucet</span>
          </button>
        )}
        
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
            try {
              const dwtBal = sanitizeNumber(validatedBalances?.DWT ?? 0, { min: 0, max: 1e18, decimals: 18 })
              const dwtPx  = 3.50
              const dwtUSD = (dwtBal * dwtPx).toFixed(2)
              console.log('✅ DWT RENDERING:', { 
                balance: dwtBal, 
                price: dwtPx, 
                usd: dwtUSD,
                chainBalances_DWT: chainBalances?.DWT,
                hasChainBalances: !!chainBalances
              });
                        
              // Safety check for sparkline
              let sparkPoints = '';
              try {
                const min = Math.min(...DWT_SPARKLINE);
                const max = Math.max(...DWT_SPARKLINE);
                sparkPoints = DWT_SPARKLINE.map((v,i) => {
                  const x = (i / (DWT_SPARKLINE.length - 1)) * 60;
                  const y = 24 - ((v - min) / (max - min || 1)) * 22;
                  return x + ',' + y;
                }).join(' ');
              } catch (e) {
                console.warn('Sparkline error:', e);
              }
                        
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
                    {sparkPoints ? (
                      <svg width="60" height="24" style={{overflow:"visible"}}>
                        <polyline
                          fill="none" stroke="#10b981" strokeWidth="1.8"
                          strokeLinecap="round" strokeLinejoin="round"
                          points={sparkPoints}
                        />
                      </svg>
                    ) : (
                      <span style={{fontSize:10,color:"var(--text3)"}}>--</span>
                    )}
                    <span className="token-change positive">▲ +12.4%</span>
                  </div>
                  <div className="token-balance">
                    <span className="token-amount">{dwtBal.toFixed(4)} DWT</span>
                    <span className="token-usd">{"$" + dwtUSD}</span>
                  </div>
                </div>
              );
            } catch (error) {
              console.error('❌ CRITICAL: DWT rendering failed:', error);
              // Fallback simple display
              return (
                <div className="token-row">
                  <div className="token-info">
                    <span className="token-name">DWT</span>
                    <span className="token-network">dWallet Token (Error loading)</span>
                  </div>
                </div>
              );
            }
          })()}

          {tokens.filter(token => token !== 'DWT').map(token => {
            const balance = sanitizeNumber(validatedBalances[token] || 0, { min: 0, max: 1e18, decimals: 18 })
            const price = sanitizeNumber(prices[token] ?? getPrice(token), { min: 0, max: 1e15, decimals: 8 })
            const usdValue = balance * price
            const change = pctChange(token)
            const icon = TOKEN_ICONS[token] || token[0]
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
            onChange={e => {
              // Sanitize search input
              const sanitized = sanitizeSearchInput(e.target.value, 50)
              setMarketFilter(sanitized)
            }}
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
              .filter(coin => {
                if (!marketFilter) return true
                
                // Sanitized search - already validated in onChange
                const filter = marketFilter.toLowerCase()
                return (
                  coin.symbol?.toLowerCase().includes(filter) ||
                  coin.name?.toLowerCase().includes(filter)
                )
              })
              .sort((a, b) => {
                if (marketTab === 'gainers') return (b.change24h || 0) - (a.change24h || 0)
                if (marketTab === 'losers') return (a.change24h || 0) - (b.change24h || 0)
                return (a.rank || 999) - (b.rank || 999)
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
        <div className="section-header">
          <h3 className="section-title">Recent Activity</h3>
          <button 
            className="view-all-btn"
            onClick={() => setActiveTab && setActiveTab('activity')}
          >
            View All →
          </button>
        </div>
        
        {/* Filter tabs */}
        <div className="filter-tabs-mini">
          {['all', 'send', 'receive', 'swap'].map(f => (
            <button
              key={f}
              className={`filter-tab-mini ${activityFilter === f ? 'filter-tab-mini--active' : ''}`}
              onClick={() => setActivityFilter(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        
        {recentTxs.length === 0 ? (
          <p className="empty-state">
            {activityFilter === 'all' ? 'No transactions yet' : `No ${activityFilter} transactions`}
          </p>
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
