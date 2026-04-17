import { useState, useEffect } from 'react'
import { useWallet } from '../../context/WalletContext'
import { ethers } from 'ethers'

const FLASH_LOAN_ADDRESS = '0x468772f20864403A0071690ef8c620D9E02BD649'
const FLASH_LOAN_RECEIVER_ADDRESS = '0x89b1E2b38196AD9F8dbC7fA75e8B135ac492B6c4'
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
      const amount = ethers.parseEther(borrowAmount)
      
      // Verify we're on Base Sepolia
      if (typeof window.ethereum === 'undefined') {
        alert('Please install MetaMask or another Web3 wallet to execute flash loans.')
        return
      }

      // Create signer from browser wallet
      const browserProvider = new ethers.BrowserProvider(window.ethereum)
      const signer = await browserProvider.getSigner()
      
      // Check current network
      const network = await browserProvider.getNetwork()
      const BASE_SEPOLIA_CHAIN_ID = 84532n
      
      if (network.chainId !== BASE_SEPOLIA_CHAIN_ID) {
        console.log('Wrong network detected. Current:', network.chainId, 'Expected:', BASE_SEPOLIA_CHAIN_ID)
        
        // Try to switch to Base Sepolia automatically
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0x14a34' }], // 84532 in hex
          })
          console.log('Successfully switched to Base Sepolia')
          
          // Wait a moment for the network switch
          await new Promise(resolve => setTimeout(resolve, 1000))
          
          // Re-create provider with new network
          const newProvider = new ethers.BrowserProvider(window.ethereum)
          const newSigner = await newProvider.getSigner()
          
          // Continue with the rest of the function using newSigner
          return await executeFlashLoan(newProvider, newSigner, amount)
        } catch (switchError) {
          // This error code indicates that the chain has not been added to MetaMask
          if (switchError.code === 4902) {
            try {
              await window.ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [{
                  chainId: '0x14a34',
                  chainName: 'Base Sepolia',
                  nativeCurrency: {
                    name: 'Ethereum',
                    symbol: 'ETH',
                    decimals: 18
                  },
                  rpcUrls: ['https://sepolia.base.org'],
                  blockExplorerUrls: ['https://sepolia.basescan.org']
                }],
              })
              console.log('Base Sepolia network added')
              
              // Wait for network switch
              await new Promise(resolve => setTimeout(resolve, 1000))
              
              // Re-create provider
              const newProvider = new ethers.BrowserProvider(window.ethereum)
              const newSigner = await newProvider.getSigner()
              
              return await executeFlashLoan(newProvider, newSigner, amount)
            } catch (addError) {
              console.error('Failed to add Base Sepolia network:', addError)
              alert('Failed to add Base Sepolia network. Please add it manually in your wallet settings.')
              return
            }
          } else {
            console.error('Failed to switch network:', switchError)
            alert('Please manually switch to Base Sepolia network in your wallet.\n\nNetwork Details:\n- Name: Base Sepolia\n- Chain ID: 84532\n- RPC: https://sepolia.base.org')
            return
          }
        }
      }
      
      // If we're already on the correct network, execute directly
      return await executeFlashLoan(browserProvider, signer, amount)
      
    } catch (error) {
      console.error('Flash loan failed:', error)
      
      // Better error handling
      let errorMessage = 'Flash loan failed: '
      if (error.reason) {
        errorMessage += error.reason
      } else if (error.message) {
        if (error.message.includes('missing revert data')) {
          errorMessage += 'Transaction reverted. You may not have enough DWT for the fee.'
        } else {
          errorMessage += error.message
        }
      } else {
        errorMessage += 'Unknown error'
      }
      
      alert(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  // Helper function to execute the actual flash loan
  const executeFlashLoan = async (provider, signer, amount) => {
    try {
      // First, approve DWT spending for the fee
      const IERC20ABI = [
        'function approve(address spender, uint256 amount) returns (bool)',
        'function allowance(address owner, address spender) view returns (uint256)'
      ]
      
      const fee = (amount * 9n) / 10000n // 0.09% fee
      const tokenContract = new ethers.Contract(DWT_TOKEN_ADDRESS, IERC20ABI, signer)
      
      const allowance = await tokenContract.allowance(wallet.address, FLASH_LOAN_RECEIVER_ADDRESS)
      if (allowance < fee) {
        console.log('Approving DWT for flash loan fee...')
        const approveTx = await tokenContract.approve(FLASH_LOAN_RECEIVER_ADDRESS, fee)
        await approveTx.wait()
        console.log('Approval successful')
      }

      // Call FlashLoanReceiver to execute the flash loan
      const receiverABI = [
        'function executeFlashLoan(address token, uint256 amount, bytes calldata data) external'
      ]
      
      const receiverContract = new ethers.Contract(FLASH_LOAN_RECEIVER_ADDRESS, receiverABI, signer)
      
      // Estimate gas first
      try {
        const gasEstimate = await receiverContract.executeFlashLoan.estimateGas(DWT_TOKEN_ADDRESS, amount, '0x')
        console.log('Gas estimate:', gasEstimate.toString())
      } catch (estimateError) {
        console.error('Gas estimation failed:', estimateError)
        alert('Transaction would fail. Please ensure you have enough DWT for the fee (0.09%).')
        return
      }
      
      // Execute flash loan through receiver
      const tx = await receiverContract.executeFlashLoan(DWT_TOKEN_ADDRESS, amount, '0x', {
        gasLimit: 500000
      })
      
      setTxHash(tx.hash)
      console.log('Transaction sent:', tx.hash)
      
      await tx.wait()
      await loadPoolData()
      
      alert('Flash loan executed successfully!')
    } catch (error) {
      console.error('Flash loan failed:', error)
      
      // Better error handling
      let errorMessage = 'Flash loan failed: '
      if (error.reason) {
        errorMessage += error.reason
      } else if (error.message) {
        if (error.message.includes('missing revert data')) {
          errorMessage += 'Transaction reverted. You may not have enough DWT for the fee.'
        } else {
          errorMessage += error.message
        }
      } else {
        errorMessage += 'Unknown error'
      }
      
      alert(errorMessage)
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
          disabled={!borrowAmount || loading || parseFloat(borrowAmount) > maxLoan || maxLoan === 0}
          title={maxLoan === 0 ? "Flash loan pool is not configured yet" : ""}
        >
          {loading ? 'Processing...' : maxLoan === 0 ? 'Pool Not Configured' : 'Execute Flash Loan'}
        </button>

        <div className="info-box">
          <strong>ℹ️ Important:</strong>
          <ul>
            <li>Flash loans must be repaid in the same transaction</li>
            <li>Use for arbitrage, liquidation, or collateral swapping</li>
            <li>Maximum 50% of pool per transaction</li>
            <li>Fee: 0.09% of borrowed amount</li>
            <li><strong>Note:</strong> You need DWT tokens in your wallet to pay the flash loan fee</li>
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
