/**
 * Biometric Authentication Test Script
 * Run this in your browser console to test biometric support
 */

console.log('🔐 Testing Biometric Authentication Support...\n');

// Test 1: Check if WebAuthn is supported
console.log('Test 1: WebAuthn Support');
if (window.PublicKeyCredential) {
  console.log('✅ PublicKeyCredential API is available');
} else {
  console.log('❌ PublicKeyCredential API is NOT available');
  console.log('   → Biometric authentication is not supported in this browser');
}

// Test 2: Check if credentials API is available
console.log('\nTest 2: Credentials API');
if (navigator.credentials) {
  console.log('✅ navigator.credentials API is available');
} else {
  console.log('❌ navigator.credentials API is NOT available');
}

// Test 3: Check biometric support
console.log('\nTest 3: Biometric Support Detection');
if (window.PublicKeyCredential && navigator.credentials) {
  console.log('✅ Basic biometric support detected');
  
  // Check if platform authenticator is available
  PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
    .then(available => {
      if (available) {
        console.log('✅ Platform authenticator (Touch ID/Face ID/Windows Hello) is available!');
        console.log('   → You can use biometric authentication');
      } else {
        console.log('⚠️  Platform authenticator is NOT available');
        console.log('   → Your device may not have Touch ID/Face ID');
      }
    })
    .catch(err => {
      console.error('❌ Error checking platform authenticator:', err);
    });
} else {
  console.log('❌ Biometric authentication is not supported');
}

// Test 4: Check current biometric status
console.log('\nTest 4: Current Biometric Status');
const biometricEnabled = localStorage.getItem('dwallet_biometric_enabled') === 'true';
const hasCredential = localStorage.getItem('dwallet_biometric_credential') !== null;

console.log(`Biometric Enabled: ${biometricEnabled ? '✅ Yes' : '❌ No'}`);
console.log(`Credential Stored: ${hasCredential ? '✅ Yes' : '❌ No'}`);

// Test 5: Check if wallet exists
console.log('\nTest 5: Wallet Status');
const encryptedWallet = localStorage.getItem('dwallet_v5_encrypted');
if (encryptedWallet) {
  console.log('✅ Wallet found in localStorage');
  console.log('   → You can proceed with biometric setup');
} else {
  console.log('❌ No wallet found in localStorage');
  console.log('   → Create or import a wallet first');
}

console.log('\n' + '='.repeat(60));
console.log('📋 Summary:');
console.log('='.repeat(60));

if (window.PublicKeyCredential && navigator.credentials && encryptedWallet) {
  console.log('✅ You can use biometric authentication!');
  console.log('\n📝 Next Steps:');
  console.log('1. Open the Toklo Wallet app');
  console.log('2. Go to Settings → Security section');
  console.log('3. Click "👆 Enable Touch ID / Face ID"');
  console.log('4. Enter your wallet password');
  console.log('5. Follow the Touch ID prompt');
} else {
  console.log('❌ Biometric authentication cannot be used');
  console.log('\nReasons:');
  if (!window.PublicKeyCredential || !navigator.credentials) {
    console.log('- Browser does not support WebAuthn API');
  }
  if (!encryptedWallet) {
    console.log('- No wallet created/imported yet');
  }
  console.log('\n💡 Try:');
  console.log('- Use a modern browser (Chrome, Safari, Edge, Firefox)');
  console.log('- Create or import a wallet first');
  console.log('- Ensure you\'re on HTTPS or localhost');
}

console.log('\n' + '='.repeat(60));
