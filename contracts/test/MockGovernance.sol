// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface INFTMembership {
    function hasAccess(address user, uint8 minTier) external view returns (bool);
    function activeTier(address user) external view returns (uint8);
}

contract MockGovernance {
    INFTMembership public nftMembership;
    
    mapping(uint8 => uint256) public tierVotingPower;
    
    constructor(address _nftMembership) {
        nftMembership = INFTMembership(_nftMembership);
        tierVotingPower[0] = 1;    // Bronze: 1 vote
        tierVotingPower[1] = 3;    // Silver: 3 votes
        tierVotingPower[2] = 10;   // Gold: 10 votes
        tierVotingPower[3] = 50;   // Platinum: 50 votes
    }
    
    function getVotingPower(address user) external view returns (uint256) {
        uint8 tier = nftMembership.activeTier(user);
        if (tier == type(uint8).max) return 0;
        return tierVotingPower[tier];
    }
    
    function canPropose(address user) external view returns (bool) {
        return nftMembership.hasAccess(user, 2); // Gold or higher
    }
    
    function canVote(address user) external view returns (bool) {
        return nftMembership.hasAccess(user, 0); // Bronze or higher
    }
}
