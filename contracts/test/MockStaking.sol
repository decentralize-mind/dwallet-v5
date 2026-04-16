// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface INFTMembership {
    function hasAccess(address user, uint8 minTier) external view returns (bool);
    function activeTier(address user) external view returns (uint8);
}

contract MockStaking {
    INFTMembership public nftMembership;
    
    mapping(address => uint256) public stakes;
    mapping(uint8 => uint256) public tierAPY; // basis points
    
    constructor(address _nftMembership) {
        nftMembership = INFTMembership(_nftMembership);
        tierAPY[0] = 500;   // Bronze: 5%
        tierAPY[1] = 800;   // Silver: 8%
        tierAPY[2] = 1200;  // Gold: 12%
        tierAPY[3] = 2000;  // Platinum: 20%
    }
    
    function stake(address user, uint256 amount) external {
        stakes[user] += amount;
    }
    
    function getUserAPY(address user) external view returns (uint256) {
        uint8 tier = nftMembership.activeTier(user);
        if (tier == type(uint8).max) return 0;
        return tierAPY[tier];
    }
    
    function canStake(address user) external view returns (bool) {
        return nftMembership.hasAccess(user, 0); // At least Bronze
    }
}
