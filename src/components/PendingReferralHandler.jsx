import { useEffect, useState } from 'react'
import { ethers } from 'ethers'
import { useWallet } from '../hooks/useWallet'
import { useReferralPool } from '../hooks/useReferralPool'

/**
 * PendingReferralHandler
 * Processes pending referrals when the user has an active web3 provider
 * This component should be mounted in the main wallet view
 */
export default function PendingReferralHandler() {
  const { wallet } = useWallet()
  const { claimReferralReward } = useReferralPool()
  const [processing, setProcessing] = useState(false)
  const [processed, setProcessed] = useState(false)

  useEffect(() => {
    // Check if there's a pending referral to process
    const processPendingReferral = async () => {
      try {
        const pendingData = localStorage.getItem('pending_referral')
        if (!pendingData) {
          return // No pending referral
        }

        const pending = JSON.parse(pendingData)
        
        // Check if this has already been processed
        if (processed) {
          return
        }

        console.log('Found pending referral:', pending)

        // Check if enough time has passed (at least 1 minute since creation)
        const timeSinceCreation = Date.now() - pending.timestamp
        if (timeSinceCreation < 60000) {
          console.log('Waiting for confirmation period before processing referral')
          return
        }

        // Check if user has an active provider
        if (!window.ethereum) {
          console.log('No web3 provider available, will process later')
          return
        }

        setProcessing(true)

        // Create a provider and signer
        const provider = new ethers.providers.Web3Provider(window.ethereum)
        await provider.send('eth_requestAccounts', [])
        const signer = provider.getSigner()

        const userAddress = await signer.getAddress()

        // Verify this is the right user
        if (userAddress.toLowerCase() !== pending.referee.toLowerCase()) {
          console.log('Address mismatch, waiting for correct user')
          setProcessing(false)
          return
        }

        console.log('Processing referral reward claim...')
        
        // Claim the referral reward
        const result = await claimReferralReward(pending.referrer, signer)
        
        if (result.success) {
          console.log('Referral reward claimed successfully!', result.txHash)
          
          // Clear the pending referral
          localStorage.removeItem('pending_referral')
          setProcessed(true)
          
          // Show notification to user
          if (window.notify) {
            window.notify('🎉 Referral reward claimed! You received 10 DWT', 'success')
          }
        }
      } catch (err) {
        console.error('Error processing pending referral:', err)
        // Don't clear the pending referral on error, try again later
      } finally {
        setProcessing(false)
      }
    }

    if (wallet && !processed) {
      // Try to process after a short delay
      const timer = setTimeout(processPendingReferral, 2000)
      return () => clearTimeout(timer)
    }
  }, [wallet, processed, claimReferralReward])

  // This component doesn't render anything
  return null
}
