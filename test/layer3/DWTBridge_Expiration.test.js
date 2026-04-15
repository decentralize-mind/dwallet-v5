// Test suite for DWTBridge Transfer Expiration Fix
// Tests the new TRANSFER_EXPIRY mechanism

const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('DWTBridge - Transfer Expiration', function () {
    let dwtToken, bridge, securityController;
    let admin, guardian, relayer1, relayer2, relayer3, user, recipient;
    
    // Constants from contract
    const EXECUTION_DELAY = 12 * 60 * 60; // 12 hours in seconds
    const TRANSFER_EXPIRY = 7 * 24 * 60 * 60; // 7 days in seconds
    const BPS = 10_000;
    const BRIDGE_FEE_BPS = 10; // 0.1%
    
    beforeEach(async function () {
        // Get signers
        [admin, guardian, relayer1, relayer2, relayer3, user, recipient] = await ethers.getSigners();
        
        // Deploy mock DWT token (simplified ERC20)
        const MockDWT = await ethers.getContractFactory('MockERC20');
        dwtToken = await MockDWT.deploy('DWT Token', 'DWT', 18);
        await dwtToken.waitForDeployment();
        
        // Mint tokens to user
        await dwtToken.mint(user, ethers.parseEther('1000000'));
        
        // Deploy mock SecurityController
        const MockSecurityController = await ethers.getContractFactory('MockSecurityController');
        securityController = await MockSecurityController.deploy();
        
        // Deploy DWTBridge
        const DWTBridge = await ethers.getContractFactory('DWTBridge');
        bridge = await DWTBridge.deploy(
            await dwtToken.getAddress(),
            true, // isLockMode = true
            await securityController.getAddress(),
            admin.address,
            guardian.address,
            [relayer1.address, relayer2.address, relayer3.address],
            2, // requiredSignatures (2 of 3)
            ethers.parseEther('10000') // dailyLimit
        );
        await bridge.waitForDeployment();
        
        // Approve bridge to spend DWT
        await dwtToken.connect(user).approve(await bridge.getAddress(), ethers.parseEther('1000000'));
        
        // Add supported chain
        await bridge.connect(admin).addChain(1); // Chain ID 1
        
        // Fast-forward time helper
        this.fastForward = async (seconds) => {
            await ethers.provider.send('evm_increaseTime', [seconds]);
            await ethers.provider.send('evm_mine');
        };
    });
    
    describe('Transfer Expiration Mechanism', function () {
        it('should set correct expiration constants', async function () {
            const executionDelay = await bridge.EXECUTION_DELAY();
            const transferExpiry = await bridge.TRANSFER_EXPIRY();
            
            expect(executionDelay).to.equal(EXECUTION_DELAY);
            expect(transferExpiry).to.equal(TRANSFER_EXPIRY);
        });
        
        it('should successfully execute transfer within expiration window', async function () {
            const amount = ethers.parseEther('1000');
            
            // Submit transfer from relayer1
            await bridge.connect(relayer1).submitInboundTransfer(
                1, // srcChainId
                1, // srcNonce
                recipient.address,
                amount
            );
            
            // Sign from relayer2
            await bridge.connect(relayer2).submitInboundTransfer(1, 1, recipient.address, amount);
            
            // Fast-forward past execution delay but well before expiration
            await this.fastForward(EXECUTION_DELAY + 60); // 12h 1min
            
            // Execute should succeed
            await expect(bridge.executeInboundTransfer(1, 1))
                .to.emit(bridge, 'TransferCompleted')
                .withArgs(
                    ethers.keccak256(ethers.solidityPacked(['uint256', 'uint256'], [1, 1])),
                    recipient.address,
                    amount
                );
        });
        
        it('should revert execution if transfer has expired', async function () {
            const amount = ethers.parseEther('1000');
            
            // Submit transfer
            await bridge.connect(relayer1).submitInboundTransfer(1, 1, recipient.address, amount);
            await bridge.connect(relayer2).submitInboundTransfer(1, 1, recipient.address, amount);
            
            // Fast-forward past expiration (7 days + 1 hour)
            await this.fastForward(TRANSFER_EXPIRY + 3600);
            
            // Execute should revert with "Bridge: transfer expired"
            await expect(bridge.executeInboundTransfer(1, 1))
                .to.be.revertedWith('Bridge: transfer expired');
        });
        
        it('should emit TransferExpired event when expired during execution attempt', async function () {
            const amount = ethers.parseEther('1000');
            
            // Submit transfer
            await bridge.connect(relayer1).submitInboundTransfer(1, 1, recipient.address, amount);
            await bridge.connect(relayer2).submitInboundTransfer(1, 1, recipient.address, amount);
            
            // Fast-forward past expiration
            await this.fastForward(TRANSFER_EXPIRY + 3600);
            
            // Check that TransferExpired event is emitted
            await expect(bridge.executeInboundTransfer(1, 1))
                .to.emit(bridge, 'TransferExpired')
                .withArgs(ethers.keccak256(ethers.solidityPacked(['uint256', 'uint256'], [1, 1])));
        });
        
        it('should allow anyone to expire a transfer via expireTransfer()', async function () {
            const amount = ethers.parseEther('1000');
            
            // Submit transfer
            await bridge.connect(relayer1).submitInboundTransfer(1, 1, recipient.address, amount);
            await bridge.connect(relayer2).submitInboundTransfer(1, 1, recipient.address, amount);
            
            // Fast-forward past expiration
            await this.fastForward(TRANSFER_EXPIRY + 3600);
            
            // Anyone (user) can call expireTransfer
            await expect(bridge.connect(user).expireTransfer(1, 1))
                .to.emit(bridge, 'TransferExpired')
                .withArgs(ethers.keccak256(ethers.solidityPacked(['uint256', 'uint256'], [1, 1])));
        });
        
        it('should mark transfer as executed after expiration', async function () {
            const amount = ethers.parseEther('1000');
            
            // Submit transfer
            await bridge.connect(relayer1).submitInboundTransfer(1, 1, recipient.address, amount);
            await bridge.connect(relayer2).submitInboundTransfer(1, 1, recipient.address, amount);
            
            // Fast-forward past expiration
            await this.fastForward(TRANSFER_EXPIRY + 3600);
            
            // Expire the transfer
            await bridge.connect(user).expireTransfer(1, 1);
            
            // Try to execute again - should fail because it's marked as executed
            await expect(bridge.executeInboundTransfer(1, 1))
                .to.be.revertedWith('Bridge: already executed');
        });
        
        it('should prevent expiring a transfer that is not yet expired', async function () {
            const amount = ethers.parseEther('1000');
            
            // Submit transfer
            await bridge.connect(relayer1).submitInboundTransfer(1, 1, recipient.address, amount);
            await bridge.connect(relayer2).submitInboundTransfer(1, 1, recipient.address, amount);
            
            // Fast-forward only 1 day (not expired yet)
            await this.fastForward(24 * 60 * 60); // 1 day
            
            // Should revert with "Bridge: not expired yet"
            await expect(bridge.expireTransfer(1, 1))
                .to.be.revertedWith('Bridge: not expired yet');
        });
        
        it('should prevent expiring an already executed transfer', async function () {
            const amount = ethers.parseEther('1000');
            
            // Submit and execute transfer normally
            await bridge.connect(relayer1).submitInboundTransfer(1, 1, recipient.address, amount);
            await bridge.connect(relayer2).submitInboundTransfer(1, 1, recipient.address, amount);
            await this.fastForward(EXECUTION_DELAY + 60);
            await bridge.executeInboundTransfer(1, 1);
            
            // Try to expire - should fail with "Bridge: already processed"
            await expect(bridge.expireTransfer(1, 1))
                .to.be.revertedWith('Bridge: already processed');
        });
        
        it('should prevent expiring a non-existent transfer', async function () {
            // Try to expire transfer that was never submitted
            await expect(bridge.expireTransfer(999, 999))
                .to.be.revertedWith('Bridge: transfer not submitted');
        });
        
        it('should correctly track expiresAt in PendingTransfer struct', async function () {
            const amount = ethers.parseEther('1000');
            const submitTime = (await ethers.provider.getBlock('latest')).timestamp;
            
            // Submit transfer
            await bridge.connect(relayer1).submitInboundTransfer(1, 1, recipient.address, amount);
            
            // Get the transfer details
            const transferId = ethers.keccak256(ethers.solidityPacked(['uint256', 'uint256'], [1, 1]));
            
            // We can't directly read struct members with mappings, but we can verify behavior
            // by checking that expiration happens at the right time
            
            // Fast-forward to just before expiration
            await this.fastForward(TRANSFER_EXPIRY - 60);
            
            // Should still be executable (won't execute due to delay, but won't expire)
            try {
                await bridge.executeInboundTransfer(1, 1);
            } catch (error) {
                // Expected to fail due to insufficient signatures or delay, not expiration
                expect(error.message).to.include('insufficient signatures');
            }
            
            // Fast-forward past expiration
            await this.fastForward(120); // 2 more minutes
            
            // Now should expire
            await expect(bridge.expireTransfer(1, 1))
                .to.emit(bridge, 'TransferExpired');
        });
        
        it('should handle edge case: expiration exactly at boundary', async function () {
            const amount = ethers.parseEther('1000');
            
            // Submit transfer
            await bridge.connect(relayer1).submitInboundTransfer(1, 1, recipient.address, amount);
            await bridge.connect(relayer2).submitInboundTransfer(1, 1, recipient.address, amount);
            
            // Fast-forward to exactly expiration time
            await this.fastForward(TRANSFER_EXPIRY);
            
            // Should still be valid (block.timestamp == expiresAt, not >)
            // Will fail for other reasons (execution delay), but not expiration
            try {
                await bridge.executeInboundTransfer(1, 1);
            } catch (error) {
                // Should fail on execution delay check, not expiration
                expect(error.message).to.not.include('expired');
            }
            
            // Fast-forward 1 second past expiration
            await this.fastForward(1);
            
            // Now should expire
            await expect(bridge.expireTransfer(1, 1))
                .to.emit(bridge, 'TransferExpired');
        });
    });
    
    describe('Integration: Execution Delay vs Expiration', function () {
        it('should allow execution when delay < expiration (normal case)', async function () {
            const amount = ethers.parseEther('1000');
            
            // Submit transfer
            await bridge.connect(relayer1).submitInboundTransfer(1, 1, recipient.address, amount);
            await bridge.connect(relayer2).submitInboundTransfer(1, 1, recipient.address, amount);
            
            // Wait for execution delay (12h) but before expiration (7d)
            await this.fastForward(EXECUTION_DELAY + 60);
            
            // Should execute successfully
            await expect(bridge.executeInboundTransfer(1, 1))
                .to.emit(bridge, 'TransferCompleted');
        });
        
        it('should prevent execution when trying to execute after expiration', async function () {
            const amount = ethers.parseEther('1000');
            
            // Submit transfer
            await bridge.connect(relayer1).submitInboundTransfer(1, 1, recipient.address, amount);
            await bridge.connect(relayer2).submitInboundTransfer(1, 1, recipient.address, amount);
            
            // Wait until after expiration
            await this.fastForward(TRANSFER_EXPIRY + 3600);
            
            // Should revert due to expiration
            await expect(bridge.executeInboundTransfer(1, 1))
                .to.be.revertedWith('Bridge: transfer expired');
        });
        
        it('should handle multiple transfers with different expiration times', async function () {
            const amount = ethers.parseEther('1000');
            
            // Submit transfer 1
            await bridge.connect(relayer1).submitInboundTransfer(1, 1, recipient.address, amount);
            await bridge.connect(relayer2).submitInboundTransfer(1, 1, recipient.address, amount);
            
            // Wait 1 day
            await this.fastForward(24 * 60 * 60);
            
            // Submit transfer 2
            await bridge.connect(relayer1).submitInboundTransfer(1, 2, recipient.address, amount);
            await bridge.connect(relayer2).submitInboundTransfer(1, 2, recipient.address, amount);
            
            // Wait until transfer 1 expires (7 days from first submission)
            await this.fastForward((7 * 24 * 60 * 60) - (24 * 60 * 60) + 3600);
            
            // Transfer 1 should be expired
            await expect(bridge.expireTransfer(1, 1))
                .to.emit(bridge, 'TransferExpired');
            
            // Transfer 2 should still be valid (1 day old, expires in 6 days)
            // Fast-forward past execution delay for transfer 2
            await this.fastForward(EXECUTION_DELAY);
            
            // Transfer 2 should execute successfully
            await expect(bridge.executeInboundTransfer(1, 2))
                .to.emit(bridge, 'TransferCompleted');
        });
    });
    
    describe('Gas Optimization', function () {
        it('should allow anyone to expire transfers (gas recovery incentive)', async function () {
            const amount = ethers.parseEther('1000');
            
            // Submit and abandon transfer
            await bridge.connect(relayer1).submitInboundTransfer(1, 100, recipient.address, amount);
            await bridge.connect(relayer2).submitInboundTransfer(1, 100, recipient.address, amount);
            
            // Wait for expiration
            await this.fastForward(TRANSFER_EXPIRY + 3600);
            
            // Any user can clean up (no special permissions needed)
            const tx = await bridge.connect(user).expireTransfer(1, 100);
            const receipt = await tx.wait();
            
            // Gas used should be reasonable (< 100k)
            expect(receipt.gasUsed).to.be.lessThan(100000n);
        });
    });
    
    describe('Event Emissions', function () {
        it('should emit TransferExpired with correct transferId', async function () {
            const amount = ethers.parseEther('1000');
            
            await bridge.connect(relayer1).submitInboundTransfer(1, 1, recipient.address, amount);
            await bridge.connect(relayer2).submitInboundTransfer(1, 1, recipient.address, amount);
            
            await this.fastForward(TRANSFER_EXPIRY + 3600);
            
            const expectedTransferId = ethers.keccak256(
                ethers.solidityPacked(['uint256', 'uint256'], [1, 1])
            );
            
            await expect(bridge.expireTransfer(1, 1))
                .to.emit(bridge, 'TransferExpired')
                .withArgs(expectedTransferId);
        });
    });
});

// Mock ERC20 for testing
const MockERC20 = [
    'constructor(string memory name, string memory symbol, uint8 decimals)',
    'function mint(address to, uint256 amount) external',
    'function balanceOf(address account) external view returns (uint256)',
    'function transfer(address to, uint256 amount) external returns (bool)',
    'function approve(address spender, uint256 amount) external returns (bool)',
    'function transferFrom(address from, address to, uint256 amount) external returns (bool)'
];

// Mock SecurityController for testing
const MockSecurityController = [
    'constructor()',
    'function paused() external pure returns (bool)',
    'function circuitBroken() external pure returns (bool)'
];
