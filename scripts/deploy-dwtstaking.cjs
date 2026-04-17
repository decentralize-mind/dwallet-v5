const { ethers } = require('hardhat');

async function main() {
  console.log('🚀 Deploying DWTStaking to Base Sepolia...\n');

  const [deployer] = await ethers.getSigners();
  console.log('📍 Deployer:', deployer.address);

  const DWT_TOKEN = '0x3A4B1a7aD971be03dEe83A7B61d575304C9C0b0f';
  const securityController = '0x813b537A21bF5AC6967E870db47Ec2770651B11F';

  console.log('📦 Deploying DWTStaking...');
  const DWTStaking = await ethers.getContractFactory('contracts/layer4/DWTStaking.sol:DWTStaking');
  const dwtStaking = await DWTStaking.deploy(
    DWT_TOKEN,
    securityController,
    deployer.address
  );
  await dwtStaking.waitForDeployment();
  const dwtStakingAddress = await dwtStaking.getAddress();
  console.log('✅ DWTStaking deployed to:', dwtStakingAddress);

  console.log('\n✅ Deployment Complete!');
  console.log('Address:', dwtStakingAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
