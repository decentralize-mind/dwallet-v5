const hre = require("hardhat");

async function main() {
  console.log("\n═══════════════════════════════════════════════════");
  console.log("   Mint DWT to SimpleAirdrop Contract");
  console.log("═══════════════════════════════════════════════════\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const DWT_ADDRESS = "0xe149b32b97384131204C86a23459b544498BC46A";
  const AIRDROP_ADDRESS = "0xb1af2B0A54787bd6Fa0223E7b9e53C02127cB7db";

  // Try different contract names
  let DWT;
  const contractNames = ["DWTTokenEnhanced", "DWTTokenSimple", "IDWTToken"];
  
  for (const name of contractNames) {
    try {
      DWT = await hre.ethers.getContractAt(name, DWT_ADDRESS);
      console.log(`✅ Using contract: ${name}`);
      break;
    } catch (e) {
      // Try next
    }
  }

  if (!DWT) {
    console.log("❌ Could not find correct contract interface");
    console.log("Trying with minimal ABI...");
    
    // Minimal ABI for mint and owner
    const minimalABI = [
      "function owner() view returns (address)",
      "function mint(address to, uint256 amount) external"
    ];
    DWT = new hre.ethers.Contract(DWT_ADDRESS, minimalABI, deployer);
  }

  // Check owner
  try {
    const owner = await DWT.owner();
    console.log("\n👑 DWT Token Owner:", owner);
    console.log("👤 Your Address:  ", deployer.address);

    if (owner.toLowerCase() !== deployer.address.toLowerCase()) {
      console.log("\n❌ You are not the owner!");
      console.log("Please use the owner's private key in .env file");
      process.exit(1);
    }

    console.log("\n✅ You are the owner!");
  } catch (error) {
    console.log("⚠️  Could not verify ownership, proceeding anyway...");
  }

  // Check current balance
  const IERC20_ABI = ["function balanceOf(address) view returns (uint256)"];
  const IERC20 = new hre.ethers.Contract(DWT_ADDRESS, IERC20_ABI, deployer);
  
  const currentBalance = await IERC20.balanceOf(AIRDROP_ADDRESS);
  console.log("\n📊 Current airdrop balance:", hre.ethers.formatEther(currentBalance), "DWT");

  const MINT_AMOUNT = hre.ethers.parseEther("2100000"); // 2.1M DWT
  console.log("💰 Amount to mint:", hre.ethers.formatEther(MINT_AMOUNT), "DWT");

  console.log("\n⚠️  This will mint 2,100,000 DWT to the airdrop contract");
  console.log("   10 second countdown... (Ctrl+C to cancel)\n");
  
  for (let i = 10; i > 0; i--) {
    process.stdout.write(`   ${i}... `);
    await new Promise(r => setTimeout(r, 1000));
  }
  console.log("\n");

  // Mint tokens
  console.log("🔄 Minting DWT to airdrop contract...\n");
  
  try {
    const tx = await DWT.mint(AIRDROP_ADDRESS, MINT_AMOUNT);
    console.log("📝 Transaction hash:", tx.hash);
    
    await tx.wait();
    console.log("✅ Transaction confirmed!\n");

    // Verify new balance
    const newBalance = await IERC20.balanceOf(AIRDROP_ADDRESS);
    console.log("📊 New airdrop balance:", hre.ethers.formatEther(newBalance), "DWT");
    
    const maxClaims = newBalance / hre.ethers.parseEther("5");
    console.log("\n🎯 Airdrop Pool Ready!");
    console.log("  Total DWT:", hre.ethers.formatEther(newBalance));
    console.log("  Per claim: 5 DWT");
    console.log("  Max users:", maxClaims.toString());

    console.log("\n═══════════════════════════════════════════════════");
    console.log("   ✅ SUCCESS! Airdrop pool is now funded!");
    console.log("═══════════════════════════════════════════════════\n");
  } catch (error) {
    console.error("\n❌ Minting failed:", error.message);
    console.error("\nPossible reasons:");
    console.error("1. You're not the token owner");
    console.error("2. The mint function has different parameters");
    console.error("3. The contract doesn't have a mint function");
  }
}

main().catch(console.error);
