const hre = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🔧 Configuring Layer 3 Post-Deployment...\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("📦 Configuring with account:", deployer.address);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", hre.ethers.formatEther(balance), "ETH\n");

  // Load deployment info
  const deploymentFiles = fs.readdirSync('.').filter(f => f.startsWith('deployment-layer3-baseSepolia'));
  if (deploymentFiles.length === 0) {
    console.error("❌ No Layer 3 deployment file found!");
    process.exit(1);
  }
  
  const deploymentFile = deploymentFiles[deploymentFiles.length - 1]; // Use latest
  const deployment = require(`../${deploymentFile}`);
  console.log("📋 Loaded deployment from:", deploymentFile);
  console.log("🕐 Deployment timestamp:", deployment.timestamp, "\n");

  const contracts = deployment.contracts;
  const deps = deployment.dependencies;

  // Get contract instances
  const DWTBridge = await hre.ethers.getContractFactory("DWTBridge");
  const dwtBridge = DWTBridge.attach(contracts.dwtBridge);

  const DWTPriceOracle = await hre.ethers.getContractFactory("DWTPriceOracle");
  const priceOracle = DWTPriceOracle.attach(contracts.priceOracle);

  const EmergencyPause = await hre.ethers.getContractFactory("EmergencyPause");
  const emergencyPause = EmergencyPause.attach(contracts.emergencyPause);

  const FeeSplitter = await hre.ethers.getContractFactory("FeeSplitter");
  const feeSplitter = FeeSplitter.attach(contracts.feeSplitter);

  console.log("=".repeat(60));
  console.log("📝 STEP 1: Register Relayers for DWTBridge");
  console.log("=".repeat(60));

  // Register 5 relayers from .env
  const relayers = [
    process.env.RELAYER_1 || "0x4C0B7314441dfE8E61267C0d87Fc1A657611dCf5",
    process.env.RELAYER_2 || "0xc46A897aF73E46e2FEb5c4Afca5fBAB748B31505",
    process.env.RELAYER_3 || "0xAc17fb8B5738DeF637A417A81Cd728A751b7411b",
    process.env.RELAYER_4 || "0x96f4107A107e7753CE6E13Bb6B810140Ea20069d",
    process.env.RELAYER_5 || "0x50D5D091ea97BABeE5d8b9A9E931DE87319def62"
  ];

  for (let i = 0; i < relayers.length; i++) {
    const relayer = relayers[i];
    console.log(`\n[${i + 1}/5] Adding relayer: ${relayer}`);
    
    try {
      const tx = await dwtBridge.addRelayer(relayer);
      await tx.wait();
      console.log(`✅ Relayer ${i + 1} added`);
    } catch (error) {
      if (error.message.includes("Already a relayer")) {
        console.log(`ℹ️  Relayer ${i + 1} already registered`);
      } else {
        throw error;
      }
    }
  }

  // Verify required signatures
  const requiredSigs = await dwtBridge.requiredSignatures();
  console.log(`\n✅ Bridge configured with ${requiredSigs} required signatures`);

  console.log("\n" + "=".repeat(60));
  console.log("📡 STEP 2: Register Price Feeds in DWTPriceOracle");
  console.log("=".repeat(60));

  // Register DWT/USD price feed (using mock aggregator for now)
  const dwtToken = deps.dwtToken;
  const mockAggregator = "0x0000000000000000000000000000000000000001"; // Placeholder
  
  console.log("\n📊 Registering DWT/USD price feed...");
  console.log("   Token:", dwtToken);
  console.log("   Aggregator:", mockAggregator);
  console.log("   Staleness: 3600 seconds (1 hour)");
  
  let tx = await priceOracle.registerPriceFeed(dwtToken, mockAggregator, 3600);
  await tx.wait();
  console.log("✅ DWT/USD price feed registered");

  // Set fallback price
  const fallbackPrice = hre.ethers.parseEther("1.00"); // $1.00 fallback
  console.log("\n💰 Setting fallback price: $1.00");
  tx = await priceOracle.setFallbackPrice(dwtToken, fallbackPrice);
  await tx.wait();
  console.log("✅ Fallback price set");

  // Verify price feed
  const feed = await priceOracle.priceFeeds(dwtToken);
  console.log("\n📋 Price Feed Status:");
  console.log("   Active:", feed.isActive);
  console.log("   Staleness Threshold:", feed.stalenessThreshold, "seconds");
  console.log("   Fallback Price:", hre.ethers.formatEther(feed.fallbackPrice), "USD");

  console.log("\n" + "=".repeat(60));
  console.log("🚨 STEP 3: Register Contracts in EmergencyPause");
  console.log("=".repeat(60));

  // Register all Layer 3 contracts for emergency pause
  const contractsToRegister = [
    { name: "DWT Token", address: deps.dwtToken },
    { name: "Swap Router", address: deps.swapRouter },
    { name: "Price Oracle", address: contracts.priceOracle },
    { name: "DWT Bridge", address: contracts.dwtBridge },
    { name: "Fee Splitter", address: contracts.feeSplitter },
    { name: "Buyback & Burn", address: contracts.buybackAndBurn },
    { name: "VeDWT", address: contracts.veDWT },
    { name: "Multisig", address: contracts.dwalletMultisig },
    { name: "Reward Distributor", address: contracts.rewardDistributor }
  ];

  for (let i = 0; i < contractsToRegister.length; i++) {
    const contract = contractsToRegister[i];
    console.log(`\n[${i + 1}/${contractsToRegister.length}] Registering ${contract.name}...`);
    console.log(`   Address: ${contract.address}`);
    
    try {
      tx = await emergencyPause.registerContract(contract.address);
      await tx.wait();
      console.log(`✅ ${contract.name} registered`);
    } catch (error) {
      if (error.message.includes("Already registered")) {
        console.log(`ℹ️  ${contract.name} already registered`);
      } else {
        throw error;
      }
    }
  }

  // Verify registration count
  const registeredCount = await emergencyPause.getRegisteredCount();
  console.log(`\n✅ Total contracts registered: ${registeredCount}`);

  console.log("\n" + "=".repeat(60));
  console.log("💸 STEP 4: Configure FeeSplitter");
  console.log("=".repeat(60));

  // Configure FeeSplitter with correct addresses
  const treasury = deps.treasury;
  const rewardDistributor = contracts.rewardDistributor;
  const buybackAndBurn = contracts.buybackAndBurn;

  console.log("\n📋 Current Fee Splitter Configuration:");
  const currentConfig = await feeSplitter.defaultConfig();
  console.log("   Treasury:", currentConfig.treasury);
  console.log("   Reward Distributor:", currentConfig.rewardDistributor);
  console.log("   Buyback & Burn:", currentConfig.buybackAndBurn);
  console.log("   Treasury BPS:", Number(currentConfig.treasuryBps), `(${Number(currentConfig.treasuryBps) / 100}%)`);
  console.log("   Reward BPS:", Number(currentConfig.rewardBps), `(${Number(currentConfig.rewardBps) / 100}%)`);
  console.log("   Buyback BPS:", Number(currentConfig.buybackBps), `(${Number(currentConfig.buybackBps) / 100}%)`);

  console.log("\n🔄 Updating FeeSplitter configuration...");
  console.log("   Treasury:", treasury);
  console.log("   Reward Distributor:", rewardDistributor);
  console.log("   Buyback & Burn:", buybackAndBurn);
  console.log("   Split: 40% Treasury, 40% Rewards, 20% Buyback");

  tx = await feeSplitter.updateDefaultConfig(
    treasury,
    rewardDistributor,
    buybackAndBurn,
    4000, // 40% treasury
    4000, // 40% rewards
    2000  // 20% buyback
  );
  await tx.wait();
  console.log("✅ FeeSplitter configuration updated");

  // Verify new configuration
  const newConfig = await feeSplitter.defaultConfig();
  console.log("\n📋 New Fee Splitter Configuration:");
  console.log("   Treasury:", newConfig.treasury);
  console.log("   Reward Distributor:", newConfig.rewardDistributor);
  console.log("   Buyback & Burn:", newConfig.buybackAndBurn);
  console.log("   Treasury BPS:", Number(newConfig.treasuryBps), `(${Number(newConfig.treasuryBps) / 100}%)`);
  console.log("   Reward BPS:", Number(newConfig.rewardBps), `(${Number(newConfig.rewardBps) / 100}%)`);
  console.log("   Buyback BPS:", Number(newConfig.buybackBps), `(${Number(newConfig.buybackBps) / 100}%)`);

  console.log("\n" + "=".repeat(60));
  console.log("🔍 STEP 5: Verify Contracts on BaseScan");
  console.log("=".repeat(60));

  console.log("\n⏳ Waiting for block confirmations before verification...");
  console.log("   (Waiting 30 seconds for blocks to propagate)\n");
  
  // Wait for block confirmations
  await new Promise(resolve => setTimeout(resolve, 30000));

  const contractsToVerify = [
    { name: "DWTPriceOracle", address: contracts.priceOracle },
    { name: "EmergencyPause", address: contracts.emergencyPause },
    { name: "DWTBridge", address: contracts.dwtBridge },
    { name: "FeeSplitter", address: contracts.feeSplitter },
    { name: "BuybackAndBurn", address: contracts.buybackAndBurn },
    { name: "VeDWT", address: contracts.veDWT },
    { name: "DWalletMultisig", address: contracts.dwalletMultisig },
    { name: "RewardDistributor", address: contracts.rewardDistributor }
  ];

  console.log("📝 Starting contract verification on BaseScan...\n");

  for (let i = 0; i < contractsToVerify.length; i++) {
    const contract = contractsToVerify[i];
    console.log(`\n[${i + 1}/${contractsToVerify.length}] Verifying ${contract.name}...`);
    console.log(`   Address: ${contract.address}`);
    
    try {
      await hre.run("verify:verify", {
        address: contract.address,
        constructorArguments: [],
        contract: `contracts/layer3/${contract.name}.sol:${contract.name}`
      });
      console.log(`✅ ${contract.name} verified on BaseScan`);
    } catch (error) {
      if (error.message.includes("Already Verified")) {
        console.log(`ℹ️  ${contract.name} already verified on BaseScan`);
      } else {
        console.log(`⚠️  ${contract.name} verification failed: ${error.message}`);
        console.log("   You can manually verify later with:");
        console.log(`   npx hardhat verify --network baseSepolia ${contract.address}`);
      }
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("🎉 LAYER 3 POST-DEPLOYMENT CONFIGURATION COMPLETE!");
  console.log("=".repeat(60));

  // Save configuration summary
  const configSummary = {
    ...deployment,
    configuration: {
      timestamp: new Date().toISOString(),
      relayers: relayers,
      priceFeeds: [
        {
          token: dwtToken,
          aggregator: mockAggregator,
          stalenessThreshold: 3600,
          fallbackPrice: "1.00 USD"
        }
      ],
      emergencyPauseContracts: contractsToRegister.map(c => c.address),
      feeSplitterConfig: {
        treasury: treasury,
        rewardDistributor: rewardDistributor,
        buybackAndBurn: buybackAndBurn,
        treasuryBps: 4000,
        rewardBps: 4000,
        buybackBps: 2000
      }
    },
    verificationStatus: "In Progress - Check BaseScan for individual contract status"
  };

  const summaryFile = `layer3-config-${hre.network.name}-${Date.now()}.json`;
  fs.writeFileSync(summaryFile, JSON.stringify(configSummary, null, 2));
  console.log("\n💾 Configuration summary saved to:", summaryFile);

  console.log("\n📊 Final Configuration Summary:");
  console.log("   ✅ 5 Relayers registered for DWTBridge");
  console.log("   ✅ DWT/USD price feed registered with fallback");
  console.log("   ✅ 9 contracts registered in EmergencyPause");
  console.log("   ✅ FeeSplitter configured (40/40/20 split)");
  console.log("   ⏳ Contract verification in progress on BaseScan");

  console.log("\n🔗 View contracts on BaseScan:");
  console.log("   https://sepolia.basescan.org/address/" + contracts.priceOracle);
  console.log("\n✅ Layer 3 is now fully configured and operational!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
