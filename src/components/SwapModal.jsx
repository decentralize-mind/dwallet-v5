import { useState, useEffect } from "react";
import { useWallet } from "../context/WalletContext";
import { DWT, getDWTTier } from "../utils/dwt";
import { getPrice } from "../utils/prices";

const CHAIN_TOKENS = {
  ethereum:    ["ETH","USDC","USDT","DAI","WBTC","UNI","LINK"],
  bnb:         ["BNB","USDT","BUSD","CAKE"],
  polygon:     ["MATIC","USDC","USDT","WETH"],
  sepolia:     ["ETH","DWT"],
  baseSepolia: ["ETH","DWT"],
  base:        ["ETH","DWT","USDC"],
  arbitrum:    ["ETH","USDC","USDT"],
};

// Fee Router addresses
const FEE_ROUTER = {
  sepolia:     "0xf068a5eCb76040bDA997aAC4AB5378cF62c484Ef",
  baseSepolia: "", // deploy pending
  base:        "", // deploy pending
};

const TOKEN_CONTRACTS = {
  sepolia: {
    DWT:  "0xdF8efd9F36f55baD4c7f38a7c958202858927743",
    USDC: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
  },
  baseSepolia: {
    DWT: "", // deploy pending
  },
  ethereum: {
    USDC: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    USDT: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    DAI:  "0x6B175474E89094C44Da98b954EedeAC495271d0F",
  },
};

const UNISWAP_ROUTER = {
  ethereum:    "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
  sepolia:     "0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48",
  base:        "0x2626664c2603336E57B271c5C0b26F421741e481",
  baseSepolia: "0x94cC0AaC535CCDB3C01d6787D6413C739ae12bc4",
};

const POOL_FEE = 3000; // 0.30% Uniswap pool fee

