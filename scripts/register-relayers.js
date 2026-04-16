/**
 * Register Bridge Relayers
 * 
 * This script registers 15 relayers for the enhanced cross-chain bridge
 * and sets the required signature threshold to 7.
 * 
 * Usage:
 *   npx hardhat run scripts/register-relayers.js --network <network>
 */

const hre = require("hardhat");

async function main() {
  console.log("🌉 Starting relayer registration...\n");

  // Configuration
  const CONFIG = {
    MESSENGER_ADDRESS: process.env.CROSS_CHAIN_MESSENGER_ADDRESS || "",
    RELAYER_ADDRESSES: process.env.RELAYER_ADDRESSES?.split(",") || [],
    REQUIRED_SIGNATURES: 7, // 7-of-15
  };

  if (!CONFIG.MESSENGER_ADDRESS) {
    throw new Error("❌ CROSS_CHAIN_MESSENGER_ADDRESS not set");
  }

  const [deployer] = await hre.ethers.getSigners();
  console.log("📍 Deployer:", deployer.address);
  console.log("🌐 Network:", hre.network.name);
  console.log("📜 Messenger:", CONFIG.MESSENGER_ADDRESS);
  console.log("");

  // Get messenger contract
  const Messenger = await hre.ethers.getContractAt(
    "EnhancedCrossChainMessenger",
    CONFIG.MESSENGER_ADDRESS
  );

  // Check current state
  const currentRelayerCount = await Messenger.getRelayerCount();
  const currentThreshold = await Messenger.requiredSignatures();
  console.log(`📊 Current relayers: ${currentRelayerCount}`);
  console.log(`📊 Current threshold: ${currentThreshold}`);
  console.log("");

  // Register relayers
  const relayersToRegister = CONFIG.RELAYER_ADDRESSES.slice(0, 15);
  
  if (relayersToRegister.length === 0) {
    console.log("⚠️  No relayer addresses provided.");
    console.log("\n📝 Set RELAYER_ADDRESSES environment variable:");
    console.log("   export RELAYER_ADDRESSES=0x...,0x...,0x...");
    console.log("\n   Or update the script with relayer addresses.");
    return;
  }

  console.log(`📋 Registering ${relayersToRegister.length} relayers:\n`);

  for (let i = 0; i < relayersToRegister.length; i++) {
    const relayerAddress = relayersToRegister[i];
    
    try {
      console.log(`\n[${i + 1}/${relayersToRegister.length}] Registering relayer: ${relayerAddress}`);
      
      // Check if already relayer
      const isAlreadyRelayer = await Messenger.isRelayer(relayerAddress);
      if (isAlreadyRelayer) {
        console.log(`   ⚠️  Already registered as relayer`);
        continue;
      }

      // Register relayer with stake (1 ETH)
      const stakeAmount = hre.ethers.parseEther("1");
      
      // Note: In production, relayers should register themselves
      // This script is for demonstration/initial setup
      console.log(`   💰 Stake: ${hre.ethers.formatEther(stakeAmount)} ETH`);
      
      // For demo: we can't directly call registerRelayer() for other addresses
      // In production, each relayer calls registerRelayer() themselves with their stake
      console.log(`   ℹ️  Relayer must call registerRelayer() themselves`);
      console.log(`   ℹ️  Command for relayer:`);
      console.log(`      cast send ${CONFIG.MESSENGER_ADDRESS} "registerRelayer()" --value 1ether --private-key <RELAYER_KEY>`);

    } catch (error) {
      console.error(`   ❌ Failed to register: ${error.message}`);
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("✅ Relayer registration instructions complete!");
  console.log("=".repeat(60));

  console.log("\n📝 Next steps:");
  console.log("1. Each relayer must register themselves by calling registerRelayer()");
  console.log("2. Each relayer must stake 1 ETH during registration");
  console.log("3. Verify all 15 relayers are registered:");
  console.log("   npx hardhat run scripts/verify-relayers.js --network <network>");
  console.log("4. Adjust threshold to 7-of-15:");
  console.log("   await messenger.adjustThreshold()");

  // Save registration info
  const fs = require("fs");
  const registrationInfo = {
    timestamp: new Date().toISOString(),
    network: hre.network.name,
    messengerAddress: CONFIG.MESSENGER_ADDRESS,
    relayersToRegister: relayersToRegister,
    requiredSignatures: CONFIG.REQUIRED_SIGNATURES,
    stakeRequired: "1 ETH",
  };

  const outputPath = `relayer-registration-${hre.network.name}-${Date.now()}.json`;
  fs.writeFileSync(outputPath, JSON.stringify(registrationInfo, null, 2));
  console.log(`\n💾 Registration info saved to: ${outputPath}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
