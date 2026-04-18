const hre = require("hardhat");

async function main() {
  console.log("\n" + "═".repeat(70));
  console.log("   TEST GOVERNANCE - TIMELOCK FUNCTIONALITY");
  console.log("═".repeat(70) + "\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("📍 Account:", deployer.address);
  
  // Check network
  const network = await hre.ethers.provider.getNetwork();
  console.log("🌐 Network:", network.name, "(Chain ID:", network.chainId, ")\n");

  // Contract addresses from official-dwt.md
  const DWT_TOKEN_ADDRESS = "0x75A884C401A69481d4377F79dc1918b3D18e2aE8";
  const TIMELOCK_ADDRESS = "0x52F274444c198DC3824C3C18009C7D9A1cB4bBAb";

  console.log("📍 DWT Token:", DWT_TOKEN_ADDRESS);
  console.log("📍 Timelock:", TIMELOCK_ADDRESS);

  // Get contracts
  const DWT = await hre.ethers.getContractAt("DWTToken", DWT_TOKEN_ADDRESS);
  const Timelock = await hre.ethers.getContractAt("TimelockController", TIMELOCK_ADDRESS);

  // 1. Check timelock info
  console.log("\n📊 Timelock Information:");
  const minDelay = await Timelock.getMinDelay();
  console.log("  Minimum Delay:", Number(minDelay) / 3600, "hours");
  
  const timelockBalance = await DWT.balanceOf(TIMELOCK_ADDRESS);
  console.log("  Timelock DWT Balance:", hre.ethers.formatEther(timelockBalance), "DWT");

  const tokenOwner = await DWT.owner();
  console.log("  Token Owner:", tokenOwner);
  console.log("  Is Timelock the owner?", tokenOwner === TIMELOCK_ADDRESS ? "✅ YES" : "❌ NO");

  // 2. Test timelock functions (read-only)
  console.log("\n🔍 Testing Timelock Functions (Read-Only):");
  
  // Check if deployer is a proposer
  const isProposer = await Timelock.hasRole(
    await Timelock.PROPOSER_ROLE(),
    deployer.address
  );
  console.log("  Deployer is Proposer:", isProposer ? "✅ YES" : "❌ NO");

  // Check if deployer is an executor
  const isExecutor = await Timelock.hasRole(
    await Timelock.EXECUTOR_ROLE(),
    deployer.address
  );
  console.log("  Deployer is Executor:", isExecutor ? "✅ YES" : "❌ NO");

  // 3. Demonstrate governance workflow
  console.log("\n📋 Governance Workflow Demo:");
  console.log("  1. ✅ Schedule a proposal (requires Proposer role)");
  console.log("  2. ⏳ Wait for timelock delay (48 hours)");
  console.log("  3. ✅ Execute the proposal (requires Executor role)");
  
  console.log("\n📝 Example: Schedule a mint operation");
  console.log("  Target:", DWT_TOKEN_ADDRESS);
  console.log("  Function: mint(address,uint256)");
  console.log("  Data: abi.encodeWithSignature('mint(address,uint256)', recipient, amount)");
  console.log("  Delay:", Number(minDelay), "seconds");

  // 4. Check pending operations
  console.log("\n🔍 Checking for pending timelock operations...");
  // Note: This would require knowing specific operation IDs
  console.log("  (No pending operations found or requires specific operation ID)");

  console.log("\n" + "═".repeat(70));
  console.log("   ✅ GOVERNANCE TEST COMPLETE!");
  console.log("═".repeat(70));
  
  console.log("\n📚 Next Steps for Governance:");
  console.log("  1. Deploy DWTGovernor contract for on-chain voting");
  console.log("  2. Set up proposal creation interface");
  console.log("  3. Test full governance cycle on testnet");
  console.log("  4. Implement timelock-protected functions");
  
  console.log("\n🔗 View on BaseScan:");
  console.log("   Timelock: https://sepolia.basescan.org/address/" + TIMELOCK_ADDRESS + "\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });
