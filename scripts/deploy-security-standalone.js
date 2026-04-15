/**
 * @title Core Security Contracts - Standalone Test Deployment
 * @notice Deploys the 4 core security contracts WITHOUT integrating with old contracts
 *         This is for testing and demonstration purposes only
 */

const hre = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🚀 Deploying Core Security Contracts (Standalone Test)...\n");

  // Get signers
  const [deployer, admin, signer, analyst, council1, council2, council3] = await hre.ethers.getSigners();
  console.log("Deployer:", deployer.address);
  console.log("Admin:", admin.address);
  console.log("Analyst:", analyst.address);

  const deployedContracts = {};

  // ───────────────────────────────────────────────────────────────────────────
  // Step 1: Deploy InvariantChecker
  // ───────────────────────────────────────────────────────────────────────────
  
  console.log("\n📋 Step 1: Deploying InvariantChecker...");
  const InvariantChecker = await hre.ethers.getContractFactory("InvariantChecker");
  const invariantChecker = await InvariantChecker.deploy(admin.address);
  await invariantChecker.waitForDeployment();
  
  const invariantCheckerAddress = await invariantChecker.getAddress();
  console.log("✅ InvariantChecker deployed to:", invariantCheckerAddress);
  deployedContracts.InvariantChecker = invariantCheckerAddress;

  // ───────────────────────────────────────────────────────────────────────────
  // Step 2: Deploy Mock Layer7Security (for testing)
  // ───────────────────────────────────────────────────────────────────────────
  
  console.log("\n🔒 Step 2: Deploying Mock Layer7Security...");
  const MockLayer7Security = await hre.ethers.getContractFactory("MockLayer7Security");
  const mockLayer7 = await MockLayer7Security.deploy([admin.address], 1);
  await mockLayer7.waitForDeployment();
  
  const mockLayer7Address = await mockLayer7.getAddress();
  console.log("✅ Mock Layer7Security deployed to:", mockLayer7Address);
  deployedContracts.MockLayer7Security = mockLayer7Address;

  // ───────────────────────────────────────────────────────────────────────────
  // Step 3: Deploy LockEngine
  // ───────────────────────────────────────────────────────────────────────────
  
  console.log("\n🔐 Step 3: Deploying LockEngine...");
  const LockEngine = await hre.ethers.getContractFactory("LockEngine");
  const lockEngine = await LockEngine.deploy(
    admin.address,      // _admin
    signer.address,     // _signer
    mockLayer7Address,  // _securityController
    invariantCheckerAddress // _invariantChecker
  );
  await lockEngine.waitForDeployment();
  
  const lockEngineAddress = await lockEngine.getAddress();
  console.log("✅ LockEngine deployed to:", lockEngineAddress);
  deployedContracts.LockEngine = lockEngineAddress;

  // ───────────────────────────────────────────────────────────────────────────
  // Step 4: Deploy SecurityController
  // ───────────────────────────────────────────────────────────────────────────
  
  console.log("\n🧠 Step 4: Deploying SecurityController...");
  const SecurityController = await hre.ethers.getContractFactory("SecurityController");
  const securityController = await SecurityController.deploy(
    admin.address,      // _admin
    analyst.address,    // _analyst
    mockLayer7Address   // _layer7Security
  );
  await securityController.waitForDeployment();
  
  const securityControllerAddress = await securityController.getAddress();
  console.log("✅ SecurityController deployed to:", securityControllerAddress);
  deployedContracts.SecurityController = securityControllerAddress;

  // ───────────────────────────────────────────────────────────────────────────
  // Step 5: Deploy GovernanceTimelock
  // ───────────────────────────────────────────────────────────────────────────
  
  console.log("\n⏱️  Step 5: Deploying GovernanceTimelock...");
  const GovernanceTimelock = await hre.ethers.getContractFactory("GovernanceTimelock");
  const governanceTimelock = await GovernanceTimelock.deploy(
    [deployer.address],                    // Proposers
    [deployer.address],                    // Executors
    [council1.address, council2.address, council3.address], // Security Council
    admin.address                          // Admin
  );
  await governanceTimelock.waitForDeployment();
  
  const governanceTimelockAddress = await governanceTimelock.getAddress();
  console.log("✅ GovernanceTimelock deployed to:", governanceTimelockAddress);
  deployedContracts.GovernanceTimelock = governanceTimelockAddress;

  // ───────────────────────────────────────────────────────────────────────────
  // Step 6: Initial Configuration
  // ───────────────────────────────────────────────────────────────────────────
  
  console.log("\n⚙️  Step 6: Initial Configuration...");

  // Configure LockEngine
  console.log("  • Configuring LockEngine rate limits...");
  const MINT_ACTION = hre.ethers.id("MINT_ACTION");
  const WITHDRAW_ACTION = hre.ethers.id("WITHDRAW_ACTION");
  const UPGRADE_ACTION = hre.ethers.id("UPGRADE_ACTION");
  
  await lockEngine.setRateLimit(MINT_ACTION, hre.ethers.parseEther("1000000"), 10);
  await lockEngine.setCooldown(WITHDRAW_ACTION, 86400); // 24 hours
  await lockEngine.setTimeDelay(UPGRADE_ACTION, 172800); // 48 hours

  // Activate test layers
  const LAYER_TEST = hre.ethers.id("LAYER_TEST");
  await lockEngine.setLayerState(LAYER_TEST, true);
  console.log("    ✓ Test layer activated");

  // Configure SecurityController
  console.log("  • Configuring SecurityController thresholds...");
  await securityController.updateThreatThresholds(30, 70, 90, 95);
  await securityController.setAutoResponseEnabled(true);
  console.log("    ✓ Threat thresholds set");
  console.log("    ✓ Auto-response enabled");

  // ───────────────────────────────────────────────────────────────────────────
  // Summary
  // ───────────────────────────────────────────────────────────────────────────
  
  console.log("\n" + "=".repeat(80));
  console.log("🎉 DEPLOYMENT COMPLETE!");
  console.log("=".repeat(80));
  console.log("\n📦 Deployed Contracts:");
  console.log("  InvariantChecker:    ", invariantCheckerAddress);
  console.log("  LockEngine:          ", lockEngineAddress);
  console.log("  SecurityController:  ", securityControllerAddress);
  console.log("  GovernanceTimelock:  ", governanceTimelockAddress);
  console.log("  Mock Layer7Security: ", mockLayer7Address);
  console.log("\n📝 Next Steps:");
  console.log("  1. Run attack simulations: npx hardhat test test/attacks/AttackSimulation.test.js");
  console.log("  2. View demo contract: test/attacks/DemoSecurityFeatures.js");
  console.log("  3. Check documentation: QUICK_START_SECURITY.md");
  console.log("\n" + "=".repeat(80));

  // Save deployment info
  const deploymentInfo = {
    network: hre.network.name,
    timestamp: new Date().toISOString(),
    deployer: deployer.address,
    contracts: deployedContracts,
  };

  // Write to file
  const outputPath = "./deployments/security-standalone.json";
  if (!fs.existsSync("./deployments")) {
    fs.mkdirSync("./deployments");
  }
  fs.writeFileSync(outputPath, JSON.stringify(deploymentInfo, null, 2));
  console.log(`\n💾 Deployment info saved to: ${outputPath}`);
}

// Run deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
