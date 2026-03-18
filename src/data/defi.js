// ── DeFi protocol addresses, ABIs, and config ────────────────────────────────

// ── Uniswap V3 ───────────────────────────────────────────────────────────────
export const UNISWAP_V3 = {
  quoterV2:      "0x61fFE014bA17989E743c5F6cB21bF9697530B21e", // mainnet QuoterV2
  swapRouter02:  "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45", // mainnet SwapRouter02
  factory:       "0x1F98431c8aD98523631AE4a59f267346ea31F984",
  WETH:          "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
};

export const UNISWAP_QUOTER_ABI = [
  "function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)",
];

export const UNISWAP_ROUTER_ABI = [
  "function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)",
];

export const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
];

// Pool fee tiers (Uniswap v3)
export const FEE_TIERS = [
  { label: "0.01%", value: 100,   description: "Stable pairs" },
  { label: "0.05%", value: 500,   description: "Stable / popular" },
  { label: "0.30%", value: 3000,  description: "Most pairs" },
  { label: "1.00%", value: 10000, description: "Exotic pairs" },
];

// ── Lido Staking ─────────────────────────────────────────────────────────────
export const LIDO = {
  stETH:    "0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84", // stETH token + submit()
  wstETH:   "0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0",
  APY:      4.1,  // approximate, update from Lido API
};

export const LIDO_ABI = [
  "function submit(address referral) external payable returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function getTotalPooledEther() view returns (uint256)",
  "function getTotalShares() view returns (uint256)",
  "function getPooledEthByShares(uint256 sharesAmount) view returns (uint256)",
];

// ── Rocket Pool ──────────────────────────────────────────────────────────────
export const ROCKET_POOL = {
  rETH:       "0xae78736Cd615f374D3085123A210448E74Fc6393",
  depositPool:"0xDD3f50F8A6CafbE9b31a427582963f465E745AF8",
  APY:        3.8,
};

export const ROCKET_POOL_ABI = [
  "function deposit() external payable",
  "function balanceOf(address) view returns (uint256)",
  "function getExchangeRate() view returns (uint256)",
];

// ── Aave V3 ──────────────────────────────────────────────────────────────────
export const AAVE_V3 = {
  pool:           "0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2", // mainnet Pool
  poolDataProvider:"0x7B4EB56E7CD4b454BA8ff71E4518426369a138a3",
  priceOracle:    "0x54586bE62E3c3580375aE3723C145253060Ca0C2",
};

export const AAVE_POOL_ABI = [
  "function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) external",
  "function withdraw(address asset, uint256 amount, address to) external returns (uint256)",
  "function borrow(address asset, uint256 amount, uint256 interestRateMode, uint16 referralCode, address onBehalfOf) external",
  "function repay(address asset, uint256 amount, uint256 interestRateMode, address onBehalfOf) external returns (uint256)",
  "function getUserAccountData(address user) external view returns (uint256 totalCollateralBase, uint256 totalDebtBase, uint256 availableBorrowsBase, uint256 currentLiquidationThreshold, uint256 ltv, uint256 healthFactor)",
];

export const AAVE_DATA_PROVIDER_ABI = [
  "function getReserveData(address asset) external view returns (uint256 unbacked, uint256 accruedToTreasuryScaled, uint256 totalAToken, uint256 totalStableDebt, uint256 totalVariableDebt, uint256 liquidityRate, uint256 variableBorrowRate, uint256 stableBorrowRate, uint256 averageStableBorrowRate, uint256 liquidityIndex, uint256 variableBorrowIndex, uint40 lastUpdateTimestamp)",
  "function getUserReserveData(address asset, address user) external view returns (uint256 currentATokenBalance, uint256 currentStableDebt, uint256 currentVariableDebt, uint256 principalStableDebt, uint256 scaledVariableDebt, uint256 stableBorrowRate, uint256 liquidityRate, uint40 stableRateLastUpdated, bool usageAsCollateralEnabled)",
];

// ── Uniswap V3 LP (Positions) ─────────────────────────────────────────────────
export const UNISWAP_V3_NFT_MANAGER = {
  address: "0xC36442b4a4522E871399CD717aBDD847Ab11FE88",
};

