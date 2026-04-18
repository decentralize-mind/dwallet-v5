/**
 * User Engagement Analytics
 * Track feature usage and user behavior for growth optimization
 */

const ANALYTICS_KEY = 'dwallet_analytics'

// Initialize analytics data structure
function initAnalytics() {
  return {
    // Feature usage tracking
    features: {
      staking: { views: 0, stakes: 0, unstakes: 0, claims: 0, lastUsed: null },
      portfolio: { views: 0, lastUsed: null },
      priceAlerts: { views: 0, alertsCreated: 0, alertsTriggered: 0, lastUsed: null },
      swap: { views: 0, swaps: 0, lastUsed: null },
      send: { views: 0, sends: 0, lastUsed: null },
      receive: { views: 0, lastUsed: null },
      defi: { views: 0, lastUsed: null },
      nfts: { views: 0, lastUsed: null },
      dapps: { views: 0, lastUsed: null },
    },
    
    // Engagement metrics
    engagement: {
      sessions: 0,
      firstVisit: null,
      lastVisit: null,
      totalSessionTime: 0, // in seconds
      sessionStart: null,
    },
    
    // Retention tracking
    retention: {
      day1: false,
      day7: false,
      day30: false,
    },
    
    // Conversion events
    conversions: {
      notificationsEnabled: false,
      firstStake: false,
      firstAlert: false,
      firstSwap: false,
      referralUsed: false,
    },
    
    // Performance metrics
    performance: {
      pageLoadTimes: [],
      apiResponseTimes: [],
    }
  }
}

// Load analytics from localStorage
export function loadAnalytics() {
  try {
    const data = localStorage.getItem(ANALYTICS_KEY)
    if (data) {
      return JSON.parse(data)
    }
  } catch (error) {
    console.warn('[Analytics] Failed to load analytics:', error)
  }
  
  const analytics = initAnalytics()
  analytics.engagement.firstVisit = new Date().toISOString()
  saveAnalytics(analytics)
  return analytics
}

// Save analytics to localStorage
export function saveAnalytics(analytics) {
  try {
    localStorage.setItem(ANALYTICS_KEY, JSON.stringify(analytics))
  } catch (error) {
    console.warn('[Analytics] Failed to save analytics:', error)
  }
}

// Track feature view
export function trackFeatureView(featureName) {
  const analytics = loadAnalytics()
  
  if (analytics.features[featureName]) {
    analytics.features[featureName].views++
    analytics.features[featureName].lastUsed = new Date().toISOString()
  }
  
  saveAnalytics(analytics)
}

// Track feature action
export function trackFeatureAction(featureName, action) {
  const analytics = loadAnalytics()
  
  if (analytics.features[featureName]) {
    analytics.features[featureName][action] = 
      (analytics.features[featureName][action] || 0) + 1
    analytics.features[featureName].lastUsed = new Date().toISOString()
  }
  
  // Track conversion events
  if (featureName === 'staking' && action === 'stakes') {
    analytics.conversions.firstStake = true
  }
  if (featureName === 'priceAlerts' && action === 'alertsCreated') {
    analytics.conversions.firstAlert = true
  }
  if (featureName === 'swap' && action === 'swaps') {
    analytics.conversions.firstSwap = true
  }
  
  saveAnalytics(analytics)
}

// Track session start
export function trackSessionStart() {
  const analytics = loadAnalytics()
  
  analytics.engagement.sessions++
  analytics.engagement.lastVisit = new Date().toISOString()
  analytics.engagement.sessionStart = Date.now()
  
  // Check retention milestones
  const firstVisit = new Date(analytics.engagement.firstVisit)
  const now = new Date()
  const daysSinceFirst = (now - firstVisit) / (1000 * 60 * 60 * 24)
  
  if (daysSinceFirst >= 1) analytics.retention.day1 = true
  if (daysSinceFirst >= 7) analytics.retention.day7 = true
  if (daysSinceFirst >= 30) analytics.retention.day30 = true
  
  saveAnalytics(analytics)
}

// Track session end
export function trackSessionEnd() {
  const analytics = loadAnalytics()
  
  if (analytics.engagement.sessionStart) {
    const sessionDuration = Math.floor((Date.now() - analytics.engagement.sessionStart) / 1000)
    analytics.engagement.totalSessionTime += sessionDuration
    analytics.engagement.sessionStart = null
    saveAnalytics(analytics)
  }
}

// Track notification permission
export function trackNotificationEnabled(enabled) {
  const analytics = loadAnalytics()
  analytics.conversions.notificationsEnabled = enabled
  saveAnalytics(analytics)
}

// Track performance metric
export function trackPerformance(metricName, value) {
  const analytics = loadAnalytics()
  
  if (analytics.performance[metricName]) {
    analytics.performance[metricName].push({
      value,
      timestamp: new Date().toISOString()
    })
    
    // Keep only last 100 measurements
    if (analytics.performance[metricName].length > 100) {
      analytics.performance[metricName] = 
        analytics.performance[metricName].slice(-100)
    }
    
    saveAnalytics(analytics)
  }
}

// Get analytics summary
export function getAnalyticsSummary() {
  const analytics = loadAnalytics()
  
  const totalFeatureViews = Object.values(analytics.features)
    .reduce((sum, feature) => sum + (feature.views || 0), 0)
  
  const avgSessionTime = analytics.engagement.sessions > 0
    ? Math.round(analytics.engagement.totalSessionTime / analytics.engagement.sessions)
    : 0
  
  return {
    totalSessions: analytics.engagement.sessions,
    totalFeatureViews,
    avgSessionTime: `${Math.round(avgSessionTime / 60)}m ${avgSessionTime % 60}s`,
    firstVisit: analytics.engagement.firstVisit,
    lastVisit: analytics.engagement.lastVisit,
    retention: analytics.retention,
    conversions: analytics.conversions,
    topFeatures: Object.entries(analytics.features)
      .sort((a, b) => (b[1].views || 0) - (a[1].views || 0))
      .slice(0, 5)
      .map(([name, data]) => ({ name, views: data.views })),
  }
}

// Export analytics for analysis
export function exportAnalytics() {
  const analytics = loadAnalytics()
  const blob = new Blob([JSON.stringify(analytics, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `dwallet-analytics-${new Date().toISOString().split('T')[0]}.json`
  a.click()
  URL.revokeObjectURL(url)
}

// Reset analytics (for testing)
export function resetAnalytics() {
  localStorage.removeItem(ANALYTICS_KEY)
  console.log('[Analytics] Analytics data reset')
}

// Auto-track session lifecycle
let sessionTrackingInitialized = false

export function initializeSessionTracking() {
  if (sessionTrackingInitialized) return
  
  // Track session start
  trackSessionStart()
  
  // Track session end on page unload
  window.addEventListener('beforeunload', () => {
    trackSessionEnd()
  })
  
  // Track session end on visibility change
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      trackSessionEnd()
    } else {
      trackSessionStart()
    }
  })
  
  sessionTrackingInitialized = true
  console.log('[Analytics] Session tracking initialized')
}

// React hook for tracking component usage
export function useFeatureTracking(featureName) {
  const { useEffect } = require('react')
  
  useEffect(() => {
    trackFeatureView(featureName)
  }, [featureName])
  
  return {
    trackAction: (action) => trackFeatureAction(featureName, action)
  }
}
