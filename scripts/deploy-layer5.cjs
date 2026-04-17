const hre = require("hardhat");

async function main() {
  console.log("=".repeat(80));
  console.log("🚀 Deploying Layer 5 - Cross-Chain & Advanced DeFi");
  console.log("=".repeat(80));

  const [deployer] = await hre.ethers.getSigners();
  console.log("\n📝 Deployer address:", deployer.address);
  
  const network = hre.network.name;
  console.log("🌐 Network:", network);
  
  const deployedContracts = {};

  // ───────────────────────────────────────────────────────────────────────────
  // Prerequisites - These should already be deployed
  // ───────────────────────────────────────────────────────────────────────────
  
  console.log("\n⚠️  Prerequisites (should be already deployed):");
  console.log("  - Layer 7 Security contract address");
  console.log("  - Layer 1 DWT token address");
  console.log("  - Price Oracle address (for LimitOrders)");
  console.log("  - Uniswap V3 Position Manager address (for LiquidityIncentive)");
  
  // You should set these addresses based on your deployment
  const LAYER7_SECURITY = process.env.LAYER7_SECURITY || "0x...";
  const DWT_TOKEN = process.env.DWT_TOKEN || "0x...";
  const PRICE_ORACLE = process.env.PRICE_ORACLE || "0x...";
  const UNISWAP_V3_POSITION_MANAGER = process.env.UNISWAP_V3_POSITION_MANAGER || "0x...";
  
  console.log("\n📋 Using addresses:");
  console.log("  Layer 7 Security:", LAYER7_SECURITY);
  console.log("  DWT Token:", DWT_TOKEN);
  console.log("  Price Oracle:", PRICE_ORACLE);
  console.log("  Uniswap V3 Position Manager:", UNISWAP_V3_POSITION_MANAGER);

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
  // Step 4: Deploy LimitOrders
  // ───────────────────────────────────────────────────────────────────────────
  
  console.log("\n" + "─".repeat(80));
  console.log("📊 Step 4: Deploying LimitOrders...");
  
  const LimitOrders = await hre.ethers.getContractFactory("LimitOrders");
  const limitOrders = await LimitOrders.deploy(
    deployer.address,  // admin
    deployer.address,  // operator
    deployer.address,  // guardian
    LAYER7_SECURITY,   // layer7 security
    PRICE_ORACLE       // price oracle
  );
  await limitOrders.waitForDeployment();
  
  const limitOrdersAddress = await limitOrders.getAddress();
  console.log("✅ LimitOrders deployed to:", limitOrdersAddress);
  deployedContracts.LimitOrders = limitOrdersAddress;

  // ───────────────────────────────────────────────────────────────────────────
  // Step 5: Deploy LiquidityIncentive
  // ───────────────────────────────────────────────────────────────────────────
  
  console.log("\n" + "─".repeat(80));
  console.log("💧 Step 5: Deploying LiquidityIncentive...");
  
  const now = Math.floor(Date.now() / 1000);
  const startTimestamp = now + 60; // Start in 1 minute
  const endTimestamp = now + (365 * 24 * 60 * 60); // End in 1 year
  
  const LiquidityIncentive = await hre.ethers.getContractFactory("LiquidityIncentive");
  const liquidityIncentive = await LiquidityIncentive.deploy(
    deployer.address,              // admin
    deployer.address,              // operator
    deployer.address,              // guardian
    LAYER7_SECURITY,               // layer7 security
    UNISWAP_V3_POSITION_MANAGER,   // position manager
    DWT_TOKEN,                     // reward token
    hre.ethers.parseEther("100"),  // emission rate (100 tokens per second)
    startTimestamp,                // start timestamp
    endTimestamp                   // end timestamp
  );
  await liquidityIncentive.waitForDeployment();
  
  const liquidityIncentiveAddress = await liquidityIncentive.getAddress();
  console.log("✅ LiquidityIncentive deployed to:", liquidityIncentiveAddress);
  deployedContracts.LiquidityIncentive = liquidityIncentiveAddress;

  // ───────────────────────────────────────────────────────────────────────────
  // Summary
  // ───────────────────────────────────────────────────────────────────────────
  
  console.log("\n" + "=".repeat(80));
  console.log("🎉 LAYER 5 DEPLOYMENT COMPLETE!");
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
  
  const deploymentFile = `deployment-layer5-${network}-${Date.now()}.json`;
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
  console.log("4. Configure LimitOrders:");
  console.log("   - Verify price oracle is working");
  console.log("   - Test order creation and filling");
  console.log("");
  console.log("5. Configure LiquidityIncentive:");
  console.log("   - Add liquidity pools");
  console.log("   - Set allocation points");
  console.log("   - Fund with reward tokens");
  console.log("");
  console.log("6. Verify contracts on block explorer");
  console.log("7. Run comprehensive tests");
  console.log("=".repeat(80));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
