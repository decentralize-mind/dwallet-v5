import { useState, useEffect } from 'react'
import { useWallet } from '../hooks/useWallet'
import { getStakingPoolInfo, getProtocolContract } from '../utils/dwallet'
import { ethers } from 'ethers'

const APY = 12.5
const MIN_STAKE = 100
const DWT_PRICE = 0.001

export default function DWTStakingPanel() {
  const { chainBalances } = useWallet()
  const [staked, setStaked] = useState(() => {
    try {
      const s = JSON.parse(localStorage.getItem('dwallet_dwt_staking') || '{}')
      return s.staked || 0
    } catch (e) {
      return 0
    }
  })
  const [reward, setReward] = useState(() => {
    try {
      const s = JSON.parse(localStorage.getItem('dwallet_dwt_staking') || '{}')
      return s.reward || 0
    } catch (e) {
      return 0
    }
  })
  const [stakeInput, setStakeInput] = useState('')
  const [unstakeIn, setUnstakeIn] = useState('')
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState('stake')
  const [msg, setMsg] = useState(null)
  const dwtBal = chainBalances['DWT'] || 0
  const [protocolStaked, setProtocolStaked] = useState('0')

  useEffect(() => {
    // Fetch real contract data
    async function fetchProtocol() {
      const infuraKey = import.meta.env.VITE_INFURA_KEY
      const rpcUrl = infuraKey
        ? `https://sepolia.infura.io/v3/${infuraKey}`
        : 'https://rpc.sepolia.org'
      const rpc = new ethers.JsonRpcProvider(rpcUrl)
      const info = await getStakingPoolInfo('sepolia', rpc)
      if (info) setProtocolStaked(info.totalStaked)
    }
    fetchProtocol()
  }, [])

  const save = (st, rw) => {
    localStorage.setItem(
      'dwallet_dwt_staking',
      JSON.stringify({ staked: st, reward: rw }),
    )
  }

  const notify = (type, text) => {
    setMsg({ type, text })
    setTimeout(() => setMsg(null), 4000)
  }

  const handleStake = async () => {
    const amt = parseFloat(stakeInput)
    if (!amt || amt < MIN_STAKE)
      return notify('error', 'Minimum stake is ' + MIN_STAKE + ' DWT')
    if (amt > dwtBal) return notify('error', 'Insufficient DWT balance')
    setLoading(true)
    await new Promise(r => setTimeout(r, 1500))
    const ns = staked + amt
    setStaked(ns)
    save(ns, reward)
    setStakeInput('')
    notify('success', '✓ Staked ' + amt.toFixed(0) + ' DWT')
    setLoading(false)
  }

  const handleUnstake = async () => {
    const amt = parseFloat(unstakeIn)
    if (!amt || amt > staked) return notify('error', 'Invalid amount')
    setLoading(true)
    await new Promise(r => setTimeout(r, 1500))
    const ns = staked - amt
    setStaked(ns)
    save(ns, reward)
    setUnstakeIn('')
    notify('success', '✓ Unstaked ' + amt.toFixed(0) + ' DWT')
    setLoading(false)
  }

  const handleClaim = async () => {
    if (reward <= 0) return notify('error', 'No rewards to claim')
    setLoading(true)
    await new Promise(r => setTimeout(r, 1200))
    notify('success', '✓ Claimed ' + reward.toFixed(6) + ' ETH')
    setReward(0)
    save(staked, 0)
    setLoading(false)
  }

  const proj = amt => ({
    daily: (((amt * APY) / 100 / 365) * DWT_PRICE).toFixed(5),
    monthly: (((amt * APY) / 100 / 12) * DWT_PRICE).toFixed(5),
    yearly: (((amt * APY) / 100) * DWT_PRICE).toFixed(4),
  })

  return (
    <div className="staking-panel">
      <div className="dwt-stats-grid">
        <div className="dwt-stat">
          <p className="dwt-stat-label">DWT balance</p>
          <p className="dwt-stat-value">{dwtBal.toFixed(0)}</p>
          <p className="dwt-stat-sub">${(dwtBal * DWT_PRICE).toFixed(2)}</p>
        </div>
        <div className="dwt-stat">
          <p className="dwt-stat-label">Your Stake</p>
          <p className="dwt-stat-value">{staked.toFixed(0)}</p>
          <p className="dwt-stat-sub">${(staked * DWT_PRICE).toFixed(2)}</p>
        </div>
        <div className="dwt-stat">
          <p className="dwt-stat-label">TVL (Protocol)</p>
          <p className="dwt-stat-value">
            {parseFloat(protocolStaked).toFixed(0)} DWT
          </p>
          <p className="dwt-stat-sub">Across all users</p>
        </div>
        <div className="dwt-stat">
          <p className="dwt-stat-label">APY</p>
          <p className="dwt-stat-value positive">{APY}%</p>
          <p className="dwt-stat-sub">paid in ETH</p>
        </div>
      </div>

      {reward > 0 && (
        <div className="dwt-reward-banner">
          <div>
            <p className="dwt-reward-label">Pending ETH rewards</p>
            <p className="dwt-reward-amount">{reward.toFixed(6)} ETH</p>
          </div>
          <button
            className="btn-primary"
            onClick={handleClaim}
            disabled={loading}
          >
            Claim
          </button>
        </div>
      )}

      <div className="staking-tabs">
        {['stake', 'unstake', 'info'].map(t => (
          <button
            key={t}
            className={
              'staking-tab' + (tab === t ? ' staking-tab--active' : '')
            }
            onClick={() => setTab(t)}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {msg && (
        <p
          className={
            'field-hint' +
            (msg.type === 'success'
              ? ' positive'
              : msg.type === 'error'
                ? ' error-msg'
                : '')
          }
        >
          {msg.text}
        </p>
      )}

      {tab === 'stake' && (
        <div className="staking-form">
          <div className="amount-input-row">
            <input
              className="field"
              type="number"
              placeholder={'Min ' + MIN_STAKE + ' DWT'}
              value={stakeInput}
              onChange={e => setStakeInput(e.target.value)}
            />
            <button
              className="max-btn"
              onClick={() => setStakeInput(dwtBal.toFixed(0))}
            >
              MAX
            </button>
          </div>
          <p className="field-hint">Available: {dwtBal.toFixed(0)} DWT</p>
          {stakeInput &&
            parseFloat(stakeInput) >= MIN_STAKE &&
            (() => {
              const p = proj(parseFloat(stakeInput))
              return (
                <div className="dwt-projection">
                  <p className="dwt-proj-title">
                    Estimated ETH earnings at {APY}% APY
                  </p>
                  <div className="dwt-proj-row">
                    <span>Daily</span>
                    <span className="positive">{p.daily} ETH</span>
                  </div>
                  <div className="dwt-proj-row">
                    <span>Monthly</span>
                    <span className="positive">{p.monthly} ETH</span>
                  </div>
                  <div className="dwt-proj-row">
                    <span>Yearly</span>
                    <span className="positive">{p.yearly} ETH</span>
                  </div>
                </div>
              )
            })()}
          <button
            className="btn-primary full-width"
            onClick={handleStake}
            disabled={loading || !stakeInput}
          >
            {loading ? 'Staking...' : 'Stake DWT'}
          </button>
        </div>
      )}

      {tab === 'unstake' && (
        <div className="staking-form">
          {staked <= 0 ? (
            <p className="empty-state">No DWT staked yet.</p>
          ) : (
            <>
              <div className="amount-input-row">
                <input
                  className="field"
                  type="number"
                  placeholder="Amount to unstake"
                  value={unstakeIn}
                  onChange={e => setUnstakeIn(e.target.value)}
                />
                <button
                  className="max-btn"
                  onClick={() => setUnstakeIn(staked.toFixed(0))}
                >
                  MAX
                </button>
              </div>
              <p className="field-hint">Staked: {staked.toFixed(0)} DWT</p>
              <button
                className="btn-primary full-width"
                onClick={handleUnstake}
                disabled={loading || !unstakeIn}
              >
                {loading ? 'Unstaking...' : 'Unstake DWT'}
              </button>
            </>
          )}
        </div>
      )}

      {tab === 'info' && (
        <div className="dwt-info">
          <div className="dwt-info-item">
            <p className="dwt-info-label">How it works</p>
            <p className="dwt-info-text">
              Stake DWT to earn a share of all swap fee revenue. Rewards are
              paid in ETH — not more DWT — making them immediately valuable.
            </p>
          </div>
          <div className="dwt-info-item">
            <p className="dwt-info-label">Holder discount</p>
            <p className="dwt-info-text">
              Hold 1,000+ DWT to reduce your swap fee from 0.20% to 0.15% on
              every trade.
            </p>
          </div>
          <div className="dwt-info-item">
            <p className="dwt-info-label">Minimum stake</p>
            <p className="dwt-info-text">
              Minimum 100 DWT. No lock-up period — unstake anytime.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
