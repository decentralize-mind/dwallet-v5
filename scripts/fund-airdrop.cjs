const hre = require("hardhat");

async function main() {
  console.log("\n═══════════════════════════════════════════════════");
  console.log("   Fund Airdrop Pool Script");
  console.log("═══════════════════════════════════════════════════\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Funding with account:", deployer.address);

  // Contract addresses - UPDATE THESE AFTER DEPLOYMENT
  const DWT_TOKEN_ADDRESS = "0xe149b32b97384131204C86a23459b544498BC46A";
  const AIRDROP_CONTRACT_ADDRESS = "0xb1af2B0A54787bd6Fa0223E7b9e53C02127cB7db"; // Deployed 2026-04-17

  console.log("\n📍 DWT Token:", DWT_TOKEN_ADDRESS);
  console.log("📍 Airdrop Contract:", AIRDROP_CONTRACT_ADDRESS);

  if (AIRDROP_CONTRACT_ADDRESS === "UPDATE_AFTER_DEPLOYMENT") {
    console.log("\n❌ ERROR: Please update AIRDROP_CONTRACT_ADDRESS in this script");
    console.log("   Run the deployment script first: npx hardhat run scripts/deploy-simple-airdrop.cjs --network baseSepolia");
    process.exit(1);
  }

  // Get DWT token contract
  const DWT = await hre.ethers.getContractAt("IERC20", DWT_TOKEN_ADDRESS);
  
  // Check deployer balance
  const deployerBalance = await DWT.balanceOf(deployer.address);
  console.log("\n💰 Deployer DWT Balance:", hre.formatEther(deployerBalance), "DWT");

  // Amount to transfer: 2.1M DWT
  const AIRDROP_AMOUNT = hre.ethers.parseEther("2100000");
  console.log("💸 Amount to transfer:", hre.formatEther(AIRDROP_AMOUNT), "DWT");

  if (deployerBalance < AIRDROP_AMOUNT) {
    console.log("\n❌ Insufficient DWT balance!");
    console.log("   Need:", hre.formatEther(AIRDROP_AMOUNT), "DWT");
    console.log("   Have:", hre.formatEther(deployerBalance), "DWT");
    console.log("   Missing:", hre.formatEther(AIRDROP_AMOUNT - deployerBalance), "DWT");
    process.exit(1);
  }

  console.log("\n⚠️  This will transfer 2,100,000 DWT to the airdrop contract");
  console.log("   10 second countdown... (Ctrl+C to cancel)\n");
  
  for (let i = 10; i > 0; i--) {
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
  const airdropBalance = await DWT.balanceOf(AIRDROP_CONTRACT_ADDRESS);
  const newDeployerBalance = await DWT.balanceOf(deployer.address);

  console.log("📊 Post-Transfer Balances:");
  console.log("  Airdrop Contract:", hre.formatEther(airdropBalance), "DWT");
  console.log("  Deployer:", hre.formatEther(newDeployerBalance), "DWT");

  // Get SimpleAirdrop contract to show stats
  const SimpleAirdrop = await hre.ethers.getContractFactory("SimpleAirdrop");
  const airdropContract = SimpleAirdrop.attach(AIRDROP_CONTRACT_ADDRESS);
  
  const maxClaims = await airdropContract.getRemainingClaims();
  console.log("\n🎯 Airdrop Pool Stats:");
  console.log("  Total DWT in pool:", hre.formatEther(airdropBalance), "DWT");
  console.log("  Per claim:", "5 DWT");
  console.log("  Maximum claims possible:", maxClaims.toString(), "wallets");
  console.log("  Estimated users:", maxClaims.toString());

  console.log("\n═══════════════════════════════════════════════════");
  console.log("   ✅ Airdrop Pool Funded Successfully!");
  console.log("═══════════════════════════════════════════════════");
  console.log("\nNext steps:");
  console.log("1. Update src/config/contracts.js with airdrop address");
  console.log("2. Add 'Claim 5 DWT' button to frontend");
  console.log("3. Test claiming with a test wallet");
  console.log("═══════════════════════════════════════════════════\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
