/**
 * Referral Campaign System
 * Enhanced referral features for viral growth
 */

import { getReferralLink, getReferralCode, getReferralStats } from './referral'
import { trackFeatureAction } from './analytics'

// Campaign configuration
const CAMPAIGN_CONFIG = {
  standard: {
    referrerReward: 10, // DWT
    refereeReward: 10, // DWT
    name: 'Standard Referral'
  },
  boosted: {
    referrerReward: 25, // DWT (limited time)
    refereeReward: 15, // DWT
    name: 'Boosted Campaign',
    endDate: null // Set to enable time-limited campaign
  },
  vip: {
    referrerReward: 50, // DWT (for top referrers)
    refereeReward: 25, // DWT
    name: 'VIP Referral',
    minReferrals: 10 // Unlock after 10 successful referrals
  }
}

/**
 * Get current campaign tier based on user's referral count
 */
export function getCampaignTier(referralCount) {
  if (referralCount >= CAMPAIGN_CONFIG.vip.minReferrals) {
    return CAMPAIGN_CONFIG.vip
  }
  return CAMPAIGN_CONFIG.standard
}

/**
 * Generate shareable referral message with emoji and formatting
 */
export function generateShareMessage(address, platform = 'generic') {
  const code = getReferralCode(address)
  const link = getReferralLink(address)
  const stats = getReferralStats()
  const tier = getCampaignTier(stats.signups)
  
  const messages = {
    twitter: `🚀 Join me on dWallet - the most secure Web3 wallet with 12.5% APY staking!\n\n✨ Use my referral code: ${code}\n💎 Get ${tier.refereeReward} DWT bonus\n🔗 ${link}\n\n#Web3 #Crypto #dWallet`,
    
    telegram: `🎁 *Exclusive dWallet Invitation*\n\nI'm using dWallet - a secure Web3 wallet with amazing DeFi features:\n\n✅ 12.5% APY on DWT staking\n✅ Portfolio tracking\n✅ Price alerts\n✅ Multi-chain support\n\n🎯 Use code: \`${code}\`\n💰 Get ${tier.refereeReward} DWT signup bonus\n👉 ${link}`,
    
    discord: `**🚀 Join dWallet and earn crypto!**\n\nI've been using dWallet and love it! Here's what you get:\n\n• 💎 **${tier.refereeReward} DWT** signup bonus\n• 📈 **12.5% APY** staking rewards\n• 🔔 Price alerts & notifications\n• 💼 Portfolio tracking\n\n🔗 Join here: ${link}\n🎟️ Code: \`${code}\``,
    
    email: `Subject: 🎁 Exclusive Invitation - Join dWallet & Earn ${tier.refereeReward} DWT!\n\nHi,\n\nI wanted to share an amazing Web3 wallet I've been using called dWallet. It has:\n\n✅ Bank-grade security (10-layer protection)\n✅ Earn 12.5% APY on DWT staking\n✅ Track your portfolio in real-time\n✅ Get price alerts via notifications\n✅ Support for multiple chains\n\nAs my referral, you'll get ${tier.refereeReward} DWT (worth $${(tier.refereeReward * 3.50).toFixed(2)}) just for signing up!\n\n👉 Join here: ${link}\n🎟️ Referral code: ${code}\n\nLet me know if you have any questions!\n\nBest regards`,
    
    generic: `Join dWallet and get ${tier.refereeReward} DWT bonus! Use code: ${code} - ${link}`
  }
  
  return messages[platform] || messages.generic
}

/**
 * Share referral link using Web Share API (mobile) or fallback
 */
