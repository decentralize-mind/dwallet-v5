const { expect } = require('chai')
const { ethers } = require('hardhat')

describe('Layer 3 Security: Authentication Locks', function () {
  let security, access, timelock, state, rate, verify
  let multisig, emergency
  let owner, guardian, user, relayer1, relayer2
  
  const LAYER_3_AUTH = ethers.keccak256(ethers.toUtf8Bytes("LAYER_3_AUTH"))
  const LAYER_3_PAUSE = ethers.keccak256(ethers.toUtf8Bytes("LAYER_3_PAUSE"))
  const EXECUTE_ACTION = ethers.keccak256(ethers.toUtf8Bytes("EXECUTE_ACTION"))
  const PAUSE_ACTION = ethers.keccak256(ethers.toUtf8Bytes("PAUSE_ACTION"))
  const UNPAUSE_ACTION = ethers.keccak256(ethers.toUtf8Bytes("UNPAUSE_ACTION"))
  
  const GUARDIAN_ROLE = ethers.keccak256(ethers.toUtf8Bytes("GUARDIAN_ROLE"))
  const ADMIN_ROLE = ethers.keccak256(ethers.toUtf8Bytes("ADMIN_ROLE"))

  beforeEach(async function () {
    ;[owner, guardian, user, relayer1, relayer2] = await ethers.getSigners()

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

    // 2. Deploy Layer 3 Contracts
    const Multisig = await ethers.getContractFactory('DWalletMultisig')
    multisig = await Multisig.deploy(
      [owner.address, guardian.address],
      1,
      securityAddr,
      await access.getAddress(),
      await timelock.getAddress(),
      await state.getAddress(),
      await rate.getAddress(),
      await verify.getAddress()
    )
    await multisig.waitForDeployment()

    const Emergency = await ethers.getContractFactory('EmergencyPause')
    emergency = await Emergency.deploy(
      owner.address,
      guardian.address,
      securityAddr,
      await access.getAddress(),
      await timelock.getAddress(),
      await state.getAddress(),
      await rate.getAddress(),
      await verify.getAddress()
    )
    await emergency.waitForDeployment()

    // 3. Setup Permissions
    await access.grantRole(GUARDIAN_ROLE, guardian.address)
    await access.grantRole(ADMIN_ROLE, owner.address)
  })

  describe('EmergencyPause: Circuit Breaker Locks', function () {
    it('Lock 4 (Rate): Should limit pauseAll frequency', async function () {
      // Set limit: 1 pause per day
      await rate.setRateLimit(PAUSE_ACTION, 86400, 1)
      
      await emergency.connect(guardian).pauseAll("Emergency 1")
      
      await expect(emergency.connect(guardian).pauseAll("Emergency 2"))
        .to.be.revertedWithCustomError(rate, 'MaxAmountExceeded')
    })

    it('Lock 5 (Verification): unpauseAll should require a valid signature', async function () {
      const hash = ethers.id("unpause-all")
      const sig = "0x" + "00".repeat(65)
      
      await expect(emergency.connect(owner).unpauseAll(hash, sig))
        .to.be.revertedWithCustomError(verify, 'InvalidSignature')
    })
  })

  describe('DWalletMultisig: Auth Lifecycle Locks', function () {
    it('Lock 2 (Time): Execution should require a Time-Lock cooldown', async function () {
      await timelock.setActionDelay(EXECUTE_ACTION, 3600) // 1h
      
      // Submit tx
      await multisig.submitTransaction(user.address, 0, "0x")
      const txId = 0
      
      // Attempt immediate execution
      await expect(multisig.executeTransaction(txId))
        .to.be.revertedWithCustomError(timelock, 'TimeLockActive')
    })
    
    it('Lock 3 (State): Should block submission if Auth layer is in Maintenance', async function () {
      await state.setLayerPause(LAYER_3_AUTH, true)
      
      await expect(multisig.submitTransaction(user.address, 0, "0x"))
        .to.be.revertedWithCustomError(state, 'LayerPaused')
    })
  })
})
