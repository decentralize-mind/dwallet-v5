const hre = require("hardhat");

async function main() {
  console.log("\n" + "═".repeat(70));
  console.log("   CHECK DEPLOYER WALLET DWT BALANCE");
  console.log("═".repeat(70) + "\n");

  const DWT_TOKEN = "0x75A884C401A69481d4377F79dc1918b3D18e2aE8";
  const DEPLOYER = "0x4C0B7314441dfE8E61267C0d87Fc1A657611dCf5";

  console.log("📍 DWT Token:", DWT_TOKEN);
  console.log("👤 Deployer Wallet:", DEPLOYER, "\n");

  const DWT = await hre.ethers.getContractAt("DWTToken", DWT_TOKEN);
  const balance = await DWT.balanceOf(DEPLOYER);

  console.log("💰 DWT Balance:", hre.ethers.formatEther(balance), "DWT");

  if (balance >= hre.ethers.parseEther("2100000")) {
    console.log("\n✅ Sufficient balance to fund airdrop (needs 2.1M DWT)");
    console.log("\n🚀 Ready to send to airdrop contract!");
    console.log("   Run: npx hardhat run scripts/send-to-airdrop-simple.cjs --network baseSepolia");
  } else {
    console.log("\n⚠️  Need 2,100,000 DWT to fund airdrop");
    console.log("   Currently have:", hre.ethers.formatEther(balance), "DWT");
    console.log("   Still need:", hre.ethers.formatEther(hre.ethers.parseEther("2100000") - balance), "DWT");
  }

  console.log("\n" + "═".repeat(70) + "\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });
