// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title FlashLoanAttackerMock
 * @notice Mock contract for simulating flash loan attacks in tests
 */
contract FlashLoanAttackerMock {
    uint256 public threatScore;
    bool public rateLimitExceeded;
    bool public detectedAsMEV;

    function executeManipulationAttack(uint256 amount, address victim) external {
        // Simulate flash loan manipulation attack
        // In reality, this would:
        // 1. Borrow massive amount via flash loan
        // 2. Dump on DEX to crash price
        // 3. Exploit perpetuals at manipulated price
        
        threatScore = 85; // HIGH threat score
        revert("Attack prevented by SecurityController");
    }

    function executeFlashLoan(uint256 amount) external {
        // Simulate rapid flash loan attacks
        // Rate limiting should trigger after N attempts
        
        if (rateLimitExceeded) {
            revert("RateLimitExceeded()");
        }
        rateLimitExceeded = true;
    }

    function sandwichAttack(address victim, uint256 victimSize, uint256 sandwichSize) external {
        // Simulate sandwich attack pattern
        // Front-run victim's large trade
        
        revert("Pattern detected: SANDWICH_ATTACK");
    }

    function governanceAttack(uint256 borrowAmount) external {
        // Attempt to use flash loans for voting power
        // Should be prevented by getPastVotes mechanism
        
        revert("getPastVotes: insufficient votes");
    }

    function executeUpgradeImmediately() external {
        // Try to bypass timelock on upgrades
        
        revert("TimeLockNotExpired(bytes32,uint256)");
    }

    function reentrancyAttack() external {
        // Attempt cross-contract reentrancy
        
        revert("ReentrancyGuard: reentrant call");
    }
}
