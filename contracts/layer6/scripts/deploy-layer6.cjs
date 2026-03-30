// scripts/deploy-layer6.js
// ─────────────────────────────────────────────────────────────────────────────
// Deploy all 4 Layer 6 (Treasury & Fees) contracts for the dWallet ecosystem.
//
// Prerequisite: Deploy Layer 1-5 contracts first (dwallet-contracts.zip).
// Paste their deployed addresses in the PREV object below, or set as env vars.
//
// Run locally:
//   npx hardhat node                                          (terminal 1)
//   npx hardhat run scripts/deploy-layer6.js --network localhost  (terminal 2)
//
// Run on Sepolia:
//   npx hardhat run scripts/deploy-layer6.js --network sepolia
// ─────────────────────────────────────────────────────────────────────────────

const { ethers } = require('hardhat')
require('dotenv').config()

const cleanEnv = val => (val ? val.trim() : '')

// ── Addresses from previous deployments ──────────────────────────────────────
// Set these as environment variables or paste them directly.
const PREV = {
  DWTToken: cleanEnv(process.env.DWT_TOKEN) || ethers.ZeroAddress,
  Timelock: cleanEnv(process.env.TIMELOCK) || ethers.ZeroAddress,
  StakingPool: cleanEnv(process.env.STAKING_POOL) || ethers.ZeroAddress,
  DWTStaking: cleanEnv(process.env.DWT_STAKING) || ethers.ZeroAddress,
  DWalletFeeRouter: cleanEnv(process.env.FEE_ROUTER) || ethers.ZeroAddress,
  Layer7Security:
    cleanEnv(process.env.LAYER7_SECURITY_ADDRESS) || ethers.ZeroAddress,
}

// ── External addresses by chain ───────────────────────────────────────────────
const WETH = {
  1: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
  11155111: '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14',
  84532: '0x4200000000000000000000000000000000000006',
  31337: ethers.ZeroAddress,
}

const UNISWAP_ROUTER = {
  1: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
  11155111: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
  84532: '0x94cC0AaC535CCDB3C01d6787D6413C739ae12bc4',
  31337: ethers.ZeroAddress,
}

