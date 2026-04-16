# RPC Failover Configuration Guide

## Overview

The RPC Failover Manager provides automatic failover, health checking, and load balancing across multiple RPC providers.

## Quick Start

### Basic Usage

```javascript
import { createRPCFailoverManager } from './utils/rpcFailover';

// Create manager for Ethereum mainnet
const rpcManager = createRPCFailoverManager('ethereum');

// Start health monitoring
rpcManager.startHealthMonitoring();

// Use for requests (automatic failover)
const blockNumber = await rpcManager.execute('getBlockNumber');
const balance = await rpcManager.execute('getBalance', '0x...');

// Get statistics
console.log(rpcManager.getStats());
```

### React Integration

```javascript
import { useEffect, useState } from 'react';
import { createRPCFailoverManager } from './utils/rpcFailover';

function App() {
  const [rpcManager, setRpcManager] = useState(null);
  const [blockNumber, setBlockNumber] = useState(null);

  useEffect(() => {
    // Initialize RPC manager
    const manager = createRPCFailoverManager('ethereum', {
      maxRetries: 3,
      healthCheckIntervalMs: 30000,
      requestTimeout: 10000,
    });

    manager.startHealthMonitoring();
    setRpcManager(manager);

    // Cleanup on unmount
    return () => manager.destroy();
  }, []);

  useEffect(() => {
    if (!rpcManager) return;

    // Fetch block number
    const fetchBlock = async () => {
      try {
        const block = await rpcManager.execute('getBlockNumber');
        setBlockNumber(block);
      } catch (error) {
        console.error('Failed to fetch block:', error);
      }
    };

    fetchBlock();
  }, [rpcManager]);

  return (
    <div>
      <h1>Current Block: {blockNumber?.toString()}</h1>
      <button onClick={() => console.log(rpcManager.getStats())}>
        Show Provider Stats
      </button>
    </div>
  );
}
```

## Configuration

### Network Presets

The system includes pre-configured providers for major networks:

- `ethereum` - Ethereum mainnet (5 providers)
- `base` - Base network (5 providers)
- `arbitrum` - Arbitrum One (4 providers)
- `polygon` - Polygon mainnet (4 providers)

### Custom Configuration

```javascript
import RPCFailoverManager from './utils/rpcFailover';

const customManager = new RPCFailoverManager({
  providers: [
    {
      id: 'my-provider-1',
      url: 'https://my-custom-rpc.com',
      priority: 1,
      weight: 3,
    },
    {
      id: 'my-provider-2',
      url: 'https://backup-rpc.com',
      priority: 2,
      weight: 2,
    },
  ],
  maxRetries: 3,
  healthCheckIntervalMs: 30000,
  requestTimeout: 10000,
});
```

### Provider Configuration Options

| Option | Type | Description | Default |
|--------|------|-------------|---------|
| `id` | string | Unique provider identifier | `provider-{index}` |
| `url` | string | RPC endpoint URL | Required |
| `priority` | number | Failover priority (lower = higher priority) | Index |
| `weight` | number | Load balancing weight (higher = more traffic) | 1 |

### Manager Configuration Options

| Option | Type | Description | Default |
|--------|------|-------------|---------|
| `providers` | array | List of provider configs | Required |
| `maxRetries` | number | Maximum retry attempts | 3 |
| `healthCheckIntervalMs` | number | Health check interval (ms) | 30000 |
| `requestTimeout` | number | Request timeout (ms) | 10000 |

## API Reference

### Methods

#### `execute(method, ...args)`
Execute RPC request with automatic failover.

```javascript
const balance = await manager.execute('getBalance', address);
const block = await manager.execute('getBlockNumber');
const tx = await manager.execute('getTransaction', txHash);
```

#### `healthCheck()`
Run manual health check on all providers.

```javascript
const results = await manager.healthCheck();
console.log(results);
// [
//   { id: 'infura', healthy: true, blockNumber: 12345, responseTime: 150 },
//   { id: 'alchemy', healthy: false, error: 'Timeout' }
// ]
```

#### `startHealthMonitoring()`
Start automatic health checking.

```javascript
manager.startHealthMonitoring();
// Checks every 30 seconds by default
```

#### `stopHealthMonitoring()`
Stop automatic health checking.

