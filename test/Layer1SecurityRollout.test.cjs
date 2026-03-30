const { expect } = require('chai')
const { ethers } = require('hardhat')

describe('Layer 1 Security Rollout: 5 Universal Locks', function () {
  let security, access, timelock, state, rate, verify
  let dwt, treasury, staking
  let owner, governor, executor, user
  
  const LAYER_1_STORAGE = ethers.keccak256(ethers.toUtf8Bytes("LAYER_1_STORAGE"))
  const MINT_ACTION = ethers.keccak256(ethers.toUtf8Bytes("MINT_ACTION"))
  const CONFIG_ACTION = ethers.keccak256(ethers.toUtf8Bytes("CONFIG_ACTION"))
  const SPEND_ACTION = ethers.keccak256(ethers.toUtf8Bytes("SPEND_ACTION"))
  const LARGE_SPEND_ACTION = ethers.keccak256(ethers.toUtf8Bytes("LARGE_SPEND_ACTION"))
  const WITHDRAW_ACTION = ethers.keccak256(ethers.toUtf8Bytes("WITHDRAW_ACTION"))
  const EXECUTOR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("EXECUTOR_ROLE"))

  beforeEach(async function () {
    ;[owner, governor, executor, user] = await ethers.getSigners()

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

    // 2. Deploy Layer 1 Contracts
    const DWT = await ethers.getContractFactory('DWTToken')
    dwt = await DWT.deploy(
      owner.address,
      securityAddr,
      await access.getAddress(),
      await timelock.getAddress(),
      await state.getAddress(),
      await rate.getAddress(),
      await verify.getAddress(),
      ethers.parseEther('1000'), // T1
      ethers.parseEther('5000'), // T2
      ethers.parseEther('10000') // T3
    )
    await dwt.waitForDeployment()

    const Treasury = await ethers.getContractFactory('Treasury')
    treasury = await Treasury.deploy(
      governor.address,
      owner.address,
      securityAddr,
      await access.getAddress(),
      await timelock.getAddress(),
      await state.getAddress(),
      await rate.getAddress(),
      await verify.getAddress()
    )
    await treasury.waitForDeployment()

    const Staking = await ethers.getContractFactory('DWTStaking')
    staking = await Staking.deploy(
      await dwt.getAddress(),
      86400 * 7, // 1 week
      securityAddr,
      await access.getAddress(),
      await timelock.getAddress(),
      await state.getAddress(),
      await rate.getAddress(),
      await verify.getAddress(),
      owner.address
    )
    await staking.waitForDeployment()

    const GOVERNOR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("GOVERNOR_ROLE"))

    // 3. Setup Permissions
    await access.grantRole(EXECUTOR_ROLE, executor.address)
    await access.grantRole(EXECUTOR_ROLE, owner.address) // Allow owner to mint for tests
    await access.grantRole(GOVERNOR_ROLE, governor.address)
    
    // Set daily mint cap for tests: 1M DWT
    await rate.setRateLimit(MINT_ACTION, 10, ethers.parseEther('1000000'))
  })

  describe('DWTToken: Storage Locks', function () {
    it('Lock 1 (Access): Should only allow EXECUTOR_ROLE to mint', async function () {
      const amount = ethers.parseEther('100')
      await expect(dwt.connect(user).mint(user.address, amount))
        .to.be.revertedWithCustomError(access, 'AccessControlUnauthorizedAccount')
      
      await expect(dwt.connect(executor).mint(user.address, amount))
        .to.not.be.reverted
    })

    it('Lock 4 (Rate): Should block minting if rate limit is exceeded', async function () {
      // Set very low limit: 100 DWT
      await rate.setRateLimit(MINT_ACTION, 10, ethers.parseEther('100'))
      
      await dwt.connect(executor).mint(user.address, ethers.parseEther('50'))
      await expect(dwt.connect(executor).mint(user.address, ethers.parseEther('60')))
        .to.be.revertedWithCustomError(rate, 'MaxAmountExceeded')
    })

    it('Lock 5 (Verification): Should require signature for threshold updates', async function () {
      const hash = ethers.id("test_config")
      const sig = "0x" + "00".repeat(65) // Invalid mock sig
      
      await expect(dwt.setTierThresholds(1, 2, 3, hash, sig))
        .to.be.revertedWithCustomError(verify, 'InvalidSignature')
    })
  })

  describe('Treasury: Fund Management Locks', function () {
    it('Lock 2 (Time): Large transfers should require cooldown/delay', async function () {
      // Set delay for large spend: 1 day
      await timelock.setActionDelay(LARGE_SPEND_ACTION, 86400)
      
      const amount = ethers.parseEther('11') // Over 10 ETH threshold
      const hash = ethers.id("test_spend")
      const sig = "0x" + "00".repeat(65)
      
      // Should fail initially because TimeLock requires a start (verified in internal logic)
      // Actually, my implementation verified then started. So first call fails if not scheduled.
      await expect(treasury.connect(governor).spendFunds(user.address, amount, "Test", hash, sig))
        .to.be.revertedWithCustomError(timelock, 'TimeLockActive')
    })

    it('Lock 3 (State): Should block withdrawals if Treasury is paused', async function () {
      const LAYER_ID = await treasury.LAYER_ID()
      await state.setLayerPause(LAYER_ID, true)
      
      const amount = ethers.parseEther('1')
      const hash = ethers.id("test")
      const sig = "0x00"

      await expect(treasury.connect(governor).spendFunds(user.address, amount, "Test", hash, sig))
        .to.be.revertedWithCustomError(state, 'LayerPaused')
    })
  })

  describe('DWTStaking: Staking Locks', function () {
    it('Lock 2 (Time): Should enforce cooldown on withdrawal after staking', async function () {
      await timelock.setActionDelay(WITHDRAW_ACTION, 3600) // 1 hour
      
      // 1. Mint & Stake
      await dwt.connect(executor).mint(user.address, ethers.parseEther('100'))
      await dwt.connect(user).approve(await staking.getAddress(), ethers.MaxUint256)
      await staking.connect(user).stake(ethers.parseEther('100'))
      
      // 2. Attempt immediate withdraw
      await expect(staking.connect(user).withdraw(ethers.parseEther('100')))
        .to.be.revertedWithCustomError(timelock, 'TimeLockActive')
        
      // 3. Fast forward time
      await ethers.provider.send("evm_increaseTime", [3601])
      await ethers.provider.send("evm_mine")
      
      await expect(staking.connect(user).withdraw(ethers.parseEther('100')))
        .to.not.be.reverted
    })
  })
})
