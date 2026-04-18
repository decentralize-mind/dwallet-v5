const hre = require("hardhat");

async function main() {
  console.log("\n" + "═".repeat(70));
  console.log("   CHECK ALL DWT TOKEN RECIPIENTS");
  console.log("═".repeat(70) + "\n");

  const DWT_TOKEN = "0x75A884C401A69481d4377F79dc1918b3D18e2aE8";
  const DWT = await hre.ethers.getContractAt("DWTToken", DWT_TOKEN);

  // All recipients from .env
  const recipients = [
    { category: "Founders", label: "Founder 1", address: "0x20B2bD1fefBF0632AEf2654eB981c4192d618A21", expected: "3500000" },
    { category: "Founders", label: "Founder 2", address: "0xf18e59291febf91b0BAa57E10AD26711337ba722", expected: "3500000" },
    { category: "Founders", label: "Founder 3", address: "0xEaB8448c9398EA78F2EeF044a4eE961b5E302cd5", expected: "3500000" },
    
    { category: "Investors", label: "Investor 1", address: "0xcEB9E5A352CCE1A983198bB2bF654Ef245E7679E", expected: "8400000" },
    
    { category: "Team", label: "Team 1", address: "0x2EC22ebD64f79283877e1AD8B9D13F89A76B45A0", expected: "636364" },
    { category: "Team", label: "Team 2", address: "0x899b5138Bb2EEeBB1821B8D819ACeF91995Bab20", expected: "636364" },
    { category: "Team", label: "Team 3", address: "0x263a72260e4F08931119522260E4AC578F7e980C", expected: "636364" },
    { category: "Team", label: "Team 4", address: "0x9756c9520030fc50625abe9f2ed706c4dBC21128", expected: "636364" },
    { category: "Team", label: "Team 5", address: "0xBA27D9FB9dd2C664eFdA4d7e01d4D871BD3A5fCB", expected: "636364" },
    { category: "Team", label: "Team 6", address: "0x20b9a63f1e98A84292245bD8eA6d329B30ccB5c9", expected: "636364" },
    { category: "Team", label: "Team 7", address: "0xa97d7dB42A89a005dA23E5BDFc7BE7A65Bf00a19", expected: "636364" },
    { category: "Team", label: "Team 8", address: "0x3fcEDd6B24eE6E6306C066aDebcF5F1E06C6fC901", expected: "636364" },
    { category: "Team", label: "Team 9", address: "0xA7c3A20cAc20c72D070B32eb68046fB387e6Ed93", expected: "636364" },
    { category: "Team", label: "Team 10", address: "0xe060f01075CE7674dD8dB67a9cC3F03e25eD5B62", expected: "636364" },
    { category: "Team", label: "Team 11", address: "0x15fCca58E34e5070f3985428a4Bf24ACD0756b48", expected: "636360" },
    
    { category: "Airdrop", label: "Airdrop Contract", address: "0x11aE2b13FfB98D8Ba47a5CDAdD898CA85CA21b84", expected: "2100000" },
    { category: "Airdrop", label: "Airdrop Wallet", address: "0xaF261434cEad26E9C32c8a1d2DbaFa82c2593e67", expected: "0" },
    
    { category: "DAO", label: "DAO Treasury", address: "0xb5002AC3EE2f8d10f6dCB5F3a9070d625d8d4417", expected: "14000000" },
    { category: "DAO", label: "Community Rewards", address: "0xd623AbBAc02cBB4984294c922E2f19bd3e98aF8d", expected: "10500000" },
  ];

  let totalMinted = 0n;
  let totalExpected = 0n;
  let categorySummary = {};

  console.log("📍 DWT Token:", DWT_TOKEN, "\n");

  // Group by category
  for (const recipient of recipients) {
    if (!categorySummary[recipient.category]) {
      categorySummary[recipient.category] = { total: 0n, count: 0, funded: 0 };
    }
  }

  // Check each recipient
  console.log("─".repeat(70));
  console.log("RECIPIENT BALANCES:");
  console.log("─".repeat(70));

  for (const recipient of recipients) {
    const balance = await DWT.balanceOf(recipient.address);
    const expected = hre.ethers.parseEther(recipient.expected);
    
    totalMinted += balance;
    totalExpected += expected;
    
    categorySummary[recipient.category].total += balance;
    categorySummary[recipient.category].count++;
    
    const status = balance === expected ? "✅" : balance === 0n ? "❌" : "⚠️";
    if (balance === expected) {
      categorySummary[recipient.category].funded++;
    }

    console.log(`\n${status} ${recipient.category.padEnd(12)} | ${recipient.label.padEnd(20)}`);
    console.log(`   Address: ${recipient.address}`);
    console.log(`   Balance: ${hre.ethers.formatEther(balance).padStart(12)} DWT (Expected: ${recipient.expected.padStart(12)} DWT)`);
  }

  // Category summary
  console.log("\n" + "═".repeat(70));
  console.log("CATEGORY SUMMARY:");
  console.log("═".repeat(70));

  for (const [category, data] of Object.entries(categorySummary)) {
    console.log(`\n${category}:`);
    console.log(`  Total Balance: ${hre.ethers.formatEther(data.total)} DWT`);
    console.log(`  Recipients: ${data.funded}/${data.count} funded correctly`);
  }

  // Overall summary
  console.log("\n" + "═".repeat(70));
  console.log("OVERALL SUMMARY:");
  console.log("═".repeat(70));
  console.log(`\nTotal Minted:   ${hre.ethers.formatEther(totalMinted)} DWT`);
  console.log(`Total Expected: ${hre.ethers.formatEther(totalExpected)} DWT`);
  console.log(`Difference:     ${hre.ethers.formatEther(totalMinted - totalExpected)} DWT`);

  const totalSupply = await DWT.totalSupply();
  console.log(`\nToken Total Supply: ${hre.ethers.formatEther(totalSupply)} DWT`);

  console.log("\n" + "═".repeat(70) + "\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });
