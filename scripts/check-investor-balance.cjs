const hre = require("hardhat");

async function main() {
  console.log("\n" + "═".repeat(70));
  console.log("   CHECK INVESTOR DWT BALANCE");
  console.log("═".repeat(70) + "\n");

  // Contract addresses
  const DWT_TOKEN = "0x75A884C401A69481d4377F79dc1918b3D18e2aE8";
  
  // Investor address from .env
  const INVESTOR_1 = "0xcEB9E5A352CCE1A983198bB2bF654Ef245E7679E";
  const INVESTOR_1_AMOUNT = "8400000"; // 8.4M DWT

  console.log("📍 DWT Token:", DWT_TOKEN);
  console.log("👤 Investor 1:", INVESTOR_1);
  console.log("💰 Expected Amount:", INVESTOR_1_AMOUNT, "DWT\n");

  // Get DWT token contract
  const DWT = await hre.ethers.getContractAt("DWTToken", DWT_TOKEN);

  // Check investor balance
  const investorBalance = await DWT.balanceOf(INVESTOR_1);
  console.log("📊 Actual Balance:", hre.ethers.formatEther(investorBalance), "DWT");

  if (investorBalance === 0n) {
    console.log("\n❌ Investor has 0 DWT tokens!");
    console.log("\n🔍 Possible reasons:");
    console.log("  1. Tokens were never minted to this address");
    console.log("  2. Deployment script didn't include this investor");
    console.log("  3. Wrong address in .env file");
    console.log("  4. Minting failed during deployment");
    
    console.log("\n📋 Checking token owner...");
    const owner = await DWT.owner();
    console.log("  Token Owner:", owner);
    
    console.log("\n💡 Solutions:");
    console.log("  Option 1: Mint tokens to investor now (if you're the owner)");
    console.log("  Option 2: Check deployment logs to see if minting occurred");
    console.log("  Option 3: Verify the correct investor address");
  } else {
    const expectedBalance = hre.ethers.parseEther(INVESTOR_1_AMOUNT);
    if (investorBalance === expectedBalance) {
      console.log("✅ Balance matches expected amount!");
    } else {
      console.log("⚠️  Balance doesn't match expected amount");
      console.log("  Expected:", INVESTOR_1_AMOUNT, "DWT");
      console.log("  Actual:", hre.ethers.formatEther(investorBalance), "DWT");
    }
  }

  // Check total supply
  const totalSupply = await DWT.totalSupply();
  console.log("\n📊 Token Total Supply:", hre.ethers.formatEther(totalSupply), "DWT");

  console.log("\n" + "═".repeat(70) + "\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });
