import {
  createContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  useContext,
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
import { 
  enableBiometric, 
  authenticateWithBiometric, 
  disableBiometric,
  isBiometricSupported,
  isBiometricEnabled,
  getBiometricStatus
} from '../utils/biometricAuth'
import { logSecurityEvent, AUDIT_EVENTS } from '../utils/auditLog'
import { 
  checkLoginRateLimit,
  recordFailedLoginAttempt,
  clearLoginRateLimit,
  getLoginLockoutTimeRemaining,
  checkTransactionRateLimit,
  recordTransactionSubmission,
  recordTransactionViolation
} from '../utils/rateLimiter'
import { 
  getUserSafeError,
  getDetailedErrorLog,
  handleAuthError,
  handleBlockchainError,
  safeExecute,
  ERROR_CATEGORIES
} from '../utils/errorHandling'
import {
  saveSecureSession,
  loadSecureSession,
  clearSecureSession,
  validateSessionIntegrity,
  storeCSRFToken,
  getCSRFToken,
  initializeSecureSession,
  logSessionSecurityEvent
} from '../utils/sessionSecurity'
import {
  chainIdToKey,
  detectBrowserWalletNetwork
} from '../utils/networkDetection'
import {
  maskPrivateKey,
  sanitizeError,
  logKeyUsage,
  withPrivateKey
} from '../utils/secureKeyManagement'
import {
  validateTransaction,
  getTransactionHistory,
  addToTransactionHistory
} from '../utils/transactionValidation'
import {
  generateMEVProtectionReport,
  detectSandwichVulnerability
} from '../utils/mevProtection'
import {
  createHardwareSigner,
  getHardwareWalletName
} from '../utils/hardwareWallet'
import {
  checkMultisigRequirement,
  proposeTransaction,
  calculateMultisigProtectionScore
} from '../utils/multisigSupport'
import {
  simulateTransaction,
  generateCacheKey,
  getCachedSimulation,
  cacheSimulation
} from '../utils/transactionSimulation'

// eslint-disable-next-line react-refresh/only-export-components
export const WalletContext = createContext(null)
const STORAGE_KEY = 'dwallet_v5_encrypted'
const WALLETS_INDEX_KEY = 'dwallet_v5_wallets_index'
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
    DWT: { address: '0x3400b0167dA5b2dba0b88b9604eE7df4BFc1f1fa', decimals: 18 },
  },
  // ── Sepolia testnet ───────────────────────────────────────────────────
  sepolia: {
    DWT: { address: '0x3400b0167dA5b2dba0b88b9604eE7df4BFc1f1fa', decimals: 18 },
    USDT: { address: '0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0', decimals: 6 },
    USDC: { address: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', decimals: 6 },
    DAI: { address: '0xFF34B3d4Aee8ddCd6F9AFFFB6Fe49bD371b8a357', decimals: 18 },
  },
  // ── Base Sepolia testnet ──────────────────────────────────────────────
  baseSepolia: {
    DWT: { address: '0x3A4B1a7aD971be03dEe83A7B61d575304C9C0b0f', decimals: 18 }, // NFT Membership DWT
    USDT: { address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', decimals: 6 },
    USDC: { address: '0x036CbD53842c5426634e7929541eC2318f3dCF7e', decimals: 6 },
  },
  // ── Base mainnet ──────────────────────────────────────────────────────
  base: {
    DWT:  { address: '0x9ce235f8574bde67393884550F02135CE4fB8387', decimals: 18 },
    USDC: { address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', decimals: 6 },
    USDT: { address: '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2', decimals: 6 },
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
  
  // Use secure session storage with integrity protection
  saveSecureSession(SESSION_KEY, session)
}

function loadSession() {
  try {
    // Use secure session loading with integrity verification
    const session = loadSecureSession(SESSION_KEY)
    
    if (!session) return null
    
    // Check auto-lock timeout
    if (Date.now() - session.savedAt > AUTO_LOCK_MS) {
      clearSecureSession(SESSION_KEY)
      logSessionSecurityEvent('session_expired', {
        reason: 'auto_lock_timeout'
      })
      return null
    }
    
    return session
  } catch (error) {
    console.error('❌ Session load failed:', error)
    return null
  }
}

function clearSession() {
  clearSecureSession(SESSION_KEY)
  logSessionSecurityEvent('session_cleared')
}

// Wallet index management functions
function loadWalletsIndex() {
  try {
    const stored = localStorage.getItem(WALLETS_INDEX_KEY)
    if (!stored) return []
    return JSON.parse(stored)
  } catch (error) {
    console.error('❌ Failed to load wallets index:', error)
    return []
  }
}

function saveWalletsIndex(wallets) {
  try {
    localStorage.setItem(WALLETS_INDEX_KEY, JSON.stringify(wallets))
  } catch (error) {
    console.error('❌ Failed to save wallets index:', error)
  }
}

function addWalletToIndex(walletMeta) {
  const wallets = loadWalletsIndex()
  wallets.push(walletMeta)
  saveWalletsIndex(wallets)
  return wallets
}

function removeWalletFromIndex(walletId) {
  const wallets = loadWalletsIndex()
  const filtered = wallets.filter(w => w.id !== walletId)
  saveWalletsIndex(filtered)
  return filtered
}

function updateWalletInIndex(walletId, updates) {
  const wallets = loadWalletsIndex()
  const updated = wallets.map(w => w.id === walletId ? { ...w, ...updates } : w)
  saveWalletsIndex(updated)
  return updated
}

function touchSession() {
  try {
    const session = loadSecureSession(SESSION_KEY)
    if (session) {
      session.savedAt = Date.now()
      saveSecureSession(SESSION_KEY, session)
    }
  } catch (error) {
    // Session refresh failed, likely non-critical
    console.warn('⚠️ Session touch failed:', error)
  }
}

export function WalletProvider({ children }) {
  const [wallet, setWallet] = useState(null)
  const [wallets, setWallets] = useState([]) // Array of wallet metadata
  const [activeWalletIndex, setActiveWalletIndex] = useState(0)
  const [activeChain, setActiveChainRaw] = useState('ethereum')
  const [autoNetworkDetectEnabled, setAutoNetworkDetectEnabled] = useState(true)
  const [balances, setBalances] = useState({})
  const [transactions, setTransactions] = useState([])
  const [isLocked, setIsLocked] = useState(false)
  const [password, setPassword] = useState(null)
  const [loadingBal, setLoadingBal] = useState(false)
  
  // Hardware wallet state
  const [hardwareWallet, setHardwareWallet] = useState(null)
  const [isHardwareWallet, setIsHardwareWallet] = useState(false)
  const [loadingTx, setLoadingTx] = useState(false)
  const [gasInfo, setGasInfo] = useState({ gwei: '—', ethCost: '—' })
  const [prices, setPrices] = useState({})
  const [ensName, setEnsName] = useState(null)
  const [notification, setNotification] = useState(null)
  const [sessionReady, setSessionReady] = useState(false)
  const [biometricSupported, setBiometricSupported] = useState(false)
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
    
    // Load wallets index
    const walletsIndex = loadWalletsIndex()
    setWallets(walletsIndex)

    console.log('🔐 Wallet Init Debug:', {
      hasEncrypted,
      hasSession: !!session,
      storageKey: STORAGE_KEY,
      localStorageKeys: Object.keys(localStorage),
      encryptedDataLength: localStorage.getItem(STORAGE_KEY)?.length || 0,
      walletsCount: walletsIndex.length
    })

    // Initialize secure session management (CSRF protection)
    initializeSecureSession()

    // Check biometric support
    setBiometricSupported(isBiometricSupported())

    if (!hasEncrypted) {
      console.log('ℹ️ No encrypted wallet found - user needs to create or import')
      setSessionReady(true)
      return
    }

    if (session) {
      console.log('✅ Restoring from session')
      restoreFromSession(session)
    } else {
      console.log('🔒 Wallet locked - needs password')
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

  const createWallet = async (wordCount = 12) => {
    const mnemonic = generateMnemonic(wordCount)
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
    
    console.log('💾 Wallet Saved Successfully:', {
      storageKey: STORAGE_KEY,
      encryptedLength: encrypted.length,
      address: walletData.accounts[0]?.address,
      canRetrieve: !!localStorage.getItem(STORAGE_KEY)
    })
    
    setPassword(pwd)
    setWallet(walletData)
    setIsLocked(false)
    saveSession(walletData)
    resetInactivityTimer()
    
    // Regenerate CSRF token after authentication (prevent session fixation)
    storeCSRFToken()
    logSessionSecurityEvent('wallet_confirmed', {
      address: walletData.accounts[0]?.address
    })
    
    // Log wallet creation
    logSecurityEvent(AUDIT_EVENTS.WALLET_CREATED, {
      address: walletData.accounts[0]?.address
    })
  }

  const importWallet = async (input, pwd) => {
    const raw = input.trim()
    let data
    
    // Check if input is a private key (64 hex chars, with or without 0x)
    const isPrivateKey = /^0x[0-9a-fA-F]{64}$/.test(raw) || /^[0-9a-fA-F]{64}$/.test(raw)
    
    if (isPrivateKey) {
      // Private key import
      const privateKey = raw.startsWith('0x') ? raw : '0x' + raw
      const { ethers } = await import('ethers')
      const wallet = new ethers.Wallet(privateKey)
      
      data = {
        mnemonic: null, // No mnemonic for private key imports
        accounts: [
          {
            name: 'Account 1',
            address: wallet.address,
            privateKey: privateKey,
            index: 0,
          },
        ],
        activeAccount: 0,
        createdAt: Date.now(),
        imported: true,
        importedVia: 'privatekey',
      }
    } else {
      // Seed phrase import
      const words = raw.split(/\s+/)
      if (words.length !== 12 && words.length !== 24)
        throw new Error('Seed phrase must be 12 or 24 words')
      const seed = mnemonicToSeedSync(raw)
      const derived = deriveWalletFromSeed(seed, 0)
      
      data = {
        mnemonic: raw,
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
        imported: true,
        importedVia: 'seed',
      }
    }
    
    // Save encrypted wallet to localStorage
    const encrypted = await encryptData(JSON.stringify(data), pwd)
    localStorage.setItem(STORAGE_KEY, encrypted)
    
    console.log('💾 Imported Wallet Saved:', {
      storageKey: STORAGE_KEY,
      encryptedLength: encrypted.length,
      address: data.accounts[0]?.address,
      canRetrieve: !!localStorage.getItem(STORAGE_KEY),
      importedVia: data.importedVia
    })
    
    setPassword(pwd)
    setWallet(data)
    setIsLocked(false)
    saveSession(data)
    resetInactivityTimer()
    
    // Regenerate CSRF token after authentication (prevent session fixation)
    storeCSRFToken()
    logSessionSecurityEvent('wallet_imported', {
      address: data.accounts[0]?.address,
      importedVia: data.importedVia
    })
    
    // Log wallet import
    logSecurityEvent(AUDIT_EVENTS.WALLET_CREATED, {
      address: data.accounts[0]?.address,
      imported: true,
      importedVia: data.importedVia
    })
  }

  const verifyPassword = async pwd => {
    // Check rate limit with exponential backoff
    const rateLimit = checkLoginRateLimit()
    if (!rateLimit.allowed) {
      const waitTime = rateLimit.waitMinutes || Math.ceil((rateLimit.waitMs || 0) / 60000)
      throw new Error(`Too many failed attempts. Please wait ${waitTime} minute${waitTime !== 1 ? 's' : ''} before trying again.`)
    }
    
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return null
    try {
      const data = JSON.parse(await decryptData(stored, pwd))
      clearLoginRateLimit() // Reset on success
      return data.mnemonic || null
    } catch {
      recordFailedLoginAttempt()
      return null
    }
  }

  const unlockWallet = async pwd => {
    // Check rate limit with exponential backoff
    const rateLimit = checkLoginRateLimit()
    if (!rateLimit.allowed) {
      const waitTime = rateLimit.waitMinutes || Math.ceil((rateLimit.waitMs || 0) / 60000)
      throw new Error(`Account locked. Please wait ${waitTime} minute${waitTime !== 1 ? 's' : ''} before trying again.`)
    }
    
    const stored = localStorage.getItem(STORAGE_KEY)
    // Generic error message - don't reveal if wallet exists or not
    if (!stored) throw new Error('Unable to unlock wallet. Please try again.')
    
    try {
      const walletData = JSON.parse(await decryptData(stored, pwd))
      clearLoginRateLimit() // Reset on success
      setPassword(pwd)
      setWallet(walletData)
      setIsLocked(false)
      saveSession(walletData)
      resetInactivityTimer()
      
      // Regenerate CSRF token after authentication (prevent session fixation)
      storeCSRFToken()
      logSessionSecurityEvent('wallet_unlocked', {
        address: walletData.accounts[0]?.address
      })
      
      console.log('✅ Wallet unlocked successfully')
    } catch (err) {
      const result = recordFailedLoginAttempt()
      
      // Log detailed error internally (never shown to user)
      const errorLog = getDetailedErrorLog(err, 'wallet_unlock')
      console.warn('❌ Failed wallet unlock attempt:', errorLog)
      
      // Check if this attempt triggered a lockout
      const lockoutTime = getLoginLockoutTimeRemaining()
      if (lockoutTime) {
        throw new Error(`Account locked for ${lockoutTime.minutes} minute${lockoutTime.minutes !== 1 ? 's' : ''}. Please try again later.`)
      }
      
      // Generic error message - don't reveal if password was wrong or other issue
      throw new Error('Unable to unlock wallet. Please check your credentials and try again.')
    }
  }

  const resetWallet = () => {
    localStorage.removeItem(STORAGE_KEY)
    disableBiometric() // Also disable biometric on reset
    lockWallet()
    setIsLocked(false)
  }

  const addAccount = async () => {
    const fullWallet = await ensureKeys()
    if (!fullWallet || !password) return
    
    // Check if this is a hardware wallet
    if (fullWallet.isHardwareWallet) {
      notify('Hardware wallets do not support adding accounts through seed derivation', 'error')
      return
    }
    
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

  // ── Wallet Management Functions ──────────────────────────────
  
  const addWallet = async (walletData, pwd) => {
    // Generate unique ID for this wallet
    const walletId = `wallet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // Store wallet with unique key
    const walletStorageKey = `${STORAGE_KEY}_${walletId}`
    const encrypted = await encryptData(JSON.stringify(walletData), pwd)
    localStorage.setItem(walletStorageKey, encrypted)
    
    // Add to wallets index with optional group/color
    const walletMeta = {
      id: walletId,
      name: walletData.name || `Wallet ${wallets.length + 1}`,
      address: walletData.accounts[0]?.address,
      createdAt: Date.now(),
      accountsCount: walletData.accounts.length,
      color: walletData.color || null, // Optional color tag
      group: walletData.group || null, // Optional group/category
      notes: walletData.notes || '' // Optional notes
    }
    
    const updatedWallets = addWalletToIndex(walletMeta)
    setWallets(updatedWallets)
    
    // Switch to the new wallet
    setActiveWalletIndex(updatedWallets.length - 1)
    setPassword(pwd)
    setWallet(walletData)
    saveSession(walletData)
    
    // Log wallet creation
    logSecurityEvent(AUDIT_EVENTS.WALLET_CREATED, {
      walletId,
      address: walletData.accounts[0]?.address,
      imported: walletData.imported || false,
      accountsCount: walletData.accounts.length
    })
    
    notify(`✓ ${walletMeta.name} added`, 'success')
    return walletMeta
  }

  const switchWallet = async (walletIndex, pwd) => {
    if (walletIndex === activeWalletIndex && wallet) return
    
    const walletMeta = wallets[walletIndex]
    if (!walletMeta) throw new Error('Wallet not found')
    
    // Load the wallet from storage
    const walletStorageKey = `${STORAGE_KEY}_${walletMeta.id}`
    const stored = localStorage.getItem(walletStorageKey)
    
    if (!stored) throw new Error('Wallet data not found')
    
    try {
      const walletData = JSON.parse(await decryptData(stored, pwd))
      setActiveWalletIndex(walletIndex)
      setPassword(pwd)
      setWallet(walletData)
      saveSession(walletData)
      resetInactivityTimer()
      
      // Log wallet switch
      logSecurityEvent(AUDIT_EVENTS.LOGIN_SUCCESS, {
        walletId: walletMeta.id,
        address: walletData.accounts[0]?.address,
        walletIndex
      })
      
      notify(`✓ Switched to ${walletMeta.name}`, 'success')
    } catch (err) {
      console.error('❌ Failed to switch wallet:', err)
      
      // Log failed switch attempt
      logSecurityEvent(AUDIT_EVENTS.LOGIN_FAILED, {
        walletId: walletMeta.id,
        walletIndex,
        reason: 'invalid_password'
      })
      
      throw new Error('Failed to unlock wallet. Please check your password.')
    }
  }

  const removeWallet = async (walletIndex, pwd) => {
    if (wallets.length <= 1) {
      throw new Error('Cannot remove the last wallet')
    }
    
    const walletMeta = wallets[walletIndex]
    if (!walletMeta) throw new Error('Wallet not found')
    
    // Verify password before removing
    const walletStorageKey = `${STORAGE_KEY}_${walletMeta.id}`
    const stored = localStorage.getItem(walletStorageKey)
    
    if (!stored) throw new Error('Wallet data not found')
    
    try {
      // Try to decrypt to verify password
      await decryptData(stored, pwd)
      
      // Remove from storage
      localStorage.removeItem(walletStorageKey)
      
      // Remove from index
      const updatedWallets = removeWalletFromIndex(walletMeta.id)
      setWallets(updatedWallets)
      
      // If we removed the active wallet, switch to another
      if (walletIndex === activeWalletIndex) {
        const newActiveIndex = walletIndex > 0 ? walletIndex - 1 : 0
        setActiveWalletIndex(newActiveIndex)
        
        // Load the new active wallet
        const newWalletMeta = updatedWallets[newActiveIndex]
        if (newWalletMeta) {
          const newWalletKey = `${STORAGE_KEY}_${newWalletMeta.id}`
          const newStored = localStorage.getItem(newWalletKey)
          if (newStored) {
            const newWalletData = JSON.parse(await decryptData(newStored, pwd))
            setWallet(newWalletData)
            saveSession(newWalletData)
          }
        }
      }
      
      // Log wallet removal
      logSecurityEvent(AUDIT_EVENTS.WALLET_DELETED, {
        walletId: walletMeta.id,
        address: walletMeta.address,
        walletIndex
      })
      
      notify(`✓ ${walletMeta.name} removed`, 'success')
    } catch (err) {
      console.error('❌ Failed to remove wallet:', err)
      
      // Log failed removal attempt
      logSecurityEvent(AUDIT_EVENTS.LOGIN_FAILED, {
        walletId: walletMeta.id,
        walletIndex,
        reason: 'wallet_remooval_failed',
        error: err.message
      })
      
      throw new Error('Failed to verify password. Please try again.')
    }
  }

  const renameWallet = async (walletIndex, newName, pwd) => {
    if (!newName || !newName.trim()) {
      throw new Error('Wallet name cannot be empty')
    }
    
    if (newName.trim().length > 30) {
      throw new Error('Wallet name must be 30 characters or less')
    }
    
    const walletMeta = wallets[walletIndex]
    if (!walletMeta) throw new Error('Wallet not found')
    
    // Verify password before renaming
    const walletStorageKey = `${STORAGE_KEY}_${walletMeta.id}`
    const stored = localStorage.getItem(walletStorageKey)
    
    if (!stored) throw new Error('Wallet data not found')
    
    try {
      // Try to decrypt to verify password
      await decryptData(stored, pwd)
      
      // Update wallet name in index
      const updatedWallets = updateWalletInIndex(walletMeta.id, {
        name: newName.trim()
      })
      setWallets(updatedWallets)
      
      // If this is the active wallet, update the session
      if (walletIndex === activeWalletIndex && wallet) {
        const updatedWallet = { ...wallet, name: newName.trim() }
        saveSession(updatedWallet)
      }
      
      // Log wallet rename
      logSecurityEvent('WALLET_RENAMED', {
        walletId: walletMeta.id,
        oldName: walletMeta.name,
        newName: newName.trim(),
        walletIndex
      })
      
      notify(`✓ Wallet renamed to "${newName.trim()}"`, 'success')
    } catch (err) {
      console.error('❌ Failed to rename wallet:', err)
      throw new Error('Failed to verify password. Please try again.')
    }
  }

  const updateWalletMetadata = async (walletIndex, metadata, pwd) => {
    const walletMeta = wallets[walletIndex]
    if (!walletMeta) throw new Error('Wallet not found')
    
    // Verify password before updating
    const walletStorageKey = `${STORAGE_KEY}_${walletMeta.id}`
    const stored = localStorage.getItem(walletStorageKey)
    
    if (!stored) throw new Error('Wallet data not found')
    
    try {
      // Try to decrypt to verify password
      await decryptData(stored, pwd)
      
      // Update wallet metadata in index
      const updatedWallets = updateWalletInIndex(walletMeta.id, metadata)
      setWallets(updatedWallets)
      
      // Log wallet metadata update
      logSecurityEvent('WALLET_METADATA_UPDATED', {
        walletId: walletMeta.id,
        updates: Object.keys(metadata),
        walletIndex
      })
      
      notify('✓ Wallet updated', 'success')
    } catch (err) {
      console.error('❌ Failed to update wallet:', err)
      throw new Error('Failed to verify password. Please try again.')
    }
  }

  const setActiveChain = chain => setActiveChainRaw(chain)

  // Auto-detect network from browser wallet on initialization
  useEffect(() => {
    if (!autoNetworkDetectEnabled || !window.ethereum) return

    const detectNetwork = async () => {
      try {
        const result = await detectBrowserWalletNetwork()
        
        if (result) {
          console.log('🌐 Auto-detected network:', result.chainKey, '(Chain ID:', result.chainId, ')')
          setActiveChainRaw(result.chainKey)
        }
      } catch (err) {
        console.warn('⚠️ Network auto-detection failed:', err)
      }
    }

    detectNetwork()

    // Listen for network changes
    const handleChainChanged = (chainId) => {
      const chainKey = chainIdToKey(chainId)
      
      if (chainKey) {
        const chainIdNumber = typeof chainId === 'string' 
          ? parseInt(chainId, 16) 
          : chainId
        console.log('🔄 Network changed to:', chainKey, '(Chain ID:', chainIdNumber, ')')
        setActiveChainRaw(chainKey)
      }
    }

    window.ethereum.on('chainChanged', handleChainChanged)

    return () => {
      window.ethereum.removeListener('chainChanged', handleChainChanged)
    }
  }, [autoNetworkDetectEnabled])

  const sendTransaction = async (to, amount, token, chainId) => {
    // Check transaction rate limit
    const txRateLimit = checkTransactionRateLimit()
    if (!txRateLimit.allowed) {
      const waitTime = txRateLimit.cooldownSeconds || 60
      throw new Error(`Transaction rate limit exceeded. Please wait ${waitTime} seconds before trying again.`)
    }
    
    const fullWallet = await ensureKeys()
    const activeAcc = fullWallet.accounts[fullWallet.activeAccount]
    const chain = chainId || activeChain
    
    // SECURITY: Enhanced transaction validation
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
    
    // Get token price for validation
    const tokenPrice = prices[token] || getPrice(token) || 0
    const txHistory = getTransactionHistory()
    
    // Validate transaction
    const validation = await validateTransaction({
      from: activeAcc.address,
      to,
      amount: parseFloat(amount),
      token,
      chain,
      balance: chainBalances[token] || 0,
      gasInfo,
      price: tokenPrice,
      transactionHistory: txHistory,
    })
    
    // Block if validation fails
    if (!validation.valid) {
      const errorMsg = validation.errors.join('\n')
      console.error('❌ Transaction validation failed:', errorMsg)
      throw new Error(errorMsg)
    }
    
    // Warn about high risk transactions
    if (validation.requiresConfirmation) {
      console.warn('⚠️ High risk transaction detected:', validation.warnings)
      // In production, you'd show a confirmation dialog here
    }
    
    // SECURITY: Check if multi-sig is required
    const amountUSD = parseFloat(amount) * tokenPrice
    const multisigCheck = checkMultisigRequirement(amountUSD)
    
    if (multisigCheck.required) {
      console.log('🔐 Multi-signature required:', multisigCheck.reason)
      // Propose transaction for multi-sig approval
      const proposal = proposeTransaction({
        from: activeAcc.address,
        to,
        amount,
        token,
        chain,
        amountUSD,
        multisigLevel: multisigCheck.level,
      })
      
      throw new Error(
        `This transaction requires multi-signature approval (${multisigCheck.reason}). ` +
        `Proposal ID: ${proposal.id}. Please collect ${multisigCheck.required} signatures.`
      )
    }
    
    // SECURITY: Simulate transaction before sending
    try {
      const cacheKey = generateCacheKey({
        from: activeAcc.address,
        to,
        chain,
      })
      
      let simulation = getCachedSimulation(cacheKey)
      
      if (!simulation) {
        simulation = await simulateTransaction({
          from: activeAcc.address,
          to,
          chain,
        })
        
        // Cache the result
        cacheSimulation(cacheKey, simulation)
      }
      
      if (!simulation.wouldSucceed) {
        console.error('❌ Transaction simulation failed:', simulation.reason)
        throw new Error(`Transaction would fail: ${simulation.reason}`)
      }
    } catch (error) {
      if (error.message.includes('Transaction would fail')) {
        throw error
      }
      // Don't block on simulation failure, just log it
      console.warn('⚠️ Simulation check failed:', error.message)
    }
    
    // Log key usage for auditing
    logKeyUsage('send_transaction', activeAcc.address)
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
      // Record the transaction submission
      recordTransactionSubmission()
      
      let tx
      if (import.meta.env.VITE_INFURA_KEY && import.meta.env.VITE_INFURA_KEY !== 'YOUR_INFURA_KEY') {
        const { sendNative, sendERC20 } = await import('../utils/blockchain')
        
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
          // Development mode - mock transaction
          tx = {
            hash: '0x' + Array.from(crypto.getRandomValues(new Uint8Array(32)))
              .map(b => b.toString(16).padStart(2, '0'))
              .join(''),
          }
        } else {
          // Production mode - provider not configured
          console.error('❌ Blockchain provider not configured')
          throw new Error('Unable to process transaction. Please try again later.')
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
        
        // SECURITY: Add to transaction history
        addToTransactionHistory({
          hash: tx.hash,
          from: activeAcc.address,
          to,
          amount: parseFloat(amount),
          token,
          chain,
          type: 'send',
          amountUSD: parseFloat(amount) * tokenPrice,
          status: 'confirmed',
        })
        
        notify(`✓ ${amount} ${token} sent`, 'success')
      }

      tx.wait ? tx.wait().then(confirm) : setTimeout(confirm, 3000)
      return tx
    } catch (err) {
      // Log detailed error internally
      const errorLog = getDetailedErrorLog(err, 'send_transaction')
      
      // SECURITY: Sanitize error message to prevent private key leakage
      const safeError = sanitizeError(err)
      console.error('❌ Transaction failed:', safeError, errorLog)
      
      // Handle blockchain-specific errors
      const blockchainError = handleBlockchainError(err, chain)
      
      // Record rate limit violation if applicable
      if (err.message.includes('rate limit') || err.message.includes('too many requests')) {
        recordTransactionViolation()
      }
      
      setTransactions(prev =>
        prev.map(t => (t.hash === pending.hash ? { ...t, status: 'failed' } : t)),
      )
      
      // Throw user-safe error message
      throw new Error(blockchainError.error || safeError || 'Transaction failed. Please try again later.')
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

  // ── Biometric Authentication Functions ──────────────────────────────
  
  const setupBiometric = useCallback(async (pwd) => {
    if (!currentAddress) {
      throw new Error('No wallet address available')
    }
    try {
      await enableBiometric(currentAddress, pwd)
      console.log('✅ Biometric setup complete')
      return true
    } catch (err) {
      console.error('Biometric setup failed:', err)
      throw err
    }
  }, [currentAddress])

  const unlockWithBiometric = useCallback(async () => {
    try {
      await authenticateWithBiometric()
      
      // Biometric succeeded, but we still need the password to decrypt the wallet
      // In a real implementation, you'd store a wrapped key or use a different approach
      // For now, we'll show the password screen but mark biometric as verified
      console.log('✅ Biometric verified - user still needs to enter password')
      return { biometricVerified: true }
    } catch (err) {
      console.error('Biometric unlock failed:', err)
      throw err
    }
  }, [])

  const removeBiometric = useCallback(() => {
    disableBiometric()
    console.log('✅ Biometric removed')
  }, [])

  // ── Hardware Wallet Functions ──────────────────────────────
  
  const connectHardwareWallet = useCallback(async (hwData) => {
    try {
      setHardwareWallet(hwData)
      setIsHardwareWallet(true)
      
      // Create a pseudo-wallet object for hardware wallet
      const hwWallet = {
        accounts: [{
          name: `${getHardwareWalletName(hwData.type)} Account`,
          address: hwData.address,
          privateKey: null, // Hardware wallets don't expose private keys
          index: 0,
          isHardware: true,
        }],
        activeAccount: 0,
        type: 'hardware',
        hardwareType: hwData.type,
      }
      
      setWallet(hwWallet)
      saveSession(hwWallet)
      
      console.log(`✅ ${getHardwareWalletName(hwData.type)} connected: ${hwData.address}`)
      notify(`✓ ${getHardwareWalletName(hwData.type)} connected`, 'success')
      
      return hwWallet
    } catch (err) {
      console.error('Hardware wallet setup failed:', err)
      throw err
    }
  }, [notify])

  const disconnectHardwareWallet = useCallback(() => {
    setHardwareWallet(null)
    setIsHardwareWallet(false)
    setWallet(null)
    localStorage.removeItem(STORAGE_KEY)
    console.log('✅ Hardware wallet disconnected')
    notify('Hardware wallet disconnected', 'info')
  }, [notify])

  return (
    <WalletContext.Provider
      value={{
        wallet,
        wallets,
        activeWalletIndex,
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
        notification,
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
        addWallet,
        switchWallet,
        removeWallet,
        renameWallet,
        updateWalletMetadata,
        refreshBalances: addr => refreshBalances(addr, activeChain),
        ensureKeys,
        // Security utilities
        getLoginLockoutTimeRemaining,
        // Biometric authentication
        biometricSupported,
        biometricEnabled: isBiometricEnabled(),
        setupBiometric,
        unlockWithBiometric,
        removeBiometric,
        // Hardware wallet support
        hardwareWallet,
        isHardwareWallet,
        connectHardwareWallet,
        disconnectHardwareWallet,
      }}
    >
      {children}
    </WalletContext.Provider>
  )
}

// Custom hook to use the Wallet context
export function useWallet() {
  const context = useContext(WalletContext)
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider')
  }
  return context
}
