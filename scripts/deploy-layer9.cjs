const { ethers } = require('hardhat')
require('dotenv').config()

async function main() {
  const [deployer] = await ethers.getSigners()
  let currentNonce = await deployer.getNonce('pending')
  console.log('Deploying Layer 9 Ecosystem with:', deployer.address)
  console.log('Starting nonce:', currentNonce)

  const DWT_TOKEN =
    process.env.DWT_TOKEN || process.env.DWT_TOKEN_ADDRESS || deployer.address
  const USDC_TOKEN = process.env.USDC_TOKEN || deployer.address
  const LAYER7_SECURITY_ADDRESS = process.env.LAYER7_SECURITY_ADDRESS
  if (!LAYER7_SECURITY_ADDRESS)
    throw new Error('LAYER7_SECURITY_ADDRESS not set in .env')

  // 0. Deploy NFTMembership (New)
  console.log('\n0/5  Deploying NFTMembership...')
  const NFTFactory = await ethers.getContractFactory(
    'contracts/layer9/NFTMembership.sol:NFTMembership',
  )
  const nftMembership = await NFTFactory.deploy(
    DWT_TOKEN,
    LAYER7_SECURITY_ADDRESS,
    { nonce: currentNonce++ },
  )
  await nftMembership.waitForDeployment()
  const NFT_MEMBERSHIP = await nftMembership.getAddress()
  console.log('     NFTMembership:', NFT_MEMBERSHIP)

  // 1. MockPriceFeeds
  console.log('\n1/5  Deploying MockPriceFeeds...')
  const MockPriceFeed = await ethers.getContractFactory(
    'contracts/mocks/MockPriceFeed.sol:MockPriceFeed',
  )

  console.log('     Deploying DWT Price Feed...')
  const dwtFeed = await MockPriceFeed.deploy(8, { nonce: currentNonce++ })
  await dwtFeed.waitForDeployment()
  const dwtFeedAddr = await dwtFeed.getAddress()
  const tx1 = await dwtFeed.updatePrice(
    5000000,
    Math.floor(Date.now() / 1000),
    { nonce: currentNonce++ },
  )
  await tx1.wait()
  console.log('     DWT Price Feed:', dwtFeedAddr)

  console.log('     Deploying USDC Price Feed...')
  const usdcFeed = await MockPriceFeed.deploy(8, { nonce: currentNonce++ })
  await usdcFeed.waitForDeployment()
  const usdcFeedAddr = await usdcFeed.getAddress()
  const tx2 = await usdcFeed.updatePrice(
    100000000,
    Math.floor(Date.now() / 1000),
    { nonce: currentNonce++ },
  )
  await tx2.wait()
  console.log('     USDC Price Feed:', usdcFeedAddr)

  // 2. LendingMarket
  console.log('2/5  Deploying LendingMarket...')
  const Lending = await ethers.getContractFactory(
    'contracts/layer9/LendingMarket.sol:LendingMarket',
  )
  const lending = await Lending.deploy(
    DWT_TOKEN,
    USDC_TOKEN,
    dwtFeedAddr,
    usdcFeedAddr,
    18, // DWT decimals
    6, // USDC decimals
    LAYER7_SECURITY_ADDRESS,
    { nonce: currentNonce++ },
  )
  await lending.waitForDeployment()
  const lendingAddr = await lending.getAddress()
  console.log('     LendingMarket:', lendingAddr)

  // 4. Launchpad
  console.log('4/5  Deploying Launchpad...')
  const Launchpad = await ethers.getContractFactory(
    'contracts/layer9/Launchpad.sol:Launchpad',
  )
  const launchpad = await Launchpad.deploy(
    DWT_TOKEN,
    NFT_MEMBERSHIP,
    LAYER7_SECURITY_ADDRESS,
    { nonce: currentNonce++ },
  )
  await launchpad.waitForDeployment()
  const launchpadAddr = await launchpad.getAddress()
  console.log('     Launchpad:', launchpadAddr)

  // 5. AffiliateRewards
  console.log('5/5  Deploying AffiliateRewards...')
  const Affiliate = await ethers.getContractFactory(
    'contracts/layer9/AffiliateRewards.sol:AffiliateRewards',
  )
  const affiliate = await Affiliate.deploy(
    NFT_MEMBERSHIP,
    LAYER7_SECURITY_ADDRESS,
    { nonce: currentNonce++ },
  )
  await affiliate.waitForDeployment()
  const affiliateAddr = await affiliate.getAddress()
  console.log('     AffiliateRewards:', affiliateAddr)

  console.log('\n════════════════════════════════════════════════════')
  console.log('  Layer 9 — Ecosystem — Deployment Complete')
  console.log('════════════════════════════════════════════════════')
  console.log('  NFTMembership    :', NFT_MEMBERSHIP)
  console.log('  LendingMarket    :', lendingAddr)
  console.log('  Launchpad        :', launchpadAddr)
  console.log('  AffiliateRewards :', affiliateAddr)
  console.log('════════════════════════════════════════════════════\n')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
