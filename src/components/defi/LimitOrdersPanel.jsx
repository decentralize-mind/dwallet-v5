import { useState, useEffect } from 'react'
import { useWallet } from '../../context/WalletContext'
import { LimitOrders_ABI } from '../../config/abis'

const LIMIT_ORDERS_ADDRESS = '0x81C4684340f3Ff3B02a813653ADfAFFb67948FB7'
const PRICE_ORACLE_ADDRESS = '0x89be925c1F13AA14c343467883A82a7C2bC808d3'
const DWT_TOKEN_ADDRESS = '0x769F23dd0F6bc92C9d9d914190Ae9006d3FbDe48'
const USDC_TOKEN_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e' // Base Sepolia USDC

export default function LimitOrdersPanel() {
  const { wallet, provider } = useWallet()
  const [orderType, setOrderType] = useState('buy')
  const [price, setPrice] = useState('')
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [txHash, setTxHash] = useState(null)
  const [userOrders, setUserOrders] = useState([])
  const [nonce, setNonce] = useState(0)

  const FEE_BPS = 10 // 0.1%

  useEffect(() => {
    loadUserData()
  }, [wallet])

  const loadUserData = async () => {
    if (!provider || !wallet) return
    
    try {
      const contract = new ethers.Contract(LIMIT_ORDERS_ADDRESS, LimitOrders_ABI, provider)
      const userNonce = await contract.nonces(wallet.address)
      setNonce(Number(userNonce))
    } catch (error) {
      console.error('Error loading user data:', error)
    }
  }

  const handleCreateOrder = async () => {
    if (!wallet || !price || !amount) return
    
    setLoading(true)
    try {
      const signer = await provider.getSigner()
      const contract = new ethers.Contract(LIMIT_ORDERS_ADDRESS, LimitOrders_ABI, signer)
      
      // Determine tokens based on order type
      const tokenIn = orderType === 'buy' ? USDC_TOKEN_ADDRESS : DWT_TOKEN_ADDRESS
      const tokenOut = orderType === 'buy' ? DWT_TOKEN_ADDRESS : USDC_TOKEN_ADDRESS
      
      // Calculate amounts
      const amountIn = orderType === 'buy' 
        ? ethers.parseUnits((parseFloat(price) * parseFloat(amount)).toFixed(6), 6) // USDC has 6 decimals
        : ethers.parseEther(amount)
      
      const targetPrice = ethers.parseUnits(price, 6)
      const isBuy = orderType === 'buy'
      const deadline = Math.floor(Date.now() / 1000) + 86400 * 7 // 7 days
      const orderNonce = nonce
      
      // Create order struct
      const order = {
        maker: wallet.address,
        tokenIn,
        tokenOut,
        amountIn,
        targetPrice,
        isBuy,
        deadline,
        nonce: orderNonce
      }
      
      // Submit order to contract
      const tx = await contract.createOrder(order)
      setTxHash(tx.hash)
      
      await tx.wait()
      
      alert('Limit order created successfully!')
      await loadUserData()
      
      // Reset form
      setPrice('')
      setAmount('')
    } catch (error) {
      console.error('Order creation failed:', error)
      alert('Failed to create order: ' + (error.reason || error.message))
    } finally {
      setLoading(false)
    }
  }

  const handleCancelOrder = async (orderNonce) => {
    if (!wallet) return
    
    setLoading(true)
    try {
      const signer = await provider.getSigner()
      const contract = new ethers.Contract(LIMIT_ORDERS_ADDRESS, LimitOrders_ABI, signer)
      
      const tx = await contract.cancelOrder(orderNonce)
      await tx.wait()
      
      alert('Order cancelled successfully!')
      await loadUserData()
    } catch (error) {
      console.error('Order cancellation failed:', error)
      alert('Failed to cancel order: ' + (error.reason || error.message))
    } finally {
      setLoading(false)
    }
  }

  const total = price && amount ? (parseFloat(price) * parseFloat(amount)).toFixed(2) : '0.00'

  return (
    <div className="limit-orders-panel">
      <div className="panel-header">
        <h3>📈 Limit Orders</h3>
        <span className="badge-success">Active</span>
      </div>

      <div className="order-type-toggle">
        <button 
          className={orderType === 'buy' ? 'active buy' : ''}
          onClick={() => setOrderType('buy')}
        >
          Buy
        </button>
        <button 
          className={orderType === 'sell' ? 'active sell' : ''}
          onClick={() => setOrderType('sell')}
        >
          Sell
        </button>
      </div>

      <div className="order-form">
        <div className="input-group">
          <label>Price (USD per DWT)</label>
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="0.00"
            step="0.01"
          />
        </div>

        <div className="input-group">
          <label>Amount (DWT)</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            step="0.01"
          />
        </div>

        <div className="order-total">
          <span>Total:</span>
          <span className="total-value">${total}</span>
        </div>

        <button
          className={`btn-primary btn-order ${orderType}`}
          onClick={handleCreateOrder}
          disabled={!price || !amount || loading}
        >
          {loading ? 'Creating...' : `Create ${orderType.toUpperCase()} Order`}
        </button>

        <div className="info-box">
          <strong>ℹ️ How Limit Orders Work:</strong>
          <ul>
            <li>Set your desired price for DWT</li>
            <li>Order executes when market reaches your price</li>
            <li>Validated by price oracle for fairness</li>
            <li>Filler fee: 0.1% on execution</li>
          </ul>
        </div>

        {txHash && (
          <div className="tx-success">
            ✅ Order Created: <a href={`https://sepolia.basescan.org/tx/${txHash}`} target="_blank" rel="noopener noreferrer">
              View on BaseScan
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
