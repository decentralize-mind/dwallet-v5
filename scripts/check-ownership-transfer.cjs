const hre = require("hardhat");

async function main() {
  console.log("\n═══════════════════════════════════════════════════");
  console.log("   Check Ownership Transfer Requirements");
  console.log("═══════════════════════════════════════════════════\n");

  const DWT_ADDRESS = "0xe149b32b97384131204C86a23459b544498BC46A";
  const TIMELOCK_ADDRESS = "0x2255a32202f4356129F81D862231DB064508e7aB";
  const DEPLOYER_ADDRESS = "0x4C0B7314441dfE8E61267C0d87Fc1A657611dCf5";

  console.log("📋 Current Setup:");
  console.log("  DWT Token:", DWT_ADDRESS);
  console.log("  Current Owner (Timelock):", TIMELOCK_ADDRESS);
  console.log("  Deployer Address:", DEPLOYER_ADDRESS);
  console.log("");

  // Check if we can access Timelock
  try {
    // Try to get Timelock contract
    const Timelock = await hre.ethers.getContractAt("Timelock", TIMELOCK_ADDRESS);
    console.log("✅ Timelock contract accessible");
    
    // Get timelock info
    try {
      const admin = await Timelock.admin();
      console.log("  Timelock Admin:", admin);
    } catch (e) {
      console.log("  ⚠️  Could not get admin");
    }

    try {
      const delay = await Timelock.delay();
      console.log("  Timelock Delay:", delay.toString(), "seconds");
    } catch (e) {
      console.log("  ⚠️  Could not get delay");
    }

  } catch (error) {
    console.log("❌ Cannot access Timelock contract directly");
    console.log("  Error:", error.message);
  }

  console.log("\n═══════════════════════════════════════════════════");
  console.log("   Ownership Transfer Options");
  console.log("═══════════════════════════════════════════════════\n");

  console.log("Option A: Transfer from Timelock to Deployer");
  console.log("  ┌─────────────────────────────────────────────────┐");
  console.log("  │ From: 0x2255a32202f4356129F81D862231DB064508e7aB │");
  console.log("  │ To:   0x4C0B7314441dfE8E61267C0d87Fc1A657611dCf5 │");
  console.log("  └─────────────────────────────────────────────────┘");
  console.log("");
  console.log("  Requirements:");
  console.log("  1. Must call from Timelock contract");
  console.log("  2. Requires Timelock admin access");
  console.log("  3. May require proposal + voting");
  console.log("");

  console.log("Option B: Call transferOwnership() via Timelock");
  console.log("  Process:");
  console.log("  1. Create proposal to call DWT.transferOwnership(deployer)");
  console.log("  2. Wait for voting period");
  console.log("  3. Execute through Timelock");
  console.log("  4. Deployer becomes new owner");
  console.log("");

  console.log("Option C: Use mint() function directly via Timelock");
  console.log("  Process:");
  console.log("  1. Create proposal to call DWT.mint(airdrop, 2.1M)");
  console.log("  2. Wait for voting period");
  console.log("  3. Execute through Timelock");
  console.log("  4. Airdrop contract receives tokens");
  console.log("  ⭐ RECOMMENDED - No ownership change needed!");
  console.log("");

  // Calculate DWT needed for airdrop
  console.log("\n═══════════════════════════════════════════════════");
  console.log("   Airdrop Pool Calculation");
  console.log("═══════════════════════════════════════════════════\n");

  const CLAIM_AMOUNT = 5n; // 5 DWT per user
  const TARGET_USERS = 420000n; // Target: 420,000 users
  
  console.log("📊 Airdrop Configuration:");
  console.log("  Per Claim:", CLAIM_AMOUNT.toString(), "DWT");
  console.log("  Target Users:", TARGET_USERS.toLocaleString(), "wallets");
  console.log("");

  // Calculate different scenarios
  const scenarios = [
    { name: "Minimum Viable", users: 100000n },
    { name: "Phase 1 Launch", users: 210000n },
    { name: "Full Allocation (.env)", users: 420000n },
    { name: "Extended Pool", users: 500000n },
    { name: "Maximum (8% of 123M)", users: 1968000n },
  ];

  console.log("💰 DWT Required by Scenario:\n");
  
  for (const scenario of scenarios) {
    const dwtNeeded = scenario.users * CLAIM_AMOUNT;
    const percentage = (Number(dwtNeeded) / 123000000 * 100).toFixed(2);
    
    console.log(`  ${scenario.name.padEnd(25)} ${scenario.users.toLocaleString().padStart(10)} users = ${hre.ethers.formatEther(dwtNeeded).padStart(12)} DWT (${percentage}%)`);
  }

  console.log("");
  console.log("📌 Current .env Airdrop Allocation:");
  console.log("  AIRDROP_AMOUNT=2,100,000 DWT");
  console.log("  This supports: 420,000 user claims");
  console.log("  Percentage of max supply: 1.71%");
  console.log("");

  console.log("═══════════════════════════════════════════════════");
  console.log("   Recommendation");
  console.log("═══════════════════════════════════════════════════\n");

  console.log("✅ BEST APPROACH: Option C (Mint via Timelock)");
  console.log("");
  console.log("  Why:");
  console.log("  • No ownership transfer needed (more secure)");
  console.log("  • Uses existing governance structure");
  console.log("  • 2.1M DWT supports 420,000 users");
  console.log("  • Matches your .env allocation");
  console.log("");
  console.log("  Next Step:");
  console.log("  → Create governance proposal to mint 2.1M DWT");
  console.log("  → Target: SimpleAirdrop contract");
  console.log("");
}

main().catch(console.error);
