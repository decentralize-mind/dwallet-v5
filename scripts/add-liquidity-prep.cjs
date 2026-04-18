const hre = require("hardhat");

async function main() {
  console.log("\n" + "═".repeat(70));
  console.log("   ADD LIQUIDITY - PREPARATION SCRIPT");
  console.log("═".repeat(70) + "\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("📍 Account:", deployer.address);
  
  // Check network
  const network = await hre.ethers.provider.getNetwork();
  console.log("🌐 Network:", network.name, "(Chain ID:", network.chainId, ")\n");

  // Contract addresses
  const DWT_TOKEN_ADDRESS = "0x75A884C401A69481d4377F79dc1918b3D18e2aE8";
  const WETH_ADDRESS = "0x4200000000000000000000000000000000000006"; // Base WETH

  console.log("📍 DWT Token:", DWT_TOKEN_ADDRESS);
  console.log("📍 WETH:", WETH_ADDRESS);

  // Get DWT token contract
  const DWT = await hre.ethers.getContractAt("DWTToken", DWT_TOKEN_ADDRESS);

  // Check balances
  const dwtBalance = await DWT.balanceOf(deployer.address);
  const ethBalance = await hre.ethers.provider.getBalance(deployer.address);

  console.log("\n💰 Current Balances:");
  console.log("  DWT:", hre.ethers.formatEther(dwtBalance), "DWT");
  console.log("  ETH:", hre.ethers.formatEther(ethBalance), "ETH");

  // Liquidity recommendations
  console.log("\n📊 Liquidity Pool Recommendations:");
  console.log("  ┌─────────────────────────────────────────────┐");
  console.log("  │  Pool Size    │  DWT Amount  │  ETH Amount  │");
  console.log("  ├─────────────────────────────────────────────┤");
  console.log("  │  Small        │  100,000 DWT │  ~0.5 ETH    │");
  console.log("  │  Medium       │  500,000 DWT │  ~2.5 ETH    │");
  console.log("  │  Large        │  1,000,000 DWT│  ~5 ETH      │");
  console.log("  └─────────────────────────────────────────────┘");

  // DEX options on Base
  console.log("\n🔄 Available DEXes on Base:");
  console.log("  1. Uniswap V3 - https://app.uniswap.org");
  console.log("  2. Aerodrome - https://aerodrome.finance");
  console.log("  3. BaseSwap - https://baseswap.fi");
  console.log("  4. SushiSwap - https://www.sushi.com");

  // Manual steps for adding liquidity
  console.log("\n📋 Manual Steps to Add Liquidity:");
  console.log("\n  Option 1: Uniswap V3 (Recommended)");
  console.log("  1. Go to https://app.uniswap.org/#/pool");
  console.log("  2. Connect your wallet");
  console.log("  3. Click 'New Position'");
  console.log("  4. Select DWT/WETH pair");
  console.log("  5. Set price range and liquidity amount");
  console.log("  6. Approve DWT token spending");
  console.log("  7. Add liquidity");

  console.log("\n  Option 2: Aerodrome (Base-native DEX)");
  console.log("  1. Go to https://aerodrome.finance/liquidity");
  console.log("  2. Connect wallet");
  console.log("  3. Select DWT/WETH pool");
  console.log("  4. Add equal value of both tokens");
  console.log("  5. Confirm transaction");

  // Smart contract approach (for automated setup)
  console.log("\n🤖 Automated Setup (Advanced):");
  console.log("  Requires:");
  console.log("  - Uniswap V3 Router: 0x2626664c2603336E57B271c5C0b26F421741e481");
  console.log("  - Uniswap V3 Position Manager: 0x03a520b32C04BF3bEEf7BEb72E919cf822Ed34f1");
  console.log("  - Sufficient ETH for gas and liquidity");

  // Important considerations
  console.log("\n⚠️  Important Considerations:");
  console.log("  ✓ Set appropriate price range (V3)");
  console.log("  ✓ Monitor impermanent loss");
  console.log("  ✓ Consider locking liquidity for trust");
  console.log("  ✓ Start with smaller amount to test");
  console.log("  ✓ Keep some DWT for airdrop and operations");

  // Liquidity lock recommendation
  console.log("\n🔒 Liquidity Lock (Recommended for Trust):");
  console.log("  After adding liquidity, consider locking it:");
  console.log("  - Team Finance: https://team.finance");
  console.log("  - Unicrypt: https://unicrypt.network");
  console.log("  - PinkSale: https://www.pinksale.finance");

  console.log("\n" + "═".repeat(70));
  console.log("   📋 LIQUIDITY PREPARATION COMPLETE!");
  console.log("═".repeat(70));
  
  console.log("\n🎯 Next Steps:");
  console.log("  1. Decide on liquidity amount (DWT + ETH)");
  console.log("  2. Choose DEX (Uniswap V3 or Aerodrome)");
  console.log("  3. Add liquidity manually via DEX interface");
  console.log("  4. Consider locking liquidity for community trust");
  console.log("  5. Share pool address with community");
  
  console.log("\n🔗 Useful Links:");
  console.log("   Token: https://sepolia.basescan.org/token/" + DWT_TOKEN_ADDRESS);
  console.log("   Uniswap: https://app.uniswap.org");
  console.log("   Aerodrome: https://aerodrome.finance\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });
