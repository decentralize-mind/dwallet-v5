// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract MockNFTMembership {
    mapping(address => uint8) public activeTier;

    function setTier(address user, uint8 tier) external {
        activeTier[user] = tier;
    }

    function hasAccess(address user, uint8 minTier) external view returns (bool) {
        return activeTier[user] >= minTier;
    }
}
