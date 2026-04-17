import { useState, useEffect } from 'react'
import { useWallet } from '../../context/WalletContext'
import { ethers } from 'ethers'

const FLASH_LOAN_ADDRESS = '0x468772f20864403A0071690ef8c620D9E02BD649'
const DWT_TOKEN_ADDRESS = '0x769F23dd0F6bc92C9d9d914190Ae9006d3FbDe48'

// Base Sepolia RPC
const BASE_SEPOLIA_RPC = 'https://sepolia.base.org'

function getBaseSepoliaProvider() {
  return new ethers.JsonRpcProvider(BASE_SEPOLIA_RPC)
}

export default function FlashLoanPanel() {
  const { wallet } = useWallet()
  const [borrowAmount, setBorrowAmount] = useState('')
  const [poolBalance, setPoolBalance] = useState(0)
  const [maxLoan, setMaxLoan] = useState(0)
  const [loading, setLoading] = useState(false)
  const [txHash, setTxHash] = useState(null)

  const FEE_BPS = 9 // 0.09%
  const FEE_PERCENT = 0.09

  useEffect(() => {
    loadPoolData()
  }, [wallet])

  const loadPoolData = async () => {
    if (!wallet) {
      console.log('Wallet not available')
      return
    }
    
    try {
      const provider = getBaseSepoliaProvider()
      if (!provider) {
        console.error('Provider not configured')
        // Set default values
        setPoolBalance(50000)
        setMaxLoan(25000)
        return
      }

      console.log('Loading pool data from:', FLASH_LOAN_ADDRESS)
      const flashLoanABI = [
        'function getPoolBalance(address token) view returns (uint256)',
        'function getMaxFlashLoan(address token) view returns (uint256)'
      ]
      
      const contract = new ethers.Contract(FLASH_LOAN_ADDRESS, flashLoanABI, provider)
      const balance = await contract.getPoolBalance(DWT_TOKEN_ADDRESS)
      const max = await contract.getMaxFlashLoan(DWT_TOKEN_ADDRESS)
      
      console.log('Pool balance:', ethers.formatEther(balance))
      console.log('Max loan:', ethers.formatEther(max))
      
      setPoolBalance(Number(ethers.formatEther(balance)))
      setMaxLoan(Number(ethers.formatEther(max)))
    } catch (error) {
      console.error('Error loading pool data:', error)
      // Set default values if contract call fails
      setPoolBalance(50000)
      setMaxLoan(25000)
    }
  }

  const calculateFee = (amount) => {
    return (amount * FEE_PERCENT) / 100
  }

  const calculateRepayment = (amount) => {
    return parseFloat(amount) + calculateFee(parseFloat(amount))
  }

  const handleBorrow = async () => {
    if (!wallet || !borrowAmount) return
    
    setLoading(true)
    try {
      const provider = getBaseSepoliaProvider()
      if (!provider) {
        alert('Provider not configured. Please check your settings.')
        return
      }

      const amount = ethers.parseEther(borrowAmount)
      
      const flashLoanABI = [
        'function flashLoan(address token, uint256 amount, bytes calldata callbackData) external'
      ]
      
      // For Base Sepolia, we need to use browser wallet (MetaMask, etc.)
      if (typeof window.ethereum === 'undefined') {
        alert('Please install MetaMask or another Web3 wallet to execute flash loans.')
        return
      }

      // Create signer from browser wallet
      const browserProvider = new ethers.BrowserProvider(window.ethereum)
      const signer = await browserProvider.getSigner()
      
      // Verify we're on Base Sepolia
      const network = await browserProvider.getNetwork()
      if (network.chainId !== 84532n) { // 84532 is Base Sepolia chain ID
        alert('Please switch to Base Sepolia network (Chain ID: 84532)')
        return
      }

      const contract = new ethers.Contract(FLASH_LOAN_ADDRESS, flashLoanABI, signer)
      
      // Empty callback data for simple borrow
      const tx = await contract.flashLoan(DWT_TOKEN_ADDRESS, amount, '0x')
      setTxHash(tx.hash)
      
      await tx.wait()
      await loadPoolData()
      
      alert('Flash loan executed successfully!')
    } catch (error) {
      console.error('Flash loan failed:', error)
      alert('Flash loan failed: ' + (error.reason || error.message))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flash-loan-panel">
      <div className="panel-header">
        <h3>⚡ Flash Loans</h3>
        <span className="badge-success">Active</span>
      </div>

      <div className="pool-stats">
        <div className="stat-card">
          <div className="stat-label">Pool Balance</div>
          <div className="stat-value">{poolBalance.toLocaleString()} DWT</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Max Loan</div>
          <div className="stat-value">{maxLoan.toLocaleString()} DWT</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Fee</div>
          <div className="stat-value">{FEE_PERCENT}%</div>
        </div>
      </div>

      <div className="borrow-form">
        <h4>Borrow DWT</h4>
        
        <div className="input-group">
          <label>Amount (DWT)</label>
          <input
            type="number"
            value={borrowAmount}
            onChange={(e) => setBorrowAmount(e.target.value)}
            placeholder="Enter amount"
            max={maxLoan}
            min="0"
            step="0.01"
          />
          <button 
            className="btn-max"
            onClick={() => setBorrowAmount(maxLoan.toString())}
          >
            MAX
          </button>
        </div>

        {borrowAmount && (
          <div className="loan-details">
            <div className="detail-row">
              <span>Borrow Amount:</span>
              <span>{parseFloat(borrowAmount).toLocaleString()} DWT</span>
            </div>
            <div className="detail-row">
              <span>Fee ({FEE_PERCENT}%):</span>
              <span>{calculateFee(parseFloat(borrowAmount)).toFixed(2)} DWT</span>
            </div>
            <div className="detail-row total">
              <span>Repayment Required:</span>
              <span>{calculateRepayment(borrowAmount).toFixed(2)} DWT</span>
            </div>
          </div>
        )}

        <button
          className="btn-primary btn-borrow"
          onClick={handleBorrow}
          disabled={!borrowAmount || loading || parseFloat(borrowAmount) > maxLoan}
        >
          {loading ? 'Processing...' : 'Execute Flash Loan'}
        </button>

        <div className="info-box">
          <strong>ℹ️ Important:</strong>
          <ul>
            <li>Flash loans must be repaid in the same transaction</li>
            <li>Use for arbitrage, liquidation, or collateral swapping</li>
            <li>Maximum 50% of pool per transaction</li>
            <li>Fee: 0.09% of borrowed amount</li>
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
    </div>
  )
}
