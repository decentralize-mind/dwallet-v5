/**
 * Clear Corrupted Biometric Credentials
 * Run this in your browser console (F12 → Console)
 */

console.log('🔧 Clearing corrupted biometric credentials...\n');

// Check current state
const oldCredential = localStorage.getItem('dwallet_biometric_credential');
const isEnabled = localStorage.getItem('dwallet_biometric_enabled');

console.log('Current State:');
console.log('- Biometric Enabled:', isEnabled === 'true' ? '✅ Yes' : '❌ No');
console.log('- Credential Exists:', oldCredential ? '✅ Yes' : '❌ No');

if (oldCredential) {
  try {
    const parsed = JSON.parse(oldCredential);
    console.log('- Has rawId:', parsed.rawId ? '✅ Yes (new format)' : '❌ No (old format - corrupted)');
    console.log('- Credential ID:', parsed.id ? parsed.id.substring(0, 20) + '...' : 'None');
  } catch (e) {
    console.log('- Credential Data:', '⚠️  Corrupted JSON');
  }
}

console.log('\n' + '='.repeat(60));
console.log('Clearing old credentials...');
console.log('='.repeat(60) + '\n');

// Clear biometric data
localStorage.removeItem('dwallet_biometric_credential');
localStorage.removeItem('dwallet_biometric_enabled');

console.log('✅ Old biometric credentials cleared!\n');

// Verify
const cleared1 = localStorage.getItem('dwallet_biometric_credential');
const cleared2 = localStorage.getItem('dwallet_biometric_enabled');

if (!cleared1 && !cleared2) {
  console.log('✅ Verification: All biometric data removed successfully\n');
  console.log('📋 Next Steps:');
  console.log('1. Refresh the page (Cmd+R or Ctrl+R)');
  console.log('2. Go to Settings → Security');
  console.log('3. Click "👆 Enable Touch ID / Face ID"');
  console.log('4. Enter your wallet password');
  console.log('5. Touch the Touch ID sensor');
  console.log('6. Done! Biometric should now work ✅\n');
  console.log('💡 The fix includes:');
  console.log('   - Proper base64url encoding (was using standard base64)');
  console.log('   - Better localhost support');
  console.log('   - Improved error handling');
} else {
  console.log('❌ Error: Failed to clear credentials');
  console.log('Please try manually in console:');
  console.log('  localStorage.clear()');
}

console.log('\n' + '='.repeat(60));
