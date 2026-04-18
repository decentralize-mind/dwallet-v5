const hre = require("hardhat");

async function main() {
  console.log("\n═══════════════════════════════════════════════════");
  console.log("   DWT Token Balance Check - Active Contract");
  console.log("═══════════════════════════════════════════════════\n");

  // The most active contract
  const DWT_ADDRESS = "0x3400b0167dA5b2dba0b88b9604eE7df4BFc1f1fa";
  
  console.log(`📋 DWT Token Contract: ${DWT_ADDRESS}\n`);

  const DWT = await hre.ethers.getContractAt(
    "@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20",
    DWT_ADDRESS
  );

  // All addresses from .env
  const addresses = [
    { category: "Founders", name: "Founder 1", address: "0x20B2bD1fefBF0632AEf2654eB981c4192d618A21", expected: "3,500,000" },
    { category: "Founders", name: "Founder 2", address: "0xf18e59291febf91b0BAa57E10AD26711337ba722", expected: "3,500,000" },
    { category: "Founders", name: "Founder 3", address: "0xEaB8448c9398EA78F2EeF044a4eE961b5E302cd5", expected: "3,500,000" },
    
    { category: "Team", name: "Team 1", address: "0x2EC22ebD64f79283877e1AD8B9D13F89A76B45A0", expected: "636,364" },
    { category: "Team", name: "Team 4", address: "0x9756c9520030fc50625abe9f2ed706c4dBC21128", expected: "636,364" },
    { category: "Team", name: "Team 6", address: "0x20b9a63f1e98a84292245bd8ea6d329b30ccb5c9", expected: "636,364" },
    { category: "Team", name: "Team 9", address: "0xA7c3A20cAc20c72D070B32eb68046fB387e6Ed93", expected: "636,364" },
    
    { category: "Investor", name: "Investor 1", address: "0xcEB9E5A352CCE1A983198bB2bF654Ef245E7679E", expected: "8,400,000" },
    
    { category: "Airdrop", name: "Airdrop (Old)", address: "0xC8F1A0DbC619CDCe46fbD5d5067a11Dc4dC81c5c", expected: "2,100,000" },
    { category: "Airdrop", name: "SimpleAirdrop", address: "0xb1af2B0A54787bd6Fa0223E7b9e53C02127cB7db", expected: "2,100,000" },
    
    { category: "Advisor", name: "Advisor 3", address: "0x6dc977e84Dc9D35430bc7d8f8533Af4d870bCf3D", expected: "700,000" },
    
    { category: "Marketing", name: "Marketing 1", address: "0xb5096c6c915d1d46766AaDAc60a226F156611263", expected: "1,400,000" },
  ];

  console.log("💰 Checking balances...\n");

  let totalBalance = 0n;
  let addressesWithBalance = 0;

  for (const item of addresses) {
    const balance = await DWT.balanceOf(item.address);
    totalBalance += balance;
    
    if (balance > 0n) {
      addressesWithBalance++;
    }

    const balanceFormatted = hre.ethers.formatEther(balance);
    const icon = balance > 0n ? "✅" : "❌";
    
    console.log(`${icon} ${item.category.padEnd(10)} ${item.name.padEnd(15)}`);
    console.log(`   ${item.address}`);
    console.log(`   Balance: ${balanceFormatted.padStart(15)} DWT (Expected: ${item.expected})`);
    console.log("");
  }

  console.log("═".repeat(60));
  console.log(`📊 Summary:`);
  console.log(`   Total DWT in checked addresses: ${hre.ethers.formatEther(totalBalance)}`);
  console.log(`   Addresses with balance: ${addressesWithBalance}/${addresses.length}`);
  console.log("═".repeat(60));
  console.log("\n");
}

main().catch(console.error);
