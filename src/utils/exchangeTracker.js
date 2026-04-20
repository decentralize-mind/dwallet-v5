// Exchange Transaction Tracker
// Features: History management, analytics, export functionality

// ─────────────────────────────────────────────────────────────────────
//  EXCHANGE HISTORY MANAGEMENT
// ─────────────────────────────────────────────────────────────────────

const EXCHANGE_HISTORY_KEY = 'dwallet_exchange_history'
const MAX_HISTORY_ITEMS = 200

/**
 * Get exchange transaction history
 */
export function getExchangeHistory(options = {}) {
  const { limit = 50, filter = 'all' } = options
  
  try {
    const history = JSON.parse(localStorage.getItem(EXCHANGE_HISTORY_KEY) || '[]')
    
    // Apply filter
    let filtered = history
    if (filter !== 'all') {
      filtered = history.filter(tx => tx.status === filter)
    }
    
    // Apply limit
    return filtered.slice(0, limit)
  } catch (error) {
    console.error('Failed to load exchange history:', error)
    return []
  }
}

/**
 * Add transaction to exchange history
 */
export function addToExchangeHistory(transaction) {
  try {
    const history = getExchangeHistory({ limit: MAX_HISTORY_ITEMS })
    
    const txEntry = {
      id: transaction.hash || `tx_${Date.now()}`,
      hash: transaction.hash,
      fromToken: transaction.fromToken,
      toToken: transaction.toToken,
      fromAmount: transaction.fromAmount,
      toAmount: transaction.toAmount,
      rate: transaction.rate,
      priceImpact: transaction.priceImpact,
      timestamp: transaction.timestamp || Date.now(),
      status: transaction.status || 'pending',
      chain: transaction.chain || 'ethereum',
      gasUsed: transaction.gasUsed,
      gasPrice: transaction.gasPrice,
      feeUSD: transaction.feeUSD,
    }
    
    // Add to beginning of history
    history.unshift(txEntry)
    
    // Trim to max size
    if (history.length > MAX_HISTORY_ITEMS) {
      history.length = MAX_HISTORY_ITEMS
    }
    
    localStorage.setItem(EXCHANGE_HISTORY_KEY, JSON.stringify(history))
    
    return txEntry
  } catch (error) {
    console.error('Failed to save exchange history:', error)
    return null
  }
}

/**
 * Update transaction status in history
 */
export function updateExchangeTransaction(hash, updates) {
  try {
    const history = getExchangeHistory({ limit: MAX_HISTORY_ITEMS })
    
    const index = history.findIndex(tx => tx.hash === hash)
    if (index === -1) {
      return false
    }
    
    history[index] = {
      ...history[index],
      ...updates,
      updatedAt: Date.now(),
    }
    
    localStorage.setItem(EXCHANGE_HISTORY_KEY, JSON.stringify(history))
    return true
  } catch (error) {
    console.error('Failed to update transaction:', error)
    return false
  }
}

/**
 * Clear exchange history
 */
export function clearExchangeHistory() {
  try {
    localStorage.removeItem(EXCHANGE_HISTORY_KEY)
    return true
  } catch (error) {
    console.error('Failed to clear history:', error)
    return false
  }
}

// ─────────────────────────────────────────────────────────────────────
//  EXCHANGE ANALYTICS
// ─────────────────────────────────────────────────────────────────────

/**
 * Get exchange statistics and analytics
 */
export function getExchangeAnalytics() {
  try {
    const history = getExchangeHistory({ limit: MAX_HISTORY_ITEMS })
    
    if (history.length === 0) {
      return {
        totalExchanges: 0,
        totalVolume: 0,
        avgAmount: 0,
        successRate: 0,
        popularPairs: [],
        recentActivity: [],
      }
    }
    
    // Calculate statistics
    const successful = history.filter(tx => tx.status === 'confirmed')
    const totalVolume = successful.reduce((sum, tx) => {
      return sum + (tx.fromAmount * getTokenPriceUSD(tx.fromToken) || 0)
    }, 0)
    
    const avgAmount = successful.length > 0 
      ? totalVolume / successful.length 
      : 0
    
    // Get popular trading pairs
    const pairCounts = {}
    successful.forEach(tx => {
      const pair = `${tx.fromToken}/${tx.toToken}`
      pairCounts[pair] = (pairCounts[pair] || 0) + 1
    })
    
    const popularPairs = Object.entries(pairCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([pair, count]) => ({ pair, count }))
    
    // Recent activity (last 7 days)
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000)
    const recentActivity = history.filter(tx => tx.timestamp > sevenDaysAgo)
    
    return {
      totalExchanges: history.length,
      successfulExchanges: successful.length,
      failedExchanges: history.length - successful.length,
      totalVolume: totalVolume.toFixed(2),
      avgAmount: avgAmount.toFixed(2),
      successRate: ((successful.length / history.length) * 100).toFixed(1),
      popularPairs,
      recentActivity: recentActivity.length,
      lastExchange: history[0]?.timestamp || null,
    }
  } catch (error) {
    console.error('Failed to get analytics:', error)
    return {
      totalExchanges: 0,
      totalVolume: 0,
      avgAmount: 0,
      successRate: 0,
      popularPairs: [],
      recentActivity: 0,
    }
  }
}

