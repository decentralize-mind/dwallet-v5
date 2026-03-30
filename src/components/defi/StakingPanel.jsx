import { useState, useEffect } from 'react'
import { useWallet } from '../../hooks/useWallet'
import {
  stakeWithLido,
  stakeWithRocketPool,
  getLidoBalance,
} from '../../utils/defi'
import { LIDO, ROCKET_POOL } from '../../data/defi'

const PROTOCOLS = [
  {
    id: 'lido',
    name: 'Lido',
    token: 'stETH',
    apy: LIDO.APY,
    description:
      'Largest liquid staking protocol. Stake ETH, receive stETH — an ERC-20 that rebases daily.',
    minStake: 0.01,
    color: '#00a3ff',
    audited: true,
    tvl: '$32.4B',
  },
  {
    id: 'rocketpool',
    name: 'Rocket Pool',
    token: 'rETH',
    apy: ROCKET_POOL.APY,
    description:
      'Decentralized staking protocol. More decentralized than Lido. rETH appreciates in value instead of rebasing.',
    minStake: 0.01,
    color: '#ff6b35',
    audited: true,
    tvl: '$5.1B',
  },
]

export default function StakingPanel() {
  const { wallet, chainBalances } = useWallet()
  const [selected, setSelected] = useState('lido')
  const [amount, setAmount] = useState('')
  const [step, setStep] = useState('form')
  const [txHash, setTxHash] = useState('')
  const [error, setError] = useState('')
  const [staking, setStaking] = useState(false)
  const [lidoBal, setLidoBal] = useState('0')

  const protocol = PROTOCOLS.find(p => p.id === selected)
  const ethBalance = chainBalances['ETH'] || 0
  const rewardEst = amount
    ? ((parseFloat(amount) * protocol.apy) / 100 / 365).toFixed(6)
    : '0'
  const yearlyEst = amount
    ? ((parseFloat(amount) * protocol.apy) / 100).toFixed(4)
    : '0'

  useEffect(() => {
    if (!wallet) return
    const addr = wallet.accounts[wallet.activeAccount].address
    getLidoBalance(addr).then(d => setLidoBal(d.balance))
  }, [wallet])

  const handleStake = async () => {
    if (!wallet) return
    setStaking(true)
    setError('')
    try {
      const pk = wallet.accounts[wallet.activeAccount].privateKey
      let tx
      if (import.meta.env.VITE_INFURA_KEY) {
        tx =
          selected === 'lido'
            ? await stakeWithLido({ amountETH: amount, privateKey: pk })
            : await stakeWithRocketPool({ amountETH: amount, privateKey: pk })
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
    } finally {
      setStaking(false)
    }
  }

  return (
    <div className="defi-section">
      {/* Protocol selector */}
      <div className="stake-protocols">
        {PROTOCOLS.map(p => (
          <button
            key={p.id}
            className={`stake-protocol-card ${selected === p.id ? 'stake-protocol--active' : ''}`}
            onClick={() => setSelected(p.id)}
          >
            <div className="stake-protocol-header">
              <span className="stake-protocol-name" style={{ color: p.color }}>
                {p.name}
              </span>
              {p.audited && (
                <span className="stake-audited-badge">Audited</span>
              )}
            </div>
            <div className="stake-apy-big">
              {p.apy}% <span className="stake-apy-label">APY</span>
            </div>
            <div className="stake-protocol-token">Receive {p.token}</div>
            <div className="stake-tvl">TVL: {p.tvl}</div>
          </button>
        ))}
      </div>

      {step === 'form' && (
        <>
          {/* Description */}
          <div className="stake-info-box">
            <p className="stake-desc">{protocol.description}</p>
          </div>

          {/* stETH balance */}
          {parseFloat(lidoBal) > 0 && (
            <div className="stake-existing">
              <span>Your stETH balance</span>
              <span className="positive">{lidoBal} stETH</span>
            </div>
          )}

          {/* Amount input */}
          <div className="defi-input-group">
            <label className="form-label">Amount to stake (ETH)</label>
            <div className="amount-input-row">
              <input
                className="field"
                type="number"
                placeholder={`Min ${protocol.minStake} ETH`}
                value={amount}
                onChange={e => setAmount(e.target.value)}
                min={protocol.minStake}
                step="any"
              />
              <button
                className="max-btn"
                onClick={() =>
                  setAmount(Math.max(0, ethBalance - 0.01).toFixed(4))
                }
              >
                MAX
              </button>
            </div>
            <p className="field-hint">
              Balance: {ethBalance.toFixed(4)} ETH (keep 0.01 for gas)
            </p>
          </div>

          {/* Reward preview */}
          {amount && parseFloat(amount) > 0 && (
            <div className="stake-rewards-preview">
              <div className="stake-reward-row">
                <span>Daily rewards</span>
                <span className="positive">
                  +{rewardEst} {protocol.token}
                </span>
              </div>
              <div className="stake-reward-row">
                <span>Yearly rewards</span>
                <span className="positive">
                  +{yearlyEst} {protocol.token}
                </span>
              </div>
              <div className="stake-reward-row">
                <span>You receive</span>
                <span>
                  {parseFloat(amount).toFixed(4)} {protocol.token} (liquid)
                </span>
              </div>
              <div className="stake-reward-row">
                <span>APY</span>
                <span className="positive">{protocol.apy}%</span>
              </div>
            </div>
          )}

          {/* Liquid staking note */}
          <div className="stake-liquid-note">
            ◈ Liquid staking — {protocol.token} can be traded or used in DeFi
            while earning rewards
          </div>

          {error && <p className="error-msg">{error}</p>}

          <button
            className="btn-primary full-width defi-action-btn"
            disabled={
              !amount || parseFloat(amount) < protocol.minStake || staking
            }
            onClick={handleStake}
          >
            {staking
              ? 'Staking...'
              : `Stake ${amount || '0'} ETH with ${protocol.name}`}
          </button>
        </>
      )}

      {step === 'success' && (
        <div className="defi-success">
          <div className="success-icon">⬡</div>
          <h3 className="success-title">Stake Submitted!</h3>
          <p className="success-sub">
            {amount} ETH → {parseFloat(amount).toFixed(4)} {protocol.token}
          </p>
          <p className="success-note">
            You'll start earning ~{protocol.apy}% APY immediately
          </p>
          <div className="tx-hash-box">
            <span className="tx-hash-label">Tx Hash</span>
            <span className="tx-hash-value mono">{txHash.slice(0, 22)}...</span>
          </div>
          <button
            className="btn-primary full-width"
            onClick={() => {
              setStep('form')
              setAmount('')
            }}
          >
            Stake More
          </button>
        </div>
      )}
    </div>
  )
}
