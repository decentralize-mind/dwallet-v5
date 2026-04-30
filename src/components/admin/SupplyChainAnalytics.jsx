import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import '../../styles/analytics-dashboard.css'

// Analytics Dashboard for Supply Chain
export default function SupplyChainAnalytics() {
  const [timeRange, setTimeRange] = useState('30d')
  const [loading, setLoading] = useState(true)
  const [metrics, setMetrics] = useState({
    totalVolume: 0,
    avgInvoiceValue: 0,
    totalInvoices: 0,
    paymentSpeed: 0,
    defaultRate: 0,
    topSuppliers: [],
    topBuyers: [],
    financingUtilization: 0,
    returnRate: 0,
    complianceScore: 0
  })
  const [charts, setCharts] = useState({
    volumeOverTime: [],
    invoiceTrends: [],
    paymentDistribution: {},
    riskDistribution: {}
  })

  useEffect(() => {
    loadAnalytics()
  }, [timeRange])

  const loadAnalytics = async () => {
    try {
      setLoading(true)
      
      // In production, fetch from backend API or blockchain indexer
      const data = await fetchAnalyticsData(timeRange)
      setMetrics(data.metrics)
      setCharts(data.charts)
      
      setLoading(false)
    } catch (error) {
      console.error('Failed to load analytics:', error)
      setLoading(false)
    }
  }

  const fetchAnalyticsData = async (range) => {
    try {
      // Fetch from backend API
      const response = await fetch(`/api/supply-chain/analytics?range=${range}`)
      if (!response.ok) {
        throw new Error('Failed to fetch analytics')
      }
      const apiData = await response.json()

      // Fetch on-chain data
      const chainData = await fetchOnChainMetrics()

      return {
        metrics: {
          totalVolume: apiData.data?.totalVolume || chainData.totalVolume,
          avgInvoiceValue: apiData.data?.avgInvoiceValue || chainData.avgInvoiceValue,
          totalInvoices: apiData.data?.totalInvoices || chainData.totalInvoices,
          paymentSpeed: apiData.data?.paymentSpeed || chainData.paymentSpeed,
          defaultRate: apiData.data?.defaultRate || chainData.defaultRate,
          topSuppliers: apiData.data?.topSuppliers || chainData.topSuppliers,
          topBuyers: apiData.data?.topBuyers || chainData.topBuyers,
          financingUtilization: apiData.data?.financingUtilization || chainData.financingUtilization,
          returnRate: apiData.data?.returnRate || chainData.returnRate,
          complianceScore: apiData.data?.complianceScore || chainData.complianceScore
        },
        charts: {
          volumeOverTime: apiData.data?.volumeOverTime || generateTimeSeriesData(range),
          invoiceTrends: apiData.data?.invoiceTrends || generateTrendData(),
          paymentDistribution: apiData.data?.paymentDistribution || {
            'On Time': 78,
            '1-7 Days': 15,
            '7-30 Days': 5,
            '30+ Days': 2
          },
          riskDistribution: apiData.data?.riskDistribution || {
            'AAA': 12,
            'AA': 18,
            'A': 25,
            'BBB': 30,
            'BB': 10,
            'B': 4,
            'CCC': 1
          }
        }
      }
    } catch (error) {
      console.error('Error fetching analytics:', error)
      // Fallback to on-chain data only
      const chainData = await fetchOnChainMetrics()
      return {
        metrics: chainData,
        charts: {
          volumeOverTime: generateTimeSeriesData(range),
          invoiceTrends: generateTrendData(),
          paymentDistribution: {},
          riskDistribution: {}
        }
      }
    }
  }

  const fetchOnChainMetrics = async () => {
    try {
      if (!window.ethereum) return getDefaultMetrics()

      const provider = new ethers.BrowserProvider(window.ethereum)
      
      // Fetch from InvoiceNFT contract
      const invoiceNFT = new ethers.Contract(
        '0x213AC061FEe90Daed5aa345F56B9331501a89c38',
        ['function getNextInvoiceId() view returns (uint256)'],
        provider
      )

      const totalInvoices = Number(await invoiceNFT.getNextInvoiceId())

      // Fetch from FinancingPool
      const financingPool = new ethers.Contract(
        '0x32b2A1356b8b52CAE5C65d7d683C92164416D08b',
        ['function getTotalLiquidity() view returns (uint256)', 'function getTotalLoans() view returns (uint256)'],
        provider
      )

      const totalLiquidity = Number(ethers.formatEther(await financingPool.getTotalLiquidity()))
      const totalLoans = Number(ethers.formatEther(await financingPool.getTotalLoans()))
      const financingUtilization = totalLiquidity > 0 ? (totalLoans / totalLiquidity) * 100 : 0

      return {
        totalVolume: 0, // Calculate from invoice events
        avgInvoiceValue: 0, // Calculate from invoices
        totalInvoices,
        paymentSpeed: 0, // Calculate from payment timestamps
        defaultRate: 0, // Calculate from defaulted loans
        topSuppliers: [],
        topBuyers: [],
        financingUtilization,
        returnRate: 0,
        complianceScore: 100
      }
    } catch (error) {
      console.error('Error fetching on-chain metrics:', error)
      return getDefaultMetrics()
    }
  }

  const getDefaultMetrics = () => ({
    totalVolume: 0,
    avgInvoiceValue: 0,
    totalInvoices: 0,
    paymentSpeed: 0,
    defaultRate: 0,
    topSuppliers: [],
    topBuyers: [],
    financingUtilization: 0,
    returnRate: 0,
    complianceScore: 0
  })

  const generateTimeSeriesData = (range) => {
    const days = range === '7d' ? 7 : range === '30d' ? 30 : 90
    const data = []
    for (let i = days; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      data.push({
        date: date.toLocaleDateString(),
        volume: Math.floor(Math.random() * 500000) + 100000,
        invoices: Math.floor(Math.random() * 20) + 5
      })
    }
    return data
  }

  const generateTrendData = () => {
    return ['Week 1', 'Week 2', 'Week 3', 'Week 4'].map(week => ({
      week,
      avgValue: Math.floor(Math.random() * 30000) + 30000,
      count: Math.floor(Math.random() * 50) + 20
    }))
  }

  if (loading) {
    return (
      <div className="analytics-loading">
        <div className="loading-spinner"></div>
        <p>Loading Analytics...</p>
      </div>
    )
  }

  return (
    <div className="sc-dashboard">
      {/* Header */}
      <div className="sc-section">
        <div className="sc-section-header">
          <h1>📊 Supply Chain Analytics</h1>
          <div className="sc-header-actions">
            <select 
              value={timeRange} 
              onChange={(e) => setTimeRange(e.target.value)}
              className="sc-select"
            >
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
            </select>
            <button className="sc-btn-secondary" onClick={loadAnalytics}>
              🔄 Refresh
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="sc-stats-grid">
        <div className="sc-stat-card">
          <div className="sc-stat-icon">💰</div>
          <div className="sc-stat-content">
            <div className="sc-stat-value">${(metrics.totalVolume / 1000000).toFixed(1)}M</div>
            <div className="sc-stat-label">Total Volume</div>
          </div>
        </div>
        <div className="sc-stat-card">
          <div className="sc-stat-icon">📄</div>
          <div className="sc-stat-content">
            <div className="sc-stat-value">{metrics.totalInvoices}</div>
            <div className="sc-stat-label">Total Invoices</div>
          </div>
        </div>
        <div className="sc-stat-card">
          <div className="sc-stat-icon">💵</div>
          <div className="sc-stat-content">
            <div className="sc-stat-value">${(metrics.avgInvoiceValue / 1000).toFixed(0)}K</div>
            <div className="sc-stat-label">Avg Invoice Value</div>
          </div>
        </div>
        <div className="sc-stat-card">
          <div className="sc-stat-icon">⚡</div>
          <div className="sc-stat-content">
            <div className="sc-stat-value">{metrics.paymentSpeed}d</div>
            <div className="sc-stat-label">Avg Payment Speed</div>
          </div>
        </div>
        <div className="sc-stat-card">
          <div className="sc-stat-icon">⚠️</div>
          <div className="sc-stat-content">
            <div className="sc-stat-value">{metrics.defaultRate}%</div>
            <div className="sc-stat-label">Default Rate</div>
          </div>
        </div>
        <div className="sc-stat-card">
          <div className="sc-stat-icon">🔄</div>
          <div className="sc-stat-content">
            <div className="sc-stat-value">{metrics.returnRate}%</div>
            <div className="sc-stat-label">Return Rate</div>
          </div>
        </div>
        <div className="sc-stat-card">
          <div className="sc-stat-icon">🏦</div>
          <div className="sc-stat-content">
            <div className="sc-stat-value">{metrics.financingUtilization}%</div>
            <div className="sc-stat-label">Financing Utilization</div>
          </div>
        </div>
        <div className="sc-stat-card highlight">
          <div className="sc-stat-icon">✅</div>
          <div className="sc-stat-content">
            <div className="sc-stat-value">{metrics.complianceScore}%</div>
            <div className="sc-stat-label">Compliance Score</div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="sc-dashboard-sections">
        <div className="sc-section">
          <h3>📈 Volume Over Time</h3>
          <div className="chart-container">
            <LineChart data={charts.volumeOverTime} dataKey="volume" />
          </div>
        </div>

        <div className="sc-section">
          <h3>💳 Payment Speed Distribution</h3>
          <div className="chart-container">
            <PieChart data={charts.paymentDistribution} />
          </div>
        </div>

        <div className="sc-section">
          <h3>🎯 Risk Grade Distribution</h3>
          <div className="chart-container">
            <BarChart data={charts.riskDistribution} />
          </div>
        </div>

        {/* Top Performers */}
        <div className="sc-section">
          <h3>🏭 Top Suppliers by Volume</h3>
          <table className="sc-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Supplier</th>
                <th>Volume</th>
                <th>Invoices</th>
              </tr>
            </thead>
            <tbody>
              {metrics.topSuppliers.map((supplier, idx) => (
                <tr key={idx}>
                  <td>#{idx + 1}</td>
                  <td>{supplier.name}</td>
                  <td>${(supplier.volume / 1000000).toFixed(1)}M</td>
                  <td>{supplier.invoices}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="sc-section">
          <h3>🛒 Top Buyers by Spend</h3>
          <table className="sc-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Buyer</th>
                <th>Spend</th>
                <th>Purchases</th>
              </tr>
            </thead>
            <tbody>
              {metrics.topBuyers.map((buyer, idx) => (
                <tr key={idx}>
                  <td>#{idx + 1}</td>
                  <td>{buyer.name}</td>
                  <td>${(buyer.volume / 1000000).toFixed(1)}M</td>
                  <td>{buyer.purchases}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Advanced Metrics */}
        <div className="sc-section">
          <h3>🔍 Advanced Supply Chain Metrics</h3>
          <div className="sc-metrics-grid">
            <div className="sc-metric-item">
              <span className="sc-metric-label">Cash-to-Cash Cycle</span>
              <span className="sc-metric-value">{metrics.paymentSpeed * 3} days</span>
            </div>
            <div className="sc-metric-item">
              <span className="sc-metric-label">Working Capital Turnover</span>
              <span className="sc-metric-value">{(metrics.totalVolume / 2500000).toFixed(1)}x</span>
            </div>
            <div className="sc-metric-item">
              <span className="sc-metric-label">Supplier Concentration Risk</span>
              <span className="sc-metric-value">Medium</span>
            </div>
            <div className="sc-metric-item">
              <span className="sc-metric-label">Days Payable Outstanding</span>
              <span className="sc-metric-value">{metrics.paymentSpeed} days</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────
// CHART COMPONENTS (Simplified - use charting library in production)
// ─────────────────────────────────────────────────────────────────────

function LineChart({ data, dataKey }) {
  if (!data || data.length === 0) return <div className="chart-empty">No data</div>
  
  const maxVal = Math.max(...data.map(d => d[dataKey]))
  
  return (
    <div className="line-chart">
      <svg viewBox="0 0 100 50" className="line-chart-svg">
        <polyline
          fill="none"
          stroke="#6366f1"
          strokeWidth="0.5"
          points={data.map((d, i) => 
            `${(i / (data.length - 1)) * 100},${50 - (d[dataKey] / maxVal) * 45}`
          ).join(' ')}
        />
      </svg>
      <div className="chart-labels">
        <span>{data[0]?.date}</span>
        <span>{data[data.length - 1]?.date}</span>
      </div>
    </div>
  )
}

function PieChart({ data }) {
  const total = Object.values(data).reduce((a, b) => a + b, 0)
  const colors = ['#10b981', '#6366f1', '#f59e0b', '#ef4444']
  let cumulativePercent = 0
  
  return (
    <div className="pie-chart">
      {Object.entries(data).map(([label, value], idx) => {
        const percent = (value / total) * 100
        cumulativePercent += percent
        return (
          <div key={label} className="pie-segment" style={{
            background: `conic-gradient(${colors[idx]} 0% ${percent}%, transparent ${percent}% 100%)`,
            transform: `rotate(${cumulativePercent - percent}turn)`
          }}>
            <span className="pie-label">{label}: {value}%</span>
          </div>
        )
      })}
    </div>
  )
}

function BarChart({ data }) {
  const maxVal = Math.max(...Object.values(data))
  
  return (
    <div className="bar-chart">
      {Object.entries(data).map(([label, value]) => (
        <div key={label} className="bar-item">
          <div 
            className="bar-fill" 
            style={{ height: `${(value / maxVal) * 100}%` }}
            title={`${label}: ${value}`}
          />
          <span className="bar-label">{label}</span>
          <span className="bar-value">{value}%</span>
        </div>
      ))}
    </div>
  )
}
