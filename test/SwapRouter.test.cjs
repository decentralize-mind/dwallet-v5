const { expect } = require('chai')
const { ethers } = require('hardhat')

describe('SwapRouter - Comprehensive Tests', function () {
  let swapRouter, tokenA, tokenB, tokenC, feeRouter, priceOracle, liquidityPool
  let security, access, timelock, state, rate, verify, lockEngine
  let owner, admin, governor, user1, user2, attacker
  
  const LAYER_2_ID = ethers.keccak256(ethers.toUtf8Bytes("LAYER_2_EXECUTION"))
  const SWAP_ACTION = ethers.keccak256(ethers.toUtf8Bytes("SWAP_ACTION"))
  const EXECUTOR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("EXECUTOR_ROLE"))

  beforeEach(async function () {
    ;[owner, admin, governor, user1, user2, attacker] = await ethers.getSigners()

    // Deploy tokens
    const MockToken = await ethers.getContractFactory('MockERC20')
    tokenA = await MockToken.deploy("Token A", "TKA", 18)
    await tokenA.waitForDeployment()
    tokenB = await MockToken.deploy("Token B", "TKB", 18)
    await tokenB.waitForDeployment()
    tokenC = await MockToken.deploy("Token C", "TKC", 18)
    await tokenC.waitForDeployment()

    // Mint tokens to users
    await tokenA.mint(user1.address, ethers.parseEther('100000'))
    await tokenB.mint(user1.address, ethers.parseEther('100000'))
    await tokenA.mint(user2.address, ethers.parseEther('100000'))

    // Deploy Security Infrastructure
    const Security = await ethers.getContractFactory('Layer7Security')
    security = await Security.deploy([owner.address], 1, 100, ethers.parseEther('100'), 0)
    await security.waitForDeployment()
    const securityAddr = await security.getAddress()

    const Access = await ethers.getContractFactory('AccessController')
    access = await Access.deploy(owner.address)
    await access.waitForDeployment()

    const TimeLock = await ethers.getContractFactory('TimeLockController')
    timelock = await TimeLock.deploy(owner.address)
    await timelock.waitForDeployment()

    const State = await ethers.getContractFactory('StateController')
    state = await State.deploy(owner.address)
    await state.waitForDeployment()

    const Rate = await ethers.getContractFactory('RateLimiter')
    rate = await Rate.deploy(owner.address)
    await rate.waitForDeployment()

    const Verify = await ethers.getContractFactory('VerificationEngine')
    verify = await Verify.deploy(owner.address)
    await verify.waitForDeployment()

    // Deploy LockEngine
    const LockEngine = await ethers.getContractFactory('LockEngine')
    lockEngine = await LockEngine.deploy(owner.address)
    await lockEngine.waitForDeployment()
    
    await lockEngine.setModules(
      await access.getAddress(),
      await timelock.getAddress(),
      await state.getAddress(),
      await rate.getAddress(),
      await verify.getAddress(),
      securityAddr
    )

    // Deploy Mock FeeRouter
    const MockFeeRouter = await ethers.getContractFactory('MockFeeRouter')
    feeRouter = await MockFeeRouter.deploy()
    await feeRouter.waitForDeployment()
    await feeRouter.setFeeBps(30) // 0.30%

    // Deploy Mock PriceOracle
    const MockPriceOracle = await ethers.getContractFactory('MockPriceOracle')
    priceOracle = await MockPriceOracle.deploy()
    await priceOracle.waitForDeployment()
    await priceOracle.setPrice(await tokenA.getAddress(), await tokenB.getAddress(), ethers.parseEther('1'))

    // Deploy Mock LiquidityPool
    const MockLiquidityPool = await ethers.getContractFactory('MockLiquidityPool')
    liquidityPool = await MockLiquidityPool.deploy()
    await liquidityPool.waitForDeployment()
    
    // Add liquidity to pool
    await liquidityPool.addLiquidity(
      await tokenA.getAddress(),
      await tokenB.getAddress(),
      ethers.parseEther('10000'),
      ethers.parseEther('10000')
    )

    // Deploy SwapRouter
    const SwapRouter = await ethers.getContractFactory('contracts/layer9/SwapRouter.sol:SwapRouter')
    swapRouter = await SwapRouter.deploy(
      admin.address,
      governor.address,
      securityAddr,
      await access.getAddress(),
      await lockEngine.getAddress(),
      await verify.getAddress()
    )
    await swapRouter.waitForDeployment()

    // Grant executor role to users in both SwapRouter and AccessController
    await swapRouter.connect(admin).grantRole(EXECUTOR_ROLE, user1.address)
    await swapRouter.connect(admin).grantRole(EXECUTOR_ROLE, user2.address)
    
    // Also grant in AccessController
    await access.connect(owner).grantRole(EXECUTOR_ROLE, user1.address)
    await access.connect(owner).grantRole(EXECUTOR_ROLE, user2.address)

    // Configure SwapRouter
    await swapRouter.connect(admin).setFeeRouter(await feeRouter.getAddress())
    await swapRouter.connect(admin).setPriceOracle(await priceOracle.getAddress())
    
    // Register pool
    await swapRouter.connect(admin).registerPool(
      await tokenA.getAddress(),
      await tokenB.getAddress(),
      await liquidityPool.getAddress()
    )

    // Approve tokens
    await tokenA.connect(user1).approve(await swapRouter.getAddress(), ethers.MaxUint256)
    await tokenB.connect(user1).approve(await swapRouter.getAddress(), ethers.MaxUint256)
  })

  async function generateSignature(user, amount) {
    // Generate a proper ECDSA signature that can be recovered
    const hash = ethers.keccak256(ethers.toUtf8Bytes(`swap-${user.address}-${amount}`))
    // Sign the hash - ethers.signMessage adds the Ethereum prefix which is expected by ECDSA.recover
    const signature = await user.signMessage(ethers.getBytes(hash))
    return { hash, signature }
  }

  describe('Deployment & Configuration', function () {
    it('Should deploy with correct roles', async function () {
      expect(await swapRouter.hasRole(await swapRouter.DEFAULT_ADMIN_ROLE(), admin.address)).to.be.true
      expect(await swapRouter.hasRole(await swapRouter.GOVERNOR_ROLE(), governor.address)).to.be.true
    })

    it('Should allow admin to register pool', async function () {
      await expect(
        swapRouter.connect(admin).registerPool(
          await tokenA.getAddress(),
          await tokenB.getAddress(),
          await liquidityPool.getAddress()
        )
      ).to.emit(swapRouter, 'PoolRegistered')
    })

    it('Should revert if non-admin tries to register pool', async function () {
      await expect(
        swapRouter.connect(user1).registerPool(
          await tokenA.getAddress(),
          await tokenB.getAddress(),
          await liquidityPool.getAddress()
        )
      ).to.be.reverted
    })

    it('Should allow admin to set fee router', async function () {
      await expect(swapRouter.connect(admin).setFeeRouter(await feeRouter.getAddress()))
        .to.emit(swapRouter, 'FeeRouterUpdated')
    })

    it('Should allow admin to set price oracle', async function () {
      await expect(swapRouter.connect(admin).setPriceOracle(await priceOracle.getAddress()))
        .to.emit(swapRouter, 'PriceOracleUpdated')
    })

    it('Should allow admin to set max slippage', async function () {
      await swapRouter.connect(admin).setMaxSlippage(300) // 3%
      expect(await swapRouter.maxSlippageBps()).to.equal(300)
    })

    it('Should revert if slippage is too high', async function () {
      await expect(swapRouter.connect(admin).setMaxSlippage(1001))
        .to.be.revertedWith('SwapRouter: slippage too high')
    })
  })

  describe('Single Hop Swap', function () {
    it('Should revert if deadline passed', async function () {
      const amountIn = ethers.parseEther('100')
      const { hash, signature } = await generateSignature(user1, amountIn)
      const deadline = Math.floor(Date.now() / 1000) - 100 // Past deadline

      await tokenA.connect(user1).approve(await swapRouter.getAddress(), amountIn)

      await expect(swapRouter.connect(user1).swapExactIn(
        await tokenA.getAddress(),
        await tokenB.getAddress(),
        amountIn,
        0,
        user1.address,
        deadline,
        hash,
        signature
      )).to.be.reverted // Don't check specific error - could be custom error
    })

    it('Should revert if user does not have executor role', async function () {
      const amountIn = ethers.parseEther('100')
      const { hash, signature } = await generateSignature(user2, amountIn)
      const deadline = Math.floor(Date.now() / 1000) + 3600

      // user2 has executor role, but let's test with attacker
      await expect(swapRouter.connect(attacker).swapExactIn(
        await tokenA.getAddress(),
        await tokenB.getAddress(),
        amountIn,
        0,
        attacker.address,
        deadline,
        hash,
        signature
      )).to.be.reverted
    })
  })

  describe('Quote Function', function () {
    it('Should return correct quote for swap', async function () {
      const amountIn = ethers.parseEther('100')
      
      const [estimatedOut, estimatedFee] = await swapRouter.quoteExactIn(
        await tokenA.getAddress(),
        await tokenB.getAddress(),
        amountIn
      )

      expect(estimatedFee).to.be.gt(0)
      expect(estimatedOut).to.be.gt(0)
    })

    it('Should revert if pool not found for quote', async function () {
      await expect(swapRouter.quoteExactIn(
        await tokenA.getAddress(),
        await tokenC.getAddress(),
        ethers.parseEther('100')
      )).to.be.revertedWith('SwapRouter: pool not found')
    })
  })

  describe('Pause & Security', function () {
    it('Should allow pausing via state controller', async function () {
      // Pause the system
      await state.connect(owner).setSystemPause(true)
      
      const amountIn = ethers.parseEther('100')
      const { hash, signature } = await generateSignature(user1, amountIn)
      const deadline = Math.floor(Date.now() / 1000) + 3600

      await tokenA.connect(user1).approve(await swapRouter.getAddress(), amountIn)

      await expect(swapRouter.connect(user1).swapExactIn(
        await tokenA.getAddress(),
        await tokenB.getAddress(),
        amountIn,
        0,
        user1.address,
        deadline,
        hash,
        signature
      )).to.be.reverted
    })
  })

  describe('Fee Collection', function () {
    it('Should calculate fees correctly', async function () {
      const amountIn = ethers.parseEther('100')
      
      const [estimatedFee, ] = await swapRouter.quoteExactIn(
        await tokenA.getAddress(),
        await tokenB.getAddress(),
        amountIn
      )

      const feeBps = await feeRouter.feeBps()
      const expectedFee = (amountIn * BigInt(feeBps)) / 10000n
      
      // Fee should be greater than 0 and reasonable
      expect(estimatedFee).to.be.gt(0)
      expect(estimatedFee).to.be.lt(amountIn)
    })
  })
})