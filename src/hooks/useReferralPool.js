import { useState, useCallback } from 'react'
import { ethers } from 'ethers'
import { CONTRACT_ADDRESSES } from '../config/contracts'
import { ReferralPool_ABI } from '../config/abis'
import { getReferralCode } from '../utils/referral'

/**
 * Hook to interact with the ReferralPool smart contract
 * Handles referral registration and reward claiming
 */
export function useReferralPool() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [txHash, setTxHash] = useState(null)

  /**
   * Get the ReferralPool contract instance
   */
  const getContract = useCallback(async (signerOrProvider) => {
    const network = await signerOrProvider.provider?.getNetwork() || signerOrProvider.getNetwork()
    const chainId = network.chainId?.toString() || network.chainId
    
    // Determine which network to use
    let networkKey = 'baseSepolia' // Default to testnet
    if (chainId === '8453') networkKey = 'base' // Base Mainnet
    if (chainId === '84532') networkKey = 'baseSepolia'
    
    const contractAddress = CONTRACT_ADDRESSES[networkKey]?.ReferralPool
    
    if (!contractAddress) {
      throw new Error('ReferralPool contract not deployed on this network')
    }

    return new ethers.Contract(contractAddress, ReferralPool_ABI, signerOrProvider)
  }, [])

  /**
   * Resolve a referral code to an address
   * For now, we use the same logic as the frontend: TK + first 6 chars of address
   * In the future, this could query an on-chain registry
   */
  const resolveReferralCode = useCallback(async (code, provider) => {
    // The referral code format is TK + first 6 chars of address
    // We need to find which address this belongs to
    // For now, we'll store a mapping in localStorage during onboarding
    // In production, you'd want an on-chain registry or backend API
    
    try {
      // Check if we have a cached mapping
      const referralCache = JSON.parse(localStorage.getItem('referral_address_cache') || '{}')
      if (referralCache[code]) {
        return referralCache[code]
      }
      
      // If not found, return null (will be handled by caller)
      return null
    } catch (err) {
      console.error('Error resolving referral code:', err)
      return null
    }
  }, [])

  /**
   * Claim referral rewards when a new user completes onboarding
   * @param {string} referrerAddress - The address of the user who referred
   * @param {object} signer - Ethers signer instance
   */
  const claimReferralReward = useCallback(async (referrerAddress, signer) => {
    if (!referrerAddress || !signer) {
      throw new Error('Referrer address and signer are required')
    }

    setLoading(true)
    setError(null)

    try {
      const contract = await getContract(signer)
      
      // Check if user is eligible
      const userAddress = await signer.getAddress()
      const isEligible = await contract.isEligibleForReferral(userAddress)
      
      if (!isEligible) {
        throw new Error('This address has already claimed a referral reward')
      }

      // Check pool balance
      const poolBalance = await contract.getPoolBalance()
      const rewardAmount = await contract.REWARD_AMOUNT()
      
      if (poolBalance < rewardAmount.mul(2)) {
        throw new Error('Insufficient pool balance for referral rewards')
      }

      // Claim the reward
      const tx = await contract.claimReferralReward(referrerAddress)
      setTxHash(tx.hash)
      
      // Wait for confirmation
      const receipt = await tx.wait()
      
      // Update local stats
      updateReferralStats(referrerAddress)
      
      return {
        success: true,
        txHash: tx.hash,
        receipt
      }
    } catch (err) {
      console.error('Error claiming referral reward:', err)
      setError(err.message || 'Failed to claim referral reward')
      throw err
    } finally {
      setLoading(false)
    }
  }, [getContract])

  /**
   * Register a referral without claiming rewards (for tracking)
   * @param {string} referrerAddress - The address of the user who referred
   * @param {object} signer - Ethers signer instance
   */
  const registerReferral = useCallback(async (referrerAddress, signer) => {
    if (!referrerAddress || !signer) {
      throw new Error('Referrer address and signer are required')
    }

    setLoading(true)
    setError(null)

    try {
      const contract = await getContract(signer)
      const tx = await contract.registerReferral(referrerAddress)
      setTxHash(tx.hash)
      
      const receipt = await tx.wait()
      
      return {
        success: true,
        txHash: tx.hash,
        receipt
      }
    } catch (err) {
      console.error('Error registering referral:', err)
      setError(err.message || 'Failed to register referral')
      throw err
    } finally {
      setLoading(false)
    }
  }, [getContract])

  /**
   * Get referrer statistics
   * @param {string} address - The referrer's address
   * @param {object} provider - Ethers provider instance
   */
  const getReferrerStats = useCallback(async (address, provider) => {
    try {
      const contract = await getContract(provider)
      const stats = await contract.getReferrerStats(address)
      
      return {
        totalReferrals: stats.totalRefs.toNumber(),
        totalRewards: ethers.utils.formatUnits(stats.totalRewards, 18)
      }
    } catch (err) {
      console.error('Error getting referrer stats:', err)
      return {
        totalReferrals: 0,
        totalRewards: '0'
      }
    }
  }, [getContract])

  /**
   * Check if an address has already claimed a referral reward
   * @param {string} address - The address to check
   * @param {object} provider - Ethers provider instance
   */
  const hasClaimedReferral = useCallback(async (address, provider) => {
    try {
      const contract = await getContract(provider)
      return await contract.hasClaimedReferral(address)
    } catch (err) {
      console.error('Error checking claim status:', err)
      return false
    }
  }, [getContract])

  /**
   * Update local referral stats after successful claim
   */
  const updateReferralStats = useCallback((referrerAddress) => {
    try {
      const KEY = 'dwallet_referral'
      const stats = JSON.parse(localStorage.getItem(KEY) || '{"signups":0,"earned":0}')
      
      stats.signups += 1
      stats.earned += 10 // 10 DWT per referral
      
      localStorage.setItem(KEY, JSON.stringify(stats))
    } catch (err) {
      console.error('Error updating referral stats:', err)
    }
  }, [])

  /**
   * Cache the referral code to address mapping
   */
  const cacheReferralAddress = useCallback((address) => {
    try {
      const code = getReferralCode(address)
      const cache = JSON.parse(localStorage.getItem('referral_address_cache') || '{}')
      cache[code] = address
      localStorage.setItem('referral_address_cache', JSON.stringify(cache))
    } catch (err) {
      console.error('Error caching referral address:', err)
    }
  }, [])

  return {
    loading,
    error,
    txHash,
    claimReferralReward,
    registerReferral,
    getReferrerStats,
    hasClaimedReferral,
    resolveReferralCode,
    cacheReferralAddress,
    updateReferralStats
  }
}
