/**
 * Layer 9 Contracts - ABIs for Frontend Integration
 * 
 * Import these ABIs to interact with the deployed contracts from your frontend.
 * Deployed on Base Sepolia Testnet on April 16, 2026
 * 
 * To export full ABIs after verification, run: node scripts/export-abis.cjs
 */

// Contract addresses (Base Sepolia Testnet)
export const CONTRACT_ADDRESSES = {
  // Security Infrastructure
  layer7Security: '0x813b537A21bF5AC6967E870db47Ec2770651B11F',
  lockEngine: '0x059327A069Ba66A74ecF21fde8c1c0D2915e0DB3',
  accessController: '0xD2211242548115134607638E19ADb3271B31506b',
  
  // DeFi Contracts
  lendingMarket: '0xcbBc5E87BDdbD6A1346FD635efDB23C0cB944794',
  nftMembership: '0x74297Fa47E6103148D3A4119d7B00C6a94B927D7',
  swapRouter: '0x2a4b239C15f54218a30116c630a32d9305859a43',
  feeRouter: '0x6552d7c4628e9e71c2E3cBEaB9f17CF67Bee1D89',
  stablecoin: '0x83852A1C0A6C13fa8aCD950e51A2A594A7D7Ec29',
  
  // Token Addresses
  dwtToken: '0x3400b0167dA5b2dba0b88b9604eE7df4BFc1f1fa',
  usdcToken: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
  wethToken: '0x4200000000000000000000000000000000000006',
  
  // Mock Price Feeds (for testing only)
  ethUsdFeed: '0x77Bc9b2df71eAA454bc211a54fdE53213229F63C',
  dwtUsdFeed: '0xc2562bb592FAa9A9EADaeC4DB0c510e6be566b2A',
  usdcUsdFeed: '0xB501D5925aB9E0AB93f18091a5327cf3D43A9829'
};

// Network information
export const NETWORK_INFO = {
  name: 'Base Sepolia',
  chainId: 84532,
  explorer: 'https://sepolia.basescan.org',
  rpc: 'https://sepolia.base.org'
};

// Minimal ABIs for essential functions
// For full ABIs, import from artifacts after contract verification

export const LENDING_MARKET_ABI = [
  "function deposit(uint256 amount) external",
  "function withdraw(uint256 amount) external returns (uint256)",
  "function borrow(uint256 amount) external",
  "function repay(uint256 amount) external",
  "function liquidate(address borrower) external",
  "function getPosition(address user) external view returns (uint256 collateral, uint256 debt, uint256 healthFactor)",
  "function totalDeposits() external view returns (uint256)",
  "function totalBorrowed() external view returns (uint256)"
];

export const NFT_MEMBERSHIP_ABI = [
  // Minting functions
  "function mintWithETH(uint8 tier) external payable",
  "function mintWithDWT(uint8 tier) external",
  "function adminMint(address to, uint8 tier) external",
  
  // Upgrade and renewal
  "function upgradeWithETH(uint256 tokenId) external payable",
  "function renewWithETH(uint256 tokenId) external payable",
  
  // View functions
  "function balanceOf(address owner) external view returns (uint256)",
  "function ownerOf(uint256 tokenId) external view returns (address)",
  "function tokenOfOwnerByIndex(address owner, uint256 index) external view returns (uint256)",
  "function tokenData(uint256 tokenId) external view returns (uint8 tier, uint256 expiry)",
  "function highestTier(address user) external view returns (uint8)",
  "function activeTier(address user) external view returns (uint8)",
  "function hasAccess(address user, uint8 minTier) external view returns (bool)",
  "function tierConfigs(uint8 tier) external view returns (uint256 ethPrice, uint256 dwtPrice, uint256 dwtHoldRequirement, uint256 maxSupply, uint256 currentSupply, uint256 durationSeconds, string baseURI, bool soulbound, bool enabled)",
  "function tokenURI(uint256 tokenId) external view returns (string)",
  "function TIER_COUNT() external view returns (uint8)",
  "function dwtToken() external view returns (address)",
  "function mintCooldown() external view returns (uint256)",
  "function maxMintsPerUser() external view returns (uint256)",
  "function lastMintTime(address user) external view returns (uint256)",
  "function freeMintWhitelist(address user) external view returns (bool)",
  
  // Admin functions
  "function configureTier(uint8 tier, uint256 ethPrice, uint256 dwtPrice, uint256 dwtHoldReq, uint256 maxSupply, uint256 durationSeconds, string calldata baseURI, bool soulbound, bool enabled) external",
  "function setFreeMintWhitelist(address[] calldata users, bool status) external",
  "function setTierBaseURI(uint8 tier, string calldata uri) external",
  "function setMintCooldown(uint256 newCooldown) external",
  "function setMaxMintsPerUser(uint256 newMax) external",
  "function pause() external",
  "function unpause() external",
  "function withdrawETH(address payable to) external",
  "function withdrawDWT(address to, uint256 amount) external",
  "function owner() external view returns (address)",
  
  // ERC721 standard
  "function name() external view returns (string)",
  "function symbol() external view returns (string)",
  "function totalSupply() external view returns (uint256)",
  "function supportsInterface(bytes4 interfaceId) external view returns (bool)",
  
  // Events
  "event PassMinted(address indexed to, uint256 tokenId, uint8 tier, uint256 expiry)",
  "event PassUpgraded(uint256 indexed tokenId, uint8 oldTier, uint8 newTier)",
  "event ExpiryExtended(uint256 indexed tokenId, uint256 newExpiry)",
  "event AccessChecked(address indexed user, uint8 minTier, bool granted)",
  "event TierConfigured(uint8 tier, uint256 ethPrice, uint256 dwtPrice, uint256 maxSupply, bool soulbound)",
  "event HighestTierUpdated(address indexed user, uint8 oldTier, uint8 newTier)"
];

export const SWAP_ROUTER_ABI = [
  "function swapExactTokensForTokens(address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOutMin, address to, bytes32[] calldata path) external returns (uint256 amountOut)",
  "function getAmountOut(address tokenIn, address tokenOut, uint256 amountIn) external view returns (uint256)",
  "function setFeeRouter(address _feeRouter) external",
  "function feeRouter() external view returns (address)"
];

export const FEE_ROUTER_ABI = [
  "function collectFee(address token, address payer, uint256 amount) external returns (uint256)",
  "function calculateFee(address user, uint256 amount) external view returns (uint256 feeAmount, uint256 discountBps)",
  "function baseFeeBps() external view returns (uint256)",
  "function lpShareBps() external view returns (uint256)",
  "function distributeFees(address token) external"
];

export const DWALLET_STABLECOIN_ABI = [
  "function mint(address collateral, uint256 collateralAmount, uint256 debtAmount) external",
  "function burn(uint256 amount) external",
  "function redeem(address collateral, uint256 dusdAmount) external",
  "function liquidate(address user, address collateral) external",
  "function balanceOf(address account) external view returns (uint256)",
  "function totalSupply() external view returns (uint256)",
  "function collateralConfigs(address collateral) external view returns (uint256 minRatio, uint256 debtCeiling, uint256 stabilityFeeBps, bool enabled)",
  "function getVault(address user, address collateral) external view returns (uint256 collateralAmount, uint256 debtAmount, uint256 healthFactor)",
  "function globalDebtCeiling() external view returns (uint256)",
  "function name() external view returns (string)",
  "function symbol() external view returns (string)"
];
