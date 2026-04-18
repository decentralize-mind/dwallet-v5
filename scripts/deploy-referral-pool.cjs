// scripts/deploy-referral-pool.js
// Run with: npx hardhat run scripts/deploy-referral-pool.js --network baseSepolia

const hre = require('hardhat');
const fs = require('fs');
require('dotenv').config();

/**
 * Deploy ReferralPool Contract
 * 
 * This script deploys the ReferralPool contract to the specified network.
 * The ReferralPool handles automatic distribution of 10 DWT rewards
 * to both referrer and referee when a new user signs up via referral.
 * 
 * Usage:
 *   npx hardhat run scripts/deploy-referral-pool.js --network baseSepolia
 *   npx hardhat run scripts/deploy-referral-pool.js --network base
 */

async function main() {
  console.log("🚀 Deploying ReferralPool contract...\n");

  // Get the deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  
  // Get the balance
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "ETH\n");

  // Get DWT token address from environment or config
  const DWT_TOKEN_ADDRESS = process.env.DWT_TOKEN_ADDRESS || 
    "0xe149b32b97384131204C86a23459b544498BC46A"; // Base Sepolia default
  
  console.log("DWT Token Address:", DWT_TOKEN_ADDRESS);

  // Deploy the ReferralPool contract
  const ReferralPool = await hre.ethers.getContractFactory("ReferralPool");
  
  console.log("\n⏳ Deploying ReferralPool...");
  const referralPool = await ReferralPool.deploy(
    DWT_TOKEN_ADDRESS,
    deployer.address // Owner
  );

  await referralPool.waitForDeployment();

  const referralPoolAddress = await referralPool.getAddress();

  console.log("\n✅ ReferralPool deployed successfully!");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("Contract Address:", referralPoolAddress);
  console.log("DWT Token:", DWT_TOKEN_ADDRESS);
  console.log("Owner:", deployer.address);
  console.log("Reward Amount: 10 DWT per referral");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // Verify the contract on Etherscan (if on a supported network)
  if (process.env.BASESCAN_API_KEY) {
    console.log("⌛ Waiting for block confirmations before verification...");
    await referralPool.deploymentTransaction().wait(5);
    
    console.log("🔍 Verifying contract on Etherscan...");
    try {
      await hre.run("verify:verify", {
        address: referralPoolAddress,
        constructorArguments: [
          DWT_TOKEN_ADDRESS,
          deployer.address
        ],
      });
      console.log("✅ Contract verified on Etherscan\n");
    } catch (error) {
      console.log("⚠️  Verification failed:", error.message, "\n");
    }
  }

  // Fund the pool with initial DWT tokens (optional)
  const INITIAL_FUND_AMOUNT = process.env.INITIAL_REFERRAL_FUND || "1000"; // 1000 DWT
  console.log(`💰 To fund the pool with ${INITIAL_FUND_AMOUNT} DWT:`);
  console.log(`   1. Approve DWT transfer: dwtToken.approve("${referralPoolAddress}", ${hre.ethers.parseEther(INITIAL_FUND_AMOUNT)})`);
  console.log(`   2. Fund the pool: referralPool.fundPool(${hre.ethers.parseEther(INITIAL_FUND_AMOUNT)})`);
  console.log("\nOr use the fundPool() function directly after approval.\n");

  // Save deployment info
  const deploymentInfo = {
    network: hre.network.name,
    chainId: (await hre.ethers.provider.getNetwork()).chainId,
    contract: "ReferralPool",
    address: referralPoolAddress,
    dwtToken: DWT_TOKEN_ADDRESS,
    owner: deployer.address,
    rewardAmount: "10 DWT",
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    txHash: referralPool.deploymentTransaction().hash,
  };

  const outputPath = `deployments/referral-pool-${hre.network.name}.json`;
  fs.mkdirSync("deployments", { recursive: true });
  
  // Convert BigInt values to strings for JSON serialization
  const serializedInfo = {
    ...deploymentInfo,
    chainId: deploymentInfo.chainId.toString(),
    txHash: deploymentInfo.txHash || 'N/A'
  };
  
  fs.writeFileSync(outputPath, JSON.stringify(serializedInfo, null, 2));
  console.log("📝 Deployment info saved to:", outputPath);

  console.log("\n🎉 Deployment complete!");
  console.log("\nNext steps:");
  console.log("1. Update .env with: REFERRAL_POOL_ADDRESS=" + referralPool.address);
  console.log("2. Update src/config/contracts.js with the new address");
  console.log("3. Fund the pool with DWT tokens");
  console.log("4. Test the referral flow end-to-end");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
