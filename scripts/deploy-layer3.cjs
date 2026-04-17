const hre = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🚀 Deploying Layer 3 - Oracles, Bridge & Emergency Systems...\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("📦 Deploying with account:", deployer.address);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", hre.ethers.formatEther(balance), "ETH\n");

  // Get existing deployments
  console.log("📋 Loading existing deployments...");
  let securityController, lockEngine, dwtToken, swapRouter, treasury;
  
  try {
    const layer9Deployment = require("../deployment-layer9-baseSepolia-1776320755825.json");
    securityController = layer9Deployment.contracts.security;
    lockEngine = layer9Deployment.contracts.lockEngine;
    console.log("✅ Layer 9 Security Controller:", securityController);
    console.log("✅ Layer 9 Lock Engine:", lockEngine);
  } catch (e) {
    console.log("⚠️  Layer 9 deployment not found, will use placeholder");
    securityController = "0x0000000000000000000000000000000000000000";
    lockEngine = "0x0000000000000000000000000000000000000000";
  }

  try {
    const layer1Deployment = require("../deployment-layer1-baseSepolia-1776388793706.json");
    dwtToken = layer1Deployment.contracts.dwtToken;
    console.log("✅ Layer 1 DWT Token:", dwtToken);
  } catch (e) {
    console.log("⚠️  Layer 1 deployment not found, will use placeholder");
    dwtToken = "0x0000000000000000000000000000000000000000";
  }

  try {
    const layer9Deployment = require("../deployment-layer9-baseSepolia-1776320755825.json");
    swapRouter = layer9Deployment.contracts.swapRouter;
    treasury = layer9Deployment.contracts.feeRouter; // Using feeRouter as treasury placeholder
    console.log("✅ Layer 9 Swap Router:", swapRouter);
    console.log("✅ Layer 9 Fee Router (Treasury):", treasury);
  } catch (e) {
    console.log("⚠️  Layer 9 contracts not found, will use placeholders");
    swapRouter = "0x0000000000000000000000000000000000000000";
    treasury = "0x0000000000000000000000000000000000000000";
  }

  console.log("\n" + "=".repeat(60) + "\n");

  // 1. Deploy DWTPriceOracle
  console.log("📡 [1/8] Deploying DWTPriceOracle...");
  const DWTPriceOracle = await hre.ethers.getContractFactory("DWTPriceOracle");
  const priceOracle = await DWTPriceOracle.deploy(securityController);
  await priceOracle.waitForDeployment();
  const priceOracleAddress = await priceOracle.getAddress();
  console.log("✅ DWTPriceOracle deployed to:", priceOracleAddress);

  // 2. Deploy EmergencyPause
  console.log("\n🚨 [2/8] Deploying EmergencyPause...");
  const EmergencyPause = await hre.ethers.getContractFactory("EmergencyPause");
  const emergencyPause = await EmergencyPause.deploy(securityController);
  await emergencyPause.waitForDeployment();
  const emergencyPauseAddress = await emergencyPause.getAddress();
  console.log("✅ EmergencyPause deployed to:", emergencyPauseAddress);

  // 3. Deploy DWTBridge (3-of-5 multisig)
  console.log("\n🌉 [3/8] Deploying DWTBridge...");
  const DWTBridge = await hre.ethers.getContractFactory("DWTBridge");
  const dwtBridge = await DWTBridge.deploy(securityController, 3);
  await dwtBridge.waitForDeployment();
  const dwtBridgeAddress = await dwtBridge.getAddress();
  console.log("✅ DWTBridge deployed to:", dwtBridgeAddress);

  // 4. Deploy FeeSplitter
  console.log("\n💸 [4/8] Deploying FeeSplitter...");
  const FeeSplitter = await hre.ethers.getContractFactory("FeeSplitter");
  const feeSplitter = await FeeSplitter.deploy(
    securityController,
    treasury,
    deployer.address, // RewardDistributor (will update later)
    deployer.address  // BuybackAndBurn (will update later)
  );
  await feeSplitter.waitForDeployment();
  const feeSplitterAddress = await feeSplitter.getAddress();
  console.log("✅ FeeSplitter deployed to:", feeSplitterAddress);

  // 5. Deploy BuybackAndBurn
  console.log("\n🔥 [5/8] Deploying BuybackAndBurn...");
  const BuybackAndBurn = await hre.ethers.getContractFactory("BuybackAndBurn");
  const buybackAndBurn = await BuybackAndBurn.deploy(
    securityController,
    dwtToken,
    swapRouter
  );
  await buybackAndBurn.waitForDeployment();
  const buybackAndBurnAddress = await buybackAndBurn.getAddress();
  console.log("✅ BuybackAndBurn deployed to:", buybackAndBurnAddress);

  // 6. Deploy VeDWT
  console.log("\n🔒 [6/8] Deploying VeDWT...");
  const VeDWT = await hre.ethers.getContractFactory("VeDWT");
  const veDWT = await VeDWT.deploy(securityController, dwtToken);
  await veDWT.waitForDeployment();
  const veDWTAddress = await veDWT.getAddress();
  console.log("✅ VeDWT deployed to:", veDWTAddress);

  // 7. Deploy DWalletMultisig (3-of-5)
  console.log("\n🔐 [7/8] Deploying DWalletMultisig...");
  const signers = [
    deployer.address,
    "0x1234567890123456789012345678901234567890", // Placeholder
    "0x2345678901234567890123456789012345678901", // Placeholder
    "0x3456789012345678901234567890123456789012", // Placeholder
    "0x4567890123456789012345678901234567890123", // Placeholder
  ];
  const DWalletMultisig = await hre.ethers.getContractFactory("DWalletMultisig");
  const dwalletMultisig = await DWalletMultisig.deploy(
    securityController,
    signers,
    3
  );
  await dwalletMultisig.waitForDeployment();
  const dwalletMultisigAddress = await dwalletMultisig.getAddress();
  console.log("✅ DWalletMultisig deployed to:", dwalletMultisigAddress);

  // 8. Deploy RewardDistributor
  console.log("\n🎁 [8/8] Deploying RewardDistributor...");
  const RewardDistributor = await hre.ethers.getContractFactory("RewardDistributor");
  const rewardDistributor = await RewardDistributor.deploy(
    deployer.address, // _dwtStaking (mock - will update later)
    deployer.address, // _stakingPool (mock - will update later)
    deployer.address, // _boostedStaking (mock - will update later)
    treasury, // _treasury
    dwtToken, // _dwtToken
    swapRouter, // _swapRouter
    priceOracleAddress, // _priceOracle
    "0x4200000000000000000000000000000000000006", // _weth (Base WETH)
    securityController, // _securityController
    deployer.address, // _registry (mock - will update later)
    deployer.address, // _access (mock - will update later)
    deployer.address, // _time (mock - will update later)
    deployer.address, // _state (mock - will update later)
    deployer.address, // _rate (mock - will update later)
    deployer.address, // _verify (mock - will update later)
    deployer.address // _owner
  );
  await rewardDistributor.waitForDeployment();
  const rewardDistributorAddress = await rewardDistributor.getAddress();
  console.log("✅ RewardDistributor deployed to:", rewardDistributorAddress);

  console.log("\n" + "=".repeat(60));
  console.log("🎉 LAYER 3 DEPLOYMENT COMPLETE!");
  console.log("=".repeat(60) + "\n");

  // Save deployment info
  const deploymentInfo = {
    network: hre.network.name,
    chainId: hre.network.config.chainId || 84532,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    layer: "Layer 3 - Oracles, Bridge & Emergency",
    contracts: {
      priceOracle: priceOracleAddress,
      emergencyPause: emergencyPauseAddress,
      dwtBridge: dwtBridgeAddress,
      feeSplitter: feeSplitterAddress,
      buybackAndBurn: buybackAndBurnAddress,
      veDWT: veDWTAddress,
      dwalletMultisig: dwalletMultisigAddress,
      rewardDistributor: rewardDistributorAddress
    },
    dependencies: {
      securityController,
      lockEngine,
      dwtToken,
      swapRouter,
      treasury
    },
    security: {
      bridgeRequiredSignatures: 3,
      multisigRequiredConfirmations: 3,
      multisigSignerCount: 5,
      buybackCooldown: "1 day",
      buybackMaxSingle: "10,000 DWT",
      veDWTMinLock: "1 week",
      veDWTMaxLock: "4 years"
    }
  };

  const filename = `deployment-layer3-${hre.network.name}-${Date.now()}.json`;
  fs.writeFileSync(filename, JSON.stringify(deploymentInfo, null, 2));
  console.log("💾 Deployment info saved to", filename);

  console.log("\n📊 Deployment Summary:");
  console.log("   • Price Oracle:", priceOracleAddress);
  console.log("   • Emergency Pause:", emergencyPauseAddress);
  console.log("   • DWT Bridge:", dwtBridgeAddress);
  console.log("   • Fee Splitter:", feeSplitterAddress);
  console.log("   • Buyback & Burn:", buybackAndBurnAddress);
  console.log("   • VeDWT:", veDWTAddress);
  console.log("   • Multisig:", dwalletMultisigAddress);
  console.log("   • Reward Distributor:", rewardDistributorAddress);

  console.log("\n✅ Next Steps:");
  console.log("   1. Register relayers for DWTBridge");
  console.log("   2. Register price feeds in DWTPriceOracle");
  console.log("   3. Register contracts in EmergencyPause");
  console.log("   4. Configure FeeSplitter with correct addresses");
  console.log("   5. Verify contracts on BaseScan");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
