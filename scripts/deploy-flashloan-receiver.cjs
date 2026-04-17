// Deploy FlashLoanReceiver and configure FlashLoan pool
const hre = require("hardhat");

async function main() {
  console.log("🚀 Deploying FlashLoanReceiver and configuring FlashLoan pool...\n");

  // Get deployer
  const [deployer] = await hre.ethers.getSigners();
  console.log("📍 Deployer address:", deployer.address);

  // Check balance
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("💰 Deployer balance:", hre.ethers.formatEther(balance), "ETH\n");

  // Addresses from your deployment
  const FLASH_LOAN_ADDRESS = "0x468772f20864403A0071690ef8c620D9E02BD649";
  const DWT_TOKEN_ADDRESS = "0x769F23dd0F6bc92C9d9d914190Ae9006d3FbDe48";

  // Step 1: Deploy FlashLoanReceiver
  console.log("📦 Step 1: Deploying FlashLoanReceiver contract...");
  const FlashLoanReceiver = await hre.ethers.getContractFactory("FlashLoanReceiver");
  const flashLoanReceiver = await FlashLoanReceiver.deploy(FLASH_LOAN_ADDRESS);
  await flashLoanReceiver.waitForDeployment();
  
  const receiverAddress = await flashLoanReceiver.getAddress();
  console.log("✅ FlashLoanReceiver deployed at:", receiverAddress);
  console.log("   FlashLoan contract:", FLASH_LOAN_ADDRESS);
  console.log("   Owner:", deployer.address);

  // Step 2: Check if DWT is already added to FlashLoan
  console.log("\n🔍 Step 2: Checking if DWT is supported in FlashLoan pool...");
  const FlashLoan = await hre.ethers.getContractAt("FlashLoan", FLASH_LOAN_ADDRESS);
  
  try {
    const isSupported = await FlashLoan.supportedTokens(DWT_TOKEN_ADDRESS);
    console.log("   DWT supported:", isSupported);
    
    if (!isSupported) {
      console.log("\n➕ Step 3: Adding DWT to FlashLoan pool...");
      const tx = await FlashLoan.addToken(DWT_TOKEN_ADDRESS, 9); // 9 bps = 0.09%
      await tx.wait();
      console.log("✅ DWT token added to FlashLoan pool!");
      console.log("   Fee: 0.09% (9 basis points)");
    } else {
      console.log("✅ DWT is already supported in the pool");
    }
  } catch (error) {
    console.error("❌ Error checking/adding DWT:", error.message);
    console.log("\n⚠️  You may need to call addToken manually with admin role");
  }

  // Step 3: Check pool balance
  console.log("\n💰 Step 4: Checking FlashLoan pool balance...");
  const IERC20 = await hre.ethers.getContractAt("@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20", DWT_TOKEN_ADDRESS);
  const poolBalance = await IERC20.balanceOf(FLASH_LOAN_ADDRESS);
  console.log("   Pool balance:", hre.ethers.formatEther(poolBalance), "DWT");
  
  if (poolBalance === 0n) {
    console.log("\n⚠️  WARNING: FlashLoan pool has 0 DWT balance!");
    console.log("   You need to transfer DWT to the FlashLoan contract to enable loans.");
    console.log("   Example: transfer 50000 DWT to", FLASH_LOAN_ADDRESS);
  } else {
    const maxLoan = await FlashLoan.getMaxFlashLoan(DWT_TOKEN_ADDRESS);
    console.log("   Max flash loan:", hre.ethers.formatEther(maxLoan), "DWT");
  }

  // Step 4: Verify deployment
  console.log("\n📋 Deployment Summary:");
  console.log("═══════════════════════════════════════");
  console.log("FlashLoan Contract:", FLASH_LOAN_ADDRESS);
  console.log("FlashLoanReceiver:", receiverAddress);
  console.log("DWT Token:", DWT_TOKEN_ADDRESS);
  console.log("Network:", hre.network.name);
  console.log("═══════════════════════════════════════\n");

  // Save deployment info
  const fs = require("fs");
  const deploymentInfo = {
    network: hre.network.name,
    timestamp: new Date().toISOString(),
    contracts: {
      flashLoan: FLASH_LOAN_ADDRESS,
      flashLoanReceiver: receiverAddress,
      dwtToken: DWT_TOKEN_ADDRESS,
    },
    deployer: deployer.address,
  };

  const outputPath = `deployment-flashloan-receiver-${hre.network.name}-${Date.now()}.json`;
  fs.writeFileSync(outputPath, JSON.stringify(deploymentInfo, null, 2));
  console.log("📄 Deployment info saved to:", outputPath);

  console.log("\n✅ FlashLoan setup complete!");
  console.log("\n📝 Next steps:");
  console.log("1. Update FlashLoanPanel.jsx to use FlashLoanReceiver address:", receiverAddress);
  console.log("2. Fund the FlashLoan pool with DWT tokens if balance is 0");
  console.log("3. Test flash loan execution through the UI");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
