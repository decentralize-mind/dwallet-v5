// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract MockDWTTokenForRouter {
    uint16 public constant tier0FeeBps = 30;
    
    function feeRateOf(address) external pure returns (uint16) {
        return tier0FeeBps;
    }
    
    function feeTierOf(address) external pure returns (uint8) {
        return 0;
    }

    // satisfy IDWTToken interface
    function tier1Threshold() external pure returns (uint256) { return 0; }
    function tier2Threshold() external pure returns (uint256) { return 0; }
    function tier3Threshold() external pure returns (uint256) { return 0; }
    function tier1FeeBps() external pure returns (uint16) { return 0; }
    function tier2FeeBps() external pure returns (uint16) { return 0; }
    function mint(address, uint256) external pure {}
}
