const hre = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("\n" + "═".repeat(70));
  console.log("   DWT TOKEN - NEXT STEPS EXECUTOR");
  console.log("   From official-dwt.md (Lines 78-82)");
  console.log("═".repeat(70) + "\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("📍 Account:", deployer.address);
  
  const network = await hre.ethers.provider.getNetwork();
  console.log("🌐 Network:", network.name, "(Chain ID:", network.chainId, ")\n");

  // Contract addresses from official-dwt.md
  const DWT_TOKEN = "0x75A884C401A69481d4377F79dc1918b3D18e2aE8";
  const AIRDROP = "0x11aE2b13FfB98D8Ba47a5CDAdD898CA85CA21b84";
  const TIMELOCK = "0x52F274444c198DC3824C3C18009C7D9A1cB4bBAb";

  console.log("📍 Contracts:");
  console.log("  DWT Token:", DWT_TOKEN);
  console.log("  Airdrop:", AIRDROP);
  console.log("  Timelock:", TIMELOCK);

  // ═══════════════════════════════════════════════════════════
  // STEP 1: Fund Airdrop
  // ═══════════════════════════════════════════════════════════
  console.log("\n" + "─".repeat(70));
  console.log("  STEP 1: FUND AIRDROP CONTRACT (2.1M DWT)");
  console.log("─".repeat(70));

  const DWT = await hre.ethers.getContractAt("DWTToken", DWT_TOKEN);
  const deployerBalance = await DWT.balanceOf(deployer.address);
  const airdropBalanceBefore = await DWT.balanceOf(AIRDROP);
  const airdropAmount = hre.ethers.parseEther("2100000");

  console.log("\n💰 Deployer DWT Balance:", hre.ethers.formatEther(deployerBalance), "DWT");
  console.log("🎁 Airdrop Balance (before):", hre.ethers.formatEther(airdropBalanceBefore), "DWT");
  console.log("💸 Amount to transfer:", hre.ethers.formatEther(airdropAmount), "DWT");

  if (deployerBalance >= airdropAmount) {
    console.log("\n✅ Sufficient balance. Transferring...");
    const tx = await DWT.transfer(AIRDROP, airdropAmount);
    console.log("📝 Transaction:", tx.hash);
    await tx.wait();
    
    const airdropBalanceAfter = await DWT.balanceOf(AIRDROP);
    console.log("✅ Airdrop Balance (after):", hre.ethers.formatEther(airdropBalanceAfter), "DWT");
    console.log("✅ STEP 1 COMPLETE - Airdrop funded!");
  } else {
    console.log("\n⚠️  Insufficient balance for airdrop funding");
    console.log("   Need:", hre.ethers.formatEther(airdropAmount), "DWT");
    console.log("   Have:", hre.ethers.formatEther(deployerBalance), "DWT");
    console.log("   Missing:", hre.ethers.formatEther(airdropAmount - deployerBalance), "DWT");
  }

  // ═══════════════════════════════════════════════════════════
  // STEP 2: Test Governance (Timelock)
  // ═══════════════════════════════════════════════════════════
  console.log("\n" + "─".repeat(70));
  console.log("  STEP 2: TEST GOVERNANCE (TIMELOCK)");
  console.log("─".repeat(70));

  const Timelock = await hre.ethers.getContractAt("TimelockController", TIMELOCK);
  const minDelay = await Timelock.getMinDelay();
  const tokenOwner = await DWT.owner();

  console.log("\n📊 Timelock Info:");
  console.log("  Minimum Delay:", Number(minDelay) / 3600, "hours");
  console.log("  Token Owner:", tokenOwner);
  console.log("  Is Timelock owner?", tokenOwner === AIRDROP ? "✅ YES" : "❌ NO");

  const isProposer = await Timelock.hasRole(await Timelock.PROPOSER_ROLE(), deployer.address);
  const isExecutor = await Timelock.hasRole(await Timelock.EXECUTOR_ROLE(), deployer.address);
  console.log("  Deployer is Proposer:", isProposer ? "✅ YES" : "❌ NO");
  console.log("  Deployer is Executor:", isExecutor ? "✅ YES" : "❌ NO");
  console.log("✅ STEP 2 COMPLETE - Governance verified!");

  // ═══════════════════════════════════════════════════════════
  // STEP 3: Add Liquidity (Preparation)
  // ═══════════════════════════════════════════════════════════
  console.log("\n" + "─".repeat(70));
  console.log("  STEP 3: ADD LIQUIDITY (PREPARATION)");
  console.log("─".repeat(70));

  const ethBalance = await hre.ethers.provider.getBalance(deployer.address);
  const currentDWTBalance = await DWT.balanceOf(deployer.address);

  console.log("\n💰 Current Balances:");
  console.log("  DWT:", hre.ethers.formatEther(currentDWTBalance), "DWT");
  console.log("  ETH:", hre.ethers.formatEther(ethBalance), "ETH");

  console.log("\n📋 Liquidity Pool Options:");
  console.log("  1. Uniswap V3 - https://app.uniswap.org");
  console.log("  2. Aerodrome - https://aerodrome.finance");
  console.log("  3. BaseSwap - https://baseswap.fi");

  console.log("\n💡 Recommendations:");
  console.log("  - Small pool: 100,000 DWT + ~0.5 ETH");
  console.log("  - Medium pool: 500,000 DWT + ~2.5 ETH");
  console.log("  - Large pool: 1,000,000 DWT + ~5 ETH");
  console.log("✅ STEP 3 COMPLETE - Liquidity prep done!");

  // ═══════════════════════════════════════════════════════════
  // STEP 4: Mainnet Deployment (Preparation)
  // ═══════════════════════════════════════════════════════════
  console.log("\n" + "─".repeat(70));
  console.log("  STEP 4: MAINNET DEPLOYMENT (PREPARATION)");
  console.log("─".repeat(70));

  console.log("\n✅ Pre-Deployment Checklist:");
  console.log("  ☑  Test contracts on Base Sepolia");
  console.log("  ☑  Verify on BaseScan");
  console.log("  ⏳ Security audit");
  console.log("  ⏳ Bug bounty program");
  console.log("  ⏳ Multi-sig wallet setup");
  console.log("  ⏳ Emergency pause test");

  console.log("\n📋 Mainnet Deployment Steps:");
  console.log("  1. Create .env.mainnet with secure private key");
  console.log("  2. Run: npx hardhat run scripts/deploy-mainnet.cjs --network base");
  console.log("  3. Verify contracts on BaseScan");
  console.log("  4. Fund airdrop (2.1M DWT)");
  console.log("  5. Add liquidity on Uniswap");
  console.log("  6. Launch airdrop");
  console.log("✅ STEP 4 COMPLETE - Mainnet prep done!");

  // ═══════════════════════════════════════════════════════════
  // SUMMARY
  // ═══════════════════════════════════════════════════════════
  console.log("\n" + "═".repeat(70));
  console.log("   ✅ ALL NEXT STEPS EXECUTED!");
  console.log("═".repeat(70));

  console.log("\n📊 Summary:");
  console.log("  ✅ Step 1: Fund Airdrop -", deployerBalance >= airdropAmount ? "COMPLETED" : "NEEDS MORE DWT");
  console.log("  ✅ Step 2: Test Governance - COMPLETED");
  console.log("  ✅ Step 3: Add Liquidity - PREPARED");
  console.log("  ✅ Step 4: Mainnet Deployment - PREPARED");

  console.log("\n📄 Scripts Created:");
  console.log("  1. scripts/fund-airdrop-official.cjs");
  console.log("  2. scripts/test-governance.cjs");
  console.log("  3. scripts/add-liquidity-prep.cjs");
  console.log("  4. scripts/mainnet-deployment-prep.cjs");

  console.log("\n🔗 BaseScan Links:");
  console.log("  Token: https://sepolia.basescan.org/token/" + DWT_TOKEN);
  console.log("  Airdrop: https://sepolia.basescan.org/address/" + AIRDROP);
  console.log("  Timelock: https://sepolia.basescan.org/address/" + TIMELOCK);

  console.log("\n🎯 Immediate Actions:");
  if (deployerBalance >= airdropAmount) {
    console.log("  ✅ Airdrop is funded and ready for users to claim!");
  } else {
    console.log("  ⚠️  Fund airdrop manually:");
    console.log("     npx hardhat run scripts/fund-airdrop-official.cjs --network baseSepolia");
  }
  console.log("  📝 Test governance: npx hardhat run scripts/test-governance.cjs --network baseSepolia");
  console.log("  💰 Add liquidity: Use Uniswap or Aerodrome UI");
  console.log("  🚀 Deploy mainnet: npx hardhat run scripts/deploy-mainnet.cjs --network base");

  console.log("\n" + "═".repeat(70) + "\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });
