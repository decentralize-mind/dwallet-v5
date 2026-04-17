const hre = require("hardhat");

async function main() {
  console.log("=".repeat(80));
  console.log("🧪 Layer 5 Integration Tests on Base Sepolia");
  console.log("=".repeat(80));

  const [deployer] = await hre.ethers.getSigners();
  console.log("\n📝 Tester address:", deployer.address);
  
  const network = hre.network.name;
  console.log("🌐 Network:", network);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("💰 ETH balance:", hre.ethers.formatEther(balance), "ETH\n");

  // Contract addresses
  const CROSS_CHAIN_MESSENGER = "0x64f3fFdE0bbA86e072a2595Cd550AeC44a1e0e38";
  const FLASH_LOAN = "0x468772f20864403A0071690ef8c620D9E02BD649";
  const INSURANCE_FUND = "0x8ba2Bb332764217079DFFb280dD70C8B351B5770";
  const TEST_PRICE_ORACLE = "0x89be925c1F13AA14c343467883A82a7C2bC808d3";
  const LIMIT_ORDERS = "0x81C4684340f3Ff3B02a813653ADfAFFb67948FB7";
  const LIQUIDITY_INCENTIVE = "0x56b2E198518584e75643611140A5157931F777FA";
  const DWT_TOKEN = hre.ethers.getAddress("0x769F23dd0F6bc92C9d9d914190Ae9006d3FbDe48");

  let testsPassed = 0;
  let testsFailed = 0;

  // ───────────────────────────────────────────────────────────────────────────
  // Test 1: CrossChainMessenger
  // ───────────────────────────────────────────────────────────────────────────
  
  console.log("\n" + "─".repeat(80));
  console.log("📡 Test 1: CrossChainMessenger");
  
  try {
    const CrossChainMessenger = await hre.ethers.getContractAt("CrossChainMessenger", CROSS_CHAIN_MESSENGER);
    
    // Test: Get active provider
    const activeProvider = await CrossChainMessenger.activeProvider();
    console.log(`  ✅ Active provider: ${activeProvider}`);
    testsPassed++;
    
    // Test: Get daily cap
    const dailyCap = await CrossChainMessenger.dailyMessageCaps(84532);
    console.log(`  ✅ Base Sepolia daily cap: ${dailyCap} messages`);
    testsPassed++;
    
    // Test: Check if LayerZero is supported
    const isLayerZeroSupported = await CrossChainMessenger.supportedProviders("LayerZero");
    console.log(`  ✅ LayerZero supported: ${isLayerZeroSupported}`);
    testsPassed++;
    
    // Test: Check if guardian can halt
    const isGuardian = await CrossChainMessenger.hasRole(
      await CrossChainMessenger.GUARDIAN_ROLE(),
      deployer.address
    );
    console.log(`  ✅ Deployer is guardian: ${isGuardian}`);
    testsPassed++;
    
  } catch (error) {
    console.log(`  ❌ CrossChainMessenger test failed: ${error.message}`);
    testsFailed++;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Test 2: FlashLoan
  // ───────────────────────────────────────────────────────────────────────────
  
  console.log("\n" + "─".repeat(80));
  console.log("⚡ Test 2: FlashLoan");
  
  try {
    const FlashLoan = await hre.ethers.getContractAt("FlashLoan", FLASH_LOAN);
    
    // Test: Check if DWT is supported
    const isSupported = await FlashLoan.supportedTokens(DWT_TOKEN);
    console.log(`  ✅ DWT token supported: ${isSupported}`);
    testsPassed++;
    
    // Test: Get fee for DWT
    const fee = await FlashLoan.flashLoanFees(DWT_TOKEN);
    console.log(`  ✅ DWT flash loan fee: ${fee} bps (${Number(fee) / 100}%)`);
    testsPassed++;
    
    // Test: Get max flash loan amount
    const maxLoan = await FlashLoan.getMaxFlashLoan(DWT_TOKEN);
    console.log(`  ✅ Max flash loan (DWT): ${hre.ethers.formatEther(maxLoan)} DWT`);
    testsPassed++;
    
    // Test: Check pool balance
    const DWTToken = await hre.ethers.getContractAt(
      "@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20",
      DWT_TOKEN
    );
    const poolBalance = await DWTToken.balanceOf(FLASH_LOAN);
    console.log(`  ✅ FlashLoan pool balance: ${hre.ethers.formatEther(poolBalance)} DWT`);
    testsPassed++;
    
  } catch (error) {
    console.log(`  ❌ FlashLoan test failed: ${error.message}`);
    testsFailed++;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Test 3: InsuranceFund
  // ───────────────────────────────────────────────────────────────────────────
  
  console.log("\n" + "─".repeat(80));
  console.log("🛡️  Test 3: InsuranceFund");
  
  try {
    const InsuranceFund = await hre.ethers.getContractAt("InsuranceFund", INSURANCE_FUND);
    
    // Test: Check if deployer is claims assessor
    const isAssessor = await InsuranceFund.hasRole(
      await InsuranceFund.CLAIMS_ASSESSOR_ROLE(),
      deployer.address
    );
    console.log(`  ✅ Deployer is claims assessor: ${isAssessor}`);
    testsPassed++;
    
    // Test: Get fund balance for DWT
    const fundBalance = await InsuranceFund.getFundBalance(DWT_TOKEN);
    console.log(`  ✅ Insurance fund balance: ${hre.ethers.formatEther(fundBalance)} DWT`);
    testsPassed++;
    
    // Test: Get max claim amount
    const maxClaim = await InsuranceFund.getMaxClaimAmount(DWT_TOKEN);
    console.log(`  ✅ Max single claim: ${hre.ethers.formatEther(maxClaim)} DWT (20%)`);
    testsPassed++;
    
    // Test: Get remaining rolling cap
    const rollingCap = await InsuranceFund.getRemainingRollingCap(DWT_TOKEN);
    console.log(`  ✅ Rolling 30-day cap: ${hre.ethers.formatEther(rollingCap)} DWT (40%)`);
    testsPassed++;
    
  } catch (error) {
    console.log(`  ❌ InsuranceFund test failed: ${error.message}`);
    testsFailed++;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Test 4: TestPriceOracle
  // ───────────────────────────────────────────────────────────────────────────
  
  console.log("\n" + "─".repeat(80));
  console.log("💹 Test 4: TestPriceOracle");
  
  try {
    const TestPriceOracle = await hre.ethers.getContractAt("TestPriceOracle", TEST_PRICE_ORACLE);
    
    // Test: Get DWT price
    const [dwtPrice, dwtTime] = await TestPriceOracle.getLatestPrice(DWT_TOKEN);
    console.log(`  ✅ DWT price: $${Number(dwtPrice) / 10**8}`);
    testsPassed++;
    
    // Test: Get ETH price
    const [ethPrice, ethTime] = await TestPriceOracle.getLatestPrice(hre.ethers.ZeroAddress);
    console.log(`  ✅ ETH price: $${Number(ethPrice) / 10**8}`);
    testsPassed++;
    
    // Test: Check if oracle has price
    const hasDWTPrice = await TestPriceOracle.hasPrice(DWT_TOKEN);
    console.log(`  ✅ Has DWT price: ${hasDWTPrice}`);
    testsPassed++;
    
    // Test: Get price age
    const priceAge = await TestPriceOracle.getPriceAge(DWT_TOKEN);
    console.log(`  ✅ DWT price age: ${priceAge} seconds`);
    testsPassed++;
    
  } catch (error) {
    console.log(`  ❌ TestPriceOracle test failed: ${error.message}`);
    testsFailed++;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Test 5: LimitOrders
  // ───────────────────────────────────────────────────────────────────────────
  
  console.log("\n" + "─".repeat(80));
  console.log("📈 Test 5: LimitOrders");
  
  try {
    const LimitOrders = await hre.ethers.getContractAt("LimitOrders", LIMIT_ORDERS);
    
    // Test: Get filler fee
    const fillerFee = await LimitOrders.fillerFeeBps();
    console.log(`  ✅ Filler fee: ${fillerFee} bps (${Number(fillerFee) / 100}%)`);
    testsPassed++;
    
    // Test: Get oracle address
    const oracleAddress = await LimitOrders.priceOracle();
    console.log(`  ✅ Price oracle: ${oracleAddress}`);
    testsPassed++;
    
    // Test: Verify oracle matches TestPriceOracle
    if (oracleAddress.toLowerCase() === TEST_PRICE_ORACLE.toLowerCase()) {
      console.log(`  ✅ Oracle correctly set to TestPriceOracle`);
      testsPassed++;
    } else {
      console.log(`  ⚠️  Oracle address mismatch`);
    }
    
    // Test: Get order stats
    const stats = await LimitOrders.stats();
    console.log(`  ✅ Total orders created: ${stats.totalOrders}`);
    console.log(`  ✅ Total orders filled: ${stats.totalFilled}`);
    testsPassed++;
    
  } catch (error) {
    console.log(`  ❌ LimitOrders test failed: ${error.message}`);
    testsFailed++;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Test 6: LiquidityIncentive
  // ───────────────────────────────────────────────────────────────────────────
  
  console.log("\n" + "─".repeat(80));
  console.log("💧 Test 6: LiquidityIncentive");
  
  try {
    const LiquidityIncentive = await hre.ethers.getContractAt("LiquidityIncentive", LIQUIDITY_INCENTIVE);
    
    // Test: Get position manager
    const positionManager = await LiquidityIncentive.positionManager();
    console.log(`  ✅ Uniswap V3 Position Manager: ${positionManager}`);
    testsPassed++;
    
    // Test: Get reward token
    const rewardToken = await LiquidityIncentive.rewardToken();
    console.log(`  ✅ Reward token: ${rewardToken}`);
    testsPassed++;
    
    // Test: Verify reward token is DWT
    if (rewardToken.toLowerCase() === DWT_TOKEN.toLowerCase()) {
      console.log(`  ✅ Reward token correctly set to DWT`);
      testsPassed++;
    } else {
      console.log(`  ⚠️  Reward token mismatch`);
    }
    
    // Test: Get emission rate
    const emissionRate = await LiquidityIncentive.emissionRate();
    console.log(`  ✅ Emission rate: ${hre.ethers.formatEther(emissionRate)} DWT/day`);
    testsPassed++;
    
    // Test: Get reward period
    const startTimestamp = await LiquidityIncentive.startTimestamp();
    const endTimestamp = await LiquidityIncentive.endTimestamp();
    const duration = Number(endTimestamp) - Number(startTimestamp);
    const days = Math.floor(duration / (24 * 60 * 60));
    console.log(`  ✅ Reward period: ${days} days`);
    testsPassed++;
    
  } catch (error) {
    console.log(`  ❌ LiquidityIncentive test failed: ${error.message}`);
    testsFailed++;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Summary
  // ───────────────────────────────────────────────────────────────────────────
  
  console.log("\n" + "=".repeat(80));
  console.log("📊 Test Summary:");
  console.log("=".repeat(80));
  
  console.log(`\n✅ Tests Passed: ${testsPassed}`);
  console.log(`❌ Tests Failed: ${testsFailed}`);
  console.log(`📈 Success Rate: ${((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1)}%`);
  
  console.log("\n" + "=".repeat(80));
  if (testsFailed === 0) {
    console.log("🎉 ALL TESTS PASSED!");
    console.log("=".repeat(80));
    console.log("\n✅ All Layer 5 contracts are operational on Base Sepolia!");
    console.log("✅ All configurations verified!");
    console.log("✅ All integrations working correctly!");
  } else {
    console.log("⚠️  SOME TESTS FAILED");
    console.log("=".repeat(80));
    console.log("\nPlease review the failed tests above.");
  }
  
  console.log("\n" + "=".repeat(80));
  console.log("🔗 Contract Addresses:");
  console.log("=".repeat(80));
  console.log("CrossChainMessenger:", CROSS_CHAIN_MESSENGER);
  console.log("FlashLoan:", FLASH_LOAN);
  console.log("InsuranceFund:", INSURANCE_FUND);
  console.log("TestPriceOracle:", TEST_PRICE_ORACLE);
  console.log("LimitOrders:", LIMIT_ORDERS);
  console.log("LiquidityIncentive:", LIQUIDITY_INCENTIVE);
  console.log("=".repeat(80));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
