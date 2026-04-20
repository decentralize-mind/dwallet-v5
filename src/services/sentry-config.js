/**
 * 🔍 Sentry Monitoring Configuration for Frontend
 * 
 * Captures React errors, performance metrics, and user interactions
 */

import * as Sentry from '@sentry/react';

// Initialize Sentry only if DSN is provided
const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    
    // Set environment
    environment: import.meta.env.VITE_ENVIRONMENT || 'development',
    
    // Performance monitoring
    tracesSampleRate: import.meta.env.VITE_ENVIRONMENT === 'production' ? 0.1 : 1.0,
    
    // Session replay for debugging
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    
    // Capture additional context
    initialScope: {
      tags: {
        component: 'admin-dashboard'
      }
    },
    
    // Filter sensitive data
    beforeSend(event) {
      // Remove any sensitive data from breadcrumbs
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map(breadcrumb => {
          if (breadcrumb.category === 'fetch' || breadcrumb.category === 'xhr') {
            // Remove authorization headers from network requests
            if (breadcrumb.data && breadcrumb.data.request_headers) {
              delete breadcrumb.data.request_headers.authorization;
            }
          }
          return breadcrumb;
        });
      }
      
      return event;
    },
    
    // Ignore common noise
    ignoreErrors: [
      // Browser extension errors
      'chrome-extension://',
      'moz-extension://',
      // Resize observer (harmless)
      'ResizeObserver loop limit exceeded',
      // Network errors (expected)
      'Network Error',
      'Request aborted'
    ]
  });

  console.log('✅ Sentry frontend monitoring initialized');
} else {
  console.log('⚠️  Sentry DSN not configured for frontend');
  console.log('💡 Set VITE_SENTRY_DSN in .env to enable monitoring');
}

// Export Sentry instance and ErrorBoundary component
export { Sentry };
export const ErrorBoundary = Sentry.ErrorBoundary;
