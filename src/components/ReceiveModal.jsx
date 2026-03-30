import { useState } from 'react'
import { useWallet } from '../hooks/useWallet'
import { DWT } from '../utils/dwt'

const NETWORK_LABELS = {
  ethereum: {
    name: 'Ethereum Mainnet',
    color: '#627EEA',
    icon: '⟠',
    warning: 'Only send ETH & ERC-20 tokens',
  },
  sepolia: {
    name: 'Ethereum Sepolia',
    color: '#6366f1',
    icon: '⬡',
    warning: 'Testnet only — no real value',
  },
  baseSepolia: {
    name: 'Base Sepolia Testnet',
    color: '#0052FF',
    icon: '🔵',
    warning: 'Testnet only — no real value',
  },
  base: {
    name: 'Base Mainnet',
    color: '#0052FF',
    icon: '🔵',
    warning: 'Only send ETH & Base tokens',
  },
  bnb: {
    name: 'BNB Chain',
    color: '#F0B90B',
    icon: '⬡',
    warning: 'Only send BNB & BEP-20 tokens',
  },
  polygon: {
    name: 'Polygon',
    color: '#8247E5',
    icon: '◈',
    warning: 'Only send MATIC & Polygon tokens',
  },
  arbitrum: {
    name: 'Arbitrum',
    color: '#12AAFF',
    icon: '🔵',
    warning: 'Only send ETH & Arbitrum tokens',
  },
}

// Build a real-looking QR using address bytes
function QRCode({ address }) {
  if (!address) return null
  const size = 21
  const cells = []
  const hex = address.slice(2).padEnd((size * size) / 4, '0')

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      // Finder patterns — fixed corners
      const inFinder =
        (r < 7 && c < 7) || (r < 7 && c >= size - 7) || (r >= size - 7 && c < 7)
      const inFinderInner =
        (r >= 1 && r <= 5 && c >= 1 && c <= 5) ||
        (r >= 1 && r <= 5 && c >= size - 6 && c <= size - 2) ||
        (r >= size - 6 && r <= size - 2 && c >= 1 && c <= 5)
      const finderCenter =
        (r >= 2 && r <= 4 && c >= 2 && c <= 4) ||
        (r >= 2 && r <= 4 && c >= size - 5 && c <= size - 3) ||
        (r >= size - 5 && r <= size - 3 && c >= 2 && c <= 4)

      let filled
      if (inFinder) filled = !inFinderInner || finderCenter
      else {
        const idx = (r * size + c) % hex.length
        filled = parseInt(hex[idx], 16) > 7
      }
      if (filled) cells.push({ r, c })
    }
  }

  const cellSize = 160 / size
  return (
    <svg width="160" height="160" style={{ borderRadius: 8 }}>
      <rect width="160" height="160" fill="white" />
      {cells.map(({ r, c }, i) => (
        <rect
          key={i}
          x={c * cellSize + 0.5}
          y={r * cellSize + 0.5}
          width={cellSize - 0.5}
          height={cellSize - 0.5}
          fill="#111"
          rx={0.5}
        />
      ))}
    </svg>
  )
}

export default function ReceiveModal({ onClose }) {
  const { currentAddress, activeChain } = useWallet()
  const [copied, setCopied] = useState(false)
  const [showDWT, setShowDWT] = useState(false)

  const net = NETWORK_LABELS[activeChain] || NETWORK_LABELS.ethereum
  const dwtAddr = DWT.addresses[activeChain] || DWT.addresses.sepolia
  const displayAddr = showDWT ? dwtAddr : currentAddress
  const isTestnet = activeChain === 'sepolia' || activeChain === 'baseSepolia'

  const copy = addr => {
    navigator.clipboard.writeText(addr || currentAddress)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Receive</h2>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="modal-body center">
          {/* Network badge */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '5px 12px',
              borderRadius: 20,
              marginBottom: 14,
              background: isTestnet ? 'rgba(245,158,11,0.1)' : 'var(--bg3)',
              border:
                '1px solid ' +
                (isTestnet ? 'rgba(245,158,11,0.3)' : 'var(--border)'),
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: net.color,
                flexShrink: 0,
              }}
            />
            <span
              style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)' }}
            >
              {net.name}
            </span>
          </div>

          {/* Toggle wallet/DWT */}
          {(DWT.addresses[activeChain] || DWT.addresses.sepolia) && (
            <div
              style={{
                display: 'flex',
                gap: 4,
                marginBottom: 16,
                background: 'var(--bg3)',
                padding: 3,
                borderRadius: 10,
                border: '1px solid var(--border)',
              }}
            >
              {[
                { label: 'My Wallet', val: false },
                { label: 'DWT Token ◈', val: true },
              ].map(opt => (
                <button
                  key={String(opt.val)}
                  onClick={() => setShowDWT(opt.val)}
                  style={{
                    flex: 1,
                    padding: '6px 0',
                    borderRadius: 8,
                    border: 'none',
                    background: showDWT === opt.val ? 'var(--accent)' : 'none',
                    color: showDWT === opt.val ? 'white' : 'var(--text2)',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'var(--font)',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}

          {/* QR Code */}
          <div
            style={{
              padding: 12,
              background: 'white',
              borderRadius: 12,
              boxShadow: '0 2px 12px rgba(0,0,0,0.1)',
              marginBottom: 16,
              display: 'inline-block',
            }}
          >
            <QRCode address={displayAddr} />
          </div>

          {showDWT && (
            <div
              style={{
                padding: '8px 12px',
                marginBottom: 10,
                background: 'rgba(99,102,241,0.08)',
                border: '1px solid rgba(99,102,241,0.2)',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  margin: '0 0 2px',
                  color: 'var(--accent)',
                }}
              >
                ◈ DWT Contract Address
              </p>
              <p style={{ fontSize: 10, color: 'var(--text3)', margin: 0 }}>
                Share this address to receive DWT tokens on {net.name}
              </p>
            </div>
          )}

          {/* Address */}
          <div
            style={{
              padding: '10px 14px',
              marginBottom: 12,
              background: 'var(--bg3)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              width: '100%',
              boxSizing: 'border-box',
            }}
          >
            <p
              style={{
                fontSize: 11,
                fontFamily: 'var(--font-mono)',
                color: 'var(--text)',
                margin: 0,
                wordBreak: 'break-all',
                lineHeight: 1.6,
                textAlign: 'center',
              }}
            >
              {displayAddr}
            </p>
          </div>

          {/* Copy button */}
          <button
            className={`btn-primary full-width ${copied ? 'btn-success' : ''}`}
            onClick={() => copy(displayAddr)}
            style={
              copied
                ? { background: 'var(--green)', borderColor: 'var(--green)' }
                : {}
            }
          >
            {copied
              ? '✓ Copied!'
              : `Copy ${showDWT ? 'Contract' : 'Wallet'} Address`}
          </button>

          {/* Warning */}
          <div
            style={{
              marginTop: 12,
              padding: '8px 12px',
              background: isTestnet
                ? 'rgba(245,158,11,0.08)'
                : 'rgba(239,68,68,0.06)',
              border:
                '1px solid ' +
                (isTestnet ? 'rgba(245,158,11,0.2)' : 'rgba(239,68,68,0.15)'),
              borderRadius: 'var(--radius-sm)',
            }}
          >
            <p
              style={{
                fontSize: 11,
                margin: 0,
                color: isTestnet ? 'var(--amber)' : 'var(--red)',
                lineHeight: 1.5,
              }}
            >
              {isTestnet
                ? '⚠️ Testnet — tokens have no real value'
                : `⚠️ ${net.warning}`}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
