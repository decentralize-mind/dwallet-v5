/**
 * Token Registry for DEX Aggregator
 * 
 * Contains token lists for supported chains with metadata,
 * contract addresses, and verification status.
 */

// Chain IDs
export const CHAIN_ID = {
  ETHEREUM: 1,
  SEPOLIA: 11155111,
  BASE: 8453,
  BASE_SEPOLIA: 84532,
  ARBITRUM: 42161,
  POLYGON: 137,
}

// Token verification levels
export const VERIFICATION = {
  VERIFIED: 'verified',        // Official token, audited
  ATTESTED: 'attested',        // Community verified
  UNVERIFIED: 'unverified',    // User imported, caution advised
}

/**
 * Base Network Token List
 * Primary tokens for DEX trading on Base
 */
export const BASE_TOKENS = [
  {
    symbol: 'ETH',
    name: 'Ethereum',
    address: '0x0000000000000000000000000000000000000000', // Native
    decimals: 18,
    chainId: CHAIN_ID.BASE,
    logoURI: 'https://tokens.1inch.io/0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee.png',
    verification: VERIFICATION.VERIFIED,
    popular: true,
  },
  {
    symbol: 'WETH',
    name: 'Wrapped Ether',
    address: '0x4200000000000000000000000000000000000006',
    decimals: 18,
    chainId: CHAIN_ID.BASE,
    logoURI: 'https://tokens.1inch.io/0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2.png',
    verification: VERIFICATION.VERIFIED,
    popular: true,
  },
  {
    symbol: 'USDC',
    name: 'USD Coin',
    address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    decimals: 6,
    chainId: CHAIN_ID.BASE,
    logoURI: 'https://tokens.1inch.io/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.png',
    verification: VERIFICATION.VERIFIED,
    popular: true,
  },
  {
    symbol: 'DAI',
    name: 'Dai Stablecoin',
    address: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb',
    decimals: 18,
    chainId: CHAIN_ID.BASE,
    logoURI: 'https://tokens.1inch.io/0x6b175474e89094c44da98b954eedeac495271d0f.png',
    verification: VERIFICATION.VERIFIED,
    popular: true,
  },
  {
    symbol: 'cbETH',
    name: 'Coinbase Wrapped Staked ETH',
    address: '0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22',
    decimals: 18,
    chainId: CHAIN_ID.BASE,
    logoURI: 'https://tokens.1inch.io/0xbe9895146f7af43049ca1c1ae358b0541ea49704.png',
    verification: VERIFICATION.VERIFIED,
    popular: true,
  },
  {
    symbol: 'DWT',
    name: 'dWallet Token',
    address: '0x9ce235f8574bde67393884550F02135CE4fB8387',
    decimals: 18,
    chainId: CHAIN_ID.BASE,
    logoURI: '/assets/dwt-token.png', // Local asset
    verification: VERIFICATION.VERIFIED,
    popular: true,
  },
  {
    symbol: 'USDbC',
    name: 'USD Base Coin',
    address: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA',
    decimals: 6,
    chainId: CHAIN_ID.BASE,
    logoURI: 'https://tokens.1inch.io/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.png',
    verification: VERIFICATION.VERIFIED,
    popular: false,
  },
  {
    symbol: 'AERO',
    name: 'Aerodrome Finance',
    address: '0x940181a94A35A4569E4529A3CDfB74e38FD98631',
    decimals: 18,
    chainId: CHAIN_ID.BASE,
    logoURI: 'https://assets.coingecko.com/coins/images/30457/standard/Token.png',
    verification: VERIFICATION.VERIFIED,
    popular: false,
  },
]

/**
 * Base Sepolia Testnet Token List
 */
export const BASE_SEPOLIA_TOKENS = [
  {
    symbol: 'ETH',
    name: 'Ethereum',
    address: '0x0000000000000000000000000000000000000000',
    decimals: 18,
    chainId: CHAIN_ID.BASE_SEPOLIA,
    logoURI: 'https://tokens.1inch.io/0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee.png',
    verification: VERIFICATION.VERIFIED,
    popular: true,
  },
  {
    symbol: 'WETH',
    name: 'Wrapped Ether',
    address: '0x4200000000000000000000000000000000000006',
    decimals: 18,
    chainId: CHAIN_ID.BASE_SEPOLIA,
    logoURI: 'https://tokens.1inch.io/0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2.png',
    verification: VERIFICATION.VERIFIED,
    popular: true,
  },
  {
    symbol: 'USDC',
    name: 'USD Coin',
    address: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    decimals: 6,
    chainId: CHAIN_ID.BASE_SEPOLIA,
    logoURI: 'https://tokens.1inch.io/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.png',
    verification: VERIFICATION.VERIFIED,
    popular: true,
  },
  {
    symbol: 'DWT',
    name: 'dWallet Token',
    address: '0x9ce235f8574bde67393884550F02135CE4fB8387',
    decimals: 18,
    chainId: CHAIN_ID.BASE_SEPOLIA,
    logoURI: '/assets/dwt-token.png',
    verification: VERIFICATION.VERIFIED,
    popular: true,
  },
]

