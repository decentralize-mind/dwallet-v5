/**
 * NFTMembership Event Monitoring Configuration
 * 
 * This file defines the event monitoring setup for the NFTMembership contract.
 * It can be used with services like Tenderly, OpenZeppelin Defender, or custom monitoring.
 */

const NFT_MEMBERSHIP_EVENTS = {
  // Critical Security Events - Immediate alerts required
  CRITICAL: [
    {
      name: 'WithdrawFailed',
      severity: 'CRITICAL',
      description: 'ETH or DWT withdrawal failed - possible security issue',
      alertChannels: ['email', 'sms', 'slack'],
      action: 'Investigate immediately and check contract state',
    },
    {
      name: 'InvalidWithdrawalAddress',
      severity: 'CRITICAL',
      description: 'Attempted withdrawal to zero address detected',
      alertChannels: ['email', 'slack'],
      action: 'Review transaction and verify no malicious activity',
    },
  ],

  // Important Events - Monitor for anomalies
  IMPORTANT: [
    {
      name: 'PassMinted',
      severity: 'INFO',
      description: 'New membership pass minted',
      metrics: {
        trackVolume: true,
        trackRevenue: true,
        alertOnSpike: true,
        spikeThreshold: '10 mints in 5 minutes',
      },
      dashboard: true,
    },
    {
      name: 'PassUpgraded',
      severity: 'INFO',
      description: 'User upgraded their membership tier',
      metrics: {
        trackUpgrades: true,
        calculateRevenue: true,
      },
      dashboard: true,
    },
    {
      name: 'HighestTierUpdated',
      severity: 'WARNING',
      description: 'User highest tier changed - monitor for unexpected changes',
      alertOnCondition: 'tier decreases',
      action: 'Verify transfer or burn was legitimate',
      dashboard: true,
    },
    {
      name: 'FreeMintWhitelistUpdated',
      severity: 'WARNING',
      description: 'Free mint whitelist modified',
      alertChannels: ['slack', 'email'],
      action: 'Verify admin action was authorized',
      dashboard: true,
    },
  ],

  // Operational Events - Track for analytics
  OPERATIONAL: [
    {
      name: 'TierConfigured',
      severity: 'INFO',
      description: 'Tier configuration updated',
      alertChannels: ['slack'],
      action: 'Log change and verify pricing is correct',
    },
    {
      name: 'ExpiryExtended',
      severity: 'INFO',
      description: 'User renewed their membership pass',
      metrics: {
        trackRenewals: true,
        calculateRenewalRate: true,
      },
      dashboard: true,
    },
    {
      name: 'AccessChecked',
      severity: 'DEBUG',
      description: 'Access check performed',
      metrics: {
        trackAccessChecks: true,
        monitorGasUsage: true,
      },
      dashboard: false, // Too frequent for dashboard
    },
    {
      name: 'MintCooldownUpdated',
      severity: 'INFO',
      description: 'Mint cooldown period changed',
      alertChannels: ['slack'],
    },
    {
      name: 'MaxMintsPerUserUpdated',
      severity: 'INFO',
      description: 'Max mints per user limit changed',
      alertChannels: ['slack'],
    },
  ],
}

// Monitoring thresholds and alerts
const MONITORING_THRESHOLDS = {
  // Rate limiting alerts
  MINT_RATE: {
    warning: '5 mints per minute',
    critical: '20 mints per minute',
    action: 'Consider if bot activity or legitimate demand',
  },

  // Revenue tracking
  REVENUE: {
    trackETH: true,
    trackDWT: true,
    reportInterval: 'daily',
    alertOnAnomaly: true,
  },

  // Tier distribution monitoring
  TIER_DISTRIBUTION: {
    trackPerTier: true,
    alertOnImbalance: true,
    // Alert if any tier has < 5% or > 80% of total mints
    imbalanceThreshold: { min: 0.05, max: 0.80 },
  },

  // Expiry monitoring
  EXPIRY: {
    checkInterval: 'daily',
    alertOnMassExpiry: true,
    // Alert if > 100 NFTs expiring in next 7 days
    massExpiryThreshold: 100,
    notificationDaysBefore: [30, 7, 1],
  },

  // Gas usage monitoring
  GAS_USAGE: {
    trackPerFunction: true,
    alertOnSpike: true,
    // Alert if gas usage increases by > 50%
    spikeThreshold: 0.50,
  },
}

