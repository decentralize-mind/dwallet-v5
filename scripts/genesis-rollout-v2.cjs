const { ethers } = require('hardhat')
require('dotenv').config()

const sleep = ms => new Promise(r => setTimeout(r, ms))

async function main() {
  const [deployer] = await ethers.getSigners()
  const bal = await ethers.provider.getBalance(deployer.address)

  console.log('🚀 STARTING RESILIENT GENESIS ROLLOUT (Auto-Nonce)')
  console.log(`- Deployer: ${deployer.address}`)
  console.log(`- Balance:  ${ethers.formatEther(bal)} ETH`)

  const MULTISIG = process.env.MULTISIG_ADDRESS || deployer.address
  const timelockDelay = 48 * 3600

  // 1. Timelock
  console.log('\n1. Deploying Timelock...')
  const Timelock = await ethers.getContractFactory('TimelockController')
  const timelock = await Timelock.deploy(
    timelockDelay,
    [],
    [ethers.ZeroAddress],
    deployer.address,
  )
  await timelock.waitForDeployment()
  const timelockAddr = await timelock.getAddress()
  console.log(`   ✅ Timelock: ${timelockAddr}`)
  await sleep(1000)

  // 2. DWTToken
  console.log('2. Deploying DWTToken...')
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
  console.log(`   ✅ DWT: ${dwtAddr}`)
  await sleep(1000)

  // 3. Allocations
  console.log('3. Allocating tokens...')
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
    const amtWei = ethers.parseEther(cleanAmt)

    console.log(`   🪙  Minting ${cleanAmt} to ${item.name}...`)

    let success = false
    let retries = 3
    while (!success && retries > 0) {
      try {
        const tx = await dwt.mint(item.addr, amtWei)
        await tx.wait()
        success = true
        console.log(`      ✅ Done.`)
        await sleep(500)
      } catch (e) {
        console.error(`      ⚠️  Retry ${4 - retries}: ${e.message}`)
        retries--
        if (retries === 0) throw e
        await sleep(2000)
      }
    }
  }

  // 4. Finalizing
  console.log('\n4. Finalizing L1...')
  const Governor = await ethers.getContractFactory('DWTGovernor')
  const governor = await Governor.deploy(dwtAddr, timelockAddr)
  await governor.waitForDeployment()
  const governorAddr = await governor.getAddress()
  console.log(`   ✅ Governor: ${governorAddr}`)
  await sleep(1000)

  await (await dwt.transferOwnership(timelockAddr)).wait()
  await (
    await timelock.grantRole(await timelock.PROPOSER_ROLE(), governorAddr)
  ).wait()
  await (
    await timelock.renounceRole(
      await timelock.DEFAULT_ADMIN_ROLE(),
      deployer.address,
    )
  ).wait()

  console.log('\n🎊 GENESIS REFRESH PHASE 1 COMPLETE.')
  console.log(`NEW_DWT_TOKEN=${dwtAddr}`)
  console.log(`NEW_TIMELOCK=${timelockAddr}`)
}

main().catch(console.error)
