const hre = require("hardhat");

async function main() {
  console.log("=".repeat(80));
  console.log("💰 Funding Layer 5 Pools with DWT Tokens");
  console.log("=".repeat(80));

  const [deployer] = await hre.ethers.getSigners();
  console.log("\n📝 Funder address:", deployer.address);
  
  const network = hre.network.name;
  console.log("🌐 Network:", network);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("💰 ETH balance:", hre.ethers.formatEther(balance), "ETH\n");

  // Contract addresses
  const FLASH_LOAN = "0x468772f20864403A0071690ef8c620D9E02BD649";
  const INSURANCE_FUND = "0x8ba2Bb332764217079DFFb280dD70C8B351B5770";
  const DWT_TOKEN = hre.ethers.getAddress("0x769F23dd0F6bc92C9d9d914190Ae9006d3FbDe48");

  console.log("📋 Target Addresses:");
  console.log("  FlashLoan:", FLASH_LOAN);
  console.log("  InsuranceFund:", INSURANCE_FUND);
  console.log("  DWT Token:", DWT_TOKEN);

  // Get DWT token contract
  const DWTToken = await hre.ethers.getContractAt(
    "@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20",
    DWT_TOKEN
  );

  // Check deployer's DWT balance
  console.log("\n" + "─".repeat(80));
  console.log("📊 Checking DWT balances...");
  
  const deployerDWTBalance = await DWTToken.balanceOf(deployer.address);
  console.log("  Deployer DWT balance:", hre.ethers.formatEther(deployerDWTBalance), "DWT");
  
  const flashLoanBalance = await DWTToken.balanceOf(FLASH_LOAN);
  console.log("  FlashLoan current balance:", hre.ethers.formatEther(flashLoanBalance), "DWT");
  
  const insuranceBalance = await DWTToken.balanceOf(INSURANCE_FUND);
  console.log("  InsuranceFund current balance:", hre.ethers.formatEther(insuranceBalance), "DWT");

  // If deployer has no DWT, try to mint (testnet only)
  if (deployerDWTBalance === 0n) {
    console.log("\n⚠️  Deployer has no DWT tokens. Attempting to mint...");
    
    try {
      // Get DWT token with minting capability
      const DWTTokenFull = await hre.ethers.getContractAt("DWTTokenEnhanced", DWT_TOKEN);
      
      // Try to mint
      const mintAmount = hre.ethers.parseEther("200000"); // 200k DWT
      console.log(`  Minting ${hre.ethers.formatEther(mintAmount)} DWT to deployer...`);
      
      const mintTx = await DWTTokenFull.mint(deployer.address, mintAmount);
      await mintTx.wait();
      
      const newBalance = await DWTToken.balanceOf(deployer.address);
      console.log(`  ✅ Minted successfully! New balance: ${hre.ethers.formatEther(newBalance)} DWT`);
      
    } catch (error) {
      console.log(`  ❌ Cannot mint DWT: ${error.message}`);
      console.log("\n⚠️  You need to obtain DWT tokens from:");
      console.log("  - Faucet (if available)");
      console.log("  - Another wallet");
      console.log("  - Token owner with mint rights");
      console.log("\nℹ️  Skipping funding step...");
      return;
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Fund FlashLoan Pool
  // ───────────────────────────────────────────────────────────────────────────
  
  console.log("\n" + "─".repeat(80));
  console.log("⚡ Step 1: Funding FlashLoan Pool...");
  
  const flashLoanAmount = hre.ethers.parseEther("50000"); // 50k DWT
  console.log(`  Amount: ${hre.ethers.formatEther(flashLoanAmount)} DWT`);
  
  try {
    const currentBalance = await DWTToken.balanceOf(deployer.address);
    
    if (currentBalance < flashLoanAmount) {
      console.log(`  ⚠️  Insufficient balance. Have: ${hre.ethers.formatEther(currentBalance)}, Need: ${hre.ethers.formatEther(flashLoanAmount)}`);
      console.log("  ℹ️  Skipping FlashLoan funding...");
    } else {
      const transferTx = await DWTToken.transfer(FLASH_LOAN, flashLoanAmount);
      await transferTx.wait();
      
      const newBalance = await DWTToken.balanceOf(FLASH_LOAN);
      console.log(`  ✅ Transferred ${hre.ethers.formatEther(flashLoanAmount)} DWT to FlashLoan`);
      console.log(`  ✅ FlashLoan new balance: ${hre.ethers.formatEther(newBalance)} DWT`);
      
      // Calculate max loan amount
      const maxLoan = await (await hre.ethers.getContractAt("FlashLoan", FLASH_LOAN)).getMaxFlashLoan(DWT_TOKEN);
      console.log(`  ✅ Max flash loan allowed: ${hre.ethers.formatEther(maxLoan)} DWT`);
    }
  } catch (error) {
    console.log(`  ❌ Failed to fund FlashLoan: ${error.message}`);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Fund Insurance Fund
  // ───────────────────────────────────────────────────────────────────────────
  
  console.log("\n" + "─".repeat(80));
  console.log("🛡️  Step 2: Funding Insurance Fund...");
  
  const insuranceAmount = hre.ethers.parseEther("100000"); // 100k DWT
  console.log(`  Amount: ${hre.ethers.formatEther(insuranceAmount)} DWT`);
  
  try {
    const currentBalance = await DWTToken.balanceOf(deployer.address);
    
    if (currentBalance < insuranceAmount) {
      console.log(`  ⚠️  Insufficient balance. Have: ${hre.ethers.formatEther(currentBalance)}, Need: ${hre.ethers.formatEther(insuranceAmount)}`);
      console.log("  ℹ️  Skipping InsuranceFund funding...");
    } else {
      // Approve InsuranceFund to spend DWT
      console.log("  Approving InsuranceFund to spend DWT...");
      const approveTx = await DWTToken.approve(INSURANCE_FUND, insuranceAmount);
      await approveTx.wait();
      console.log("  ✅ Approval successful");
      
      // Deposit to InsuranceFund
      const InsuranceFund = await hre.ethers.getContractAt("InsuranceFund", INSURANCE_FUND);
      console.log("  Depositing to InsuranceFund...");
      const depositTx = await InsuranceFund.depositFund(DWT_TOKEN, insuranceAmount);
      await depositTx.wait();
      
      const newBalance = await DWTToken.balanceOf(INSURANCE_FUND);
      console.log(`  ✅ Deposited ${hre.ethers.formatEther(insuranceAmount)} DWT to InsuranceFund`);
      console.log(`  ✅ InsuranceFund new balance: ${hre.ethers.formatEther(newBalance)} DWT`);
      
      // Show claim limits
      const maxClaim = await InsuranceFund.getMaxClaimAmount(DWT_TOKEN);
      const rollingCap = await InsuranceFund.getRemainingRollingCap(DWT_TOKEN);
      console.log(`  ✅ Max single claim: ${hre.ethers.formatEther(maxClaim)} DWT (20%)`);
      console.log(`  ✅ Rolling 30-day cap: ${hre.ethers.formatEther(rollingCap)} DWT (40%)`);
    }
  } catch (error) {
    console.log(`  ❌ Failed to fund InsuranceFund: ${error.message}`);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Summary
  // ───────────────────────────────────────────────────────────────────────────
  
  console.log("\n" + "=".repeat(80));
  console.log("📊 Final Pool Status:");
  console.log("=".repeat(80));
  
  const finalFlashLoanBalance = await DWTToken.balanceOf(FLASH_LOAN);
  const finalInsuranceBalance = await DWTToken.balanceOf(INSURANCE_FUND);
  const finalDeployerBalance = await DWTToken.balanceOf(deployer.address);
  
  console.log("\n💰 DWT Balances:");
  console.log("─".repeat(80));
  console.log(`  FlashLoan:      ${hre.ethers.formatEther(finalFlashLoanBalance)} DWT`);
  console.log(`  InsuranceFund:  ${hre.ethers.formatEther(finalInsuranceBalance)} DWT`);
  console.log(`  Deployer:       ${hre.ethers.formatEther(finalDeployerBalance)} DWT`);
  
  console.log("\n" + "=".repeat(80));
  if (finalFlashLoanBalance > 0n && finalInsuranceBalance > 0n) {
    console.log("🎉 BOTH POOLS FUNDED SUCCESSFULLY!");
    console.log("=".repeat(80));
    console.log("\n✅ FlashLoan is now operational!");
    console.log("✅ InsuranceFund is now operational!");
    console.log("\nUsers can now:");
    console.log("  - Execute flash loans (up to 50% of pool per transaction)");
    console.log("  - File insurance claims (up to 20% per claim, 40% monthly)");
  } else if (finalFlashLoanBalance > 0n || finalInsuranceBalance > 0n) {
    console.log("⚠️  PARTIAL FUNDING COMPLETE");
    console.log("=".repeat(80));
  } else {
    console.log("⚠️  FUNDING SKIPPED - No DWT tokens available");
    console.log("=".repeat(80));
    console.log("\nTo fund manually:");
    console.log("  1. Get DWT tokens from faucet or token owner");
    console.log("  2. Transfer to FlashLoan: " + FLASH_LOAN);
    console.log("  3. Deposit to InsuranceFund using depositFund()");
  }
  
  console.log("\n" + "=".repeat(80));
  console.log("🚀 Next: Verify contracts on BaseScan");
  console.log("=".repeat(80));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
