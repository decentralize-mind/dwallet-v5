#!/usr/bin/env node

/**
 * 🧪 Redis Caching Test Script
 * 
 * Tests:
 * 1. Redis connection
 * 2. Basic set/get operations
 * 3. Cache with TTL
 * 4. Cache deletion
 * 5. Pattern-based deletion
 * 6. Hash-based caching
 * 7. Cache statistics
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const { redisCache, priceCacheKey, balanceCacheKey, CACHE_TTL } = require('./server/utils/redisCache.cjs');

// Test results
const results = {
  passed: 0,
  failed: 0,
  tests: [],
};

function logTest(testName, passed, details = '') {
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${status} - ${testName}`);
  if (details) console.log(`   ${details}`);
  
  results.tests.push({ testName, passed, details });
  if (passed) {
    results.passed++;
  } else {
    results.failed++;
  }
}

async function runTests() {
  console.log('╔═══════════════════════════════════════════════════════╗');
  console.log('║   🧪 Redis Caching Test Suite                        ║');
  console.log('╚═══════════════════════════════════════════════════════╝\n');

  // Test 1: Redis Connection
  console.log('📍 Test 1: Redis Connection');
  try {
    const connected = await redisCache.connect();
    logTest('Redis Connection', connected, connected ? 'Successfully connected' : 'Connection failed');
  } catch (error) {
    logTest('Redis Connection', false, error.message);
  }

  if (!redisCache.isConnected) {
    console.log('\n⚠️  Redis not connected - skipping remaining tests');
    console.log('\n📊 Test Results:');
    console.log(`   Passed: ${results.passed}`);
    console.log(`   Failed: ${results.failed}`);
    process.exit(1);
  }

  // Test 2: Basic Set/Get
  console.log('\n📍 Test 2: Basic Set/Get Operations');
  try {
    const testKey = 'test:basic';
    const testValue = { message: 'Hello Redis', timestamp: Date.now() };
    
    await redisCache.set(testKey, testValue, 60);
    const cached = await redisCache.get(testKey);
    
    const passed = cached && cached.message === 'Hello Redis';
    logTest('Basic Set/Get', passed, passed ? 'Value cached and retrieved successfully' : 'Value mismatch');
    
    // Cleanup
    await redisCache.del(testKey);
  } catch (error) {
    logTest('Basic Set/Get', false, error.message);
  }

  // Test 3: Cache TTL
  console.log('\n📍 Test 3: Cache TTL (Expiration)');
  try {
    const testKey = 'test:ttl';
    const testValue = { data: 'Temporary data' };
    
    await redisCache.set(testKey, testValue, 2); // 2 seconds
    const cached1 = await redisCache.get(testKey);
    
    // Wait for expiration
    await new Promise(resolve => setTimeout(resolve, 3000));
    const cached2 = await redisCache.get(testKey);
    
    const passed = cached1 !== null && cached2 === null;
    logTest('Cache TTL', passed, passed ? 'Cache expired correctly after TTL' : 'TTL not working');
  } catch (error) {
    logTest('Cache TTL', false, error.message);
  }

  // Test 4: Cache Deletion
  console.log('\n📍 Test 4: Cache Deletion');
  try {
    const testKey = 'test:delete';
    const testValue = { data: 'To be deleted' };
    
    await redisCache.set(testKey, testValue, 60);
    const cached1 = await redisCache.get(testKey);
    
    await redisCache.del(testKey);
    const cached2 = await redisCache.get(testKey);
    
    const passed = cached1 !== null && cached2 === null;
    logTest('Cache Deletion', passed, passed ? 'Cache deleted successfully' : 'Deletion failed');
  } catch (error) {
    logTest('Cache Deletion', false, error.message);
  }

  // Test 5: Pattern-Based Deletion
  console.log('\n📍 Test 5: Pattern-Based Deletion');
  try {
    // Set multiple keys with pattern
    await redisCache.set('test:pattern:1', { id: 1 }, 60);
    await redisCache.set('test:pattern:2', { id: 2 }, 60);
    await redisCache.set('test:pattern:3', { id: 3 }, 60);
    
    const deleted = await redisCache.delByPattern('test:pattern:*');
    const passed = deleted === 3;
    
    logTest('Pattern Deletion', passed, passed ? `Deleted ${deleted} keys matching pattern` : `Expected 3, deleted ${deleted}`);
  } catch (error) {
    logTest('Pattern Deletion', false, error.message);
  }

  // Test 6: Hash-Based Caching
  console.log('\n📍 Test 6: Hash-Based Caching');
  try {
    const testKey = 'test:hash';
    
    await redisCache.hset(testKey, 'field1', 'value1', 60);
    await redisCache.hset(testKey, 'field2', 'value2', 60);
    
    const field1 = await redisCache.hget(testKey, 'field1');
    const field2 = await redisCache.hget(testKey, 'field2');
    
    const passed = field1 === 'value1' && field2 === 'value2';
    logTest('Hash Caching', passed, passed ? 'Hash fields cached and retrieved' : 'Hash field mismatch');
    
    // Cleanup
    await redisCache.del(testKey);
  } catch (error) {
    logTest('Hash Caching', false, error.message);
  }

  // Test 7: Cache Key Generators
  console.log('\n📍 Test 7: Cache Key Generators');
  try {
    const priceKey = priceCacheKey('0x1234567890abcdef', 'USD');
    const balanceKey = balanceCacheKey('0xUser123', '0xToken456');
    
    const expectedPriceKey = 'price:0x1234567890abcdef:USD';
    const expectedBalanceKey = 'balance:0xuser123:0xtoken456';
    
    const passed = priceKey === expectedPriceKey && balanceKey === expectedBalanceKey;
    logTest('Key Generators', passed, passed ? 'Keys generated correctly' : 'Key format mismatch');
  } catch (error) {
    logTest('Key Generators', false, error.message);
  }

  // Test 8: Cache Statistics
  console.log('\n📍 Test 8: Cache Statistics');
  try {
    const stats = redisCache.getStats();
    const passed = stats.hits !== undefined && stats.misses !== undefined && stats.isConnected === true;
    
    logTest('Cache Statistics', passed, passed 
      ? `Hits: ${stats.hits}, Misses: ${stats.misses}, Hit Rate: ${stats.hitRate}`
      : 'Statistics not available'
    );
  } catch (error) {
    logTest('Cache Statistics', false, error.message);
  }

  // Test 9: Cache Exists Check
  console.log('\n📍 Test 9: Cache Exists Check');
  try {
    const testKey = 'test:exists';
    await redisCache.set(testKey, { data: 'test' }, 60);
    
    const exists1 = await redisCache.exists(testKey);
    await redisCache.del(testKey);
    const exists2 = await redisCache.exists(testKey);
    
    const passed = exists1 === true && exists2 === false;
    logTest('Cache Exists', passed, passed ? 'Exists check working correctly' : 'Exists check failed');
  } catch (error) {
    logTest('Cache Exists', false, error.message);
  }

  // Test 10: Performance Test
  console.log('\n📍 Test 10: Performance Test (100 operations)');
  try {
    const startTime = Date.now();
    
    // Write 100 keys
    for (let i = 0; i < 100; i++) {
      await redisCache.set(`test:perf:${i}`, { value: i }, 60);
    }
    
    // Read 100 keys
    for (let i = 0; i < 100; i++) {
      await redisCache.get(`test:perf:${i}`);
    }
    
    const duration = Date.now() - startTime;
    const passed = duration < 5000; // Should complete in under 5 seconds
    
    logTest('Performance Test', passed, passed 
      ? `Completed 200 operations in ${duration}ms`
      : `Too slow: ${duration}ms`
    );
    
    // Cleanup
    await redisCache.delByPattern('test:perf:*');
  } catch (error) {
    logTest('Performance Test', false, error.message);
  }

  // Test Results
  console.log('\n╔═══════════════════════════════════════════════════════╗');
  console.log('║   📊 Test Results                                      ║');
  console.log('╚═══════════════════════════════════════════════════════╝');
  console.log(`\n   ✅ Passed: ${results.passed}`);
  console.log(`   ❌ Failed: ${results.failed}`);
  console.log(`   📈 Success Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(2)}%\n`);

  // Show cache statistics
  const stats = redisCache.getStats();
  console.log('📈 Cache Statistics:');
  console.log(`   Hits: ${stats.hits}`);
  console.log(`   Misses: ${stats.misses}`);
  console.log(`   Errors: ${stats.errors}`);
  console.log(`   Hit Rate: ${stats.hitRate}\n`);

  // Disconnect
  await redisCache.disconnect();
  console.log('✅ Tests complete - Redis disconnected\n');

  process.exit(results.failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(error => {
  console.error('❌ Test suite error:', error);
  process.exit(1);
});
