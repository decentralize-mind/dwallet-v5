/**
 * Layer 5 Configuration Script
 * 
 * This script configures all Layer 5 Advanced DeFi contracts:
 * - FlashLoan: Fund pools and set parameters
 * - InsuranceFund: Set caps and funding
 * - LimitOrders: Configure oracle and fees
 * - LiquidityIncentive: Set reward rates
 * - CrossChainMessenger: Configure endpoints
 * 
 * Network: Base Sepolia
 * Run: npx hardhat run scripts/configure-layer5.js --network baseSepolia
 */

const hre = require("hardhat");

async function main() {
  console.log("🚀 Starting Layer 5 Configuration...\n");
  
  const [deployer] = await hre.ethers.getSigners();
  console.log("Configuring with account:", deployer.address);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.formatEther(balance), "ETH\n");

  // ───────────────────────────────────────────────────────────────────────────
  // Contract Addresses (from deployment files)
  // ───────────────────────────────────────────────────────────────────────────
  
  const ADDRESSES = {
    DWT: '0xe149b32b97384131204C86a23459b544498BC46A',
    FlashLoan: '0x468772f20864403A0071690ef8c620D9E02BD649',
    InsuranceFund: '0x8ba2Bb332764217079DFFb280dD70C8B351B5770',
    LimitOrders: '0x924B1A7846456e9de97A7E952e756daF4A995b3e',
    TestPriceOracle: '0x22830a8c7fb402517809F79D242A57Fb1BBA2b40',
    LiquidityIncentive: '0x1145848222450fe6669716f7AF5cdf6EeF03fF34',
    CrossChainMessenger: '0x64f3fFdE0bbA86e072a2595Cd550AeC44a1e0e38',
    Layer7Security: '0x20d859c9EB3FA612C604213F74dcC6Ae49Cd040c',
  };

  const configuredContracts = {};

  // ───────────────────────────────────────────────────────────────────────────
  // Step 1: Configure FlashLoan Contract
  // ───────────────────────────────────────────────────────────────────────────
  
  console.log("📦 Step 1: Configuring FlashLoan Contract...");
  
  try {
    const FlashLoan = await hre.ethers.getContractFactory("FlashLoan");
    const flashLoan = FlashLoan.attach(ADDRESSES.FlashLoan);
    
    // Fund the FlashLoan pool with DWT tokens
    const fundAmount = hre.ethers.parseUnits("100000", 18); // 100,000 DWT
    console.log(`  • Funding FlashLoan pool with ${hre.ethers.formatUnits(fundAmount, 18)} DWT...`);
    
    const DWT = await hre.ethers.getContractFactory("DWalletToken");
    const dwtToken = DWT.attach(ADDRESSES.DWT);
    
    // Check deployer's DWT balance
    const deployerBalance = await dwtToken.balanceOf(deployer.address);
    console.log(`  • Deployer DWT balance: ${hre.ethers.formatUnits(deployerBalance, 18)} DWT`);
    
    if (deployerBalance >= fundAmount) {
      const tx1 = await dwtToken.transfer(ADDRESSES.FlashLoan, fundAmount);
      await tx1.wait();
      console.log(`  ✅ Funded FlashLoan pool with ${hre.ethers.formatUnits(fundAmount, 18)} DWT`);
    } else {
      console.log(`  ⚠️  Insufficient DWT balance. Need ${hre.ethers.formatUnits(fundAmount, 18)} DWT`);
      console.log(`  ⚠️  Current balance: ${hre.ethers.formatUnits(deployerBalance, 18)} DWT`);
    }
    
    // Set flash loan fee (0.09% = 9 basis points)
    const feeBps = 9;
    console.log(`  • Setting flash loan fee to ${feeBps} bps (0.09%)...`);
    const tx2 = await flashLoan.setFeeBps(feeBps);
    await tx2.wait();
    console.log(`  ✅ Flash loan fee set to ${feeBps} bps`);
    
    // Set max loan percentage (50% of pool)
    const maxLoanPercent = 50;
    console.log(`  • Setting max loan to ${maxLoanPercent}% of pool...`);
    const tx3 = await flashLoan.setMaxLoanPercentage(maxLoanPercent);
    await tx3.wait();
    console.log(`  ✅ Max loan percentage set to ${maxLoanPercent}%`);
    
    configuredContracts.FlashLoan = ADDRESSES.FlashLoan;
    console.log("✅ FlashLoan configuration complete\n");
  } catch (error) {
    console.error("❌ FlashLoan configuration failed:", error.message);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Step 2: Configure InsuranceFund Contract
  // ───────────────────────────────────────────────────────────────────────────
  
  console.log("🛡️  Step 2: Configuring InsuranceFund Contract...");
  
  try {
    const InsuranceFund = await hre.ethers.getContractFactory("InsuranceFund");
    const insuranceFund = InsuranceFund.attach(ADDRESSES.InsuranceFund);
    
    // Fund the Insurance Fund with DWT
    const fundAmount = hre.ethers.parseUnits("50000", 18); // 50,000 DWT
    console.log(`  • Funding Insurance Fund with ${hre.ethers.formatUnits(fundAmount, 18)} DWT...`);
    
    const DWT = await hre.ethers.getContractFactory("DWalletToken");
    const dwtToken = DWT.attach(ADDRESSES.DWT);
    
    const deployerBalance = await dwtToken.balanceOf(deployer.address);
    console.log(`  • Deployer DWT balance: ${hre.ethers.formatUnits(deployerBalance, 18)} DWT`);
    
    if (deployerBalance >= fundAmount) {
      const tx1 = await dwtToken.transfer(ADDRESSES.InsuranceFund, fundAmount);
      await tx1.wait();
      console.log(`  ✅ Funded Insurance Fund with ${hre.ethers.formatUnits(fundAmount, 18)} DWT`);
    } else {
      console.log(`  ⚠️  Insufficient DWT balance. Need ${hre.ethers.formatUnits(fundAmount, 18)} DWT`);
    }
    
    // Set per-claim cap (20% of fund)
    const perClaimCap = hre.ethers.parseUnits("10000", 18); // 10,000 DWT
    console.log(`  • Setting per-claim cap to ${hre.ethers.formatUnits(perClaimCap, 18)} DWT (20%)...`);
    const tx2 = await insuranceFund.setPerClaimCap(perClaimCap);
    await tx2.wait();
    console.log(`  ✅ Per-claim cap set`);
    
    // Set rolling cap (40% of fund per 24h)
    const rollingCap = hre.ethers.parseUnits("20000", 18); // 20,000 DWT
    console.log(`  • Setting 24h rolling cap to ${hre.ethers.formatUnits(rollingCap, 18)} DWT (40%)...`);
    const tx3 = await insuranceFund.setRollingCap(rollingCap);
    await tx3.wait();
    console.log(`  ✅ Rolling cap set`);
    
    // Set claim delay (48 hours)
    const claimDelay = 48 * 3600; // 48 hours in seconds
    console.log(`  • Setting claim execution delay to ${claimDelay / 3600} hours...`);
    const tx4 = await insuranceFund.setClaimDelay(claimDelay);
    await tx4.wait();
    console.log(`  ✅ Claim delay set to ${claimDelay / 3600} hours`);
    
    configuredContracts.InsuranceFund = ADDRESSES.InsuranceFund;
    console.log("✅ InsuranceFund configuration complete\n");
  } catch (error) {
    console.error("❌ InsuranceFund configuration failed:", error.message);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Step 3: Configure LimitOrders Contract
  // ───────────────────────────────────────────────────────────────────────────
  
  console.log("📈 Step 3: Configuring LimitOrders Contract...");
  
  try {
    const LimitOrders = await hre.ethers.getContractFactory("LimitOrders");
    const limitOrders = LimitOrders.attach(ADDRESSES.LimitOrders);
    
    // Set price oracle
    console.log(`  • Setting price oracle to TestPriceOracle...`);
    const tx1 = await limitOrders.setPriceOracle(ADDRESSES.TestPriceOracle);
    await tx1.wait();
    console.log(`  ✅ Price oracle set`);
    
    // Set order deadline (7 days in seconds)
    const orderDeadline = 7 * 24 * 3600; // 7 days
    console.log(`  • Setting order deadline to ${orderDeadline / 86400} days...`);
    const tx2 = await limitOrders.setOrderDeadline(orderDeadline);
    await tx2.wait();
    console.log(`  ✅ Order deadline set to ${orderDeadline / 86400} days`);
    
    // Set filler fee (0.1% = 10 basis points)
    const fillerFeeBps = 10;
    console.log(`  • Setting filler fee to ${fillerFeeBps} bps (0.1%)...`);
    const tx3 = await limitOrders.setFillerFeeBps(fillerFeeBps);
    await tx3.wait();
    console.log(`  ✅ Filler fee set to ${fillerFeeBps} bps`);
    
    configuredContracts.LimitOrders = ADDRESSES.LimitOrders;
    console.log("✅ LimitOrders configuration complete\n");
  } catch (error) {
    console.error("❌ LimitOrders configuration failed:", error.message);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Step 4: Configure LiquidityIncentive Contract
  // ───────────────────────────────────────────────────────────────────────────
  
  console.log("💧 Step 4: Configuring LiquidityIncentive Contract...");
  
  try {
    const LiquidityIncentive = await hre.ethers.getContractFactory("LiquidityIncentive");
    const liquidityIncentive = LiquidityIncentive.attach(ADDRESSES.LiquidityIncentive);
    
    // Fund the reward pool with DWT
    const rewardAmount = hre.ethers.parseUnits("200000", 18); // 200,000 DWT
    console.log(`  • Funding reward pool with ${hre.ethers.formatUnits(rewardAmount, 18)} DWT...`);
    
    const DWT = await hre.ethers.getContractFactory("DWalletToken");
    const dwtToken = DWT.attach(ADDRESSES.DWT);
    
    const deployerBalance = await dwtToken.balanceOf(deployer.address);
    console.log(`  • Deployer DWT balance: ${hre.ethers.formatUnits(deployerBalance, 18)} DWT`);
    
    if (deployerBalance >= rewardAmount) {
      const tx1 = await dwtToken.transfer(ADDRESSES.LiquidityIncentive, rewardAmount);
      await tx1.wait();
      console.log(`  ✅ Funded reward pool with ${hre.ethers.formatUnits(rewardAmount, 18)} DWT`);
    } else {
      console.log(`  ⚠️  Insufficient DWT balance. Need ${hre.ethers.formatUnits(rewardAmount, 18)} DWT`);
    }
    
    // Set reward rate (DWT per second)
    const rewardRate = hre.ethers.parseUnits("0.1", 18); // 0.1 DWT/sec
    console.log(`  • Setting reward rate to ${hre.ethers.formatUnits(rewardRate, 18)} DWT/sec...`);
    const tx2 = await liquidityIncentive.setRewardRate(rewardRate);
    await tx2.wait();
    console.log(`  ✅ Reward rate set`);
    
    configuredContracts.LiquidityIncentive = ADDRESSES.LiquidityIncentive;
    console.log("✅ LiquidityIncentive configuration complete\n");
  } catch (error) {
    console.error("❌ LiquidityIncentive configuration failed:", error.message);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Step 5: Configure TestPriceOracle
  // ───────────────────────────────────────────────────────────────────────────
  
  console.log("💰 Step 5: Configuring TestPriceOracle...");
  
  try {
    const TestPriceOracle = await hre.ethers.getContractFactory("TestPriceOracle");
    const testPriceOracle = TestPriceOracle.attach(ADDRESSES.TestPriceOracle);
    
    // Set sample prices for testing (in 18 decimal format)
    // ETH price: $3,000
    const ethPrice = hre.ethers.parseUnits("3000", 18);
    console.log(`  • Setting ETH price to $${hre.ethers.formatUnits(ethPrice, 18)}...`);
    const tx1 = await testPriceOracle.setPrice(
      "0x0000000000000000000000000000000000000000", // ETH address (zero address)
      ethPrice
    );
    await tx1.wait();
    console.log(`  ✅ ETH price set`);
    
    // DWT price: $1.00
    const dwtPrice = hre.ethers.parseUnits("1", 18);
    console.log(`  • Setting DWT price to $${hre.ethers.formatUnits(dwtPrice, 18)}...`);
    const tx2 = await testPriceOracle.setPrice(ADDRESSES.DWT, dwtPrice);
    await tx2.wait();
    console.log(`  ✅ DWT price set`);
    
    configuredContracts.TestPriceOracle = ADDRESSES.TestPriceOracle;
    console.log("✅ TestPriceOracle configuration complete\n");
  } catch (error) {
    console.error("❌ TestPriceOracle configuration failed:", error.message);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Step 6: Configure CrossChainMessenger
  // ───────────────────────────────────────────────────────────────────────────
  
  console.log("🌉 Step 6: Configuring CrossChainMessenger...");
  
  try {
    const CrossChainMessenger = await hre.ethers.getContractFactory("CrossChainMessenger");
    const crossChainMessenger = CrossChainMessenger.attach(ADDRESSES.CrossChainMessenger);
    
    // Set Layer 7 Security
    console.log(`  • Setting Layer 7 Security address...`);
    const tx1 = await crossChainMessenger.setSecurityController(ADDRESSES.Layer7Security);
    await tx1.wait();
    console.log(`  ✅ Layer 7 Security set`);
    
    // Set max message size
    const maxMessageSize = 10000; // bytes
    console.log(`  • Setting max message size to ${maxMessageSize} bytes...`);
    const tx2 = await crossChainMessenger.setMaxMessageSize(maxMessageSize);
    await tx2.wait();
    console.log(`  ✅ Max message size set`);
    
    // Set daily message limit
    const dailyLimit = 1000;
    console.log(`  • Setting daily message limit to ${dailyLimit} messages...`);
    const tx3 = await crossChainMessenger.setDailyMessageLimit(dailyLimit);
    await tx3.wait();
    console.log(`  ✅ Daily message limit set`);
    
    configuredContracts.CrossChainMessenger = ADDRESSES.CrossChainMessenger;
    console.log("✅ CrossChainMessenger configuration complete\n");
  } catch (error) {
    console.error("❌ CrossChainMessenger configuration failed:", error.message);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Summary
  // ───────────────────────────────────────────────────────────────────────────
  
  console.log("=" .repeat(80));
  console.log("🎉 LAYER 5 CONFIGURATION COMPLETE!");
  console.log("=" .repeat(80));
  console.log("\n📋 Configured Contracts:");
  for (const [name, address] of Object.entries(configuredContracts)) {
    console.log(`  ✓ ${name}: ${address}`);
  }
  
  console.log("\n🔗 BaseScan Links:");
  for (const [name, address] of Object.entries(configuredContracts)) {
    console.log(`  • ${name}: https://sepolia.basescan.org/address/${address}`);
  }
  
  console.log("\n📝 Next Steps:");
  console.log("  1. Verify all contracts on BaseScan");
  console.log("  2. Test each DeFi feature through the UI");
  console.log("  3. Monitor contract events for proper functionality");
  console.log("  4. Run integration tests with UI components");
  console.log("  5. Consider adding more liquidity to pools as needed");
  
  console.log("\n✅ Layer 5 is now fully configured and ready for use!\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
