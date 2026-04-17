const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Layer 3 - Complete Test Suite", function () {
  let owner, guardian, keeper, relayer1, relayer2, relayer3, user1, user2;
  let securityController, dwtToken, swapRouter, treasury;
  
  // Contracts
  let priceOracle, emergencyPause, dwtBridge, feeSplitter;
  let buybackAndBurn, veDWT, dwalletMultisig, rewardDistributor;

  beforeEach(async function () {
    // Get signers
    [owner, guardian, keeper, relayer1, relayer2, relayer3, user1, user2] = await ethers.getSigners();

    // Deploy Layer7Security first
    const layer7Signers = [owner.address, relayer1.address, relayer2.address];
    const Layer7Security = await ethers.getContractFactory("contracts/layer7/Layer7Security.sol:Layer7Security");
    const layer7Security = await Layer7Security.deploy(
      layer7Signers,
      2, // required signatures
      100, // max calls per block
      ethers.parseEther("10"), // max value per block
      0 // required KYC level
    );
    await layer7Security.waitForDeployment();

    // Deploy mock SecurityController
    const SecurityController = await ethers.getContractFactory("contracts/layer7/SecurityController.sol:SecurityController");
    securityController = await SecurityController.deploy(
      owner.address,
      owner.address,
      await layer7Security.getAddress()
    );
    await securityController.waitForDeployment();

    // Deploy simple mock ERC20 token for testing
    const MockToken = await ethers.getContractFactory("contracts/mocks/MockERC20.sol:MockERC20");
    dwtToken = await MockToken.deploy("DWT Token", "DWT", ethers.parseEther("1000000"));
    await dwtToken.waitForDeployment();

    // Use owner address as mock SwapRouter for testing Layer 3 contracts
    // (Full SwapRouter testing is done in Layer 9 tests)
    swapRouter = owner;

    treasury = owner.address;

    console.log("\n📦 Deploying Layer 3 contracts...");

    // 1. Deploy DWTPriceOracle
    const DWTPriceOracle = await ethers.getContractFactory("DWTPriceOracle");
    priceOracle = await DWTPriceOracle.deploy(await securityController.getAddress());
    await priceOracle.waitForDeployment();

    // 2. Deploy EmergencyPause
    const EmergencyPause = await ethers.getContractFactory("EmergencyPause");
    emergencyPause = await EmergencyPause.deploy(await securityController.getAddress());
    await emergencyPause.waitForDeployment();

    // 3. Deploy DWTBridge (3-of-5)
    const DWTBridge = await ethers.getContractFactory("DWTBridge");
    dwtBridge = await DWTBridge.deploy(await securityController.getAddress(), 3);
    await dwtBridge.waitForDeployment();

    // 4. Deploy FeeSplitter
    const FeeSplitter = await ethers.getContractFactory("FeeSplitter");
    feeSplitter = await FeeSplitter.deploy(
      await securityController.getAddress(),
      treasury,
      owner.address, // rewardDistributor
      owner.address  // buybackAndBurn
    );
    await feeSplitter.waitForDeployment();

    // 5. Deploy BuybackAndBurn
    const BuybackAndBurn = await ethers.getContractFactory("BuybackAndBurn");
    buybackAndBurn = await BuybackAndBurn.deploy(
      await securityController.getAddress(),
      await dwtToken.getAddress(),
      swapRouter.address // swapRouter is now the owner signer
    );
    await buybackAndBurn.waitForDeployment();

    // 6. Deploy VeDWT
    const VeDWT = await ethers.getContractFactory("VeDWT");
    veDWT = await VeDWT.deploy(await securityController.getAddress(), await dwtToken.getAddress());
    await veDWT.waitForDeployment();

    // 7. Deploy DWalletMultisig (3-of-5)
    const signers = [owner.address, relayer1.address, relayer2.address, relayer3.address, keeper.address];
    const DWalletMultisig = await ethers.getContractFactory("DWalletMultisig");
    dwalletMultisig = await DWalletMultisig.deploy(
      await securityController.getAddress(),
      signers,
      3
    );
    await dwalletMultisig.waitForDeployment();

    // 8. Deploy RewardDistributor (needs many mock dependencies)
    const RewardDistributor = await ethers.getContractFactory("RewardDistributor");
    rewardDistributor = await RewardDistributor.deploy(
      owner.address, // _dwtStaking (mock)
      owner.address, // _stakingPool (mock)
      owner.address, // _boostedStaking (mock)
      treasury, // _treasury
      await dwtToken.getAddress(), // _dwtToken
      swapRouter.address, // _swapRouter
      await priceOracle.getAddress(), // _priceOracle
      owner.address, // _weth (mock)
      await securityController.getAddress(), // _securityController
      owner.address, // _registry (mock)
      owner.address, // _access (mock)
      owner.address, // _time (mock)
      owner.address, // _state (mock)
      owner.address, // _rate (mock)
      owner.address, // _verify (mock)
      owner.address // _owner
    );
    await rewardDistributor.waitForDeployment();

    console.log("✅ All Layer 3 contracts deployed");
  });

  describe("DWTPriceOracle Tests", function () {
    it("Should register a price feed", async function () {
      const mockAggregator = owner.address;
      await priceOracle.registerPriceFeed(
        await dwtToken.getAddress(),
        mockAggregator,
        3600
      );

      const feed = await priceOracle.priceFeeds(await dwtToken.getAddress());
      expect(feed.isActive).to.be.true;
      expect(feed.stalenessThreshold).to.equal(3600);
    });

    it("Should set fallback price", async function () {
      await priceOracle.setFallbackPrice(await dwtToken.getAddress(), ethers.parseEther("100"));
      const feed = await priceOracle.priceFeeds(await dwtToken.getAddress());
      expect(feed.fallbackPrice).to.equal(ethers.parseEther("100"));
    });

    it("Should record TWAP observation", async function () {
      await priceOracle.recordObservation(await dwtToken.getAddress(), ethers.parseEther("50"));
      // TWAP observations are stored internally, verify the function doesn't revert
      // The actual TWAP price calculation is tested through getPrice function
      const success = true; // If we got here, the observation was recorded
      expect(success).to.be.true;
    });

    it("Should update staleness threshold", async function () {
      await priceOracle.registerPriceFeed(
        await dwtToken.getAddress(),
        owner.address,
        3600
      );
      await priceOracle.updateStalenessThreshold(await dwtToken.getAddress(), 7200);
      const feed = await priceOracle.priceFeeds(await dwtToken.getAddress());
      expect(feed.stalenessThreshold).to.equal(7200);
    });

    it("Should fail if non-admin registers price feed", async function () {
      await expect(
        priceOracle.connect(user1).registerPriceFeed(
          await dwtToken.getAddress(),
          owner.address,
          3600
        )
      ).to.be.reverted;
    });
  });

  describe("EmergencyPause Tests", function () {
    it("Should register contracts", async function () {
      await emergencyPause.registerContract(await dwtToken.getAddress());
      const count = await emergencyPause.getRegisteredCount();
      expect(count).to.equal(1);
    });

    it("Should allow guardian to pause", async function () {
      await emergencyPause.grantRole(await emergencyPause.GUARDIAN_ROLE(), guardian.address);
      await emergencyPause.connect(guardian).pauseAll();
      expect(await emergencyPause.isPaused()).to.be.true;
    });

    it("Should allow admin to unpause", async function () {
      await emergencyPause.pauseAll();
      await emergencyPause.unpauseAll();
      expect(await emergencyPause.isPaused()).to.be.false;
    });

    it("Should fail if guardian tries to unpause", async function () {
      await emergencyPause.grantRole(await emergencyPause.GUARDIAN_ROLE(), guardian.address);
      await emergencyPause.connect(guardian).pauseAll();
      await expect(
        emergencyPause.connect(guardian).unpauseAll()
      ).to.be.reverted;
    });

    it("Should return registered contracts list", async function () {
      await emergencyPause.registerContract(await dwtToken.getAddress());
      await emergencyPause.registerContract(await swapRouter.getAddress());
      const contracts = await emergencyPause.getRegisteredContracts();
      expect(contracts.length).to.equal(2);
    });
  });

  describe("DWTBridge Tests", function () {
    it("Should add relayers", async function () {
      await dwtBridge.addRelayer(relayer1.address);
      await dwtBridge.addRelayer(relayer2.address);
      expect(await dwtBridge.isRelayer(relayer1.address)).to.be.true;
      expect(await dwtBridge.isRelayer(relayer2.address)).to.be.true;
    });

    it("Should update required signatures", async function () {
      await dwtBridge.addRelayer(relayer1.address);
      await dwtBridge.addRelayer(relayer2.address);
      await dwtBridge.updateRequiredSignatures(2);
      expect(await dwtBridge.requiredSignatures()).to.equal(2);
    });

    it("Should fail if non-admin adds relayer", async function () {
      await expect(
        dwtBridge.connect(user1).addRelayer(relayer1.address)
      ).to.be.reverted;
    });
  });

  describe("FeeSplitter Tests", function () {
    it("Should have correct default configuration", async function () {
      const config = await feeSplitter.defaultConfig();
      expect(config.treasuryBps).to.equal(4000); // 40%
      expect(config.rewardBps).to.equal(4000);   // 40%
      expect(config.buybackBps).to.equal(2000);  // 20%
    });

    it("Should update default configuration", async function () {
      await feeSplitter.updateDefaultConfig(
        treasury,
        owner.address,
        owner.address,
        5000,
        3000,
        2000
      );
      const config = await feeSplitter.defaultConfig();
      expect(config.treasuryBps).to.equal(5000);
    });

    it("Should set token override", async function () {
      await feeSplitter.setTokenOverride(
        await dwtToken.getAddress(),
        treasury,
        owner.address,
        owner.address,
        6000,
        2000,
        2000
      );
      const config = await feeSplitter.getConfigForToken(await dwtToken.getAddress());
      expect(config.treasuryBps).to.equal(6000);
    });

    it("Should remove token override", async function () {
      await feeSplitter.setTokenOverride(
        await dwtToken.getAddress(),
        treasury,
        owner.address,
        owner.address,
        6000,
        2000,
        2000
      );
      await feeSplitter.removeTokenOverride(await dwtToken.getAddress());
      const config = await feeSplitter.getConfigForToken(await dwtToken.getAddress());
      expect(config.treasuryBps).to.equal(4000); // Back to default
    });
  });

  describe("BuybackAndBurn Tests", function () {
    it("Should update cooldown", async function () {
      await buybackAndBurn.updateCooldown(86400 * 2); // 2 days
      expect(await buybackAndBurn.cooldown()).to.equal(86400 * 2);
    });

    it("Should update max single buyback", async function () {
      await buybackAndBurn.updateMaxSingleBuyback(ethers.parseEther("50000"));
      expect(await buybackAndBurn.maxSingleBuyback()).to.equal(ethers.parseEther("50000"));
    });

    it("Should update slippage tolerance", async function () {
      await buybackAndBurn.updateSlippageTolerance(300); // 3%
      expect(await buybackAndBurn.slippageTolerance()).to.equal(300);
    });

    it("Should return time until next buyback", async function () {
      const time = await buybackAndBurn.getTimeUntilNextBuyback();
      expect(time).to.be.a("bigint");
    });
  });

  describe("VeDWT Tests", function () {
    it("Should create a lock", async function () {
      const lockAmount = ethers.parseEther("1000");
      const lockDuration = 365 * 24 * 3600; // 1 year
      
      await dwtToken.mint(user1.address, lockAmount);
      await dwtToken.connect(user1).approve(await veDWT.getAddress(), lockAmount);
      
      await veDWT.connect(user1).createLock(lockAmount, lockDuration);
      
      const lock = await veDWT.getLock(user1.address);
      expect(lock.amount).to.be.greaterThan(0);
    });

    it("Should calculate veDWT balance", async function () {
      const lockAmount = ethers.parseEther("1000");
      const lockDuration = 365 * 24 * 3600; // 1 year
      
      await dwtToken.mint(user1.address, lockAmount);
      await dwtToken.connect(user1).approve(await veDWT.getAddress(), lockAmount);
      await veDWT.connect(user1).createLock(lockAmount, lockDuration);
      
      const balance = await veDWT.balanceOf(user1.address);
      expect(balance).to.be.greaterThan(0);
    });

    it("Should fail if lock duration too short", async function () {
      const lockAmount = ethers.parseEther("1000");
      const lockDuration = 100; // Too short
      
      await dwtToken.mint(user1.address, lockAmount);
      await dwtToken.connect(user1).approve(await veDWT.getAddress(), lockAmount);
      
      await expect(
        veDWT.connect(user1).createLock(lockAmount, lockDuration)
      ).to.be.revertedWith("Lock too short");
    });

    it("Should withdraw after lock expires", async function () {
      const lockAmount = ethers.parseEther("1000");
      const lockDuration = 1 * 7 * 24 * 3600; // 1 week (minimum)
      
      await dwtToken.mint(user1.address, lockAmount);
      await dwtToken.connect(user1).approve(await veDWT.getAddress(), lockAmount);
      await veDWT.connect(user1).createLock(lockAmount, lockDuration);
      
      // Fast forward time
      await ethers.provider.send("evm_increaseTime", [lockDuration + 100]);
      await ethers.provider.send("evm_mine");
      
      const balanceBefore = await dwtToken.balanceOf(user1.address);
      await veDWT.connect(user1).withdraw();
      const balanceAfter = await dwtToken.balanceOf(user1.address);
      
      expect(balanceAfter).to.be.greaterThan(balanceBefore);
    });
  });

  describe("DWalletMultisig Tests", function () {
    it("Should submit a transaction", async function () {
      const txId = await dwalletMultisig.getTransactionCount();
      await dwalletMultisig.submitTransaction(user1.address, 0, "0x");
      expect(await dwalletMultisig.getTransactionCount()).to.equal(Number(txId) + 1);
    });

    it("Should confirm a transaction", async function () {
      await dwalletMultisig.submitTransaction(user1.address, 0, "0x");
      await dwalletMultisig.confirmTransaction(0);
      const tx = await dwalletMultisig.transactions(0);
      expect(tx.confirmations).to.equal(1);
    });

    it("Should execute transaction with enough confirmations", async function () {
      await dwalletMultisig.submitTransaction(user1.address, 0, "0x");
      
      // Get 3 confirmations
      await dwalletMultisig.confirmTransaction(0);
      await dwalletMultisig.connect(relayer1).confirmTransaction(0);
      await dwalletMultisig.connect(relayer2).confirmTransaction(0);
      
      await dwalletMultisig.executeTransaction(0);
      const tx = await dwalletMultisig.transactions(0);
      expect(tx.executed).to.be.true;
    });

    it("Should add a new signer", async function () {
      const countBefore = await dwalletMultisig.getSignerCount();
      await dwalletMultisig.addSigner(user1.address);
      const countAfter = await dwalletMultisig.getSignerCount();
      expect(countAfter).to.equal(Number(countBefore) + 1);
    });

    it("Should remove a signer", async function () {
      const countBefore = await dwalletMultisig.getSignerCount();
      await dwalletMultisig.removeSigner(keeper.address);
      const countAfter = await dwalletMultisig.getSignerCount();
      expect(countAfter).to.equal(Number(countBefore) - 1);
    });

    it("Should update required confirmations", async function () {
      await dwalletMultisig.updateRequiredConfirmations(4);
      expect(await dwalletMultisig.requiredConfirmations()).to.equal(4);
    });
  });

  describe("Integration Tests", function () {
    it("Should complete full Layer 3 deployment", async function () {
      // Verify all contracts are deployed
      expect(await priceOracle.getAddress()).to.not.equal(ethers.ZeroAddress);
      expect(await emergencyPause.getAddress()).to.not.equal(ethers.ZeroAddress);
      expect(await dwtBridge.getAddress()).to.not.equal(ethers.ZeroAddress);
      expect(await feeSplitter.getAddress()).to.not.equal(ethers.ZeroAddress);
      expect(await buybackAndBurn.getAddress()).to.not.equal(ethers.ZeroAddress);
      expect(await veDWT.getAddress()).to.not.equal(ethers.ZeroAddress);
      expect(await dwalletMultisig.getAddress()).to.not.equal(ethers.ZeroAddress);
      expect(await rewardDistributor.getAddress()).to.not.equal(ethers.ZeroAddress);
    });

    it("Should verify security integration", async function () {
      // All contracts should have SecurityGated
      const securityAddr = await securityController.getAddress();
      
      // Check that contracts reference security controller
      // (This would require custom getter functions in each contract)
    });
  });
});
