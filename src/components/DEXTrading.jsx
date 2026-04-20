import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useWallet } from '../hooks/useWallet'
import { DEFAULT_TOKENS } from '../data/chains'
import { getPrice } from '../utils/prices'
import { sanitizeNumber, validateBalanceData } from '../utils/dataValidation'
import { validateExchangeParams, getExchangeRateLimiter } from '../utils/exchangeSecurity'
import { executeOptimizedSwap, getBestExchangeRate } from '../utils/exchangeService'
import { getBestQuote } from '../services/dexAggregator'
import { BASE_TOKENS, ETHEREUM_TOKENS, CHAIN_ID } from '../config/tokenLists'
import RouteDisplay from './defi/RouteDisplay'

const TOKEN_ICONS = {
  DWT: "◈", ETH: "⟠", BNB: "⬡", MATIC: "◈", SOL: "◎", 
  USDC: "$", USDT: "₮", DAI: "⬙", WBTC: "₿", UNI: "🦄", LINK: "⬡"
}

export default function DEXTrading() {
  const { 
    wallet, 
    chainBalances, 
    activeChain, 
    currentAddress,
    sendTransaction,
    transactions
  } = useWallet()
  
  // Trading state
  const [fromToken, setFromToken] = useState('ETH')
  const [toToken, setToToken] = useState('USDC')
  const [fromAmount, setFromAmount] = useState('')
  const [toAmount, setToAmount] = useState('')
  const [slippage, setSlippage] = useState(0.5)
  const [trading, setTrading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  
  // Quote state
  const [currentQuote, setCurrentQuote] = useState(null)
  const [allQuotes, setAllQuotes] = useState([])
  const [priceImpact, setPriceImpact] = useState(null)
  const [exchangeRate, setExchangeRate] = useState(null)
  const [isLoadingQuote, setIsLoadingQuote] = useState(false)
  const [showRouteDetails, setShowRouteDetails] = useState(false)
  
  // Security
  const rateLimiter = useMemo(() => getExchangeRateLimiter(), [])
  
  // UI state
  const [showTokenSelector, setShowTokenSelector] = useState(null) // 'from' | 'to' | null
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('swap') // 'swap' | 'limit' | 'history'
  
  // Get available tokens for current chain
  const availableTokens = useMemo(() => {
    const validatedBalances = validateBalanceData(chainBalances)
    return DEFAULT_TOKENS[activeChain]?.filter(t => t !== 'DWT') || ['ETH', 'USDC']
  }, [activeChain, chainBalances])
  
  // Get token price
  const getTokenPrice = useCallback((token) => {
    return getPrice(token) || 0
  }, [])
  
  // Calculate USD values
  const fromPrice = getTokenPrice(fromToken)
  const toPrice = getTokenPrice(toToken)
  const fromUSD = (parseFloat(fromAmount || 0) * fromPrice).toFixed(2)
  const toUSD = (parseFloat(toAmount || 0) * toPrice).toFixed(2)
  
  // Fetch best DEX quote
  useEffect(() => {
    let mounted = true
    
    const fetchQuote = async () => {
      if (!fromAmount || parseFloat(fromAmount) <= 0) {
        setToAmount('')
        setCurrentQuote(null)
        setAllQuotes([])
        setExchangeRate(null)
        setPriceImpact(null)
        return
      }

      setIsLoadingQuote(true)
      setError('')
      
      try {
        // Security: Check rate limit
        const rateCheck = rateLimiter.canExecute()
        if (!rateCheck.allowed) {
          setError(rateCheck.error)
          setIsLoadingQuote(false)
          return
        }

        // Get token addresses for current chain
        const chainIdMap = {
          ethereum: CHAIN_ID.ETHEREUM,
          base: CHAIN_ID.BASE,
          baseSepolia: CHAIN_ID.BASE_SEPOLIA,
        }
        
        const chainId = chainIdMap[activeChain] || CHAIN_ID.ETHEREUM
        const tokenList = chainId === CHAIN_ID.ETHEREUM ? ETHEREUM_TOKENS : BASE_TOKENS
        
        const fromTokenData = tokenList.find(t => t.symbol === fromToken)
        const toTokenData = tokenList.find(t => t.symbol === toToken)
        
        // If we have token addresses, use DEX aggregator
        if (fromTokenData?.address && toTokenData?.address) {
          const amountInWei = (parseFloat(fromAmount) * 10 ** fromTokenData.decimals).toString()
          
          const bestQuote = await getBestQuote({
            tokenIn: fromTokenData.address,
            tokenOut: toTokenData.address,
            amount: amountInWei,
            chainId,
            slippage,
          })
          
          if (!mounted) return
          
          if (bestQuote && bestQuote.success) {
            const amountOut = Number(bestQuote.amountOut) / (10 ** toTokenData.decimals)
            setToAmount(amountOut.toFixed(6))
            setCurrentQuote(bestQuote)
            setExchangeRate(amountOut / parseFloat(fromAmount))
            setPriceImpact(bestQuote.priceImpact)
            
            // Set all quotes for comparison
            if (bestQuote.allQuotes) {
              setAllQuotes(bestQuote.allQuotes)
            }
          } else {
            // Fallback to simple price calculation
            const rate = toPrice / fromPrice
            const calculated = parseFloat(fromAmount) * rate
            setToAmount(calculated.toFixed(6))
            setExchangeRate(rate)
            setPriceImpact(null)
          }
        } else {
          // Fallback to simple price calculation
          const rate = toPrice / fromPrice
          const calculated = parseFloat(fromAmount) * rate
          setToAmount(calculated.toFixed(6))
          setExchangeRate(rate)
          setPriceImpact(null)
        }
      } catch (err) {
        if (mounted) {
          console.error('Quote error:', err)
          // Fallback on error
          const rate = toPrice / fromPrice
          const calculated = parseFloat(fromAmount) * rate
          setToAmount(calculated.toFixed(6))
          setExchangeRate(rate)
        }
      } finally {
        if (mounted) {
          setIsLoadingQuote(false)
        }
      }
    }

    const timeoutId = setTimeout(fetchQuote, 500) // Debounce
    
    return () => {
      mounted = false
      clearTimeout(timeoutId)
    }
  }, [fromToken, toToken, fromAmount, activeChain, slippage, rateLimiter, fromPrice, toPrice])
  
  // Handle token swap
  const handleSwapTokens = useCallback(() => {
    setFromToken(toToken)
    setToToken(fromToken)
    setFromAmount(toAmount)
  }, [fromToken, toToken, toAmount])
  
  // Execute trade
  const handleTrade = async () => {
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

    setTrading(true)
    
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
        setSuccess(`✓ Successfully swapped ${fromAmount} ${fromToken} for ${parseFloat(toAmount).toFixed(6)} ${toToken}`)
        
        // Reset form
        setFromAmount('')
        setToAmount('')
        setCurrentQuote(null)
        setAllQuotes([])
        setExchangeRate(null)
        setPriceImpact(null)
        
        // Show success message
        setTimeout(() => setSuccess(''), 5000)
      } else {
        setError(result.error || 'Trade failed')
      }
    } catch (err) {
      console.error('Trade error:', err)
      setError(err.message || 'Trade failed. Please try again.')
    } finally {
      setTrading(false)
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
  
  // Filter tokens for selector
  const filteredTokens = useMemo(() => {
    if (!searchQuery) return availableTokens
    return availableTokens.filter(token => 
      token.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [availableTokens, searchQuery])
  
  // Recent trades from history
  const recentTrades = useMemo(() => {
    return transactions
      .filter(tx => tx.type === 'swap')
      .slice(0, 5)
  }, [transactions])

  return (
    <div className="view-container">
      <div className="view-header">
        <h2 className="view-title">DEX Trading</h2>
        <span className="defi-badge">Live</span>
      </div>
      
      {/* Tab Switcher */}
      <div className="filter-tabs">
        {[
          { id: 'swap', label: 'Swap', icon: '⇄' },
          { id: 'limit', label: 'Limit Orders', icon: '📈' },
          { id: 'history', label: 'History', icon: '📋' },
        ].map(tab => (
          <button
            key={tab.id}
            className={`filter-tab ${activeTab === tab.id ? 'filter-tab--active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="filter-icon">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'swap' && (
        <div className="dex-trading-panel">
          {/* From Token */}
          <div className="dex-input-box">
            <div className="dex-input-header">
              <span className="dex-label">You Pay</span>
              <button className="dex-max-btn" onClick={handleSetMax}>MAX</button>
            </div>
            <div className="dex-input-row">
              <input
                type="number"
                className="dex-amount-input"
                placeholder="0.0"
                value={fromAmount}
                onChange={(e) => setFromAmount(e.target.value)}
                step="any"
                min="0"
              />
              <button
                className="dex-token-btn"
                onClick={() => setShowTokenSelector('from')}
              >
                <span className="token-icon">{TOKEN_ICONS[fromToken] || fromToken[0]}</span>
                <span className="token-symbol">{fromToken}</span>
                <span className="dropdown-arrow">▾</span>
              </button>
            </div>
            <div className="dex-balance-row">
              <span className="dex-balance">
                Balance: {(chainBalances[fromToken] || 0).toFixed(6)} {fromToken}
              </span>
              {parseFloat(fromUSD) > 0 && (
                <span className="dex-usd">≈ ${fromUSD}</span>
              )}
            </div>
          </div>

          {/* Swap Button */}
          <button className="dex-swap-arrow-btn" onClick={handleSwapTokens}>
            ⇅
          </button>

          {/* To Token */}
          <div className="dex-input-box dex-input-box--out">
            <div className="dex-input-header">
              <span className="dex-label">You Receive (estimated)</span>
              {isLoadingQuote && <span className="dex-loading">Getting best price...</span>}
            </div>
            <div className="dex-input-row">
              <input
                type="text"
                className="dex-amount-input"
                placeholder="0.0"
                value={toAmount}
                readOnly
              />
              <button
                className="dex-token-btn"
                onClick={() => setShowTokenSelector('to')}
              >
                <span className="token-icon">{TOKEN_ICONS[toToken] || toToken[0]}</span>
                <span className="token-symbol">{toToken}</span>
                <span className="dropdown-arrow">▾</span>
              </button>
            </div>
            {parseFloat(toUSD) > 0 && (
              <div className="dex-balance-row">
                <span className="dex-usd">≈ ${toUSD}</span>
              </div>
            )}
          </div>

          {/* Slippage Settings */}
          <div className="dex-settings-row">
            <span className="dex-settings-label">Slippage Tolerance</span>
            <div className="dex-slippage-btns">
              {[0.1, 0.5, 1.0].map(s => (
                <button
                  key={s}
                  className={`dex-slippage-btn ${slippage === s ? 'active' : ''}`}
                  onClick={() => setSlippage(s)}
                >
                  {s}%
                </button>
              ))}
            </div>
          </div>

          {/* Quote Details */}
          {currentQuote && exchangeRate && (
            <div className="dex-quote-details">
              <div className="dex-detail-row">
                <span>Exchange Rate</span>
                <span>1 {fromToken} = {exchangeRate?.toFixed(6)} {toToken}</span>
              </div>
              
              {priceImpact !== null && (
                <div className="dex-detail-row">
                  <span>Price Impact</span>
                  <span className={
                    priceImpact > 3 ? 'dex-negative' : 
                    priceImpact > 1 ? 'dex-warning' : 
                    'dex-positive'
                  }>
                    {priceImpact.toFixed(2)}%
                  </span>
                </div>
              )}
              
              {currentQuote.gasEstimate && (
                <div className="dex-detail-row">
                  <span>Estimated Gas</span>
                  <span>{currentQuote.gasEstimate}</span>
                </div>
              )}
              
              {/* Route Details Toggle */}
              <button 
                className="dex-route-toggle"
                onClick={() => setShowRouteDetails(!showRouteDetails)}
              >
                {showRouteDetails ? '▲ Hide' : '▼ Show'} Route Details
              </button>
              
              {showRouteDetails && allQuotes.length > 0 && (
                <div className="dex-route-comparison">
                  <p className="dex-route-title">Available Routes:</p>
                  {allQuotes.map((quote, idx) => (
                    <div 
                      key={idx} 
                      className={`dex-route-item ${
                        quote.dex === currentQuote.dex ? 'dex-route-best' : ''
                      }`}
                    >
                      <span className="dex-route-dex">{quote.dex}</span>
                      <span className="dex-route-amount">
                        {(Number(quote.amountOut) / 1e18).toFixed(6)} {toToken}
                      </span>
                      {quote.dex === currentQuote.dex && (
                        <span className="dex-route-badge">BEST</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Messages */}
          {error && <div className="dex-error">⚠️ {error}</div>}
          {success && <div className="dex-success">✓ {success}</div>}

          {/* Trade Button */}
          <button
            className="dex-trade-btn"
            onClick={handleTrade}
            disabled={!fromAmount || parseFloat(fromAmount) <= 0 || trading || isLoadingQuote}
          >
            {trading ? (
              <span className="dex-loading-text">
                <span className="dex-spinner">⟳</span>
                Executing Trade...
              </span>
            ) : isLoadingQuote ? (
              'Fetching Best Rate...'
            ) : (
              `Swap ${fromToken} → ${toToken}`
            )}
          </button>

          {/* Security Notice */}
          <div className="dex-security-notice">
            🔒 Protected by MEV detection, sandwich attack prevention & multi-DEX aggregation
          </div>
          
          {/* Recent Trades */}
          {recentTrades.length > 0 && (
            <div className="dex-recent-trades">
              <h3 className="dex-section-title">Recent Trades</h3>
              {recentTrades.map((trade, idx) => (
                <div key={idx} className="dex-trade-item">
                  <div className="dex-trade-info">
                    <span className="dex-trade-type">Swap</span>
                    <span className="dex-trade-time">
                      {new Date(trade.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                  <span className="dex-trade-amount">
                    {trade.amount} {trade.token}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'limit' && (
        <div className="dex-limit-orders">
          <div className="dex-empty-state">
            <span className="dex-empty-icon">📈</span>
            <h3>Limit Orders</h3>
            <p>Set automated trades at your target price</p>
            <button className="dex-coming-soon-btn">Coming Soon</button>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="dex-history">
          {transactions.filter(tx => tx.type === 'swap').length === 0 ? (
            <div className="dex-empty-state">
              <span className="dex-empty-icon">📋</span>
              <h3>No Trade History</h3>
              <p>Your swap transactions will appear here</p>
            </div>
          ) : (
            <div className="dex-history-list">
              {transactions
                .filter(tx => tx.type === 'swap')
                .map((tx, idx) => (
                  <div key={idx} className="dex-history-item">
                    <div className="dex-history-info">
                      <span className={`dex-history-status dex-history-status--${tx.status}`}>
                        {tx.status}
                      </span>
                      <span className="dex-history-date">
                        {new Date(tx.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <div className="dex-history-amount">
                      {tx.amount} {tx.token}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* Token Selector Modal */}
      {showTokenSelector && (
        <div className="dex-modal-overlay" onClick={() => setShowTokenSelector(null)}>
          <div className="dex-modal" onClick={e => e.stopPropagation()}>
            <div className="dex-modal-header">
              <h3>Select Token</h3>
              <button className="dex-modal-close" onClick={() => setShowTokenSelector(null)}>✕</button>
            </div>
            <input
              type="text"
              className="dex-search-input"
              placeholder="Search tokens..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <div className="dex-token-list">
              {filteredTokens.map(token => (
                <button
                  key={token}
                  className="dex-token-item"
                  onClick={() => {
                    if (showTokenSelector === 'from') {
                      setFromToken(token)
                    } else {
                      setToToken(token)
                    }
                    setShowTokenSelector(null)
                    setSearchQuery('')
                  }}
                >
                  <span className="token-icon">{TOKEN_ICONS[token] || token[0]}</span>
                  <span className="token-name">{token}</span>
                  <span className="token-balance">
                    {(chainBalances[token] || 0).toFixed(4)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
