import { useState } from "react";
import { ethers } from "ethers";

const STORAGE_KEY = "toklo_custom_tokens";

export function getCustomTokens(chain = "ethereum") {
  try {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return all[chain] || [];
  } catch { return []; }
}

export function saveCustomToken(chain, token) {
  try {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    if (!all[chain]) all[chain] = [];
    const exists = all[chain].find(t =>
      t.address.toLowerCase() === token.address.toLowerCase()
    );
    if (!exists) all[chain].push(token);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    return true;
  } catch { return false; }
}

export function removeCustomToken(chain, address) {
  try {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    if (all[chain]) {
      all[chain] = all[chain].filter(
        t => t.address.toLowerCase() !== address.toLowerCase()
      );
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {}
}

const ERC20_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address) view returns (uint256)",
  "function totalSupply() view returns (uint256)",
];

// Free public RPCs — no API key, no rate limits
const FREE_RPCS = {
  ethereum: "https://ethereum.publicnode.com",
  sepolia:  "https://ethereum-sepolia.publicnode.com",
  bnb:      "https://bsc-dataseed1.binance.org",
  polygon:  "https://polygon-rpc.com",
  arbitrum: "https://arb1.arbitrum.io/rpc",
  optimism: "https://mainnet.optimism.io",
  base:     "https://mainnet.base.org",
};

// Well-known tokens per network for quick import
const KNOWN_TOKENS = {
  ethereum: [
    { symbol:"USDC",  address:"0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", name:"USD Coin" },
    { symbol:"USDT",  address:"0xdAC17F958D2ee523a2206206994597C13D831ec7", name:"Tether USD" },
    { symbol:"WBTC",  address:"0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", name:"Wrapped Bitcoin" },
    { symbol:"LINK",  address:"0x514910771AF9Ca656af840dff83E8264EcF986CA", name:"Chainlink" },
  ],
  sepolia: [
    { symbol:"DWT",   address:"0x85b9A8526105bD38Bfd870Ef47f0Fa6283E82B7e", name:"dWallet Token" },
  ],
  polygon: [
    { symbol:"USDC",  address:"0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174", name:"USD Coin" },
    { symbol:"USDT",  address:"0xc2132D05D31c914a87C6611C10748AEb04B58e8F", name:"Tether USD" },
  ],
  bnb: [
    { symbol:"USDT",  address:"0x55d398326f99059fF775485246999027B3197955", name:"Tether USD" },
    { symbol:"USDC",  address:"0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d", name:"USD Coin" },
  ],
};

