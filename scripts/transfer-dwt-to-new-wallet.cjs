const hre = require("hardhat");

async function main() {
  // ═══════════════════════════════════════════════════════════
  // TRANSFER DETAILS
  // ═══════════════════════════════════════════════════════════
  
  const FROM_ADDRESS = "0x830E4DF895f967Ff2A29d1705DeB40CFc6d30b88";
  const TO_ADDRESS = "0xE721B35b248BC5776963443DFC93E66BC17e3a5a";
  const TRANSFER_AMOUNT = "5000"; // 5000 DWT
  
  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║           DWT Token Transfer Script                     ║");
  console.log("╚══════════════════════════════════════════════════════════╝\n");
  
  console.log("📤 From (Old Wallet):", FROM_ADDRESS);
  console.log("📥 To (New Wallet):  ", TO_ADDRESS);
  console.log("💰 Amount:           ", TRANSFER_AMOUNT, "DWT");
  console.log("💵 USD Value (approx): $", (parseFloat(TRANSFER_AMOUNT) * 3.50).toFixed(2), "\n");
  
  // DWT Token addresses on different networks
  const DWT_ADDRESSES = {
    sepolia: "0x3400b0167dA5b2dba0b88b9604eE7df4BFc1f1fa",
    baseSepolia: "0x3400b0167dA5b2dba0b88b9604eE7df4BFc1f1fa",
    base: "0x9ce235f8574bde67393884550F02135CE4fB8387",
    ethereum: "0x3400b0167dA5b2dba0b88b9604eE7df4BFc1f1fa",
  };
  
  // ERC20 ABI for transfer
  const ERC20_ABI = [
    "function balanceOf(address) view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function transfer(address to, uint256 amount) returns (bool)",
  ];
  
  // Check balance on each network
  console.log("═".repeat(60));
  console.log("Checking DWT balances on all networks...");
  console.log("═".repeat(60) + "\n");
  
  for (const [networkName, dwtAddress] of Object.entries(DWT_ADDRESSES)) {
    console.log(`\n🔍 Checking ${networkName.toUpperCase()}...`);
    console.log(`   DWT Contract: ${dwtAddress}`);
    
    try {
      const provider = hre.ethers.provider;
      const dwtContract = new hre.ethers.Contract(dwtAddress, ERC20_ABI, provider);
      
      // Check balance
      const balance = await dwtContract.balanceOf(FROM_ADDRESS);
      const decimals = await dwtContract.decimals();
      const formattedBalance = hre.ethers.formatUnits(balance, decimals);
      
      console.log(`   💰 Balance: ${parseFloat(formattedBalance).toFixed(4)} DWT`);
      
      if (parseFloat(formattedBalance) >= parseFloat(TRANSFER_AMOUNT)) {
        console.log(`   ✅ Sufficient balance to transfer ${TRANSFER_AMOUNT} DWT!`);
        console.log(`\n   ⚠️  NOTE: To execute this transfer, you need:`);
        console.log(`      - The PRIVATE KEY of the FROM_ADDRESS wallet`);
        console.log(`      - Some ETH for gas fees on ${networkName}`);
        console.log(`\n   📝 Transaction would be:`);
        console.log(`      dwtContract.transfer("${TO_ADDRESS}", ${hre.ethers.parseUnits(TRANSFER_AMOUNT, decimals)})`);
        
        return {
          network: networkName,
          dwtAddress: dwtAddress,
          balance: formattedBalance,
          sufficient: true
        };
      } else {
        console.log(`   ❌ Insufficient balance (need ${TRANSFER_AMOUNT} DWT)`);
      }
      
    } catch (error) {
      console.log(`   ⚠️  Error: ${error.message}`);
    }
  }
  
  console.log("\n" + "═".repeat(60));
  console.log("⚠️  IMPORTANT: This script CHECKS balances only.");
  console.log("═".repeat(60));
  console.log("\nTo actually transfer, you have 3 options:\n");
  
  console.log("OPTION 1: Use Your Toklo Wallet UI (Recommended)");
  console.log("─────────────────────────────────────────────────");
  console.log("1. Import your old wallet (0x830E...) into Toklo");
  console.log("2. Switch to the correct network where you have DWT");
  console.log("3. Click 'Send' button");
  console.log("4. Enter new address: 0xE721B35b248BC5776963443DFC93E66BC17e3a5a");
  console.log("5. Enter amount: 5000 DWT");
  console.log("6. Confirm transaction\n");
  
  console.log("OPTION 2: Use MetaMask Directly");
  console.log("────────────────────────────────");
  console.log("1. Import old wallet private key into MetaMask");
  console.log("2. Go to DWT token contract on BaseScan");
  console.log("3. Connect MetaMask to DWT contract");
  console.log("4. Use 'transfer' function");
  console.log("5. Enter recipient address and amount\n");
  
  console.log("OPTION 3: Use Hardhat Script (Advanced)");
  console.log("────────────────────────────────────────");
  console.log("1. Add your private key to .env file");
  console.log("2. Run: npx hardhat run scripts/execute-transfer.cjs --network base");
  console.log("3. Script will execute the transfer\n");
  
  console.log("═".repeat(60));
  console.log("📋 DWT Contract Addresses:");
  console.log("═".repeat(60));
  console.log("Base Mainnet:  0x9ce235f8574bde67393884550F02135CE4fB8387 ✅ LIVE");
  console.log("Sepolia:       0x3400b0167dA5b2dba0b88b9604eE7df4BFc1f1fa");
  console.log("Base Sepolia:  0x3400b0167dA5b2dba0b88b9604eE7df4BFc1f1fa\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
