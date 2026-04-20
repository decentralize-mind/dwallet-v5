/**
 * 🔍 Sentry Monitoring Configuration for Admin Backend
 * 
 * Provides error tracking, performance monitoring, and alerting
 * Perfect for localhost development and production
 */

const Sentry = require('@sentry/node');
const { nodeProfilingIntegration } = require('@sentry/profiling-node');

// Sentry DSN from environment variable
const SENTRY_DSN = process.env.SENTRY_DSN;

// Initialize Sentry only if DSN is provided
if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    
    // Set environment (development, staging, production)
    environment: process.env.NODE_ENV || 'development',
    
    // Performance monitoring - capture 100% of transactions in dev, 10% in prod
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    
    // Profiling for performance issues
    integrations: [
      nodeProfilingIntegration()
    ],
    
    // Profiling sample rate
    profilesSampleRate: 1.0,
    
    // Capture additional data
    sendDefaultPii: false, // Don't send personally identifiable info
    
    // Before sending event, allow modification
    beforeSend(event, hint) {
      // Remove sensitive data from error context
      if (event.request) {
        // Remove authorization headers
        if (event.request.headers) {
          delete event.request.headers.authorization;
          delete event.request.headers.cookie;
        }
        // Remove query parameters that might contain sensitive data
        if (event.request.query_string) {
          delete event.request.query_string;
        }
      }
      
      return event;
    },
    
    // Filter out noisy errors
    ignoreErrors: [
      // Common noise to ignore
      'Request aborted',
      'Connection reset',
      'ECONNRESET',
      'ETIMEDOUT'
    ]
  });

  console.log('✅ Sentry monitoring initialized');
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔍 Performance monitoring: ${process.env.NODE_ENV === 'production' ? '10%' : '100%'}`);
} else {
  console.log('⚠️  Sentry DSN not configured. Monitoring disabled.');
  console.log('💡 Set SENTRY_DSN in .env to enable monitoring');
}

// Export configured Sentry instance
module.exports = Sentry;
