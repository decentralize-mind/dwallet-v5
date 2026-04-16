# 🎨 Frontend Integration Guide - Layer 9 DeFi Contracts

**Network:** Base Sepolia Testnet  
**Last Updated:** April 16, 2026

---

## 📋 Quick Start

### 1. Install Dependencies

```bash
npm install ethers@6
# or
yarn add ethers@6
```

### 2. Import Contract ABIs and Addresses

```javascript
import { 
  CONTRACT_ADDRESSES, 
  NETWORK_INFO,
  LENDING_MARKET_ABI,
  NFT_MEMBERSHIP_ABI,
  SWAP_ROUTER_ABI,
  FEE_ROUTER_ABI,
  DWALLET_STABLECOIN_ABI 
} from './contracts/layer9-abis';
```

### 3. Connect to Base Sepolia

```javascript
import { ethers } from 'ethers';

// Connect to Base Sepolia
const provider = new ethers.JsonRpcProvider(NETWORK_INFO.rpc);

// Connect wallet
async function connectWallet() {
  if (window.ethereum) {
    await window.ethereum.request({ method: 'eth_requestAccounts' });
    const signer = provider.getSigner();
    return signer;
  }
  throw new Error('No wallet detected');
}
```

### 4. Add Base Sepolia to MetaMask

```javascript
async function addBaseSepolia() {
  try {
    await window.ethereum.request({
      method: 'wallet_addEthereumChain',
      params: [{
        chainId: '0x14a34', // 84532 in hex
        chainName: 'Base Sepolia',
        nativeCurrency: {
          name: 'Ethereum',
          symbol: 'ETH',
          decimals: 18
        },
        rpcUrls: ['https://sepolia.base.org'],
        blockExplorerUrls: ['https://sepolia.basescan.org']
      }]
    });
  } catch (error) {
    console.error('Failed to add network:', error);
  }
}
```

---

## 💳 NFT Membership Integration

### View User's NFTs

```javascript
import { CONTRACT_ADDRESSES, NFT_MEMBERSHIP_ABI } from './contracts/layer9-abis';
import { ethers } from 'ethers';

async function getUserNFTs(address) {
  const provider = new ethers.JsonRpcProvider(NETWORK_INFO.rpc);
  const nft = new ethers.Contract(CONTRACT_ADDRESSES.nftMembership, NFT_MEMBERSHIP_ABI, provider);
  
  const balance = await nft.balanceOf(address);
  const nfts = [];
  
  for (let i = 0; i < balance; i++) {
    const tokenId = await nft.tokenOfOwnerByIndex(address, i);
    const data = await nft.tokenData(tokenId);
    
    nfts.push({
      tokenId: tokenId.toString(),
      tier: data.tier,
      expiry: new Date(Number(data.expiry) * 1000),
      tierName: ['Bronze', 'Silver', 'Gold', 'Platinum'][data.tier]
    });
  }
  
  return nfts;
}
```

### Mint NFT with ETH

```javascript
async function mintNFTWithETH(tier, ethAmount) {
  const signer = await connectWallet();
  const nft = new ethers.Contract(CONTRACT_ADDRESSES.nftMembership, NFT_MEMBERSHIP_ABI, signer);
  
  const tx = await nft.mintWithETH(tier, {
    value: ethers.parseEther(ethAmount.toString())
  });
  
  const receipt = await tx.wait();
  console.log('NFT minted!', receipt.hash);
  return receipt;
}

// Example: Mint Bronze tier
await mintNFTWithETH(0, 0.05); // 0.05 ETH
```

### Mint NFT with DWT Tokens

```javascript
async function mintNFTWithDWT(tier, dwtAmount) {
  const signer = await connectWallet();
  const nft = new ethers.Contract(CONTRACT_ADDRESSES.nftMembership, NFT_MEMBERSHIP_ABI, signer);
  
  // First approve DWT spending
  const dwt = new ethers.Contract(
    CONTRACT_ADDRESSES.dwtToken,
    ['function approve(address spender, uint256 amount) external returns (bool)'],
    signer
  );
  
  await dwt.approve(CONTRACT_ADDRESSES.nftMembership, ethers.parseEther(dwtAmount.toString()));
  
  // Mint NFT
  const tx = await nft.mintWithDWT(tier, ethers.parseEther(dwtAmount.toString()));
  const receipt = await tx.wait();
  
  console.log('NFT minted with DWT!', receipt.hash);
  return receipt;
}
```

### Check User's Highest Tier

