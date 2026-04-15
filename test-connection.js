const hre = require("hardhat");

async function main() {
  try {
    console.log("🔍 Testing Base Sepolia connection...");
    
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deployer:", deployer.address);
    
    const balance = await hre.ethers.provider.getBalance(deployer.address);
    console.log("Balance:", hre.formatEther(balance), "ETH");
    
    const network = await hre.ethers.provider.getNetwork();
    console.log("Network:", network.name, "(Chain ID:", network.chainId.toString(), ")");
    
    console.log("\n✅ Connection successful!");
  } catch (error) {
    console.error("\n❌ Connection failed:", error.message);
    process.exit(1);
  }
}

main().catch(console.error);
