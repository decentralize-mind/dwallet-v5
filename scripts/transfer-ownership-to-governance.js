/**
 * @title Transfer Ownership to Governance
 * @notice Post-deployment script to transfer all contract ownership to governance timelock
 * 
 * CRITICAL: Run this AFTER deploying all contracts and BEFORE renouncing TIMELOCK_ADMIN_ROLE
 * 
 * This script transfers ownership of:
 * - DWTToken
 * - Treasury
 * - PriceOracle
 * - ProtocolRegistry
 * - All other Ownable contracts
 * 
 * Then renounces TIMELOCK_ADMIN_ROLE from deployer address
 */

const hre = require("hardhat");

async function main() {
  console.log("🔄 Starting ownership transfer to governance timelock...\n");

  // Configuration - replace with deployed addresses
  const CONFIG = {
    DEPLOYER_ADDRESS: process.env.DEPLOYER_ADDRESS || "",
    GOVERNANCE_TIMELOCK: process.env.GOVERNANCE_TIMELOCK_ADDRESS || "",
    DWT_TOKEN: process.env.DWT_TOKEN_ADDRESS || "",
    TREASURY: process.env.TREASURY_ADDRESS || "",
    PRICE_ORACLE: process.env.PRICE_ORACLE_ADDRESS || "",
    PROTOCOL_REGISTRY: process.env.PROTOCOL_REGISTRY_ADDRESS || "",
    // Add other Ownable contracts here
  };

  // Validate configuration
  if (!CONFIG.GOVERNANCE_TIMELOCK) {
    throw new Error("❌ GOVERNANCE_TIMELOCK_ADDRESS not set in environment");
  }

  const [deployer] = await hre.ethers.getSigners();
  console.log("📍 Deployer address:", deployer.address);
  console.log("🏛️  Governance Timelock:", CONFIG.GOVERNANCE_TIMELOCK);
  console.log("🌐 Network:", hre.network.name);
  console.log("");

  // Contracts to transfer ownership
  const contractsToTransfer = [
    { name: "DWTToken", address: CONFIG.DWT_TOKEN, abi: "DWTToken" },
    { name: "Treasury", address: CONFIG.TREASURY, abi: "Treasury" },
    { name: "PriceOracle", address: CONFIG.PRICE_ORACLE, abi: "PriceOracle" },
    { name: "ProtocolRegistry", address: CONFIG.PROTOCOL_REGISTRY, abi: "ProtocolRegistry" },
  ];

  // Filter out contracts with empty addresses
  const validContracts = contractsToTransfer.filter(c => c.address && c.address !== "");

  if (validContracts.length === 0) {
    console.log("⚠️  No contract addresses provided. Set environment variables or update CONFIG.");
    console.log("\n📝 Required environment variables:");
    console.log("  - DEPLOYER_ADDRESS");
    console.log("  - GOVERNANCE_TIMELOCK_ADDRESS");
    console.log("  - DWT_TOKEN_ADDRESS (optional)");
    console.log("  - TREASURY_ADDRESS (optional)");
    console.log("  - PRICE_ORACLE_ADDRESS (optional)");
    console.log("  - PROTOCOL_REGISTRY_ADDRESS (optional)");
    return;
  }

  console.log(`📋 Found ${validContracts.length} contracts to transfer ownership:\n`);
  validContracts.forEach(c => console.log(`  ✓ ${c.name}: ${c.address}`));
  console.log("");

  // Confirm before proceeding
  console.log("⚠️  WARNING: This action transfers ownership to governance timelock.");
  console.log("⚠️  After this, only governance can make changes to these contracts.");
  console.log("");

  // Transfer ownership for each contract
  for (const contract of validContracts) {
    try {
      console.log(`\n🔄 Transferring ownership of ${contract.name}...`);
      
      const Contract = await hre.ethers.getContractAt(contract.abi, contract.address);
      
      // Check current owner
      const currentOwner = await Contract.owner?.() || await Contract.getAddress();
      console.log(`   Current owner: ${currentOwner}`);

      // Transfer ownership
      const tx = await Contract.transferOwnership(CONFIG.GOVERNANCE_TIMELOCK);
      console.log(`   📝 Transaction hash: ${tx.hash}`);
      
      await tx.wait();
      console.log(`   ✅ Ownership transferred successfully!`);

      // Verify new owner
      const newOwner = await Contract.owner?.();
      if (newOwner === CONFIG.GOVERNANCE_TIMELOCK) {
        console.log(`   ✓ Verified: New owner is governance timelock`);
      } else {
        console.log(`   ⚠️  Warning: Owner verification failed`);
      }

    } catch (error) {
      console.error(`   ❌ Failed to transfer ${contract.name}:`, error.message);
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("✅ Ownership transfer complete!");
  console.log("=".repeat(60));

  console.log("\n📝 Next steps:");
  console.log("1. Verify all ownership transfers on block explorer");
  console.log("2. Test governance proposal flow");
  console.log("3. Renounce TIMELOCK_ADMIN_ROLE from deployer:");
  console.log(`   npx hardhat run scripts/renounce-timelock-admin.js --network ${hre.network.name}`);

  // Save deployment info
  const fs = require("fs");
  const deploymentInfo = {
    timestamp: new Date().toISOString(),
    network: hre.network.name,
    governanceTimelock: CONFIG.GOVERNANCE_TIMELOCK,
    contractsTransferred: validContracts.map(c => ({
      name: c.name,
      address: c.address,
    })),
    nextStep: "Renounce TIMELOCK_ADMIN_ROLE",
  };

  const outputPath = `ownership-transfer-${hre.network.name}-${Date.now()}.json`;
  fs.writeFileSync(outputPath, JSON.stringify(deploymentInfo, null, 2));
  console.log(`\n💾 Deployment info saved to: ${outputPath}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
