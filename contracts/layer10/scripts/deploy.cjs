const { ethers } = require('hardhat')
const fs = require('fs')
const path = require('path')

async function main() {
  const [deployer] = await ethers.getSigners()
  console.log('🚀 Deploying Layer 10 with account:', deployer.address)

  let currentNonce = await deployer.getNonce('pending')
  console.log('Starting nonce:', currentNonce)

  const dwtTokenAddress =
    process.env.DWT_TOKEN_ADDRESS ||
    process.env.DWT_TOKEN ||
    process.env.BASE_DWT_TOKEN
  const feeRecipient =
    process.env.TREASURY_ADDRESS ||
    process.env.TREASURY ||
    process.env.BASE_TREASURY_VAULT ||
    deployer.address
  const priceOracleAddress =
    process.env.PRICE_ORACLE ||
    process.env.BASE_PRICE_ORACLE ||
    '0x4aed89F3076993D5B412789E63403C4Befd31DDD'
  const LAYER7_SECURITY_ADDRESS = process.env.LAYER7_SECURITY_ADDRESS
  if (!LAYER7_SECURITY_ADDRESS)
    throw new Error('LAYER7_SECURITY_ADDRESS not set in .env')

  if (!dwtTokenAddress) {
    throw new Error(
      '❌ DWT Token Address not found in .env (check DWT_TOKEN or BASE_DWT_TOKEN)',
    )
  }

  // 1. Deploy Mock USDC for Collateral
  console.log('📡 Deploying MockUSDC...')
  const MockERC20 = await ethers.getContractFactory(
    'contracts/mocks/MockContracts.sol:MockERC20',
  )
  const mockUsdc = await MockERC20.deploy('Mock USDC', 'mUSDC', 6, {
    nonce: currentNonce++,
  })
  await mockUsdc.waitForDeployment()
  const usdcAddress = await mockUsdc.getAddress()
  console.log('✅ MockUSDC deployed at:', usdcAddress)

  // 2. Deploy DWTOracle
  console.log('📡 Deploying DWTOracle...')
  const DWTOracle = await ethers.getContractFactory(
    'contracts/layer10/DWTOracle.sol:DWTMockOracle',
  )
  const oracle = await DWTOracle.deploy(
    ethers.parseUnits('5.0', 18),
    LAYER7_SECURITY_ADDRESS,
    { nonce: currentNonce++ },
  )
  await oracle.waitForDeployment()
  const oracleAddress = await oracle.getAddress()
  console.log('✅ DWTOracle deployed at:', oracleAddress)

  // 3. Deploy DWTOptions
  console.log('📡 Deploying DWTOptions...')
  const DWTOptions = await ethers.getContractFactory('DWTOptions')
  const options = await DWTOptions.deploy(
    dwtTokenAddress,
    usdcAddress,
    oracleAddress,
    feeRecipient,
    LAYER7_SECURITY_ADDRESS,
    { nonce: currentNonce++ },
  )
  await options.waitForDeployment()
  console.log('✅ DWTOptions deployed at:', await options.getAddress())

  // 4. Deploy DWTPerpetuals
  console.log('📡 Deploying DWTPerpetuals...')
  const DWTPerpetuals = await ethers.getContractFactory('DWTPerpetuals')
  const perpetuals = await DWTPerpetuals.deploy(
    usdcAddress,
    oracleAddress,
    feeRecipient,
    LAYER7_SECURITY_ADDRESS,
    { nonce: currentNonce++ },
  )
  await perpetuals.waitForDeployment()
  console.log('✅ DWTPerpetuals deployed at:', await perpetuals.getAddress())

  // 5. Deploy DWTPredictionMarket
  console.log('📡 Deploying DWTPredictionMarket...')
  // DWTPredictionMarket takes (IERC20 _paymentToken)
  const DWTPredictionMarket = await ethers.getContractFactory(
    'DWTPredictionMarket',
  )
  const prediction = await DWTPredictionMarket.deploy(
    usdcAddress,
    feeRecipient,
    LAYER7_SECURITY_ADDRESS,
    { nonce: currentNonce++ },
  )
  await prediction.waitForDeployment()
  console.log(
    '✅ DWTPredictionMarket deployed at:',
    await prediction.getAddress(),
  )

  // 6. Deploy DWTYieldVault
  console.log('📡 Deploying DWTYieldVault...')
  // DWTYieldVault takes (IERC20 _asset, string memory _name, string memory _symbol)
  const DWTYieldVault = await ethers.getContractFactory('DWTYieldVault')
  const vault = await DWTYieldVault.deploy(
    dwtTokenAddress,
    feeRecipient,
    deployer.address,
    LAYER7_SECURITY_ADDRESS,
    { nonce: currentNonce++ },
  )
  await vault.waitForDeployment()
  console.log('✅ DWTYieldVault deployed at:', await vault.getAddress())

  console.log('\n🎉 Layer 10 Deployment Complete!')
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