export async function shareReferral(address, platform = 'native') {
  const message = generateShareMessage(address, platform)
  const link = getReferralLink(address)
  
  try {
    // Try native share first (mobile devices)
    if (navigator.share && platform === 'native') {
      await navigator.share({
        title: 'Join dWallet - Secure Web3 Wallet',
        text: message,
        url: link
      })
      trackFeatureAction('referral', 'shared_native')
      return { success: true, method: 'native' }
    }
    
    // Platform-specific sharing
    const shareUrls = {
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}`,
      telegram: `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(message)}`,
      whatsapp: `https://wa.me/?text=${encodeURIComponent(message)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`
    }
    
    if (shareUrls[platform]) {
      window.open(shareUrls[platform], '_blank', 'width=600,height=400')
      trackFeatureAction('referral', `shared_${platform}`)
      return { success: true, method: platform }
    }
    
    // Fallback: copy to clipboard
    await navigator.clipboard.writeText(message)
    trackFeatureAction('referral', 'copied')
    return { success: true, method: 'clipboard' }
    
  } catch (error) {
    console.error('Share failed:', error)
    // Fallback to clipboard
    await navigator.clipboard.writeText(message)
    return { success: true, method: 'clipboard_fallback' }
  }
}

/**
 * Get referral campaign statistics with growth metrics
 */
export function getCampaignStats() {
  const stats = getReferralStats()
  const tier = getCampaignTier(stats.signups)
  
  return {
    ...stats,
    currentTier: tier.name,
    referrerReward: tier.referrerReward,
    refereeReward: tier.refereeReward,
    nextTier: tier === CAMPAIGN_CONFIG.vip ? null : {
      name: CAMPAIGN_CONFIG.vip.name,
      referralsNeeded: CAMPAIGN_CONFIG.vip.minReferrals - stats.signups,
      reward: CAMPAIGN_CONFIG.vip.referrerReward
    },
    totalValueGenerated: stats.signups * (tier.referrerReward + tier.refereeReward),
    estimatedUSDValue: stats.earned * 3.50 // DWT price
  }
}

/**
 * Generate referral QR code data (for QR code libraries)
 */
export function getReferralQRData(address) {
  return {
    link: getReferralLink(address),
    code: getReferralCode(address),
    type: 'referral',
    timestamp: Date.now()
  }
}

/**
 * Check if boosted campaign is active
 */
export function isBoostedCampaignActive() {
  const boosted = CAMPAIGN_CONFIG.boosted
  if (!boosted.endDate) return false
  return Date.now() < boosted.endDate.getTime()
}

/**
 * Get referral milestones for gamification
 */
export function getReferralMilestones(currentReferrals) {
  const milestones = [
    { count: 1, reward: '10 DWT', label: 'First Referral', icon: '🎯' },
    { count: 5, reward: '50 DWT + Badge', label: 'Rising Star', icon: '⭐' },
    { count: 10, reward: 'VIP Status', label: 'Influencer', icon: '💎' },
    { count: 25, reward: '125 DWT + NFT', label: 'Ambassador', icon: '🏆' },
    { count: 50, reward: '250 DWT + Exclusive', label: 'Legend', icon: '👑' }
  ]
  
  return milestones.map(m => ({
    ...m,
    achieved: currentReferrals >= m.count,
    progress: Math.min(currentReferrals / m.count * 100, 100)
  }))
}

/**
 * Create referral campaign landing page content
 */
export function generateCampaignLandingContent(address) {
  const stats = getReferralStats()
  const tier = getCampaignTier(stats.signups)
  
  return {
    headline: `Earn ${tier.referrerReward} DWT Per Referral!`,
    subheadline: 'Share dWallet and grow your crypto portfolio together',
    benefits: [
      `✅ Earn ${tier.referrerReward} DWT for each friend`,
      `✅ Friends get ${tier.refereeReward} DWT bonus`,
      '✅ 12.5% APY staking rewards',
      '✅ Bank-grade security',
      '✅ Multi-chain support'
    ],
    callToAction: 'Start Sharing Now',
    socialProof: stats.signups > 0 
      ? `You've already earned ${stats.earned} DWT from ${stats.signups} referrals!`
      : 'Be the first to earn rewards!'
  }
}