export default function TokenImport({ activeChain, walletAddress, onAdded }) {
  const chain        = activeChain || "ethereum";
  const [address,    setAddress]    = useState("");
  const [token,      setToken]      = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState("");
  const [success,    setSuccess]    = useState("");
  const [removing,   setRemoving]   = useState(null);
  const [customList, setCustomList] = useState(getCustomTokens(chain));

  const refreshList = () => setCustomList(getCustomTokens(chain));

  const handleFill = (addr) => {
    setAddress(addr);
    setToken(null);
    setError("");
    setSuccess("");
  };

  const handleLookup = async () => {
    setError(""); setToken(null); setSuccess("");
    const trimmed = address.trim();
    if (!trimmed) return setError("Paste a contract address to look up");
    if (!ethers.isAddress(trimmed)) {
      return setError("Invalid address — must start with 0x followed by 40 hex characters");
    }
    setLoading(true);
    const rpc = FREE_RPCS[chain] || FREE_RPCS.ethereum;
    try {
      const provider = new ethers.JsonRpcProvider(rpc);
      const contract = new ethers.Contract(trimmed, ERC20_ABI, provider);

      // 8 second timeout
      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), 8000)
      );

      const [name, symbol, decimals, balance, totalSupply] = await Promise.race([
        Promise.all([
          contract.name(),
          contract.symbol(),
          contract.decimals(),
          walletAddress
            ? contract.balanceOf(walletAddress)
            : Promise.resolve(0n),
          contract.totalSupply(),
        ]),
        timeout,
      ]);

      setToken({
        address:     trimmed,
        name,
        symbol:      symbol.toUpperCase(),
        decimals:    Number(decimals),
        balance:     parseFloat(ethers.formatUnits(balance, decimals)).toFixed(4),
        totalSupply: parseFloat(ethers.formatUnits(totalSupply, decimals)).toLocaleString(
          undefined, { maximumFractionDigits:0 }
        ),
      });
    } catch(e) {
      const msg = e.message || "";
      if (msg.includes("timeout")) {
        setError("Request timed out — check your connection and try again");
      } else if (msg.includes("BAD_DATA") || msg.includes("could not decode")) {
        setError("This address is not a valid ERC-20 token on " + chain +
          " — make sure you selected the correct network");
      } else if (msg.includes("NETWORK_ERROR") || msg.includes("failed to fetch")) {
        setError("Network error — check your internet connection");
      } else if (msg.includes("CALL_EXCEPTION")) {
        setError("Contract call failed — this may not be an ERC-20 token on " + chain);
      } else {
        setError("Could not load token — verify the address and network are correct");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    if (!token) return;
    saveCustomToken(chain, token);
    setSuccess(token.symbol + " added to your wallet on " + chain);
    setAddress(""); setToken(null);
    refreshList();
    onAdded?.();
    setTimeout(() => setSuccess(""), 4000);
  };

  const handleRemove = (addr) => {
    setRemoving(addr);
    setTimeout(() => {
      removeCustomToken(chain, addr);
      refreshList();
      onAdded?.();
      setRemoving(null);
    }, 300);
  };

  const knownForChain = KNOWN_TOKENS[chain] || [];

  return (
    <div className="view-container">
      <div className="view-header">
        <h2 className="view-title">Import Token</h2>
      </div>

      <p style={{fontSize:13,color:"var(--text2)",margin:"0 0 16px",lineHeight:1.6}}>
        Add any ERC-20 token to your wallet by pasting its contract address.
      </p>

      {/* DWT hint card */}
      {(chain === "sepolia" || chain === "ethereum") && (
        <div style={{
          display:"flex",alignItems:"flex-start",gap:10,
          padding:"12px 14px",marginBottom:16,
          background:"rgba(99,102,241,0.06)",
          border:"1px solid rgba(99,102,241,0.2)",
          borderRadius:"var(--radius-sm)"
        }}>
          <span style={{fontSize:20,flexShrink:0}}>◈</span>
          <div style={{flex:1}}>
            <p style={{fontSize:13,fontWeight:700,margin:"0 0 3px",color:"var(--accent)"}}>
              DWT — dWallet Token
            </p>
            <p style={{fontSize:11,color:"var(--text3)",margin:"0 0 6px",lineHeight:1.5}}>
              {chain === "sepolia"
                ? "Toklo's native token — currently live on Sepolia testnet"
                : "Switch to Sepolia network to import DWT testnet token"}
            </p>
            {chain === "sepolia" && (
              <button
                onClick={() => handleFill("0x85b9A8526105bD38Bfd870Ef47f0Fa6283E82B7e")}
                style={{
                  background:"none",border:"none",padding:0,
                  cursor:"pointer",textAlign:"left",width:"100%"
                }}
              >
                <p style={{
                  fontSize:11,fontFamily:"var(--font-mono)",
                  color:"var(--accent)",margin:0,
                  wordBreak:"break-all",lineHeight:1.6,
                  textDecoration:"underline",textDecorationStyle:"dashed"
                }}>
                  0x85b9A8526105bD38Bfd870Ef47f0Fa6283E82B7e
                </p>
                <p style={{fontSize:10,color:"var(--text3)",margin:"2px 0 0"}}>
                  Tap to fill →
                </p>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Quick import — known tokens */}
      {knownForChain.length > 0 && (
        <div style={{marginBottom:16}}>
          <p style={{
            fontSize:11,fontWeight:700,color:"var(--text3)",
            textTransform:"uppercase",letterSpacing:"0.5px",margin:"0 0 8px"
          }}>
            Quick import — popular tokens on {chain}
          </p>
          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
            {knownForChain.map(t => (
              <button
                key={t.address}
                onClick={() => handleFill(t.address)}
                style={{
                  display:"flex",alignItems:"center",gap:6,
                  padding:"5px 10px",
                  background:"var(--bg3)",
                  border:"1px solid var(--border)",
                  borderRadius:20,cursor:"pointer",
                  fontSize:12,fontWeight:600,
                  color:"var(--text2)",fontFamily:"var(--font)",
                  transition:"all 0.15s"
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = "var(--accent)";
                  e.currentTarget.style.color = "var(--accent)";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = "var(--border)";
                  e.currentTarget.style.color = "var(--text2)";
                }}
              >
                <span style={{
                  width:18,height:18,borderRadius:"50%",
                  background:"var(--accent-light)",color:"var(--accent)",
                  fontSize:9,fontWeight:800,
                  display:"flex",alignItems:"center",justifyContent:"center"
                }}>
                  {t.symbol[0]}
                </span>
                {t.symbol}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Address input */}
      <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:12}}>
        <label style={{fontSize:12,fontWeight:600,color:"var(--text2)"}}>
          Token contract address
        </label>
        <div style={{display:"flex",gap:8}}>
          <input
            className="field"
            placeholder="0x..."
            value={address}
            onChange={e => {
              setAddress(e.target.value);
              setError(""); setToken(null); setSuccess("");
            }}
            onKeyDown={e => e.key === "Enter" && handleLookup()}
            style={{
              flex:1,
              fontFamily:"var(--font-mono)",fontSize:12,
              borderColor: token ? "rgba(16,185,129,0.6)" : undefined
            }}
          />
          {address && (
            <button
              onClick={() => { setAddress(""); setToken(null); setError(""); }}
              style={{
                background:"var(--bg3)",border:"1px solid var(--border)",
                borderRadius:"var(--radius-sm)",padding:"0 10px",
                fontSize:14,cursor:"pointer",color:"var(--text3)",
                flexShrink:0
              }}
            >
              ✕
            </button>
          )}
        </div>
        <p style={{fontSize:11,color:"var(--text3)",margin:0}}>
          Network: <strong style={{color:"var(--accent)"}}>{chain}</strong>
          {" · "}using free public RPC — no rate limits
        </p>
      </div>

      {/* Error / Success */}
      {error && (
        <div style={{
          display:"flex",alignItems:"flex-start",gap:8,
          padding:"10px 12px",marginBottom:12,
          background:"rgba(239,68,68,0.06)",
          border:"1px solid rgba(239,68,68,0.2)",
          borderRadius:"var(--radius-sm)"
        }}>
          <span style={{fontSize:14,flexShrink:0}}>⚠️</span>
          <p style={{fontSize:12,color:"var(--red)",margin:0,lineHeight:1.5}}>{error}</p>
        </div>
      )}
      {success && (
        <div style={{
          display:"flex",alignItems:"center",gap:8,
          padding:"10px 12px",marginBottom:12,
          background:"rgba(16,185,129,0.08)",
          border:"1px solid rgba(16,185,129,0.2)",
          borderRadius:"var(--radius-sm)"
        }}>
          <span style={{color:"var(--green)",fontSize:16}}>✓</span>
          <p style={{fontSize:12,color:"var(--green)",fontWeight:600,margin:0}}>{success}</p>
        </div>
      )}

      {/* Token preview card */}
      {token && (
        <div style={{
          background:"var(--bg2)",
          border:"1px solid rgba(16,185,129,0.3)",
          borderRadius:"var(--radius-sm)",
          padding:16,marginBottom:12
        }}>
          <p style={{
            fontSize:11,fontWeight:700,color:"var(--green)",
            textTransform:"uppercase",letterSpacing:"0.5px",margin:"0 0 12px"
          }}>
            ✓ Token found
          </p>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}>
            <div style={{
              width:46,height:46,borderRadius:"50%",
              background:"var(--accent-light)",color:"var(--accent)",
              fontSize:18,fontWeight:800,flexShrink:0,
              display:"flex",alignItems:"center",justifyContent:"center"
            }}>
              {token.symbol[0]}
            </div>
            <div style={{flex:1}}>
              <p style={{fontSize:15,fontWeight:700,margin:0,color:"var(--text)"}}>
                {token.name}
              </p>
              <p style={{fontSize:12,color:"var(--text3)",margin:"2px 0 0"}}>
                {token.symbol} · {token.decimals} decimals
              </p>
            </div>
          </div>
          <div style={{
            display:"grid",gridTemplateColumns:"1fr 1fr",
            gap:8,marginBottom:14
          }}>
            {[
              ["Your balance", token.balance + " " + token.symbol],
              ["Total supply", token.totalSupply + " " + token.symbol],
            ].map(([label, val]) => (
              <div key={label} style={{
                padding:"8px 10px",background:"var(--bg3)",
                border:"1px solid var(--border)",borderRadius:8
              }}>
                <p style={{fontSize:10,color:"var(--text3)",margin:0}}>{label}</p>
                <p style={{
                  fontSize:12,fontWeight:700,margin:"3px 0 0",
                  color:"var(--text)",wordBreak:"break-all"
                }}>{val}</p>
              </div>
            ))}
          </div>
          <button
            className="btn-primary full-width"
            onClick={handleAdd}
          >
            Add {token.symbol} to Wallet
          </button>
        </div>
      )}

      {/* Look up button */}
      {!token && (
        <button
          className="btn-primary full-width"
          onClick={handleLookup}
          disabled={loading || !address.trim()}
          style={{marginBottom:16}}
        >
          {loading
            ? <span style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
                <span style={{
                  width:14,height:14,
                  border:"2px solid rgba(255,255,255,0.4)",
                  borderTopColor:"white",borderRadius:"50%",
                  display:"inline-block",animation:"spin 0.8s linear infinite"
                }}/>
                Looking up token...
              </span>
            : "Look up Token →"
          }
        </button>
      )}

      {/* Custom tokens list */}
      {customList.length > 0 && (
        <div>
          <p style={{
            fontSize:11,fontWeight:700,color:"var(--text3)",
            textTransform:"uppercase",letterSpacing:"0.5px",margin:"0 0 8px"
          }}>
            Added tokens on {chain} ({customList.length})
          </p>
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            {customList.map(t => (
              <div
                key={t.address}
                style={{
                  display:"flex",alignItems:"center",gap:10,
                  padding:"10px 14px",
                  background: removing===t.address
                    ? "rgba(239,68,68,0.06)"
                    : "var(--bg2)",
                  border:"1px solid " + (removing===t.address
                    ? "rgba(239,68,68,0.2)"
                    : "var(--border)"),
                  borderRadius:"var(--radius-sm)",
                  transition:"all 0.3s",
                  opacity: removing===t.address ? 0.5 : 1
                }}
              >
                <div style={{
                  width:36,height:36,borderRadius:"50%",
                  background:"var(--accent-light)",color:"var(--accent)",
                  fontSize:14,fontWeight:700,flexShrink:0,
                  display:"flex",alignItems:"center",justifyContent:"center"
                }}>
                  {t.symbol[0]}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <p style={{fontSize:13,fontWeight:700,margin:0,color:"var(--text)"}}>
                    {t.symbol}
                    <span style={{
                      fontSize:11,color:"var(--text3)",
                      fontWeight:400,marginLeft:6
                    }}>
                      {t.name}
                    </span>
                  </p>
                  <p style={{
                    fontSize:10,color:"var(--text3)",margin:"2px 0 0",
                    fontFamily:"var(--font-mono)",
                    overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"
                  }}>
                    {t.address.slice(0,12)}...{t.address.slice(-8)}
                  </p>
                </div>
                <button
                  onClick={() => handleRemove(t.address)}
                  style={{
                    background:"none",border:"1px solid var(--border)",
                    color:"var(--text3)",borderRadius:6,
                    width:28,height:28,display:"flex",
                    alignItems:"center",justifyContent:"center",
                    cursor:"pointer",fontSize:12,flexShrink:0,
                    transition:"all 0.15s"
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.color = "var(--red)";
                    e.currentTarget.style.borderColor = "rgba(239,68,68,0.4)";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.color = "var(--text3)";
                    e.currentTarget.style.borderColor = "var(--border)";
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
