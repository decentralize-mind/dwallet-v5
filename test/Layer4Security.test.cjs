const { expect } = require('chai')
const { ethers } = require('hardhat')

describe('Layer 4 Security: Liquidity & Staking Locks', function () {
  let security, access, timelock, state, rate, verify
  let token, pool, boosted, distributor
  let owner, user, keeper, attacker
  
  const LAYER_4_ID = ethers.keccak256(ethers.toUtf8Bytes("LAYER_4_LIQUIDITY"))
  const STAKE_ACTION = ethers.keccak256(ethers.toUtf8Bytes("STAKE_ACTION"))
  const WITHDRAW_ACTION = ethers.keccak256(ethers.toUtf8Bytes("WITHDRAW_ACTION"))
  const KEEPER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("KEEPER_ROLE"))

  beforeEach(async function () {
    ;[owner, user, keeper, attacker] = await ethers.getSigners()

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

    // 2. Deploy Layer 4 Contracts
    const MockToken = await ethers.getContractFactory('contracts/mocks/MockContracts.sol:MockERC20')
    token = await MockToken.deploy("DWallet", "DWT", 18)
    await token.waitForDeployment()

    const StakingPool = await ethers.getContractFactory('StakingPool')
    pool = await StakingPool.deploy(
      await token.getAddress(),
      securityAddr,
      await access.getAddress(),
      await timelock.getAddress(),
      await state.getAddress(),
      await rate.getAddress(),
      await verify.getAddress(),
      owner.address
    )
    await pool.waitForDeployment()
  })

  describe('StakingPool: Security Locks', function () {
    it('Lock 3 (State): Should prevent deposits when Liquidity layer is paused', async function () {
      await state.setLayerPause(LAYER_4_ID, true)
      
      await token.mint(user.address, ethers.parseEther('100'))
      await token.connect(user).approve(await pool.getAddress(), ethers.parseEther('100'))
      
      await expect(pool.connect(user).deposit(ethers.parseEther('10')))
        .to.be.revertedWithCustomError(state, 'LayerPaused')
    })

    it('Lock 2 (Time): Should require a modular cooldown for withdrawals', async function () {
      await token.mint(user.address, ethers.parseEther('100'))
      await token.connect(user).approve(await pool.getAddress(), ethers.parseEther('100'))
      await pool.connect(user).deposit(ethers.parseEther('100'))
      
      // Attempt immediate withdraw
      await expect(pool.connect(user).withdraw(ethers.parseEther('10')))
        .to.be.revertedWithCustomError(timelock, 'CooldownActive')
    })
  })

  describe('RewardDistributor: Access & Rate Locks', function () {
    it('Lock 1 (Access): Should restrict distribution to KEEPER_ROLE', async function () {
      // Distributor needs a lot of dependencies, just testing the modifier logic
      const RD = await ethers.getContractFactory('RewardDistributor')
      distributor = await RD.deploy(
        owner.address, owner.address, owner.address, owner.address,
        await token.getAddress(), owner.address, owner.address, owner.address,
        await security.getAddress(),
        await access.getAddress(),
        await timelock.getAddress(),
        await state.getAddress(),
        await rate.getAddress(),
        await verify.getAddress(),
        owner.address
      )
      
      await expect(distributor.connect(attacker).distribute())
        .to.be.revertedWithCustomError(access, 'AccessDenied')
    })
  })
})
