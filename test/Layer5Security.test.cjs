const { expect } = require('chai')
const { ethers } = require('hardhat')

describe('Layer 5 Security: Token Logic Locks', function () {
  let security, access, timelock, state, rate, verify
  let token, flash, insurance
  let owner, guardian, committee, user, attacker
  
  const LAYER_5_ID = ethers.keccak256(ethers.toUtf8Bytes("LAYER_5_TOKEN"))
  const TRANSFER_ACTION = ethers.keccak256(ethers.toUtf8Bytes("TRANSFER_ACTION"))
  const FLASH_ACTION = ethers.keccak256(ethers.toUtf8Bytes("FLASH_ACTION"))
  const CLAIM_ACTION = ethers.keccak256(ethers.toUtf8Bytes("CLAIM_ACTION"))

  beforeEach(async function () {
    ;[owner, guardian, committee, user, attacker] = await ethers.getSigners()

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

    // 2. Deploy Layer 5 Contracts
    const DWTToken = await ethers.getContractFactory('DWTToken')
    token = await DWTToken.deploy(
      owner.address,
      securityAddr,
      await access.getAddress(),
      await timelock.getAddress(),
      await state.getAddress(),
      await rate.getAddress(),
      await verify.getAddress(),
      ethers.parseEther('1000'),
      ethers.parseEther('5000'),
      ethers.parseEther('10000')
    )
    await token.waitForDeployment()

    const FlashLoan = await ethers.getContractFactory('FlashLoan')
    flash = await FlashLoan.deploy(
      await token.getAddress(),
      10000, // 100% max loan
      10,    // 0.1% fee
      securityAddr,
      await access.getAddress(),
      await timelock.getAddress(),
      await state.getAddress(),
      await rate.getAddress(),
      await verify.getAddress(),
      owner.address,
      guardian.address
    )
    await flash.waitForDeployment()

    const InsuranceFund = await ethers.getContractFactory('InsuranceFund')
    insurance = await InsuranceFund.deploy(
      await token.getAddress(),
      1000, // 10% max claim
      2000, // 20% rolling cap
      3600, // 1h delay
      securityAddr,
      await access.getAddress(),
      await timelock.getAddress(),
      await state.getAddress(),
      await rate.getAddress(),
      await verify.getAddress(),
      owner.address,
      committee.address,
      guardian.address
    )
    await insurance.waitForDeployment()
  })

  describe('DWTToken: Anti-Whale & Transfer Locks', function () {
    it('Lock 4 (Rate): Should block transfers exceeding anti-whale limits', async function () {
      // Set anti-whale limit: 1,000 DWT
      await rate.setRateLimit(TRANSFER_ACTION, 86400, ethers.parseEther('1000'))
      
      await token.mint(user.address, ethers.parseEther('2000'))
      
      await expect(token.connect(user).transfer(attacker.address, ethers.parseEther('1500')))
        .to.be.revertedWithCustomError(rate, 'MaxAmountExceeded')
    })

    it('Lock 3 (State): Should stop all transfers when Token State is paused', async function () {
      await state.setLayerPause(LAYER_5_ID, true)
      
      await token.mint(user.address, ethers.parseEther('100'))
      
      await expect(token.connect(user).transfer(attacker.address, ethers.parseEther('10')))
        .to.be.revertedWithCustomError(state, 'LayerPaused')
    })
  })

  describe('FlashLoan: System Integrity Locks', function () {
    it('Lock 3 (State): Should halt flash loans during suspend state', async function () {
      const LAYER_5_FLASH = ethers.keccak256(ethers.toUtf8Bytes("LAYER_5_FLASH"))
      await state.setLayerPause(LAYER_5_FLASH, true)
      
      await expect(flash.flashLoan(attacker.address, await token.getAddress(), 100, "0x"))
        .to.be.revertedWithCustomError(state, 'LayerPaused')
    })
  })

  describe('InsuranceFund: Claim Verification Locks', function () {
    it('Lock 5 (Verification): executeClaim should require a valid committee signature', async function () {
      const hash = ethers.id("claim-1")
      const sig = "0x" + "00".repeat(65)
      
      await expect(insurance.executeClaim(0, hash, sig))
        .to.be.revertedWithCustomError(verify, 'InvalidSignature')
    })
  })
})
