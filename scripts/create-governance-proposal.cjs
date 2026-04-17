const { ethers } = require('hardhat');

async function main() {
  console.log('🏛️ Creating Governance Proposal to Mint Test Tokens...\n');

  const [deployer] = await ethers.getSigners();
  console.log('📍 Deployer:', deployer.address);

  // Load deployment
  const fs = require('fs');
  const files = fs.readdirSync('.').filter(f => f.startsWith('deployment-layer1-baseSepolia'));
  if (files.length === 0) {
    throw new Error('❌ Layer 1 deployment file not found!');
  }
  const deployment = JSON.parse(fs.readFileSync(files[0], 'utf8'));

  const tokenAddress = deployment.contracts.dwtToken;
  const timelockAddress = deployment.contracts.timelock;
  const governorAddress = deployment.contracts.governor;

  console.log('\n📋 Contracts:');
  console.log('  DWT Token:', tokenAddress);
  console.log('  Timelock:', timelockAddress);
  console.log('  Governor:', governorAddress);

  // Get contract instances
  const DWTToken = await ethers.getContractFactory('DWTTokenEnhanced');
  const dwtToken = DWTToken.attach(tokenAddress);

  const Governor = await ethers.getContractFactory('DWTGovernor');
  const governor = Governor.attach(governorAddress);

  const Timelock = await ethers.getContractFactory(
    '@openzeppelin/contracts/governance/TimelockController.sol:TimelockController'
  );
  const timelock = Timelock.attach(timelockAddress);

  // Check current state
  console.log('\n═══ Current State ═══\n');
  
  const totalSupply = await dwtToken.totalSupply();
  console.log('  Current Total Supply:', ethers.formatEther(totalSupply), 'DWT');
  
  const deployerBalance = await dwtToken.balanceOf(deployer.address);
  console.log('  Your Balance:', ethers.formatEther(deployerBalance), 'DWT');
  
  const proposalThreshold = await governor.proposalThreshold();
  console.log('  Proposal Threshold:', ethers.formatEther(proposalThreshold), 'DWT');
  
  const hasEnoughTokens = deployerBalance >= proposalThreshold;
  console.log('\n  ⚠️  You have enough tokens to propose:', hasEnoughTokens ? '✅ YES' : '❌ NO');

  if (!hasEnoughTokens) {
    console.log('\n═══════════════════════════════════════════');
    console.log('⚠️  INSUFFICIENT TOKENS');
    console.log('═══════════════════════════════════════════\n');
    console.log('  You need:', ethers.formatEther(proposalThreshold), 'DWT to create a proposal');
    console.log('  You have:', ethers.formatEther(deployerBalance), 'DWT');
    console.log('\n  🔧 SOLUTION: Use Hardhat local network for testing');
    console.log('  Or manually transfer tokens from a testnet faucet\n');
    console.log('  For now, I\'ll show you the EXACT steps to follow:\n');

    console.log('═══════════════════════════════════════════');
    console.log('📝 STEP-BY-STEP GUIDE');
    console.log('═══════════════════════════════════════════\n');

    console.log('Step 1: Get Test DWT Tokens\n');
    console.log('  Option A: Use Hardhat Local Network');
    console.log('    npx hardhat node');
    console.log('    # This gives you accounts with test tokens\n');
    console.log('  Option B: Request from Testnet Faucet');
    console.log('    # Ask someone with DWT to transfer to you\n');
    console.log('  Option C: Use Governance Emergency Mint\n');
    console.log('    # If protocol has emergency mint function\n');

    console.log('Step 2: Once You Have 100k+ DWT\n');
    console.log('  const targets = ["' + tokenAddress + '"];');
    console.log('  const values = [0];');
    console.log('  const mintAmount = ethers.parseEther("1000000"); // 1M DWT');
    console.log('  const calldatas = [');
    console.log('    dwtToken.interface.encodeFunctionData("mint", [');
    console.log('      "' + deployer.address + '",');
    console.log('      mintAmount');
    console.log('    ])');
    console.log('  ];');
    console.log('  const description = "Mint 1M DWT for testing purposes";');
    console.log('');
    console.log('  await governor.propose(targets, values, calldatas, description);\n');

    console.log('Step 3: Wait 24 Hours (Voting Delay)\n');
    console.log('  # Voting starts after 7,200 blocks (~24 hours)\n');

    console.log('Step 4: Cast Your Vote\n');
    console.log('  const proposalId = ...; // From proposal event');
    console.log('  await governor.castVote(proposalId, 1); // 1 = For\n');

    console.log('Step 5: Wait for Voting Period (7 days)\n');
    console.log('  # Wait for quorum (4% of supply)\n');

    console.log('Step 6: Queue Proposal\n');
    console.log('  await governor.queue(proposalId);\n');

    console.log('Step 7: Wait 48 Hours (Timelock)\n');
    console.log('  # Timelock enforces 48-hour delay\n');

    console.log('Step 8: Execute Proposal\n');
    console.log('  await governor.execute(proposalId);\n');

    console.log('═══════════════════════════════════════════\n');

    // Create a simulation to show what WOULD happen
    console.log('═══ SIMULATION: What Will Happen ═══\n');

    const mintAmount = ethers.parseEther('1000000'); // 1M DWT
    const targets = [tokenAddress];
    const values = [0];
    const calldatas = [
      dwtToken.interface.encodeFunctionData('mint', [deployer.address, mintAmount])
    ];
    const description = 'Mint 1,000,000 DWT for testing governance and staking';

    console.log('  Proposal Details:');
    console.log('    Target:', tokenAddress);
    console.log('    Function: mint(address,uint256)');
    console.log('    Arguments:');
    console.log('      - To:', deployer.address);
    console.log('      - Amount: 1,000,000 DWT');
    console.log('    Description:', description);
    console.log('');
    console.log('  Timeline:');
    console.log('    T+0:     Proposal created');
    console.log('    T+1 day: Voting starts');
    console.log('    T+8 days: Voting ends');
    console.log('    T+8 days: Queue proposal (if quorum reached)');
    console.log('    T+10 days: Execute (after 48h timelock)');
    console.log('    T+10 days: Receive 1M DWT tokens ✅');
    console.log('');
    console.log('  Total Wait Time: ~10 days');
    console.log('');

    // Save proposal details for later
    const proposalDetails = {
      status: 'SIMULATION_ONLY',
      reason: 'Insufficient tokens to propose',
      proposal: {
        targets: targets,
        values: values.map(String),
        calldatas: calldatas,
        description: description
      },
      timeline: {
        proposalCreated: 'T+0',
        votingStarts: 'T+1 day',
        votingEnds: 'T+8 days',
        queueProposal: 'T+8 days (if quorum)',
        timelockEnds: 'T+10 days',
        executeAndReceive: 'T+10 days'
      },
      amounts: {
        mintAmount: ethers.formatEther(mintAmount),
        proposalThreshold: ethers.formatEther(proposalThreshold),
        currentBalance: ethers.formatEther(deployerBalance)
      }
    };

    const filename = `layer1-proposal-simulation-${Date.now()}.json`;
    fs.writeFileSync(filename, JSON.stringify(proposalDetails, null, 2));
    console.log(`  💾 Simulation saved to: ${filename}`);
    console.log('');

    return;
  }

  // If user has enough tokens, create actual proposal
  console.log('\n═══ Creating Proposal ═══\n');

  const mintAmount = ethers.parseEther('1000000'); // 1M DWT
  const targets = [tokenAddress];
  const values = [0];
  const calldatas = [
    dwtToken.interface.encodeFunctionData('mint', [deployer.address, mintAmount])
  ];
  const description = 'Mint 1,000,000 DWT for testing governance and staking';

  console.log('  Proposal Details:');
  console.log('    Target:', tokenAddress);
  console.log('    Function: mint(address,uint256)');
  console.log('    To:', deployer.address);
  console.log('    Amount: 1,000,000 DWT');
  console.log('    Description:', description);
  console.log('');

  // Create proposal
  console.log('  Creating proposal...');
  const tx = await governor.propose(targets, values, calldatas, description);
  const receipt = await tx.wait();

  // Get proposal ID from events
  const proposalCreatedEvent = receipt.logs.find(log => {
    try {
      const parsed = governor.interface.parseLog(log);
      return parsed.name === 'ProposalCreated';
    } catch {
      return false;
    }
  });

  let proposalId;
  if (proposalCreatedEvent) {
    const parsed = governor.interface.parseLog(proposalCreatedEvent);
    proposalId = parsed.args.proposalId;
    console.log('  ✅ Proposal created!');
    console.log('  Proposal ID:', proposalId.toString());
  }

  console.log('  Transaction:', receipt.hash);
  console.log('');

  // Get proposal state
  const state = await governor.state(proposalId);
  const stateNames = ['Pending', 'Active', 'Canceled', 'Defeated', 'Succeeded', 'Queued', 'Expired', 'Executed'];
  console.log('  Current State:', stateNames[state]);
  console.log('');

  // Save proposal details
  const proposalDetails = {
    status: 'CREATED',
    proposalId: proposalId.toString(),
    transactionHash: receipt.hash,
    proposal: {
      targets: targets,
      values: values.map(String),
      calldatas: calldatas,
      description: description
    },
    timeline: {
      proposalCreated: new Date().toISOString(),
      votingStarts: 'Wait 24 hours (7,200 blocks)',
      votingEnds: 'Wait 7 days after voting starts',
      nextStep: 'Check state in 24 hours'
    },
    amounts: {
      mintAmount: ethers.formatEther(mintAmount)
    }
  };

  const filename = `layer1-proposal-${Date.now()}.json`;
  fs.writeFileSync(filename, JSON.stringify(proposalDetails, null, 2));
  console.log(`  💾 Proposal details saved to: ${filename}`);
  console.log('');

  console.log('═══════════════════════════════════════════');
  console.log('📅 NEXT STEPS');
  console.log('═══════════════════════════════════════════\n');
  console.log('  1. Wait 24 hours for voting to start');
  console.log('  2. Run: npx hardhat run scripts/cast-vote.cjs --network baseSepolia');
  console.log('  3. Wait 7 days for voting period');
  console.log('  4. Run: npx hardhat run scripts/queue-proposal.cjs --network baseSepolia');
  console.log('  5. Wait 48 hours for timelock');
  console.log('  6. Run: npx hardhat run scripts/execute-proposal.cjs --network baseSepolia');
  console.log('');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
