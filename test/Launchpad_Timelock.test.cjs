const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time, loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("🔒 Launchpad - Timelock Escrow Protection", function () {
    // Constants
    const PRECISION = ethers.parseUnits("1", 18);
    const WITHDRAWAL_DELAY = 7 * 24 * 60 * 60; // 7 days in seconds

    // Roles
    let admin, governor, guardian, treasury, user1, user2, attacker;

    // Contracts
    let launchpad, dwtToken, membershipNFT, idoToken, raiseToken;

    // IDO Configuration
    let idoId;
    const INITIAL_SUPPLY = ethers.parseUnits("1000000", 18);
    const HARDCAP = ethers.parseUnits("100000", 6); // 100k USDC (6 decimals)
    const SOFTCAP = ethers.parseUnits("50000", 6);  // 50k USDC
    const PRICE = ethers.parseUnits("1", 6);        // 1 USDC per token

    beforeEach(async function () {
        // Get signers
        [admin, governor, guardian, treasury, user1, user2, attacker] = await ethers.getSigners();

        // Deploy mock tokens
        const MockToken = await ethers.getContractFactory("MockERC20");
        dwtToken = await MockToken.deploy("DWT Token", "DWT");
        idoToken = await MockToken.deploy("IDO Token", "IDO");
        raiseToken = await MockToken.deploy("USDC", "USDC");

        await dwtToken.mint(admin, INITIAL_SUPPLY);
        await idoToken.mint(admin, INITIAL_SUPPLY);
        await raiseToken.mint(admin, INITIAL_SUPPLY);
        await raiseToken.mint(user1, ethers.parseUnits("100000", 6));
        await raiseToken.mint(user2, ethers.parseUnits("100000", 6));

        // Deploy mock NFT Membership
        const MockNFT = await ethers.getContractFactory("MockNFTMembership");
        membershipNFT = await MockNFT.deploy();

        // Grant DWT balance to users for tier qualification
        await dwtToken.transfer(user1, ethers.parseUnits("10000", 18));
        await dwtToken.transfer(user2, ethers.parseUnits("10000", 18));

        // Deploy Launchpad with correct parameters
        const Launchpad = await ethers.getContractFactory("Launchpad");
        launchpad = await Launchpad.deploy(
            await dwtToken.getAddress(),
            await membershipNFT.getAddress(),
            admin.address,
            governor.address,
            guardian.address,
            ethers.ZeroAddress, // SecurityController (mocked)
            ethers.ZeroAddress, // Registry (will be set)
            ethers.ZeroAddress, // LockEngine
            ethers.ZeroAddress  // InvariantChecker
        );

        // Set treasury
        await launchpad.connect(admin).setTreasury(treasury.address, ethers.ZeroHash, "0x");

        // Approve tokens
        await raiseToken.connect(user1).approve(await launchpad.getAddress(), ethers.MaxUint256);
        await raiseToken.connect(user2).approve(await launchpad.getAddress(), ethers.MaxUint256);

        // Create IDO
        const now = Math.floor(Date.now() / 1000);
        idoId = 1;

        await launchpad.createIDO(
            await idoToken.getAddress(),
            await raiseToken.getAddress(),
            PRICE,
            HARDCAP,
            SOFTCAP,
            ethers.parseUnits("100", 6),  // minCommit
            ethers.parseUnits("10000", 6), // maxCommitPublic
            ethers.parseUnits("1000", 18), // minDWTForWhitelist
            now - 1000,   // whitelistStart (past)
            now - 500,    // publicStart (past)
            now + 1000,   // saleEnd (future)
            now + 2000,   // claimStart
            ethers.parseUnits("20", 16), // tgePercent (20%)
            30 * 24 * 60 * 60 // vestingDuration (30 days)
        );
    });

    describe("🔐 Timelock Escrow - Fund Locking", function () {
        it("should lock proceeds in timelock escrow on finalization", async function () {
            // Commit to IDO
            const commitAmount = ethers.parseUnits("50000", 6);
            await raiseToken.connect(user1).transfer(await launchpad.getAddress(), commitAmount);
            await launchpad.connect(user1).commit(idoId, commitAmount);

            // Fast-forward to after sale end
            await time.increase(2000);

            // Finalize IDO
            await launchpad.connect(governor).finalizeIDO(idoId, ethers.ZeroHash, "0x");

            // Check proceeds are locked
            const proceeds = await launchpad.saleProceeds(idoId);
            expect(proceeds.amount).to.equal(commitAmount);
            expect(proceeds.withdrawn).to.be.false;
            expect(proceeds.vetoed).to.be.false;

            // Check unlock time is 7 days from finalization
            const blocktime = await time.latest();
            const expectedUnlockTime = blocktime + WITHDRAWAL_DELAY;
            expect(proceeds.unlockTime).to.be.closeTo(expectedUnlockTime, 10);
        });

        it("should emit ProceedsLocked event on finalization", async function () {
            const commitAmount = ethers.parseUnits("50000", 6);
            await raiseToken.connect(user1).transfer(await launchpad.getAddress(), commitAmount);
            await launchpad.connect(user1).commit(idoId, commitAmount);

            await time.increase(2000);

            await expect(launchpad.connect(governor).finalizeIDO(idoId, ethers.ZeroHash, "0x"))
                .to.emit(launchpad, "ProceedsLocked")
                .withArgs(idoId, commitAmount);
        });

        it("should hold funds in contract after finalization", async function () {
            const commitAmount = ethers.parseUnits("50000", 6);
            await raiseToken.connect(user1).transfer(await launchpad.getAddress(), commitAmount);
            await launchpad.connect(user1).commit(idoId, commitAmount);

            const balanceBefore = await raiseToken.balanceOf(await launchpad.getAddress());

            await time.increase(2000);
            await launchpad.connect(governor).finalizeIDO(idoId, ethers.ZeroHash, "0x");

            const balanceAfter = await raiseToken.balanceOf(await launchpad.getAddress());
            expect(balanceAfter).to.equal(balanceBefore + commitAmount);
        });
    });

    describe("⏳ Withdrawal Timelock - Prevention", function () {
        it("should prevent withdrawal before timelock expires", async function () {
            const commitAmount = ethers.parseUnits("50000", 6);
            await raiseToken.connect(user1).transfer(await launchpad.getAddress(), commitAmount);
            await launchpad.connect(user1).commit(idoId, commitAmount);

            await time.increase(2000);
            await launchpad.connect(governor).finalizeIDO(idoId, ethers.ZeroHash, "0x");

            // Try to withdraw immediately
            await expect(
                launchpad.connect(admin).withdrawProceeds(idoId)
            ).to.be.revertedWith("Timelock active");
        });

        it("should prevent withdrawal by non-admin", async function () {
            const commitAmount = ethers.parseUnits("50000", 6);
            await raiseToken.connect(user1).transfer(await launchpad.getAddress(), commitAmount);
            await launchpad.connect(user1).commit(idoId, commitAmount);

            await time.increase(2000);
            await launchpad.connect(governor).finalizeIDO(idoId, ethers.ZeroHash, "0x");

            // Fast-forward past timelock
            await time.increase(WITHDRAWAL_DELAY + 100);

            // Non-admin cannot withdraw
            await expect(
                launchpad.connect(user1).withdrawProceeds(idoId)
            ).to.be.reverted;
        });

        it("should prevent withdrawal if already withdrawn", async function () {
            const commitAmount = ethers.parseUnits("50000", 6);
            await raiseToken.connect(user1).transfer(await launchpad.getAddress(), commitAmount);
            await launchpad.connect(user1).commit(idoId, commitAmount);

            await time.increase(2000);
            await launchpad.connect(governor).finalizeIDO(idoId, ethers.ZeroHash, "0x");
            await time.increase(WITHDRAWAL_DELAY + 100);

            // First withdrawal succeeds
            await launchpad.connect(admin).withdrawProceeds(idoId);

            // Second withdrawal fails
            await expect(
                launchpad.connect(admin).withdrawProceeds(idoId)
            ).to.be.revertedWith("Already withdrawn");
        });

        it("should allow withdrawal after timelock expires", async function () {
            const commitAmount = ethers.parseUnits("50000", 6);
            await raiseToken.connect(user1).transfer(await launchpad.getAddress(), commitAmount);
            await launchpad.connect(user1).commit(idoId, commitAmount);

            await time.increase(2000);
            await launchpad.connect(governor).finalizeIDO(idoId, ethers.ZeroHash, "0x");

            const treasuryBalanceBefore = await raiseToken.balanceOf(treasury.address);

            // Fast-forward past timelock
            await time.increase(WITHDRAWAL_DELAY + 100);

            // Withdraw
            await launchpad.connect(admin).withdrawProceeds(idoId);

            const treasuryBalanceAfter = await raiseToken.balanceOf(treasury.address);
            expect(treasuryBalanceAfter).to.equal(treasuryBalanceBefore + commitAmount);
        });

        it("should emit ProceedsWithdrawn event on successful withdrawal", async function () {
            const commitAmount = ethers.parseUnits("50000", 6);
            await raiseToken.connect(user1).transfer(await launchpad.getAddress(), commitAmount);
            await launchpad.connect(user1).commit(idoId, commitAmount);

            await time.increase(2000);
            await launchpad.connect(governor).finalizeIDO(idoId, ethers.ZeroHash, "0x");
            await time.increase(WITHDRAWAL_DELAY + 100);

            await expect(launchpad.connect(admin).withdrawProceeds(idoId))
                .to.emit(launchpad, "ProceedsWithdrawn")
                .withArgs(idoId, commitAmount);
        });
    });

    describe("🚨 Emergency Veto Mechanism", function () {
        it("should allow governor to veto withdrawal", async function () {
            const commitAmount = ethers.parseUnits("50000", 6);
            await raiseToken.connect(user1).transfer(await launchpad.getAddress(), commitAmount);
            await launchpad.connect(user1).commit(idoId, commitAmount);

            await time.increase(2000);
            await launchpad.connect(governor).finalizeIDO(idoId, ethers.ZeroHash, "0x");

            // Governor vetoes withdrawal
            const newUnlockTime = (await time.latest()) + WITHDRAWAL_DELAY * 2;
            await expect(launchpad.connect(governor).vetoWithdrawal(idoId, newUnlockTime))
                .to.emit(launchpad, "WithdrawalVetoed")
                .withArgs(idoId, governor.address, newUnlockTime);

            const proceeds = await launchpad.saleProceeds(idoId);
            expect(proceeds.vetoed).to.be.true;
            expect(proceeds.unlockTime).to.equal(newUnlockTime);
        });

        it("should prevent withdrawal when vetoed", async function () {
            const commitAmount = ethers.parseUnits("50000", 6);
            await raiseToken.connect(user1).transfer(await launchpad.getAddress(), commitAmount);
            await launchpad.connect(user1).commit(idoId, commitAmount);

            await time.increase(2000);
            await launchpad.connect(governor).finalizeIDO(idoId, ethers.ZeroHash, "0x");

            // Veto withdrawal
            const newUnlockTime = (await time.latest()) + WITHDRAWAL_DELAY * 2;
            await launchpad.connect(governor).vetoWithdrawal(idoId, newUnlockTime);

            // Wait for original timelock
            await time.increase(WITHDRAWAL_DELAY + 100);

            // Still cannot withdraw due to veto
            await expect(
                launchpad.connect(admin).withdrawProceeds(idoId)
            ).to.be.revertedWith("Withdrawal vetoed");
        });

        it("should require new unlock time to be in future", async function () {
            const commitAmount = ethers.parseUnits("50000", 6);
            await raiseToken.connect(user1).transfer(await launchpad.getAddress(), commitAmount);
            await launchpad.connect(user1).commit(idoId, commitAmount);

            await time.increase(2000);
            await launchpad.connect(governor).finalizeIDO(idoId, ethers.ZeroHash, "0x");

            const currentTime = await time.latest();
            
            // Cannot veto with past time
            await expect(
                launchpad.connect(governor).vetoWithdrawal(idoId, currentTime - 100)
            ).to.be.revertedWith("Unlock time must be in future");
        });

        it("should require new unlock time to extend existing time", async function () {
            const commitAmount = ethers.parseUnits("50000", 6);
            await raiseToken.connect(user1).transfer(await launchpad.getAddress(), commitAmount);
            await launchpad.connect(user1).commit(idoId, commitAmount);

            await time.increase(2000);
            await launchpad.connect(governor).finalizeIDO(idoId, ethers.ZeroHash, "0x");

            const proceeds = await launchpad.saleProceeds(idoId);
            
            // Cannot veto with earlier time
            await expect(
                launchpad.connect(governor).vetoWithdrawal(idoId, proceeds.unlockTime - 100)
            ).to.be.revertedWith("Must extend unlock time");
        });

        it("should only allow governor to veto", async function () {
            const commitAmount = ethers.parseUnits("50000", 6);
            await raiseToken.connect(user1).transfer(await launchpad.getAddress(), commitAmount);
            await launchpad.connect(user1).commit(idoId, commitAmount);

            await time.increase(2000);
            await launchpad.connect(governor).finalizeIDO(idoId, ethers.ZeroHash, "0x");

            // Non-governor cannot veto
            await expect(
                launchpad.connect(user1).vetoWithdrawal(idoId, (await time.latest()) + 1000)
            ).to.be.reverted;
        });

        it("should allow governor to re-enable withdrawal after veto", async function () {
            const commitAmount = ethers.parseUnits("50000", 6);
            await raiseToken.connect(user1).transfer(await launchpad.getAddress(), commitAmount);
            await launchpad.connect(user1).commit(idoId, commitAmount);

            await time.increase(2000);
            await launchpad.connect(governor).finalizeIDO(idoId, ethers.ZeroHash, "0x");

            // Veto
            const newUnlockTime = (await time.latest()) + WITHDRAWAL_DELAY * 2;
            await launchpad.connect(governor).vetoWithdrawal(idoId, newUnlockTime);

            // Re-enable
            await expect(
                launchpad.connect(governor).enableWithdrawal(idoId)
            ).to.changeValue(
                await launchpad.saleProceeds(idoId),
                (p) => p.vetoed,
                true,
                false
            );
        });
    });

    describe("🛡️ Rug Pull Prevention", function () {
        it("should prevent instant rug pull even if admin is compromised", async function () {
            const commitAmount = ethers.parseUnits("50000", 6);
            await raiseToken.connect(user1).transfer(await launchpad.getAddress(), commitAmount);
            await launchpad.connect(user1).commit(idoId, commitAmount);

            await time.increase(2000);
            await launchpad.connect(governor).finalizeIDO(idoId, ethers.ZeroHash, "0x");

            // Even if admin key is compromised, attacker cannot immediately withdraw
            await expect(
                launchpad.connect(admin).withdrawProceeds(idoId)
            ).to.be.revertedWith("Timelock active");

            // 7-day window gives time to respond
        });

        it("should allow community response during timelock period", async function () {
            const commitAmount = ethers.parseUnits("50000", 6);
            await raiseToken.connect(user1).transfer(await launchpad.getAddress(), commitAmount);
            await launchpad.connect(user1).commit(idoId, commitAmount);

            await time.increase(2000);
            await launchpad.connect(governor).finalizeIDO(idoId, ethers.ZeroHash, "0x");

            // Simulate detection of suspicious activity
            // Governor can veto during the 7-day window
            const newUnlockTime = (await time.latest()) + WITHDRAWAL_DELAY * 2;
            await launchpad.connect(governor).vetoWithdrawal(idoId, newUnlockTime);

            // Funds remain protected
            const proceeds = await launchpad.saleProceeds(idoId);
            expect(proceeds.vetoed).to.be.true;
        });

        it("should protect funds for full timelock duration", async function () {
            const commitAmount = ethers.parseUnits("50000", 6);
            await raiseToken.connect(user1).transfer(await launchpad.getAddress(), commitAmount);
            await launchpad.connect(user1).commit(idoId, commitAmount);

            await time.increase(2000);
            await launchpad.connect(governor).finalizeIDO(idoId, ethers.ZeroHash, "0x");

            // Check at various time points
            const checkPoints = [1, 100, 1000, 10000, 50000, 100000];
            
            for (const seconds of checkPoints) {
                if (seconds < WITHDRAWAL_DELAY) {
                    await time.increase(seconds);
                    await expect(
                        launchpad.connect(admin).withdrawProceeds(idoId)
                    ).to.be.revertedWith("Timelock active");
                }
            }

            // Only after full 7 days can withdrawal occur
            const remainingTime = WITHDRAWAL_DELAY - 100000;
            if (remainingTime > 0) {
                await time.increase(remainingTime + 100);
                await launchpad.connect(admin).withdrawProceeds(idoId);
            }
        });
    });

    describe("📊 Edge Cases", function () {
        it("should handle multiple IDOs with separate timelocks", async function () {
            // Create second IDO
            const now = Math.floor(Date.now() / 1000);
            idoId = 2;

            await launchpad.createIDO(
                await idoToken.getAddress(),
                await raiseToken.getAddress(),
                PRICE,
                HARDCAP,
                SOFTCAP,
                ethers.parseUnits("100", 6),
                ethers.parseUnits("10000", 6),
                ethers.parseUnits("1000", 18),
                now - 1000,
                now - 500,
                now + 1000,
                now + 2000,
                ethers.parseUnits("20", 16),
                30 * 24 * 60 * 60
            );

            // Commit to both IDOs
            const commit1 = ethers.parseUnits("50000", 6);
            const commit2 = ethers.parseUnits("30000", 6);

            await raiseToken.connect(user1).transfer(await launchpad.getAddress(), commit1);
            await launchpad.connect(user1).commit(1, commit1);

            await raiseToken.connect(user2).transfer(await launchpad.getAddress(), commit2);
            await launchpad.connect(user2).commit(2, commit2);

            // Finalize both
            await time.increase(2000);
            await launchpad.connect(governor).finalizeIDO(1, ethers.ZeroHash, "0x");
            await launchpad.connect(governor).finalizeIDO(2, ethers.ZeroHash, "0x");

            // Check both have separate timelocks
            const proceeds1 = await launchpad.saleProceeds(1);
            const proceeds2 = await launchpad.saleProceeds(2);

            expect(proceeds1.amount).to.equal(commit1);
            expect(proceeds2.amount).to.equal(commit2);
            expect(proceeds1.unlockTime).to.be.closeTo(proceeds2.unlockTime, 10);
        });

        it("should revert withdrawal for non-existent IDO", async function () {
            await expect(
                launchpad.connect(admin).withdrawProceeds(999)
            ).to.be.reverted;
        });

        it("should handle cancelled IDO without timelock", async function () {
            // Commit below softcap
            const commitAmount = ethers.parseUnits("10000", 6);
            await raiseToken.connect(user1).transfer(await launchpad.getAddress(), commitAmount);
            await launchpad.connect(user1).commit(idoId, commitAmount);

            await time.increase(2000);
            await launchpad.connect(governor).finalizeIDO(idoId, ethers.ZeroHash, "0x");

            // Should be cancelled, no proceeds locked
            const idoConfig = await launchpad.idos(idoId);
            expect(idoConfig.cancelled).to.be.true;

            const proceeds = await launchpad.saleProceeds(idoId);
            expect(proceeds.amount).to.equal(0);
        });
    });
});
