// Contract Verification Script for Base Sepolia
// Verifies all deployed Layer 9 contracts on Base Sepolia explorer

const hre = require("hardhat");

// Deployed contract addresses and their constructor arguments
const CONTRACTS_TO_VERIFY = [
  {
    name: "Layer7Security",
    address: "0x813b537A21bF5AC6967E870db47Ec2770651B11F",
    path: "contracts/layer7/Layer7Security.sol:Layer7Security",
    args: [
      ["0x4C0B7314441dfE8E61267C0d87Fc1A657611dCf5"], // signers
      1,                                                  // required
      100,                                                // maxCallsPerBlock
      hre.ethers.parseEther("100"),                      // maxValuePerBlock
      0                                                   // requiredKYCLevel
    ]
  },
  {
    name: "LockEngine",
    address: "0x059327A069Ba66A74ecF21fde8c1c0D2915e0DB3",
    path: "contracts/layer7/LockEngine.sol:LockEngine",
    args: [
      "0x4C0B7314441dfE8E61267C0d87Fc1A657611dCf5", // admin
      "0x4C0B7314441dfE8E61267C0d87Fc1A657611dCf5", // signer
      "0x813b537A21bF5AC6967E870db47Ec2770651B11F", // securityController
      "0x0000000000000000000000000000000000000000"  // invariantChecker (placeholder)
    ]
  },
  {
    name: "LendingMarket",
    address: "0xcbBc5E87BDdbD6A1346FD635efDB23C0cB944794",
    path: "contracts/layer9/LendingMarket.sol:LendingMarket",
    args: [
      "0x3400b0167dA5b2dba0b88b9604eE7df4BFc1f1fa", // DWT token
      "0x0000000000000000000000000000000000000000", // borrowToken (placeholder)
      "0x0000000000000000000000000000000000000000", // dwtPriceFeed (placeholder)
      "0x0000000000000000000000000000000000000000", // stablePriceFeed (placeholder)
      18,                                               // dwtDecimals
      6,                                                // stableDecimals
      "0x4C0B7314441dfE8E61267C0d87Fc1A657611dCf5", // admin
      "0x4C0B7314441dfE8E61267C0d87Fc1A657611dCf5", // governor
      "0x4C0B7314441dfE8E61267C0d87Fc1A657611dCf5", // guardian
      "0x813b537A21bF5AC6967E870db47Ec2770651B11F", // securityController
      "0x0000000000000000000000000000000000000000", // registry (placeholder)
      "0x059327A069Ba66A74ecF21fde8c1c0D2915e0DB3", // lockEngine
      "0x0000000000000000000000000000000000000000"  // invariantChecker (placeholder)
    ]
  },
  {
    name: "NFTMembership",
    address: "0x74297Fa47E6103148D3A4119d7B00C6a94B927D7",
    path: "contracts/layer9/NFTMembership.sol:NFTMembership",
    args: [
      "0x3400b0167dA5b2dba0b88b9604eE7df4BFc1f1fa", // DWT token
      "0x813b537A21bF5AC6967E870db47Ec2770651B11F"  // securityController
    ]
  },
  {
    name: "FeeRouter",
    address: "0x6552d7c4628e9e71c2E3cBEaB9f17CF67Bee1D89",
    path: "contracts/layer9/FeeRouter.sol:FeeRouter",
    args: [
      "0x4C0B7314441dfE8E61267C0d87Fc1A657611dCf5", // treasury
      "0x4C0B7314441dfE8E61267C0d87Fc1A657611dCf5", // liquidityPool
      "0x3400b0167dA5b2dba0b88b9604eE7df4BFc1f1fa", // governanceToken (DWT)
      "0x813b537A21bF5AC6967E870db47Ec2770651B11F", // securityController
      "0x4C0B7314441dfE8E61267C0d87Fc1A657611dCf5"  // owner
    ]
  },
  {
    name: "SwapRouter",
    address: "0x2a4b239C15f54218a30116c630a32d9305859a43",
    path: "contracts/layer9/SwapRouter.sol:SwapRouter",
    args: [
      "0x4C0B7314441dfE8E61267C0d87Fc1A657611dCf5", // admin
      "0x4C0B7314441dfE8E61267C0d87Fc1A657611dCf5", // governor
      "0x813b537A21bF5AC6967E870db47Ec2770651B11F", // securityController
      "0x0000000000000000000000000000000000000000", // registry (placeholder)
      "0x059327A069Ba66A74ecF21fde8c1c0D2915e0DB3", // lockEngine
      "0x0000000000000000000000000000000000000000"  // invariantChecker (placeholder)
    ]
  },
  {
    name: "DWalletStablecoin",
    address: "0x83852A1C0A6C13fa8aCD950e51A2A594A7D7Ec29",
    path: "contracts/layer9/DWalletStablecoin.sol:DWalletStablecoin",
    args: [
      "0x813b537A21bF5AC6967E870db47Ec2770651B11F", // securityController
      "0x0000000000000000000000000000000000000000", // registry (placeholder)
      "0x059327A069Ba66A74ecF21fde8c1c0D2915e0DB3", // lockEngine
      "0x0000000000000000000000000000000000000000", // invariantChecker (placeholder)
      "0x4C0B7314441dfE8E61267C0d87Fc1A657611dCf5", // admin
      "0x4C0B7314441dfE8E61267C0d87Fc1A657611dCf5", // governor
      hre.ethers.parseEther("10000000")               // globalDebtCeiling ($10M)
    ]
  }
];

async function main() {
  console.log("🔍 Starting Contract Verification on Base Sepolia...\n");
  
  for (const contract of CONTRACTS_TO_VERIFY) {
    console.log(`📝 Verifying ${contract.name}...`);
    console.log(`   Address: ${contract.address}`);
    
    try {
      await hre.run("verify:verify", {
        address: contract.address,
        constructorArguments: contract.args,
        contract: contract.path
      });
      
      console.log(`✅ ${contract.name} verified successfully!\n`);
      
      // Wait between verifications to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 5000));
      
    } catch (error) {
      if (error.message.includes("Already Verified")) {
        console.log(`ℹ️  ${contract.name} is already verified\n`);
      } else {
        console.error(`❌ Failed to verify ${contract.name}:`, error.message);
        console.log("   You may need to verify manually using:\n");
        console.log(`   npx hardhat verify --network baseSepolia \\`);
        console.log(`     --contract ${contract.path} \\`);
        console.log(`     ${contract.address} \\`);
        console.log(`     ${contract.args.map(arg => typeof arg === 'object' ? arg.toString() : arg).join(' \\\n     ')}\n`);
      }
    }
  }
  
  console.log("\n" + "=".repeat(60));
  console.log("🎉 Verification process complete!");
  console.log("=".repeat(60));
  console.log("\n💡 View your verified contracts on Base Sepolia Explorer:");
  console.log("https://sepolia.basescan.org/address/<CONTRACT_ADDRESS>\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });
