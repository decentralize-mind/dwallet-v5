import { useState } from 'react'
import { useWallet } from '../../context/WalletContext'

const LIMIT_ORDERS_ADDRESS = '0x81C4684340f3Ff3B02a813653ADfAFFb67948FB7'
const PRICE_ORACLE_ADDRESS = '0x89be925c1F13AA14c343467883A82a7C2bC808d3'

export default function LimitOrdersPanel() {
  const { wallet, provider } = useWallet()
  const [orderType, setOrderType] = useState('buy')
  const [price, setPrice] = useState('')
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)

  const FEE_BPS = 10 // 0.1%

  const handleCreateOrder = async () => {
    if (!wallet || !price || !amount) return
    
    setLoading(true)
    try {
      alert('Limit order feature coming soon! This will integrate with the deployed contract.')
    } catch (error) {
      console.error('Order creation failed:', error)
      alert('Failed to create order: ' + error.message)
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
      </div>
    </div>
  )
}
