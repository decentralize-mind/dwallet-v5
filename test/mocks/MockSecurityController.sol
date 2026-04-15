// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title MockSecurityController
 * @notice Mock security controller for testing
 */
contract MockSecurityController {
    bool public paused = false;
    bool public circuitBroken = false;
    
    function pause() external {
        paused = true;
        circuitBroken = true;
    }
    
    function unpause() external {
        paused = false;
        circuitBroken = false;
    }
}
