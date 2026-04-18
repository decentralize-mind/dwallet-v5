const hre = require("hardhat");

async function main() {
  const CHECK_ADDRESS = "0x04F8535645cbcACb782a97000D212eA95C1e7Ea8";
  
  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║       DWT Balance Check for Address                     ║");
  console.log("╚══════════════════════════════════════════════════════════╝\n");
  
  console.log("📍 Address:", CHECK_ADDRESS);
  
  // Check on multiple networks
  const networks = [
    { name: "sepolia", chainId: 11155111, dwtAddress: "0x3400b0167dA5b2dba0b88b9604eE7df4BFc1f1fa" },
    { name: "baseSepolia", chainId: 84532, dwtAddress: "0x3400b0167dA5b2dba0b88b9604eE7df4BFc1f1fa" },
    { name: "base", chainId: 8453, dwtAddress: "0x9ce235f8574bde67393884550F02135CE4fB8387" },
    { name: "ethereum", chainId: 1, dwtAddress: "0x3400b0167dA5b2dba0b88b9604eE7df4BFc1f1fa" },
  ];
  
  for (const network of networks) {
    console.log(`\n${"─".repeat(60)}`);
    console.log(`🔍 Checking ${network.name.toUpperCase()} (Chain ID: ${network.chainId})`);
    console.log(`   DWT Contract: ${network.dwtAddress}`);
    console.log("─".repeat(60));
    
    try {
      // Get provider for this network
      const provider = hre.ethers.provider;
      
      // Check native balance
      const nativeBalance = await provider.getBalance(CHECK_ADDRESS);
      const nativeSymbol = network.name === "ethereum" ? "ETH" : 
                          network.name === "sepolia" ? "ETH" :
                          network.name === "base" ? "ETH" :
                          network.name === "baseSepolia" ? "ETH" : "ETH";
      
      console.log(`\n💰 ${nativeSymbol} Balance: ${hre.ethers.formatEther(nativeBalance)}`);
      
      // Check DWT balance
      const DWT_ABI = [
        "function balanceOf(address) view returns (uint256)",
        "function decimals() view returns (uint8)",
        "function symbol() view returns (string)"
      ];
      
      const dwtContract = new hre.ethers.Contract(network.dwtAddress, DWT_ABI, provider);
      
      try {
        const [balance, decimals, symbol] = await Promise.all([
          dwtContract.balanceOf(CHECK_ADDRESS),
          dwtContract.decimals(),
          dwtContract.symbol()
        ]);
        
        const formattedBalance = hre.ethers.formatUnits(balance, decimals);
        
        console.log(`\n◈ DWT Balance: ${parseFloat(formattedBalance).toFixed(4)} ${symbol}`);
        console.log(`   Raw Balance: ${balance.toString()}`);
        console.log(`   USD Value (approx): $${(parseFloat(formattedBalance) * 3.50).toFixed(2)}`);
        
        if (parseFloat(formattedBalance) > 0) {
          console.log(`\n✅ DWT tokens found!`);
        } else {
          console.log(`\n⚠️  No DWT tokens found on this network`);
        }
        
      } catch (error) {
        console.log(`\n❌ Error fetching DWT balance: ${error.message}`);
      }
      
    } catch (error) {
      console.log(`\n❌ Network error: ${error.message}`);
    }
  }
  
  console.log("\n" + "═".repeat(60));
  console.log("✅ Balance check complete!");
  console.log("═".repeat(60) + "\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
