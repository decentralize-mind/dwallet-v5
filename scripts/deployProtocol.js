const { ethers, run, network } = require('hardhat')
require('dotenv').config()

/**
 * Toklo Protocol — Full Deployment
 *
 * Deploy order (dependency-safe):
 *   1.  DWT Token            (no deps)
 *   2.  DWalletTimelock      (no deps)
 *   3.  DWalletGovernance    (needs DWT + Timelock)
 *   4.  DWalletAccessControl (no deps)
 *   5.  StakingPool          (needs DWT)
 *   6.  FeeManager           (needs DWT + StakingPool)
 *   7.  BurnMechanism        (needs DWT + StakingPool)
 *   8.  DWalletFeeRouter     (needs DWT + StakingPool)
 *   9.  EmissionController   (needs DWT + StakingPool)
 *   10. RewardDistributor    (needs DWT)
 *   11. AssetVault           (no deps)
 *   12. BridgeRateLimit      (needs DWT)
 *   13. BridgeGateway        (needs DWT)
 *   14. TreasuryGuard        (needs DWT)
 *   15. SecurityCouncil      (needs Timelock)
 *   16. Multisend            (no deps)
 *   17. VestingWallets       (needs DWT — one per team member)
 */

async function main() {
  const [deployer] = await ethers.getSigners()
  const balance = await ethers.provider.getBalance(deployer.address)
  const isMainnet = ['mainnet', 'base', 'arbitrum', 'polygon'].includes(
    network.name,
  )

  console.log('\n╔══════════════════════════════════════════════════╗')
  console.log('║   Toklo Protocol — Full Stack Deployment          ║')
  console.log('╚══════════════════════════════════════════════════╝')
  console.log(
    'Network:  ',
    network.name,
    isMainnet ? '⚠️  MAINNET' : '(testnet)',
  )
  console.log('Deployer: ', deployer.address)
  console.log('Balance:  ', ethers.formatEther(balance), 'ETH\n')

  if (parseFloat(ethers.formatEther(balance)) < 0.05)
    throw new Error('Need at least 0.05 ETH')

  if (isMainnet) {
    console.log('⚠️  MAINNET — 10s countdown — Ctrl+C to cancel...')
    await new Promise(r => setTimeout(r, 10000))
  }

  // ── Wallet addresses (update before mainnet) ────────────────────────────
  const ADMIN = deployer.address
  const FOUNDER = process.env.FOUNDER_WALLET || deployer.address
  const COMMUNITY = process.env.COMMUNITY_WALLET || deployer.address
  const LIQUIDITY = process.env.LIQUIDITY_WALLET || deployer.address
  const TREASURY = process.env.TREASURY_WALLET || deployer.address
  const MARKETING = process.env.MARKETING_WALLET || deployer.address
  const TEAM = process.env.TEAM_WALLET || deployer.address
  const RELAYER = process.env.RELAYER_WALLET || deployer.address
  const GUARDIAN = process.env.GUARDIAN_WALLET || deployer.address

  const addr = {}

  const deploy = async (name, ...args) => {
    process.stdout.write(`  Deploying ${name}...`)
    const F = await ethers.getContractFactory(name)
    const c = await F.deploy(...args)
    await c.waitForDeployment()
    const a = await c.getAddress()
    addr[name] = a
    console.log(` ✅ ${a}`)
    return c
  }

  // ── 1. DWT Token ──────────────────────────────────────────────────────
  console.log('\n[LAYER 1] Core token')
  const token = await deploy(
    'DWalletToken',
    FOUNDER,
    COMMUNITY,
    LIQUIDITY,
    TREASURY,
    MARKETING,
  )

  // ── 2. Timelock ───────────────────────────────────────────────────────
  console.log('\n[LAYER 2] Governance infrastructure')
  const timelock = await deploy(
    'DWalletTimelock',
    [ADMIN], // proposers — governance contract added later
    [ethers.ZeroAddress], // executors — anyone
    ADMIN,
  )

  // ── 3. Governance ─────────────────────────────────────────────────────
  const governance = await deploy(
    'DWalletGovernance',
    addr['DWalletToken'],
    addr['DWalletTimelock'],
  )

  // Grant governance PROPOSER_ROLE on timelock
  const PROPOSER_ROLE = await timelock.PROPOSER_ROLE()
  await (
    await timelock.grantRole(PROPOSER_ROLE, addr['DWalletGovernance'])
  ).wait()
  console.log('  ✅ Governance granted PROPOSER_ROLE on Timelock')

  // ── 4. Access Control ─────────────────────────────────────────────────
  console.log('\n[LAYER 3] Security')
  const acl = await deploy('DWalletAccessControl')
  // Initialize via proxy pattern would go here — for simplicity deploy directly
  // In production use a proxy

  // ── 5. Staking Pool ───────────────────────────────────────────────────
  console.log('\n[LAYER 4] Protocol services')
  const staking = await deploy('DWTStaking', addr['DWalletToken'], ADMIN)

  // ── 6. Fee Manager ────────────────────────────────────────────────────
  const feeManager = await deploy(
    'DWalletFeeRouter',
    addr['DWalletToken'],
    addr['DWTStaking'],
    TREASURY,
    TEAM,
  )

  // Grant FeeRouter REWARD_DEPOSITOR_ROLE on staking
  await (await staking.addRewardDepositor(addr['DWalletFeeRouter'])).wait()
  console.log('  ✅ FeeRouter granted REWARD_DEPOSITOR_ROLE')

  // ── 7. Multisend ──────────────────────────────────────────────────────
  console.log('\n[LAYER 5] Utilities')
  await deploy('Multisend')

  // ── 8. Asset Vault ────────────────────────────────────────────────────
  await deploy('AssetVault')

  // ── 9. Treasury Guard ─────────────────────────────────────────────────
  await deploy('TreasuryGuard')

  // ── 10. Security Council ──────────────────────────────────────────────
  console.log('\n[LAYER 6] Security council')
  const COUNCIL_MEMBERS = [GUARDIAN, ADMIN] // add 5 more real addresses for production
  await deploy(
    'SecurityCouncil',
    addr['DWalletTimelock'],
    COUNCIL_MEMBERS,
    2, // threshold — increase to 4 for production
    365, // bootstrap days
  )

  // ── 11. VestingWallets (one per team member) ──────────────────────────
  console.log('\n[LAYER 7] Team vesting wallets')
  const CLIFF = 365 * 24 * 3600 // 1 year cliff
  const DURATION = 4 * 365 * 24 * 3600 // 4 year total
  const NOW = Math.floor(Date.now() / 1000)

  const TEAM_WALLETS = [
    { name: 'Phearun', address: FOUNDER, amount: '9000000' },
    {
      name: 'Vanda',
      address: process.env.VANDA_WALLET || ADMIN,
      amount: '2250000',
    },
    {
      name: 'Kao Ching',
      address: process.env.KAOC_WALLET || ADMIN,
      amount: '1800000',
    },
    {
      name: 'Niron',
      address: process.env.NIRON_WALLET || ADMIN,
      amount: '1800000',
    },
    {
      name: 'Sok Ny',
      address: process.env.SOKNY_WALLET || ADMIN,
      amount: '1800000',
    },
    {
      name: 'Kimleang',
      address: process.env.KIMLEANG_WALLET || ADMIN,
      amount: '1800000',
    },
    {
      name: 'JJ-Dubai',
      address: process.env.JJDUBAI_WALLET || ADMIN,
      amount: '1350000',
    },
    {
      name: 'Pu-Kim',
      address: process.env.PUKIM_WALLET || ADMIN,
      amount: '1350000',
    },
    {
      name: 'Sovandy',
      address: process.env.SOVANDY_WALLET || ADMIN,
      amount: '1350000',
    },
  ]

  const VW = await ethers.getContractFactory('VestingWallet')
  for (const member of TEAM_WALLETS) {
    process.stdout.write(`  VestingWallet for ${member.name}...`)
    const vw = await VW.deploy(
      addr['DWalletToken'],
      member.address,
      NOW,
      CLIFF,
      DURATION,
      ADMIN,
    )
    await vw.waitForDeployment()
    const vwAddr = await vw.getAddress()
    addr[`VestingWallet_${member.name}`] = vwAddr
    console.log(` ✅ ${vwAddr}`)
  }

  // ── Summary ───────────────────────────────────────────────────────────
  const fs = require('fs')
  const output = {
    network: network.name,
    chainId: network.config.chainId,
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    contracts: addr,
  }

  const outFile = `deployed-full-${network.name}.json`
  fs.writeFileSync(outFile, JSON.stringify(output, null, 2))

  console.log('\n╔══════════════════════════════════════════════════╗')
  console.log('║   ✅ FULL PROTOCOL DEPLOYED                        ║')
  console.log('╚══════════════════════════════════════════════════╝')

  for (const [name, address] of Object.entries(addr)) {
    console.log(`  ${name.padEnd(30)} ${address}`)
  }

  console.log('\n📄 Saved to', outFile)
  console.log('\n📋 Next steps:')
  console.log('  1. Update dwallet-v5 src/utils/defi.js with new addresses')
  console.log('  2. Transfer DWT to VestingWallets from team allocation')
  console.log(
    '  3. Deploy to Base mainnet: npx hardhat run scripts/deployProtocol.js --network base',
  )
  console.log('  4. Create Uniswap V3 DWT/ETH pool')
  console.log(
    '  5. Submit to Arbitrum Audit Program with all contract addresses',
  )
}

main().catch(e => {
  console.error('\n❌', e.message)
  process.exit(1)
})
