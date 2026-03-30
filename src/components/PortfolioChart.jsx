import { useState, useEffect, useRef, useMemo } from 'react'
import { fetchPriceHistory } from '../utils/prices'

const PERIODS = [
  { label: '24H', days: 1 },
  { label: '7D', days: 7 },
  { label: '30D', days: 30 },
  { label: '90D', days: 90 },
]

export default function PortfolioChart({ balances }) {
  const canvasRef = useRef(null)
  const [period, setPeriod] = useState('7D')
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const days = PERIODS.find(p => p.label === period)?.days || 7
    fetchPriceHistory('ETH', days).then(hist => {
      if (!hist || hist.length < 2) {
        setLoading(false)
        return
      }
      setHistory(hist)
      setLoading(false)
    })
  }, [period])

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
    const val = balances?.ETH ? balances.ETH * last : 0
    return {
      value: `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      change: `${diff >= 0 ? '+' : ''}${diff.toFixed(2)}%`,
    }
  }, [history, balances])

  return (
    <div className="chart-container">
      <div className="chart-header">
        <div className="chart-header-left">
          <p className="chart-header-label">ETH Performance</p>
          <div className="chart-header-row">
            <h3 className="chart-header-title">{value}</h3>
            {(() => {
              const chgNum = parseFloat(change.replace(/%/g, ''));
              return (
                <span
                  className="chart-header-value"
                  style={{
                    color: chgNum >= 0 ? 'var(--green)' : 'var(--red)',
                  }}
                >
                  {change}
                </span>
              )
            })()}
          </div>
        </div>
        <div className="chart-periods">
          {PERIODS.map(p => (
            <button
              key={p.label}
              className={`chart-period-btn ${period === p.label ? 'active' : ''}`}
              onClick={() => setPeriod(p.label)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="chart-main">
        {loading ? (
          <div className="chart-loading">
            <div className="wc-spinner" />
          </div>
        ) : (
          <canvas ref={canvasRef} className="portfolio-canvas" />
        )}
      </div>
    </div>
  )
}
