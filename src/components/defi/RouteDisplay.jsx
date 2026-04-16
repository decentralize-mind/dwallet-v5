/**
 * Route Display Component
 * 
 * Shows the trade route, selected DEX, price impact, and gas estimation.
 */

export default function RouteDisplay({ 
  route, 
  loading = false,
  error = null,
}) {
  if (loading) {
    return (
      <div className="route-display route-loading">
        <div className="route-spinner" />
        <span>Finding best route...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="route-display route-error">
        <span className="error-icon">⚠️</span>
        <span>{error}</span>
      </div>
    )
  }

  if (!route) {
    return null
  }

  const priceImpactColor = 
    route.priceImpact > 5 ? 'text-red-500' :
    route.priceImpact > 3 ? 'text-yellow-500' :
    'text-green-500'

  return (
    <div className="route-display">
      <div className="route-header">
        <span className="route-dex-badge">{route.dex}</span>
        <span className="route-label">Best Route</span>
      </div>

      <div className="route-details">
        <div className="route-row">
          <span className="route-label">Price Impact</span>
          <span className={`route-value ${priceImpactColor}`}>
            {route.priceImpact.toFixed(2)}%
          </span>
        </div>

        {route.gasEstimate && (
          <div className="route-row">
            <span className="route-label">Est. Gas</span>
            <span className="route-value">
              ~${(route.gasUSD || 0).toFixed(2)}
            </span>
          </div>
        )}

        {route.protocols && route.protocols.length > 0 && (
          <div className="route-row">
            <span className="route-label">Liquidity Sources</span>
            <span className="route-value">
              {route.protocols.map(p => p[0]?.name).join(', ')}
            </span>
          </div>
        )}
      </div>

      {route.allQuotes && route.allQuotes.length > 1 && (
        <div className="route-comparison">
          <div className="comparison-header">All Routes</div>
          {route.allQuotes
            .sort((a, b) => BigInt(b.amountOut) - BigInt(a.amountOut))
            .map((quote, index) => (
              <div
                key={quote.dex}
                className={`comparison-row ${
                  quote.dex === route.dex ? 'best-route' : ''
                }`}
              >
                <span className="dex-name">{quote.dex}</span>
                <span className="dex-amount">
                  {Number(quote.amountOut) / 1e18} tokens
                </span>
                {index === 0 && <span className="best-badge">Best</span>}
              </div>
            ))}
        </div>
      )}
    </div>
  )
}
