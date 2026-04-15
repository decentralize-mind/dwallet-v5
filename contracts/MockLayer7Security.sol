// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title MockLayer7Security
 * @notice Simplified Layer7Security mock for standalone testing
 */
contract MockLayer7Security {
    address[] public signers;
    mapping(address => bool) public isSigner;
    bool public paused = false;
    bool public circuitBroken = false;
    
    constructor(address[] memory _signers, uint256 required) {
        for (uint256 i = 0; i < _signers.length; i++) {
            isSigner[_signers[i]] = true;
            signers.push(_signers[i]);
        }
    }
    
    function pause() external {
        paused = true;
    }
    
    function unpause() external {
        paused = false;
    }
}
