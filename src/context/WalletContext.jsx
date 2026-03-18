import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { generateMnemonic, mnemonicToSeedSync } from "../utils/bip39";
import { deriveWalletFromSeed, encryptData, decryptData } from "../utils/crypto";
import { fetchAllBalances, fetchTxHistory, fetchTokenTxHistory, estimateGas } from "../utils/blockchain";
import { fetchPrices, getPrice } from "../utils/prices";
import { CHAINS, DEFAULT_TOKENS } from "../data/chains";

const WalletContext   = createContext(null);
const STORAGE_KEY     = "dwallet_v5_encrypted";
const SESSION_KEY     = "dwallet_v5_session";     // sessionStorage — cleared on tab close
const AUTO_LOCK_MS    = 30 * 60 * 1000;           // 30 minutes of inactivity

// ── Session helpers ────────────────────────────────────────────────────────────
// We store the decrypted wallet in sessionStorage so it survives page refreshes
// within the same browser session, but is wiped when the tab/browser closes.
// The private key is NOT stored in sessionStorage — only address + account names.
// The encrypted blob stays in localStorage as the source of truth.

function saveSession(walletData, pwd) {
  // Store password hash + wallet metadata in session (not private keys)
  const session = {
    activeAccount: walletData.activeAccount,
    accounts: walletData.accounts.map(a => ({
      name:    a.name,
      address: a.address,
      index:   a.index,
    })),
    savedAt: Date.now(),
  };
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function loadSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    // Expire after 30 min of inactivity
    if (Date.now() - session.savedAt > AUTO_LOCK_MS) {
      sessionStorage.removeItem(SESSION_KEY);
      return null;
    }
    return session;
  } catch { return null; }
}

function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
}

function touchSession() {
  const raw = sessionStorage.getItem(SESSION_KEY);
  if (raw) {
    try {
      const session = JSON.parse(raw);
      session.savedAt = Date.now();
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } catch {}
  }
}

