const hre = require("hardhat");

async function main() {
  console.log("\n" + "═".repeat(70));
  console.log("   SEND DWT TO AIRDROP CONTRACT - SIMPLE SCRIPT");
  console.log("═".repeat(70) + "\n");

  // Contract addresses
  const DWT_TOKEN = "0x75A884C401A69481d4377F79dc1918b3D18e2aE8";
  const AIRDROP_CONTRACT = "0x11aE2b13FfB98D8Ba47a5CDAdD898CA85CA21b84";
  const AIRDROP_AMOUNT = "2100000"; // 2.1M DWT

  console.log("📍 DWT Token:", DWT_TOKEN);
  console.log("📍 Airdrop Contract:", AIRDROP_CONTRACT);
  console.log("💸 Amount to send:", AIRDROP_AMOUNT, "DWT\n");

  // Get signer (this should be a wallet that has DWT tokens)
  const [signer] = await hre.ethers.getSigners();
  console.log("👤 Sending from:", signer.address);

  // Get DWT token contract
  const DWT = await hre.ethers.getContractAt("DWTToken", DWT_TOKEN);

  // Check balance
  const balance = await DWT.balanceOf(signer.address);
  console.log("💰 Your DWT Balance:", hre.ethers.formatEther(balance), "DWT\n");

  const amountWei = hre.ethers.parseEther(AIRDROP_AMOUNT);

  if (balance < amountWei) {
    console.log("❌ Insufficient balance!");
    console.log("   You need:", AIRDROP_AMOUNT, "DWT");
    console.log("   You have:", hre.ethers.formatEther(balance), "DWT");
    console.log("\n💡 Solution: Use a wallet that has DWT tokens");
    console.log("   Investor wallet has 8,400,000 DWT:");
    console.log("   0xcEB9E5A352CCE1A983198bB2bF654Ef245E7679E");
    process.exit(1);
  }

  // Check airdrop balance before
  const airdropBefore = await DWT.balanceOf(AIRDROP_CONTRACT);
  console.log("🎁 Airdrop contract balance (before):", hre.ethers.formatEther(airdropBefore), "DWT\n");

  console.log("⚠️  This will transfer 2,100,000 DWT to the airdrop contract");
  console.log("   10 second countdown... (Press Ctrl+C to cancel)\n");

  for (let i = 10; i > 0; i--) {
    process.stdout.write(`   ${i}... `);
    await new Promise(r => setTimeout(r, 1000));
  }
  console.log("\n");

  // Execute transfer
  console.log("🔄 Transferring DWT...\n");
  
  try {
    const tx = await DWT.transfer(AIRDROP_CONTRACT, amountWei);
    console.log("📝 Transaction Hash:", tx.hash);
    console.log("⏳ Waiting for confirmation...\n");
    
    await tx.wait();
    console.log("✅ Transaction confirmed!\n");

    // Check balances after
    const airdropAfter = await DWT.balanceOf(AIRDROP_CONTRACT);
    const yourBalanceAfter = await DWT.balanceOf(signer.address);

    console.log("📊 Balances After Transfer:");
    console.log("  Airdrop Contract:", hre.ethers.formatEther(airdropAfter), "DWT ✅");
    console.log("  Your Wallet:", hre.ethers.formatEther(yourBalanceAfter), "DWT");

    // Calculate how many users can claim
    const maxClaims = await getMaxClaims();
    console.log("\n🎯 Airdrop Stats:");
    console.log("  Total in pool:", hre.ethers.formatEther(airdropAfter), "DWT");
    console.log("  Per user claim: 5 DWT");
    console.log("  Max users can claim:", maxClaims.toLocaleString());

    console.log("\n" + "═".repeat(70));
    console.log("   ✅ SUCCESS! Airdrop contract funded!");
    console.log("═".repeat(70));

    console.log("\n🔗 View on BaseScan:");
    console.log("  Transaction:", `https://sepolia.basescan.org/tx/${tx.hash}`);
    console.log("  Airdrop Contract:", `https://sepolia.basescan.org/address/${AIRDROP_CONTRACT}`);
    console.log("  DWT Token:", `https://sepolia.basescan.org/token/${DWT_TOKEN}\n`);

  } catch (error) {
    console.error("\n❌ Transaction failed:", error.message);
    process.exit(1);
  }
}

async function getMaxClaims() {
  try {
    const SimpleAirdrop = await hre.ethers.getContractFactory("SimpleAirdrop");
    const AIRDROP_CONTRACT = "0x11aE2b13FfB98D8Ba47a5CDAdD898CA85CA21b84";
    const airdropContract = SimpleAirdrop.attach(AIRDROP_CONTRACT);
    const remaining = await airdropContract.getRemainingClaims();
    return Number(remaining);
  } catch {
    return 420000; // 2.1M / 5
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });
