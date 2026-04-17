const hre = require("hardhat");

async function main() {
  console.log("\n═══════════════════════════════════════════════════");
  console.log("   Check DWT Balances for Airdrop Funding");
  console.log("═══════════════════════════════════════════════════\n");

  const DWT_ADDRESS = "0xe149b32b97384131204C86a23459b544498BC46A";
  const DWT = await hre.ethers.getContractAt("@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20", DWT_ADDRESS);

  // Addresses from .env that might have DWT
  const addresses = [
    { name: "Airdrop (Old)", address: "0xC8F1A0DbC619CDCe46fbD5d5067a11Dc4dC81c5c", expected: "2,100,000" },
    { name: "Community Rewards", address: "0xd623AbBAc02cBB4984294c922E2f19bd3e98aF8d", expected: "10,500,000" },
    { name: "DAO Treasury", address: "0xb5002AC3EE2f8d10f6dCB5F3a9070d625d8d4417", expected: "14,000,000" },
    { name: "Liquidity & DEX", address: "0x6259648010922027A7ED105b3196FB63Dd4Beb9d", expected: "12,600,000" },
    { name: "Marketing 1", address: "0xb5096c6c915d1d46766AaDAc60a226F156611263", expected: "1,400,000" },
    { name: "Founder 1", address: "0x20B2bD1fefBF0632AEf2654eB981c4192d618A21", expected: "3,500,000" },
    { name: "Founder 2", address: "0xf18e59291febf91b0BAa57E10AD26711337ba722", expected: "3,500,000" },
    { name: "Founder 3", address: "0xEaB8448c9398EA78F2EeF044a4eE961b5E302cd5", expected: "3,500,000" },
    { name: "Investor 1", address: "0xcEB9E5A352CCE1A983198bB2bF654Ef245E7679E", expected: "8,400,000" },
  ];

  console.log("📊 Checking DWT balances...\n");

  let totalBalance = 0n;

  for (const item of addresses) {
    const balance = await DWT.balanceOf(item.address);
    const balanceFormatted = hre.ethers.formatEther(balance);
    totalBalance += balance;

    const hasBalance = balance > 0n;
    const icon = hasBalance ? "💰" : "❌";
    
    console.log(`${icon} ${item.name.padEnd(20)} ${item.address}`);
    console.log(`   Balance: ${balanceFormatted.padStart(15)} DWT (Expected: ${item.expected})`);
    console.log("");
  }

  console.log("═══════════════════════════════════════════════════");
  console.log(`💰 Total DWT in checked addresses: ${hre.ethers.formatEther(totalBalance)}`);
  console.log("═══════════════════════════════════════════════════\n");

  const AIRDROP_CONTRACT = "0xb1af2B0A54787bd6Fa0223E7b9e53C02127cB7db";
  console.log("🎯 SimpleAirdrop Contract:", AIRDROP_CONTRACT);
  const airdropBalance = await DWT.balanceOf(AIRDROP_CONTRACT);
  console.log("📊 Current Airdrop Balance:", hre.ethers.formatEther(airdropBalance), "DWT");
  console.log("🎯 Target: 2,100,000 DWT");
  console.log("⚠️  Need:", hre.ethers.formatEther(hre.ethers.parseEther("2100000") - airdropBalance), "DWT\n");
}

main().catch(console.error);
