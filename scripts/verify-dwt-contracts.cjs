const hre = require("hardhat");

async function main() {
  console.log("\n═══════════════════════════════════════════════════");
  console.log("   DWT Token Contract Verification & Balance Check");
  console.log("═══════════════════════════════════════════════════\n");

  // All DWT token addresses found in the project
  const dwtContracts = [
    "0x769F23dd0F6bc92C9d9d914190Ae9006d3FbDe48",  // From DWT-DEPLOYMENT-SUCCESS.md
    "0xe149b32b97384131204C86a23459b544498BC46A",  // From recent scripts
    "0x3400b0167dA5b2dba0b88b9604eE7df4BFc1f1fa",  // From older scripts
  ];

  // Key addresses to check
  const addressesToCheck = [
    { name: "Investor 1", address: "0xcEB9E5A352CCE1A983198bB2bF654Ef245E7679E" },
    { name: "Founder 1", address: "0x20B2bD1fefBF0632AEf2654eB981c4192d618A21" },
    { name: "Airdrop (Old)", address: "0xC8F1A0DbC619CDCe46fbD5d5067a11Dc4dC81c5c" },
    { name: "SimpleAirdrop", address: "0xb1af2B0A54787bd6Fa0223E7b9e53C02127cB7db" },
  ];

  console.log("🔍 Checking all DWT token contracts...\n");

  for (const contractAddress of dwtContracts) {
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`📋 DWT Contract: ${contractAddress}`);
    console.log(`${'═'.repeat(60)}`);

    try {
      const DWT = await hre.ethers.getContractAt(
        "@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20",
        contractAddress
      );

      // Get token info
      const [name, symbol, totalSupply, decimals] = await Promise.all([
        DWT.name().catch(() => "Unknown"),
        DWT.symbol().catch(() => "Unknown"),
        DWT.totalSupply().catch(() => 0n),
        DWT.decimals().catch(() => 18),
      ]);

      console.log(`  Token Name: ${name}`);
      console.log(`  Symbol: ${symbol}`);
      console.log(`  Total Supply: ${hre.ethers.formatUnits(totalSupply, decimals)} ${symbol}`);
      console.log(`  Decimals: ${decimals}`);

      // Check balances for key addresses
      console.log(`\n  💰 Balances:`);
      for (const item of addressesToCheck) {
        const balance = await DWT.balanceOf(item.address);
        const formattedBalance = hre.ethers.formatUnits(balance, decimals);
        const icon = balance > 0n ? "✅" : "❌";
        console.log(`    ${icon} ${item.name.padEnd(15)} ${formattedBalance.padStart(15)} ${symbol}`);
      }
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`);
    }
  }

  console.log(`\n${'═'.repeat(60)}`);
  console.log("📊 Summary:");
  console.log(`${'═'.repeat(60)}\n`);

  // Find the contract with the most activity
  let activeContract = null;
  let maxHolders = 0;

  for (const contractAddress of dwtContracts) {
    try {
      const DWT = await hre.ethers.getContractAt(
        "@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20",
        contractAddress
      );

      let holdersWithBalance = 0;
      for (const item of addressesToCheck) {
        const balance = await DWT.balanceOf(item.address);
        if (balance > 0n) holdersWithBalance++;
      }

      if (holdersWithBalance > maxHolders) {
        maxHolders = holdersWithBalance;
        activeContract = contractAddress;
      }

      console.log(`  ${contractAddress}: ${holdersWithBalance} addresses with balance`);
    } catch (error) {
      console.log(`  ${contractAddress}: Invalid contract`);
    }
  }

  if (activeContract) {
    console.log(`\n✅ Most Active Contract: ${activeContract}`);
    console.log(`   (This is likely the correct/active DWT token)`);
  }

  console.log("\n═══════════════════════════════════════════════════\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
