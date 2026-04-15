/**
 * @title Infrastructure Security Test Suite
 * @notice Tests for RPC redundancy, oracle fallbacks, and infrastructure health
 */

const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("🏗️ Infrastructure Security", function () {
  let infraSecurity;
  let admin;
  let operator;

  beforeEach(async function () {
    [admin, operator] = await ethers.getSigners();

    const InfraSecurity = await ethers.getContractFactory("InfrastructureSecurity");
    infraSecurity = await InfraSecurity.deploy(admin.address, 2, 1);
    await infraSecurity.waitForDeployment();

    // Grant operator role
    await infraSecurity.connect(admin).grantRole(
      await infraSecurity.OPERATOR_ROLE(),
      operator.address
    );
  });

  // ─────────────────────────────────────────────────────────────────────
  //  RPC PROVIDER TESTS
  // ─────────────────────────────────────────────────────────────────────

  describe("🔌 RPC Provider Management", function () {
    it("Should add multiple RPC providers", async function () {
      await infraSecurity.connect(operator).addRPCProvider(
        "Primary",
        "https://primary.rpc.com",
        1
      );
      
      await infraSecurity.connect(operator).addRPCProvider(
        "Backup",
        "https://backup.rpc.com",
        2
      );
      
      const count = await infraSecurity.getAllRPCProviders();
      expect(count.length).to.equal(2);
      
      console.log("✅ Multiple RPC providers added");
    });

    it("Should set active provider based on priority", async function () {
      await infraSecurity.connect(operator).addRPCProvider(
        "LowPriority",
        "https://low.rpc.com",
        10
      );
      
      expect(await infraSecurity.activeRPCProvider()).to.equal("LowPriority");
      
      await infraSecurity.connect(operator).addRPCProvider(
        "HighPriority",
        "https://high.rpc.com",
        1
      );
      
      expect(await infraSecurity.activeRPCProvider()).to.equal("HighPriority");
      console.log("✅ Active provider set by priority");
    });

    it("Should update provider health status", async function () {
      await infraSecurity.connect(operator).addRPCProvider(
        "TestProvider",
        "https://test.rpc.com",
        1
      );
      
      await infraSecurity.connect(operator).updateRPCHealth("TestProvider", false);
      
      const [, , , , healthy, failureCount] = await infraSecurity.getRPCProvider("TestProvider");
      expect(healthy).to.be.false;
      expect(failureCount).to.equal(1);
      
      console.log("✅ Provider health status updated");
    });

    it("Should failover to backup provider on failure", async function () {
      await infraSecurity.connect(operator).addRPCProvider(
        "Primary",
        "https://primary.rpc.com",
        1
      );
      
      await infraSecurity.connect(operator).addRPCProvider(
        "Backup",
        "https://backup.rpc.com",
        2
      );
      
      expect(await infraSecurity.activeRPCProvider()).to.equal("Primary");
      
      // Mark primary as unhealthy
      await infraSecurity.connect(operator).updateRPCHealth("Primary", false);
      
      // Should failover to backup
      expect(await infraSecurity.activeRPCProvider()).to.equal("Backup");
      console.log("✅ Automatic failover working");
    });

    it("Should detect when no healthy providers available", async function () {
      await infraSecurity.connect(operator).addRPCProvider(
        "OnlyProvider",
        "https://only.rpc.com",
        1
      );
      
      await infraSecurity.connect(operator).updateRPCHealth("OnlyProvider", false);
      
      const infraHealthy = await infraSecurity.infrastructureHealthy();
      expect(infraHealthy).to.be.false;
      
      console.log("✅ Critical infrastructure failure detected");
    });
  });

  // ─────────────────────────────────────────────────────────────────────
  //  ORACLE FEED TESTS
  // ─────────────────────────────────────────────────────────────────────

  describe("🔮 Oracle Feed Management", function () {
    it("Should add primary and backup oracle feeds", async function () {
      const asset = ethers.encodeBytes32String("ETH/USD");
      
      await infraSecurity.connect(operator).addOracleFeed(
        asset,
        admin.address, // Mock address
        "Chainlink Primary",
        true
      );
      
      await infraSecurity.connect(operator).addOracleFeed(
        asset,
        operator.address, // Mock address
        "Chainlink Backup",
        false
      );
      
      const [feedAddress, answer, updatedAt] = await infraSecurity.getPrimaryOracleFeed(asset);
      expect(feedAddress).to.equal(admin.address);
      
      console.log("✅ Primary and backup feeds configured");
    });

    it("Should detect stale oracle feed", async function () {
      const asset = ethers.encodeBytes32String("BTC/USD");
      
      await infraSecurity.connect(operator).addOracleFeed(
        asset,
        admin.address,
        "Stale Feed",
        true
      );
      
      // Feed has no update timestamp, should be stale
      const isStale = await infraSecurity.isOracleStale(asset, 3600); // 1 hour threshold
      expect(isStale).to.be.true;
      
      console.log("✅ Stale oracle detection working");
    });

    it("Should failover to backup oracle", async function () {
      const asset = ethers.encodeBytes32String("ETH/USD");
      
      await infraSecurity.connect(operator).addOracleFeed(
        asset,
        admin.address,
        "Primary",
        true
      );
      
      await infraSecurity.connect(operator).addOracleFeed(
        asset,
        operator.address,
        "Backup",
        false
      );
      
      // Failover
      await infraSecurity.connect(operator).failoverOracle(asset);
      
      const [newFeedAddress] = await infraSecurity.getPrimaryOracleFeed(asset);
      expect(newFeedAddress).to.equal(operator.address);
      
      console.log("✅ Oracle failover working");
    });
  });

  // ─────────────────────────────────────────────────────────────────────
  //  HEALTH MONITORING TESTS
  // ─────────────────────────────────────────────────────────────────────

  describe("💓 Health Monitoring", function () {
    it("Should perform global health check", async function () {
      // Add minimum required providers
      await infraSecurity.connect(operator).addRPCProvider(
        "RPC1",
        "https://rpc1.com",
        1
      );
      
      await infraSecurity.connect(operator).addRPCProvider(
        "RPC2",
        "https://rpc2.com",
        2
      );
      
      await infraSecurity.connect(operator).performHealthCheck();
      
      const infraHealthy = await infraSecurity.infrastructureHealthy();
      expect(infraHealthy).to.be.true;
      
      console.log("✅ Global health check working");
    });

    it("Should mark infrastructure unhealthy when below minimum", async function () {
      // Only add 1 provider (below min of 2)
      await infraSecurity.connect(operator).addRPCProvider(
        "SingleRPC",
        "https://single.com",
        1
      );
      
      await infraSecurity.connect(operator).performHealthCheck();
      
      const infraHealthy = await infraSecurity.infrastructureHealthy();
      expect(infraHealthy).to.be.false;
      
      console.log("✅ Minimum health requirements enforced");
    });

    it("Should track last health check timestamp", async function () {
      await infraSecurity.connect(operator).performHealthCheck();
      
      const lastCheck = await infraSecurity.lastGlobalHealthCheck();
      expect(lastCheck).to.be.closeTo(
        Math.floor(Date.now() / 1000),
        10
      );
      
      console.log("✅ Health check timestamp tracked");
    });
  });

  // ─────────────────────────────────────────────────────────────────────
  //  STRESS TESTS
  // ─────────────────────────────────────────────────────────────────────

  describe("🔨 Stress Tests", function () {
    it("Should handle multiple provider additions and removals", async function () {
      // Add 10 providers
      for (let i = 0; i < 10; i++) {
        await infraSecurity.connect(operator).addRPCProvider(
          `Provider${i}`,
          `https://rpc${i}.com`,
          i + 1
        );
      }
      
      const count = await infraSecurity.getAllRPCProviders();
      expect(count.length).to.equal(10);
      
      // Mark half as unhealthy
      for (let i = 0; i < 5; i++) {
        await infraSecurity.connect(operator).updateRPCHealth(`Provider${i}`, false);
      }
      
      const healthyCount = await infraSecurity.getHealthyRPCCount();
      expect(healthyCount).to.equal(5);
      
      console.log("✅ Handles multiple providers correctly");
    });

    it("Should recover from temporary failures", async function () {
      await infraSecurity.connect(operator).addRPCProvider(
        "FlakyProvider",
        "https://flaky.rpc.com",
        1
      );
      
      // Mark as unhealthy
      await infraSecurity.connect(operator).updateRPCHealth("FlakyProvider", false);
      let [, , , , healthy, failureCount] = await infraSecurity.getRPCProvider("FlakyProvider");
      expect(healthy).to.be.false;
      expect(failureCount).to.equal(1);
      
      // Recover
      await infraSecurity.connect(operator).updateRPCHealth("FlakyProvider", true);
      [, , , , healthy, failureCount] = await infraSecurity.getRPCProvider("FlakyProvider");
      expect(healthy).to.be.true;
      expect(failureCount).to.equal(0);
      
      console.log("✅ Provider recovery working");
    });
  });
});
