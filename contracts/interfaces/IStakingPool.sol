// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IStakingPool
interface IStakingPool {
    enum Tier { FLEXIBLE, LOCKED_30, LOCKED_90, LOCKED_365 }

    struct StakePosition {
        uint256 amount;
        uint256 stakedAt;
        uint256 lockedUntil;
        Tier    tier;
        address delegatee;
    }

    event Staked(address indexed user, uint256 amount, Tier tier);
    event Unstaked(address indexed user, uint256 amount);
    event RewardsClaimed(address indexed user, uint256 reward);
    event Delegated(address indexed staker, address indexed delegatee);
    event ValidatorSlashed(address indexed validator, uint256 amount);

    function stake(uint256 amount, Tier tier, address delegatee) external;
    function unstake(uint256 amount) external;
    function claimRewards() external returns (uint256 reward);
    function delegate(address delegatee) external;
    function slash(address validator, uint256 amount) external;
    function earned(address account) external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function totalStaked() external view returns (uint256);
    function aprFor(Tier tier) external view returns (uint256);
}
