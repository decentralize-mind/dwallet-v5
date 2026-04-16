const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Starting Layer 9 Contracts Deployment to Base Sepolia...\n");

  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying with account:", deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(balance), "ETH\n");

  // Configuration
  const GOVERNOR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("GOVERNOR_ROLE"));
  const GUARDIAN_ROLE = ethers.keccak256(ethers.toUtf8Bytes("GUARDIAN_ROLE"));
  const LIQUIDATOR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("LIQUIDATOR_ROLE"));
  const EXECUTOR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("EXECUTOR_ROLE"));

  const contracts = {};

  try {
    // ─────────────────────────────────────────────
    // Step 1: Deploy Security Infrastructure
    // ─────────────────────────────────────────────
    console.log("🔒 Step 1: Deploying Security Infrastructure...");

    const Layer7Security = await ethers.getContractFactory("Layer7Security");
    contracts.security = await Layer7Security.deploy(
      [deployer.address],
      1,
      100,
      ethers.parseEther("100"),
      0
    );
    await contracts.security.waitForDeployment();
    console.log("✅ Layer7Security deployed:", await contracts.security.getAddress());

    const AccessController = await ethers.getContractFactory("AccessController");
    contracts.access = await AccessController.deploy(deployer.address);
    await contracts.access.waitForDeployment();
    console.log("✅ AccessController deployed:", await contracts.access.getAddress());

    const TimeLockController = await ethers.getContractFactory("TimeLockController");
    contracts.timelock = await TimeLockController.deploy(deployer.address);
    await contracts.timelock.waitForDeployment();
    console.log("✅ TimeLockController deployed:", await contracts.timelock.getAddress());

    const StateController = await ethers.getContractFactory("StateController");
    contracts.state = await StateController.deploy(deployer.address);
    await contracts.state.waitForDeployment();
    console.log("✅ StateController deployed:", await contracts.state.getAddress());

    const RateLimiter = await ethers.getContractFactory("RateLimiter");
    contracts.rate = await RateLimiter.deploy(deployer.address);
    await contracts.rate.waitForDeployment();
    console.log("✅ RateLimiter deployed:", await contracts.rate.getAddress());

    const VerificationEngine = await ethers.getContractFactory("VerificationEngine");
    contracts.verify = await VerificationEngine.deploy(deployer.address);
    await contracts.verify.waitForDeployment();
    console.log("✅ VerificationEngine deployed:", await contracts.verify.getAddress());

    const LockEngine = await ethers.getContractFactory("LockEngine");
    contracts.lockEngine = await LockEngine.deploy(deployer.address);
    await contracts.lockEngine.waitForDeployment();
    await contracts.lockEngine.setModules(
      await contracts.access.getAddress(),
      await contracts.timelock.getAddress(),
      await contracts.state.getAddress(),
      await contracts.rate.getAddress(),
      await contracts.verify.getAddress(),
      await contracts.security.getAddress()
    );
    console.log("✅ LockEngine deployed & configured:", await contracts.lockEngine.getAddress());

    // ─────────────────────────────────────────────
    // Step 2: Deploy LendingMarket
    // ─────────────────────────────────────────────
    console.log("\n🏦 Step 2: Deploying LendingMarket...");

    // Note: Using DWT token from environment
    const DWT_TOKEN = process.env.DWT_TOKEN || '0x3400b0167dA5b2dba0b88b9604eE7df4BFc1f1fa';
    const USDC_TOKEN = "0x0000000000000000000000000000000000000000"; // TODO: Update for Base Sepolia
    const DWT_PRICE_FEED = "0x0000000000000000000000000000000000000000"; // TODO: Update
    const STABLE_PRICE_FEED = "0x0000000000000000000000000000000000000000"; // TODO: Update

    const LendingMarket = await ethers.getContractFactory("contracts/layer9/LendingMarket.sol:LendingMarket");
    contracts.lending = await LendingMarket.deploy(
      DWT_TOKEN,
      USDC_TOKEN,
      DWT_PRICE_FEED,
      STABLE_PRICE_FEED,
      18, // DWT decimals
      6,  // USDC decimals
      deployer.address,
      deployer.address,
      deployer.address,
      await contracts.security.getAddress(),
      await contracts.access.getAddress(),
      await contracts.lockEngine.getAddress(),
      await contracts.verify.getAddress()
    );
    await contracts.lending.waitForDeployment();
    console.log("✅ LendingMarket deployed:", await contracts.lending.getAddress());

    // ─────────────────────────────────────────────
    // Step 3: Deploy NFTMembership
    // ─────────────────────────────────────────────
    console.log("\n🎨 Step 3: Deploying NFTMembership...");

    const NFTMembership = await ethers.getContractFactory("contracts/layer9/NFTMembership.sol:NFTMembership");
    contracts.nft = await NFTMembership.deploy(
      DWT_TOKEN,
      await contracts.security.getAddress()
    );
    await contracts.nft.waitForDeployment();
    console.log("✅ NFTMembership deployed:", await contracts.nft.getAddress());

    // ─────────────────────────────────────────────
    // Step 4: Deploy FeeRouter
    // ─────────────────────────────────────────────
    console.log("\n💰 Step 4: Deploying FeeRouter...");

    const FeeRouter = await ethers.getContractFactory("FeeRouter");
    contracts.feeRouter = await FeeRouter.deploy(
      deployer.address,          // treasury
      deployer.address,          // liquidityPool (placeholder)
      DWT_TOKEN,                 // governanceToken
      await contracts.security.getAddress(),  // securityController
      deployer.address           // owner
    );
    await contracts.feeRouter.waitForDeployment();
    console.log("✅ FeeRouter deployed:", await contracts.feeRouter.getAddress());

    // ─────────────────────────────────────────────
    // Step 5: Deploy SwapRouter
    // ─────────────────────────────────────────────
    console.log("\n🔄 Step 5: Deploying SwapRouter...");

    const SwapRouter = await ethers.getContractFactory("contracts/layer9/SwapRouter.sol:SwapRouter");
    contracts.swapRouter = await SwapRouter.deploy(
      deployer.address,
      deployer.address,
      await contracts.security.getAddress(),
      await contracts.access.getAddress(),
      await contracts.lockEngine.getAddress(),
      await contracts.verify.getAddress()
    );
    await contracts.swapRouter.waitForDeployment();
    console.log("✅ SwapRouter deployed:", await contracts.swapRouter.getAddress());

    // Configure SwapRouter
    await contracts.swapRouter.setFeeRouter(await contracts.feeRouter.getAddress());
    console.log("✅ SwapRouter configured with FeeRouter");

    // Grant executor role
    await contracts.swapRouter.grantRole(EXECUTOR_ROLE, deployer.address);
    console.log("✅ Executor role granted to deployer");

    // ─────────────────────────────────────────────
    // Step 6: Deploy DWalletStablecoin
    // ─────────────────────────────────────────────
    console.log("\n💵 Step 6: Deploying DWalletStablecoin...");

    const DWalletStablecoin = await ethers.getContractFactory("contracts/layer9/DWalletStablecoin.sol:DWalletStablecoin");
    contracts.stablecoin = await DWalletStablecoin.deploy(
      await contracts.security.getAddress(),
      await contracts.access.getAddress(),
      await contracts.lockEngine.getAddress(),
      await contracts.verify.getAddress(),
      deployer.address,
      deployer.address,
      ethers.parseEther("10000000") // $10M global debt ceiling
    );
    await contracts.stablecoin.waitForDeployment();
    console.log("✅ DWalletStablecoin (dUSD) deployed:", await contracts.stablecoin.getAddress());

    // Grant roles
    await contracts.stablecoin.grantRole(GOVERNOR_ROLE, deployer.address);
    await contracts.stablecoin.grantRole(GUARDIAN_ROLE, deployer.address);
    console.log("✅ Governor and Guardian roles granted");

    // Configure DWT collateral
    if (DWT_TOKEN !== "0x0000000000000000000000000000000000000000") {
      await contracts.stablecoin.configureCollateral(
        DWT_TOKEN,
        20000, // 200% min collateralization
        ethers.parseEther("5000000"), // $5M debt ceiling
        500, // 5% annual stability fee
        true
      );
      console.log("✅ DWT collateral configured");
    }

    // ─────────────────────────────────────────────
    // Step 7: Verify Contracts on Etherscan
    // ─────────────────────────────────────────────
    console.log("\n🔍 Step 7: Verifying contracts on Base Sepolia Explorer...");
    console.log("⏳ Waiting for block confirmations...");
    
    await new Promise(resolve => setTimeout(resolve, 30000)); // Wait 30 seconds

    try {
      await hre.run("verify:verify", {
        address: await contracts.lending.getAddress(),
        constructorArguments: [
          DWT_TOKEN, USDC_TOKEN, DWT_PRICE_FEED, STABLE_PRICE_FEED,
          18, 6, deployer.address, deployer.address, deployer.address,
          await contracts.security.getAddress(),
          await contracts.access.getAddress(),
          await contracts.lockEngine.getAddress(),
          await contracts.verify.getAddress()
        ],
      });
      console.log("✅ LendingMarket verified");
    } catch (error) {
      console.log("⚠️  LendingMarket verification skipped:", error.message);
    }

    // Add more verifications as needed...

    // ─────────────────────────────────────────────
    // Summary
    // ─────────────────────────────────────────────
    console.log("\n" + "=".repeat(60));
    console.log("📊 DEPLOYMENT SUMMARY");
    console.log("=".repeat(60));
    console.log("Network: Base Sepolia Testnet");
    console.log("Deployer:", deployer.address);
    console.log("=".repeat(60));
    console.log("\n🔐 Security Infrastructure:");
    console.log("  Layer7Security:", await contracts.security.getAddress());
    console.log("  LockEngine:", await contracts.lockEngine.getAddress());
    console.log("  AccessController:", await contracts.access.getAddress());
    console.log("\n🏦 DeFi Contracts:");
    console.log("  LendingMarket:", await contracts.lending.getAddress());
    console.log("  NFTMembership:", await contracts.nft.getAddress());
    console.log("  SwapRouter:", await contracts.swapRouter.getAddress());
    console.log("  FeeRouter:", await contracts.feeRouter.getAddress());
    console.log("  DWalletStablecoin:", await contracts.stablecoin.getAddress());
    console.log("\n" + "=".repeat(60));
    console.log("⚠️  TODO: Update token addresses and price feeds in deployment script");
    console.log("🎉 Deployment complete!\n");

    // Save deployment info
    const deploymentInfo = {
      network: hre.network.name,
      deployer: deployer.address,
      timestamp: new Date().toISOString(),
      contracts: {
        security: await contracts.security.getAddress(),
        lockEngine: await contracts.lockEngine.getAddress(),
        access: await contracts.access.getAddress(),
        lending: await contracts.lending.getAddress(),
        nft: await contracts.nft.getAddress(),
        swapRouter: await contracts.swapRouter.getAddress(),
        feeRouter: await contracts.feeRouter.getAddress(),
        stablecoin: await contracts.stablecoin.getAddress()
      }
    };

    const fs = require('fs');
    fs.writeFileSync(
      `deployment-layer9-${hre.network.name}-${Date.now()}.json`,
      JSON.stringify(deploymentInfo, null, 2)
    );
    console.log("💾 Deployment info saved to deployment-layer9-" + hre.network.name + "-" + Date.now() + ".json\n");

  } catch (error) {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
