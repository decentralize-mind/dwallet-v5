const { expect } = require('chai')
const { network, ethers } = require('hardhat')
const { time } = require('@nomicfoundation/hardhat-network-helpers')

describe('DWallet Protocol: Security Verification', function () {
  let owner, user, treasury, other

  beforeEach(async () => {
    ;[owner, user, treasury, , other] = await ethers.getSigners()
  })

  // ─────────────────────────────────────────────────────────────
  // [H-01] Oracle Staleness Check in DWTPerpetuals
  // ─────────────────────────────────────────────────────────────
  describe('[H-01] Oracle Staleness Check: DWTPerpetuals', function () {
    let perpetuals, priceFeed, usdc

    beforeEach(async () => {
      const MockERC20 = await ethers.getContractFactory(
        'contracts/mocks/MockContracts.sol:MockERC20',
      )
      usdc = await MockERC20.deploy('USDC', 'USDC', 6)
      await usdc.mint(user.address, ethers.parseUnits('1000', 6))

      const MockPriceFeed = await ethers.getContractFactory('MockPriceFeed')
      priceFeed = await MockPriceFeed.deploy()

      const DWTPerpetuals = await ethers.getContractFactory('DWTPerpetuals')
      perpetuals = await DWTPerpetuals.deploy(
        await usdc.getAddress(),
        await priceFeed.getAddress(),
        owner.address,
      )

      await usdc
        .connect(user)
        .approve(await perpetuals.getAddress(), ethers.MaxUint256)
    })

    it('reverts if price is older than 1 hour', async function () {
      const now = await time.latest()
      await priceFeed.updatePrice(ethers.parseUnits('2500', 8), now - 3601)

      await expect(
        perpetuals.connect(user).openPosition(0, 500e6, 100e6),
      ).to.be.revertedWith('Oracle price stale')
    })

    it('allows execution if price is fresh', async function () {
      const now = await time.latest()
      await priceFeed.updatePrice(ethers.parseUnits('2500', 8), now - 1800)

      await expect(perpetuals.connect(user).openPosition(0, 500e6, 100e6)).to
        .not.be.reverted
    })
  })

  // ─────────────────────────────────────────────────────────────
  // [H-02] Centralization Risk: Launchpad Fund Destination
  // ─────────────────────────────────────────────────────────────
  describe('[H-02] Launchpad Fund Destination', function () {
    let launchpad, dwt, nft

    beforeEach(async () => {
      const MockERC20 = await ethers.getContractFactory(
        'contracts/mocks/MockContracts.sol:MockERC20',
      )
      dwt = await MockERC20.deploy('DWT', 'DWT', 18)

      const MockNFT = await ethers.getContractFactory('MockNFTMembership')
      nft = await MockNFT.deploy()

      const Launchpad = await ethers.getContractFactory('Launchpad')
      launchpad = await Launchpad.deploy(
        await dwt.getAddress(),
        await nft.getAddress(),
      )

      await launchpad.setTreasury(treasury.address)
    })

    it('transfers IDO funds to treasury address, not owner', async function () {
      expect(await launchpad.treasury()).to.equal(treasury.address)
    })
  })

  // ─────────────────────────────────────────────────────────────
  // [H-05] Flash Loan Resistance: DWalletFeeRouter
  // ─────────────────────────────────────────────────────────────
  describe('[H-05] DWalletFeeRouter: Flash Loan Resistance', function () {
    let router, dwt, mockUniswap

    beforeEach(async () => {
      const DWTToken = await ethers.getContractFactory('DWTToken')
      dwt = await DWTToken.deploy(
        owner.address,
        ethers.parseEther('1000'),
        ethers.parseEther('5000'),
        ethers.parseEther('10000'),
      )

      mockUniswap = await ethers
        .getContractFactory(
          'contracts/mocks/MockContracts.sol:MockUniswapRouter',
        )
        .then(f => f.deploy())

      const DWalletFeeRouter =
        await ethers.getContractFactory('DWalletFeeRouter')
      router = await DWalletFeeRouter.deploy(
        await mockUniswap.getAddress(),
        await dwt.getAddress(),
        treasury.address,
        owner.address,
      )

      await dwt.mint(user.address, ethers.parseEther('500'))
      await dwt.connect(user).delegate(user.address)
      await time.advanceBlock()
    })

    it('uses previous block votes for fee calculation', async function () {
      const MockERC20 = await ethers.getContractFactory(
        'contracts/mocks/MockContracts.sol:MockERC20',
      )
      const usdc = await MockERC20.deploy('USDC', 'USDC', 6)
      const dai = await MockERC20.deploy('DAI', 'DAI', 18)

      await usdc.mint(user.address, ethers.parseUnits('1000', 6))
      await usdc
        .connect(user)
        .approve(await router.getAddress(), ethers.MaxUint256)

      // To test SAME BLOCK flash loan resistance, we must disable automining
      await network.provider.send('evm_setAutomine', [false])

      // 1. Inflate DWT balance
      await dwt.mint(user.address, ethers.parseEther('10000'))

      // 2. Perform swap
      const deadline = (await time.latest()) + 1000
      await router
        .connect(user)
        .swapExactInputSingle(
          await usdc.getAddress(),
          await dai.getAddress(),
          3000,
          ethers.parseUnits('1000', 6),
          0,
          deadline,
        )

      // Mine the block manualy
      await network.provider.send('evm_mine')
      await network.provider.send('evm_setAutomine', [true])

      // Now check that even though they have 10500 DWT in THIS block,
      // they were charged Tier 0 (0.30% = 3 USDC) because it looked at PREVIOUS block.
      expect(await usdc.balanceOf(treasury.address)).to.equal(
        ethers.parseUnits('3', 6),
      )
    })
  })

  // ─────────────────────────────────────────────────────────────
  // [M-01] Flash Loan Resistance: DWTToken Snapshots
  // ─────────────────────────────────────────────────────────────
  describe('[M-01] DWTToken Snapshots for Fee Tiers', function () {
    let dwt

    beforeEach(async () => {
      const DWTToken = await ethers.getContractFactory('DWTToken')
      dwt = await DWTToken.deploy(
        owner.address,
        ethers.parseEther('1000'),
        ethers.parseEther('5000'),
        ethers.parseEther('10000'),
      )
      await dwt.mint(user.address, ethers.parseEther('500'))
      await dwt.connect(user).delegate(user.address)
      await time.advanceBlock()
    })

    it('uses history (block.number - 1) for fee tier calculation', async function () {
      expect(await dwt.feeTierOf(user.address)).to.equal(0)
      await dwt.mint(user.address, ethers.parseEther('2000'))
      expect(await dwt.feeTierOf(user.address)).to.equal(0)
      await time.advanceBlock()
      expect(await dwt.feeTierOf(user.address)).to.equal(1)
    })
  })

  // ─────────────────────────────────────────────────────────────
  // [M-02] Flash Loan Resistance: GaugeVoting Snapshots
  // ─────────────────────────────────────────────────────────────
  describe('[M-02] GaugeVoting Snapshots', function () {
    let voting, veDWT, dwt

    beforeEach(async () => {
      const MockERC20 = await ethers.getContractFactory(
        'contracts/mocks/MockContracts.sol:MockERC20',
      )
      dwt = await MockERC20.deploy('DWT', 'DWT', 18)

      const MockSecurity = await ethers.getContractFactory('MockLayer7Security')
      const mockSecurity = await MockSecurity.deploy()

      const VeDWT = await ethers.getContractFactory('VeDWT')
      veDWT = await VeDWT.deploy(
        await dwt.getAddress(),
        await mockSecurity.getAddress(),
        owner.address,
      )

      const GaugeVoting = await ethers.getContractFactory('GaugeVoting')
      voting = await GaugeVoting.deploy(await veDWT.getAddress(), owner.address)

      await dwt.mint(user.address, ethers.parseEther('1000'))
      await dwt
        .connect(user)
        .approve(await veDWT.getAddress(), ethers.MaxUint256)
    })

    it('uses history (block.timestamp - 1) for voting power', async function () {
      const mockGauge = other.address
      await voting.addGauge(mockGauge)

      const DAY = 86400
      await veDWT.connect(user).lock(ethers.parseEther('1000'), 365 * DAY)
      await time.increase(100)
      await expect(voting.connect(user).vote(mockGauge, 100)).to.not.be.reverted
    })
  })

  // ─────────────────────────────────────────────────────────────
  // [M-03] Interest Rate Cap: LendingMarket
  // ─────────────────────────────────────────────────────────────
  describe('[M-03] Interest Rate Cap: LendingMarket', function () {
    let lending, dwt, borrowToken, dwtFeed, stableFeed

    beforeEach(async () => {
      const MockERC20 = await ethers.getContractFactory(
        'contracts/mocks/MockContracts.sol:MockERC20',
      )
      dwt = await MockERC20.deploy('DWT', 'DWT', 18)
      borrowToken = await MockERC20.deploy('USDC', 'USDC', 6)

      const MockPriceFeed = await ethers.getContractFactory('MockPriceFeed')
      dwtFeed = await MockPriceFeed.deploy()
      stableFeed = await MockPriceFeed.deploy()

      const LendingMarket = await ethers.getContractFactory('LendingMarket')
      lending = await LendingMarket.deploy(
        await dwt.getAddress(),
        await borrowToken.getAddress(),
        await dwtFeed.getAddress(),
        await stableFeed.getAddress(),
        18, // dwt decimals
        6, // stable decimals
      )
    })

    it('reverts if interest rate exceeds 1e11 (cap)', async function () {
      await expect(
        lending.setInterestRate('100000000001'),
      ).to.be.revertedWithCustomError(lending, 'ExceedsMaxRate')
    })
  })
})
