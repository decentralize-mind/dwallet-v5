/**
 * @title Core Security Contracts Deployment Script
 * @notice Deploys all 4 core security contracts with proper wiring
 */

const hre = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🚀 Deploying Core Security Contracts...\n");

  // Get signers
  const [deployer, admin, signer, analyst] = await hre.ethers.getSigners();
  console.log("Deployer:", deployer.address);

  // Configuration
  const CONFIG = {
    // Use existing Layer7Security address or deploy new one
    LAYER7_SECURITY: process.env.LAYER7_SECURITY_ADDRESS || "0x0000000000000000000000000000000000000000",
    
    // Multisig addresses (replace with actual multisig)
    MULTISIG_ADMIN: admin.address,
    SECURITY_COUNCIL: [
      "0x1111111111111111111111111111111111111111", // Council member 1
      "0x2222222222222222222222222222222222222222", // Council member 2
      "0x3333333333333333333333333333333333333333", // Council member 3
      "0x4444444444444444444444444444444444444444", // Council member 4
      "0x5555555555555555555555555555555555555555", // Council member 5
    ],
  };

  const deployedContracts = {};

  // ───────────────────────────────────────────────────────────────────────────
  // Step 1: Deploy InvariantChecker
  // ───────────────────────────────────────────────────────────────────────────
  
  console.log("📋 Step 1: Deploying InvariantChecker...");
  const InvariantChecker = await hre.ethers.getContractFactory("InvariantChecker");
  const invariantChecker = await InvariantChecker.deploy(CONFIG.MULTISIG_ADMIN);
  await invariantChecker.waitForDeployment();
  
  const invariantCheckerAddress = await invariantChecker.getAddress();
  console.log("✅ InvariantChecker deployed to:", invariantCheckerAddress);
  deployedContracts.InvariantChecker = invariantCheckerAddress;

  // ───────────────────────────────────────────────────────────────────────────
  // Step 2: Deploy LockEngine
  // ───────────────────────────────────────────────────────────────────────────
  
  console.log("\n🔒 Step 2: Deploying LockEngine...");
  const LockEngine = await hre.ethers.getContractFactory("LockEngine");
  const lockEngine = await LockEngine.deploy(
    CONFIG.MULTISIG_ADMIN,
    signer.address,
    CONFIG.LAYER7_SECURITY,
    invariantCheckerAddress
  );
  await lockEngine.waitForDeployment();
  
  const lockEngineAddress = await lockEngine.getAddress();
  console.log("✅ LockEngine deployed to:", lockEngineAddress);
  deployedContracts.LockEngine = lockEngineAddress;

  // ───────────────────────────────────────────────────────────────────────────
  // Step 3: Deploy SecurityController
  // ───────────────────────────────────────────────────────────────────────────
  
  console.log("\n🧠 Step 3: Deploying SecurityController...");
  const SecurityController = await hre.ethers.getContractFactory("SecurityController");
  const securityController = await SecurityController.deploy(
    CONFIG.MULTISIG_ADMIN,
    analyst.address,
    CONFIG.LAYER7_SECURITY
  );
  await securityController.waitForDeployment();
  
  const securityControllerAddress = await securityController.getAddress();
  console.log("✅ SecurityController deployed to:", securityControllerAddress);
  deployedContracts.SecurityController = securityControllerAddress;

  // ───────────────────────────────────────────────────────────────────────────
  // Step 4: Deploy GovernanceTimelock
  // ───────────────────────────────────────────────────────────────────────────
  
  console.log("\n⏱️  Step 4: Deploying GovernanceTimelock...");
  const GovernanceTimelock = await hre.ethers.getContractFactory("GovernanceTimelock");
  const governanceTimelock = await GovernanceTimelock.deploy(
    [deployer.address],                    // Proposers
    [deployer.address],                    // Executors
    CONFIG.SECURITY_COUNCIL,               // Security Council (5 members)
    CONFIG.MULTISIG_ADMIN                  // Admin
  );
  await governanceTimelock.waitForDeployment();
  
  const governanceTimelockAddress = await governanceTimelock.getAddress();
  console.log("✅ GovernanceTimelock deployed to:", governanceTimelockAddress);
  deployedContracts.GovernanceTimelock = governanceTimelockAddress;

  // ───────────────────────────────────────────────────────────────────────────
  // Step 5: Initial Configuration
  // ───────────────────────────────────────────────────────────────────────────
  
  console.log("\n⚙️  Step 5: Initial Configuration...");

  // Configure LockEngine
  console.log("  • Configuring LockEngine rate limits...");
  await lockEngine.setRateLimit(
    hre.ethers.id("MINT_ACTION"),
    hre.ethers.parseEther("1000000"), // 1M per block
    10 // 10 calls per block
  );

  await lockEngine.setCooldown(
    hre.ethers.id("WITHDRAW_ACTION"),
    86400 // 24 hours
  );

  await lockEngine.setTimeDelay(
    hre.ethers.id("UPGRADE_ACTION"),
    172800 // 48 hours
  );

  // Activate core layers
  const coreLayers = [
    hre.ethers.id("LAYER_0_INFRA"),
    hre.ethers.id("LAYER_1_STORAGE"),
    hre.ethers.id("LAYER_2_DEX"),
    hre.ethers.id("LAYER_3_AUTH"),
    hre.ethers.id("LAYER_4_STAKING"),
  ];

  for (const layerId of coreLayers) {
    await lockEngine.setLayerState(layerId, true);
    console.log(`    ✓ Activated layer: ${layerId}`);
  }

  // Configure SecurityController
  console.log("  • Configuring SecurityController thresholds...");
  await securityController.updateThreatThresholds(30, 70, 90, 95);
  await securityController.setAutoResponseEnabled(true);
  await securityController.updateDetectionThresholds(
    50000, // 500% volume spike
    1000,  // 10x frequency
    hre.ethers.parseEther("1000000"), // 1M large tx
    10     // 10 calls per block
  );

  console.log("    ✓ Threat thresholds set");
  console.log("    ✓ Auto-response enabled");
  console.log("    ✓ Detection thresholds configured");

  // ───────────────────────────────────────────────────────────────────────────
  // Step 6: Transfer Ownership to Multisig
  // ───────────────────────────────────────────────────────────────────────────
  
  console.log("\n🔐 Step 6: Transferring ownership to multisig...");
  
  // Note: In production, do this via multisig transaction
  console.log("  ⚠️  Manual step required:");
  console.log(`  - Transfer ADMIN_ROLE on InvariantChecker to: ${CONFIG.MULTISIG_ADMIN}`);
  console.log(`  - Transfer ADMIN_ROLE on LockEngine to: ${CONFIG.MULTISIG_ADMIN}`);
  console.log(`  - Transfer ADMIN_ROLE on SecurityController to: ${CONFIG.MULTISIG_ADMIN}`);
  console.log(`  - Transfer DEFAULT_ADMIN_ROLE on GovernanceTimelock to: ${CONFIG.MULTISIG_ADMIN}`);

  // ───────────────────────────────────────────────────────────────────────────
  // Summary
  // ───────────────────────────────────────────────────────────────────────────
  
  console.log("\n" + "=".repeat(80));
  console.log("🎉 DEPLOYMENT COMPLETE!");
  console.log("=".repeat(80));
  console.log("\n📦 Deployed Contracts:");
  console.log("  InvariantChecker:   ", invariantCheckerAddress);
  console.log("  LockEngine:         ", lockEngineAddress);
  console.log("  SecurityController: ", securityControllerAddress);
  console.log("  GovernanceTimelock: ", governanceTimelockAddress);
  console.log("\n📝 Next Steps:");
  console.log("  1. Verify contracts on Etherscan");
  console.log("  2. Update SecurityGated.sol with new addresses");
  console.log("  3. Run integration tests");
  console.log("  4. Transfer admin roles to multisig");
  console.log("  5. Set up monitoring dashboard");
  console.log("\n" + "=".repeat(80));

  // Save deployment info
  const deploymentInfo = {
    network: hre.network.name,
    timestamp: new Date().toISOString(),
    deployer: deployer.address,
    contracts: deployedContracts,
    config: {
      layer7Security: CONFIG.LAYER7_SECURITY,
      multisigAdmin: CONFIG.MULTISIG_ADMIN,
      securityCouncil: CONFIG.SECURITY_COUNCIL,
    },
  };

  // Write to file
  const outputPath = "./deployments/security-contracts.json";
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
