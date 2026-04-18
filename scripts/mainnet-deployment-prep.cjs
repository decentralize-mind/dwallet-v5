const hre = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("\n" + "═".repeat(70));
  console.log("   MAINNET DEPLOYMENT PREPARATION");
  console.log("═".repeat(70) + "\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("📍 Account:", deployer.address);
  
  // Check network
  const network = await hre.ethers.provider.getNetwork();
  console.log("🌐 Current Network:", network.name, "(Chain ID:", network.chainId, ")\n");

  // Testnet addresses
  const TESTNET = {
    DWT_TOKEN: "0x75A884C401A69481d4377F79dc1918b3D18e2aE8",
    AIRDROP: "0x11aE2b13FfB98D8Ba47a5CDAdD898CA85CA21b84",
    TIMELOCK: "0x52F274444c198DC3824C3C18009C7D9A1cB4bBAb",
  };

  console.log("📊 Testnet Deployment (Base Sepolia):");
  console.log("  DWT Token:", TESTNET.DWT_TOKEN);
  console.log("  Airdrop:", TESTNET.AIRDROP);
  console.log("  Timelock:", TESTNET.TIMELOCK);

  // Mainnet configuration
  console.log("\n🎯 Mainnet Deployment Configuration:");
  console.log("  Network: Base Mainnet");
  console.log("  Chain ID: 8453");
  console.log("  RPC: https://mainnet.base.org");

  // Pre-deployment checklist
  console.log("\n✅ PRE-DEPLOYMENT CHECKLIST:");
  console.log("  ┌─────────────────────────────────────────────────────────┐");
  console.log("  │  Task                                    │ Status       │");
  console.log("  ├─────────────────────────────────────────────────────────┤");
  console.log("  │  Test all contracts on Base Sepolia      │ ✅ Complete   │");
  console.log("  │  Verify contracts on BaseScan            │ ✅ Complete   │");
  console.log("  │  Security audit                          │ ⏳ Pending    │");
  console.log("  │  Bug bounty program                      │ ⏳ Pending    │");
  console.log("  │  Test timelock operations                │ ⏳ Pending    │");
  console.log("  │  Test airdrop claims                     │ ⏳ Pending    │");
  console.log("  │  Multi-sig wallet setup (Gnosis Safe)    │ ⏳ Pending    │");
  console.log("  │  Emergency pause tested                  │ ⏳ Pending    │");
  console.log("  │  Gas optimization review                 │ ⏳ Pending    │");
  console.log("  └─────────────────────────────────────────────────────────┘");

  // Deployment steps
  console.log("\n📋 MAINNET DEPLOYMENT STEPS:");
  console.log("\n  Step 1: Prepare Mainnet Configuration");
  console.log("  - Create .env.mainnet with mainnet private key (SECURE!)");
  console.log("  - Use different deployer wallet than testnet");
  console.log("  - Set up Gnosis Safe multisig as owner");

  console.log("\n  Step 2: Deploy Contracts (Same Order as Testnet)");
  console.log("  1. DWTToken.sol");
  console.log("  2. SimpleAirdrop.sol");
  console.log("  3. TimelockController");
  console.log("  4. Transfer ownership to Timelock");
  console.log("  5. Fund airdrop contract");

  console.log("\n  Step 3: Verify on BaseScan");
  console.log("  - Verify all contracts immediately after deployment");
  console.log("  - Use same Etherscan V2 API key");

  console.log("\n  Step 4: Initial Token Distribution");
  console.log("  - Mint to all stakeholders (from .env)");
  console.log("  - Fund airdrop contract (2.1M DWT)");
  console.log("  - Transfer ownership to Timelock");

  console.log("\n  Step 5: Add Liquidity");
  console.log("  - Create DWT/WETH pool on Uniswap V3");
  console.log("  - Add initial liquidity (5-10M DWT + ETH)");
  console.log("  - Consider locking liquidity");

  console.log("\n  Step 6: Launch Airdrop");
  console.log("  - Announce airdrop to community");
  console.log("  - Monitor claims");
  console.log("  - Provide support");

  // Create mainnet deployment script template
  const mainnetScript = `const hre = require("hardhat");

async function main() {
  console.log("\\n" + "═".repeat(70));
  console.log("   DWT TOKEN - BASE MAINNET DEPLOYMENT");
  console.log("═".repeat(70) + "\\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("📍 Deploying with:", deployer.address);
  
  const network = await hre.ethers.provider.getNetwork();
  console.log("🌐 Network:", network.name, "(Chain ID:", network.chainId, ")\\n");

  // WARNING: This is for mainnet deployment - use with caution!
  if (network.chainId !== 8453n) {
    console.log("❌ ERROR: This script is for Base Mainnet only (Chain ID: 8453)");
    console.log("   Current network chain ID:", network.chainId.toString());
    process.exit(1);
  }

  // ═══════════════════════════════════════════════════════════
  // STEP 1: Deploy DWT Token
  // ═══════════════════════════════════════════════════════════
  console.log("\\n📦 Step 1: Deploying DWT Token...");
  const DWTToken = await hre.ethers.getContractFactory("DWTToken");
  const dwtToken = await DWTToken.deploy(deployer.address);
  await dwtToken.waitForDeployment();
  const dwtTokenAddr = await dwtToken.getAddress();
  console.log("✅ DWT Token deployed to:", dwtTokenAddr);

  // ═══════════════════════════════════════════════════════════
  // STEP 2: Deploy Timelock
  // ═══════════════════════════════════════════════════════════
  console.log("\\n📦 Step 2: Deploying Timelock...");
  const minDelay = 172800; // 48 hours
  const proposers = [deployer.address];
  const executors = [hre.ethers.ZeroAddress]; // Anyone can execute
  const Timelock = await hre.ethers.getContractFactory("TimelockController");
  const timelock = await Timelock.deploy(minDelay, proposers, executors, deployer.address);
  await timelock.waitForDeployment();
  const timelockAddr = await timelock.getAddress();
  console.log("✅ Timelock deployed to:", timelockAddr);

  // ═══════════════════════════════════════════════════════════
  // STEP 3: Deploy SimpleAirdrop
  // ═══════════════════════════════════════════════════════════
  console.log("\\n📦 Step 3: Deploying SimpleAirdrop...");
  const SimpleAirdrop = await hre.ethers.getContractFactory("SimpleAirdrop");
  const airdrop = await SimpleAirdrop.deploy(dwtTokenAddr);
  await airdrop.waitForDeployment();
  const airdropAddr = await airdrop.getAddress();
  console.log("✅ SimpleAirdrop deployed to:", airdropAddr);

  // ═══════════════════════════════════════════════════════════
  // STEP 4: Transfer Ownership to Timelock
  // ═══════════════════════════════════════════════════════════
  console.log("\\n🔄 Step 4: Transferring token ownership to Timelock...");
  const transferTx = await dwtToken.transferOwnership(timelockAddr);
  await transferTx.wait();
  console.log("✅ Ownership transferred to Timelock");

  // ═══════════════════════════════════════════════════════════
  // STEP 5: Mint Initial Supply (from .env)
  // ═══════════════════════════════════════════════════════════
  console.log("\\n💰 Step 5: Minting initial token distribution...");
  const allocations = [
    { label: "Founder 1", address: process.env.FOUNDER_1_ADDRESS, amount: process.env.FOUNDER_1_AMOUNT },
    { label: "Founder 2", address: process.env.FOUNDER_2_ADDRESS, amount: process.env.FOUNDER_2_AMOUNT },
    { label: "Founder 3", address: process.env.FOUNDER_3_ADDRESS, amount: process.env.FOUNDER_3_AMOUNT },
    // Add more allocations from .env
  ];

  for (const alloc of allocations) {
    if (alloc.address && alloc.amount) {
      const amountWei = hre.ethers.parseEther(alloc.amount);
      const mintTx = await dwtToken.mint(alloc.address, amountWei);
      await mintTx.wait();
      console.log("  ✅ Minted", alloc.amount, "DWT to", alloc.label);
    }
  }

  // ═══════════════════════════════════════════════════════════
  // STEP 6: Fund Airdrop Contract
  // ═══════════════════════════════════════════════════════════
  console.log("\\n🎁 Step 6: Funding airdrop contract...");
  const airdropAmount = hre.ethers.parseEther("2100000"); // 2.1M DWT
  const fundTx = await dwtToken.transfer(airdropAddr, airdropAmount);
  await fundTx.wait();
  console.log("✅ Funded airdrop with 2.1M DWT");

  // ═══════════════════════════════════════════════════════════
  // Save Deployment Info
  // ═══════════════════════════════════════════════════════════
  const deploymentInfo = {
    network: "base",
    chainId: 8453,
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    DWT_TOKEN: dwtTokenAddr,
    AIRDROP: airdropAddr,
    TIMELOCK: timelockAddr,
  };

  fs.writeFileSync("deployed-base-mainnet.json", JSON.stringify(deploymentInfo, null, 2));
  console.log("\\n📄 Deployment info saved to deployed-base-mainnet.json");

  console.log("\\n" + "═".repeat(70));
  console.log("   ✅ MAINNET DEPLOYMENT COMPLETE!");
  console.log("═".repeat(70));
  
  console.log("\\n🔗 View on BaseScan:");
  console.log("   Token: https://basescan.org/address/" + dwtTokenAddr);
  console.log("   Airdrop: https://basescan.org/address/" + airdropAddr);
  console.log("   Timelock: https://basescan.org/address/" + timelockAddr + "\\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });
`;

  // Save the mainnet deployment script
  fs.writeFileSync("scripts/deploy-mainnet.cjs", mainnetScript);
  console.log("\n📄 Created mainnet deployment script: scripts/deploy-mainnet.cjs");

  console.log("\n" + "═".repeat(70));
  console.log("   📋 MAINNET DEPLOYMENT PREPARATION COMPLETE!");
  console.log("═".repeat(70));
  
  console.log("\n🎯 Next Steps:");
  console.log("  1. Complete security audit");
  console.log("  2. Test all functions on testnet thoroughly");
  console.log("  3. Set up Gnosis Safe multisig");
  console.log("  4. Create .env.mainnet with secure mainnet private key");
  console.log("  5. Run: npx hardhat run scripts/deploy-mainnet.cjs --network base");
  console.log("  6. Verify contracts on BaseScan");
  console.log("  7. Add liquidity on Uniswap");
  console.log("  8. Launch airdrop");
  
  console.log("\n⚠️  IMPORTANT:");
  console.log("  - Never commit mainnet private keys to git");
  console.log("  - Use hardware wallet for mainnet deployment");
  console.log("  - Test thoroughly on testnet before mainnet");
  console.log("  - Consider professional audit before mainnet launch\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });
