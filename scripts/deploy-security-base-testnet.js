/**
 * @title Deploy Core Security Contracts to Base Sepolia Testnet
 * @notice Deploys the 4 core security contracts + Mock Layer7Security
 * 
 * Prerequisites:
 * 1. Set DEPLOYER_PRIVATE_KEY in .env.preproduction
 * 2. Ensure you have ETH on Base Sepolia (use faucet)
 * 3. Compile contracts first: npx hardhat compile --config hardhat.security.config.cjs
 */

const hre = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🚀 Deploying Security Core to BASE SEPOLIA Testnet...\n");

  // Get signers
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer Address:", deployer.address);

  // Check balance
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Deployer Balance:", hre.formatEther(balance), "ETH\n");

  if (balance === 0n) {
    console.error("❌ ERROR: Deployer has 0 ETH!");
    console.error("💡 Get Base Sepolia ETH from faucet:");
    console.error("   https://faucets.chain.link/base-sepolia");
    console.error("   or https://www.alchemy.com/faucets/base-sepolia\n");
    process.exit(1);
  }

  const deployedContracts = {};
  const network = await hre.ethers.provider.getNetwork();
  console.log(`Network: ${network.name} (Chain ID: ${network.chainId})\n`);

  // ───────────────────────────────────────────────────────────────────────────
  // Step 1: Deploy InvariantChecker
  // ───────────────────────────────────────────────────────────────────────────
  
  console.log("📋 Step 1: Deploying InvariantChecker...");
  const InvariantChecker = await hre.ethers.getContractFactory("InvariantChecker");
  const invariantChecker = await InvariantChecker.deploy(deployer.address);
  await invariantChecker.waitForDeployment();
  
  const invariantCheckerAddress = await invariantChecker.getAddress();
  console.log("✅ InvariantChecker deployed to:", invariantCheckerAddress);
  deployedContracts.InvariantChecker = invariantCheckerAddress;

  // ───────────────────────────────────────────────────────────────────────────
  // Step 2: Deploy MockLayer7Security
  // ───────────────────────────────────────────────────────────────────────────
  
  console.log("\n🔒 Step 2: Deploying MockLayer7Security...");
  const MockLayer7Security = await hre.ethers.getContractFactory("MockLayer7Security");
  const mockLayer7 = await MockLayer7Security.deploy([deployer.address], 1);
  await mockLayer7.waitForDeployment();
  
  const mockLayer7Address = await mockLayer7.getAddress();
  console.log("✅ MockLayer7Security deployed to:", mockLayer7Address);
  deployedContracts.MockLayer7Security = mockLayer7Address;

  // ───────────────────────────────────────────────────────────────────────────
  // Step 3: Deploy LockEngine
  // ───────────────────────────────────────────────────────────────────────────
  
  console.log("\n🔐 Step 3: Deploying LockEngine...");
  const LockEngine = await hre.ethers.getContractFactory("LockEngine");
  const lockEngine = await LockEngine.deploy(
    deployer.address,      // _admin
    deployer.address,      // _signer (same for testing)
    mockLayer7Address,     // _securityController
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
    deployer.address,      // _admin
    deployer.address,      // _analyst (same for testing)
    mockLayer7Address      // _layer7Security
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
    [deployer.address],                    // Security Council (single for testing)
    deployer.address                       // Admin
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
  
  const tx1 = await lockEngine.setRateLimit(MINT_ACTION, hre.parseEther("1000000"), 10);
  await tx1.wait();
  console.log("    ✓ Rate limit set: 1M DWT per block");

  const tx2 = await lockEngine.setCooldown(WITHDRAW_ACTION, 86400); // 24 hours
  await tx2.wait();
  console.log("    ✓ Cooldown set: 24 hours");

  const tx3 = await lockEngine.setTimeDelay(UPGRADE_ACTION, 172800); // 48 hours
  await tx3.wait();
  console.log("    ✓ Time delay set: 48 hours");

  // Activate test layer
  const LAYER_TEST = hre.ethers.id("LAYER_TEST");
  const tx4 = await lockEngine.setLayerState(LAYER_TEST, true);
  await tx4.wait();
  console.log("    ✓ Test layer activated");

  // Configure SecurityController
  console.log("  • Configuring SecurityController thresholds...");
  const tx5 = await securityController.updateThreatThresholds(30, 70, 90, 95);
  await tx5.wait();
  console.log("    ✓ Threat thresholds: LOW=30, MEDIUM=70, HIGH=90, CRITICAL=95");

  const tx6 = await securityController.setAutoResponseEnabled(true);
  await tx6.wait();
  console.log("    ✓ Auto-response enabled");

  // ───────────────────────────────────────────────────────────────────────────
  // Summary
  // ───────────────────────────────────────────────────────────────────────────
  
  console.log("\n" + "=".repeat(80));
  console.log("🎉 DEPLOYMENT COMPLETE ON BASE SEPOLIA!");
  console.log("=".repeat(80));
  console.log("\n📦 Deployed Contracts:");
  console.log("  InvariantChecker:    ", invariantCheckerAddress);
  console.log("  LockEngine:          ", lockEngineAddress);
  console.log("  SecurityController:  ", securityControllerAddress);
  console.log("  GovernanceTimelock:  ", governanceTimelockAddress);
  console.log("  MockLayer7Security:  ", mockLayer7Address);
  console.log("\n🔗 View on Explorer:");
  console.log("  https://sepolia-explorer.base.network/address/", lockEngineAddress);
  console.log("\n📝 Next Steps:");
  console.log("  1. Verify contracts on BaseScan:");
  console.log("     npx hardhat verify --network baseSepolia", lockEngineAddress);
  console.log("  2. Run attack simulations locally");
  console.log("  3. Test integration with frontend");
  console.log("  4. Monitor with dashboard");
  console.log("\n" + "=".repeat(80));

  // Save deployment info
  const deploymentInfo = {
    network: "baseSepolia",
    chainId: Number(network.chainId),
    timestamp: new Date().toISOString(),
    deployer: deployer.address,
    explorer: `https://sepolia-explorer.base.network`,
    contracts: deployedContracts,
  };

  // Write to file
  const outputPath = "./deployments/security-base-sepolia.json";
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
