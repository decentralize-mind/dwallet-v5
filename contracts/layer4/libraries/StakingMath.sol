// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title StakingMath
 * @notice Pure math utilities for Layer 4 staking and veDWT calculations.
 */
library StakingMath {

    uint256 internal constant PRECISION         = 1e18;
    uint256 internal constant MAX_LOCK_SECONDS  = 4 * 365 days;
    uint256 internal constant MAX_BOOST_NUM     = 25; // 2.5x
    uint256 internal constant BOOST_DENOM       = 10;

    // ─────────────────────────────────────────────
    // Share Accounting
    // ─────────────────────────────────────────────

    /**
     * @notice Shares minted for a DWT deposit into a pool.
     * @param depositAmount DWT being deposited.
     * @param totalDWT      Total DWT currently in pool (before this deposit).
     * @param totalShares   Total shares currently issued.
     * @return shares       New shares to mint.
     */
    function computeShares(
        uint256 depositAmount,
        uint256 totalDWT,
        uint256 totalShares
    ) internal pure returns (uint256 shares) {
        if (totalShares == 0 || totalDWT == 0) return depositAmount;
        return depositAmount * totalShares / totalDWT;
    }

    /**
     * @notice DWT redeemable for a given share amount.
     * @param shares      Shares being redeemed.
     * @param totalDWT    Total DWT in pool.
     * @param totalShares Total shares issued.
     */
    function computeDWT(
        uint256 shares,
        uint256 totalDWT,
        uint256 totalShares
    ) internal pure returns (uint256) {
        if (totalShares == 0) return 0;
        return shares * totalDWT / totalShares;
    }

    // ─────────────────────────────────────────────
    // veDWT
    // ─────────────────────────────────────────────

    /**
     * @notice Current veDWT for a lock (decays linearly to 0 at lockEnd).
     * @param lockedAmount DWT locked.
     * @param lockEnd      Expiry timestamp.
     * @param currentTime  Current block timestamp.
     */
    function computeVeDWT(
        uint256 lockedAmount,
        uint256 lockEnd,
        uint256 currentTime
    ) internal pure returns (uint256) {
        if (lockedAmount == 0 || currentTime >= lockEnd) return 0;
        uint256 remaining = lockEnd - currentTime;
        return lockedAmount * remaining / MAX_LOCK_SECONDS;
    }

    /**
     * @notice Lock duration in seconds to achieve a target veDWT/DWT ratio.
     * @param targetRatio Desired ratio (0–1e18, 1e18 = max lock).
     */
    function lockSecondsForRatio(uint256 targetRatio)
        internal
        pure
        returns (uint256)
    {
        require(targetRatio <= PRECISION, "StakingMath: ratio > 1");
        return targetRatio * MAX_LOCK_SECONDS / PRECISION;
    }

    // ─────────────────────────────────────────────
    // Boost
    // ─────────────────────────────────────────────

    /**
     * @notice Compute Curve-style boosted balance.
     * @param rawStake    User's raw staked DWT.
     * @param totalStaked Total DWT staked in pool.
     * @param userVeDWT   User's current veDWT.
     * @param totalVeDWT  Total veDWT in pool.
     * @return boosted    Boosted effective balance.
     */
    function computeBoostedBalance(
        uint256 rawStake,
        uint256 totalStaked,
        uint256 userVeDWT,
        uint256 totalVeDWT
    ) internal pure returns (uint256 boosted) {
        if (rawStake == 0) return 0;

        // Component 1: 2.5x cap
        uint256 c1 = rawStake * MAX_BOOST_NUM / BOOST_DENOM;

        // Component 2: raw + pool-share weighted by veDWT ratio
        uint256 c2;
        if (totalVeDWT == 0) {
            c2 = rawStake;
        } else {
            uint256 poolShare = totalStaked * userVeDWT / totalVeDWT;
            c2 = rawStake + poolShare * 15 / BOOST_DENOM; // BOOST_WEIGHT_NUM = 15
        }

        boosted = c1 < c2 ? c1 : c2;
    }

    /**
     * @notice Boost multiplier as a ratio (1e18 = 1x, 2.5e18 = 2.5x).
     */
    function boostMultiplier(
        uint256 rawStake,
        uint256 totalStaked,
        uint256 userVeDWT,
        uint256 totalVeDWT
    ) internal pure returns (uint256) {
        if (rawStake == 0) return PRECISION;
        uint256 boosted = computeBoostedBalance(rawStake, totalStaked, userVeDWT, totalVeDWT);
        return boosted * PRECISION / rawStake;
    }

    // ─────────────────────────────────────────────
    // Reward Accounting
    // ─────────────────────────────────────────────

    /**
     * @notice Compute user's earned rewards since last snapshot.
     * @param effectiveBal         User's effective (boosted) balance.
     * @param rewardPerTokenGlobal Current global accumulator.
     * @param userRewardPerToken   User's snapshot of accumulator.
     * @param pendingRewards       Already-tracked pending rewards.
     */
    function computeEarned(
        uint256 effectiveBal,
        uint256 rewardPerTokenGlobal,
        uint256 userRewardPerToken,
        uint256 pendingRewards
    ) internal pure returns (uint256) {
        uint256 delta = rewardPerTokenGlobal - userRewardPerToken;
        return pendingRewards + effectiveBal * delta / PRECISION;
    }

    /**
     * @notice New rewardPerTokenStored after a reward injection.
     * @param current       Current accumulator value.
     * @param rewardAmount  ETH/token reward being injected.
     * @param totalEffective Total effective supply (sum of boosted balances).
     */
    function updateRewardPerToken(
        uint256 current,
        uint256 rewardAmount,
        uint256 totalEffective
    ) internal pure returns (uint256) {
        if (totalEffective == 0) return current;
        return current + rewardAmount * PRECISION / totalEffective;
    }

    // ─────────────────────────────────────────────
    // Utility
    // ─────────────────────────────────────────────

    function min(uint256 a, uint256 b) internal pure returns (uint256) {
        return a < b ? a : b;
    }

    function max(uint256 a, uint256 b) internal pure returns (uint256) {
        return a > b ? a : b;
    }

    function clamp(uint256 v, uint256 lo, uint256 hi) internal pure returns (uint256) {
        return v < lo ? lo : (v > hi ? hi : v);
    }
}