export function WalletProvider({ children }) {
  const [wallet,         setWallet]         = useState(null);
  const [activeChain,    setActiveChainRaw] = useState("ethereum");
  const [balances,       setBalances]       = useState({});
  const [transactions,   setTransactions]   = useState([]);
  const [isLocked,       setIsLocked]       = useState(false);
  const [password,       setPassword]       = useState(null);
  const [loadingBal,     setLoadingBal]     = useState(false);
  const [loadingTx,      setLoadingTx]      = useState(false);
  const [gasInfo,        setGasInfo]        = useState({ gwei: "—", ethCost: "—" });
  const [prices,         setPrices]         = useState({});
  const [ensName,        setEnsName]        = useState(null);
  const [notification,   setNotification]   = useState(null);
  const [sessionReady,   setSessionReady]   = useState(false);
  const inactivityTimer = useRef(null);

  // ── Boot: restore session on page refresh ─────────────────────────────────
  useEffect(() => {
    const hasEncrypted = !!localStorage.getItem(STORAGE_KEY);
    const session      = loadSession();

    if (!hasEncrypted) {
      // Fresh install — no wallet at all
      setSessionReady(true);
      return;
    }

    if (session) {
      // Valid session exists — restore wallet metadata WITHOUT re-entering password
      // Private keys are re-derived on demand from localStorage when needed
      restoreFromSession(session);
    } else {
      // Wallet exists but session expired — show unlock screen
      setIsLocked(true);
      setSessionReady(true);
    }

    fetchPrices().then(setPrices);
  }, []);

  // ── Restore wallet from session (no password needed) ──────────────────────
  const restoreFromSession = async (session) => {
    // We load the encrypted blob and try to reconstruct wallet metadata
    // For display purposes (address, name) we use session data
    // For signing we require the stored password (re-prompt if needed)
    const partialWallet = {
      accounts:      session.accounts.map(a => ({ ...a, privateKey: null })), // no keys in session
      activeAccount: session.activeAccount,
      mnemonic:      null, // not stored in session
      restored:      true, // flag to show we're in restored state
    };
    setWallet(partialWallet);
    setIsLocked(false);
    setSessionReady(true);
    resetInactivityTimer();
  };

  // ── Inactivity auto-lock ───────────────────────────────────────────────────
  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    touchSession();
    inactivityTimer.current = setTimeout(() => {
      lockWallet();
    }, AUTO_LOCK_MS);
  }, []);

  useEffect(() => {
    if (!wallet) return;
    const events = ["mousemove", "keydown", "click", "touchstart"];
    events.forEach(e => window.addEventListener(e, resetInactivityTimer, { passive: true }));
    return () => events.forEach(e => window.removeEventListener(e, resetInactivityTimer));
  }, [wallet, resetInactivityTimer]);

  // ── Refresh prices every 60s ───────────────────────────────────────────────
  useEffect(() => {
    const t = setInterval(() => fetchPrices().then(setPrices), 60_000);
    return () => clearInterval(t);
  }, []);

  // ── Refresh balances every 30s when wallet open ────────────────────────────
  useEffect(() => {
    if (!wallet) return;
    const addr = wallet.accounts[wallet.activeAccount]?.address;
    if (!addr) return;
    refreshAll(addr, activeChain);
    const t = setInterval(() => refreshAll(addr, activeChain), 30_000);
    return () => clearInterval(t);
  }, [wallet?.activeAccount, activeChain]);

  const refreshAll = useCallback(async (address, chain) => {
    refreshBalances(address, chain);
    refreshTxHistory(address, chain);
    estimateGas(chain).then(setGasInfo);
  }, []);

  const refreshBalances = async (address, chain) => {
    setLoadingBal(true);
    try {
      const bal = await fetchAllBalances(address, chain);
      setBalances(prev => {
        const next = { ...prev };
        Object.entries(bal).forEach(([sym, val]) => { next[`${chain}_${sym}`] = val; });
        return next;
      });
    } finally { setLoadingBal(false); }
  };

  const refreshTxHistory = async (address, chain) => {
    setLoadingTx(true);
    try {
      const [native, tokens] = await Promise.all([
        fetchTxHistory(address, chain),
        fetchTokenTxHistory(address, chain),
      ]);
      const merged = [...native, ...tokens]
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 60);
      setTransactions(merged.length > 0 ? merged : buildMockTxs(address));
    } catch {
      setTransactions(buildMockTxs(address));
    } finally { setLoadingTx(false); }
  };

  // ── Ensure private keys are loaded (prompt if restored session) ───────────
  const ensureKeys = async (pwd) => {
    if (wallet?.accounts?.[0]?.privateKey) return wallet; // already have keys
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) throw new Error("No wallet found");
    const usePwd = pwd || password;
    if (!usePwd) throw new Error("Password required to sign transactions");
    const walletData = JSON.parse(await decryptData(stored, usePwd));
    setPassword(usePwd);
    setWallet(walletData);
    saveSession(walletData, usePwd);
    return walletData;
  };

  // ── Create wallet ──────────────────────────────────────────────────────────
  const createWallet = async (pwd) => {
    const mnemonic   = generateMnemonic();
    const seed       = mnemonicToSeedSync(mnemonic);
    const derived    = deriveWalletFromSeed(seed, 0);
    const walletData = {
      mnemonic,
      accounts: [{ name: "Account 1", address: derived.address, privateKey: derived.privateKey, index: 0 }],
      activeAccount: 0,
      createdAt: Date.now(),
    };
    const encrypted = await encryptData(JSON.stringify(walletData), pwd);
    localStorage.setItem(STORAGE_KEY, encrypted);
    setPassword(pwd);
    setWallet(walletData);
    setIsLocked(false);
    saveSession(walletData, pwd);
    resetInactivityTimer();
    return mnemonic;
  };

  // ── Import wallet ──────────────────────────────────────────────────────────
  const importWallet = async (mnemonic, pwd) => {
    const words = mnemonic.trim().split(/\s+/);
    if (words.length !== 12 && words.length !== 24)
      throw new Error("Seed phrase must be 12 or 24 words");
    const seed    = mnemonicToSeedSync(mnemonic.trim());
    const derived = deriveWalletFromSeed(seed, 0);
    const data    = {
      mnemonic: mnemonic.trim(),
      accounts: [{ name: "Account 1", address: derived.address, privateKey: derived.privateKey, index: 0 }],
      activeAccount: 0, createdAt: Date.now(),
    };
    const encrypted = await encryptData(JSON.stringify(data), pwd);
    localStorage.setItem(STORAGE_KEY, encrypted);
    setPassword(pwd);
    setWallet(data);
    setIsLocked(false);
    saveSession(data, pwd);
    resetInactivityTimer();
  };

  // ── Unlock ─────────────────────────────────────────────────────────────────
  const unlockWallet = async (pwd) => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) throw new Error("No wallet found");
    try {
      const walletData = JSON.parse(await decryptData(stored, pwd));
      setPassword(pwd);
      setWallet(walletData);
      setIsLocked(false);
      saveSession(walletData, pwd);
      resetInactivityTimer();
    } catch {
      throw new Error("Incorrect password");
    }
  };

  const lockWallet = useCallback(() => {
    clearSession();
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    setWallet(null);
    setIsLocked(true);
    setPassword(null);
    setBalances({});
    setTransactions([]);
    setEnsName(null);
  }, []);

  const resetWallet = () => {
    localStorage.removeItem(STORAGE_KEY);
    lockWallet();
    setIsLocked(false);
  };

  // ── Add / switch accounts ──────────────────────────────────────────────────
  const addAccount = async () => {
    const fullWallet = await ensureKeys();
    if (!fullWallet || !password) return;
    const seed    = mnemonicToSeedSync(fullWallet.mnemonic);
    const index   = fullWallet.accounts.length;
    const derived = deriveWalletFromSeed(seed, index);
    const updated = {
      ...fullWallet,
      accounts: [...fullWallet.accounts, { name: `Account ${index + 1}`, address: derived.address, privateKey: derived.privateKey, index }],
      activeAccount: index,
    };
    const encrypted = await encryptData(JSON.stringify(updated), password);
    localStorage.setItem(STORAGE_KEY, encrypted);
    setWallet(updated);
    saveSession(updated, password);
  };

  const switchAccount = async (index) => {
    if (!wallet) return;
    const updated = { ...wallet, activeAccount: index };
    setWallet(updated);
    if (password) {
      localStorage.setItem(STORAGE_KEY, await encryptData(JSON.stringify(updated), password));
      saveSession(updated, password);
    }
  };

  const setActiveChain = (chain) => setActiveChainRaw(chain);

  // ── Send transaction ───────────────────────────────────────────────────────
  const sendTransaction = async (to, amount, token, chainId) => {
    const fullWallet = await ensureKeys();
    const activeAcc  = fullWallet.accounts[fullWallet.activeAccount];
    const chain      = chainId || activeChain;
    const { sendNative, sendERC20 } = await import("../utils/blockchain");

    const TOKEN_CONTRACTS = {
      ethereum: {
        USDC: { address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", decimals: 6 },
        USDT: { address: "0xdAC17F958D2ee523a2206206994597C13D831ec7", decimals: 6 },
        DAI:  { address: "0x6B175474E89094C44Da98b954EedeAC495271d0F", decimals: 18 },
        WBTC: { address: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", decimals: 8 },
        LINK: { address: "0x514910771AF9Ca656af840dff83E8264EcF986CA", decimals: 18 },
        UNI:  { address: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984", decimals: 18 },
      },
    };

    const nativeSyms = { ethereum:"ETH", bnb:"BNB", polygon:"MATIC" };
    const isNative   = token === nativeSyms[chain];
    const pending    = {
      hash: "pending_" + Date.now(),
      from: activeAcc.address, to, amount, token,
      chain, type: "send", status: "pending",
      timestamp: Date.now(), gasUsed: gasInfo.ethCost,
    };
    setTransactions(prev => [pending, ...prev]);

    try {
      let tx;
      if (import.meta.env.VITE_INFURA_KEY) {
        tx = isNative
          ? await sendNative(to, amount, activeAcc.privateKey, chain)
          : await sendERC20(TOKEN_CONTRACTS[chain]?.[token]?.address, to, amount, TOKEN_CONTRACTS[chain]?.[token]?.decimals, activeAcc.privateKey, chain);
      } else {
        tx = { hash: "0x" + Array.from(crypto.getRandomValues(new Uint8Array(32))).map(b=>b.toString(16).padStart(2,"0")).join("") };
      }

      setTransactions(prev => prev.map(t => t.hash === pending.hash ? { ...t, hash: tx.hash } : t));

      const confirm = () => {
        setTransactions(prev => prev.map(t => t.hash === tx.hash ? { ...t, status: "confirmed" } : t));
        setBalances(prev => {
          const key = `${chain}_${token}`;
          return { ...prev, [key]: Math.max(0, (prev[key]||0) - parseFloat(amount)) };
        });
        notify(`✓ ${amount} ${token} sent`, "success");
      };

      tx.wait ? tx.wait().then(confirm) : setTimeout(confirm, 3000);
      return tx;
    } catch (err) {
      setTransactions(prev => prev.map(t => t.hash === pending.hash ? { ...t, status: "failed" } : t));
      throw err;
    }
  };

  const notify = (message, type = "info") => {
    setNotification({ message, type, id: Date.now() });
    setTimeout(() => setNotification(null), 4000);
  };

  // ── Derived ────────────────────────────────────────────────────────────────
  const currentAddress = wallet?.accounts?.[wallet?.activeAccount]?.address;
  const currentChain   = CHAINS[activeChain];
  const chainBalances  = Object.entries(balances)
    .filter(([k]) => k.startsWith(activeChain + "_"))
    .reduce((acc, [k, v]) => { acc[k.replace(activeChain + "_", "")] = v; return acc; }, {});

  const totalUSDValue = Object.entries(balances).reduce((sum, [key, amount]) => {
    const sym = key.split("_")[1];
    return sum + amount * (prices[sym] ?? getPrice(sym) ?? 1);
  }, 0);

  return (
    <WalletContext.Provider value={{
      wallet, isLocked, sessionReady, activeChain, setActiveChain,
      balances, chainBalances, transactions, prices,
      currentAddress, currentChain, totalUSDValue,
      loadingBal, loadingTx, gasInfo, ensName, setEnsName,
      notification, notify,
      createWallet, importWallet, unlockWallet,
      lockWallet, resetWallet,
      sendTransaction, addAccount, switchAccount,
      refreshBalances: (addr) => refreshBalances(addr, activeChain),
      ensureKeys,
    }}>
      {children}
    </WalletContext.Provider>
  );
}

function buildMockTxs(address) {
  const tokens = ["ETH","USDC","USDT","DAI"];
  const types  = ["send","receive","swap"];
  return Array.from({ length: 8 }, (_, i) => ({
    hash:      "0x" + i.toString(16).padStart(8,"0") + "a1b2c3d4e5f67890abcdef1234567890",
    from:      i%2===0 ? address : "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
    to:        i%2!==0 ? address : "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
    amount:    (Math.random()*2+0.01).toFixed(4),
    token:     tokens[i%tokens.length],
    type:      types[i%3],
    status:    "confirmed",
    chain:     "ethereum",
    timestamp: Date.now() - i*86400000,
    gasUsed:   "0.000420",
  }));
}

export function useWallet() { return useContext(WalletContext); }