```javascript
async function getUserHighestTier(address) {
  const provider = new ethers.JsonRpcProvider(NETWORK_INFO.rpc);
  const nft = new ethers.Contract(CONTRACT_ADDRESSES.nftMembership, NFT_MEMBERSHIP_ABI, provider);
  
  const tier = await nft.highestTier(address);
  const tierNames = ['None', 'Bronze', 'Silver', 'Gold', 'Platinum'];
  
  return {
    tier: Number(tier),
    name: tierNames[tier]
  };
}
```

### Check Access Permissions

```javascript
async function checkAccess(userAddress, requiredTier) {
  const provider = new ethers.JsonRpcProvider(NETWORK_INFO.rpc);
  const nft = new ethers.Contract(CONTRACT_ADDRESSES.nftMembership, NFT_MEMBERSHIP_ABI, provider);
  
  const hasAccess = await nft.hasAccess(userAddress, requiredTier);
  return hasAccess;
}

// Example: Check if user has Gold tier or higher
const canAccess = await checkAccess('0x...', 2); // 2 = Gold
```

---

## 💵 Stablecoin (dUSD) Integration

### View Vault Information

```javascript
import { CONTRACT_ADDRESSES, DWALLET_STABLECOIN_ABI } from './contracts/layer9-abis';

async function getVaultInfo(userAddress, collateralAddress) {
  const provider = new ethers.JsonRpcProvider(NETWORK_INFO.rpc);
  const stablecoin = new ethers.Contract(CONTRACT_ADDRESSES.stablecoin, DWALLET_STABLECOIN_ABI, provider);
  
  const vault = await stablecoin.getVault(userAddress, collateralAddress);
  
  return {
    collateralAmount: ethers.formatEther(vault.collateralAmount),
    debtAmount: ethers.formatEther(vault.debtAmount),
    healthFactor: Number(vault.healthFactor) / 1e18
  };
}

// Example: Get DWT vault
const dwtVault = await getVaultInfo(userAddress, CONTRACT_ADDRESSES.dwtToken);
console.log('DWT Vault:', dwtVault);
```

### Mint dUSD Stablecoin

```javascript
async function mintDUSD(collateralAddress, collateralAmount, dusdAmount) {
  const signer = await connectWallet();
  const stablecoin = new ethers.Contract(CONTRACT_ADDRESSES.stablecoin, DWALLET_STABLECOIN_ABI, signer);
  
  // Approve collateral
  const token = new ethers.Contract(
    collateralAddress,
    ['function approve(address spender, uint256 amount) external returns (bool)'],
    signer
  );
  
  await token.approve(CONTRACT_ADDRESSES.stablecoin, ethers.parseEther(collateralAmount.toString()));
  
  // Mint dUSD
  const tx = await stablecoin.mint(
    collateralAddress,
    ethers.parseEther(collateralAmount.toString()),
    ethers.parseEther(dusdAmount.toString())
  );
  
  const receipt = await tx.wait();
  console.log('dUSD minted!', receipt.hash);
  return receipt;
}

// Example: Mint 1,000 dUSD with 3,000 DWT (300% collateralization)
await mintDUSD(CONTRACT_ADDRESSES.dwtToken, 3000, 1000);
```

### Burn dUSD and Redeem Collateral

```javascript
async function burnDUSD(dusdAmount) {
  const signer = await connectWallet();
  const stablecoin = new ethers.Contract(CONTRACT_ADDRESSES.stablecoin, DWALLET_STABLECOIN_ABI, signer);
  
  // Approve dUSD spending
  await stablecoin.approve(CONTRACT_ADDRESSES.stablecoin, ethers.parseEther(dusdAmount.toString()));
  
  // Burn dUSD
  const tx = await stablecoin.burn(ethers.parseEther(dusdAmount.toString()));
  const receipt = await tx.wait();
  
  console.log('dUSD burned!', receipt.hash);
  return receipt;
}
```

### Check Collateral Configuration

```javascript
async function getCollateralConfig(collateralAddress) {
  const provider = new ethers.JsonRpcProvider(NETWORK_INFO.rpc);
  const stablecoin = new ethers.Contract(CONTRACT_ADDRESSES.stablecoin, DWALLET_STABLECOIN_ABI, provider);
  
  const config = await stablecoin.collateralConfigs(collateralAddress);
  
  return {
    minRatio: Number(config.minRatio) / 100, // Percentage
    debtCeiling: ethers.formatEther(config.debtCeiling),
    stabilityFeeBps: Number(config.stabilityFeeBps) / 100, // Percentage
    enabled: config.enabled
  };
}

// Get all collateral configs
const configs = {
  DWT: await getCollateralConfig(CONTRACT_ADDRESSES.dwtToken),
  USDC: await getCollateralConfig(CONTRACT_ADDRESSES.usdcToken),
  WETH: await getCollateralConfig(CONTRACT_ADDRESSES.wethToken)
};
```

---

## 🔄 SwapRouter Integration

### Get Swap Quote

```javascript
import { CONTRACT_ADDRESSES, SWAP_ROUTER_ABI } from './contracts/layer9-abis';

async function getSwapQuote(tokenIn, tokenOut, amountIn) {
  const provider = new ethers.JsonRpcProvider(NETWORK_INFO.rpc);
  const swapRouter = new ethers.Contract(CONTRACT_ADDRESSES.swapRouter, SWAP_ROUTER_ABI, provider);
  
  const amountOut = await swapRouter.getAmountOut(tokenIn, tokenOut, amountIn);
  
  return {
    amountIn: ethers.formatEther(amountIn),
    amountOut: ethers.formatEther(amountOut),
    price: Number(amountOut) / Number(amountIn)
  };
}

// Example: Get quote for 100 DWT -> USDC
const quote = await getSwapQuote(
  CONTRACT_ADDRESSES.dwtToken,
  CONTRACT_ADDRESSES.usdcToken,
  ethers.parseEther('100')
);
```

### Execute Swap

```javascript
async function executeSwap(tokenIn, tokenOut, amountIn, amountOutMin, to) {
  const signer = await connectWallet();
  const swapRouter = new ethers.Contract(CONTRACT_ADDRESSES.swapRouter, SWAP_ROUTER_ABI, signer);
  
  // Approve token spending
  const token = new ethers.Contract(
    tokenIn,
    ['function approve(address spender, uint256 amount) external returns (bool)'],
    signer
  );
  
  await token.approve(CONTRACT_ADDRESSES.swapRouter, amountIn);
  
  // Execute swap (empty path for single hop)
  const tx = await swapRouter.swapExactTokensForTokens(
    tokenIn,
    tokenOut,
    amountIn,
    amountOutMin,
    to,
    [] // path for multi-hop swaps
  );
  
  const receipt = await tx.wait();
  console.log('Swap executed!', receipt.hash);
  return receipt;
}
```

---

## 🏦 LendingMarket Integration

**⚠️ Note:** LendingMarket was deployed with placeholder price feeds. It needs redeployment with actual Chainlink feeds for full functionality.

### View Lending Position

```javascript
import { CONTRACT_ADDRESSES, LENDING_MARKET_ABI } from './contracts/layer9-abis';

async function getLendingPosition(userAddress) {
  const provider = new ethers.JsonRpcProvider(NETWORK_INFO.rpc);
  const lending = new ethers.Contract(CONTRACT_ADDRESSES.lendingMarket, LENDING_MARKET_ABI, provider);
  
  const position = await lending.getPosition(userAddress);
  
  return {
    collateral: ethers.formatEther(position.collateral),
    debt: ethers.formatUnits(position.debt, 6), // USDC has 6 decimals
    healthFactor: Number(position.healthFactor) / 1e18
  };
}
```

### Deposit Collateral

```javascript
async function depositCollateral(amount) {
  const signer = await connectWallet();
  const lending = new ethers.Contract(CONTRACT_ADDRESSES.lendingMarket, LENDING_MARKET_ABI, signer);
  
  // Approve DWT spending
  const dwt = new ethers.Contract(
    CONTRACT_ADDRESSES.dwtToken,
    ['function approve(address spender, uint256 amount) external returns (bool)'],
    signer
  );
  
  await dwt.approve(CONTRACT_ADDRESSES.lendingMarket, ethers.parseEther(amount.toString()));
  
  // Deposit
  const tx = await lending.deposit(ethers.parseEther(amount.toString()));
  const receipt = await tx.wait();
  
  console.log('Collateral deposited!', receipt.hash);
  return receipt;
}
```

---

## 📊 Dashboard Example

### Complete Dashboard Component (React)

```jsx
import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES, NETWORK_INFO, NFT_MEMBERSHIP_ABI, DWALLET_STABLECOIN_ABI } from './contracts/layer9-abis';

function DeFiDashboard() {
  const [wallet, setWallet] = useState(null);
  const [nfts, setNfts] = useState([]);
  const [dusdBalance, setDusdBalance] = useState('0');
  const [vaultInfo, setVaultInfo] = useState(null);

  useEffect(() => {
    if (wallet) {
      loadUserData();
    }
  }, [wallet]);

  async function loadUserData() {
    const provider = new ethers.JsonRpcProvider(NETWORK_INFO.rpc);
    
    // Load NFTs
    const nft = new ethers.Contract(CONTRACT_ADDRESSES.nftMembership, NFT_MEMBERSHIP_ABI, provider);
    const balance = await nft.balanceOf(wallet);
    // ... load NFT details
    
    // Load dUSD balance
    const stablecoin = new ethers.Contract(CONTRACT_ADDRESSES.stablecoin, DWALLET_STABLECOIN_ABI, provider);
    const balance = await stablecoin.balanceOf(wallet);
    setDusdBalance(ethers.formatEther(balance));
    
    // Load vault info
    const vault = await stablecoin.getVault(wallet, CONTRACT_ADDRESSES.dwtToken);
    setVaultInfo({
      collateral: ethers.formatEther(vault.collateralAmount),
      debt: ethers.formatEther(vault.debtAmount),
      healthFactor: (Number(vault.healthFactor) / 1e18).toFixed(2)
    });
  }

  return (
    <div className="dashboard">
      <h1>dWallet DeFi Dashboard</h1>
      
      <div className="stats">
        <div className="stat-card">
          <h3>dUSD Balance</h3>
          <p>{dusdBalance} dUSD</p>
        </div>
        
        <div className="stat-card">
          <h3>NFTs Owned</h3>
          <p>{nfts.length}</p>
        </div>
        
        {vaultInfo && (
          <div className="stat-card">
            <h3>Health Factor</h3>
            <p className={Number(vaultInfo.healthFactor) < 1.5 ? 'warning' : 'healthy'}>
              {vaultInfo.healthFactor}
            </p>
          </div>
        )}
      </div>
      
      {/* Add mint, swap, lending components */}
    </div>
  );
}

export default DeFiDashboard;
```

---

## 🔐 Error Handling

```javascript
function handleTransactionError(error) {
  if (error.code === 'ACTION_REJECTED') {
    alert('Transaction rejected by user');
  } else if (error.code === 'INSUFFICIENT_FUNDS') {
    alert('Insufficient funds for transaction');
  } else if (error.message.includes('collateralization')) {
    alert('Insufficient collateralization ratio');
  } else if (error.message.includes('paused')) {
    alert('Protocol is currently paused');
  } else {
    console.error('Transaction failed:', error);
    alert('Transaction failed. Please try again.');
  }
}

// Usage
try {
  await mintDUSD(CONTRACT_ADDRESSES.dwtToken, 3000, 1000);
} catch (error) {
  handleTransactionError(error);
}
```

---

## 🎯 Best Practices

1. **Always Check Allowances**: Before any token transfer, ensure proper approval
2. **Use Proper Decimals**: DWT/WETH = 18 decimals, USDC = 6 decimals
3. **Handle Reverts Gracefully**: Catch and display meaningful error messages
4. **Show Transaction Status**: Display pending, success, and failed states
5. **Cache Data**: Use React Query or SWR for better UX
6. **Test on Testnet First**: Always test on Base Sepolia before mainnet
7. **Monitor Gas Prices**: Base Sepolia has low gas, but good to show estimates

---

## 📱 Mobile Wallet Support

```javascript
// WalletConnect integration
import { WalletConnectProvider } from '@walletconnect/ethereum-provider';

const provider = await WalletConnectProvider.init({
  projectId: 'YOUR_PROJECT_ID',
  chains: [84532], // Base Sepolia
  showQrModal: true
});

await provider.enable();
const ethersProvider = new ethers.BrowserProvider(provider);
```

---

## 🚀 Deployment Checklist

- [ ] Add Base Sepolia network to app
- [ ] Import contract ABIs and addresses
- [ ] Implement wallet connection
- [ ] Add NFT minting UI
- [ ] Add stablecoin dashboard
- [ ] Add swap interface
- [ ] Implement error handling
- [ ] Add transaction status indicators
- [ ] Test all features on testnet
- [ ] Add loading states
- [ ] Implement responsive design
- [ ] Add mobile wallet support

---

## 📞 Support

- **Contract Addresses**: See `src/contracts/layer9-abis.js`
- **Full Documentation**: See `LAYER9_DEPLOYMENT_COMPLETE.md`
- **Base Sepolia Explorer**: https://sepolia.basescan.org
- **Get Testnet ETH**: https://faucet.quicknode.com/base/sepolia

---

*Last Updated: April 16, 2026*
