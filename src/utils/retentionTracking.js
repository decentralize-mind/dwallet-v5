/**
 * Retention Metrics & Automated Reporting
 * Track user retention and generate insights
 */

import { loadAnalytics, saveAnalytics } from './analytics'

/**
 * Calculate retention rates
 */
export function calculateRetentionRates() {
  const analytics = loadAnalytics()
  const firstVisit = new Date(analytics.engagement.firstVisit)
  const now = new Date()
  const daysSinceFirst = (now - firstVisit) / (1000 * 60 * 60 * 24)
  
  return {
    day1: {
      achieved: analytics.retention.day1,
      percentage: daysSinceFirst >= 1 ? (analytics.retention.day1 ? 100 : 0) : null
    },
    day7: {
      achieved: analytics.retention.day7,
      percentage: daysSinceFirst >= 7 ? (analytics.retention.day7 ? 100 : 0) : null
    },
    day30: {
      achieved: analytics.retention.day30,
      percentage: daysSinceFirst >= 30 ? (analytics.retention.day30 ? 100 : 0) : null
    },
    currentDay: Math.floor(daysSinceFirst),
    firstVisit: analytics.engagement.firstVisit,
    lastVisit: analytics.engagement.lastVisit,
    totalSessions: analytics.engagement.sessions,
    totalSessionTime: analytics.engagement.totalSessionTime
  }
}

/**
 * Generate retention report
 */
export function generateRetentionReport() {
  const retention = calculateRetentionRates()
  const analytics = loadAnalytics()
  
  const featureAdoption = {}
  Object.entries(analytics.features).forEach(([name, data]) => {
    featureAdoption[name] = {
      views: data.views,
      lastUsed: data.lastUsed,
      adoptionRate: data.views > 0 ? 'active' : 'not_used'
    }
  })
  
  return {
    generatedAt: new Date().toISOString(),
    retention,
    featureAdoption,
    conversions: analytics.conversions,
    recommendations: generateRecommendations(retention, featureAdoption)
  }
}

/**
 * Generate actionable recommendations based on data
 */
function generateRecommendations(retention, featureAdoption) {
  const recommendations = []
  
  // Retention-based recommendations
  if (!retention.retention.day1 && retention.currentDay >= 1) {
    recommendations.push({
      priority: 'high',
      category: 'retention',
      message: 'Day 1 retention not achieved. Consider adding onboarding tutorial or first-time user incentives.'
    })
  }
  
  if (!retention.retention.day7 && retention.currentDay >= 7) {
    recommendations.push({
      priority: 'critical',
      category: 'retention',
      message: 'Day 7 retention not achieved. Users are not returning. Push notifications and price alerts may help.'
    })
  }
  
  // Feature adoption recommendations
  const stakingAdopted = featureAdoption.staking?.views > 0
  const alertsAdopted = featureAdoption.priceAlerts?.views > 0
  const portfolioAdopted = featureAdoption.portfolio?.views > 0
  
  if (!stakingAdopted && retention.currentDay >= 2) {
    recommendations.push({
      priority: 'high',
      category: 'feature_adoption',
      message: 'User has not tried staking. Promote 12.5% APY benefit more prominently.'
    })
  }
  
  if (!alertsAdopted && retention.currentDay >= 3) {
    recommendations.push({
      priority: 'medium',
      category: 'feature_adoption',
      message: 'Price alerts not set up. This feature drives daily engagement. Consider prompting user.'
    })
  }
  
  if (!portfolioAdopted && retention.currentDay >= 1) {
    recommendations.push({
      priority: 'medium',
      category: 'feature_adoption',
      message: 'Portfolio chart not viewed. This is a key daily engagement feature.'
    })
  }
  
  // Engagement recommendations
  if (retention.totalSessions < 3 && retention.currentDay >= 3) {
    recommendations.push({
      priority: 'critical',
      category: 'engagement',
      message: 'Low session count. User is not returning. Send re-engagement notification.'
    })
  }
  
  const avgSessionTime = retention.totalSessions > 0 
    ? retention.totalSessionTime / retention.totalSessions 
    : 0
  
  if (avgSessionTime < 60 && retention.totalSessions > 2) {
    recommendations.push({
      priority: 'medium',
      category: 'engagement',
      message: 'Average session time is low (< 1 min). User may not find value quickly enough.'
    })
  }
  
  // Conversion recommendations
  const conversions = loadAnalytics().conversions
  if (!conversions.notificationsEnabled && retention.currentDay >= 2) {
    recommendations.push({
      priority: 'high',
      category: 'conversion',
      message: 'Notifications not enabled. This is critical for retention. Prompt user again.'
    })
  }
  
  if (!conversions.firstStake && retention.currentDay >= 5) {
    recommendations.push({
      priority: 'high',
      category: 'conversion',
      message: 'User has not staked yet after 5 days. Consider offering staking tutorial or bonus.'
    })
  }
  
  return recommendations
}

