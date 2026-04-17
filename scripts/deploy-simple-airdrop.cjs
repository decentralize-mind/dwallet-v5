const hre = require("hardhat");

async function main() {
  console.log("\n═══════════════════════════════════════════════════");
  console.log("   SimpleAirdrop Deployment Script");
  console.log("═══════════════════════════════════════════════════\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "ETH\n");

  // DWT Token address on Base Sepolia
  const DWT_TOKEN_ADDRESS = "0xe149b32b97384131204C86a23459b544498BC46A";
  console.log("📍 DWT Token Address:", DWT_TOKEN_ADDRESS);

  // Deploy SimpleAirdrop contract
  console.log("\n🚀 Deploying SimpleAirdrop contract...\n");
  
  const SimpleAirdrop = await hre.ethers.getContractFactory("SimpleAirdrop");
  const simpleAirdrop = await SimpleAirdrop.deploy(DWT_TOKEN_ADDRESS);
  
  await simpleAirdrop.waitForDeployment();
  const airdropAddress = await simpleAirdrop.getAddress();
  
  console.log("✅ SimpleAirdrop deployed to:", airdropAddress);

  // Verify contract details
  console.log("\n📋 Contract Details:");
  try {
    console.log("  DWT Token:", await simpleAirdrop.dwtToken());
    console.log("  Claim Amount:", hre.ethers.formatEther(await simpleAirdrop.CLAIM_AMOUNT()), "DWT");
    console.log("  Owner:", await simpleAirdrop.owner());
    console.log("  Paused:", await simpleAirdrop.paused());
    console.log("  Total Claims:", await simpleAirdrop.totalClaims());
  } catch (error) {
    console.log("  (Contract verification pending - this is normal)");
  }

  // Check DWT balance of deployer
  const DWT = await hre.ethers.getContractAt("IERC20", DWT_TOKEN_ADDRESS);
  const deployerDWTBalance = await DWT.balanceOf(deployer.address);
  console.log("\n💰 Deployer DWT Balance:", hre.ethers.formatEther(deployerDWTBalance), "DWT");

  const AIRDROP_AMOUNT = hre.ethers.parseEther("2100000"); // 2.1M DWT
  console.log("  Required for airdrop pool:", hre.ethers.formatEther(AIRDROP_AMOUNT), "DWT");

  if (deployerDWTBalance >= AIRDROP_AMOUNT) {
    console.log("\n✅ Sufficient DWT balance to fund airdrop pool");
  } else {
    console.log("\n⚠️  Insufficient DWT balance!");
    console.log("  Need:", hre.ethers.formatEther(AIRDROP_AMOUNT), "DWT");
    console.log("  Have:", hre.ethers.formatEther(deployerDWTBalance), "DWT");
    console.log("  Please transfer DWT to deployer address first");
  }

  // Save deployment info
  const deploymentInfo = {
    network: hre.network.name,
    chainId: hre.network.config.chainId,
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    SimpleAirdrop: airdropAddress,
    DWTToken: DWT_TOKEN_ADDRESS,
    claimAmount: "5 DWT",
    initialAirdropPool: "2,100,000 DWT",
    maxClaims: "420,000 wallets",
    explorerUrl: `https://sepolia.basescan.org/address/${airdropAddress}`
  };

  const fs = require("fs");
  const fileName = `deployment-simpleairdrop-${hre.network.name}-${Date.now()}.json`;
  fs.writeFileSync(fileName, JSON.stringify(deploymentInfo, null, 2));
  console.log(`\n📄 Deployment info saved to: ${fileName}`);

  console.log("\n═══════════════════════════════════════════════════");
  console.log("   Next Steps:");
  console.log("═══════════════════════════════════════════════════");
  console.log("1. Transfer 2.1M DWT to:", airdropAddress);
  console.log("   Command: npx hardhat run scripts/fund-airdrop.js --network baseSepolia");
  console.log("\n2. Update src/config/contracts.js with airdrop address");
  console.log("\n3. Add 'Claim 5 DWT' button to frontend");
  console.log("\n4. Verify contract on Basescan:");
  console.log(`   npx hardhat verify --network baseSepolia ${airdropAddress} "${DWT_TOKEN_ADDRESS}"`);
  console.log("═══════════════════════════════════════════════════\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