/**
 * Ethereum Mainnet Token List (for reference)
 */
export const ETHEREUM_TOKENS = [
  {
    symbol: 'ETH',
    name: 'Ethereum',
    address: '0x0000000000000000000000000000000000000000',
    decimals: 18,
    chainId: CHAIN_ID.ETHEREUM,
    logoURI: 'https://tokens.1inch.io/0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee.png',
    verification: VERIFICATION.VERIFIED,
    popular: true,
  },
  {
    symbol: 'WETH',
    name: 'Wrapped Ether',
    address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    decimals: 18,
    chainId: CHAIN_ID.ETHEREUM,
    logoURI: 'https://tokens.1inch.io/0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2.png',
    verification: VERIFICATION.VERIFIED,
    popular: true,
  },
  {
    symbol: 'USDC',
    name: 'USD Coin',
    address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    decimals: 6,
    chainId: CHAIN_ID.ETHEREUM,
    logoURI: 'https://tokens.1inch.io/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.png',
    verification: VERIFICATION.VERIFIED,
    popular: true,
  },
  {
    symbol: 'USDT',
    name: 'Tether USD',
    address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    decimals: 6,
    chainId: CHAIN_ID.ETHEREUM,
    logoURI: 'https://tokens.1inch.io/0xdac17f958d2ee523a2206206994597c13d831ec7.png',
    verification: VERIFICATION.VERIFIED,
    popular: true,
  },
  {
    symbol: 'DAI',
    name: 'Dai Stablecoin',
    address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
    decimals: 18,
    chainId: CHAIN_ID.ETHEREUM,
    logoURI: 'https://tokens.1inch.io/0x6b175474e89094c44da98b954eedeac495271d0f.png',
    verification: VERIFICATION.VERIFIED,
    popular: true,
  },
]

/**
 * Get token list by chain ID
 */
export function getTokenListByChain(chainId) {
  const tokenMap = {
    [CHAIN_ID.BASE]: BASE_TOKENS,
    [CHAIN_ID.BASE_SEPOLIA]: BASE_SEPOLIA_TOKENS,
    [CHAIN_ID.ETHEREUM]: ETHEREUM_TOKENS,
  }
  
  return tokenMap[chainId] || []
}

/**
 * Get token by address
 */
export function getTokenByAddress(address, chainId) {
  const tokens = getTokenListByChain(chainId)
  return tokens.find(
    t => t.address.toLowerCase() === address.toLowerCase()
  )
}

/**
 * Get popular tokens for a chain
 */
export function getPopularTokens(chainId) {
  const tokens = getTokenListByChain(chainId)
  return tokens.filter(t => t.popular)
}

/**
 * Search tokens by name, symbol, or address
 */
export function searchTokens(query, chainId) {
  if (!query) return getTokenListByChain(chainId)
  
  const tokens = getTokenListByChain(chainId)
  const lowerQuery = query.toLowerCase()
  
  return tokens.filter(
    t =>
      t.symbol.toLowerCase().includes(lowerQuery) ||
      t.name.toLowerCase().includes(lowerQuery) ||
      t.address.toLowerCase().includes(lowerQuery)
  )
}

/**
 * Add custom token to list (user-imported)
 */
export function addCustomToken(tokenData, chainId) {
  const newToken = {
    ...tokenData,
    chainId,
    verification: VERIFICATION.UNVERIFIED,
    popular: false,
  }
  
  // In production, this would update a user-specific token list
  // For now, we'll just return the token
  return newToken
}

/**
 * Get all supported chains
 */
export function getSupportedChains() {
  return [
    { id: CHAIN_ID.BASE, name: 'Base', icon: '🔵' },
    { id: CHAIN_ID.BASE_SEPOLIA, name: 'Base Sepolia', icon: '🧪' },
    { id: CHAIN_ID.ETHEREUM, name: 'Ethereum', icon: '💎' },
  ]
}
