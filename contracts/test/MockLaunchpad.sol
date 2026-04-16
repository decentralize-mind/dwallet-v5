// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface INFTMembership {
    function hasAccess(address user, uint8 minTier) external view returns (bool);
    function activeTier(address user) external view returns (uint8);
}

contract MockLaunchpad {
    INFTMembership public nftMembership;
    
    mapping(address => uint256) public allocations;
    mapping(uint8 => uint256) public tierMultipliers;
    
    constructor(address _nftMembership) {
        nftMembership = INFTMembership(_nftMembership);
        tierMultipliers[0] = 1;   // Bronze
        tierMultipliers[1] = 3;   // Silver
        tierMultipliers[2] = 8;   // Gold
        tierMultipliers[3] = 20;  // Platinum
    }
    
    function register(address user, uint256 baseAllocation) external {
        uint8 tier = nftMembership.activeTier(user);
        require(tier != type(uint8).max, "No membership pass");
        
        uint256 multiplier = tierMultipliers[tier];
        allocations[user] = baseAllocation * multiplier;
    }
    
    function getAllocation(address user) external view returns (uint256) {
        return allocations[user];
    }
    
    function hasTierAccess(address user, uint8 minTier) external view returns (bool) {
        return nftMembership.hasAccess(user, minTier);
    }
}
