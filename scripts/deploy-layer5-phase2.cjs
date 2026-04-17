const hre = require("hardhat");

async function main() {
  console.log("=".repeat(80));
  console.log("🚀 Layer 5 Phase 2 Deployment");
  console.log("=".repeat(80));

  const [deployer] = await hre.ethers.getSigners();
  console.log("\n📝 Deployer address:", deployer.address);
  
  const network = hre.network.name;
  console.log("🌐 Network:", network);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("💰 Deployer balance:", hre.ethers.formatEther(balance), "ETH\n");

  // Layer 7 Security address
  const LAYER7_SECURITY = "0x20d859c9EB3FA612C604213F74dcC6Ae49Cd040c";
  const DWT_TOKEN = hre.ethers.getAddress("0x769F23dd0F6bc92C9d9d914190Ae9006d3FbDe48");
  
  console.log("📋 Configuration:");
  console.log("  Layer7 Security:", LAYER7_SECURITY);
  console.log("  DWT Token:", DWT_TOKEN);
  console.log("  Guardian:", deployer.address);
  console.log("  Admin:", deployer.address);

  // ───────────────────────────────────────────────────────────────────────────
  // Step 1: Deploy Test Oracle (if no Chainlink oracle available)
  // ───────────────────────────────────────────────────────────────────────────
  
  console.log("\n" + "─".repeat(80));
  console.log("📊 Step 1: Deploying Test Price Oracle...");
  
  const TestPriceOracle = await hre.ethers.getContractFactory("TestPriceOracle");
  const testOracle = await TestPriceOracle.deploy();
  await testOracle.waitForDeployment();
  
  const testOracleAddress = await testOracle.getAddress();
  console.log("✅ TestPriceOracle deployed:", testOracleAddress);
  
  // Set initial prices
  console.log("\n  Setting initial test prices...");
  
  // Get DWT token address for price setup
  const DWT_PRICE = 1 * 10**8; // $1.00 with 8 decimals
  const ETH_PRICE = 2000 * 10**8; // $2000 with 8 decimals
  
  await testOracle.updatePrice(DWT_TOKEN, DWT_PRICE);
  console.log(`  ✅ DWT price: $1.00`);
  
  await testOracle.updatePrice(hre.ethers.ZeroAddress, ETH_PRICE);
  console.log(`  ✅ ETH price: $2,000.00`);
  
  // Verify prices
  const [dwtPrice, dwtTime] = await testOracle.getLatestPrice(DWT_TOKEN);
  console.log(`  ✅ DWT price verified: ${Number(dwtPrice) / 10**8} USD`);

  // ───────────────────────────────────────────────────────────────────────────
  // Step 2: Deploy LimitOrders
  // ───────────────────────────────────────────────────────────────────────────
  
  console.log("\n" + "─".repeat(80));
  console.log("📈 Step 2: Deploying LimitOrders...");
  
  const LimitOrders = await hre.ethers.getContractFactory("LimitOrders");
  const limitOrders = await LimitOrders.deploy(
    deployer.address,         // admin
    deployer.address,         // operator
    deployer.address,         // guardian
    LAYER7_SECURITY,          // layer7 security
    testOracleAddress         // price oracle (test oracle)
  );
  await limitOrders.waitForDeployment();
  
  const limitOrdersAddress = await limitOrders.getAddress();
  console.log("✅ LimitOrders deployed:", limitOrdersAddress);
  
  // Configure LimitOrders
  console.log("\n  Configuring LimitOrders...");
  
  const setFeeTx = await limitOrders.setFillerFee(10); // 0.10%
  await setFeeTx.wait();
  console.log("  ✅ Filler fee set: 0.10%");
  
  // Verify configuration
  const fillerFee = await limitOrders.fillerFeeBps();
  console.log(`  ✅ Verified - Filler fee: ${fillerFee} bps`);

  // ───────────────────────────────────────────────────────────────────────────
  // Step 3: Deploy LiquidityIncentive
  // ───────────────────────────────────────────────────────────────────────────
  
  console.log("\n" + "─".repeat(80));
  console.log("💧 Step 3: Deploying LiquidityIncentive...");
  
  // Uniswap V3 Position Manager on Base Sepolia
  // Source: https://docs.base.org/base-chain/network-information/ecosystem-contracts
  const UNISWAP_POSITION_MANAGER = "0x27F971cb582BF9E50F397e4d29a5C7A34f11faA2";
  
  console.log("  Uniswap V3 Position Manager:", UNISWAP_POSITION_MANAGER);
  
  const LiquidityIncentive = await hre.ethers.getContractFactory("LiquidityIncentive");
  
  // Set reward emission: 100 DWT per day for 1 year
  const EMISSION_RATE = hre.ethers.parseEther("100"); // 100 DWT per day
  const START_TIMESTAMP = Math.floor(Date.now() / 1000); // Now
  const END_TIMESTAMP = START_TIMESTAMP + (365 * 24 * 60 * 60); // 1 year
  
  const liquidityIncentive = await LiquidityIncentive.deploy(
    deployer.address,              // admin
    deployer.address,              // operator
    deployer.address,              // guardian
    LAYER7_SECURITY,               // layer7 security
    UNISWAP_POSITION_MANAGER,      // Uniswap V3 position manager
    DWT_TOKEN,                     // reward token (DWT)
    EMISSION_RATE,                 // emission rate (100 DWT/day)
    START_TIMESTAMP,               // start timestamp
    END_TIMESTAMP                  // end timestamp (1 year)
  );
  await liquidityIncentive.waitForDeployment();
  
  const liquidityIncentiveAddress = await liquidityIncentive.getAddress();
  console.log("✅ LiquidityIncentive deployed:", liquidityIncentiveAddress);
  
  // Verify Uniswap integration
  const positionManager = await liquidityIncentive.positionManager();
  console.log("  ✅ Position Manager verified:", positionManager);
  
  // ───────────────────────────────────────────────────────────────────────────
  // Summary
  // ───────────────────────────────────────────────────────────────────────────
  
  console.log("\n" + "=".repeat(80));
  console.log("🎉 LAYER 5 PHASE 2 DEPLOYMENT COMPLETE!");
  console.log("=".repeat(80));
  
  console.log("\n📊 Deployed Contracts:");
  console.log("─".repeat(80));
  console.log("TestPriceOracle:");
  console.log(`  Address: ${testOracleAddress}`);
  console.log(`  DWT Price: $1.00`);
  console.log(`  ETH Price: $2,000.00`);
  console.log(`  BaseScan: https://sepolia.basescan.org/address/${testOracleAddress}`);
  
  console.log("\nLimitOrders:");
  console.log(`  Address: ${limitOrdersAddress}`);
  console.log(`  Oracle: ${testOracleAddress}`);
  console.log(`  Filler Fee: 0.10%`);
  console.log(`  Max Slippage: 5%`);
  console.log(`  BaseScan: https://sepolia.basescan.org/address/${limitOrdersAddress}`);
  
  console.log("\nLiquidityIncentive:");
  console.log(`  Address: ${liquidityIncentiveAddress}`);
  console.log(`  Uniswap V3 PM: ${UNISWAP_POSITION_MANAGER}`);
  console.log(`  Reward Token: DWT`);
  console.log(`  BaseScan: https://sepolia.basescan.org/address/${liquidityIncentiveAddress}`);
  
  console.log("\n" + "=".repeat(80));
  console.log("📋 Complete Layer 5 Architecture:");
  console.log("=".repeat(80));
  console.log("Phase 1 (Deployed Earlier):");
  console.log("  ✅ CrossChainMessenger: 0x64f3fFdE0bbA86e072a2595Cd550AeC44a1e0e38");
  console.log("  ✅ FlashLoan: 0x468772f20864403A0071690ef8c620D9E02BD649");
  console.log("  ✅ InsuranceFund: 0x8ba2Bb332764217079DFFb280dD70C8B351B5770");
  console.log("\nPhase 2 (Just Deployed):");
  console.log(`  ✅ TestPriceOracle: ${testOracleAddress}`);
  console.log(`  ✅ LimitOrders: ${limitOrdersAddress}`);
  console.log(`  ✅ LiquidityIncentive: ${liquidityIncentiveAddress}`);
  
  console.log("\n" + "=".repeat(80));
  console.log("🔗 All BaseScan Links:");
  console.log("=".repeat(80));
  console.log("Phase 1:");
  console.log("  https://sepolia.basescan.org/address/0x64f3fFdE0bbA86e072a2595Cd550AeC44a1e0e38");
  console.log("  https://sepolia.basescan.org/address/0x468772f20864403A0071690ef8c620D9E02BD649");
  console.log("  https://sepolia.basescan.org/address/0x8ba2Bb332764217079DFFb280dD70C8B351B5770");
  console.log("\nPhase 2:");
  console.log(`  https://sepolia.basescan.org/address/${testOracleAddress}`);
  console.log(`  https://sepolia.basescan.org/address/${limitOrdersAddress}`);
  console.log(`  https://sepolia.basescan.org/address/${liquidityIncentiveAddress}`);
  
  console.log("\n" + "=".repeat(80));
  console.log("📝 Next Steps:");
  console.log("=".repeat(80));
  console.log("1. ✅ All 6 Layer 5 contracts deployed");
  console.log("2. ⏳ Verify contracts on BaseScan (manual)");
  console.log("3. ⏳ Add reward pools to LiquidityIncentive");
  console.log("4. ⏳ Test LimitOrders functionality");
  console.log("5. ⏳ Fund FlashLoan and InsuranceFund pools");
  console.log("=".repeat(80));
  
  // Save deployment info
  const deploymentInfo = {
    network: network,
    timestamp: new Date().toISOString(),
    contracts: {
      testPriceOracle: testOracleAddress,
      limitOrders: limitOrdersAddress,
      liquidityIncentive: liquidityIncentiveAddress,
      // Phase 1 contracts
      crossChainMessenger: "0x64f3fFdE0bbA86e072a2595Cd550AeC44a1e0e38",
      flashLoan: "0x468772f20864403A0071690ef8c620D9E02BD649",
      insuranceFund: "0x8ba2Bb332764217079DFFb280dD70C8B351B5770"
    },
    configuration: {
      layer7Security: LAYER7_SECURITY,
      dwtToken: DWT_TOKEN,
      uniswapPositionManager: UNISWAP_POSITION_MANAGER,
      deployer: deployer.address
    }
  };
  
  const fs = require('fs');
  const deploymentFile = `deployment-layer5-phase2-${network}-${Date.now()}.json`;
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
  console.log(`\n💾 Deployment info saved to: ${deploymentFile}`);
  console.log("=".repeat(80));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
