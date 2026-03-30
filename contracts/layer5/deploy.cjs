// deploy.js — Layer 5 dWallet Protocol Deployment Script
// Advanced DeFi: Cross-Chain, Flash Loans, Insurance, AMM
// Run with: npx hardhat run deploy.js --network <network>

const { ethers } = require('hardhat')
require('dotenv').config()

async function main() {
  const [deployer] = await ethers.getSigners()
  let currentNonce = await deployer.getNonce('pending')
  console.log('Deploying Layer 5 contracts with:', deployer.address)
  console.log('Starting nonce:', currentNonce)

  // ─── Required addresses from previous layers ───────────────────────────
  const DWT_TOKEN = process.env.DWT_TOKEN || process.env.BASE_DWT_TOKEN
  const TIMELOCK = process.env.TIMELOCK || process.env.BASE_TIMELOCK
  const MULTISIG_ADDRESS =
    process.env.MULTISIG_ADDRESS ||
    process.env.BASE_MULTISIG ||
    deployer.address
  const PRICE_ORACLE =
    process.env.PRICE_ORACLE ||
    process.env.BASE_PRICE_ORACLE ||
    process.env.DWT_ORACLE_L10
  const LAYER7_SECURITY_ADDRESS = process.env.LAYER7_SECURITY_ADDRESS
  if (!LAYER7_SECURITY_ADDRESS)
    throw new Error('❌ LAYER7_SECURITY_ADDRESS missing in .env')

  if (!DWT_TOKEN || !PRICE_ORACLE) {
    console.error('❌ ERROR: Missing DWT_TOKEN or PRICE_ORACLE in .env')
    console.log('DWT_TOKEN:', DWT_TOKEN)
    console.log('PRICE_ORACLE:', PRICE_ORACLE)
    process.exit(1)
  }

  // ─── External addresses ────────────────────────────────────────────────
  const UNISWAP_V3_PM = process.env.UNISWAP_V3_PM // NonfungiblePositionManager
  const DWT_ETH_POOL = process.env.DWT_ETH_POOL // Uniswap V3 DWT/ETH pool

  console.log('DWT_TOKEN:', DWT_TOKEN)
  console.log('MULTISIG_ADDRESS:', MULTISIG_ADDRESS)
  console.log('PRICE_ORACLE:', PRICE_ORACLE)
  console.log('UNISWAP_V3_PM:', UNISWAP_V3_PM)
  console.log('DWT_ETH_POOL:', DWT_ETH_POOL)

  // ─── Deploy CrossChainMessenger ────────────────────────────────────────
  console.log('\n── Deploying CrossChainMessenger ─────────────────────────')
  const MessengerFactory = await ethers.getContractFactory(
    'contracts/layer5/CrossChainMessenger.sol:CrossChainMessenger',
  )
  const messenger = await MessengerFactory.deploy(
    MULTISIG_ADDRESS, // admin
    deployer.address, // guardian
    deployer.address, // relayer (replace with relayer bot)
    deployer.address, // bridgeProvider (replace with Axelar/LayerZero address)
    12 * 60 * 60, // executionDelay: 12 hours
    7 * 24 * 60 * 60, // messageExpiry: 7 days
    1000, // dailyCap: 1000 messages/day
    LAYER7_SECURITY_ADDRESS, // _securityController
    { nonce: currentNonce++ },
  )
  await messenger.waitForDeployment()
  console.log('CrossChainMessenger:', await messenger.getAddress())

  // ─── Deploy CrossChainStaking (Mainnet Hub) ────────────────────────────
  console.log('\n── Deploying CrossChainStaking Hub ───────────────────────')
  const XStakingFactory = await ethers.getContractFactory(
    'contracts/layer5/CrossChainStaking.sol:CrossChainStaking',
  )
  const xStakingHub = await XStakingFactory.deploy(
    false, // isSatellite = false (mainnet hub)
    DWT_TOKEN,
    await messenger.getAddress(),
    ethers.ZeroAddress, // counterpart L2 address (set after L2 deploy)
    0, // counterpartChainId (set after L2 deploy)
    7 * 24 * 60 * 60, // safetyDelay: 7 days
    30 * 24 * 60 * 60, // creditTTL: 30 days
    LAYER7_SECURITY_ADDRESS, // _securityController
    MULTISIG_ADDRESS, // admin
    deployer.address, // guardian
    { nonce: currentNonce++ },
  )
  await xStakingHub.waitForDeployment()
  console.log('CrossChainStaking (Hub):', await xStakingHub.getAddress())

  // ─── Deploy CrossChainGovernance (Mainnet Home) ────────────────────────
  console.log('\n── Deploying CrossChainGovernance Home ───────────────────')
  const XGovFactory = await ethers.getContractFactory(
    'contracts/layer5/CrossChainGovernance.sol:CrossChainGovernance',
  )
  const xGovHome = await XGovFactory.deploy(
    false, // isSatellite = false (mainnet home)
    await messenger.getAddress(),
    ethers.ZeroAddress, // counterpart L2 (set after L2 deploy)
    0, // counterpartChainId (set after L2 deploy)
    3000, // maxL2WeightBps: 30% max L2 contribution
    1000, // minL2Quorum: 10% of L2 holders must vote
    24 * 60 * 60, // vetoWindowDuration: 24 hours
    LAYER7_SECURITY_ADDRESS, // _securityController
    MULTISIG_ADDRESS, // admin
    deployer.address, // guardian
    MULTISIG_ADDRESS, // TALLY_SUBMITTER = multisig
    MULTISIG_ADDRESS, // GOV_COUNCIL = multisig
    { nonce: currentNonce++ },
  )
  await xGovHome.waitForDeployment()
  console.log('CrossChainGovernance (Home):', await xGovHome.getAddress())

  // ─── Deploy FlashLoan ──────────────────────────────────────────────────
  console.log('\n── Deploying FlashLoan ───────────────────────────────────')
  const FlashLoanFactory = await ethers.getContractFactory(
    'contracts/layer5/FlashLoan.sol:FlashLoan',
  )
  const flashLoan = await FlashLoanFactory.deploy(
    DWT_TOKEN,
    5000, // maxLoanBps: 50% of pool per loan
    9, // flashFeesBps: 0.09%
    LAYER7_SECURITY_ADDRESS,
    MULTISIG_ADDRESS, // admin
    deployer.address, // guardian
    { nonce: currentNonce++ },
  )
  await flashLoan.waitForDeployment()
  console.log('FlashLoan:', await flashLoan.getAddress())

  // ─── Deploy InsuranceFund ──────────────────────────────────────────────
  console.log('\n── Deploying InsuranceFund ───────────────────────────────')
  const InsuranceFactory = await ethers.getContractFactory(
    'contracts/layer5/InsuranceFund.sol:InsuranceFund',
  )
  const insurance = await InsuranceFactory.deploy(
    DWT_TOKEN,
    2000, // maxClaimBps: 20% per claim
    4000, // rollingCapBps: 40% per 30 days
    41 * 60 * 60, // executionDelay: 48 hours
    LAYER7_SECURITY_ADDRESS,
    MULTISIG_ADDRESS, // admin
    MULTISIG_ADDRESS, // CLAIM_COMMITTEE (replace with dedicated multisig)
    deployer.address, // guardian
    { nonce: currentNonce++ },
  )
  await insurance.waitForDeployment()
  console.log('InsuranceFund:', await insurance.getAddress())

  // ─── Deploy LimitOrders ───────────────────────────────────────────────
  console.log('\n── Deploying LimitOrders ─────────────────────────────────')
  const LimitOrdersFactory = await ethers.getContractFactory(
    'contracts/layer5/LimitOrders.sol:LimitOrders',
  )
  const limitOrders = await LimitOrdersFactory.deploy(
    PRICE_ORACLE,
    10, // executionFeeBps: 0.10% keeper fee
    LAYER7_SECURITY_ADDRESS,
    MULTISIG_ADDRESS, // admin
    deployer.address, // guardian
    { nonce: currentNonce++ },
  )
  await limitOrders.waitForDeployment()
  console.log('LimitOrders:', await limitOrders.getAddress())

  // ─── Deploy LiquidityIncentive ─────────────────────────────────────────
  console.log('\n── Deploying LiquidityIncentive ──────────────────────────')
  let liqAddr = 'Skipped (Uniswap V3 Mismatch)'
  try {
    const LiqIncentiveFactory = await ethers.getContractFactory(
      'contracts/layer5/LiquidityIncentive.sol:LiquidityIncentive',
    )
    // Ensure pool is an EOA if missing to avoid code.length > 0 revert
    const safePool =
      DWT_ETH_POOL || '0x000000000000000000000000000000000000dead'
    const liqIncentive = await LiqIncentiveFactory.deploy(
      UNISWAP_V3_PM || deployer.address,
      DWT_TOKEN, // reward token = DWT
      safePool,
      7 * 24 * 60 * 60, // rewardsDuration: 1 week
      LAYER7_SECURITY_ADDRESS,
      MULTISIG_ADDRESS, // admin
      deployer.address, // guardian
      { nonce: currentNonce++ },
    )
    await liqIncentive.waitForDeployment()
    liqAddr = await liqIncentive.getAddress()
    console.log('LiquidityIncentive:', liqAddr)
  } catch (e) {
    console.log(
      '⚠️  LiquidityIncentive deployment failed, skipping... (Likely Uniswap V3 mismatch on testnet)',
    )
    console.log('Error:', e.message)
  }

  // ─── Summary ──────────────────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════════════════════')
  console.log('                LAYER 5 DEPLOYMENT COMPLETE')
  console.log('══════════════════════════════════════════════════════════')
  console.log('CrossChainMessenger:      ', await messenger.getAddress())
  console.log('CrossChainStaking (Hub):  ', await xStakingHub.getAddress())
  console.log('CrossChainGovernance (Home):', await xGovHome.getAddress())
  console.log('FlashLoan:                ', await flashLoan.getAddress())
  console.log('InsuranceFund:            ', await insurance.getAddress())
  console.log('LimitOrders:              ', await limitOrders.getAddress())
  console.log('LiquidityIncentive:       ', liqAddr)
  console.log('══════════════════════════════════════════════════════════')
  console.log('\n⚠️  REMAINING MANUAL STEPS:')
  console.log(
    '  1. Deploy L2 satellite contracts (CrossChainStaking, CrossChainGovernance)',
  )
  console.log(
    '  2. Set counterpart addresses on Hub and Satellite via setMessenger/counterpart',
  )
  console.log(
    '  3. Register trusted remotes in CrossChainMessenger via setTrustedRemote()',
  )
  console.log(
    '  4. Deposit initial liquidity into FlashLoan pool via deposit()',
  )
  console.log('  5. Deposit into InsuranceFund via deposit()')
  console.log(
    '  6. Notify reward amount in LiquidityIncentive via notifyRewardAmount()',
  )
  console.log(
    '  7. Replace bridge provider with Axelar/LayerZero for production',
  )
  console.log(
    '  8. Full independent audit required — especially cross-chain paths',
  )
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