// Dashboard configuration
const DASHBOARD_CONFIG = {
  widgets: [
    {
      id: 'total_mints',
      title: 'Total Membership Passes Minted',
      type: 'counter',
      event: 'PassMinted',
      aggregation: 'count',
      refreshInterval: '5m',
    },
    {
      id: 'revenue_eth',
      title: 'Total Revenue (ETH)',
      type: 'counter',
      event: 'PassMinted',
      aggregation: 'sum',
      field: 'ethPrice',
      refreshInterval: '5m',
    },
    {
      id: 'tier_distribution',
      title: 'Tier Distribution',
      type: 'pie_chart',
      event: 'PassMinted',
      groupBy: 'tier',
      refreshInterval: '15m',
    },
    {
      id: 'mints_over_time',
      title: 'Mints Over Time',
      type: 'line_chart',
      event: 'PassMinted',
      timeWindow: '30d',
      refreshInterval: '1h',
    },
    {
      id: 'upgrades_over_time',
      title: 'Upgrades Over Time',
      type: 'line_chart',
      event: 'PassUpgraded',
      timeWindow: '30d',
      refreshInterval: '1h',
    },
    {
      id: 'active_members',
      title: 'Active Members (Non-Expired)',
      type: 'counter',
      calculation: 'unique_addresses_with_valid_pass',
      refreshInterval: '1h',
    },
    {
      id: 'renewal_rate',
      title: 'Renewal Rate (30d)',
      type: 'percentage',
      calculation: 'renewals / expirations',
      timeWindow: '30d',
      refreshInterval: '6h',
    },
  ],
}

// Webhook configurations for alerts
const WEBHOOK_CONFIG = {
  slack: {
    enabled: process.env.SLACK_WEBHOOK_URL ? true : false,
    url: process.env.SLACK_WEBHOOK_URL,
    channel: '#nft-membership-alerts',
    mentionOnCritical: '@on-call',
  },
  email: {
    enabled: process.env.ALERT_EMAIL ? true : false,
    recipients: process.env.ALERT_EMAIL?.split(','),
    smtpConfig: {
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: true,
    },
  },
  sms: {
    enabled: process.env.TWILIO_ACCOUNT_SID ? true : false,
    provider: 'twilio',
    phoneNumbers: process.env.ALERT_PHONE?.split(','),
  },
  discord: {
    enabled: process.env.DISCORD_WEBHOOK_URL ? true : false,
    url: process.env.DISCORD_WEBHOOK_URL,
  },
}

// Monitoring setup script
async function setupMonitoring() {
  console.log('🔍 Setting up NFTMembership Event Monitoring...')
  console.log('='.repeat(60))

  console.log('\n📊 Events to monitor:')
  Object.entries(NFT_MEMBERSHIP_EVENTS).forEach(([category, events]) => {
    console.log(`\n${category}:`)
    events.forEach(event => {
      console.log(`  ✓ ${event.name} (${event.severity})`)
    })
  })

  console.log('\n⚙️  Monitoring thresholds configured:')
  Object.entries(MONITORING_THRESHOLDS).forEach(([key, config]) => {
    console.log(`  ✓ ${key}`)
  })

  console.log('\n📈 Dashboard widgets:')
  DASHBOARD_CONFIG.widgets.forEach(widget => {
    console.log(`  ✓ ${widget.title}`)
  })

  console.log('\n🔔 Alert channels:')
  Object.entries(WEBHOOK_CONFIG).forEach(([channel, config]) => {
    console.log(`  ${config.enabled ? '✓' : '✗'} ${channel}`)
  })

  console.log('\n' + '='.repeat(60))
  console.log('✅ Monitoring configuration loaded')
  console.log('\nNext steps:')
  console.log('1. Deploy contract and update contract address')
  console.log('2. Configure webhook URLs in .env file')
  console.log('3. Set up monitoring service (Tenderly/Defender/etc.)')
  console.log('4. Test alert channels')
  console.log('5. Create dashboard with configured widgets')
}

// Export for use in monitoring services
module.exports = {
  NFT_MEMBERSHIP_EVENTS,
  MONITORING_THRESHOLDS,
  DASHBOARD_CONFIG,
  WEBHOOK_CONFIG,
  setupMonitoring,
}

// Run setup if executed directly
if (require.main === module) {
  setupMonitoring().catch(console.error)
}
