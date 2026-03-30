import {
  createContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react'
import { generateMnemonic, mnemonicToSeedSync } from '../utils/bip39'
import {
  deriveWalletFromSeed,
  encryptData,
  decryptData,
} from '../utils/crypto'
import {
  fetchAllBalances,
  fetchTxHistory,
  fetchTokenTxHistory,
  estimateGas,
} from '../utils/blockchain'
import { fetchPrices, getPrice } from '../utils/prices'
import { CHAINS } from '../data/chains'

// eslint-disable-next-line react-refresh/only-export-components
export const WalletContext = createContext(null)
const STORAGE_KEY = 'dwallet_v5_encrypted'
const SESSION_KEY = 'dwallet_v5_session'
const AUTO_LOCK_MS = 30 * 60 * 1000

const TOKEN_CONTRACTS = {
  ethereum: {
    USDC: { address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6 },
    USDT: { address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals: 6 },
    DAI: { address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', decimals: 18 },
    WBTC: { address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', decimals: 8 },
    LINK: { address: '0x514910771AF9Ca656af840dff83E8264EcF986CA', decimals: 18 },
    UNI: { address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', decimals: 18 },
  },
  // ── Sepolia testnet ───────────────────────────────────────────────────
  sepolia: {
    DWT: { address: '0xdF8efd9F36f55baD4c7f38a7c958202858927743', decimals: 18 },
  },
  // ── Base Sepolia testnet ──────────────────────────────────────────────
  baseSepolia: {
    DWT: { address: '0xdF8efd9F36f55baD4c7f38a7c958202858927743', decimals: 18 },
  },
  // ── Base mainnet ──────────────────────────────────────────────────────
  base: {
    DWT:  { address: '0x9ce235f8574bde67393884550F02135CE4fB8387', decimals: 18 },
    USDC: { address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', decimals: 6 },
  },
  polygon: {
    USDC: { address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', decimals: 6 },
    USDT: { address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', decimals: 6 },
  },
  bnb: {
    CAKE: { address: '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82', decimals: 18 },
    USDT: { address: '0x55d398326f99059fF775485246999027B3197955', decimals: 18 },
  },
}

function saveSession(walletData) {
  const session = {
    activeAccount: walletData.activeAccount,
    accounts: walletData.accounts.map(a => ({
      name: a.name,
      address: a.address,
      index: a.index,
    })),
    savedAt: Date.now(),
  }
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

function loadSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const session = JSON.parse(raw)
    if (Date.now() - session.savedAt > AUTO_LOCK_MS) {
      sessionStorage.removeItem(SESSION_KEY)
      return null
    }
    return session
  } catch {
    return null
  }
}

function clearSession() {
  sessionStorage.removeItem(SESSION_KEY)
}

function touchSession() {
  const raw = sessionStorage.getItem(SESSION_KEY)
  if (raw) {
    try {
      const session = JSON.parse(raw)
      session.savedAt = Date.now()
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
    } catch (e) {
      // Session refresh failed, likely non-critical
    }
  }
}

export function WalletProvider({ children }) {
  const [wallet, setWallet] = useState(null)
  const [activeChain, setActiveChainRaw] = useState('ethereum')
  const [balances, setBalances] = useState({})
  const [transactions, setTransactions] = useState([])
  const [isLocked, setIsLocked] = useState(false)
  const [password, setPassword] = useState(null)
  const [loadingBal, setLoadingBal] = useState(false)
  const [loadingTx, setLoadingTx] = useState(false)
  const [gasInfo, setGasInfo] = useState({ gwei: '—', ethCost: '—' })
  const [prices, setPrices] = useState({})
  const [ensName, setEnsName] = useState(null)
  const [, setNotification] = useState(null)
  const [sessionReady, setSessionReady] = useState(false)
  const inactivityTimer = useRef(null)

  const lockWallet = useCallback(() => {
    clearSession()
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current)
    setWallet(null)
    setIsLocked(true)
    setPassword(null)
    setBalances({})
    setTransactions([])
    setEnsName(null)
  }, [])

  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current)
    touchSession()
    inactivityTimer.current = setTimeout(() => {
      lockWallet()
    }, AUTO_LOCK_MS)
  }, [lockWallet])

  const restoreFromSession = useCallback(
    async session => {
      const partialWallet = {
        accounts: session.accounts.map(a => ({ ...a, privateKey: null })),
        activeAccount: session.activeAccount,
        mnemonic: null,
        restored: true,
      }
      setWallet(partialWallet)
      setIsLocked(false)
      setSessionReady(true)
      resetInactivityTimer()
    },
    [resetInactivityTimer],
  )

  useEffect(() => {
    const hasEncrypted = !!localStorage.getItem(STORAGE_KEY)
    const session = loadSession()

    if (!hasEncrypted) {
      setSessionReady(true)
      return
    }

    if (session) {
      restoreFromSession(session)
    } else {
      setIsLocked(true)
      setSessionReady(true)
    }

    fetchPrices().then(setPrices)
  }, [restoreFromSession])

  useEffect(() => {
    if (!wallet) return
    const events = ['mousemove', 'keydown', 'click', 'touchstart']
    const handler = () => resetInactivityTimer()
    events.forEach(e =>
      window.addEventListener(e, handler, { passive: true }),
    )
    return () =>
      events.forEach(e => window.removeEventListener(e, handler))
  }, [wallet, resetInactivityTimer])

  useEffect(() => {
    const t = setInterval(() => fetchPrices().then(setPrices), 60_000)
    return () => clearInterval(t)
  }, [])

  const refreshBalances = useCallback(async (address, chain) => {
    setLoadingBal(true)
    try {
      const bal = await fetchAllBalances(address, chain)
      setBalances(prev => {
        const next = { ...prev }
        Object.entries(bal).forEach(([sym, val]) => {
          next[`${chain}_${sym}`] = val
        })
        return next
      })
    } finally {
      setLoadingBal(false)
    }
  }, [])

  const buildMockTxs = useCallback(address => {
    const tokens = ['ETH', 'USDC', 'USDT', 'DAI']
    const types = ['send', 'receive', 'swap']
    return Array.from({ length: 8 }, (_, i) => ({
      // eslint-disable-next-line no-secrets/no-secrets
      hash: `0x${i.toString(16).padStart(8, '0')}a1b2c3d4e5f67890abcdef1234567890`,
      // eslint-disable-next-line no-secrets/no-secrets
      from: i % 2 === 0 ? address : '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
      // eslint-disable-next-line no-secrets/no-secrets
      to: i % 2 !== 0 ? address : '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
      amount: (1.2345 + i / 10).toFixed(4),
      token: tokens[i % tokens.length],
      type: types[i % 3],
      status: 'confirmed',
      chain: 'ethereum',
      timestamp: Date.now() - i * 86400000,
      gasUsed: '0.000420',
    }))
  }, [])

  const refreshTxHistory = useCallback(
    async (address, chain) => {
      setLoadingTx(true)
      try {
        const [native, tokens] = await Promise.all([
          fetchTxHistory(address, chain),
          fetchTokenTxHistory(address, chain),
        ])
        const merged = [...native, ...tokens]
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, 60)
        setTransactions(merged.length > 0 ? merged : buildMockTxs(address))
      } catch {
        setTransactions(buildMockTxs(address))
      } finally {
        setLoadingTx(false)
      }
    },
    [buildMockTxs],
  )

  const refreshAll = useCallback(
    async (address, chain) => {
      refreshBalances(address, chain)
      refreshTxHistory(address, chain)
      estimateGas(chain).then(setGasInfo)
    },
    [refreshBalances, refreshTxHistory],
  )

  useEffect(() => {
    if (!wallet) return
    const addr = wallet.accounts[wallet.activeAccount]?.address
    if (!addr) return
    refreshAll(addr, activeChain)
    const t = setInterval(() => refreshAll(addr, activeChain), 30_000)
    return () => clearInterval(t)
  }, [wallet, activeChain, refreshAll])

  const notify = useCallback((message, type = 'info') => {
    setNotification({ message, type, id: Date.now() })
    setTimeout(() => setNotification(null), 4000)
  }, [])

  const ensureKeys = async pwd => {
    if (wallet?.accounts?.[0]?.privateKey) return wallet
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) throw new Error('No wallet found')
    const usePwd = pwd || password
    if (!usePwd) throw new Error('Password required to sign transactions')
    const walletData = JSON.parse(await decryptData(stored, usePwd))
    setPassword(usePwd)
    setWallet(walletData)
    saveSession(walletData)
    return walletData
  }

  const createWallet = async () => {
    const mnemonic = generateMnemonic()
    const seed = mnemonicToSeedSync(mnemonic)
    const derived = deriveWalletFromSeed(seed, 0)
    const pending = {
      mnemonic,
      accounts: [
        {
          name: 'Account 1',
          address: derived.address,
          privateKey: derived.privateKey,
          index: 0,
        },
      ],
      activeAccount: 0,
      createdAt: Date.now(),
    }
    return { mnemonic, pending }
  }

  const confirmWallet = async (walletData, pwd) => {
    if (!walletData || !pwd) throw new Error('Wallet data and password required')
    const encrypted = await encryptData(JSON.stringify(walletData), pwd)
    localStorage.setItem(STORAGE_KEY, encrypted)
    setPassword(pwd)
    setWallet(walletData)
    setIsLocked(false)
    saveSession(walletData)
    resetInactivityTimer()
  }

  const importWallet = async (mnemonic, pwd) => {
    const words = mnemonic.trim().split(/\s+/)
    if (words.length !== 12 && words.length !== 24)
      throw new Error('Seed phrase must be 12 or 24 words')
    const seed = mnemonicToSeedSync(mnemonic.trim())
    const derived = deriveWalletFromSeed(seed, 0)
    const data = {
      mnemonic: mnemonic.trim(),
      accounts: [
        {
          name: 'Account 1',
          address: derived.address,
          privateKey: derived.privateKey,
          index: 0,
        },
      ],
      activeAccount: 0,
      createdAt: Date.now(),
    }
    setPassword(pwd)
    setWallet(data)
    setIsLocked(false)
    saveSession(data)
    resetInactivityTimer()
  }

  const verifyPassword = async pwd => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return null
    try {
      const data = JSON.parse(await decryptData(stored, pwd))
      return data.mnemonic || null
    } catch {
      return null
    }
  }

  const unlockWallet = async pwd => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) throw new Error('No wallet found')
    try {
      const walletData = JSON.parse(await decryptData(stored, pwd))
      setPassword(pwd)
      setWallet(walletData)
      setIsLocked(false)
      saveSession(walletData)
      resetInactivityTimer()
    } catch {
      throw new Error('Incorrect password')
    }
  }

  const resetWallet = () => {
    localStorage.removeItem(STORAGE_KEY)
    lockWallet()
    setIsLocked(false)
  }

  const addAccount = async () => {
    const fullWallet = await ensureKeys()
    if (!fullWallet || !password) return
    const seed = mnemonicToSeedSync(fullWallet.mnemonic)
    const index = fullWallet.accounts.length
    const derived = deriveWalletFromSeed(seed, index)
    const updated = {
      ...fullWallet,
      accounts: [
        ...fullWallet.accounts,
        {
          name: `Account ${index + 1}`,
          address: derived.address,
          privateKey: derived.privateKey,
          index,
        },
      ],
      activeAccount: index,
    }
    const encrypted = await encryptData(JSON.stringify(updated), password)
    localStorage.setItem(STORAGE_KEY, encrypted)
    setWallet(updated)
    saveSession(updated)
    notify(`✓ Account ${index + 1} added`, 'success')
  }

  const renameAccount = async (index, newName) => {
    if (!wallet || !newName.trim() || !password) return
    const updatedAccounts = wallet.accounts.map((acc, i) =>
      i === index ? { ...acc, name: newName.trim() } : acc,
    )
    const updated = { ...wallet, accounts: updatedAccounts }
    const encrypted = await encryptData(JSON.stringify(updated), password)
    localStorage.setItem(STORAGE_KEY, encrypted)
    setWallet(updated)
    saveSession(updated)
  }

  const switchAccount = async index => {
    if (!wallet) return
    const updated = { ...wallet, activeAccount: index }
    setWallet(updated)
    if (password) {
      localStorage.setItem(
        STORAGE_KEY,
        await encryptData(JSON.stringify(updated), password),
      )
      saveSession(updated)
    }
  }

  const setActiveChain = chain => setActiveChainRaw(chain)

  const sendTransaction = async (to, amount, token, chainId) => {
    const fullWallet = await ensureKeys()
    const activeAcc = fullWallet.accounts[fullWallet.activeAccount]
    const chain = chainId || activeChain
    const { sendNative, sendERC20 } = await import('../utils/blockchain')

    const nativeSyms = {
      ethereum: 'ETH',
      bnb: 'BNB',
      polygon: 'MATIC',
      sepolia: 'ETH',
      baseSepolia: 'ETH',
      base: 'ETH',
      arbitrum: 'ETH',
    }
    const isNative = token === nativeSyms[chain]
    const pending = {
      hash: 'pending_' + Date.now(),
      from: activeAcc.address,
      to,
      amount,
      token,
      chain,
      type: 'send',
      status: 'pending',
      timestamp: Date.now(),
      gasUsed: gasInfo.ethCost,
    }
    setTransactions(prev => [pending, ...prev])

    try {
      let tx
      if (import.meta.env.VITE_INFURA_KEY && import.meta.env.VITE_INFURA_KEY !== 'YOUR_INFURA_KEY') {
        tx = isNative
          ? await sendNative(to, amount, activeAcc.privateKey, chain)
          : await sendERC20(
              TOKEN_CONTRACTS[chain]?.[token]?.address,
              to,
              amount,
              TOKEN_CONTRACTS[chain]?.[token]?.decimals,
              activeAcc.privateKey,
              chain,
            )
      } else {
        if (import.meta.env.DEV) {
          tx = {
            hash: '0x' + Array.from(crypto.getRandomValues(new Uint8Array(32)))
              .map(b => b.toString(16).padStart(2, '0'))
              .join(''),
          }
        } else {
          throw new Error('Blockchain provider key missing. Please configure INFURA_KEY.')
        }
      }

      setTransactions(prev =>
        prev.map(t => (t.hash === pending.hash ? { ...t, hash: tx.hash } : t)),
      )

      const confirm = () => {
        setTransactions(prev =>
          prev.map(item => {
            if (item.hash !== tx.hash) return item
            return { ...item, status: 'confirmed' }
          }),
        )
        setBalances(prev => {
          const key = `${chain}_${token}`
          const currentBal = prev[key] || 0
          return { ...prev, [key]: Math.max(0, currentBal - parseFloat(amount)) }
        })
        notify(`✓ ${amount} ${token} sent`, 'success')
      }

      tx.wait ? tx.wait().then(confirm) : setTimeout(confirm, 3000)
      return tx
    } catch (err) {
      setTransactions(prev =>
        prev.map(t => (t.hash === pending.hash ? { ...t, status: 'failed' } : t)),
      )
      throw err
    }
  }

  const currentAddress = wallet?.accounts?.[wallet?.activeAccount]?.address
  const currentChain = CHAINS[activeChain]
  const chainBalances = Object.entries(balances)
    .filter(([k]) => k.startsWith(activeChain + '_'))
    .reduce((acc, [k, v]) => {
      acc[k.replace(activeChain + '_', '')] = v
      return acc
    }, {})

  const totalUSDValue = Object.entries(balances).reduce((sum, [key, amount]) => {
    const sym = key.split('_')[1]
    return sum + amount * (prices[sym] ?? getPrice(sym) ?? 1)
  }, 0)

  return (
    <WalletContext.Provider
      value={{
        wallet,
        isLocked,
        sessionReady,
        activeChain,
        setActiveChain,
        balances,
        chainBalances,
        transactions,
        prices,
        currentAddress,
        currentChain,
        totalUSDValue,
        loadingBal,
        loadingTx,
        gasInfo,
        ensName,
        setEnsName,
        notify,
        createWallet,
        confirmWallet,
        importWallet,
        unlockWallet,
        verifyPassword,
        lockWallet,
        resetWallet,
        sendTransaction,
        addAccount,
        switchAccount,
        renameAccount,
        refreshBalances: addr => refreshBalances(addr, activeChain),
        ensureKeys,
      }}
    >
      {children}
    </WalletContext.Provider>
  )
}