/**
 * Export retention report as downloadable file
 */
export function exportRetentionReport() {
  const report = generateRetentionReport()
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `dwallet-retention-report-${new Date().toISOString().split('T')[0]}.json`
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * Get daily engagement summary
 */
export function getDailyEngagementSummary() {
  const analytics = loadAnalytics()
  const retention = calculateRetentionRates()
  
  return {
    date: new Date().toISOString().split('T')[0],
    sessions: retention.totalSessions,
    avgSessionTime: retention.totalSessions > 0 
      ? Math.round(retention.totalSessionTime / retention.totalSessions / 60) 
      : 0,
    featuresUsed: Object.values(analytics.features).filter(f => f.views > 0).length,
    conversionsCompleted: Object.values(analytics.conversions).filter(v => v).length,
    retentionDay: retention.currentDay,
    isRetained: retention.retention.day1 && retention.retention.day7
  }
}

/**
 * Check if user is at risk of churning
 */
export function isChurnRisk() {
  const retention = calculateRetentionRates()
  const analytics = loadAnalytics()
  
  const daysSinceLastVisit = analytics.engagement.lastVisit
    ? (new Date() - new Date(analytics.engagement.lastVisit)) / (1000 * 60 * 60 * 24)
    : 999
  
  return {
    atRisk: daysSinceLastVisit > 7 || (!retention.retention.day1 && retention.currentDay >= 3),
    daysSinceLastVisit: Math.round(daysSinceLastVisit),
    reason: daysSinceLastVisit > 7 
      ? 'No activity in 7+ days' 
      : 'Low engagement in first week'
  }
}

/**
 * Generate re-engagement message
 */
export function generateReEngagementMessage() {
  const analytics = loadAnalytics()
  const retention = calculateRetentionRates()
  const churnRisk = isChurnRisk()
  
  if (!churnRisk.atRisk) return null
  
  const messages = []
  
  // Check which features they haven't tried
  if (!analytics.features.staking?.views) {
    messages.push('🎁 Earn 12.5% APY on DWT staking - try it now!')
  }
  
  if (!analytics.features.priceAlerts?.views) {
    messages.push('🔔 Set up price alerts to never miss a move')
  }
  
  if (!analytics.conversions.notificationsEnabled) {
    messages.push('📱 Enable notifications to stay updated')
  }
  
  if (retention.currentDay >= 7 && !analytics.retention.day7) {
    messages.push(`👋 We miss you! Come back and check your portfolio`)
  }
  
  return {
    headline: 'Welcome Back to dWallet!',
    messages: messages.slice(0, 3), // Max 3 messages
    callToAction: 'Open dWallet Now'
  }
}

/**
 * Track retention event (called on app open)
 */
export function trackRetentionEvent() {
  const analytics = loadAnalytics()
  const firstVisit = new Date(analytics.engagement.firstVisit)
  const now = new Date()
  const daysSinceFirst = (now - firstVisit) / (1000 * 60 * 60 * 24)
  
  // Update retention milestones
  if (daysSinceFirst >= 1) analytics.retention.day1 = true
  if (daysSinceFirst >= 7) analytics.retention.day7 = true
  if (daysSinceFirst >= 30) analytics.retention.day30 = true
  
  saveAnalytics(analytics)
  
  return {
    retentionDay: Math.floor(daysSinceFirst),
    milestones: {
      day1: analytics.retention.day1,
      day7: analytics.retention.day7,
      day30: analytics.retention.day30
    }
  }
}
