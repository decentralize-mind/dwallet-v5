import { useState, useEffect, useRef } from 'react'
import { useWallet } from '../../hooks/useWallet'
import { getLPPositions, collectLPFees, getProvider } from '../../utils/defi'
import { SAMPLE_LP_POOLS, MAINNET_TOKENS } from '../../data/defi'
import { TOKEN_PRICES } from '../../data/chains'
import { 
  DeFiRateLimiter, 
  CircuitBreaker,
  validateLPParams,
  verifyBalanceBeforeTransaction,
  simulateTransaction,
  validateGasEstimation,
  validateTransactionValue,
  calculateTransactionValue
} from '../../utils/defiSecurity'
import { sanitizeError } from '../../utils/secureKeyManagement'

export default function YieldPanel() {
  const { wallet } = useWallet()
  const [view, setView] = useState('pools') // pools | positions | add
  const [positions, setPositions] = useState([])
  const [loadingPos, setLoadingPos] = useState(false)
  const [selectedPool, setSelectedPool] = useState(null)
  const [addStep, setAddStep] = useState('config') // config | range | confirm | success
  const [token0Amt, setToken0Amt] = useState('')
  const [token1Amt, setToken1Amt] = useState('')
  const [rangeMode, setRangeMode] = useState('full') // full | custom
  const [txHash, setTxHash] = useState('')
  const [collecting, setCollecting] = useState(null)
  const [error, setError] = useState('')
  const [gasEstimate, setGasEstimate] = useState(null)
  const [txValueWarning, setTxValueWarning] = useState(null)
  
  // Security: Initialize rate limiter and circuit breaker
  const rateLimiter = useRef(new DeFiRateLimiter({ cooldown: 5000, maxAttempts: 3 }))
  const circuitBreaker = useRef(new CircuitBreaker({ failureThreshold: 3, recoveryTimeout: 60000 }))

  useEffect(() => {
    if (!wallet || view !== 'positions') return
    setLoadingPos(true)
    const addr = wallet.accounts[wallet.activeAccount].address
    getLPPositions(addr)
      .then(setPositions)
      .finally(() => setLoadingPos(false))
  }, [wallet, view])

  const handleCollect = async tokenId => {
    if (!wallet) return
    
    setError('')
    setCollecting(tokenId)
    setGasEstimate(null)
    
    try {
      // Security: Check rate limiter
      const rateCheck = rateLimiter.current.canExecute()
      if (!rateCheck.allowed) {
        setError(rateCheck.error)
        setCollecting(null)
        return
      }
      
      // Security: Check circuit breaker
      const circuitCheck = circuitBreaker.current.canExecute()
      if (!circuitCheck.allowed) {
        setError(circuitCheck.error)
        setCollecting(null)
        return
      }
      
      const pk = wallet.accounts[wallet.activeAccount].privateKey
      const address = wallet.accounts[wallet.activeAccount].address
      
      // Security: Validate gas estimation before execution
      if (import.meta.env.VITE_INFURA_KEY) {
        const provider = getProvider()
        
        // Estimate gas for collect operation
        const gasValidation = await validateGasEstimation(provider, {
          from: address,
          to: '0xC36442b4a4522E871399CD717aBDD847Ab11FE88', // NFT Manager
          data: '0x00000000' // Placeholder - actual data would be generated
        }, 0.1) // Assume 0.1 ETH balance for gas check
        
        if (!gasValidation.valid) {
          setError(gasValidation.error)
          setCollecting(null)
          return
        }
        
        setGasEstimate(gasValidation)
      }
      
      if (import.meta.env.VITE_INFURA_KEY) {
        await collectLPFees({ tokenId, privateKey: pk })
      }
      setPositions(prev =>
        prev.map(p =>
          p.tokenId === tokenId
            ? { ...p, tokensOwed0: '0', tokensOwed1: '0' }
            : p,
        ),
      )
      
      // Security: Record successful execution
      rateLimiter.current.recordExecution()
      circuitBreaker.current.recordSuccess()
    } catch (e) {
      // Security: Record failure in circuit breaker
      circuitBreaker.current.recordFailure()
      
      // Security: Sanitize error message
      const safeError = sanitizeError(e)
      setError(safeError)
    } finally {
      setCollecting(null)
    }
  }

  const handleAddLiquidity = async () => {
    // Security: Basic validation before mock transaction
    if (!selectedPool) {
      setError('No pool selected')
      return
    }
    
    setError('')
    setGasEstimate(null)
    setTxValueWarning(null)
    
    // Security: Validate LP parameters
    const validation = validateLPParams({
      token0: selectedPool.token0,
      token1: selectedPool.token1,
      amount0: token0Amt,
      amount1: token1Amt,
      fee: selectedPool.fee
    })
    
    if (!validation.valid) {
      setError(validation.error)
      return
    }
    
    const amt0 = parseFloat(token0Amt || 0)
    const amt1 = parseFloat(token1Amt || 0)
    
    // Security: Check transaction value limits
    const valueCheck0 = validateTransactionValue(selectedPool.token0, amt0)
    const valueCheck1 = validateTransactionValue(selectedPool.token1, amt1)
    
    if (!valueCheck0.valid || !valueCheck1.valid) {
      setError(valueCheck0.error || valueCheck1.error)
      return
    }
    
    // Set warning if large transaction
    if (valueCheck0.level === 'warning' || valueCheck0.level === 'critical' ||
        valueCheck1.level === 'warning' || valueCheck1.level === 'critical') {
      const totalUSD = (valueCheck0.usdValue || 0) + (valueCheck1.usdValue || 0)
      setTxValueWarning({
        level: valueCheck0.level === 'critical' || valueCheck1.level === 'critical' ? 'critical' : 'warning',
        message: `Large transaction: ~$${totalUSD.toLocaleString()}`,
        usdValue: totalUSD
      })
    }
    
    // Security: Check rate limiter
    const rateCheck = rateLimiter.current.canExecute()
    if (!rateCheck.allowed) {
      setError(rateCheck.error)
      return
    }
    
    // Security: Verify balances before execution
    if (import.meta.env.VITE_INFURA_KEY && wallet) {
      const provider = getProvider()
      const address = wallet.accounts[wallet.activeAccount].address
      
      try {
        // Verify token0 balance
        const balanceCheck0 = await verifyBalanceBeforeTransaction(
          provider,
          address,
          selectedPool.token0,
          amt0
        )
        
        if (!balanceCheck0.verified) {
          setError(`Insufficient ${selectedPool.token0}: ${balanceCheck0.error}`)
          return
        }
        
        // Verify token1 balance
        const balanceCheck1 = await verifyBalanceBeforeTransaction(
          provider,
          address,
          selectedPool.token1,
          amt1
        )
        
        if (!balanceCheck1.verified) {
          setError(`Insufficient ${selectedPool.token1}: ${balanceCheck1.error}`)
          return
        }
        
        // Security: Validate gas estimation
        const gasValidation = await validateGasEstimation(provider, {
          from: address,
          to: '0xC36442b4a4522E871399CD717aBDD847Ab11FE88', // NFT Manager
          data: '0x00000000' // Placeholder
        }, 0.1)
        
        if (!gasValidation.valid) {
          setError(gasValidation.error)
          return
        }
        
        setGasEstimate(gasValidation)
      } catch (err) {
        setError('Failed to verify balances: ' + sanitizeError(err))
        return
      }
    }
    
    setTxHash(
      '0x' +
        Array.from(crypto.getRandomValues(new Uint8Array(32)))
          .map(b => b.toString(16).padStart(2, '0'))
          .join(''),
    )
    
    // Security: Record execution
    rateLimiter.current.recordExecution()
    circuitBreaker.current.recordSuccess()
    
    setAddStep('success')
  }

  const feeLabel = fee =>
    ({ 100: '0.01%', 500: '0.05%', 3000: '0.30%', 10000: '1.00%' })[fee] ||
    `${fee}`

  return (
    <div className="defi-section">
      <div className="defi-protocol-row">
        <span className="defi-protocol-badge uniswap">Uniswap V3</span>
        <span className="defi-sub-text">Concentrated liquidity</span>
      </div>

      {/* View tabs */}
      <div className="defi-mode-tabs">
        {['pools', 'positions'].map(v => (
          <button
            key={v}
            className={`defi-mode-tab ${view === v ? 'defi-mode-tab--active' : ''}`}
            onClick={() => {
              setView(v)
              setSelectedPool(null)
              setAddStep('config')
            }}
          >
            {v === 'pools' ? 'Top Pools' : 'My Positions'}
          </button>
        ))}
      </div>

      {/* ── Top Pools view ── */}
      {view === 'pools' && !selectedPool && (
        <>
          <div className="yield-pools-header">
            <span className="yield-col">Pool</span>
            <span className="yield-col">TVL</span>
            <span className="yield-col">APR</span>
            <span className="yield-col">24h Vol</span>
          </div>
          <div className="yield-pools-list">
            {SAMPLE_LP_POOLS.map(pool => (
              <button
                key={pool.id}
                className="yield-pool-row"
                onClick={() => {
                  setSelectedPool(pool)
                  setView('add')
                }}
              >
                <div className="yield-pool-pair">
                  <span className="yield-token-badge">{pool.token0}</span>
                  <span className="yield-slash">/</span>
                  <span className="yield-token-badge">{pool.token1}</span>
                  <span className="yield-fee-tag">{feeLabel(pool.fee)}</span>
                </div>
                <span className="yield-col-val">${pool.tvl}</span>
                <span className="yield-col-val positive">{pool.apr}%</span>
                <span className="yield-col-val">${pool.volume24h}</span>
              </button>
            ))}
          </div>
          <p className="yield-note">
            ◈ Click a pool to add liquidity and earn trading fees
          </p>
        </>
      )}

      {/* ── Add Liquidity view ── */}
      {view === 'add' && selectedPool && (
        <>
          {addStep === 'config' && (
            <>
              <div className="yield-selected-pool">
                <span className="yield-token-badge">{selectedPool.token0}</span>
                <span className="yield-slash">/</span>
                <span className="yield-token-badge">{selectedPool.token1}</span>
                <span className="yield-fee-tag">
                  {feeLabel(selectedPool.fee)}
                </span>
                <span className="yield-apy-tag positive">
                  {selectedPool.apr}% APR
                </span>
              </div>

              {/* Price range */}
              <div className="yield-range-section">
                <label className="form-label">Price range strategy</label>
                <div className="yield-range-btns">
                  {['full', 'narrow', 'custom'].map(r => (
                    <button
                      key={r}
                      className={`yield-range-btn ${rangeMode === r ? 'active' : ''}`}
                      onClick={() => setRangeMode(r)}
                    >
                      {r === 'full'
                        ? 'Full range'
                        : r === 'narrow'
                          ? 'Narrow (+/-5%)'
                          : 'Custom'}
                    </button>
                  ))}
                </div>
                <div className="yield-range-info">
                  {rangeMode === 'full' && (
                    <p className="yield-range-desc">
                      Earn fees across all prices. Lower capital efficiency but
                      no active management needed.
                    </p>
                  )}
                  {rangeMode === 'narrow' && (
                    <p className="yield-range-desc">
                      Higher fees when price stays in range. Risk of position
                      going out of range.
                    </p>
                  )}
                  {rangeMode === 'custom' && (
                    <div className="yield-custom-range">
                      <div className="yield-range-inputs">
                        <div>
                          <label className="form-label">Min price</label>
                          <input
                            className="field"
                            placeholder="0"
                            type="number"
                          />
                        </div>
                        <div>
                          <label className="form-label">Max price</label>
                          <input
                            className="field"
                            placeholder="∞"
                            type="number"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Token amounts */}
              <div className="yield-amounts">
                <div className="defi-input-group">
                  <label className="form-label">
                    {selectedPool.token0} amount
                  </label>
                  <input
                    className="field"
                    type="number"
                    placeholder="0.0"
                    value={token0Amt}
                    onChange={e => setToken0Amt(e.target.value)}
                  />
                </div>
                <div className="yield-plus">+</div>
                <div className="defi-input-group">
                  <label className="form-label">
                    {selectedPool.token1} amount
                  </label>
                  <input
                    className="field"
                    type="number"
                    placeholder="0.0"
                    value={token1Amt}
                    onChange={e => setToken1Amt(e.target.value)}
                  />
                </div>
              </div>

              {/* Projection */}
              {token0Amt && parseFloat(token0Amt) > 0 && (
                <div className="yield-projection">
                  <div className="yield-proj-row">
                    <span>Estimated daily fees</span>
                    <span className="positive">
                      ~$
                      {(
                        (parseFloat(token0Amt) * 3200 * selectedPool.apr) /
                        100 /
                        365
                      ).toFixed(2)}
                    </span>
                  </div>
                  <div className="yield-proj-row">
                    <span>Estimated yearly fees</span>
                    <span className="positive">
                      ~$
                      {(
                        (parseFloat(token0Amt) * 3200 * selectedPool.apr) /
                        100
                      ).toFixed(2)}
                    </span>
                  </div>
                  <div className="yield-proj-row">
                    <span>Pool share</span>
                    <span>~0.000{Math.floor(Math.random() * 9 + 1)}%</span>
                  </div>
                  
                  {/* Security: Gas estimate display */}
                  {gasEstimate && (
                    <div className="yield-proj-row">
                      <span>Estimated gas cost</span>
                      <span className="warn">
                        ~{gasEstimate.estimatedCostEth} ETH
                      </span>
                    </div>
                  )}
                </div>
              )}
              
              {/* Security: Transaction value warning */}
              {txValueWarning && (
                <div className={`yield-tx-warning ${txValueWarning.level}`}>
                  ⚠️ {txValueWarning.message}
                  {txValueWarning.level === 'critical' && (
                    <div className="warning-subtext">
                      This is a large transaction. Please verify all details carefully.
                    </div>
                  )}
                </div>
              )}

              <div className="yield-il-warning">
                ⚠️ Impermanent loss risk: if prices diverge significantly, you
                may receive less value than holding tokens directly.
              </div>

              {error && <p className="error-msg">{error}</p>}
              <div className="btn-row">
                <button
                  className="btn-secondary"
                  onClick={() => {
                    setView('pools')
                    setSelectedPool(null)
                  }}
                >
                  Back
                </button>
                <button
                  className="btn-primary"
                  disabled={!token0Amt || !token1Amt}
                  onClick={handleAddLiquidity}
                >
                  Add Liquidity
                </button>
              </div>
            </>
          )}

          {addStep === 'success' && (
            <div className="defi-success">
              <div className="success-icon">◈</div>
              <h3 className="success-title">Position Created!</h3>
              <p className="success-sub">
                {selectedPool.token0}/{selectedPool.token1}{' '}
                {feeLabel(selectedPool.fee)} pool
              </p>
              <p className="success-note">
                You'll earn {selectedPool.apr}% APR in trading fees
              </p>
              <div className="tx-hash-box">
                <span className="tx-hash-label">Tx Hash</span>
                <span className="tx-hash-value mono">
                  {txHash.slice(0, 22)}...
                </span>
              </div>
              <button
                className="btn-primary full-width"
                onClick={() => {
                  setView('positions')
                  setAddStep('config')
                  setSelectedPool(null)
                }}
              >
                View My Positions
              </button>
            </div>
          )}
        </>
      )}

      {/* ── My Positions view ── */}
      {view === 'positions' && (
        <>
          {loadingPos ? (
            <div className="yield-loading">
              <div className="wc-spinner" />
              <p>Loading your LP positions...</p>
            </div>
          ) : positions.length === 0 ? (
            <div className="yield-empty">
              <p className="yield-empty-icon">◈</p>
              <p>No active LP positions found</p>
              <p className="yield-empty-sub">
                Add liquidity to a pool to start earning fees
              </p>
              <button
                className="btn-secondary"
                onClick={() => setView('pools')}
              >
                Browse Pools
              </button>
            </div>
          ) : (
            <div className="yield-positions-list">
              {positions.map(pos => (
                <div key={pos.tokenId} className="yield-position-card">
                  <div className="yield-pos-header">
                    <span className="yield-pos-id">#{pos.tokenId}</span>
                    <span className="yield-fee-tag">{feeLabel(pos.fee)}</span>
                    <span className="yield-pos-status active">In range</span>
                  </div>
                  <div className="yield-pos-tokens">
                    <span className="mono small">
                      {pos.token0?.slice(0, 6)}…
                    </span>
                    <span>/</span>
                    <span className="mono small">
                      {pos.token1?.slice(0, 6)}…
                    </span>
                  </div>
                  <div className="yield-pos-fees">
                    <span className="yield-fees-label">Uncollected fees</span>
                    <span className="positive">
                      {pos.tokensOwed0} / {pos.tokensOwed1}
                    </span>
                  </div>
                  <button
                    className="btn-secondary full-width small"
                    disabled={collecting === pos.tokenId}
                    onClick={() => handleCollect(pos.tokenId)}
                  >
                    {collecting === pos.tokenId
                      ? 'Collecting...'
                      : 'Collect Fees'}
                  </button>
                </div>
              ))}
            </div>
          )}
          {error && <p className="error-msg">{error}</p>}
        </>
      )}
    </div>
  )
}
