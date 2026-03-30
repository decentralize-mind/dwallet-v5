import { useState, useEffect, useCallback } from 'react'

const GAS_HISTORY_KEY = 'toklo_gas_history'

const CHAINS = [
  {
    id: 'ethereum',
    name: 'Ethereum',
    symbol: 'ETH',
    icon: '⟠',
    color: '#6366f1',
  },
  {
    id: 'polygon',
    name: 'Polygon',
    symbol: 'MATIC',
    icon: '⬡',
    color: '#8b5cf6',
  },
  { id: 'bnb', name: 'BNB Chain', symbol: 'BNB', icon: '🔶', color: '#f59e0b' },
  {
    id: 'arbitrum',
    name: 'Arbitrum',
    symbol: 'ETH',
    icon: '🔵',
    color: '#3b82f6',
  },
]

const FREE_RPCS = {
  ethereum: 'https://ethereum.publicnode.com',
  polygon: 'https://polygon-rpc.com',
  bnb: 'https://bsc-dataseed1.binance.org',
  arbitrum: 'https://arb1.arbitrum.io/rpc',
}

function saveGasHistory(chain, gwei) {
  try {
    const all = JSON.parse(localStorage.getItem(GAS_HISTORY_KEY) || '{}')
    if (!all[chain]) all[chain] = []
    all[chain].push({ gwei: parseFloat(gwei), ts: Date.now() })
    const cutoff = Date.now() - 24 * 60 * 60 * 1000
    all[chain] = all[chain].filter(h => h.ts > cutoff).slice(-48)
    localStorage.setItem(GAS_HISTORY_KEY, JSON.stringify(all))
  } catch (e) {
    // Storage full or restricted
  }
}

function getGasHistory(chain) {
  try {
    const all = JSON.parse(localStorage.getItem(GAS_HISTORY_KEY) || '{}')
    return all[chain] || []
  } catch {
    return []
  }
}

function getGasLevel(gwei) {
  const g = parseFloat(gwei)
  if (g <= 10)
    return {
      label: 'Low',
      color: 'var(--green)',
      bg: 'rgba(16,185,129,0.1)',
      tip: 'Great time to transact — fees are very low',
    }
  if (g <= 25)
    return {
      label: 'Normal',
      color: 'var(--accent)',
      bg: 'rgba(99,102,241,0.1)',
      tip: 'Typical gas — go ahead and transact',
    }
  if (g <= 50)
    return {
      label: 'High',
      color: 'var(--amber)',
      bg: 'rgba(245,158,11,0.1)',
      tip: 'Fees are elevated — consider waiting',
    }
  return {
    label: 'Very High',
    color: 'var(--red)',
    bg: 'rgba(239,68,68,0.1)',
    tip: 'Very high fees — wait for lower gas if possible',
  }
}

async function fetchGasPrice(chainId) {
  const rpc = FREE_RPCS[chainId] || FREE_RPCS.ethereum
  try {
    const res = await fetch(rpc, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_gasPrice',
        params: [],
        id: 1,
      }),
    })
    const data = await res.json()
    const hex = data?.result
    if (!hex) throw new Error('No result')
    const wei = parseInt(hex, 16)
    const gwei = (wei / 1e9).toFixed(2)
    const ethCost = ((wei * 21000) / 1e18).toFixed(6)
    return { gwei, ethCost, ok: true }
  } catch {
    // Fallback estimate
    const fallbacks = {
      ethereum: '18',
      polygon: '60',
      bnb: '3',
      arbitrum: '0.1',
    }
    const gwei = fallbacks[chainId] || '20'
    const ethCost = ((parseFloat(gwei) * 1e9 * 21000) / 1e18).toFixed(6)
    return { gwei, ethCost, ok: false }
  }
}

