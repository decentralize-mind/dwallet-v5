const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("🛡️ DWTPerpetuals - Oracle Staleness Protection", function () {
    let perpetuals, usdc, primaryOracle, backupOracle;
    let owner, governor, guardian, trader, liquidator;
    
    const STALE_PRICE_DELAY = 3600; // 1 hour
    const ORACLE_HEALTH_THRESHOLD = 1800; // 30 minutes
    
    // Mock USDC (6 decimals)
    async function deployMockUSDC() {
        const USDCFactory = await ethers.getContractFactory("ERC20");
        const usdc = await USDCFactory.deploy("USD Coin", "USDC");
        await usdc.waitForDeployment();
        return usdc;
    }

    beforeEach(async function () {
        [owner, governor, guardian, trader, liquidator] = await ethers.getSigners();

        // Deploy mock USDC
        const USDCFactory = await ethers.getContractFactory("ERC20");
        usdc = await USDCFactory.deploy("USD Coin", "USDC");
        await usdc.waitForDeployment();
        
        // Mint USDC to trader
        await usdc.mint(trader.address, ethers.parseUnits("10000", 6));

        // Deploy Mock Price Feeds (Chainlink-compatible)
        const MockPriceFeed = await ethers.getContractFactory("MockPriceFeed");
        primaryOracle = await MockPriceFeed.deploy(8); // 8 decimals
        backupOracle = await MockPriceFeed.deploy(8);
        await primaryOracle.waitForDeployment();
        await backupOracle.waitForDeployment();
        
        // Set initial prices (DWT = $2.00)
        const initialPrice = ethers.parseUnits("2", 8); // 8 decimals
        await primaryOracle.updatePrice(initialPrice, Math.floor(Date.now() / 1000));
        await backupOracle.updatePrice(initialPrice, Math.floor(Date.now() / 1000));

        // Deploy SecurityController and other dependencies
        const SecurityController = await ethers.getContractFactory("SecurityController");
        const securityController = await SecurityController.deploy(owner.address);
        await securityController.waitForDeployment();

        const AccessController = await ethers.getContractFactory("AccessController");
        const accessController = await AccessController.deploy(owner.address);
        await accessController.waitForDeployment();

        const StateController = await ethers.getContractFactory("StateController");
        const stateController = await StateController.deploy(owner.address);
        await stateController.waitForDeployment();

        const RateLimiter = await ethers.getContractFactory("RateLimiter");
        const rateLimiter = await RateLimiter.deploy(owner.address);
        await rateLimiter.waitForDeployment();

        const TimeLockController = await ethers.getContractFactory("TimeLockController");
        const timeLock = await TimeLockController.deploy(owner.address);
        await timeLock.waitForDeployment();

        const VerificationEngine = await ethers.getContractFactory("VerificationEngine");
        const verification = await VerificationEngine.deploy(owner.address);
        await verification.waitForDeployment();

        const ProtocolRegistry = await ethers.getContractFactory("ProtocolRegistry");
        const registry = await ProtocolRegistry.deploy(owner.address);
        await registry.waitForDeployment();

        // Deploy DWTPerpetuals
        const PerpetualsFactory = await ethers.getContractFactory("DWTPerpetuals");
        perpetuals = await PerpetualsFactory.deploy(
            await usdc.getAddress(),
            await primaryOracle.getAddress(),
            owner.address, // feeRecipient
            owner.address, // admin
            governor.address, // governor
            guardian.address, // guardian
            await securityController.getAddress(),
            await registry.getAddress(),
            await accessController.getAddress(),
            await timeLock.getAddress(),
            await stateController.getAddress(),
            await rateLimiter.getAddress(),
            await verification.getAddress()
        );
        await perpetuals.waitForDeployment();

        // Setup roles
        const GOVERNOR_ROLE = await perpetuals.GOVERNOR_ROLE();
        await securityController.grantRole(GOVERNOR_ROLE, governor.address);
        
        // Approve USDC spending
        await usdc.connect(trader).approve(await perpetuals.getAddress(), ethers.parseUnits("10000", 6));
    });

    describe("✅ Oracle Staleness Detection", function () {
        it("should allow position opening with fresh oracle price", async function () {
            const margin = ethers.parseUnits("100", 6); // 100 USDC
            const size = ethers.parseUnits("500", 6); // 500 USDC (5x leverage)
            
            await expect(
                perpetuals.connect(trader).openPosition(0, size, margin) // LONG = 0
            ).to.not.be.reverted;
        });

        it("should reject position opening with stale oracle price", async function () {
            // Make oracle stale by updating with old timestamp
            const currentTime = Math.floor(Date.now() / 1000);
            const staleTimestamp = currentTime - STALE_PRICE_DELAY - 100; // 1h + 100s ago
            
            await primaryOracle.updatePrice(ethers.parseUnits("2", 8), staleTimestamp);
            
            const margin = ethers.parseUnits("100", 6);
            const size = ethers.parseUnits("500", 6);
            
            await expect(
                perpetuals.connect(trader).openPosition(0, size, margin)
            ).to.be.revertedWith("Oracle price stale");
        });

        it("should reject position opening with zero price", async function () {
            await primaryOracle.updatePrice(0, Math.floor(Date.now() / 1000));
            
            const margin = ethers.parseUnits("100", 6);
            const size = ethers.parseUnits("500", 6);
            
            await expect(
                perpetuals.connect(trader).openPosition(0, size, margin)
            ).to.be.revertedWith("Oracle invalid price");
        });

        it("should handle negative price correctly", async function () {
            await primaryOracle.updatePrice(-1, Math.floor(Date.now() / 1000));
            
            const margin = ethers.parseUnits("100", 6);
            const size = ethers.parseUnits("500", 6);
            
            await expect(
                perpetuals.connect(trader).openPosition(0, size, margin)
            ).to.be.revertedWith("Oracle invalid price");
        });
    });

    describe("🔄 Multi-Oracle Failover System", function () {
        it("should failover to backup oracle when primary is stale", async function () {
            // Set up backup oracle with fresh price
            const GOVERNOR_ROLE = await perpetuals.GOVERNOR_ROLE();
            const hash = ethers.keccak256(ethers.toUtf8Bytes("setBackupOracle"));
            const signature = await governor.signMessage(ethers.getBytes(hash));
            
            await perpetuals.connect(governor).setBackupOracle(
                await backupOracle.getAddress(),
                hash,
                signature
            );
            
            // Make primary oracle stale
            const currentTime = Math.floor(Date.now() / 1000);
            const staleTimestamp = currentTime - STALE_PRICE_DELAY - 100;
            await primaryOracle.updatePrice(ethers.parseUnits("2", 8), staleTimestamp);
            
            // Keep backup oracle fresh
            await backupOracle.updatePrice(ethers.parseUnits("2", 8), currentTime);
            
            // Should succeed using backup oracle
            const margin = ethers.parseUnits("100", 6);
            const size = ethers.parseUnits("500", 6);
            
            await expect(
                perpetuals.connect(trader).openPosition(0, size, margin)
            ).to.not.be.reverted;
        });

        it("should emit OracleFailover event on failover", async function () {
            // Setup backup oracle
            const GOVERNOR_ROLE = await perpetuals.GOVERNOR_ROLE();
            const hash = ethers.keccak256(ethers.toUtf8Bytes("setBackupOracle"));
            const signature = await governor.signMessage(ethers.getBytes(hash));
            
            await perpetuals.connect(governor).setBackupOracle(
                await backupOracle.getAddress(),
                hash,
                signature
            );
            
            // Make primary stale
            const currentTime = Math.floor(Date.now() / 1000);
            await primaryOracle.updatePrice(ethers.parseUnits("2", 8), currentTime - STALE_PRICE_DELAY - 100);
            await backupOracle.updatePrice(ethers.parseUnits("2", 8), currentTime);
            
            const margin = ethers.parseUnits("100", 6);
            const size = ethers.parseUnits("500", 6);
            
            await expect(
                perpetuals.connect(trader).openPosition(0, size, margin)
            ).to.emit(perpetuals, "OracleFailover")
              .withArgs(
                  await primaryOracle.getAddress(),
                  await backupOracle.getAddress(),
                  "Primary oracle failed"
              );
        });

        it("should revert when both oracles are stale", async function () {
            // Setup backup oracle
            const GOVERNOR_ROLE = await perpetuals.GOVERNOR_ROLE();
            const hash = ethers.keccak256(ethers.toUtf8Bytes("setBackupOracle"));
            const signature = await governor.signMessage(ethers.getBytes(hash));
            
            await perpetuals.connect(governor).setBackupOracle(
                await backupOracle.getAddress(),
                hash,
                signature
            );
            
            // Make both oracles stale
            const currentTime = Math.floor(Date.now() / 1000);
            const staleTimestamp = currentTime - STALE_PRICE_DELAY - 100;
            await primaryOracle.updatePrice(ethers.parseUnits("2", 8), staleTimestamp);
            await backupOracle.updatePrice(ethers.parseUnits("2", 8), staleTimestamp);
            
            const margin = ethers.parseUnits("100", 6);
            const size = ethers.parseUnits("500", 6);
            
            await expect(
                perpetuals.connect(trader).openPosition(0, size, margin)
            ).to.be.revertedWith("All oracles failed or stale");
        });

        it("should work with only backup oracle (no primary)", async function () {
            // Set backup oracle
            const GOVERNOR_ROLE = await perpetuals.GOVERNOR_ROLE();
            const hash = ethers.keccak256(ethers.toUtf8Bytes("setBackupOracle"));
            const signature = await governor.signMessage(ethers.getBytes(hash));
            
            await perpetuals.connect(governor).setBackupOracle(
                await backupOracle.getAddress(),
                hash,
                signature
            );
            
            // Disable primary oracle (set to stale)
            const currentTime = Math.floor(Date.now() / 1000);
            await primaryOracle.updatePrice(ethers.parseUnits("2", 8), currentTime - STALE_PRICE_DELAY - 100);
            
            // Should use backup
            const margin = ethers.parseUnits("100", 6);
            const size = ethers.parseUnits("500", 6);
            
            await expect(
                perpetuals.connect(trader).openPosition(0, size, margin)
            ).to.not.be.reverted;
        });
    });

    describe("🏥 Oracle Health Check", function () {
        it("should report healthy oracle as healthy", async function () {
            const isHealthy = await perpetuals.isOracleHealthy(await primaryOracle.getAddress());
            expect(isHealthy).to.be.true;
        });

        it("should report stale oracle as unhealthy", async function () {
            const currentTime = Math.floor(Date.now() / 1000);
            const staleTimestamp = currentTime - ORACLE_HEALTH_THRESHOLD - 100;
            
            await primaryOracle.updatePrice(ethers.parseUnits("2", 8), staleTimestamp);
            
            const isHealthy = await perpetuals.isOracleHealthy(await primaryOracle.getAddress());
            expect(isHealthy).to.be.false;
        });

        it("should report zero-price oracle as unhealthy", async function () {
            await primaryOracle.updatePrice(0, Math.floor(Date.now() / 1000));
            
            const isHealthy = await perpetuals.isOracleHealthy(await primaryOracle.getAddress());
            expect(isHealthy).to.be.false;
        });

        it("should report non-existent contract as unhealthy", async function () {
            const fakeOracle = "0x0000000000000000000000000000000000000000";
            const isHealthy = await perpetuals.isOracleHealthy(fakeOracle);
            expect(isHealthy).to.be.false;
        });
    });

    describe("🔐 Oracle Administration", function () {
        it("should allow governor to update primary oracle", async function () {
            const newOracle = await primaryOracle.getAddress(); // Using same for test
            const GOVERNOR_ROLE = await perpetuals.GOVERNOR_ROLE();
            const hash = ethers.keccak256(ethers.toUtf8Bytes("setOracle"));
            const signature = await governor.signMessage(ethers.getBytes(hash));
            
            await expect(
                perpetuals.connect(governor).setOracle(newOracle, hash, signature)
            ).to.emit(perpetuals, "OracleUpdated")
              .withArgs(newOracle, false); // false = not backup
        });

        it("should allow governor to set backup oracle", async function () {
            const GOVERNOR_ROLE = await perpetuals.GOVERNOR_ROLE();
            const hash = ethers.keccak256(ethers.toUtf8Bytes("setBackupOracle"));
            const signature = await governor.signMessage(ethers.getBytes(hash));
            
            await expect(
                perpetuals.connect(governor).setBackupOracle(await backupOracle.getAddress(), hash, signature)
            ).to.emit(perpetuals, "OracleUpdated")
              .withArgs(await backupOracle.getAddress(), true); // true = backup
        });

        it("should reject zero address for primary oracle", async function () {
            const GOVERNOR_ROLE = await perpetuals.GOVERNOR_ROLE();
            const hash = ethers.keccak256(ethers.toUtf8Bytes("setOracle"));
            const signature = await governor.signMessage(ethers.getBytes(hash));
            
            await expect(
                perpetuals.connect(governor).setOracle(ethers.ZeroAddress, hash, signature)
            ).to.be.revertedWith("Zero address");
        });

        it("should reject non-governor from updating oracle", async function () {
            const hash = ethers.keccak256(ethers.toUtf8Bytes("setOracle"));
            const signature = await trader.signMessage(ethers.getBytes(hash));
            
            await expect(
                perpetuals.connect(trader).setOracle(await backupOracle.getAddress(), hash, signature)
            ).to.be.reverted; // Access control reverted
        });
    });

    describe("💰 Position Operations with Oracle Checks", function () {
        beforeEach(async function () {
            // Open a position for testing
            const margin = ethers.parseUnits("100", 6);
            const size = ethers.parseUnits("500", 6);
            
            await perpetuals.connect(trader).openPosition(0, size, margin); // LONG
        });

        it("should allow closing position with fresh oracle", async function () {
            const positions = await perpetuals.positions(0);
            expect(positions.trader).to.equal(trader.address);
            
            await expect(
                perpetuals.connect(trader).closePosition(0)
            ).to.not.be.reverted;
        });

        it("should reject closing position with stale oracle", async function () {
            const currentTime = Math.floor(Date.now() / 1000);
            await primaryOracle.updatePrice(ethers.parseUnits("2", 8), currentTime - STALE_PRICE_DELAY - 100);
            
            await expect(
                perpetuals.connect(trader).closePosition(0)
            ).to.be.revertedWith("Oracle price stale");
        });

        it("should allow liquidation with fresh oracle", async function () {
            // Manipulate price to make position underwater
            await primaryOracle.updatePrice(ethers.parseUnits("1", 8), Math.floor(Date.now() / 1000)); // Price drops 50%
            
            await expect(
                perpetuals.connect(liquidator).liquidate(0)
            ).to.not.be.reverted;
        });

        it("should reject liquidation with stale oracle", async function () {
            const currentTime = Math.floor(Date.now() / 1000);
            await primaryOracle.updatePrice(ethers.parseUnits("2", 8), currentTime - STALE_PRICE_DELAY - 100);
            
            await expect(
                perpetuals.connect(liquidator).liquidate(0)
            ).to.be.revertedWith("Oracle price stale");
        });

        it("should allow adding margin with fresh oracle", async function () {
            const margin = ethers.parseUnits("50", 6);
            await usdc.connect(trader).approve(await perpetuals.getAddress(), margin);
            
            await expect(
                perpetuals.connect(trader).addMargin(0, margin)
            ).to.not.be.reverted;
        });

        it("should reject adding margin with stale oracle", async function () {
            const currentTime = Math.floor(Date.now() / 1000);
            await primaryOracle.updatePrice(ethers.parseUnits("2", 8), currentTime - STALE_PRICE_DELAY - 100);
            
            const margin = ethers.parseUnits("50", 6);
            await usdc.connect(trader).approve(await perpetuals.getAddress(), margin);
            
            await expect(
                perpetuals.connect(trader).addMargin(0, margin)
            ).to.be.revertedWith("Oracle price stale");
        });
    });

    describe("⚙️ Funding Settlement with Oracle Safety", function () {
        it("should settle funding with valid oracle", async function () {
            await expect(
                perpetuals.settleFunding()
            ).to.not.be.reverted;
        });

        it("should handle funding settlement during oracle failover", async function () {
            // Setup backup oracle
            const GOVERNOR_ROLE = await perpetuals.GOVERNOR_ROLE();
            const hash = ethers.keccak256(ethers.toUtf8Bytes("setBackupOracle"));
            const signature = await governor.signMessage(ethers.getBytes(hash));
            
            await perpetuals.connect(governor).setBackupOracle(
                await backupOracle.getAddress(),
                hash,
                signature
            );
            
            // Make primary stale
            const currentTime = Math.floor(Date.now() / 1000);
            await primaryOracle.updatePrice(ethers.parseUnits("2", 8), currentTime - STALE_PRICE_DELAY - 100);
            
            // Funding should still work via backup
            await expect(
                perpetuals.settleFunding()
            ).to.not.be.reverted;
        });
    });

    describe("📊 Edge Cases and Stress Tests", function () {
        it("should handle rapid price updates correctly", async function () {
            const currentTime = Math.floor(Date.now() / 1000);
            
            // Rapid updates
            for (let i = 0; i < 10; i++) {
                await primaryOracle.updatePrice(ethers.parseUnits((2 + i * 0.1).toString(), 8), currentTime + i);
            }
            
            const margin = ethers.parseUnits("100", 6);
            const size = ethers.parseUnits("500", 6);
            
            await expect(
                perpetuals.connect(trader).openPosition(0, size, margin)
            ).to.not.be.reverted;
        });

        it("should handle maximum stale threshold boundary", async function () {
            const currentTime = Math.floor(Date.now() / 1000);
            const boundaryTimestamp = currentTime - STALE_PRICE_DELAY; // Exactly at threshold
            
            await primaryOracle.updatePrice(ethers.parseUnits("2", 8), boundaryTimestamp);
            
            const margin = ethers.parseUnits("100", 6);
            const size = ethers.parseUnits("500", 6);
            
            // Should still work at exact boundary
            await expect(
                perpetuals.connect(trader).openPosition(0, size, margin)
            ).to.not.be.reverted;
        });

        it("should fail just after stale threshold", async function () {
            const currentTime = Math.floor(Date.now() / 1000);
            const justOverTimestamp = currentTime - STALE_PRICE_DELAY - 1; // 1 second over
            
            await primaryOracle.updatePrice(ethers.parseUnits("2", 8), justOverTimestamp);
            
            const margin = ethers.parseUnits("100", 6);
            const size = ethers.parseUnits("500", 6);
            
            await expect(
                perpetuals.connect(trader).openPosition(0, size, margin)
            ).to.be.revertedWith("Oracle price stale");
        });
    });
});
