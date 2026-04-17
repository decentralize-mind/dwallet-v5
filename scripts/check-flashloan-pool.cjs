const hre = require("hardhat");

async function main() {
  console.log("🔍 Checking FlashLoan pool status...\n");

  const FLASH_LOAN_ADDRESS = "0x468772f20864403A0071690ef8c620D9E02BD649";
  const FLASH_LOAN_RECEIVER = "0x89b1E2b38196AD9F8dbC7fA75e8B135ac492B6c4";
  const DWT_TOKEN_ADDRESS = "0x769F23dd0F6bc92C9d9d914190Ae9006d3FbDe48";

  const [deployer] = await hre.ethers.getSigners();
  
  // Check DWT balance of flash loan contract
  const IERC20 = await hre.ethers.getContractAt("@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20", DWT_TOKEN_ADDRESS);
  const poolBalance = await IERC20.balanceOf(FLASH_LOAN_ADDRESS);
  
  console.log("📊 FlashLoan Pool Status:");
  console.log("═══════════════════════════════════════");
  console.log("Pool Address:", FLASH_LOAN_ADDRESS);
  console.log("Receiver Address:", FLASH_LOAN_RECEIVER);
  console.log("DWT Token:", DWT_TOKEN_ADDRESS);
  console.log("Pool Balance:", hre.ethers.formatEther(poolBalance), "DWT");
  
  const FlashLoan = await hre.ethers.getContractAt("FlashLoan", FLASH_LOAN_ADDRESS);
  const isSupported = await FlashLoan.supportedTokens(DWT_TOKEN_ADDRESS);
  console.log("DWT Supported:", isSupported);
  
  if (poolBalance > 0n) {
    const maxLoan = await FlashLoan.getMaxFlashLoan(DWT_TOKEN_ADDRESS);
    console.log("Max Flash Loan:", hre.ethers.formatEther(maxLoan), "DWT");
  }
  
  console.log("═══════════════════════════════════════\n");
  
  if (poolBalance === 0n) {
    console.log("⚠️  Pool is empty! You need to fund it.");
    console.log("\nTo fund the pool, run:");
    console.log(`npx hardhat run scripts/fund-flashloan-pool.cjs --network baseSepolia`);
  } else {
    console.log("✅ Pool is funded and ready!");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