/**
 * Get token price in USD (fallback)
 */
function getTokenPriceUSD(token) {
  const prices = {
    ETH: 3200,
    USDC: 1,
    USDT: 1,
    DAI: 1,
    WBTC: 65000,
    UNI: 8,
    LINK: 15,
    BNB: 420,
    MATIC: 0.85,
  }
  return prices[token] || 0
}

// ─────────────────────────────────────────────────────────────────────
//  EXPORT FUNCTIONALITY
// ─────────────────────────────────────────────────────────────────────

/**
 * Export exchange history to CSV
 */
export function exportExchangeHistoryToCSV() {
  try {
    const history = getExchangeHistory({ limit: MAX_HISTORY_ITEMS })
    
    if (history.length === 0) {
      return { success: false, error: 'No transactions to export' }
    }
    
    const headers = [
      'Date',
      'Time',
      'From Token',
      'From Amount',
      'To Token',
      'To Amount',
      'Exchange Rate',
      'Price Impact (%)',
      'Status',
      'Chain',
      'Gas Used',
      'Fee (USD)',
      'Transaction Hash',
    ]
    
    const rows = history.map(tx => {
      const date = new Date(tx.timestamp)
      const dateStr = date.toISOString().split('T')[0]
      const timeStr = date.toTimeString().split(' ')[0]
      
      return [
        dateStr,
        timeStr,
        tx.fromToken,
        tx.fromAmount,
        tx.toToken,
        tx.toAmount,
        tx.rate,
        tx.priceImpact?.toFixed(2) || '0',
        tx.status,
        tx.chain,
        tx.gasUsed || '0',
        tx.feeUSD || '0',
        tx.hash || '',
      ]
        .map(v => `"${String(v).replace(/"/g, '""')}"`)
        .join(',')
    })
    
    const csv = [headers.map(h => `"${h}"`).join(','), ...rows].join('\n')
    
    // Download CSV
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    const date = new Date().toISOString().split('T')[0]
    
    link.href = url
    link.download = `exchange-history-${date}.csv`
    
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    
    return { success: true, count: history.length }
  } catch (error) {
    console.error('Failed to export history:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Export exchange history to JSON
 */
export function exportExchangeHistoryToJSON() {
  try {
    const history = getExchangeHistory({ limit: MAX_HISTORY_ITEMS })
    
    if (history.length === 0) {
      return { success: false, error: 'No transactions to export' }
    }
    
    const json = JSON.stringify(history, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    const date = new Date().toISOString().split('T')[0]
    
    link.href = url
    link.download = `exchange-history-${date}.json`
    
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    
    return { success: true, count: history.length }
  } catch (error) {
    console.error('Failed to export history:', error)
    return { success: false, error: error.message }
  }
}

// ─────────────────────────────────────────────────────────────────────
//  IMPORT FUNCTIONALITY
// ─────────────────────────────────────────────────────────────────────

/**
 * Import exchange history from JSON file
 */
export function importExchangeHistory(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result)
        
        if (!Array.isArray(data)) {
          reject(new Error('Invalid file format'))
          return
        }
        
        // Validate transactions
        const validTransactions = data.filter(tx => 
          tx.fromToken && 
          tx.toToken && 
          tx.fromAmount &&
          tx.timestamp
        )
        
        if (validTransactions.length === 0) {
          reject(new Error('No valid transactions found'))
          return
        }
        
        // Merge with existing history
        const existing = getExchangeHistory({ limit: MAX_HISTORY_ITEMS })
        const merged = [...validTransactions, ...existing]
          .slice(0, MAX_HISTORY_ITEMS)
        
        localStorage.setItem(EXCHANGE_HISTORY_KEY, JSON.stringify(merged))
        
        resolve({
          success: true,
          imported: validTransactions.length,
          total: merged.length,
        })
      } catch (error) {
        reject(error)
      }
    }
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'))
    }
    
    reader.readAsText(file)
  })
}

