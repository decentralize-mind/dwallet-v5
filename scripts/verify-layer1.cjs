const { ethers } = require('hardhat');

async function main() {
  console.log('🔍 Verifying Layer 1 Contracts on BaseScan...\n');

  const fs = require('fs');
  const files = fs.readdirSync('.').filter(f => f.startsWith('deployment-layer1-baseSepolia'));
  if (files.length === 0) {
    throw new Error('❌ Layer 1 deployment file not found!');
  }
  const deployment = JSON.parse(fs.readFileSync(files[0], 'utf8'));

  const tokenAddress = deployment.contracts.dwtToken;
  const timelockAddress = deployment.contracts.timelock;
  const governorAddress = deployment.contracts.governor;
  const securityController = deployment.contracts.securityController;
  const lockEngine = deployment.contracts.lockEngine;

  console.log('📋 Contracts to Verify:');
  console.log('  DWTTokenEnhanced:', tokenAddress);
  console.log('  TimelockController:', timelockAddress);
  console.log('  DWTGovernor:', governorAddress, '\n');

  // Verify DWTTokenEnhanced
  console.log('═══ Verifying DWTTokenEnhanced ═══\n');
  try {
    await hre.run('verify:verify', {
      address: tokenAddress,
      constructorArguments: [
        deployment.deployer, // initialOwner
        securityController,  // _securityController
        securityController,  // _registry (placeholder)
        lockEngine,          // _lockEngine
        securityController   // _invariantChecker (placeholder)
      ],
    });
    console.log('✅ DWTTokenEnhanced verified!\n');
  } catch (error) {
    if (error.message.includes('Already Verified')) {
      console.log('✅ DWTTokenEnhanced already verified!\n');
    } else {
      console.log('⚠️  DWTTokenEnhanced verification failed:', error.message.split('\n')[0], '\n');
    }
  }

  // Verify TimelockController
  console.log('═══ Verifying TimelockController ═══\n');
  try {
    await hre.run('verify:verify', {
      address: timelockAddress,
      constructorArguments: [
        172800, // 48 hours in seconds
        [], // proposers (empty initially)
        [ethers.ZeroAddress], // executors (address(0))
        deployment.deployer // admin (deployer)
      ],
    });
    console.log('✅ TimelockController verified!\n');
  } catch (error) {
    if (error.message.includes('Already Verified')) {
      console.log('✅ TimelockController already verified!\n');
    } else {
      console.log('⚠️  TimelockController verification failed:', error.message.split('\n')[0], '\n');
    }
  }

  // Verify DWTGovernor
  console.log('═══ Verifying DWTGovernor ═══\n');
  try {
    await hre.run('verify:verify', {
      address: governorAddress,
      constructorArguments: [
        tokenAddress,      // DWT token
        timelockAddress    // Timelock
      ],
    });
    console.log('✅ DWTGovernor verified!\n');
  } catch (error) {
    if (error.message.includes('Already Verified')) {
      console.log('✅ DWTGovernor already verified!\n');
    } else {
      console.log('⚠️  DWTGovernor verification failed:', error.message.split('\n')[0], '\n');
    }
  }

  console.log('═══════════════════════════════════════════');
  console.log('🔗 BaseScan Links:');
  console.log('═══════════════════════════════════════════\n');
  console.log('  DWTTokenEnhanced:');
  console.log('  https://sepolia.basescan.org/address/' + tokenAddress);
  console.log('\n  TimelockController:');
  console.log('  https://sepolia.basescan.org/address/' + timelockAddress);
  console.log('\n  DWTGovernor:');
  console.log('  https://sepolia.basescan.org/address/' + governorAddress);
  console.log('');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
