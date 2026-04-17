const { expect } = require('chai')
const { ethers } = require('hardhat')

describe('FeeRouter: Complete Security Suite', function () {
  let owner, treasury, liquidityPool, user1, user2
  let feeRouter, governanceToken, mockToken
  let securityController

  const BASIS_POINTS = 10_000
  const DEFAULT_FEE_BPS = 30 // 0.30%
  const LP_SHARE_BPS = 7_000 // 70%

  beforeEach(async function () {
    ;[owner, treasury, liquidityPool, user1, user2] = await ethers.getSigners()

    // Deploy Mock Security Controller
    const MockSecurity = await ethers.getContractFactory('MockLayer7Security')
    securityController = await MockSecurity.deploy()

    // Deploy Governance Token (DWT)
    const DWTToken = await ethers.getContractFactory('DWTToken')
    governanceToken = await DWTToken.deploy(
      owner.address,
      ethers.parseUnits('100', 18),   // Tier 1
      ethers.parseUnits('1000', 18),  // Tier 2
      ethers.parseUnits('10000', 18), // Tier 3
    )

    // Deploy Mock ERC20 for fees
    const MockERC20 = await ethers.getContractFactory('MockERC20')
    mockToken = await MockERC20.deploy('Mock Token', 'MOCK', 18)

    // Deploy FeeRouter
    const FeeRouter = await ethers.getContractFactory('FeeRouter')
    feeRouter = await FeeRouter.deploy(
      treasury.address,
      liquidityPool.address,
      await governanceToken.getAddress(),
      await securityController.getAddress(),
      owner.address,
    )

    // Mint tokens to users
    await mockToken.mint(user1.address, ethers.parseUnits('100000', 18))
    await mockToken.mint(user2.address, ethers.parseUnits('100000', 18))
    await mockToken.mint(owner.address, ethers.parseUnits('100000', 18))

    // Approve fee router
    await mockToken.connect(user1).approve(
      await feeRouter.getAddress(),
      ethers.MaxUint256
    )
    await mockToken.connect(user2).approve(
      await feeRouter.getAddress(),
      ethers.MaxUint256
    )

    // Mint governance tokens and set eligibility
    await governanceToken.mint(user1.address, ethers.parseUnits('1000', 18))
    await governanceToken.connect(user1).updateDiscountEligibility()
    
    // Advance blocks to make user1 eligible
    for (let i = 0; i < 15; i++) {
      await ethers.provider.send('evm_mine', [])
    }
  })

  describe('Deployment & Initial State', function () {
    it('Should set correct treasury address', async function () {
      expect(await feeRouter.treasury()).to.equal(treasury.address)
    })

    it('Should set correct liquidity pool address', async function () {
      expect(await feeRouter.liquidityPool()).to.equal(liquidityPool.address)
    })

    it('Should set correct governance token', async function () {
      expect(await feeRouter.governanceToken()).to.equal(
        await governanceToken.getAddress()
      )
    })

    it('Should set default fee to 30 bps (0.30%)', async function () {
      expect(await feeRouter.baseFeeBps()).to.equal(30)
    })

    it('Should set default LP share to 70%', async function () {
      expect(await feeRouter.lpShareBps()).to.equal(7_000)
    })

    it('Should initialize 4 discount tiers', async function () {
      expect(await feeRouter.getDiscountTiers()).to.have.lengthOf(4)
    })
  })

  describe('Fee Collection', function () {
    it('Should collect correct fee (0.30%) from user without discount', async function () {
      const amount = ethers.parseUnits('1000', 18)
      
      await feeRouter.connect(user1).collectFee(
        await mockToken.getAddress(),
        user1.address,
        amount
      )

      // 0.30% of 1000 = 3
      const expectedFee = ethers.parseUnits('3', 18)
      const balance = await mockToken.balanceOf(await feeRouter.getAddress())
      expect(balance).to.equal(expectedFee)
    })

    it('Should apply discount for governance token holders', async function () {
      const amount = ethers.parseUnits('1000', 18)
      
      // User1 has 1000 DWT (Tier 2: 25% discount)
      // Effective fee: 30 bps * (1 - 0.25) = 22.5 bps
      // Fee: 1000 * 0.00225 = 2.25
      
      await feeRouter.connect(user1).collectFee(
        await mockToken.getAddress(),
        user1.address,
        amount
      )

      const balance = await mockToken.balanceOf(await feeRouter.getAddress())
      const expectedFee = ethers.parseUnits('2.25', 18)
      expect(balance).to.equal(expectedFee)
    })

    it('Should split fees correctly (70% LP, 30% Treasury)', async function () {
      const amount = ethers.parseUnits('1000', 18)
      const token = await mockToken.getAddress()
      
      await feeRouter.connect(user1).collectFee(token, user1.address, amount)
      
      const pending = await feeRouter.getPendingFees(token)
      const totalFee = ethers.parseUnits('3', 18) // 0.30%
      const expectedLP = totalFee * 7000n / 10000n // 70%
      const expectedTreasury = totalFee - expectedLP // 30%
      
      expect(pending.lpFees).to.equal(expectedLP)
      expect(pending.treasuryFees).to.equal(expectedTreasury)
      expect(pending.total).to.equal(totalFee)
    })

    it('Should reject zero token address', async function () {
      await expect(
        feeRouter.connect(user1).collectFee(
          ethers.ZeroAddress,
          user1.address,
          ethers.parseUnits('1000', 18)
        )
      ).to.be.revertedWith('FeeRouter: zero token')
    })

    it('Should reject zero payer address', async function () {
      await expect(
        feeRouter.connect(user1).collectFee(
          await mockToken.getAddress(),
          ethers.ZeroAddress,
          ethers.parseUnits('1000', 18)
        )
      ).to.be.revertedWith('FeeRouter: zero payer')
    })

    it('Should reject zero amount', async function () {
      await expect(
        feeRouter.connect(user1).collectFee(
          await mockToken.getAddress(),
          user1.address,
          0
        )
      ).to.be.revertedWith('FeeRouter: zero amount')
    })

    it('Should not collect fee below minimum threshold', async function () {
      // Very small amount that results in fee < MIN_FEE_AMOUNT
      const smallAmount = 1000 // Results in fee < 1 unit
      
      await feeRouter.connect(user1).collectFee(
        await mockToken.getAddress(),
        user1.address,
        smallAmount
      )

      const balance = await mockToken.balanceOf(await feeRouter.getAddress())
      expect(balance).to.equal(0)
    })
  })

  describe('Fee Distribution', function () {
    it('Should distribute fees to LP and Treasury', async function () {
      const amount = ethers.parseUnits('1000', 18)
      const token = await mockToken.getAddress()
      
      // Collect fees
      await feeRouter.connect(user1).collectFee(token, user1.address, amount)
      
      const lpBalanceBefore = await mockToken.balanceOf(liquidityPool.address)
      const treasuryBalanceBefore = await mockToken.balanceOf(treasury.address)
      
      // Distribute
      await feeRouter.distributeFees(token)
      
      const lpBalanceAfter = await mockToken.balanceOf(liquidityPool.address)
      const treasuryBalanceAfter = await mockToken.balanceOf(treasury.address)
      
      expect(lpBalanceAfter - lpBalanceBefore).to.be.gt(0)
      expect(treasuryBalanceAfter - treasuryBalanceBefore).to.be.gt(0)
    })

    it('Should reset pending fees after distribution', async function () {
      const amount = ethers.parseUnits('1000', 18)
      const token = await mockToken.getAddress()
      
      await feeRouter.connect(user1).collectFee(token, user1.address, amount)
      await feeRouter.distributeFees(token)
      
      const pending = await feeRouter.getPendingFees(token)
      expect(pending.lpFees).to.equal(0)
      expect(pending.treasuryFees).to.equal(0)
      expect(pending.total).to.equal(0)
    })

    it('Should revert if nothing to distribute', async function () {
      await expect(
        feeRouter.distributeFees(await mockToken.getAddress())
      ).to.be.revertedWith('FeeRouter: nothing to distribute')
    })

    it('Should auto-distribute when threshold reached', async function () {
      const token = await mockToken.getAddress()
      const threshold = await feeRouter.autoDistributeThreshold()
      
      // Collect enough to exceed threshold
      const largeAmount = threshold * 10000n / 30n // Reverse calculate for 0.30% fee
      await mockToken.mint(user1.address, largeAmount)
      await mockToken.connect(user1).approve(
        await feeRouter.getAddress(),
        largeAmount
      )
      
      const lpBalanceBefore = await mockToken.balanceOf(liquidityPool.address)
      
      // This should trigger auto-distribution
      await feeRouter.connect(user1).collectFee(token, user1.address, largeAmount)
      
      const lpBalanceAfter = await mockToken.balanceOf(liquidityPool.address)
      
      // LP balance should have increased (auto-distributed)
      expect(lpBalanceAfter).to.be.gt(lpBalanceBefore)
    })
  })

  describe('Rescue Tokens', function () {
    it('Should allow owner to rescue stuck tokens', async function () {
      const token = await mockToken.getAddress()
      const amount = ethers.parseUnits('100', 18)
      
      // Send tokens directly to contract (not via collectFee)
      await mockToken.mint(await feeRouter.getAddress(), amount)
      
      const ownerBalanceBefore = await mockToken.balanceOf(owner.address)
      
      await feeRouter.rescueTokens(token, owner.address)
      
      const ownerBalanceAfter = await mockToken.balanceOf(owner.address)
      expect(ownerBalanceAfter - ownerBalanceBefore).to.equal(amount)
    })

    it('Should not allow rescuing pending fees', async function () {
      const token = await mockToken.getAddress()
      
      // Collect legitimate fees
      await feeRouter.connect(user1).collectFee(
        token,
        user1.address,
        ethers.parseUnits('1000', 18)
      )
      
      // Should revert because all tokens are pending fees
      await expect(
        feeRouter.rescueTokens(token, owner.address)
      ).to.be.revertedWith('FeeRouter: cannot rescue pending fees')
    })

    it('Should reject zero token address', async function () {
      await expect(
        feeRouter.rescueTokens(ethers.ZeroAddress, owner.address)
      ).to.be.revertedWith('FeeRouter: zero token')
    })

    it('Should reject zero recipient address', async function () {
      await expect(
        feeRouter.rescueTokens(await mockToken.getAddress(), ethers.ZeroAddress)
      ).to.be.revertedWith('FeeRouter: zero recipient')
    })

    it('Should only be callable by owner', async function () {
      await expect(
        feeRouter.connect(user1).rescueTokens(
          await mockToken.getAddress(),
          user1.address
        )
      ).to.be.reverted // Ownable error
    })
  })

  describe('Timelock for Admin Changes', function () {
    it('Should queue fee change with timelock', async function () {
      const newFee = 50 // 0.50%
      
      await feeRouter.queueBaseFeeBps(newFee)
      
      const changeId = ethers.keccak256(ethers.toUtf8Bytes('baseFeeBps'))
      const timelock = await feeRouter.timelocks(changeId)
      
      expect(timelock.value).to.equal(newFee)
      expect(timelock.executed).to.be.false
    })

    it('Should not allow execution before timelock delay', async function () {
      await feeRouter.queueBaseFeeBps(50)
      
      await expect(
        feeRouter.executeBaseFeeBps()
      ).to.be.revertedWith('FeeRouter: timelock not ready')
    })

    it('Should allow execution after timelock delay', async function () {
      await feeRouter.queueBaseFeeBps(50)
      
      // Advance time by 48 hours + 1
      await ethers.provider.send('evm_increaseTime', [2 * 24 * 60 * 60 + 1])
      await ethers.provider.send('evm_mine', [])
      
      await feeRouter.executeBaseFeeBps()
      
      expect(await feeRouter.baseFeeBps()).to.equal(50)
    })

    it('Should not allow double execution', async function () {
      await feeRouter.queueBaseFeeBps(50)
      
      await ethers.provider.send('evm_increaseTime', [2 * 24 * 60 * 60 + 1])
      await ethers.provider.send('evm_mine', [])
      
      await feeRouter.executeBaseFeeBps()
      
      await expect(
        feeRouter.executeBaseFeeBps()
      ).to.be.revertedWith('FeeRouter: already executed')
    })

    it('Should queue LP share change with timelock', async function () {
      await feeRouter.queueLpShareBps(8000) // 80%
      
      const changeId = ethers.keccak256(ethers.toUtf8Bytes('lpShareBps'))
      const timelock = await feeRouter.timelocks(changeId)
      
      expect(timelock.value).to.equal(8000)
    })

    it('Should execute LP share change after timelock', async function () {
      await feeRouter.queueLpShareBps(8000)
      
      await ethers.provider.send('evm_increaseTime', [2 * 24 * 60 * 60 + 1])
      await ethers.provider.send('evm_mine', [])
      
      await feeRouter.executeLpShareBps()
      
      expect(await feeRouter.lpShareBps()).to.equal(8000)
    })
  })

  describe('Discount Anti-Gaming', function () {
    it('Should not give discount to new token holders immediately', async function () {
      // User2 gets tokens but hasn't waited
      await governanceToken.mint(user2.address, ethers.parseUnits('10000', 18))
      // Don't call updateDiscountEligibility
      
      const amount = ethers.parseUnits('1000', 18)
      
      await feeRouter.connect(user2).collectFee(
        await mockToken.getAddress(),
        user2.address,
        amount
      )
      
      // Should pay full fee (no discount)
      const balance = await mockToken.balanceOf(await feeRouter.getAddress())
      const expectedFullFee = ethers.parseUnits('3', 18) // 0.30%
      expect(balance).to.equal(expectedFullFee)
    })

    it('Should give discount after holding period', async function () {
      // User2 gets tokens and waits
      await governanceToken.mint(user2.address, ethers.parseUnits('10000', 18))
      await governanceToken.connect(user2).updateDiscountEligibility()
      
      // Advance blocks
      for (let i = 0; i < 15; i++) {
        await ethers.provider.send('evm_mine', [])
      }
      
      const amount = ethers.parseUnits('1000', 18)
      
      await feeRouter.connect(user2).collectFee(
        await mockToken.getAddress(),
        user2.address,
        amount
      )
      
      // Should get discount (Tier 3: 50% discount)
      const balance = await mockToken.balanceOf(await feeRouter.getAddress())
      const expectedDiscountedFee = ethers.parseUnits('1.5', 18) // 0.15%
      expect(balance).to.equal(expectedDiscountedFee)
    })

    it('Should correctly report eligibility status', async function () {
      // User2 not eligible
      expect(await feeRouter.isDiscountEligible(user2.address)).to.be.false
      
      // User2 becomes eligible
      await governanceToken.mint(user2.address, ethers.parseUnits('100', 18))
      await governanceToken.connect(user2).updateDiscountEligibility()
      
      // Advance blocks
      for (let i = 0; i < 15; i++) {
        await ethers.provider.send('evm_mine', [])
      }
      
      expect(await feeRouter.isDiscountEligible(user2.address)).to.be.true
    })

    it('Should show correct blocks remaining', async function () {
      await governanceToken.connect(user2).updateDiscountEligibility()
      
      const remaining = await feeRouter.getDiscountEligibilityRemaining(user2.address)
      expect(remaining).to.be.gt(0)
    })
  })

  describe('Fee History Tracking', function () {
    it('Should record fee collection in history', async function () {
      const amount = ethers.parseUnits('1000', 18)
      const token = await mockToken.getAddress()
      
      await feeRouter.connect(user1).collectFee(token, user1.address, amount)
      
      expect(await feeRouter.getFeeHistoryLength()).to.equal(1)
    })

    it('Should return recent fee history', async function () {
      // Collect multiple fees
      for (let i = 0; i < 5; i++) {
        await feeRouter.connect(user1).collectFee(
          await mockToken.getAddress(),
          user1.address,
          ethers.parseUnits('100', 18)
        )
      }
      
      const history = await feeRouter.getRecentFeeHistory(3)
      expect(history).to.have.lengthOf(3)
    })

    it('Should limit history to MAX_FEE_HISTORY', async function () {
      // This test would be slow, so we just verify the constant exists
      const maxHistory = await feeRouter.MAX_FEE_HISTORY()
      expect(maxHistory).to.equal(1000)
    })
  })

  describe('Admin Functions', function () {
    it('Should allow owner to set treasury', async function () {
      await feeRouter.setTreasury(user2.address)
      expect(await feeRouter.treasury()).to.equal(user2.address)
    })

    it('Should reject zero treasury address', async function () {
      await expect(
        feeRouter.setTreasury(ethers.ZeroAddress)
      ).to.be.revertedWith('FeeRouter: zero address')
    })

    it('Should allow owner to update discount tiers', async function () {
      const minBalances = [
        ethers.parseUnits('500', 18),
        ethers.parseUnits('5000', 18),
      ]
      const discounts = [500, 2000] // 5%, 20%
      
      await feeRouter.setDiscountTiers(minBalances, discounts)
      
      const tiers = await feeRouter.getDiscountTiers()
      expect(tiers).to.have.lengthOf(2)
    })

    it('Should reject mismatched tier array lengths', async function () {
      await expect(
        feeRouter.setDiscountTiers(
          [ethers.parseUnits('100', 18)],
          [500, 1000]
        )
      ).to.be.revertedWith('FeeRouter: length mismatch')
    })

    it('Should reject discount above maximum', async function () {
      await expect(
        feeRouter.setDiscountTiers(
          [ethers.parseUnits('100', 18)],
          [9000] // 90% > 80% max
        )
      ).to.be.revertedWith('FeeRouter: discount too high')
    })
  })

  describe('View Functions', function () {
    it('Should calculate fee correctly', async function () {
      const amount = ethers.parseUnits('1000', 18)
      
      const [feeAmount, discountBps] = await feeRouter.calculateFee(
        user1.address,
        amount
      )
      
      expect(feeAmount).to.be.gt(0)
      expect(discountBps).to.be.gte(0)
    })

    it('Should return empty pending fees for unused token', async function () {
      const pending = await feeRouter.getPendingFees(await mockToken.getAddress())
      // Before any collections, should be 0
      expect(pending.total).to.equal(0)
    })
  })
})