```javascript
manager.stopHealthMonitoring();
```

#### `getStats()`
Get provider statistics.

```javascript
const stats = manager.getStats();
console.log(stats);
// [
//   {
//     id: 'infura',
//     healthy: true,
//     responseTime: 150,
//     requestCount: 100,
//     successCount: 98,
//     failureCount: 2,
//     successRate: '98.00%'
//   }
// ]
```

#### `getHealthyProviders()`
Get list of healthy providers.

```javascript
const healthy = manager.getHealthyProviders();
console.log(`${healthy.length} providers healthy`);
```

#### `getBestProvider()`
Get fastest healthy provider.

```javascript
const best = manager.getBestProvider();
console.log(`Best provider: ${best.id} (${best.responseTime}ms)`);
```

#### `addProvider(config)`
Add new provider dynamically.

```javascript
manager.addProvider({
  id: 'new-provider',
  url: 'https://new-rpc.com',
  priority: 10,
  weight: 1,
});
```

#### `removeProvider(providerId)`
Remove provider.

```javascript
manager.removeProvider('old-provider');
```

#### `destroy()`
Cleanup all resources.

```javascript
manager.destroy();
```

## Error Handling

```javascript
try {
  const result = await manager.execute('getBalance', address);
} catch (error) {
  if (error.message === 'All RPC providers failed') {
    // All providers are down
    console.error('No RPC providers available');
    // Show user-friendly error
  }
}
```

## Monitoring Dashboard

Create a simple monitoring UI:

```javascript
function RPCMonitor({ manager }) {
  const [stats, setStats] = useState([]);

  useEffect(() => {
    const interval = setInterval(() => {
      setStats(manager.getStats());
    }, 5000);

    return () => clearInterval(interval);
  }, [manager]);

  return (
    <div>
      <h2>RPC Provider Status</h2>
      <table>
        <thead>
          <tr>
            <th>Provider</th>
            <th>Status</th>
            <th>Response Time</th>
            <th>Success Rate</th>
            <th>Requests</th>
          </tr>
        </thead>
        <tbody>
          {stats.map(stat => (
            <tr key={stat.id}>
              <td>{stat.id}</td>
              <td>{stat.healthy ? '✅' : '❌'}</td>
              <td>{stat.responseTime ? `${stat.responseTime}ms` : 'N/A'}</td>
              <td>{stat.successRate}</td>
              <td>{stat.requestCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

## Environment Variables

Add to `.env.local`:

```bash
# Primary providers
VITE_INFURA_KEY=your_infura_key
VITE_ALCHEMY_KEY=your_alchemy_key

# Fallback providers (optional)
VITE_RPC_FALLBACK_1=https://rpc.ankr.com/eth
VITE_RPC_FALLBACK_2=https://eth.llamarpc.com
VITE_RPC_FALLBACK_3=https://ethereum-rpc.publicnode.com
```

## Best Practices

1. **Always start health monitoring** in production
2. **Monitor provider statistics** to identify issues
3. **Use multiple providers** from different infrastructure providers
4. **Set appropriate timeouts** based on your use case
5. **Handle failures gracefully** with user-friendly error messages
6. **Test failover** by simulating provider failures
7. **Update provider list** regularly as new services become available

## Troubleshooting

### All providers failing
- Check network connectivity
- Verify API keys are valid
- Check if providers are experiencing outages
- Add more fallback providers

### Slow response times
- Check provider statistics
- Adjust priority order
- Consider adding geographically closer providers
- Increase request timeout if needed

### Health check failures
- Providers may be rate limiting
- Check provider status pages
- Consider increasing health check interval
- Add more diverse providers

## Performance Optimization

```javascript
// Use best provider for critical requests
const bestProvider = manager.getBestProvider();
const criticalResult = await bestProvider.provider.getBalance(address);

// Use any healthy provider for non-critical requests
const anyProvider = manager.getHealthyProviders()[0];
const nonCriticalResult = await anyProvider.provider.getBlockNumber();
```

## Security Considerations

- All RPC URLs should use HTTPS
- Never expose API keys in client-side code (use environment variables)
- Monitor for suspicious activity in provider responses
- Implement rate limiting to prevent abuse
- Validate responses from untrusted providers
