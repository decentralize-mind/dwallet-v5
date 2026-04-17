const hre = require("hardhat");

async function main() {
  console.log("=".repeat(80));
  console.log("🎯 Get 500K DWT Tokens for Layer 5 Deployment");
  console.log("=".repeat(80));

  const [deployer] = await hre.ethers.getSigners();
  console.log("\n📝 Your wallet:", deployer.address);
  
  const network = hre.network.name;
  console.log("🌐 Network:", network);
  
  const ethBalance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("💰 ETH balance:", hre.ethers.formatEther(ethBalance), "ETH\n");

  // All known DWT token addresses
  const DWT_ADDRESSES = [
    "0x3400b0167dA5b2dba0b88b9604eE7df4BFc1f1fa", // From .env (74.27M supply)
    "0x769F23dd0F6bc92C9d9d914190Ae9006d3FbDe48", // From deployment file (16.55M supply, you're owner)
    "0xe149b32b97384131204C86a23459b544498BC46A"  // From funding script
  ];

  const TARGET_AMOUNT = hre.ethers.parseEther("500000"); // 500K DWT
  const TARGET_AMOUNTFormatted = "500,000";

  console.log("🎯 Target: Get", TARGET_AMOUNTFormatted, "DWT tokens\n");

  let successfulContract = null;
  let tokenOwner = null;

  // Check each token contract
  for (const tokenAddress of DWT_ADDRESSES) {
    console.log("─".repeat(80));
    console.log(`🔍 Checking token: ${tokenAddress}`);
    
    try {
      const tokenContract = await hre.ethers.getContractAt("DWTTokenEnhanced", tokenAddress);
      
      // Get token info
      const [name, symbol, decimals, totalSupply] = await Promise.all([
        tokenContract.name(),
        tokenContract.symbol(),
        tokenContract.decimals(),
        tokenContract.totalSupply()
      ]);

      const yourBalance = await tokenContract.balanceOf(deployer.address);
      const yourBalanceFormatted = hre.ethers.formatUnits(yourBalance, decimals);

      console.log(`   Name: ${name}`);
      console.log(`   Symbol: ${symbol}`);
      console.log(`   Total Supply: ${hre.ethers.formatUnits(totalSupply, decimals)}`);
      console.log(`   Your Balance: ${parseFloat(yourBalanceFormatted).toLocaleString()} ${symbol}`);

      // Check if you can mint (are you the owner?)
      try {
        const owner = await tokenContract.owner();
        console.log(`   Owner: ${owner}`);
        
        if (owner.toLowerCase() === deployer.address.toLowerCase()) {
          console.log(`   ✅ YOU ARE THE OWNER - Can mint tokens!`);
          
          // Mint 500K tokens
          console.log(`\n   🏭 Minting ${TARGET_AMOUNTFormatted} DWT...`);
          const mintTx = await tokenContract.mint(deployer.address, TARGET_AMOUNT);
          await mintTx.wait();
          
          const newBalance = await tokenContract.balanceOf(deployer.address);
          const newBalanceFormatted = hre.ethers.formatUnits(newBalance, decimals);
          
          console.log(`   ✅ Successfully minted ${TARGET_AMOUNTFormatted} DWT!`);
          console.log(`   ✅ New balance: ${parseFloat(newBalanceFormatted).toLocaleString()} ${symbol}`);
          
          successfulContract = tokenAddress;
          break;
        } else {
          console.log(`   ❌ Not the owner - cannot mint`);
        }
      } catch (e) {
        console.log(`   ⚠️  Cannot check owner: ${e.message}`);
      }

    } catch (error) {
      console.log(`   ❌ Error accessing contract: ${error.message}`);
    }
    
    console.log("");
  }

  // Summary
  console.log("=".repeat(80));
  if (successfulContract) {
    console.log("🎉 SUCCESS! You now have 500K DWT tokens!");
    console.log("=".repeat(80));
    console.log(`\n✅ Token Contract: ${successfulContract}`);
    console.log(`✅ Amount: ${TARGET_AMOUNTFormatted} DWT`);
    console.log(`✅ Wallet: ${deployer.address}`);
    console.log("\n🚀 You can now deploy Layer 5 Phase 2!");
    console.log("\nNext steps:");
    console.log("  1. Deploy Phase 2: npx hardhat run scripts/deploy-layer5-phase2.cjs --network baseSepolia");
    console.log("  2. Fund pools: npx hardhat run scripts/fund-layer5-pools.cjs --network baseSepolia");
  } else {
    console.log("⚠️  COULD NOT MINT TOKENS");
    console.log("=".repeat(80));
    console.log("\nPossible solutions:");
    console.log("\n1️⃣  Use the token where you're the owner:");
    console.log("   Address: 0x769F23dd0F6bc92C9d9d914190Ae9006d3FbDe48");
    console.log("   This contract should allow you to mint\n");
    
    console.log("2️⃣  Transfer from another wallet that has DWT:");
    console.log("   Check these addresses for DWT balances:");
    console.log("   - DAO Treasury: 0xb5002AC3EE2f8d10f6dCB5F3a9070d625d8d4417");
    console.log("   - Community: 0xd623AbBAc02cBB4984294c922E2f19bd3e98aF8d");
    console.log("   - Liquidity: 0x6259648010922027A7ED105b3196FB63Dd4Beb9d\n");
    
    console.log("3️⃣  Deploy a new test token with minting enabled");
  }
  console.log("=".repeat(80));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
