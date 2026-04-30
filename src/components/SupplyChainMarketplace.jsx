import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { LAYER11_ADDRESSES, LAYER11_ABIS } from '../config/layer11-contracts'

export default function SupplyChainMarketplace({ signer, walletAddress }) {
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)

  const marketplaceContract = new ethers.Contract(
    LAYER11_ADDRESSES.baseSepolia.INVOICE_MARKETPLACE,
    LAYER11_ABIS.INVOICE_MARKETPLACE,
    signer
  )

  useEffect(() => {
    loadListings()
  }, [signer])

  const loadListings = async () => {
    try {
      setListings([])
      setLoading(false)
    } catch (error) {
      console.error('Failed to load listings:', error)
      setLoading(false)
    }
  }

  const listInvoice = async (invoiceId, price) => {
    try {
      const tx = await marketplaceContract.listInvoice(invoiceId, price)
      await tx.wait()
      alert('✅ Invoice listed on marketplace successfully!')
      loadListings()
    } catch (error) {
      console.error('Failed to list invoice:', error)
      alert('❌ Failed to list invoice: ' + error.message)
    }
  }

  const purchaseInvoice = async (listingId, price) => {
    try {
      const tx = await marketplaceContract.purchaseInvoice(listingId, {
        value: ethers.parseEther(price.toString())
      })
      await tx.wait()
      alert('✅ Invoice purchased successfully!')
      loadListings()
    } catch (error) {
      console.error('Failed to purchase invoice:', error)
      alert('❌ Failed to purchase invoice: ' + error.message)
    }
  }

  const cancelListing = async (listingId) => {
    try {
      const tx = await marketplaceContract.cancelListing(listingId)
      await tx.wait()
      alert('✅ Listing cancelled successfully!')
      loadListings()
    } catch (error) {
      console.error('Failed to cancel listing:', error)
      alert('❌ Failed to cancel listing: ' + error.message)
    }
  }

  if (loading) {
    return <div className="sc-loading"><p>Loading marketplace...</p></div>
  }

  return (
    <div className="sc-marketplace">
      <div className="sc-section-header">
        <h2>🏪 Invoice Marketplace</h2>
        <button 
          className="sc-btn-primary"
          onClick={() => listInvoice(
            prompt('Invoice ID:'),
            prompt('Price (DWT):')
          )}
        >
          List Invoice for Sale
        </button>
      </div>

      {listings.length === 0 ? (
        <div className="sc-empty-state">
          <div className="sc-empty-icon">🏪</div>
          <p>No invoices listed on marketplace</p>
          <p className="sc-text-muted">List your invoices for secondary trading</p>
          <button 
            className="sc-btn-primary"
            onClick={() => listInvoice(prompt('Invoice ID:'), prompt('Price:'))}
          >
            List First Invoice
          </button>
        </div>
      ) : (
        <div className="sc-listings-grid">
          {listings.map((listing) => (
            <div key={listing.id} className="sc-listing-card">
              <div className="sc-listing-header">
                <h3>Invoice #{listing.invoiceId}</h3>
                <span className={`sc-status-badge sc-status-${listing.active ? 'active' : 'sold'}`}>
                  {listing.active ? 'Active' : 'Sold'}
                </span>
              </div>

              <div className="sc-listing-details">
                <p><strong>Listing ID:</strong> #{listing.id}</p>
                <p><strong>Seller:</strong> {listing.seller.slice(0, 6)}...{listing.seller.slice(-4)}</p>
                <p><strong>Price:</strong> {listing.price.toLocaleString()} DWT</p>
                <p><strong>Due Date:</strong> {new Date(listing.dueDate * 1000).toLocaleDateString()}</p>
              </div>

              <div className="sc-listing-actions">
                {listing.active && listing.seller !== walletAddress && (
                  <button 
                    className="sc-btn-sm sc-btn-success"
                    onClick={() => purchaseInvoice(listing.id, listing.price)}
                  >
                    Purchase Invoice
                  </button>
                )}
                {listing.active && listing.seller === walletAddress && (
                  <button 
                    className="sc-btn-sm sc-btn-warning"
                    onClick={() => cancelListing(listing.id)}
                  >
                    Cancel Listing
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Marketplace Statistics */}
      <div className="sc-section">
        <h3>📊 Marketplace Statistics</h3>
        <div className="sc-stats-grid">
          <div className="sc-stat-card">
            <div className="sc-stat-value">{listings.filter(l => l.active).length}</div>
            <div className="sc-stat-label">Active Listings</div>
          </div>
          <div className="sc-stat-card">
            <div className="sc-stat-value">{listings.filter(l => !l.active).length}</div>
            <div className="sc-stat-label">Sold Invoices</div>
          </div>
          <div className="sc-stat-card">
            <div className="sc-stat-value">
              {listings.reduce((sum, l) => sum + (l.active ? l.price : 0), 0).toLocaleString()}
            </div>
            <div className="sc-stat-label">Total Volume (DWT)</div>
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div className="sc-section">
        <h3>ℹ️ How It Works</h3>
        <div className="sc-info-grid">
          <div className="sc-info-card">
            <h4>1. List Invoice</h4>
            <p>Select an invoice you own and set a sale price</p>
          </div>
          <div className="sc-info-card">
            <h4>2. Buyer Purchases</h4>
            <p>Interested buyers can purchase your invoice at your set price</p>
          </div>
          <div className="sc-info-card">
            <h4>3. Transfer Ownership</h4>
            <p>Invoice ownership is transferred to the buyer automatically</p>
          </div>
          <div className="sc-info-card">
            <h4>4. Receive Payment</h4>
            <p>You receive the payment directly to your wallet</p>
          </div>
        </div>
      </div>
    </div>
  )
}
