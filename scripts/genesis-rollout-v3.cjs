const { ethers } = require('hardhat')
const fs = require('fs')
require('dotenv').config()

const sleep = ms => new Promise(r => setTimeout(r, ms))

async function main() {
  const [deployer] = await ethers.getSigners()
  console.log('🚀 STARTING DEFINITIVE GENESIS ROLLOUT')

  const MULTISIG = process.env.MULTISIG_ADDRESS || deployer.address
  const timelockDelay = 48 * 3600

  // 1. Core L1
  const Timelock = await ethers.getContractFactory('TimelockController')
  const timelock = await Timelock.deploy(
    timelockDelay,
    [],
    [ethers.ZeroAddress],
    deployer.address,
  )
  await timelock.waitForDeployment()
  const timelockAddr = await timelock.getAddress()

  const DWT = await ethers.getContractFactory(
    'contracts/layer1/DWTToken.sol:DWTToken',
  )
  const dwt = await DWT.deploy(
    deployer.address,
    ethers.parseEther('1000'),
    ethers.parseEther('10000'),
    ethers.parseEther('100000'),
  )
  await dwt.waitForDeployment()
  const dwtAddr = await dwt.getAddress()

  const Governor = await ethers.getContractFactory('DWTGovernor')
  const governor = await Governor.deploy(dwtAddr, timelockAddr)
  await governor.waitForDeployment()
  const governorAddr = await governor.getAddress()

  const Treasury = await ethers.getContractFactory(
    'contracts/layer1/Treasury.sol:Treasury',
  )
  const treasury = await Treasury.deploy(timelockAddr, MULTISIG)
  await treasury.waitForDeployment()
  const treasuryAddr = await treasury.getAddress()

  // L3 infrastructure (moved to L1 script for sync)
  const L1RateFeed = await ethers.getContractFactory(
    'contracts/layer1/DWTETHRateFeed.sol:DWTETHRateFeed',
  )
  const l1RateFeed = await L1RateFeed.deploy(
    MULTISIG,
    deployer.address,
    ethers.parseEther('1000'),
    500,
    3600,
  )
  await l1RateFeed.waitForDeployment()
  const rateFeedAddr = await l1RateFeed.getAddress()

  const Paymaster = await ethers.getContractFactory(
    'contracts/layer1/DWTPaymaster.sol:DWTPaymaster',
  )
  const paymaster = await Paymaster.deploy(
    process.env.ERC4337_ENTRYPOINT,
    dwtAddr,
    rateFeedAddr,
    ethers.parseEther('1000'),
    11000,
    MULTISIG,
  )
  await paymaster.waitForDeployment()
  const paymasterAddr = await paymaster.getAddress()

  // 2. MINT LOOP
  const allocations = [
    {
      name: 'FOUNDER_1',
      addr: process.env.FOUNDER_1_ADDRESS,
      amt: process.env.FOUNDER_1_AMOUNT,
    },
    {
      name: 'FOUNDER_2',
      addr: process.env.FOUNDER_2_ADDRESS,
      amt: process.env.FOUNDER_2_AMOUNT,
    },
    {
      name: 'FOUNDER_3',
      addr: process.env.FOUNDER_3_ADDRESS,
      amt: process.env.FOUNDER_3_AMOUNT,
    },
    {
      name: 'TEAM_1',
      addr: process.env.TEAM_1_ADDRESS,
      amt: process.env.TEAM_1_AMOUNT,
    },
    {
      name: 'TEAM_2',
      addr: process.env.TEAM_2_ADDRESS,
      amt: process.env.TEAM_2_AMOUNT,
    },
    {
      name: 'TEAM_3',
      addr: process.env.TEAM_3_ADDRESS,
      amt: process.env.TEAM_3_AMOUNT,
    },
    {
      name: 'TEAM_4',
      addr: process.env.TEAM_4_ADDRESS,
      amt: process.env.TEAM_4_AMOUNT,
    },
    {
      name: 'TEAM_5',
      addr: process.env.TEAM_5_ADDRESS,
      amt: process.env.TEAM_5_AMOUNT,
    },
    {
      name: 'TEAM_6',
      addr: process.env.TEAM_6_ADDRESS,
      amt: process.env.TEAM_6_AMOUNT,
    },
    {
      name: 'TEAM_7',
      addr: process.env.TEAM_7_ADDRESS,
      amt: process.env.TEAM_7_AMOUNT,
    },
    {
      name: 'TEAM_8',
      addr: process.env.TEAM_8_ADDRESS,
      amt: process.env.TEAM_8_AMOUNT,
    },
    {
      name: 'TEAM_9',
      addr: process.env.TEAM_9_ADDRESS,
      amt: process.env.TEAM_9_AMOUNT,
    },
    {
      name: 'TEAM_10',
      addr: process.env.TEAM_10_ADDRESS,
      amt: process.env.TEAM_10_AMOUNT,
    },
    {
      name: 'TEAM_11',
      addr: process.env.TEAM_11_ADDRESS,
      amt: process.env.TEAM_11_AMOUNT,
    },
    {
      name: 'INVESTOR_1',
      addr: process.env.INVESTOR_1_ADDRESS,
      amt: process.env.INVESTOR_1_AMOUNT,
    },
    {
      name: 'DAO_TREASURY',
      addr: process.env.DAO_TREASURY_ADDRESS,
      amt: '14000000',
    },
    {
      name: 'COMMUNITY_REWARDS',
      addr: process.env.COMMUNITY_REWARDS_ADDRESS,
      amt: '10500000',
    },
    {
      name: 'AIRDROP',
      addr: process.env.AIRDROP_ADDRESS,
      amt: process.env.AIRDROP_AMOUNT,
    },
    {
      name: 'MARKETING_1',
      addr: process.env.MARKETING_1_ADDRESS,
      amt: process.env.MARKETING_1_AMOUNT,
    },
    {
      name: 'MARKETING_2',
      addr: process.env.MARKETING_2_ADDRESS,
      amt: process.env.MARKETING_2_AMOUNT,
    },
    {
      name: 'LIQUIDITY_DEX',
      addr: process.env.LIQUIDITY_DEX_ADDRESS,
      amt: process.env.LIQUIDITY_DEX_AMOUNT,
    },
    {
      name: 'ADVISOR_1',
      addr: process.env.ADVISOR_1_ADDRESS,
      amt: process.env.ADVISOR_1_AMOUNT,
    },
    {
      name: 'ADVISOR_2',
      addr: process.env.ADVISOR_2_ADDRESS,
      amt: process.env.ADVISOR_2_AMOUNT,
    },
    {
      name: 'ADVISOR_3',
      addr: process.env.ADVISOR_3_ADDRESS,
      amt: process.env.ADVISOR_3_AMOUNT,
    },
    {
      name: 'ADVISOR_4',
      addr: process.env.ADVISOR_4_ADDRESS,
      amt: process.env.ADVISOR_4_AMOUNT,
    },
    {
      name: 'ADVISOR_5',
      addr: process.env.ADVISOR_5_ADDRESS,
      amt: process.env.ADVISOR_5_AMOUNT,
    },
  ]

  for (const item of allocations) {
    if (!item.addr || !item.amt) continue
    const cleanAmt = item.amt.toString().replace(/,/g, '').trim()
    await (await dwt.mint(item.addr, ethers.parseEther(cleanAmt))).wait()
    await sleep(200)
  }

  // 3. Roles
  await (
    await timelock.grantRole(await timelock.PROPOSER_ROLE(), governorAddr)
  ).wait()
  await (
    await timelock.renounceRole(
      await timelock.DEFAULT_ADMIN_ROLE(),
      deployer.address,
    )
  ).wait()
  await (await dwt.transferOwnership(timelockAddr)).wait()

  // 4. Update .env
  const envPath = '.env'
  let env = fs.readFileSync(envPath, 'utf8')
  env = env.replace(/DWT_TOKEN=.*/g, `DWT_TOKEN=${dwtAddr}`)
  env = env.replace(/TIMELOCK=.*/g, `TIMELOCK=${timelockAddr}`)
  env = env.replace(/GOVERNOR=.*/g, `GOVERNOR=${governorAddr}`)
  env = env.replace(/TREASURY=.*/g, `TREASURY=${treasuryAddr}`)
  env = env.replace(/DWT_TOKEN_ADDRESS=.*/g, `DWT_TOKEN_ADDRESS=${dwtAddr}`)
  env = env.replace(/TREASURY_ADDRESS=.*/g, `TREASURY_ADDRESS=${treasuryAddr}`)
  env = env.replace(/DWTPAYMASTER=.*/g, `DWTPAYMASTER=${paymasterAddr}`)
  env = env.replace(/DWTETHRATEFEED=.*/g, `DWTETHRATEFEED=${rateFeedAddr}`)
  fs.writeFileSync(envPath, env)

  console.log('FINAL L1 SYNC COMPLETE.')
}

main().catch(console.error)
