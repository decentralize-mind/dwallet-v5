const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ReferralPool Contract", function () {
  let referralPool;
  let dwtToken;
  let owner;
  let user1; // Referrer
  let user2; // Referee (new user)
  let user3; // Another user
  
  const REWARD_AMOUNT = ethers.utils.parseEther("10"); // 10 DWT
  const TOTAL_REWARD_PER_REFERRAL = REWARD_AMOUNT.mul(2); // 20 DWT total (10 + 10)

  beforeEach(async function () {
    // Get signers
    [owner, user1, user2, user3] = await ethers.getSigners();

    // Deploy mock DWT token
    const DWTToken = await ethers.getContractFactory("DWTToken");
    dwtToken = await DWTToken.deploy(owner.address);
    await dwtToken.deployed();

    // Deploy ReferralPool
    const ReferralPool = await ethers.getContractFactory("ReferralPool");
    referralPool = await ReferralPool.deploy(dwtToken.address, owner.address);
    await referralPool.deployed();

    // Mint tokens to owner for funding the pool
    await dwtToken.mint(owner.address, ethers.utils.parseEther("10000"));
    
    // Fund the referral pool
    await dwtToken.approve(referralPool.address, ethers.utils.parseEther("5000"));
    await referralPool.fundPool(ethers.utils.parseEther("5000"));
  });

  describe("Deployment", function () {
    it("Should set the correct DWT token address", async function () {
      expect(await referralPool.dwtToken()).to.equal(dwtToken.address);
    });

    it("Should set the correct owner", async function () {
      expect(await referralPool.owner()).to.equal(owner.address);
    });

    it("Should have correct reward amount (10 DWT)", async function () {
      expect(await referralPool.REWARD_AMOUNT()).to.equal(REWARD_AMOUNT);
    });

    it("Should have initial pool balance", async function () {
      const balance = await referralPool.getPoolBalance();
      expect(balance).to.equal(ethers.utils.parseEther("5000"));
    });
  });

  describe("Referral Rewards", function () {
    it("Should successfully process a referral and reward both parties", async function () {
      const user1BalanceBefore = await dwtToken.balanceOf(user1.address);
      const user2BalanceBefore = await dwtToken.balanceOf(user2.address);
      const poolBalanceBefore = await referralPool.getPoolBalance();

      // User2 claims referral reward with user1 as referrer
      await referralPool.connect(user2).claimReferralReward(user1.address);

      const user1BalanceAfter = await dwtToken.balanceOf(user1.address);
      const user2BalanceAfter = await dwtToken.balanceOf(user2.address);
      const poolBalanceAfter = await referralPool.getPoolBalance();

      // Both should receive 10 DWT
      expect(user1BalanceAfter.sub(user1BalanceBefore)).to.equal(REWARD_AMOUNT);
      expect(user2BalanceAfter.sub(user2BalanceBefore)).to.equal(REWARD_AMOUNT);
      
      // Pool should decrease by 20 DWT
      expect(poolBalanceBefore.sub(poolBalanceAfter)).to.equal(TOTAL_REWARD_PER_REFERRAL);
    });

    it("Should track referral statistics correctly", async function () {
      await referralPool.connect(user2).claimReferralReward(user1.address);
      
      const stats = await referralPool.getReferrerStats(user1.address);
      expect(stats.totalRefs).to.equal(1);
      expect(stats.totalRewards).to.equal(REWARD_AMOUNT);
      
      const totalReferrals = await referralPool.totalReferrals();
      expect(totalReferrals).to.equal(1);
      
      const totalDistributed = await referralPool.totalDistributed();
      expect(totalDistributed).to.equal(TOTAL_REWARD_PER_REFERRAL);
    });

    it("Should prevent double claiming", async function () {
      await referralPool.connect(user2).claimReferralReward(user1.address);
      
      await expect(
        referralPool.connect(user2).claimReferralReward(user1.address)
      ).to.be.revertedWithCustomError(referralPool, "AlreadyClaimed");
    });

    it("Should prevent self-referral", async function () {
      await expect(
        referralPool.connect(user1).claimReferralReward(user1.address)
      ).to.be.revertedWithCustomError(referralPool, "SelfReferral");
    });

    it("Should handle multiple referrals from same referrer", async function () {
      await referralPool.connect(user2).claimReferralReward(user1.address);
      await referralPool.connect(user3).claimReferralReward(user1.address);
      
      const stats = await referralPool.getReferrerStats(user1.address);
      expect(stats.totalRefs).to.equal(2);
      expect(stats.totalRewards).to.equal(REWARD_AMOUNT.mul(2));
      
      const totalReferrals = await referralPool.totalReferrals();
      expect(totalReferrals).to.equal(2);
    });

    it("Should revert if pool balance is insufficient", async function () {
      // Withdraw most of the pool balance
      const poolBalance = await referralPool.getPoolBalance();
      await referralPool.withdrawTokens(owner.address, poolBalance.sub(REWARD_AMOUNT));
      
      await expect(
        referralPool.connect(user2).claimReferralReward(user1.address)
      ).to.be.revertedWithCustomError(referralPool, "InsufficientPoolBalance");
    });
  });

  describe("View Functions", function () {
    it("Should correctly check eligibility", async function () {
      expect(await referralPool.isEligibleForReferral(user2.address)).to.be.true;
      
      await referralPool.connect(user2).claimReferralReward(user1.address);
      
      expect(await referralPool.isEligibleForReferral(user2.address)).to.be.false;
    });

    it("Should track referrer relationships", async function () {
      await referralPool.connect(user2).registerReferral(user1.address);
      
      const referrer = await referralPool.getReferrer(user2.address);
      expect(referrer).to.equal(user1.address);
    });

    it("Should calculate max referrals correctly", async function () {
      const poolBalance = await referralPool.getPoolBalance();
      const maxReferrals = await referralPool.getMaxReferrals();
      
      const expected = poolBalance.div(TOTAL_REWARD_PER_REFERRAL);
      expect(maxReferrals).to.equal(expected);
    });
  });

  describe("Admin Functions", function () {
    it("Should allow owner to pause and unpause", async function () {
      await referralPool.pause();
      expect(await referralPool.paused()).to.be.true;
      
      await expect(
        referralPool.connect(user2).claimReferralReward(user1.address)
      ).to.be.revertedWith("ReferralPool: paused");
      
      await referralPool.unpause();
      expect(await referralPool.paused()).to.be.false;
      
      // Should work now
      await referralPool.connect(user2).claimReferralReward(user1.address);
    });

    it("Should allow owner to withdraw tokens", async function () {
      const withdrawAmount = ethers.utils.parseEther("100");
      const ownerBalanceBefore = await dwtToken.balanceOf(owner.address);
      
      await referralPool.withdrawTokens(owner.address, withdrawAmount);
      
      const ownerBalanceAfter = await dwtToken.balanceOf(owner.address);
      expect(ownerBalanceAfter.sub(ownerBalanceBefore)).to.equal(withdrawAmount);
    });

    it("Should allow additional funding", async function () {
      const poolBalanceBefore = await referralPool.getPoolBalance();
      const fundAmount = ethers.utils.parseEther("1000");
      
      await dwtToken.mint(owner.address, fundAmount);
      await dwtToken.approve(referralPool.address, fundAmount);
      await referralPool.fundPool(fundAmount);
      
      const poolBalanceAfter = await referralPool.getPoolBalance();
      expect(poolBalanceAfter.sub(poolBalanceBefore)).to.equal(fundAmount);
    });

    it("Should prevent non-owner from pausing", async function () {
      await expect(
        referralPool.connect(user1).pause()
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should prevent non-owner from withdrawing", async function () {
      await expect(
        referralPool.connect(user1).withdrawTokens(user1.address, ethers.utils.parseEther("100"))
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Edge Cases", function () {
    it("Should handle zero address validation", async function () {
      await expect(
        referralPool.connect(user2).claimReferralReward(ethers.constants.AddressZero)
      ).to.be.revertedWithCustomError(referralPool, "ZeroAddress");
    });

    it("Should emit correct events", async function () {
      await expect(referralPool.connect(user2).claimReferralReward(user1.address))
        .to.emit(referralPool, "ReferralRegistered")
        .withArgs(user2.address, user1.address, await ethers.provider.getBlock("latest").then(b => b.timestamp + 1))
        .and.to.emit(referralPool, "ReferralRewardClaimed")
        .withArgs(user2.address, REWARD_AMOUNT, await ethers.provider.getBlock("latest").then(b => b.timestamp + 1))
        .and.to.emit(referralPool, "ReferralRewardClaimed")
        .withArgs(user1.address, REWARD_AMOUNT, await ethers.provider.getBlock("latest").then(b => b.timestamp + 1));
    });
  });
});
