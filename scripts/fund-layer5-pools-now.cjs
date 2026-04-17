const hre = require("hardhat");

async function main() {
  console.log("=".repeat(80));
  console.log("💰 Funding Layer 5 Pools from Deployer Wallet");
  console.log("=".repeat(80));

  const [deployer] = await hre.ethers.getSigners();
  console.log("\n📝 Deployer address:", deployer.address);
  
  const network = hre.network.name;
  console.log("🌐 Network:", network);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("💰 ETH balance:", hre.ethers.formatEther(balance), "ETH\n");

  // Contract addresses
  const FLASH_LOAN = "0x468772f20864403A0071690ef8c620D9E02BD649";
  const INSURANCE_FUND = "0x8ba2Bb332764217079DFFb280dD70C8B351B5770";
  const DWT_TOKEN = hre.ethers.getAddress("0xe149b32b97384131204C86a23459b544498BC46A");

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

  // ───────────────────────────────────────────────────────────────────────────
  // Fund FlashLoan Pool
  // ───────────────────────────────────────────────────────────────────────────
  
  console.log("\n" + "─".repeat(80));
  console.log("⚡ Step 1: Funding FlashLoan Pool with 50,000 DWT...");
  
  const flashLoanAmount = hre.ethers.parseEther("50000"); // 50k DWT
  
  try {
    const transferTx = await DWTToken.transfer(FLASH_LOAN, flashLoanAmount);
    console.log("  ⏳ Transferring 50,000 DWT to FlashLoan...");
    await transferTx.wait();
    
    const newBalance = await DWTToken.balanceOf(FLASH_LOAN);
    console.log(`  ✅ Successfully transferred 50,000 DWT to FlashLoan`);
    console.log(`  ✅ FlashLoan new balance: ${hre.ethers.formatEther(newBalance)} DWT`);
    
    // Get FlashLoan contract to check max loan
    const FlashLoan = await hre.ethers.getContractAt("FlashLoan", FLASH_LOAN);
    const maxLoan = await FlashLoan.getMaxFlashLoan(DWT_TOKEN);
    console.log(`  ✅ Max flash loan allowed: ${hre.ethers.formatEther(maxLoan)} DWT (50% of pool)`);
    
  } catch (error) {
    console.error(`  ❌ Failed to fund FlashLoan: ${error.message}`);
    throw error;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Fund Insurance Fund
  // ───────────────────────────────────────────────────────────────────────────
  
  console.log("\n" + "─".repeat(80));
  console.log("🛡️  Step 2: Funding Insurance Fund with 100,000 DWT...");
  
  const insuranceAmount = hre.ethers.parseEther("100000"); // 100k DWT
  
  try {
    // Approve InsuranceFund to spend DWT
    console.log("  ⏳ Approving InsuranceFund to spend 100,000 DWT...");
    const approveTx = await DWTToken.approve(INSURANCE_FUND, insuranceAmount);
    await approveTx.wait();
    console.log("  ✅ Approval successful");
    
    // Deposit to InsuranceFund
    const InsuranceFund = await hre.ethers.getContractAt("InsuranceFund", INSURANCE_FUND);
    console.log("  ⏳ Depositing 100,000 DWT to InsuranceFund...");
    const depositTx = await InsuranceFund.depositFund(DWT_TOKEN, insuranceAmount);
    await depositTx.wait();
    
    const newBalance = await DWTToken.balanceOf(INSURANCE_FUND);
    console.log(`  ✅ Successfully deposited 100,000 DWT to InsuranceFund`);
    console.log(`  ✅ InsuranceFund new balance: ${hre.ethers.formatEther(newBalance)} DWT`);
    
    // Show claim limits
    const maxClaim = await InsuranceFund.getMaxClaimAmount(DWT_TOKEN);
    const rollingCap = await InsuranceFund.getRemainingRollingCap(DWT_TOKEN);
    console.log(`  ✅ Max single claim: ${hre.ethers.formatEther(maxClaim)} DWT (20%)`);
    console.log(`  ✅ Rolling 30-day cap: ${hre.ethers.formatEther(rollingCap)} DWT (40%)`);
    
  } catch (error) {
    console.error(`  ❌ Failed to fund InsuranceFund: ${error.message}`);
    throw error;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Final Summary
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
  if (finalFlashLoanBalance >= hre.ethers.parseEther("50000") && 
      finalInsuranceBalance >= hre.ethers.parseEther("100000")) {
    console.log("🎉 BOTH POOLS FUNDED SUCCESSFULLY!");
    console.log("=".repeat(80));
    console.log("\n✅ FlashLoan is now OPERATIONAL!");
    console.log("   - Max loan per transaction: 25,000 DWT (50% of pool)");
    console.log("   - Fee: 0.09% per loan");
    console.log("\n✅ InsuranceFund is now OPERATIONAL!");
    console.log("   - Max single claim: 20,000 DWT (20% of fund)");
    console.log("   - Rolling 30-day cap: 40,000 DWT (40% of fund)");
    console.log("   - Execution delay: 48 hours after approval");
    console.log("\n🚀 Layer 5 is now FULLY OPERATIONAL on Base Sepolia!");
  } else {
    console.log("⚠️  Funding may have partially failed. Check balances above.");
  }
  
  console.log("\n" + "=".repeat(80));
  console.log("🔗 BaseScan Links:");
  console.log("=".repeat(80));
  console.log("FlashLoan:");
  console.log(`  https://sepolia.basescan.org/address/${FLASH_LOAN}`);
  console.log("\nInsuranceFund:");
  console.log(`  https://sepolia.basescan.org/address/${INSURANCE_FUND}`);
  console.log("=" .repeat(80));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
