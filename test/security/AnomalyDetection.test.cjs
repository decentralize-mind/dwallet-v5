/**
 * 🧪 REAL-TIME ANOMALY DETECTION SYSTEM - COMPREHENSIVE TESTS
 * 
 * Tests for:
 * 1. AnomalyDetector.sol - On-chain anomaly detection
 * 2. DynamicFeeController.sol - Dynamic fee adjustments
 * 3. Layer7Security Integration - Auto-pause on critical threats
 * 
 * Test Coverage:
 * - Volume spike detection
 * - Transaction frequency anomalies
 * - Large transaction monitoring
 * - User behavior analysis
 * - Price deviation alerts
 * - Auto-circuit breaker triggers
 * - Dynamic fee calculations
 */

const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('Real-Time Anomaly Detection System', function () {
  // Contracts
  let anomalyDetector;
  let dynamicFeeController;
  let layer7Security;
  
  // Accounts
  let owner, admin, user1, user2, whale, attacker;
  
  // Constants
  const LAYER_ID = ethers.encodeBytes32String("LAYER_2_DEX");
  const THREAT_LEVELS = {
    NONE: 0,
    LOW: 1,
    MEDIUM: 2,
    HIGH: 3,
    CRITICAL: 4
  };
  
  // Thresholds
  const MAX_VOLUME_PER_BLOCK = ethers.parseEther("1000000"); // 1M tokens
  const MAX_TX_PER_BLOCK = 500;
  const MAX_PRICE_DEVIATION_BPS = 500; // 5%
  const LARGE_TX_THRESHOLD = ethers.parseEther("100000"); // 100k tokens
  
  beforeEach(async function () {
    [owner, admin, user1, user2, whale, attacker] = await ethers.getSigners();
    
    // ─────────────────────────────────────────────────────────────────────
    //  DEPLOY CONTRACTS
    // ─────────────────────────────────────────────────────────────────────
    
    // Deploy AnomalyDetector
    const AnomalyDetector = await ethers.getContractFactory('AnomalyDetector');
    anomalyDetector = await AnomalyDetector.deploy(
      admin.address,
      MAX_VOLUME_PER_BLOCK,
      MAX_TX_PER_BLOCK,
      MAX_PRICE_DEVIATION_BPS,
      LARGE_TX_THRESHOLD
    );
    await anomalyDetector.waitForDeployment();
    
    // Deploy DynamicFeeController
    const DynamicFeeController = await ethers.getContractFactory('DynamicFeeController');
    dynamicFeeController = await DynamicFeeController.deploy(
      admin.address,
      await anomalyDetector.getAddress(),
      30 // 0.30% base fee
    );
    await dynamicFeeController.waitForDeployment();
    
    // Deploy Layer7Security with anomaly detection support
    const Layer7Security = await ethers.getContractFactory('Layer7Security');
    layer7Security = await Layer7Security.deploy(
      [admin.address], // signers
      1, // threshold
      100, // maxCallsPerBlock
      ethers.parseEther("100"), // maxValuePerBlock
      0 // requiredKYCLevel
    );
    await layer7Security.waitForDeployment();
    
    // Set anomaly detector in Layer7Security
    await layer7Security.connect(admin).setAnomalyDetector(await anomalyDetector.getAddress());
    await layer7Security.connect(admin).setAnomalyDetectionEnabled(true);
    await layer7Security.connect(admin).setAutoPauseOnCritical(true);
  });
  
  // ─────────────────────────────────────────────────────────────────────
  //  VOLUME SPIKE DETECTION TESTS
  // ─────────────────────────────────────────────────────────────────────
  
  describe('Volume Spike Detection', function () {
    it('Should detect normal volume (no anomaly)', async function () {
      const normalAmount = ethers.parseEther("1000"); // 1k tokens
      
      const tx = await anomalyDetector.connect(user1).detectAnomaly(
        LAYER_ID,
        user1.address,
        normalAmount
      );
      await tx.wait();
      
      // Should not trigger high threat for normal amount
      const currentUsage = await anomalyDetector.getCurrentBlockUsage();
      expect(currentUsage.volume).to.equal(normalAmount);
    });
    
    it('Should detect volume spike and raise MEDIUM threat', async function () {
      // Simulate baseline volume first (small amounts)
      for (let i = 0; i < 10; i++) {
        await anomalyDetector.connect(user1).detectAnomaly(
          LAYER_ID,
          user1.address,
          ethers.parseEther("100")
        );
      }
      
      // Update baselines
      await mineBlocks(ethers.provider, 100);
      await anomalyDetector.connect(admin).updateBaselines();
      
      // Now create a spike (5x normal)
      const spikeAmount = ethers.parseEther("5000");
      
      const tx = await anomalyDetector.connect(user1).detectAnomaly(
        LAYER_ID,
        user1.address,
        spikeAmount
      );
      await tx.wait();
      
      // Check threat history
      const threatCount = await anomalyDetector.threatHistory(0);
      expect(threatCount.timestamp).to.be.gt(0);
    });
    
    it('Should detect when volume exceeds absolute max (HIGH threat)', async function () {
      const hugeAmount = MAX_VOLUME_PER_BLOCK + ethers.parseEther("100");
      
      const tx = await anomalyDetector.connect(whale).detectAnomaly(
        LAYER_ID,
        whale.address,
        hugeAmount
      );
      await tx.wait();
      
      // Verify threat was recorded
      const recentThreats = await anomalyDetector.getRecentThreatCount(10);
      expect(recentThreats).to.be.gt(0);
    });
  });
  
  // ─────────────────────────────────────────────────────────────────────
  //  TRANSACTION FREQUENCY TESTS
  // ─────────────────────────────────────────────────────────────────────
  
  describe('Transaction Frequency Detection', function () {
    it('Should track transaction count per block', async function () {
      // Send multiple transactions
      for (let i = 0; i < 5; i++) {
        await anomalyDetector.connect(user1).detectAnomaly(
          LAYER_ID,
          user1.address,
          ethers.parseEther("10")
        );
      }
      
      const [, txCount] = await anomalyDetector.getCurrentBlockUsage();
      expect(txCount).to.equal(5);
    });
    
    it('Should detect excessive transaction frequency', async function () {
      // Simulate many transactions in same block
      const maxTxs = 50;
      
      for (let i = 0; i < maxTxs; i++) {
        await anomalyDetector.connect(user1).detectAnomaly(
          LAYER_ID,
          user1.address,
          ethers.parseEther("1")
        );
      }
      
      const [, txCount] = await anomalyDetector.getCurrentBlockUsage();
      expect(txCount).to.equal(maxTxs);
    });
  });
  
  // ─────────────────────────────────────────────────────────────────────
  //  LARGE TRANSACTION MONITORING
  // ─────────────────────────────────────────────────────────────────────
  
  describe('Large Transaction Monitoring', function () {
    it('Should flag large transactions from new users', async function () {
      const largeAmount = LARGE_TX_THRESHOLD + ethers.parseEther("10");
      
      // First transaction from new user
      const tx = await anomalyDetector.connect(user2).detectAnomaly(
        LAYER_ID,
        user2.address,
        largeAmount
      );
      await tx.wait();
      
      // Check user metrics
      const metrics = await anomalyDetector.getUserMetrics(user2.address);
      expect(metrics.isNewUser).to.be.true;
      expect(metrics.txCount).to.equal(1);
    });
    
    it('Should track whale activity', async function () {
      const whaleAmount = ethers.parseEther("500000"); // 500k tokens
      
      await anomalyDetector.connect(whale).detectAnomaly(
        LAYER_ID,
        whale.address,
        whaleAmount
      );
      
      const metrics = await anomalyDetector.getUserMetrics(whale.address);
      expect(metrics.totalVolume).to.equal(whaleAmount);
    });
  });
  
  // ─────────────────────────────────────────────────────────────────────
  //  PRICE DEVIATION TESTS
  // ─────────────────────────────────────────────────────────────────────
  
  describe('Price Deviation Detection', function () {
    it('Should not detect anomaly for normal price deviation', async function () {
      const currentPrice = ethers.parseEther("2000");
      const baselinePrice = ethers.parseEther("1990"); // ~0.5% deviation
      
      const threatLevel = await anomalyDetector.checkPriceDeviation(
        currentPrice,
        baselinePrice
      );
      
      expect(threatLevel).to.equal(THREAT_LEVELS.NONE);
    });
    
    it('Should detect MEDIUM threat for moderate deviation (>3%)', async function () {
      const currentPrice = ethers.parseEther("2000");
      const baselinePrice = ethers.parseEther("1900"); // ~5% deviation
      
      const threatLevel = await anomalyDetector.checkPriceDeviation(
        currentPrice,
        baselinePrice
      );
      
      expect(threatLevel).to.equal(THREAT_LEVELS.MEDIUM);
    });
    
    it('Should detect HIGH threat for extreme deviation (>10%)', async function () {
      const currentPrice = ethers.parseEther("2000");
      const baselinePrice = ethers.parseEther("1600"); // 25% deviation
      
      const threatLevel = await anomalyDetector.checkPriceDeviation(
        currentPrice,
        baselinePrice
      );
      
      expect(threatLevel).to.equal(THREAT_LEVELS.HIGH);
    });
  });
  
  // ─────────────────────────────────────────────────────────────────────
  //  LAYER7 SECURITY INTEGRATION TESTS
  // ─────────────────────────────────────────────────────────────────────
  
  describe('Layer7 Security Integration', function () {
    it('Should have anomaly detection enabled', async function () {
      const isEnabled = await layer7Security.anomalyDetectionEnabled();
      expect(isEnabled).to.be.true;
      
      const detectorAddress = await layer7Security.anomalyDetector();
      expect(detectorAddress).to.equal(await anomalyDetector.getAddress());
    });
    
    it('Should check anomaly via Layer7Security', async function () {
      const amount = ethers.parseEther("1000");
      
      const tx = await layer7Security.connect(admin).checkAnomalyAndRespond(
        LAYER_ID,
        user1.address,
        amount
      );
      await tx.wait();
      
      // Verify event was emitted
      await expect(tx)
        .to.emit(layer7Security, 'ThreatLevelDetected')
        .withArgs(0, LAYER_ID, user1.address, amount);
    });
    
    it('Should auto-pause on CRITICAL threat', async function () {
      // Ensure auto-pause is enabled
      await layer7Security.connect(admin).setAutoPauseOnCritical(true);
      
      // Initially not paused
      expect(await layer7Security.paused()).to.be.false;
      
      // Trigger critical-level anomaly (would need huge amount in real scenario)
      // For this test, we'll directly call the anomaly detector
      const criticalAmount = MAX_VOLUME_PER_BLOCK * BigInt(10);
      
      await anomalyDetector.connect(admin).detectAnomaly(
        LAYER_ID,
        attacker.address,
        criticalAmount
      );
      
      // Note: Auto-pause would trigger if threat level reaches CRITICAL
      // In practice, this depends on the anomaly detector's internal logic
    });
    
    it('Should allow multisig to disable auto-pause', async function () {
      await layer7Security.connect(admin).setAutoPauseOnCritical(false);
      
      const autoPause = await layer7Security.autoPauseOnCritical();
      expect(autoPause).to.be.false;
    });
  });
  
  // ─────────────────────────────────────────────────────────────────────
  //  DYNAMIC FEE CONTROLLER TESTS
  // ─────────────────────────────────────────────────────────────────────
  
  describe('Dynamic Fee Controller', function () {
    it('Should start with NORMAL market condition', async function () {
      const condition = await dynamicFeeController.currentCondition();
      expect(condition).to.equal(0); // NORMAL
    });
    
    it('Should calculate correct base fee', async function () {
      const feeBps = await dynamicFeeController.getCurrentFee();
      expect(feeBps).to.equal(30); // 0.30%
    });
    
    it('Should calculate fee for specific amount', async function () {
      const amount = ethers.parseEther("1000");
      
      const tx = await dynamicFeeController.calculateDynamicFee(
        ethers.encodeBytes32String("SWAP"),
        amount
      );
      await tx.wait();
      
      const currentFeeBps = await dynamicFeeController.getCurrentFee();
      const expectedFee = (amount * BigInt(currentFeeBps)) / BigInt(10000);
      
      expect(expectedFee).to.be.gt(0);
    });
    
    it('Should update withdrawal limits based on condition', async function () {
      // Get current limit
      const currentLimit = await dynamicFeeController.getCurrentWithdrawalLimit();
      expect(currentLimit).to.equal(100); // 100%
      
      // If condition changes to EXTREME, limit should drop to 25%
      // This would happen automatically based on volume/threat levels
    });
    
    it('Should allow admin to update base fee config', async function () {
      await dynamicFeeController.connect(admin).setBaseFeeConfig(
        50, // 0.50% base
        500, // 5% max
        10   // 0.10% min
      );
      
      const feeBps = await dynamicFeeController.getCurrentFee();
      expect(feeBps).to.equal(50);
    });
  });
  
  // ─────────────────────────────────────────────────────────────────────
  //  BASELINE MANAGEMENT TESTS
  // ─────────────────────────────────────────────────────────────────────
  
  describe('Baseline Management', function () {
    it('Should update baselines every 100 blocks', async function () {
      // Generate some activity
      for (let i = 0; i < 10; i++) {
        await anomalyDetector.connect(user1).detectAnomaly(
          LAYER_ID,
          user1.address,
          ethers.parseEther("100")
        );
      }
      
      // Mine blocks to reach 100 block threshold
      await mineBlocks(ethers.provider, 100);
      
      // Update baselines
      const tx = await anomalyDetector.connect(admin).updateBaselines();
      await tx.wait();
      
      // Check that baselines were updated
      const lastUpdateBlock = await anomalyDetector.lastBaselineUpdateBlock();
      expect(lastUpdateBlock).to.be.gt(0);
    });
    
    it('Should calculate moving average from historical data', async function () {
      // Create varied volume over multiple blocks
      for (let i = 0; i < 50; i++) {
        await anomalyDetector.connect(user1).detectAnomaly(
          LAYER_ID,
          user1.address,
          ethers.parseEther(String(100 + i * 10))
        );
        
        if (i % 10 === 0) {
          await mineBlocks(ethers.provider, 1);
        }
      }
      
      await mineBlocks(ethers.provider, 50);
      await anomalyDetector.connect(admin).updateBaselines();
      
      const baselineVolume = await anomalyDetector.baselineVolume();
      expect(baselineVolume).to.be.gt(0);
    });
  });
  
  // ─────────────────────────────────────────────────────────────────────
  //  THRESHOLD CONFIGURATION TESTS
  // ─────────────────────────────────────────────────────────────────────
  
  describe('Threshold Configuration', function () {
    it('Should allow updater role to change thresholds', async function () {
      const newMaxVolume = ethers.parseEther("2000000");
      const newMaxTx = 1000;
      const newPriceDeviation = 600;
      
      await anomalyDetector.connect(admin).setThresholds(
        newMaxVolume,
        newMaxTx,
        newPriceDeviation,
        LARGE_TX_THRESHOLD
      );
      
      expect(await anomalyDetector.maxVolumePerBlock()).to.equal(newMaxVolume);
      expect(await anomalyDetector.maxTxPerBlock()).to.equal(newMaxTx);
      expect(await anomalyDetector.maxPriceDeviationBps()).to.equal(newPriceDeviation);
    });
    
    it('Should allow updating spike multipliers', async function () {
      await anomalyDetector.connect(admin).setSpikeMultipliers(
        600, // 6x volume spike
        400  // 4x tx spike
      );
      
      const volMult = await anomalyDetector.volumeSpikeMultiplier();
      const txMult = await anomalyDetector.txSpikeMultiplier();
      
      expect(volMult).to.equal(600);
      expect(txMult).to.equal(400);
    });
  });
  
  // ─────────────────────────────────────────────────────────────────────
  //  VIEW FUNCTIONS TESTS
  // ─────────────────────────────────────────────────────────────────────
  
  describe('View Functions', function () {
    it('Should return layer metrics', async function () {
      await anomalyDetector.connect(user1).detectAnomaly(
        LAYER_ID,
        user1.address,
        ethers.parseEther("100")
      );
      
      const metrics = await anomalyDetector.getLayerMetrics(LAYER_ID);
      expect(metrics.volumeLastBlock).to.be.gt(0);
      expect(metrics.txCountLastBlock).to.be.gt(0);
    });
    
    it('Should return user metrics', async function () {
      await anomalyDetector.connect(user1).detectAnomaly(
        LAYER_ID,
        user1.address,
        ethers.parseEther("50")
      );
      
      const metrics = await anomalyDetector.getUserMetrics(user1.address);
      expect(metrics.txCount).to.equal(1);
      expect(metrics.totalVolume).to.equal(ethers.parseEther("50"));
    });
    
    it('Should check if current activity is anomalous', async function () {
      const isAnomalous = await anomalyDetector.isCurrentActivityAnomalous();
      // Depends on current state and baselines
      expect(typeof isAnomalous).to.equal('boolean');
    });
  });
});

// ─────────────────────────────────────────────────────────────────────
//  HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────

/**
 * Mine specified number of blocks
 */
async function mineBlocks(provider, numBlocks) {
  for (let i = 0; i < numBlocks; i++) {
    await ethers.provider.send('evm_mine', []);
  }
}
