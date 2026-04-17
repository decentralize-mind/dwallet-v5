import { useState, useEffect } from 'react'
import { useWallet } from '../../context/WalletContext'

const INSURANCE_FUND_ADDRESS = '0x8ba2Bb332764217079DFFb280dD70C8B351B5770'
const DWT_TOKEN_ADDRESS = '0x769F23dd0F6bc92C9d9d914190Ae9006d3FbDe48'

export default function InsuranceFundPanel() {
  const { wallet, provider } = useWallet()
  const [fundBalance, setFundBalance] = useState(0)
  const [maxClaim, setMaxClaim] = useState(0)
  const [rollingCap, setRollingCap] = useState(0)
  const [claimAmount, setClaimAmount] = useState('')
  const [claimReason, setClaimReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('file') // file, status

  useEffect(() => {
    loadFundData()
  }, [wallet])

  const loadFundData = async () => {
    if (!provider || !wallet) return
    
    try {
      const insuranceABI = [
        'function getFundBalance(address token) view returns (uint256)',
        'function getMaxClaimAmount(address token) view returns (uint256)',
        'function getRemainingRollingCap(address token) view returns (uint256)'
      ]
      
      const contract = new ethers.Contract(INSURANCE_FUND_ADDRESS, insuranceABI, provider)
      const balance = await contract.getFundBalance(DWT_TOKEN_ADDRESS)
      const max = await contract.getMaxClaimAmount(DWT_TOKEN_ADDRESS)
      const cap = await contract.getRemainingRollingCap(DWT_TOKEN_ADDRESS)
      
      setFundBalance(Number(ethers.formatEther(balance)))
      setMaxClaim(Number(ethers.formatEther(max)))
      setRollingCap(Number(ethers.formatEther(cap)))
    } catch (error) {
      console.error('Error loading fund data:', error)
    }
  }

  const handleFileClaim = async () => {
    if (!wallet || !claimAmount || !claimReason) return
    
    setLoading(true)
    try {
      const amount = ethers.parseEther(claimAmount)
      
      const insuranceABI = [
        'function fileClaim(address token, uint256 amount, string calldata reason) external'
      ]
      
      const signer = await provider.getSigner()
      const contract = new ethers.Contract(INSURANCE_FUND_ADDRESS, insuranceABI, signer)
      
      const tx = await contract.fileClaim(DWT_TOKEN_ADDRESS, amount, claimReason)
      await tx.wait()
      
      alert('Claim filed successfully! It will be reviewed and executed after 48 hours.')
      setClaimAmount('')
      setClaimReason('')
      await loadFundData()
    } catch (error) {
      console.error('Claim filing failed:', error)
      alert('Failed to file claim: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="insurance-fund-panel">
      <div className="panel-header">
        <h3>🛡️ Insurance Fund</h3>
        <span className="badge-success">Active</span>
      </div>

      <div className="pool-stats">
        <div className="stat-card">
          <div className="stat-label">Fund Balance</div>
          <div className="stat-value">{fundBalance.toLocaleString()} DWT</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Max Claim</div>
          <div className="stat-value">{maxClaim.toLocaleString()} DWT</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Monthly Cap</div>
          <div className="stat-value">{rollingCap.toLocaleString()} DWT</div>
        </div>
      </div>

      <div className="tab-switcher">
        <button 
          className={activeTab === 'file' ? 'active' : ''}
          onClick={() => setActiveTab('file')}
        >
          File Claim
        </button>
        <button 
          className={activeTab === 'status' ? 'active' : ''}
          onClick={() => setActiveTab('status')}
        >
          Coverage Info
        </button>
      </div>

      {activeTab === 'file' && (
        <div className="claim-form">
          <h4>File Insurance Claim</h4>
          
          <div className="input-group">
            <label>Claim Amount (DWT)</label>
            <input
              type="number"
              value={claimAmount}
              onChange={(e) => setClaimAmount(e.target.value)}
              placeholder="Enter amount"
              max={maxClaim}
              min="0"
              step="0.01"
            />
          </div>

          <div className="input-group">
            <label>Reason for Claim</label>
            <textarea
              value={claimReason}
              onChange={(e) => setClaimReason(e.target.value)}
              placeholder="Describe what happened and why you're filing a claim..."
              rows="4"
              required
            />
          </div>

          <button
            className="btn-primary btn-claim"
            onClick={handleFileClaim}
            disabled={!claimAmount || !claimReason || loading}
          >
            {loading ? 'Filing...' : 'File Claim'}
          </button>

          <div className="info-box">
            <strong>📋 Claim Process:</strong>
            <ol>
              <li>File your claim with amount and reason</li>
              <li>Claims assessor reviews your claim</li>
              <li>If approved, 48-hour waiting period begins</li>
              <li>After 48 hours, execute claim to receive DWT</li>
            </ol>
          </div>
        </div>
      )}

      {activeTab === 'status' && (
        <div className="coverage-info">
          <h4>Coverage Details</h4>
          
          <div className="coverage-grid">
            <div className="coverage-item">
              <div className="coverage-label">Single Claim Limit</div>
              <div className="coverage-value">20% of fund</div>
              <div className="coverage-detail">Max {maxClaim.toLocaleString()} DWT</div>
            </div>
            
            <div className="coverage-item">
              <div className="coverage-label">Monthly Cap</div>
              <div className="coverage-value">40% of fund</div>
              <div className="coverage-detail">Max {rollingCap.toLocaleString()} DWT</div>
            </div>
            
            <div className="coverage-item">
              <div className="coverage-label">Execution Delay</div>
              <div className="coverage-value">48 hours</div>
              <div className="coverage-detail">After approval</div>
            </div>
          </div>

          <div className="covered-events">
            <h5>Covered Events</h5>
            <ul>
              <li>✅ Smart contract exploits or bugs</li>
              <li>✅ Flash loan attack losses</li>
              <li>✅ Oracle manipulation damages</li>
              <li>✅ System failures causing losses</li>
              <li>✅ Cross-chain bridge failures</li>
            </ul>
          </div>

          <div className="not-covered">
            <h5>Not Covered</h5>
            <ul>
              <li>❌ User error or forgotten passwords</li>
              <li>❌ Market volatility losses</li>
              <li>❌ Impermanent loss in liquidity pools</li>
              <li>❌ Scams or phishing attacks</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
