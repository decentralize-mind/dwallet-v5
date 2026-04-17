import { useState, useEffect } from 'react'
import { useWallet } from '../../context/WalletContext'
import { LiquidityIncentive_ABI } from '../../config/abis'

const LIQUIDITY_INCENTIVE_ADDRESS = '0x56b2E198518584e75643611140A5157931F777FA'
const DWT_TOKEN_ADDRESS = '0x769F23dd0F6bc92C9d9d914190Ae9006d3FbDe48'

export default function LiquidityRewardsPanel() {
  const { wallet, provider } = useWallet()
  const [emissionRate, setEmissionRate] = useState(100)
  const [totalStaked, setTotalStaked] = useState(0)
  const [userStaked, setUserStaked] = useState(0)
  const [rewardsEarned, setRewardsEarned] = useState(0)
  const [stakeAmount, setStakeAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [txHash, setTxHash] = useState(null)
  const [poolId, setPoolId] = useState(0)

  useEffect(() => {
    loadRewardsData()
  }, [wallet])

  const loadRewardsData = async () => {
    if (!provider || !wallet) return
    
    try {
      const contract = new ethers.Contract(LIQUIDITY_INCENTIVE_ADDRESS, LiquidityIncentive_ABI, provider)
      
      // Get emission rate (reward per second)
      const rewardPerSecond = await contract.rewardPerSecond()
      const dailyEmission = Number(ethers.formatEther(rewardPerSecond)) * 86400
      setEmissionRate(Math.round(dailyEmission))
      
      // Get total staked
      const poolInfo = await contract.poolInfo(0)
      const total = await contract.totalSupply()
      
      setTotalStaked(Number(ethers.formatEther(total)))
      
      // Get user staked amount
      const userInfo = await contract.userInfo(0, wallet.address)
      setUserStaked(Number(ethers.formatEther(userInfo.amount)))
      
      // Get pending rewards
      const pending = await contract.pendingReward(0, wallet.address)
      setRewardsEarned(Number(ethers.formatEther(pending)))
    } catch (error) {
      console.error('Error loading rewards data:', error)
    }
  }

  const handleStake = async () => {
    if (!wallet || !stakeAmount) return
    
    setLoading(true)
    try {
      const signer = await provider.getSigner()
      const contract = new ethers.Contract(LIQUIDITY_INCENTIVE_ADDRESS, LiquidityIncentive_ABI, signer)
      
      const amount = ethers.parseEther(stakeAmount)
      const tx = await contract.deposit(poolId, amount)
      setTxHash(tx.hash)
      
      await tx.wait()
      
      alert('Staking successful!')
      await loadRewardsData()
      setStakeAmount('')
    } catch (error) {
      console.error('Staking failed:', error)
      alert('Staking failed: ' + (error.reason || error.message))
    } finally {
      setLoading(false)
    }
  }

  const handleClaimRewards = async () => {
    if (!wallet) return
    
    setLoading(true)
    try {
      const signer = await provider.getSigner()
      const contract = new ethers.Contract(LIQUIDITY_INCENTIVE_ADDRESS, LiquidityIncentive_ABI, signer)
      
      const tx = await contract.harvest(poolId)
      setTxHash(tx.hash)
      
      await tx.wait()
      
      alert('Rewards claimed successfully!')
      await loadRewardsData()
    } catch (error) {
      console.error('Claim failed:', error)
      alert('Claim failed: ' + (error.reason || error.message))
    } finally {
      setLoading(false)
    }
  }

  const handleWithdraw = async () => {
    if (!wallet || !userStaked) return
    
    setLoading(true)
    try {
      const signer = await provider.getSigner()
      const contract = new ethers.Contract(LIQUIDITY_INCENTIVE_ADDRESS, LiquidityIncentive_ABI, signer)
      
      const tx = await contract.withdraw(poolId, ethers.parseEther(userStaked.toString()))
      setTxHash(tx.hash)
      
      await tx.wait()
      
      alert('Withdrawal successful!')
      await loadRewardsData()
    } catch (error) {
      console.error('Withdrawal failed:', error)
      alert('Withdrawal failed: ' + (error.reason || error.message))
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
            <span>Your Stake:</span>
            <span>{userStaked.toFixed(2)} DWT</span>
          </div>
          <div className="detail-row">
            <span>Total Rewards:</span>
            <span>36,500 DWT</span>
          </div>
        </div>
      </div>

      <div className="stake-form">
        <div className="input-group">
          <label>Amount to Stake (DWT)</label>
          <input
            type="number"
            value={stakeAmount}
            onChange={(e) => setStakeAmount(e.target.value)}
            placeholder="0.00"
            step="0.01"
            min="0"
          />
        </div>
      </div>

      <div className="stake-section">
        <button
          className="btn-primary btn-stake"
          onClick={handleStake}
          disabled={loading || !stakeAmount}
        >
          {loading ? 'Processing...' : 'Stake Liquidity'}
        </button>

        <button
          className="btn-secondary btn-claim"
          onClick={handleClaimRewards}
          disabled={loading || rewardsEarned === 0}
        >
          Claim Rewards ({rewardsEarned.toFixed(2)} DWT)
        </button>

        {userStaked > 0 && (
          <button
            className="btn-secondary btn-withdraw"
            onClick={handleWithdraw}
            disabled={loading}
          >
            Withdraw ({userStaked.toFixed(2)} DWT)
          </button>
        )}
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

      {txHash && (
        <div className="tx-success">
          ✅ Transaction: <a href={`https://sepolia.basescan.org/tx/${txHash}`} target="_blank" rel="noopener noreferrer">
            View on BaseScan
          </a>
        </div>
      )}
    </div>
  )
}
