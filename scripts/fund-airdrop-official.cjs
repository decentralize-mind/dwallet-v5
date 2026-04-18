const hre = require("hardhat");

async function main() {
  console.log("\n" + "═".repeat(70));
  console.log("   FUND AIRDROP CONTRACT - 2.1M DWT");
  console.log("═".repeat(70) + "\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("📍 Account:", deployer.address);
  
  // Check network
  const network = await hre.ethers.provider.getNetwork();
  console.log("🌐 Network:", network.name, "(Chain ID:", network.chainId, ")\n");

  // Contract addresses from official-dwt.md
  const DWT_TOKEN_ADDRESS = "0x75A884C401A69481d4377F79dc1918b3D18e2aE8";
  const AIRDROP_CONTRACT_ADDRESS = "0x11aE2b13FfB98D8Ba47a5CDAdD898CA85CA21b84";
  const AIRDROP_AMOUNT = hre.ethers.parseEther("2100000"); // 2.1M DWT

  console.log("📍 DWT Token:", DWT_TOKEN_ADDRESS);
  console.log("📍 Airdrop Contract:", AIRDROP_CONTRACT_ADDRESS);
  console.log("💸 Amount to transfer:", hre.ethers.formatEther(AIRDROP_AMOUNT), "DWT\n");

  // Get DWT token contract
  const DWT = await hre.ethers.getContractAt("DWTToken", DWT_TOKEN_ADDRESS);
  
  // Check deployer balance
  const deployerBalance = await DWT.balanceOf(deployer.address);
  console.log("💰 Deployer DWT Balance:", hre.ethers.formatEther(deployerBalance), "DWT");

  if (deployerBalance < AIRDROP_AMOUNT) {
    console.log("\n❌ Insufficient DWT balance!");
    console.log("   Need:", hre.ethers.formatEther(AIRDROP_AMOUNT), "DWT");
    console.log("   Have:", hre.ethers.formatEther(deployerBalance), "DWT");
    console.log("   Missing:", hre.ethers.formatEther(AIRDROP_AMOUNT - deployerBalance), "DWT");
    process.exit(1);
  }

  // Check current airdrop balance
  const airdropBalanceBefore = await DWT.balanceOf(AIRDROP_CONTRACT_ADDRESS);
  console.log("🎁 Airdrop Contract Balance (before):", hre.ethers.formatEther(airdropBalanceBefore), "DWT\n");

  console.log("⚠️  This will transfer 2,100,000 DWT to the airdrop contract");
  console.log("   5 second countdown... (Ctrl+C to cancel)\n");
  
  for (let i = 5; i > 0; i--) {
    process.stdout.write(`   ${i}... `);
    await new Promise(r => setTimeout(r, 1000));
  }
  console.log("\n");

  // Transfer DWT to airdrop contract
  console.log("🔄 Transferring DWT to airdrop contract...\n");
  
  const tx = await DWT.transfer(AIRDROP_CONTRACT_ADDRESS, AIRDROP_AMOUNT);
  console.log("📝 Transaction hash:", tx.hash);
  
  await tx.wait();
  console.log("✅ Transaction confirmed!\n");

  // Verify balances
  const airdropBalanceAfter = await DWT.balanceOf(AIRDROP_CONTRACT_ADDRESS);
  const newDeployerBalance = await DWT.balanceOf(deployer.address);

  console.log("📊 Post-Transfer Balances:");
  console.log("  Airdrop Contract:", hre.ethers.formatEther(airdropBalanceAfter), "DWT");
  console.log("  Deployer:", hre.ethers.formatEther(newDeployerBalance), "DWT\n");

  // Get SimpleAirdrop contract to show stats
  const SimpleAirdrop = await hre.ethers.getContractFactory("SimpleAirdrop");
  const airdropContract = SimpleAirdrop.attach(AIRDROP_CONTRACT_ADDRESS);
  
  const maxClaims = await airdropContract.getRemainingClaims();
  console.log("🎯 Airdrop Pool Stats:");
  console.log("  Total DWT in pool:", hre.ethers.formatEther(airdropBalanceAfter), "DWT");
  console.log("  Per claim:", "5 DWT");
  console.log("  Maximum claims possible:", maxClaims.toString(), "wallets");
  console.log("  Estimated users:", maxClaims.toString());

  console.log("\n" + "═".repeat(70));
  console.log("   ✅ AIRDROP CONTRACT FUNDED SUCCESSFULLY!");
  console.log("═".repeat(70));
  
  console.log("\n🔗 View on BaseScan:");
  console.log("   Token: https://sepolia.basescan.org/token/" + DWT_TOKEN_ADDRESS);
  console.log("   Airdrop: https://sepolia.basescan.org/address/" + AIRDROP_CONTRACT_ADDRESS);
  console.log("   Tx: https://sepolia.basescan.org/tx/" + tx.hash + "\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });
