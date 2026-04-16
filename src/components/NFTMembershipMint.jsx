import { useState, useEffect } from 'react'
import { useWallet } from '../hooks/useWallet'
import { ethers } from 'ethers'
import { NFT_MEMBERSHIP_ABI } from '../contracts/layer9-abis'

// Tier configuration with visual settings
const TIER_CONFIG = [
  {
    name: 'Bronze',
    icon: '🥉',
    color: '#CD7F32',
    gradient: 'linear-gradient(135deg, #CD7F32 0%, #8B4513 100%)',
    benefits: ['Basic DeFi access', 'Standard fee tier', 'Community support'],
  },
  {
    name: 'Silver',
    icon: '🥈',
    color: '#C0C0C0',
    gradient: 'linear-gradient(135deg, #C0C0C0 0%, #808080 100%)',
    benefits: ['Enhanced DeFi access', 'Reduced fees', 'Priority support', 'Staking bonuses'],
  },
  {
    name: 'Gold',
    icon: '🥇',
    color: '#FFD700',
    gradient: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
    benefits: ['Premium DeFi access', 'Lowest fees', 'VIP support', 'Higher staking APY', 'Exclusive features'],
  },
  {
    name: 'Platinum',
    icon: '💎',
    color: '#E5E4E2',
    gradient: 'linear-gradient(135deg, #E5E4E2 0%, #B0B0B0 100%)',
    benefits: ['Maximum DeFi access', 'Zero fees', 'Dedicated support', 'Maximum staking APY', 'All features', 'Governance rights'],
  },
]

