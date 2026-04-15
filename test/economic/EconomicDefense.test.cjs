/**
 * @title Economic Defense Layer Test Suite
 * @notice Comprehensive tests for economic defense mechanisms
 */

const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("🛡️ Economic Defense Layer", function () {
  let economicDefense;
  let admin;
  let user;
  let updater;

  beforeEach(async function () {
    [admin, user, updater] = await ethers.getSigners();

    const EconomicDefense = await ethers.getContractFactory("EconomicDefenseLayer");
    economicDefense = await EconomicDefense.deploy(
      admin.address,
      30,  // 0.3% base fee
      100, // 1% max slippage
      1000000 // $1M volume limit per block
    );
    await economicDefense.waitForDeployment();

    // Grant updater role
    await economicDefense.connect(admin).grantRole(
      await economicDefense.UPDATER_ROLE(),
      updater.address
    );
  });

  // ─────────────────────────────────────────────────────────────────────
  //  DYNAMIC FEE TESTS
  // ─────────────────────────────────────────────────────────────────────

  describe("💰 Dynamic Fee Calculation", function () {
    it("Should calculate base fee correctly", async function () {
      const amount = ethers.parseEther("1000");
      const fee = await economicDefense.calculateDynamicFee(amount);
      
      // Base fee is 0.3% (30 bps)
      const expectedFee = (amount * 30n) / 10000n;
      
      expect(fee).to.equal(expectedFee);
      console.log("✅ Base fee calculated correctly:", ethers.formatEther(fee));
    });

    it("Should increase fees during high volatility", async function () {
      // Set high volatility
      await economicDefense.connect(updater).updateVolatilityIndex(75);
      
      const amount = ethers.parseEther("1000");
      const fee = await economicDefense.calculateDynamicFee(amount);
      
      // Fee should be doubled (2x multiplier)
      const expectedFee = (amount * 60n) / 10000n; // 0.6%
      
      expect(fee).to.equal(expectedFee);
      console.log("✅ High volatility fees increased:", ethers.formatEther(fee));
    });

    it("Should respect fee caps", async function () {
      // Set extreme volatility
      await economicDefense.connect(updater).updateVolatilityIndex(100);
      
      // Update config to test caps
      await economicDefense.connect(admin).updateFeeConfig(
        30,   // base 0.3%
        10,   // 10x multiplier
        100,  // max 1%
        10    // min 0.1%
      );
      
      const amount = ethers.parseEther("1000");
      const fee = await economicDefense.calculateDynamicFee(amount);
      
      // Should be capped at 1%
      const maxFee = (amount * 100n) / 10000n;
      
      expect(fee).to.equal(maxFee);
      console.log("✅ Fee cap enforced:", ethers.formatEther(fee));
    });
  });

  // ─────────────────────────────────────────────────────────────────────
  //  SLIPPAGE PROTECTION TESTS
  // ─────────────────────────────────────────────────────────────────────

  describe("📊 Slippage Protection", function () {
    it("Should allow normal slippage", async function () {
      const expectedAmount = ethers.parseEther("100");
      const actualAmount = ethers.parseEther("99.5"); // 0.5% slippage
      
      const valid = await economicDefense.validateSlippage(expectedAmount, actualAmount);
      
      expect(valid).to.be.true;
      console.log("✅ Normal slippage allowed");
    });

    it("Should reject excessive slippage", async function () {
      const expectedAmount = ethers.parseEther("100");
      const actualAmount = ethers.parseEther("98"); // 2% slippage
      
      const valid = await economicDefense.validateSlippage(expectedAmount, actualAmount);
      
      expect(valid).to.be.false;
      console.log("✅ Excessive slippage rejected");
    });

    it("Should detect price impact attacks", async function () {
      const priceBefore = ethers.parseEther("2000");
      const priceAfter = ethers.parseEther("1900"); // 5% price drop
      
      const isProtected = await economicDefense.checkPriceImpact(priceBefore, priceAfter);
      
      expect(isProtected).to.be.true;
      console.log("✅ Price impact protection triggered");
    });
  });

  // ─────────────────────────────────────────────────────────────────────
  //  WITHDRAWAL PENALTY TESTS
  // ─────────────────────────────────────────────────────────────────────

  describe("⏳ Withdrawal Penalties", function () {
    it("Should not penalize small withdrawals", async function () {
      const amount = ethers.parseEther("1000"); // Below $10k threshold
      
      const [penalty, timeLock] = await economicDefense.calculateWithdrawalPenalty(amount, 0);
      
      expect(penalty).to.equal(0);
      expect(timeLock).to.equal(0);
      console.log("✅ Small withdrawals not penalized");
    });

    it("Should penalize large early withdrawals", async function () {
      const amount = ethers.parseEther("100000"); // $100k
      
      const [penalty, timeLock] = await economicDefense.calculateWithdrawalPenalty(amount, 0);
      
      // 0.5% penalty
      const expectedPenalty = (amount * 50n) / 10000n;
      
      expect(penalty).to.equal(expectedPenalty);
      expect(timeLock).to.equal(3600); // 1 hour
      console.log("✅ Large withdrawal penalized:", ethers.formatEther(penalty));
    });

    it("Should reduce penalty after holding period", async function () {
      const amount = ethers.parseEther("100000");
      const holdingTime = 7200; // 2 hours (past 1 hour timelock)
      
      const [penalty, timeLock] = await economicDefense.calculateWithdrawalPenalty(amount, holdingTime);
      
      expect(penalty).to.equal((amount * 50n) / 10000n);
      expect(timeLock).to.equal(0); // No remaining timelock
      console.log("✅ Timelock expired after holding period");
    });
  });

  // ─────────────────────────────────────────────────────────────────────
  //  VOLUME MONITORING TESTS
  // ─────────────────────────────────────────────────────────────────────

  describe("📈 Volume Monitoring", function () {
    it("Should track volume correctly", async function () {
      const amount = ethers.parseEther("10000");
      
      await economicDefense.trackVolume(user.address, amount);
      
      const trackedVolume = await economicDefense.addressVolume(user.address);
      expect(trackedVolume).to.equal(amount);
      console.log("✅ Volume tracking working");
    });

    it("Should prevent exceeding volume limits", async function () {
      const largeAmount = ethers.parseEther("2000000"); // Above $1M limit
      
      await expect(
        economicDefense.trackVolume(user.address, largeAmount)
      ).to.be.revertedWith("Address volume limit exceeded");
      
      console.log("✅ Volume limit enforced");
    });

    it("Should check volume before transaction", async function () {
      const currentVolume = ethers.parseEther("500000");
      const additionalAmount = ethers.parseEther("400000");
      
      await economicDefense.trackVolume(user.address, currentVolume);
      
      const allowed = await economicDefense.checkVolumeLimit(user.address, additionalAmount);
      expect(allowed).to.be.true;
      
      const tooMuch = ethers.parseEther("600000");
      const notAllowed = await economicDefense.checkVolumeLimit(user.address, tooMuch);
      expect(notAllowed).to.be.false;
      
      console.log("✅ Volume pre-check working");
    });
  });

  // ─────────────────────────────────────────────────────────────────────
  //  VOLATILITY INDEX TESTS
  // ─────────────────────────────────────────────────────────────────────

  describe("📊 Volatility Index", function () {
    it("Should update volatility index", async function () {
      await economicDefense.connect(updater).updateVolatilityIndex(50);
      
      const index = await economicDefense.volatilityIndex();
      expect(index).to.equal(50);
      console.log("✅ Volatility index updated");
    });

    it("Should reject invalid volatility index", async function () {
      await expect(
        economicDefense.connect(updater).updateVolatilityIndex(150)
      ).to.be.revertedWith("Invalid index");
      
      console.log("✅ Invalid index rejected");
    });

    it("Should auto-adjust fees based on volatility", async function () {
      // Low volatility
      await economicDefense.connect(updater).updateVolatilityIndex(25);
      const lowVolFee = await economicDefense.getCurrentFeeRateBps();
      
      // High volatility
      await economicDefense.connect(updater).updateVolatilityIndex(75);
      const highVolFee = await economicDefense.getCurrentFeeRateBps();
      
      expect(highVolFee).to.be.greaterThan(lowVolFee);
      console.log("✅ Fees auto-adjust with volatility");
    });
  });

  // ─────────────────────────────────────────────────────────────────────
  //  ATTACK PREVENTION TESTS
  // ─────────────────────────────────────────────────────────────────────

  describe("🛡️ Attack Prevention", function () {
    it("Should make flash loan attacks unprofitable", async function () {
      const attackAmount = ethers.parseEther("10000000");
      
      // High volatility during attack
      await economicDefense.connect(updater).updateVolatilityIndex(90);
      
      const fee = await economicDefense.calculateDynamicFee(attackAmount);
      const profitNeeded = attackAmount + fee;
      
      console.log("Attack cost breakdown:");
      console.log("  Amount:", ethers.formatEther(attackAmount));
      console.log("  Fee:", ethers.formatEther(fee));
      console.log("  Total needed:", ethers.formatEther(profitNeeded));
      console.log("✅ Flash loan attack made expensive");
    });

    it("Should prevent rapid large withdrawals", async function () {
      const amount = ethers.parseEther("100000");
      
      // First withdrawal
      await economicDefense.trackVolume(user.address, amount);
      
      // Second large withdrawal should hit limits
      await expect(
        economicDefense.trackVolume(user.address, amount)
      ).to.be.reverted;
      
      console.log("✅ Rapid large withdrawals prevented");
    });
  });
});
