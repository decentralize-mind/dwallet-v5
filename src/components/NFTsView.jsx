import { useState, useEffect } from 'react'
import { useWallet } from '../hooks/useWallet'
import { fetchNFTs } from '../utils/blockchain'

const MOCK_NFTS = [
  {
    id: '1',
    name: 'CryptoPunk #4821',
    collection: 'CryptoPunks',
    image: '👾',
    chain: 'ethereum',
    standard: 'ERC-721',
    floor: '68.5 ETH',
  },
  {
    id: '2',
    name: 'Bored Ape #9381',
    collection: 'BAYC',
    image: '🐒',
    chain: 'ethereum',
    standard: 'ERC-721',
    floor: '12.2 ETH',
  },
  {
    id: '3',
    name: 'Azuki #2042',
    collection: 'Azuki',
    image: '🌸',
    chain: 'ethereum',
    standard: 'ERC-721',
    floor: '4.8 ETH',
  },
  {
    id: '4',
    name: 'DeGod #1337',
    collection: 'DeGods',
    image: '👑',
    chain: 'solana',
    standard: 'SPL',
    floor: '18 SOL',
  },
]

export default function NFTsView() {
  const { currentAddress } = useWallet()
  const [nfts, setNfts] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    if (!currentAddress) return
    fetchNFTs(currentAddress)
      .then(result => {
        if (!result) {
          setNfts(MOCK_NFTS)
          return
        }
        setNfts(result)
      })
      .finally(() => setLoading(false))
  }, [currentAddress])

  return (
    <div className="view-container">
      <div className="view-header">
        <h2 className="view-title">NFTs</h2>
        <span className="view-count">{nfts.length} items</span>
      </div>

      {(() => {
        if (loading) {
          return (
            <div className="yield-loading">
              <div className="wc-spinner" />
              <p>Loading NFTs...</p>
            </div>
          )
        }
        if (nfts.length === 0) {
          return (
            <div className="empty-state-big">
              <p className="empty-icon">◇</p>
              <p>No NFTs found in this wallet</p>
            </div>
          )
        }
        return (
          <div className="nft-grid">
            {nfts.map(nft => (
              <div
                key={nft.id}
                className={`nft-card ${selected?.id === nft.id ? 'active' : ''}`}
                onClick={() => setSelected(nft)}
              >
                <div className="nft-image">
                  {(() => {
                    const img = nft.image || ''
                    if (img.startsWith('http') || img.startsWith('ipfs')) {
                      return (
                        <img
                          src={img.replace('ipfs://', 'https://ipfs.io/ipfs/')}
                          alt={nft.name}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                          }}
                          onError={e => {
                            e.target.style.display = 'none'
                          }}
                        />
                      )
                    }
                    return img || '◇'
                  })()}
                </div>
                <div className="nft-info">
                  <p className="nft-name">{nft.name}</p>
                  <p className="nft-collection">{nft.collection}</p>
                  {nft.floor && <p className="nft-floor">Floor: {nft.floor}</p>}
                </div>
              </div>
            ))}
          </div>
        )
      })()}

      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{selected.name}</h2>
              <button className="modal-close" onClick={() => setSelected(null)}>
                ✕
              </button>
            </div>
            <div className="modal-body center">
              <div className="nft-detail-image">
                {selected.image?.startsWith('http') ? (
                  <img
                    src={selected.image}
                    alt={selected.name}
                    style={{ maxWidth: '160px', borderRadius: '12px' }}
                  />
                ) : (
                  selected.image
                )}
              </div>
              <p className="nft-detail-collection">{selected.collection}</p>
              <div className="nft-detail-attrs">
                <div className="nft-attr">
                  <span className="attr-label">Chain</span>
                  <span className="attr-value">{selected.chain}</span>
                </div>
                <div className="nft-attr">
                  <span className="attr-label">Standard</span>
                  <span className="attr-value">{selected.standard}</span>
                </div>
                {selected.floor && (
                  <div className="nft-attr">
                    <span className="attr-label">Floor</span>
                    <span className="attr-value">{selected.floor}</span>
                  </div>
                )}
              </div>
              <div className="btn-row">
                <button className="btn-secondary">Transfer</button>
                <a
                  href={`https://opensea.io/assets/ethereum/${selected.contract}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-primary"
                  style={{ textAlign: 'center', display: 'block', flex: 1 }}
                >
                  View on OpenSea ↗
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
