const hre = require("hardhat");

async function main() {
  console.log("\n═══════════════════════════════════════════════════");
  console.log("   Scan All Addresses for DWT Balance");
  console.log("═══════════════════════════════════════════════════\n");

  const DWT_ADDRESS = "0xe149b32b97384131204C86a23459b544498BC46A";
  const DWT = await hre.ethers.getContractAt("@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20", DWT_ADDRESS);

  // All addresses from .env and deployment files
  const addresses = [
    // Founders (15% = 10,500,000 DWT)
    { category: "Founder", name: "Founder 1", address: "0x20B2bD1fefBF0632AEf2654eB981c4192d618A21", expected: "3,500,000" },
    { category: "Founder", name: "Founder 2", address: "0xf18e59291febf91b0BAa57E10AD26711337ba722", expected: "3,500,000" },
    { category: "Founder", name: "Founder 3", address: "0xEaB8448c9398EA78F2EeF044a4eE961b5E302cd5", expected: "3,500,000" },

    // Team/Founding Members (10% = 7,000,000 DWT)
    { category: "Team", name: "Team 1", address: "0x2EC22ebD64f79283877e1AD8B9D13F89A76B45A0", expected: "636,364" },
    { category: "Team", name: "Team 2", address: "0x899b5138Bb2EEeBB1821B8D819ACeF91995Bab20", expected: "636,364" },
    { category: "Team", name: "Team 3", address: "0x263a72260e4F08931119522260E4AC578F7e980C", expected: "636,364" },
    { category: "Team", name: "Team 4", address: "0x9756c9520030fc50625abe9f2ed706c4dBC21128", expected: "636,364" },
    { category: "Team", name: "Team 5", address: "0xBA27D9FB9dd2C664eFdA4d7e01d4D871BD3A5fCB", expected: "636,364" },
    { category: "Team", name: "Team 6", address: "0x20b9a63f1e98A84292245bD8eA6d329B30ccB5c9", expected: "636,364" },
    { category: "Team", name: "Team 7", address: "0xa97d7dB42A89a005dA23E5BDFc7BE7A65Bf00a19", expected: "636,364" },
    { category: "Team", name: "Team 8", address: "0x3fcEDd6B24eE6E636C066aDebcF5F1E06C6fC901", expected: "636,364" },
    { category: "Team", name: "Team 9", address: "0xA7c3A20cAc20c72D070B32eb68046fB387e6Ed93", expected: "636,364" },
    { category: "Team", name: "Team 10", address: "0xe060f01075CE7674dD8dB67a9cC3F03e25eD5B62", expected: "636,364" },
    { category: "Team", name: "Team 11", address: "0x15fCca58E34e5070f3985428a4Bf24ACD0756b48", expected: "636,360" },

    // Investors (12% = 8,400,000 DWT)
    { category: "Investor", name: "Investor 1", address: "0xcEB9E5A352CCE1A983198bB2bF654Ef245E7679E", expected: "8,400,000" },

    // Treasury & Community (35% = 24,500,000 DWT)
    { category: "Treasury", name: "DAO Treasury", address: "0xb5002AC3EE2f8d10f6dCB5F3a9070d625d8d4417", expected: "14,000,000" },
    { category: "Community", name: "Community Rewards", address: "0xd623AbBAc02cBB4984294c922E2f19bd3e98aF8d", expected: "10,500,000" },

    // Airdrop (8% = 5,600,000 DWT - but only 2.1M allocated)
    { category: "Airdrop", name: "Airdrop (Old)", address: "0xC8F1A0DbC619CDCe46fbD5d5067a11Dc4dC81c5c", expected: "2,100,000" },
    { category: "Airdrop", name: "SimpleAirdrop (New)", address: "0xb1af2B0A54787bd6Fa0223E7b9e53C02127cB7db", expected: "2,100,000" },

    // Marketing (7% = 4,900,000 DWT)
    { category: "Marketing", name: "Marketing 1", address: "0xb5096c6c915d1d46766AaDAc60a226F156611263", expected: "1,400,000" },
    { category: "Marketing", name: "Marketing 2", address: "0xD73A1298C8Bc404d1F9ac1ccd1ec8455d158ec96", expected: "32,022" },
    { category: "Marketing", name: "Marketing 3", address: "0x2656f902c4d404e90673931857761483A33541aa", expected: "32,023" },

    // Liquidity & DEX (8% = 5,600,000 DWT)
    { category: "Liquidity", name: "Liquidity & DEX", address: "0x6259648010922027A7ED105b3196FB63Dd4Beb9d", expected: "12,600,000" },

    // Advisors (5% = 3,500,000 DWT)
    { category: "Advisor", name: "Advisor 1", address: "0x830E4DF895f967Ff2A29d1705DeB40CFc6d30b88", expected: "700,000" },
    { category: "Advisor", name: "Advisor 2", address: "0x81ac6b27625582F5a453fa9E3955A9bbbD2AE14E", expected: "700,000" },
    { category: "Advisor", name: "Advisor 3", address: "0x6dc977e84Dc9D35430bc7d8f8533Af4d870bCf3D", expected: "700,000" },
    { category: "Advisor", name: "Advisor 4", address: "0x649795F2b3fB180fe575B15476ad3c046e1F142F", expected: "700,000" },
    { category: "Advisor", name: "Advisor 5", address: "0xBdB89500560E26ea2e597Ea755969cf92d169495", expected: "700,000" },

    // Deployer
    { category: "Deployer", name: "Deployer", address: "0x4C0B7314441dfE8E61267C0d87Fc1A657611dCf5", expected: "0" },
  ];

  console.log("🔍 Checking DWT balances for all addresses...\n");

  let receiversWithBalance = [];
  let totalDWTFound = 0n;
  let categoryTotals = {};

  for (const item of addresses) {
    const balance = await DWT.balanceOf(item.address);
    
    if (balance > 0n) {
      const balanceFormatted = hre.ethers.formatEther(balance);
      totalDWTFound += balance;
      
      if (!categoryTotals[item.category]) {
        categoryTotals[item.category] = 0n;
      }
      categoryTotals[item.category] += balance;

      receiversWithBalance.push({
        ...item,
        balance: balanceFormatted
      });
    }
  }

  // Generate report
  console.log("═══════════════════════════════════════════════════");
  console.log("   DWT Token Holders Report");
  console.log("═══════════════════════════════════════════════════\n");

  if (receiversWithBalance.length === 0) {
    console.log("❌ No addresses with DWT balance found!");
    console.log("\nThis means DWT tokens have not been minted/distributed yet.");
    console.log("All allocated addresses show 0 DWT balance.");
  } else {
    console.log(`✅ Found ${receiversWithBalance.length} addresses with DWT\n`);

    console.log("📊 DWT Receivers:\n");
    console.log("│ Category   │ Name                  │ Address                                      │ Balance (DWT)   │");
    console.log("│------------│-----------------------│----------------------------------------------│-----------------│");

    for (const receiver of receiversWithBalance) {
      const addrShort = receiver.address.slice(0, 10) + "..." + receiver.address.slice(-8);
      console.log(`│ ${receiver.category.padEnd(10)} │ ${receiver.name.padEnd(21)} │ ${receiver.address.padEnd(44)} │ ${receiver.balance.padStart(15)} │`);
    }

    console.log("\n═══════════════════════════════════════════════════");
    console.log(`💰 Total DWT Distributed: ${hre.ethers.formatEther(totalDWTFound)}`);
    console.log("═══════════════════════════════════════════════════\n");

    // Category breakdown
    console.log("📈 Breakdown by Category:\n");
    for (const [category, total] of Object.entries(categoryTotals)) {
      const formatted = hre.ethers.formatEther(total);
      console.log(`  ${category.padEnd(15)} ${formatted.padStart(15)} DWT`);
    }
  }

  // Save to file
  const fs = require("fs");
  const reportData = {
    scannedAt: new Date().toISOString(),
    network: hre.network.name,
    dwtToken: DWT_ADDRESS,
    totalReceiversWithBalance: receiversWithBalance.length,
    totalDWTFound: hre.ethers.formatEther(totalDWTFound),
    receivers: receiversWithBalance,
    categoryTotals: Object.fromEntries(
      Object.entries(categoryTotals).map(([k, v]) => [k, hre.ethers.formatEther(v)])
    )
  };

  fs.writeFileSync("dwt-balances-report.json", JSON.stringify(reportData, null, 2));
  console.log("\n📄 Full report saved to: dwt-balances-report.json");
}

main().catch(console.error);
