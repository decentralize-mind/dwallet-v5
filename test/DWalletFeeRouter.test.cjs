const { expect } = require('chai')
const { network, ethers } = require('hardhat')
const { time } = require('@nomicfoundation/hardhat-network-helpers')

describe('DWalletFeeRouter: Comprehensive Suite', function () {
  let owner, user, treasury, router, dwt, mockUniswap, usdc, dai

  beforeEach(async () => {
    ;[owner, user, treasury] = await ethers.getSigners()

    // 1. Deploy DWT Token with tiers
    const DWTToken = await ethers.getContractFactory('DWTToken')
    dwt = await DWTToken.deploy(
      owner.address,
      ethers.parseUnits('1000', 18), // T1
      ethers.parseUnits('5000', 18), // T2
      ethers.parseUnits('10000', 18), // T3
    )

    // 2. Deploy Mock Uniswap
    mockUniswap = await ethers
      .getContractFactory('contracts/mocks/MockContracts.sol:MockUniswapRouter')
      .then(f => f.deploy())

    // 3. Deploy Fee Router
    const DWalletFeeRouter = await ethers.getContractFactory('DWalletFeeRouter')
    router = await DWalletFeeRouter.deploy(
      await mockUniswap.getAddress(),
      await dwt.getAddress(),
      treasury.address,
      owner.address,
    )

    // 4. Deploy Mock Tokens
    const MockERC20 = await ethers.getContractFactory(
      'contracts/mocks/MockContracts.sol:MockERC20',
    )
    usdc = await MockERC20.deploy('USDC', 'USDC', 6)
    dai = await MockERC20.deploy('DAI', 'DAI', 18)

    await usdc.mint(user.address, ethers.parseUnits('10000', 6))
    await usdc
      .connect(user)
      .approve(await router.getAddress(), ethers.MaxUint256)

    // Setup DWT delegation for user (needed for getPastVotes)
    await dwt.mint(user.address, ethers.parseUnits('500', 18))
    await dwt.connect(user).delegate(user.address)
    await time.advanceBlock()
  })

  describe('Fee Tiers & Flash Loan Resistance', function () {
    it('charges Tier 0 (30 bps) for user with < 1000 DWT', async function () {
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
      // 0.3% of 1000 = 3
      expect(await usdc.balanceOf(treasury.address)).to.equal(
        ethers.parseUnits('3', 6),
      )
    })

    it('stays at Tier 0 if balance inflated in the same block (Flash Loan Resistance)', async function () {
      await network.provider.send('evm_setAutomine', [false])

      // Flash loan 10000 DWT
      await dwt.mint(user.address, ethers.parseUnits('10000', 18))

      // Should be Tier 3 (5 bps) based on balance, but Tier 0 (30 bps) based on snapshot
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

      await network.provider.send('evm_mine')
      await network.provider.send('evm_setAutomine', [true])

      // 0.3% of 1000 = 3 (Even with 10k token balance)
      expect(await usdc.balanceOf(treasury.address)).to.equal(
        ethers.parseUnits('3', 6),
      )
    })

    it('moves to Tier 3 (5 bps) after block advances with > 10000 DWT', async function () {
      await dwt.mint(user.address, ethers.parseUnits('10000', 18))
      await time.advanceBlock()

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

      // 5 bps of 1000 = 0.5
      expect(await usdc.balanceOf(treasury.address)).to.equal(
        ethers.parseUnits('0.5', 6),
      )
    })
  })

  describe('Admin Actions', function () {
    it('allows owner to set treasury', async function () {
      await router.connect(owner).setTreasury(owner.address)
      expect(await router.treasury()).to.equal(owner.address)
    })

    it('allows owner to rescue tokens', async function () {
      await usdc.mint(await router.getAddress(), 100)
      await router.connect(owner).rescueTokens(await usdc.getAddress(), 100)
      expect(await usdc.balanceOf(owner.address)).to.equal(100)
    })
  })
})
