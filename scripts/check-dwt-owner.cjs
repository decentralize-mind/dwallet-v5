const hre = require("hardhat");

async function main() {
  console.log("\n═══════════════════════════════════════════════════");
  console.log("   Check DWT Token Owner");
  console.log("═══════════════════════════════════════════════════\n");

  const DWT_ADDRESS = "0xe149b32b97384131204C86a23459b544498BC46A";
  
  // Try to get owner - assuming it's Ownable
  try {
    const DWT = await hre.ethers.getContractAt("DWTToken", DWT_ADDRESS);
    const owner = await DWT.owner();
    console.log("✅ DWT Token Owner:", owner);
    
    const [deployer] = await hre.ethers.getSigners();
    console.log("👤 Current Deployer:", deployer.address);
    
    if (owner.toLowerCase() === deployer.address.toLowerCase()) {
      console.log("\n✅ You are the owner! You can mint DWT tokens.");
      console.log("\nNext step: Run the mint-to-airdrop script");
    } else {
      console.log("\n⚠️  You are NOT the owner.");
      console.log("The owner address is:", owner);
      console.log("\nYou need the owner's private key to mint tokens.");
    }
  } catch (error) {
    console.log("❌ Could not get owner. Trying alternative method...");
    console.log("Error:", error.message);
  }
}

main().catch(console.error);
