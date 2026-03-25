import { useState } from "react";
import { useWallet } from "../context/WalletContext";

const STEPS_CREATE = ["welcome","security","create","backup","verify","complete"];
const STEPS_IMPORT = ["welcome","security","import","complete"];

function ProgressBar({ steps, current }) {
  const idx = steps.indexOf(current);
  if (idx <= 0 || current === "welcome" || current === "unlock") return null;
  const pct = Math.round((idx / (steps.length - 1)) * 100);
  return (
    <div style={{marginBottom:20}}>
      <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"var(--text3)",marginBottom:6}}>
        <span>Step {idx} of {steps.length - 1}</span>
        <span>{pct}%</span>
      </div>
      <div style={{background:"var(--bg4)",borderRadius:4,height:4,overflow:"hidden"}}>
        <div style={{
          width:pct+"%",height:"100%",
          background:"linear-gradient(90deg,#6366f1,#a78bfa)",
          borderRadius:4,transition:"width 0.4s ease"
        }}/>
      </div>
    </div>
  );
}

function FeatureRow({ icon, title, desc }) {
  return (
    <div style={{display:"flex",alignItems:"flex-start",gap:12,padding:"10px 0",borderBottom:"1px solid var(--border)"}}>
      <div style={{
        width:36,height:36,borderRadius:10,background:"var(--accent-light)",
        color:"var(--accent)",fontSize:16,display:"flex",
        alignItems:"center",justifyContent:"center",flexShrink:0
      }}>{icon}</div>
      <div>
        <p style={{fontSize:13,fontWeight:700,margin:"0 0 2px"}}>{title}</p>
        <p style={{fontSize:12,color:"var(--text3)",margin:0,lineHeight:1.5}}>{desc}</p>
      </div>
    </div>
  );
}

