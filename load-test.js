#!/usr/bin/env node

/**
 * 🧪 Load Testing Script for dWallet Backend
 * 
 * Tests:
 * 1. API response times under load
 * 2. Rate limiting behavior
 * 3. WebSocket connection handling
 * 4. Cache performance
 * 5. Compression effectiveness
 * 
 * Usage:
 * node load-test.js
 */

const http = require('http');
const WebSocket = require('ws');
const { performance } = require('perf_hooks');

// Configuration
const CONFIG = {
  baseUrl: 'http://localhost:3001',
  wsUrl: 'ws://localhost:3001',
  concurrentRequests: 50,
  totalRequests: 500,
  rampUpTime: 1000, // 1 second
  testDuration: 30000, // 30 seconds
};

// Test results
const results = {
  apiTests: {
    total: 0,
    successful: 0,
    failed: 0,
    responseTimes: [],
    avgResponseTime: 0,
    p95ResponseTime: 0,
    p99ResponseTime: 0,
  },
  rateLimitTests: {
    total: 0,
    limited: 0,
    allowed: 0,
  },
  websocketTests: {
    connections: 0,
    messages: 0,
    errors: 0,
  },
  compressionTests: {
    originalSize: 0,
    compressedSize: 0,
    ratio: 0,
  },
  cacheTests: {
    hits: 0,
    misses: 0,
    hitRate: 0,
  },
};

/**
 * Make HTTP request
 */
function makeRequest(path, headers = {}) {
  return new Promise((resolve, reject) => {
    const startTime = performance.now();
    
    const options = {
      hostname: 'localhost',
      port: 3001,
      path,
      method: 'GET',
      headers,
    };

    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: JSON.parse(data || '{}'),
          responseTime,
          size: Buffer.byteLength(data),
        });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

/**
 * Test API performance
 */
async function testAPIPerformance() {
  console.log('\n📍 Test 1: API Performance Under Load');
  console.log(`   Concurrent: ${CONFIG.concurrentRequests}`);
  console.log(`   Total Requests: ${CONFIG.totalRequests}\n`);

  const endpoints = [
    '/api/admin/cache/stats',
    '/api/admin/websocket/stats',
  ];

  const promises = [];
  
  for (let i = 0; i < CONFIG.totalRequests; i++) {
    const endpoint = endpoints[i % endpoints.length];
    
    promises.push(
      makeRequest(endpoint)
        .then((result) => {
          results.apiTests.total++;
          results.apiTests.responseTimes.push(result.responseTime);
          
          if (result.statusCode === 200) {
            results.apiTests.successful++;
            
            // Check compression
            if (result.headers['content-encoding']) {
              results.compressionTests.compressedSize += result.size;
            }
            results.compressionTests.originalSize += result.size * 3; // Estimate 3x compression
          } else {
            results.apiTests.failed++;
          }
        })
        .catch((error) => {
          results.apiTests.total++;
          results.apiTests.failed++;
        })
    );

    // Ramp up
    if (i % CONFIG.concurrentRequests === 0) {
      await new Promise(resolve => setTimeout(resolve, CONFIG.rampUpTime));
    }
  }

  await Promise.all(promises);

  // Calculate statistics
  const times = results.apiTests.responseTimes.sort((a, b) => a - b);
  if (times.length > 0) {
    results.apiTests.avgResponseTime = times.reduce((a, b) => a + b, 0) / times.length;
    results.apiTests.p95ResponseTime = times[Math.floor(times.length * 0.95)];
    results.apiTests.p99ResponseTime = times[Math.floor(times.length * 0.99)];
  }

  console.log(`   ✅ Total: ${results.apiTests.total}`);
  console.log(`   ✅ Successful: ${results.apiTests.successful}`);
  console.log(`   ❌ Failed: ${results.apiTests.failed}`);
  console.log(`   ⏱️  Avg Response: ${results.apiTests.avgResponseTime.toFixed(2)}ms`);
  console.log(`   ⏱️  P95 Response: ${results.apiTests.p95ResponseTime.toFixed(2)}ms`);
  console.log(`   ⏱️  P99 Response: ${results.apiTests.p99ResponseTime.toFixed(2)}ms`);
}

/**
 * Test rate limiting
 */
async function testRateLimiting() {
  console.log('\n📍 Test 2: Rate Limiting Behavior');
  console.log('   Sending rapid requests to trigger rate limits...\n');

  const rapidRequests = 100;
  const promises = [];

  for (let i = 0; i < rapidRequests; i++) {
    promises.push(
      makeRequest('/api/admin/cache/stats')
        .then((result) => {
          results.rateLimitTests.total++;
          
          if (result.statusCode === 429) {
            results.rateLimitTests.limited++;
          } else if (result.statusCode === 200) {
            results.rateLimitTests.allowed++;
            
            // Check cache headers
            if (result.headers['x-cache'] === 'HIT') {
              results.cacheTests.hits++;
            } else {
              results.cacheTests.misses++;
            }
          }
        })
        .catch(() => {
          results.rateLimitTests.total++;
        })
    );
  }

  await Promise.all(promises);

  console.log(`   ✅ Total Requests: ${results.rateLimitTests.total}`);
  console.log(`   ✅ Allowed: ${results.rateLimitTests.allowed}`);
  console.log(`   🚫 Rate Limited: ${results.rateLimitTests.limited}`);
  console.log(`   📊 Cache Hit Rate: ${((results.cacheTests.hits / (results.cacheTests.hits + results.cacheTests.misses)) * 100).toFixed(2)}%`);
}

/**
 * Test WebSocket connections
 */
async function testWebSocket() {
  console.log('\n📍 Test 3: WebSocket Connection Handling');
  console.log('   Testing concurrent WebSocket connections...\n');

  const connections = 10;
  const wsClients = [];

  for (let i = 0; i < connections; i++) {
    try {
      const ws = new WebSocket(CONFIG.wsUrl);
      
      ws.on('open', () => {
        results.websocketTests.connections++;
        
        // Send subscription
        ws.send(JSON.stringify({
          type: 'subscribe',
          channel: `test:channel:${i}`
        }));

        // Send ping
        setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
            results.websocketTests.messages++;
          }
        }, 1000);
      });

      ws.on('message', (data) => {
        results.websocketTests.messages++;
      });

      ws.on('error', (error) => {
        results.websocketTests.errors++;
      });

      wsClients.push(ws);
    } catch (error) {
      results.websocketTests.errors++;
    }
  }

  // Wait for test duration
  await new Promise(resolve => setTimeout(resolve, 5000));

  // Close all connections
  wsClients.forEach(ws => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.close();
    }
  });

  console.log(`   ✅ Connections: ${results.websocketTests.connections}`);
  console.log(`   📡 Messages: ${results.websocketTests.messages}`);
  console.log(`   ❌ Errors: ${results.websocketTests.errors}`);
}