async function main() {
  const [deployer] = await ethers.getSigners()
  let currentNonce = await deployer.getNonce('pending')
  const network = await ethers.provider.getNetwork()
  const chainId = Number(network.chainId)

  console.log('\n╔══════════════════════════════════════════╗')
  console.log('║  dWallet Layer 6 — Treasury & Fees      ║')
  console.log('╚══════════════════════════════════════════╝')
  console.log(`Network : ${network.name} (chainId: ${chainId})`)
  console.log(`Deployer: ${deployer.address}`)
  console.log(`Starting nonce: ${currentNonce}`)
  console.log(
    `Balance : ${ethers.formatEther(
      await ethers.provider.getBalance(deployer.address),
    )} ETH\n`,
  )
  const layer7Security =
    PREV.Layer7Security !== ethers.ZeroAddress
      ? PREV.Layer7Security
      : process.env.LAYER7_SECURITY_ADDRESS
  if (!layer7Security)
    throw new Error('❌ LAYER7_SECURITY_ADDRESS missing in .env')

  const uniswapRouter = UNISWAP_ROUTER[chainId] || deployer.address
  const dwtToken =
    PREV.DWTToken !== ethers.ZeroAddress ? PREV.DWTToken : deployer.address
  const timelock =
    PREV.Timelock !== ethers.ZeroAddress ? PREV.Timelock : deployer.address
  const stakingPool =
    PREV.StakingPool !== ethers.ZeroAddress
      ? PREV.StakingPool
      : deployer.address
  const dwtStaking =
    PREV.DWTStaking !== ethers.ZeroAddress ? PREV.DWTStaking : deployer.address

  // ── 1. Treasury ─────────────────────────────────────────────────────────────
  console.log('1/4  Deploying Treasury...')
  const Treasury = await ethers.getContractFactory(
    'contracts/layer6/contracts/Treasury.sol:Treasury',
  )
  const treasury = await Treasury.deploy(
    deployer.address, // admin (multisig — use your Gnosis Safe address on mainnet)
    timelock, // governor (TimelockController from previous deploy)
    deployer.address, // guardian (security bot — use dedicated EOA on mainnet)
    layer7Security,
    { nonce: currentNonce++ },
  )
  await treasury.waitForDeployment()
  const treasuryAddr = await treasury.getAddress()
  console.log(`     Treasury: ${treasuryAddr}`)

  // ── 2. BuybackAndBurn ────────────────────────────────────────────────────────
  // Deploy before FeeSplitter so we can pass its address to FeeSplitter
  console.log('2/4  Deploying BuybackAndBurn...')
  console.log('Debug args lengths:', {
    uniswapRouter: uniswapRouter.length,
    dwtToken: dwtToken.length,
    admin: deployer.address.length,
    timelock: timelock.length,
    uniswapRouterVal: uniswapRouter,
    dwtTokenVal: dwtToken,
    timelockVal: timelock,
  })
  const BuybackAndBurn = await ethers.getContractFactory(
    'contracts/layer6/contracts/BuybackAndBurn.sol:BuybackAndBurn',
  )
  const buyback = await BuybackAndBurn.deploy(
    uniswapRouter,
    dwtToken,
    deployer.address,
    timelock,
    deployer.address,
    deployer.address,
    layer7Security,
    { nonce: currentNonce++ },
  )
  await buyback.waitForDeployment()
  const buybackAddr = await buyback.getAddress()
  console.log(`     BuybackAndBurn: ${buybackAddr}`)

  // ── 3. FeeSplitter ───────────────────────────────────────────────────────────
  console.log('3/4  Deploying FeeSplitter...')
  // Default split: 40% treasury, 40% rewards (DWT staking), 20% buyback
  // Note: RewardDistributor address from extra-contracts zip goes in rewardDistributor slot.
  //       If not deployed yet, temporarily use treasury address and update later.
  const rewardDistributor = process.env.REWARD_DISTRIBUTOR || treasuryAddr

  const FeeSplitter = await ethers.getContractFactory(
    'contracts/layer6/contracts/FeeSplitter.sol:FeeSplitter',
  )
  const feeSplitter = await FeeSplitter.deploy(
    treasuryAddr, // treasury
    rewardDistributor, // rewardDistributor
    buybackAddr, // buybackAndBurn
    4_000, // 40% to treasury
    4_000, // 40% to rewards
    2_000, // 20% to buyback
    deployer.address, // admin
    timelock, // governor
    deployer.address, // keeper
    deployer.address, // guardian
    layer7Security,
    { nonce: currentNonce++ },
  )
  await feeSplitter.waitForDeployment()
  const feeSplitterAddr = await feeSplitter.getAddress()
  console.log(`     FeeSplitter: ${feeSplitterAddr}`)

  // ── 4. VestingContract ───────────────────────────────────────────────────────
  console.log('4/4  Deploying VestingContract...')
  const VestingContract = await ethers.getContractFactory(
    'contracts/layer6/contracts/VestingContract.sol:VestingContract',
  )
  const vesting = await VestingContract.deploy(
    deployer.address, // admin
    timelock, // governor
    deployer.address, // guardian
    layer7Security,
    { nonce: currentNonce++ },
  )
  await vesting.waitForDeployment()
  const vestingAddr = await vesting.getAddress()
  console.log(`     VestingContract: ${vestingAddr}`)

  // ── Post-deploy wiring ───────────────────────────────────────────────────────
  console.log('\n── Wiring roles and connections ──')

  // Grant FeeSplitter DEPOSITOR_ROLE on Treasury
  // (FeeRouter will send to FeeSplitter, FeeSplitter splits to Treasury)
  const DEPOSITOR_ROLE = await treasury.DEPOSITOR_ROLE()
  await (
    await treasury.grantRole(DEPOSITOR_ROLE, feeSplitterAddr, {
      nonce: currentNonce++,
    })
  ).wait()
  console.log('  FeeSplitter granted DEPOSITOR_ROLE on Treasury')

  // Grant BuybackAndBurn SPENDER_ROLE on Treasury
  const SPENDER_ROLE = await treasury.SPENDER_ROLE()
  await (
    await treasury.grantRole(SPENDER_ROLE, buybackAddr, {
      nonce: currentNonce++,
    })
  ).wait()
  console.log('  BuybackAndBurn granted SPENDER_ROLE on Treasury')

  // Grant VestingContract DEPOSITOR_ROLE on Treasury (so Treasury can fund it)
  await (
    await treasury.grantRole(DEPOSITOR_ROLE, vestingAddr, {
      nonce: currentNonce++,
    })
  ).wait()
  console.log('  VestingContract granted DEPOSITOR_ROLE on Treasury')

  // Register DWT as a fee token in FeeSplitter
  // 10,000 DWT minimum balance before split triggers
  if (dwtToken !== deployer.address) {
    await (
      await feeSplitter.registerFeeToken(dwtToken, ethers.parseEther('10000'), {
        nonce: currentNonce++,
      })
    ).wait()
    console.log('  DWT registered as fee token in FeeSplitter')

    // Register DWT as a buyback input token (DWT → DWT buyback via the pool)
    // Note: in production, pass WETH/USDC as input tokens, not DWT itself.
    // DWT→DWT is registered here only for local testing convenience.
    // For mainnet: register WETH with pool fee 3000, USDC with pool fee 500.
    // await (await buyback.addInputToken(
    //   WETH[chainId], 3000, dwtEthPool, ethers.parseEther("0.1")
    // )).wait();
  }

  // ── Summary ───────────────────────────────────────────────────────────────────
  console.log('\n╔══════════════════════════════════════════════════════╗')
  console.log('║  Layer 6 Deployment Complete                         ║')
  console.log('╚══════════════════════════════════════════════════════╝')

  const addresses = {
    Treasury: treasuryAddr,
    FeeSplitter: feeSplitterAddr,
    BuybackAndBurn: buybackAddr,
    VestingContract: vestingAddr,
  }

  console.log('\nContract addresses (save these):')
  console.log(JSON.stringify(addresses, null, 2))

  console.log('\n⚠️  Post-deploy checklist:')
  console.log('  1. Point DWalletFeeRouter.treasury to FeeSplitter address')
  console.log('     (fees go to FeeSplitter first, then split automatically)')
  console.log('  2. Set per-token splits in FeeSplitter if needed:')
  console.log(
    '     feeSplitter.setTokenSplit(USDC, 10000, 0, 0)  // all USDC to Treasury',
  )
  console.log('  3. Add WETH and USDC as BuybackAndBurn input tokens:')
  console.log('     buyback.addInputToken(WETH, 3000, dwtWethPool, minAmount)')
  console.log('  4. Set budget for BuybackAndBurn on Treasury:')
  console.log('     treasury.setBudget(buybackAddr, DWT, 50000e18, 7 days)')
  console.log('  5. Fund StakingPool from Treasury via governance:')
  console.log('     treasury.fundStakingPool(stakingPool, DWT, amount, 7days)')
  console.log('  6. Create first vesting schedules for team/investors:')
  console.log('     vesting.createLinearSchedule(teamAddr, DWT, amount, ...)')
  console.log('  7. Transfer all ADMIN_ROLE grants from deployer to multisig')
  console.log('  8. Set Guardian addresses to actual security monitoring bots')
  console.log('  9. Register remaining fee tokens in FeeSplitter (WETH, USDC)')
  console.log(' 10. Get all contracts audited before mainnet launch')

  return addresses
}

main().catch(err => {
  console.error(err)
  process.exitCode = 1
})
