const { expect } = require('chai')
const { ethers } = require('hardhat')

describe('Layer 7 Protocol-Wide Security Integration', function () {
  let security
  let lending
  let launchpad
  let owner, user
  let dwt, usdc
  let dwtFeed, usdcFeed
  let nftMembership

  beforeEach(async function () {
    ;[owner, user] = await ethers.getSigners()

    // 1. Deploy Security Controller (Layer 7)
    const Security = await ethers.getContractFactory('Layer7Security')
    security = await Security.deploy(
      [owner.address], // signers
      1, // threshold
      100, // maxCalls
      ethers.parseEther('100'), // maxValue
      0, // kycLevel
    )
    await security.waitForDeployment()
    const securityAddr = await security.getAddress()

    // 2. Deploy Infrastructure
    const MockERC20 = await ethers.getContractFactory(
      'contracts/mocks/MockContracts.sol:MockERC20',
    )
    dwt = await MockERC20.deploy('DWallet Token', 'DWT', 18)
    usdc = await MockERC20.deploy('USD Coin', 'USDC', 6)
    await dwt.waitForDeployment()
    await usdc.waitForDeployment()

    const MockPriceFeed = await ethers.getContractFactory(
      'contracts/mocks/MockPriceFeed.sol:MockPriceFeed',
    )
    dwtFeed = await MockPriceFeed.deploy(8)
    usdcFeed = await MockPriceFeed.deploy(8)
    await dwtFeed.waitForDeployment()
    await usdcFeed.waitForDeployment()

    const NFTMembership = await ethers.getContractFactory(
      'contracts/layer9/NFTMembership.sol:NFTMembership',
    )
    nftMembership = await NFTMembership.deploy(
      await dwt.getAddress(),
      securityAddr,
    )
    await nftMembership.waitForDeployment()

    // 3. Deploy Gated Protocol Contracts (Layer 9 examples)
    const Lending = await ethers.getContractFactory(
      'contracts/layer9/LendingMarket.sol:LendingMarket',
    )
    lending = await Lending.deploy(
      await dwt.getAddress(),
      await usdc.getAddress(),
      await dwtFeed.getAddress(),
      await usdcFeed.getAddress(),
      18,
      6,
      securityAddr,
    )
    await lending.waitForDeployment()

    const Launchpad = await ethers.getContractFactory(
      'contracts/layer9/Launchpad.sol:Launchpad',
    )
    launchpad = await Launchpad.deploy(
      await dwt.getAddress(),
      await nftMembership.getAddress(),
      securityAddr,
    )
    await launchpad.waitForDeployment()

    // Setup some balances
    await dwt.mint(user.address, ethers.parseEther('1000'))
    await usdc.mint(user.address, ethers.parseUnits('1000', 6))
    await dwt
      .connect(user)
      .approve(await lending.getAddress(), ethers.MaxUint256)
    await usdc
      .connect(user)
      .approve(await lending.getAddress(), ethers.MaxUint256)
  })

  it('Should allow actions when protocol is not paused', async function () {
    // Prepare USDC for user
    await usdc.mint(user.address, ethers.parseUnits('1000', 6))
    await usdc
      .connect(user)
      .approve(await lending.getAddress(), ethers.MaxUint256)

    // Action: Deposit
    await expect(
      lending.connect(user).deposit(ethers.parseUnits('100', 6)),
    ).to.emit(lending, 'Deposited')

    expect(await lending.totalDeposits()).to.equal(ethers.parseUnits('100', 6))
  })

  it('Should block actions protocol-wide when circuit breaker is active (Paused)', async function () {
    // Activate pause on Layer 7
    await security.pause()
    expect(await security.paused()).to.equal(true)

    // Attempt lending deposit - should revert
    await expect(
      lending.connect(user).deposit(ethers.parseUnits('100', 6)),
    ).to.be.revertedWithCustomError(lending, 'SecurityLayerPaused')

    // Attempt launchpad action - should revert
    const now = (await ethers.provider.getBlock('latest')).timestamp
    await expect(
      launchpad.createIDO(
        await dwt.getAddress(),
        await usdc.getAddress(),
        ethers.parseUnits('1', 18),
        ethers.parseUnits('1000', 6),
        ethers.parseUnits('100', 6),
        ethers.parseUnits('10', 6),
        ethers.parseUnits('100', 6),
        0,
        now + 3600,
        now + 7200,
        now + 10800,
        now + 14400,
        ethers.parseUnits('0.2', 18),
        3600 * 24 * 30,
      ),
    ).to.be.revertedWithCustomError(launchpad, 'SecurityLayerPaused')

    // Admin actions even on peripheral contracts should revert if gated
    await expect(
      lending.setLTV(ethers.parseUnits('0.8', 18)),
    ).to.be.revertedWithCustomError(lending, 'SecurityLayerPaused')
  })

  it('Should resume protocol operations after unpausing', async function () {
    await security.pause()
    await expect(
      lending.connect(user).deposit(ethers.parseUnits('100', 6)),
    ).to.be.revertedWithCustomError(lending, 'SecurityLayerPaused')

    // Unpause on Layer 7 - requires multisig (self-call)
    const data = security.interface.encodeFunctionData('unpause')
    await security.submitTransaction(await security.getAddress(), 0, data)
    await security.confirmTransaction(0)
    await security.executeTransaction(0)

    expect(await security.paused()).to.equal(false)

    // Action should now succeed
    await expect(
      lending.connect(user).deposit(ethers.parseUnits('100', 6)),
    ).to.emit(lending, 'Deposited')
  })

  it('Should verify Layer 10 contracts (Options/Vault) also respect pause', async function () {
    // Deploy Layer 10 components
    const DWTOracle = await ethers.getContractFactory(
      'contracts/layer10/DWTOracle.sol:DWTMockOracle',
    )
    const oracle = await DWTOracle.deploy(
      ethers.parseUnits('5.0', 18),
      await security.getAddress(),
    )
    await oracle.waitForDeployment()

    const DWTOptions = await ethers.getContractFactory('DWTOptions')
    const options = await DWTOptions.deploy(
      await dwt.getAddress(),
      await usdc.getAddress(),
      await oracle.getAddress(),
      owner.address,
      await security.getAddress(),
    )
    await options.waitForDeployment()

    // Prepare for writing options
    await usdc.mint(user.address, ethers.parseUnits('2000', 6))
    await usdc
      .connect(user)
      .approve(await options.getAddress(), ethers.MaxUint256)

    // Pause
    await security.pause()

    // Attempt option writing
    const now = (await ethers.provider.getBlock('latest')).timestamp
    // writeOption(type, strike, expiry, amount, premium)
    await expect(
      options
        .connect(user)
        .writeOption(
          0,
          ethers.parseUnits('10', 18),
          now + 3600,
          ethers.parseUnits('1', 18),
          ethers.parseUnits('5', 6),
        ),
    ).to.be.revertedWithCustomError(options, 'SecurityLayerPaused')
  })
})
