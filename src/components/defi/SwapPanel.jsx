import { useState, useEffect, useCallback } from 'react'
import { useWallet } from '../../hooks/useWallet'
import { getSwapQuote, executeSwap } from '../../utils/defi'
import { FEE_TIERS, MAINNET_TOKENS } from '../../data/defi'
import { TOKEN_PRICES } from '../../data/chains'

const SWAP_TOKENS = ['ETH', 'WBTC', 'USDC', 'USDT', 'DAI', 'UNI', 'LINK']

export default function SwapPanel() {
  const { wallet, chainBalances } = useWallet()
  const [tokenIn, setTokenIn] = useState('ETH')
  const [tokenOut, setTokenOut] = useState('USDC')
  const [amountIn, setAmountIn] = useState('')
  const [amountOut, setAmountOut] = useState('')
  const [feeTier, setFeeTier] = useState(3000)
  const [slippage, setSlippage] = useState(0.5)
  const [quoting, setQuoting] = useState(false)
  const [step, setStep] = useState('form') // form | confirm | success
  const [txHash, setTxHash] = useState('')
  const [error, setError] = useState('')
  const [priceImpact, setPriceImpact] = useState(null)
  const [isMock, setIsMock] = useState(false)

  const inPrice = TOKEN_PRICES[tokenIn] || 1
  const outPrice = TOKEN_PRICES[tokenOut] || 1
  const inUSD = (parseFloat(amountIn || 0) * inPrice).toFixed(2)
  const outUSD = (parseFloat(amountOut || 0) * outPrice).toFixed(2)
  const balance = chainBalances[tokenIn] || 0

  const fetchQuote = useCallback(async () => {
    setQuoting(true)
    setError('')
    try {
      const result = await getSwapQuote({
        tokenIn,
        tokenOut,
        amountIn,
        feeTier,
      })
      setAmountOut(result.amountOut)
      setPriceImpact(result.priceImpact)
      setIsMock(!!result.isMock)
    } catch (e) {
      setError('Could not get quote: ' + e.message)
    } finally {
      setQuoting(false)
    }
  }, [tokenIn, tokenOut, amountIn, feeTier])

  // Debounced quote fetch
  useEffect(() => {
    if (!amountIn || parseFloat(amountIn) <= 0) {
      setAmountOut('')
      return
    }
    const t = setTimeout(fetchQuote, 600)
    return () => clearTimeout(t)
  }, [amountIn, tokenIn, tokenOut, feeTier, fetchQuote])

  const flipTokens = () => {
    setTokenIn(tokenOut)
    setTokenOut(tokenIn)
    setAmountIn('')
    setAmountOut('')
  }

  const handleSwap = async () => {
    if (!wallet) return
    const pk = wallet.accounts[wallet.activeAccount].privateKey
    setError('')
    try {
      if (import.meta.env.VITE_INFURA_KEY && !isMock) {
        const tx = await executeSwap({
          tokenIn,
          tokenOut,
          amountIn,
          amountOutMin: amountOut,
          feeTier,
          privateKey: pk,
          slippage,
        })
        setTxHash(tx.hash)
      } else {
        setTxHash(
          '0x' +
            Array.from(crypto.getRandomValues(new Uint8Array(32)))
              .map(b => b.toString(16).padStart(2, '0'))
              .join(''),
        )
      }
      setStep('success')
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <div className="defi-section">
      <div className="defi-protocol-row">
        <span className="defi-protocol-badge uniswap">Uniswap V3</span>
        {isMock && (
          <span className="defi-mock-badge">
            Preview mode — add VITE_INFURA_KEY for live quotes
          </span>
        )}
      </div>

      {step === 'form' && (
        <>
          {/* Token In */}
          <div className="swap-box">
            <div className="swap-box-header">
              <span className="swap-box-label">You pay</span>
              <span className="swap-balance-hint">
                Balance: {balance.toFixed(4)} {tokenIn}
              </span>
            </div>
            <div className="swap-input-row">
              <input
                className="swap-big-input"
                type="number"
                placeholder="0.0"
                value={amountIn}
                onChange={e => setAmountIn(e.target.value)}
              />
              <select
                className="swap-token-pill"
                value={tokenIn}
                onChange={e => setTokenIn(e.target.value)}
              >
                {SWAP_TOKENS.filter(t => t !== tokenOut).map(t => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="swap-usd-row">
              <span className="swap-usd">≈ ${inUSD}</span>
              <button
                className="swap-max-btn"
                onClick={() => setAmountIn(balance.toFixed(6))}
              >
                MAX
              </button>
            </div>
          </div>

          {/* Flip arrow */}
          <div className="swap-flip-row">
            <button className="swap-flip-btn" onClick={flipTokens}>
              ⇅
            </button>
          </div>

          {/* Token Out */}
          <div className="swap-box swap-box--out">
            <div className="swap-box-header">
              <span className="swap-box-label">You receive</span>
              {quoting && (
                <span className="swap-quoting">Getting best price...</span>
              )}
            </div>
            <div className="swap-input-row">
              <input
                className="swap-big-input"
                readOnly
                placeholder="0.0"
                value={quoting ? '...' : amountOut}
              />
              <select
                className="swap-token-pill"
                value={tokenOut}
                onChange={e => setTokenOut(e.target.value)}
              >
                {SWAP_TOKENS.filter(t => t !== tokenIn).map(t => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>
            <span className="swap-usd">≈ ${outUSD}</span>
          </div>

          {/* Details */}
          {amountOut && (
            <div className="swap-details-box">
              <div className="swap-detail-row">
                <span>Rate</span>
                <span>
                  1 {tokenIn} ={' '}
                  {(parseFloat(amountOut) / parseFloat(amountIn || 1)).toFixed(
                    4,
                  )}{' '}
                  {tokenOut}
                </span>
              </div>
              <div className="swap-detail-row">
                <span>Price impact</span>
                <span
                  className={parseFloat(priceImpact) > 1 ? 'warn' : 'positive'}
                >
                  {priceImpact}%
                </span>
              </div>
              <div className="swap-detail-row">
                <span>Slippage tolerance</span>
                <div className="slippage-btns">
                  {[0.1, 0.5, 1.0].map(s => (
                    <button
                      key={s}
                      className={`slippage-btn ${slippage === s ? 'active' : ''}`}
                      onClick={() => setSlippage(s)}
                    >
                      {s}%
                    </button>
                  ))}
                </div>
              </div>
              <div className="swap-detail-row">
                <span>Fee tier</span>
                <div className="fee-btns">
                  {FEE_TIERS.map(f => (
                    <button
                      key={f.value}
                      className={`fee-btn ${feeTier === f.value ? 'active' : ''}`}
                      onClick={() => setFeeTier(f.value)}
                      title={f.description}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="swap-detail-row">
                <span>Min received</span>
                <span>
                  {(parseFloat(amountOut) * (1 - slippage / 100)).toFixed(4)}{' '}
                  {tokenOut}
                </span>
              </div>
            </div>
          )}

          {error && <p className="error-msg">{error}</p>}

          <button
            className="btn-primary full-width defi-action-btn"
            disabled={!amountIn || !amountOut || quoting}
            onClick={() => setStep('confirm')}
          >
            {quoting ? 'Getting quote...' : `Swap ${tokenIn} → ${tokenOut}`}
          </button>
        </>
      )}

      {step === 'confirm' && (
        <div className="defi-confirm">
          <div className="defi-confirm-card">
            <div className="defi-confirm-row">
              <span className="defi-confirm-big">
                {amountIn} {tokenIn}
              </span>
              <span className="defi-confirm-arrow">→</span>
              <span className="defi-confirm-big positive">
                {parseFloat(amountOut).toFixed(4)} {tokenOut}
              </span>
            </div>
            <p className="defi-confirm-sub">
              Min received:{' '}
              {(parseFloat(amountOut) * (1 - slippage / 100)).toFixed(4)}{' '}
              {tokenOut} after {slippage}% slippage
            </p>
          </div>
          <div className="confirm-warning">
            ⚠️ Swaps are irreversible. Confirm the amounts above.
          </div>
          {error && <p className="error-msg">{error}</p>}
          <div className="btn-row">
            <button className="btn-secondary" onClick={() => setStep('form')}>
              Back
            </button>
            <button className="btn-primary" onClick={handleSwap}>
              Confirm Swap
            </button>
          </div>
        </div>
      )}

      {step === 'success' && (
        <div className="defi-success">
          <div className="success-icon">⇄</div>
          <h3 className="success-title">Swap Submitted!</h3>
          <p className="success-sub">
            {amountIn} {tokenIn} → ~{parseFloat(amountOut).toFixed(4)}{' '}
            {tokenOut}
          </p>
          <div className="tx-hash-box">
            <span className="tx-hash-label">Tx Hash</span>
            <span className="tx-hash-value mono">{txHash.slice(0, 22)}...</span>
          </div>
          <button
            className="btn-primary full-width"
            onClick={() => {
              setStep('form')
              setAmountIn('')
              setAmountOut('')
            }}
          >
            New Swap
          </button>
        </div>
      )}
    </div>
  )
}
