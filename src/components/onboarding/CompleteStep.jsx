import { useEffect, useState } from 'react'
import { useWallet } from '../../hooks/useWallet'
import { useReferralPool } from '../../hooks/useReferralPool'
import { checkIncomingReferral, getReferralCode } from '../../utils/referral'
import { ethers } from 'ethers'

export function CompleteStep({ flow }) {
  const { wallet } = useWallet()
  const { claimReferralReward, cacheReferralAddress } = useReferralPool()
  const [referralProcessed, setReferralProcessed] = useState(false)
  const [referralError, setReferralError] = useState(null)

  // Monitor wallet state and process referral
  useEffect(() => {
    console.log('CompleteStep mounted, wallet state:', wallet ? 'SET' : 'NOT SET')
    console.log('Wallet details:', {
      hasWallet: !!wallet,
      accounts: wallet?.accounts?.length,
      activeAccount: wallet?.activeAccount,
      hasAddress: !!wallet?.accounts?.[wallet?.activeAccount]?.address
    })
    
    if (!wallet) {
      console.error('⚠️ WARNING: CompleteStep shown but wallet is not set!')
      return
    }

    // Cache this user's referral code for future referrals
    const userAddress = wallet.accounts[wallet.activeAccount]?.address
    if (userAddress) {
      cacheReferralAddress(userAddress)
    }

    // Check if this user came from a referral link
    const processReferral = async () => {
      try {
        const refCode = checkIncomingReferral()
        if (!refCode) {
          console.log('No referral code found')
          setReferralProcessed(true)
          return
        }

        console.log('Processing referral code:', refCode)
        
        // Resolve the referral code to an address
        // For now, we'll try to match it from the cache
        const referralCache = JSON.parse(localStorage.getItem('referral_address_cache') || '{}')
        const referrerAddress = referralCache[refCode]
        
        if (!referrerAddress) {
          console.log('Referrer address not found for code:', refCode)
          setReferralProcessed(true)
          return
        }

        console.log('Found referrer address:', referrerAddress)

        // Get the signer from the wallet
        // Note: This requires the wallet to be connected to a provider
        // For now, we'll store the referral info and process it when the user makes their first transaction
        localStorage.setItem('pending_referral', JSON.stringify({
          referrer: referrerAddress,
          referee: userAddress,
          code: refCode,
          timestamp: Date.now()
        }))

        console.log('Referral registered (will be processed on-chain later)')
        setReferralProcessed(true)
      } catch (err) {
        console.error('Error processing referral:', err)
        setReferralError(err.message)
        setReferralProcessed(true) // Don't block the user
      }
    }

    if (!referralProcessed) {
      processReferral()
    }
  }, [wallet, referralProcessed, cacheReferralAddress])

  return (
    <div
      className="step-content"
      style={{ textAlign: 'center', padding: '8px 0' }}
    >
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: '50%',
          background: 'var(--green-light)',
          border: '2px solid var(--green)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 32,
          margin: '0 auto 16px',
        }}
      >
        ✓
      </div>
      <h2 className="step-title" style={{ fontSize: 22 }}>
        {flow === 'import' ? 'Wallet imported!' : 'Wallet created!'}
      </h2>
      <p className="step-sub" style={{ marginBottom: 20 }}>
        {flow === 'import'
          ? 'Your wallet is ready. You now have full access to your funds on Toklo.'
          : 'Your wallet is secured and your seed phrase is backed up. Welcome to Toklo.'}
      </p>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          marginBottom: 20,
          textAlign: 'left',
        }}
      >
        {[
          flow === 'import'
            ? '✓ Wallet successfully restored'
            : '✓ Wallet created and encrypted',
          flow === 'import'
            ? '✓ Password set for this device'
            : '✓ Seed phrase backed up',
          '✓ Connected to Ethereum mainnet',
          '✓ Live prices loading for 20+ coins',
        ].map(item => (
          <div
            key={item}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 12px',
              background: 'var(--bg3)',
              border: '1px solid rgba(16,185,129,0.2)',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            <span
              style={{
                color: 'var(--green)',
                fontWeight: 700,
                fontSize: 13,
              }}
            >
              {item}
            </span>
          </div>
        ))}
      </div>
      <div
        style={{
          padding: '12px 16px',
          background: 'var(--accent-light)',
          border: '1px solid rgba(99,102,241,0.2)',
          borderRadius: 'var(--radius-sm)',
          marginBottom: 20,
          textAlign: 'left',
        }}
      >
        <p
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: 'var(--accent)',
            margin: '0 0 4px',
          }}
        >
          ◈ Welcome gift
        </p>
        <p
          style={{
            fontSize: 12,
            color: 'var(--text2)',
            margin: 0,
            lineHeight: 1.5,
          }}
        >
          Share your referral link from Settings and earn 10 DWT for every friend
          who creates a wallet.
        </p>
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          justifyContent: 'center',
          fontSize: 12,
          color: 'var(--text3)',
        }}
      >
        <div
          style={{
            width: 20,
            height: 20,
            borderRadius: '50%',
            border: '2px solid var(--accent)',
            borderTopColor: 'transparent',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        Entering your wallet...
      </div>
    </div>
  )
}