export default function OnboardingScreen() {
  const { createWallet, confirmWallet, importWallet, unlockWallet, isLocked } = useWallet();
  const [flow,         setFlow]         = useState("none");
  const [step,         setStep]         = useState(isLocked ? "unlock" : "welcome");
  const [newMnemonic,  setNewMnemonic]  = useState("");
  const [verifyIdxs,   setVerifyIdxs]   = useState([]);
  const [verifyWords,  setVerifyWords]  = useState({});
  const [password,     setPassword]     = useState("");
  const [confirmPwd,   setConfirmPwd]   = useState("");
  const [importInput,  setImportInput]  = useState("");
  const [error,        setError]        = useState("");
  const [loading,      setLoading]      = useState(false);
  const [seedRevealed, setSeedRevealed] = useState(false);
  const [seedCopied,   setSeedCopied]   = useState(false);
  const [checkedWrite, setCheckedWrite] = useState(false);
  const [checkedStore, setCheckedStore] = useState(false);
  const [showPwd,      setShowPwd]      = useState(false);
  const [agreedTerms,  setAgreedTerms]  = useState(false);

  const steps = flow === "import" ? STEPS_IMPORT : STEPS_CREATE;

  const pwdChecks = [
    { label:"8+ chars",  ok: password.length >= 8 },
    { label:"Uppercase", ok: /[A-Z]/.test(password) },
    { label:"Number",    ok: /[0-9]/.test(password) },
    { label:"Symbol",    ok: /[^a-zA-Z0-9]/.test(password) },
  ];
  const pwdStrong = pwdChecks.filter(c => c.ok).length;

  const go = (s) => { setError(""); setStep(s); };

  const handleCreate = async () => {
    if (password.length < 8)       return setError("Password must be at least 8 characters");
    if (password !== confirmPwd)    return setError("Passwords do not match");
    setLoading(true);
    try {
      // createWallet now only generates — does NOT save to localStorage
      // wallet is saved only after seed phrase is verified (handleVerify)
      const phrase = await createWallet(password);
      setNewMnemonic(phrase);
      const idxs = [];
      while (idxs.length < 3) {
        const r = Math.floor(Math.random() * 12);
        if (!idxs.includes(r)) idxs.push(r);
      }
      setVerifyIdxs(idxs.sort((a,b) => a-b));
      setVerifyWords({});
      go("backup");
    } catch(e) { setError(e.message); }
    setLoading(false);
  };

  const handleImport = async () => {
    if (!importInput.trim())        return setError("Enter your seed phrase");
    if (password.length < 8)        return setError("Password must be at least 8 characters");
    if (password !== confirmPwd)     return setError("Passwords do not match");
    setLoading(true);
    try {
      await importWallet(importInput.trim(), password);
      go("complete");
    } catch(e) { setError(e.message); }
    setLoading(false);
  };

  const handleUnlock = async () => {
    setLoading(true);
    try {
      await unlockWallet(password);
    } catch(e) { setError(e.message); }
    setLoading(false);
  };

  const handleVerify = async () => {
    const words = newMnemonic.split(" ");
    const allOk = verifyIdxs.every(idx =>
      (verifyWords[idx]||"").trim().toLowerCase() === words[idx].toLowerCase()
    );
    if (allOk) {
      setError("");
      try {
        // NOW save the wallet permanently after seed phrase confirmed
        await confirmWallet();
        go("complete");
        setTimeout(() => window.location.reload(), 1800);
      } catch(e) {
        setError("Failed to save wallet: " + e.message);
      }
    } else {
      setError("Some words are incorrect. Check your seed phrase.");
    }
  };

  const words = newMnemonic.split(" ");

  return (
    <div className="onboarding" style={{background:"#f0f2f5",minHeight:"100vh"}}>
      <div className="onboarding-card" style={{background:"#ffffff",border:"1px solid #e2e8f0",boxShadow:"0 4px 24px rgba(0,0,0,0.08)"}}>

        <div className="logo-area">
          <span className="logo-icon">◈</span>
          <h1 className="logo-title">Toklo</h1>
          <p className="logo-sub" style={{color:"#64748b"}}>Your keys. Your crypto. Your freedom.</p>
        </div>

        <ProgressBar steps={steps} current={step}/>

        {/* ── UNLOCK ── */}
        {step === "unlock" && (
          <div className="step-content">
            <h2 className="step-title">Welcome back</h2>
            <p className="step-sub">Enter your password to unlock your wallet</p>
            <div className="pwd-input-wrap">
              <input
                type={showPwd ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleUnlock()}
                className="field"
                autoFocus
                style={{paddingRight:52}}
              />
              <button className="pwd-toggle" onClick={() => setShowPwd(v => !v)}>
                {showPwd ? "hide" : "show"}
              </button>
            </div>
            {error && <p className="error-msg">{error}</p>}
            <button className="btn-primary full-width" onClick={handleUnlock} disabled={loading}>
              {loading ? "Unlocking..." : "Unlock wallet →"}
            </button>
            <button className="btn-link" onClick={() => {
              if (confirm("This will delete your wallet from this device.\nMake sure you have your seed phrase backed up.")) {
                localStorage.clear();
                sessionStorage.clear();
                window.location.reload();
              }
            }}>
              Forgot password? Reset wallet
            </button>
          </div>
        )}

        {/* ── WELCOME ── */}
        {step === "welcome" && (
          <div className="step-content">

            <p style={{
              fontSize:14,color:"#475569",lineHeight:1.7,
              textAlign:"center",margin:"0 0 20px",padding:"0 4px"
            }}>
              A non-custodial Web3 wallet with built-in DeFi,
              live market prices, and an AI agent — all free.
            </p>

            <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:20}}>
              {[
                ["⇄","Swap, stake and lend",   "Uniswap V3 · Aave · Lido"],
                ["◈","Earn with DWT token",    "Stake DWT → earn ETH rewards"],
                ["📈","Live prices — 20 coins", "BTC, ETH, SOL and more"],
              ].map(([icon,title,sub]) => (
                <div key={title} style={{
                  display:"flex",alignItems:"center",gap:12,
                  padding:"10px 14px",background:"#f8fafc",
                  border:"1px solid #e2e8f0",borderRadius:10
                }}>
                  <span style={{
                    width:36,height:36,borderRadius:10,
                    background:"rgba(99,102,241,0.1)",
                    color:"#6366f1",fontSize:16,
                    display:"flex",alignItems:"center",
                    justifyContent:"center",flexShrink:0
                  }}>{icon}</span>
                  <div>
                    <p style={{fontSize:13,fontWeight:600,margin:0,color:"#0f172a"}}>{title}</p>
                    <p style={{fontSize:11,color:"#94a3b8",margin:"2px 0 0"}}>{sub}</p>
                  </div>
                </div>
              ))}
            </div>

            <button className="btn-primary full-width"
              onClick={() => { setFlow("create"); go("security"); }}>
              Create new wallet →
            </button>
            <button className="btn-secondary full-width"
              onClick={() => { setFlow("import"); go("security"); }}>
              Import existing wallet
            </button>
            <p style={{
              fontSize:11,color:"#94a3b8",
              textAlign:"center",marginTop:6,lineHeight:1.6
            }}>
              Your keys never leave your device · Free forever
            </p>
          </div>
        )}

        {/* ── SECURITY BRIEFING ── */}
        {step === "security" && (
          <div className="step-content">
            <div style={{textAlign:"center",marginBottom:4}}>
              <div style={{
                width:56,height:56,borderRadius:"50%",
                background:"var(--accent-light)",border:"2px solid var(--accent)",
                display:"flex",alignItems:"center",justifyContent:"center",
                fontSize:26,margin:"0 auto 10px"
              }}>🛡️</div>
              <h2 className="step-title" style={{fontSize:20,marginBottom:4}}>Your wallet, your rules</h2>
              <p className="step-sub" style={{margin:0}}>
                Toklo is non-custodial. Read these 4 facts before continuing.
              </p>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {[
                ["��","rgba(99,102,241,0.06)","rgba(99,102,241,0.25)","#818cf8",
                  "You own your keys",
                  "Your private key is generated on your device and encrypted with your password. Toklo never sees it, stores it, or has any way to access your funds."],
                ["📝","rgba(245,158,11,0.06)","rgba(245,158,11,0.25)","var(--amber)",
                  "Seed phrase = master key",
                  "Your 12-word recovery phrase can restore your wallet on any device. Write it on paper. Store it offline. Never screenshot, save in a file, or share it with anyone."],
                ["⚠️","rgba(239,68,68,0.06)","rgba(239,68,68,0.25)","var(--red)",
                  "No recovery without your seed",
                  "If you lose your password AND your seed phrase, your funds are permanently inaccessible. Not even Toklo, Ethereum, or any government can help."],
                ["⛓","rgba(16,185,129,0.06)","rgba(16,185,129,0.25)","var(--green)",
                  "No one can freeze your funds",
                  "No company, government, or institution can block, freeze, or seize your wallet. Your access is guaranteed by cryptography — not by Toklo's permission."],
              ].map(([icon,bg,border,color,title,desc]) => (
                <div key={title} style={{
                  background:bg,border:`1px solid ${border}`,
                  borderRadius:"var(--radius-sm)",overflow:"hidden"
                }}>
                  <div style={{
                    display:"flex",alignItems:"center",gap:10,
                    padding:"10px 14px",
                    borderBottom:`1px solid ${border}`
                  }}>
                    <span style={{
                      width:32,height:32,borderRadius:8,
                      background:border,display:"flex",
                      alignItems:"center",justifyContent:"center",
                      fontSize:16,flexShrink:0
                    }}>{icon}</span>
                    <p style={{fontSize:13,fontWeight:700,margin:0,color}}>{title}</p>
                  </div>
                  <p style={{fontSize:12,color:"var(--text2)",margin:0,padding:"10px 14px",lineHeight:1.6}}>
                    {desc}
                  </p>
                </div>
              ))}
            </div>
            <div style={{
              background:"var(--bg3)",border:"1px solid var(--border)",
              borderRadius:"var(--radius-sm)",padding:"12px 14px"
            }}>
              <label style={{display:"flex",alignItems:"flex-start",gap:10,cursor:"pointer"}}>
                <input type="checkbox" checked={agreedTerms}
                  onChange={e => setAgreedTerms(e.target.checked)}
                  style={{marginTop:2,flexShrink:0,width:16,height:16,accentColor:"var(--accent)"}}/>
                <span style={{fontSize:12,color:"var(--text2)",lineHeight:1.6}}>
                  I have read and understood all of the above. I am solely responsible for my
                  wallet and seed phrase. I know that Toklo <strong>cannot</strong> recover
                  lost funds or access my wallet.
                </span>
              </label>
            </div>
            <button className="btn-primary full-width"
              disabled={!agreedTerms}
              style={{opacity:agreedTerms?1:0.45,transition:"opacity 0.2s"}}
              onClick={() => go(flow==="import"?"import":"create")}>
              I understand — set up my wallet →
            </button>
            <button className="btn-link" onClick={() => go("welcome")}>← Back</button>
          </div>
        )}

        {/* ── CREATE ── */}
        {step === "create" && (
          <div className="step-content">
            <div style={{textAlign:"center",marginBottom:4}}>
              <div style={{
                width:56,height:56,borderRadius:"50%",
                background:"var(--accent-light)",border:"2px solid var(--accent)",
                display:"flex",alignItems:"center",justifyContent:"center",
                fontSize:26,margin:"0 auto 10px"
              }}>🔐</div>
              <h2 className="step-title" style={{fontSize:20,marginBottom:4}}>Set your password</h2>
              <p className="step-sub" style={{margin:0}}>
                This encrypts your wallet on this device only.
              </p>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              <label style={{fontSize:12,fontWeight:600,color:"var(--text2)"}}>Password</label>
              <div className="pwd-input-wrap">
                <input type={showPwd?"text":"password"} placeholder="Minimum 8 characters"
                  value={password} onChange={e => setPassword(e.target.value)}
                  className="field" autoFocus style={{paddingRight:52}}/>
                <button className="pwd-toggle" onClick={() => setShowPwd(v=>!v)}>
                  {showPwd?"hide":"show"}
                </button>
              </div>
            </div>
            {password.length > 0 && (
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontSize:11,color:"var(--text3)"}}>Password strength</span>
                  <span style={{fontSize:11,fontWeight:700,color:
                    pwdStrong<=1?"var(--red)":pwdStrong===2?"var(--amber)":pwdStrong===3?"#3b82f6":"var(--green)"
                  }}>{["","Weak","Fair","Good","Strong"][pwdStrong]}</span>
                </div>
                <div style={{display:"flex",gap:4,height:6}}>
                  {[1,2,3,4].map(seg => (
                    <div key={seg} style={{
                      flex:1,borderRadius:3,transition:"background 0.3s",
                      background: pwdStrong>=seg
                        ? pwdStrong===1?"var(--red)":pwdStrong===2?"var(--amber)":pwdStrong===3?"#3b82f6":"var(--green)"
                        : "var(--bg4)"
                    }}/>
                  ))}
                </div>
              </div>
            )}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
              {pwdChecks.map(c => (
                <div key={c.label} style={{
                  display:"flex",alignItems:"center",gap:7,
                  padding:"8px 10px",borderRadius:"var(--radius-sm)",
                  background:c.ok?"rgba(16,185,129,0.08)":"var(--bg3)",
                  border:`1px solid ${c.ok?"rgba(16,185,129,0.3)":"var(--border)"}`,
                  transition:"all 0.2s"
                }}>
                  <div style={{
                    width:18,height:18,borderRadius:"50%",flexShrink:0,
                    display:"flex",alignItems:"center",justifyContent:"center",
                    fontSize:10,fontWeight:700,
                    background:c.ok?"var(--green)":"var(--bg4)",
                    color:c.ok?"white":"var(--text3)",transition:"all 0.2s"
                  }}>{c.ok?"✓":"○"}</div>
                  <span style={{
                    fontSize:12,fontWeight:c.ok?600:400,
                    color:c.ok?"var(--green)":"var(--text3)",transition:"color 0.2s"
                  }}>{c.label}</span>
                </div>
              ))}
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              <label style={{fontSize:12,fontWeight:600,color:"var(--text2)"}}>Confirm password</label>
              <div style={{position:"relative"}}>
                <input type={showPwd?"text":"password"} placeholder="Re-enter your password"
                  value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)}
                  className="field"
                  style={{
                    paddingRight:36,
                    borderColor:confirmPwd
                      ? password===confirmPwd?"rgba(16,185,129,0.6)":"rgba(239,68,68,0.5)"
                      : undefined
                  }}
                  onKeyDown={e => e.key==="Enter" && handleCreate()}/>
                {confirmPwd && (
                  <span style={{
                    position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",
                    fontSize:16,color:password===confirmPwd?"var(--green)":"var(--red)"
                  }}>{password===confirmPwd?"✓":"✗"}</span>
                )}
              </div>
              {confirmPwd && password!==confirmPwd && (
                <p style={{fontSize:12,color:"var(--red)",margin:0}}>Passwords do not match</p>
              )}
              {confirmPwd && password===confirmPwd && (
                <p style={{fontSize:12,color:"var(--green)",margin:0}}>✓ Passwords match</p>
              )}
            </div>
            <div style={{
              display:"flex",alignItems:"flex-start",gap:8,padding:"10px 12px",
              background:"rgba(99,102,241,0.06)",border:"1px solid rgba(99,102,241,0.2)",
              borderRadius:"var(--radius-sm)"
            }}>
              <span style={{fontSize:14,flexShrink:0}}>💡</span>
              <p style={{fontSize:11,color:"var(--text3)",margin:0,lineHeight:1.6}}>
                Use a passphrase like <em style={{color:"var(--text2)"}}>correct-horse-battery-staple</em> — easy to remember, hard to crack.
              </p>
            </div>
            {error && <p className="error-msg">{error}</p>}
            <button className="btn-primary full-width" onClick={handleCreate}
              disabled={loading || pwdStrong<2 || password!==confirmPwd || !confirmPwd}
              style={{opacity:(!loading&&pwdStrong>=2&&password===confirmPwd&&confirmPwd)?1:0.45,transition:"opacity 0.2s"}}>
              {loading
                ? <span style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
                    <span style={{
                      width:16,height:16,border:"2px solid rgba(255,255,255,0.4)",
                      borderTopColor:"white",borderRadius:"50%",display:"inline-block",
                      animation:"spin 0.8s linear infinite"
                    }}/>Creating your wallet...
                  </span>
                : "Create wallet →"
              }
            </button>
            <button className="btn-link" onClick={() => go("security")}>← Back</button>
          </div>
        )}

        {/* ── BACKUP ── */}
        {step === "backup" && !newMnemonic && (
          <div className="step-content" style={{textAlign:"center",padding:"32px 0"}}>
            <div style={{
              width:32,height:32,borderRadius:"50%",
              border:"3px solid var(--accent)",borderTopColor:"transparent",
              animation:"spin 0.8s linear infinite",margin:"0 auto 12px"
            }}/>
            <p style={{fontSize:13,color:"var(--text3)"}}>Generating your wallet...</p>
          </div>
        )}
        {step === "backup" && newMnemonic && (
          <div className="step-content">
            <div style={{textAlign:"center",marginBottom:4}}>
              <div style={{
                width:56,height:56,borderRadius:"50%",
                background:"rgba(245,158,11,0.12)",border:"2px solid var(--amber)",
                display:"flex",alignItems:"center",justifyContent:"center",
                fontSize:26,margin:"0 auto 10px"
              }}>📝</div>
              <h2 className="step-title" style={{fontSize:20,marginBottom:4}}>Back up your recovery phrase</h2>
              <p className="step-sub" style={{margin:0}}>
                These 12 words are the only way to recover your wallet. Write them on paper — in order.
              </p>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              {[
                ["✗","var(--red)",  "rgba(239,68,68,0.08)",  "rgba(239,68,68,0.25)",  "Never screenshot or save digitally"],
                ["✗","var(--red)",  "rgba(239,68,68,0.08)",  "rgba(239,68,68,0.25)",  "Never share with anyone — including Toklo support"],
                ["✓","var(--green)","rgba(16,185,129,0.08)", "rgba(16,185,129,0.25)", "Write on paper and store offline in a safe place"],
              ].map(([icon,color,bg,border,text]) => (
                <div key={text} style={{
                  display:"flex",alignItems:"center",gap:10,
                  padding:"9px 12px",background:bg,
                  border:`1px solid ${border}`,borderRadius:"var(--radius-sm)"
                }}>
                  <span style={{
                    width:20,height:20,borderRadius:"50%",flexShrink:0,
                    display:"flex",alignItems:"center",justifyContent:"center",
                    fontSize:11,fontWeight:700,background:color,color:"white"
                  }}>{icon}</span>
                  <span style={{fontSize:12,color:"var(--text2)",fontWeight:500}}>{text}</span>
                </div>
              ))}
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{fontSize:12,fontWeight:600,color:"var(--text2)"}}>Your 12-word recovery phrase</span>
                {seedRevealed && (
                  <button onClick={() => setSeedRevealed(false)} style={{
                    background:"none",border:"none",fontSize:11,color:"var(--text3)",
                    cursor:"pointer",fontFamily:"var(--font)",padding:"2px 6px"
                  }}>Hide 🙈</button>
                )}
              </div>
              <div style={{position:"relative",borderRadius:"var(--radius-sm)",overflow:"hidden"}}>
                {!seedRevealed && (
                  <div onClick={() => setSeedRevealed(true)} style={{
                    position:"absolute",inset:0,background:"rgba(10,12,20,0.88)",
                    backdropFilter:"blur(2px)",display:"flex",flexDirection:"column",
                    alignItems:"center",justifyContent:"center",
                    cursor:"pointer",zIndex:10,gap:10,borderRadius:"var(--radius-sm)"
                  }}>
                    <div style={{
                      width:52,height:52,borderRadius:"50%",
                      background:"rgba(99,102,241,0.2)",border:"2px solid rgba(99,102,241,0.4)",
                      display:"flex",alignItems:"center",justifyContent:"center",fontSize:24
                    }}>👁</div>
                    <div style={{textAlign:"center"}}>
                      <p style={{fontSize:14,fontWeight:700,color:"white",margin:"0 0 4px"}}>Tap to reveal</p>
                      <p style={{fontSize:11,color:"rgba(255,255,255,0.45)",margin:0,lineHeight:1.5}}>
                        Make sure no one around you can see your screen
                      </p>
                    </div>
                    <div style={{
                      display:"flex",alignItems:"center",gap:6,padding:"5px 14px",
                      background:"rgba(99,102,241,0.25)",border:"1px solid rgba(99,102,241,0.4)",
                      borderRadius:20
                    }}>
                      <span style={{fontSize:11,color:"rgba(255,255,255,0.7)"}}>🔒 Blurred for your privacy</span>
                    </div>
                  </div>
                )}
                <div style={{
                  display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6,padding:12,
                  background:"var(--bg3)",border:"1px solid var(--border)",borderRadius:"var(--radius-sm)",
                  filter:seedRevealed?"none":"blur(6px)",
                  userSelect:seedRevealed?"text":"none",transition:"filter 0.3s"
                }}>
                  {words.map((word,i) => (
                    <div key={i} style={{
                      display:"flex",alignItems:"center",gap:6,
                      padding:"8px 10px",background:"var(--bg2)",
                      border:"1px solid var(--border)",borderRadius:8
                    }}>
                      <span style={{fontSize:9,color:"var(--text3)",minWidth:14,fontWeight:700}}>{i+1}</span>
                      <span style={{fontSize:13,fontWeight:600,color:"var(--text)",fontFamily:"var(--font-mono)"}}>{word}</span>
                    </div>
                  ))}
                </div>
              </div>
              {seedRevealed && (
                <>
                  <button onClick={() => { navigator.clipboard.writeText(newMnemonic); setSeedCopied(true); setTimeout(()=>setSeedCopied(false),2500); }}
                    style={{
                      display:"flex",alignItems:"center",justifyContent:"center",gap:8,
                      padding:"9px 16px",width:"100%",fontFamily:"var(--font)",
                      background:seedCopied?"rgba(16,185,129,0.12)":"var(--bg3)",
                      border:`1px solid ${seedCopied?"rgba(16,185,129,0.4)":"var(--border)"}`,
                      borderRadius:"var(--radius-sm)",cursor:"pointer",
                      fontSize:13,fontWeight:600,
                      color:seedCopied?"var(--green)":"var(--text2)",transition:"all 0.2s"
                    }}>
                    {seedCopied ? <><span>✓</span><span>Copied to clipboard</span></> : <><span>⎘</span><span>Copy all 12 words</span></>}
                  </button>
                  <div style={{
                    display:"flex",alignItems:"flex-start",gap:8,padding:"9px 12px",
                    background:"rgba(99,102,241,0.06)",border:"1px solid rgba(99,102,241,0.15)",
                    borderRadius:"var(--radius-sm)"
                  }}>
                    <span style={{fontSize:13,flexShrink:0}}>💡</span>
                    <p style={{fontSize:11,color:"var(--text3)",margin:0,lineHeight:1.6}}>
                      Best practice: write on paper, place in an envelope, store in a fireproof safe.
                      Never save in a password manager, cloud drive, or email.
                    </p>
                  </div>
                </>
              )}
            </div>
            {seedRevealed && (
              <div style={{
                display:"flex",flexDirection:"column",gap:8,padding:"12px 14px",
                background:"var(--bg3)",border:"1px solid var(--border)",borderRadius:"var(--radius-sm)"
              }}>
                <p style={{fontSize:12,fontWeight:600,color:"var(--text2)",margin:0}}>Before continuing, confirm:</p>
                <label style={{display:"flex",alignItems:"flex-start",gap:10,cursor:"pointer"}}>
                  <input type="checkbox" checked={checkedWrite} onChange={e=>setCheckedWrite(e.target.checked)}
                    style={{marginTop:2,flexShrink:0,width:16,height:16,accentColor:"var(--accent)"}}/>
                  <span style={{fontSize:12,color:"var(--text2)",lineHeight:1.6}}>
                    I have written down all 12 words <strong>in the correct order</strong> on paper
                  </span>
                </label>
                <label style={{display:"flex",alignItems:"flex-start",gap:10,cursor:"pointer"}}>
                  <input type="checkbox" checked={checkedStore} onChange={e=>setCheckedStore(e.target.checked)}
                    style={{marginTop:2,flexShrink:0,width:16,height:16,accentColor:"var(--accent)"}}/>
                  <span style={{fontSize:12,color:"var(--text2)",lineHeight:1.6}}>
                    I understand that losing this phrase means <strong>permanent loss</strong> of access to my funds
                  </span>
                </label>
              </div>
            )}
            {!seedRevealed && (
              <div style={{
                display:"flex",alignItems:"center",gap:8,padding:"10px 14px",
                background:"rgba(245,158,11,0.08)",border:"1px solid rgba(245,158,11,0.2)",
                borderRadius:"var(--radius-sm)"
              }}>
                <span style={{fontSize:14}}>👆</span>
                <span style={{fontSize:12,color:"var(--amber)",fontWeight:500}}>
                  Tap the phrase above to reveal your 12 words
                </span>
              </div>
            )}
            <button className="btn-primary full-width"
              disabled={!seedRevealed||!checkedWrite||!checkedStore}
              style={{opacity:(seedRevealed&&checkedWrite&&checkedStore)?1:0.45,transition:"opacity 0.2s"}}
              onClick={() => go("verify")}>
              I've saved it safely — Continue →
            </button>
          </div>
        )}

        {/* ── VERIFY ── */}
        {step === "verify" && (
          <div className="step-content">
            <div style={{textAlign:"center",marginBottom:4}}>
              <div style={{
                width:56,height:56,borderRadius:"50%",
                background:"var(--accent-light)",border:"2px solid var(--accent)",
                display:"flex",alignItems:"center",justifyContent:"center",
                fontSize:26,margin:"0 auto 10px"
              }}>✅</div>
              <h2 className="step-title" style={{fontSize:20,marginBottom:4}}>Verify your backup</h2>
              <p className="step-sub" style={{margin:0}}>
                Enter the 3 words below to confirm you saved your phrase correctly.
              </p>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {verifyIdxs.map(idx => {
                const val = verifyWords[idx]||"";
                const correct = val.trim().toLowerCase() === words[idx]?.toLowerCase();
                const attempted = val.length > 0;
                return (
                  <div key={idx} style={{display:"flex",alignItems:"center",gap:10}}>
                    <div style={{
                      width:38,height:38,borderRadius:8,flexShrink:0,
                      background:"var(--accent-light)",color:"var(--accent)",
                      fontSize:12,fontWeight:700,
                      display:"flex",alignItems:"center",justifyContent:"center"
                    }}>#{idx+1}</div>
                    <input className="field" style={{
                      flex:1,margin:0,fontFamily:"var(--font-mono)",
                      borderColor: attempted
                        ? correct?"rgba(16,185,129,0.6)":"rgba(239,68,68,0.5)"
                        : undefined
                    }}
                      placeholder={`Word number ${idx+1}`}
                      value={val}
                      onChange={e => setVerifyWords(prev => ({...prev,[idx]:e.target.value}))}
                      autoCapitalize="none" autoCorrect="off" spellCheck={false}/>
                    {attempted && (
                      <span style={{fontSize:18,flexShrink:0,color:correct?"var(--green)":"var(--red)"}}>
                        {correct?"✓":"✗"}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            {error && <p className="error-msg">{error}</p>}
            <button className="btn-primary full-width" onClick={handleVerify}
              disabled={verifyIdxs.some(idx => !verifyWords[idx]?.trim())}>
              Verify & enter wallet →
            </button>
            <button className="btn-link" onClick={() => { setVerifyWords({}); go("backup"); }}>
              ← Back to seed phrase
            </button>
          </div>
        )}

        {/* ── IMPORT ── */}
        {step === "import" && (() => {
          const raw       = importInput.trim();
          const wordArr   = raw.length>0 ? raw.split(/\s+/) : [];
          const wordCount = wordArr.length;
          const isValid12 = wordCount===12;
          const isValid24 = wordCount===24;
          const isValid   = isValid12||isValid24;
          const isOver    = wordCount>24;
          const pctFill12 = Math.min(wordCount/12*100,100);
          const pctFill24 = Math.min(wordCount/24*100,100);
          const barColor  = isValid?"var(--green)":isOver?"var(--red)":wordCount>=8?"var(--amber)":"var(--accent)";
          const canSubmit = isValid&&password.length>=8&&password===confirmPwd&&!loading;
          return (
            <div className="step-content">
              <div style={{textAlign:"center",marginBottom:4}}>
                <div style={{
                  width:56,height:56,borderRadius:"50%",
                  background:"rgba(99,102,241,0.12)",border:"2px solid var(--accent)",
                  display:"flex",alignItems:"center",justifyContent:"center",
                  fontSize:26,margin:"0 auto 10px"
                }}>📥</div>
                <h2 className="step-title" style={{fontSize:20,marginBottom:4}}>Import your wallet</h2>
                <p className="step-sub" style={{margin:0}}>
                  Enter your 12 or 24-word recovery phrase to restore access.
                </p>
              </div>
              <div style={{display:"flex",gap:8}}>
                {[12,24].map(n => (
                  <div key={n} style={{
                    flex:1,padding:"8px 12px",borderRadius:"var(--radius-sm)",
                    border:`1px solid ${wordCount===n?"var(--accent)":"var(--border)"}`,
                    background:wordCount===n?"var(--accent-light)":"var(--bg3)",
                    textAlign:"center",transition:"all 0.2s"
                  }}>
                    <p style={{fontSize:13,fontWeight:700,margin:0,color:wordCount===n?"var(--accent)":"var(--text3)"}}>{n} words</p>
                    <p style={{fontSize:10,margin:"2px 0 0",color:wordCount===n?"var(--accent)":"var(--text3)"}}>{n===12?"Standard":"Extended"}</p>
                  </div>
                ))}
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                <label style={{fontSize:12,fontWeight:600,color:"var(--text2)"}}>Recovery phrase</label>
                <textarea className="field textarea"
                  placeholder="Enter words separated by spaces: word1 word2 word3..."
                  value={importInput}
                  onChange={e => setImportInput(e.target.value.toLowerCase())}
                  rows={4} autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false}
                  style={{
                    fontFamily:"var(--font-mono)",fontSize:13,lineHeight:1.8,resize:"none",
                    borderColor:raw.length>0?isValid?"rgba(16,185,129,0.6)":isOver?"rgba(239,68,68,0.5)":"var(--border)":undefined
                  }}/>
                {raw.length>0 && (
                  <div style={{display:"flex",flexDirection:"column",gap:4}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <span style={{fontSize:11,color:"var(--text3)"}}>{wordCount} {wordCount===1?"word":"words"} entered</span>
                      <span style={{fontSize:11,fontWeight:700,color:isValid?"var(--green)":isOver?"var(--red)":"var(--text3)"}}>
                        {isValid12?"✓ Valid 12-word phrase":isValid24?"✓ Valid 24-word phrase":isOver?"✗ Too many words":
                          wordCount<12?`${12-wordCount} more for 12-word`:`${24-wordCount} more for 24-word`}
                      </span>
                    </div>
                    {[{n:12,pct:pctFill12,valid:isValid12},{n:24,pct:pctFill24,valid:isValid24}].map(({n,pct,valid}) => (
                      <div key={n} style={{display:"flex",alignItems:"center",gap:8}}>
                        <span style={{fontSize:10,color:"var(--text3)",width:14,textAlign:"right"}}>{n}</span>
                        <div style={{flex:1,height:5,background:"var(--bg4)",borderRadius:3,overflow:"hidden"}}>
                          <div style={{width:pct+"%",height:"100%",background:valid?"var(--green)":barColor,borderRadius:3,transition:"width 0.2s"}}/>
                        </div>
                        {valid && <span style={{fontSize:11,color:"var(--green)"}}>✓</span>}
                      </div>
                    ))}
                  </div>
                )}
                {isValid && (
                  <div style={{
                    display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:4,padding:10,
                    background:"var(--bg3)",border:"1px solid rgba(16,185,129,0.2)",borderRadius:"var(--radius-sm)"
                  }}>
                    {wordArr.map((word,i) => (
                      <div key={i} style={{
                        display:"flex",alignItems:"center",gap:5,
                        padding:"4px 6px",background:"var(--bg2)",
                        border:"1px solid var(--border)",borderRadius:6
                      }}>
                        <span style={{fontSize:9,color:"var(--text3)",minWidth:14,fontWeight:700}}>{i+1}</span>
                        <span style={{fontSize:11,fontFamily:"var(--font-mono)",color:"var(--text)"}}>{word}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div style={{display:"flex",alignItems:"center",gap:10,padding:"4px 0"}}>
                <div style={{flex:1,height:1,background:"var(--border)"}}/>
                <span style={{fontSize:11,color:"var(--text3)",whiteSpace:"nowrap"}}>Set a password for this device</span>
                <div style={{flex:1,height:1,background:"var(--border)"}}/>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                <div className="pwd-input-wrap">
                  <input type={showPwd?"text":"password"} placeholder="New password (min 8 characters)"
                    value={password} onChange={e => setPassword(e.target.value)}
                    className="field" style={{paddingRight:52}}/>
                  <button className="pwd-toggle" onClick={() => setShowPwd(v=>!v)}>{showPwd?"hide":"show"}</button>
                </div>
                <div style={{position:"relative"}}>
                  <input type={showPwd?"text":"password"} placeholder="Confirm password"
                    value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)}
                    className="field"
                    style={{paddingRight:36,borderColor:confirmPwd?password===confirmPwd?"rgba(16,185,129,0.6)":"rgba(239,68,68,0.5)":undefined}}
                    onKeyDown={e => e.key==="Enter"&&canSubmit&&handleImport()}/>
                  {confirmPwd && (
                    <span style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",fontSize:16,color:password===confirmPwd?"var(--green)":"var(--red)"}}>
                      {password===confirmPwd?"✓":"✗"}
                    </span>
                  )}
                </div>
                {confirmPwd&&password!==confirmPwd && <p style={{fontSize:12,color:"var(--red)",margin:0}}>Passwords do not match</p>}
              </div>
              <div style={{
                display:"flex",alignItems:"flex-start",gap:8,padding:"10px 12px",
                background:"rgba(239,68,68,0.06)",border:"1px solid rgba(239,68,68,0.2)",borderRadius:"var(--radius-sm)"
              }}>
                <span style={{fontSize:14,flexShrink:0}}>⚠️</span>
                <p style={{fontSize:11,color:"var(--text3)",margin:0,lineHeight:1.6}}>
                  Only enter your seed phrase on a trusted, private device. Never import on a shared or public computer.
                </p>
              </div>
              {error && <p className="error-msg">{error}</p>}
              <button className="btn-primary full-width" onClick={handleImport}
                disabled={!canSubmit} style={{opacity:canSubmit?1:0.45,transition:"opacity 0.2s"}}>
                {loading
                  ? <span style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
                      <span style={{width:16,height:16,border:"2px solid rgba(255,255,255,0.4)",borderTopColor:"white",borderRadius:"50%",display:"inline-block",animation:"spin 0.8s linear infinite"}}/>
                      Importing wallet...
                    </span>
                  : "Import wallet →"}
              </button>
              <button className="btn-link" onClick={() => go("security")}>← Back</button>
            </div>
          );
        })()}

        {/* ── COMPLETE ── */}
        {step === "complete" && (
          <div className="step-content" style={{textAlign:"center",padding:"8px 0"}}>
            <div style={{
              width:72,height:72,borderRadius:"50%",
              background:"var(--green-light)",border:"2px solid var(--green)",
              display:"flex",alignItems:"center",justifyContent:"center",
              fontSize:32,margin:"0 auto 16px"
            }}>✓</div>
            <h2 className="step-title" style={{fontSize:22}}>
              {flow==="import"?"Wallet imported!":"Wallet created!"}
            </h2>
            <p className="step-sub" style={{marginBottom:20}}>
              {flow==="import"
                ? "Your wallet is ready. You now have full access to your funds on Toklo."
                : "Your wallet is secured and your seed phrase is backed up. Welcome to Toklo."}
            </p>
            <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:20,textAlign:"left"}}>
              {[
                flow==="import"?"✓ Wallet successfully restored":"✓ Wallet created and encrypted",
                flow==="import"?"✓ Password set for this device":"✓ Seed phrase backed up",
                "✓ Connected to Ethereum mainnet",
                "✓ Live prices loading for 20+ coins",
              ].map(item => (
                <div key={item} style={{
                  display:"flex",alignItems:"center",gap:10,padding:"8px 12px",
                  background:"var(--bg3)",border:"1px solid rgba(16,185,129,0.2)",
                  borderRadius:"var(--radius-sm)"
                }}>
                  <span style={{color:"var(--green)",fontWeight:700,fontSize:13}}>{item}</span>
                </div>
              ))}
            </div>
            <div style={{
              padding:"12px 16px",background:"var(--accent-light)",
              border:"1px solid rgba(99,102,241,0.2)",borderRadius:"var(--radius-sm)",
              marginBottom:20,textAlign:"left"
            }}>
              <p style={{fontSize:13,fontWeight:700,color:"var(--accent)",margin:"0 0 4px"}}>◈ Welcome gift</p>
              <p style={{fontSize:12,color:"var(--text2)",margin:0,lineHeight:1.5}}>
                Share your referral link from Settings and earn 50 DWT for every friend who creates a wallet.
              </p>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:8,justifyContent:"center",fontSize:12,color:"var(--text3)"}}>
              <div style={{
                width:20,height:20,borderRadius:"50%",
                border:"2px solid var(--accent)",borderTopColor:"transparent",
                animation:"spin 0.8s linear infinite"
              }}/>
              Entering your wallet...
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
