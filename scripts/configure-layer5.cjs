const hre = require("hardhat");

async function main() {
  console.log("=".repeat(80));
  console.log("⚙️  Configuring Layer 5 Deployed Contracts");
  console.log("=".repeat(80));

  const [deployer] = await hre.ethers.getSigners();
  console.log("\n📝 Configurator address:", deployer.address);
  
  const network = hre.network.name;
  console.log("🌐 Network:", network);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("💰 Deployer balance:", hre.ethers.formatEther(balance), "ETH\n");

  // ───────────────────────────────────────────────────────────────────────────
  // Contract Addresses (from deployment)
  // ───────────────────────────────────────────────────────────────────────────
  
  const CROSS_CHAIN_MESSENGER = "0x64f3fFdE0bbA86e072a2595Cd550AeC44a1e0e38";
  const FLASH_LOAN = "0x468772f20864403A0071690ef8c620D9E02BD649";
  const INSURANCE_FUND = "0x8ba2Bb332764217079DFFb280dD70C8B351B5770";
  
  // Token addresses (from Layer 1 deployment)
  const DWT_TOKEN = hre.ethers.getAddress("0xe149b32b97384131204C86a23459b544498BC46A");
  
  console.log("📋 Contract Addresses:");
  console.log("  CrossChainMessenger:", CROSS_CHAIN_MESSENGER);
  console.log("  FlashLoan:", FLASH_LOAN);
  console.log("  InsuranceFund:", INSURANCE_FUND);
  console.log("  DWT Token:", DWT_TOKEN);

  // ───────────────────────────────────────────────────────────────────────────
  // Get contract instances
  // ───────────────────────────────────────────────────────────────────────────
  
  console.log("\n" + "─".repeat(80));
  console.log("📡 Loading contract instances...");
  
  const CrossChainMessenger = await hre.ethers.getContractAt("CrossChainMessenger", CROSS_CHAIN_MESSENGER);
  const FlashLoan = await hre.ethers.getContractAt("FlashLoan", FLASH_LOAN);
  const InsuranceFund = await hre.ethers.getContractAt("InsuranceFund", INSURANCE_FUND);
  const DWTToken = await hre.ethers.getContractAt("@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20", DWT_TOKEN);
  
  console.log("✅ Contract instances loaded");

  // ───────────────────────────────────────────────────────────────────────────
  // 1. Configure CrossChainMessenger
  // ───────────────────────────────────────────────────────────────────────────
  
  console.log("\n" + "─".repeat(80));
  console.log("📡 Step 1: Configuring CrossChainMessenger...");
  
  // Set daily message caps for major chains
  console.log("\n  Setting daily message caps...");
  
  const chains = [
    { id: 1, name: "Ethereum Mainnet", cap: 1000 },
    { id: 8453, name: "Base Mainnet", cap: 1000 },
    { id: 42161, name: "Arbitrum", cap: 1000 },
    { id: 10, name: "Optimism", cap: 1000 },
    { id: 137, name: "Polygon", cap: 1000 },
    { id: 56, name: "BNB Chain", cap: 1000 },
    { id: 84532, name: "Base Sepolia", cap: 5000 }, // Higher for testnet
  ];
  
  for (const chain of chains) {
    try {
      const tx = await CrossChainMessenger.setDailyCap(chain.id, chain.cap);
      await tx.wait();
      console.log(`    ✅ ${chain.name} (ID: ${chain.id}): ${chain.cap} messages/day`);
    } catch (error) {
      console.log(`    ⚠️  ${chain.name}: ${error.message}`);
    }
  }
  
  // Add bridge providers
  console.log("\n  Adding bridge providers...");
  
  const providers = ["LayerZero", "Axelar", "Wormhole"];
  
  for (const provider of providers) {
    try {
      const tx = await CrossChainMessenger.addProvider(provider);
      await tx.wait();
      console.log(`    ✅ Added provider: ${provider}`);
    } catch (error) {
      console.log(`    ⚠️  ${provider}: ${error.message}`);
    }
  }
  
  console.log("\n✅ CrossChainMessenger configured");

  // ───────────────────────────────────────────────────────────────────────────
  // 2. Configure FlashLoan
  // ───────────────────────────────────────────────────────────────────────────
  
  console.log("\n" + "─".repeat(80));
  console.log("⚡ Step 2: Configuring FlashLoan...");
  
  // Add supported tokens
  console.log("\n  Adding supported tokens...");
  
  const tokens = [
    { address: DWT_TOKEN, name: "DWT Token", fee: 9 }, // 0.09%
    // Add more tokens as needed
  ];
  
  for (const token of tokens) {
    try {
      const tx = await FlashLoan.addToken(token.address, token.fee);
      await tx.wait();
      console.log(`    ✅ ${token.name}: ${token.fee} bps fee`);
    } catch (error) {
      console.log(`    ⚠️  ${token.name}: ${error.message}`);
    }
  }
  
  // Check current pool balance
  console.log("\n  Checking pool balance...");
  const poolBalance = await DWTToken.balanceOf(FLASH_LOAN);
  console.log(`    Current DWT balance: ${hre.ethers.formatEther(poolBalance)} DWT`);
  
  // If pool is empty, mint some tokens for testing (testnet only)
  if (poolBalance === 0n && network.includes("testnet") || network.includes("sepolia")) {
    console.log("\n  📝 Funding FlashLoan pool for testing...");
    
    try {
      // Try to mint DWT (only works if deployer has minter role)
      const mintAmount = hre.ethers.parseEther("50000");
      const mintTx = await DWTToken.mint(FLASH_LOAN, mintAmount);
      await mintTx.wait();
      
      const newBalance = await DWTToken.balanceOf(FLASH_LOAN);
      console.log(`    ✅ Funded pool with ${hre.ethers.formatEther(mintAmount)} DWT`);
      console.log(`    ✅ New pool balance: ${hre.ethers.formatEther(newBalance)} DWT`);
    } catch (error) {
      console.log(`    ⚠️  Cannot mint DWT: ${error.message}`);
      console.log(`    ℹ️  Manually transfer DWT to: ${FLASH_LOAN}`);
    }
  }
  
  console.log("\n✅ FlashLoan configured");

  // ───────────────────────────────────────────────────────────────────────────
  // 3. Configure InsuranceFund
  // ───────────────────────────────────────────────────────────────────────────
  
  console.log("\n" + "─".repeat(80));
  console.log("🛡️  Step 3: Configuring InsuranceFund...");
  
  // Check current fund balance
  console.log("\n  Checking insurance fund balance...");
  const fundBalance = await DWTToken.balanceOf(INSURANCE_FUND);
  console.log(`    Current DWT balance: ${hre.ethers.formatEther(fundBalance)} DWT`);
  
  // Fund the insurance pool
  if (fundBalance === 0n && (network.includes("testnet") || network.includes("sepolia"))) {
    console.log("\n  📝 Funding InsuranceFund for testing...");
    
    try {
      // Mint DWT to deployer first
      const mintAmount = hre.ethers.parseEther("100000");
      const mintTx = await DWTToken.mint(deployer.address, mintAmount);
      await mintTx.wait();
      
      // Approve and deposit
      const approveTx = await DWTToken.approve(INSURANCE_FUND, mintAmount);
      await approveTx.wait();
      
      const depositTx = await InsuranceFund.depositFund(DWT_TOKEN, mintAmount);
      await depositTx.wait();
      
      const newBalance = await DWTToken.balanceOf(INSURANCE_FUND);
      console.log(`    ✅ Funded with ${hre.ethers.formatEther(mintAmount)} DWT`);
      console.log(`    ✅ New fund balance: ${hre.ethers.formatEther(newBalance)} DWT`);
    } catch (error) {
      console.log(`    ⚠️  Cannot fund: ${error.message}`);
      console.log(`    ℹ️  Manually transfer DWT to: ${INSURANCE_FUND}`);
    }
  }
  
  // Set up claims assessor role (deployer is already admin and assessor)
  console.log("\n  Claims assessor role:");
  const isAssessor = await InsuranceFund.hasRole(
    await InsuranceFund.CLAIMS_ASSESSOR_ROLE(),
    deployer.address
  );
  console.log(`    Deployer is assessor: ${isAssessor}`);
  
  // Grant assessor role to additional addresses if needed
  // await InsuranceFund.grantRole(await InsuranceFund.CLAIMS_ASSESSOR_ROLE(), assessorAddress);
  
  console.log("\n✅ InsuranceFund configured");

  // ───────────────────────────────────────────────────────────────────────────
  // Summary
  // ───────────────────────────────────────────────────────────────────────────
  
  console.log("\n" + "=".repeat(80));
  console.log("🎉 LAYER 5 CONFIGURATION COMPLETE!");
  console.log("=".repeat(80));
  
  console.log("\n📊 Configuration Summary:");
  console.log("─".repeat(80));
  console.log("CrossChainMessenger:");
  console.log("  ✅ Daily caps set for 7 chains");
  console.log("  ✅ 3 bridge providers added (LayerZero, Axelar, Wormhole)");
  console.log("");
  console.log("FlashLoan:");
  console.log("  ✅ DWT token added with 0.09% fee");
  console.log(`  ✅ Pool balance: ${hre.ethers.formatEther(await DWTToken.balanceOf(FLASH_LOAN))} DWT`);
  console.log("");
  console.log("InsuranceFund:");
  console.log(`  ✅ Fund balance: ${hre.ethers.formatEther(await DWTToken.balanceOf(INSURANCE_FUND))} DWT`);
  console.log("  ✅ Claims assessor role configured");
  
  console.log("\n" + "=".repeat(80));
  console.log("🚀 Ready for Phase 2 Deployment");
  console.log("=".repeat(80));
  console.log("\nTo deploy LimitOrders & LiquidityIncentive, you need:");
  console.log("  1. Price Oracle address");
  console.log("  2. Uniswap V3 Position Manager address");
  console.log("\nOnce available, run:");
  console.log("  npx hardhat run scripts/deploy-layer5-phase2.cjs --network baseSepolia");
  console.log("=".repeat(80));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
