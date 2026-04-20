import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useWallet } from '../hooks/useWallet'
import { DEFAULT_TOKENS } from '../data/chains'
import { fetchPriceHistory, getPrice } from '../utils/prices'
import { sanitizeNumber, validateBalanceData } from '../utils/dataValidation'
import { getExchangeRateLimiter, validateExchangeParams } from '../utils/exchangeSecurity'
import { executeOptimizedSwap, getBestExchangeRate } from '../utils/exchangeService'
import { addToExchangeHistory, getExchangeHistory } from '../utils/exchangeTracker'

const TOKEN_ICONS = {
  DWT: "◈", ETH: "⟠", BNB: "⬡", MATIC: "◈", SOL: "◎", 
  USDC: "$", USDT: "₮", DAI: "⬙", WBTC: "₿", UNI: "🦄", LINK: "⬡"
}

const EXCHANGE_TYPES = [
  { id: 'all', label: 'All', icon: '↕' },
  { id: 'send', label: 'Send', icon: '↑' },
  { id: 'receive', label: 'Receive', icon: '↓' },
  { id: 'swap', label: 'Swap', icon: '⇄' },
]

// Optimized price cache to reduce API calls
const PRICE_CACHE = new Map()
const CACHE_DURATION = 30000 // 30 seconds

function getCachedPrice(token) {
  const cached = PRICE_CACHE.get(token)
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.price
  }
  return null
}

function setCachedPrice(token, price) {
  PRICE_CACHE.set(token, { price, timestamp: Date.now() })
}

// Optimized transaction row component with memoization
const TransactionRow = React.memo(function TransactionRow({ tx, onClick }) {
  const formatDate = useCallback((ts) => {
    const date = new Date(ts)
    const now = new Date()
    const diffMs = now - date
    const diffDays = Math.floor(diffMs / 86400000)
    
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }, [])

  const formatAmount = useCallback((tx) => {
    const amount = parseFloat(tx.amount || tx.value || 0)
    return amount.toFixed(4)
  }, [])

  const getStatusColor = useCallback((status) => {
    switch (status) {
      case 'confirmed': return 'var(--green)'
      case 'pending': return 'var(--amber)'
      case 'failed': return 'var(--red)'
      default: return 'var(--text3)'
    }
  }, [])

  const getAmountSign = useCallback((type) => {
    if (type === 'receive') return '+'
    if (type === 'send' || type === 'swap') return '-'
    return ''
  }, [])

  const getTypeIcon = useCallback((type) => {
    if (type === 'send') return '↑'
    if (type === 'receive') return '↓'
    return '⇄'
  }, [])

  return (
    <div className="tx-item" onClick={() => onClick(tx)}>
      <div className="tx-row">
        <div className={`tx-icon tx-icon--${tx.type}`}>
          {getTypeIcon(tx.type)}
        </div>
        <div className="tx-details">
          <span className="tx-type">
            {tx.type.charAt(0).toUpperCase() + tx.type.slice(1)} {tx.token}
          </span>
          <span className="tx-date">{formatDate(tx.timestamp)}</span>
        </div>
        <div className="tx-amounts">
          <span className={`tx-amount ${tx.type === 'receive' ? 'positive' : ''}`}>
            {getAmountSign(tx.type)}{formatAmount(tx)} {tx.token}
          </span>
          <span className={`tx-status-badge tx-status-badge--${tx.status}`}>
            {tx.status}
          </span>
        </div>
      </div>
    </div>
  )
})

export default function CryptoExchange() {
  const { 
    wallet, 
    chainBalances, 
    transactions, 
    activeChain, 
    currentAddress,
    sendTransaction 
  } = useWallet()
  
  const [filter, setFilter] = useState('all')
  const [selectedTx, setSelectedTx] = useState(null)
  const [exchangeMode, setExchangeMode] = useState('history') // 'history' | 'exchange'
  const [fromToken, setFromToken] = useState('ETH')
  const [toToken, setToToken] = useState('USDC')
  const [fromAmount, setFromAmount] = useState('')
  const [toAmount, setToAmount] = useState('')
  const [exchanging, setExchanging] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [priceImpact, setPriceImpact] = useState(null)
  const [exchangeRate, setExchangeRate] = useState(null)
  const [isLoadingRate, setIsLoadingRate] = useState(false)
  
  // Security: Initialize rate limiter
  const rateLimiter = useMemo(() => getExchangeRateLimiter(), [])
  
  const tokens = useMemo(() => {
    const validatedBalances = validateBalanceData(chainBalances)
    return DEFAULT_TOKENS[activeChain]?.filter(t => t !== 'DWT') || []
  }, [activeChain, chainBalances])

  // Filter transactions based on selected filter
  const filteredTransactions = useMemo(() => {
    if (filter === 'all') return transactions
    return transactions.filter(tx => tx.type === filter)
  }, [transactions, filter])

  // Optimized price fetching with caching
  const getTokenPrice = useCallback(async (token) => {
    const cached = getCachedPrice(token)
    if (cached !== null) return cached
    
    try {
      const price = getPrice(token)
      setCachedPrice(token, price)
      return price
    } catch (error) {
      console.warn(`Failed to fetch price for ${token}:`, error)
      return 0
    }
  }, [])

  // Calculate exchange rate when tokens or amount changes
  useEffect(() => {
    let mounted = true
    
    const calculateRate = async () => {
      if (!fromAmount || parseFloat(fromAmount) <= 0) {
        setToAmount('')
        setExchangeRate(null)
        setPriceImpact(null)
        return
      }

      setIsLoadingRate(true)
      setError('')
      
      try {
        // Security: Check rate limit
        const rateCheck = rateLimiter.canExecute()
        if (!rateCheck.allowed) {
          setError(rateCheck.error)
          setIsLoadingRate(false)
          return
        }

        // Get best exchange rate (optimized)
        const rate = await getBestExchangeRate({
          fromToken,
          toToken,
          amount: fromAmount,
          chain: activeChain
        })

        if (!mounted) return

        if (rate.success) {
          const calculated = (parseFloat(fromAmount) * rate.rate).toFixed(6)
          setToAmount(calculated)
          setExchangeRate(rate.rate)
          setPriceImpact(rate.priceImpact)
        } else {
          setError(rate.error || 'Failed to get exchange rate')
        }
      } catch (err) {
        if (mounted) {
          setError('Failed to calculate exchange rate')
          console.error('Exchange rate error:', err)
        }
      } finally {
        if (mounted) {
          setIsLoadingRate(false)
        }
      }
    }

    const timeoutId = setTimeout(calculateRate, 300) // Debounce
    
    return () => {
      mounted = false
      clearTimeout(timeoutId)
    }
  }, [fromToken, toToken, fromAmount, activeChain, rateLimiter])

  // Handle token swap
  const handleSwapTokens = useCallback(() => {
    setFromToken(toToken)
    setToToken(fromToken)
    setFromAmount(toAmount)
  }, [fromToken, toToken, toAmount])

  // Execute exchange with security validations
  const handleExchange = async () => {
    setError('')
    setSuccess('')
    
    // Security: Validate parameters
    const validation = validateExchangeParams({
      fromToken,
      toToken,
      amount: fromAmount,
      balance: chainBalances[fromToken] || 0
    })

    if (!validation.valid) {
      setError(validation.error)
      return
    }

    // Security: Check rate limit
    const rateCheck = rateLimiter.canExecute()
    if (!rateCheck.allowed) {
      setError(rateCheck.error)
      return
    }

    setExchanging(true)
    
    try {
      // Execute optimized swap
      const result = await executeOptimizedSwap({
        fromToken,
        toToken,
        amount: fromAmount,
        minAmountOut: toAmount,
        chain: activeChain,
        wallet,
        sendTransaction
      })

      if (result.success) {
        setSuccess(`✓ Successfully exchanged ${fromAmount} ${fromToken} for ${toAmount} ${toToken}`)
        
        // Add to exchange history
        addToExchangeHistory({
          hash: result.hash,
          fromToken,
          toToken,
          fromAmount: parseFloat(fromAmount),
          toAmount: parseFloat(toAmount),
          rate: exchangeRate,
          priceImpact,
          timestamp: Date.now(),
          status: 'confirmed',
          chain: activeChain
        })

        // Reset form
        setFromAmount('')
        setToAmount('')
        setExchangeRate(null)
        setPriceImpact(null)
        
        // Show success message
        setTimeout(() => setSuccess(''), 5000)
      } else {
        setError(result.error || 'Exchange failed')
      }
    } catch (err) {
      console.error('Exchange error:', err)
      setError(err.message || 'Exchange failed. Please try again.')
    } finally {
      setExchanging(false)
    }
  }

  // Set max amount
  const handleSetMax = useCallback(() => {
    const balance = chainBalances[fromToken] || 0
    // Leave small amount for gas if it's the native token
    const reserve = (fromToken === 'ETH' || fromToken === 'BNB' || fromToken === 'MATIC') ? 0.001 : 0
    const maxAmount = Math.max(0, balance - reserve)
    setFromAmount(maxAmount.toFixed(6))
  }, [fromToken, chainBalances])

  return (
    <div className="view-container">
      <div className="view-header">
        <h2 className="view-title">Crypto Exchange</h2>
        <div className="exchange-mode-toggle">
          <button
            className={`mode-btn ${exchangeMode === 'history' ? 'active' : ''}`}
            onClick={() => setExchangeMode('history')}
          >
            History
          </button>
          <button
            className={`mode-btn ${exchangeMode === 'exchange' ? 'active' : ''}`}
            onClick={() => setExchangeMode('exchange')}
          >
            Exchange
          </button>
        </div>
      </div>

      {exchangeMode === 'exchange' ? (
        <div className="exchange-panel">
          {/* From Token */}
          <div className="exchange-input-box">
            <div className="exchange-input-header">
              <span className="exchange-label">From</span>
              <button className="max-btn" onClick={handleSetMax}>MAX</button>
            </div>
            <div className="exchange-input-row">
              <input
                type="number"
                className="exchange-amount-input"
                placeholder="0.0"
                value={fromAmount}
                onChange={(e) => setFromAmount(e.target.value)}
                step="any"
                min="0"
              />
              <select
                className="exchange-token-select"
                value={fromToken}
                onChange={(e) => setFromToken(e.target.value)}
              >
                {tokens.map(token => (
                  <option key={token} value={token}>
                    {TOKEN_ICONS[token] || token[0]} {token}
                  </option>
                ))}
              </select>
            </div>
            <div className="exchange-balance">
              Balance: {(chainBalances[fromToken] || 0).toFixed(6)} {fromToken}
            </div>
          </div>

          {/* Swap Button */}
          <button className="swap-direction-btn" onClick={handleSwapTokens}>
            ⇅
          </button>

          {/* To Token */}
          <div className="exchange-input-box">
            <div className="exchange-input-header">
              <span className="exchange-label">To (estimated)</span>
            </div>
            <div className="exchange-input-row">
              <input
                type="text"
                className="exchange-amount-input"
                placeholder="0.0"
                value={toAmount}
                readOnly
              />
              <select
                className="exchange-token-select"
                value={toToken}
                onChange={(e) => setToToken(e.target.value)}
              >
                {tokens.map(token => (
                  <option key={token} value={token}>
                    {TOKEN_ICONS[token] || token[0]} {token}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Exchange Details */}
          {exchangeRate && (
            <div className="exchange-details">
              <div className="detail-row">
                <span>Exchange Rate</span>
                <span>1 {fromToken} = {exchangeRate?.toFixed(6)} {toToken}</span>
              </div>
              {priceImpact !== null && (
                <div className="detail-row">
                  <span>Price Impact</span>
                  <span className={priceImpact > 3 ? 'negative' : priceImpact > 1 ? 'warning' : 'positive'}>
                    {priceImpact.toFixed(2)}%
                  </span>
                </div>
              )}
              {isLoadingRate && (
                <div className="detail-row">
                  <span>Fetching best rate...</span>
                  <span className="loading-spinner">⏳</span>
                </div>
              )}
            </div>
          )}

          {/* Messages */}
          {error && <div className="error-message">⚠️ {error}</div>}
          {success && <div className="success-message">✓ {success}</div>}

          {/* Exchange Button */}
          <button
            className="btn-primary full-width"
            onClick={handleExchange}
            disabled={!fromAmount || parseFloat(fromAmount) <= 0 || exchanging || isLoadingRate}
          >
            {exchanging ? (
              <span className="loading-text">
                <span className="spinner">⟳</span>
                Exchanging...
              </span>
            ) : (
              `Exchange ${fromToken} → ${toToken}`
            )}
          </button>

          {/* Security Notice */}
          <div className="security-notice">
            🔒 Protected by MEV detection & sandwich attack prevention
          </div>
        </div>
      ) : (
        <>
          {/* Filter Tabs */}
          <div className="filter-tabs">
            {EXCHANGE_TYPES.map(f => (
              <button
                key={f.id}
                className={`filter-tab ${filter === f.id ? 'filter-tab--active' : ''}`}
                onClick={() => setFilter(f.id)}
              >
                <span className="filter-icon">{f.icon}</span>
                {f.label}
              </button>
            ))}
          </div>

          {/* Transaction List */}
          <div className="tx-list">
            {filteredTransactions.length === 0 ? (
              <div className="empty-state-big">
                <p>No transactions found</p>
              </div>
            ) : (
              filteredTransactions.map(tx => (
                <TransactionRow
                  key={tx.hash}
                  tx={tx}
                  onClick={(tx) => setSelectedTx(selectedTx?.hash === tx.hash ? null : tx)}
                />
              ))
            )}
          </div>

          {/* Selected Transaction Details */}
          {selectedTx && (
            <div className="tx-expanded">
              <div className="tx-exp-row">
                <span>Hash</span>
                <span className="mono small">{selectedTx.hash?.slice(0, 20)}...</span>
              </div>
              <div className="tx-exp-row">
                <span>From</span>
                <span className="mono small">{selectedTx.from?.slice(0, 10)}...</span>
              </div>
              <div className="tx-exp-row">
                <span>To</span>
                <span className="mono small">{selectedTx.to?.slice(0, 10)}...</span>
              </div>
              <div className="tx-exp-row">
                <span>Amount</span>
                <span>{selectedTx.amount} {selectedTx.token}</span>
              </div>
              <div className="tx-exp-row">
                <span>Status</span>
                <span className={`tx-status-badge tx-status-badge--${selectedTx.status}`}>
                  {selectedTx.status}
                </span>
              </div>
              <div className="tx-exp-row">
                <span>Time</span>
                <span>{new Date(selectedTx.timestamp).toLocaleString()}</span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
