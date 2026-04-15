const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer Address:", deployer.address);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Balance:", hre.formatEther(balance), "ETH\n");
  
  if (balance === 0n) {
    console.log("⚠️  WARNING: Zero balance!");
    console.log("Get free Base Sepolia ETH from:");
    console.log("  https://faucets.chain.link/base-sepolia");
    console.log("  https://www.alchemy.com/faucets/base-sepolia\n");
  } else if (balance < hre.parseEther("0.05")) {
    console.log("⚠️  Low balance! Recommended: at least 0.05 ETH\n");
  } else {
    console.log("✅ Balance looks good for deployment!\n");
  }
}

main().catch(console.error);
