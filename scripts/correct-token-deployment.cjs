const { ethers, network } = require('hardhat')
require('dotenv').config()

/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║   CORRECT TOKEN DEPLOYMENT - MINT BEFORE OWNERSHIP TRANSFER     ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function main() {
  const [deployer] = await ethers.getSigners()
  const balance = await ethers.provider.getBalance(deployer.address)

  console.log('\n╔══════════════════════════════════════════════════════════════════╗')
  console.log('║   CORRECT TOKEN DEPLOYMENT WITH PROPER SEQUENCE                 ║')
  console.log('╚══════════════════════════════════════════════════════════════════╝\n')
  console.log(`📍 Network: ${network.name}`)
  console.log(`👤 Deployer: ${deployer.address}`)
  console.log(`💰 Balance: ${ethers.formatEther(balance)} ETH\n`)

  // ═══════════════════════════════════════════════════════════════════
  // STEP 1: Deploy Token (deployer is owner)
  // ═══════════════════════════════════════════════════════════════════
  console.log('═'.repeat(64))
  console.log('STEP 1: Deploy DWT Token')
  console.log('═'.repeat(64))
  
  const DWTTokenFactory = await ethers.getContractFactory('DWTTokenSimple')
  const dwtToken = await DWTTokenFactory.deploy(deployer.address)
  await dwtToken.waitForDeployment()
  const dwtTokenAddr = await dwtToken.getAddress()
  
  console.log(`✅ DWT Token: ${dwtTokenAddr}`)
  console.log(`👑 Owner: ${await dwtToken.owner()}\n`)

  // ═══════════════════════════════════════════════════════════════════
  // STEP 2: Deploy Vesting Wallets
  // ═══════════════════════════════════════════════════════════════════
  console.log('═'.repeat(64))
  console.log('STEP 2: Deploy Vesting Wallets')
  console.log('═'.repeat(64))
  
  const VestingFactory = await ethers.getContractFactory(
    '@openzeppelin/contracts/finance/VestingWallet.sol:VestingWallet'
  )
  const nowTs = Math.floor(Date.now() / 1000)
  const ONE_YEAR = 365 * 24 * 60 * 60
  const TWO_YEARS = 2 * ONE_YEAR
  const SIX_MONTHS = 180 * 24 * 60 * 60

  const vestingAddrs = {}

  // Founders
  for (let i = 1; i <= 3; i++) {
    const addr = process.env[`FOUNDER_${i}_ADDRESS`]
    if (!addr || !ethers.isAddress(addr)) continue
    const vw = await VestingFactory.deploy(addr, nowTs + SIX_MONTHS, TWO_YEARS)
    await vw.waitForDeployment()
    vestingAddrs[`founder${i}`] = await vw.getAddress()
    console.log(`✅ Founder ${i}: ${vestingAddrs[`founder${i}`]}`)
  }

  // Team
  for (let i = 1; i <= 11; i++) {
    const addr = process.env[`TEAM_${i}_ADDRESS`]
    if (!addr || !ethers.isAddress(addr)) continue
    const vw = await VestingFactory.deploy(addr, nowTs, ONE_YEAR)
    await vw.waitForDeployment()
    vestingAddrs[`team${i}`] = await vw.getAddress()
    console.log(`✅ Team ${i}: ${vestingAddrs[`team${i}`]}`)
  }

  // Investors
  for (let i = 1; i <= 1; i++) {
    const addr = process.env[`INVESTOR_${i}_ADDRESS`]
    if (!addr || !ethers.isAddress(addr)) continue
    const vw = await VestingFactory.deploy(addr, nowTs + SIX_MONTHS, ONE_YEAR)
    await vw.waitForDeployment()
    vestingAddrs[`investor${i}`] = await vw.getAddress()
    console.log(`✅ Investor ${i}: ${vestingAddrs[`investor${i}`]}`)
  }

  // ═══════════════════════════════════════════════════════════════════
  // STEP 3: MINT ALL TOKENS (BEFORE ownership transfer!)
  // ═══════════════════════════════════════════════════════════════════
  console.log('\n' + '═'.repeat(64))
  console.log('STEP 3: Mint ALL Tokens (CRITICAL: Before ownership transfer!)')
  console.log('═'.repeat(64))
  
  const allocations = []
  
  const addAlloc = (address, amountKey, label) => {
    const amt = process.env[amountKey]
    if (address && amt && ethers.isAddress(address)) {
      allocations.push({ address, amount: amt.toString().replace(/,/g, '').trim(), label })
    }
  }

  // Vesting allocations
  for (let i = 1; i <= 3; i++) {
    if (vestingAddrs[`founder${i}`]) addAlloc(vestingAddrs[`founder${i}`], `FOUNDER_${i}_AMOUNT`, `Founder ${i}`)
  }
  for (let i = 1; i <= 11; i++) {
    if (vestingAddrs[`team${i}`]) addAlloc(vestingAddrs[`team${i}`], `TEAM_${i}_AMOUNT`, `Team ${i}`)
  }
  for (let i = 1; i <= 1; i++) {
    if (vestingAddrs[`investor${i}`]) addAlloc(vestingAddrs[`investor${i}`], `INVESTOR_${i}_AMOUNT`, `Investor ${i}`)
  }

  // Direct allocations
  for (let i = 1; i <= 5; i++) addAlloc(process.env[`ADVISOR_${i}_ADDRESS`], `ADVISOR_${i}_AMOUNT`, `Advisor ${i}`)
  for (let i = 1; i <= 3; i++) addAlloc(process.env[`MARKETING_${i}_ADDRESS`], `MARKETING_${i}_AMOUNT`, `Marketing ${i}`)
  addAlloc(process.env.DAO_TREASURY_ADDRESS, 'DAO_TREASURY_AMOUNT', 'DAO Treasury')
  addAlloc(process.env.COMMUNITY_REWARDS_ADDRESS, 'COMMUNITY_REWARDS_AMOUNT', 'Community Rewards')
  addAlloc(process.env.AIRDROP_ADDRESS, 'AIRDROP_AMOUNT', 'Airdrop Pool')
  addAlloc(process.env.LIQUIDITY_DEX_ADDRESS, 'LIQUIDITY_DEX_AMOUNT', 'Liquidity & DEX')

  console.log(`\n📋 Found ${allocations.length} recipients\n`)

  let totalMinted = 0n
  let successCount = 0

  for (const alloc of allocations) {
    const amountWei = ethers.parseEther(alloc.amount)
    totalMinted += amountWei
    
    process.stdout.write(`   Minting ${alloc.amount.padStart(12)} DWT → ${alloc.label.padEnd(25)}`)
    try {
      const tx = await dwtToken.mint(alloc.address, amountWei)
      await tx.wait()
      process.stdout.write(' ✅\n')
      successCount++
    } catch (e) {
      process.stdout.write(` ❌ ${e.reason || e.message.slice(0, 50)}\n`)
    }
    await sleep(300)
  }

  console.log(`\n💰 Total minted: ${ethers.formatEther(totalMinted)} DWT`)
  console.log(`✅ Success: ${successCount}/${allocations.length}`)
  console.log(`📦 Remaining supply: ${ethers.formatEther(ethers.parseEther('123000000') - totalMinted)} DWT\n`)

  // ═══════════════════════════════════════════════════════════════════
  // STEP 4: Deploy Airdrop Contract
  // ═══════════════════════════════════════════════════════════════════
  console.log('═'.repeat(64))
  console.log('STEP 4: Deploy Airdrop Contract')
  console.log('═'.repeat(64))
  
  const SimpleAirdrop = await ethers.getContractFactory('SimpleAirdrop')
  const simpleAirdrop = await SimpleAirdrop.deploy(dwtTokenAddr)
  await simpleAirdrop.waitForDeployment()
  const simpleAirdropAddr = await simpleAirdrop.getAddress()
  console.log(`✅ SimpleAirdrop: ${simpleAirdropAddr}\n`)

  // ═══════════════════════════════════════════════════════════════════
  // STEP 5: Transfer Ownership to Timelock (AFTER all mints!)
  // ═══════════════════════════════════════════════════════════════════
  console.log('═'.repeat(64))
  console.log('STEP 5: Transfer Ownership to Timelock')
  console.log('═'.repeat(64))
  
  const TIMELOCK_ADDR = '0x1A8AEe3E1B69959DCfF9E4A0bd0757e8451a49c4'
  console.log(`🏛️  Timelock: ${TIMELOCK_ADDR}`)
  
  console.log('\n🔄 Transferring ownership...')
  const tx = await dwtToken.transferOwnership(TIMELOCK_ADDR)
  await tx.wait()
  
  const newOwner = await dwtToken.owner()
  console.log(`✅ New owner: ${newOwner}`)
  console.log(`✅ Is Timelock: ${newOwner === TIMELOCK_ADDR}\n`)

  // ═══════════════════════════════════════════════════════════════════
  // SAVE DEPLOYMENT
  // ═══════════════════════════════════════════════════════════════════
  const fs = require('fs')
  const deploymentData = {
    network: network.name,
    chainId: network.config.chainId,
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    
    token: {
      address: dwtTokenAddr,
      owner: newOwner,
      ownerIsTimelock: newOwner === TIMELOCK_ADDR,
      totalMinted: ethers.formatEther(totalMinted),
      mintSuccessRate: `${successCount}/${allocations.length}`,
    },

    governance: {
      timelock: TIMELOCK_ADDR,
      governor: '0xD1779aD62De0bEeD47Fe60d481593BF5EA0f1c21',
    },

    vesting: vestingAddrs,
    airdrop: { contract: simpleAirdropAddr },
    allocations: allocations,
  }

  const outFile = `deployment-correct-${network.name}-${Date.now()}.json`
  fs.writeFileSync(outFile, JSON.stringify(deploymentData, null, 2))
  console.log(`💾 Saved: ${outFile}\n`)

  console.log('╔══════════════════════════════════════════════════════════════════╗')
  console.log('║   🎉 DEPLOYMENT COMPLETE WITH CORRECT SEQUENCE!                ║')
  console.log('╚══════════════════════════════════════════════════════════════════╝\n')
  
  console.log('Next steps:')
  console.log(`1. Fund airdrop: cast send ${dwtTokenAddr} "transfer(address,uint256)" ${simpleAirdropAddr} ${ethers.parseEther(process.env.AIRDROP_AMOUNT)} --rpc-url $BASE_SEPOLIA_RPC --private-key $AIRDROP_PRIVATE_KEY`)
  console.log(`2. Verify: npx hardhat verify --network ${network.name} ${dwtTokenAddr} "${deployer.address}"`)
  console.log(`3. Delegate: cast send ${dwtTokenAddr} "delegate(address)" ${deployer.address} --rpc-url $BASE_SEPOLIA_RPC --private-key $PRIVATE_KEY`)
  console.log(`\n🔗 https://sepolia.basescan.org/address/${dwtTokenAddr}\n`)
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\n❌ Failed:', err)
    process.exit(1)
  })
