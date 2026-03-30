// test/Layer4.test.js
const { expect } = require('chai')
const { ethers } = require('hardhat')
const { time } = require('@nomicfoundation/hardhat-network-helpers')

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
const E18 = n => ethers.parseEther(String(n))
const DAY = 86_400

// ─────────────────────────────────────────────────────────────
// Suite
// ─────────────────────────────────────────────────────────────
describe('Layer 4 — Staking & Rewards', function () {
  let owner, alice, bob, treasury
  let dwt, stakingPool, dwtStaking, boostedStaking, rewardDistributor

  beforeEach(async () => {
    ;[owner, alice, bob, treasury] = await ethers.getSigners()

    // Deploy mock DWT
    const Token = await ethers.getContractFactory(
      'contracts/layer4/contracts/mocks/MockERC20.sol:MockERC20',
    )
    dwt = await Token.deploy('DWT Token', 'DWT', E18(10_000_000))

    // Distribute DWT
    await dwt.transfer(alice.address, E18(100_000))
    await dwt.transfer(bob.address, E18(100_000))

    // ── StakingPool ──────────────────────────────────────────
    const SP = await ethers.getContractFactory(
      'contracts/layer4/contracts/StakingPool.sol:StakingPool',
    )
    stakingPool = await SP.deploy(await dwt.getAddress(), owner.address)

    // ── DWTStaking ───────────────────────────────────────────
    const DS = await ethers.getContractFactory(
      'contracts/layer4/contracts/DWTStaking.sol:DWTStaking',
    )
    dwtStaking = await DS.deploy(await dwt.getAddress(), owner.address)

    // ── BoostedStaking ───────────────────────────────────────
    const BS = await ethers.getContractFactory(
      'contracts/layer4/contracts/BoostedStaking.sol:BoostedStaking',
    )
    boostedStaking = await BS.deploy(await dwt.getAddress(), owner.address)

    // ── RewardDistributor ────────────────────────────────────
    const RD = await ethers.getContractFactory(
      'contracts/layer4/contracts/RewardDistributor.sol:RewardDistributor',
    )
    rewardDistributor = await RD.deploy(
      await dwtStaking.getAddress(),
      await stakingPool.getAddress(),
      await boostedStaking.getAddress(),
      treasury.address,
      await dwt.getAddress(),
      owner.address, // swap router placeholder
      owner.address,
    )

    // Wire
    await stakingPool.setRewardDistributor(await rewardDistributor.getAddress())
    await dwtStaking.setRewardDistributor(await rewardDistributor.getAddress())
    await boostedStaking.setRewardDistributor(
      await rewardDistributor.getAddress(),
    )
  })

  // ─────────────────────────────────────────────
  // StakingPool
  // ─────────────────────────────────────────────
  describe('StakingPool (DWT → DWT)', () => {
    it('mints shares 1:1 on first deposit', async () => {
      await dwt
        .connect(alice)
        .approve(await stakingPool.getAddress(), E18(1000))
      await stakingPool.connect(alice).deposit(E18(1000))
      // 1000 deposited, MIN_SHARES locked, alice gets 1000 - MIN_SHARES
      const bal = await stakingPool.balanceOf(alice.address)
      expect(bal).to.be.gt(0n)
    })

    it('pricePerShare increases after reward injection', async () => {
      // Alice deposits
      await dwt
        .connect(alice)
        .approve(await stakingPool.getAddress(), E18(1000))
      await stakingPool.connect(alice).deposit(E18(1000))

      const priceBefore = await stakingPool.pricePerShare()

      // Owner injects rewards
      await dwt.approve(await stakingPool.getAddress(), E18(100))
      await stakingPool.injectRewards(E18(100))

      const priceAfter = await stakingPool.pricePerShare()
      expect(priceAfter).to.be.gt(priceBefore)
    })

    it('applies withdrawal fee on withdraw', async () => {
      await dwt
        .connect(alice)
        .approve(await stakingPool.getAddress(), E18(1000))
      await stakingPool.connect(alice).deposit(E18(1000))

      // Fast-forward past cooldown
      await time.increase(DAY + 1)

      const shares = await stakingPool.balanceOf(alice.address)
      const balBefore = await dwt.balanceOf(alice.address)
      await stakingPool.connect(alice).withdraw(shares)
      const balAfter = await dwt.balanceOf(alice.address)

      // Should receive slightly less than deposited due to fee
      expect(balAfter - balBefore).to.be.lt(E18(1000))
    })

    it('reverts withdraw during cooldown', async () => {
      await dwt
        .connect(alice)
        .approve(await stakingPool.getAddress(), E18(1000))
      await stakingPool.connect(alice).deposit(E18(1000))
      const shares = await stakingPool.balanceOf(alice.address)
      await expect(
        stakingPool.connect(alice).withdraw(shares),
      ).to.be.revertedWith('StakingPool: cooldown active')
    })

    it('sDWT is non-transferable', async () => {
      await dwt
        .connect(alice)
        .approve(await stakingPool.getAddress(), E18(1000))
      await stakingPool.connect(alice).deposit(E18(1000))
      const shares = await stakingPool.balanceOf(alice.address)
      await expect(
        stakingPool.connect(alice).transfer(bob.address, shares),
      ).to.be.revertedWith('StakingPool: sDWT non-transferable')
    })
  })

  // ─────────────────────────────────────────────
  // DWTStaking
  // ─────────────────────────────────────────────
  describe('DWTStaking (DWT → ETH)', () => {
    it('stakes DWT and records balance', async () => {
      await dwt.connect(alice).approve(await dwtStaking.getAddress(), E18(5000))
      await dwtStaking.connect(alice).stake(E18(5000))
      expect(await dwtStaking.stakedAmount(alice.address)).to.equal(E18(5000))
      expect(await dwtStaking.totalStaked()).to.equal(E18(5000))
    })

    it('distributes ETH reward proportionally', async () => {
      // Alice stakes 3x more than Bob
      await dwt.connect(alice).approve(await dwtStaking.getAddress(), E18(3000))
      await dwtStaking.connect(alice).stake(E18(3000))
      await dwt.connect(bob).approve(await dwtStaking.getAddress(), E18(1000))
      await dwtStaking.connect(bob).stake(E18(1000))

      // Inject 1 ETH of rewards
      await dwtStaking.connect(owner).depositETHReward({ value: E18(1) })

      const aliceEarned = await dwtStaking.earned(alice.address)
      const bobEarned = await dwtStaking.earned(bob.address)

      // Alice should earn ~3x Bob
      expect(aliceEarned).to.be.closeTo(E18(0.75), E18(0.01))
      expect(bobEarned).to.be.closeTo(E18(0.25), E18(0.01))
    })

    it('allows ETH claim after reward deposit', async () => {
      await dwt.connect(alice).approve(await dwtStaking.getAddress(), E18(1000))
      await dwtStaking.connect(alice).stake(E18(1000))
      await dwtStaking.connect(owner).depositETHReward({ value: E18(1) })

      const ethBefore = await ethers.provider.getBalance(alice.address)
      const tx = await dwtStaking.connect(alice).claimETH()
      const receipt = await tx.wait()
      const gas = receipt.gasUsed * receipt.gasPrice
      const ethAfter = await ethers.provider.getBalance(alice.address)

      expect(ethAfter + gas - ethBefore).to.be.closeTo(E18(1), E18(0.001))
    })

    it('reverts unstake before lock expires', async () => {
      await dwt.connect(alice).approve(await dwtStaking.getAddress(), E18(1000))
      await dwtStaking.connect(alice).stake(E18(1000))
      await expect(
        dwtStaking.connect(alice).unstake(E18(1000)),
      ).to.be.revertedWith('DWTStaking: still locked')
    })

    it('allows unstake after lock period', async () => {
      await dwt.connect(alice).approve(await dwtStaking.getAddress(), E18(1000))
      await dwtStaking.connect(alice).stake(E18(1000))
      await time.increase(7 * DAY + 1)
      await dwtStaking.connect(alice).unstake(E18(1000))
      expect(await dwtStaking.stakedAmount(alice.address)).to.equal(0n)
    })
  })

  // ─────────────────────────────────────────────
  // BoostedStaking
  // ─────────────────────────────────────────────
  describe('BoostedStaking (veDWT multiplier)', () => {
    it('veDWT decays over time', async () => {
      const lockSecs = 365 * DAY
      await dwt
        .connect(alice)
        .approve(await boostedStaking.getAddress(), E18(1000))
      await boostedStaking.connect(alice).lock(E18(1000), lockSecs)

      const veBefore = await boostedStaking.veDWTOf(alice.address)

      await time.increase(180 * DAY)
      const veAfter = await boostedStaking.veDWTOf(alice.address)

      expect(veBefore).to.be.gt(veAfter)
    })

    it('longer lock → higher veDWT', async () => {
      await dwt
        .connect(alice)
        .approve(await boostedStaking.getAddress(), E18(1000))
      await boostedStaking.connect(alice).lock(E18(1000), 365 * DAY)

      await dwt
        .connect(bob)
        .approve(await boostedStaking.getAddress(), E18(1000))
      await boostedStaking.connect(bob).lock(E18(1000), 7 * DAY)

      const veAlice = await boostedStaking.veDWTOf(alice.address)
      const veBob = await boostedStaking.veDWTOf(bob.address)

      expect(veAlice).to.be.gt(veBob)
    })

    it('boost multiplier > 1x for max lock', async () => {
      await dwt
        .connect(alice)
        .approve(await boostedStaking.getAddress(), E18(1000))
      await boostedStaking.connect(alice).lock(E18(1000), 4 * 365 * DAY)

      const boost = await boostedStaking.boostMultiplier(alice.address)
      expect(boost).to.be.gt(E18(1)) // > 1x
    })

    it('cannot unlock before lock expires', async () => {
      await dwt
        .connect(alice)
        .approve(await boostedStaking.getAddress(), E18(1000))
      await boostedStaking.connect(alice).lock(E18(1000), 30 * DAY)
      await expect(boostedStaking.connect(alice).unlock()).to.be.revertedWith(
        'BoostedStaking: still locked',
      )
    })

    it('allows unlock after expiry and returns DWT', async () => {
      await dwt
        .connect(alice)
        .approve(await boostedStaking.getAddress(), E18(1000))
      await boostedStaking.connect(alice).lock(E18(1000), 7 * DAY)
      await time.increase(7 * DAY + 1)

      const balBefore = await dwt.balanceOf(alice.address)
      await boostedStaking.connect(alice).unlock()
      const balAfter = await dwt.balanceOf(alice.address)

      expect(balAfter - balBefore).to.equal(E18(1000))
    })

    it('ETH rewards distributed to boosted stakers', async () => {
      await dwt
        .connect(alice)
        .approve(await boostedStaking.getAddress(), E18(1000))
      await boostedStaking.connect(alice).lock(E18(1000), 4 * 365 * DAY)

      await boostedStaking.connect(owner).depositETHReward({ value: E18(1) })

      const earned = await boostedStaking.earnedETH(alice.address)
      expect(earned).to.be.gt(0n)
    })
  })

  // ─────────────────────────────────────────────
  // RewardDistributor
  // ─────────────────────────────────────────────
  describe('RewardDistributor (Fee → ETH #12)', () => {
    it('accepts ETH and tracks balance', async () => {
      await owner.sendTransaction({
        to: await rewardDistributor.getAddress(),
        value: E18(5),
      })
      const bal = await ethers.provider.getBalance(
        await rewardDistributor.getAddress(),
      )
      expect(bal).to.equal(E18(5))
    })

    it('distribute() reverts when ETH < minDistributeAmount', async () => {
      // No ETH in distributor
      await expect(rewardDistributor.distribute()).to.be.revertedWith(
        'RD: insufficient ETH',
      )
    })

    it('owner can update allocation weights', async () => {
      await rewardDistributor.setAllocation(6000, 1500, 1500, 1000)
      const alloc = await rewardDistributor.allocation()
      expect(alloc.dwtStakingBps).to.equal(6000n)
    })

    it('reverts on allocation sum != 10000', async () => {
      await expect(
        rewardDistributor.setAllocation(5000, 2000, 2000, 500),
      ).to.be.revertedWith('RD: allocations must sum to 100%')
    })
  })
})
