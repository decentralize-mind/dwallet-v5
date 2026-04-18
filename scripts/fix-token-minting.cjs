const { ethers, network } = require('hardhat')
require('dotenv').config()

/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║   QUICK FIX: MINT TOKENS BEFORE OWNERSHIP TRANSFER              ║
 * ║                                                                  ║
 * ║   This script:                                                   ║
 * ║   1. Redeploys DWTTokenSimple                                    ║
 * ║   2. Mints ALL tokens to 25 recipients                           ║
 * ║   3. Transfers ownership to existing Timelock                    ║
 * ║   4. Updates SimpleAirdrop with new token address                ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function log(msg) { console.log(msg) }
function section(title) {
  console.log('\n' + '═'.repeat(64))
  console.log(`  ${title}`)
  console.log('═'.repeat(64))
}

async function main() {
  const [deployer] = await ethers.getSigners()
  const balance = await ethers.provider.getBalance(deployer.address)

  console.log('\n╔══════════════════════════════════════════════════════════════════╗')
  console.log('║   QUICK FIX: TOKEN MINTING & OWNERSHIP TRANSFER                 ║')
  console.log('╚══════════════════════════════════════════════════════════════════╝\n')
  log(`📍 Network   : ${network.name}`)
  log(`👤 Deployer  : ${deployer.address}`)
  log(`💰 Balance   : ${ethers.formatEther(balance)} ETH\n`)

  if (parseFloat(ethers.formatEther(balance)) < 0.02) {
    throw new Error('❌ Need at least 0.02 ETH for gas costs')
  }

  // ═══════════════════════════════════════════════════════════════════
  // STEP 1 — REDEPLOY DWT TOKEN
  // ═══════════════════════════════════════════════════════════════════
  section('STEP 1 — REDEPLOY DWT TOKEN')

  const DWTTokenFactory = await ethers.getContractFactory('DWTTokenSimple')
  log('\n   🪙 Deploying new DWTTokenSimple...')
  const dwtToken = await DWTTokenFactory.deploy(deployer.address)
  await dwtToken.waitForDeployment()
  const dwtTokenAddr = await dwtToken.getAddress()
  log(`   ✅ New DWT Token: ${dwtTokenAddr}`)
  
  const currentOwner = await dwtToken.owner()
  log(`   👑 Current owner: ${currentOwner}`)
  log(`   ✅ Owner is deployer: ${currentOwner === deployer.address}`)

  // ═══════════════════════════════════════════════════════════════════
  // STEP 2 — DEPLOY VESTING CONTRACTS
  // ═══════════════════════════════════════════════════════════════════
  section('STEP 2 — DEPLOY VESTING CONTRACTS')

  const VestingFactory = await ethers.getContractFactory(
    '@openzeppelin/contracts/finance/VestingWallet.sol:VestingWallet'
  )
  const nowTs = Math.floor(Date.now() / 1000)

  const ONE_YEAR  = 365 * 24 * 60 * 60
  const TWO_YEARS = 2 * ONE_YEAR
  const SIX_MONTHS = 180 * 24 * 60 * 60

  const vestingWallets = {}

  // Founder vesting
  log('\n   📦 Deploying Founder vesting wallets...')
  for (let i = 1; i <= 3; i++) {
    const addr = process.env[`FOUNDER_${i}_ADDRESS`]
    if (!addr || !ethers.isAddress(addr)) continue
    const vw = await VestingFactory.deploy(addr, nowTs + SIX_MONTHS, TWO_YEARS)
    await vw.waitForDeployment()
    const vwAddr = await vw.getAddress()
    vestingWallets[`founder${i}`] = vwAddr
    log(`      Founder ${i}: ${vwAddr}`)
    await sleep(200)
  }

  // Team vesting
  log('\n   📦 Deploying Team vesting wallets...')
  for (let i = 1; i <= 11; i++) {
    const addr = process.env[`TEAM_${i}_ADDRESS`]
    if (!addr || !ethers.isAddress(addr)) continue
    const vw = await VestingFactory.deploy(addr, nowTs, ONE_YEAR)
    await vw.waitForDeployment()
    const vwAddr = await vw.getAddress()
    vestingWallets[`team${i}`] = vwAddr
    log(`      Team ${i}: ${vwAddr}`)
    await sleep(200)
  }

  // Investor vesting
  log('\n   📦 Deploying Investor vesting wallets...')
  for (let i = 1; i <= 1; i++) {
    const addr = process.env[`INVESTOR_${i}_ADDRESS`]
    if (!addr || !ethers.isAddress(addr)) continue
    const vw = await VestingFactory.deploy(addr, nowTs + SIX_MONTHS, ONE_YEAR)
    await vw.waitForDeployment()
    const vwAddr = await vw.getAddress()
    vestingWallets[`investor${i}`] = vwAddr
    log(`      Investor ${i}: ${vwAddr}`)
    await sleep(200)
  }

  // ═══════════════════════════════════════════════════════════════════
  // STEP 3 — MINT TOKENS (BEFORE OWNERSHIP TRANSFER!)
  // ═══════════════════════════════════════════════════════════════════
  section('STEP 3 — MINT TOKENS TO ALL RECIPIENTS')

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
  for (let i = 1; i <= 3; i++) {
    if (vestingWallets[`founder${i}`]) {
      addAlloc(vestingWallets[`founder${i}`], `FOUNDER_${i}_AMOUNT`, `Founder ${i} (vesting)`)
    }
  }
  for (let i = 1; i <= 11; i++) {
    if (vestingWallets[`team${i}`]) {
      addAlloc(vestingWallets[`team${i}`], `TEAM_${i}_AMOUNT`, `Team ${i} (vesting)`)
    }
  }
  for (let i = 1; i <= 1; i++) {
    if (vestingWallets[`investor${i}`]) {
      addAlloc(vestingWallets[`investor${i}`], `INVESTOR_${i}_AMOUNT`, `Investor ${i} (vesting)`)
    }
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
  let successCount = 0
  let failCount = 0

  for (const alloc of allocations) {
    const amountWei = ethers.parseEther(alloc.amount)
    totalMinted += amountWei
    process.stdout.write(`   ⏳ Minting ${alloc.amount.padStart(12)} DWT → ${alloc.label.padEnd(28)}`)
    try {
      const tx = await dwtToken.mint(alloc.address, amountWei)
      await tx.wait()
      process.stdout.write(' ✅\n')
      successCount++
    } catch (e) {
      process.stdout.write(` ❌ ${e.shortMessage || e.message}\n`)
      failCount++
    }
    await sleep(300)
  }

  log(`\n   💰 Total minted : ${ethers.formatEther(totalMinted)} DWT`)
  log(`   🏦 Max supply   : 123,000,000 DWT`)
  log(`   📦 Remaining    : ${ethers.formatEther(ethers.parseEther('123000000') - totalMinted)} DWT`)
  log(`   ✅ Successful   : ${successCount}/${allocations.length}`)
  log(`   ❌ Failed       : ${failCount}/${allocations.length}`)

  // ═══════════════════════════════════════════════════════════════════
  // STEP 4 — DEPLOY AIRDROP CONTRACT
  // ═══════════════════════════════════════════════════════════════════
  section('STEP 4 — DEPLOY AIRDROP CONTRACT')

  const SimpleAirdrop = await ethers.getContractFactory('SimpleAirdrop')
  log('\n   🎁 Deploying SimpleAirdrop...')
  const simpleAirdrop = await SimpleAirdrop.deploy(dwtTokenAddr)
  await simpleAirdrop.waitForDeployment()
  const simpleAirdropAddr = await simpleAirdrop.getAddress()
  log(`   ✅ SimpleAirdrop: ${simpleAirdropAddr}`)

  const airdropAmt = process.env.AIRDROP_AMOUNT
  log(`\n   📋 Airdrop pool: ${airdropAmt} DWT`)
  log(`   ⚠️  ACTION: Fund airdrop contract manually after this script`)

  // ═══════════════════════════════════════════════════════════════════
  // STEP 5 — TRANSFER OWNERSHIP TO TIMELOCK
  // ═══════════════════════════════════════════════════════════════════
  section('STEP 5 — TRANSFER OWNERSHIP TO TIMELOCK')

  // Use existing Timelock from previous deployment
  const TIMELOCK_ADDR = '0x1A8AEe3E1B69959DCfF9E4A0bd0757e8451a49c4'
  const GOVERNOR_ADDR = '0xD1779aD62De0bEeD47Fe60d481593BF5EA0f1c21'

  log(`\n   🏛️  Using existing Timelock: ${TIMELOCK_ADDR}`)
  log(`   🏛️  Using existing Governor: ${GOVERNOR_ADDR}`)

  log('\n   🔄 Transferring token ownership to Timelock...')
  const tx1 = await dwtToken.transferOwnership(TIMELOCK_ADDR)
  await tx1.wait()
  log('   ✅ Ownership transferred')

  const newOwner = await dwtToken.owner()
  log(`   👑 New owner: ${newOwner}`)
  log(`   ✅ Owner is Timelock: ${newOwner === TIMELOCK_ADDR}`)

  // ═══════════════════════════════════════════════════════════════════
  // STEP 6 — SAVE DEPLOYMENT DATA
  // ═══════════════════════════════════════════════════════════════════
  section('STEP 6 — SAVE DEPLOYMENT DATA')

  const fs = require('fs')
  const deploymentData = {
    network: network.name,
    chainId: network.config.chainId,
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    fixedDeployment: true,
    
    token: {
      address: dwtTokenAddr,
      owner: newOwner,
      ownerIsTimelock: newOwner === TIMELOCK_ADDR,
      totalMinted: ethers.formatEther(totalMinted),
      maxSupply: '123000000',
      mintSuccessRate: `${successCount}/${allocations.length}`,
    },

    governance: {
      timelock: TIMELOCK_ADDR,
      governor: GOVERNOR_ADDR,
      timelockDelay: '48 hours',
    },

    vesting: vestingWallets,

    airdrop: {
      contract: simpleAirdropAddr,
      pool: process.env.AIRDROP_ADDRESS,
      totalAmount: airdropAmt,
      claimPerUser: '5 DWT',
    },

    allocations: allocations,

    nextSteps: [
      '1. Fund SimpleAirdrop contract with AIRDROP_AMOUNT DWT',
      '2. Verify contracts on BaseScan',
      '3. Delegate voting power to activate governance',
      '4. Add DEX liquidity if needed',
      '5. Create Gnosis Safe for multisig treasury',
    ],
  }

  const outFile = `deployment-fixed-${network.name}-${Date.now()}.json`
  fs.writeFileSync(outFile, JSON.stringify(deploymentData, null, 2))
  log(`\n   💾 Deployment saved → ${outFile}`)

  // ═══════════════════════════════════════════════════════════════════
  // FINAL SUMMARY
  // ═══════════════════════════════════════════════════════════════════
  console.log('\n╔══════════════════════════════════════════════════════════════════╗')
  console.log('║   🎉  QUICK FIX COMPLETE                                        ║')
  console.log('╚══════════════════════════════════════════════════════════════════╝\n')

  log('✅  New DWT Token deployed')
  log(`✅  ${successCount} tokens minted successfully`)
  log('✅  Ownership transferred to Timelock')
  log('✅  Airdrop contract deployed')
  log('✅  Vesting wallets deployed')

  log('\n📋  REMAINING MANUAL STEPS:')
  log(`   1. Fund SimpleAirdrop contract:`)
  log(`      cast send ${dwtTokenAddr} "transfer(address,uint256)" \\`)
  log(`        ${simpleAirdropAddr} \\`)
  log(`        ${ethers.parseEther(airdropAmt).toString()} \\`)
  log(`        --rpc-url $BASE_SEPOLIA_RPC --private-key $AIRDROP_PRIVATE_KEY`)
  log(`\n   2. Verify contracts on BaseScan:`)
  log(`      npx hardhat verify --network ${network.name} ${dwtTokenAddr} "${deployer.address}"`)
  log(`      npx hardhat verify --network ${network.name} ${simpleAirdropAddr} "${dwtTokenAddr}"`)
  log(`\n   3. Delegate voting power:`)
  log(`      cast send ${dwtTokenAddr} "delegate(address)" ${deployer.address} \\`)
  log(`        --rpc-url $BASE_SEPOLIA_RPC --private-key $PRIVATE_KEY`)

  log(`\n🔗  BaseScan: https://sepolia.basescan.org/address/${dwtTokenAddr}\n`)
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\n❌ Deployment failed:', err)
    process.exit(1)
  })
