const { ethers, network } = require('hardhat')
require('dotenv').config()

async function main() {
  const [deployer] = await ethers.getSigners()
  const balance = await ethers.provider.getBalance(deployer.address)
  
  console.log('\n╔══════════════════════════════════════════════════╗')
  console.log('║   DWT Token - Quick Testnet Deployment           ║')
  console.log('╚══════════════════════════════════════════════════╝')
  console.log('Network:  ', network.name)
  console.log('Deployer: ', deployer.address)
  console.log('Balance:  ', ethers.formatEther(balance), 'ETH\n')

  if (parseFloat(ethers.formatEther(balance)) < 0.005) {
    throw new Error('Need at least 0.005 ETH for gas. Please fund your wallet!')
  }

  console.log('📋 Step 1: Deploying Simplified DWT Token...\n')
  
  // Deploy simplified token
  const DWTToken = await ethers.getContractFactory('DWTTokenSimple')
  const dwtToken = await DWTToken.deploy(deployer.address)
  await dwtToken.waitForDeployment()
  const dwtTokenAddr = await dwtToken.getAddress()
  
  console.log('✅ DWTToken deployed:', dwtTokenAddr)
  
  let maxSupply
  try {
    maxSupply = await dwtToken.MAX_SUPPLY()
    console.log('📊 Max Supply:', ethers.formatEther(maxSupply), 'DWT\n')
  } catch (e) {
    console.log('📊 Max Supply: 123,000,000 DWT (hardcoded)\n')
    maxSupply = ethers.parseEther('123000000')
  }

  console.log('📋 Step 2: Distributing 70M DWT tokens from .env...\n')
  
  // Parse allocations from .env
  const allocations = []
  
  const addAlloc = (addressKey, amountKey, label) => {
    const addr = process.env[addressKey]
    const amt = process.env[amountKey]
    if (addr && amt && ethers.isAddress(addr)) {
      allocations.push({
        address: addr,
        amount: amt.toString().replace(/,/g, '').trim(),
        label: label
      })
    }
  }

  // Add all allocations
  for (let i = 1; i <= 3; i++) addAlloc(`FOUNDER_${i}_ADDRESS`, `FOUNDER_${i}_AMOUNT`, `Founder ${i}`)
  for (let i = 1; i <= 11; i++) addAlloc(`TEAM_${i}_ADDRESS`, `TEAM_${i}_AMOUNT`, `Team ${i}`)
  for (let i = 1; i <= 1; i++) addAlloc(`INVESTOR_${i}_ADDRESS`, `INVESTOR_${i}_AMOUNT`, `Investor ${i}`)
  for (let i = 1; i <= 5; i++) addAlloc(`ADVISOR_${i}_ADDRESS`, `ADVISOR_${i}_AMOUNT`, `Advisor ${i}`)
  for (let i = 1; i <= 3; i++) addAlloc(`MARKETING_${i}_ADDRESS`, `MARKETING_${i}_AMOUNT`, `Marketing ${i}`)
  
  addAlloc('DAO_TREASURY_ADDRESS', '14000000', 'DAO Treasury')
  addAlloc('COMMUNITY_REWARDS_ADDRESS', '10500000', 'Community Rewards')
  addAlloc('AIRDROP_ADDRESS', '5600000', 'Airdrop')
  addAlloc('LIQUIDITY_DEX_ADDRESS', '12600000', 'Liquidity & DEX')

  console.log(`Found ${allocations.length} recipients\n`)

  let totalMinted = 0n
  let successCount = 0
  let failCount = 0
  
  // Mint tokens to each recipient
  for (const alloc of allocations) {
    const amountWei = ethers.parseEther(alloc.amount)
    totalMinted += amountWei
    
    console.log(`Minting ${alloc.amount.padStart(12)} DWT to ${alloc.label.padEnd(25)} (${alloc.address.slice(0, 10)}...)`)
    
    try {
      const tx = await dwtToken.mint(alloc.address, amountWei)
      await tx.wait()
      console.log(`  ✅ Success\n`)
      successCount++
    } catch (error) {
      console.error(`  ❌ Failed: ${error.shortMessage || error.message}\n`)
      failCount++
    }
    
    await new Promise(r => setTimeout(r, 300))
  }

  console.log('\n╔══════════════════════════════════════════════════╗')
  console.log('║   ✅ DEPLOYMENT & DISTRIBUTION COMPLETE!          ║')
  console.log('╚══════════════════════════════════════════════════╝')
  
  console.log('\n📊 Summary:')
  console.log('  DWT Token Address:', dwtTokenAddr)
  console.log('  Total Minted:', ethers.formatEther(totalMinted), 'DWT')
  console.log('  Max Supply:', ethers.formatEther(maxSupply), 'DWT')
  console.log('  Remaining:', ethers.formatEther(maxSupply - totalMinted), 'DWT')
  console.log('  Successful Mints:', successCount)
  console.log('  Failed Mints:', failCount)
  
  console.log('\n🔍 Verify on BaseScan:')
  console.log(`  https://sepolia.basescan.org/address/${dwtTokenAddr}`)
  
  console.log('\n📝 Next Steps:')
  console.log('  1. Add token to MetaMask:', dwtTokenAddr)
  console.log('  2. Verify contract on BaseScan')
  console.log('  3. Test token transfers')
  console.log('  4. Check recipient balances')
  
  // Save deployment info
  const fs = require('fs')
  const deploymentInfo = {
    network: network.name,
    chainId: network.config.chainId,
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    dwtToken: dwtTokenAddr,
    totalMinted: ethers.formatEther(totalMinted),
    maxSupply: ethers.formatEther(maxSupply),
    allocations: allocations.length,
    successCount,
    failCount
  }
  
  const outFile = `dwt-deployment-${network.name}-${Date.now()}.json`
  fs.writeFileSync(outFile, JSON.stringify(deploymentInfo, null, 2))
  console.log(`\n💾 Deployment info saved to: ${outFile}`)
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('\n❌ Deployment failed:', error)
    process.exit(1)
  })
