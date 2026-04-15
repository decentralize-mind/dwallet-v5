// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title OracleManipulatorMock
 * @notice Mock contract for simulating oracle manipulation attacks
 */
contract OracleManipulatorMock {
    function exploitStalePrice(uint256 threshold, uint256 elapsed) external pure {
        // Try to trade using stale oracle price
        require(elapsed <= threshold, "StalePrice()");
    }

    function manipulatePrice(uint256 newPrice, uint256 thresholdBps) external pure {
        // Attempt to exploit large price deviation
        // Normal price = 100, trying to use manipulated price
        
        uint256 deviation = ((100 - newPrice) * 10000) / 100;
        require(deviation <= thresholdBps, "PriceDeviationTooHigh()");
    }
}
