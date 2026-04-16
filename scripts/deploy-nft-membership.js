const hre = require('hardhat')
const { ethers } = require('hardhat')

async function main() {
  console.log('🚀 Deploying NFTMembership Contract...')
  console.log('='.repeat(60))

  // Get deployer account
  const [deployer] = await ethers.getSigners()
  console.log(`\n📍 Deployer: ${deployer.address}`)
  
  // Check balance
  const balance = await ethers.provider.getBalance(deployer.address)
  console.log(`💰 Balance: ${ethers.formatEther(balance)} ETH`)

  // Get network info
  const network = await ethers.provider.getNetwork()
  console.log(`🌐 Network: ${network.name} (Chain ID: ${network.chainId})`)

  // Verify we're not on mainnet by accident
  if (network.chainId === 1n) {
    console.log('\n❌ ERROR: This script is configured for testnet deployment only!')
    console.log('For mainnet deployment, use a separate script with additional checks.')
    process.exit(1)
  }

  console.log('\n' + '='.repeat(60))
  console.log('Step 1: Deploying DWT Token (if needed)...')
  console.log('='.repeat(60))

  // Check if DWT token address is provided
  let dwtTokenAddress = process.env.DWT_TOKEN_ADDRESS
  
  if (!dwtTokenAddress) {
    console.log('\n⚠️  No DWT_TOKEN_ADDRESS provided. Deploying mock token...')
    const MockToken = await ethers.getContractFactory('MockERC20')
    const dwtToken = await MockToken.deploy('DWT Token', 'DWT', 18)
    await dwtToken.waitForDeployment()
    dwtTokenAddress = await dwtToken.getAddress()
    console.log(`✅ Mock DWT Token deployed: ${dwtTokenAddress}`)
    
    // Mint some tokens to deployer for testing
    await dwtToken.mint(deployer.address, ethers.parseEther('1000000'))
    console.log('💰 Minted 1,000,000 DWT to deployer')
  } else {
    console.log(`✅ Using existing DWT Token: ${dwtTokenAddress}`)
  }

  console.log('\n' + '='.repeat(60))
  console.log('Step 2: Deploying Layer7 Security Controller...')
  console.log('='.repeat(60))

  let securityControllerAddress = process.env.SECURITY_CONTROLLER_ADDRESS

  if (!securityControllerAddress) {
    console.log('\n⚠️  No SECURITY_CONTROLLER_ADDRESS provided. Deploying new security controller...')
    
    const Layer7Security = await ethers.getContractFactory('Layer7Security')
    const securityController = await Layer7Security.deploy(
      [deployer.address], // Signers
      1,                  // Required signers
      100,                // Max signers
      ethers.parseEther('100'), // Daily limit
      0                   // Timelock
    )
    await securityController.waitForDeployment()
    securityControllerAddress = await securityController.getAddress()
    console.log(`✅ Security Controller deployed: ${securityControllerAddress}`)
  } else {
    console.log(`✅ Using existing Security Controller: ${securityControllerAddress}`)
  }

  console.log('\n' + '='.repeat(60))
  console.log('Step 3: Deploying NFTMembership Contract...')
  console.log('='.repeat(60))

  const NFTMembership = await ethers.getContractFactory('contracts/layer9/NFTMembership.sol:NFTMembership')
  
  console.log('\n📋 Deployment Parameters:')
  console.log(`   DWT Token: ${dwtTokenAddress}`)
  console.log(`   Security Controller: ${securityControllerAddress}`)
  console.log(`   Deployer: ${deployer.address}`)

  const nftMembership = await NFTMembership.deploy(
    dwtTokenAddress,
    securityControllerAddress
  )
  await nftMembership.waitForDeployment()
  
  const nftAddress = await nftMembership.getAddress()
  console.log(`\n✅ NFTMembership deployed: ${nftAddress}`)

  // Verify deployment
  console.log('\n' + '='.repeat(60))
  console.log('Step 4: Verifying Deployment...')
  console.log('='.repeat(60))

  const name = await nftMembership.name()
  const symbol = await nftMembership.symbol()
  const tierCount = await nftMembership.TIER_COUNT()
  const owner = await nftMembership.owner()

  console.log(`\n✓ Contract Name: ${name}`)
  console.log(`✓ Contract Symbol: ${symbol}`)
  console.log(`✓ Tier Count: ${tierCount}`)
  console.log(`✓ Owner: ${owner}`)

  // Verify tier configurations
  console.log('\n📊 Default Tier Configurations:')
  const tiers = ['Bronze', 'Silver', 'Gold', 'Platinum']
  for (let i = 0; i < 4; i++) {
    const config = await nftMembership.tierConfigs(i)
    console.log(`\n   ${tiers[i]} (Tier ${i}):`)
    console.log(`      ETH Price: ${ethers.formatEther(config.ethPrice)} ETH`)
    console.log(`      DWT Price: ${ethers.formatEther(config.dwtPrice)} DWT`)
    console.log(`      DWT Hold Req: ${ethers.formatEther(config.dwtHoldRequirement)} DWT`)
    console.log(`      Max Supply: ${config.maxSupply === 0n ? 'Unlimited' : config.maxSupply}`)
    console.log(`      Duration: ${config.durationSeconds / (24n * 3600n)} days`)
    console.log(`      Soulbound: ${config.soulbound}`)
    console.log(`      Enabled: ${config.enabled}`)
  }

  // Save deployment info
  const deploymentInfo = {
    network: network.name,
    chainId: network.chainId.toString(),
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      NFTMembership: nftAddress,
      DWTToken: dwtTokenAddress,
      SecurityController: securityControllerAddress
    },
    verification: {
      name,
      symbol,
      owner,
      tierCount: Number(tierCount)
    }
  }

  // Save to file
  const fs = require('fs')
  const path = require('path')
  const outputFile = path.join(__dirname, `../deployment-nft-${network.name}-${Date.now()}.json`)
  
  fs.writeFileSync(outputFile, JSON.stringify(deploymentInfo, null, 2))
  console.log(`\n💾 Deployment info saved to: ${outputFile}`)

  console.log('\n' + '='.repeat(60))
  console.log('Step 5: Next Steps...')
  console.log('='.repeat(60))

  console.log(`
📝 IMPORTANT: Add to your .env file:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
VITE_NFT_MEMBERSHIP_ADDRESS=${nftAddress}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔍 Verify contract on block explorer:
   npx hardhat verify --network ${network.name} \\
     ${nftAddress} \\
     ${dwtTokenAddress} \\
     ${securityControllerAddress}

🧪 Test the deployment:
   1. Mint a Bronze pass: 0.05 ETH
   2. Check your tier status
   3. Try upgrading to Silver
   4. Test access control with other contracts

📊 Monitor events:
   - PassMinted
   - PassUpgraded
   - HighestTierUpdated
   - FreeMintWhitelistUpdated

⚠️  Security Checklist:
   ✓ Contract ownership transferred to multisig (recommended)
   ✓ Security controller configured properly
   ✓ Tier prices reviewed and confirmed
   ✓ Supply caps set appropriately
   ✓ Pause mechanism tested
`)

  console.log('='.repeat(60))
  console.log('✅ Deployment Complete!')
  console.log('='.repeat(60))
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Deployment failed:')
    console.error(error)
    process.exit(1)
  })
