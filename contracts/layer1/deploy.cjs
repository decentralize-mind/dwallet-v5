// deploy.js — Layer 1 dWallet Protocol Deployment Script
// Run with: npx hardhat run deploy.js --network <network>
//
// POST-DEPLOY CHECKLIST (from security guide):
//   [1] Transfer DWTToken ownership to TimelockController
//   [2] Renounce TIMELOCK_ADMIN_ROLE on TimelockController
//   [3] Grant PROPOSER_ROLE exclusively to DWTGovernor
//   [4] Set EXECUTOR_ROLE = address(0) on Timelock (open execution)
//   [5] Set Treasury GOVERNOR_ROLE to Timelock, ADMIN_ROLE to multisig
//   [6] Fund DWTPaymaster with ETH via depositToEntryPoint()
//   [7] Set live DWT/ETH rate in DWTETHRateFeed

const { ethers } = require('hardhat')

async function main() {
  const [deployer] = await ethers.getSigners()
  let currentNonce = await deployer.getNonce('pending')
  console.log('Deploying Layer 1 contracts with:', deployer.address)
  console.log('Starting nonce:', currentNonce)

  // ─── Configuration ─────────────────────────────────────────────────────
  const MULTISIG_ADDRESS = process.env.MULTISIG_ADDRESS // Hardware multisig
  const UNISWAP_ROUTER = process.env.UNISWAP_V3_ROUTER // Uniswap V3 SwapRouter
  const ERC4337_ENTRYPOINT = process.env.ERC4337_ENTRYPOINT // Real EntryPoint address

  if (!MULTISIG_ADDRESS)
    throw new Error('❌ Error: MULTISIG_ADDRESS is missing in your .env file!')
  if (!UNISWAP_ROUTER)
    throw new Error('❌ Error: UNISWAP_V3_ROUTER is missing in your .env file!')
  if (!ERC4337_ENTRYPOINT)
    throw new Error(
      '❌ Error: ERC4337_ENTRYPOINT is missing in your .env file!',
    )
  const LAYER7_SECURITY_ADDRESS = process.env.LAYER7_SECURITY_ADDRESS
  if (!LAYER7_SECURITY_ADDRESS)
    throw new Error(
      '❌ Error: LAYER7_SECURITY_ADDRESS is missing in your .env file!',
    )

  // Tier thresholds (in DWT wei)
  const TIER1_THRESHOLD = ethers.parseEther('1000') // 1,000 DWT
  const TIER2_THRESHOLD = ethers.parseEther('10000') // 10,000 DWT
  const TIER3_THRESHOLD = ethers.parseEther('100000') // 100,000 DWT

  // Initial DWT/ETH rate (example: 1 ETH = 1,000 DWT → rate = 1000e18)
  const INITIAL_RATE = ethers.parseEther('1000')
  const MAX_DEVIATION_BPS = 500 // 5%
  const MAX_STALENESS = 3600 // 1 hour
  const MARKUP_BPS = 11000 // 1.1x markup

  // Timelock minimum delay: 48 hours
  const TIMELOCK_DELAY = 48 * 60 * 60

  console.log('\n── Deploying TimelockController ──────────────────────────')
  const TimelockFactory = await ethers.getContractFactory('TimelockController')
  const timelock = await TimelockFactory.deploy(
    TIMELOCK_DELAY,
    [], // proposers — set after Governor deploy
    [ethers.ZeroAddress], // executors: address(0) = anyone can execute (censorship prevention)
    deployer.address, // temp admin — RENOUNCE after setup
    { nonce: currentNonce++ },
  )
  await timelock.waitForDeployment()
  console.log('TimelockController:', await timelock.getAddress())

  console.log('\n── Deploying DWTToken ────────────────────────────────────')
  const DWTTokenFactory = await ethers.getContractFactory('DWTToken')
  const dwtToken = await DWTTokenFactory.deploy(
    deployer.address, // initialOwner — transfer to Timelock post-deploy
    LAYER7_SECURITY_ADDRESS,
    TIER1_THRESHOLD,
    TIER2_THRESHOLD,
    TIER3_THRESHOLD,
    { nonce: currentNonce++ },
  )
  await dwtToken.waitForDeployment()
  console.log('DWTToken:', await dwtToken.getAddress())

  console.log('\n── Deploying DWTGovernor ─────────────────────────────────')
  const GovernorFactory = await ethers.getContractFactory('DWTGovernor')
  const governor = await GovernorFactory.deploy(
    await dwtToken.getAddress(),
    await timelock.getAddress(),
    { nonce: currentNonce++ },
  )
  await governor.waitForDeployment()
  console.log('DWTGovernor:', await governor.getAddress())

  // ── Grant PROPOSER_ROLE exclusively to Governor ──────────────────────
  console.log('\n── Configuring Timelock roles ────────────────────────────')
  const PROPOSER_ROLE = await timelock.PROPOSER_ROLE()
  const CANCELLER_ROLE = await timelock.CANCELLER_ROLE()
  const TIMELOCK_ADMIN_ROLE = await timelock.DEFAULT_ADMIN_ROLE()

  let tx = await timelock.grantRole(
    PROPOSER_ROLE,
    await governor.getAddress(),
    { nonce: currentNonce++ },
  )
  await tx.wait()
  tx = await timelock.grantRole(CANCELLER_ROLE, await governor.getAddress(), {
    nonce: currentNonce++,
  })
  await tx.wait()
  console.log('PROPOSER_ROLE granted to Governor')

  // EXECUTOR_ROLE is already address(0) from constructor → anyone can execute

  // RENOUNCE TIMELOCK_ADMIN_ROLE — CRITICAL SECURITY STEP
  tx = await timelock.renounceRole(TIMELOCK_ADMIN_ROLE, deployer.address, {
    nonce: currentNonce++,
  })
  await tx.wait()
  console.log('✅ TIMELOCK_ADMIN_ROLE renounced by deployer')

  console.log('\n── Deploying DWTETHRateFeed ──────────────────────────────')
  const RateFeedFactory = await ethers.getContractFactory(
    'contracts/layer1/DWTETHRateFeed.sol:DWTETHRateFeed',
  )
  const rateFeed = await RateFeedFactory.deploy(
    MULTISIG_ADDRESS, // admin
    deployer.address, // keeper (replace with keeper bot address)
    INITIAL_RATE,
    MAX_DEVIATION_BPS,
    MAX_STALENESS,
    LAYER7_SECURITY_ADDRESS,
    { nonce: currentNonce++ },
  )
  await rateFeed.waitForDeployment()
  console.log('DWTETHRateFeed:', await rateFeed.getAddress())

  console.log('\n── Deploying DWTPaymaster ────────────────────────────────')
  const PaymasterFactory = await ethers.getContractFactory(
    'contracts/layer1/DWTPaymaster.sol:DWTPaymaster',
  )
  const paymaster = await PaymasterFactory.deploy(
    ERC4337_ENTRYPOINT, // REAL EntryPoint — NOT address(this) (H-06 fix)
    await dwtToken.getAddress(),
    await rateFeed.getAddress(),
    INITIAL_RATE, // fallback rate
    MARKUP_BPS,
    LAYER7_SECURITY_ADDRESS,
    MULTISIG_ADDRESS, // owner
    { nonce: currentNonce++ },
  )
  await paymaster.waitForDeployment()
  console.log('DWTPaymaster:', await paymaster.getAddress())

  console.log('\n── Deploying Treasury ────────────────────────────────────')
  const TreasuryFactory = await ethers.getContractFactory(
    'contracts/layer1/Treasury.sol:Treasury',
  )
  const treasury = await TreasuryFactory.deploy(
    await timelock.getAddress(), // GOVERNOR_ROLE → Timelock
    MULTISIG_ADDRESS, // ADMIN_ROLE → hardware multisig
    LAYER7_SECURITY_ADDRESS,
    { nonce: currentNonce++ },
  )
  await treasury.waitForDeployment()
  console.log('Treasury:', await treasury.getAddress())

  console.log('\n── Deploying DWalletFeeRouter ────────────────────────────')
  const FeeRouterFactory = await ethers.getContractFactory('DWalletFeeRouter')
  const feeRouter = await FeeRouterFactory.deploy(
    UNISWAP_ROUTER,
    await dwtToken.getAddress(),
    await treasury.getAddress(),
    LAYER7_SECURITY_ADDRESS,
    await timelock.getAddress(), // owner = Timelock
    { nonce: currentNonce++ },
  )
  await feeRouter.waitForDeployment()
  console.log('DWalletFeeRouter:', await feeRouter.getAddress())

  console.log('\n── Deploying StakingPool (DWT → DWT rewards) ────────────')
  const StakingPoolFactory = await ethers.getContractFactory(
    'contracts/layer1/StakingPool.sol:StakingPool',
  )
  const stakingPool = await StakingPoolFactory.deploy(
    await dwtToken.getAddress(), // stakingToken
    await dwtToken.getAddress(), // rewardToken (DWT)
    7 * 24 * 60 * 60, // 1 week rewards duration
    LAYER7_SECURITY_ADDRESS,
    await timelock.getAddress(), // owner = Timelock
    { nonce: currentNonce++ },
  )
  await stakingPool.waitForDeployment()
  console.log('StakingPool:', await stakingPool.getAddress())

  console.log('\n── Deploying DWTStaking (DWT → ETH rewards) ─────────────')
  const DWTStakingFactory = await ethers.getContractFactory(
    'contracts/layer1/DWTStaking.sol:DWTStaking',
  )
  const dwtStaking = await DWTStakingFactory.deploy(
    await dwtToken.getAddress(),
    7 * 24 * 60 * 60, // 1 week rewards duration
    LAYER7_SECURITY_ADDRESS,
    await timelock.getAddress(), // owner = Timelock
    { nonce: currentNonce++ },
  )
  await dwtStaking.waitForDeployment()
  console.log('DWTStaking:', await dwtStaking.getAddress())

  // ─── Genesis Token Distribution ───────────────────────────────────────
  // Mint 70,000,000 DWT according to .env allocations BEFORE transfer
  console.log('\n── Minting Genesis Allocations ──────────')
  const allocations = []
  const addAlloc = (addressKey, amountKey, label) => {
    const addr = process.env[addressKey]
    const amt = process.env[amountKey]
    if (addr && amt) {
      allocations.push({ address: addr, amount: amt, label })
    }
  }
  for (let i = 1; i <= 3; i++)
    addAlloc(`FOUNDER_${i}_ADDRESS`, `FOUNDER_${i}_AMOUNT`, 'Founder')
  for (let i = 1; i <= 11; i++)
    addAlloc(`TEAM_${i}_ADDRESS`, `TEAM_${i}_AMOUNT`, 'Team Member')
  for (let i = 1; i <= 1; i++)
    addAlloc(`INVESTOR_${i}_ADDRESS`, `INVESTOR_${i}_AMOUNT`, 'Investor')
  for (let i = 1; i <= 2; i++)
    addAlloc(`MARKETING_${i}_ADDRESS`, `MARKETING_${i}_AMOUNT`, 'Marketing')
  for (let i = 1; i <= 5; i++)
    addAlloc(`ADVISOR_${i}_ADDRESS`, `ADVISOR_${i}_AMOUNT`, 'Advisor')
  if (process.env.DAO_TREASURY_ADDRESS)
    allocations.push({
      address: process.env.DAO_TREASURY_ADDRESS,
      amount: '14000000',
      label: 'DAO Treasury',
    })
  if (process.env.COMMUNITY_REWARDS_ADDRESS)
    allocations.push({
      address: process.env.COMMUNITY_REWARDS_ADDRESS,
      amount: '10500000',
      label: 'Community Rewards',
    })
  if (process.env.AIRDROP_ADDRESS)
    allocations.push({
      address: process.env.AIRDROP_ADDRESS,
      amount: '5600000',
      label: 'Airdrop',
    })
  if (process.env.LIQUIDITY_DEX_ADDRESS)
    allocations.push({
      address: process.env.LIQUIDITY_DEX_ADDRESS,
      amount: '12600000',
      label: 'Liquidity & DEX',
    })

  for (const alloc of allocations) {
    const amountWei = ethers.parseEther(
      alloc.amount.toString().replace(/,/g, ''),
    )
    console.log(
      `    Minting ${alloc.amount.padStart(10)} DWT to ${alloc.address} (${alloc.label})`,
    )

    let success = false
    let retries = 0
    while (!success && retries < 3) {
      try {
        const tx = await dwtToken.mint(alloc.address, amountWei, {
          nonce: currentNonce++,
        })
        await tx.wait(1) // Wait for 1 confirmation to ensure state updates
        console.log(`       ✅ Confirmed: ${tx.hash.slice(0, 20)}...`)
        success = true
      } catch (e) {
        retries++
        console.log(
          `       ⚠️ Attempt ${retries} failed: ${e.message.split('\n')[0]}`,
        )
        await new Promise(r => setTimeout(r, 5000)) // Wait 5s on failure
        currentNonce = await deployer.getNonce('pending')
      }
    }
    if (!success)
      throw new Error(`❌ Critical Failure: Could not mint for ${alloc.label}`)

    await new Promise(r => setTimeout(r, 2000)) // 2s pacing delay
  }
  console.log('✅ Genesis Distribution Complete')

  // ── Transfer DWTToken ownership to Timelock ───────────────────────────
  console.log('\n── Transferring DWTToken ownership to Timelock ──────────')
  tx = await dwtToken.transferOwnership(await timelock.getAddress(), {
    nonce: currentNonce,
  })
  await tx.wait()
  console.log('✅ DWTToken owner → TimelockController')

  // ─── Summary ──────────────────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════════════════════')
  console.log('                LAYER 1 DEPLOYMENT COMPLETE')
  console.log('══════════════════════════════════════════════════════════')
  console.log('DWTToken:        ', await dwtToken.getAddress())
  console.log('TimelockController:', await timelock.getAddress())
  console.log('DWTGovernor:     ', await governor.getAddress())
  console.log('DWTETHRateFeed:  ', await rateFeed.getAddress())
  console.log('DWTPaymaster:    ', await paymaster.getAddress())
  console.log('Treasury:        ', await treasury.getAddress())
  console.log('DWalletFeeRouter:', await feeRouter.getAddress())
  console.log('StakingPool:     ', await stakingPool.getAddress())
  console.log('DWTStaking:      ', await dwtStaking.getAddress())
  console.log('══════════════════════════════════════════════════════════')

  console.log('\n⚠️  REMAINING MANUAL STEPS:')
  console.log('  1. Fund DWTPaymaster via depositToEntryPoint()')
  console.log('  2. Set live DWT/ETH rate in DWTETHRateFeed via keeper')
  console.log('  3. Verify all contracts on Etherscan')
  console.log(
    '  4. Commission full independent audit (esp. cross-chain layers)',
  )
  console.log('  5. Replace custom bridge with LayerZero/Axelar for production')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
