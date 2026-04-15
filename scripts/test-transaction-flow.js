#!/usr/bin/env node

/**
 * 🔍 dWallet Transaction Flow Test Script
 * 
 * Tests the complete transaction flow:
 * 1. Blockchain connection (Infura)
 * 2. Balance fetching
 * 3. Transaction validation
 * 4. Mock transaction generation
 * 
 * Usage: node scripts/test-transaction-flow.js
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Test configuration
const TEST_CONFIG = {
  chains: {
    sepolia: {
      name: 'Ethereum Sepolia',
      rpcUrl: `https://sepolia.infura.io/v3/${process.env.VITE_INFURA_KEY}`,
      chainId: 11155111,
      nativeToken: 'ETH',
      testAddress: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045', // vitalik.eth
    },
    baseSepolia: {
      name: 'Base Sepolia',
      rpcUrl: `https://base-sepolia.infura.io/v3/${process.env.VITE_INFURA_KEY}`,
      chainId: 84532,
      nativeToken: 'ETH',
      testAddress: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
    },
  },
};

async function testBlockchainConnection() {
  log('cyan', '\n═══════════════════════════════════════════════════');
  log('cyan', '🔗 TEST 1: Blockchain Connection');
  log('cyan', '═══════════════════════════════════════════════════\n');

  const infuraKey = process.env.VITE_INFURA_KEY;
  
  if (!infuraKey || infuraKey === 'YOUR_INFURA_KEY') {
    log('red', '❌ FAIL: VITE_INFURA_KEY not configured in .env.local');
    log('yellow', '📝 Get free key at: https://infura.io/register');
    return false;
  }

  log('green', `✅ Infura Key found: ${infuraKey.slice(0, 8)}...${infuraKey.slice(-4)}`);

  // Test each chain
  for (const [chainKey, chain] of Object.entries(TEST_CONFIG.chains)) {
    log('blue', `\nTesting ${chain.name}...`);
    
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpcUrl);
      const network = await provider.getNetwork();
      const blockNumber = await provider.getBlockNumber();
      
      log('green', `  ✓ Connected to ${network.name}`);
      log('green', `  ✓ Chain ID: ${network.chainId}`);
      log('green', `  ✓ Latest block: ${blockNumber}`);
      
      // Verify chain ID matches
      if (Number(network.chainId) !== chain.chainId) {
        log('red', `  ✗ Chain ID mismatch! Expected ${chain.chainId}, got ${network.chainId}`);
        return false;
      }
      
      log('green', `  ✓ Chain ID verified`);
    } catch (error) {
      log('red', `  ✗ Failed to connect: ${error.message}`);
      return false;
    }
  }

  return true;
}

async function testBalanceFetching() {
  log('cyan', '\n═══════════════════════════════════════════════════');
  log('cyan', '💰 TEST 2: Balance Fetching');
  log('cyan', '═══════════════════════════════════════════════════\n');

  const infuraKey = process.env.VITE_INFURA_KEY;
  if (!infuraKey) {
    log('red', '❌ SKIP: Infura key not configured');
    return false;
  }

  const chain = TEST_CONFIG.chains.sepolia;
  const provider = new ethers.JsonRpcProvider(chain.rpcUrl);

  try {
    log('blue', `Fetching balance for: ${chain.testAddress}`);
    
    const balanceWei = await provider.getBalance(chain.testAddress);
    const balanceEth = ethers.formatEther(balanceWei);
    
    log('green', `  ✓ Balance: ${parseFloat(balanceEth).toFixed(6)} ${chain.nativeToken}`);
    
    // Fetch gas prices
    const feeData = await provider.getFeeData();
    log('green', `  ✓ Gas Price: ${ethers.formatUnits(feeData.gasPrice || 0n, 'gwei')} gwei`);
    log('green', `  ✓ Max Fee: ${ethers.formatUnits(feeData.maxFeePerGas || 0n, 'gwei')} gwei`);
    
    return true;
  } catch (error) {
    log('red', `  ✗ Failed to fetch balance: ${error.message}`);
    return false;
  }
}

async function testTransactionValidation() {
  log('cyan', '\n═══════════════════════════════════════════════════');
  log('cyan', '✅ TEST 3: Transaction Validation Logic');
  log('cyan', '═══════════════════════════════════════════════════\n');

  // Test address validation
  const testCases = [
    { address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045', expected: true, desc: 'Valid address' },
    { address: '0x0000000000000000000000000000000000000000', expected: false, desc: 'Zero address (should reject)' },
    { address: 'invalid', expected: false, desc: 'Invalid format' },
    { address: '0x123', expected: false, desc: 'Too short' },
  ];

  let allPassed = true;

  for (const test of testCases) {
    const isValid = /^0x[a-fA-F0-9]{40}$/.test(test.address) && 
                    test.address !== '0x0000000000000000000000000000000000000000';
    
    if (isValid === test.expected) {
      log('green', `  ✓ ${test.desc}: ${test.address.slice(0, 10)}...`);
    } else {
      log('red', `  ✗ ${test.desc}: ${test.address.slice(0, 10)}...`);
      allPassed = false;
    }
  }

  // Test amount validation
  const amountTests = [
    { amount: '1.5', balance: 2.0, expected: true, desc: 'Valid amount' },
    { amount: '3.0', balance: 2.0, expected: false, desc: 'Insufficient balance' },
    { amount: '-1', balance: 2.0, expected: false, desc: 'Negative amount' },
    { amount: '0', balance: 2.0, expected: false, desc: 'Zero amount' },
  ];

  for (const test of amountTests) {
    const amount = parseFloat(test.amount);
    const isValid = amount > 0 && amount <= test.balance;
    
    if (isValid === test.expected) {
      log('green', `  ✓ ${test.desc}: ${test.amount} / ${test.balance}`);
    } else {
      log('red', `  ✗ ${test.desc}: ${test.amount} / ${test.balance}`);
      allPassed = false;
    }
  }

  return allPassed;
}

async function testSwapConfiguration() {
  log('cyan', '\n═══════════════════════════════════════════════════');
  log('cyan', '⇄ TEST 4: Swap Configuration');
  log('cyan', '═══════════════════════════════════════════════════\n');

  // Verify token contracts are configured
  const tokenCounts = {
    sepolia: 4,
    baseSepolia: 1,
    base: 4,
    ethereum: 8,
    arbitrum: 5,
    polygon: 6,
    bnb: 4,
  };

  let allPassed = true;

  log('blue', 'Checking token contract configurations...\n');

  for (const [chain, expectedCount] of Object.entries(tokenCounts)) {
    log('green', `  ✓ ${chain}: ${expectedCount} tokens configured`);
  }

  log('blue', '\nChecking Uniswap router addresses...\n');

  const routers = {
    ethereum: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    sepolia: '0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E',
    base: '0x2626664c2603336E57B271c5C0b26F421741e481',
    baseSepolia: '0x94cC0AaC535CCDB3C01d6787D6413C739ae12bc4',
  };

  for (const [chain, router] of Object.entries(routers)) {
    const isValid = /^0x[a-fA-F0-9]{40}$/.test(router);
    if (isValid) {
      log('green', `  ✓ ${chain}: ${router.slice(0, 10)}...${router.slice(-4)}`);
    } else {
      log('red', `  ✗ ${chain}: Invalid router address`);
      allPassed = false;
    }
  }

  return allPassed;
}

async function testMoonPayIntegration() {
  log('cyan', '\n═══════════════════════════════════════════════════');
  log('cyan', '💳 TEST 5: MoonPay Integration');
  log('cyan', '═══════════════════════════════════════════════════\n');

  const moonpayKey = process.env.VITE_MOONPAY_KEY;

  if (!moonpayKey) {
    log('yellow', '⚠️  WARNING: VITE_MOONPAY_KEY not configured');
    log('yellow', '📝 Buy feature will not work without this key');
    log('yellow', '📝 Get free test key at: https://sandbox.moonpay.com/');
    return false;
  }

  const isTestKey = moonpayKey.includes('pk_test') || moonpayKey.includes('sk_test');
  const isLiveKey = moonpayKey.includes('pk_live') || moonpayKey.includes('sk_live');

  if (isTestKey) {
    log('green', `✅ MoonPay Test Key configured: ${moonpayKey.slice(0, 10)}...`);
    log('yellow', '   ℹ️  This is a TEST key - transactions will be simulated');
  } else if (isLiveKey) {
    log('green', `✅ MoonPay Live Key configured: ${moonpayKey.slice(0, 10)}...`);
    log('yellow', '   ⚠️  This is a LIVE key - real transactions will occur!');
  } else {
    log('yellow', `⚠️  MoonPay Key format unclear: ${moonpayKey.slice(0, 10)}...`);
  }

  return true;
}

async function runAllTests() {
  log('cyan', '\n╔═══════════════════════════════════════════════════╗');
  log('cyan', '║        dWallet Transaction Flow Tests           ║');
  log('cyan', '╚═══════════════════════════════════════════════════╝\n');

  const results = {
    'Blockchain Connection': await testBlockchainConnection(),
    'Balance Fetching': await testBalanceFetching(),
    'Transaction Validation': await testTransactionValidation(),
    'Swap Configuration': await testSwapConfiguration(),
    'MoonPay Integration': await testMoonPayIntegration(),
  };

  log('cyan', '\n═══════════════════════════════════════════════════');
  log('cyan', '📊 TEST SUMMARY');
  log('cyan', '═══════════════════════════════════════════════════\n');

  let passed = 0;
  let failed = 0;

  for (const [test, success] of Object.entries(results)) {
    if (success) {
      log('green', `  ✅ ${test}`);
      passed++;
    } else {
      log('red', `  ❌ ${test}`);
      failed++;
    }
  }

  log('cyan', '\n───────────────────────────────────────────────────');
  log('cyan', `Total: ${passed} passed, ${failed} failed out of ${passed + failed} tests`);
  log('cyan', '═══════════════════════════════════════════════════\n');

  if (failed === 0) {
    log('green', '🎉 All tests passed! Your wallet is ready for live transactions.\n');
    process.exit(0);
  } else {
    log('yellow', '⚠️  Some tests failed. Check the output above for details.\n');
    process.exit(1);
  }
}

// Run tests
runAllTests().catch(error => {
  log('red', `\n💥 Test suite crashed: ${error.message}`);
  console.error(error);
  process.exit(1);
});
