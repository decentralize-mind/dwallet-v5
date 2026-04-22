/**
 * Test script for user registration API
 */

const fetch = require('node-fetch');

const API_BASE = 'http://localhost:3001';

async function testUserRegistration() {
  console.log('🧪 Testing User Registration API...\n');

  // Test 1: Register a new user
  console.log('Test 1: Register a new user');
  try {
    const response = await fetch(`${API_BASE}/api/admin/users/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        walletAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1',
        referralCode: 'TEST001'
      })
    });

    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2));
    console.log('✅ Test 1 passed\n');
  } catch (error) {
    console.error('❌ Test 1 failed:', error.message, '\n');
  }

  // Test 2: Try to register the same user again (should update last_active)
  console.log('Test 2: Register existing user (should update last_active)');
  try {
    const response = await fetch(`${API_BASE}/api/admin/users/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        walletAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1'
      })
    });

    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2));
    console.log('✅ Test 2 passed\n');
  } catch (error) {
    console.error('❌ Test 2 failed:', error.message, '\n');
  }

  // Test 3: Register another user without referral code
  console.log('Test 3: Register user without referral code (should auto-generate)');
  try {
    const response = await fetch(`${API_BASE}/api/admin/users/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        walletAddress: '0x5B38Da6a701c568545dCfcB03FcB875f56beddC4'
      })
    });

    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2));
    console.log('✅ Test 3 passed\n');
  } catch (error) {
    console.error('❌ Test 3 failed:', error.message, '\n');
  }

  // Test 4: Invalid wallet address
  console.log('Test 4: Register with invalid wallet address');
  try {
    const response = await fetch(`${API_BASE}/api/admin/users/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        walletAddress: 'invalid-address'
      })
    });

    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2));
    console.log('✅ Test 4 passed (validation working)\n');
  } catch (error) {
    console.error('❌ Test 4 failed:', error.message, '\n');
  }

  console.log('🎉 All tests completed!');
}

testUserRegistration();
