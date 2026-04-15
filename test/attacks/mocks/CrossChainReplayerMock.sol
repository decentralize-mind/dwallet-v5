// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title CrossChainReplayerMock
 * @notice Mock contract for simulating cross-chain replay attacks
 */
contract CrossChainReplayerMock {
    mapping(uint256 => bool) public usedNonces;

    function executeMessage(bytes memory data, uint256 nonce, string memory chain) external {
        // Execute cross-chain message
        // Nonce should prevent replay across chains
        
        require(!usedNonces[nonce], "NonceAlreadyUsed(address,uint256)");
        usedNonces[nonce] = true;
    }

    function executeExpiredMessage(uint256 ttl, uint256 elapsed) external pure {
        // Try to execute expired message
        
        require(elapsed <= ttl, "MessageExpired()");
    }
}
