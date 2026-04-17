const hre = require("hardhat");

async function main() {
  console.log("=".repeat(80));
  console.log("🚀 Deploying Layer 5 - Core Contracts (Phase 1)");
  console.log("=".repeat(80));

  const [deployer] = await hre.ethers.getSigners();
  console.log("\n📝 Deployer address:", deployer.address);
  
  const network = hre.network.name;
  console.log("🌐 Network:", network);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("💰 Deployer balance:", hre.ethers.formatEther(balance), "ETH");
  
  const deployedContracts = {};

  // ───────────────────────────────────────────────────────────────────────────
  // Prerequisites
  // ───────────────────────────────────────────────────────────────────────────
  
  const LAYER7_SECURITY = process.env.LAYER7_SECURITY_ADDRESS || "0x20d859c9EB3FA612C604213F74dcC6Ae49Cd040c";
  
  console.log("\n📋 Using addresses:");
  console.log("  Layer 7 Security:", LAYER7_SECURITY);

  // ───────────────────────────────────────────────────────────────────────────
  // Step 1: Deploy CrossChainMessenger
  // ───────────────────────────────────────────────────────────────────────────
  
  console.log("\n" + "─".repeat(80));
  console.log("📡 Step 1: Deploying CrossChainMessenger...");
  
  const CrossChainMessenger = await hre.ethers.getContractFactory("CrossChainMessenger");
  const crossChainMessenger = await CrossChainMessenger.deploy(
    deployer.address,  // admin
    deployer.address,  // operator
    deployer.address,  // guardian
    LAYER7_SECURITY,   // layer7 security
    "LayerZero"        // initial provider
  );
  await crossChainMessenger.waitForDeployment();
  
  const crossChainMessengerAddress = await crossChainMessenger.getAddress();
  console.log("✅ CrossChainMessenger deployed to:", crossChainMessengerAddress);
  deployedContracts.CrossChainMessenger = crossChainMessengerAddress;

  // ───────────────────────────────────────────────────────────────────────────
  // Step 2: Deploy FlashLoan
  // ───────────────────────────────────────────────────────────────────────────
  
  console.log("\n" + "─".repeat(80));
  console.log("⚡ Step 2: Deploying FlashLoan...");
  
  const FlashLoan = await hre.ethers.getContractFactory("FlashLoan");
  const flashLoan = await FlashLoan.deploy(
    deployer.address,  // admin
    deployer.address,  // guardian
    LAYER7_SECURITY    // layer7 security
  );
  await flashLoan.waitForDeployment();
  
  const flashLoanAddress = await flashLoan.getAddress();
  console.log("✅ FlashLoan deployed to:", flashLoanAddress);
  deployedContracts.FlashLoan = flashLoanAddress;

  // ───────────────────────────────────────────────────────────────────────────
  // Step 3: Deploy InsuranceFund
  // ───────────────────────────────────────────────────────────────────────────
  
  console.log("\n" + "─".repeat(80));
  console.log("🛡️  Step 3: Deploying InsuranceFund...");
  
  const InsuranceFund = await hre.ethers.getContractFactory("InsuranceFund");
  const insuranceFund = await InsuranceFund.deploy(
    deployer.address,  // admin
    deployer.address,  // claims assessor
    deployer.address,  // guardian
    LAYER7_SECURITY    // layer7 security
  );
  await insuranceFund.waitForDeployment();
  
  const insuranceFundAddress = await insuranceFund.getAddress();
  console.log("✅ InsuranceFund deployed to:", insuranceFundAddress);
  deployedContracts.InsuranceFund = insuranceFundAddress;

  // ───────────────────────────────────────────────────────────────────────────
  // Summary
  // ───────────────────────────────────────────────────────────────────────────
  
  console.log("\n" + "=".repeat(80));
  console.log("🎉 LAYER 5 PHASE 1 DEPLOYMENT COMPLETE!");
  console.log("=".repeat(80));
  
  console.log("\n📊 Deployed Contracts:");
  console.log("─".repeat(80));
  for (const [name, address] of Object.entries(deployedContracts)) {
    console.log(`${name.padEnd(25)} ${address}`);
  }
  
  console.log("\n📝 Deployment Summary:");
  console.log("  Network:", network);
  console.log("  Deployer:", deployer.address);
  console.log("  Timestamp:", new Date().toISOString());
  
  // Save deployment addresses
  const fs = require("fs");
  const deploymentInfo = {
    network: network,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: deployedContracts
  };
  
  const deploymentFile = `deployment-layer5-phase1-${network}-${Date.now()}.json`;
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
  console.log("\n💾 Deployment info saved to:", deploymentFile);
  
  console.log("\n" + "=".repeat(80));
  console.log("⚙️  Post-Deployment Tasks:");
  console.log("=".repeat(80));
  console.log("1. Configure CrossChainMessenger:");
  console.log("   - Set daily message caps for supported chains");
  console.log("   - Add bridge providers (LayerZero, Axelar)");
  console.log("");
  console.log("2. Configure FlashLoan:");
  console.log("   - Add supported tokens");
  console.log("   - Set flash loan fees");
  console.log("   - Fund the pool with initial liquidity");
  console.log("");
  console.log("3. Configure InsuranceFund:");
  console.log("   - Fund the insurance pool");
  console.log("   - Set up claims assessors");
  console.log("");
  console.log("4. Next Phase - Deploy LimitOrders & LiquidityIncentive:");
  console.log("   - Need Price Oracle address");
  console.log("   - Need Uniswap V3 Position Manager address");
  console.log("=".repeat(80));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
