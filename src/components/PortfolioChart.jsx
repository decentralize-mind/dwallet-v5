import { useState, useEffect, useRef, useMemo } from 'react'
import { fetchPriceHistory } from '../utils/prices'

const PERIODS = [
  { label: '24H', days: 1 },
  { label: '7D', days: 7 },
  { label: '30D', days: 30 },
  { label: '90D', days: 90 },
]

export default function PortfolioChart({ balances, prices }) {
  const canvasRef = useRef(null)
  const [period, setPeriod] = useState('7D')
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const days = PERIODS.find(p => p.label === period)?.days || 7
    // Fetch ETH price history as baseline for portfolio performance
    fetchPriceHistory('ETH', days).then(hist => {
      if (!hist || hist.length < 2) {
        setLoading(false)
        return
      }
      
      // If we have balances and prices, calculate portfolio value history
      if (balances && prices && Object.keys(balances).length > 0) {
        // Calculate current portfolio value
        let currentPortfolioValue = 0
        Object.entries(balances).forEach(([token, balance]) => {
          const tokenPrice = prices[token] || 0
          currentPortfolioValue += balance * tokenPrice
        })
        
        // Scale the ETH history to match portfolio value
        const ethPriceNow = hist[hist.length - 1].price
        const scaleFactor = currentPortfolioValue / ethPriceNow
        
        const portfolioHistory = hist.map(point => ({
          timestamp: point.timestamp,
          price: point.price * scaleFactor,
        }))
        
        setHistory(portfolioHistory)
      } else {
        setHistory(hist)
      }
      
      setLoading(false)
    })
  }, [period, balances, prices])

  useEffect(() => {
    if (!canvasRef.current || history.length < 2) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)

    const w = rect.width
    const h = rect.height
    const prices = history.map(p => p.price)
    const min = Math.min(...prices)
    const max = Math.max(...prices)
    const range = max - min || 1

    ctx.clearRect(0, 0, w, h)

    // Bg gradient
    const grad = ctx.createLinearGradient(0, 0, 0, h)
    grad.addColorStop(0, 'rgba(99, 102, 241, 0.1)')
    grad.addColorStop(1, 'rgba(99, 102, 241, 0)')

    ctx.beginPath()
    ctx.moveTo(0, h)
    history.forEach((p, i) => {
      const x = (i / (history.length - 1)) * w
      const y = h - ((p.price - min) / range) * h
      ctx.lineTo(x, y)
    })
    ctx.lineTo(w, h)
    ctx.closePath()
    ctx.fillStyle = grad
    ctx.fill()

    ctx.beginPath()
    ctx.lineWidth = 2
    ctx.strokeStyle = '#6366f1'
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'
    history.forEach((p, i) => {
      const x = (i / (history.length - 1)) * w
      const y = h - ((p.price - min) / range) * h
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    ctx.stroke()
  }, [history])

  const { value, change } = useMemo(() => {
    if (history.length < 2) return { value: '$0.00', change: '0.00%' }
    const last = history[history.length - 1].price
    const first = history[0].price
    const diff = ((last - first) / first) * 100
    
    // Calculate actual portfolio value from balances
    let portfolioValue = 0
    if (balances && prices) {
      Object.entries(balances).forEach(([token, balance]) => {
        const tokenPrice = prices[token] || 0
        portfolioValue += balance * tokenPrice
      })
    }
    
    return {
      value: `$${portfolioValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      change: `${diff >= 0 ? '+' : ''}${diff.toFixed(2)}%`,
    }
  }, [history, balances, prices])

  return (
    <div style={{
      background: "var(--bg3)",
      border: "1px solid var(--border)",
      borderRadius: "var(--radius)",
      padding: "12px",
      marginBottom: "12px"
    }}>
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: "10px"
      }}>
        <div>
          <p style={{
            fontSize: "11px",
            color: "var(--text3)",
            margin: "0 0 4px 0",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.3px"
          }}>Portfolio Performance</p>
          <div style={{
            display: "flex",
            alignItems: "baseline",
            gap: "8px"
          }}>
            <h3 style={{
              fontSize: "18px",
              fontWeight: 800,
              margin: 0,
              color: "var(--text)"
            }}>{value}</h3>
            {(() => {
              const chgNum = parseFloat(change.replace(/%/g, ''));
              return (
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: 700,
                    color: chgNum >= 0 ? 'var(--green)' : 'var(--red)',
                    background: chgNum >= 0 ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                    padding: "2px 6px",
                    borderRadius: "4px"
                  }}
                >
                  {change}
                </span>
              )
            })()}
          </div>
        </div>
        <div style={{
          display: "flex",
          gap: "4px"
        }}>
          {PERIODS.map(p => (
            <button
              key={p.label}
              style={{
                background: period === p.label ? 'var(--accent)' : 'transparent',
                border: "1px solid " + (period === p.label ? 'var(--accent)' : 'var(--border)'),
                borderRadius: "8px",
                padding: "4px 8px",
                fontSize: "10px",
                fontWeight: 600,
                cursor: "pointer",
                color: period === p.label ? 'white' : 'var(--text3)',
                fontFamily: "var(--font)",
                transition: "all 0.12s"
              }}
              onClick={() => setPeriod(p.label)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{
        height: "60px",
        position: "relative"
      }}>
        {loading ? (
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "60px"
          }}>
            <div className="wc-spinner" />
          </div>
        ) : (
          <canvas 
            ref={canvasRef} 
            style={{
              width: "100%",
              height: "100%",
              display: "block"
            }} 
          />
        )}
      </div>
    </div>
  )
}
