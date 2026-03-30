const { expect } = require('chai')
const { ethers } = require('hardhat')

describe('Layer 2 Security: Execution Engine Locks', function () {
  let security, access, timelock, state, rate, verify
  let router, tokenIn, tokenOut, feeRouter, oracle, pool
  let owner, executor, user
  
  const LAYER_2_EXECUTION = ethers.keccak256(ethers.toUtf8Bytes("LAYER_2_EXECUTION"))
  const SWAP_ACTION = ethers.keccak256(ethers.toUtf8Bytes("SWAP_ACTION"))
  const EXECUTOR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("EXECUTOR_ROLE"))

  // Inline Mock Definitions
  const MOCK_FEE_ROUTER_ABI = [
    "function collectFee(address token, address payer, uint256 amount) external returns (uint256)",
    "function calculateFee(address user, uint256 amount) external view returns (uint256, uint256)"
  ]
  const MOCK_PRICE_ORACLE_ABI = [
    "function getPrice(address token0, address token1) external view returns (uint256, bool)"
  ]

  beforeEach(async function () {
    ;[owner, executor, user] = await ethers.getSigners()

    // 1. Deploy Security Infrastructure
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

    // 2. Deploy Mocks & Router
    const MockToken = await ethers.getContractFactory('contracts/mocks/MockContracts.sol:MockERC20')
    tokenIn = await MockToken.deploy("Token In", "TIN", 18)
    tokenOut = await MockToken.deploy("Token Out", "TOUT", 18)
    
    // Deploy simple stubs
    const MockFeeFactory = new ethers.ContractFactory(MOCK_FEE_ROUTER_ABI, "0x6000600052600160205260406000f3")
    feeRouter = await MockFeeFactory.deploy()
    
    const MockOracleFactory = new ethers.ContractFactory(MOCK_PRICE_ORACLE_ABI, "0x6000600052600160205260406000f3")
    oracle = await MockOracleFactory.deploy()

    const SwapRouter = await ethers.getContractFactory('SwapRouter')
    router = await SwapRouter.deploy(
      await feeRouter.getAddress(),
      await oracle.getAddress(),
      securityAddr,
      await access.getAddress(),
      await timelock.getAddress(),
      await state.getAddress(),
      await rate.getAddress(),
      await verify.getAddress(),
      owner.address
    )
    await router.waitForDeployment()

    // 3. Setup Permissions
    await access.grantRole(EXECUTOR_ROLE, executor.address)
    await access.grantRole(EXECUTOR_ROLE, user.address) // Allow user for tests
    
    // Mint tokens
    await tokenIn.mint(user.address, ethers.parseEther('1000'))
    await tokenIn.connect(user).approve(await router.getAddress(), ethers.MaxUint256)
  })

  describe('SwapRouter: Execution Locks', function () {
    it('Lock 5 (Verification): Should require a valid signature to swap', async function () {
      const amount = ethers.parseEther('100')
      const hash = ethers.id("swap-auth")
      const sig = "0x" + "00".repeat(65)
      
      await expect(router.connect(user).swapExactIn(
        await tokenIn.getAddress(),
        await tokenOut.getAddress(),
        amount,
        0,
        user.address,
        Math.floor(Date.now() / 1000) + 3600,
        hash,
        sig
      )).to.be.revertedWithCustomError(verify, 'InvalidSignature')
    })

    it('Lock 4 (Rate): Should block trades that exceed block limits', async function () {
      // Set limit: 50 TIN per block
      await rate.setRateLimit(SWAP_ACTION, 1, ethers.parseEther('50'))
      
      const amount = ethers.parseEther('60')
      const hash = ethers.id("swap-auth")
      const sig = "0x" + "00".repeat(65) // Will fail sig anyway, but rate check is usually before or after
      
      // Note: withRateLimit is BEFORE withSignature in our implementation
      await expect(router.connect(user).swapExactIn(
        await tokenIn.getAddress(),
        await tokenOut.getAddress(),
        amount,
        0,
        user.address,
        Math.floor(Date.now() / 1000) + 3600,
        hash,
        sig
      )).to.be.revertedWithCustomError(rate, 'MaxAmountExceeded')
    })

    it('Lock 3 (State): Should halt execution if Execution layer is paused', async function () {
      await state.setLayerPause(LAYER_2_EXECUTION, true)
      
      const amount = ethers.parseEther('10')
      await expect(router.connect(user).swapExactIn(
        await tokenIn.getAddress(),
        await tokenOut.getAddress(),
        amount,
        0,
        user.address,
        Math.floor(Date.now() / 1000) + 3600,
        ethers.id("test"),
        "0x00"
      )).to.be.revertedWithCustomError(state, 'LayerPaused')
    })
  })
})
