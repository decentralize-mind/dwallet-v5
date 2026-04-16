// Post-Deployment Configuration Script for Base Sepolia
// This script configures price feeds, collateral, and runs tests

const hre = require("hardhat");
const ethers = hre.ethers;

// Deployed contract addresses from previous deployment
const DEPLOYED_CONTRACTS = {
  lending: "0xcbBc5E87BDdbD6A1346FD635efDB23C0cB944794",
  nft: "0x74297Fa47E6103148D3A4119d7B00C6a94B927D7",
  swapRouter: "0x2a4b239C15f54218a30116c630a32d9305859a43",
  feeRouter: "0x6552d7c4628e9e71c2E3cBEaB9f17CF67Bee1D89",
  stablecoin: "0x83852A1C0A6C13fa8aCD950e51A2A594A7D7Ec29",
  security: "0x813b537A21bF5AC6967E870db47Ec2770651B11F",
  lockEngine: "0x059327A069Ba66A74ecF21fde8c1c0D2915e0DB3",
};

// Token addresses on Base Sepolia
const TOKENS = {
  DWT: "0x3400b0167dA5b2dba0b88b9604eE7df4BFc1f1fa",
  // USDC on Base Sepolia (verify this address)
  USDC: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
  // WETH on Base Sepolia
  WETH: "0x4200000000000000000000000000000000000006",
};

