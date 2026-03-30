const { expect } = require('chai')
const { ethers } = require('hardhat')

describe('Layer 6 Security: Business Logic & Treasury Locks', function () {
  let security, access, timelock, state, rate, verify
  let treasury, splitter, token
  let owner, governor, user, committee, attacker
  
  const LAYER_6_ID = ethers.keccak256(ethers.toUtf8Bytes("LAYER_6_BUSINESS"))
  const SPEND_ACTION = ethers.keccak256(ethers.toUtf8Bytes("SPEND_ACTION"))
  const KEEPER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("KEEPER_ROLE"))

  beforeEach(async function () {
    ;[owner, governor, user, committee, attacker] = await ethers.getSigners()

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

    // 2. Deploy Layer 6 Contracts
    const Treasury = await ethers.getContractFactory('contracts/layer6/contracts/Treasury.sol:Treasury')
    treasury = await Treasury.deploy(
      owner.address,
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

    const MockToken = await ethers.getContractFactory('contracts/mocks/MockContracts.sol:MockERC20')
    token = await MockToken.deploy("DWallet", "DWT", 18)
    await token.waitForDeployment()
    await token.mint(await treasury.getAddress(), ethers.parseEther('1000'))
  })

  describe('Treasury: Dual-Key Security', function () {
    it('Lock 5 (Verification): Should prevent Governor from spending without Committee Signature', async function () {
      const amount = ethers.parseEther('10')
      const memo = "test spend"
      const hash = ethers.keccak256(ethers.toUtf8Bytes("random_hash"))
      const signature = "0x" // Invalid signature
      
      await expect(treasury.connect(governor).spendFunds(
        await token.getAddress(),
        user.address,
        amount,
        0, // STAKING_REWARD
        memo,
        hash,
        signature
      )).to.be.revertedWithCustomError(verify, 'InvalidSignature')
    })

    it('Lock 3 (State): Should prevent spending when Business layer is paused', async function () {
      await state.setLayerPause(LAYER_6_ID, true)
      
      const amount = ethers.parseEther('10')
      const hash = ethers.keccak256(ethers.toUtf8Bytes("random_hash"))
      const signature = "0x" 

      await expect(treasury.connect(governor).spendFunds(
        await token.getAddress(),
        user.address,
        amount,
        0,
        "memo",
        hash,
        signature
      )).to.be.revertedWithCustomError(state, 'LayerPaused')
    })
  })

  describe('FeeSplitter: Access Guards', function () {
    it('Lock 1 (Access): Should restrict split execution to KEEPER_ROLE', async function () {
      const FS = await ethers.getContractFactory('FeeSplitter')
      splitter = await FS.deploy(
        await treasury.getAddress(),
        user.address, // mock reward distributor
        ethers.ZeroAddress, // mock buyback
        5000, 5000, 0,
        owner.address, governor.address, user.address, owner.address,
        await security.getAddress(),
        await access.getAddress(),
        await timelock.getAddress(),
        await state.getAddress(),
        await rate.getAddress(),
        await verify.getAddress()
      )
      
      await expect(splitter.connect(attacker).splitAll())
        .to.be.revertedWithCustomError(access, 'AccessDenied')
    })
  })
})