export default function SwapModal({ onClose }) {
  const { chainBalances, activeChain, wallet } = useWallet();
  const tokens      = CHAIN_TOKENS[activeChain] || ["ETH"];
  const dwtBalance  = chainBalances?.DWT || 0;
  const userTier    = getDWTTier(dwtBalance);

  const [fromToken,  setFromToken]  = useState(tokens[0]);
  const [toToken,    setToToken]    = useState(tokens[1] || tokens[0]);
  const [fromAmount, setFromAmount] = useState("");
  const [slippage,   setSlippage]   = useState(0.5);
  const [step,       setStep]       = useState("form");
  const [txHash,     setTxHash]     = useState("");
  const [error,      setError]      = useState("");
  const [swapping,   setSwapping]   = useState(false);

  const fromBal  = chainBalances[fromToken] || 0;
  const fromPx   = getPrice(fromToken);
  const toPx     = getPrice(toToken);
  const rate     = toPx > 0 ? fromPx / toPx : 0;
  const feeRate  = userTier.feeBps / 10000;
  const toAmount = fromAmount
    ? (parseFloat(fromAmount) * rate * (1 - feeRate) * (1 - slippage/100)).toFixed(6)
    : "";
  const fromUSD  = (parseFloat(fromAmount||0) * fromPx).toFixed(2);
  const toUSD    = (parseFloat(toAmount||0)   * toPx).toFixed(2);
  const priceImpact = parseFloat(fromAmount||0)*fromPx > 10000 ? 2.1 : 0.3;
  const routerAddr  = UNISWAP_ROUTER[activeChain] || UNISWAP_ROUTER.ethereum;
  const feeRouter   = FEE_ROUTER[activeChain] || "";
  const isTestnet   = activeChain==="sepolia" || activeChain==="baseSepolia";

  useEffect(() => {
    const toks = CHAIN_TOKENS[activeChain] || ["ETH"];
    setFromToken(toks[0]);
    setToToken(toks[1] || toks[0]);
    setFromAmount("");
    setError("");
  }, [activeChain]);

  const flip = () => {
    setFromToken(toToken);
    setToToken(fromToken);
    setFromAmount("");
  };

  const validate = () => {
    if (!fromAmount || parseFloat(fromAmount) <= 0) { setError("Enter an amount"); return false; }
    if (parseFloat(fromAmount) > fromBal) { setError(`Insufficient ${fromToken} balance`); return false; }
    if (fromToken === toToken) { setError("Select different tokens"); return false; }
    return true;
  };

  const handleSwap = async () => {
    if (!validate()) return;
    setSwapping(true); setError("");
    try {
      // Dynamic import ethers to keep bundle smaller
      const { ethers } = await import("ethers");
      const { getSigner } = await import("../utils/blockchain");

      const activeAcc = wallet?.accounts?.[wallet.activeAccount];
      if (!activeAcc?.privateKey) throw new Error("Wallet locked — please unlock first");

      const signer = getSigner(activeAcc.privateKey, activeChain);

      // ERC-20 ABI we need
      const erc20ABI = [
        "function approve(address spender, uint256 amount) returns (bool)",
        "function allowance(address owner, address spender) view returns (uint256)",
        "function balanceOf(address) view returns (uint256)",
      ];
      const routerABI = [
        "function exactInputSingle((address tokenIn,address tokenOut,uint24 fee,address recipient,uint256 amountIn,uint256 amountOutMinimum,uint160 sqrtPriceLimitX96)) external payable returns (uint256)",
      ];

      const tokenInAddr  = TOKEN_CONTRACTS[activeChain]?.[fromToken];
      const tokenOutAddr = TOKEN_CONTRACTS[activeChain]?.[toToken];
      const amountIn     = ethers.parseEther(fromAmount);
      const minOut       = ethers.parseEther(
        (parseFloat(toAmount) * (1 - slippage/100)).toFixed(18)
      );

      let txResult;

      if (fromToken === "ETH" || !tokenInAddr) {
        // ETH → Token via Uniswap direct (WETH wrapped internally)
        const WETH = {
          sepolia:     "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14",
          baseSepolia: "0x4200000000000000000000000000000000000006",
          ethereum:    "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
        }[activeChain] || "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";

        const router = new ethers.Contract(routerAddr, routerABI, signer);
        txResult = await router.exactInputSingle(
          {
            tokenIn:            WETH,
            tokenOut:           tokenOutAddr,
            fee:                POOL_FEE,
            recipient:          activeAcc.address,
            amountIn,
            amountOutMinimum:   minOut,
            sqrtPriceLimitX96:  0n,
          },
          { value: amountIn }
        );
      } else {
        // Token → Token or Token → ETH
        const tokenIn = new ethers.Contract(tokenInAddr, erc20ABI, signer);
        // Check and set allowance
        const allowance = await tokenIn.allowance(activeAcc.address, routerAddr);
        if (allowance < amountIn) {
          const approveTx = await tokenIn.approve(routerAddr, amountIn);
          await approveTx.wait();
        }

        const WETH_OUT = {
          sepolia:     "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14",
          baseSepolia: "0x4200000000000000000000000000000000000006",
          ethereum:    "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
        }[activeChain];

        const router = new ethers.Contract(routerAddr, routerABI, signer);
        txResult = await router.exactInputSingle({
          tokenIn:           tokenInAddr,
          tokenOut:          tokenOutAddr || WETH_OUT,
          fee:               POOL_FEE,
          recipient:         activeAcc.address,
          amountIn,
          amountOutMinimum:  minOut,
          sqrtPriceLimitX96: 0n,
        });
      }

      const receipt = await txResult.wait();
      setTxHash(receipt.hash || txResult.hash);
      setStep("success");
    } catch(e) {
      const msg = e.message || "";
      if (msg.includes("user rejected"))         setError("Transaction rejected");
      else if (msg.includes("insufficient"))      setError("Insufficient balance for gas");
      else if (msg.includes("INSUFFICIENT_FUNDS"))setError("Not enough ETH for gas fees");
      else if (msg.includes("slippage"))          setError("Slippage too low — increase tolerance");
      else                                         setError(msg.slice(0,120));
    } finally { setSwapping(false); }
  };

  const EXPLORERS = {
    sepolia:"https://sepolia.etherscan.io",
    baseSepolia:"https://sepolia.basescan.org",
    ethereum:"https://etherscan.io",
    base:"https://basescan.org",
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e=>e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Swap</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {step==="form" && (
          <div className="modal-body">
            {/* Header info */}
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
              <span style={{fontSize:11,color:"var(--text3)"}}>
                Powered by Uniswap V3
                {feeRouter && " · Toklo fee router"}
              </span>
              <span style={{
                fontSize:10,padding:"2px 8px",borderRadius:8,fontWeight:700,
                background:"rgba(99,102,241,0.12)",color:"var(--accent)"
              }}>
                Your fee: {userTier.label}
                {dwtBalance > 0 && ` (${userTier.name})`}
              </span>
            </div>

            {isTestnet && (
              <div style={{
                padding:"6px 10px",marginBottom:10,
                background:"rgba(245,158,11,0.08)",border:"1px solid rgba(245,158,11,0.2)",
                borderRadius:"var(--radius-sm)",fontSize:11,color:"var(--amber)",fontWeight:600
              }}>
                ⚠️ {activeChain==="baseSepolia"?"Base Sepolia":"Sepolia"} testnet — no real value
              </div>
            )}

            {/* From */}
            <div className="swap-panel">
              <div className="swap-row-top">
                <label className="form-label">From</label>
                <span className="balance-hint">Balance: {fromBal.toFixed(6)}</span>
              </div>
              <div className="swap-input-row">
                <input
                  className="swap-amount-input" type="number" placeholder="0.0"
                  value={fromAmount}
                  onChange={e=>{setFromAmount(e.target.value);setError("");}}
                />
                <select className="swap-token-select" value={fromToken}
                  onChange={e=>setFromToken(e.target.value)}>
                  {tokens.filter(t=>t!==toToken).map(t=>(
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <p className="usd-equiv">≈ ${fromUSD}</p>
                <button onClick={()=>setFromAmount(String(fromBal))}
                  style={{fontSize:10,color:"var(--accent)",background:"none",border:"none",cursor:"pointer",fontFamily:"var(--font)",fontWeight:700}}>
                  MAX
                </button>
              </div>
            </div>

            {/* Flip */}
            <div className="swap-arrow-row">
              <button className="swap-arrow-btn" onClick={flip}>⇅</button>
            </div>

            {/* To */}
            <div className="swap-panel">
              <div className="swap-row-top">
                <label className="form-label">To (estimated)</label>
              </div>
              <div className="swap-input-row">
                <input className="swap-amount-input" readOnly value={toAmount} placeholder="0.0"/>
                <select className="swap-token-select" value={toToken}
                  onChange={e=>setToToken(e.target.value)}>
                  {tokens.filter(t=>t!==fromToken).map(t=>(
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <p className="usd-equiv">≈ ${toUSD}</p>
            </div>

            {/* Details */}
            <div className="swap-details">
              <div className="swap-detail-row">
                <span>Rate</span>
                <span>1 {fromToken} = {rate.toFixed(6)} {toToken}</span>
              </div>
              <div className="swap-detail-row">
                <span>Toklo fee ({userTier.label})</span>
                <span style={{color:"var(--accent)"}}>
                  {(parseFloat(fromAmount||0)*feeRate).toFixed(6)} {fromToken}
                </span>
              </div>
              <div className="swap-detail-row">
                <span>Uniswap fee (0.30%)</span>
                <span>{(parseFloat(fromAmount||0)*0.003).toFixed(6)} {fromToken}</span>
              </div>
              <div className="swap-detail-row">
                <span>Price impact</span>
                <span className={priceImpact>1?"warn":"positive"}>{priceImpact}%</span>
              </div>
              <div className="swap-detail-row">
                <span>Slippage</span>
                <div className="slippage-btns">
                  {[0.1,0.5,1.0].map(s=>(
                    <button key={s}
                      className={`slippage-btn ${slippage===s?"active":""}`}
                      onClick={()=>setSlippage(s)}>{s}%</button>
                  ))}
                </div>
              </div>
            </div>

            {/* DWT tier nudge */}
            {dwtBalance === 0 && (
              <div style={{
                padding:"8px 10px",marginBottom:8,
                background:"rgba(99,102,241,0.06)",
                border:"1px solid rgba(99,102,241,0.15)",
                borderRadius:"var(--radius-sm)",fontSize:11,color:"var(--accent)"
              }}>
                ◈ Hold 1,000+ DWT to reduce swap fee to 0.15%
              </div>
            )}

            {error && <p className="error-msg">{error}</p>}

            <button
              className="btn-primary full-width"
              onClick={handleSwap}
              disabled={!fromAmount||parseFloat(fromAmount)<=0||swapping}
            >
              {swapping
                ? <span style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
                    <span style={{width:14,height:14,border:"2px solid rgba(255,255,255,0.4)",borderTopColor:"white",borderRadius:"50%",display:"inline-block",animation:"spin 0.8s linear infinite"}}/>
                    Swapping...
                  </span>
                : `Swap ${fromToken} → ${toToken}`}
            </button>
          </div>
        )}

        {step==="success" && (
          <div className="modal-body center">
            <div className="success-icon">⇄</div>
            <h3 className="success-title">Swap Complete!</h3>
            <p className="success-sub">
              {fromAmount} {fromToken} → ~{toAmount} {toToken}
            </p>
            {txHash && (
              <div className="tx-hash-box">
                <span className="tx-hash-label">Tx Hash</span>
                <span className="tx-hash-value mono">{txHash.slice(0,22)}...</span>
              </div>
            )}
            {txHash && (
              <a
                href={`${EXPLORERS[activeChain] || EXPLORERS.ethereum}/tx/${txHash}`}
                target="_blank" rel="noreferrer"
                className="btn-secondary full-width"
                style={{textAlign:"center",display:"block",marginTop:8}}
              >
                View on Explorer ↗
              </a>
            )}
            <button className="btn-primary full-width" onClick={onClose} style={{marginTop:8}}>
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
