const hre = require("hardhat");

async function main() {
  console.log("🔍 Getting correct FlashLoanReceiver address...\n");

  // The address from deployment logs
  const DEPLOYED_ADDRESS = "0x89b1E2b38196AD9F8dbC7FA75e8B135ac492B6c4";
  
  // Try to get the checksummed version
  try {
    const checksummed = hre.ethers.getAddress(DEPLOYED_ADDRESS.toLowerCase());
    console.log("✅ Correct checksummed address:");
    console.log(checksummed);
    
    // Verify the contract exists
    const FlashLoanReceiver = await hre.ethers.getContractAt("FlashLoanReceiver", checksummed);
    const owner = await FlashLoanReceiver.owner();
    console.log("\n✅ Contract verified!");
    console.log("Owner:", owner);
    
  } catch (error) {
    console.error("❌ Error:", error.message);
    
    // Try lowercase
    console.log("\nTrying lowercase...");
    const lower = DEPLOYED_ADDRESS.toLowerCase();
    console.log("Lowercase:", lower);
    
    const checksummed = hre.ethers.getAddress(lower);
    console.log("Checksummed:", checksummed);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
