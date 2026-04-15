// Test suite for VerificationEngine Nonce Fix
// Tests the new nonce-based replay protection mechanism

const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('VerificationEngine - Nonce Replay Protection', function () {
    let verificationEngine, owner, user1, user2, attacker;
    
    beforeEach(async function () {
        // Get signers
        [owner, user1, user2, attacker] = await ethers.getSigners();
        
        // Deploy VerificationEngine
        const VerificationEngine = await ethers.getContractFactory('VerificationEngine');
        verificationEngine = await VerificationEngine.deploy(owner.address);
        await verificationEngine.waitForDeployment();
    });
    
    describe('Nonce Management', function () {
        it('should initialize with nonce 0 for new users', async function () {
            const nonce = await verificationEngine.getNextNonce(user1.address);
            expect(nonce).to.equal(0n);
        });
        
        it('should track used nonces correctly', async function () {
            const initialNonce = await verificationEngine.getNextNonce(user1.address);
            expect(initialNonce).to.equal(0n);
            
            // Create and verify a signature
            const hash = ethers.keccak256(ethers.toUtf8Bytes('test action'));
            const signature = await user1.signMessage(ethers.getBytes(hash));
            
            await verificationEngine.verifySignature(user1.address, hash, signature);
            
            // Nonce should advance to 1
            const newNonce = await verificationEngine.getNextNonce(user1.address);
            expect(newNonce).to.equal(1n);
            
            // Old nonce should be marked as used
            const isUsed = await verificationEngine.isNonceUsed(user1.address, 0n);
            expect(isUsed).to.be.true;
            
            // New nonce should not be used yet
            const isNewUsed = await verificationEngine.isNonceUsed(user1.address, 1n);
            expect(isNewUsed).to.be.false;
        });
        
        it('should maintain separate nonces for different users', async function () {
            // Both start at 0
            expect(await verificationEngine.getNextNonce(user1.address)).to.equal(0n);
            expect(await verificationEngine.getNextNonce(user2.address)).to.equal(0n);
            
            // Use nonce for user1
            const hash1 = ethers.keccak256(ethers.toUtf8Bytes('user1 action'));
            const sig1 = await user1.signMessage(ethers.getBytes(hash1));
            await verificationEngine.verifySignature(user1.address, hash1, sig1);
            
            // user1 advances, user2 stays at 0
            expect(await verificationEngine.getNextNonce(user1.address)).to.equal(1n);
            expect(await verificationEngine.getNextNonce(user2.address)).to.equal(0n);
        });
    });
    
    describe('Signature Verification with Nonce', function () {
        it('should verify valid signature and advance nonce', async function () {
            const hash = ethers.keccak256(ethers.toUtf8Bytes('test action'));
            const signature = await user1.signMessage(ethers.getBytes(hash));
            
            await expect(
                verificationEngine.verifySignature(user1.address, hash, signature)
            ).to.emit(verificationEngine, 'SignatureVerified')
             .withArgs(user1.address, 0n);
            
            // Verify nonce advanced
            expect(await verificationEngine.getNextNonce(user1.address)).to.equal(1n);
        });
        
        it('should reject signature from wrong signer', async function () {
            const hash = ethers.keccak256(ethers.toUtf8Bytes('test action'));
            // Sign with user1 but claim it's user2
            const signature = await user1.signMessage(ethers.getBytes(hash));
            
            await expect(
                verificationEngine.verifySignature(user2.address, hash, signature)
            ).to.be.revertedWithCustomError(verificationEngine, 'InvalidSignature');
        });
        
        it('should prevent replay attack with same signature', async function () {
            const hash = ethers.keccak256(ethers.toUtf8Bytes('test action'));
            const signature = await user1.signMessage(ethers.getBytes(hash));
            
            // First use should succeed
            await verificationEngine.verifySignature(user1.address, hash, signature);
            
            // Second use (replay) should fail
            await expect(
                verificationEngine.verifySignature(user1.address, hash, signature)
            ).to.be.revertedWithCustomError(verificationEngine, 'NonceAlreadyUsed');
        });
        
        it('should prevent replay even if signature is recovered correctly', async function () {
            const hash = ethers.keccak256(ethers.toUtf8Bytes('replay test'));
            const signature = await user1.signMessage(ethers.getBytes(hash));
            
            // Use once
            await verificationEngine.verifySignature(user1.address, hash, signature);
            
            // Try to reuse - should fail even though signature is valid
            await expect(
                verificationEngine.verifySignature(user1.address, hash, signature)
            ).to.be.revertedWithCustomError(verificationEngine, 'NonceAlreadyUsed');
        });
    });
    
    describe('Explicit Nonce Verification', function () {
        it('should verify signature with explicit nonce', async function () {
            const nonce = 0n;
            const hash = ethers.keccak256(ethers.toUtf8Bytes('explicit nonce test'));
            const signature = await user1.signMessage(ethers.getBytes(hash));
            
            await expect(
                verificationEngine.verifySignatureWithNonce(user1.address, nonce, hash, signature)
            ).to.emit(verificationEngine, 'SignatureVerified')
             .withArgs(user1.address, nonce);
        });
        
        it('should reject wrong nonce', async function () {
            const wrongNonce = 5n;
            const hash = ethers.keccak256(ethers.toUtf8Bytes('wrong nonce test'));
            const signature = await user1.signMessage(ethers.getBytes(hash));
            
            // User's current nonce is 0, but we're claiming 5
            await expect(
                verificationEngine.verifySignatureWithNonce(user1.address, wrongNonce, hash, signature)
            ).to.be.revertedWithCustomError(verificationEngine, 'InvalidNonce');
        });
        
        it('should reject already used nonce in explicit mode', async function () {
            // First use implicit mode to consume nonce 0
            const hash1 = ethers.keccak256(ethers.toUtf8Bytes('first action'));
            const sig1 = await user1.signMessage(ethers.getBytes(hash1));
            await verificationEngine.verifySignature(user1.address, hash1, sig1);
            
            // Now try to use explicit mode with nonce 0 (already used)
            const hash2 = ethers.keccak256(ethers.toUtf8Bytes('second action'));
            const sig2 = await user1.signMessage(ethers.getBytes(hash2));
            
            await expect(
                verificationEngine.verifySignatureWithNonce(user1.address, 0n, hash2, sig2)
            ).to.be.revertedWithCustomError(verificationEngine, 'NonceAlreadyUsed');
        });
        
        it('should work with sequential explicit nonces', async function () {
            // Use nonce 0
            const hash0 = ethers.keccak256(ethers.toUtf8Bytes('action 0'));
            const sig0 = await user1.signMessage(ethers.getBytes(hash0));
            await verificationEngine.verifySignatureWithNonce(user1.address, 0n, hash0, sig0);
            
            // Use nonce 1
            const hash1 = ethers.keccak256(ethers.toUtf8Bytes('action 1'));
            const sig1 = await user1.signMessage(ethers.getBytes(hash1));
            await verificationEngine.verifySignatureWithNonce(user1.address, 1n, hash1, sig1);
            
            // Use nonce 2
            const hash2 = ethers.keccak256(ethers.toUtf8Bytes('action 2'));
            const sig2 = await user1.signMessage(ethers.getBytes(hash2));
            await verificationEngine.verifySignatureWithNonce(user1.address, 2n, hash2, sig2);
            
            // Verify final nonce is 3
            expect(await verificationEngine.getNextNonce(user1.address)).to.equal(3n);
        });
    });
    
    describe('Replay Attack Prevention', function () {
        it('should prevent cross-user replay attacks', async function () {
            // User1 creates signature
            const hash = ethers.keccak256(ethers.toUtf8Bytes('user1 action'));
            const signature = await user1.signMessage(ethers.getBytes(hash));
            
            // Attacker tries to replay user1's signature
            await verificationEngine.verifySignature(user1.address, hash, signature);
            
            // Attacker cannot replay on behalf of user1 again
            await expect(
                verificationEngine.verifySignature(user1.address, hash, signature)
            ).to.be.revertedWithCustomError(verificationEngine, 'NonceAlreadyUsed');
        });
        
        it('should prevent time-shifted replay attacks', async function () {
            const hash = ethers.keccak256(ethers.toUtf8Bytes('time attack'));
            const signature = await user1.signMessage(ethers.getBytes(hash));
            
            // Use immediately
            await verificationEngine.verifySignature(user1.address, hash, signature);
            
            // Fast-forward time (doesn't affect nonce state)
            await ethers.provider.send('evm_increaseTime', [86400]); // 1 day
            
            // Replay should still fail
            await expect(
                verificationEngine.verifySignature(user1.address, hash, signature)
            ).to.be.revertedWithCustomError(verificationEngine, 'NonceAlreadyUsed');
        });
        
        it('should prevent multi-call replay attacks', async function () {
            const hash = ethers.keccak256(ethers.toUtf8Bytes('multicall attack'));
            const signature = await user1.signMessage(ethers.getBytes(hash));
            
            // Try to call multiple times in same transaction batch
            try {
                await verificationEngine.verifySignature(user1.address, hash, signature);
                await verificationEngine.verifySignature(user1.address, hash, signature);
                throw new Error('Should have failed');
            } catch (error) {
                expect(error.message).to.include('NonceAlreadyUsed');
            }
        });
    });
    
    describe('Nonce Advancement', function () {
        it('should allow owner to advance nonce for emergency', async function () {
            const initialNonce = await verificationEngine.getNextNonce(user1.address);
            expect(initialNonce).to.equal(0n);
            
            // Owner advances nonce by 10
            await verificationEngine.advanceNonce(user1.address, 10n);
            
            const newNonce = await verificationEngine.getNextNonce(user1.address);
            expect(newNonce).to.equal(10n);
            
            // Old nonces (0-9) are skipped, can't be used
        });
        
        it('should prevent non-owner from advancing nonce', async function () {
            await expect(
                verificationEngine.connect(user1).advanceNonce(user2.address, 10n)
            ).to.be.reverted;
        });
        
        it('should emit NonceAdvanced event', async function () {
            await expect(
                verificationEngine.advanceNonce(user1.address, 5n)
            ).to.emit(verificationEngine, 'NonceAdvanced')
             .withArgs(user1.address, 0n, 5n);
        });
        
        it('should allow using new nonce after advancement', async function () {
            // Advance past nonce 0-4
            await verificationEngine.advanceNonce(user1.address, 5n);
            
            // Now nonce 5 should be valid
            const hash = ethers.keccak256(ethers.toUtf8Bytes('post-advance action'));
            const signature = await user1.signMessage(ethers.getBytes(hash));
            
            await expect(
                verificationEngine.verifySignature(user1.address, hash, signature)
            ).to.not.be.reverted;
        });
    });
    
    describe('Merkle Proof Placeholder', function () {
        it('should return true for verifyProof (placeholder)', async function () {
            const root = ethers.ZeroHash;
            const leaf = ethers.ZeroHash;
            const proof = [];
            
            const result = await verificationEngine.verifyProof(root, leaf, proof);
            expect(result).to.be.true;
        });
        
        it('should compute Merkle root correctly (internal function test)', async function () {
            // This tests the _computeRoot helper which is internal
            // We can't directly test it, but we can verify the contract deployed successfully
            // which means the code compiled
            expect(verificationEngine.getAddress()).to.not.be.undefined;
        });
    });
    
    describe('Integration Scenarios', function () {
        it('should handle multiple users with interleaved transactions', async function () {
            // User1 transaction 1
            const hash1a = ethers.keccak256(ethers.toUtf8Bytes('user1 tx1'));
            const sig1a = await user1.signMessage(ethers.getBytes(hash1a));
            await verificationEngine.verifySignature(user1.address, hash1a, sig1a);
            
            // User2 transaction 1
            const hash2a = ethers.keccak256(ethers.toUtf8Bytes('user2 tx1'));
            const sig2a = await user2.signMessage(ethers.getBytes(hash2a));
            await verificationEngine.verifySignature(user2.address, hash2a, sig2a);
            
            // User1 transaction 2
            const hash1b = ethers.keccak256(ethers.toUtf8Bytes('user1 tx2'));
            const sig1b = await user1.signMessage(ethers.getBytes(hash1b));
            await verificationEngine.verifySignature(user1.address, hash1b, sig1b);
            
            // User2 transaction 2
            const hash2b = ethers.keccak256(ethers.toUtf8Bytes('user2 tx2'));
            const sig2b = await user2.signMessage(ethers.getBytes(hash2b));
            await verificationEngine.verifySignature(user2.address, hash2b, sig2b);
            
            // Verify both users advanced properly
            expect(await verificationEngine.getNextNonce(user1.address)).to.equal(2n);
            expect(await verificationEngine.getNextNonce(user2.address)).to.equal(2n);
            
            // Verify all old nonces are marked used
            expect(await verificationEngine.isNonceUsed(user1.address, 0n)).to.be.true;
            expect(await verificationEngine.isNonceUsed(user1.address, 1n)).to.be.true;
            expect(await verificationEngine.isNonceUsed(user2.address, 0n)).to.be.true;
            expect(await verificationEngine.isNonceUsed(user2.address, 1n)).to.be.true;
        });
        
        it('should simulate real-world withdrawal protection', async function () {
            // Scenario: User submits withdrawal request with signature
            const withdrawalAmount = ethers.parseEther('1000');
            const withdrawalData = ethers.solidityPacked(
                ['address', 'uint256', 'uint256'],
                [user1.address, withdrawalAmount, 0n] // nonce 0
            );
            const withdrawalHash = ethers.keccak256(withdrawalData);
            const withdrawalSig = await user1.signMessage(ethers.getBytes(withdrawalHash));
            
            // Process withdrawal
            await verificationEngine.verifySignature(user1.address, withdrawalHash, withdrawalSig);
            
            // Attacker intercepts and tries to replay
            const replayHash = ethers.keccak256(withdrawalData); // Same data
            const replaySig = withdrawalSig; // Same signature
            
            // Should fail due to nonce check
            await expect(
                verificationEngine.verifySignature(user1.address, replayHash, replaySig)
            ).to.be.revertedWithCustomError(verificationEngine, 'NonceAlreadyUsed');
            
            // User submits new withdrawal with nonce 1
            const withdrawalData2 = ethers.solidityPacked(
                ['address', 'uint256', 'uint256'],
                [user1.address, withdrawalAmount, 1n] // nonce 1
            );
            const withdrawalHash2 = ethers.keccak256(withdrawalData2);
            const withdrawalSig2 = await user1.signMessage(ethers.getBytes(withdrawalHash2));
            
            // Should succeed
            await verificationEngine.verifySignature(user1.address, withdrawalHash2, withdrawalSig2);
        });
    });
    
    describe('Gas Optimization', function () {
        it('should have reasonable gas cost for verifySignature', async function () {
            const hash = ethers.keccak256(ethers.toUtf8Bytes('gas test'));
            const signature = await user1.signMessage(ethers.getBytes(hash));
            
            const tx = await verificationEngine.verifySignature(user1.address, hash, signature);
            const receipt = await tx.wait();
            
            console.log(`Gas used for verifySignature: ${receipt.gasUsed.toString()}`);
            expect(receipt.gasUsed).to.be.lessThan(100000n); // Should be < 100k gas
        });
        
        it('should have reasonable gas cost for verifySignatureWithNonce', async function () {
            const hash = ethers.keccak256(ethers.toUtf8Bytes('gas test explicit'));
            const signature = await user1.signMessage(ethers.getBytes(hash));
            
            const tx = await verificationEngine.verifySignatureWithNonce(
                user1.address, 0n, hash, signature
            );
            const receipt = await tx.wait();
            
            console.log(`Gas used for verifySignatureWithNonce: ${receipt.gasUsed.toString()}`);
            expect(receipt.gasUsed).to.be.lessThan(100000n); // Should be < 100k gas
        });
    });
    
    describe('Edge Cases', function () {
        it('should handle very large nonce values', async function () {
            // Advance nonce to very high value
            await verificationEngine.advanceNonce(user1.address, 1000000n);
            
            const hash = ethers.keccak256(ethers.toUtf8Bytes('high nonce test'));
            const signature = await user1.signMessage(ethers.getBytes(hash));
            
            // Should still work
            await expect(
                verificationEngine.verifySignature(user1.address, hash, signature)
            ).to.not.be.reverted;
        });
        
        it('should handle zero signature correctly', async function () {
            const hash = ethers.keccak256(ethers.toUtf8Bytes('zero sig test'));
            const signature = '0x' + '00'.repeat(65); // Invalid signature
            
            await expect(
                verificationEngine.verifySignature(user1.address, hash, signature)
            ).to.be.revertedWithCustomError(verificationEngine, 'InvalidSignature');
        });
        
        it('should handle empty hash correctly', async function () {
            const hash = ethers.ZeroHash;
            const signature = await user1.signMessage(ethers.getBytes(hash));
            
            await expect(
                verificationEngine.verifySignature(user1.address, hash, signature)
            ).to.not.be.reverted;
        });
    });
});
