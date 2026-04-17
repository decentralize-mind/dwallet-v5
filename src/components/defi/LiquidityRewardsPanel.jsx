import { useState, useEffect } from 'react'
import { useWallet } from '../../context/WalletContext'

const LIQUIDITY_INCENTIVE_ADDRESS = '0x56b2E198518584e75643611140A5157931F777FA'
const DWT_TOKEN_ADDRESS = '0x769F23dd0F6bc92C9d9d914190Ae9006d3FbDe48'

export default function LiquidityRewardsPanel() {
  const { wallet, provider } = useWallet()
  const [emissionRate, setEmissionRate] = useState(100)
  const [totalStaked, setTotalStaked] = useState(0)
  const [userStaked, setUserStaked] = useState(0)
  const [rewardsEarned, setRewardsEarned] = useState(0)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadRewardsData()
  }, [wallet])

  const loadRewardsData = async () => {
    if (!provider || !wallet) return
    
    try {
      const incentiveABI = [
        'function emissionRate() view returns (uint256)',
        'function totalStaked() view returns (uint256)',
        'function getUserStaked(address user) view returns (uint256)',
        'function getRewardsEarned(address user) view returns (uint256)'
      ]
      
      const contract = new ethers.Contract(LIQUIDITY_INCENTIVE_ADDRESS, incentiveABI, provider)
      const emission = await contract.emissionRate()
      const total = await contract.totalStaked()
      
      setEmissionRate(Number(ethers.formatEther(emission)))
      setTotalStaked(Number(ethers.formatEther(total)))
    } catch (error) {
      console.error('Error loading rewards data:', error)
    }
  }

  const handleStake = async () => {
    setLoading(true)
    try {
      alert('Staking feature coming soon! Will integrate with deployed LiquidityIncentive contract.')
    } catch (error) {
      console.error('Staking failed:', error)
      alert('Staking failed: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleClaimRewards = async () => {
    setLoading(true)
    try {
      alert('Claim rewards feature coming soon!')
    } catch (error) {
      console.error('Claim failed:', error)
      alert('Claim failed: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="liquidity-rewards-panel">
      <div className="panel-header">
        <h3>💧 Liquidity Rewards</h3>
        <span className="badge-success">Active</span>
      </div>

      <div className="pool-stats">
        <div className="stat-card">
          <div className="stat-label">Daily Emission</div>
          <div className="stat-value">{emissionRate} DWT/day</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Staked</div>
          <div className="stat-value">{totalStaked.toLocaleString()} DWT</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Your Rewards</div>
          <div className="stat-value">{rewardsEarned.toFixed(2)} DWT</div>
        </div>
      </div>

      <div className="rewards-info">
        <div className="info-card">
          <h4>💰 Reward Details</h4>
          <div className="detail-row">
            <span>Emission Rate:</span>
            <span>{emissionRate} DWT per day</span>
          </div>
          <div className="detail-row">
            <span>Reward Period:</span>
            <span>365 days (1 year)</span>
          </div>
          <div className="detail-row">
            <span>Total Rewards:</span>
            <span>36,500 DWT</span>
          </div>
        </div>
      </div>

      <div className="stake-section">
        <button
          className="btn-primary btn-stake"
          onClick={handleStake}
          disabled={loading}
        >
          {loading ? 'Processing...' : 'Stake Liquidity'}
        </button>

        <button
          className="btn-secondary btn-claim"
          onClick={handleClaimRewards}
          disabled={loading || rewardsEarned === 0}
        >
          Claim Rewards
        </button>
      </div>

      <div className="info-box">
        <strong>ℹ️ How Liquidity Rewards Work:</strong>
        <ul>
          <li>Provide liquidity to supported pools</li>
          <li>Stake your LP tokens to earn DWT rewards</li>
          <li>100 DWT distributed daily among all stakers</li>
          <li>Claim rewards anytime</li>
        </ul>
      </div>
    </div>
  )
}
