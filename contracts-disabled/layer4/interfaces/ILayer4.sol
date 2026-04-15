// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// ─────────────────────────────────────────────────────────────────────────────
// Layer 4 — Staking & Rewards — Shared Interfaces
// ─────────────────────────────────────────────────────────────────────────────

interface IStakingPool {
    function deposit(uint256 dwtAmount) external returns (uint256 shares);
    function withdraw(uint256 shares) external returns (uint256 dwtOut);
    function injectRewards(uint256 dwtAmount) external;
    function pricePerShare() external view returns (uint256);
    function sharesToDWT(uint256 shares) external view returns (uint256);
    function dwtToShares(uint256 dwtAmount) external view returns (uint256);
    function totalDWT() external view returns (uint256);
}

interface IDWTStaking {
    function stake(uint256 amount) external;
    function unstake(uint256 amount) external;
    function claimETH() external;
    function depositETHReward() external payable;
    function earned(address user) external view returns (uint256);
    function effectiveBalance(address user) external view returns (uint256);
    function totalStaked() external view returns (uint256);
    function stakedAmount(address user) external view returns (uint256);
}

interface IRewardDistributor {
    function distribute() external;
    function receiveFeeToken(address token, uint256 amount) external;
    function totalDistributed() external view returns (uint256);
    function lastDistributionTimestamp() external view returns (uint256);
}

interface IBoostedStaking {
    function lock(uint256 amount, uint256 lockSeconds) external;
    function unlock() external;
    function claimETH() external;
    function depositETHReward() external payable;
    function veDWTOf(address user) external view returns (uint256);
    function boostedBalanceOf(address user) external view returns (uint256);
    function earnedETH(address user) external view returns (uint256);
    function boostMultiplier(address user) external view returns (uint256);
    function totalLocked() external view returns (uint256);
    function totalVeDWT() external view returns (uint256);
}
