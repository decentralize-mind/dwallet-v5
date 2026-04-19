import { useState, useEffect } from 'react'
import { useWallet } from '../context/WalletContext'
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
  const { wallet, currentAddress, sendTransaction } = useWallet()
  const [selectedTier, setSelectedTier] = useState(null)
  const [paymentMethod, setPaymentMethod] = useState('ETH')
  const [loading, setLoading] = useState(false)
  const [minting, setMinting] = useState(false)
  const [userTier, setUserTier] = useState(null)
  const [userBalance, setUserBalance] = useState({ balance: 0, symbol: 'DWT' })
  const [tierConfigs, setTierConfigs] = useState([])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showMintModal, setShowMintModal] = useState(false)
  const [ownedPasses, setOwnedPasses] = useState([])
  const [selectedPass, setSelectedPass] = useState(null)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [showRenewModal, setShowRenewModal] = useState(false)
  const [isOwner, setIsOwner] = useState(false)
  const [contractRevenue, setContractRevenue] = useState({ eth: 0, dwt: 0 })
  const [activeView, setActiveView] = useState('mint')
  const [lastUpdated, setLastUpdated] = useState(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const NFT_MEMBERSHIP_ADDRESS = import.meta.env.VITE_NFT_MEMBERSHIP_ADDRESS || ''
  
  // Create contract instance for encoding function calls
  const contract = new ethers.Contract(NFT_MEMBERSHIP_ADDRESS, NFT_MEMBERSHIP_ABI)

  // Fetch user's current tier, balance, owned passes, and revenue
  const fetchUserData = async () => {
    if (!currentAddress || !NFT_MEMBERSHIP_ADDRESS) {
      console.log('⚠️ fetchUserData: Missing address or contract', { currentAddress, NFT_MEMBERSHIP_ADDRESS })
      return
    }

    try {
      console.log('🔄 fetchUserData: Starting fetch...', { currentAddress, NFT_MEMBERSHIP_ADDRESS })
      setIsRefreshing(true)
      
      // Use environment variable for RPC URL with fallbacks
      const rpcUrls = [
        import.meta.env.VITE_BASE_SEPOLIA_RPC_URL || 'https://base-sepolia-rpc.publicnode.com',
        'https://base-sepolia-rpc.publicnode.com',
        'https://rpc.ankr.com/base_sepolia',
        'https://sepolia.base.org',
      ]
      
      let provider = null
      let lastError = null
      
      // Try each RPC URL until one works
      for (const rpcUrl of rpcUrls) {
        try {
          console.log(`🔌 Trying RPC: ${rpcUrl}`)
          provider = new ethers.JsonRpcProvider(rpcUrl, undefined, {
            staticNetwork: true,
          })
          // Test the connection
          await provider.getBlockNumber()
          console.log(`✅ Connected to RPC: ${rpcUrl}`)
          break
        } catch (err) {
          console.warn(`⚠️ Failed to connect to ${rpcUrl}:`, err.message)
          lastError = err
          provider = null
        }
      }
      
      if (!provider) {
        throw new Error(`All RPC endpoints failed. Last error: ${lastError?.message}`)
      }
      
      const contract = new ethers.Contract(NFT_MEMBERSHIP_ADDRESS, NFT_MEMBERSHIP_ABI, provider)

      // Get highest tier
      const tier = await contract.highestTier(currentAddress)
      console.log('📊 User tier:', Number(tier))
      setUserTier(Number(tier))

      // Get DWT balance
      const dwtAddress = await contract.dwtToken()
      console.log('🪙 DWT Token Address from contract:', dwtAddress)
      const dwtContract = new ethers.Contract(dwtAddress, [
        'function balanceOf(address) view returns (uint256)',
        'function symbol() view returns (string)',
        'function decimals() view returns (uint8)',
      ], provider)
      const balance = await dwtContract.balanceOf(currentAddress)
      const symbol = await dwtContract.symbol()
      const decimals = await dwtContract.decimals()
      const balanceFormatted = parseFloat(ethers.formatUnits(balance, decimals))
      console.log('💰 DWT Balance:', balanceFormatted, symbol)
      setUserBalance({ balance: balanceFormatted, symbol })

      // Fetch tier configs
      const configs = []
      for (let i = 0; i < 4; i++) {
        const config = await contract.tierConfigs(i)
        configs.push({
          ethPrice: ethers.formatEther(config.ethPrice),
          dwtPrice: ethers.formatUnits(config.dwtPrice, decimals),
          dwtHoldRequirement: ethers.formatUnits(config.dwtHoldRequirement, decimals),
          maxSupply: Number(config.maxSupply),
          currentSupply: Number(config.currentSupply),
          durationSeconds: Number(config.durationSeconds),
          soulbound: config.soulbound,
          enabled: config.enabled,
        })
      }
      setTierConfigs(configs)

      // Fetch owned passes
      const balanceOf = await contract.balanceOf(currentAddress)
      const passes = []
      for (let i = 0; i < Number(balanceOf); i++) {
        const tokenId = await contract.tokenOfOwnerByIndex(currentAddress, i)
        const tokenData = await contract.tokenData(tokenId)
        passes.push({
          tokenId: Number(tokenId),
          tier: Number(tokenData.tier),
          expiry: Number(tokenData.expiry),
        })
      }
      setOwnedPasses(passes)

      // Check if user is contract owner
      const owner = await contract.owner()
      setIsOwner(owner.toLowerCase() === currentAddress.toLowerCase())

      // Fetch contract revenue (if owner)
      if (owner.toLowerCase() === currentAddress.toLowerCase()) {
        const ethBalance = await provider.getBalance(NFT_MEMBERSHIP_ADDRESS)
        const dwtBalance = await dwtContract.balanceOf(NFT_MEMBERSHIP_ADDRESS)
        setContractRevenue({
          eth: parseFloat(ethers.formatEther(ethBalance)),
          dwt: parseFloat(ethers.formatUnits(dwtBalance, decimals)),
        })
      }

      setLastUpdated(new Date())
    } catch (err) {
      console.error('Failed to fetch user data:', err)
      setError('Failed to load membership data')
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }

  // Auto-refresh every 15 seconds
  useEffect(() => {
    if (!currentAddress || !NFT_MEMBERSHIP_ADDRESS) {
      console.log('⏸️ Auto-refresh paused: missing address or contract')
      return
    }

    console.log('✅ Auto-refresh active for:', currentAddress)
    // Initial fetch
    fetchUserData()

    // Set up auto-refresh interval
    const refreshInterval = setInterval(() => {
      fetchUserData()
    }, 15000) // 15 seconds

    // Cleanup on unmount
    return () => clearInterval(refreshInterval)
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
      console.log('🚀 Starting mint process...', { 
        tier: selectedTier, 
        paymentMethod,
        walletAddress: currentAddress 
      })

      if (paymentMethod === 'ETH') {
        // Mint with ETH
        const ethPrice = tierConfigs[selectedTier].ethPrice
        console.log('💰 Minting with ETH:', ethPrice)
        
        const tx = await sendTransaction({
          to: NFT_MEMBERSHIP_ADDRESS,
          value: ethers.parseEther(ethPrice.toString()),
          data: contract.interface.encodeFunctionData('mintWithETH', [selectedTier]),
          chain: 'baseSepolia',
          description: `Mint ${TIER_CONFIG[selectedTier].name} NFT Membership Pass`,
        })

        setSuccess('Minting transaction submitted...')
        await tx.wait()
        
        setSuccess(`Successfully minted ${TIER_CONFIG[selectedTier].name} membership!`)
        setShowMintModal(false)
        setSelectedTier(null)
        
        // Refresh data
        setTimeout(() => {
          fetchUserData()
        }, 2000)
        
      } else {
        // Mint with DWT - Need to approve first, then mint
        const dwtPrice = tierConfigs[selectedTier].dwtPrice
        const dwtAddress = '0x3A4B1a7aD971be03dEe83A7B61d575304C9C0b0f'
        
        console.log('🪙 Minting with DWT:', dwtPrice)
        
        // Step 1: Approve DWT spending
        setSuccess('Approving DWT spending...')
        const approveTx = await sendTransaction({
          to: dwtAddress,
          data: contract.interface.encodeFunctionData('approve', [
            NFT_MEMBERSHIP_ADDRESS,
            ethers.parseUnits(dwtPrice.toString(), 18)
          ]),
          chain: 'baseSepolia',
          description: `Approve ${dwtPrice} DWT for NFT Membership`,
        })
        
        await approveTx.wait()
        console.log('✅ DWT approved')
        
        // Step 2: Mint with DWT
        setSuccess('Minting NFT...')
        const mintTx = await sendTransaction({
          to: NFT_MEMBERSHIP_ADDRESS,
          data: contract.interface.encodeFunctionData('mintWithDWT', [selectedTier]),
          chain: 'baseSepolia',
          description: `Mint ${TIER_CONFIG[selectedTier].name} NFT Membership Pass`,
        })
        
        await mintTx.wait()
        console.log('✅ NFT minted')
        
        setSuccess(`Successfully minted ${TIER_CONFIG[selectedTier].name} membership!`)
        setShowMintModal(false)
        setSelectedTier(null)
        
        // Refresh data
        setTimeout(() => {
          fetchUserData()
        }, 2000)
      }
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
      setShowUpgradeModal(false)
      setSelectedPass(null)
      window.location.reload()
    } catch (err) {
      console.error('Upgrade failed:', err)
      setError(err.reason || err.message || 'Upgrade failed')
    } finally {
      setMinting(false)
    }
  }

  const handleRenew = async (tokenId) => {
    if (!wallet) return

    setError('')
    setMinting(true)

    try {
      const signer = await new ethers.BrowserProvider(window.ethereum).getSigner()
      const contract = new ethers.Contract(NFT_MEMBERSHIP_ADDRESS, NFT_MEMBERSHIP_ABI, signer)

      const tokenData = await contract.tokenData(tokenId)
      const tier = Number(tokenData.tier)
      const ethPrice = tierConfigs[tier].ethPrice

      const tx = await contract.renewWithETH(tokenId, {
        value: ethers.parseEther(ethPrice.toString()),
      })

      setSuccess('Renewing membership...')
      await tx.wait()

      setSuccess('Membership renewed successfully!')
      setShowRenewModal(false)
      setSelectedPass(null)
      window.location.reload()
    } catch (err) {
      console.error('Renewal failed:', err)
      setError(err.reason || err.message || 'Renewal failed')
    } finally {
      setMinting(false)
    }
  }

  const handleWithdrawRevenue = async () => {
    if (!isOwner) return

    setError('')
    setMinting(true)

    try {
      const signer = await new ethers.BrowserProvider(window.ethereum).getSigner()
      const contract = new ethers.Contract(NFT_MEMBERSHIP_ADDRESS, NFT_MEMBERSHIP_ABI, signer)

      if (contractRevenue.eth > 0) {
        const tx1 = await contract.withdrawETH(currentAddress)
        await tx1.wait()
      }

      if (contractRevenue.dwt > 0) {
        const dwtAddress = await contract.dwtToken()
        const dwtContract = new ethers.Contract(dwtAddress, [
          'function decimals() view returns (uint8)',
        ], signer)
        const decimals = await dwtContract.decimals()
        const tx2 = await contract.withdrawDWT(currentAddress, ethers.parseUnits(contractRevenue.dwt.toString(), decimals))
        await tx2.wait()
      }

      setSuccess('Revenue withdrawn successfully!')
      window.location.reload()
    } catch (err) {
      console.error('Withdrawal failed:', err)
      setError(err.reason || err.message || 'Withdrawal failed')
    } finally {
      setMinting(false)
    }
  }

  const handleManualRefresh = async () => {
    await fetchUserData()
    setSuccess('Data refreshed successfully!')
    setTimeout(() => setSuccess(''), 3000)
  }

  const formatDate = (timestamp) => {
    if (timestamp === 0) return 'Never (Permanent)'
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const isExpired = (expiry) => {
    if (expiry === 0) return false
    return Date.now() > expiry * 1000
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {userTier > 0 && (
            <span className="view-count" style={{ color: TIER_CONFIG[userTier - 1]?.color }}>
              {TIER_CONFIG[userTier - 1]?.icon} {TIER_CONFIG[userTier - 1]?.name} Member
            </span>
          )}
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            style={{
              padding: '6px 12px',
              background: isRefreshing ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              color: 'var(--text2)',
              fontSize: '12px',
              cursor: isRefreshing ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--font)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span style={{ display: 'inline-block', animation: isRefreshing ? 'spin 1s linear infinite' : 'none' }}>
              {isRefreshing ? '⟳' : '↻'}
            </span>
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </button>
          {lastUpdated && (
            <span style={{ fontSize: '11px', color: 'var(--text3)' }}>
              Updated: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      {/* View Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        <button
          onClick={() => setActiveView('mint')}
          style={{
            flex: 1,
            padding: '10px',
            background: activeView === 'mint' ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
            border: 'none',
            borderRadius: '8px',
            color: activeView === 'mint' ? 'white' : 'var(--text2)',
            fontSize: '13px',
            fontWeight: '600',
            cursor: 'pointer',
            fontFamily: 'var(--font)',
          }}
        >
          🎫 Mint Pass
        </button>
        <button
          onClick={() => setActiveView('my-passes')}
          style={{
            flex: 1,
            padding: '10px',
            background: activeView === 'my-passes' ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
            border: 'none',
            borderRadius: '8px',
            color: activeView === 'my-passes' ? 'white' : 'var(--text2)',
            fontSize: '13px',
            fontWeight: '600',
            cursor: 'pointer',
            fontFamily: 'var(--font)',
          }}
        >
          📜 My Passes ({ownedPasses.length})
        </button>
        {isOwner && (
          <button
            onClick={() => setActiveView('revenue')}
            style={{
              flex: 1,
              padding: '10px',
              background: activeView === 'revenue' ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
              border: 'none',
              borderRadius: '8px',
              color: activeView === 'revenue' ? 'white' : 'var(--text2)',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
              fontFamily: 'var(--font)',
            }}
          >
            💰 Revenue
          </button>
        )}
      </div>

      {/* Error & Success Messages */}
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

      {/* Current Tier Status - Show in mint view */}
      {activeView === 'mint' && (
        <div style={{
          padding: '16px',
          background: userTier > 0 ? TIER_CONFIG[userTier - 1]?.gradient : 'rgba(255,255,255,0.05)',
          borderRadius: '12px',
          marginBottom: '24px',
          color: userTier > 0 ? 'white' : 'var(--text)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <span style={{ fontSize: '32px' }}>{userTier > 0 ? TIER_CONFIG[userTier - 1]?.icon : '🎫'}</span>
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700' }}>
                {userTier > 0 ? `${TIER_CONFIG[userTier - 1]?.name} Member` : 'No Membership'}
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
                <p style={{ margin: 0, fontSize: '13px', opacity: 0.9 }}>
                  💰 DWT Balance: <strong>{userBalance.balance.toFixed(2)}</strong> {userBalance.symbol}
                </p>
                <p style={{ margin: 0, fontSize: '13px', opacity: 0.7 }}>
                  (≈ ${(userBalance.balance * 3.50).toFixed(2)} USD)
                </p>
              </div>
            </div>
          </div>
          {userTier > 0 && (
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
          )}
        </div>
      )}

      {/* My Passes View */}
      {activeView === 'my-passes' && (
        <div>
          {ownedPasses.length === 0 ? (
            <div style={{
              padding: '40px',
              textAlign: 'center',
              background: 'var(--bg3)',
              borderRadius: '12px',
              marginBottom: '20px',
            }}>
              <p style={{ fontSize: '48px', margin: '0 0 16px' }}>📜</p>
              <p style={{ fontSize: '16px', color: 'var(--text2)', margin: 0 }}>
                You don't own any membership passes yet
              </p>
              <button
                onClick={() => setActiveView('mint')}
                style={{
                  marginTop: '16px',
                  padding: '10px 24px',
                  background: 'var(--accent)',
                  border: 'none',
                  borderRadius: '8px',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontFamily: 'var(--font)',
                }}
              >
                Mint Your First Pass
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '16px' }}>
              {ownedPasses.map((pass) => {
                const tierInfo = TIER_CONFIG[pass.tier]
                const expired = isExpired(pass.expiry)
                return (
                  <div
                    key={pass.tokenId}
                    style={{
                      padding: '20px',
                      background: expired ? 'rgba(255,255,255,0.03)' : 'var(--bg3)',
                      border: `2px solid ${expired ? 'rgba(255,0,0,0.3)' : tierInfo.color}`,
                      borderRadius: '12px',
                      opacity: expired ? 0.6 : 1,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '32px' }}>{tierInfo.icon}</span>
                        <div>
                          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: tierInfo.color }}>
                            {tierInfo.name} Pass
                          </h3>
                          <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--text3)' }}>
                            Token ID: #{pass.tokenId}
                          </p>
                        </div>
                      </div>
                      {expired && (
                        <span style={{
                          padding: '4px 12px',
                          background: 'rgba(239, 68, 68, 0.2)',
                          color: '#EF4444',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: '600',
                        }}>
                          Expired
                        </span>
                      )}
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                      <p style={{ fontSize: '12px', color: 'var(--text3)', margin: '0 0 4px' }}>
                        Expires: {formatDate(pass.expiry)}
                      </p>
                      {pass.expiry > 0 && (
                        <p style={{ fontSize: '12px', color: expired ? '#EF4444' : 'var(--text2)', margin: 0 }}>
                          {expired ? 'Expired' : `Valid for ${Math.ceil((pass.expiry * 1000 - Date.now()) / (1000 * 60 * 60 * 24))} days`}
                        </p>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      {!expired && pass.tier < 3 && (
                        <button
                          onClick={() => {
                            setSelectedPass(pass)
                            setShowUpgradeModal(true)
                          }}
                          style={{
                            flex: 1,
                            padding: '10px',
                            background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
                            border: 'none',
                            borderRadius: '8px',
                            color: 'white',
                            fontSize: '13px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            fontFamily: 'var(--font)',
                          }}
                        >
                          ⬆️ Upgrade
                        </button>
                      )}
                      {!expired && pass.expiry > 0 && (
                        <button
                          onClick={() => {
                            setSelectedPass(pass)
                            setShowRenewModal(true)
                          }}
                          style={{
                            flex: 1,
                            padding: '10px',
                            background: 'var(--accent)',
                            border: 'none',
                            borderRadius: '8px',
                            color: 'white',
                            fontSize: '13px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            fontFamily: 'var(--font)',
                          }}
                        >
                          🔄 Renew
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Revenue View (Owner Only) */}
      {activeView === 'revenue' && isOwner && (
        <div>
          <div style={{
            padding: '24px',
            background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
            borderRadius: '12px',
            marginBottom: '20px',
            color: 'white',
          }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '20px', fontWeight: '700' }}>
              💰 Contract Revenue
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <p style={{ margin: '0 0 4px', fontSize: '12px', opacity: 0.9 }}>ETH Balance</p>
                <p style={{ margin: 0, fontSize: '28px', fontWeight: '700' }}>
                  {contractRevenue.eth.toFixed(4)} ETH
                </p>
              </div>
              <div>
                <p style={{ margin: '0 0 4px', fontSize: '12px', opacity: 0.9 }}>DWT Balance</p>
                <p style={{ margin: 0, fontSize: '28px', fontWeight: '700' }}>
                  {contractRevenue.dwt.toFixed(2)} {userBalance.symbol}
                </p>
              </div>
            </div>
            <button
              onClick={handleWithdrawRevenue}
              disabled={minting || (contractRevenue.eth === 0 && contractRevenue.dwt === 0)}
              style={{
                marginTop: '20px',
                width: '100%',
                padding: '14px',
                background: (contractRevenue.eth === 0 && contractRevenue.dwt === 0) ? 'rgba(255,255,255,0.2)' : 'white',
                border: 'none',
                borderRadius: '8px',
                color: (contractRevenue.eth === 0 && contractRevenue.dwt === 0) ? 'rgba(255,255,255,0.5)' : '#059669',
                fontSize: '15px',
                fontWeight: '700',
                cursor: (contractRevenue.eth === 0 && contractRevenue.dwt === 0) ? 'not-allowed' : 'pointer',
                fontFamily: 'var(--font)',
              }}
            >
              {minting ? 'Withdrawing...' : '💸 Withdraw All Revenue'}
            </button>
          </div>

          <div style={{
            padding: '20px',
            background: 'var(--bg3)',
            borderRadius: '12px',
          }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: '700' }}>
              📊 Revenue Statistics
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                <p style={{ margin: '0 0 4px', fontSize: '11px', color: 'var(--text3)' }}>Total Passes Minted</p>
                <p style={{ margin: 0, fontSize: '20px', fontWeight: '700' }}>
                  {tierConfigs.reduce((sum, config) => sum + config.currentSupply, 0)}
                </p>
              </div>
              <div style={{ padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                <p style={{ margin: '0 0 4px', fontSize: '11px', color: 'var(--text3)' }}>Your Passes</p>
                <p style={{ margin: 0, fontSize: '20px', fontWeight: '700' }}>{ownedPasses.length}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tier Cards - Only show in mint view */}
      {activeView === 'mint' && (
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
      )}

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

      {/* Upgrade Modal */}
      {showUpgradeModal && selectedPass !== null && (
        <div className="modal-overlay" onClick={() => setShowUpgradeModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                Upgrade {TIER_CONFIG[selectedPass.tier]?.icon} {TIER_CONFIG[selectedPass.tier]?.name} Pass
              </h2>
              <button className="modal-close" onClick={() => setShowUpgradeModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              {selectedPass.tier < 3 ? (
                <>
                  <div style={{
                    padding: '16px',
                    background: 'rgba(0,0,0,0.2)',
                    borderRadius: '8px',
                    marginBottom: '20px',
                  }}>
                    <p style={{ fontSize: '12px', color: 'var(--text3)', margin: '0 0 8px' }}>
                      Upgrading to {TIER_CONFIG[selectedPass.tier + 1]?.name}:
                    </p>
                    <p style={{ fontSize: '24px', fontWeight: '700', margin: '0 0 8px' }}>
                      {parseFloat(tierConfigs[selectedPass.tier + 1]?.ethPrice - tierConfigs[selectedPass.tier]?.ethPrice).toFixed(3)} ETH
                    </p>
                    <p style={{ fontSize: '11px', color: 'var(--text3)', margin: 0 }}>
                      Price difference between tiers
                    </p>
                  </div>

                  <button
                    onClick={() => handleUpgrade(selectedPass.tokenId)}
                    disabled={minting}
                    style={{
                      width: '100%',
                      padding: '14px',
                      background: minting ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
                      border: 'none',
                      borderRadius: '8px',
                      color: 'white',
                      fontSize: '15px',
                      fontWeight: '700',
                      cursor: minting ? 'not-allowed' : 'pointer',
                      fontFamily: 'var(--font)',
                    }}
                  >
                    {minting ? 'Upgrading...' : 'Confirm Upgrade'}
                  </button>
                </>
              ) : (
                <p style={{ textAlign: 'center', color: 'var(--text2)' }}>
                  Already at maximum tier (Platinum)
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Renew Modal */}
      {showRenewModal && selectedPass !== null && (
        <div className="modal-overlay" onClick={() => setShowRenewModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                Renew {TIER_CONFIG[selectedPass.tier]?.icon} {TIER_CONFIG[selectedPass.tier]?.name} Pass
              </h2>
              <button className="modal-close" onClick={() => setShowRenewModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{
                padding: '16px',
                background: 'rgba(0,0,0,0.2)',
                borderRadius: '8px',
                marginBottom: '20px',
              }}>
                <p style={{ fontSize: '12px', color: 'var(--text3)', margin: '0 0 8px' }}>
                  Renewal Price:
                </p>
                <p style={{ fontSize: '24px', fontWeight: '700', margin: '0 0 8px' }}>
                  {parseFloat(tierConfigs[selectedPass.tier]?.ethPrice).toFixed(3)} ETH
                </p>
                <p style={{ fontSize: '11px', color: 'var(--text3)', margin: 0 }}>
                  Extends validity for {Math.ceil(tierConfigs[selectedPass.tier]?.durationSeconds / (24 * 3600))} days
                </p>
              </div>

              <button
                onClick={() => handleRenew(selectedPass.tokenId)}
                disabled={minting}
                style={{
                  width: '100%',
                  padding: '14px',
                  background: minting ? 'rgba(255,255,255,0.1)' : 'var(--accent)',
                  border: 'none',
                  borderRadius: '8px',
                  color: 'white',
                  fontSize: '15px',
                  fontWeight: '700',
                  cursor: minting ? 'not-allowed' : 'pointer',
                  fontFamily: 'var(--font)',
                }}
              >
                {minting ? 'Renewing...' : 'Confirm Renewal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