export default function NFTMembershipMint() {
  const { wallet, currentAddress } = useWallet()
  const [selectedTier, setSelectedTier] = useState(null)
  const [paymentMethod, setPaymentMethod] = useState('ETH') // 'ETH' or 'DWT'
  const [loading, setLoading] = useState(false)
  const [minting, setMinting] = useState(false)
  const [userTier, setUserTier] = useState(null)
  const [userBalance, setUserBalance] = useState(0)
  const [tierConfigs, setTierConfigs] = useState([])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showMintModal, setShowMintModal] = useState(false)

  const NFT_MEMBERSHIP_ADDRESS = import.meta.env.VITE_NFT_MEMBERSHIP_ADDRESS || ''

  // Fetch user's current tier and balance
  useEffect(() => {
    if (!currentAddress || !NFT_MEMBERSHIP_ADDRESS) return

    const fetchUserData = async () => {
      try {
        setLoading(true)
        const provider = new ethers.BrowserProvider(window.ethereum)
        const contract = new ethers.Contract(NFT_MEMBERSHIP_ADDRESS, NFT_MEMBERSHIP_ABI, provider)

        // Get highest tier
        const tier = await contract.highestTier(currentAddress)
        setUserTier(Number(tier))

        // Get DWT balance
        const dwtBalance = await contract.dwtToken()
        const dwtContract = new ethers.Contract(dwtBalance, [
          'function balanceOf(address) view returns (uint256)',
        ], provider)
        const balance = await dwtContract.balanceOf(currentAddress)
        setUserBalance(parseFloat(ethers.formatEther(balance)))

        // Fetch tier configs
        const configs = []
        for (let i = 0; i < 4; i++) {
          const config = await contract.tierConfigs(i)
          configs.push({
            ethPrice: ethers.formatEther(config.ethPrice),
            dwtPrice: ethers.formatEther(config.dwtPrice),
            maxSupply: Number(config.maxSupply),
            currentSupply: Number(config.currentSupply),
            soulbound: config.soulbound,
            enabled: config.enabled,
          })
        }
        setTierConfigs(configs)
      } catch (err) {
        console.error('Failed to fetch user data:', err)
        setError('Failed to load membership data')
      } finally {
        setLoading(false)
      }
    }

    fetchUserData()
  }, [currentAddress, NFT_MEMBERSHIP_ADDRESS])

  const handleMintClick = (tierIndex) => {
    if (!wallet) {
      setError('Please connect your wallet first')
      return
    }
    setSelectedTier(tierIndex)
    setShowMintModal(true)
    setError('')
    setSuccess('')
  }

  const handleMint = async () => {
    if (selectedTier === null || !wallet) return

    setError('')
    setSuccess('')
    setMinting(true)

    try {
      const signer = await window.ethereum.request({ method: 'eth_requestAccounts' })
        .then(accounts => new ethers.BrowserProvider(window.ethereum).getSigner())

      const contract = new ethers.Contract(NFT_MEMBERSHIP_ADDRESS, NFT_MEMBERSHIP_ABI, signer)

      let tx
      if (paymentMethod === 'ETH') {
        const ethPrice = tierConfigs[selectedTier].ethPrice
        tx = await contract.mintWithETH(selectedTier, {
          value: ethers.parseEther(ethPrice.toString()),
        })
      } else {
        // For DWT payment, need to approve first
        const dwtAddress = await contract.dwtToken()
        const dwtContract = new ethers.Contract(dwtAddress, [
          'function approve(address spender, uint256 amount) returns (bool)',
        ], signer)

        const dwtPrice = tierConfigs[selectedTier].dwtPrice
        await dwtContract.approve(NFT_MEMBERSHIP_ADDRESS, ethers.parseEther(dwtPrice.toString()))
        
        tx = await contract.mintWithDWT(selectedTier)
      }

      setSuccess('Minting transaction submitted...')
      await tx.wait()
      
      setSuccess(`Successfully minted ${TIER_CONFIG[selectedTier].name} membership!`)
      setShowMintModal(false)
      setSelectedTier(null)

      // Refresh user data
      window.location.reload()
    } catch (err) {
      console.error('Minting failed:', err)
      setError(err.reason || err.message || 'Minting failed')
    } finally {
      setMinting(false)
    }
  }

  const handleUpgrade = async (tokenId) => {
    if (!wallet) return

    setError('')
    setMinting(true)

    try {
      const signer = await new ethers.BrowserProvider(window.ethereum).getSigner()
      const contract = new ethers.Contract(NFT_MEMBERSHIP_ADDRESS, NFT_MEMBERSHIP_ABI, signer)

      const tokenData = await contract.tokenData(tokenId)
      const currentTier = Number(tokenData.tier)
      const nextTier = currentTier + 1

      if (nextTier >= 4) {
        setError('Already at maximum tier')
        return
      }

      const currentConfig = tierConfigs[currentTier]
      const nextConfig = tierConfigs[nextTier]
      const priceDelta = parseFloat(nextConfig.ethPrice) - parseFloat(currentConfig.ethPrice)

      const tx = await contract.upgradeWithETH(tokenId, {
        value: ethers.parseEther(priceDelta.toString()),
      })

      setSuccess('Upgrading membership...')
      await tx.wait()

      setSuccess('Membership upgraded successfully!')
      window.location.reload()
    } catch (err) {
      console.error('Upgrade failed:', err)
      setError(err.reason || err.message || 'Upgrade failed')
    } finally {
      setMinting(false)
    }
  }

  if (!currentAddress) {
    return (
      <div className="view-container">
        <div className="empty-state-big">
          <p className="empty-icon">🔐</p>
          <p>Connect your wallet to view and mint membership passes</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="view-container">
        <div className="yield-loading">
          <div className="wc-spinner" />
          <p>Loading membership data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="view-container">
      <div className="view-header">
        <h2 className="view-title">Membership Passes</h2>
        {userTier > 0 && (
          <span className="view-count" style={{ color: TIER_CONFIG[userTier - 1]?.color }}>
            {TIER_CONFIG[userTier - 1]?.icon} {TIER_CONFIG[userTier - 1]?.name} Member
          </span>
        )}
      </div>

      {error && (
        <div style={{
          padding: '12px',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '8px',
          marginBottom: '16px',
          color: '#EF4444',
          fontSize: '13px',
        }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{
          padding: '12px',
          background: 'rgba(16, 185, 129, 0.1)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          borderRadius: '8px',
          marginBottom: '16px',
          color: '#10B981',
          fontSize: '13px',
        }}>
          {success}
        </div>
      )}

      {/* Current Tier Status */}
      {userTier > 0 && (
        <div style={{
          padding: '16px',
          background: TIER_CONFIG[userTier - 1]?.gradient,
          borderRadius: '12px',
          marginBottom: '24px',
          color: 'white',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <span style={{ fontSize: '32px' }}>{TIER_CONFIG[userTier - 1]?.icon}</span>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700' }}>
                {TIER_CONFIG[userTier - 1]?.name} Member
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: '13px', opacity: 0.9 }}>
                DWT Balance: {userBalance.toFixed(2)} DWT
              </p>
            </div>
          </div>
          <div style={{ marginTop: '12px' }}>
            <p style={{ margin: '0 0 8px', fontSize: '12px', opacity: 0.9 }}>Your Benefits:</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {TIER_CONFIG[userTier - 1]?.benefits.map((benefit, idx) => (
                <span key={idx} style={{
                  padding: '4px 8px',
                  background: 'rgba(255, 255, 255, 0.2)',
                  borderRadius: '4px',
                  fontSize: '11px',
                }}>
                  ✓ {benefit}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tier Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
        {TIER_CONFIG.map((tier, index) => {
          const config = tierConfigs[index]
          const isCurrentTier = userTier === index + 1
          const isLowerTier = userTier > index + 1
          const price = paymentMethod === 'ETH' ? config?.ethPrice : config?.dwtPrice
          const priceLabel = paymentMethod === 'ETH' ? 'ETH' : 'DWT'
          const supplyPercent = config?.maxSupply > 0 
            ? (config.currentSupply / config.maxSupply) * 100 
            : 0

          return (
            <div
              key={index}
              style={{
                background: 'var(--bg3)',
                border: `2px solid ${isCurrentTier ? tier.color : 'var(--border)'}`,
                borderRadius: '12px',
                padding: '20px',
                opacity: isLowerTier ? 0.6 : 1,
                transition: 'all 0.2s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <span style={{ fontSize: '32px' }}>{tier.icon}</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: tier.color }}>
                    {tier.name}
                  </h3>
                  {isCurrentTier && (
                    <span style={{
                      fontSize: '11px',
                      padding: '2px 8px',
                      background: tier.color,
                      color: 'white',
                      borderRadius: '4px',
                    }}>
                      Current
                    </span>
                  )}
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <p style={{ fontSize: '28px', fontWeight: '700', margin: '0 0 4px' }}>
                  {price ? `${parseFloat(price).toFixed(price < 1 ? 3 : 2)}` : '—'}
                  <span style={{ fontSize: '14px', color: 'var(--text3)' }}> {priceLabel}</span>
                </p>
                {config?.maxSupply > 0 && (
                  <div>
                    <div style={{
                      height: '4px',
                      background: 'rgba(255,255,255,0.1)',
                      borderRadius: '2px',
                      overflow: 'hidden',
                      marginBottom: '4px',
                    }}>
                      <div style={{
                        width: `${supplyPercent}%`,
                        height: '100%',
                        background: supplyPercent > 90 ? '#EF4444' : 'var(--accent)',
                        transition: 'width 0.3s',
                      }} />
                    </div>
                    <p style={{ fontSize: '11px', color: 'var(--text3)', margin: 0 }}>
                      {config.currentSupply}/{config.maxSupply} minted
                    </p>
                  </div>
                )}
              </div>

              <div style={{ marginBottom: '16px' }}>
                <p style={{ fontSize: '12px', color: 'var(--text2)', margin: '0 0 8px' }}>Benefits:</p>
                {tier.benefits.map((benefit, idx) => (
                  <p key={idx} style={{ fontSize: '12px', color: 'var(--text3)', margin: '4px 0' }}>
                    ✓ {benefit}
                  </p>
                ))}
              </div>

              <button
                onClick={() => handleMintClick(index)}
                disabled={isCurrentTier || isLowerTier || !config?.enabled}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: isCurrentTier || isLowerTier || !config?.enabled
                    ? 'rgba(255,255,255,0.05)'
                    : tier.gradient,
                  border: 'none',
                  borderRadius: '8px',
                  color: isCurrentTier || isLowerTier || !config?.enabled ? 'var(--text3)' : 'white',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: isCurrentTier || isLowerTier || !config?.enabled ? 'not-allowed' : 'pointer',
                  fontFamily: 'var(--font)',
                }}
              >
                {isCurrentTier ? 'Owned' : isLowerTier ? 'Already Higher' : !config?.enabled ? 'Coming Soon' : 'Mint Pass'}
              </button>
            </div>
          )
        })}
      </div>

      {/* Mint Modal */}
      {showMintModal && selectedTier !== null && (
        <div className="modal-overlay" onClick={() => setShowMintModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                Mint {TIER_CONFIG[selectedTier]?.icon} {TIER_CONFIG[selectedTier]?.name} Pass
              </h2>
              <button className="modal-close" onClick={() => setShowMintModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: '20px' }}>
                <p style={{ fontSize: '13px', color: 'var(--text2)', marginBottom: '12px' }}>
                  Select payment method:
                </p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => setPaymentMethod('ETH')}
                    style={{
                      flex: 1,
                      padding: '10px',
                      background: paymentMethod === 'ETH' ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
                      border: paymentMethod === 'ETH' ? 'none' : '1px solid var(--border)',
                      borderRadius: '8px',
                      color: paymentMethod === 'ETH' ? 'white' : 'var(--text2)',
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      fontFamily: 'var(--font)',
                    }}
                  >
                    💰 ETH
                  </button>
                  <button
                    onClick={() => setPaymentMethod('DWT')}
                    style={{
                      flex: 1,
                      padding: '10px',
                      background: paymentMethod === 'DWT' ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
                      border: paymentMethod === 'DWT' ? 'none' : '1px solid var(--border)',
                      borderRadius: '8px',
                      color: paymentMethod === 'DWT' ? 'white' : 'var(--text2)',
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      fontFamily: 'var(--font)',
                    }}
                  >
                    🪙 DWT
                  </button>
                </div>
              </div>

              <div style={{
                padding: '16px',
                background: 'rgba(0,0,0,0.2)',
                borderRadius: '8px',
                marginBottom: '20px',
              }}>
                <p style={{ fontSize: '12px', color: 'var(--text3)', margin: '0 0 8px' }}>
                  Price:
                </p>
                <p style={{ fontSize: '24px', fontWeight: '700', margin: '0 0 8px' }}>
                  {paymentMethod === 'ETH' 
                    ? `${parseFloat(tierConfigs[selectedTier]?.ethPrice).toFixed(3)} ETH`
                    : `${parseFloat(tierConfigs[selectedTier]?.dwtPrice).toFixed(0)} DWT`
                  }
                </p>
                <p style={{ fontSize: '11px', color: 'var(--text3)', margin: 0 }}>
                  {tierConfigs[selectedTier]?.soulbound ? '🔒 Soulbound (Non-transferable)' : '✓ Transferable'}
                </p>
              </div>

              <button
                onClick={handleMint}
                disabled={minting}
                style={{
                  width: '100%',
                  padding: '14px',
                  background: minting ? 'rgba(255,255,255,0.1)' : TIER_CONFIG[selectedTier]?.gradient,
                  border: 'none',
                  borderRadius: '8px',
                  color: 'white',
                  fontSize: '15px',
                  fontWeight: '700',
                  cursor: minting ? 'not-allowed' : 'pointer',
                  fontFamily: 'var(--font)',
                }}
              >
                {minting ? 'Minting...' : 'Confirm Mint'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
