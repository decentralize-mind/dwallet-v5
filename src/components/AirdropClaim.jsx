import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { CONTRACT_ADDRESSES } from '../config/contracts'

// Simple Airdrop ABI - only the functions we need
const AIRDROP_ABI = [
  'function claim() external',
  'function hasClaimed(address) view returns (bool)',
  'function canClaim(address) view returns (bool)',
  'function CLAIM_AMOUNT() view returns (uint256)',
  'function getRemainingBalance() view returns (uint256)',
  'event Claimed(address claimant, uint256 amount, uint256 timestamp)'
]

const DWT_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)'
]

export function AirdropClaim({ provider, signer, account }) {
  const [claimStatus, setClaimStatus] = useState('checking') // checking, can-claim, already-claimed, error
  const [claiming, setClaiming] = useState(false)
  const [message, setMessage] = useState('')
  const [dwtBalance, setDwtBalance] = useState('0')

  const AIRDROP_ADDRESS = CONTRACT_ADDRESSES.baseSepolia?.SimpleAirdrop
  const DWT_ADDRESS = CONTRACT_ADDRESSES.baseSepolia?.DWT

  useEffect(() => {
    if (!account || !provider) return
    checkClaimStatus()
    checkDwtBalance()
  }, [account, provider])

  const checkClaimStatus = async () => {
    try {
      const airdropContract = new ethers.Contract(AIRDROP_ADDRESS, AIRDROP_ABI, provider)
      const canClaim = await airdropContract.canClaim(account)
      
      if (canClaim) {
        setClaimStatus('can-claim')
        setMessage('🎉 You can claim 5 DWT tokens!')
      } else {
        const hasClaimed = await airdropContract.hasClaimed(account)
        if (hasClaimed) {
          setClaimStatus('already-claimed')
          setMessage('✅ You have already claimed your airdrop')
        } else {
          setClaimStatus('error')
          setMessage('⚠️ Airdrop pool may be empty or paused')
        }
      }
    } catch (error) {
      console.error('Error checking claim status:', error)
      setClaimStatus('error')
      setMessage('Error checking claim status')
    }
  }

  const checkDwtBalance = async () => {
    try {
      const dwtContract = new ethers.Contract(DWT_ADDRESS, DWT_ABI, provider)
      const balance = await dwtContract.balanceOf(account)
      const decimals = await dwtContract.decimals()
      setDwtBalance(ethers.formatUnits(balance, decimals))
    } catch (error) {
      console.error('Error checking DWT balance:', error)
    }
  }

  const handleClaim = async () => {
    if (!signer || claimStatus !== 'can-claim') return

    setClaiming(true)
    setMessage('Claiming... Please wait')

    try {
      const airdropContract = new ethers.Contract(AIRDROP_ADDRESS, AIRDROP_ABI, signer)
      
      const tx = await airdropContract.claim()
      setMessage('Transaction submitted! Waiting for confirmation...')
      
      await tx.wait()
      
      setMessage('✅ Successfully claimed 5 DWT!')
      setClaimStatus('already-claimed')
      
      // Refresh balance
      await checkDwtBalance()
    } catch (error) {
      console.error('Claim failed:', error)
      
      if (error.code === 4001) {
        setMessage('❌ Transaction rejected by user')
      } else if (error.message?.includes('AlreadyClaimed')) {
        setMessage('❌ You have already claimed this airdrop')
        setClaimStatus('already-claimed')
      } else {
        setMessage('❌ Claim failed: ' + (error.message || 'Unknown error'))
      }
    } finally {
      setClaiming(false)
    }
  }

  if (!account) {
    return null
  }

  return (
    <div style={{
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      borderRadius: '12px',
      padding: '20px',
      margin: '16px 0',
      color: 'white',
      boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <span style={{ fontSize: '32px' }}>🎁</span>
        <div>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>
            Welcome Airdrop
          </h3>
          <p style={{ margin: '4px 0 0', fontSize: '14px', opacity: 0.9 }}>
            New Toklo users receive 5 DWT tokens!
          </p>
        </div>
      </div>

      <div style={{
        background: 'rgba(255, 255, 255, 0.1)',
        borderRadius: '8px',
        padding: '12px',
        marginBottom: '16px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ fontSize: '14px', opacity: 0.9 }}>Your DWT Balance:</span>
          <span style={{ fontSize: '14px', fontWeight: 'bold' }}>{dwtBalance} DWT</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '14px', opacity: 0.9 }}>Airdrop Amount:</span>
          <span style={{ fontSize: '14px', fontWeight: 'bold' }}>5 DWT</span>
        </div>
      </div>

      {message && (
        <div style={{
          background: 'rgba(255, 255, 255, 0.15)',
          borderRadius: '6px',
          padding: '10px',
          marginBottom: '12px',
          fontSize: '13px',
          textAlign: 'center'
        }}>
          {message}
        </div>
      )}

      {claimStatus === 'can-claim' && (
        <button
          onClick={handleClaim}
          disabled={claiming}
          style={{
            width: '100%',
            padding: '12px',
            background: claiming ? 'rgba(255, 255, 255, 0.3)' : 'white',
            color: claiming ? 'rgba(255, 255, 255, 0.7)' : '#667eea',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: claiming ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s'
          }}
        >
          {claiming ? '⏳ Claiming...' : '🎉 Claim 5 DWT Now'}
        </button>
      )}

      {claimStatus === 'already-claimed' && (
        <div style={{
          textAlign: 'center',
          padding: '12px',
          background: 'rgba(255, 255, 255, 0.15)',
          borderRadius: '8px',
          fontSize: '14px'
        }}>
          ✅ Airdrop Already Claimed
        </div>
      )}

      {claimStatus === 'error' && (
        <div style={{
          textAlign: 'center',
          padding: '12px',
          background: 'rgba(255, 100, 100, 0.2)',
          borderRadius: '8px',
          fontSize: '14px'
        }}>
          ⚠️ Unable to process claim
        </div>
      )}
    </div>
  )
}
