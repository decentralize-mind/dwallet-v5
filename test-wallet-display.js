/**
 * Test Script: Wallet Creation Display
 * 
 * This script tests the wallet creation display functionality
 * Run this in the browser console after loading the landing page
 */

console.log('🧪 Testing Wallet Creation Display...\n');

// Test 1: Check if component exists
console.log('Test 1: Checking LandingPage component...');
const landingPage = document.querySelector('.landing-page');
if (landingPage) {
  console.log('✅ Landing page component found');
} else {
  console.log('❌ Landing page component not found');
}

// Test 2: Check if hero content exists
console.log('\nTest 2: Checking hero content...');
const heroContent = document.querySelector('.hero-content');
if (heroContent) {
  console.log('✅ Hero content found');
} else {
  console.log('❌ Hero content not found');
}

// Test 3: Check if badge exists
console.log('\nTest 3: Checking hero badge...');
const heroBadge = document.querySelector('.hero-badge');
if (heroBadge && heroBadge.textContent.includes('Non-Custodial')) {
  console.log('✅ Hero badge found with correct text');
} else {
  console.log('❌ Hero badge not found or incorrect text');
}

// Test 4: Check if Create Wallet button exists
console.log('\nTest 4: Checking Create Wallet button...');
const createBtn = document.querySelector('.btn-primary.btn-large');
if (createBtn && createBtn.textContent.includes('Create Wallet')) {
  console.log('✅ Create Wallet button found');
} else {
  console.log('❌ Create Wallet button not found');
}

// Test 5: Check CSS classes are defined
console.log('\nTest 5: Checking CSS classes...');
const styleSheets = Array.from(document.styleSheets);
let cssFound = false;

try {
  for (let sheet of styleSheets) {
    try {
      const rules = Array.from(sheet.cssRules || sheet.rules);
      const hasWalletCreationBanner = rules.some(rule => 
        rule.selectorText && rule.selectorText.includes('wallet-creation-banner')
      );
      const hasRecentWalletsBanner = rules.some(rule => 
        rule.selectorText && rule.selectorText.includes('recent-wallets-banner')
      );
      
      if (hasWalletCreationBanner) {
        console.log('✅ .wallet-creation-banner CSS found');
        cssFound = true;
      }
      if (hasRecentWalletsBanner) {
        console.log('✅ .recent-wallets-banner CSS found');
        cssFound = true;
      }
    } catch (e) {
      // Cross-origin stylesheet, skip
    }
  }
  
  if (!cssFound) {
    console.log('⚠️  CSS classes not found in stylesheets (might be in dev mode)');
  }
} catch (e) {
  console.log('⚠️  Could not check stylesheets:', e.message);
}

// Test 6: Simulate wallet creation animation
console.log('\nTest 6: Testing animation state management...');
console.log('To test the animation manually:');
console.log('1. Click the "Create Wallet" button');
console.log('2. Watch for the creation banner to appear');
console.log('3. Verify it goes through 3 steps:');
console.log('   - Generating your secure wallet...');
console.log('   - Encrypting with AES-256-GCM...');
console.log('   - Wallet created successfully!');
console.log('4. Verify progress bar animates through steps');

// Test 7: Check React state (if React DevTools is available)
console.log('\nTest 7: Checking React component state...');
if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
  console.log('✅ React DevTools detected - you can inspect component state');
  console.log('   Look for these state variables:');
  console.log('   - showWalletCreation');
  console.log('   - walletCreationStep');
  console.log('   - recentWallets');
} else {
  console.log('⚠️  React DevTools not detected');
  console.log('   Install React DevTools browser extension to inspect state');
}

// Test 8: Verify recent wallets functionality
console.log('\nTest 8: Testing recent wallets display...');
console.log('To test recent wallets:');
console.log('1. Create a wallet through the onboarding flow');
console.log('2. Return to the landing page');
console.log('3. Look for "Recently Created Wallets" banner above the hero badge');
console.log('4. Verify it shows:');
console.log('   - Wallet name');
console.log('   - Truncated address (0x1234...5678)');
console.log('   - Creation time');

// Test 9: Performance check
console.log('\nTest 9: Performance metrics...');
if (window.performance) {
  const perfData = window.performance.timing;
  const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;
  console.log(`📊 Page load time: ${pageLoadTime}ms`);
  
  if (pageLoadTime < 2000) {
    console.log('✅ Page load time is good (< 2s)');
  } else {
    console.log('⚠️  Page load time is slow (> 2s)');
  }
}

// Test 10: Responsive design check
console.log('\nTest 10: Responsive design...');
const viewportWidth = window.innerWidth;
console.log(`Current viewport width: ${viewportWidth}px`);

if (viewportWidth > 1024) {
  console.log('📱 Desktop view - full layout should be visible');
} else if (viewportWidth > 768) {
  console.log('📱 Tablet view - centered layout');
} else {
  console.log('📱 Mobile view - stacked layout');
}

console.log('\n✅ All tests completed!');
console.log('\n📝 Manual Testing Checklist:');
console.log('□ Click "Create Wallet" button');
console.log('□ Verify animation banner appears');
console.log('□ Verify 3-step progression');
console.log('□ Verify progress bar animation');
console.log('□ Complete wallet creation');
console.log('□ Verify recent wallets banner appears');
console.log('□ Test on different screen sizes');
console.log('□ Test in different browsers');

console.log('\n🎨 Visual Checks:');
console.log('□ Banner has purple gradient background');
console.log('□ Spinner rotates smoothly');
console.log('□ Checkmark is green and animated');
console.log('□ Progress bars fill sequentially');
console.log('□ Recent wallet cards have hover effect');
console.log('□ Text is readable and properly aligned');

console.log('\n🐛 If you encounter issues:');
console.log('1. Check browser console for errors');
console.log('2. Verify files are saved:');
console.log('   - src/components/LandingPage.jsx');
console.log('   - src/components/LandingPage.css');
console.log('3. Restart dev server: npm run dev');
console.log('4. Clear browser cache and reload');
console.log('5. Check network tab for failed requests');
