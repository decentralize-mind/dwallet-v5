/**
 * @title Minimal Security Core Deployment - Base Sepolia
 * @notice Deploys 3 essential security contracts (skips GovernanceTimelock due to OpenZeppelin conflicts)
 */

const hre = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🚀 Deploying Minimal Security Core to BASE SEPOLIA...\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Balance:", hre.formatEther(balance), "ETH\n");

  if (balance === 0n) {
    console.error("❌ Zero balance! Get Base Sepolia ETH from faucets first.");
    process.exit(1);
  }

  const deployedContracts = {};

  try {
    // Step 1: InvariantChecker
    console.log("📋 Deploying InvariantChecker...");
    const InvariantChecker = await hre.ethers.getContractFactory("InvariantChecker");
    const invariantChecker = await InvariantChecker.deploy(deployer.address);
    await invariantChecker.waitForDeployment();
    const invariantCheckerAddress = await invariantChecker.getAddress();
    console.log("✅ InvariantChecker:", invariantCheckerAddress);
    deployedContracts.InvariantChecker = invariantCheckerAddress;

    // Step 2: MockLayer7Security
    console.log("\n🔒 Deploying MockLayer7Security...");
    const MockLayer7Security = await hre.ethers.getContractFactory("MockLayer7Security");
    const mockLayer7 = await MockLayer7Security.deploy([deployer.address], 1);
    await mockLayer7.waitForDeployment();
    const mockLayer7Address = await mockLayer7.getAddress();
    console.log("✅ MockLayer7Security:", mockLayer7Address);
    deployedContracts.MockLayer7Security = mockLayer7Address;

    // Step 3: LockEngine
    console.log("\n🔐 Deploying LockEngine...");
    const LockEngine = await hre.ethers.getContractFactory("LockEngine");
    const lockEngine = await LockEngine.deploy(
      deployer.address,
      deployer.address,
      mockLayer7Address,
      invariantCheckerAddress
    );
    await lockEngine.waitForDeployment();
    const lockEngineAddress = await lockEngine.getAddress();
    console.log("✅ LockEngine:", lockEngineAddress);
    deployedContracts.LockEngine = lockEngineAddress;

    // Step 4: SecurityController
    console.log("\n🧠 Deploying SecurityController...");
    const SecurityController = await hre.ethers.getContractFactory("SecurityController");
    const securityController = await SecurityController.deploy(
      deployer.address,
      deployer.address,
      mockLayer7Address
    );
    await securityController.waitForDeployment();
    const securityControllerAddress = await securityController.getAddress();
    console.log("✅ SecurityController:", securityControllerAddress);
    deployedContracts.SecurityController = securityControllerAddress;

    // Configure
    console.log("\n⚙️  Configuring contracts...");
    const MINT_ACTION = hre.ethers.id("MINT_ACTION");
    const WITHDRAW_ACTION = hre.ethers.id("WITHDRAW_ACTION");
    
    await lockEngine.setRateLimit(MINT_ACTION, hre.parseEther("1000000"), 10);
    await lockEngine.setCooldown(WITHDRAW_ACTION, 86400);
    
    const LAYER_TEST = hre.ethers.id("LAYER_TEST");
    await lockEngine.setLayerState(LAYER_TEST, true);
    
    await securityController.updateThreatThresholds(30, 70, 90, 95);
    await securityController.setAutoResponseEnabled(true);
    
    console.log("    ✓ Configuration complete");

    // Summary
    console.log("\n" + "=".repeat(80));
    console.log("🎉 DEPLOYMENT COMPLETE!");
    console.log("=".repeat(80));
    console.log("\n📦 Contracts Deployed:");
    console.log("  InvariantChecker:   ", invariantCheckerAddress);
    console.log("  LockEngine:         ", lockEngineAddress);
    console.log("  SecurityController: ", securityControllerAddress);
    console.log("  MockLayer7Security: ", mockLayer7Address);
    console.log("\n🔗 View on Explorer:");
    console.log("  https://sepolia.basescan.org/address/", lockEngineAddress);
    console.log("\n⚠️  Note: GovernanceTimelock not deployed due to OpenZeppelin compatibility issues.");
    console.log("   You can deploy it separately after fixing the integration.\n");

    // Save
    const deploymentInfo = {
      network: "baseSepolia",
      chainId: 84532,
      timestamp: new Date().toISOString(),
      deployer: deployer.address,
      contracts: deployedContracts,
    };

    if (!fs.existsSync("./deployments")) {
      fs.mkdirSync("./deployments");
    }
    fs.writeFileSync("./deployments/security-base-minimal.json", JSON.stringify(deploymentInfo, null, 2));
    console.log("💾 Saved to: deployments/security-base-minimal.json");

  } catch (error) {
    console.error("\n❌ Deployment failed:", error.message);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
