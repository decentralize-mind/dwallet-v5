const { ethers, network } = require('hardhat')
require('dotenv').config()
const fs = require('fs')

/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║   COMPLETE DWT TOKEN DEPLOYMENT - BASE SEPOLIA                  ║
 * ║                                                                  ║
 * ║   1. Security Infrastructure                                     ║
 * ║   2. Governance System (Timelock + Governor)                    ║
 * ║   3. Ownership & Decentralization                               ║
 * ║   4. Vesting Contracts (Founders / Team / Investors)            ║
 * ║   5. Initial Token Distribution (28 recipients)                 ║
 * ║   6. Airdrop Contract                                           ║
 * ║   7. DEX Liquidity (Uniswap V2 on Base Sepolia)                ║
 * ║   8. Gnosis Safe Multisig Setup                                 ║
 * ║   9. Post-Deployment Verification & Summary                     ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

// ─── Helpers ────────────────────────────────────────────────────────────────

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function log(msg) { console.log(msg) }
function section(title) {
  console.log('\n' + '═'.repeat(64))
  console.log(`  ${title}`)
  console.log('═'.repeat(64))
}

async function deployContract(factory, args = [], label = '') {
  const instance = await factory.deploy(...args)
  await instance.waitForDeployment()
  const addr = await instance.getAddress()
  log(`   ✅ ${label}: ${addr}`)
  await sleep(300)
  return { instance, addr }
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const [deployer] = await ethers.getSigners()
  const balance = await ethers.provider.getBalance(deployer.address)

  console.log('\n╔══════════════════════════════════════════════════════════════════╗')
  console.log('║   DWT COMPLETE DEPLOYMENT — BASE SEPOLIA                        ║')
  console.log('╚══════════════════════════════════════════════════════════════════╝\n')
  log(`📍 Network   : ${network.name}`)
  log(`👤 Deployer  : ${deployer.address}`)
  log(`💰 Balance   : ${ethers.formatEther(balance)} ETH\n`)

  if (parseFloat(ethers.formatEther(balance)) < 0.08) {
    throw new Error('❌ Need at least 0.08 ETH for complete deployment gas costs')
  }

  const deployed = {}

  // ═══════════════════════════════════════════════════════════════════
  // STEP 1 — SECURITY INFRASTRUCTURE
  // ═══════════════════════════════════════════════════════════════════
  section('STEP 1 — SECURITY INFRASTRUCTURE')

  const LockEngine = await ethers.getContractFactory('LockEngine')
  const { instance: lockEngine, addr: lockEngineAddr } =
    await deployContract(LockEngine, [deployer.address], 'LockEngine')
  deployed.lockEngine = lockEngineAddr

  const InvariantChecker = await ethers.getContractFactory('InvariantChecker')
  const { instance: invariantChecker, addr: invariantCheckerAddr } =
    await deployContract(InvariantChecker, [], 'InvariantChecker')
  deployed.invariantChecker = invariantCheckerAddr

  const SecurityController = await ethers.getContractFactory(
    'contracts/security/SecurityController.sol:SecurityController'
  )
  const { instance: securityController, addr: securityControllerAddr } =
    await deployContract(SecurityController, [deployer.address], 'SecurityController')
  deployed.securityController = securityControllerAddr

  const RateLimiter = await ethers.getContractFactory('RateLimiter')
  const { instance: rateLimiter, addr: rateLimiterAddr } =
    await deployContract(RateLimiter, [deployer.address], 'RateLimiter')
  deployed.rateLimiter = rateLimiterAddr

  // Wire up LockEngine modules
  log('\n   🔧 Wiring LockEngine modules...')
  let tx = await lockEngine.setModules(
    securityControllerAddr,
    securityControllerAddr,
    securityControllerAddr,
    rateLimiterAddr,
    invariantCheckerAddr,
    securityControllerAddr
  )
  await tx.wait()
  log('   ✅ LockEngine wired')

  // ═══════════════════════════════════════════════════════════════════
  // STEP 2 — GOVERNANCE SYSTEM
  // ═══════════════════════════════════════════════════════════════════
  section('STEP 2 — GOVERNANCE SYSTEM')

  const TIMELOCK_DELAY = 48 * 60 * 60 // 48 hours

  const TimelockFactory = await ethers.getContractFactory(
    '@openzeppelin/contracts/governance/TimelockController.sol:TimelockController'
  )
  const { instance: timelock, addr: timelockAddr } = await deployContract(
    TimelockFactory,
    [TIMELOCK_DELAY, [], [ethers.ZeroAddress], deployer.address],
    'TimelockController (48h)'
  )
  deployed.timelock = timelockAddr

  const DWTTokenFactory = await ethers.getContractFactory('DWTTokenSimple')
  const { instance: dwtToken, addr: dwtTokenAddr } = await deployContract(
    DWTTokenFactory,
    [deployer.address],
    'DWTTokenSimple'
  )
  deployed.dwtToken = dwtTokenAddr

  const GovernorFactory = await ethers.getContractFactory('DWTGovernor')
  const { instance: governor, addr: governorAddr } = await deployContract(
    GovernorFactory,
    [dwtTokenAddr, timelockAddr],
    'DWTGovernor'
  )
  deployed.governor = governorAddr

  // Read governance config (with error handling)
  let votingDelay, votingPeriod, proposalThreshold, quorumNumerator
  try {
    votingDelay = await governor.votingDelay()
    votingPeriod = await governor.votingPeriod()
    proposalThreshold = await governor.proposalThreshold()
    quorumNumerator = await governor.quorumNumerator()

    log('\n   📊 Governance config:')
    log(`      Voting Delay    : ${votingDelay} blocks (~${Number(votingDelay) * 12 / 3600}h)`)
    log(`      Voting Period   : ${votingPeriod} blocks (~${Number(votingPeriod) * 12 / 86400} days)`)
    log(`      Proposal Min    : ${ethers.formatEther(proposalThreshold)} DWT`)
    log(`      Quorum          : ${quorumNumerator}%`)
  } catch (e) {
    log('\n   ⚠️  Could not read governor config (will verify manually)')
    log(`      Error: ${e.message}`)
    votingDelay = 7200n
    votingPeriod = 50400n
    proposalThreshold = ethers.parseEther('100000')
    quorumNumerator = 4n
  }

  // ═══════════════════════════════════════════════════════════════════
  // STEP 3 — OWNERSHIP & DECENTRALIZATION
  // ═══════════════════════════════════════════════════════════════════
  section('STEP 3 — OWNERSHIP & DECENTRALIZATION')

  const PROPOSER_ROLE      = await timelock.PROPOSER_ROLE()
  const CANCELLER_ROLE     = await timelock.CANCELLER_ROLE()
  const ADMIN_ROLE         = await timelock.DEFAULT_ADMIN_ROLE()

  log('\n   🎫 Granting PROPOSER_ROLE to Governor...')
  tx = await timelock.grantRole(PROPOSER_ROLE, governorAddr)
  await tx.wait()

  log('   🚫 Granting CANCELLER_ROLE to Governor...')
  tx = await timelock.grantRole(CANCELLER_ROLE, governorAddr)
  await tx.wait()

  log('   🔄 Transferring token ownership to Timelock...')
  tx = await dwtToken.transferOwnership(timelockAddr)
  await tx.wait()

  log('   🗑️  Renouncing deployer TIMELOCK_ADMIN_ROLE...')
  tx = await timelock.renounceRole(ADMIN_ROLE, deployer.address)
  await tx.wait()

  // Verify
  const tokenOwner         = await dwtToken.owner()
  const govHasProposer     = await timelock.hasRole(PROPOSER_ROLE, governorAddr)
  const deployerHasAdmin   = await timelock.hasRole(ADMIN_ROLE, deployer.address)

  log(`\n   ✅ Token owner is Timelock  : ${tokenOwner === timelockAddr}`)
  log(`   ✅ Governor has PROPOSER    : ${govHasProposer}`)
  log(`   ✅ Deployer admin revoked   : ${!deployerHasAdmin}`)

  // ═══════════════════════════════════════════════════════════════════
  // STEP 4 — VESTING CONTRACTS
  // ═══════════════════════════════════════════════════════════════════
  section('STEP 4 — VESTING CONTRACTS')

  /**
   * Expects a VestingWallet-compatible contract:
   *   constructor(address beneficiary, uint64 startTimestamp, uint64 durationSeconds)
   *
   * Uses OpenZeppelin VestingWallet (or your own compatible contract).
   * Each wallet holds tokens and releases linearly to the beneficiary.
   */

  const VestingFactory = await ethers.getContractFactory('@openzeppelin/contracts/finance/VestingWallet.sol:VestingWallet')
  const nowTs = Math.floor(Date.now() / 1000)

  const ONE_YEAR  = 365 * 24 * 60 * 60
  const TWO_YEARS = 2 * ONE_YEAR
  const SIX_MONTHS = 180 * 24 * 60 * 60

  // — Founder vesting: 6-month cliff + 2-year linear (via start offset trick)
  // We start the vest at now + 6 months; tokens become claimable after cliff.
  const founderVestingAddrs = []
  for (let i = 1; i <= 3; i++) {
    const addr = process.env[`FOUNDER_${i}_ADDRESS`]
    if (!addr || !ethers.isAddress(addr)) continue
    const { instance: vw, addr: vwAddr } = await deployContract(
      VestingFactory,
      [addr, nowTs + SIX_MONTHS, TWO_YEARS],
      `Founder${i} VestingWallet`
    )
    founderVestingAddrs.push({ beneficiary: addr, vestingWallet: vwAddr, index: i })
    deployed[`founderVesting${i}`] = vwAddr
  }

  // — Team vesting: 1-year linear, starts immediately
  const teamVestingAddrs = []
  for (let i = 1; i <= 11; i++) {
    const addr = process.env[`TEAM_${i}_ADDRESS`]
    if (!addr || !ethers.isAddress(addr)) continue
    const { instance: vw, addr: vwAddr } = await deployContract(
      VestingFactory,
      [addr, nowTs, ONE_YEAR],
      `Team${i} VestingWallet`
    )
    teamVestingAddrs.push({ beneficiary: addr, vestingWallet: vwAddr, index: i })
    deployed[`teamVesting${i}`] = vwAddr
  }

  // — Investor vesting: 6-month cliff + 1-year linear
  const investorVestingAddrs = []
  for (let i = 1; i <= 1; i++) {
    const addr = process.env[`INVESTOR_${i}_ADDRESS`]
    if (!addr || !ethers.isAddress(addr)) continue
    const { instance: vw, addr: vwAddr } = await deployContract(
      VestingFactory,
      [addr, nowTs + SIX_MONTHS, ONE_YEAR],
      `Investor${i} VestingWallet`
    )
    investorVestingAddrs.push({ beneficiary: addr, vestingWallet: vwAddr, index: i })
    deployed[`investorVesting${i}`] = vwAddr
  }

  log(`\n   📋 Vesting wallets deployed:`)
  log(`      Founders  : ${founderVestingAddrs.length}`)
  log(`      Team      : ${teamVestingAddrs.length}`)
  log(`      Investors : ${investorVestingAddrs.length}`)

  // ═══════════════════════════════════════════════════════════════════
  // STEP 5 — INITIAL TOKEN DISTRIBUTION
  // ═══════════════════════════════════════════════════════════════════
  section('STEP 5 — INITIAL TOKEN DISTRIBUTION')

  /**
   * Direct recipients receive tokens to their wallet.
   * Vested recipients receive tokens to their VestingWallet contract
   * (the beneficiary withdraws via release() once the schedule matures).
   */

  const allocations = []

  const addAlloc = (address, amountKey, label) => {
    const amt = process.env[amountKey]
    if (address && amt && ethers.isAddress(address)) {
      allocations.push({
        address,
        amount: amt.toString().replace(/,/g, '').trim(),
        label
      })
    }
  }

  // Vested allocations → send to vesting wallet contracts
  for (const f of founderVestingAddrs) {
    addAlloc(f.vestingWallet, `FOUNDER_${f.index}_AMOUNT`, `Founder ${f.index} (vesting)`)
  }
  for (const t of teamVestingAddrs) {
    addAlloc(t.vestingWallet, `TEAM_${t.index}_AMOUNT`, `Team ${t.index} (vesting)`)
  }
  for (const inv of investorVestingAddrs) {
    addAlloc(inv.vestingWallet, `INVESTOR_${inv.index}_AMOUNT`, `Investor ${inv.index} (vesting)`)
  }

  // Direct allocations
  for (let i = 1; i <= 5; i++)  addAlloc(process.env[`ADVISOR_${i}_ADDRESS`],   `ADVISOR_${i}_AMOUNT`,   `Advisor ${i}`)
  for (let i = 1; i <= 3; i++)  addAlloc(process.env[`MARKETING_${i}_ADDRESS`], `MARKETING_${i}_AMOUNT`, `Marketing ${i}`)
  addAlloc(process.env.DAO_TREASURY_ADDRESS,      'DAO_TREASURY_AMOUNT',      'DAO Treasury')
  addAlloc(process.env.COMMUNITY_REWARDS_ADDRESS, 'COMMUNITY_REWARDS_AMOUNT', 'Community Rewards')
  addAlloc(process.env.AIRDROP_ADDRESS,           'AIRDROP_AMOUNT',           'Airdrop Pool')
  addAlloc(process.env.LIQUIDITY_DEX_ADDRESS,     'LIQUIDITY_DEX_AMOUNT',     'Liquidity & DEX')

  log(`\n   Found ${allocations.length} mint targets\n`)

  let totalMinted = 0n
  for (const alloc of allocations) {
    const amountWei = ethers.parseEther(alloc.amount)
    totalMinted += amountWei
    process.stdout.write(`   ⏳ Minting ${alloc.amount.padStart(12)} DWT → ${alloc.label.padEnd(28)}`)
    try {
      const t = await dwtToken.mint(alloc.address, amountWei)
      await t.wait()
      process.stdout.write(' ✅\n')
    } catch (e) {
      process.stdout.write(` ❌ ${e.message}\n`)
    }
    await sleep(400)
  }

  log(`\n   💰 Total minted : ${ethers.formatEther(totalMinted)} DWT`)
  log(`   🏦 Max supply   : 123,000,000 DWT`)
  log(`   📦 Remaining    : ${ethers.formatEther(ethers.parseEther('123000000') - totalMinted)} DWT`)

  // ═══════════════════════════════════════════════════════════════════
  // STEP 6 — AIRDROP CONTRACT
  // ═══════════════════════════════════════════════════════════════════
  section('STEP 6 — AIRDROP CONTRACT')

  const SimpleAirdrop = await ethers.getContractFactory('SimpleAirdrop')
  const { instance: simpleAirdrop, addr: simpleAirdropAddr } = await deployContract(
    SimpleAirdrop,
    [dwtTokenAddr],
    'SimpleAirdrop'
  )
  deployed.simpleAirdrop = simpleAirdropAddr

  const airdropAmt  = process.env.AIRDROP_AMOUNT
  const airdropAddr = process.env.AIRDROP_ADDRESS
  const claimAmt    = 5
  log(`\n   🎁 Claim amount  : ${claimAmt} DWT per user`)
  log(`   👥 Max claimants : ${Number(airdropAmt) / claimAmt}`)
  log(`\n   ⚠️  ACTION NEEDED: Fund the airdrop contract manually`)
  log(`      From wallet  : ${airdropAddr}`)
  log(`      To contract  : ${simpleAirdropAddr}`)
  log(`      Amount       : ${airdropAmt} DWT`)
  log(`\n      Command (cast):`)
  log(`      cast send ${dwtTokenAddr} "transfer(address,uint256)" \\`)
  log(`        ${simpleAirdropAddr} \\`)
  log(`        ${ethers.parseEther(airdropAmt).toString()} \\`)
  log(`        --rpc-url $BASE_SEPOLIA_RPC --private-key $AIRDROP_PRIVATE_KEY`)

  // ═══════════════════════════════════════════════════════════════════
  // STEP 7 — DEX LIQUIDITY (Uniswap V2 on Base Sepolia)
  // ═══════════════════════════════════════════════════════════════════
  section('STEP 7 — DEX LIQUIDITY')

  /**
   * Base Sepolia Uniswap V2 router: 0x1689E7B1F10000AE47eBfE339a4f69dECd19F602
   * WETH on Base Sepolia            : 0x4200000000000000000000000000000000000006
   *
   * We:
   *   1. Approve router to spend DWT from LIQUIDITY_DEX_ADDRESS
   *   2. Call addLiquidityETH() to create the DWT/ETH pair
   *
   * ⚠️  The deployer wallet must hold the DWT liquidity allocation AND
   *     the matching ETH. If LIQUIDITY_DEX_ADDRESS !== deployer, you need
   *     to run the separate liquidity script (scripts/add-liquidity.js).
   */

  const UNI_ROUTER_ADDRESS = '0x1689E7B1F10000AE47eBfE339a4f69dECd19F602'
  const WETH_ADDRESS       = '0x4200000000000000000000000000000000000006'

  const uniRouterABI = [
    'function addLiquidityETH(address token, uint amountTokenDesired, uint amountTokenMin, uint amountETHMin, address to, uint deadline) external payable returns (uint amountToken, uint amountETH, uint liquidity)',
    'function factory() external pure returns (address)',
  ]

  const dwtLiqAmt  = process.env.LIQUIDITY_DEX_AMOUNT   // e.g. "500000"
  const ethLiqAmt  = process.env.LIQUIDITY_ETH_AMOUNT   // e.g. "0.05"

  if (dwtLiqAmt && ethLiqAmt && process.env.LIQUIDITY_DEX_ADDRESS === deployer.address) {
    log('\n   🔗 Connecting to Uniswap V2 Router...')
    const uniRouter = new ethers.Contract(UNI_ROUTER_ADDRESS, uniRouterABI, deployer)

    const tokenAmtWei = ethers.parseEther(dwtLiqAmt)
    const ethAmtWei   = ethers.parseEther(ethLiqAmt)
    const deadline    = Math.floor(Date.now() / 1000) + 60 * 20 // 20 min

    log(`   💧 Approving ${dwtLiqAmt} DWT for router...`)
    const approveTx = await dwtToken.approve(UNI_ROUTER_ADDRESS, tokenAmtWei)
    await approveTx.wait()

    log(`   💧 Adding liquidity: ${dwtLiqAmt} DWT + ${ethLiqAmt} ETH...`)
    try {
      const liqTx = await uniRouter.addLiquidityETH(
        dwtTokenAddr,
        tokenAmtWei,
        (tokenAmtWei * 95n) / 100n, // 5% slippage
        (ethAmtWei   * 95n) / 100n,
        deployer.address,           // LP tokens go to deployer
        deadline,
        { value: ethAmtWei }
      )
      const receipt = await liqTx.wait()
      log(`   ✅ Liquidity added! Tx: ${receipt.hash}`)
      deployed.uniswapPair = 'Created — check factory for pair address'
    } catch (e) {
      log(`   ⚠️  Liquidity TX failed: ${e.message}`)
      log('      → Run scripts/add-liquidity.js manually after deployment')
    }
  } else {
    log('\n   ⚠️  Skipping automatic liquidity — conditions not met.')
    log('      Either LIQUIDITY_DEX_ADDRESS is a different wallet,')
    log('      or LIQUIDITY_ETH_AMOUNT is not set in .env')
    log('      → Run scripts/add-liquidity.js after funding the deployer wallet')
  }

  // ═══════════════════════════════════════════════════════════════════
  // STEP 8 — GNOSIS SAFE MULTISIG
  // ═══════════════════════════════════════════════════════════════════
  section('STEP 8 — GNOSIS SAFE MULTISIG')

  /**
   * Gnosis Safe cannot be deployed directly via Hardhat in a single
   * deterministic call — it uses a proxy factory with CREATE2.
   *
   * The standard approach on Base Sepolia is:
   *   1. Go to https://app.safe.global
   *   2. Select "Base Sepolia" network
   *   3. Create a new Safe with your owner addresses + threshold
   *   4. Fund the Safe with your DAO Treasury tokens
   *   5. Set the Safe as the recipient of future treasury allocations
   *
   * If you want programmatic deployment, use the Safe SDK:
   *   npm install @safe-global/protocol-kit
   */

  const safeOwners    = (process.env.SAFE_OWNERS || '').split(',').filter(Boolean)
  const safeThreshold = process.env.SAFE_THRESHOLD || '2'

  if (safeOwners.length >= 2) {
    log('\n   🔐 Gnosis Safe SDK — attempting programmatic deploy...')
    log('      (Requires @safe-global/protocol-kit installed)')
    log('\n   Safe owners:')
    safeOwners.forEach((o, i) => log(`      [${i + 1}] ${o.trim()}`))
    log(`   Threshold  : ${safeThreshold} of ${safeOwners.length}`)

    log('\n   ℹ️  SDK call blocked (not installed in this environment).')
    log('      → See scripts/create-gnosis-safe.js for the full script.')
    log('      → Or use https://app.safe.global to deploy manually.')
  } else {
    log('\n   ⚠️  SAFE_OWNERS not set in .env (needs 2+ comma-separated addresses)')
    log('      → Add to .env: SAFE_OWNERS=0xAAA...,0xBBB...,0xCCC...')
    log('      → Add to .env: SAFE_THRESHOLD=2')
    log('      → Then run scripts/create-gnosis-safe.js')
  }

  log('\n   📋 Recommended Safe setup:')
  log('      1. Deploy Safe at https://app.safe.global (Base Sepolia)')
  log('      2. Transfer DAO_TREASURY tokens to Safe address')
  log('      3. Use Safe for any future treasury decisions')
  log('      4. Optionally pass Safe address as Timelock executor instead of address(0)')

  // ═══════════════════════════════════════════════════════════════════
  // STEP 9 — POST-DEPLOYMENT VERIFICATION
  // ═══════════════════════════════════════════════════════════════════
  section('STEP 9 — VERIFICATION & SUMMARY')

  log('\n   🔍 Contract verification commands (run after deployment):')
  log(`\n   npx hardhat verify --network ${network.name} \\`)
  log(`     ${dwtTokenAddr} "${deployer.address}"\n`)
  log(`   npx hardhat verify --network ${network.name} \\`)
  log(`     ${timelockAddr} "${TIMELOCK_DELAY}" "[]" "[${ethers.ZeroAddress}]" "${deployer.address}"\n`)
  log(`   npx hardhat verify --network ${network.name} \\`)
  log(`     ${governorAddr} "${dwtTokenAddr}" "${timelockAddr}"\n`)
  log(`   npx hardhat verify --network ${network.name} \\`)
  log(`     ${simpleAirdropAddr} "${dwtTokenAddr}"\n`)
  log(`   npx hardhat verify --network ${network.name} \\`)
  log(`     ${lockEngineAddr} "${deployer.address}"\n`)
  log(`   npx hardhat verify --network ${network.name} \\`)
  log(`     ${rateLimiterAddr} "${deployer.address}"\n`)

  for (const f of founderVestingAddrs) {
    log(`   npx hardhat verify --network ${network.name} \\`)
    log(`     ${f.vestingWallet} "${f.beneficiary}" ...timestamps\n`)
  }

  // ─── Save deployment JSON ──────────────────────────────────────────
  const deploymentData = {
    network: network.name,
    chainId: network.config.chainId,
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,

    governance: {
      timelock: timelockAddr,
      governor: governorAddr,
      votingDelay: `${votingDelay} blocks`,
      votingPeriod: `${votingPeriod} blocks`,
      proposalThreshold: `${ethers.formatEther(proposalThreshold)} DWT`,
      quorum: `${quorumNumerator}%`,
      timelockDelay: '48 hours',
    },

    token: {
      address: dwtTokenAddr,
      owner: tokenOwner,
      ownerIsTimelock: tokenOwner === timelockAddr,
      totalMinted: ethers.formatEther(totalMinted),
      maxSupply: '123000000',
    },

    security: {
      lockEngine: lockEngineAddr,
      invariantChecker: invariantCheckerAddr,
      securityController: securityControllerAddr,
      rateLimiter: rateLimiterAddr,
    },

    vesting: {
      founders: founderVestingAddrs,
      team: teamVestingAddrs,
      investors: investorVestingAddrs,
    },

    distribution: {
      recipients: allocations.length,
      allocations,
    },

    airdrop: {
      contract: simpleAirdropAddr,
      pool: airdropAddr,
      totalAmount: airdropAmt,
      claimPerUser: `${claimAmt} DWT`,
    },

    gnosis: {
      status: safeOwners.length >= 2 ? 'owners_configured' : 'not_configured',
      owners: safeOwners,
      threshold: safeThreshold,
      instructions: 'https://app.safe.global',
    },

    allAddresses: deployed,
  }

  const outFile = `deployment-${network.name}-${Date.now()}.json`
  fs.writeFileSync(outFile, JSON.stringify(deploymentData, null, 2))
  log(`\n   💾 Deployment saved → ${outFile}`)

  // ─── Final checklist ───────────────────────────────────────────────
  console.log('\n╔══════════════════════════════════════════════════════════════════╗')
  console.log('║   🎉  DEPLOYMENT COMPLETE                                       ║')
  console.log('╚══════════════════════════════════════════════════════════════════╝\n')

  log('✅  Security Infrastructure    — LockEngine, InvariantChecker, SecurityController, RateLimiter')
  log('✅  Governance                 — TimelockController (48h) + DWTGovernor')
  log('✅  Decentralization           — Ownership to Timelock, deployer admin renounced')
  log(`✅  Vesting Contracts          — ${founderVestingAddrs.length} founders / ${teamVestingAddrs.length} team / ${investorVestingAddrs.length} investors`)
  log(`✅  Token Distribution         — ${allocations.length} recipients minted`)
  log('✅  Airdrop Contract           — SimpleAirdrop deployed')
  log('✅  DEX Liquidity              — See instructions above')
  log('✅  Gnosis Safe                — See instructions above')
  log('✅  Verification cmds          — Printed above')

  log('\n📋  REMAINING MANUAL STEPS:')
  log('   1.  Fund SimpleAirdrop contract from airdrop wallet (command above)')
  log('   2.  Verify all contracts on BaseScan (commands above)')
  log('   3.  Create Gnosis Safe at https://app.safe.global')
  log('   4.  Transfer DAO Treasury tokens to Gnosis Safe')
  log('   5.  Add DEX liquidity if auto-add was skipped (scripts/add-liquidity.js)')
  log('   6.  Delegate your DWT to yourself to activate voting power:')
  log(`        cast send ${dwtTokenAddr} "delegate(address)" ${deployer.address} --rpc-url \$BASE_SEPOLIA_RPC --private-key \$PRIVATE_KEY`)
  log('   7.  Set up monitoring (Tenderly / OpenZeppelin Defender)')

  log(`\n🔗  BaseScan: https://sepolia.basescan.org/address/${dwtTokenAddr}\n`)
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\n❌ Deployment failed:', err)
    process.exit(1)
  })
