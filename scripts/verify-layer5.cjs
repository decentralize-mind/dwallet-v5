const hre = require("hardhat");

async function main() {
  console.log("=".repeat(80));
  console.log("🔍 Verifying Layer 5 Contracts on BaseScan");
  console.log("=".repeat(80));

  const network = hre.network.name;
  console.log("\n🌐 Network:", network);
  console.log("📝 Using BaseScan API for verification\n");

  // Contract addresses
  const contracts = [
    {
      name: "CrossChainMessenger",
      address: "0x64f3fFdE0bbA86e072a2595Cd550AeC44a1e0e38",
      constructorArgs: [
        "0x4C0B7314441dfE8E61267C0d87Fc1A657611dCf5", // admin
        "0x4C0B7314441dfE8E61267C0d87Fc1A657611dCf5", // operator
        "0x4C0B7314441dfE8E61267C0d87Fc1A657611dCf5", // guardian
        "0x20d859c9EB3FA612C604213F74dcC6Ae49Cd040c", // layer7 security
        "LayerZero" // initial provider
      ]
    },
    {
      name: "FlashLoan",
      address: "0x468772f20864403A0071690ef8c620D9E02BD649",
      constructorArgs: [
        "0x4C0B7314441dfE8E61267C0d87Fc1A657611dCf5", // admin
        "0x4C0B7314441dfE8E61267C0d87Fc1A657611dCf5", // guardian
        "0x20d859c9EB3FA612C604213F74dcC6Ae49Cd040c" // layer7 security
      ]
    },
    {
      name: "InsuranceFund",
      address: "0x8ba2Bb332764217079DFFb280dD70C8B351B5770",
      constructorArgs: [
        "0x4C0B7314441dfE8E61267C0d87Fc1A657611dCf5", // admin
        "0x4C0B7314441dfE8E61267C0d87Fc1A657611dCf5", // claims assessor
        "0x4C0B7314441dfE8E61267C0d87Fc1A657611dCf5", // guardian
        "0x20d859c9EB3FA612C604213F74dcC6Ae49Cd040c" // layer7 security
      ]
    }
  ];

  console.log("📋 Contracts to verify:");
  contracts.forEach((contract, index) => {
    console.log(`\n${index + 1}. ${contract.name}`);
    console.log(`   Address: ${contract.address}`);
    console.log(`   Args: ${contract.constructorArgs.length} parameters`);
  });

  console.log("\n" + "─".repeat(80));
  console.log("🚀 Starting verification...\n");

  for (const contract of contracts) {
    console.log(`\n${"=".repeat(80)}`);
    console.log(`📝 Verifying ${contract.name}...`);
    console.log(`   Address: ${contract.address}`);
    console.log("=".repeat(80));
    
    try {
      await hre.run("verify:verify", {
        address: contract.address,
        constructorArguments: contract.constructorArgs,
        contract: `contracts/layer5/${contract.name}.sol:${contract.name}`,
      });
      
      console.log(`✅ ${contract.name} verified successfully!`);
      console.log(`🔗 View on BaseScan: https://sepolia.basescan.org/address/${contract.address}#code`);
      
    } catch (error) {
      if (error.message.includes("Already Verified")) {
        console.log(`ℹ️  ${contract.name} is already verified on BaseScan`);
        console.log(`🔗 View on BaseScan: https://sepolia.basescan.org/address/${contract.address}#code`);
      } else {
        console.error(`❌ Failed to verify ${contract.name}:`);
        console.error(`   ${error.message}`);
        console.log("\n💡 Manual verification steps:");
        console.log(`   1. Go to https://sepolia.basescan.org/address/${contract.address}`);
        console.log("   2. Click 'Contract' tab");
        console.log("   3. Click 'Verify and Publish'");
        console.log("   4. Select 'Solidity (Single file)'");
        console.log("   5. Upload contract source code");
        console.log(`   6. Enter compiler version: 0.8.24`);
        console.log("   7. Select optimization: Yes (200 runs)");
        console.log("   8. Enter constructor arguments (ABI-encoded)");
      }
    }
    
    // Wait between verifications to avoid rate limiting
    console.log("\n⏳ Waiting 10 seconds before next verification...");
    await new Promise(resolve => setTimeout(resolve, 10000));
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Summary
  // ───────────────────────────────────────────────────────────────────────────
  
  console.log("\n" + "=".repeat(80));
  console.log("📊 Verification Summary:");
  console.log("=".repeat(80));
  
  console.log("\n🔗 BaseScan Links:");
  console.log("─".repeat(80));
  console.log("CrossChainMessenger:");
  console.log(`  https://sepolia.basescan.org/address/0x64f3fFdE0bbA86e072a2595Cd550AeC44a1e0e38#code`);
  console.log("\nFlashLoan:");
  console.log(`  https://sepolia.basescan.org/address/0x468772f20864403A0071690ef8c620D9E02BD649#code`);
  console.log("\nInsuranceFund:");
  console.log(`  https://sepolia.basescan.org/address/0x8ba2Bb332764217079DFFb280dD70C8B351B5770#code`);
  
  console.log("\n" + "=".repeat(80));
  console.log("✅ VERIFICATION PROCESS COMPLETE!");
  console.log("=".repeat(80));
  
  console.log("\n📝 Next Steps:");
  console.log("  1. Check BaseScan links above to confirm verification");
  console.log("  2. If any failed, use manual verification steps provided");
  console.log("  3. Share verified contract links with team/community");
  console.log("  4. Proceed with Phase 2 deployment preparation");
  console.log("=".repeat(80));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
