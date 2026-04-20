/**
 * 🧪 Sentry Test Script
 * 
 * This script intentionally triggers an error to verify
 * that Sentry monitoring is working correctly.
 * 
 * Usage: node scripts/test-sentry.js
 */

import * as Sentry from '@sentry/node';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

console.log('🧪 Testing Sentry Integration...\n');

// Initialize Sentry (same as admin-server.js)
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: 1.0,
  });

  console.log('✅ Sentry initialized');
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔍 DSN: ${process.env.SENTRY_DSN.substring(0, 20)}...\n`);

  // Test 1: Capture a simple error
  console.log('📝 Test 1: Capturing simple error...');
  try {
    // This will throw an error (foo is not defined)
    foo();
  } catch (error) {
    console.log('❌ Error caught:', error.message);
    Sentry.captureException(error);
    console.log('✅ Error sent to Sentry!\n');
  }

  // Test 2: Capture a custom error with context
  console.log('📝 Test 2: Capturing error with context...');
  try {
    const customError = new Error('Test error from dWallet admin dashboard');
    
    Sentry.captureException(customError, {
      tags: {
        test: 'sentry-verification',
        component: 'test-script'
      },
      user: {
        id: 'test-user',
        email: 'test@dwallet.io'
      },
      extra: {
        testType: 'verification',
        timestamp: new Date().toISOString()
      }
    });
    
    console.log('✅ Custom error sent to Sentry!\n');
  } catch (error) {
    console.error('Failed to send custom error:', error);
  }

  // Test 3: Capture a message
  console.log('📝 Test 3: Sending test message...');
  Sentry.captureMessage('Test message from dWallet admin setup', {
    level: 'info',
    tags: {
      test: 'message-verification'
    }
  });
  console.log('✅ Message sent to Sentry!\n');

  // Wait for Sentry to flush events
  console.log('⏳ Waiting for Sentry to send events...');
  setTimeout(async () => {
    await Sentry.close(2000);
    console.log('\n✅ All tests completed!');
    console.log('\n🎯 Next Steps:');
    console.log('1. Go to https://sentry.io');
    console.log('2. Navigate to your project dashboard');
    console.log('3. Click on "Issues" tab');
    console.log('4. You should see 2-3 new errors/messages');
    console.log('5. Click on an error to see full details');
    process.exit(0);
  }, 2000);

} else {
  console.error('❌ SENTRY_DSN not found in .env file');
  console.error('💡 Please add your Sentry DSN to .env file');
  process.exit(1);
}
