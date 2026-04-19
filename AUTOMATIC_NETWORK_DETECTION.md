# Automatic Network Detection

## Overview

The dWallet project now features **automatic network detection** that seamlessly syncs with your browser wallet (MetaMask, WalletConnect, etc.). This eliminates the need to manually change networks in the app.

## Features

### ✅ What's Implemented

1. **Automatic Detection on Load**
   - Detects the connected wallet's network when the app loads
   - Automatically sets the app's active chain to match

2. **Real-time Network Sync**
   - Listens for network changes in your browser wallet
   - Instantly updates the app when you switch networks in MetaMask

3. **Visual Indicators**
   - Green dot indicator on the chain badge when auto-detection is active
   - Network detection status in the ChainSelector modal
   - Console logs for debugging

4. **Manual Override**
   - Toggle auto-detection ON/OFF
   - Manually select networks when needed
   - Refresh detection on demand

## How It Works

### Architecture

```
Browser Wallet (MetaMask)
    ↓
window.ethereum events
    ↓
useNetworkDetection Hook
    ↓
WalletContext (activeChain state)
    ↓
All Components (auto-updated)
```

### Key Components

#### 1. **Network Detection Utility** (`src/utils/networkDetection.js`)
Centralized utilities for network detection:
- `chainIdToKey(chainId)` - Convert chain ID to chain key
- `detectBrowserWalletNetwork()` - Detect current network from browser wallet
- `getChainFromChainId(chainId)` - Get chain info from chain ID

#### 2. **Network Detection Hook** (`src/hooks/useNetworkDetection.js`)
React hook that provides:
- `isDetecting` - Detection in progress
- `detectedChain` - Currently detected chain key
- `autoDetectEnabled` - Auto-detection toggle state
- `toggleAutoDetect()` - Toggle auto-detection
- `refreshDetection()` - Manually refresh detection
- `hasEthereumWallet` - Browser wallet detected

#### 3. **WalletContext Integration** (`src/context/WalletContext.jsx`)
- Auto-detects network on initialization
- Listens for `chainChanged` events from window.ethereum
- Syncs app state with detected network

#### 4. **ChainSelector UI** (`src/components/ChainSelector.jsx`)
- Shows auto-detection status at the top
- Toggle button for auto-detection (Auto ON/OFF)
- Refresh button to re-detect network
- Visual feedback on detection status

#### 5. **Header Indicator** (`src/components/MainWallet.jsx`)
- Green dot on chain badge when auto-detection is active
- Shows when detected chain matches active chain

## Supported Networks

| Network | Chain ID | Auto-Detect |
|---------|----------|-------------|
| Ethereum | 1 | ✅ |
| Sepolia | 11155111 | ✅ |
| Base Sepolia | 84532 | ✅ |
| Base | 8453 | ✅ |
| BNB Chain | 56 | ✅ |
| Polygon | 137 | ✅ |
| Arbitrum | 42161 | ✅ |
| Optimism | 10 | ✅ |
| Avalanche | 43114 | ✅ |
| Solana | — | ❌ (No chain ID) |

## Usage

### For Users

1. **Connect your wallet** (MetaMask, etc.)
2. **Switch networks** in your wallet
3. **App automatically updates** to match your wallet's network
4. **See the green dot** on the chain badge when auto-detection is active
5. **Manual override**: Click the chain badge → Toggle "Auto ON/OFF" → Select network manually

### For Developers

#### Using the Hook

```jsx
import { useNetworkDetection } from '../hooks/useNetworkDetection'

function MyComponent() {
  const {
    detectedChain,
    autoDetectEnabled,
    toggleAutoDetect,
    hasEthereumWallet,
  } = useNetworkDetection()
  
  return (
    <div>
      {hasEthereumWallet && (
        <p>Detected: {detectedChain}</p>
      )}
    </div>
  )
}
```

#### Using the Utility Functions

```jsx
import { 
  chainIdToKey, 
  detectBrowserWalletNetwork,
  getChainFromChainId 
} from '../utils/networkDetection'

// Detect network
const result = await detectBrowserWalletNetwork()
console.log(result.chainKey) // 'ethereum', 'sepolia', etc.

// Convert chain ID
const chainKey = chainIdToKey('0x1') // 'ethereum'
const chainKey = chainIdToKey(11155111) // 'sepolia'

// Get chain info
const chain = getChainFromChainId(1)
console.log(chain.name) // 'Ethereum'
```

#### Adding a New Network

1. Add to `src/data/chains.js`:
```js
arbitrum: {
  id: 'arbitrum',
  name: 'Arbitrum',
  symbol: 'ETH',
  chainId: 42161,
  rpc: 'https://arb1.arbitrum.io/rpc',
  explorer: 'https://arbiscan.io',
  color: '#28A0F0',
  icon: '🔵',
  tokens: ['ETH', 'USDC', 'USDT'],
}
```

2. Add to `src/utils/networkDetection.js`:
```js
export const CHAIN_ID_TO_KEY = {
  // ... existing networks
  42161: 'arbitrum',
}
```

3. Add to `CHAINS` import in WalletContext (if needed for token contracts)

## Technical Details

### Event Listeners

The app listens to:
- `window.ethereum.on('chainChanged', handler)` - Network changes
- `eth_chainId` RPC method - Initial detection

### State Management

```
autoNetworkDetectEnabled (WalletContext)
    ↓
Controls whether auto-detection is active
    ↓
useNetworkDetection hook
    ↓
Updates activeChain in WalletContext
    ↓
All components re-render with new chain
```

### Fallback Behavior

- **No browser wallet**: Manual selection only
- **Unsupported network**: Shows error, allows manual override
- **Detection failure**: Falls back to previous network or default (Ethereum)

## Benefits

✅ **No more manual switching** - App syncs with your wallet automatically  
✅ **Real-time updates** - Instant network change detection  
✅ **User-friendly** - Clear visual indicators  
✅ **Flexible** - Toggle auto-detection on/off  
✅ **Extensible** - Easy to add new networks  
✅ **Safe** - Manual override always available  

## Troubleshooting

### Network not detecting?
1. Check if browser wallet is installed
2. Ensure wallet is connected to the app
3. Click the "Refresh" button in ChainSelector
4. Check browser console for errors

### Wrong network detected?
1. Check your wallet's current network
2. Toggle auto-detection OFF
3. Manually select the correct network
4. Toggle auto-detection back ON

### Adding support for a new network?
See "Adding a New Network" section above.

## Future Enhancements

- [ ] Support for WalletConnect network changes
- [ ] Network switching prompt (like MetaMask)
- [ ] Custom network addition
- [ ] Network health/status indicators
- [ ] Multi-chain portfolio view

---

**Last Updated**: 2026-04-19  
**Version**: 1.0.0
