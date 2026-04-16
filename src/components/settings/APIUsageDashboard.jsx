import { useState, useEffect } from 'react'
import { getAPIUsageStats, clearAPIUsage, clearAllCaches } from '../utils/market'
import { serviceHealth } from '../utils/errorHandling'

/**
 * API Usage Dashboard Component
 * Displays real-time API usage statistics and cache management
 */
export default function APIUsageDashboard({ className = '' }) {
  const [stats, setStats] = useState(null)
  const [healthData, setHealthData] = useState(null)
  const [lastUpdate, setLastUpdate] = useState(null)

  useEffect(() => {
    refreshStats()
    // Auto-refresh every 30 seconds
    const interval = setInterval(refreshStats, 30000)
    return () => clearInterval(interval)
  }, [])

  const refreshStats = () => {
    setStats(getAPIUsageStats())
    setHealthData(serviceHealth.getHealthSummary())
    setLastUpdate(new Date())
  }

  const handleClearUsage = () => {
    if (window.confirm('Clear all API usage tracking data?')) {
      clearAPIUsage()
      refreshStats()
    }
  }

  const handleClearCaches = () => {
    if (window.confirm('Clear all cached data? This will force fresh API calls.')) {
      clearAllCaches()
      refreshStats()
    }
  }

  const handleResetHealth = () => {
    if (window.confirm('Reset service health metrics?')) {
      serviceHealth.resetAll()
      refreshStats()
    }
  }

  if (!stats) {
    return (
      <div className={`p-4 text-center text-slate-400 ${className}`}>
        Loading API statistics...
      </div>
    )
  }

  // Calculate usage percentages
  const cmcUsage = stats.today.coinmarketcap || 0
  const defiLlamaUsage = stats.today.defi_llama || 0
  const defiLlamaMarketUsage = stats.today.defi_llama_market || 0
  const defiLlamaHistoryUsage = stats.today.defi_llama_history || 0
  const totalDefiLlama = defiLlamaUsage + defiLlamaMarketUsage + defiLlamaHistoryUsage
  
  const cmcPercentage = (cmcUsage / 10000) * 100
  const cmcWarning = cmcUsage >= 8000
  const cmcCritical = cmcUsage >= 9500

  const formatTime = (date) => {
    if (!date) return 'Never'
    return date.toLocaleTimeString()
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-100">
          🔧 API Usage Dashboard
        </h2>
        <button
          onClick={refreshStats}
          className="px-3 py-1 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
        >
          🔄 Refresh
        </button>
      </div>

      <p className="text-xs text-slate-400">
        Last updated: {formatTime(lastUpdate)}
      </p>

      {/* CoinMarketCap Usage */}
      <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-slate-200">
            💰 CoinMarketCap API
          </h3>
          <span className={`text-xs font-mono px-2 py-1 rounded ${
            cmcCritical ? 'bg-red-500/20 text-red-400' :
            cmcWarning ? 'bg-yellow-500/20 text-yellow-400' :
            'bg-green-500/20 text-green-400'
          }`}>
            {cmcUsage.toLocaleString()} / 10,000
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-3 bg-slate-700 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              cmcCritical ? 'bg-red-500' :
              cmcWarning ? 'bg-yellow-500' :
              'bg-green-500'
            }`}
            style={{ width: `${Math.min(cmcPercentage, 100)}%` }}
          />
        </div>

        <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
          <span>{cmcPercentage.toFixed(1)}% used</span>
          <span>{(10000 - cmcUsage).toLocaleString()} calls remaining</span>
        </div>

        {cmcWarning && (
          <div className={`mt-3 p-2 rounded-lg text-xs ${
            cmcCritical ? 'bg-red-500/10 border border-red-500/30' : 'bg-yellow-500/10 border border-yellow-500/30'
          }`}>
            ⚠️ {cmcCritical ? 'CRITICAL' : 'WARNING'}: Approaching rate limit!
            {cmcCritical && ' Consider upgrading your plan or reducing API calls.'}
          </div>
        )}
      </div>

      {/* DeFi Llama Usage */}
      <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-slate-200">
            🦙 DeFi Llama API
          </h3>
          <span className="text-xs font-mono px-2 py-1 rounded bg-green-500/20 text-green-400">
            UNLIMITED ✨
          </span>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">Price Fetches</span>
            <span className="text-slate-200 font-mono">{defiLlamaUsage}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">Market Data</span>
            <span className="text-slate-200 font-mono">{defiLlamaMarketUsage}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">Price History</span>
            <span className="text-slate-200 font-mono">{defiLlamaHistoryUsage}</span>
          </div>
          <div className="border-t border-slate-700 pt-2 flex items-center justify-between text-sm font-medium">
            <span className="text-slate-300">Total Today</span>
            <span className="text-green-400 font-mono">{totalDefiLlama}</span>
          </div>
        </div>

        <div className="mt-3 p-2 rounded-lg text-xs bg-green-500/10 border border-green-500/30 text-green-400">
          ✅ DeFi Llama is FREE with no rate limits!
        </div>
      </div>

      {/* Total API Calls */}
      <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700">
        <h3 className="text-sm font-medium text-slate-200 mb-3">
          📊 Today's Summary
        </h3>
        <div className="text-3xl font-bold text-indigo-400 font-mono">
          {stats.totalToday.toLocaleString()}
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Total API calls today
        </p>
      </div>

      {/* Service Health */}
      {healthData && (
        <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700">
          <h3 className="text-sm font-medium text-slate-200 mb-3">
            🏥 Service Health
          </h3>
          <div className="space-y-2">
            {Object.entries(healthData.services || {}).map(([service, data]) => (
              <div key={service} className="flex items-center justify-between text-sm">
                <span className="text-slate-400 capitalize">
                  {service.replace(/_/g, ' ')}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-slate-300 font-mono text-xs">
                    {data.avgResponseTime?.toFixed(0)}ms
                  </span>
                  <span className={`px-2 py-0.5 rounded text-xs ${
                    data.successRate >= 95 ? 'bg-green-500/20 text-green-400' :
                    data.successRate >= 80 ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>
                    {data.successRate.toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cache Management */}
      <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700">
        <h3 className="text-sm font-medium text-slate-200 mb-3">
          🗃️ Cache Management
        </h3>
        <div className="space-y-2">
          <button
            onClick={handleClearCaches}
            className="w-full px-3 py-2 text-sm bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg transition-colors"
          >
            🗑️ Clear All Caches
          </button>
          <button
            onClick={handleClearUsage}
            className="w-full px-3 py-2 text-sm bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg transition-colors"
          >
            📊 Reset Usage Tracking
          </button>
          <button
            onClick={handleResetHealth}
            className="w-full px-3 py-2 text-sm bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg transition-colors"
          >
            🏥 Reset Health Metrics
          </button>
        </div>
      </div>

      {/* 7-Day History */}
      {Object.keys(stats.history).length > 1 && (
        <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700">
          <h3 className="text-sm font-medium text-slate-200 mb-3">
            📅 7-Day History
          </h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {Object.entries(stats.history)
              .sort((a, b) => b[0].localeCompare(a[0]))
              .slice(0, 7)
              .map(([date, usage]) => {
                const total = Object.values(usage).reduce((sum, count) => sum + count, 0)
                return (
                  <div key={date} className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">{date}</span>
                    <span className="text-slate-200 font-mono">{total.toLocaleString()} calls</span>
                  </div>
                )
              })}
          </div>
        </div>
      )}
    </div>
  )
}