// ─────────────────────────────────────────────────────────────────────
//  SEARCH & FILTER
// ─────────────────────────────────────────────────────────────────────

/**
 * Search exchange history
 */
export function searchExchangeHistory(query, options = {}) {
  const { limit = 50 } = options
  
  try {
    const history = getExchangeHistory({ limit: MAX_HISTORY_ITEMS })
    
    if (!query || query.trim() === '') {
      return history.slice(0, limit)
    }
    
    const searchQuery = query.toLowerCase().trim()
    
    const filtered = history.filter(tx => {
      return (
        tx.hash?.toLowerCase().includes(searchQuery) ||
        tx.fromToken?.toLowerCase().includes(searchQuery) ||
        tx.toToken?.toLowerCase().includes(searchQuery) ||
        tx.chain?.toLowerCase().includes(searchQuery) ||
        tx.status?.toLowerCase().includes(searchQuery)
      )
    })
    
    return filtered.slice(0, limit)
  } catch (error) {
    console.error('Failed to search history:', error)
    return []
  }
}

/**
 * Filter exchange history by date range
 */
export function filterExchangeHistoryByDate(startDate, endDate) {
  try {
    const history = getExchangeHistory({ limit: MAX_HISTORY_ITEMS })
    
    return history.filter(tx => {
      const txDate = tx.timestamp
      return txDate >= startDate && txDate <= endDate
    })
  } catch (error) {
    console.error('Failed to filter by date:', error)
    return []
  }
}

/**
 * Filter exchange history by token pair
 */
export function filterExchangeHistoryByPair(fromToken, toToken) {
  try {
    const history = getExchangeHistory({ limit: MAX_HISTORY_ITEMS })
    
    return history.filter(tx => {
      const fromMatch = !fromToken || tx.fromToken === fromToken
      const toMatch = !toToken || tx.toToken === toToken
      return fromMatch && toMatch
    })
  } catch (error) {
    console.error('Failed to filter by pair:', error)
    return []
  }
}

// ─────────────────────────────────────────────────────────────────────
//  TAX REPORTING
// ─────────────────────────────────────────────────────────────────────

/**
 * Generate tax report for exchanges
 */
export function generateTaxReport(year) {
  try {
    const history = getExchangeHistory({ limit: MAX_HISTORY_ITEMS })
    
    const startOfYear = new Date(year, 0, 1).getTime()
    const endOfYear = new Date(year + 1, 0, 1).getTime()
    
    const yearlyTransactions = history.filter(tx => {
      return tx.timestamp >= startOfYear && tx.timestamp < endOfYear
    })
    
    const report = {
      year,
      totalExchanges: yearlyTransactions.length,
      exchanges: yearlyTransactions.map(tx => ({
        date: new Date(tx.timestamp).toISOString().split('T')[0],
        fromToken: tx.fromToken,
        fromAmount: tx.fromAmount,
        toToken: tx.toToken,
        toAmount: tx.toAmount,
        rate: tx.rate,
        fromValueUSD: tx.fromAmount * getTokenPriceUSD(tx.fromToken),
        toValueUSD: tx.toAmount * getTokenPriceUSD(tx.toToken),
        gain: (tx.toAmount * getTokenPriceUSD(tx.toToken)) - 
              (tx.fromAmount * getTokenPriceUSD(tx.fromToken)),
      })),
      summary: {
        totalFromValueUSD: yearlyTransactions.reduce((sum, tx) => 
          sum + (tx.fromAmount * getTokenPriceUSD(tx.fromToken)), 0
        ).toFixed(2),
        totalToValueUSD: yearlyTransactions.reduce((sum, tx) => 
          sum + (tx.toAmount * getTokenPriceUSD(tx.toToken)), 0
        ).toFixed(2),
        netGain: yearlyTransactions.reduce((sum, tx) => 
          sum + ((tx.toAmount * getTokenPriceUSD(tx.toToken)) - 
                 (tx.fromAmount * getTokenPriceUSD(tx.fromToken))), 0
        ).toFixed(2),
      }
    }
    
    return report
  } catch (error) {
    console.error('Failed to generate tax report:', error)
    return null
  }
}
