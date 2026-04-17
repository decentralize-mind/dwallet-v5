const hre = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🔍 Verifying Layer 3 Contracts on BaseScan...\n");

  // Load deployment info
  const deploymentFiles = fs.readdirSync('.').filter(f => f.startsWith('deployment-layer3-baseSepolia'));
  if (deploymentFiles.length === 0) {
    console.error("❌ No Layer 3 deployment file found!");
    process.exit(1);
  }
  
  const deploymentFile = deploymentFiles[deploymentFiles.length - 1];
  const deployment = require(`../${deploymentFile}`);
  
  const contracts = deployment.contracts;
  const deps = deployment.dependencies;

  console.log("📋 Verifying contracts from deployment:", deploymentFile);
  console.log("🕐 Deployed at:", deployment.timestamp, "\n");

  // Contract verification with constructor arguments
  const verificationTasks = [
    {
      name: "DWTPriceOracle",
      address: contracts.priceOracle,
      contract: "contracts/layer3/DWTPriceOracle.sol:DWTPriceOracle",
      args: [deps.securityController]
    },
    {
      name: "EmergencyPause",
      address: contracts.emergencyPause,
      contract: "contracts/layer3/EmergencyPause.sol:EmergencyPause",
      args: [deps.securityController]
    },
    {
      name: "DWTBridge",
      address: contracts.dwtBridge,
      contract: "contracts/layer3/DWTBridge.sol:DWTBridge",
      args: [deps.securityController, 3]
    },
    {
      name: "FeeSplitter",
      address: contracts.feeSplitter,
      contract: "contracts/layer3/FeeSplitter.sol:FeeSplitter",
      args: [
        deps.securityController,
        deps.treasury,
        deployment.deployer, // rewardDistributor placeholder
        deployment.deployer  // buybackAndBurn placeholder
      ]
    },
    {
      name: "BuybackAndBurn",
      address: contracts.buybackAndBurn,
      contract: "contracts/layer3/BuybackAndBurn.sol:BuybackAndBurn",
      args: [
        deps.securityController,
        deps.dwtToken,
        deps.swapRouter
      ]
    },
    {
      name: "VeDWT",
      address: contracts.veDWT,
      contract: "contracts/layer3/VeDWT.sol:VeDWT",
      args: [deps.securityController, deps.dwtToken]
    },
    {
      name: "DWalletMultisig",
      address: contracts.dwalletMultisig,
      contract: "contracts/layer3/DWalletMultisig.sol:DWalletMultisig",
      args: [
        deps.securityController,
        [
          deployment.deployer,
          "0x1234567890123456789012345678901234567890",
          "0x2345678901234567890123456789012345678901",
          "0x3456789012345678901234567890123456789012",
          "0x4567890123456789012345678901234567890123"
        ],
        3
      ]
    },
    {
      name: "RewardDistributor",
      address: contracts.rewardDistributor,
      contract: "contracts/layer3/RewardDistributor.sol:RewardDistributor",
      args: [
        deployment.deployer, // _dwtStaking
        deployment.deployer, // _stakingPool
        deployment.deployer, // _boostedStaking
        deps.treasury, // _treasury
        deps.dwtToken, // _dwtToken
        deps.swapRouter, // _swapRouter
        contracts.priceOracle, // _priceOracle
        "0x4200000000000000000000000000000000000006", // _weth
        deps.securityController, // _securityController
        deployment.deployer, // _registry
        deployment.deployer, // _access
        deployment.deployer, // _time
        deployment.deployer, // _state
        deployment.deployer, // _rate
        deployment.deployer, // _verify
        deployment.deployer // _owner
      ]
    }
  ];

  console.log("📝 Starting verification for", verificationTasks.length, "contracts...\n");

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < verificationTasks.length; i++) {
    const task = verificationTasks[i];
    console.log(`\n[${i + 1}/${verificationTasks.length}] Verifying ${task.name}...`);
    console.log(`   Address: ${task.address}`);
    console.log(`   Constructor Args: ${task.args.length} parameters`);
    
    try {
      await hre.run("verify:verify", {
        address: task.address,
        constructorArguments: task.args,
        contract: task.contract
      });
      console.log(`✅ ${task.name} verified successfully!`);
      successCount++;
    } catch (error) {
      if (error.message.includes("Already Verified")) {
        console.log(`ℹ️  ${task.name} already verified on BaseScan`);
        successCount++;
      } else {
        console.log(`❌ ${task.name} verification failed:`);
        console.log(`   ${error.message}`);
        failCount++;
      }
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("📊 VERIFICATION SUMMARY");
  console.log("=".repeat(60));
  console.log(`✅ Successful: ${successCount}/${verificationTasks.length}`);
  console.log(`❌ Failed: ${failCount}/${verificationTasks.length}`);
  
  if (failCount > 0) {
    console.log("\n⚠️  Some contracts failed verification.");
    console.log("You can manually verify them later with:");
    console.log("   npx hardhat verify --network baseSepolia <ADDRESS> [CONSTRUCTOR_ARGS]");
  } else {
    console.log("\n🎉 All contracts verified successfully!");
  }

  console.log("\n🔗 View contracts on BaseScan:");
  console.log("   https://sepolia.basescan.org/address/" + contracts.priceOracle);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
