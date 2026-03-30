import { useState, useEffect } from 'react'
import {
  getAlerts,
  addAlert,
  deleteAlert,
  requestNotificationPermission,
  checkAlerts,
} from '../utils/priceAlerts'
import { fetchMarketData } from '../utils/market'

const COINS = [
  { symbol: 'BTC', name: 'Bitcoin', icon: '₿' },
  { symbol: 'ETH', name: 'Ethereum', icon: '⟠' },
  { symbol: 'SOL', name: 'Solana', icon: '◎' },
  { symbol: 'BNB', name: 'BNB', icon: '🔶' },
  { symbol: 'XRP', name: 'XRP', icon: '✕' },
  { symbol: 'MATIC', name: 'Polygon', icon: '⬡' },
  { symbol: 'AVAX', name: 'Avalanche', icon: '🔺' },
  { symbol: 'LINK', name: 'Chainlink', icon: '🔗' },
  { symbol: 'DOT', name: 'Polkadot', icon: '●' },
  { symbol: 'DOGE', name: 'Dogecoin', icon: 'Ð' },
]

export default function PriceAlertsPanel() {
  const [alerts, setAlerts] = useState(getAlerts())
  const [symbol, setSymbol] = useState('BTC')
  const [threshold, setThreshold] = useState('')
  const [direction, setDirection] = useState('below')
  const [permStatus, setPermStatus] = useState(
    Notification?.permission || 'default',
  )
  const [prices, setPrices] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Load live prices
  useEffect(() => {
    fetchMarketData()
      .then(data => {
        const p = {}
        data.forEach(coin => {
          p[coin.symbol.toUpperCase()] = coin.current_price
        })
        setPrices(p)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // Check alerts every 60s
  useEffect(() => {
    if (Object.keys(prices).length === 0) return
    checkAlerts(prices)
    const t = setInterval(() => {
      fetchMarketData()
        .then(data => {
          const p = {}
          data.forEach(coin => {
            p[coin.symbol.toUpperCase()] = coin.current_price
          })
          setPrices(p)
          checkAlerts(p)
        })
        .catch(() => {})
    }, 60_000)
    return () => clearInterval(t)
  }, [prices])

  const handleEnableNotifications = async () => {
    const status = await requestNotificationPermission()
    setPermStatus(status)
  }

  const handleAddAlert = async () => {
    setError('')
    setSuccess('')
    const val = parseFloat(threshold)
    if (!threshold || isNaN(val) || val <= 0) {
      return setError('Enter a valid price above 0')
    }
    if (permStatus !== 'granted') {
      return setError('Enable notifications first to receive price alerts')
    }
    setSaving(true)
    addAlert(symbol, val, direction)
    setAlerts(getAlerts())
    setThreshold('')
    setSuccess(
      `Alert set — you will be notified when ${symbol} goes ${direction} $${val.toLocaleString()}`,
    )
    setTimeout(() => setSuccess(''), 4000)
    setSaving(false)
  }

  const handleDelete = id => {
    deleteAlert(id)
    setAlerts(getAlerts())
  }

  const currentPrice = prices[symbol]
  const selectedCoin = COINS.find(c => c.symbol === symbol)

  return (
    <div className="view-container">
      <div className="view-header">
        <h2 className="view-title">Price Alerts</h2>
        {loading && (
          <span style={{ fontSize: 11, color: 'var(--text3)' }}>
            Fetching prices...
          </span>
        )}
      </div>

      {/* Notification permission banner */}
      {permStatus !== 'granted' && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '12px 14px',
            marginBottom: 16,
            background: 'rgba(245,158,11,0.08)',
            border: '1px solid rgba(245,158,11,0.3)',
            borderRadius: 'var(--radius-sm)',
          }}
        >
          <span style={{ fontSize: 18, flexShrink: 0 }}>🔔</span>
          <div style={{ flex: 1 }}>
            <p
              style={{
                fontSize: 12,
                fontWeight: 700,
                margin: 0,
                color: 'var(--amber)',
              }}
            >
              Enable notifications to receive alerts
            </p>
            <p
              style={{ fontSize: 11, color: 'var(--text3)', margin: '2px 0 0' }}
            >
              Toklo uses browser push notifications to alert you when prices
              move
            </p>
          </div>
          <button
            onClick={handleEnableNotifications}
            style={{
              background: 'var(--amber)',
              color: 'white',
              border: 'none',
              borderRadius: 6,
              padding: '6px 12px',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'var(--font)',
              flexShrink: 0,
            }}
          >
            Enable
          </button>
        </div>
      )}

      {permStatus === 'granted' && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 12px',
            marginBottom: 16,
            background: 'rgba(16,185,129,0.08)',
            border: '1px solid rgba(16,185,129,0.2)',
            borderRadius: 'var(--radius-sm)',
          }}
        >
          <span style={{ color: 'var(--green)', fontSize: 14 }}>✓</span>
          <span
            style={{ fontSize: 12, color: 'var(--green)', fontWeight: 600 }}
          >
            Notifications enabled — alerts will fire even when the tab is in the
            background
          </span>
        </div>
      )}

      {/* Alert creation form */}
      <div
        style={{
          background: 'var(--bg2)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          padding: 16,
          marginBottom: 16,
        }}
      >
        <p
          style={{
            fontSize: 13,
            fontWeight: 700,
            margin: '0 0 14px',
            color: 'var(--text)',
          }}
        >
          Create new alert
        </p>

        {/* Coin selector */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label
              style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)' }}
            >
              Coin
            </label>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(5,1fr)',
                gap: 6,
              }}
            >
              {COINS.map(c => (
                <button
                  key={c.symbol}
                  onClick={() => {
                    setSymbol(c.symbol)
                    setError('')
                  }}
                  style={{
                    padding: '8px 4px',
                    background:
                      symbol === c.symbol ? 'var(--accent)' : 'var(--bg3)',
                    color: symbol === c.symbol ? 'white' : 'var(--text2)',
                    border:
                      '1px solid ' +
                      (symbol === c.symbol ? 'var(--accent)' : 'var(--border)'),
                    borderRadius: 8,
                    cursor: 'pointer',
                    fontSize: 11,
                    fontWeight: symbol === c.symbol ? 700 : 400,
                    fontFamily: 'var(--font)',
                    transition: 'all 0.15s',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 2,
                  }}
                >
                  <span style={{ fontSize: 14 }}>{c.icon}</span>
                  <span>{c.symbol}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Current price display */}
          {currentPrice && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                background: 'var(--bg3)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              <span style={{ fontSize: 12, color: 'var(--text3)' }}>
                Current {symbol} price
              </span>
              <span
                style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}
              >
                $
                {currentPrice.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
          )}

          {/* Direction selector */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label
              style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)' }}
            >
              Alert when price goes
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { val: 'below', label: '📉 Below', color: 'var(--red)' },
                { val: 'above', label: '📈 Above', color: 'var(--green)' },
              ].map(d => (
                <button
                  key={d.val}
                  onClick={() => setDirection(d.val)}
                  style={{
                    flex: 1,
                    padding: '10px 8px',
                    background:
                      direction === d.val ? d.color + '18' : 'var(--bg3)',
                    color: direction === d.val ? d.color : 'var(--text2)',
                    border:
                      '1px solid ' +
                      (direction === d.val ? d.color + '60' : 'var(--border)'),
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: direction === d.val ? 700 : 400,
                    fontFamily: 'var(--font)',
                    transition: 'all 0.15s',
                  }}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Price input */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label
              style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)' }}
            >
              Target price (USD)
            </label>
            <div style={{ position: 'relative' }}>
              <span
                style={{
                  position: 'absolute',
                  left: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: 14,
                  color: 'var(--text3)',
                  fontWeight: 600,
                }}
              >
                $
              </span>
              <input
                className="field"
                type="number"
                min="0"
                step="any"
                placeholder="e.g. 50000"
                value={threshold}
                onChange={e => {
                  setThreshold(e.target.value)
                  setError('')
                }}
                onKeyDown={e => e.key === 'Enter' && handleAddAlert()}
                style={{ paddingLeft: 28 }}
              />
            </div>
            {/* Helper: how far from current price */}
            {threshold && currentPrice && !isNaN(parseFloat(threshold)) && (
              <p style={{ fontSize: 11, color: 'var(--text3)', margin: 0 }}>
                {parseFloat(threshold) > currentPrice
                  ? `${(((parseFloat(threshold) - currentPrice) / currentPrice) * 100).toFixed(1)}% above current price`
                  : `${(((currentPrice - parseFloat(threshold)) / currentPrice) * 100).toFixed(1)}% below current price`}
              </p>
            )}
          </div>

          {error && (
            <p className="error-msg" style={{ margin: 0 }}>
              {error}
            </p>
          )}
          {success && (
            <div
              style={{
                padding: '8px 12px',
                background: 'rgba(16,185,129,0.08)',
                border: '1px solid rgba(16,185,129,0.2)',
                borderRadius: 'var(--radius-sm)',
                fontSize: 12,
                color: 'var(--green)',
                fontWeight: 600,
              }}
            >
              ✓ {success}
            </div>
          )}

          <button
            className="btn-primary full-width"
            onClick={handleAddAlert}
            disabled={
              saving || !threshold.trim() || isNaN(parseFloat(threshold))
            }
          >
            {saving ? 'Saving...' : `Set Alert for ${symbol}`}
          </button>
        </div>
      </div>

      {/* Active alerts list */}
      {alerts.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '32px 20px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <span style={{ fontSize: 36 }}>🔕</span>
          <p
            style={{
              fontSize: 13,
              fontWeight: 600,
              margin: 0,
              color: 'var(--text)',
            }}
          >
            No active alerts
          </p>
          <p style={{ fontSize: 12, color: 'var(--text3)', margin: 0 }}>
            Create an alert above to get notified when prices move
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          <p
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--text3)',
              margin: '0 0 8px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            Active alerts ({alerts.length})
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {alerts.map(alert => {
              const coin = COINS.find(c => c.symbol === alert.symbol)
              const cp = prices[alert.symbol]
              const isAbove = alert.direction === 'above'
              const triggered = cp
                ? isAbove
                  ? cp >= alert.threshold
                  : cp <= alert.threshold
                : false
              return (
                <div
                  key={alert.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px 14px',
                    background: triggered
                      ? 'rgba(245,158,11,0.08)'
                      : 'var(--bg2)',
                    border:
                      '1px solid ' +
                      (triggered ? 'rgba(245,158,11,0.3)' : 'var(--border)'),
                    borderRadius: 'var(--radius-sm)',
                  }}
                >
                  {/* Coin icon */}
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: '50%',
                      background: isAbove
                        ? 'rgba(16,185,129,0.12)'
                        : 'rgba(239,68,68,0.12)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 18,
                      flexShrink: 0,
                    }}
                  >
                    {coin?.icon || alert.symbol[0]}
                  </div>

                  {/* Alert info */}
                  <div style={{ flex: 1 }}>
                    <div
                      style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: 'var(--text)',
                        }}
                      >
                        {alert.symbol}
                      </span>
                      <span
                        style={{
                          fontSize: 10,
                          padding: '2px 7px',
                          borderRadius: 10,
                          fontWeight: 700,
                          background: isAbove
                            ? 'rgba(16,185,129,0.15)'
                            : 'rgba(239,68,68,0.15)',
                          color: isAbove ? 'var(--green)' : 'var(--red)',
                        }}
                      >
                        {isAbove ? '📈 ABOVE' : '📉 BELOW'}
                      </span>
                      {triggered && (
                        <span
                          style={{
                            fontSize: 10,
                            padding: '2px 7px',
                            borderRadius: 10,
                            background: 'rgba(245,158,11,0.2)',
                            color: 'var(--amber)',
                            fontWeight: 700,
                          }}
                        >
                          ⚡ TRIGGERED
                        </span>
                      )}
                    </div>
                    <p
                      style={{
                        fontSize: 12,
                        color: 'var(--text3)',
                        margin: '3px 0 0',
                      }}
                    >
                      Target:{' '}
                      <strong style={{ color: 'var(--text)' }}>
                        ${alert.threshold.toLocaleString()}
                      </strong>
                      {cp && (
                        <span style={{ marginLeft: 8, color: 'var(--text3)' }}>
                          · Now: $
                          {cp.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      )}
                    </p>
                  </div>

                  {/* Delete */}
                  <button
                    onClick={() => handleDelete(alert.id)}
                    style={{
                      background: 'none',
                      border: '1px solid var(--border)',
                      color: 'var(--text3)',
                      borderRadius: 6,
                      width: 30,
                      height: 30,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      fontSize: 13,
                      flexShrink: 0,
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.color = 'var(--red)'
                      e.currentTarget.style.borderColor = 'rgba(239,68,68,0.4)'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.color = 'var(--text3)'
                      e.currentTarget.style.borderColor = 'var(--border)'
                    }}
                  >
                    ✕
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
