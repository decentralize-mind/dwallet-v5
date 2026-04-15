import hre from "hardhat";
import fs from "fs";

async function main() {
  console.log("🚀 Deploying Anomaly Detection System...\n");
  
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  
  // Get starting balance
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "ETH\n");
  
  // ─────────────────────────────────────────────────────────────────────
  //  DEPLOY ANOMALY DETECTOR
  // ─────────────────────────────────────────────────────────────────────
  
  console.log("📦 Deploying AnomalyDetector...");
  const AnomalyDetector = await hre.ethers.getContractFactory("AnomalyDetector");
  const anomalyDetector = await AnomalyDetector.deploy(
    deployer.address,                    // admin
    hre.ethers.parseEther("1000000"),    // maxVolumePerBlock (1M tokens)
    500,                                 // maxTxPerBlock
    500,                                 // maxPriceDeviationBps (5%)
    hre.ethers.parseEther("100000")      // largeTxThreshold (100k tokens)
  );
  await anomalyDetector.waitForDeployment();
  const adAddress = await anomalyDetector.getAddress();
  console.log("✅ AnomalyDetector deployed to:", adAddress);
  
  // ─────────────────────────────────────────────────────────────────────
  //  DEPLOY DYNAMIC FEE CONTROLLER
  // ─────────────────────────────────────────────────────────────────────
  
  console.log("\n📦 Deploying DynamicFeeController...");
  const DynamicFeeController = await hre.ethers.getContractFactory("DynamicFeeController");
  const dynamicFee = await DynamicFeeController.deploy(
    deployer.address,        // admin
    adAddress,              // anomaly detector address
    30                      // 0.30% base fee
  );
  await dynamicFee.waitForDeployment();
  const dfAddress = await dynamicFee.getAddress();
  console.log("✅ DynamicFeeController deployed to:", dfAddress);
  
  // ─────────────────────────────────────────────────────────────────────
  //  DEPLOY LAYER7 SECURITY (if not already deployed)
  // ─────────────────────────────────────────────────────────────────────
  
  console.log("\n📦 Deploying Layer7Security...");
  const Layer7Security = await hre.ethers.getContractFactory("Layer7Security");
  const layer7 = await Layer7Security.deploy(
    [deployer.address],      // signers
    1,                       // threshold (1 of 1)
    100,                     // maxCallsPerBlock
    hre.ethers.parseEther("100"), // maxValuePerBlock
    0                        // requiredKYCLevel
  );
  await layer7.waitForDeployment();
  const l7Address = await layer7.getAddress();
  console.log("✅ Layer7Security deployed to:", l7Address);
  
  // ─────────────────────────────────────────────────────────────────────
  //  CONFIGURE INTEGRATION
  // ─────────────────────────────────────────────────────────────────────
  
  console.log("\n⚙️ Configuring integration...");
  
  // Set anomaly detector in Layer7Security
  const tx1 = await layer7.setAnomalyDetector(adAddress);
  await tx1.wait();
  console.log("✅ Anomaly detector set in Layer7Security");
  
  // Enable anomaly detection
  const tx2 = await layer7.setAnomalyDetectionEnabled(true);
  await tx2.wait();
  console.log("✅ Anomaly detection ENABLED");
  
  // Enable auto-pause on critical threats
  const tx3 = await layer7.setAutoPauseOnCritical(true);
  await tx3.wait();
  console.log("✅ Auto-pause on CRITICAL enabled");
  
  // ─────────────────────────────────────────────────────────────────────
  //  SUMMARY
  // ─────────────────────────────────────────────────────────────────────
  
  console.log("\n" + "═".repeat(60));
  console.log("🎉 DEPLOYMENT COMPLETE!");
  console.log("═".repeat(60));
  console.log("\n📋 Contract Addresses:");
  console.log("   AnomalyDetector:     ", adAddress);
  console.log("   DynamicFeeController:", dfAddress);
  console.log("   Layer7Security:      ", l7Address);
  console.log("\n🔧 Configuration:");
  console.log("   - Anomaly Detection: ENABLED ✅");
  console.log("   - Auto-Pause: ENABLED ✅");
  console.log("   - Base Fee: 0.30%");
  console.log("   - Max Volume: 1M tokens/block");
  console.log("   - Max TXs: 500/block");
  console.log("\n📝 Next Steps:");
  console.log("   1. Copy the contract addresses above");
  console.log("   2. Update .env with these addresses");
  console.log("   3. Run monitoring bot: node monitoring/anomaly-detector.js");
  console.log("═".repeat(60) + "\n");
  
  // Save addresses to file for easy access
  const addresses = {
    network: "localhost",
    anomalyDetector: adAddress,
    dynamicFeeController: dfAddress,
    layer7Security: l7Address,
    deployer: deployer.address,
    timestamp: new Date().toISOString()
  };
  
  fs.writeFileSync(
    "./deployed-addresses.json",
    JSON.stringify(addresses, null, 2)
  );
  console.log("💾 Addresses saved to: deployed-addresses.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
