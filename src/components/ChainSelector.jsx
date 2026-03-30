import { useWallet } from '../hooks/useWallet'
import { CHAINS } from '../data/chains'

export default function ChainSelector({ onClose }) {
  const { activeChain, setActiveChain } = useWallet()

  const handleSelect = chainId => {
    setActiveChain(chainId)
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal small-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Select Network</h2>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="modal-body">
          <div className="chain-list">
            {Object.values(CHAINS).map(chain => (
              <button
                key={chain.id}
                className={`chain-option ${activeChain === chain.id ? 'chain-option--active' : ''}`}
                onClick={() => handleSelect(chain.id)}
              >
                <div className="chain-option-left">
                  <span
                    className="chain-option-dot"
                    style={{ background: chain.color }}
                  />
                  <div>
                    <p className="chain-option-name">{chain.name}</p>
                    <p className="chain-option-id">
                      Chain ID: {chain.chainId ?? '—'}
                    </p>
                  </div>
                </div>
                {activeChain === chain.id && (
                  <span className="chain-check">✓</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