export const NFT_MANAGER_ABI = [
  "function positions(uint256 tokenId) external view returns (uint96 nonce, address operator, address token0, address token1, uint24 fee, int24 tickLower, int24 tickUpper, uint128 liquidity, uint256 feeGrowthInside0LastX128, uint256 feeGrowthInside1LastX128, uint128 tokensOwed0, uint128 tokensOwed1)",
  "function balanceOf(address owner) view returns (uint256)",
  "function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)",
  "function mint((address token0, address token1, uint24 fee, int24 tickLower, int24 tickUpper, uint256 amount0Desired, uint256 amount1Desired, uint256 amount0Min, uint256 amount1Min, address recipient, uint256 deadline)) external payable returns (uint256 tokenId, uint128 liquidity, uint256 amount0, uint256 amount1)",
  "function collect((uint256 tokenId, address recipient, uint128 amount0Max, uint128 amount1Max)) external payable returns (uint256 amount0, uint256 amount1)",
  "function decreaseLiquidity((uint256 tokenId, uint128 liquidity, uint256 amount0Min, uint256 amount1Min, uint256 deadline)) external payable returns (uint256 amount0, uint256 amount1)",
];

// ── Token registry (mainnet) ──────────────────────────────────────────────────
export const MAINNET_TOKENS = {
  ETH:  { address: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", decimals: 18, symbol: "ETH",  name: "Ethereum" },
  WETH: { address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", decimals: 18, symbol: "WETH", name: "Wrapped Ether" },
  USDC: { address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", decimals: 6,  symbol: "USDC", name: "USD Coin" },
  USDT: { address: "0xdAC17F958D2ee523a2206206994597C13D831ec7", decimals: 6,  symbol: "USDT", name: "Tether USD" },
  DAI:  { address: "0x6B175474E89094C44Da98b954EedeAC495271d0F", decimals: 18, symbol: "DAI",  name: "Dai" },
  WBTC: { address: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", decimals: 8,  symbol: "WBTC", name: "Wrapped Bitcoin" },
  UNI:  { address: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984", decimals: 18, symbol: "UNI",  name: "Uniswap" },
  LINK: { address: "0x514910771AF9Ca656af840dff83E8264EcF986CA", decimals: 18, symbol: "LINK", name: "Chainlink" },
  stETH:{ address: "0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84", decimals: 18, symbol: "stETH",name: "Lido Staked ETH" },
  rETH: { address: "0xae78736Cd615f374D3085123A210448E74Fc6393", decimals: 18, symbol: "rETH", name: "Rocket Pool ETH" },
};

// Aave-supported assets with approximate rates (update from Aave API in production)
export const AAVE_ASSETS = [
  { symbol: "ETH",  name: "Ethereum",   supplyAPY: 1.82, borrowAPY: 2.95, ltv: 80, address: MAINNET_TOKENS.WETH.address },
  { symbol: "USDC", name: "USD Coin",   supplyAPY: 4.51, borrowAPY: 5.82, ltv: 77, address: MAINNET_TOKENS.USDC.address },
  { symbol: "USDT", name: "Tether",     supplyAPY: 3.98, borrowAPY: 5.21, ltv: 75, address: MAINNET_TOKENS.USDT.address },
  { symbol: "DAI",  name: "Dai",        supplyAPY: 4.12, borrowAPY: 5.43, ltv: 75, address: MAINNET_TOKENS.DAI.address  },
  { symbol: "WBTC", name: "Wrapped BTC",supplyAPY: 0.42, borrowAPY: 1.18, ltv: 70, address: MAINNET_TOKENS.WBTC.address },
  { symbol: "LINK", name: "Chainlink",  supplyAPY: 0.81, borrowAPY: 2.10, ltv: 65, address: MAINNET_TOKENS.LINK.address },
];

// Sample LP pools (from Uniswap v3 subgraph in production)
export const SAMPLE_LP_POOLS = [
  { id: "eth-usdc-0.05", token0: "ETH", token1: "USDC", fee: 500,  tvl: "312.4M", apr: 18.4, volume24h: "142.1M" },
  { id: "eth-usdc-0.30", token0: "ETH", token1: "USDC", fee: 3000, tvl: "89.2M",  apr: 24.7, volume24h: "58.3M"  },
  { id: "eth-usdt-0.05", token0: "ETH", token1: "USDT", fee: 500,  tvl: "201.8M", apr: 15.2, volume24h: "98.7M"  },
  { id: "wbtc-eth-0.30", token0: "WBTC",token1: "ETH",  fee: 3000, tvl: "156.3M", apr: 12.8, volume24h: "45.2M"  },
  { id: "usdc-usdt-0.01",token0: "USDC",token1: "USDT", fee: 100,  tvl: "78.9M",  apr: 6.3,  volume24h: "203.4M" },
  { id: "dai-usdc-0.01", token0: "DAI", token1: "USDC", fee: 100,  tvl: "45.1M",  apr: 5.8,  volume24h: "87.6M"  },
];
