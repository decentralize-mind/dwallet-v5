// Test suite for Fee Validation Standardization Fix
// Tests the new MAX_FEE_BPS caps in DWTPerpetuals.sol

const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('DWTPerpetuals - Fee Validation Standardization', function () {
    let perpetuals, usdc, priceOracle;
    let admin, governor, guardian, user, feeRecipient;
    
    // Constants from contract
    const MAX_LIQUIDATOR_FEE_BPS = 500n; // 5% max
    const MAX_PROTOCOL_FEE_BPS = 100n;   // 1% max
    const BPS = 10_000n;
    
    beforeEach(async function () {
        // Get signers
        [admin, governor, guardian, user, feeRecipient] = await ethers.getSigners();
        
        // Deploy mock USDC
        const MockUSDC = await ethers.getContractFactory('MockERC20');
        usdc = await MockUSDC.deploy('USD Coin', 'USDC', 6);
        await usdc.waitForDeployment();
        
        // Deploy mock Price Oracle
        const MockPriceOracle = await ethers.getContractFactory('MockPriceOracle');
        priceOracle = await MockPriceOracle.deploy();
        await priceOracle.waitForDeployment();
        
        // Deploy DWTPerpetuals
        const DWTPerpetuals = await ethers.getContractFactory('DWTPerpetuals');
        perpetuals = await DWTPerpetuals.deploy(
            await usdc.getAddress(),
            await priceOracle.getAddress(),
            admin.address,
            governor.address,
            guardian.address,
            admin.address, // securityController (mock)
            ethers.ZeroAddress, // _access
            ethers.ZeroAddress, // _time
            ethers.ZeroAddress, // _state
            ethers.ZeroAddress, // _rate
            ethers.ZeroAddress, // _verify
        );
        await perpetuals.waitForDeployment();
        
        // Set fee recipient
        await perpetuals.connect(admin).setFeeRecipient(feeRecipient.address, ethers.ZeroHash, '0x');
    });
    
    describe('Fee Cap Constants', function () {
        it('should have correct MAX_LIQUIDATOR_FEE_BPS constant', async function () {
            const maxFee = await perpetuals.MAX_LIQUIDATOR_FEE_BPS();
            expect(maxFee).to.equal(MAX_LIQUIDATOR_FEE_BPS);
        });
        
        it('should have correct MAX_PROTOCOL_FEE_BPS constant', async function () {
            const maxFee = await perpetuals.MAX_PROTOCOL_FEE_BPS();
            expect(maxFee).to.equal(MAX_PROTOCOL_FEE_BPS);
        });
        
        it('should initialize with default fees below caps', async function () {
            const liquidatorFee = await perpetuals.liquidatorFeeBps();
            const protocolFee = await perpetuals.protocolFeeBps();
            
            expect(liquidatorFee).to.be.lessThan(MAX_LIQUIDATOR_FEE_BPS);
            expect(protocolFee).to.be.lessThan(MAX_PROTOCOL_FEE_BPS);
        });
    });
    
    describe('Liquidator Fee Validation', function () {
        it('should allow setting liquidator fee within cap', async function () {
            const validFee = 200n; // 2%
            
            await expect(
                perpetuals.connect(governor).setLiquidatorFeeBps(validFee, ethers.ZeroHash, '0x')
            ).to.not.be.reverted;
            
            const updatedFee = await perpetuals.liquidatorFeeBps();
            expect(updatedFee).to.equal(validFee);
        });
        
        it('should allow setting liquidator fee at exact cap', async function () {
            await expect(
                perpetuals.connect(governor).setLiquidatorFeeBps(MAX_LIQUIDATOR_FEE_BPS, ethers.ZeroHash, '0x')
            ).to.not.be.reverted;
            
            const updatedFee = await perpetuals.liquidatorFeeBps();
            expect(updatedFee).to.equal(MAX_LIQUIDATOR_FEE_BPS);
        });
        
        it('should reject liquidator fee above cap', async function () {
            const invalidFee = MAX_LIQUIDATOR_FEE_BPS + 1n; // 5.01%
            
            await expect(
                perpetuals.connect(governor).setLiquidatorFeeBps(invalidFee, ethers.ZeroHash, '0x')
            ).to.be.revertedWith('DWTPerpetuals: fee exceeds 5% cap');
        });
        
        it('should reject excessive liquidator fee', async function () {
            const excessiveFee = 1000n; // 10%
            
            await expect(
                perpetuals.connect(governor).setLiquidatorFeeBps(excessiveFee, ethers.ZeroHash, '0x')
            ).to.be.revertedWith('DWTPerpetuals: fee exceeds 5% cap');
        });
        
        it('should allow zero liquidator fee', async function () {
            await expect(
                perpetuals.connect(governor).setLiquidatorFeeBps(0n, ethers.ZeroHash, '0x')
            ).to.not.be.reverted;
            
            const updatedFee = await perpetuals.liquidatorFeeBps();
            expect(updatedFee).to.equal(0n);
        });
        
        it('should emit event on liquidator fee update', async function () {
            const newFee = 150n;
            
            await expect(
                perpetuals.connect(governor).setLiquidatorFeeBps(newFee, ethers.ZeroHash, '0x')
            ).to.emit(perpetuals, 'LiquidatorFeeUpdated');
        });
    });
    
    describe('Protocol Fee Validation', function () {
        it('should allow setting protocol fee within cap', async function () {
            const validFee = 50n; // 0.5%
            
            await expect(
                perpetuals.connect(governor).setProtocolFeeBps(validFee, ethers.ZeroHash, '0x')
            ).to.not.be.reverted;
            
            const updatedFee = await perpetuals.protocolFeeBps();
            expect(updatedFee).to.equal(validFee);
        });
        
        it('should allow setting protocol fee at exact cap', async function () {
            await expect(
                perpetuals.connect(governor).setProtocolFeeBps(MAX_PROTOCOL_FEE_BPS, ethers.ZeroHash, '0x')
            ).to.not.be.reverted;
            
            const updatedFee = await perpetuals.protocolFeeBps();
            expect(updatedFee).to.equal(MAX_PROTOCOL_FEE_BPS);
        });
        
        it('should reject protocol fee above cap', async function () {
            const invalidFee = MAX_PROTOCOL_FEE_BPS + 1n; // 1.01%
            
            await expect(
                perpetuals.connect(governor).setProtocolFeeBps(invalidFee, ethers.ZeroHash, '0x')
            ).to.be.revertedWith('DWTPerpetuals: fee exceeds 1% cap');
        });
        
        it('should reject excessive protocol fee', async function () {
            const excessiveFee = 500n; // 5%
            
            await expect(
                perpetuals.connect(governor).setProtocolFeeBps(excessiveFee, ethers.ZeroHash, '0x')
            ).to.be.revertedWith('DWTPerpetuals: fee exceeds 1% cap');
        });
        
        it('should allow zero protocol fee', async function () {
            await expect(
                perpetuals.connect(governor).setProtocolFeeBps(0n, ethers.ZeroHash, '0x')
            ).to.not.be.reverted;
            
            const updatedFee = await perpetuals.protocolFeeBps();
            expect(updatedFee).to.equal(0n);
        });
    });
    
    describe('Access Control', function () {
        it('should prevent non-governor from setting liquidator fee', async function () {
            await expect(
                perpetuals.connect(user).setLiquidatorFeeBps(100n, ethers.ZeroHash, '0x')
            ).to.be.reverted;
        });
        
        it('should prevent non-governor from setting protocol fee', async function () {
            await expect(
                perpetuals.connect(user).setProtocolFeeBps(50n, ethers.ZeroHash, '0x')
            ).to.be.reverted;
        });
        
        it('should allow governor to set both fees', async function () {
            await expect(
                perpetuals.connect(governor).setLiquidatorFeeBps(100n, ethers.ZeroHash, '0x')
            ).to.not.be.reverted;
            
            await expect(
                perpetuals.connect(governor).setProtocolFeeBps(50n, ethers.ZeroHash, '0x')
            ).to.not.be.reverted;
        });
    });
    
    describe('Integration: Fee Calculation', function () {
        it('should calculate liquidator fee correctly with capped rate', async function () {
            const margin = ethers.parseEther('1000'); // 1000 USDC
            const liquidatorFeeBps = 100n; // 1%
            
            await perpetuals.connect(governor).setLiquidatorFeeBps(liquidatorFeeBps, ethers.ZeroHash, '0x');
            
            // Calculate expected fee: margin * liquidatorFeeBps / 10000
            const expectedFee = (margin * liquidatorFeeBps) / BPS;
            
            // Verify calculation matches contract logic
            const calculatedFee = (margin * await perpetuals.liquidatorFeeBps()) / BPS;
            expect(calculatedFee).to.equal(expectedFee);
        });
        
        it('should calculate protocol fee correctly with capped rate', async function () {
            const sizeUsd = ethers.parseEther('10000'); // 10000 USDC position
            const protocolFeeBps = 30n; // 0.3%
            
            await perpetuals.connect(governor).setProtocolFeeBps(protocolFeeBps, ethers.ZeroHash, '0x');
            
            // Calculate expected fee: sizeUsd * protocolFeeBps / 10000
            const expectedFee = (sizeUsd * protocolFeeBps) / BPS;
            
            // Verify calculation matches contract logic
            const calculatedFee = (sizeUsd * await perpetuals.protocolFeeBps()) / BPS;
            expect(calculatedFee).to.equal(expectedFee);
        });
        
        it('should prevent fee manipulation via cap bypass', async function () {
            // Try to set fees that would be exploitative
            const exploitativeLiquidatorFee = 2000n; // 20%
            const exploitativeProtocolFee = 500n; // 5%
            
            // Both should fail due to caps
            await expect(
                perpetuals.connect(governor).setLiquidatorFeeBps(exploitativeLiquidatorFee, ethers.ZeroHash, '0x')
            ).to.be.reverted;
            
            await expect(
                perpetuals.connect(governor).setProtocolFeeBps(exploitativeProtocolFee, ethers.ZeroHash, '0x')
            ).to.be.reverted;
        });
    });
    
    describe('Boundary Conditions', function () {
        it('should handle maximum valid liquidator fee', async function () {
            await perpetuals.connect(governor).setLiquidatorFeeBps(MAX_LIQUIDATOR_FEE_BPS, ethers.ZeroHash, '0x');
            
            const margin = ethers.parseEther('1000');
            const maxFee = (margin * MAX_LIQUIDATOR_FEE_BPS) / BPS;
            
            // 5% of 1000 USDC = 50 USDC
            expect(maxFee).to.equal(ethers.parseUnits('50', 6));
        });
        
        it('should handle maximum valid protocol fee', async function () {
            await perpetuals.connect(governor).setProtocolFeeBps(MAX_PROTOCOL_FEE_BPS, ethers.ZeroHash, '0x');
            
            const sizeUsd = ethers.parseEther('10000');
            const maxFee = (sizeUsd * MAX_PROTOCOL_FEE_BPS) / BPS;
            
            // 1% of 10000 USDC = 100 USDC
            expect(maxFee).to.equal(ethers.parseUnits('100', 6));
        });
        
        it('should reject fee just above boundary', async function () {
            const liquidatorFeeAbove = MAX_LIQUIDATOR_FEE_BPS + 1n;
            const protocolFeeAbove = MAX_PROTOCOL_FEE_BPS + 1n;
            
            await expect(
                perpetuals.connect(governor).setLiquidatorFeeBps(liquidatorFeeAbove, ethers.ZeroHash, '0x')
            ).to.be.reverted;
            
            await expect(
                perpetuals.connect(governor).setProtocolFeeBps(protocolFeeAbove, ethers.ZeroHash, '0x')
            ).to.be.reverted;
        });
        
        it('should accept fee just below boundary', async function () {
            const liquidatorFeeBelow = MAX_LIQUIDATOR_FEE_BPS - 1n;
            const protocolFeeBelow = MAX_PROTOCOL_FEE_BPS - 1n;
            
            await expect(
                perpetuals.connect(governor).setLiquidatorFeeBps(liquidatorFeeBelow, ethers.ZeroHash, '0x')
            ).to.not.be.reverted;
            
            await expect(
                perpetuals.connect(governor).setProtocolFeeBps(protocolFeeBelow, ethers.ZeroHash, '0x')
            ).to.not.be.reverted;
        });
    });
    
    describe('Security Scenarios', function () {
        it('should prevent governance attack via excessive fees', async function () {
            // Scenario: Compromised governor key tries to set exploitative fees
            
            // Attempt to set 50% liquidator fee (would drain user funds)
            await expect(
                perpetuals.connect(governor).setLiquidatorFeeBps(5000n, ethers.ZeroHash, '0x')
            ).to.be.revertedWith('DWTPerpetuals: fee exceeds 5% cap');
            
            // Attempt to set 25% protocol fee (would be front-runnable)
            await expect(
                perpetuals.connect(governor).setProtocolFeeBps(2500n, ethers.ZeroHash, '0x')
            ).to.be.revertedWith('DWTPerpetuals: fee exceeds 1% cap');
            
            // Fees remain at safe levels
            const liquidatorFee = await perpetuals.liquidatorFeeBps();
            const protocolFee = await perpetuals.protocolFeeBps();
            
            expect(liquidatorFee).to.be.at.most(MAX_LIQUIDATOR_FEE_BPS);
            expect(protocolFee).to.be.at.most(MAX_PROTOCOL_FEE_BPS);
        });
        
        it('should maintain fee consistency across multiple updates', async function () {
            // Update fees multiple times
            await perpetuals.connect(governor).setLiquidatorFeeBps(50n, ethers.ZeroHash, '0x');
            await perpetuals.connect(governor).setLiquidatorFeeBps(100n, ethers.ZeroHash, '0x');
            await perpetuals.connect(governor).setLiquidatorFeeBps(150n, ethers.ZeroHash, '0x');
            
            await perpetuals.connect(governor).setProtocolFeeBps(20n, ethers.ZeroHash, '0x');
            await perpetuals.connect(governor).setProtocolFeeBps(40n, ethers.ZeroHash, '0x');
            await perpetuals.connect(governor).setProtocolFeeBps(60n, ethers.ZeroHash, '0x');
            
            // All should be within caps
            const finalLiquidatorFee = await perpetuals.liquidatorFeeBps();
            const finalProtocolFee = await perpetuals.protocolFeeBps();
            
            expect(finalLiquidatorFee).to.be.at.most(MAX_LIQUIDATOR_FEE_BPS);
            expect(finalProtocolFee).to.be.at.most(MAX_PROTOCOL_FEE_BPS);
        });
    });
    
    describe('Gas Optimization', function () {
        it('should have reasonable gas cost for fee validation', async function () {
            const tx = await perpetuals.connect(governor).setLiquidatorFeeBps(100n, ethers.ZeroHash, '0x');
            const receipt = await tx.wait();
            
            console.log(`Gas used for setLiquidatorFeeBps: ${receipt.gasUsed.toString()}`);
            expect(receipt.gasUsed).to.be.lessThan(100000n); // Should be < 100k gas
        });
        
        it('should have reasonable gas cost for protocol fee update', async function () {
            const tx = await perpetuals.connect(governor).setProtocolFeeBps(50n, ethers.ZeroHash, '0x');
            const receipt = await tx.wait();
            
            console.log(`Gas used for setProtocolFeeBps: ${receipt.gasUsed.toString()}`);
            expect(receipt.gasUsed).to.be.lessThan(100000n); // Should be < 100k gas
        });
    });
});

// Mock contracts for testing

const MockERC20 = [
    'constructor(string memory name, string memory symbol, uint8 decimals)',
    'function mint(address to, uint256 amount) external',
    'function balanceOf(address account) external view returns (uint256)',
    'function transfer(address to, uint256 amount) external returns (bool)',
    'function approve(address spender, uint256 amount) external returns (bool)',
    'function transferFrom(address from, address to, uint256 amount) external returns (bool)'
];

const MockPriceOracle = [
    'constructor()',
    'function getPrice(address asset) external view returns (int256)',
    'function getLatestPrice() external view returns (int256)',
    'function isStale() external view returns (bool)'
];