export default function GasTracker() {
  const [chain, setChain] = useState('ethereum')
  const [gasInfo, setGasInfo] = useState({ gwei: '—', ethCost: '—', ok: true })
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState(null)

  const refresh = useCallback(async (c = chain) => {
    setLoading(true)
    const gas = await fetchGasPrice(c)
    setGasInfo(gas)
    if (gas.ok) {
      saveGasHistory(c, gas.gwei)
    }
    setHistory(getGasHistory(c))
    setLastUpdate(new Date())
    setLoading(false)
  }, [chain])

  useEffect(() => {
    setTimeout(() => {
      setHistory(getGasHistory(chain))
    }, 0)
    const doRefresh = async () => {
      await refresh(chain)
    }
    doRefresh()
  }, [chain, refresh])

  useEffect(() => {
    const t = setInterval(() => refresh(chain), 30_000)
    return () => clearInterval(t)
  }, [chain, refresh])

  const level = getGasLevel(gasInfo.gwei)
  const chainData = CHAINS.find(c => c.id === chain)
  const hist = history.slice(-16)
  const maxG = Math.max(...hist.map(h => h.gwei), 1)
  const minG = Math.min(...hist.map(h => h.gwei), 0)

  const txTypes = [
    { label: 'Simple transfer', mult: 1, icon: '↗' },
    { label: 'Token transfer', mult: 3, icon: '⇄' },
    { label: 'Token swap', mult: 8, icon: '🔄' },
    { label: 'NFT mint', mult: 10, icon: '🖼' },
    { label: 'Smart contract', mult: 15, icon: '📜' },
  ]

  return (
    <div className="view-container">
      <div
        className="view-header"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <h2 className="view-title">Gas Tracker</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {lastUpdate && (
            <span style={{ fontSize: 10, color: 'var(--text3)' }}>
              {lastUpdate.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          )}
          <button
            onClick={() => refresh(chain)}
            disabled={loading}
            style={{
              background: 'var(--bg3)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              padding: '5px 10px',
              fontSize: 13,
              cursor: 'pointer',
              color: 'var(--text2)',
              fontFamily: 'var(--font)',
              opacity: loading ? 0.5 : 1,
              transition: 'opacity 0.2s',
            }}
          >
            {loading ? '...' : '↺ Refresh'}
          </button>
        </div>
      </div>

      {/* Chain tabs */}
      <div
        style={{
          display: 'flex',
          gap: 6,
          marginBottom: 16,
          overflowX: 'auto',
          paddingBottom: 2,
        }}
      >
        {CHAINS.map(c => (
          <button
            key={c.id}
            onClick={() => setChain(c.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '7px 12px',
              borderRadius: 'var(--radius-sm)',
              background: chain === c.id ? c.color + '18' : 'var(--bg3)',
              border:
                '1px solid ' +
                (chain === c.id ? c.color + '60' : 'var(--border)'),
              color: chain === c.id ? c.color : 'var(--text2)',
              fontSize: 12,
              fontWeight: chain === c.id ? 700 : 400,
              cursor: 'pointer',
              fontFamily: 'var(--font)',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              transition: 'all 0.15s',
            }}
          >
            <span>{c.icon}</span>
            <span>{c.name}</span>
          </button>
        ))}
      </div>

      {/* Main gas display card */}
      <div
        style={{
          background: level.bg,
          border: '1px solid ' + level.color + '40',
          borderRadius: 'var(--radius-sm)',
          padding: 20,
          marginBottom: 16,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Offline warning */}
        {!gasInfo.ok && (
          <div
            style={{
              fontSize: 10,
              color: 'var(--amber)',
              marginBottom: 8,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <span>⚠️</span>
            <span>Using estimated value — network unavailable</span>
          </div>
        )}

        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            marginBottom: 8,
          }}
        >
          {/* Gwei value */}
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span
                style={{
                  fontSize: 52,
                  fontWeight: 800,
                  color: level.color,
                  lineHeight: 1,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {loading ? '—' : gasInfo.gwei}
              </span>
              <span
                style={{ fontSize: 16, color: 'var(--text3)', fontWeight: 600 }}
              >
                Gwei
              </span>
            </div>
            <p
              style={{
                fontSize: 12,
                color: 'var(--text2)',
                margin: '6px 0 0',
                lineHeight: 1.5,
              }}
            >
              {level.tip}
            </p>
          </div>

          {/* Level badge */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <div
              style={{
                padding: '6px 14px',
                borderRadius: 20,
                background: level.color,
                color: 'white',
                fontSize: 12,
                fontWeight: 700,
                whiteSpace: 'nowrap',
              }}
            >
              {level.label}
            </div>
            <span style={{ fontSize: 10, color: 'var(--text3)' }}>
              {chainData?.name}
            </span>
          </div>
        </div>
      </div>

      {/* Transaction cost breakdown */}
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
            fontSize: 12,
            fontWeight: 700,
            margin: '0 0 12px',
            color: 'var(--text)',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          Estimated fees ({chainData?.symbol})
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {txTypes.map(tx => {
            const cost =
              loading || gasInfo.ethCost === '—'
                ? '—'
                : (parseFloat(gasInfo.ethCost) * tx.mult).toFixed(6)
            const lvl = getGasLevel(gasInfo.gwei)
            return (
              <div
                key={tx.label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '7px 10px',
                  background: 'var(--bg3)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 14 }}>{tx.icon}</span>
                  <span style={{ fontSize: 12, color: 'var(--text2)' }}>
                    {tx.label}
                  </span>
                </div>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: loading ? 'var(--text3)' : lvl.color,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  ~{cost} {chainData?.symbol}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* 24h history chart */}
      {hist.length > 1 && (
        <div
          style={{
            background: 'var(--bg2)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            padding: 16,
            marginBottom: 16,
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 12,
            }}
          >
            <p
              style={{
                fontSize: 12,
                fontWeight: 700,
                margin: 0,
                color: 'var(--text)',
              }}
            >
              24h history
            </p>
            <div
              style={{
                display: 'flex',
                gap: 12,
                fontSize: 10,
                color: 'var(--text3)',
              }}
            >
              <span>
                Low: {Math.min(...hist.map(h => h.gwei)).toFixed(1)} Gwei
              </span>
              <span>
                High: {Math.max(...hist.map(h => h.gwei)).toFixed(1)} Gwei
              </span>
            </div>
          </div>

          {/* Bar chart */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              gap: 3,
              height: 60,
              paddingBottom: 4,
            }}
          >
            {hist.map((h, i) => {
              const pct = ((h.gwei - minG) / (maxG - minG || 1)) * 100
              const lvl = getGasLevel(h.gwei)
              const isLatest = i === hist.length - 1
              return (
                <div
                  key={i}
                  title={h.gwei + ' Gwei'}
                  style={{
                    flex: 1,
                    minWidth: 4,
                    height: Math.max(pct, 8) + '%',
                    background: isLatest ? lvl.color : lvl.color + '70',
                    borderRadius: '2px 2px 0 0',
                    transition: 'height 0.3s',
                    cursor: 'default',
                    border: isLatest ? '1px solid ' + lvl.color : 'none',
                  }}
                />
              )
            })}
          </div>

          {/* X axis labels */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: 4,
              fontSize: 9,
              color: 'var(--text3)',
            }}
          >
            <span>Oldest</span>
            <span>Now</span>
          </div>
        </div>
      )}

      {/* Best time to transact */}
      <div
        style={{
          background: 'rgba(99,102,241,0.06)',
          border: '1px solid rgba(99,102,241,0.15)',
          borderRadius: 'var(--radius-sm)',
          padding: 14,
        }}
      >
        <p
          style={{
            fontSize: 12,
            fontWeight: 700,
            margin: '0 0 8px',
            color: 'var(--accent)',
          }}
        >
          💡 Best times to transact
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[
            ['🟢', 'Weekends (Sat–Sun)', '30–50% lower gas on average'],
            [
              '🟢',
              'Weekday nights (UTC 00:00–08:00)',
              'US and EU markets asleep',
            ],
            [
              '🔴',
              'Weekday afternoons (UTC 14:00–20:00)',
              'US + EU markets overlap — highest fees',
            ],
            ['🟡', 'Monday mornings', 'Fees spike as markets open'],
          ].map(([dot, time, note]) => (
            <div
              key={time}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 8,
              }}
            >
              <span style={{ fontSize: 10, marginTop: 1, flexShrink: 0 }}>
                {dot}
              </span>
              <div>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: 'var(--text2)',
                  }}
                >
                  {time}
                </span>
                <span
                  style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 6 }}
                >
                  {note}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