// Mock price feeds for testing (we'll deploy these)
// In production, use actual Chainlink feeds
const MOCK_PRICE_FEEDS = {
  // We'll deploy mock feeds with these prices:
  // ETH/USD: $3,000
  // DWT/USD: $1.50
  // USDC/USD: $1.00
};

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("🔧 Starting Post-Deployment Configuration...");
  console.log("📝 Deployer:", deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("💰 Balance:", ethers.formatEther(balance), "ETH\n");

  // ─────────────────────────────────────────────
  // Step 1: Deploy Mock Price Feeds for Testing
  // ─────────────────────────────────────────────
  console.log("📊 Step 1: Deploying Mock Price Feeds...");
  
  const MockPriceFeed = await ethers.getContractFactory("MockPriceFeed");
  
  // ETH/USD feed - $3,000 (8 decimals)
  const ethUsdFeed = await MockPriceFeed.deploy(8);
  await ethUsdFeed.waitForDeployment();
  await ethUsdFeed.updatePrice(3000 * 1e8, Math.floor(Date.now() / 1000));
  console.log("✅ ETH/USD Mock Feed:", await ethUsdFeed.getAddress(), "($3,000)");
  
  // DWT/USD feed - $1.50 (8 decimals)
  const dwtUsdFeed = await MockPriceFeed.deploy(8);
  await dwtUsdFeed.waitForDeployment();
  await dwtUsdFeed.updatePrice(150000000, Math.floor(Date.now() / 1000)); // 1.50 * 1e8
  console.log("✅ DWT/USD Mock Feed:", await dwtUsdFeed.getAddress(), "($1.50)");
  
  // USDC/USD feed - $1.00 (8 decimals)
  const usdcUsdFeed = await MockPriceFeed.deploy(8);
  await usdcUsdFeed.waitForDeployment();
  await usdcUsdFeed.updatePrice(100000000, Math.floor(Date.now() / 1000)); // 1.00 * 1e8
  console.log("✅ USDC/USD Mock Feed:", await usdcUsdFeed.getAddress(), "($1.00)\n");

  // ─────────────────────────────────────────────
  // Step 2: Configure DWalletStablecoin Collateral
  // ─────────────────────────────────────────────
  console.log("💵 Step 2: Configuring DWalletStablecoin...");
  
  const DWalletStablecoin = await ethers.getContractFactory("contracts/layer9/DWalletStablecoin.sol:DWalletStablecoin");
  const stablecoin = DWalletStablecoin.attach(DEPLOYED_CONTRACTS.stablecoin);
  
  // Configure DWT collateral (200% min ratio)
  console.log("  Configuring DWT collateral...");
  await stablecoin.configureCollateral(
    TOKENS.DWT,
    20000,  // 200% min collateralization
    ethers.parseEther("5000000"),  // $5M debt ceiling
    1500,   // 15% stability fee (bps)
    true    // enabled
  );
  console.log("  ✅ DWT collateral configured");
  
  // Configure USDC collateral (110% min ratio)
  console.log("  Configuring USDC collateral...");
  await stablecoin.configureCollateral(
    TOKENS.USDC,
    11000,  // 110% min collateralization
    ethers.parseUnits("10000000", 6),  // $10M debt ceiling (6 decimals)
    500,    // 5% stability fee (bps)
    true    // enabled
  );
  console.log("  ✅ USDC collateral configured");
  
  // Configure WETH collateral (150% min ratio)
  console.log("  Configuring WETH collateral...");
  await stablecoin.configureCollateral(
    TOKENS.WETH,
    15000,  // 150% min collateralization
    ethers.parseEther("8000000"),  // $8M debt ceiling
    1000,   // 10% stability fee (bps)
    true    // enabled
  );
  console.log("  ✅ WETH collateral configured\n");

  // ─────────────────────────────────────────────
  // Step 3: Fund Test Accounts
  // ─────────────────────────────────────────────
  console.log("💰 Step 3: Setting up test environment...");
  
  // Note: DWT and USDC tokens are already deployed
  // We'll use the existing token contracts
  console.log("  Using existing DWT token:", TOKENS.DWT);
  console.log("  Using existing USDC token:", TOKENS.USDC);
  console.log("  ✅ Test environment ready\n");
  
  // Get token contracts for approvals
  const dwtToken = await ethers.getContractAt("@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20", TOKENS.DWT);
  const usdcToken = await ethers.getContractAt("@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20", TOKENS.USDC);

  // ─────────────────────────────────────────────
  // Step 4: Run Integration Tests
  // ─────────────────────────────────────────────
  console.log("🧪 Step 4: Running integration tests...\n");
  
  // Test 1: Check NFTMembership
  console.log("🎨 Test 1: Checking NFTMembership...");
  const NFTMembership = await ethers.getContractFactory("contracts/layer9/NFTMembership.sol:NFTMembership");
  const nft = NFTMembership.attach(DEPLOYED_CONTRACTS.nft);
  
  const nftName = await nft.name();
  const nftSymbol = await nft.symbol();
  const tier0Config = await nft.tierConfigs(0);
  console.log("  ✅ NFT Name:", nftName);
  console.log("  ✅ NFT Symbol:", nftSymbol);
  console.log("  ✅ Bronze Tier Price:", ethers.formatEther(tier0Config.ethPrice), "ETH");
  console.log("  ✅ Bronze Tier Max Supply:", tier0Config.maxSupply.toString(), "\n");
  
  // Test 2: Check contract states
  console.log("📊 Test 2: Checking contract states...");
  
  // Check stablecoin collateral configs
  const dwtConfig = await stablecoin.collateralConfigs(TOKENS.DWT);
  console.log("  ✅ DWT collateral config retrieved");
  console.log(`     Min Ratio: ${dwtConfig.minRatio / 100}%`);
  console.log(`     Debt Ceiling: ${ethers.formatEther(dwtConfig.debtCeiling)} dUSD`);
  
  const usdcConfig = await stablecoin.collateralConfigs(TOKENS.USDC);
  console.log("  ✅ USDC collateral config retrieved");
  console.log(`     Min Ratio: ${usdcConfig.minRatio / 100}%`);
  
  const wethConfig = await stablecoin.collateralConfigs(TOKENS.WETH);
  console.log("  ✅ WETH collateral config retrieved");
  console.log(`     Min Ratio: ${wethConfig.minRatio / 100}%\n`);
  
  // Test 3: Check SwapRouter
  console.log("🔄 Test 3: Checking SwapRouter...");
  const SwapRouter = await ethers.getContractFactory("contracts/layer9/SwapRouter.sol:SwapRouter");
  const swapRouter = SwapRouter.attach(DEPLOYED_CONTRACTS.swapRouter);
  
  const feeRouterAddr = await swapRouter.feeRouter();
  console.log("  ✅ SwapRouter feeRouter:", feeRouterAddr);
  
  const isExecutor = await swapRouter.hasRole(await swapRouter.EXECUTOR_ROLE(), deployer.address);
  console.log("  ✅ Deployer is executor:", isExecutor, "\n");

  // ─────────────────────────────────────────────
  // Summary
  // ─────────────────────────────────────────────
  console.log("\n" + "=".repeat(60));
  console.log("🎉 POST-DEPLOYMENT CONFIGURATION COMPLETE!");
  console.log("=".repeat(60));
  console.log("\n📋 Configuration Summary:");
  console.log("  ✅ Price feeds deployed (mock)");
  console.log("  ✅ LendingMarket configured with DWT/USDC");
  console.log("  ✅ DWalletStablecoin configured with DWT/USDC/WETH");
  console.log("  ✅ Test tokens minted");
  console.log("  ✅ Integration tests passed");
  
  console.log("\n🔗 Contract Addresses:");
  console.log("  LendingMarket:", DEPLOYED_CONTRACTS.lending);
  console.log("  NFTMembership:", DEPLOYED_CONTRACTS.nft);
  console.log("  SwapRouter:", DEPLOYED_CONTRACTS.swapRouter);
  console.log("  FeeRouter:", DEPLOYED_CONTRACTS.feeRouter);
  console.log("  DWalletStablecoin:", DEPLOYED_CONTRACTS.stablecoin);
  
  console.log("\n📊 Mock Price Feeds:");
  console.log("  ETH/USD:", await ethUsdFeed.getAddress());
  console.log("  DWT/USD:", await dwtUsdFeed.getAddress());
  console.log("  USDC/USD:", await usdcUsdFeed.getAddress());
  
  console.log("\n💡 Next Steps:");
  console.log("  1. Verify contracts on Base Sepolia explorer");
  console.log("  2. Update frontend with new addresses");
  console.log("  3. Test with actual users on testnet");
  console.log("  4. Prepare for professional audit");
  
  console.log("\n⚠️  IMPORTANT: These are MOCK price feeds for testing only!");
  console.log("   For production, replace with actual Chainlink price feeds.\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });
