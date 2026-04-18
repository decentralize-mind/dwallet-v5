import { useState, useEffect } from 'react'
import { useWallet } from '../hooks/useWallet'
import { getReferralLink, getReferralCode, getReferralStats } from '../utils/referral'
import { 
  shareReferral, 
  getCampaignStats, 
  getReferralMilestones,
  generateShareMessage 
} from '../utils/referralCampaign'
import { trackFeatureView, trackFeatureAction } from '../utils/analytics'

export default function ReferralCampaignPanel() {
  const { currentAddress } = useWallet()
  const [stats, setStats] = useState(null)
  const [milestones, setMilestones] = useState([])
  const [sharePlatform, setSharePlatform] = useState('native')
  const [showShareModal, setShowShareModal] = useState(false)
  const [copied, setCopied] = useState(false)
  const [shareSuccess, setShareSuccess] = useState('')

  useEffect(() => {
    trackFeatureView('referral')
    refreshStats()
  }, [])

  const refreshStats = () => {
    setStats(getCampaignStats())
    setMilestones(getReferralMilestones(getReferralStats().signups))
  }

  const handleCopyLink = async () => {
    const link = getReferralLink(currentAddress)
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setShareSuccess('✓ Link copied to clipboard!')
      trackFeatureAction('referral', 'link_copied')
      setTimeout(() => setCopied(false), 2000)
      setTimeout(() => setShareSuccess(''), 3000)
    } catch (err) {
      console.error('Copy failed:', err)
    }
  }

  const handleShare = async (platform) => {
    const result = await shareReferral(currentAddress, platform)
    if (result.success) {
      setShareSuccess(`✓ Shared via ${result.method}!`)
      trackFeatureAction('referral', 'shared')
      setTimeout(() => setShareSuccess(''), 3000)
    }
  }

  if (!stats || !currentAddress) {
    return <div className="view-container"><p>Loading...</p></div>
  }

  return (
    <div className="view-container">
      <div className="view-header">
        <h2 className="view-title">🎁 Referral Campaign</h2>
      </div>

      {/* Campaign Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(168,85,247,0.15) 100%)',
        border: '1px solid rgba(99,102,241,0.3)',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '20px',
        textAlign: 'center'
      }}>
        <h3 style={{ fontSize: '24px', fontWeight: 800, margin: '0 0 8px', color: 'var(--text)' }}>
          Earn {stats.referrerReward} DWT Per Referral!
        </h3>
        <p style={{ fontSize: '14px', color: 'var(--text2)', margin: '0 0 16px' }}>
          Share dWallet and both you & your friend earn rewards
        </p>
        <div style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'center',
          flexWrap: 'wrap'
        }}>
          <div style={{
            background: 'rgba(255,255,255,0.1)',
            padding: '12px 20px',
            borderRadius: '8px',
            minWidth: '120px'
          }}>
            <p style={{ fontSize: '11px', color: 'var(--text3)', margin: '0 0 4px' }}>You Get</p>
            <p style={{ fontSize: '20px', fontWeight: 800, color: 'var(--green)', margin: 0 }}>
              {stats.referrerReward} DWT
            </p>
          </div>
          <div style={{
            background: 'rgba(255,255,255,0.1)',
            padding: '12px 20px',
            borderRadius: '8px',
            minWidth: '120px'
          }}>
            <p style={{ fontSize: '11px', color: 'var(--text3)', margin: '0 0 4px' }}>Friend Gets</p>
            <p style={{ fontSize: '20px', fontWeight: 800, color: 'var(--accent)', margin: 0 }}>
              {stats.refereeReward} DWT
            </p>
          </div>
        </div>
      </div>

      {/* Success Message */}
      {shareSuccess && (
        <div style={{
          padding: '12px',
          background: 'rgba(16,185,129,0.1)',
          border: '1px solid rgba(16,185,129,0.3)',
          borderRadius: '8px',
          marginBottom: '16px',
          textAlign: 'center',
          color: 'var(--green)',
          fontWeight: 600
        }}>
          {shareSuccess}
        </div>
      )}

      {/* Stats Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '12px',
        marginBottom: '20px'
      }}>
        <div className="stat-card">
          <p className="stat-label">Total Referrals</p>
          <p className="stat-value">{stats.signups}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">DWT Earned</p>
          <p className="stat-value">{stats.earned}</p>
          <p style={{ fontSize: '11px', color: 'var(--text3)', margin: '4px 0 0' }}>
            ≈ ${stats.estimatedUSDValue.toFixed(2)}
          </p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Campaign Tier</p>
          <p className="stat-value" style={{ fontSize: '16px' }}>{stats.currentTier}</p>
        </div>
        {stats.nextTier && (
          <div className="stat-card">
            <p className="stat-label">Next Tier</p>
            <p className="stat-value" style={{ fontSize: '14px' }}>
              {stats.nextTier.referralsNeeded} more
            </p>
          </div>
        )}
      </div>

      {/* Referral Link */}
      <div style={{
        background: 'var(--bg2)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '20px'
      }}>
        <p style={{ fontSize: '13px', fontWeight: 700, margin: '0 0 12px' }}>
          Your Referral Link
        </p>
        <div style={{
          display: 'flex',
          gap: '8px',
          alignItems: 'center'
        }}>
          <input
            readOnly
            value={getReferralLink(currentAddress)}
            style={{
              flex: 1,
              background: 'var(--bg3)',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          padding: '10px 12px',
          fontSize: '12px',
          color: 'var(--text2)',
          fontFamily: 'monospace'
            }}
          />
          <button
            onClick={handleCopyLink}
            style={{
              background: copied ? 'var(--green)' : 'var(--accent)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 16px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            {copied ? '✓ Copied' : 'Copy'}
          </button>
        </div>
        <p style={{ fontSize: '11px', color: 'var(--text3)', margin: '8px 0 0' }}>
          Referral Code: <strong style={{ color: 'var(--accent)' }}>{getReferralCode(currentAddress)}</strong>
        </p>
      </div>

      {/* Share Buttons */}
      <div style={{
        background: 'var(--bg2)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '20px'
      }}>
        <p style={{ fontSize: '13px', fontWeight: 700, margin: '0 0 12px' }}>
          Share & Earn
        </p>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
          gap: '8px'
        }}>
          <button
            onClick={() => handleShare('twitter')}
            style={{
              background: '#1DA1F2',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '12px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            🐦 Twitter
          </button>
          <button
            onClick={() => handleShare('telegram')}
            style={{
              background: '#0088CC',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '12px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            ✈️ Telegram
          </button>
          <button
            onClick={() => handleShare('whatsapp')}
            style={{
              background: '#25D366',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '12px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            💬 WhatsApp
          </button>
          <button
            onClick={() => handleShare('native')}
            style={{
              background: 'var(--accent)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '12px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            📱 More
          </button>
        </div>
      </div>

      {/* Milestones */}
      <div style={{
        background: 'var(--bg2)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        padding: '16px'
      }}>
        <p style={{ fontSize: '13px', fontWeight: 700, margin: '0 0 16px' }}>
          🏆 Referral Milestones
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {milestones.map((milestone, index) => (
            <div
              key={index}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px',
                background: milestone.achieved ? 'rgba(16,185,129,0.08)' : 'var(--bg3)',
                border: `1px solid ${milestone.achieved ? 'rgba(16,185,129,0.3)' : 'var(--border)'}`,
                borderRadius: '8px',
                opacity: milestone.achieved ? 1 : 0.7
              }}
            >
              <span style={{ fontSize: '24px' }}>{milestone.icon}</span>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '13px', fontWeight: 700, margin: '0 0 4px', color: 'var(--text)' }}>
                  {milestone.label}
                </p>
                <p style={{ fontSize: '11px', margin: 0, color: 'var(--text3)' }}>
                  {milestone.count} referrals • {milestone.reward}
                </p>
              </div>
              {milestone.achieved && (
                <span style={{
                  background: 'var(--green)',
                  color: 'white',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: 700
                }}>
                  ✓ Done
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Staking + Referral Combo */}
      <div style={{
        marginTop: '20px',
        padding: '16px',
        background: 'linear-gradient(135deg, rgba(16,185,129,0.1) 0%, rgba(99,102,241,0.1) 100%)',
        border: '1px solid rgba(16,185,129,0.3)',
        borderRadius: '12px',
        textAlign: 'center'
      }}>
        <p style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 8px', color: 'var(--green)' }}>
          💡 Pro Tip: Stake Your Referral Rewards!
        </p>
        <p style={{ fontSize: '12px', margin: '0 0 12px', color: 'var(--text2)' }}>
          Earn 12.5% APY by staking your DWT referral rewards
        </p>
        <button
          onClick={() => {
            trackFeatureAction('referral', 'navigate_to_staking')
            window.location.hash = '#defi'
          }}
          style={{
            background: 'var(--green)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '10px 20px',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer'
          }}
        >
          Go to Staking →
        </button>
      </div>
    </div>
  )
}
