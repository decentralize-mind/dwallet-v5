const hre = require("hardhat");

async function main() {
  console.log("\n═══════════════════════════════════════════════════");
  console.log("   Checking DWT Contract: 0x769F23dd0F6bc92C9d9d914190Ae9006d3FbDe48");
  console.log("═══════════════════════════════════════════════════\n");

  const CONTRACT_ADDRESS = "0x769F23dd0F6bc92C9d9d914190Ae9006d3FbDe48";
  
  try {
    // Try to get basic contract info
    const code = await hre.ethers.provider.getCode(CONTRACT_ADDRESS);
    
    if (code === "0x") {
      console.log("❌ No contract found at this address");
      console.log("   This address does not contain a smart contract");
      return;
    }
    
    console.log("✅ Contract exists at this address");
    console.log(`   Bytecode length: ${code.length} characters\n`);

    // Try to interact as ERC20
    const DWT = await hre.ethers.getContractAt(
      "@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20",
      CONTRACT_ADDRESS
    );

    // Check if it has basic ERC20 functions
    console.log("🔍 Checking ERC20 functionality...\n");

    try {
      const totalSupply = await DWT.totalSupply();
      console.log(`✅ totalSupply() works: ${hre.ethers.formatEther(totalSupply)} tokens`);
    } catch (error) {
      console.log(`❌ totalSupply() failed: ${error.message}`);
    }

    try {
      const decimals = await DWT.decimals();
      console.log(`✅ decimals() works: ${decimals}`);
    } catch (error) {
      console.log(`❌ decimals() failed: ${error.message}`);
    }

    try {
      const name = await DWT.name();
      console.log(`✅ name() works: ${name}`);
    } catch (error) {
      console.log(`❌ name() failed: ${error.message}`);
    }

    try {
      const symbol = await DWT.symbol();
      console.log(`✅ symbol() works: ${symbol}`);
    } catch (error) {
      console.log(`❌ symbol() failed: ${error.message}`);
    }

    // Check some key balances
    console.log("\n💰 Checking key addresses balances:\n");

    const addresses = [
      { name: "Investor 1", address: "0xcEB9E5A352CCE1A983198bB2bF654Ef245E7679E" },
      { name: "Founder 1", address: "0x20B2bD1fefBF0632AEf2654eB981c4192d618A21" },
      { name: "Founder 3", address: "0xEaB8448c9398EA78F2EeF044a4eE961b5E302cd5" },
    ];

    for (const item of addresses) {
      try {
        const balance = await DWT.balanceOf(item.address);
        const formatted = hre.ethers.formatEther(balance);
        const icon = balance > 0n ? "✅" : "❌";
        console.log(`${icon} ${item.name}: ${formatted} DWT`);
      } catch (error) {
        console.log(`❌ ${item.name}: Error checking balance`);
      }
    }

  } catch (error) {
    console.log(`❌ Error accessing contract: ${error.message}`);
  }

  console.log("\n═══════════════════════════════════════════════════\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