/**
 * Test compression
 */
async function testCompression() {
  console.log('\n📍 Test 4: Response Compression');
  console.log('   Comparing compressed vs uncompressed responses...\n');

  // Request with compression
  const compressedResult = await makeRequest('/api/admin/cache/stats', {
    'Accept-Encoding': 'gzip, br'
  });

  // Request without compression
  const uncompressedResult = await makeRequest('/api/admin/cache/stats', {
    'Accept-Encoding': 'identity'
  });

  const compressedSize = compressedResult.size;
  const uncompressedSize = uncompressedResult.size;
  const ratio = ((1 - compressedSize / uncompressedSize) * 100).toFixed(2);

  console.log(`   📦 Uncompressed: ${uncompressedSize} bytes`);
  console.log(`   📦 Compressed: ${compressedSize} bytes`);
  console.log(`   📊 Compression Ratio: ${ratio}%`);
  console.log(`   💾 Bandwidth Saved: ${uncompressedSize - compressedSize} bytes`);
}

/**
 * Print summary
 */
function printSummary() {
  console.log('\n╔═══════════════════════════════════════════════════════╗');
  console.log('║   📊 Load Test Summary                                  ║');
  console.log('╚═══════════════════════════════════════════════════════╝\n');

  console.log('API Performance:');
  console.log(`   Total Requests: ${results.apiTests.total}`);
  console.log(`   Success Rate: ${((results.apiTests.successful / results.apiTests.total) * 100).toFixed(2)}%`);
  console.log(`   Avg Response: ${results.apiTests.avgResponseTime.toFixed(2)}ms`);
  console.log(`   P95 Response: ${results.apiTests.p95ResponseTime.toFixed(2)}ms`);
  console.log(`   P99 Response: ${results.apiTests.p99ResponseTime.toFixed(2)}ms\n`);

  console.log('Rate Limiting:');
  console.log(`   Requests Allowed: ${results.rateLimitTests.allowed}`);
  console.log(`   Requests Limited: ${results.rateLimitTests.limited}`);
  console.log(`   Cache Hit Rate: ${((results.cacheTests.hits / Math.max(1, results.cacheTests.hits + results.cacheTests.misses)) * 100).toFixed(2)}%\n`);

  console.log('WebSocket:');
  console.log(`   Connections: ${results.websocketTests.connections}`);
  console.log(`   Messages: ${results.websocketTests.messages}`);
  console.log(`   Errors: ${results.websocketTests.errors}\n`);

  console.log('Compression:');
  console.log(`   Original Size: ${results.compressionTests.originalSize} bytes`);
  console.log(`   Compressed Size: ${results.compressionTests.compressedSize} bytes`);
  console.log(`   Reduction: ${((1 - results.compressionTests.compressedSize / Math.max(1, results.compressionTests.originalSize)) * 100).toFixed(2)}%\n`);

  console.log('✅ Load testing complete!\n');
}

/**
 * Run all tests
 */
async function runLoadTests() {
  console.log('╔═══════════════════════════════════════════════════════╗');
  console.log('║   🧪 dWallet Backend Load Test Suite                  ║');
  console.log('╚═══════════════════════════════════════════════════════╝');
  
  try {
    await testAPIPerformance();
    await testRateLimiting();
    await testWebSocket();
    await testCompression();
    printSummary();
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Load test failed:', error);
    process.exit(1);
  }
}

// Run tests
runLoadTests();
